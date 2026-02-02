import { useProjection } from '../../hooks/useProjection';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

export function SummaryMetrics() {
  const { state } = useApp();
  const { summary, deltaYears } = useProjection();

  const isOnTrack = summary.gap >= 0;
  const hasBuffer = summary.bufferYears >= 0;

  return (
    <div className="space-y-4">
      {/* Delta indicator (when what-if is active) */}
      {deltaYears !== 0 && (
        <div
          className={`
            flex items-center justify-center gap-2 py-2 px-4 rounded-lg
            ${deltaYears > 0 ? 'bg-accent-primary/10 text-accent-primary' : 'bg-accent-danger/10 text-accent-danger'}
          `}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={deltaYears > 0 ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'}
            />
          </svg>
          <span className="text-sm font-medium">
            What-if: {deltaYears > 0 ? '+' : ''}{deltaYears} years runway
          </span>
        </div>
      )}

      {/* Main metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

        {/* Gap to FI */}
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4">
          <p className="text-xs text-text-muted mb-1">Gap to FI</p>
          <p
            className={`text-xl font-semibold tabular-nums ${
              isOnTrack ? 'text-accent-primary' : 'text-accent-danger'
            }`}
          >
            {isOnTrack ? '+' : ''}{formatCurrency(summary.gap, true)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {isOnTrack ? 'Above FI number' : 'Below FI number'}
          </p>
        </div>

        {/* Runway */}
        <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4">
          <p className="text-xs text-text-muted mb-1">
            {summary.hasShortfall ? 'Shortfall Age' : 'Runway'}
          </p>
          <p
            className={`text-xl font-semibold tabular-nums ${
              hasBuffer ? 'text-accent-primary' : 'text-accent-danger'
            }`}
          >
            Age {summary.hasShortfall ? summary.shortfallAge : summary.runwayAge}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {hasBuffer
              ? `${Math.abs(summary.bufferYears)} years buffer`
              : summary.hasShortfall
                ? `${Math.abs(summary.bufferYears)} years short`
                : 'Meets life expectancy'}
          </p>
        </div>
      </div>

      {/* Status message */}
      <div
        className={`
          flex items-center gap-3 p-4 rounded-lg
          ${
            hasBuffer
              ? 'bg-accent-primary/5 border border-accent-primary/20'
              : 'bg-accent-danger/5 border border-accent-danger/20'
          }
        `}
      >
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center shrink-0
            ${hasBuffer ? 'bg-accent-primary/20' : 'bg-accent-danger/20'}
          `}
        >
          {hasBuffer ? (
            <svg className="w-5 h-5 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-accent-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>
        <div>
          <p className={`font-medium ${hasBuffer ? 'text-accent-primary' : 'text-accent-danger'}`}>
            {hasBuffer
              ? 'Your plan looks sustainable'
              : summary.hasShortfall
                ? 'Warning: Projected shortfall'
                : 'Cutting it close'}
          </p>
          <p className="text-sm text-text-secondary">
            {hasBuffer
              ? `Based on current inputs, your money should last until age ${summary.runwayAge}, ${Math.abs(summary.bufferYears)} years past your planning horizon of ${state.profile.lifeExpectancy}.`
              : summary.hasShortfall
                ? `At age ${summary.shortfallAge}, your accounts may be depleted, ${Math.abs(summary.bufferYears)} years before your planning horizon.`
                : `Your runway exactly meets your life expectancy of ${state.profile.lifeExpectancy}. Consider building more buffer.`}
          </p>
        </div>
      </div>
    </div>
  );
}
