import type {
  AppState,
  YearProjection,
  ProjectionSummary,
} from '../../types';

export function calculateSummary(
  state: AppState,
  projections: YearProjection[],
  _whatIf?: unknown,
  achievableFIAge?: number | null
): ProjectionSummary {
  // FI Number: net worth at the achievable FI age from the projection timeline
  let fiNumber = 0;
  if (achievableFIAge != null) {
    const fiYearProjection = projections.find((p) => p.age === achievableFIAge);
    if (fiYearProjection) {
      fiNumber = fiYearProjection.totalNetWorth;
    }
  }

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

  // Terminal balance at life expectancy
  const leProjection = projections[projections.length - 1];
  const surplusAtLE = leProjection ? leProjection.totalNetWorth : 0;

  // Bottleneck: lowest balance during FI phase
  const fiProjections = projections.filter(p => p.phase === 'fi');
  let bottleneckAge: number | undefined;
  let bottleneckBalance: number | undefined;
  if (fiProjections.length > 0) {
    const bottleneck = fiProjections.reduce((min, p) =>
      p.totalNetWorth < min.totalNetWorth ? p : min
    );
    bottleneckAge = bottleneck.age;
    bottleneckBalance = bottleneck.totalNetWorth;
  }

  return {
    fiNumber,
    currentNetWorth,
    gap,
    runwayAge,
    hasShortfall,
    shortfallAge,
    bufferYears,
    surplusAtLE,
    bottleneckAge,
    bottleneckBalance,
  };
}
