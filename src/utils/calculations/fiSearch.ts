import type {
  AppState,
  WhatIfAdjustments,
  AchievableFIResult,
  ShortfallGuidance,
} from '../../types';
import { calculateProjection } from './projection';

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
 * Calculate shortfall guidance when FI is not achievable.
 * Provides actionable numbers: when money runs out, how much to cut spending,
 * how much more to save.
 */
function calculateShortfallGuidance(
  state: AppState,
  whatIf?: WhatIfAdjustments
): ShortfallGuidance {
  const { lifeExpectancy } = state.profile;

  // Find when money runs out (test at latest possible FI = life expectancy - 1)
  const testState: AppState = {
    ...state,
    profile: {
      ...state.profile,
      targetFIAge: lifeExpectancy - 1,
    },
  };
  const projections = calculateProjection(testState, whatIf);
  const shortfallYear = projections.find((p) => p.isShortfall);
  const runsOutAtAge = shortfallYear ? shortfallYear.age : lifeExpectancy;

  // Binary search for spending reduction that makes FI achievable at lifeExpectancy - 1
  let spendingReductionNeeded = 0;
  const currentSpendingMultiplier = 1 + (whatIf?.spendingAdjustment || 0);

  // Try spending reductions from 5% to 80% in 5% increments
  for (let reduction = 0.05; reduction <= 0.80; reduction += 0.05) {
    const adjustedWhatIf: WhatIfAdjustments = {
      ...whatIf,
      spendingAdjustment: (currentSpendingMultiplier * (1 - reduction)) - 1,
      returnAdjustment: whatIf?.returnAdjustment ?? state.assumptions.investmentReturn,
      ssStartAge: whatIf?.ssStartAge ?? state.socialSecurity.startAge,
    };
    if (testFIAge(state, lifeExpectancy - 1, adjustedWhatIf)) {
      // Calculate annual dollar amount of reduction needed
      const currentYear = new Date().getFullYear();
      let baseSpending = 0;
      for (const expense of state.expenses.categories) {
        const startYear = expense.startYear ?? currentYear;
        const endYear = expense.endYear ?? Infinity;
        if (currentYear >= startYear && currentYear <= endYear) {
          baseSpending += expense.annualAmount;
        }
      }
      if (state.expenses.home) {
        if (state.expenses.home.mortgage) {
          baseSpending += state.expenses.home.mortgage.monthlyPayment * 12;
        }
        baseSpending += state.expenses.home.propertyTax + state.expenses.home.insurance;
      }
      spendingReductionNeeded = Math.round(baseSpending * currentSpendingMultiplier * reduction);
      break;
    }
  }

  // Estimate additional savings needed (annual) using simple approach:
  // years until life expectancy * additional savings = roughly the shortfall
  const yearsToLE = lifeExpectancy - state.profile.currentAge;
  const shortfallAmount = projections
    .filter((p) => p.isShortfall)
    .reduce((sum, p) => sum + Math.max(0, p.gap - p.withdrawal), 0);
  const additionalSavingsNeeded = yearsToLE > 0 ? Math.round(shortfallAmount / yearsToLE) : 0;

  return {
    runsOutAtAge,
    spendingReductionNeeded,
    additionalSavingsNeeded,
  };
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
    // Calculate shortfall guidance
    const shortfallGuidance = calculateShortfallGuidance(state, whatIf);

    return {
      achievableFIAge: null,
      confidenceLevel: 'not_achievable',
      bufferYears: 0,
      yearsUntilFI: null,
      fiAtCurrentAge: false,
      shortfallGuidance,
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
