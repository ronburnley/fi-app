import { lazy, Suspense } from 'react';
import { useWizard } from './WizardContext';
import { WizardProgress } from './WizardProgress';

const WelcomeStep = lazy(() => import('./steps/WelcomeStep'));
const AssetsStep = lazy(() => import('./steps/AssetsStep'));
const IncomeStep = lazy(() => import('./steps/IncomeStep'));
const SpendingStep = lazy(() => import('./steps/SpendingStep'));
const BenefitsStep = lazy(() => import('./steps/BenefitsStep'));
const LifeEventsStep = lazy(() => import('./steps/LifeEventsStep'));
const AssumptionsStep = lazy(() => import('./steps/AssumptionsStep'));
const ResultsStep = lazy(() => import('./steps/ResultsStep'));

const STEPS = [
  WelcomeStep,
  AssetsStep,
  IncomeStep,
  SpendingStep,
  BenefitsStep,
  LifeEventsStep,
  AssumptionsStep,
  ResultsStep,
];

function StepFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <svg
        className="w-6 h-6 animate-spin text-text-muted"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

export function WizardLayout() {
  const { currentStep } = useWizard();

  const StepComponent = STEPS[currentStep - 1];

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="container mx-auto px-4 py-4">
        <WizardProgress />
        <div className="pb-8">
          <Suspense fallback={<StepFallback />}>
            <StepComponent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
