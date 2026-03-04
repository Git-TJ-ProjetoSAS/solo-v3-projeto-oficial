/**
 * Calendário Fenológico — Café Conilon
 *
 * Metas de nutrientes foliares ajustadas por estágio fenológico.
 * Baseado na marcha de absorção e demanda nutricional por fase.
 *
 * Unidades: Macros em %, Micros em ppm (mg/kg).
 */

export interface PhenologyStage {
  id: string;
  name: string;
  months: number[]; // 1-12
  description: string;
  color: string; // tailwind token
  /** Nutrient targets for this stage: { nutrientId: { min, max, meta } } */
  targets: Record<string, { min: number; max: number; meta: number }>;
  /** Key recommended products for this stage */
  keyProducts: string[];
  /** Agronomic tips for this stage */
  tips: string[];
}

export const PHENOLOGY_STAGES: PhenologyStage[] = [
  {
    id: 'dormancy',
    name: 'Repouso / Pré-Florada',
    months: [6, 7, 8], // Jun–Ago
    description: 'Período de estresse hídrico programado. A planta acumula reservas para a florada. Foco em Boro e Zinco para preparar gemas florais.',
    color: 'text-sky-500',
    targets: {
      n:  { min: 2.6, max: 2.8, meta: 2.7 },
      p:  { min: 0.10, max: 0.13, meta: 0.115 },
      k:  { min: 1.6, max: 2.0, meta: 1.8 },
      mg: { min: 0.30, max: 0.45, meta: 0.375 },
      ca: { min: 0.8, max: 1.3, meta: 1.05 },
      s:  { min: 0.12, max: 0.18, meta: 0.15 },
      zn: { min: 12, max: 20, meta: 16 },
      b:  { min: 50, max: 80, meta: 65 },
      cu: { min: 10, max: 20, meta: 15 },
      mn: { min: 50, max: 150, meta: 100 },
      fe: { min: 50, max: 200, meta: 125 },
      mo: { min: 0.1, max: 1.0, meta: 0.55 },
    },
    keyProducts: ['Ácido Bórico', 'Sulfato de Zinco', 'Sulfato de Cobre'],
    tips: [
      'Aplicar B e Zn foliares antes da quebra de dormência.',
      'Evitar adubação nitrogenada pesada nesta fase.',
      'Cobre foliar preventivo contra ferrugem.',
    ],
  },
  {
    id: 'flowering',
    name: 'Florada / Pegamento',
    months: [9, 10], // Set–Out
    description: 'Abertura floral e fecundação. Alta demanda de Boro para formação do tubo polínico e pegamento de frutos. Nitrogênio moderado.',
    color: 'text-pink-500',
    targets: {
      n:  { min: 2.8, max: 3.2, meta: 3.0 },
      p:  { min: 0.12, max: 0.15, meta: 0.135 },
      k:  { min: 1.8, max: 2.2, meta: 2.0 },
      mg: { min: 0.35, max: 0.50, meta: 0.425 },
      ca: { min: 1.0, max: 1.5, meta: 1.25 },
      s:  { min: 0.15, max: 0.20, meta: 0.175 },
      zn: { min: 12, max: 22, meta: 17 },
      b:  { min: 60, max: 100, meta: 80 },
      cu: { min: 10, max: 20, meta: 15 },
      mn: { min: 50, max: 150, meta: 100 },
      fe: { min: 50, max: 200, meta: 125 },
      mo: { min: 0.2, max: 1.0, meta: 0.6 },
    },
    keyProducts: ['Ácido Bórico', 'Molibdato de Sódio', 'Sulfato de Zinco'],
    tips: [
      'Boro é CRÍTICO: aplicar 0.3% na calda antes e durante a florada.',
      'Molibdênio melhora o vingamento dos frutos.',
      'Evitar herbicidas durante a abertura floral.',
    ],
  },
  {
    id: 'expansion',
    name: 'Expansão Rápida',
    months: [11, 12, 1], // Nov–Jan
    description: 'Crescimento vegetativo intenso e expansão dos frutos. Máxima demanda de Nitrogênio e Potássio. Fase de maior absorção nutricional.',
    color: 'text-emerald-500',
    targets: {
      n:  { min: 3.1, max: 3.5, meta: 3.3 },
      p:  { min: 0.13, max: 0.16, meta: 0.145 },
      k:  { min: 2.0, max: 2.5, meta: 2.25 },
      mg: { min: 0.35, max: 0.55, meta: 0.45 },
      ca: { min: 1.0, max: 1.5, meta: 1.25 },
      s:  { min: 0.15, max: 0.22, meta: 0.185 },
      zn: { min: 12, max: 25, meta: 18 },
      b:  { min: 45, max: 80, meta: 62 },
      cu: { min: 10, max: 20, meta: 15 },
      mn: { min: 50, max: 160, meta: 105 },
      fe: { min: 60, max: 220, meta: 140 },
      mo: { min: 0.1, max: 1.0, meta: 0.55 },
    },
    keyProducts: ['Ureia', 'Cloreto de Potássio (KCl)', 'Sulfato de Magnésio'],
    tips: [
      'Parcelar N e K na fertirrigação (quinzenal).',
      'Magnésio foliar previne amarelecimento no Conilon.',
      'Monitorar bicho-mineiro e cercóspora nesta fase.',
    ],
  },
  {
    id: 'filling',
    name: 'Enchimento de Grãos',
    months: [2, 3, 4], // Fev–Abr
    description: 'Acúmulo de matéria seca nos grãos. Demanda máxima de Potássio para qualidade de bebida. Manter Magnésio para fotossíntese.',
    color: 'text-amber-500',
    targets: {
      n:  { min: 2.8, max: 3.2, meta: 3.0 },
      p:  { min: 0.12, max: 0.15, meta: 0.135 },
      k:  { min: 2.2, max: 2.8, meta: 2.5 },
      mg: { min: 0.40, max: 0.55, meta: 0.475 },
      ca: { min: 1.0, max: 1.5, meta: 1.25 },
      s:  { min: 0.15, max: 0.20, meta: 0.175 },
      zn: { min: 10, max: 20, meta: 15 },
      b:  { min: 40, max: 70, meta: 55 },
      cu: { min: 10, max: 20, meta: 15 },
      mn: { min: 50, max: 150, meta: 100 },
      fe: { min: 50, max: 200, meta: 125 },
      mo: { min: 0.1, max: 1.0, meta: 0.55 },
    },
    keyProducts: ['Cloreto de Potássio (KCl)', 'Sulfato de Magnésio', 'Sulfato de Manganês'],
    tips: [
      'Potássio é PRIORIDADE: afeta diretamente peso do grão e qualidade.',
      'Reduzir N para evitar crescimento vegetativo excessivo.',
      'Manter Mg foliar (0.5%) a cada 30 dias.',
    ],
  },
  {
    id: 'maturation',
    name: 'Maturação / Colheita',
    months: [5], // Mai
    description: 'Maturação final dos frutos e início da colheita. Reduzir adubação. Foco na sanidade e preparação para o repouso.',
    color: 'text-orange-500',
    targets: {
      n:  { min: 2.5, max: 2.8, meta: 2.65 },
      p:  { min: 0.10, max: 0.13, meta: 0.115 },
      k:  { min: 1.8, max: 2.2, meta: 2.0 },
      mg: { min: 0.35, max: 0.50, meta: 0.425 },
      ca: { min: 0.8, max: 1.3, meta: 1.05 },
      s:  { min: 0.12, max: 0.18, meta: 0.15 },
      zn: { min: 10, max: 18, meta: 14 },
      b:  { min: 35, max: 60, meta: 48 },
      cu: { min: 8, max: 18, meta: 13 },
      mn: { min: 40, max: 130, meta: 85 },
      fe: { min: 50, max: 180, meta: 115 },
      mo: { min: 0.1, max: 0.8, meta: 0.45 },
    },
    keyProducts: ['Sulfato de Cobre'],
    tips: [
      'Aplicação de Cobre pós-colheita para proteção.',
      'Evitar adubações foliares durante a colheita mecânica.',
      'Iniciar planejamento de calagem para o próximo ciclo.',
    ],
  },
];

/**
 * Returns the phenological stage for a given month (1-12).
 */
export function getStageForMonth(month: number): PhenologyStage {
  const found = PHENOLOGY_STAGES.find(s => s.months.includes(month));
  return found || PHENOLOGY_STAGES[0]; // fallback to dormancy
}

/**
 * Returns dynamic nutrient target for a specific nutrient and month.
 * Falls back to static values if nutrient not found in phenology data.
 */
export function getDynamicTarget(
  nutrientId: string,
  month: number,
  staticMeta: number,
  staticMin: number,
  staticMax: number
): { min: number; max: number; meta: number } {
  const stage = getStageForMonth(month);
  const target = stage.targets[nutrientId];
  if (target) return target;
  return { min: staticMin, max: staticMax, meta: staticMeta };
}

/** Month names in Portuguese */
export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
