// CoffeeContext - v2
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { WizardInsumo, WizardCostsData } from '@/contexts/WizardContext';
import type { WizardSprayingData } from '@/types/spraying';

export type CoffeeType = 'conilon' | 'arabica' | null;

export const COFFEE_STEPS = [
  { id: 'intro', title: 'Tipo de Café', section: 'intro' },
  { id: 'soil-analysis', title: 'Análise de Solo', section: 'soil' },
  { id: 'productivity', title: 'Produtividade', section: 'productivity' },
  { id: 'planting-fert', title: 'Adubação Plantio', section: 'recommendation' },
  { id: 'correction', title: 'Correção de Solo', section: 'recommendation' },
  { id: 'coverage', title: 'Cobertura', section: 'recommendation' },
  { id: 'maintenance', title: 'Manutenção', section: 'recommendation' },
  { id: 'herbicides', title: 'Herbicidas', section: 'application' },
  { id: 'foliar', title: 'Foliar', section: 'application' },
  { id: 'adjuvants', title: 'Adjuvantes', section: 'application' },
  { id: 'liming', title: 'Calagem & Parcelamento', section: 'recommendation' },
  { id: 'fertigation-spraying', title: 'Fertirrigação & Pulverização', section: 'application' },
  { id: 'result', title: 'Resultado', section: 'result' },
] as const;

export type CoffeeStepId = typeof COFFEE_STEPS[number]['id'];

export const COFFEE_TOTAL_STEPS = COFFEE_STEPS.length;

export type SoilTexture = 'arenosa' | 'media' | 'argilosa' | null;

export function estimateSoilTexture(moGdm3: number): SoilTexture {
  if (moGdm3 <= 0) return null;
  if (moGdm3 < 15) return 'arenosa';
  if (moGdm3 <= 30) return 'media';
  return 'argilosa';
}

export function getTextureParcelCount(texture: SoilTexture, coffeeType: CoffeeType): number {
  if (texture === 'arenosa') return coffeeType === 'conilon' ? 10 : 8;
  if (texture === 'argilosa') return 4;
  return 6; // media or null = default
}

export interface CoffeeSoilData {
  ca: number;
  mg: number;
  k: number;
  hAl: number;
  p: number;
  mo: number;
  moUnit: 'g/dm³' | '%' | 'dag/kg';
  texturaEstimada: SoilTexture;
  texturaFonte: 'estimada' | 'informada' | 'p_rem';
  argila: number | null;
  silte: number | null;
  areia: number | null;
  zn: number;
  b: number;
  mn: number;
  fe: number;
  cu: number;
  s: number;
  vPercent: number;
  dbAnalysisId?: string | null;
}

export type ProductivityLevel = 'baixa' | 'media' | 'alta' | 'muito_alta';

export interface CoffeeProductivityData {
  sacasPerHectare: number;
  level: ProductivityLevel;
  hectares: number;
}

export interface ApplicationMethod {
  type: 'fertirrigacao' | 'bomba_costal' | 'drone' | 'trator';
  label: string;
}

export const APPLICATION_METHODS: ApplicationMethod[] = [
  { type: 'fertirrigacao', label: 'Fertirrigação' },
  { type: 'bomba_costal', label: 'Bomba Costal' },
  { type: 'drone', label: 'Drone' },
  { type: 'trator', label: 'Jato com Trator' },
];

export interface LeafAnalysisEntry {
  value: number;
  status: 'deficient' | 'threshold' | 'adequate';
}

export type LeafAnalysisData = Record<string, LeafAnalysisEntry>;

// ─── Fertigation & Spraying Types ────────────────────────────
type FertiSprayDoseUnit = 'L/ha' | 'Kg/ha' | 'mL/ha' | 'g/ha';

export interface CoffeeFertigationProduct {
  id: string;
  insumoId: string;
  name: string;
  type: string;
  dosePerHa: number;
  unit: FertiSprayDoseUnit;
}

export interface CoffeeFertigationData {
  tankSize: number;
  volumePerHa: number;
  products: CoffeeFertigationProduct[];
}

export interface CoffeeSprayingProduct {
  id: string;
  insumoId: string;
  name: string;
  type: string;
  dosePerHa: number;
  unit: FertiSprayDoseUnit;
}

export interface CoffeeSprayingData {
  equipmentType: 'trator' | 'drone' | 'bomba_costal';
  tankCapacity: number;
  applicationRate: number;
  products: CoffeeSprayingProduct[];
}

// ─── Liming Data Types ───────────────────────────────────────
export interface CoffeeLimingData {
  nc: number; // t/ha
  prnt: number;
  productName: string | null;
  costPerHa: number;
  totalTons: number;
  totalCost: number;
}

// ─── Treatment Plan Types ────────────────────────────────────
export interface CoffeeTreatmentEntry {
  alvo: string;
  produto: string;
  principioAtivo: string;
  dosePerHa: number;
  unidade: string;
  costPerHa: number;
  tipoProduto?: string;
}

export interface CoffeeTreatmentPlanData {
  entries: CoffeeTreatmentEntry[];
  equipmentType: 'trator' | 'drone' | 'bomba_costal';
  equipmentLabel: string;
  totalCostPerHa: number;
}

export type RecommendationMode = 'manual' | 'auto' | null;

export interface CoffeeData {
  coffeeType: CoffeeType;
  selectedTalhaoId: string | null;
  soil: CoffeeSoilData | null;
  productivity: CoffeeProductivityData | null;
  recommendationMode: RecommendationMode;
  insumos: WizardInsumo[];
  costs: WizardCostsData | null;
  spraying: WizardSprayingData | null;
  applicationMethod: ApplicationMethod['type'] | null;
  hectares: number;
  totalPlants: number;
  leafAnalysis: LeafAnalysisData | null;
  fertigation: CoffeeFertigationData | null;
  coffeeSpraying: CoffeeSprayingData | null;
  treatmentPlan: CoffeeTreatmentPlanData | null;
  limingData: CoffeeLimingData | null;
}

interface CoffeeContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  coffeeData: CoffeeData;
  setCoffeeType: (type: CoffeeType) => void;
  setSelectedTalhao: (talhaoId: string | null) => void;
  setSoilData: (data: CoffeeSoilData) => void;
  setProductivity: (data: CoffeeProductivityData) => void;
  setHectares: (hectares: number) => void;
  setTotalPlants: (totalPlants: number) => void;
  addInsumo: (insumo: WizardInsumo) => void;
  removeInsumo: (index: number) => void;
  updateInsumo: (index: number, insumo: WizardInsumo) => void;
  setCostsData: (data: WizardCostsData) => void;
  setSprayingData: (data: WizardSprayingData) => void;
  setApplicationMethod: (method: ApplicationMethod['type']) => void;
  setLeafAnalysis: (data: LeafAnalysisData) => void;
  setFertigationData: (data: CoffeeFertigationData) => void;
  setCoffeeSprayingData: (data: CoffeeSprayingData) => void;
  setTreatmentPlanData: (data: CoffeeTreatmentPlanData | null) => void;
  setLimingData: (data: CoffeeLimingData | null) => void;
  setRecommendationMode: (mode: RecommendationMode) => void;
  resetCoffee: () => void;
  getVisibleSteps: () => typeof COFFEE_STEPS[number][];
  canProceed: () => boolean;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  totalSteps: number;
  currentStepInfo: typeof COFFEE_STEPS[number];
  isStarted: boolean;
  startCoffee: () => void;
  getProductivityLevel: (sacas: number) => ProductivityLevel;
}

// Steps that are skipped in auto mode (insumo selection steps)
const AUTO_SKIP_STEP_IDS: Set<string> = new Set([
  'planting-fert', 'correction', 'coverage', 'maintenance', 'herbicides', 'foliar', 'adjuvants',
]);

const STORAGE_KEY = 'coffee_wizard_state';

function loadPersistedState(): { step: number; data: CoffeeData } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { step: parsed.step ?? 0, data: { ...initialCoffeeData, ...parsed.data } };
    }
  } catch { /* ignore corrupt data */ }
  return { step: 0, data: initialCoffeeData };
}

const initialCoffeeData: CoffeeData = {
  coffeeType: null,
  selectedTalhaoId: null,
  soil: null,
  productivity: null,
  recommendationMode: null,
  insumos: [],
  costs: null,
  spraying: null,
  applicationMethod: null,
  hectares: 0,
  totalPlants: 0,
  leafAnalysis: null,
  fertigation: null,
  coffeeSpraying: null,
  treatmentPlan: null,
  limingData: null,
};

const CoffeeContext = createContext<CoffeeContextType | undefined>(undefined);

export function CoffeeProvider({ children }: { children: ReactNode }) {
  const persisted = loadPersistedState();
  const [currentStep, setCurrentStep] = useState(persisted.step);
  const [coffeeData, setCoffeeData] = useState<CoffeeData>(persisted.data);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: currentStep, data: coffeeData }));
    } catch { /* quota exceeded — silently ignore */ }
  }, [currentStep, coffeeData]);

  const isStarted = currentStep > 0;

  const startCoffee = () => {
    if (coffeeData.coffeeType) {
      setCurrentStep(1);
    }
  };

  const setCoffeeType = (type: CoffeeType) => {
    setCoffeeData(prev => ({ ...prev, coffeeType: type }));
  };

  const setSelectedTalhao = (talhaoId: string | null) => {
    setCoffeeData(prev => ({ ...prev, selectedTalhaoId: talhaoId }));
  };

  const setSoilData = (data: CoffeeSoilData) => {
    setCoffeeData(prev => ({ ...prev, soil: data }));
  };

  const getProductivityLevel = (sacas: number): ProductivityLevel => {
    if (coffeeData.coffeeType === 'conilon') {
      if (sacas < 50) return 'baixa';
      if (sacas < 80) return 'media';
      if (sacas < 120) return 'alta';
      return 'muito_alta';
    }
    // Arábica
    if (sacas < 30) return 'baixa';
    if (sacas < 50) return 'media';
    if (sacas < 65) return 'alta';
    return 'muito_alta';
  };

  const setProductivity = (data: CoffeeProductivityData) => {
    setCoffeeData(prev => ({ ...prev, productivity: data, hectares: data.hectares }));
  };

  const setHectares = (hectares: number) => {
    setCoffeeData(prev => ({ ...prev, hectares }));
  };

  const setTotalPlants = (totalPlants: number) => {
    setCoffeeData(prev => ({ ...prev, totalPlants }));
  };

  const addInsumo = (insumo: WizardInsumo) => {
    setCoffeeData(prev => ({ ...prev, insumos: [...prev.insumos, insumo] }));
  };

  const removeInsumo = (index: number) => {
    setCoffeeData(prev => ({
      ...prev,
      insumos: prev.insumos.filter((_, i) => i !== index),
    }));
  };

  const updateInsumo = (index: number, insumo: WizardInsumo) => {
    setCoffeeData(prev => ({
      ...prev,
      insumos: prev.insumos.map((item, i) => (i === index ? insumo : item)),
    }));
  };

  const setCostsData = (data: WizardCostsData) => {
    setCoffeeData(prev => ({ ...prev, costs: data }));
  };

  const setSprayingData = (data: WizardSprayingData) => {
    setCoffeeData(prev => ({ ...prev, spraying: data }));
  };

  const setApplicationMethod = (method: ApplicationMethod['type']) => {
    setCoffeeData(prev => ({ ...prev, applicationMethod: method }));
  };

  const setLeafAnalysis = (data: LeafAnalysisData) => {
    setCoffeeData(prev => ({ ...prev, leafAnalysis: data }));
  };

  const setFertigationData = (data: CoffeeFertigationData) => {
    setCoffeeData(prev => ({ ...prev, fertigation: data }));
  };

  const setCoffeeSprayingData = (data: CoffeeSprayingData) => {
    setCoffeeData(prev => ({ ...prev, coffeeSpraying: data }));
  };

  const setTreatmentPlanData = (data: CoffeeTreatmentPlanData | null) => {
    setCoffeeData(prev => ({ ...prev, treatmentPlan: data }));
  };

  const setLimingData = (data: CoffeeLimingData | null) => {
    setCoffeeData(prev => ({ ...prev, limingData: data }));
  };

  const setRecommendationMode = (mode: RecommendationMode) => {
    setCoffeeData(prev => ({ ...prev, recommendationMode: mode }));
  };

  const getVisibleSteps = () => {
    if (coffeeData.recommendationMode === 'auto') {
      return COFFEE_STEPS.filter(s => !AUTO_SKIP_STEP_IDS.has(s.id));
    }
    return [...COFFEE_STEPS];
  };

  const resetCoffee = () => {
    // Clear localStorage FIRST to prevent useEffect from persisting stale state
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    // Force-write clean state to prevent race condition with persistence useEffect
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 0, data: initialCoffeeData })); } catch { /* ignore */ }
    setCurrentStep(0);
    setCoffeeData(initialCoffeeData);
  };

  const canProceed = (): boolean => {
    if (currentStep === 0 && !coffeeData.coffeeType) return false;
    return true;
  };

  const findNextVisibleStep = (from: number, direction: 1 | -1): number => {
    let next = from + direction;
    while (next >= 0 && next < COFFEE_TOTAL_STEPS) {
      const stepId = COFFEE_STEPS[next]?.id;
      if (coffeeData.recommendationMode === 'auto' && AUTO_SKIP_STEP_IDS.has(stepId)) {
        next += direction;
        continue;
      }
      return next;
    }
    return from; // stay if no valid step found
  };

  const goToNextStep = () => {
    if (currentStep < COFFEE_TOTAL_STEPS - 1 && canProceed()) {
      setCurrentStep(findNextVisibleStep(currentStep, 1));
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(findNextVisibleStep(currentStep, -1));
    }
  };

  const currentStepInfo = COFFEE_STEPS[currentStep] || COFFEE_STEPS[0];

  return (
    <CoffeeContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        coffeeData,
        setCoffeeType,
        setSelectedTalhao,
        setSoilData,
        setProductivity,
        setHectares,
        setTotalPlants,
        addInsumo,
        removeInsumo,
        updateInsumo,
        setCostsData,
        setSprayingData,
        setApplicationMethod,
        setLeafAnalysis,
        setFertigationData,
        setCoffeeSprayingData,
        setTreatmentPlanData,
        setLimingData,
        setRecommendationMode,
        resetCoffee,
        getVisibleSteps,
        canProceed,
        goToNextStep,
        goToPreviousStep,
        totalSteps: COFFEE_TOTAL_STEPS,
        currentStepInfo,
        isStarted,
        startCoffee,
        getProductivityLevel,
      }}
    >
      {children}
    </CoffeeContext.Provider>
  );
}

export function useCoffee() {
  const context = useContext(CoffeeContext);
  if (context === undefined) {
    throw new Error('useCoffee must be used within a CoffeeProvider');
  }
  return context;
}
