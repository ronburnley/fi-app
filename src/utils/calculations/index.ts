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
export { calculateSummary } from './summary';

// FI age search + goal guidance
export { calculateAchievableFIAge, calculateGoalFIGuidance } from './fiSearch';
