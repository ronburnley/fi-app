import type {
  AppState,
  WhatIfAdjustments,
  AchievableFIResult,
  ShortfallGuidance,
  YearProjection,
} from '../../types';
import { calculateProjection } from './projection';

interface FIAgeEvaluation {
  projections: YearProjection[];
  shortfallYear: YearProjection | undefined;
  terminalBalance: number;
}

function evaluateFIAge(
  state: AppState,
  fiAge: number,
  whatIf?: WhatIfAdjustments
): FIAgeEvaluation {
  const testState: AppState = {
    ...state,
    profile: {
      ...state.profile,
      targetFIAge: fiAge,
    },
  };

  const projections = calculateProjection(testState, whatIf);
  const shortfallYear = projections.find((p) => p.isShortfall);
  const terminalBalance = projections[projections.length - 1]?.totalNetWorth ?? 0;

  return { projections, shortfallYear, terminalBalance };
}

function isFIAgeViable(
  state: AppState,
  fiAge: number,
  whatIf?: WhatIfAdjustments
): boolean {
  return !evaluateFIAge(state, fiAge, whatIf).shortfallYear;
}

function calculateConfidence(
  state: AppState,
  fiAge: number,
  lifeExpectancy: number,
  whatIf?: WhatIfAdjustments
): Pick<AchievableFIResult, 'confidenceLevel' | 'bufferYears'> {
  const testState: AppState = {
    ...state,
    profile: {
      ...state.profile,
      targetFIAge: fiAge,
      lifeExpectancy: 120,
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

  return { confidenceLevel, bufferYears };
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
  const latestFIAge = lifeExpectancy - 1;

  // Find when money runs out (test at latest possible FI = life expectancy - 1).
  const { projections, shortfallYear } = evaluateFIAge(state, latestFIAge, whatIf);
  const runsOutAtAge = shortfallYear ? shortfallYear.age : lifeExpectancy;

  // Search for spending reduction that makes FI achievable at lifeExpectancy - 1
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
    if (isFIAgeViable(state, latestFIAge, adjustedWhatIf)) {
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
    .reduce((sum, p) => sum + p.unmetNeed, 0);
  const additionalSavingsNeeded = yearsToLE > 0 ? Math.round(shortfallAmount / yearsToLE) : 0;

  return {
    runsOutAtAge,
    spendingReductionNeeded,
    additionalSavingsNeeded,
  };
}

/**
 * Calculate achievable FI age based on terminal-balance targeting.
 */
export function calculateAchievableFIAge(
  state: AppState,
  whatIf?: WhatIfAdjustments
): AchievableFIResult {
  const { currentAge, lifeExpectancy } = state.profile;
  const latestPossibleFIAge = Math.max(currentAge, lifeExpectancy - 1);
  const targetTerminalBalance = state.assumptions.terminalBalanceTarget ?? 0;

  // Find viable FI ages and choose the one whose terminal balance
  // is closest to the configured target (default $0).
  let bestAge: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let fiAge = currentAge; fiAge <= latestPossibleFIAge; fiAge++) {
    const evaluation = evaluateFIAge(state, fiAge, whatIf);
    if (evaluation.shortfallYear) continue;

    const distance = Math.abs(evaluation.terminalBalance - targetTerminalBalance);
    if (
      distance < bestDistance ||
      (Math.abs(distance - bestDistance) < 0.01 && (bestAge === null || fiAge < bestAge))
    ) {
      bestAge = fiAge;
      bestDistance = distance;
    }
  }

  if (bestAge === null) {
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

  const achievableFIAge = bestAge;
  const yearsUntilFI = achievableFIAge - currentAge;
  const { confidenceLevel, bufferYears } = calculateConfidence(
    state,
    achievableFIAge,
    lifeExpectancy,
    whatIf
  );

  return {
    achievableFIAge,
    confidenceLevel,
    bufferYears,
    yearsUntilFI,
    fiAtCurrentAge: achievableFIAge === currentAge,
  };
}
