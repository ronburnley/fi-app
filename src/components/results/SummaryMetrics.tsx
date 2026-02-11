import { useProjectionContext } from '../../context/ProjectionContext';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

export function SummaryMetrics() {
  const { state } = useApp();
  const { summary, achievableFI } = useProjectionContext();

  const isOnTrack = summary.gap >= 0;
  const hasBuffer = achievableFI.bufferYears >= 0;
  const isAchievable = achievableFI.confidenceLevel !== 'not_achievable';

  return (
    <div className="space-y-4">
      {/* Main metrics grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Achievable FI Age - Featured */}
        <div className={`bg-bg-secondary border rounded-lg p-4 ${
          isAchievable ? 'border-accent-primary/30' : 'border-accent-warning/30'
        }`}>
          <p className="text-xs text-text-muted mb-1">Achievable FI Age</p>
          <p className={`text-xl font-semibold tabular-nums ${
            isAchievable ? 'text-accent-primary' : 'text-accent-warning'
          }`}>
            {achievableFI.achievableFIAge !== null
              ? `Age ${achievableFI.achievableFIAge}`
              : 'Not achievable'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {achievableFI.fiAtCurrentAge
              ? 'Already FI!'
              : achievableFI.yearsUntilFI !== null
                ? `${achievableFI.yearsUntilFI} years from now`
                : achievableFI.shortfallGuidance
                  ? `Money runs out at age ${achievableFI.shortfallGuidance.runsOutAtAge}`
                  : 'Review inputs'}
          </p>
        </div>

        {/* Current Net Worth */}
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4">
          <p className="text-xs text-text-muted mb-1">Net Worth (Liquid)</p>
          <p className="text-xl font-semibold text-text-primary tabular-nums">
            {formatCurrency(summary.currentNetWorth, true)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Excludes home equity
          </p>
        </div>

        {/* FI Number */}
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4">
          <p className="text-xs text-text-muted mb-1">FI Number</p>
          <p className="text-xl font-semibold text-text-primary tabular-nums">
            {formatCurrency(summary.fiNumber, true)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Based on {(state.assumptions.safeWithdrawalRate * 100).toFixed(0)}% SWR
          </p>
        </div>

        {/* Progress to FI */}
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4">
          <p className="text-xs text-text-muted mb-1">Progress to FI</p>
          <p
            className={`text-xl font-semibold tabular-nums ${
              isOnTrack ? 'text-accent-primary' : 'text-text-primary'
            }`}
          >
            {Math.min(100, Math.round((summary.currentNetWorth / summary.fiNumber) * 100))}%
          </p>
          <p className="text-xs text-text-muted mt-1">
            {isOnTrack ? 'FI ready' : `${formatCurrency(Math.abs(summary.gap), true)} to go`}
          </p>
        </div>
      </div>

      {/* Status message */}
      <div
        className={`
          flex items-center gap-3 p-4 rounded-lg
          ${
            hasBuffer && isAchievable
              ? 'bg-accent-primary/5 border border-accent-primary/20'
              : 'bg-accent-warning/5 border border-accent-warning/20'
          }
        `}
      >
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center shrink-0
            ${hasBuffer && isAchievable ? 'bg-accent-primary/20' : 'bg-accent-warning/20'}
          `}
        >
          {hasBuffer && isAchievable ? (
            <svg className="w-5 h-5 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-accent-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>
        <div>
          <p className={`font-medium ${hasBuffer && isAchievable ? 'text-accent-primary' : 'text-accent-warning'}`}>
            {achievableFI.fiAtCurrentAge
              ? 'You can retire now!'
              : isAchievable
                ? achievableFI.confidenceLevel === 'high'
                  ? 'Strong position for FI'
                  : achievableFI.confidenceLevel === 'moderate'
                    ? 'On track for FI'
                    : 'FI achievable with tight margins'
                : 'FI not achievable with current inputs'}
          </p>
          <p className="text-sm text-text-secondary">
            {achievableFI.fiAtCurrentAge
              ? `Your current assets can sustain your spending through age ${state.profile.lifeExpectancy} with ${achievableFI.bufferYears} years of buffer.`
              : isAchievable
                ? `You can achieve FI at age ${achievableFI.achievableFIAge} (in ${achievableFI.yearsUntilFI} years). Your money should last ${achievableFI.bufferYears >= 0 ? `${achievableFI.bufferYears} years past` : `until ${achievableFI.bufferYears} years before`} your life expectancy.`
                : achievableFI.shortfallGuidance
                  ? `Money runs out at age ${achievableFI.shortfallGuidance.runsOutAtAge}.${
                      achievableFI.shortfallGuidance.spendingReductionNeeded > 0
                        ? ` Reduce spending by ${formatCurrency(achievableFI.shortfallGuidance.spendingReductionNeeded, true)}/yr`
                        : ''
                    }${
                      achievableFI.shortfallGuidance.additionalSavingsNeeded > 0
                        ? ` or save ${formatCurrency(achievableFI.shortfallGuidance.additionalSavingsNeeded, true)}/yr more.`
                        : '.'
                    }`
                  : 'Try reducing spending, increasing assets, or adjusting assumptions.'}
          </p>
        </div>
      </div>

      {/* Surplus insight — only when FI is achievable with meaningful surplus */}
      {isAchievable && summary.surplusAtLE !== undefined && summary.surplusAtLE > 50000 && (
        <div className="p-4 rounded-lg bg-bg-secondary border border-border-subtle">
          <p className="text-xs text-text-muted mb-2">Portfolio Insight</p>
          <div className="space-y-1">
            <p className="text-sm text-text-secondary">
              <span className="text-text-primary font-medium">{formatCurrency(summary.surplusAtLE, true)}</span> remaining at age {state.profile.lifeExpectancy}
            </p>
            {summary.bottleneckAge !== undefined && summary.bottleneckBalance !== undefined && (
              <p className="text-sm text-text-secondary">
                Lowest balance: <span className="text-text-primary font-medium">{formatCurrency(summary.bottleneckBalance, true)}</span> at age {summary.bottleneckAge}
              </p>
            )}
            {state.assumptions.fiPhaseReturn === undefined && (
              <p className="text-xs text-text-muted mt-2">
                Surplus may be overstated — set a lower Retirement Return in Assumptions to model conservative post-FI allocation.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
