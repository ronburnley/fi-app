import { Button } from '../ui';
import { useWizard } from './WizardContext';

interface WizardNavigationProps {
  onValidate?: () => boolean;
  showSkip?: boolean;
}

export function WizardNavigation({ onValidate, showSkip = false }: WizardNavigationProps) {
  const { currentStep, nextStep, prevStep, canGoBack, isLastStep } = useWizard();

  const handleNext = () => {
    if (onValidate && !onValidate()) {
      return;
    }
    nextStep();
  };

  const handleSkip = () => {
    nextStep();
  };

  if (isLastStep) {
    return (
      <div className="flex justify-start pt-6">
        <Button variant="secondary" onClick={prevStep}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-between pt-6">
      <div>
        {canGoBack && (
          <Button variant="secondary" onClick={prevStep}>
            Back
          </Button>
        )}
      </div>
      <div className="flex gap-3">
        {showSkip && (
          <Button variant="secondary" onClick={handleSkip}>
            Skip
          </Button>
        )}
        <Button onClick={handleNext}>
          {currentStep === 7 ? 'View Results' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
