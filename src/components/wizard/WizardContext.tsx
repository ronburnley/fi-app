import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { WizardState } from '../../types';

interface WizardContextType {
  wizardState: WizardState;
  currentStep: number;
  totalSteps: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  isLastStep: boolean;
}

const WizardContext = createContext<WizardContextType | null>(null);

const TOTAL_STEPS = 7;

interface WizardProviderProps {
  children: ReactNode;
}

export function WizardProvider({ children }: WizardProviderProps) {
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 1,
    maxVisitedStep: 1,
  });

  const goToStep = useCallback((step: number) => {
    if (step < 1 || step > TOTAL_STEPS) return;
    if (step > wizardState.maxVisitedStep) return;

    setWizardState((prev) => ({
      ...prev,
      currentStep: step,
    }));
  }, [wizardState.maxVisitedStep]);

  const nextStep = useCallback(() => {
    setWizardState((prev) => {
      const nextStepNum = Math.min(prev.currentStep + 1, TOTAL_STEPS);
      return {
        currentStep: nextStepNum,
        maxVisitedStep: Math.max(prev.maxVisitedStep, nextStepNum),
      };
    });
  }, []);

  const prevStep = useCallback(() => {
    setWizardState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }, []);

  const value: WizardContextType = {
    wizardState,
    currentStep: wizardState.currentStep,
    totalSteps: TOTAL_STEPS,
    goToStep,
    nextStep,
    prevStep,
    canGoBack: wizardState.currentStep > 1,
    canGoForward: wizardState.currentStep < wizardState.maxVisitedStep,
    isLastStep: wizardState.currentStep === TOTAL_STEPS,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}
