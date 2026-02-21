import type { AchievableFIResult } from '../../types';

type FIStatus =
  | { state: 'hidden' }
  | { state: 'calculating' }
  | { state: 'achievable'; years: number; confidence: 'high' | 'moderate' | 'tight' }
  | { state: 'immediate' }
  | { state: 'unreachable'; shortfallAge: number };

interface FIStatusIndicatorProps {
  result: AchievableFIResult | null;
  isVisible: boolean;
  isClickable?: boolean;
  onClick?: () => void;
}

function resultToStatus(result: AchievableFIResult | null, isVisible: boolean): FIStatus {
  if (!isVisible || !result) {
    return { state: 'hidden' };
  }

  if (result.confidenceLevel === 'not_achievable') {
    return {
      state: 'unreachable',
      shortfallAge: 0, // Will show generic message
    };
  }

  if (result.fiAtCurrentAge) {
    return { state: 'immediate' };
  }

  if (result.yearsUntilFI !== null && result.yearsUntilFI > 0) {
    return {
      state: 'achievable',
      years: result.yearsUntilFI,
      confidence: result.confidenceLevel as 'high' | 'moderate' | 'tight',
    };
  }

  return { state: 'hidden' };
}

export function FIStatusIndicator({ result, isVisible, isClickable = false, onClick }: FIStatusIndicatorProps) {
  const status = resultToStatus(result, isVisible);

  if (status.state === 'hidden') {
    return null;
  }

  const indicatorContent = (
    <>
      {/* Outer glow ring */}
      <div className={`fi-status-glow ${status.state}`} />

      {/* Main indicator body */}
      <div className={`fi-status-body ${status.state}`}>
        {/* Top label */}
        <span className="fi-status-label">
          {status.state === 'calculating' && 'CALCULATING'}
          {status.state === 'achievable' && 'YEARS TO FI'}
          {status.state === 'immediate' && 'STATUS'}
          {status.state === 'unreachable' && 'SHORTFALL'}
        </span>

        {/* Main value */}
        <div className="fi-status-value">
          {status.state === 'calculating' && (
            <span className="calculating-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          )}
          {status.state === 'achievable' && (
            <>
              <span className="fi-number">{status.years}</span>
              <span className="fi-unit">yr{status.years !== 1 ? 's' : ''}</span>
            </>
          )}
          {status.state === 'immediate' && (
            <span className="fi-immediate">FI NOW</span>
          )}
          {status.state === 'unreachable' && (
            <span className="fi-shortfall">Review inputs</span>
          )}
        </div>

        {/* Confidence indicator */}
        {status.state === 'achievable' && (
          <div className={`fi-confidence ${status.confidence}`}>
            <span className="confidence-dot" />
            <span className="confidence-label">
              {status.confidence === 'high' && 'Strong position'}
              {status.confidence === 'moderate' && 'On track'}
              {status.confidence === 'tight' && 'Tight margin'}
            </span>
          </div>
        )}

        {status.state === 'unreachable' && (
          <div className="fi-shortfall-detail">
            Not achievable with current inputs
          </div>
        )}
      </div>

      {/* Scan line effect */}
      <div className="fi-status-scanline" />

      {/* Action strip — always visible when clickable */}
      {isClickable && (
        <div className="fi-status-action">
          <span className="fi-status-action-text">View full results</span>
          <svg
            className="fi-status-action-arrow"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </>
  );

  if (isClickable) {
    return (
      <button
        className="fi-status-container fi-status-clickable"
        onClick={onClick}
        aria-label="View full results"
        type="button"
      >
        {indicatorContent}
      </button>
    );
  }

  return (
    <div className="fi-status-container">
      {indicatorContent}
    </div>
  );
}
