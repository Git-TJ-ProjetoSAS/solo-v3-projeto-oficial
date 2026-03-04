import { createContext, useContext, useState, ReactNode } from 'react';

export const PHYTO_STEPS = [
  { id: 'intro', title: 'Tipo de Café', section: 'intro' },
  { id: 'disease-treatment', title: 'Doenças & Pragas', section: 'treatment' },
  { id: 'fertigation-spraying', title: 'Fertirrigação & Pulverização', section: 'application' },
  { id: 'result', title: 'Resultado', section: 'result' },
  { id: 'report', title: 'Relatório', section: 'report' },
] as const;

export type PhytoStepId = typeof PHYTO_STEPS[number]['id'];
export const PHYTO_TOTAL_STEPS = PHYTO_STEPS.length;

interface PhytoContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isStarted: boolean;
  startPhyto: () => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  totalSteps: number;
  currentStepInfo: typeof PHYTO_STEPS[number];
}

const PhytoContext = createContext<PhytoContextType | undefined>(undefined);

export function PhytoProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0);

  const isStarted = currentStep > 0;

  const startPhyto = () => {
    setCurrentStep(1);
  };

  const goToNextStep = () => {
    setCurrentStep(prev => (prev < PHYTO_TOTAL_STEPS - 1 ? prev + 1 : prev));
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => (prev > 1 ? prev - 1 : prev));
  };

  const currentStepInfo = PHYTO_STEPS[currentStep] || PHYTO_STEPS[0];

  return (
    <PhytoContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        isStarted,
        startPhyto,
        goToNextStep,
        goToPreviousStep,
        totalSteps: PHYTO_TOTAL_STEPS,
        currentStepInfo,
      }}
    >
      {children}
    </PhytoContext.Provider>
  );
}

export function usePhyto() {
  const context = useContext(PhytoContext);
  if (context === undefined) {
    throw new Error('usePhyto must be used within a PhytoProvider');
  }
  return context;
}
