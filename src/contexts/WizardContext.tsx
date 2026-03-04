import { createContext, useContext, useState, ReactNode } from 'react';
import type { Seed } from '@/types/farm';
import type { InsumoFormData } from '@/types/insumo';
import type { WizardSprayingData } from '@/types/spraying';
import type { NutrientAnalysisResult } from '@/data/cornFoliarReference';
import type { PhenologicalStage } from '@/data/cornFoliarReference';

export interface WizardSoilData {
  ca: number;
  mg: number;
  k: number;
  hAl: number;
  p: number;
  mo: number;
  zn: number;
  b: number;
  mn: number;
  fe: number;
  cu: number;
  s: number;
  vPercent: number;
}

export interface WizardSeedData {
  seed: Seed | null;
  rowSpacing: number;
  seedsPerMeter: number;
  populationPerHectare: number;
}

export type WizardInsumo = InsumoFormData & { id?: string };

export interface OperationConfig {
  name: string;
  hoursPerHa: number;
}

export interface LaborConfig {
  type: 'fixed' | 'daily';
  description: string;
  quantity: number;
  unitCost: number;
}

export interface WizardCostsData {
  tractorType: 'proprio' | 'alugado';
  costPerHourOwn: number;
  costPerHourRent: number;
  operations: OperationConfig[];
  irrigationCostPerHa: number;
  tarpaulinCostPerM2: number;
  tarpaulinM2: number;
  labor: LaborConfig[];
  totalCost: number;
}

export interface FoliarVisualDeficiency {
  nutriente: string;
  simbolo: string;
  severidade: 'leve' | 'moderada' | 'severa';
  confianca: number;
  sintomas_observados: string;
  produto_recomendado: string;
  dose: string;
}

export interface WizardFoliarData {
  mode: 'visual' | 'laudo' | null;
  phenologicalStage: PhenologicalStage;
  imagePreview: string | null;
  labValues: Record<string, number> | null;
  analysisResults: NutrientAnalysisResult[] | null;
  visualDeficiencies: FoliarVisualDeficiency[] | null;
  disclaimer: string | null;
  resumo: string | null;
}

export interface DrenchProduct {
  id: string;
  insumoId: string;
  name: string;
  type: string;
  concentrationGPerL: number;
  totalProductKg: number;
}

export interface WizardDrenchData {
  equipment: 'costal' | 'barra_caneta';
  volumePerPlantMl: number;
  populationPerHa: number;
  hectares: number;
  products: DrenchProduct[];
  costalCostPerHour: number;
  costalPlantsPerHour: number;
  barraCostPerHour: number;
  barraPlantsPerHour: number;
}

export interface WizardData {
  soil: WizardSoilData | null;
  seed: WizardSeedData | null;
  insumos: WizardInsumo[];
  costs: WizardCostsData | null;
  spraying: WizardSprayingData | null;
  drench: WizardDrenchData | null;
  foliar: WizardFoliarData | null;
  hectares: number;
}

// Definição das etapas do wizard
export const WIZARD_STEPS = [
  { id: 'intro', title: 'Início', section: 'intro' },
  { id: 'macro', title: 'Macronutrientes', section: 'soil' },
  { id: 'micro', title: 'Micronutrientes', section: 'soil' },
  { id: 'calc-soil', title: 'Calcular V%', section: 'soil' },
  { id: 'seed-select', title: 'Escolher Semente', section: 'seed' },
  { id: 'seed-config', title: 'Configurar População', section: 'seed' },
  { id: 'insumos', title: 'Selecionar Insumos', section: 'insumos' },
  { id: 'costs', title: 'Custos de Produção', section: 'costs' },
  { id: 'spraying-equipment', title: 'Equipamento', section: 'spraying' },
  { id: 'spraying-costs', title: 'Custos de Aplicação', section: 'spraying' },
  { id: 'spraying-mix', title: 'Mix de Calda', section: 'spraying' },
  { id: 'spraying-summary', title: 'Resumo Pulverização', section: 'spraying' },
  { id: 'result', title: 'Recomendação', section: 'result' },
  { id: 'foliar-input', title: 'Análise Foliar', section: 'foliar' },
  { id: 'foliar-result', title: 'Receituário Foliar', section: 'foliar' },
  { id: 'report', title: 'Relatório Final', section: 'report' },
] as const;

export const TOTAL_STEPS = WIZARD_STEPS.length;

interface WizardContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  wizardData: WizardData;
  setSoilData: (data: WizardSoilData) => void;
  setSeedData: (data: WizardSeedData) => void;
  addInsumo: (insumo: WizardInsumo) => void;
  removeInsumo: (index: number) => void;
  updateInsumo: (index: number, insumo: WizardInsumo) => void;
  setCostsData: (data: WizardCostsData) => void;
  setSprayingData: (data: WizardSprayingData) => void;
  setDrenchData: (data: WizardDrenchData) => void;
  setFoliarData: (data: WizardFoliarData) => void;
  setHectares: (hectares: number) => void;
  resetWizard: () => void;
  canProceed: (step: number) => boolean;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  totalSteps: number;
  currentStepInfo: typeof WIZARD_STEPS[number];
  isStarted: boolean;
  startWizard: () => void;
}

const initialWizardData: WizardData = {
  soil: null,
  seed: null,
  insumos: [],
  costs: null,
  spraying: null,
  drench: null,
  foliar: null,
  hectares: 0,
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0); // 0 = intro
  const [wizardData, setWizardData] = useState<WizardData>(initialWizardData);

  const isStarted = currentStep > 0;

  const startWizard = () => {
    setCurrentStep(1);
  };

  const setSoilData = (data: WizardSoilData) => {
    setWizardData(prev => ({ ...prev, soil: data }));
  };

  const setSeedData = (data: WizardSeedData) => {
    setWizardData(prev => ({ ...prev, seed: data }));
  };

  const addInsumo = (insumo: WizardInsumo) => {
    setWizardData(prev => ({ ...prev, insumos: [...prev.insumos, insumo] }));
  };

  const removeInsumo = (index: number) => {
    setWizardData(prev => ({
      ...prev,
      insumos: prev.insumos.filter((_, i) => i !== index),
    }));
  };

  const updateInsumo = (index: number, insumo: WizardInsumo) => {
    setWizardData(prev => ({
      ...prev,
      insumos: prev.insumos.map((item, i) => (i === index ? insumo : item)),
    }));
  };

  const setCostsData = (data: WizardCostsData) => {
    setWizardData(prev => ({ ...prev, costs: data }));
  };

  const setSprayingData = (data: WizardSprayingData) => {
    setWizardData(prev => ({ ...prev, spraying: data }));
  };

  const setDrenchData = (data: WizardDrenchData) => {
    setWizardData(prev => ({ ...prev, drench: data }));
  };

  const setFoliarData = (data: WizardFoliarData) => {
    setWizardData(prev => ({ ...prev, foliar: data }));
  };

  const setHectares = (hectares: number) => {
    setWizardData(prev => ({ ...prev, hectares }));
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setWizardData(initialWizardData);
  };

  const canProceed = (_step: number): boolean => {
    // Todas as etapas são opcionais - usuário pode avançar livremente
    return true;
  };

  const goToNextStep = () => {
    if (currentStep < TOTAL_STEPS - 1 && canProceed(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepInfo = WIZARD_STEPS[currentStep] || WIZARD_STEPS[0];

  return (
    <WizardContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        wizardData,
        setSoilData,
        setSeedData,
        addInsumo,
        removeInsumo,
        updateInsumo,
        setCostsData,
        setSprayingData,
        setDrenchData,
        setFoliarData,
        setHectares,
        resetWizard,
        canProceed,
        goToNextStep,
        goToPreviousStep,
        totalSteps: TOTAL_STEPS,
        currentStepInfo,
        isStarted,
        startWizard,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}
