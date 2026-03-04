import { createContext, useContext, useState, ReactNode } from 'react';

export const FOLIAR_STEPS = [
  { id: 'intro', title: 'Configuração', section: 'intro' },
  { id: 'foliar-diagnosis', title: 'Diagnóstico Foliar', section: 'diagnosis' },
  { id: 'fertigation-spraying', title: 'Fertirrigação & Pulverização', section: 'application' },
  { id: 'result', title: 'Resultado', section: 'result' },
] as const;

export type FoliarStepId = typeof FOLIAR_STEPS[number]['id'];
export const FOLIAR_TOTAL_STEPS = FOLIAR_STEPS.length;

interface FoliarContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isStarted: boolean;
  startFoliar: () => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  totalSteps: number;
  currentStepInfo: typeof FOLIAR_STEPS[number];
}

const FoliarContext = createContext<FoliarContextType | undefined>(undefined);

export function FoliarProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0);

  const isStarted = currentStep > 0;

  const startFoliar = () => {
    setCurrentStep(1);
  };

  const goToNextStep = () => {
    if (currentStep < FOLIAR_TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepInfo = FOLIAR_STEPS[currentStep] || FOLIAR_STEPS[0];

  return (
    <FoliarContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        isStarted,
        startFoliar,
        goToNextStep,
        goToPreviousStep,
        totalSteps: FOLIAR_TOTAL_STEPS,
        currentStepInfo,
      }}
    >
      {children}
    </FoliarContext.Provider>
  );
}

export function useFoliar() {
  const context = useContext(FoliarContext);
  if (context === undefined) {
    throw new Error('useFoliar must be used within a FoliarProvider');
  }
  return context;
}
