import type { MortgageDetails } from '../../types';

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
