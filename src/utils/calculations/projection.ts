import type {
  AppState,
  YearProjection,
  WhatIfAdjustments,
} from '../../types';
import { getStateTaxInfo } from '../../constants/stateTaxes';
import { aggregateBalances, createAssetBalanceMap, addContributionsToAccounts, addSurplusToAccounts, growBalances, growAssetBalances } from './balances';
import { determinePhase, calculateEmploymentIncome, calculateRetirementIncomeStreams, calculateYearExpenses } from './expenses';
import { getAdjustedSSBenefit } from './socialSecurity';
import { withdrawFromAccounts } from './withdrawals';

export function calculateProjection(
  state: AppState,
  whatIf?: WhatIfAdjustments
): YearProjection[] {
  const projections: YearProjection[] = [];
  const currentYear = new Date().getFullYear();

  // Apply what-if adjustments
  const spendingMultiplier = 1 + (whatIf?.spendingAdjustment || 0);
  const effectiveFIAge = state.profile.targetFIAge;
  const effectiveReturn = whatIf?.returnAdjustment ?? state.assumptions.investmentReturn;
  const effectiveSSAge = whatIf?.ssStartAge ?? state.socialSecurity.startAge;

  // Initialize balances from array-based assets
  let balances = aggregateBalances(state.assets.accounts);
  let assetBalanceMap = createAssetBalanceMap(state.assets.accounts);

  const { assumptions, socialSecurity, lifeEvents, profile, assets, income } = state;
  const penaltySettings = assumptions.penaltySettings;
  const stateTaxInfo = getStateTaxInfo(profile.state);

  for (let age = profile.currentAge; age <= profile.lifeExpectancy; age++) {
    const year = currentYear + (age - profile.currentAge);

    // Calculate spouse age
    const spouseAge = profile.filingStatus === 'married' && profile.spouseAge
      ? age - (profile.currentAge - profile.spouseAge)
      : undefined;

    // Determine financial phase
    const phase = determinePhase(age, effectiveFIAge);

    // Calculate employment income (stops at FI age for primary, may continue for spouse)
    const spouseAdditionalWorkYears = income.spouseAdditionalWorkYears ?? 0;
    const employmentResult = calculateEmploymentIncome(
      age,
      spouseAge,
      income.employment,
      income.spouseEmployment,
      profile.filingStatus,
      effectiveFIAge,
      spouseAdditionalWorkYears
    );

    // Calculate expenses - always needed (even during working years for tracking)
    const expenseResult = calculateYearExpenses(
      state.expenses,
      year,
      currentYear,
      effectiveFIAge,
      profile.currentAge,
      assumptions.inflationRate,
      spendingMultiplier
    );

    const mortgageBalance = expenseResult.mortgageBalance;

    // Mortgage payoff amount if applicable
    const mortgagePayoffExpense = expenseResult.mortgagePayoffAmount ?? 0;

    // Add life events for this year
    const yearLifeEvents = lifeEvents.filter((e) => e.year === year);
    const lifeEventTotal = yearLifeEvents.reduce((sum, e) => sum + e.amount, 0);

    // Calculate years since FI (for inflation on retirement income)
    const yearsSinceFI = Math.max(0, age - effectiveFIAge);

    // Calculate retirement income streams (consulting, rentals, etc.)
    const retirementIncomeStreams = calculateRetirementIncomeStreams(
      income.retirementIncomes,
      age,
      yearsSinceFI,
      assumptions.inflationRate
    );

    // Calculate passive income (SS, pension)
    let passiveIncome = 0;

    // Primary Social Security with COLA (monthlyBenefit is FRA amount, adjusted by claiming age)
    if (socialSecurity.include && age >= effectiveSSAge) {
      const adjustedMonthly = getAdjustedSSBenefit(socialSecurity.monthlyBenefit, effectiveSSAge);
      const yearsSinceStart = age - effectiveSSAge;
      const colaFactor = Math.pow(1 + (socialSecurity.colaRate || 0), yearsSinceStart);
      passiveIncome += adjustedMonthly * 12 * colaFactor;
    }

    // Spouse Social Security with COLA (monthlyBenefit is FRA amount, adjusted by claiming age)
    if (profile.filingStatus === 'married' && socialSecurity.spouse?.include && spouseAge !== undefined) {
      const spouseSSAge = whatIf?.spouseSSStartAge ?? socialSecurity.spouse.startAge;

      if (spouseAge >= spouseSSAge) {
        const adjustedMonthly = getAdjustedSSBenefit(socialSecurity.spouse.monthlyBenefit, spouseSSAge);
        const yearsSinceStart = spouseAge - spouseSSAge;
        const colaFactor = Math.pow(1 + (socialSecurity.colaRate || 0), yearsSinceStart);
        passiveIncome += adjustedMonthly * 12 * colaFactor;
      }
    }

    // Pension with optional COLA
    if (assets.pension && age >= assets.pension.startAge) {
      const yearsSincePensionStart = age - assets.pension.startAge;
      const pensionColaRate = assets.pension.colaRate ?? 0;
      const pensionColaFactor = Math.pow(1 + pensionColaRate, yearsSincePensionStart);
      passiveIncome += assets.pension.annualBenefit * pensionColaFactor;
    }

    // Total non-employment income (SS + pension + retirement income streams)
    const totalPassiveIncome = passiveIncome + retirementIncomeStreams;

    // Initialize year tracking variables
    let withdrawal = 0;
    let withdrawalPenalty = 0;
    let federalTax = 0;
    let stateTax = 0;
    let withdrawalSource = 'N/A';
    let yearExpenses = 0;
    let totalIncome = 0;
    let gap = 0;

    // Check if there's any employment income this year (can span into FI phase for spouse)
    const hasEmploymentThisYear = employmentResult.grossIncome > 0;

    if (hasEmploymentThisYear) {
      // ACCUMULATING/TRANSITIONAL: Employment income present, covers expenses, contributions grow accounts
      yearExpenses = expenseResult.totalExpenses + Math.max(0, lifeEventTotal) + mortgagePayoffExpense;
      totalIncome = totalPassiveIncome + Math.abs(Math.min(0, lifeEventTotal));

      // Add contributions to retirement accounts BEFORE calculating surplus
      if (employmentResult.contributions > 0) {
        assetBalanceMap = addContributionsToAccounts(
          assetBalanceMap,
          assets.accounts,
          employmentResult.selfContributions,
          employmentResult.spouseContributions,
          income.employment,
          income.spouseEmployment
        );
        // Update aggregated balances
        balances = aggregateBalances(
          assets.accounts.map((a) => ({
            ...a,
            balance: assetBalanceMap.get(a.id)?.balance ?? a.balance,
          }))
        );
      }

      // Calculate surplus (net employment income + passive income - expenses)
      const surplus = employmentResult.netIncome + totalIncome - yearExpenses;

      if (surplus > 0) {
        // Positive surplus: add to taxable account
        assetBalanceMap = addSurplusToAccounts(assetBalanceMap, assets.accounts, surplus);
        balances = aggregateBalances(
          assets.accounts.map((a) => ({
            ...a,
            balance: assetBalanceMap.get(a.id)?.balance ?? a.balance,
            costBasis: assetBalanceMap.get(a.id)?.costBasis ?? a.costBasis,
          }))
        );
        withdrawalSource = 'Savings';
      } else if (surplus < 0) {
        // Negative surplus: need to withdraw from accounts
        gap = Math.abs(surplus);
        const result = withdrawFromAccounts(
          gap,
          assets.accounts,
          assetBalanceMap,
          assumptions.withdrawalOrder,
          assumptions.traditionalTaxRate,
          assumptions.capitalGainsTaxRate,
          stateTaxInfo,
          age,
          spouseAge,
          penaltySettings
        );
        withdrawal = result.amount;
        withdrawalPenalty = result.penalty;
        federalTax = result.federalTax;
        stateTax = result.stateTax;
        withdrawalSource = result.source;
        balances = result.balances;
        assetBalanceMap = result.assetBalances;
      }

      // Update withdrawal source if mortgage payoff occurred
      if (mortgagePayoffExpense > 0 && withdrawalSource !== 'N/A' && withdrawalSource !== 'Savings') {
        withdrawalSource = `${withdrawalSource} (+ Mortgage Payoff)`;
      } else if (mortgagePayoffExpense > 0 && withdrawalSource === 'N/A') {
        withdrawalSource = 'Mortgage Payoff';
      }
    } else {
      // FI PHASE (no employment): Rely on passive income and withdrawals
      yearExpenses = expenseResult.totalExpenses + Math.max(0, lifeEventTotal) + mortgagePayoffExpense;
      totalIncome = totalPassiveIncome + Math.abs(Math.min(0, lifeEventTotal));

      // Gap is what needs to come from portfolio
      gap = Math.max(0, yearExpenses - totalIncome);

      if (gap > 0) {
        const result = withdrawFromAccounts(
          gap,
          assets.accounts,
          assetBalanceMap,
          assumptions.withdrawalOrder,
          assumptions.traditionalTaxRate,
          assumptions.capitalGainsTaxRate,
          stateTaxInfo,
          age,
          spouseAge,
          penaltySettings
        );
        withdrawal = result.amount;
        withdrawalPenalty = result.penalty;
        federalTax = result.federalTax;
        stateTax = result.stateTax;
        withdrawalSource = result.source;
        balances = result.balances;
        assetBalanceMap = result.assetBalances;
      }

      // Update withdrawal source if mortgage payoff occurred
      if (mortgagePayoffExpense > 0 && withdrawalSource !== 'N/A') {
        withdrawalSource = `${withdrawalSource} (+ Mortgage Payoff)`;
      } else if (mortgagePayoffExpense > 0) {
        withdrawalSource = 'Mortgage Payoff';
      }
    }

    // Check for shortfall
    const totalBalance = balances.taxable + balances.traditional + balances.roth + balances.hsa + balances.cash;
    const isShortfall = gap > 0 && totalBalance < gap && withdrawal < gap;

    // Record this year's projection
    const totalNetWorth = totalBalance;

    projections.push({
      year,
      age,
      phase,
      expenses: yearExpenses,
      income: totalIncome,
      employmentIncome: employmentResult.netIncome,
      contributions: employmentResult.contributions,
      retirementIncome: retirementIncomeStreams,
      gap,
      withdrawal,
      withdrawalPenalty,
      federalTax,
      stateTax,
      withdrawalSource,
      taxableBalance: balances.taxable,
      traditionalBalance: balances.traditional,
      rothBalance: balances.roth,
      hsaBalance: balances.hsa,
      cashBalance: balances.cash,
      totalNetWorth,
      isShortfall,
      mortgageBalance,
    });

    // Grow balances for next year (if not in shortfall)
    if (!isShortfall) {
      balances = growBalances(balances, effectiveReturn);
      assetBalanceMap = growAssetBalances(assetBalanceMap, assets.accounts, effectiveReturn);
    }
  }

  return projections;
}
