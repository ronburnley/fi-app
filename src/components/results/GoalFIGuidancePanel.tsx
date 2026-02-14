import { useProjectionContext } from '../../context/ProjectionContext';
import { formatCurrency } from '../../utils/formatters';

function toMonthly(annual: number): number {
  return Math.round(annual / 12);
}

export function GoalFIGuidancePanel() {
  const { goalFIGuidance } = useProjectionContext();

  if (!goalFIGuidance) return null;

  const { status } = goalFIGuidance;

  // On track — compact confirmation
  if (status === 'on_track') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-accent-primary/5 border border-accent-primary/20">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-accent-primary/20">
          <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-accent-primary font-medium">
          Your goal matches the projected FI age — you're on track.
        </p>
      </div>
    );
  }

  // Ahead of goal — surplus info
  if (status === 'ahead_of_goal') {
    return (
      <div className="p-4 rounded-lg bg-accent-primary/5 border border-accent-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-accent-primary/20">
            <svg className="w-3.5 h-3.5 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-accent-primary">
            Ahead of goal — age {goalFIGuidance.goalAge} is {goalFIGuidance.goalAge - (goalFIGuidance.achievableAge ?? 0)} years later than needed
          </p>
        </div>
        <div className="space-y-2 text-sm text-text-secondary">
          {goalFIGuidance.surplusAtLE !== undefined && goalFIGuidance.surplusAtLE > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-text-muted mt-0.5 shrink-0">$</span>
              <span>
                <span className="text-text-primary font-medium">{formatCurrency(goalFIGuidance.surplusAtLE, true)}</span> projected surplus at life expectancy
              </span>
            </div>
          )}
          {goalFIGuidance.additionalBufferYears !== undefined && goalFIGuidance.additionalBufferYears > 0 && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-text-muted mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <span className="text-text-primary font-medium">{goalFIGuidance.additionalBufferYears}</span> years of buffer beyond life expectancy
              </span>
            </div>
          )}
          {goalFIGuidance.spendingIncreaseRoom !== undefined && goalFIGuidance.spendingIncreaseRoom > 0 && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-text-muted mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>
                Could increase spending by up to <span className="text-text-primary font-medium">{formatCurrency(toMonthly(goalFIGuidance.spendingIncreaseRoom), true)}/mo</span>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Behind goal — actionable levers
  const hasAnyLever = goalFIGuidance.spendingReduction ||
    goalFIGuidance.additionalSavingsNeeded ||
    goalFIGuidance.requiredReturn ||
    goalFIGuidance.ssDelayBenefit;

  return (
    <div className="p-4 rounded-lg bg-accent-blue/5 border border-accent-blue/20">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-accent-blue/20">
          <svg className="w-3.5 h-3.5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-accent-blue">
          To retire at age {goalFIGuidance.goalAge}
          {goalFIGuidance.achievableAge !== null
            ? ` (${goalFIGuidance.achievableAge - goalFIGuidance.goalAge} years earlier)`
            : ''}
        </p>
      </div>

      {hasAnyLever ? (
        <>
          <p className="text-xs text-text-muted mb-3">Any one of these alone would close the gap:</p>
          <div className="space-y-2.5">
            {goalFIGuidance.spendingReduction && (
              <LeverRow
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                }
                label={
                  <>
                    Reduce spending by <span className="text-text-primary font-medium">{formatCurrency(toMonthly(goalFIGuidance.spendingReduction.annualAmount))}/mo</span>
                    <span className="text-text-muted"> ({goalFIGuidance.spendingReduction.percentReduction}%)</span>
                    <span className="text-text-muted"> to {formatCurrency(toMonthly(goalFIGuidance.spendingReduction.resultingAnnualSpending))}/mo</span>
                  </>
                }
              />
            )}
            {goalFIGuidance.additionalSavingsNeeded && (
              <LeverRow
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
                label={
                  <>
                    Save an additional <span className="text-text-primary font-medium">{formatCurrency(toMonthly(goalFIGuidance.additionalSavingsNeeded.amount))}/mo</span>
                    {!goalFIGuidance.additionalSavingsNeeded.sufficient && (
                      <span className="text-accent-warning text-xs ml-1">(insufficient alone)</span>
                    )}
                  </>
                }
              />
            )}
            {goalFIGuidance.requiredReturn && (
              <LeverRow
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
                label={
                  <>
                    Achieve <span className="text-text-primary font-medium">{(goalFIGuidance.requiredReturn.rate * 100).toFixed(1)}%</span> investment return
                    <span className="text-text-muted"> (vs current {(goalFIGuidance.requiredReturn.currentRate * 100).toFixed(1)}%)</span>
                  </>
                }
              />
            )}
            {goalFIGuidance.ssDelayBenefit && (
              <LeverRow
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                label={
                  <>
                    Delay Social Security to age {goalFIGuidance.ssDelayBenefit.newStartAge}
                    {!goalFIGuidance.ssDelayBenefit.sufficient && (
                      <span className="text-accent-warning text-xs ml-1">(insufficient alone)</span>
                    )}
                  </>
                }
              />
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-text-secondary">
          This goal requires significant changes beyond what individual adjustments can achieve. Consider a combination of reduced spending, increased savings, and higher returns.
        </p>
      )}
    </div>
  );
}

function LeverRow({ icon, label }: { icon: React.ReactNode; label: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-text-secondary">
      <span className="text-text-muted mt-0.5 shrink-0">{icon}</span>
      <span className="leading-snug">{label}</span>
    </div>
  );
}
