export interface Farm {
  id: string;
  name: string;
  createdAt: Date;
}

export type SoilTexture = 'arenosa' | 'media' | 'argilosa';
export type TexturaFonte = 'estimada' | 'informada' | 'p_rem';

/** Estima a textura do solo a partir da Matéria Orgânica (g/dm³) */
export function estimarTextura(moGdm3: number): SoilTexture {
  if (moGdm3 < 15) return 'arenosa';
  if (moGdm3 > 30) return 'argilosa';
  return 'media';
}

/**
 * Estima a classe textural do solo com base no Fósforo Remanescente (P-rem).
 * Referência: Tabela 4 – Textura do solo em função do P-rem (Solução 60 mg/L de P, mg/L).
 * Arenosa: 0–10 | Média: 10–40 | Argilosa: 40–60
 */
export function estimarTexturaPorPrem(pRemMgL: number): SoilTexture {
  if (pRemMgL <= 10) return 'arenosa';
  if (pRemMgL <= 40) return 'media';
  return 'argilosa';
}

export const TEXTURA_LABELS: Record<SoilTexture, string> = {
  arenosa: 'Arenosa',
  media: 'Média',
  argilosa: 'Argilosa',
};

export interface SoilAnalysis {
  id: string;
  farmId: string;
  talhaoId?: string;
  // Macronutrientes
  ca: number;
  mg: number;
  k: number;
  hAl: number;
  p: number;
  mo: number;
  // Micronutrientes
  zn: number;
  b: number;
  mn: number;
  fe: number;
  cu: number;
  s: number;
  // Textura
  textura: SoilTexture;
  texturaFonte: TexturaFonte;
  argila?: number;
  silte?: number;
  areia?: number;
  // Resultado
  vPercent: number;
  createdAt: Date;
}

export interface SeedCalculation {
  id: string;
  farmId: string;
  rowSpacing: number; // Espaçamento entre linhas (m)
  seedsPerMeter: number; // Sementes por metro linear
  populationPerHectare: number; // População calculada
  createdAt: Date;
}

export interface Input {
  id: string;
  name: string;
  type: 'fertilizer' | 'seed';
  pricePerUnit: number;
  unit: string; // kg, saco, etc
}

export interface Seed {
  id: string;
  name: string;
  company: string;
  productivityRange: 'baixa' | 'media' | 'alta' | 'muito_alta';
  bagWeight: number; // kg
  seedsPerBag: number;
  price: number;
}

export interface FarmCost {
  id: string;
  farmId: string;
  inputId: string;
  quantity: number;
  totalCost: number;
  hectares: number;
  costPerHectare: number;
}
