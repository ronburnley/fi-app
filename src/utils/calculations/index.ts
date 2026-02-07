// Mortgage calculations
export {
  calculateMonthlyPayment,
  calculateRemainingBalance,
  calculateHomeEquity,
  calculateMortgageEndYear,
  calculateMortgageBalanceForYear,
} from './mortgage';

// Social Security
export {
  SS_ADJUSTMENT_FACTORS,
  getSSAdjustmentFactor,
  getAdjustedSSBenefit,
} from './socialSecurity';

// Projection engine
export { calculateProjection } from './projection';

// Summary
export { calculateSummary, calculateFINumber } from './summary';

// FI age binary search
export { calculateAchievableFIAge } from './fiSearch';
