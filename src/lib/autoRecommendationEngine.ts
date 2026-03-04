// ─── Auto-Recommendation Engine for Coffee Fertigation ──────
// Calculates nutrient demand from productivity + leaf analysis,
// then selects the best products from the DB catalog, computing
// OPTIMAL DOSES to close all deficits without exceeding toxicity.

import type { LeafAnalysisData } from '@/contexts/CoffeeContext';
import { getStageForMonth } from '@/data/coffeePhenology';

// ─── Nutrient targets (g/ha) ─────────────────────────────────
interface NutrientTarget {
  key: string;
  dbField: string;
  isMacro: boolean;
  refMin: number;
  refMax: number;
  toxicityLimit: number; // g/ha — maximum safe limit
  leafKey: string;
  leafAdequateMin: number;
  leafAdequateMax: number;
}

const NUTRIENT_TARGETS: NutrientTarget[] = [
  { key: 'n',  dbField: 'macro_n',    isMacro: true,  refMin: 350000, refMax: 500000, toxicityLimit: 600000, leafKey: 'n',  leafAdequateMin: 3.0,  leafAdequateMax: 3.5 },
  { key: 'p',  dbField: 'macro_p2o5', isMacro: true,  refMin: 40000,  refMax: 100000, toxicityLimit: 150000, leafKey: 'p',  leafAdequateMin: 0.12, leafAdequateMax: 0.15 },
  { key: 'k',  dbField: 'macro_k2o',  isMacro: true,  refMin: 300000, refMax: 450000, toxicityLimit: 550000, leafKey: 'k',  leafAdequateMin: 2.0,  leafAdequateMax: 2.5 },
  { key: 's',  dbField: 'macro_s',    isMacro: true,  refMin: 20000,  refMax: 40000,  toxicityLimit: 60000,  leafKey: 's',  leafAdequateMin: 0.15, leafAdequateMax: 0.20 },
  { key: 'b',  dbField: 'micro_b',    isMacro: false, refMin: 500,    refMax: 1500,   toxicityLimit: 2000,   leafKey: 'b',  leafAdequateMin: 40,   leafAdequateMax: 80 },
  { key: 'zn', dbField: 'micro_zn',   isMacro: false, refMin: 300,    refMax: 1000,   toxicityLimit: 1500,   leafKey: 'zn', leafAdequateMin: 10,   leafAdequateMax: 20 },
  { key: 'cu', dbField: 'micro_cu',   isMacro: false, refMin: 200,    refMax: 800,    toxicityLimit: 1200,   leafKey: 'cu', leafAdequateMin: 10,   leafAdequateMax: 20 },
  { key: 'mn', dbField: 'micro_mn',   isMacro: false, refMin: 300,    refMax: 1500,   toxicityLimit: 2500,   leafKey: 'mn', leafAdequateMin: 50,   leafAdequateMax: 150 },
  { key: 'fe', dbField: 'micro_fe',   isMacro: false, refMin: 500,    refMax: 2000,   toxicityLimit: 3000,   leafKey: 'fe', leafAdequateMin: 50,   leafAdequateMax: 200 },
  { key: 'mo', dbField: 'micro_mo',   isMacro: false, refMin: 5,      refMax: 50,     toxicityLimit: 100,    leafKey: 'mo', leafAdequateMin: 0.1,  leafAdequateMax: 1.0 },
];

export interface ProductCandidate {
  id: string;
  nome: string;
  tipo_produto: string;
  preco: number;
  tamanho_unidade: number;
  medida: string;
  recomendacao_dose_ha: number;
  recomendacao_dose_unidade: string;
  macro_n: number;
  macro_p2o5: number;
  macro_k2o: number;
  macro_s: number;
  micro_b: number;
  micro_zn: number;
  micro_cu: number;
  micro_mn: number;
  micro_fe: number;
  micro_mo: number;
  isPreset?: boolean;
}

// ─── First Year Override ─────────────────────────────────────
export interface FirstYearOverride {
  nGPerHa: number;      // Total N demand in g/ha for 1st year
  k2oGPerHa: number;    // Total K2O demand in g/ha for 1st year
  microScale: number;   // Scale factor (0-1) for micronutrient targets
}

export interface RecommendedProduct {
  product: ProductCandidate;
  dose: number;
  unit: string;
  reason: string;
  nutrientsCovered: string[];
}

// ─── Compatibility groups ────────────────────────────────────
function getCompatGroup(product: ProductCandidate): 'A' | 'B' | 'C' | 'D' | 'E' {
  const name = product.nome.toLowerCase();
  if (name.includes('nitrato de cálcio') || name.includes('cloreto de cálcio')) return 'A';
  if (name.includes('sulfato') || name.includes('fosfórico') || name.includes('map ') || name.includes('ácido bórico') || name.includes('micros sais')) return 'B';
  if (name.includes('hipoclorito') || name.includes('cloro')) return 'E';
  if (['Inseticida', 'Fungicida'].includes(product.tipo_produto)) return 'D';
  return 'C';
}

// ─── Calculate nutrient demand (g/ha) ────────────────────────
function calculateDemand(
  sacasPerHa: number,
  leafAnalysis: LeafAnalysisData | null,
  month?: number,
  firstYearOverride?: FirstYearOverride,
  standFactor?: number,
): Record<string, number> {
  const demand: Record<string, number> = {};
  const stage = month != null ? getStageForMonth(month) : null;

  for (const nt of NUTRIENT_TARGETS) {
    let adequateMin = nt.leafAdequateMin;
    let adequateMax = nt.leafAdequateMax;
    if (stage) {
      const stageTarget = stage.targets[nt.key];
      if (stageTarget) {
        adequateMin = stageTarget.min;
        adequateMax = stageTarget.max;
      }
    }

    let targetGrams = (nt.refMin + nt.refMax) / 2;

    // 1st year planting override: use planting-level demands
    if (firstYearOverride) {
      if (nt.key === 'n') targetGrams = firstYearOverride.nGPerHa;
      else if (nt.key === 'k') targetGrams = firstYearOverride.k2oGPerHa;
      else if (!nt.isMacro) targetGrams = ((nt.refMin + nt.refMax) / 2) * firstYearOverride.microScale;
      // P and S keep default ranges for 1st year
    } else {
      if (nt.key === 'n' && sacasPerHa > 0) targetGrams = sacasPerHa * 3.5 * 1000;
      if (nt.key === 'k' && sacasPerHa > 0) targetGrams = sacasPerHa * 4.5 * 1000;
    }

    const leafEntry = leafAnalysis?.[nt.leafKey];
    if (leafEntry && leafEntry.value != null) {
      const currentVal = leafEntry.value;
      if (currentVal >= adequateMin) {
        // Adequate or excess → no demand
        targetGrams = 0;
      } else {
        // Deficit: boost proportionally
        const meta = (adequateMin + adequateMax) / 2;
        const deficitRatio = Math.min((meta - currentVal) / meta, 1);
        targetGrams *= 1 + (deficitRatio * 0.5);
      }
    } else if (leafEntry) {
      if (leafEntry.status === 'deficient') targetGrams *= 1.3;
      else if (leafEntry.status === 'adequate') targetGrams = 0;
      else if (leafEntry.status === 'threshold' || leafEntry.status === 'limiar') targetGrams *= 0.6;
    }

    // Apply stand factor to adjust demand for actual plant population
    if (standFactor !== undefined && standFactor > 0 && standFactor < 1) {
      demand[nt.key] = targetGrams * standFactor;
    } else {
      demand[nt.key] = targetGrams;
    }
  }

  return demand;
}

// ─── Normalize dose to kg/ha ─────────────────────────────────
function doseToKg(dose: number, unit: string): number {
  if (unit === 'g/ha' || unit === 'mL/ha') return dose / 1000;
  return dose;
}

// ─── Get product concentration for a nutrient (fraction 0-1) ─
function getConcentration(product: ProductCandidate, nt: NutrientTarget): number {
  return (Number((product as any)[nt.dbField]) || 0) / 100;
}

// ─── Compute the optimal dose (kg/ha) to fill the most-needed
//     nutrient deficit without exceeding toxicity on any nutrient ─
function computeOptimalDose(
  product: ProductCandidate,
  remaining: Record<string, number>,
  totalProvided: Record<string, number>,
  mode: RecommendationMode,
): { doseKg: number; primaryNutrient: string | null; cappedBy: string | null } {
  let targetDoseKg = 0;
  let primaryNutrient: string | null = null;
  let maxUrgency = 0;

  // For each deficient nutrient this product covers, compute
  // the dose needed to fully close the gap
  for (const nt of NUTRIENT_TARGETS) {
    const conc = getConcentration(product, nt);
    if (conc <= 0) continue;
    if (remaining[nt.key] <= 0) continue;

    // Dose (kg/ha) needed to provide exactly the remaining demand
    const doseNeeded = remaining[nt.key] / (conc * 1000);

    // Urgency: how critical is this nutrient's deficit
    const urgency = remaining[nt.key] / ((nt.refMin + nt.refMax) / 2);
    const weightedUrgency = nt.isMacro
      ? (mode === 'spraying' ? urgency * 0.2 : urgency * 1.0)
      : (mode === 'spraying' ? urgency * 1.5 : urgency * 1.0);

    if (weightedUrgency > maxUrgency) {
      maxUrgency = weightedUrgency;
      primaryNutrient = nt.key;
      targetDoseKg = doseNeeded;
    }
  }

  if (targetDoseKg <= 0) return { doseKg: 0, primaryNutrient: null, cappedBy: null };

  // Cap by the product's recommended dose (don't exceed 2x recommendation)
  const recDoseKg = doseToKg(product.recomendacao_dose_ha, product.recomendacao_dose_unidade);
  if (recDoseKg > 0) {
    targetDoseKg = Math.min(targetDoseKg, recDoseKg * 2);
  }

  // Cap by toxicity limits on ALL nutrients the product provides
  let cappedBy: string | null = null;
  for (const nt of NUTRIENT_TARGETS) {
    const conc = getConcentration(product, nt);
    if (conc <= 0) continue;

    const headroom = nt.toxicityLimit - totalProvided[nt.key];
    if (headroom <= 0) {
      return { doseKg: 0, primaryNutrient, cappedBy: nt.key };
    }

    const maxDoseForNutrient = headroom / (conc * 1000);
    if (maxDoseForNutrient < targetDoseKg) {
      targetDoseKg = maxDoseForNutrient;
      cappedBy = nt.key;
    }
  }

  // Also don't let any single nutrient exceed its demand by more than 30%
  // to avoid wasteful over-supply
  for (const nt of NUTRIENT_TARGETS) {
    const conc = getConcentration(product, nt);
    if (conc <= 0) continue;

    const surplus = remaining[nt.key];
    if (surplus <= 0) {
      // Nutrient already satisfied — cap dose so we don't add more than 20% extra
      const tolerance = nt.toxicityLimit * 0.01; // 1% of toxicity limit as tolerance
      const maxExtra = tolerance / (conc * 1000);
      if (maxExtra < targetDoseKg) {
        targetDoseKg = maxExtra;
      }
    } else {
      // Don't provide more than 130% of remaining demand
      const maxProvide = surplus * 1.0;
      const maxDose = maxProvide / (conc * 1000);
      if (maxDose < targetDoseKg) {
        targetDoseKg = maxDose;
      }
    }
  }

  return { doseKg: Math.max(targetDoseKg, 0), primaryNutrient, cappedBy };
}

// ─── Score: how well a product covers remaining deficits ──────
// Prioriza o produto com maior quantidade do nutriente-alvo por embalagem
// (concentração × tamanho da embalagem)
function coverageScore(
  product: ProductCandidate,
  remaining: Record<string, number>,
  mode: RecommendationMode,
): number {
  let score = 0;
  let nutrientCount = 0;

  // kg de nutriente por embalagem = concentração × tamanho
  const packageSize = product.tamanho_unidade || 1;

  for (const nt of NUTRIENT_TARGETS) {
    const conc = getConcentration(product, nt);
    if (conc <= 0 || remaining[nt.key] <= 0) continue;

    nutrientCount++;

    // Quantidade do nutriente por embalagem (kg)
    const kgPerPackage = conc * packageSize;

    // How much of the gap can this product potentially close
    const urgency = remaining[nt.key] / Math.max(nt.refMin, 1);
    const weight = nt.isMacro
      ? (mode === 'spraying' ? 0.2 : 1.0)
      : (mode === 'spraying' ? 1.5 : 1.0);

    // Priorizar por kg/embalagem × urgência (não apenas concentração %)
    score += kgPerPackage * urgency * weight;
  }

  // Bonus for multi-nutrient coverage (fills more gaps at once)
  if (nutrientCount > 1) score *= 1 + (nutrientCount * 0.1);

  return score;
}

// ─── Main recommendation function ───────────────────────────
export type RecommendationMode = 'fertigation' | 'spraying';

export function generateAutoRecommendation(
  sacasPerHa: number,
  leafAnalysis: LeafAnalysisData | null,
  availableProducts: ProductCandidate[],
  mode: RecommendationMode = 'fertigation',
  month?: number,
  firstYearOverride?: FirstYearOverride,
  pSolo?: number,
  standFactor?: number,
): RecommendedProduct[] {
  const demand = calculateDemand(sacasPerHa, leafAnalysis, month, firstYearOverride, standFactor);
  const remaining = { ...demand };
  const selected: RecommendedProduct[] = [];
  const usedGroups = new Set<string>();

  // In spraying mode, adjust demand weights
  if (mode === 'spraying') {
    for (const nt of NUTRIENT_TARGETS) {
      if (nt.isMacro) remaining[nt.key] *= 0.2;
      else remaining[nt.key] *= 1.5;
    }
  }

  // Filter usable products (allow products without recommended dose — engine will compute optimal dose)
  const candidates = availableProducts.filter(p => {
    const hasNutrients = NUTRIENT_TARGETS.some(nt => getConcentration(p, nt) > 0);
    return hasNutrients;
  }).filter(p => {
    if (mode === 'spraying') return ['Foliar', 'Adjuvantes', 'Cobertura'].includes(p.tipo_produto);
    return !['Inseticida', 'Fungicida', 'Herbicida', 'Adjuvantes'].includes(p.tipo_produto);
  });

  // When soil P is already high (>30 mg/dm³), penalize products that contain P₂O₅
  // This makes the engine prefer NPK 20-00-20 over 20-05-20 when P correction is unnecessary
  const soilPHighThreshold = 30;
  const penalizeP = pSolo !== undefined && pSolo > soilPHighThreshold;

  // Track cumulative nutrient totals for toxicity checks
  const totalProvided: Record<string, number> = {};
  for (const nt of NUTRIENT_TARGETS) totalProvided[nt.key] = 0;

  const maxProducts = 10;
  const usedIds = new Set<string>();

  for (let round = 0; round < maxProducts; round++) {
    // Check if any meaningful deficit remains
    const hasDeficit = NUTRIENT_TARGETS.some(nt => remaining[nt.key] > nt.refMin * 0.05);
    if (!hasDeficit) break;

    let bestScore = 0;
    let bestProduct: ProductCandidate | null = null;

    for (const product of candidates) {
      if (usedIds.has(product.id)) continue;

      const group = getCompatGroup(product);
      if (group === 'A' && usedGroups.has('B')) continue;
      if (group === 'B' && usedGroups.has('A')) continue;

      let score = coverageScore(product, remaining, mode);
      // Penalize P₂O₅-containing products when soil P is already high
      if (penalizeP && product.macro_p2o5 > 0) {
        score *= 0.3; // Heavy penalty — prefer P-free alternatives
      }
      if (score > bestScore) {
        bestScore = score;
        bestProduct = product;
      }
    }

    if (!bestProduct || bestScore < 0.001) break;

    // Compute optimal dose for this product
    const { doseKg, primaryNutrient, cappedBy } = computeOptimalDose(
      bestProduct, remaining, totalProvided, mode,
    );

    if (doseKg <= 0.001) {
      usedIds.add(bestProduct.id);
      continue;
    }

    // Convert back to display units
    const recDoseKg = doseToKg(bestProduct.recomendacao_dose_ha, bestProduct.recomendacao_dose_unidade);
    let displayDose: number;
    let displayUnit: string;
    if (recDoseKg > 0) {
      const doseRatio = doseKg / recDoseKg;
      displayDose = Math.round(bestProduct.recomendacao_dose_ha * doseRatio * 100) / 100;
      displayUnit = bestProduct.recomendacao_dose_unidade;
    } else {
      // No recommended dose set — display computed dose in kg/ha
      displayDose = Math.round(doseKg * 100) / 100;
      displayUnit = 'kg/ha';
    }

    // Subtract nutrients provided at this dose from remaining demand
    const covered: string[] = [];
    for (const nt of NUTRIENT_TARGETS) {
      const conc = getConcentration(bestProduct, nt);
      if (conc <= 0) continue;
      const provided = doseKg * conc * 1000; // g/ha
      remaining[nt.key] = Math.max(0, remaining[nt.key] - provided);
      totalProvided[nt.key] += provided;
      if (provided > 0) covered.push(nt.key);
    }

    // Build reason string
    const nutrientNames = covered.map(k => getNutrientSymbol(k));
    const primaryConc = primaryNutrient
      ? (Number((bestProduct as any)[NUTRIENT_TARGETS.find(n => n.key === primaryNutrient)!.dbField]) || 0)
      : 0;

    let reason = primaryNutrient && primaryConc > 0
      ? `Fonte de ${getNutrientSymbol(primaryNutrient)} (${primaryConc}%)${covered.length > 1 ? ` + ${nutrientNames.filter(n => n !== getNutrientSymbol(primaryNutrient!)).join(', ')}` : ''}`
      : `Fonte de ${nutrientNames.join(', ')}`;

    if (cappedBy) {
      reason += ` ⚠️ Dose limitada (${getNutrientSymbol(cappedBy)} no limite)`;
    }

    // Show coverage info
    const pctClosed: string[] = [];
    for (const nt of NUTRIENT_TARGETS) {
      const conc = getConcentration(bestProduct, nt);
      if (conc <= 0) continue;
      const provided = doseKg * conc * 1000;
      const originalDemand = demand[nt.key] || 0;
      if (originalDemand > 0) {
        const pct = Math.min(Math.round((provided / originalDemand) * 100), 100);
        if (pct >= 5) pctClosed.push(`${getNutrientSymbol(nt.key)}: ${pct}%`);
      }
    }
    if (pctClosed.length > 0) {
      reason += ` | Cobre: ${pctClosed.join(', ')}`;
    }

    selected.push({
      product: bestProduct,
      dose: displayDose,
      unit: displayUnit,
      reason,
      nutrientsCovered: covered,
    });

    usedIds.add(bestProduct.id);
    usedGroups.add(getCompatGroup(bestProduct));
  }

  return selected;
}

// ─── Nutrient symbols ────────────────────────────────────────
const NUTRIENT_SYMBOLS: Record<string, string> = {
  n: 'N', p: 'P₂O₅', k: 'K₂O', s: 'S',
  b: 'B', zn: 'Zn', cu: 'Cu', mn: 'Mn', fe: 'Fe', mo: 'Mo',
};

export function getNutrientSymbol(key: string): string {
  return NUTRIENT_SYMBOLS[key] || key.toUpperCase();
}
