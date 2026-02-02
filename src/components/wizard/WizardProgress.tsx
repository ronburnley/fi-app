import { useWizard } from './WizardContext';

const STEP_LABELS = [
  'Profile',
  'Assets',
  'Spending',
  'Benefits',
  'Life Events',
  'Assumptions',
  'Results',
];

export function WizardProgress() {
  const { currentStep, totalSteps, goToStep, wizardState } = useWizard();

  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isVisited = stepNum <= wizardState.maxVisitedStep;
        const isCompleted = stepNum < currentStep;

        return (
          <div key={stepNum} className="flex items-center">
            <button
              onClick={() => isVisited && goToStep(stepNum)}
              disabled={!isVisited}
              className={`
                relative flex items-center justify-center
                w-8 h-8 rounded-full text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-accent-blue text-white ring-2 ring-accent-blue ring-offset-2 ring-offset-bg-primary'
                  : isCompleted
                    ? 'bg-accent-primary text-white cursor-pointer hover:scale-105'
                    : isVisited
                      ? 'bg-bg-tertiary text-text-secondary cursor-pointer hover:bg-border-default'
                      : 'bg-bg-secondary text-text-muted cursor-not-allowed'
                }
              `}
              title={STEP_LABELS[i]}
            >
              {isCompleted ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                stepNum
              )}
            </button>
            {stepNum < totalSteps && (
              <div
                className={`
                  w-8 h-0.5 mx-1
                  ${stepNum < currentStep ? 'bg-accent-primary' : 'bg-border-subtle'}
                  transition-colors duration-200
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
