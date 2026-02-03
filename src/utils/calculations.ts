import type {
  AppState,
  YearProjection,
  ProjectionSummary,
  WhatIfAdjustments,
  WithdrawalSource,
  Asset,
  AccountOwner,
  PenaltySettings,
  StateTaxInfo,
  AchievableFIResult,
  Expenses,
  MortgageDetails,
} from '../types';
import { PENALTY_FREE_AGES } from '../constants/defaults';
import { getStateTaxInfo } from '../constants/stateTaxes';

// ==================== Mortgage Calculations ====================

/**
 * Calculate monthly P&I payment using standard amortization formula
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * where:
 *   P = principal (loan balance)
 *   r = monthly interest rate
 *   n = number of monthly payments
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0 || annualRate <= 0 || termYears <= 0) {
    return 0;
  }

  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;

  const payment =
    principal *
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return Math.round(payment * 100) / 100; // Round to cents
}

/**
 * Calculate remaining mortgage balance at a specific point in time
 * B = P * [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
 * where:
 *   P = original principal
 *   r = monthly interest rate
 *   n = total number of payments
 *   p = number of payments made
 */
export function calculateRemainingBalance(
  originalPrincipal: number,
  annualRate: number,
  originalTermYears: number,
  yearsElapsed: number
): number {
  if (originalPrincipal <= 0 || yearsElapsed >= originalTermYears) {
    return 0;
  }

  if (annualRate <= 0) {
    // Zero interest: simple linear reduction
    const totalPayments = originalTermYears * 12;
    const paymentsMade = yearsElapsed * 12;
    return originalPrincipal * (1 - paymentsMade / totalPayments);
  }

  const monthlyRate = annualRate / 12;
  const totalPayments = originalTermYears * 12;
  const paymentsMade = yearsElapsed * 12;

  const compoundFactor = Math.pow(1 + monthlyRate, totalPayments);
  const elapsedFactor = Math.pow(1 + monthlyRate, paymentsMade);

  const balance =
    originalPrincipal *
    (compoundFactor - elapsedFactor) /
    (compoundFactor - 1);

  return Math.max(0, Math.round(balance * 100) / 100);
}

/**
 * Calculate home equity (value minus outstanding loan)
 */
export function calculateHomeEquity(
  homeValue: number,
  loanBalance: number
): number {
  return Math.max(0, homeValue - loanBalance);
}

/**
 * Calculate years remaining on mortgage from current year
 */
export function calculateMortgageEndYear(
  originationYear: number,
  termYears: number
): number {
  return originationYear + termYears;
}

/**
 * Calculate remaining balance for a specific year given mortgage details
 */
export function calculateMortgageBalanceForYear(
  mortgage: MortgageDetails,
  year: number
): number {
  const yearsElapsed = year - mortgage.originationYear;

  if (yearsElapsed < 0) {
    // Before loan started
    return mortgage.loanBalance;
  }

  if (yearsElapsed >= mortgage.loanTermYears) {
    // Loan is paid off
    return 0;
  }

  // Check for early payoff
  if (mortgage.earlyPayoff?.enabled && year >= mortgage.earlyPayoff.payoffYear) {
    return 0;
  }

  return calculateRemainingBalance(
    mortgage.loanBalance,
    mortgage.interestRate,
    mortgage.loanTermYears,
    yearsElapsed
  );
}

// ==================== End Mortgage Calculations ====================

interface AccountBalances {
  taxable: number;
  taxableCostBasis: number;
  traditional: number;
  roth: number;
  hsa: number;
  cash: number;
}

interface AssetWithBalance extends Asset {
  currentBalance: number;
  currentCostBasis?: number;
}

interface WithdrawalResult {
  amount: number;
  penalty: number;
  federalTax: number;
  stateTax: number;
  source: string;
  balances: AccountBalances;
  assetBalances: Map<string, { balance: number; costBasis?: number }>; // Track individual asset balances
}

// Get the owner's age for a given asset
function getOwnerAge(
  owner: AccountOwner,
  selfAge: number,
  spouseAge: number | undefined
): number {
  switch (owner) {
    case 'self':
      return selfAge;
    case 'spouse':
      return spouseAge ?? selfAge;
    case 'joint':
      // Use the older age (conservative - allows earlier penalty-free access)
      return Math.max(selfAge, spouseAge ?? selfAge);
  }
}

// Check if an asset can be withdrawn from without penalty
function isPenaltyFree(
  asset: Asset,
  selfAge: number,
  spouseAge: number | undefined,
  penaltySettings: PenaltySettings
): boolean {
  const ownerAge = getOwnerAge(asset.owner, selfAge, spouseAge);
  const penaltyFreeAge = PENALTY_FREE_AGES[asset.type];

  // Cash, taxable, 529, and other are always penalty-free
  if (asset.type === 'cash' || asset.type === 'taxable' || asset.type === '529' || asset.type === 'other') {
    return true;
  }

  // Rule of 55 for 401(k)s
  if (
    penaltySettings.enableRule55 &&
    asset.is401k &&
    asset.separatedFromService &&
    ownerAge >= 55
  ) {
    return true;
  }

  // Standard age-based check
  return ownerAge >= penaltyFreeAge;
}

// Calculate penalty for a withdrawal
function calculatePenalty(
  asset: Asset,
  withdrawalAmount: number,
  selfAge: number,
  spouseAge: number | undefined,
  penaltySettings: PenaltySettings
): number {
  if (isPenaltyFree(asset, selfAge, spouseAge, penaltySettings)) {
    return 0;
  }

  // Apply appropriate penalty rate
  if (asset.type === 'hsa') {
    return withdrawalAmount * penaltySettings.hsaEarlyPenaltyRate;
  }

  if (asset.type === 'traditional' || asset.type === 'roth') {
    return withdrawalAmount * penaltySettings.earlyWithdrawalPenaltyRate;
  }

  return 0;
}

// Convert array-based assets to aggregated balances for tracking
function aggregateBalances(assets: Asset[]): AccountBalances {
  const balances: AccountBalances = {
    taxable: 0,
    taxableCostBasis: 0,
    traditional: 0,
    roth: 0,
    hsa: 0,
    cash: 0,
  };

  for (const asset of assets) {
    switch (asset.type) {
      case 'taxable':
      case '529':
      case 'other':
        // 529 and other treated like taxable for withdrawal purposes
        balances.taxable += asset.balance;
        balances.taxableCostBasis += asset.costBasis ?? 0;
        break;
      case 'traditional':
        balances.traditional += asset.balance;
        break;
      case 'roth':
        balances.roth += asset.balance;
        break;
      case 'hsa':
        balances.hsa += asset.balance;
        break;
      case 'cash':
        balances.cash += asset.balance;
        break;
    }
  }

  return balances;
}

// Create a map of asset ID to current balance for tracking
function createAssetBalanceMap(assets: Asset[]): Map<string, { balance: number; costBasis?: number }> {
  const map = new Map<string, { balance: number; costBasis?: number }>();
  for (const asset of assets) {
    map.set(asset.id, {
      balance: asset.balance,
      costBasis: asset.costBasis,
    });
  }
  return map;
}

// Sort assets by penalty-free status, then by balance (largest first)
function sortAssetsForWithdrawal(
  assets: AssetWithBalance[],
  selfAge: number,
  spouseAge: number | undefined,
  penaltySettings: PenaltySettings
): AssetWithBalance[] {
  return [...assets].sort((a, b) => {
    const aFree = isPenaltyFree(a, selfAge, spouseAge, penaltySettings);
    const bFree = isPenaltyFree(b, selfAge, spouseAge, penaltySettings);

    // Penalty-free accounts first
    if (aFree && !bFree) return -1;
    if (!aFree && bFree) return 1;

    // Then by balance (larger first)
    return b.currentBalance - a.currentBalance;
  });
}

function withdrawFromAccounts(
  needed: number,
  assets: Asset[],
  assetBalanceMap: Map<string, { balance: number; costBasis?: number }>,
  withdrawalOrder: WithdrawalSource[],
  traditionalTaxRate: number,
  capitalGainsTaxRate: number,
  stateTaxInfo: StateTaxInfo,
  selfAge: number,
  spouseAge: number | undefined,
  penaltySettings: PenaltySettings
): WithdrawalResult {
  let remaining = needed;
  let totalWithdrawn = 0;
  let totalPenalty = 0;
  let totalFederalTax = 0;
  let totalStateTax = 0;
  const sources: string[] = [];
  const newAssetBalanceMap = new Map(assetBalanceMap);

  // Build assets with current balances
  const assetsWithBalances: AssetWithBalance[] = assets.map((asset) => {
    const balanceInfo = assetBalanceMap.get(asset.id) || { balance: 0, costBasis: 0 };
    return {
      ...asset,
      currentBalance: balanceInfo.balance,
      currentCostBasis: balanceInfo.costBasis,
    };
  });

  // First, try to use cash (no tax, no penalty)
  const cashAssets = sortAssetsForWithdrawal(
    assetsWithBalances.filter((a) => a.type === 'cash' && a.currentBalance > 0),
    selfAge,
    spouseAge,
    penaltySettings
  );

  for (const asset of cashAssets) {
    if (remaining <= 0) break;

    const fromCash = Math.min(remaining, asset.currentBalance);
    const balanceInfo = newAssetBalanceMap.get(asset.id)!;
    newAssetBalanceMap.set(asset.id, {
      ...balanceInfo,
      balance: balanceInfo.balance - fromCash,
    });
    remaining -= fromCash;
    totalWithdrawn += fromCash;
    if (fromCash > 0) sources.push('Cash');
  }

  // Then follow withdrawal order
  for (const sourceType of withdrawalOrder) {
    if (remaining <= 0) break;

    // Get all assets of this type (529 and other are treated as taxable)
    const typeAssets = sortAssetsForWithdrawal(
      assetsWithBalances.filter((a) => {
        if (sourceType === 'taxable') {
          return (a.type === 'taxable' || a.type === '529' || a.type === 'other') && a.currentBalance > 0;
        }
        return a.type === sourceType && a.currentBalance > 0;
      }),
      selfAge,
      spouseAge,
      penaltySettings
    );

    for (const asset of typeAssets) {
      if (remaining <= 0) break;

      const balanceInfo = newAssetBalanceMap.get(asset.id)!;
      const available = balanceInfo.balance;

      if (available <= 0) continue;

      // Calculate gross withdrawal needed (accounting for tax)
      // Combined tax rate = federal + state
      let grossWithdrawal: number;
      let federalTaxOnWithdrawal = 0;
      let stateTaxOnWithdrawal = 0;

      if (sourceType === 'roth') {
        grossWithdrawal = remaining;
        // No tax on Roth withdrawals
      } else if (sourceType === 'traditional') {
        const combinedTaxRate = traditionalTaxRate + stateTaxInfo.incomeRate;
        grossWithdrawal = remaining / (1 - combinedTaxRate);
      } else {
        // Taxable: approximate - gains are only part of withdrawal
        const costBasisRatio = balanceInfo.costBasis !== undefined && available > 0
          ? balanceInfo.costBasis / available
          : 0.6; // Assume 60% cost basis if unknown
        const gainRatio = 1 - Math.min(1, costBasisRatio);
        const combinedCapGainsRate = capitalGainsTaxRate + stateTaxInfo.capitalGainsRate;
        const effectiveTaxRate = gainRatio * combinedCapGainsRate;
        grossWithdrawal = remaining / (1 - effectiveTaxRate);
      }

      const withdrawal = Math.min(grossWithdrawal, available);

      // Calculate taxes on this withdrawal
      if (sourceType === 'traditional') {
        federalTaxOnWithdrawal = withdrawal * traditionalTaxRate;
        stateTaxOnWithdrawal = withdrawal * stateTaxInfo.incomeRate;
      } else if (sourceType === 'taxable') {
        const costBasisRatio = balanceInfo.costBasis !== undefined && available > 0
          ? balanceInfo.costBasis / available
          : 0.6;
        const gainRatio = 1 - Math.min(1, costBasisRatio);
        const taxableGains = withdrawal * gainRatio;
        federalTaxOnWithdrawal = taxableGains * capitalGainsTaxRate;
        stateTaxOnWithdrawal = taxableGains * stateTaxInfo.capitalGainsRate;
      }
      // Roth and Cash: no taxes

      totalFederalTax += federalTaxOnWithdrawal;
      totalStateTax += stateTaxOnWithdrawal;

      // Calculate penalty
      const penalty = calculatePenalty(
        asset,
        withdrawal,
        selfAge,
        spouseAge,
        penaltySettings
      );
      totalPenalty += penalty;

      // Update balance (and cost basis for taxable)
      if (sourceType === 'taxable' && balanceInfo.costBasis !== undefined && available > 0) {
        const withdrawalRatio = withdrawal / available;
        newAssetBalanceMap.set(asset.id, {
          balance: available - withdrawal,
          costBasis: balanceInfo.costBasis * (1 - withdrawalRatio),
        });
      } else {
        newAssetBalanceMap.set(asset.id, {
          ...balanceInfo,
          balance: available - withdrawal,
        });
      }

      // Calculate net after tax (penalty reduces net further)
      const totalTaxOnWithdrawal = federalTaxOnWithdrawal + stateTaxOnWithdrawal;
      let netAfterTax: number;
      if (sourceType === 'roth') {
        netAfterTax = withdrawal - penalty;
      } else {
        netAfterTax = withdrawal - totalTaxOnWithdrawal - penalty;
      }

      remaining -= Math.max(0, netAfterTax);
      totalWithdrawn += withdrawal;

      if (withdrawal > 0) {
        const sourceName = sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
        if (!sources.includes(sourceName)) {
          sources.push(sourceName);
        }
      }
    }
  }

  // If still need more, try HSA (tax-free for medical, assume qualified)
  const hsaAssets = sortAssetsForWithdrawal(
    assetsWithBalances.filter((a) => a.type === 'hsa' && a.currentBalance > 0),
    selfAge,
    spouseAge,
    penaltySettings
  );

  for (const asset of hsaAssets) {
    if (remaining <= 0) break;

    const balanceInfo = newAssetBalanceMap.get(asset.id)!;
    const available = balanceInfo.balance;
    const fromHSA = Math.min(remaining, available);

    // Calculate HSA penalty if under 65
    const penalty = calculatePenalty(
      asset,
      fromHSA,
      selfAge,
      spouseAge,
      penaltySettings
    );
    totalPenalty += penalty;

    newAssetBalanceMap.set(asset.id, {
      ...balanceInfo,
      balance: available - fromHSA,
    });

    remaining -= (fromHSA - penalty);
    totalWithdrawn += fromHSA;
    if (fromHSA > 0 && !sources.includes('HSA')) sources.push('HSA');
  }

  // Aggregate new balances
  const newBalances = {
    taxable: 0,
    taxableCostBasis: 0,
    traditional: 0,
    roth: 0,
    hsa: 0,
    cash: 0,
  };

  for (const asset of assets) {
    const balanceInfo = newAssetBalanceMap.get(asset.id);
    if (!balanceInfo) continue;

    switch (asset.type) {
      case 'taxable':
      case '529':
      case 'other':
        // 529 and other treated like taxable for withdrawal purposes
        newBalances.taxable += balanceInfo.balance;
        newBalances.taxableCostBasis += balanceInfo.costBasis ?? 0;
        break;
      case 'traditional':
        newBalances.traditional += balanceInfo.balance;
        break;
      case 'roth':
        newBalances.roth += balanceInfo.balance;
        break;
      case 'hsa':
        newBalances.hsa += balanceInfo.balance;
        break;
      case 'cash':
        newBalances.cash += balanceInfo.balance;
        break;
    }
  }

  return {
    amount: totalWithdrawn,
    penalty: totalPenalty,
    federalTax: totalFederalTax,
    stateTax: totalStateTax,
    source: sources.join(', ') || 'None',
    balances: newBalances,
    assetBalances: newAssetBalanceMap,
  };
}

function growBalances(balances: AccountBalances, returnRate: number): AccountBalances {
  const growthFactor = 1 + returnRate;
  return {
    taxable: balances.taxable * growthFactor,
    taxableCostBasis: balances.taxableCostBasis, // Cost basis doesn't grow
    traditional: balances.traditional * growthFactor,
    roth: balances.roth * growthFactor,
    hsa: balances.hsa * growthFactor,
    cash: balances.cash, // Cash doesn't grow (or grows minimally)
  };
}

function growAssetBalances(
  assetBalanceMap: Map<string, { balance: number; costBasis?: number }>,
  assets: Asset[],
  returnRate: number
): Map<string, { balance: number; costBasis?: number }> {
  const growthFactor = 1 + returnRate;
  const newMap = new Map<string, { balance: number; costBasis?: number }>();

  for (const asset of assets) {
    const balanceInfo = assetBalanceMap.get(asset.id);
    if (!balanceInfo) continue;

    if (asset.type === 'cash') {
      // Cash doesn't grow
      newMap.set(asset.id, balanceInfo);
    } else if (asset.type === 'taxable') {
      // Taxable grows, cost basis stays same
      newMap.set(asset.id, {
        balance: balanceInfo.balance * growthFactor,
        costBasis: balanceInfo.costBasis,
      });
    } else {
      // Other accounts grow normally
      newMap.set(asset.id, {
        balance: balanceInfo.balance * growthFactor,
        costBasis: balanceInfo.costBasis,
      });
    }
  }

  return newMap;
}

interface YearExpenseResult {
  totalExpenses: number;
  mortgageBalance: number | undefined;
  mortgagePayoffAmount: number | undefined; // Amount needed for early payoff this year
}

/**
 * Calculate total expenses for a specific year, handling:
 * - Per-expense inflation rates
 * - Start/end year constraints
 * - Home expenses (mortgage with calculated end year, taxes/insurance with inflation)
 * - Early mortgage payoff
 */
function calculateYearExpenses(
  expenses: Expenses,
  year: number,
  currentYear: number,
  fiAge: number,
  currentAge: number,
  globalInflationRate: number,
  spendingMultiplier: number = 1
): YearExpenseResult {
  let totalExpenses = 0;
  let mortgageBalance: number | undefined = undefined;
  let mortgagePayoffAmount: number | undefined = undefined;

  // Years since FI for inflation calculation
  const fiYear = currentYear + (fiAge - currentAge);
  const yearsSinceFI = Math.max(0, year - fiYear);

  // Process regular expense categories
  for (const expense of expenses.categories) {
    const startYear = expense.startYear ?? currentYear;
    const endYear = expense.endYear ?? Infinity;

    // Skip if outside active years
    if (year < startYear || year > endYear) continue;

    // Calculate inflation-adjusted amount (only inflate after FI year)
    const yearsOfInflation = yearsSinceFI;
    const inflatedAmount = expense.annualAmount * Math.pow(1 + expense.inflationRate, yearsOfInflation);

    totalExpenses += inflatedAmount;
  }

  // Process home expenses separately
  if (expenses.home) {
    const home = expenses.home;
    const homeInflationRate = home.inflationRate ?? globalInflationRate;
    const yearsOfInflation = yearsSinceFI;

    // Mortgage handling with new MortgageDetails structure
    if (home.mortgage) {
      const mortgage = home.mortgage;

      // Calculate natural end year from origination + term
      const mortgageEndYear = mortgage.originationYear + mortgage.loanTermYears;

      // Check for early payoff
      const isEarlyPayoffYear = mortgage.earlyPayoff?.enabled && year === mortgage.earlyPayoff.payoffYear;
      const wasAlreadyPaidOff = mortgage.earlyPayoff?.enabled && year > mortgage.earlyPayoff.payoffYear;

      // Calculate remaining balance for this year
      mortgageBalance = calculateMortgageBalanceForYear(mortgage, year);

      if (isEarlyPayoffYear) {
        // Early payoff year: add remaining balance as one-time expense
        mortgagePayoffAmount = mortgageBalance;
        mortgageBalance = 0; // After payoff
        // No regular payment this year since we're paying it off
      } else if (!wasAlreadyPaidOff && year <= mortgageEndYear) {
        // Regular payment year
        const mortgageAnnual = mortgage.monthlyPayment * 12;
        totalExpenses += mortgageAnnual;
      }
      // If already paid off (either naturally or early), no payment
    }

    // Property Tax (inflates)
    if (home.propertyTax > 0) {
      const inflatedTax = home.propertyTax * Math.pow(1 + homeInflationRate, yearsOfInflation);
      totalExpenses += inflatedTax;
    }

    // Insurance (inflates)
    if (home.insurance > 0) {
      const inflatedInsurance = home.insurance * Math.pow(1 + homeInflationRate, yearsOfInflation);
      totalExpenses += inflatedInsurance;
    }
  }

  // Apply spending adjustment multiplier (but not to mortgage payoff - that's a fixed amount)
  return {
    totalExpenses: totalExpenses * spendingMultiplier,
    mortgageBalance,
    mortgagePayoffAmount,
  };
}

/**
 * Calculate base annual spending (current year expenses) for FI number calculation
 */
function calculateBaseAnnualSpending(expenses: Expenses, currentYear: number): number {
  let total = 0;

  // Sum expense categories that are active in current year
  for (const expense of expenses.categories) {
    const startYear = expense.startYear ?? currentYear;
    const endYear = expense.endYear ?? Infinity;
    if (currentYear >= startYear && currentYear <= endYear) {
      total += expense.annualAmount;
    }
  }

  // Add home expenses
  if (expenses.home) {
    if (expenses.home.mortgage) {
      const mortgage = expenses.home.mortgage;
      const mortgageEndYear = mortgage.originationYear + mortgage.loanTermYears;
      const isNotPaidOff = mortgage.earlyPayoff?.enabled
        ? currentYear < mortgage.earlyPayoff.payoffYear
        : currentYear <= mortgageEndYear;

      if (isNotPaidOff) {
        total += mortgage.monthlyPayment * 12;
      }
    }
    total += expenses.home.propertyTax + expenses.home.insurance;
  }

  return total;
}

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

  const { assumptions, socialSecurity, lifeEvents, profile, assets } = state;
  const penaltySettings = assumptions.penaltySettings;
  const stateTaxInfo = getStateTaxInfo(profile.state);

  for (let age = profile.currentAge; age <= profile.lifeExpectancy; age++) {
    const year = currentYear + (age - profile.currentAge);
    const isInFI = age >= effectiveFIAge;

    // Calculate spouse age
    const spouseAge = profile.filingStatus === 'married' && profile.spouseAge
      ? age - (profile.currentAge - profile.spouseAge)
      : undefined;

    // Calculate expenses using new category-based system
    const expenseResult = calculateYearExpenses(
      state.expenses,
      year,
      currentYear,
      effectiveFIAge,
      profile.currentAge,
      assumptions.inflationRate,
      spendingMultiplier
    );

    // Only count regular expenses during FI
    const yearExpenses = isInFI ? expenseResult.totalExpenses : 0;
    const mortgageBalance = expenseResult.mortgageBalance;

    // Mortgage payoff amount if applicable (this is an additional expense for the payoff year)
    const mortgagePayoffExpense = isInFI && expenseResult.mortgagePayoffAmount
      ? expenseResult.mortgagePayoffAmount
      : 0;

    // Add life events for this year
    const yearLifeEvents = lifeEvents.filter((e) => e.year === year);
    const lifeEventTotal = yearLifeEvents.reduce((sum, e) => sum + e.amount, 0);

    // Calculate income
    let income = 0;

    // Primary Social Security with COLA
    if (socialSecurity.include && age >= effectiveSSAge) {
      const yearsSinceStart = age - effectiveSSAge;
      const colaFactor = Math.pow(1 + (socialSecurity.colaRate || 0), yearsSinceStart);
      income += socialSecurity.monthlyBenefit * 12 * colaFactor;
    }

    // Spouse Social Security with COLA
    if (profile.filingStatus === 'married' && socialSecurity.spouse?.include && spouseAge !== undefined) {
      const spouseSSAge = whatIf?.spouseSSStartAge ?? socialSecurity.spouse.startAge;

      if (spouseAge >= spouseSSAge) {
        const yearsSinceStart = spouseAge - spouseSSAge;
        const colaFactor = Math.pow(1 + (socialSecurity.colaRate || 0), yearsSinceStart);
        income += socialSecurity.spouse.monthlyBenefit * 12 * colaFactor;
      }
    }

    // Pension with optional COLA
    if (assets.pension && age >= assets.pension.startAge) {
      const yearsSincePensionStart = age - assets.pension.startAge;
      const pensionColaRate = assets.pension.colaRate ?? 0;
      const pensionColaFactor = Math.pow(1 + pensionColaRate, yearsSincePensionStart);
      income += assets.pension.annualBenefit * pensionColaFactor;
    }

    // Calculate gap (expenses + life events + mortgage payoff - income)
    // Life events: positive = expense, negative = income
    const totalExpenses = yearExpenses + Math.max(0, lifeEventTotal) + mortgagePayoffExpense;
    const totalIncome = income + Math.abs(Math.min(0, lifeEventTotal));

    // During FI: gap covers regular expenses + life events
    // Before FI: only life events affect portfolio (regular expenses covered by salary)
    const fiGap = isInFI ? Math.max(0, totalExpenses - totalIncome) : 0;

    // Life events during working years still affect portfolio directly
    // Positive = expense (withdraw from portfolio), Negative = income (add to portfolio)
    const preFILifeEventImpact = !isInFI ? lifeEventTotal : 0;

    // Withdraw from accounts if in FI
    let withdrawal = 0;
    let withdrawalPenalty = 0;
    let federalTax = 0;
    let stateTax = 0;
    let withdrawalSource = 'N/A';

    // Handle pre-FI life events (direct portfolio adjustment)
    if (!isInFI && preFILifeEventImpact !== 0) {
      if (preFILifeEventImpact > 0) {
        // Expense: withdraw from portfolio
        const result = withdrawFromAccounts(
          preFILifeEventImpact,
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
        withdrawalSource = result.source + ' (Life Event)';
        balances = result.balances;
        assetBalanceMap = result.assetBalances;
      } else {
        // Income: add to portfolio (put in cash for simplicity)
        const incomeAmount = Math.abs(preFILifeEventImpact);
        // Find cash account or first taxable account to deposit into
        for (const asset of assets.accounts) {
          if (asset.type === 'cash' || asset.type === 'taxable') {
            const balanceInfo = assetBalanceMap.get(asset.id);
            if (balanceInfo) {
              assetBalanceMap.set(asset.id, {
                ...balanceInfo,
                balance: balanceInfo.balance + incomeAmount,
              });
              balances.cash += asset.type === 'cash' ? incomeAmount : 0;
              balances.taxable += asset.type === 'taxable' ? incomeAmount : 0;
              withdrawalSource = 'Life Event Income';
              break;
            }
          }
        }
      }
    }

    // Handle FI withdrawals for regular expenses
    if (isInFI && fiGap > 0) {
      const result = withdrawFromAccounts(
        fiGap,
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

    // Check for shortfall (can happen during FI or with large pre-FI life events)
    const totalBalance = balances.taxable + balances.traditional + balances.roth + balances.hsa + balances.cash;
    const neededAmount = isInFI ? fiGap : preFILifeEventImpact;
    const isShortfall = neededAmount > 0 && totalBalance < neededAmount && withdrawal < neededAmount;

    // Record this year's projection (liquid assets only, home is now in expenses)
    const totalNetWorth = totalBalance;

    // Gap represents what needs to come from portfolio
    const gap = isInFI ? fiGap : Math.max(0, preFILifeEventImpact);

    // Update withdrawal source if mortgage payoff occurred
    const finalWithdrawalSource = mortgagePayoffExpense > 0 && withdrawalSource !== 'N/A'
      ? `${withdrawalSource} (+ Mortgage Payoff)`
      : mortgagePayoffExpense > 0
        ? 'Mortgage Payoff'
        : withdrawalSource;

    projections.push({
      year,
      age,
      expenses: totalExpenses,
      income: totalIncome,
      gap,
      withdrawal,
      withdrawalPenalty,
      federalTax,
      stateTax,
      withdrawalSource: finalWithdrawalSource,
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

export function calculateSummary(
  state: AppState,
  projections: YearProjection[],
  whatIf?: WhatIfAdjustments
): ProjectionSummary {
  const currentYear = new Date().getFullYear();
  const baseAnnualSpending = calculateBaseAnnualSpending(state.expenses, currentYear);
  const effectiveSpending = baseAnnualSpending * (1 + (whatIf?.spendingAdjustment || 0));
  const effectiveSWR = state.assumptions.safeWithdrawalRate;

  // FI Number
  const fiNumber = effectiveSpending / effectiveSWR;

  // Current Net Worth (liquid assets only)
  const currentNetWorth = state.assets.accounts.reduce(
    (sum, asset) => sum + asset.balance,
    0
  );

  // Gap
  const gap = currentNetWorth - fiNumber;

  // Find shortfall age
  const shortfallYear = projections.find((p) => p.isShortfall);
  const hasShortfall = !!shortfallYear;
  const shortfallAge = shortfallYear?.age || null;

  // Runway age (last year with positive balance, or life expectancy if no shortfall)
  const lastPositiveYear = [...projections]
    .reverse()
    .find((p) => p.totalNetWorth > 0 && !p.isShortfall);
  const runwayAge = hasShortfall && shortfallAge
    ? shortfallAge - 1
    : lastPositiveYear?.age || state.profile.lifeExpectancy;

  // Buffer years
  const bufferYears = runwayAge - state.profile.lifeExpectancy;

  return {
    fiNumber,
    currentNetWorth,
    gap,
    runwayAge,
    hasShortfall,
    shortfallAge,
    bufferYears,
  };
}

export function calculateFINumber(annualSpending: number, swr: number): number {
  return annualSpending / swr;
}

/**
 * Test if a given FI age is viable (no shortfall before life expectancy + buffer)
 *
 * The viability test requires money to last MINIMUM_BUFFER_YEARS beyond life expectancy.
 * This ensures that large expenses (like life events) that reduce the buffer will
 * appropriately push the achievable FI age later.
 */
function testFIAge(
  state: AppState,
  fiAge: number,
  whatIf?: WhatIfAdjustments
): boolean {
  // Extend life expectancy by buffer years to ensure adequate margin
  // This means an FI age is only viable if money lasts 5 years PAST planning horizon
  const MINIMUM_BUFFER_YEARS = 5;
  const extendedLifeExpectancy = state.profile.lifeExpectancy + MINIMUM_BUFFER_YEARS;

  // Create a modified state with the test FI age and extended life expectancy
  const testState: AppState = {
    ...state,
    profile: {
      ...state.profile,
      targetFIAge: fiAge,
      lifeExpectancy: extendedLifeExpectancy, // Test beyond life expectancy
    },
  };

  // Run projection with what-if adjustments (but no FI age adjustment)
  const projections = calculateProjection(testState, whatIf);

  // Check if any year has a shortfall (now tests to lifeExpectancy + 5)
  return !projections.some((p) => p.isShortfall);
}

/**
 * Calculate the earliest achievable FI age using binary search
 */
export function calculateAchievableFIAge(
  state: AppState,
  whatIf?: WhatIfAdjustments
): AchievableFIResult {
  const { currentAge, lifeExpectancy } = state.profile;

  // First, test if already FI at current age
  if (testFIAge(state, currentAge, whatIf)) {
    // Calculate buffer by finding how long money lasts past life expectancy
    const testState: AppState = {
      ...state,
      profile: {
        ...state.profile,
        targetFIAge: currentAge,
        lifeExpectancy: 120, // Extend to find true runway
      },
    };
    const projections = calculateProjection(testState, whatIf);
    const shortfallYear = projections.find((p) => p.isShortfall);
    const runwayAge = shortfallYear ? shortfallYear.age - 1 : 120;
    const bufferYears = runwayAge - lifeExpectancy;

    let confidenceLevel: AchievableFIResult['confidenceLevel'];
    if (bufferYears >= 10) {
      confidenceLevel = 'high';
    } else if (bufferYears >= 5) {
      confidenceLevel = 'moderate';
    } else {
      confidenceLevel = 'tight';
    }

    return {
      achievableFIAge: currentAge,
      confidenceLevel,
      bufferYears,
      yearsUntilFI: 0,
      fiAtCurrentAge: true,
    };
  }

  // Test if FI is ever achievable (test at life expectancy - 1)
  if (!testFIAge(state, lifeExpectancy - 1, whatIf)) {
    return {
      achievableFIAge: null,
      confidenceLevel: 'not_achievable',
      bufferYears: 0,
      yearsUntilFI: null,
      fiAtCurrentAge: false,
    };
  }

  // Binary search for earliest viable FI age
  let low = currentAge;
  let high = lifeExpectancy - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);

    if (testFIAge(state, mid, whatIf)) {
      // This age works, try earlier
      high = mid;
    } else {
      // This age doesn't work, try later
      low = mid + 1;
    }
  }

  const achievableFIAge = low;
  const yearsUntilFI = achievableFIAge - currentAge;

  // Calculate buffer for the achievable age
  const testState: AppState = {
    ...state,
    profile: {
      ...state.profile,
      targetFIAge: achievableFIAge,
      lifeExpectancy: 120, // Extend to find true runway
    },
  };
  const projections = calculateProjection(testState, whatIf);
  const shortfallYear = projections.find((p) => p.isShortfall);
  const runwayAge = shortfallYear ? shortfallYear.age - 1 : 120;
  const bufferYears = runwayAge - lifeExpectancy;

  let confidenceLevel: AchievableFIResult['confidenceLevel'];
  if (bufferYears >= 10) {
    confidenceLevel = 'high';
  } else if (bufferYears >= 5) {
    confidenceLevel = 'moderate';
  } else {
    confidenceLevel = 'tight';
  }

  return {
    achievableFIAge,
    confidenceLevel,
    bufferYears,
    yearsUntilFI,
    fiAtCurrentAge: false,
  };
}
