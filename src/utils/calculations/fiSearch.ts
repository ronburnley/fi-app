import type {
  AppState,
  WhatIfAdjustments,
  AchievableFIResult,
  ShortfallGuidance,
  GoalFIGuidance,
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

function calculateBaseSpending(state: AppState): number {
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
  return baseSpending;
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
      const baseSpending = calculateBaseSpending(state);
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

/**
 * Calculate goal FI guidance — what it takes to retire at a specific target age.
 */
export function calculateGoalFIGuidance(
  state: AppState,
  goalAge: number,
  achievableFIAge: number | null,
  whatIf?: WhatIfAdjustments
): GoalFIGuidance {
  // On track: goal matches achievable
  if (achievableFIAge !== null && goalAge === achievableFIAge) {
    return { goalAge, achievableAge: achievableFIAge, status: 'on_track' };
  }

  // Ahead of goal: goal is later than achievable (user wants to work longer)
  if (achievableFIAge !== null && goalAge > achievableFIAge) {
    const evaluation = evaluateFIAge(state, goalAge, whatIf);
    const surplusAtLE = evaluation.terminalBalance;

    // Calculate buffer years beyond LE
    const confidenceResult = calculateConfidence(state, goalAge, state.profile.lifeExpectancy, whatIf);
    const additionalBufferYears = confidenceResult.bufferYears;

    // Find spending increase room: iterate spending increases until no longer viable
    let spendingIncreaseRoom = 0;
    const currentSpendingMultiplier = 1 + (whatIf?.spendingAdjustment || 0);
    for (let increase = 0.01; increase <= 1.0; increase += 0.01) {
      const adjustedWhatIf: WhatIfAdjustments = {
        ...whatIf,
        spendingAdjustment: (currentSpendingMultiplier * (1 + increase)) - 1,
        returnAdjustment: whatIf?.returnAdjustment ?? state.assumptions.investmentReturn,
        ssStartAge: whatIf?.ssStartAge ?? state.socialSecurity.startAge,
      };
      if (!isFIAgeViable(state, goalAge, adjustedWhatIf)) {
        // Previous increment was the max
        const baseSpending = calculateBaseSpending(state);
        spendingIncreaseRoom = Math.round(baseSpending * currentSpendingMultiplier * (increase - 0.01));
        break;
      }
    }

    return {
      goalAge,
      achievableAge: achievableFIAge,
      status: 'ahead_of_goal',
      surplusAtLE,
      additionalBufferYears,
      spendingIncreaseRoom,
    };
  }

  // Behind goal: goal is earlier than achievable (or FI not achievable at all)
  const currentSpendingMultiplier = 1 + (whatIf?.spendingAdjustment || 0);
  const currentReturn = whatIf?.returnAdjustment ?? state.assumptions.investmentReturn;
  const currentSSAge = whatIf?.ssStartAge ?? state.socialSecurity.startAge;
  const baseSpending = calculateBaseSpending(state);
  const effectiveSpending = baseSpending * currentSpendingMultiplier;

  // Lever 1: Spending reduction (1% steps up to 80%)
  let spendingReduction: GoalFIGuidance['spendingReduction'];
  for (let pct = 0.01; pct <= 0.80; pct += 0.01) {
    const adjustedWhatIf: WhatIfAdjustments = {
      ...whatIf,
      spendingAdjustment: (currentSpendingMultiplier * (1 - pct)) - 1,
      returnAdjustment: currentReturn,
      ssStartAge: currentSSAge,
    };
    if (isFIAgeViable(state, goalAge, adjustedWhatIf)) {
      const annualAmount = Math.round(effectiveSpending * pct);
      spendingReduction = {
        annualAmount,
        percentReduction: Math.round(pct * 100),
        resultingAnnualSpending: Math.round(effectiveSpending - annualAmount),
      };
      break;
    }
  }

  // Lever 2: Additional savings needed
  // Inject extra annual contributions into a synthetic taxable account and test viability.
  // Contributions stop at the goal FI age (no saving after retirement).
  // Iterate in $6,000/yr ($500/mo) steps up to $300,000/yr ($25,000/mo).
  let additionalSavingsNeeded: GoalFIGuidance['additionalSavingsNeeded'];
  const savingsSearchMax = 300000;
  const currentYear = new Date().getFullYear();
  const goalFIYear = currentYear + (goalAge - state.profile.currentAge) - 1;
  for (let extra = 6000; extra <= savingsSearchMax; extra += 6000) {
    const testState: AppState = {
      ...state,
      assets: {
        ...state.assets,
        accounts: [
          ...state.assets.accounts,
          {
            id: '__goal_extra_savings',
            name: 'Extra Savings',
            type: 'taxable',
            owner: 'self',
            balance: 0,
            costBasis: 0,
            annualContribution: extra,
            contributionEndYear: goalFIYear,
          },
        ],
      },
    };
    if (isFIAgeViable(testState, goalAge, whatIf)) {
      additionalSavingsNeeded = { amount: extra, sufficient: true };
      break;
    }
  }
  // If we hit the cap without finding viability, report the max as insufficient
  if (!additionalSavingsNeeded) {
    additionalSavingsNeeded = { amount: savingsSearchMax, sufficient: false };
  }

  // Lever 3: Required return (0.5% steps from current to 12%)
  let requiredReturn: GoalFIGuidance['requiredReturn'];
  for (let rate = currentReturn + 0.005; rate <= 0.12; rate += 0.005) {
    const adjustedWhatIf: WhatIfAdjustments = {
      ...whatIf,
      spendingAdjustment: whatIf?.spendingAdjustment ?? 0,
      returnAdjustment: rate,
      ssStartAge: currentSSAge,
    };
    if (isFIAgeViable(state, goalAge, adjustedWhatIf)) {
      requiredReturn = { rate: Math.round(rate * 1000) / 1000, currentRate: currentReturn };
      break;
    }
  }

  // Lever 4: SS delay to 70 (if not already at 70)
  let ssDelayBenefit: GoalFIGuidance['ssDelayBenefit'];
  if (state.socialSecurity.include && currentSSAge !== 70) {
    const adjustedWhatIf: WhatIfAdjustments = {
      ...whatIf,
      spendingAdjustment: whatIf?.spendingAdjustment ?? 0,
      returnAdjustment: currentReturn,
      ssStartAge: 70,
    };
    const viable = isFIAgeViable(state, goalAge, adjustedWhatIf);
    ssDelayBenefit = { newStartAge: 70, sufficient: viable };
  }

  return {
    goalAge,
    achievableAge: achievableFIAge,
    status: 'behind_goal',
    spendingReduction,
    additionalSavingsNeeded,
    requiredReturn,
    ssDelayBenefit,
  };
}
