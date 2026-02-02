import { useWizard } from './WizardContext';
import { WizardProgress } from './WizardProgress';
import {
  WelcomeStep,
  AssetsStep,
  SpendingStep,
  BenefitsStep,
  LifeEventsStep,
  AssumptionsStep,
  ResultsStep,
} from './steps';

const STEPS = [
  WelcomeStep,
  AssetsStep,
  SpendingStep,
  BenefitsStep,
  LifeEventsStep,
  AssumptionsStep,
  ResultsStep,
];

export function WizardLayout() {
  const { currentStep } = useWizard();

  const StepComponent = STEPS[currentStep - 1];

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="container mx-auto px-4 py-4">
        <WizardProgress />
        <div className="pb-8">
          <StepComponent />
        </div>
      </div>
    </main>
  );
}
