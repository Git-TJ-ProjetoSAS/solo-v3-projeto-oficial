export type SprayingUnit = 'L/ha' | 'Kg/ha' | '%' | 'mL/100L';

export type EquipmentType = 'drone' | 'trator' | 'bomba_costal';
export type TractorOwnership = 'proprio' | 'alugado';

export interface SprayingProduct {
  id: string;
  insumoId: string;
  name: string;
  type: string; // Herbicida, Adjuvante, Fungicida, etc.
  unit: SprayingUnit;
  doseInput: number;
  quantityPerTank: number;
  totalQuantity: number;
}

export interface SprayingEquipment {
  type: EquipmentType;
  tankCapacity: number; // em Litros
  applicationRate: number; // L/ha (Taxa de Aplicação)
}

export interface SprayingCosts {
  // Trator
  tractorOwnership: TractorOwnership;
  tractorCostPerHour: number;
  // Drone
  droneCostPerHectare: number;
  // Bomba Costal
  backpackCostPerTank: number;
}

export interface WizardSprayingData {
  equipment: SprayingEquipment;
  products: SprayingProduct[];
  hectares: number;
  costs: SprayingCosts;
}

export const EQUIPMENT_PRESETS: Record<EquipmentType, Partial<SprayingEquipment>> = {
  drone: {
    type: 'drone',
    tankCapacity: 20,
    applicationRate: 10,
  },
  trator: {
    type: 'trator',
    tankCapacity: 500,
    applicationRate: 150,
  },
  bomba_costal: {
    type: 'bomba_costal',
    tankCapacity: 20,
    applicationRate: 200, // Menor eficiência por ser manual
  },
};

export const BACKPACK_CAPACITY_OPTIONS = [
  { value: 20, label: '20 Litros' },
  { value: 30, label: '30 Litros' },
];

export const DEFAULT_SPRAYING_COSTS: SprayingCosts = {
  tractorOwnership: 'proprio',
  tractorCostPerHour: 150,
  droneCostPerHectare: 50,
  backpackCostPerTank: 15,
};

export const SPRAYING_UNITS: { value: SprayingUnit; label: string; description: string }[] = [
  { value: 'L/ha', label: 'L/ha', description: 'Litros por hectare' },
  { value: 'Kg/ha', label: 'Kg/ha', description: 'Quilos por hectare' },
  { value: '%', label: '% da Calda', description: 'Percentual do volume do tanque' },
  { value: 'mL/100L', label: 'mL / 100L', description: 'Mililitros por 100L de calda' },
];

/**
 * Calcula a quantidade por tanque baseado na unidade
 */
export function calculateQuantityPerTank(
  unit: SprayingUnit,
  doseInput: number,
  tankCapacity: number,
  applicationRate: number
): number {
  switch (unit) {
    case 'L/ha':
    case 'Kg/ha': {
      // Área coberta por um tanque cheio
      const areaCoveredPerTank = tankCapacity / applicationRate;
      return areaCoveredPerTank * doseInput;
    }
    case '%': {
      // Percentual do volume do tanque
      return tankCapacity * (doseInput / 100);
    }
    case 'mL/100L': {
      // mL por 100L - resultado em mL, converter para L
      const resultMl = (tankCapacity / 100) * doseInput;
      return resultMl / 1000; // Converter mL para L
    }
    default:
      return 0;
  }
}

/**
 * Calcula a quantidade total para toda a área
 */
export function calculateTotalQuantity(
  unit: SprayingUnit,
  doseInput: number,
  hectares: number,
  tankCapacity: number,
  applicationRate: number
): number {
  // Número de tanques necessários para cobrir toda a área
  const volumeTotalCalda = applicationRate * hectares;
  const numberOfTanks = volumeTotalCalda / tankCapacity;
  
  const qtyPerTank = calculateQuantityPerTank(unit, doseInput, tankCapacity, applicationRate);
  return qtyPerTank * numberOfTanks;
}

/**
 * Calcula o custo total de aplicação baseado no equipamento
 */
export function calculateApplicationCost(
  equipmentType: EquipmentType,
  costs: SprayingCosts,
  hectares: number,
  tankCapacity: number,
  applicationRate: number
): number {
  const volumeTotalCalda = applicationRate * hectares;
  const numberOfTanks = Math.ceil(volumeTotalCalda / tankCapacity);
  
  switch (equipmentType) {
    case 'trator': {
      // Estimativa: 1 hora para cada 5 tanques (ajustável)
      const hoursEstimated = numberOfTanks * 0.5; // 30min por tanque
      return hoursEstimated * costs.tractorCostPerHour;
    }
    case 'drone': {
      return hectares * costs.droneCostPerHectare;
    }
    case 'bomba_costal': {
      return numberOfTanks * costs.backpackCostPerTank;
    }
    default:
      return 0;
  }
}

/**
 * Formata a quantidade para exibição
 */
export function formatQuantity(value: number, unit: SprayingUnit): string {
  if (unit === 'Kg/ha') {
    return `${value.toFixed(2)} Kg`;
  }
  return `${value.toFixed(2)} L`;
}
