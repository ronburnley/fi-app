// ==================== Social Security Adjustment ====================

/**
 * SSA adjustment factors based on claiming age relative to FRA (67).
 * Early claiming at 62 reduces benefit by 30%.
 * Delayed claiming at 70 increases benefit by 24%.
 */
export const SS_ADJUSTMENT_FACTORS: Record<62 | 67 | 70, number> = {
  62: 0.70,
  67: 1.00,
  70: 1.24,
};

/** Returns the SS benefit multiplier for a given claiming age. */
export function getSSAdjustmentFactor(startAge: 62 | 67 | 70): number {
  return SS_ADJUSTMENT_FACTORS[startAge];
}

/** Returns the adjusted monthly SS benefit based on FRA benefit and claiming age. */
export function getAdjustedSSBenefit(fraBenefit: number, startAge: 62 | 67 | 70): number {
  return fraBenefit * getSSAdjustmentFactor(startAge);
}
