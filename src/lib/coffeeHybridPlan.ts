/**
 * Coffee Hybrid Fertilization Plan Engine v4
 *
 * 4-module architecture based on months_since_planting:
 *   Module A: Plantio (month 0) — Planting hole only, no monthly schedule
 *   Module B: Ano 1 (1-12) — Simple salts only, progressive curve, relative months
 *   Module C: Ano 2 (13-24) — Seasonal distribution or irrigated (12 equal)
 *   Module D: Adulto (>24) — Production targets + Mehlich soil correction
 */

import type { CoffeeType } from '@/contexts/CoffeeContext';
import {
  calcularRecomendacao,
  findDoseP2O5,
  MATRIZ_PARCELAMENTO,
  META_MICROS,
  CALCINIT,
  type CalcResult,
} from '@/data/coffeePlantingReference';
import {
  type CoffeePhase,
  determinePhase,
  calculateMonthsSincePlanting,
  getPhaseLabel,
  formatRelativeMonthLabel,
  getCalendarMonth,
  getYear2MonthWeight,
  GOAL_YEAR_2,
  getYear2P2O5,
  getYear2K2O,
  getYear1K2O,
  type NIntensity,
  EXTRACTION_FACTORS,
  calcAdultNDemand,
  calcAdultK2ODemand,
  getAdultP2O5,
  S_DEMAND_FORMATION,
  GESSO_AGRICOLA,
  getSoilCorrectionK,
  calcStandFactor,
  isYear1AllowedProduct,
  isNPKFormulado,
  MICRO_ZN_B_MONTHS,
  MICRO_CU_MONTHS,
  getOperacaoCasadaByMonth,
  type OperacaoCasada,
} from '@/lib/coffeeRecommendationEngine';

// Re-export for convenience
export { type CoffeePhase } from '@/lib/coffeeRecommendationEngine';

// ─── Application method types ────────────────────────────────
export type ApplicationMethodType = 'solo_lanco' | 'fertirrigacao' | 'jato_trator' | 'foliar';

export interface ApplicationMethodInfo {
  type: ApplicationMethodType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const APPLICATION_METHOD_INFO: Record<ApplicationMethodType, ApplicationMethodInfo> = {
  solo_lanco: {
    type: 'solo_lanco',
    label: 'Solo (A Lanço)',
    icon: '🌾',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    description: 'Aplicar na projeção da saia do cafeeiro com trator ou manualmente.',
  },
  fertirrigacao: {
    type: 'fertirrigacao',
    label: 'Fertirrigação',
    icon: '💧',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    description: 'Injetar via venturi/bomba dosadora. Dividir dose mensal em 4 aplicações semanais.',
  },
  jato_trator: {
    type: 'jato_trator',
    label: 'Jato com Trator',
    icon: '🚜',
    color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    description: 'Aplicar via pulverizador tratorizado (400L). Produtos solúveis diluídos no tanque.',
  },
  foliar: {
    type: 'foliar',
    label: 'Adubação Foliar',
    icon: '🍃',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    description: 'Pulverizar com adjuvante. Não misturar na calda de fertirrigação.',
  },
};

// ─── Phenological distribution for PRODUCTION (Adult) ────────
export interface PhenologicalDistribution {
  stage: string;
  months: number[];
  nk_pct: number;
  focus: string;
}

export const PHENOLOGICAL_DISTRIBUTION: PhenologicalDistribution[] = [
  {
    stage: 'Pré-Florada / Florada',
    months: [9, 10],
    nk_pct: 0.15,
    focus: 'Fosfatagem (MAP). Recuperação pós-colheita. Boro crítico para pegamento da flor.',
  },
  {
    stage: 'Chumbinho / Expansão',
    months: [11, 12, 1],
    nk_pct: 0.40,
    focus: '1ª parcela NPK (30%). Pico de demanda de N. Crescimento vegetativo intenso.',
  },
  {
    stage: 'Enchimento de Grãos',
    months: [2, 3],
    nk_pct: 0.35,
    focus: '2ª e 3ª parcelas NPK (35%). Pico de demanda de K. Peso e qualidade do grão.',
  },
  {
    stage: 'Maturação / Colheita / Repouso',
    months: [4, 5, 6, 7, 8],
    nk_pct: 0.10,
    focus: 'Calagem Jul/Ago. Sem NPK Mai/Jun (colheita). Reduzir N, foco em correção de solo.',
  },
];

function getProductionMonthlyWeight(month: number): { weight: number; stage: string } {
  for (const pd of PHENOLOGICAL_DISTRIBUTION) {
    if (pd.months.includes(month)) {
      return { weight: pd.nk_pct / pd.months.length, stage: pd.stage };
    }
  }
  return { weight: 0, stage: 'Desconhecido' };
}

// ─── Product classification ──────────────────────────────────

const SOLUBLE_NK_KEYWORDS = [
  'ureia', 'uréia', 'sulfato de amônia', 'sulfato de amonio',
  'cloreto de potássio', 'cloreto de potassio', 'kcl',
  'nitrato de potássio', 'nitrato de potassio',
  'nitrato de amônio', 'nitrato de amônio',
  'sulfato de potássio', 'sulfato de potassio',
];

const LANCO_KEYWORDS = ['fte', 'fritas', 'calcário', 'calcario', 'gesso'];

/** Detecta se um produto é NPK formulado granular (ex: 20-05-20) */
export function isNPKGranularFormulado(nome: string): boolean {
  const lower = nome.toLowerCase();
  return /\b\d{1,2}-\d{1,2}-\d{1,2}\b/.test(lower) || lower.includes('npk');
}

export function classifyApplicationMethod(
  tipoProduto: string,
  nome: string,
  coffeeType: CoffeeType,
): ApplicationMethodType {
  const nameLower = nome.toLowerCase();
  // Micronutrientes (Zn) devem ser aplicados APENAS via foliar, independente do tipoProduto
  if (nameLower.includes('sulfato de zinco') || nameLower.includes('znso4')) return 'foliar';
  if (tipoProduto === 'Foliar' || tipoProduto === 'Adjuvantes') return 'foliar';
  if (['Herbicida', 'Fungicida', 'Inseticida'].includes(tipoProduto)) return 'foliar';
  if (tipoProduto === 'Correção de Solo') return 'solo_lanco';
  if (LANCO_KEYWORDS.some(kw => nameLower.includes(kw))) return 'solo_lanco';
  if (nameLower.includes('map') && !nameLower.includes('solúvel') && !nameLower.includes('soluvel')) return 'solo_lanco';
  if (tipoProduto === 'Plantio') return 'solo_lanco';
  // NPK granulado formulado → a lanço para Arábica (sequeiro)
  if (isNPKGranularFormulado(nome) && coffeeType === 'arabica') return 'solo_lanco';
  if (tipoProduto === 'Cobertura') {
    const isSoluble = SOLUBLE_NK_KEYWORDS.some(kw => nameLower.includes(kw));
    if (isSoluble) return coffeeType === 'arabica' ? 'jato_trator' : 'fertirrigacao';
    return coffeeType === 'arabica' ? 'jato_trator' : 'fertirrigacao';
  }
  return coffeeType === 'arabica' ? 'jato_trator' : 'fertirrigacao';
}

// ─── Lanço-specific distribution rules ───────────────────────

/**
 * Distribuição fenológica do NPK granulado a lanço (Arábica).
 * Concentra a aplicação nos meses de maior demanda fisiológica,
 * reduzindo a necessidade de suplementação foliar de macronutrientes.
 */
const NPK_LANCO_PHENOLOGICAL: Array<{ months: number[]; weight: number; stage: string; instruction: string }> = [
  {
    months: [11, 12],
    weight: 0.30,
    stage: '1ª Parcela — Chumbinho/Expansão',
    instruction: '1ª parcela NPK (30% da dose). Aplicar a lanço na projeção da saia.',
  },
  {
    months: [1, 2],
    weight: 0.35,
    stage: '2ª Parcela — Enchimento de Grãos',
    instruction: '2ª parcela NPK (35% da dose). Aplicar a lanço na projeção da saia.',
  },
  {
    months: [3],
    weight: 0.35,
    stage: '3ª Parcela — Fim de Enchimento',
    instruction: '3ª parcela NPK (35% da dose). Apenas em Março — evitar Abril.',
  },
];

function getLancoMonthWeight(
  tipoProduto: string,
  productName: string,
  monthNum: number,
): { weight: number; instruction: string } | null {
  const nameLower = productName.toLowerCase();

  // Gesso Agrícola: aplicar em Set/Out (início chuvas) — MUST check before generic 'Correção de Solo'
  if (nameLower.includes('gesso')) {
    if (monthNum === 9) return { weight: 0.50, instruction: 'Gesso Agrícola — aplicar na projeção da saia antes das chuvas. Fonte de S + Ca.' };
    if (monthNum === 10) return { weight: 0.50, instruction: 'Gesso Agrícola — aplicar na projeção da saia. Incorporação com as primeiras chuvas.' };
    return null;
  }

  if (tipoProduto === 'Correção de Solo' || nameLower.includes('calcário') || nameLower.includes('calcario')) {
    if (monthNum === 7 || monthNum === 8) {
      return { weight: 0.50, instruction: 'Calagem pós-colheita, antes das chuvas. Aplicar em área total.' };
    }
    return null;
  }

  if (nameLower.includes('fte') || nameLower.includes('fritas')) {
    if (monthNum === 10) return { weight: 0.50, instruction: 'Início das chuvas. Espalhar na projeção da saia do cafeeiro.' };
    if (monthNum === 3) return { weight: 0.50, instruction: 'Fim das chuvas. Espalhar na projeção da saia do cafeeiro.' };
    return null;
  }

  if (nameLower.includes('map')) {
    if (monthNum === 9) return { weight: 0.50, instruction: 'Fosfatagem — início das chuvas. Incorporar na projeção da saia.' };
    if (monthNum === 10) return { weight: 0.50, instruction: 'Fosfatagem — início das chuvas. Incorporar na projeção da saia.' };
    return null;
  }

  // NPK granulado formulado → distribuição fenológica específica
  if (isNPKGranularFormulado(productName)) {
    for (const phase of NPK_LANCO_PHENOLOGICAL) {
      if (phase.months.includes(monthNum)) {
        return {
          weight: phase.weight / phase.months.length,
          instruction: phase.instruction,
        };
      }
    }
    // Meses de repouso (Jun, Jul, Ago) — sem aplicação de NPK
    return null;
  }

  const rainyMonths = [10, 11, 12, 1, 2, 3];
  if (rainyMonths.includes(monthNum)) {
    return { weight: 1 / rainyMonths.length, instruction: 'Espalhar na projeção da saia do cafeeiro.' };
  }
  return null;
}

// ─── Hybrid Plan data structures ─────────────────────────────

export interface HybridPlanProduct {
  id: string;
  insumoId: string;
  name: string;
  tipoProduto: string;
  method: ApplicationMethodType;
  annualDosePerHa: number;
  unit: string;
  macro_n: number;
  macro_p2o5: number;
  macro_k2o: number;
  macro_s: number;
  micro_b: number;
  micro_zn: number;
}

export interface MonthlyAction {
  product: HybridPlanProduct;
  doseMonthKgHa: number;
  doseWeeklyKgHa: number;
  /** Dose in grams per plant (when totalPlants available) */
  doseGramsPerPlant?: number;
  instruction: string;
  reason: string;
}

export interface MonthlyPlan {
  month: string;
  monthIndex: number;
  stage: string;
  actions: MonthlyAction[];
  /** Relative label: "Mês 1 (Abr/26)" for year 1/2 */
  relativeLabel?: string;
  /** Calendar month number (1-12) */
  calendarMonth: number;
  /** Phenological weight applied to this month (0-1), for transparency in reports */
  weightPct?: number;
  /** Operação casada para este mês (Arábica adulto) — reduz passadas de máquina */
  operacaoCasada?: OperacaoCasada;
}

export interface HybridPlan {
  coffeeType: CoffeeType;
  sacasPerHa: number;
  hectares: number;
  demandN: number;
  demandK: number;
  demandP: number;
  months: MonthlyPlan[];
  productsByMethod: Record<ApplicationMethodType, HybridPlanProduct[]>;
  vPercentAlert: { current: number; target: number; needsCorrection: boolean } | null;
  phase: CoffeePhase;
  monthsSincePlanting: number;
  plantingMonth: number;
  plantingYear: number;
  isFirstYear?: boolean; // kept for backward compat
  firstYearCalc?: CalcResult;
  year2Goals?: { n: number; p2o5: number; k2o: number };
  soilCorrectionP?: number;
  soilCorrectionK?: number;
  irrigated?: boolean;
  nIntensity?: NIntensity;
  k2oReduction?: { reductionPct: number; originalK2O: number; adjustedK2O: number };
  /** Total plants in the plot (for g/planta calculations) */
  totalPlants?: number;
}

export interface FirstYearConfig {
  culturaNome: string;
  totalPlants: number;
  pSolo: number;
  kSolo: number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ─── First-year reference products builder ──────────────────

function buildFirstYearReferenceProducts(
  calc: CalcResult,
  hectares: number,
  coffeeType: CoffeeType,
): Array<{
  id: string; insumoId: string; name: string; tipoProduto: string;
  dosePerHa: number; unit: string;
  macro_n: number; macro_p2o5: number; macro_k2o: number; macro_s: number;
  micro_b: number; micro_zn: number;
}> {
  const ha = hectares > 0 ? hectares : 1;
  const products: Array<{
    id: string; insumoId: string; name: string; tipoProduto: string;
    dosePerHa: number; unit: string;
    macro_n: number; macro_p2o5: number; macro_k2o: number; macro_s: number;
    micro_b: number; micro_zn: number;
  }> = [];

  const add = (id: string, name: string, tipo: string, totalKg: number, composition: Partial<{
    n: number; p2o5: number; k2o: number; s: number; b: number; zn: number;
  }>) => {
    if (totalKg <= 0) return;
    products.push({
      id: `ref-${id}`, insumoId: `ref-${id}`, name, tipoProduto: tipo,
      dosePerHa: totalKg / ha, unit: 'kg/ha',
      macro_n: composition.n ?? 0, macro_p2o5: composition.p2o5 ?? 0,
      macro_k2o: composition.k2o ?? 0, macro_s: composition.s ?? 0,
      micro_b: composition.b ?? 0, micro_zn: composition.zn ?? 0,
    });
  };

  add('ureia', 'Uréia', 'Cobertura', calc.totalUreiaKg, { n: 45 });
  add('kcl', 'Cloreto de Potássio (KCl)', 'Cobertura', calc.totalKclKg, { k2o: 60 });
  add('calcinit', 'Calcinit (Nitrato de Cálcio)', 'Cobertura', calc.totalCalcinitKg, { n: 15.5 });
  add('map', 'MAP Purificado', 'Plantio', calc.totalMapKg, { n: 12, p2o5: 61 });
  add('sulfamonia', 'Sulfato de Amônia', 'Cobertura', calc.totalSulfatoAmoniaKg, { n: 22, s: 24 });
  add('mgso4', 'Sulfato de Magnésio', 'Cobertura', calc.totalMgKg, { s: 13 });
  // Sulfato de Zinco removido — Zn deve ser aplicado apenas via foliar (addMicronutrientFixedItems)
  add('cuso4', 'Sulfato de Cobre', 'Cobertura', calc.totalCuKg, { s: 13 });
  add('acboro', 'Ácido Bórico', 'Cobertura', calc.totalBKg, { b: 17 });
  add('mnso4', 'Sulfato de Manganês', 'Cobertura', calc.totalMnKg, { s: 19 });

  return products;
}

// ─── Year 2 reference products builder ───────────────────────

function buildYear2ReferenceProducts(
  coffeeType: CoffeeType,
  totalPlants: number,
  hectares: number,
  pSolo: number,
  kSolo: number,
  nIntensity: NIntensity = 'alta_performance',
): Array<{
  id: string; insumoId: string; name: string; tipoProduto: string;
  dosePerHa: number; unit: string;
  macro_n: number; macro_p2o5: number; macro_k2o: number; macro_s: number;
  micro_b: number; micro_zn: number;
}> {
  const ha = hectares > 0 ? hectares : 1;
  const goalsForType = GOAL_YEAR_2[coffeeType === 'conilon' ? 'conilon' : 'arabica'];
  const baseGoals = goalsForType[nIntensity];
  const plantsPerHa = totalPlants / ha;

  // K₂O: hybrid (base target × soil multiplier)
  const k2oResult = getYear2K2O(kSolo);
  // P₂O₅: soil-responsive (5ª Aproximação)
  const p2o5Goal = getYear2P2O5(pSolo);
  const goals = { n: baseGoals.n, k2o: k2oResult.k2o, p2o5: p2o5Goal };

  // Total nutrient demand kg/ha
  const totalNKgHa = (goals.n * plantsPerHa) / 1000;
  const totalP2O5KgHa = (goals.p2o5 * plantsPerHa) / 1000;
  const totalK2OKgHa = (goals.k2o * plantsPerHa) / 1000;

  // Convert to product quantities
  const ureiaKgHa = totalNKgHa / 0.45;
  const mapKgHa = totalP2O5KgHa / 0.61;
  const kclKgHa = totalK2OKgHa / 0.60;
  const calcinitKgHa = (CALCINIT.gPlanta * plantsPerHa) / 1000; // uses reference: 40g/pl
  const mgso4KgHa = (META_MICROS.sulfato_mg * plantsPerHa) / 1000;
  const znso4KgHa = (META_MICROS.sulfato_zn * plantsPerHa) / 1000;
  const boricoKgHa = (META_MICROS.acido_borico * plantsPerHa) / 1000;
  const cuso4KgHa = (META_MICROS.sulfato_cu * plantsPerHa) / 1000;
  const mnso4KgHa = (META_MICROS.sulfato_mn * plantsPerHa) / 1000;

  const products: Array<{
    id: string; insumoId: string; name: string; tipoProduto: string;
    dosePerHa: number; unit: string;
    macro_n: number; macro_p2o5: number; macro_k2o: number; macro_s: number;
    micro_b: number; micro_zn: number;
  }> = [];

  const add = (id: string, name: string, tipo: string, dosePerHa: number, composition: Partial<{
    n: number; p2o5: number; k2o: number; s: number; b: number; zn: number;
  }>) => {
    if (dosePerHa <= 0) return;
    products.push({
      id: `ref-y2-${id}`, insumoId: `ref-y2-${id}`, name, tipoProduto: tipo,
      dosePerHa, unit: 'kg/ha',
      macro_n: composition.n ?? 0, macro_p2o5: composition.p2o5 ?? 0,
      macro_k2o: composition.k2o ?? 0, macro_s: composition.s ?? 0,
      micro_b: composition.b ?? 0, micro_zn: composition.zn ?? 0,
    });
  };

  const sulfatoAmoniaKgHa = (META_MICROS.sulfato_amonia * plantsPerHa) / 1000;
  // Discount N from ALL secondary sources before calculating Uréia
  const nFromSulfatoAmonia = sulfatoAmoniaKgHa * 0.22;
  const nFromCalcinit = calcinitKgHa * 0.155;
  const nFromMAP = mapKgHa * 0.12;
  const totalSecondaryN = nFromSulfatoAmonia + nFromCalcinit + nFromMAP;
  const adjustedUreiaKgHa = Math.max(0, (totalNKgHa - totalSecondaryN) / 0.45);

  // ── S demand and Gesso Agrícola calculation ──
  const sPerPlant = coffeeType === 'conilon' ? S_DEMAND_FORMATION.conilon : S_DEMAND_FORMATION.arabica;
  const totalSKgHa = (sPerPlant * plantsPerHa) / 1000;
  // S already supplied by sulfate sources
  const sFromSulfatoAmonia = sulfatoAmoniaKgHa * 0.24;
  const sFromMgSO4 = mgso4KgHa * 0.13;
  const sFromCuSO4 = cuso4KgHa * 0.13;
  const sFromMnSO4 = mnso4KgHa * 0.19;
  const sFromExisting = sFromSulfatoAmonia + sFromMgSO4 + sFromCuSO4 + sFromMnSO4;
  const sDeficit = Math.max(0, totalSKgHa - sFromExisting);
  // Gesso Agrícola (15% S) closes remaining S deficit
  const gessoKgHa = sDeficit > 0 ? sDeficit / GESSO_AGRICOLA.percS : 0;

  add('ureia', 'Uréia', 'Cobertura', adjustedUreiaKgHa, { n: 45 });
  add('kcl', 'Cloreto de Potássio (KCl)', 'Cobertura', kclKgHa, { k2o: 60 });
  add('calcinit', 'Calcinit (Nitrato de Cálcio)', 'Cobertura', calcinitKgHa, { n: 15.5 });
  add('map', 'MAP Purificado', 'Plantio', mapKgHa, { n: 12, p2o5: 61 });
  add('sulfamonia', 'Sulfato de Amônia', 'Cobertura', sulfatoAmoniaKgHa, { n: 22, s: 24 });
  add('gesso', 'Gesso Agrícola', 'Correção de Solo', gessoKgHa, { s: 15 });
  add('mgso4', 'Sulfato de Magnésio', 'Cobertura', mgso4KgHa, { s: 13 });
  // Sulfato de Zinco removido — Zn deve ser aplicado apenas via foliar (addMicronutrientFixedItems)
  add('cuso4', 'Sulfato de Cobre', 'Cobertura', cuso4KgHa, { s: 13 });
  add('acboro', 'Ácido Bórico', 'Cobertura', boricoKgHa, { b: 17 });
  add('mnso4', 'Sulfato de Manganês', 'Cobertura', mnso4KgHa, { s: 19 });

  return products;
}

// ─── Build hybrid plan ───────────────────────────────────────

export function buildHybridPlan(params: {
  coffeeType: CoffeeType;
  sacasPerHa: number;
  hectares: number;
  vPercent: number | null;
  plantingMonth: number;
  plantingYear: number;
  irrigated?: boolean;
  pSolo?: number;
  kSolo?: number;
  totalPlants?: number;
  firstYearConfig?: FirstYearConfig;
  nIntensity?: NIntensity;
  products: Array<{
    id: string;
    insumoId: string;
    name: string;
    tipoProduto: string;
    dosePerHa: number;
    unit: string;
    macro_n: number;
    macro_p2o5: number;
    macro_k2o: number;
    macro_s: number;
    micro_b: number;
    micro_zn: number;
  }>;
}): HybridPlan {
  const {
    coffeeType, sacasPerHa, hectares, vPercent, products,
    plantingMonth, plantingYear, irrigated, pSolo, kSolo, totalPlants,
    firstYearConfig, nIntensity = 'alta_performance',
  } = params;

  // ── Phase detection ──
  const monthsSincePlanting = calculateMonthsSincePlanting(plantingMonth, plantingYear);
  const phase = determinePhase(monthsSincePlanting);
  const isFirstYear = phase === 'ano1' || phase === 'plantio';

  // ── First-year calculation ──
  let firstYearCalc: CalcResult | undefined;
  if ((phase === 'plantio' || phase === 'ano1') && firstYearConfig) {
    firstYearCalc = calcularRecomendacao(
      firstYearConfig.culturaNome,
      firstYearConfig.totalPlants,
      firstYearConfig.pSolo,
      firstYearConfig.kSolo,
    );
  }

  // ── Demand calculation per phase ──
  let demandN = 0;
  let demandK = 0;
  let demandP = 0;
  let soilCorrP: number | undefined;
  let soilCorrK: number | undefined;
  let year2Goals: { n: number; p2o5: number; k2o: number } | undefined;
  let k2oReduction: { reductionPct: number; originalK2O: number; adjustedK2O: number } | undefined;
  const plantsPerHa = hectares > 0 && totalPlants ? totalPlants / hectares : 0;

  switch (phase) {
    case 'plantio':
    case 'ano1':
      // Demand from per-plant calculation (totalXxxKg is total for the field, normalize to kg/ha)
      if (firstYearCalc) {
        const ha = hectares > 0 ? hectares : 1;
        demandN = (firstYearCalc.totalUreiaKg * 0.45 + firstYearCalc.totalCalcinitKg * CALCINIT.percN + firstYearCalc.totalMapKg * 0.11 + firstYearCalc.totalSulfatoAmoniaKg * 0.22) / ha;
        demandK = (firstYearCalc.totalKclKg * 0.60) / ha;
        demandP = (firstYearCalc.totalMapKg * 0.61) / ha;
      } else if (plantsPerHa > 0) {
        const metaN = coffeeType === 'conilon' ? 60 : 40;
        demandN = (metaN * plantsPerHa) / 1000;
        demandK = 0;
      }
      break;

    case 'ano2': {
      const goalsForType = GOAL_YEAR_2[coffeeType === 'conilon' ? 'conilon' : 'arabica'];
      const baseGoals = goalsForType[nIntensity];
      // K₂O: hybrid (base target × soil multiplier)
      const k2oResult = getYear2K2O(kSolo);
      // P₂O₅: solo-responsivo (5ª Aproximação)
      const p2o5Goal = getYear2P2O5(pSolo);
      const goals = { n: baseGoals.n, k2o: k2oResult.k2o, p2o5: p2o5Goal };
      year2Goals = goals;
      if (k2oResult.multiplier < 1.0) {
        const originalK2O = 80; // K2O_TARGETS.year_2
        k2oReduction = { reductionPct: Math.round((1 - k2oResult.multiplier) * 100), originalK2O, adjustedK2O: k2oResult.k2o };
      }
      if (plantsPerHa > 0) {
        demandN = (goals.n * plantsPerHa) / 1000;
        demandP = (goals.p2o5 * plantsPerHa) / 1000;
        demandK = (goals.k2o * plantsPerHa) / 1000;
      }
      break;
    }

    case 'adulto': {
      const sf = calcStandFactor(plantsPerHa, coffeeType);
      demandN = calcAdultNDemand(sacasPerHa) * sf;
      demandP = getAdultP2O5(pSolo) * sf;
      demandK = calcAdultK2ODemand(sacasPerHa, kSolo) * sf;
      // soilCorrK kept for backward compat display
      if (kSolo !== undefined) {
        soilCorrK = getSoilCorrectionK(kSolo);
      }
      break;
    }
  }

  // ── Build effective products ──
  let effectiveProducts = products;

  // Helper: apply user-adjusted doses from fertigation/spraying onto reference products
  // Regra de segurança: ajuste do usuário NUNCA pode reduzir a base de referência.
  const applyUserDoseOverrides = (refProducts: typeof products) => {
    const normalizeForMatch = (name: string) =>
      name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();


    const canonicalName = (name: string) => {
      const n = normalizeForMatch(name)
        .replace(/\(.*?\)/g, ' ')
        .replace(/\bamonia\b/g, 'amonio')
        .replace(/\bnitrato de amonia\b/g, 'nitrato de amonio')
        .replace(/\bsulfato de amonia\b/g, 'sulfato de amonio')
        .replace(/\s+/g, ' ')
        .trim();
      return n;
    };

    const isSameProduct = (aName: string, aId: string, bName: string, bId: string) => {
      // 1) Match forte por ID real (evita colapsos entre produtos distintos)
      if (aId === bId && !aId.startsWith('ref-') && !bId.startsWith('ref-')) return true;

      // 2) Match por nome canônico EXATO (fuzzy amplo removido)
      const aCanonical = canonicalName(aName);
      const bCanonical = canonicalName(bName);
      if (aCanonical === bCanonical) return true;

      // 3) Guard-rail explícito: produtos MAP diferentes não podem ser tratados como iguais
      if (aCanonical.includes('map') && bCanonical.includes('map') && aCanonical !== bCanonical) {
        return false;
      }

      return false;
    };

    const matchedUserKeys = new Set<string>();

    const overridden = refProducts.map(rp => {
      const userMatches = products.filter(up =>
        up.dosePerHa > 0 && isSameProduct(rp.name, rp.insumoId, up.name, up.insumoId),
      );

      if (userMatches.length === 0) return rp;

      userMatches.forEach(up => {
        matchedUserKeys.add(`${up.insumoId}::${normalizeForMatch(up.name)}`);
      });

      const maxUserDose = Math.max(...userMatches.map(up => up.dosePerHa));

      return {
        ...rp,
        // Usar dose do usuário (fertirrigação step) como decisão final.
        // O auto-mix já aplica standFactor, então a dose informada é proporcional à população real.
        dosePerHa: maxUserDose,
      };
    });

    // Preserva produtos ajustados/adicionados que não existem no conjunto de referência
    // (importante para balanço nutricional refletir o botão Máx da etapa anterior).
    const extras = products.filter(up => {
      if (up.dosePerHa <= 0) return false;
      if (up.tipoProduto === 'Correção de Solo') return false;

      const key = `${up.insumoId}::${normalizeForMatch(up.name)}`;
      if (matchedUserKeys.has(key)) return false;

      const alreadyInOverridden = overridden.some(rp =>
        isSameProduct(rp.name, rp.insumoId, up.name, up.insumoId),
      );

      return !alreadyInOverridden;
    });

    return [...overridden, ...extras];
  };

  if (phase === 'plantio' || phase === 'ano1') {
    // Year 1: use reference products only (prohibit NPK formulado)
    if (firstYearCalc) {
      effectiveProducts = applyUserDoseOverrides(
        buildFirstYearReferenceProducts(firstYearCalc, hectares, coffeeType),
      );
    } else {
      // Filter user products to only allowed ones
      effectiveProducts = products.filter(p => isYear1AllowedProduct(p.name) && !isNPKFormulado(p.name));
    }
    // Always append Correção de Solo products (calcário) from user input
    const correcaoProducts = products.filter(p => p.tipoProduto === 'Correção de Solo' && !effectiveProducts.some(ep => ep.id === p.id));
    effectiveProducts = [...effectiveProducts, ...correcaoProducts];
    // Preserve user-added fertigation/foliar products (Cobertura, Foliar, Adjuvantes)
    const userFertiProducts1 = products.filter(p =>
      ['Cobertura', 'Foliar', 'Adjuvantes'].includes(p.tipoProduto) &&
      !effectiveProducts.some(ep => ep.id === p.id) && p.dosePerHa > 0
    );
    effectiveProducts = [...effectiveProducts, ...userFertiProducts1];
  } else if (phase === 'ano2') {
    // Year 2: use reference products, then apply user dose overrides
    if (totalPlants && totalPlants > 0) {
      effectiveProducts = applyUserDoseOverrides(
        buildYear2ReferenceProducts(
          coffeeType, totalPlants, hectares, pSolo ?? 0, kSolo ?? 0, nIntensity,
        ),
      );
    }
    // Always append Correção de Solo products (calcário) from user input
    const correcaoProducts = products.filter(p => p.tipoProduto === 'Correção de Solo' && !effectiveProducts.some(ep => ep.id === p.id));
    effectiveProducts = [...effectiveProducts, ...correcaoProducts];
    // Also preserve user-selected NPK granulado products (e.g. NPK 20-00-20) for broadcast application
    const userNPKProducts = products.filter(p =>
      isNPKGranularFormulado(p.name) && !effectiveProducts.some(ep => ep.name === p.name),
    );
    effectiveProducts = [...effectiveProducts, ...userNPKProducts];
    // Preserve user-added fertigation/foliar products (Cobertura, Foliar, Adjuvantes)
    const userFertiProducts2 = products.filter(p =>
      ['Cobertura', 'Foliar', 'Adjuvantes'].includes(p.tipoProduto) &&
      !effectiveProducts.some(ep => ep.id === p.id) && p.dosePerHa > 0
    );
    effectiveProducts = [...effectiveProducts, ...userFertiProducts2];
  }
  // Adult: use user-provided products as-is

  // ── Classify products by method ──
  const classified: HybridPlanProduct[] = effectiveProducts.map(p => ({
    ...p,
    method: classifyApplicationMethod(p.tipoProduto, p.name, coffeeType),
    annualDosePerHa: p.dosePerHa,
  }));

  const productsByMethod: Record<ApplicationMethodType, HybridPlanProduct[]> = {
    solo_lanco: [], fertirrigacao: [], jato_trator: [], foliar: [],
  };
  classified.forEach(p => productsByMethod[p.method].push(p));

  // ── Build monthly plans ──
  let months: MonthlyPlan[] = [];

  if (phase === 'plantio') {
    // Module A: No monthly schedule for planting
    months = [];
  } else if (phase === 'ano1') {
    // Module B: Relative months starting from plantingMonth + 1
    months = buildYear1Months(classified, firstYearCalc, coffeeType, plantingMonth, plantingYear, hectares, firstYearConfig);
  } else if (phase === 'ano2') {
    // Module C: Seasonal or irrigated distribution
    months = buildYear2Months(classified, coffeeType, plantingMonth, plantingYear, irrigated ?? false);
  } else {
    // Module D: Adult production phenology
    months = buildAdultMonths(classified, coffeeType);
  }

  // V% alert
  const vTarget = phase === 'plantio' || phase === 'ano1' || phase === 'ano2' ? 70 : 60;
  const vPercentAlert = vPercent != null
    ? { current: vPercent, target: vTarget, needsCorrection: vPercent < vTarget }
    : null;

  // ── Compute g/planta for each monthly action ──
  const plantsTotal = totalPlants ?? 0;
  if (plantsTotal > 0) {
    for (const mp of months) {
      for (const action of mp.actions) {
        // kg/ha → g/planta: (kgHa * 1000) / plantsPerHa
        const pPerHa = plantsTotal / (hectares > 0 ? hectares : 1);
        action.doseGramsPerPlant = pPerHa > 0
          ? Math.round((action.doseMonthKgHa * 1000 / pPerHa) * 100) / 100
          : undefined;
      }
    }
  }

  return {
    coffeeType,
    sacasPerHa,
    hectares,
    demandN,
    demandK,
    demandP,
    months,
    productsByMethod,
    vPercentAlert,
    phase,
    monthsSincePlanting,
    plantingMonth,
    plantingYear,
    isFirstYear,
    firstYearCalc,
    year2Goals,
    soilCorrectionP: soilCorrP,
    soilCorrectionK: soilCorrK,
    irrigated,
    nIntensity,
    k2oReduction,
    totalPlants: plantsTotal > 0 ? plantsTotal : undefined,
  };
}

// ─── Module B: Year 1 Monthly Schedule ───────────────────────

function buildYear1Months(
  classified: HybridPlanProduct[],
  firstYearCalc: CalcResult | undefined,
  coffeeType: CoffeeType,
  plantingMonth: number,
  plantingYear: number,
  hectares: number,
  firstYearConfig?: FirstYearConfig,
): MonthlyPlan[] {
  if (!firstYearCalc || !firstYearConfig) return [];

  const culturaNome = firstYearConfig.culturaNome;
  const parcelRows = MATRIZ_PARCELAMENTO.filter(m => m.cultura === culturaNome);

  // Map parcelamento rows to relative months (Mês 1, Mês 2, ...)
  return parcelRows.map((parcelRow, idx) => {
    const relativeMonth = idx + 1;
    const calMonth = getCalendarMonth(relativeMonth, plantingMonth);
    const label = formatRelativeMonthLabel(relativeMonth, plantingMonth, plantingYear);
    const realMonthName = MONTH_NAMES[(calMonth - 1) % 12];

    const actions: MonthlyAction[] = [];

    for (const product of classified) {
      // Solo_lanco products (calcário, FTE, MAP) use month-based rules, not parcel matrix
      if (product.method === 'solo_lanco') {
        const lancoRule = getLancoMonthWeight(product.tipoProduto, product.name, calMonth);
        if (!lancoRule) continue;
        const doseMonth = product.annualDosePerHa * lancoRule.weight;
        if (doseMonth > 0.001) {
          actions.push({
            product,
            doseMonthKgHa: Math.round(doseMonth * 100) / 100,
            doseWeeklyKgHa: 0,
            instruction: lancoRule.instruction,
            reason: product.tipoProduto === 'Correção de Solo'
              ? 'Correção de pH e fornecimento de Ca/Mg. Aplicar antes do período chuvoso.'
              : 'Adubação sólida a lanço – 1º ano.',
          });
        }
        continue;
      }

      const fyKey = getFirstYearProductKey(product);
      // Fallback: produtos manuais sem classificação reconhecida → distribuição uniforme
      if (!fyKey) {
        if (product.method === 'fertirrigacao' || product.method === 'jato_trator' || product.method === 'foliar') {
          const doseMonth = product.annualDosePerHa / 12;
          if (doseMonth > 0.001) {
            const methodLabel = product.method === 'foliar' ? 'Pulverizar com adjuvante.' : product.method === 'fertirrigacao' ? 'Fertirrigação mensal.' : 'Jato com trator.';
            actions.push({
              product,
              doseMonthKgHa: Math.round(doseMonth * 100) / 100,
              doseWeeklyKgHa: product.method === 'foliar' ? 0 : Math.round((doseMonth / 4) * 100) / 100,
              instruction: `${methodLabel} Distribuição uniforme — produto manual.`,
              reason: 'Produto adicionado manualmente — distribuição uniforme ao longo do ano.',
            });
          }
        }
        continue;
      }

      let monthPct = 0;
      if (fyKey === 'ureia') monthPct = parcelRow.perc_ureia;
      else if (fyKey === 'kcl') monthPct = parcelRow.perc_kcl;
      else if (fyKey === 'calcinit') monthPct = parcelRow.perc_calcinit;
      else if (fyKey === 'micro') monthPct = parcelRow.perc_micro;

      if (monthPct <= 0) continue;

      const annualKg = getFirstYearAnnualKg(fyKey, product, firstYearCalc);
      const ha = hectares > 0 ? hectares : 1;
      const annualKgPerHa = annualKg / ha;
      const doseMonth = annualKgPerHa * monthPct;

      if (doseMonth > 0.001) {
        const methodLabel = product.method === 'fertirrigacao' ? 'Fertirrigação mensal.' : 'Jato com trator.';
        actions.push({
          product,
          doseMonthKgHa: Math.round(doseMonth * 100) / 100,
          doseWeeklyKgHa: Math.round((doseMonth / 4) * 100) / 100,
          instruction: `${methodLabel} Dose 1º ano – parcelamento progressivo.`,
          reason: getFirstYearReason(fyKey, product, firstYearCalc),
        });
      }
    }

    // Add micronutrients as fixed items for critical months
    addMicronutrientFixedItems(actions, calMonth, classified);

    // Sort: Lanço first, then Fertirrigação/Jato, then Foliar
    const methodOrder: ApplicationMethodType[] = ['solo_lanco', 'fertirrigacao', 'jato_trator', 'foliar'];
    actions.sort((a, b) => methodOrder.indexOf(a.product.method) - methodOrder.indexOf(b.product.method));

    return {
      month: realMonthName,
      monthIndex: calMonth - 1,
      stage: `Mês ${relativeMonth} — Formação`,
      actions,
      relativeLabel: label,
      calendarMonth: calMonth,
      weightPct: parcelRow.perc_ureia, // Representative weight (macro curve)
    };
  });
}

// ─── Module C: Year 2 Monthly Schedule ───────────────────────

function buildYear2Months(
  classified: HybridPlanProduct[],
  coffeeType: CoffeeType,
  plantingMonth: number,
  plantingYear: number,
  irrigated: boolean,
): MonthlyPlan[] {
  // Detect NPK granulado a lanço → reduzir macros em jato/foliar
  const hasNPKLanco = classified.some(p =>
    p.method === 'solo_lanco' && isNPKGranularFormulado(p.name),
  );
  const foliarMacroReduction = hasNPKLanco ? 0.30 : 1.0;
  // Generate 12 months starting from the beginning of year 2 (month 13 after planting)
  return Array.from({ length: 12 }, (_, idx) => {
    const relativeMonth = idx + 1; // within year 2
    const absoluteMonth = 12 + relativeMonth; // since planting
    const calMonth = getCalendarMonth(absoluteMonth, plantingMonth);
    const realMonthName = MONTH_NAMES[(calMonth - 1) % 12];
    const label = formatRelativeMonthLabel(absoluteMonth, plantingMonth, plantingYear);

    // Get weight based on distribution mode
    // Even irrigated crops follow phenological demand — irrigation just enables
    // year-round application, but nutrient demand still varies by stage.
    // For irrigated: blend 60% phenological + 40% uniform to smooth the curve
    // while respecting peak demand periods.
    let weight: number;
    let stage: string;

    const seasonal = getYear2MonthWeight(calMonth);
    stage = seasonal.stage;

    if (irrigated) {
      // Irrigated: blend phenological (60%) + uniform (40%) for smoother curve
      const uniformWeight = 1 / 12;
      weight = seasonal.weight > 0
        ? seasonal.weight * 0.6 + uniformWeight * 0.4
        : uniformWeight * 0.4; // Rest months still get a small dose
      stage = `${seasonal.stage} (irrigado)`;
    } else {
      weight = seasonal.weight;
    }

    const actions: MonthlyAction[] = [];

    for (const product of classified) {
      if (product.method === 'solo_lanco') {
        const lancoRule = getLancoMonthWeight(product.tipoProduto, product.name, calMonth);
        if (!lancoRule) continue;
        const doseMonth = product.annualDosePerHa * lancoRule.weight;
        if (doseMonth > 0.001) {
          actions.push({
            product,
            doseMonthKgHa: Math.round(doseMonth * 100) / 100,
            doseWeeklyKgHa: 0,
            instruction: lancoRule.instruction,
            reason: 'Adubação sólida – 2º ano.',
          });
        }
    } else if (product.method === 'fertirrigacao' || product.method === 'jato_trator') {
        // Micronutrientes puros usam distribuição uniforme (evita threshold em meses de baixo peso)
        const isMicroOnly = product.macro_n === 0 && product.macro_p2o5 === 0 && product.macro_k2o === 0;
        let doseMonth = isMicroOnly
          ? product.annualDosePerHa / 12
          : product.annualDosePerHa * weight;
        // Reduzir macros via jato/fertirrigação quando NPK a lanço cobre via solo
        if (hasNPKLanco && !isMicroOnly && (product.macro_n > 0 || product.macro_k2o > 0 || product.macro_p2o5 > 0)) {
          doseMonth *= foliarMacroReduction;
        }
        if (doseMonth > 0.001) {
          const methodLabel = product.method === 'fertirrigacao'
            ? 'Injetar via venturi/bomba dosadora.'
            : 'Aplicar com pulverizador tratorizado.';
          let instr = `${methodLabel} Fase: ${stage}.`;
          if (hasNPKLanco && (product.macro_n > 0 || product.macro_k2o > 0)) {
            instr += ' ⚡ Dose reduzida — NPK a lanço complementa via solo.';
          }
          actions.push({
            product,
            doseMonthKgHa: Math.round(doseMonth * 100) / 100,
            doseWeeklyKgHa: Math.round((doseMonth / 4) * 100) / 100,
            instruction: instr,
            reason: irrigated
              ? 'Distribuição fenológica ponderada (60% sazonal + 40% uniforme) — irrigado.'
              : getYear2Reason(stage),
          });
        }
      } else if (product.method === 'foliar') {
        let doseMonth = product.annualDosePerHa / 12;
        const isMicroOnly = product.macro_n === 0 && product.macro_p2o5 === 0 && product.macro_k2o === 0;
        if (hasNPKLanco && !isMicroOnly) {
          doseMonth *= foliarMacroReduction;
        }
        if (doseMonth > 0.001) {
          let instr = 'Pulverizar com adjuvante.';
          if (hasNPKLanco && !isMicroOnly) {
            instr += ' ⚡ Dose reduzida — macros cobertos via NPK a lanço.';
          }
          actions.push({
            product,
            doseMonthKgHa: Math.round(doseMonth * 100) / 100,
            doseWeeklyKgHa: 0,
            instruction: instr,
            reason: isMicroOnly ? 'Suplementação de micronutrientes foliar – 2º ano.' : 'Suplementação foliar mensal – 2º ano.',
          });
        }
      }
    }

    // Add micronutrients as fixed items
    addMicronutrientFixedItems(actions, calMonth, classified);

    const methodOrder: ApplicationMethodType[] = ['solo_lanco', 'fertirrigacao', 'jato_trator', 'foliar'];
    actions.sort((a, b) => methodOrder.indexOf(a.product.method) - methodOrder.indexOf(b.product.method));

    return {
      month: realMonthName,
      monthIndex: calMonth - 1,
      stage,
      actions,
      relativeLabel: label,
      calendarMonth: calMonth,
      weightPct: weight,
    };
  });
}

function getYear2Reason(stage: string): string {
  switch (stage) {
    case 'Pré-florada': return 'Preparação para florada. Foco em N e P.';
    case 'Chumbinho': return 'Fase crítica de fixação dos frutos. Alta demanda de N.';
    case 'Granação': return 'Pico de demanda para enchimento de grãos. Foco em K.';
    case 'Maturação': return 'Dose reduzida. Manutenção residual.';
    default: return 'Repouso vegetativo. Dose mínima.';
  }
}

// ─── Module D: Adult Monthly Schedule ────────────────────────

function buildAdultMonths(
  classified: HybridPlanProduct[],
  coffeeType: CoffeeType,
): MonthlyPlan[] {
  // Detect if NPK granulado a lanço is present — if so, reduce foliar macro doses
  const hasNPKLanco = classified.some(p =>
    p.method === 'solo_lanco' && isNPKGranularFormulado(p.name),
  );
  // When NPK a lanço covers macros via solo, reduce foliar macro demand to 30%
  // (micronutrientes foliares mantidos a 100%)
  const foliarMacroReduction = hasNPKLanco ? 0.30 : 1.0;

  return MONTH_NAMES.map((name, i) => {
    const monthNum = i + 1;
    const { weight: fertiWeight, stage } = getProductionMonthlyWeight(monthNum);
    const actions: MonthlyAction[] = [];

    for (const product of classified) {
      let doseMonth = 0;
      let instruction = '';
      let reason = '';

      if (product.method === 'solo_lanco') {
        const lancoRule = getLancoMonthWeight(product.tipoProduto, product.name, monthNum);
        if (!lancoRule) continue;
        doseMonth = product.annualDosePerHa * lancoRule.weight;
        instruction = lancoRule.instruction;
        if (product.tipoProduto === 'Correção de Solo') {
          reason = 'Correção de pH e fornecimento de Ca/Mg estrutural.';
        } else if (isNPKGranularFormulado(product.name)) {
          const phaseInfo = NPK_LANCO_PHENOLOGICAL.find(p => p.months.includes(monthNum));
          reason = phaseInfo
            ? `NPK a lanço — ${phaseInfo.stage}. Fornece N+P+K via solo, reduzindo demanda foliar de macros.`
            : 'NPK granulado a lanço — dose de manutenção.';
        } else if (product.name.toLowerCase().includes('map')) {
          reason = 'Fonte de fósforo base. Baixa solubilidade, necessita incorporação.';
        } else if (product.name.toLowerCase().includes('fte')) {
          reason = 'Micronutrientes sólidos de liberação gradual.';
        } else {
          reason = 'Adubação sólida na projeção da saia.';
        }
    } else if (product.method === 'fertirrigacao' || product.method === 'jato_trator') {
        // Micronutrientes puros (sem N-P-K) usam distribuição uniforme para evitar
        // que doses pequenas caiam abaixo do threshold de 0.01 em meses de baixo peso fenológico
        const isMicroOnly = product.macro_n === 0 && product.macro_p2o5 === 0 && product.macro_k2o === 0;
        doseMonth = isMicroOnly
          ? product.annualDosePerHa / 12
          : product.annualDosePerHa * fertiWeight;
        // Se NPK a lanço já fornece macros via solo, reduzir dose de jato/fertirrrigação de macros
        if (hasNPKLanco && !isMicroOnly && (product.macro_n > 0 || product.macro_k2o > 0 || product.macro_p2o5 > 0)) {
          doseMonth *= foliarMacroReduction;
        }
        const methodLabel = product.method === 'fertirrigacao'
          ? 'Injetar via venturi/bomba dosadora.'
          : 'Aplicar com pulverizador tratorizado (400L).';
        instruction = `${methodLabel} Dividir em 4 aplicações semanais.`;
        if (hasNPKLanco && (product.macro_n > 0 || product.macro_k2o > 0)) {
          instruction += ' ⚡ Dose reduzida — NPK a lanço complementa via solo.';
        }
        if (stage.includes('Expansão')) {
          reason = 'Alta demanda de N para crescimento de ramos e frutos.';
        } else if (stage.includes('Enchimento')) {
          reason = 'Pico de demanda de K para peso e qualidade do grão.';
        } else if (stage.includes('Maturação')) {
          reason = 'Dose reduzida. Foco em K residual, reduzir N.';
        } else {
          reason = 'Recuperação pós-colheita e preparo para florada.';
        }
      } else if (product.method === 'foliar') {
        const isBoron = product.name.toLowerCase().includes('bórico')
          || product.name.toLowerCase().includes('boro')
          || product.name.toLowerCase().includes('ácido bórico');
        const isMicroOnly = product.macro_n === 0 && product.macro_p2o5 === 0 && product.macro_k2o === 0;

        if (isBoron) {
          const keyMonths = [8, 9, 2, 3, 4];
          const isKey = keyMonths.includes(monthNum);
          const keyWeight = 0.60 / keyMonths.length;
          const normalWeight = 0.40 / (12 - keyMonths.length);
          doseMonth = product.annualDosePerHa * (isKey ? keyWeight : normalWeight);
          instruction = isKey ? '⚠️ Fase CRÍTICA para Boro. Pulverizar com adjuvante.' : 'Pulverizar com adjuvante.';
          reason = isKey ? 'Boro é crucial na pré-florada e enchimento de grãos.' : 'Manutenção de Boro foliar.';
        } else {
          doseMonth = product.annualDosePerHa / 12;
          // Reduzir foliar de macros quando NPK a lanço cobre via solo
          if (hasNPKLanco && !isMicroOnly) {
            doseMonth *= foliarMacroReduction;
          }
          instruction = 'Pulverizar com adjuvante. Não misturar com fertirrigação.';
          if (hasNPKLanco && !isMicroOnly) {
            instruction += ' ⚡ Dose reduzida — macros cobertos via NPK a lanço.';
          }
          reason = isMicroOnly ? 'Suplementação de micronutrientes foliar.' : 'Suplementação foliar mensal.';
        }
      }

      if (doseMonth > 0.001) {
        const doseWeekly = (product.method === 'fertirrigacao' || product.method === 'jato_trator')
          ? doseMonth / 4 : 0;
        actions.push({
          product,
          doseMonthKgHa: Math.round(doseMonth * 100) / 100,
          doseWeeklyKgHa: Math.round(doseWeekly * 100) / 100,
          instruction,
          reason,
        });
      }
    }

    // Add micronutrients as fixed items
    addMicronutrientFixedItems(actions, monthNum, classified);

    const methodOrder: ApplicationMethodType[] = ['solo_lanco', 'fertirrigacao', 'jato_trator', 'foliar'];
    actions.sort((a, b) => methodOrder.indexOf(a.product.method) - methodOrder.indexOf(b.product.method));

    // Attach operação casada for Arábica adult months
    const operacaoCasada = getOperacaoCasadaByMonth(monthNum);

    return { month: name, monthIndex: i, stage, actions, calendarMonth: monthNum, weightPct: fertiWeight, operacaoCasada };
  });
}

// ─── Micronutrient Fixed Items ───────────────────────────────

function addMicronutrientFixedItems(
  actions: MonthlyAction[],
  calendarMonth: number,
  classified: HybridPlanProduct[],
) {
  // Only add if Zn/B/Cu are not already present in the actions
  const hasZn = actions.some(a => a.product.name.toLowerCase().includes('zinco'));
  const hasB = actions.some(a =>
    a.product.name.toLowerCase().includes('bórico') ||
    a.product.name.toLowerCase().includes('boro'),
  );
  const hasCu = actions.some(a => a.product.name.toLowerCase().includes('cobre'));

  // Zn and B in critical months (Ago-Nov: pré-florada + expansion)
  if (!hasZn && MICRO_ZN_B_MONTHS.includes(calendarMonth)) {
    actions.push({
      product: {
        id: 'micro-zn-fixed', insumoId: 'micro-zn-fixed',
        name: 'Sulfato de Zinco (Foliar)', tipoProduto: 'Foliar',
        method: 'foliar', annualDosePerHa: 0, unit: 'kg/ha',
        macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 11,
        micro_b: 0, micro_zn: 20,
      },
      doseMonthKgHa: 0.5,
      doseWeeklyKgHa: 0,
      instruction: 'Pulverizar com adjuvante. Concentração 0,5% na calda.',
      reason: `Zinco foliar – fase crítica (${MICRO_ZN_B_MONTHS.includes(calendarMonth) ? 'pré-florada/expansão' : ''}).`,
    });
  }

  if (!hasB && MICRO_ZN_B_MONTHS.includes(calendarMonth)) {
    actions.push({
      product: {
        id: 'micro-b-fixed', insumoId: 'micro-b-fixed',
        name: 'Ácido Bórico (Foliar)', tipoProduto: 'Foliar',
        method: 'foliar', annualDosePerHa: 0, unit: 'kg/ha',
        macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 0,
        micro_b: 17, micro_zn: 0,
      },
      doseMonthKgHa: 0.3,
      doseWeeklyKgHa: 0,
      instruction: '⚠️ Boro CRÍTICO na pré-florada. Concentração 0,3% na calda.',
      reason: 'Boro é essencial para pegamento da florada e formação do grão.',
    });
  }

  // Cu quarterly
  if (!hasCu && MICRO_CU_MONTHS.includes(calendarMonth)) {
    actions.push({
      product: {
        id: 'micro-cu-fixed', insumoId: 'micro-cu-fixed',
        name: 'Sulfato de Cobre (Foliar)', tipoProduto: 'Foliar',
        method: 'foliar', annualDosePerHa: 0, unit: 'kg/ha',
        macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 13,
        micro_b: 0, micro_zn: 0,
      },
      doseMonthKgHa: 0.25,
      doseWeeklyKgHa: 0,
      instruction: 'Pulverizar com adjuvante. Aplicação trimestral.',
      reason: 'Cobre foliar trimestral – prevenção e nutrição.',
    });
  }
}

// ─── Helper functions ────────────────────────────────────────

function getFirstYearProductKey(product: HybridPlanProduct): 'ureia' | 'kcl' | 'calcinit' | 'micro' | null {
  const name = product.name.toLowerCase();
  if (name.includes('uréia') || name.includes('ureia') || name.includes('urea')) return 'ureia';
  if (name.includes('cloreto de potássio') || name.includes('cloreto de potassio') || name.includes('kcl')) return 'kcl';
  if (name.includes('calcinit') || name.includes('nitrato de cálcio') || name.includes('nitrato de calcio')) return 'calcinit';
  if (name.includes('sulfato de amônia') || name.includes('sulfato de amonia')) return 'micro';
  if (name.includes('sulfato de magnésio') || name.includes('sulfato de magnesio') ||
      name.includes('sulfato de zinco') || name.includes('ácido bórico') || name.includes('acido borico') ||
      name.includes('sulfato de cobre') || name.includes('sulfato de manganês') || name.includes('sulfato de manganes')) {
    return 'micro';
  }
  return null;
}

function getFirstYearAnnualKg(key: 'ureia' | 'kcl' | 'calcinit' | 'micro', product: HybridPlanProduct, calc: CalcResult): number {
  switch (key) {
    case 'ureia': return calc.totalUreiaKg;
    case 'kcl': return calc.totalKclKg;
    case 'calcinit': return calc.totalCalcinitKg;
    case 'micro': {
      const name = product.name.toLowerCase();
      if (name.includes('sulfato de amônia') || name.includes('sulfato de amonia')) return calc.totalSulfatoAmoniaKg;
      if (name.includes('magnésio') || name.includes('magnesio')) return calc.totalMgKg;
      if (name.includes('zinco')) return calc.totalZnKg;
      if (name.includes('bórico') || name.includes('borico') || name.includes('boro')) return calc.totalBKg;
      if (name.includes('cobre')) return calc.totalCuKg;
      if (name.includes('manganês') || name.includes('manganes')) return calc.totalMnKg;
      return 0;
    }
  }
}

function getFirstYearReason(key: string, product: HybridPlanProduct, calc: CalcResult): string {
  switch (key) {
    case 'ureia': return `Fonte de N (${calc.gUreiaPlanta.toFixed(1)}g/planta/ano).`;
    case 'kcl': return `Fonte de K₂O (${calc.gKclPlanta.toFixed(1)}g/planta/ano).`;
    case 'calcinit': return `N + Ca complementar (${CALCINIT.gPlanta}g/planta/ano).`;
    default: return 'Micronutriente – fase de estabelecimento.';
  }
}

/** Get label for application method considering coffee type */
export function getMethodLabel(method: ApplicationMethodType, coffeeType: CoffeeType): string {
  if (method === 'fertirrigacao' && coffeeType === 'arabica') {
    return 'Jato com Trator';
  }
  return APPLICATION_METHOD_INFO[method].label;
}
