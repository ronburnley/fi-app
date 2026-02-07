import type {
  Expenses,
  FinancialPhase,
  EmploymentIncome,
  RetirementIncome,
} from '../../types';
import type { EmploymentIncomeResult, YearExpenseResult } from './types';
import { calculateMortgageBalanceForYear } from './mortgage';

// ==================== Income/Phase Helpers ====================

/**
 * Determine the financial phase for a given year
 * - 'accumulating': Before FI age (may have employment income)
 * - 'fi': At or past FI age (no employment, drawdown phase)
 *
 * Employment stops at FI age for primary. Spouse may work longer
 * by spouseAdditionalWorkYears.
 */
export function determinePhase(
  selfAge: number,
  fiAge: number
): FinancialPhase {
  if (selfAge >= fiAge) {
    return 'fi';
  }
  return 'accumulating';
}

/**
 * Calculate total employment income for a given year
 * Returns gross, net (after tax and contributions), tax, and contribution amounts
 *
 * Primary employment stops at fiAge. Spouse employment stops at
 * fiAge + spouseAdditionalWorkYears (on primary's age calendar).
 */
export function calculateEmploymentIncome(
  selfAge: number,
  spouseAge: number | undefined,
  selfEmployment: EmploymentIncome | undefined,
  spouseEmployment: EmploymentIncome | undefined,
  filingStatus: 'single' | 'married',
  fiAge: number,
  spouseAdditionalWorkYears: number = 0
): EmploymentIncomeResult {
  let grossIncome = 0;
  let selfContributions = 0;
  let spouseContributions = 0;
  let tax = 0;

  // Self employment income: stops at FI age
  if (selfEmployment && selfAge < fiAge) {
    grossIncome += selfEmployment.annualGrossIncome;
    selfContributions = selfEmployment.annualContributions;
    tax += selfEmployment.annualGrossIncome * selfEmployment.effectiveTaxRate;
  }

  // Spouse employment income: stops at fiAge + spouseAdditionalWorkYears (on primary's calendar)
  const spouseStopAge = fiAge + spouseAdditionalWorkYears;
  if (filingStatus === 'married' && spouseEmployment && spouseAge !== undefined && selfAge < spouseStopAge) {
    grossIncome += spouseEmployment.annualGrossIncome;
    spouseContributions = spouseEmployment.annualContributions;
    tax += spouseEmployment.annualGrossIncome * spouseEmployment.effectiveTaxRate;
  }

  const contributions = selfContributions + spouseContributions;
  // Net = gross - tax - contributions (contributions go to accounts, not spending)
  const netIncome = grossIncome - tax - contributions;

  return {
    grossIncome,
    netIncome,
    tax,
    contributions,
    selfContributions,
    spouseContributions,
  };
}

/**
 * Calculate total retirement income streams (excluding SS and pension)
 */
export function calculateRetirementIncomeStreams(
  retirementIncomes: RetirementIncome[],
  age: number,
  _yearsSinceFI: number,  // No longer used - inflate from income start
  inflationRate: number
): number {
  let total = 0;

  for (const ri of retirementIncomes) {
    // Check if income is active at this age
    if (age < ri.startAge) continue;
    if (ri.endAge !== undefined && age > ri.endAge) continue;

    let amount = ri.annualAmount;

    // Apply inflation adjustment if enabled (from when income started)
    if (ri.inflationAdjusted) {
      const yearsSinceStart = age - ri.startAge;
      if (yearsSinceStart > 0) {
        amount *= Math.pow(1 + inflationRate, yearsSinceStart);
      }
    }

    total += amount;
  }

  return total;
}

/**
 * Calculate total expenses for a specific year, handling:
 * - Per-expense inflation rates
 * - Start/end year constraints
 * - Home expenses (mortgage with calculated end year, taxes/insurance with inflation)
 * - Early mortgage payoff
 */
export function calculateYearExpenses(
  expenses: Expenses,
  year: number,
  currentYear: number,
  _fiAge: number,  // No longer used - expenses inflate from current year
  _currentAge: number,  // No longer used
  globalInflationRate: number,
  spendingMultiplier: number = 1
): YearExpenseResult {
  let totalExpenses = 0;
  let mortgageBalance: number | undefined = undefined;
  let mortgagePayoffAmount: number | undefined = undefined;

  // Years from now for inflation calculation
  // Expenses inflate every year, not just after FI
  const yearsFromNow = Math.max(0, year - currentYear);

  // Process regular expense categories
  for (const expense of expenses.categories) {
    const startYear = expense.startYear ?? currentYear;
    const endYear = expense.endYear ?? Infinity;

    // Skip if outside active years
    if (year < startYear || year > endYear) continue;

    // Calculate inflation-adjusted amount from current year
    const inflatedAmount = expense.annualAmount * Math.pow(1 + expense.inflationRate, yearsFromNow);

    totalExpenses += inflatedAmount;
  }

  // Process home expenses separately
  if (expenses.home) {
    const home = expenses.home;
    const homeInflationRate = home.inflationRate ?? globalInflationRate;

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

    // Property Tax (inflates from current year)
    if (home.propertyTax > 0) {
      const inflatedTax = home.propertyTax * Math.pow(1 + homeInflationRate, yearsFromNow);
      totalExpenses += inflatedTax;
    }

    // Insurance (inflates from current year)
    if (home.insurance > 0) {
      const inflatedInsurance = home.insurance * Math.pow(1 + homeInflationRate, yearsFromNow);
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
export function calculateBaseAnnualSpending(expenses: Expenses, currentYear: number): number {
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
