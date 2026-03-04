/**
 * Coffee Recommendation Engine — 4-Module Architecture
 * 
 * Determines the fertilization strategy based on months_since_planting:
 *   Module A: Plantio (month 0) — Planting hole only
 *   Module B: Ano 1 (months 1-12) — Simple salts, progressive curve
 *   Module C: Ano 2 (months 13-24) — Seasonal or irrigated distribution
 *   Module D: Adulto (>24 months) — Production targets + soil correction
 */

import type { CoffeeType } from '@/contexts/CoffeeContext';

// ─── Phase Detection ─────────────────────────────────────────

export type CoffeePhase = 'plantio' | 'ano1' | 'ano2' | 'adulto';

export function calculateMonthsSincePlanting(plantingMonth: number, plantingYear: number): number {
  const now = new Date();
  return (now.getFullYear() - plantingYear) * 12 + (now.getMonth() + 1 - plantingMonth);
}

export function determinePhase(monthsSincePlanting: number): CoffeePhase {
  if (monthsSincePlanting <= 0) return 'plantio';
  if (monthsSincePlanting <= 12) return 'ano1';
  if (monthsSincePlanting <= 24) return 'ano2';
  return 'adulto';
}

export function getPhaseLabel(phase: CoffeePhase): string {
  switch (phase) {
    case 'plantio': return 'Plantio (Implantação)';
    case 'ano1': return '1º Ano (Formação)';
    case 'ano2': return '2º Ano (Formação Avançada)';
    case 'adulto': return 'Produção (Adulto)';
  }
}

export function getPhaseEmoji(phase: CoffeePhase): string {
  switch (phase) {
    case 'plantio': return '🌱';
    case 'ano1': return '🌿';
    case 'ano2': return '🌳';
    case 'adulto': return '☕';
  }
}

// ─── Month Label Formatting ──────────────────────────────────

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_NAMES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/**
 * Format relative month label: "Mês N (Mon/YY)"
 * @param relativeMonth 1-based relative month (1 = first month after planting)
 * @param plantingMonth 1-12
 * @param plantingYear full year
 */
export function formatRelativeMonthLabel(
  relativeMonth: number,
  plantingMonth: number,
  plantingYear: number,
): string {
  const totalMonths = (plantingMonth - 1) + relativeMonth;
  const realMonthIdx = totalMonths % 12; // 0-based
  const yearsOffset = Math.floor(totalMonths / 12);
  const realYear = plantingYear + yearsOffset;
  return `Mês ${relativeMonth} (${MONTH_NAMES_SHORT[realMonthIdx]}/${String(realYear).slice(-2)})`;
}

/**
 * Get the real calendar month (1-12) for a relative month
 */
export function getCalendarMonth(relativeMonth: number, plantingMonth: number): number {
  return ((plantingMonth - 1 + relativeMonth) % 12) + 1;
}

/**
 * Get the real calendar year for a relative month
 */
export function getCalendarYear(relativeMonth: number, plantingMonth: number, plantingYear: number): number {
  const totalMonths = (plantingMonth - 1) + relativeMonth;
  return plantingYear + Math.floor(totalMonths / 12);
}

/**
 * Get real month name for a calendar month number (1-12)
 */
export function getMonthName(monthNum: number): string {
  return MONTH_NAMES_FULL[(monthNum - 1) % 12];
}

// ─── N Intensity Levels ──────────────────────────────────────

export type NIntensity = 'conservador' | 'alta_performance';

export const N_INTENSITY_LABELS: Record<NIntensity, string> = {
  conservador: 'Conservador',
  alta_performance: 'Alta Performance',
};

// ─── Phosphorus Classification (5ª Aproximação Incaper) ──────

export type PhosphorusLevel = 'baixo' | 'medio' | 'alto';

/** Classifica o teor de P no solo (Mehlich-1, mg/dm³) */
export function classifyPhosphorus(pSolo: number | undefined): PhosphorusLevel {
  if (pSolo === undefined || pSolo === null) return 'medio';
  if (pSolo <= 10) return 'baixo';
  if (pSolo <= 20) return 'medio';
  return 'alto';
}

/**
 * Matriz de recomendação de P₂O₅ baseada no teor do solo (5ª Aproximação).
 * Plantio: g/metro de sulco | Ano 1/2: g/planta/ano | Produção: kg/ha/ano
 */
export const P2O5_TARGETS = {
  planting: { baixo: 60, medio: 40, alto: 20 } as Record<PhosphorusLevel, number>,
  year_1:   { baixo: 20, medio: 15, alto: 10 } as Record<PhosphorusLevel, number>,
  year_2:   { baixo: 30, medio: 20, alto: 15 } as Record<PhosphorusLevel, number>,
  production: { baixo: 90, medio: 60, alto: 40 } as Record<PhosphorusLevel, number>,
} as const;

// ─── Year 2 Goals (g/planta/ano) ─────────────────────────────
// NOTA: P₂O₅ agora é calculado via P2O5_TARGETS (solo-responsivo), não mais fixo aqui.

export const GOAL_YEAR_2: Record<string, Record<NIntensity, { n: number }>> = {
  conilon: {
    conservador: { n: 80 },
    alta_performance: { n: 100 },
  },
  arabica: {
    conservador: { n: 80 },
    alta_performance: { n: 100 },
  },
} as const;

// ─── Year 2 P₂O₅ — soil-responsive (Mehlich-1, 5ª Aproximação) ──

export function getYear2P2O5(pSolo: number | undefined): number {
  return P2O5_TARGETS.year_2[classifyPhosphorus(pSolo)];
}

/** P₂O₅ para Ano 1 — solo-responsivo (g/planta/ano) */
export function getYear1P2O5(pSolo: number | undefined): number {
  return P2O5_TARGETS.year_1[classifyPhosphorus(pSolo)];
}

/** P₂O₅ para fase adulta — solo-responsivo (kg/ha/ano) */
export function getAdultP2O5(pSolo: number | undefined): number {
  return P2O5_TARGETS.production[classifyPhosphorus(pSolo)];
}

// ─── Potassium Classification & Targets (5ª Aproximação Incaper) ──

export type PotassiumLevel = 'baixo' | 'medio' | 'alto' | 'muito_alto';

/**
 * Converte K do solo (mg/dm³) para cmolc/dm³ e retorna o multiplicador de ajuste.
 * Solo Baixo → +20%, Médio → 100%, Alto → -20%, Muito Alto → -40%.
 */
export function getPotassiumMultiplier(kSoilMgDm3: number | undefined): { multiplier: number; level: PotassiumLevel } {
  if (!kSoilMgDm3) return { multiplier: 1.0, level: 'medio' };
  const kCmolc = kSoilMgDm3 / 390;
  if (kCmolc < 0.15) return { multiplier: 1.2, level: 'baixo' };
  if (kCmolc <= 0.30) return { multiplier: 1.0, level: 'medio' };
  if (kCmolc <= 0.45) return { multiplier: 0.8, level: 'alto' };
  return { multiplier: 0.6, level: 'muito_alto' };
}

/**
 * Metas Base de K₂O por fase fisiológica.
 * Plantio: g/metro (proibido K no sulco).
 * Ano 1/2: g/planta/ano.
 * export_adult: kg K₂O/saca produzida.
 */
export const K2O_TARGETS = {
  planting: 0,       // g/metro (Proibido K no sulco)
  year_1: 40,        // g/planta/ano
  year_2: 80,        // g/planta/ano
  export_adult: 4.0, // kg K₂O/saca produzida
} as const;

/**
 * Curva de Distribuição Fenológica do K para Fase Adulta.
 * Concentra K na granação (pico de demanda para peso do grão).
 */
export const K_PHENOLOGY_DISTRIBUTION = [
  { period: 'Set/Out (Pré-Florada)', percent: 0.10, action: 'Pegamento' },
  { period: 'Nov/Dez (Expansão)', percent: 0.30, action: 'Crescimento celular' },
  { period: 'Jan/Fev (Granação)', percent: 0.40, action: 'Pico de demanda (Peso de grão)' },
  { period: 'Mar/Abr (Maturação)', percent: 0.20, action: 'Finalização' },
] as const;

/**
 * Calcula a demanda ajustada de K₂O para o Ano 2 (g/planta/ano).
 * Aplica o multiplicador do solo sobre a meta base de 80 g/planta.
 */
export function getYear2K2O(kSoloMgDm3: number | undefined): { k2o: number; multiplier: number; level: PotassiumLevel } {
  const { multiplier, level } = getPotassiumMultiplier(kSoloMgDm3);
  return { k2o: Math.round(K2O_TARGETS.year_2 * multiplier), multiplier, level };
}

/**
 * Calcula a demanda ajustada de K₂O para o Ano 1 (g/planta/ano).
 */
export function getYear1K2O(kSoloMgDm3: number | undefined): number {
  const { multiplier } = getPotassiumMultiplier(kSoloMgDm3);
  return Math.round(K2O_TARGETS.year_1 * multiplier);
}

/**
 * Calcula a demanda de K₂O na fase adulta (kg/ha/ano).
 * Fórmula: sacas × 4.0 × multiplicador_solo.
 */
export function calcAdultK2ODemand(sacasPerHa: number, kSoloMgDm3: number | undefined): number {
  const { multiplier } = getPotassiumMultiplier(kSoloMgDm3);
  return sacasPerHa * K2O_TARGETS.export_adult * multiplier;
}


// ─── Year 2 Seasonal Distribution ────────────────────────────

export interface SeasonalDistribution {
  stage: string;
  months: number[]; // calendar months 1-12
  pct: number;
}

export const YEAR2_SEASONAL_DISTRIBUTION: SeasonalDistribution[] = [
  { stage: 'Pré-florada', months: [8, 9], pct: 0.20 },
  { stage: 'Chumbinho', months: [10, 11], pct: 0.30 },
  { stage: 'Granação', months: [12, 1, 2], pct: 0.35 },
  { stage: 'Maturação', months: [3, 4, 5], pct: 0.15 },
];

/** Get seasonal weight for a given calendar month (1-12) */
export function getYear2MonthWeight(calendarMonth: number): { weight: number; stage: string } {
  for (const dist of YEAR2_SEASONAL_DISTRIBUTION) {
    if (dist.months.includes(calendarMonth)) {
      return {
        weight: dist.pct / dist.months.length,
        stage: dist.stage,
      };
    }
  }
  // Months not in any stage (Jun, Jul) — rest period
  return { weight: 0, stage: 'Repouso' };
}

// ─── Adult Extraction Factors (kg per saca) ──────────────────
// NOTA: P₂O₅ removido — agora usa P2O5_TARGETS.production (solo-responsivo).

export const EXTRACTION_FACTORS = {
  k2o: K2O_TARGETS.export_adult, // 4.0 kg K₂O/saca (was 4.5)
  s: 0.5,
} as const;

/**
 * Fórmula composta para N na fase adulta (> 24 meses).
 * Substitui o fator linear de 3.5 kg N/saca.
 * Base fixa de 100 kg N/ha + 5.5 kg N por saca produzida.
 */
export function calcAdultNDemand(sacasPerHa: number): number {
  return 100 + (sacasPerHa * 5.5);
}

// ─── Formation S Demand (g S/plant/year) ─────────────────────
// Based on EMBRAPA/INCAPER references for formation phase.
// Conilon (irrigado): higher vegetative growth → 20g S/plant
// Arábica (sequeiro): 15g S/plant
export const S_DEMAND_FORMATION = {
  conilon: 10,
  arabica: 10,
} as const;

// ─── Gesso Agrícola reference ────────────────────────────────
// 24% Ca, 15% S. Used to close S deficit after Sulfato de Amônia.
export const GESSO_AGRICOLA = {
  percS: 0.15,
  percCa: 0.24,
} as const;

// ─── Soil Correction Factors (Mehlich) — Adult phase only ────
// NOTA: getSoilCorrectionP removido — P agora é solo-responsivo via P2O5_TARGETS.
// NOTA: getSoilCorrectionK removido — K agora usa getPotassiumMultiplier (híbrido exportação + solo).

/** @deprecated Use calcAdultK2ODemand instead. */
export function getSoilCorrectionK(kMgDm3: number): number {
  const { multiplier } = getPotassiumMultiplier(kMgDm3);
  return multiplier;
}

// ─── Stand Factor (Population Correction) ────────────────────
// Reference populations for which the adult formulas were calibrated.
// Conilon irrigado: 2.5m × 1.0m = 4000 pl/ha
// Arábica sequeiro:  2.5m × 1.0m = 4000 pl/ha

export const REFERENCE_PLANTS_PER_HA: Record<string, number> = {
  conilon: 4000,
  arabica: 4000,
};

/**
 * Calcula o fator de correção de estande para a fase adulta.
 * Ajusta a demanda padrão (kg/ha) proporcionalmente à população real.
 * O min(1.0, ...) impõe teto de segurança: populações acima da referência
 * não extrapolam a dose calibrada.
 */
export function calcStandFactor(plantsPerHa: number, coffeeType: string): number {
  const ref = REFERENCE_PLANTS_PER_HA[coffeeType] ?? 4000;
  if (plantsPerHa <= 0 || ref <= 0) return 1.0;
  return Math.min(1.0, plantsPerHa / ref);
}

// ─── Year 1 Product Filter ───────────────────────────────────

const YEAR1_ALLOWED_KEYWORDS = [
  'ureia', 'uréia', 'urea',
  'map', 'map purificado',
  'kcl', 'cloreto de potássio', 'cloreto de potassio',
  'calcinit', 'nitrato de cálcio', 'nitrato de calcio',
  'sulfato de magnésio', 'sulfato de magnesio',
  'sulfato de amônia', 'sulfato de amonia',
];

/** Check if a product is allowed in Year 1 (simple salts only) */
export function isYear1AllowedProduct(productName: string): boolean {
  const lower = productName.toLowerCase();
  return YEAR1_ALLOWED_KEYWORDS.some(kw => lower.includes(kw));
}

/** Check if a product is a prohibited NPK formulation */
export function isNPKFormulado(productName: string): boolean {
  const lower = productName.toLowerCase();
  return /\d{1,2}-\d{1,2}-\d{1,2}/.test(lower) || lower.includes('polyblen') || lower.includes('npk');
}

// ─── Micronutrient Fixed Schedule ────────────────────────────

/** Months where Zn and B are critical (pré-florada + expansion) */
export const MICRO_ZN_B_MONTHS = [8, 9, 10, 11]; // Ago-Nov

/** Months where Cu is applied (quarterly) */
export const MICRO_CU_MONTHS = [1, 4, 7, 10];

/** Fixed micronutrient doses (g/planta for foliar reference) */
export const MICRO_FOLIAR_DOSES = {
  zn: { gPerPlant: 0.5, productName: 'Sulfato de Zinco', concentration: 0.20 },
  b: { gPerPlant: 0.5, productName: 'Ácido Bórico', concentration: 0.17 },
  cu: { gPerPlant: 0.25, productName: 'Sulfato de Cobre', concentration: 0.25 },
} as const;

// ─── Operações Casadas — Arábica Adulto ──────────────────────
// Regras de janela operacional rígida para reduzir passadas de trator/drone.
// Cada regra agrupa operações de solo + foliar que podem ser executadas
// na mesma janela, minimizando mão de obra e hora-máquina.

export interface OperacaoCasada {
  id: number;
  meses: number[];
  fase: string;
  operacaoSolo: string;
  operacaoFoliar: string[];
  alerta: string;
  /** true = solo inativo nesta janela (CRF atuando ou sem necessidade) */
  soloInativo: boolean;
  /** Número estimado de passadas de máquina para este período */
  passadasEstimadas: number;
}

export const OPERACOES_CASADAS_ARABICA: OperacaoCasada[] = [
  {
    id: 1,
    meses: [9, 10],
    fase: 'Pré-Florada e Florada',
    operacaoSolo: 'Aplicação Única de NPK (CRF - Polímero) — Requer umidade mínima',
    operacaoFoliar: ['Zinco (Zn)', 'Boro (B)', 'Inseticida (Bicho-Mineiro)', 'Fungicida Protetor'],
    alerta: 'Janela Crítica de Pegamento — casar solo + foliar na mesma entrada',
    soloInativo: false,
    passadasEstimadas: 2,
  },
  {
    id: 2,
    meses: [11, 12],
    fase: 'Chumbinho e Expansão',
    operacaoSolo: 'Nenhuma (CRF atuando)',
    operacaoFoliar: ['Fungicida Sistêmico', 'Inseticida (Broca)', 'Cálcio (Ca)', 'Magnésio (Mg)'],
    alerta: 'Tanque casado: respeitar ordem dos produtos na calda',
    soloInativo: true,
    passadasEstimadas: 1,
  },
  {
    id: 3,
    meses: [1, 2],
    fase: 'Enchimento de Grãos',
    operacaoSolo: 'Nenhuma',
    operacaoFoliar: ['Fungicida Sistêmico', 'Potássio (K) foliar'],
    alerta: 'Foco no peso e padronização do grão',
    soloInativo: true,
    passadasEstimadas: 1,
  },
  {
    id: 4,
    meses: [3, 4],
    fase: 'Maturação',
    operacaoSolo: 'Nenhuma',
    operacaoFoliar: ['Fungicida Cúprico (Cobre)', 'Maturador (Opcional)'],
    alerta: 'Manutenção de folhada pré-colheita',
    soloInativo: true,
    passadasEstimadas: 1,
  },
  {
    id: 5,
    meses: [5, 6, 7, 8],
    fase: 'Colheita e Pós-Colheita',
    operacaoSolo: 'Correção: Calcário e/ou Gesso Agrícola',
    operacaoFoliar: ['Cobre Foliar (Cicatrização Pós-Derriça)'],
    alerta: 'Recuperação do estresse da planta — solo liberado para correção',
    soloInativo: false,
    passadasEstimadas: 2,
  },
];

/**
 * Retorna a operação casada para um dado mês (1-12) — Arábica adulto.
 * Permite ao motor agrupar ações de solo + foliar na mesma janela.
 */
export function getOperacaoCasadaByMonth(month: number): OperacaoCasada | undefined {
  return OPERACOES_CASADAS_ARABICA.find(r => r.meses.includes(month));
}

/**
 * Calcula o total estimado de passadas/ano usando operações casadas
 * vs abordagem tradicional (cada operação = 1 passada).
 */
export function calcularEconomiaPassadas(totalOperacoesTradicional: number): {
  passadasCasadas: number;
  passadasTradicional: number;
  economia: number;
  economiaPct: number;
} {
  const passadasCasadas = OPERACOES_CASADAS_ARABICA.reduce((sum, op) => sum + op.passadasEstimadas, 0);
  const economia = totalOperacoesTradicional - passadasCasadas;
  return {
    passadasCasadas,
    passadasTradicional: totalOperacoesTradicional,
    economia: Math.max(0, economia),
    economiaPct: totalOperacoesTradicional > 0 ? Math.max(0, (economia / totalOperacoesTradicional) * 100) : 0,
  };
}
