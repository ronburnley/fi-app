import { Button } from '../ui';
import { useWizard } from './WizardContext';

interface WizardNavigationProps {
  onValidate?: () => boolean;
  disabled?: boolean;
}

export function WizardNavigation({ onValidate, disabled = false }: WizardNavigationProps) {
  const { currentStep, nextStep, prevStep, goToStep, canGoBack, isLastStep, returnStep, clearReturnStep } = useWizard();

  const handleNext = () => {
    if (onValidate && !onValidate()) {
      return;
    }
    nextStep();
  };

  const handleBack = () => {
    if (isLastStep && returnStep !== null) {
      goToStep(returnStep);
      clearReturnStep();
    } else {
      prevStep();
    }
  };

  if (isLastStep) {
    return (
      <div className="flex justify-start pt-6">
        <Button variant="secondary" onClick={handleBack}>
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
        <Button onClick={handleNext} disabled={disabled}>
          {currentStep === 7 ? 'View Results' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
