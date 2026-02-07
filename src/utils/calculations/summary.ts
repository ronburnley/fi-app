import type {
  AppState,
  YearProjection,
  ProjectionSummary,
  WhatIfAdjustments,
} from '../../types';
import { calculateBaseAnnualSpending } from './expenses';

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
