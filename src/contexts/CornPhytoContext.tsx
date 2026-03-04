import { createContext, useContext, useState, ReactNode } from 'react';
import type { CornPestEntry, CornProdutoComercial, CornDefensivoEntry } from '@/data/cornPestDatabase';

// ─── Types ───────────────────────────────────────────────────
export interface CornPhytoOpcaoIA {
  praga: string;
  nomeCientifico: string;
  tipo: 'praga' | 'doenca' | 'saudavel' | 'dano_mecanico';
  confianca: number;
  severidade: 'leve' | 'moderada' | 'severa';
  sintomas: string;
  nde: string;
  riscoPerdaSilagem: string;
  produtos_recomendados: {
    nome: string;
    principio_ativo: string;
    dose: string;
    carencia_silagem_dias: number;
    metodo: string;
  }[];
  orientacao: string;
}

export type CornPhytoAppMode = 'pulverizacao' | 'fertirrigacao';
export type CornPhytoFertiEquip = 'pivo' | 'gotejo' | 'aspersao';

export interface CornPhytoSprayCalc {
  areaHa: number;
  mode: CornPhytoAppMode;
  equipamento: 'costal' | 'tratorizado' | 'drone';
  volumeCalda: number; // L/ha
  capacidadeTanque: number; // L
  produtoSelecionado: CornProdutoComercial | null;
  doseHa: number;
  // Fertigation
  fertiEquipamento: CornPhytoFertiEquip;
  fertiTankCapacity: number; // L
}

export interface CornPhytoData {
  // Step 1: Context
  imageBase64: string | null;
  estadioFenologico: string;
  parteAfetada: string;
  climaRecente: string;
  areaHa: number;
  // Step 2: AI Triage
  opcoes: CornPhytoOpcaoIA[];
  contextoAnalise: string;
  selectedOpcaoIndex: number | null;
  // Step 3: Recommendation
  matchedPest: CornPestEntry | null;
  matchedDefensivos: CornDefensivoEntry[];
  matchedProducts: CornProdutoComercial[];
  selectedProductId: string | null;
  // Step 4: Spray calc
  sprayCalc: CornPhytoSprayCalc;
}

const INITIAL_DATA: CornPhytoData = {
  imageBase64: null,
  estadioFenologico: '',
  parteAfetada: '',
  climaRecente: '',
  areaHa: 10,
  opcoes: [],
  contextoAnalise: '',
  selectedOpcaoIndex: null,
  matchedPest: null,
  matchedDefensivos: [],
  matchedProducts: [],
  selectedProductId: null,
  sprayCalc: {
    areaHa: 10,
    mode: 'pulverizacao',
    equipamento: 'tratorizado',
    volumeCalda: 150,
    capacidadeTanque: 600,
    produtoSelecionado: null,
    doseHa: 0,
    fertiEquipamento: 'pivo',
    fertiTankCapacity: 1000,
  },
};

export const CORN_PHYTO_STEPS = [
  { id: 'capture', title: 'Captura & Contexto', section: 'input' },
  { id: 'triage', title: 'Triagem IA', section: 'identification' },
  { id: 'recommendation', title: 'Recomendação', section: 'recommendation' },
  { id: 'spray', title: 'Calda & Aplicação', section: 'application' },
] as const;

export type CornPhytoStepId = typeof CORN_PHYTO_STEPS[number]['id'];
export const CORN_PHYTO_TOTAL_STEPS = CORN_PHYTO_STEPS.length;

interface CornPhytoContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  data: CornPhytoData;
  setData: (updater: (prev: CornPhytoData) => CornPhytoData) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  totalSteps: number;
  currentStepInfo: typeof CORN_PHYTO_STEPS[number];
  resetFlow: () => void;
}

const CornPhytoContext = createContext<CornPhytoContextType | undefined>(undefined);

export function CornPhytoProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setDataState] = useState<CornPhytoData>(INITIAL_DATA);

  const setData = (updater: (prev: CornPhytoData) => CornPhytoData) => {
    setDataState(prev => updater(prev));
  };

  const goToNextStep = () => {
    if (currentStep < CORN_PHYTO_TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetFlow = () => {
    setCurrentStep(0);
    setDataState(INITIAL_DATA);
  };

  const currentStepInfo = CORN_PHYTO_STEPS[currentStep] || CORN_PHYTO_STEPS[0];

  return (
    <CornPhytoContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        data,
        setData,
        goToNextStep,
        goToPreviousStep,
        totalSteps: CORN_PHYTO_TOTAL_STEPS,
        currentStepInfo,
        resetFlow,
      }}
    >
      {children}
    </CornPhytoContext.Provider>
  );
}

export function useCornPhyto() {
  const context = useContext(CornPhytoContext);
  if (context === undefined) {
    throw new Error('useCornPhyto must be used within a CornPhytoProvider');
  }
  return context;
}
