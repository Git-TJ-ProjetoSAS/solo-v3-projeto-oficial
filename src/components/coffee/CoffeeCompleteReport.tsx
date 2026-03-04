/**
 * CoffeeCompleteReport — Relatório Técnico Completo
 * Layout idêntico ao PDF de referência:
 *   Pág 1: Cabeçalho | Diagnóstico de Solo (Macro+Micro) | Calagem | Demanda Nutricional
 *   Pág 2: Cronograma Híbrido Solo a Lanço
 *   Pág 3-4: Programa Estratégico Foliar por Fase Fenológica
 *   Pág 5: Compatibilidade de Calda | Lista de Compras & Custos
 *   Pág 6: Análise Econômica | Rodapé com assinaturas
 *
 * Funciona para Arábica E Conilon.
 */

import { forwardRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { LOGO_URL } from '@/lib/constants';
import {
  APPLICATION_METHOD_INFO,
  type ApplicationMethodType,
  type HybridPlan,
} from '@/lib/coffeeHybridPlan';
import { getPhaseLabel, getPhaseEmoji } from '@/lib/coffeeRecommendationEngine';
import { classifyInsumo, GROUP_INFO, type CompatGroup, type InsumoForClassification } from '@/lib/compatibilityEngine';
import { FertigationPivotTable } from './FertigationPivotTable';
import type { CoffeeType, CoffeeLimingData, LeafAnalysisData } from '@/contexts/CoffeeContext';
import type { ShoppingItem, ClassifiedProductSimple } from './CoffeeSimplifiedReport';
import { AlertTriangle, CheckCircle, XCircle, Info, User, Shield } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────
function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmt2(v: number) {
  return v < 0.01 ? '—' : v.toFixed(1).replace('.', ',');
}

const BIMONTHLY_PERIODS = [
  { label: 'Jul / Ago', months: [7, 8], phase: 'Pós-Colheita / Repouso' },
  { label: 'Set / Out', months: [9, 10], phase: 'Pré-Florada / Florada' },
  { label: 'Nov / Dez', months: [11, 12], phase: 'Chumbinho / Expansão' },
  { label: 'Jan / Fev', months: [1, 2], phase: 'Enchimento de Grãos' },
  { label: 'Mar / Abr', months: [3, 4], phase: 'Maturação' },
  { label: 'Mai / Jun', months: [5, 6], phase: 'Colheita' },
];

const FOLIAR_PHASES = [
  { id: 'pos_colheita', name: 'Pós-Colheita / Repouso', months: [6, 7, 8], emoji: '🌙', objetivo: 'Recuperação e reserva energética. Cobre preventivo contra ferrugem. Boro e Zinco para preparação de gemas florais.' },
  { id: 'pre_florada', name: 'Pré-Florada / Florada', months: [9, 10], emoji: '🌸', objetivo: 'Boro crítico para formação do tubo polínico e pegamento de frutos. Molibdênio para vingamento. Evitar herbicidas na florada.' },
  { id: 'chumbinho', name: 'Expansão Rápida (Chumbinho)', months: [11, 12, 1], emoji: '🌱', objetivo: 'Pico de demanda de N e K. Suplementação de micronutrientes foliares. Monitorar bicho-mineiro e cercóspora.' },
  { id: 'enchimento', name: 'Enchimento de Grãos', months: [2, 3, 4], emoji: '🫘', objetivo: 'Potássio foliar para peso e qualidade do grão. Magnésio para fotossíntese ativa. Reduzir nitrogênio.' },
  { id: 'maturacao', name: 'Maturação / Colheita', months: [5], emoji: '🍒', objetivo: 'Reduzir aplicações. Cobre pós-colheita para proteção sanitária. Preparar para o repouso.' },
];

// ─── Nutrient status reference ranges for Arabica/Conilon ────
const MACRO_REFS: Record<string, { min: number; max: number; unit: string }> = {
  ca: { min: 3.0, max: 7.0, unit: 'cmolc/dm³' },
  mg: { min: 0.8, max: 2.0, unit: 'cmolc/dm³' },
  k: { min: 100, max: 250, unit: 'mg/dm³' },
  p: { min: 10, max: 40, unit: 'mg/dm³' },
  s: { min: 10, max: 20, unit: 'mg/dm³' },
};
const MICRO_REFS: Record<string, { min: number; max: number; unit: string; label: string }> = {
  zn: { min: 1.0, max: 1.5, unit: 'mg/dm³', label: 'Zn' },
  b: { min: 0.2, max: 0.6, unit: 'mg/dm³', label: 'B' },
  mn: { min: 5, max: 8, unit: 'mg/dm³', label: 'Mn' },
  fe: { min: 18, max: 45, unit: 'mg/dm³', label: 'Fe' },
  cu: { min: 0.3, max: 0.8, unit: 'mg/dm³', label: 'Cu' },
};

type NutrientStatus = 'adequate' | 'threshold' | 'deficient';

function getNutrientStatus(value: number, min: number, max: number): NutrientStatus {
  if (value >= min && value <= max * 1.5) return 'adequate';
  if (value >= min * 0.7 && value < min) return 'threshold';
  return 'deficient';
}

function StatusBadge({ status }: { status: NutrientStatus }) {
  const cfg = {
    adequate: { label: 'Adequado', cls: 'bg-emerald-100 text-emerald-700' },
    threshold: { label: 'Limiar', cls: 'bg-amber-100 text-amber-700' },
    deficient: { label: 'Déficit', cls: 'bg-red-100 text-red-700' },
  }[status];
  return <span className={cn('text-[8px] px-1.5 py-0.5 rounded-full font-semibold', cfg.cls)}>{cfg.label}</span>;
}

// ─── Section Header ───────────────────────────────────────────
function SectionHeader({ number, title, subtitle }: { number: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-2 border-b-2 border-emerald-600 pb-1.5">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold shrink-0">
        {number}
      </span>
      <div>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h2>
        {subtitle && <p className="text-[9px] text-gray-500 italic">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Alert Box ───────────────────────────────────────────────
function AlertBox({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warning' | 'success' }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  };
  const icons = {
    info: <Info className="w-3 h-3 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />,
    success: <CheckCircle className="w-3 h-3 shrink-0 mt-0.5" />,
  };
  return (
    <div className={cn('flex items-start gap-1.5 px-2 py-1.5 rounded border text-[9px] leading-relaxed', styles[variant])}>
      {icons[variant]}
      <div>{children}</div>
    </div>
  );
}

// ─── GroupBadge ──────────────────────────────────────────────
function GroupBadge({ group }: { group: CompatGroup }) {
  const info = GROUP_INFO[group];
  return (
    <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold border', info.badgeColor)}>
      {group}
    </span>
  );
}

// ─── Props ───────────────────────────────────────────────────
export interface CompleteReportProps {
  coffeeType: CoffeeType;
  coffeeLabel: string;
  safraLabel: string;
  profileName: string | null;
  isConsultor: boolean;
  creaArt: string | null;
  hectares: number;
  plantsPerHa: number;
  totalPlants: number;
  sacas: number;
  isFormationPhase: boolean;
  hybridPlan: HybridPlan | null;
  shoppingItems: ShoppingItem[];
  grandTotalCost: number;
  allClassifiedProducts: ClassifiedProductSimple[];
  // Soil data
  soil: {
    ca: number; mg: number; k: number; p: number; s: number;
    hAl: number; vPercent: number; mo?: number;
    zn?: number; b?: number; mn?: number; fe?: number; cu?: number;
    textura?: string;
  } | null;
  // Liming
  limingData: CoffeeLimingData | null;
  // Nutrient demands
  demandN: number;
  demandK: number;
  demandP: number;
  demandS: number;
  // Financial
  fertCostPerHa: number;
  limingCostPerHa: number;
  treatmentCostPerHa: number;
  totalCostPerHa: number;
  costPerSaca: number;
  revenuePerHa: number;
  profitPerHa: number;
  // Cost detail items
  fertCostItems: { name: string; dosePerHa: number; pricePerKg: number; costPerHa: number }[];
  // Nutrient balance for audit
  nutrientBalance?: import('./CoffeeSimplifiedReport').NutrientBalanceItem[];
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export const CoffeeCompleteReport = forwardRef<HTMLDivElement, CompleteReportProps>(
  (props, ref) => {
    const {
      coffeeType, coffeeLabel, safraLabel, profileName, isConsultor, creaArt,
      hectares, plantsPerHa, totalPlants, sacas, isFormationPhase, hybridPlan,
      shoppingItems, grandTotalCost, allClassifiedProducts,
      soil, limingData, demandN, demandK, demandP, demandS,
      fertCostPerHa, limingCostPerHa, treatmentCostPerHa, totalCostPerHa,
      costPerSaca, revenuePerHa, profitPerHa, fertCostItems, nutrientBalance,
    } = props;

    let sectionNum = 0;

    // ─── Solo a Lanço bimonthly ───────────────────────────────
    const lancoData = useMemo(() => {
      if (!hybridPlan) return [];
      return BIMONTHLY_PERIODS.map(bm => {
        const actions: { productName: string; kgHa: number; gPlanta: number }[] = [];
        hybridPlan.months
          .filter(m => bm.months.includes(m.calendarMonth))
          .forEach(m => {
            m.actions
              .filter(a => a.product.method === 'solo_lanco')
              .forEach(a => {
                const existing = actions.find(x => x.productName === a.product.name);
                if (existing) {
                  existing.kgHa += a.doseMonthKgHa;
                  existing.gPlanta += a.doseGramsPerPlant ?? 0;
                } else {
                  actions.push({
                    productName: a.product.name,
                    kgHa: a.doseMonthKgHa,
                    gPlanta: a.doseGramsPerPlant ?? 0,
                  });
                }
              });
          });
        return { ...bm, actions };
      });
    }, [hybridPlan]);

    // ─── Per-product annual total for solo a lanço ───────────
    const lancoProductTotals = useMemo(() => {
      const map = new Map<string, { kgHa: number; gPlanta: number }>();
      lancoData.forEach(bm => {
        bm.actions.forEach(a => {
          const ex = map.get(a.productName);
          if (ex) {
            ex.kgHa += a.kgHa;
            ex.gPlanta += a.gPlanta;
          } else {
            map.set(a.productName, { kgHa: a.kgHa, gPlanta: a.gPlanta });
          }
        });
      });
      return map;
    }, [lancoData]);

    // Equipment defaults for Arabica (jato trator 2000L / 667L/ha) and Conilon (fertirrigacao)
    const tankCapacity = coffeeType === 'arabica' ? 2000 : 1000;
    const caldaPerHa = coffeeType === 'arabica' ? 667 : 400;
    const equipment = coffeeType === 'conilon' ? 'Trator (Fertirrigação/Jato)' : 'Trator (Bomba Jato)';

    // ─── Foliar data by phenological phase ───────────────────
    const foliarPhaseData = useMemo(() => {
      if (!hybridPlan) return [];
      const foliarMethods: ApplicationMethodType[] = ['jato_trator', 'foliar'];

      return FOLIAR_PHASES.map(phase => {
        // Gather products and doses for this phase
        const productMap = new Map<string, { kgHa: number; gPlanta: number; tankDose: string }>();
        // Default equipment: Arábica uses Jato com Trator (2000L tank, ~667L/ha)
        const defaultTankCapacity = tankCapacity;
        const defaultCaldaPerHa = caldaPerHa;

        hybridPlan.months
          .filter(m => phase.months.includes(m.calendarMonth))
          .forEach(m => {
            m.actions
              .filter(a => foliarMethods.includes(a.product.method))
              .forEach(a => {
                const existing = productMap.get(a.product.name);
                const haPerTank = defaultCaldaPerHa > 0 ? defaultTankCapacity / defaultCaldaPerHa : 1;
                const dosePerTankKg = a.doseMonthKgHa * haPerTank;
                const doseGPlant = a.doseGramsPerPlant ?? ((a.doseMonthKgHa * 1000) / (plantsPerHa || 1));

                const tankStr = dosePerTankKg >= 1
                  ? `${dosePerTankKg.toFixed(2)} kg`
                  : `${(dosePerTankKg * 1000).toFixed(0)} g`;

                if (existing) {
                  existing.kgHa += a.doseMonthKgHa;
                  existing.gPlanta += doseGPlant;
                } else {
                  productMap.set(a.product.name, {
                    kgHa: a.doseMonthKgHa,
                    gPlanta: doseGPlant,
                    tankDose: tankStr,
                  });
                }
              });
          });

        const products = Array.from(productMap.entries()).map(([name, data]) => ({
          name,
          kgHa: data.kgHa,
          gPlanta: data.gPlanta,
          tankDose: data.tankDose,
        }));

        return { ...phase, products };
      }).filter(p => p.products.length > 0);
    }, [hybridPlan, plantsPerHa, tankCapacity, caldaPerHa]);

    // ─── Compatibility groups ─────────────────────────────────
    const mixGroups = useMemo(() => {
      const groups: Record<CompatGroup, ClassifiedProductSimple[]> = { A: [], B: [], C: [], D: [], E: [] };
      allClassifiedProducts.forEach(p => groups[p.group].push(p));
      return groups;
    }, [allClassifiedProducts]);

    const activeGroups = useMemo(() =>
      (Object.entries(mixGroups) as [CompatGroup, ClassifiedProductSimple[]][])
        .filter(([, prods]) => prods.length > 0),
      [mixGroups]
    );

    const vPercent = soil?.vPercent ?? 0;
    const vMeta = coffeeType === 'conilon' ? 65 : 70;
    const vStatus: 'adequate' | 'threshold' | 'deficient' =
      vPercent >= vMeta ? 'adequate' : vPercent >= vMeta * 0.8 ? 'threshold' : 'deficient';

    const currentPhase = hybridPlan?.phase ?? 'adulto';
    const phaseLabel = getPhaseLabel(currentPhase);
    const phaseEmoji = getPhaseEmoji(currentPhase);

    // (tankCapacity, caldaPerHa, equipment moved above foliarPhaseData memo)

    const hasLanco = lancoData.some(bm => bm.actions.length > 0);
    const hasFoliar = foliarPhaseData.length > 0;

    return (
      <div
        ref={ref}
        className="report-print-mode bg-white text-gray-800 rounded-xl print-report"
        style={{ backgroundColor: '#ffffff', color: '#1f2937', fontFamily: 'sans-serif' }}
      >
        {/* ═══════════════════ PÁGINA 1 ═══════════════════ */}
        <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">

          {/* ─── CABEÇALHO ─── */}
          <div className="break-inside-avoid">
            {/* Title bar */}
            <div className="flex items-center gap-2 sm:gap-3 py-2 px-2.5 sm:px-3 bg-emerald-700 rounded-t-lg">
              <img src={LOGO_URL} alt="Solo V3" className="h-8 sm:h-10 w-auto object-contain shrink-0 brightness-0 invert" />
              <div className="flex-1 min-w-0">
                <h1 className="text-[11px] sm:text-sm font-bold text-white uppercase tracking-wider leading-tight">
                  PLANEJAMENTO NUTRICIONAL CONSERVADOR
                </h1>
                <p className="text-[10px] sm:text-xs text-emerald-100 font-medium mt-0.5">
                  Café {coffeeLabel} — Safra {safraLabel}
                </p>
              </div>
              <div className="text-right text-[10px] text-emerald-100 shrink-0">
                <p>{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 border border-gray-200 rounded-b-lg overflow-hidden text-[10px]">
              <div className="px-2 sm:px-3 py-2 border-r border-gray-200">
                <p className="text-gray-500 text-[9px] uppercase tracking-wide">Produtor</p>
                <p className="font-semibold text-gray-800 truncate">{profileName || '—'}</p>
              </div>
              <div className="px-2 sm:px-3 py-2 sm:border-r border-gray-200">
                <p className="text-gray-500 text-[9px] uppercase tracking-wide">Área Total</p>
                <p className="font-semibold text-gray-800">{hectares > 0 ? `${hectares.toFixed(2)} ha` : '—'}</p>
              </div>
              <div className="px-2 sm:px-3 py-2 border-t sm:border-t-0 col-span-2 sm:col-span-1">
                <p className="text-gray-500 text-[9px] uppercase tracking-wide">Estande</p>
                <p className="font-semibold text-gray-800">
                  {plantsPerHa > 0 ? `${plantsPerHa.toLocaleString('pt-BR')} pl/ha` : '—'}
                </p>
                {totalPlants > 0 && (
                  <p className="text-[9px] text-gray-500">Total: {totalPlants.toLocaleString('pt-BR')} plantas</p>
                )}
              </div>
              <div className="px-2 sm:px-3 py-2 border-t border-r border-gray-200">
                <p className="text-gray-500 text-[9px] uppercase tracking-wide">Fase</p>
                <p className="font-semibold text-gray-800">{phaseEmoji} {phaseLabel}</p>
              </div>
              <div className="px-2 sm:px-3 py-2 border-t sm:border-r border-gray-200">
                <p className="text-gray-500 text-[9px] uppercase tracking-wide">Meta / Produção</p>
                <p className="font-semibold text-gray-800">
                  {isFormationPhase ? 'Fase de formação' : `${sacas} sc/ha`}
                </p>
              </div>
              <div className="px-2 sm:px-3 py-2 border-t border-gray-200 col-span-2 sm:col-span-1">
                <p className="text-gray-500 text-[9px] uppercase tracking-wide">Resp. Técnico</p>
                <p className="font-semibold text-gray-800 truncate">
                  {isConsultor && profileName ? `Eng. Agr. ${profileName}${creaArt ? ` · ${creaArt}` : ''}` : 'SOLO V3'}
                </p>
              </div>
            </div>
          </div>

          {/* ─── DIAGNÓSTICO DE FERTILIDADE DO SOLO ─── */}
          {soil && (
            <div className="break-inside-avoid space-y-2">
              <SectionHeader number={++sectionNum} title="Diagnóstico de Fertilidade do Solo" subtitle={`Café ${coffeeLabel} — Fase de ${isFormationPhase ? 'formação' : 'produção'}`} />

              {/* V% gauge */}
              <div className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Saturação por Bases (V%)</span>
                    <StatusBadge status={vStatus} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={cn('h-3 rounded-full transition-all', vPercent >= vMeta ? 'bg-emerald-500' : vPercent >= vMeta * 0.8 ? 'bg-amber-400' : 'bg-red-500')}
                        style={{ width: `${Math.min(100, (vPercent / 100) * 100)}%` }}
                      />
                    </div>
                    <span className={cn('text-sm font-bold', vPercent >= vMeta ? 'text-emerald-700' : vPercent >= vMeta * 0.8 ? 'text-amber-700' : 'text-red-700')}>
                      {vPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between mt-0.5 text-[8px] text-gray-400">
                    <span>Baixo</span>
                    <span>Meta: {vMeta}%</span>
                  </div>
                </div>
                <div className="text-right text-[9px] text-gray-500">
                  <p>Textura: <strong className="text-gray-700">{soil.textura || 'Média'}</strong></p>
                  {soil.mo !== undefined && <p>M.O.: <strong className="text-gray-700">{soil.mo} g/dm³</strong></p>}
                </div>
              </div>

              {/* Macronutrients — compact cards on mobile, table on sm+ */}
              <div>
                <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Macronutrientes</p>
                {/* Mobile: compact grid */}
                <div className="sm:hidden grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'ca', label: 'Ca', value: soil.ca },
                    { key: 'mg', label: 'Mg', value: soil.mg },
                    { key: 'k', label: 'K', value: soil.k },
                    { key: 'p', label: 'P', value: soil.p },
                    { key: 's', label: 'S', value: soil.s ?? 0 },
                  ].map(n => {
                    const ref = MACRO_REFS[n.key];
                    const status = ref ? getNutrientStatus(n.value, ref.min, ref.max) : 'adequate';
                    return (
                      <div key={n.key} className="flex items-center justify-between p-1.5 rounded border border-gray-200 bg-gray-50">
                        <div>
                          <span className="text-[10px] font-bold text-gray-800">{n.label}</span>
                          <span className="text-[9px] text-gray-500 ml-1">{n.value} {ref?.unit || ''}</span>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                    );
                  })}
                </div>
                {/* Desktop: full table */}
                <div className="hidden sm:block overflow-auto rounded-lg border border-gray-200">
                  <table className="w-full text-[9px]">
                    <thead>
                      <tr className="bg-gray-100">
                        {['Nutriente', 'Valor', 'Unidade', 'Ref. Adequado', 'Status'].map(h => (
                          <th key={h} className="px-2 py-1.5 font-semibold text-gray-600 uppercase text-left first:text-left text-center">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'ca', label: 'Ca', value: soil.ca },
                        { key: 'mg', label: 'Mg', value: soil.mg },
                        { key: 'k', label: 'K', value: soil.k },
                        { key: 'p', label: 'P', value: soil.p },
                        { key: 's', label: 'S', value: soil.s ?? 0 },
                      ].map((n, i) => {
                        const ref = MACRO_REFS[n.key];
                        const status = ref ? getNutrientStatus(n.value, ref.min, ref.max) : 'adequate';
                        const deficit = ref && n.value < ref.min ? (n.value - ref.min).toFixed(2) : null;
                        return (
                          <tr key={n.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-1.5 font-bold text-gray-800">{n.label}</td>
                            <td className="px-2 py-1.5 text-center font-medium text-gray-700">{n.value}</td>
                            <td className="px-2 py-1.5 text-center text-gray-500">{ref?.unit || '—'}</td>
                            <td className="px-2 py-1.5 text-center text-gray-500">{ref ? `${ref.min}–${ref.max}` : '—'}</td>
                            <td className="px-2 py-1.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <StatusBadge status={status} />
                                {deficit && <span className="text-red-500 text-[8px]">{deficit}</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Micronutrients table */}
              {(soil.zn !== undefined || soil.b !== undefined || soil.mn !== undefined || soil.fe !== undefined || soil.cu !== undefined) && (
                <div>
                  <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Micronutrientes</p>
                  {/* Mobile: inline cards */}
                  <div className="sm:hidden flex flex-wrap gap-1.5">
                    {[
                      { key: 'zn', value: soil.zn },
                      { key: 'b', value: soil.b },
                      { key: 'mn', value: soil.mn },
                      { key: 'fe', value: soil.fe },
                      { key: 'cu', value: soil.cu },
                    ]
                      .filter(n => n.value !== undefined)
                      .map(n => {
                        const ref = MICRO_REFS[n.key];
                        const val = n.value as number;
                        const status = ref ? getNutrientStatus(val, ref.min, ref.max) : 'adequate';
                        return (
                          <div key={n.key} className="flex items-center gap-1.5 px-2 py-1 rounded border border-gray-200 bg-gray-50">
                            <span className="text-[10px] font-bold text-gray-800">{ref?.label || n.key}</span>
                            <span className="text-[9px] text-gray-600">{val}</span>
                            <StatusBadge status={status} />
                          </div>
                        );
                      })}
                  </div>
                  {/* Desktop: table */}
                  <div className="hidden sm:block overflow-auto rounded-lg border border-gray-200">
                    <table className="w-full text-[9px]">
                      <thead>
                        <tr className="bg-gray-100">
                          {['Nutriente', 'Valor', 'Ref. Adequado', 'Status'].map(h => (
                            <th key={h} className="px-2 py-1.5 font-semibold text-gray-600 uppercase text-center first:text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'zn', value: soil.zn },
                          { key: 'b', value: soil.b },
                          { key: 'mn', value: soil.mn },
                          { key: 'fe', value: soil.fe },
                          { key: 'cu', value: soil.cu },
                        ]
                          .filter(n => n.value !== undefined)
                          .map((n, i) => {
                            const ref = MICRO_REFS[n.key];
                            const val = n.value as number;
                            const status = ref ? getNutrientStatus(val, ref.min, ref.max) : 'adequate';
                            return (
                              <tr key={n.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-2 py-1.5 font-bold text-gray-800">{ref?.label || n.key}</td>
                                <td className="px-2 py-1.5 text-center font-medium text-gray-700">{val}</td>
                                <td className="px-2 py-1.5 text-center text-gray-500">{ref ? `${ref.min}–${ref.max} ${ref.unit}` : '—'}</td>
                                <td className="px-2 py-1.5 text-center"><StatusBadge status={status} /></td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[8px] text-gray-400 mt-1 text-right">Ref.: Ribeiro et al. (5ª Aprox.)</p>
                </div>
              )}
            </div>
          )}

          {/* ─── MANEJO DE CORREÇÃO (CALAGEM) ─── */}
          {limingData && limingData.nc > 0 && (
            <div className="break-inside-avoid">
              <SectionHeader number={++sectionNum} title="Manejo de Correção (Calagem)" subtitle="Realizar preferencialmente nos meses de Junho/Julho (Pós-Colheita/Repouso)" />
              <div className="overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-gray-100">
                      {['NC (t/ha)', 'Produto', 'PRNT', `Total p/ ${hectares > 0 ? hectares.toFixed(1) : '?'} ha`, 'Custo Total'].map(h => (
                        <th key={h} className="px-2 py-1.5 font-semibold text-gray-600 uppercase tracking-wide text-center">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="px-2 py-2 text-center font-bold text-emerald-700">{limingData.nc.toFixed(2)}</td>
                      <td className="px-2 py-2 text-center font-medium text-gray-800">{limingData.productName || 'Calcário Calcítico'}</td>
                      <td className="px-2 py-2 text-center text-gray-600">PRNT {limingData.prnt}%</td>
                      <td className="px-2 py-2 text-center text-gray-700">
                        {(limingData.nc * hectares).toFixed(2)} t ({((limingData.nc * hectares) * 1000).toFixed(0)} kg)
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-gray-800">
                        {limingData.costPerHa > 0 ? (
                          <><span>{fmtCurrency(limingData.costPerHa * hectares)}</span><br /><span className="text-[8px] text-gray-500">{fmtCurrency(limingData.costPerHa)}/ha</span></>
                        ) : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[9px] text-gray-500 mt-1.5 italic">
                Método: Aplicação em área total ou na projeção da saia, incorporando se possível. Parcelar em 2 aplicações quando NC {'>'} 2 t/ha.
              </p>
            </div>
          )}

          {/* ─── DEMANDA NUTRICIONAL ─── */}
          <div className="break-inside-avoid">
            <SectionHeader
              number={++sectionNum}
              title="Demanda Nutricional da Lavoura"
              subtitle={`Demanda por ${isFormationPhase ? 'fase de formação' : 'produção'} — Ref. INCAPER/EMBRAPA (${phaseLabel})`}
            />
            <div className="overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-gray-100">
                    {['Nitrogênio (N)', 'Fósforo (P₂O₅)', 'Potássio (K₂O)', 'Enxofre (S)'].map(h => (
                      <th key={h} className="px-2 py-2 font-bold text-gray-700 text-center border-r border-gray-200 last:border-r-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    {[
                      { val: demandN, color: 'text-blue-700' },
                      { val: demandP, color: 'text-amber-700' },
                      { val: demandK, color: 'text-emerald-700' },
                      { val: demandS, color: 'text-purple-700' },
                    ].map((d, i) => (
                      <td key={i} className="px-2 py-2 text-center border-r border-gray-200 last:border-r-0">
                        <p className={cn('text-base font-bold', d.color)}>{d.val.toFixed(0)} kg/ha</p>
                        {plantsPerHa > 0 && <p className="text-[8px] text-gray-400">{((d.val * 1000) / plantsPerHa).toFixed(1)} g/pl × {plantsPerHa.toLocaleString('pt-BR')} pl/ha</p>}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {isFormationPhase ? (
              <p className="text-[8px] text-gray-400 mt-1 italic">g/planta. Não se utiliza extrapolação por sacas nesta fase.</p>
            ) : (
              <p className="text-[8px] text-gray-400 mt-1 italic">
                Fator de extração S: 0,4 kg/saca · Demanda S = {sacas} sc × 0,4 = {demandS.toFixed(1)} kg/ha.
                {soil && soil.s > 10 ? ' Solo com S adequado — aporte via Sulfato de Amônia geralmente suficiente.' : ' Atenção: S do solo baixo — considerar fontes sulfatadas (ex: Sulfato de Amônia, Gesso Agrícola).'}
              </p>
            )}
          </div>

        </div>{/* end page 1 */}

        {/* ═══════════════════ PÁGINA 2 — CRONOGRAMA SOLO ═══════════════════ */}
        {hasLanco && (
          <div className="p-3 sm:p-5 space-y-3 border-t-4 border-emerald-600">
            <div className="break-inside-avoid">
              <div className="mb-2">
                <h2 className="text-sm font-bold text-emerald-700 uppercase tracking-wide">Cronograma de Adubação Híbrido (Operacional)</h2>
                <p className="text-[9px] text-gray-500 italic">Segregado por método de aplicação · {coffeeLabel}</p>
              </div>
              <AlertBox variant="info">
                <strong>Plano Híbrido:</strong> Os produtos foram classificados automaticamente por método de aplicação.
                {coffeeType === 'arabica' ? ' Para Arábica, produtos solúveis são aplicados via Jato com Trator (não fertirrigação).' : ' Para Conilon, produtos solúveis preferencialmente via fertirrigação.'}
              </AlertBox>
            </div>

            <div className="break-inside-avoid">
              <SectionHeader number={++sectionNum} title={`Solo (A Lanço) (${lancoProductTotals.size})`} subtitle="Aplicar na projeção da saia do cafeeiro com trator ou manualmente." />

              {coffeeType === 'arabica' && (
                <AlertBox variant="warning">
                  O uso de NPK granulado a lanço reduz automaticamente em 70% a necessidade de macronutrientes (N, P, K) via pulverização foliar, mantendo 100% da suplementação de micronutrientes.
                </AlertBox>
              )}

              <div className="mt-2 overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-amber-50">
                      {['Mês', 'Fase Fenológica', 'Produto', `Kg Total (${fmt2(hectares)} ha)`, 'g/planta'].map(h => (
                        <th key={h} className="px-2 py-1.5 font-semibold text-amber-800 uppercase tracking-wide text-left last:text-center">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lancoData.map((bm, bIdx) => {
                      if (bm.actions.length === 0) {
                        return (
                          <tr key={bIdx} className={bIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-1.5 font-bold text-gray-700">{bm.label}</td>
                            <td className="px-2 py-1.5 text-gray-500 italic" colSpan={3}>{bm.phase}</td>
                            <td className="px-2 py-1.5 text-center text-gray-400 text-[9px]">Nenhuma operação de solo</td>
                          </tr>
                        );
                      }
                      return bm.actions.map((action, aIdx) => (
                        <tr key={`${bIdx}-${aIdx}`} className={bIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {aIdx === 0 && (
                            <>
                              <td className="px-2 py-1.5 font-bold text-gray-700 whitespace-nowrap" rowSpan={bm.actions.length}>{bm.label}</td>
                              <td className="px-2 py-1.5 text-gray-600 text-[9px]" rowSpan={bm.actions.length}>{bm.phase}</td>
                            </>
                          )}
                          <td className="px-2 py-1.5 font-medium text-gray-800">{action.productName}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-amber-700">{fmt2(action.kgHa * hectares)}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-emerald-700">{action.gPlanta > 0 ? `${action.gPlanta.toFixed(1)} g` : '—'}</td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>

              {/* Per-product annual totals */}
              {lancoProductTotals.size > 0 && (
                <div className="mt-2">
                  <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-wide mb-1">Total Anual por Produto</p>
                  <div className="overflow-auto rounded-lg border border-gray-200">
                    <table className="w-full text-[10px]">
                      <tbody>
                        {Array.from(lancoProductTotals.entries()).map(([name, totals], i) => (
                          <tr key={name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-1 font-medium text-gray-800">{name}</td>
                            <td className="px-2 py-1 text-center text-amber-700 font-bold">{fmt2(totals.kgHa * hectares)} kg</td>
                            <td className="px-2 py-1 text-center text-emerald-700 font-bold">{totals.gPlanta > 0 ? `${totals.gPlanta.toFixed(1)} g/pl` : '—'}</td>
                            {hectares > 0 && (
                              <td className="px-2 py-1 text-center text-gray-500">{Math.ceil(totals.kgHa * hectares / 50)} × 50kg</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════ CRONOGRAMA MENSAL DE FERTIRRIGAÇÃO (CONILON) ═══════════════════ */}
        {hybridPlan && ((hybridPlan.productsByMethod['fertirrigacao'] || []).length > 0 || (hybridPlan.productsByMethod['foliar'] || []).length > 0) && (
          <div className="p-3 sm:p-5 space-y-3 border-t-4 border-emerald-600">
            <div className="break-inside-avoid">
              <SectionHeader
                number={++sectionNum}
                title="Cronograma Mensal de Aplicação — Compatibilidade da Calda"
                subtitle="Fertirrigação + Foliar · Produtos agrupados por compatibilidade química · Doses em kg/ha"
              />
              <p className="text-[9px] text-gray-500 mb-2 italic">
                Dividir a dose mensal em <strong>4 aplicações semanais</strong> via venturi ou bomba dosadora. Foliares em grupo separado.
              </p>
              <FertigationPivotTable hybridPlan={hybridPlan} hectares={hectares} totalPlants={totalPlants ?? 0} />
            </div>
          </div>
        )}

        {/* ═══════════════════ PÁGINAS 3-4 — PROGRAMA FOLIAR ═══════════════════ */}
        {hasFoliar && (
          <div className="p-3 sm:p-5 space-y-3 border-t-4 border-emerald-600">
            <div className="break-inside-avoid">
              <div className="mb-2">
                <h2 className="text-sm font-bold text-emerald-700 uppercase tracking-wide">Programa Estratégico de Pulverização Foliar</h2>
                <p className="text-[9px] text-gray-500 italic">Timeline fenológica · {coffeeLabel} · Otimização de passadas de máquina</p>
              </div>

              {/* Equipment header */}
              <div className="grid grid-cols-3 gap-0 overflow-auto rounded-lg border border-gray-200 text-[10px]">
                <div className="px-2 sm:px-3 py-2 border-r border-gray-200 text-center">
                  <p className="text-[8px] text-gray-500 uppercase tracking-wide">Equipamento</p>
                  <p className="font-bold text-gray-800 text-[9px] sm:text-[10px]">{equipment}</p>
                </div>
                <div className="px-2 sm:px-3 py-2 border-r border-gray-200 text-center">
                  <p className="text-[8px] text-gray-500 uppercase tracking-wide">Capacidade</p>
                  <p className="font-bold text-gray-800">{tankCapacity.toLocaleString('pt-BR')} L</p>
                </div>
                <div className="px-2 sm:px-3 py-2 text-center">
                  <p className="text-[8px] text-gray-500 uppercase tracking-wide">Calda/ha</p>
                  <p className="font-bold text-gray-800">{caldaPerHa.toLocaleString('pt-BR')} L/ha</p>
                </div>
              </div>

              <p className="text-[9px] text-gray-500 mt-1.5 italic">
                Os produtos foliares e defensivos foram organizados por fase fenológica para concentrar aplicações compatíveis na mesma calda, reduzindo o número de passadas de máquina e otimizando mão de obra e diesel.
              </p>
            </div>

            {/* Phases */}
            <SectionHeader number={++sectionNum} title="Planejamento Foliar por Fase Fenológica" />
            {foliarPhaseData.map((phase, phaseIdx) => (
              <div key={phase.id} className="break-inside-avoid">
                {/* Phase header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-700 rounded-t-lg">
                  <span className="text-base">{phase.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wide">{phase.name}</p>
                    <p className="text-[9px] text-emerald-200">
                      {phase.months.map(m => ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m-1]).join(' / ')}
                    </p>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-b-lg p-2 space-y-1">
                  <p className="text-[9px] text-gray-600 italic mb-1.5">
                    <strong>Objetivo:</strong> {phase.objetivo}
                  </p>
                  <div className="overflow-auto rounded border border-gray-100">
                    {/* Mobile: compact stacked rows */}
                    <div className="sm:hidden space-y-1">
                      {phase.products.map((p, pIdx) => {
                        const kgHaStr = p.kgHa >= 1 ? `${p.kgHa.toFixed(2)} kg` : `${(p.kgHa * 1000).toFixed(0)} g`;
                        const gPlantaStr = p.gPlanta >= 1 ? `${p.gPlanta.toFixed(1)} g` : `${(p.gPlanta * 1000).toFixed(0)} mg`;
                        return (
                          <div key={pIdx} className="flex items-center justify-between px-1.5 py-1 rounded bg-gray-50 text-[9px]">
                            <span className="font-medium text-gray-800 truncate flex-1 mr-2">{p.name}</span>
                            <span className="font-bold text-amber-700 shrink-0 mr-2">{kgHaStr}/ha</span>
                            <span className="text-gray-500 shrink-0">{p.tankDose}/tk</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Desktop: table */}
                    <table className="hidden sm:table w-full text-[9px]">
                      <thead>
                        <tr className="bg-gray-100">
                          {['Produto', 'Dose/ha (Fase)', 'g/Planta', 'Dosagem/Tanque'].map(h => (
                            <th key={h} className="px-2 py-1 font-semibold text-gray-600 uppercase tracking-wide text-left last:text-center">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {phase.products.map((p, pIdx) => {
                          const kgHaStr = p.kgHa >= 1 ? `${p.kgHa.toFixed(2)} kg` : `${(p.kgHa * 1000).toFixed(0)} g`;
                          const gPlantaStr = p.gPlanta >= 1 ? `${p.gPlanta.toFixed(1)} g` : `${(p.gPlanta * 1000).toFixed(0)} mg`;
                          return (
                            <tr key={pIdx} className={pIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-2 py-1 font-medium text-gray-800">{p.name}</td>
                              <td className="px-2 py-1 font-bold text-amber-700">{kgHaStr}</td>
                              <td className="px-2 py-1 text-emerald-700">{gPlantaStr}</td>
                              <td className="px-2 py-1 text-center text-gray-600">{p.tankDose}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}

            {/* Operational summary */}
            <div className="break-inside-avoid p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px]">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-emerald-700">{foliarPhaseData.length}</p>
                  <p className="text-[8px] text-gray-500 uppercase">Fases Ativas</p>
                </div>
                <div className="text-center border-x border-emerald-200">
                  <p className="text-lg sm:text-xl font-bold text-emerald-700">
                    {foliarPhaseData.reduce((sum, p) => sum + p.products.length, 0) * 2}
                  </p>
                  <p className="text-[8px] text-gray-500 uppercase">Passadas/Ano</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-emerald-700">
                    {new Set(foliarPhaseData.flatMap(p => p.products.map(pr => pr.name))).size}
                  </p>
                  <p className="text-[8px] text-gray-500 uppercase">Produtos Foliares</p>
                </div>
              </div>
              <p className="text-[9px] text-emerald-800 italic">
                Economia Operacional: operações casadas por fase fenológica consolidam produtos em {foliarPhaseData.length} fases, reduzindo custos de mão de obra e diesel em até 40%.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════ PÁGINA 5 — COMPATIBILIDADE + COMPRAS ═══════════════════ */}
        <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 border-t-4 border-emerald-600">

          {/* Compatibilidade */}
          {activeGroups.length > 0 && (
            <div className="break-inside-avoid">
              <SectionHeader number={++sectionNum} title="Compatibilidade da Calda — Pulverização" subtitle="Grupos compatíveis e ordem de mistura recomendada" />

              {/* Compatible groups */}
              <div className="space-y-2 mb-3">
                {activeGroups.map(([group, prods]) => {
                  const info = GROUP_INFO[group];
                  return (
                    <div key={group} className="flex items-start gap-2 p-2 rounded-lg border border-gray-200 bg-gray-50">
                      <GroupBadge group={group} />
                      <div>
                        <p className="text-[10px] font-semibold text-gray-700">{info.label}</p>
                        <p className="text-[9px] text-gray-500 mb-0.5">{info.desc}</p>
                        <p className="text-[9px] text-gray-700">{prods.map(p => p.name).join(', ')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mix order */}
              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50">
                <p className="text-[10px] font-bold text-blue-800 mb-1.5">Ordem de Mistura Recomendada (Pulverização):</p>
                <ol className="text-[9px] text-blue-700 space-y-0.5 list-decimal list-inside">
                  <li>Água limpa (½ do volume)</li>
                  {activeGroups.filter(([g]) => g === 'C').length > 0 && (
                    <li>{activeGroups.find(([g]) => g === 'C')?.[1].map(p => p.name).join(', ')} (Grupo C — Neutros)</li>
                  )}
                  {activeGroups.filter(([g]) => g === 'B').length > 0 && (
                    <li>{activeGroups.find(([g]) => g === 'B')?.[1].map(p => p.name).join(', ')} (Grupo B — Sulfatos/Fosfatos)</li>
                  )}
                  {activeGroups.filter(([g]) => g === 'A').length > 0 && (
                    <li>Último — {activeGroups.find(([g]) => g === 'A')?.[1].map(p => p.name).join(', ')} (Grupo A — Cálcio — NÃO misturar com B)</li>
                  )}
                  <li>Completar volume de água e agitar</li>
                </ol>
              </div>
            </div>
          )}

          {/* Lista de Compras */}
          {shoppingItems.length > 0 && (
            <div className="break-inside-avoid">
              <SectionHeader
                number={++sectionNum}
                title={`Lista de Compras & Custos (${hectares.toFixed(1)} ha)`}
                subtitle="Quantidades totais e custos derivados do cronograma mensal"
              />
              {/* Mobile: stacked cards */}
              <div className="sm:hidden space-y-1.5">
                {shoppingItems.map((item, idx) => {
                  const totalKg = item.dosePerHa * hectares;
                  const sacos = item.tamanhoUnidade > 0
                    ? `${Math.ceil(totalKg / item.tamanhoUnidade)} × ${item.tamanhoUnidade} ${item.medida}`
                    : null;
                  return (
                    <div key={idx} className="p-2 rounded-lg border border-gray-200 bg-gray-50">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-[10px] font-semibold text-gray-800 leading-tight">{item.name}</p>
                        <p className="text-[10px] font-bold text-emerald-700 shrink-0">{item.costPerHa > 0 ? fmtCurrency(item.costPerHa) + '/ha' : '—'}</p>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[9px] text-gray-500">
                        <span>{item.dosePerHa.toFixed(1)} kg/ha</span>
                        <span>{totalKg.toFixed(0)} kg total</span>
                        {sacos && <span>{sacos}</span>}
                      </div>
                    </div>
                  );
                })}
                <div className="p-2.5 rounded-lg bg-emerald-700 text-white flex items-center justify-between">
                  <span className="text-xs font-bold">TOTAL ADUBAÇÃO</span>
                  <span className="text-sm font-bold">{fmtCurrency(grandTotalCost)} /ha</span>
                </div>
              </div>
              {/* Desktop: full table */}
              <div className="hidden sm:block overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="bg-gray-100">
                      {['Produto Comercial', 'Categoria', 'Dose/ha', `Qtd. Total (${hectares.toFixed(0)} ha)`, 'Sacos', 'R$/kg', 'R$/ha'].map(h => (
                        <th key={h} className="px-2 py-1.5 font-semibold text-gray-600 uppercase tracking-wide text-left last:text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shoppingItems.map((item, idx) => {
                      const totalKg = item.dosePerHa * hectares;
                      const sacos = item.tamanhoUnidade > 0
                        ? `${Math.ceil(totalKg / item.tamanhoUnidade)} × ${item.tamanhoUnidade} ${item.medida}`
                        : '—';
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1 font-medium text-gray-800">{item.name}</td>
                          <td className="px-2 py-1 text-gray-500">{item.tipoProduto}</td>
                          <td className="px-2 py-1 text-gray-700">{item.dosePerHa.toFixed(1)} kg</td>
                          <td className="px-2 py-1 text-gray-700">{totalKg.toFixed(1)} kg</td>
                          <td className="px-2 py-1 text-gray-600">{sacos}</td>
                          <td className="px-2 py-1 text-gray-600">{item.pricePerKg > 0 ? fmtCurrency(item.pricePerKg) : '—'}</td>
                          <td className="px-2 py-1 text-right font-bold text-gray-800">{item.costPerHa > 0 ? fmtCurrency(item.costPerHa) : '—'}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-emerald-700 text-white">
                      <td colSpan={6} className="px-2 py-2 font-bold text-sm">TOTAL ADUBAÇÃO</td>
                      <td className="px-2 py-2 text-right font-bold text-sm">{fmtCurrency(grandTotalCost)} /ha</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ BALANÇO NUTRICIONAL — DEMANDA vs FORNECIDO ═══ */}
          {nutrientBalance && nutrientBalance.length > 0 && (() => {
            const hasLanco = nutrientBalance.some(item => (item.supplyLanco ?? 0) > 0.01);
            const hasFertig = nutrientBalance.some(item => (item.supplyFertigation ?? 0) > 0.01);
            const hasSpray = nutrientBalance.some(item => (item.supplySpraying ?? 0) > 0.01);
            return (
            <div className="break-inside-avoid">
              <SectionHeader
                number={++sectionNum}
                title="Balanço Nutricional — Demanda vs Fornecido"
                subtitle={`${totalPlants.toLocaleString('pt-BR')} plantas · ${hectares.toFixed(2).replace('.', ',')} ha · Valores totais para o talhão`}
              />
              <div className="w-full overflow-x-auto block rounded-lg border border-gray-200">
                <table className="w-full text-[9px] min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Nutriente</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Dem. Mín<br/><span className="text-[7px] font-normal">(Kg)</span></th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Dem. Máx<br/><span className="text-[7px] font-normal">(Kg)</span></th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Fornecido<br/><span className="text-[7px] font-normal">(Kg)</span></th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Fornecido<br/><span className="text-[7px] font-normal">(kg/ha)</span></th>
                      {hasLanco && (
                        <th className="px-2 py-1.5 text-center font-semibold text-emerald-700 uppercase tracking-wide whitespace-nowrap">🟢 Lanço<br/><span className="text-[7px] font-normal">(Kg)</span></th>
                      )}
                      {hasFertig && (
                        <th className="px-2 py-1.5 text-center font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap">🔵 Fertirrig.<br/><span className="text-[7px] font-normal">(Kg)</span></th>
                      )}
                      {hasSpray && (
                        <th className="px-2 py-1.5 text-center font-semibold text-orange-700 uppercase tracking-wide whitespace-nowrap">🟠 Pulveriz.<br/><span className="text-[7px] font-normal">(Kg)</span></th>
                      )}
                      {plantsPerHa > 0 && (
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Dem. Máx<br/><span className="text-[7px] font-normal">(g/planta)</span></th>
                      )}
                      {plantsPerHa > 0 && (
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Fornecido<br/><span className="text-[7px] font-normal">(g/planta)</span></th>
                      )}
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Saldo<br/><span className="text-[7px] font-normal">(Kg)</span></th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nutrientBalance.map((item, idx) => {
                      const demMinTotal = item.demandMin * hectares;
                      const demMaxTotal = item.demand * hectares;
                      const supplyTotal = item.supply * hectares;
                      const saldoTotal = supplyTotal - demMaxTotal;
                      const coveragePct = demMaxTotal > 0 ? (supplyTotal / demMaxTotal) * 100 : 0;
                      const tolerance = Math.max(0.1, demMaxTotal * 0.01);
                      const isDeficit = saldoTotal < -tolerance;
                      const isExcess = coveragePct > 120;
                      const isFull = !isDeficit && !isExcess;
                      const gPerPlantDemand = totalPlants > 0 ? (demMaxTotal * 1000) / totalPlants : 0;
                      const gPerPlantSupply = totalPlants > 0 ? (supplyTotal * 1000) / totalPlants : 0;
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1.5 font-bold text-gray-800 whitespace-nowrap">{item.nutrient}</td>
                          <td className="px-2 py-1.5 text-center text-gray-600 tabular-nums whitespace-nowrap">{demMinTotal.toFixed(1)}</td>
                          <td className="px-2 py-1.5 text-center text-gray-700 tabular-nums whitespace-nowrap">{demMaxTotal.toFixed(1)}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-gray-800 tabular-nums whitespace-nowrap">{supplyTotal.toFixed(1)}</td>
                          <td className="px-2 py-1.5 text-center text-gray-700 tabular-nums whitespace-nowrap">{item.supply.toFixed(1)}</td>
                          {hasLanco && (
                            <td className="px-2 py-1.5 text-center text-emerald-700 tabular-nums whitespace-nowrap">{(item.supplyLanco ?? 0) > 0.01 ? ((item.supplyLanco ?? 0) * hectares).toFixed(1) : '—'}</td>
                          )}
                          {hasFertig && (
                            <td className="px-2 py-1.5 text-center text-blue-700 tabular-nums whitespace-nowrap">{(item.supplyFertigation ?? 0) > 0.01 ? ((item.supplyFertigation ?? 0) * hectares).toFixed(1) : '—'}</td>
                          )}
                          {hasSpray && (
                            <td className="px-2 py-1.5 text-center text-orange-700 tabular-nums whitespace-nowrap">{(item.supplySpraying ?? 0) > 0.01 ? ((item.supplySpraying ?? 0) * hectares).toFixed(1) : '—'}</td>
                          )}
                          {plantsPerHa > 0 && (
                            <td className="px-2 py-1.5 text-center text-gray-600 tabular-nums whitespace-nowrap">{gPerPlantDemand.toFixed(1)}</td>
                          )}
                          {plantsPerHa > 0 && (
                            <td className="px-2 py-1.5 text-center font-bold text-gray-800 tabular-nums whitespace-nowrap">{gPerPlantSupply.toFixed(1)}</td>
                          )}
                          <td className={cn(
                            'px-2 py-1.5 text-center font-bold tabular-nums whitespace-nowrap',
                            isDeficit ? 'text-red-600' : isExcess ? 'text-amber-600' : 'text-emerald-600'
                          )}>
                            {saldoTotal >= 0 ? '+' : ''}{saldoTotal.toFixed(1)}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <span className={cn(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold',
                              isDeficit ? 'bg-red-100 text-red-700' :
                              isExcess ? 'bg-amber-100 text-amber-700' :
                              isFull ? 'bg-emerald-100 text-emerald-700' :
                              'bg-blue-100 text-blue-700'
                            )}>
                              {isDeficit ? '⚠️ Déficit' : isExcess ? '⬆️ Excesso' : '✅ Pleno'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[8px] text-gray-400 mt-1">
                Valores totais = kg/ha × {hectares.toFixed(2).replace('.', ',')} ha · g/planta = Kg total × 1000 ÷ {totalPlants.toLocaleString('pt-BR')} plantas · Dem. Mín = 80% da Máx · Saldo = Fornecido − Dem. Máx
                {(hasLanco || hasFertig || hasSpray) && ' · 🟢 Lanço · 🔵 Fertirrigação · 🟠 Pulverização'}
              </p>
            </div>
            );
          })()}

          {/* Recomendações Técnicas */}
          <div className="break-inside-avoid">
            <SectionHeader number={++sectionNum} title="Recomendações Técnicas e Cuidados" />
            <div className="grid grid-cols-1 gap-2">
              <div className="p-2 rounded border border-gray-200 bg-gray-50">
                <p className="text-[9px] font-bold text-gray-700 mb-1">Deficiência da Adubação</p>
                <ul className="text-[9px] text-gray-600 space-y-0.5">
                  <li>• <strong>Local:</strong> Aplicar na projeção da copa (saia), distância de 15–20 cm do tronco.</li>
                  <li>• <strong>Umidade:</strong> Aplicar com solo úmido. Respeitar a solubilidade máxima na fertirrigação.</li>
                  {plantsPerHa > 0 && <li>• <strong>Parcelamento:</strong> Doses calculadas para {plantsPerHa.toLocaleString('pt-BR')} pl/ha.</li>}
                </ul>
              </div>
              {hasFoliar && (
                <div className="p-2 rounded border border-gray-200 bg-gray-50">
                  <p className="text-[9px] font-bold text-gray-700 mb-1">Manejo Foliar (Complementar)</p>
                  <ul className="text-[9px] text-gray-600 space-y-0.5">
                    <li>• <strong>Set/Out (Florada):</strong> Essencial Boro (0,3%) e Zinco (0,5%) para pegamento da florada.</li>
                    <li>• <strong>Fev/Mar (Enchimento):</strong> Monitorar K foliar. Complementar com K foliar para peso de grão.</li>
                  </ul>
                </div>
              )}
              <AlertBox variant="warning">
                <strong>Segurança:</strong> Uso obrigatório de EPI no manuseio de defensivos e fertilizantes. Respeitar carência e reentrada.
              </AlertBox>
            </div>
          </div>
        </div>

        {/* ═══════════════════ PÁGINA 6 — ANÁLISE ECONÔMICA + RODAPÉ ═══════════════════ */}
        <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 border-t-4 border-emerald-600">
          <div className="break-inside-avoid">
            <SectionHeader number={++sectionNum} title="Análise Econômica da Adubação" subtitle="Custos segregados por operação — Solo, Foliar e Defensivos" />

            {/* KPI boxes */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="col-span-2 p-3 rounded-lg bg-emerald-700 text-white text-center">
                <p className="text-[9px] uppercase tracking-wide text-emerald-200">Custo Total por Hectare</p>
                <p className="text-2xl font-bold">{totalCostPerHa > 0 ? fmtCurrency(totalCostPerHa) : '—'}</p>
                {hectares > 0 && totalCostPerHa > 0 && (
                  <p className="text-[9px] text-emerald-200 mt-0.5">
                    Investimento em implantação · {hectares.toFixed(1)} ha = {fmtCurrency(totalCostPerHa * hectares)}
                  </p>
                )}
              </div>

              {limingCostPerHa > 0 && (
                <div className="p-2.5 rounded-lg border border-gray-200 text-center">
                  <p className="text-[8px] text-gray-500 uppercase tracking-wide">Calagem</p>
                  <p className="text-base font-bold text-gray-800">{fmtCurrency(limingCostPerHa)}/ha</p>
                  {limingData && <p className="text-[8px] text-gray-400">{limingData.productName || 'Calcário'} · {limingData.nc.toFixed(2)} t/ha</p>}
                </div>
              )}

              {fertCostPerHa > 0 && (
                <div className="p-2.5 rounded-lg border border-gray-200 text-center">
                  <p className="text-[8px] text-gray-500 uppercase tracking-wide">Adubação de Solo / Foliar</p>
                  <p className="text-base font-bold text-gray-800">{fmtCurrency(fertCostPerHa)}/ha</p>
                </div>
              )}

              {treatmentCostPerHa > 0 && (
                <div className="p-2.5 rounded-lg border border-gray-200 text-center">
                  <p className="text-[8px] text-gray-500 uppercase tracking-wide">Defensivos</p>
                  <p className="text-base font-bold text-gray-800">{fmtCurrency(treatmentCostPerHa)}/ha</p>
                </div>
              )}
            </div>

            {/* Cost breakdown table */}
            {fertCostItems.length > 0 && (
              <div className="overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="bg-gray-100">
                      {['Produto', 'kg/ha', 'R$/kg', 'R$/ha'].map(h => (
                        <th key={h} className="px-2 py-1.5 font-semibold text-gray-600 uppercase tracking-wide text-left last:text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fertCostItems.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-2 py-1 text-gray-700">{item.name}</td>
                        <td className="px-2 py-1 text-gray-700">{item.dosePerHa.toFixed(1)}</td>
                        <td className="px-2 py-1 text-gray-600">{fmtCurrency(item.pricePerKg)}</td>
                        <td className="px-2 py-1 text-right font-medium text-gray-800">{fmtCurrency(item.costPerHa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Economic summary — 2x2 grid on mobile, table on sm+ */}
            <div className="mt-3 sm:hidden grid grid-cols-2 gap-1.5">
              {[
                { label: 'Custo / ha', value: totalCostPerHa > 0 ? fmtCurrency(totalCostPerHa) : '—', bold: true },
                { label: 'Custo / Saca', value: costPerSaca > 0 ? fmtCurrency(costPerSaca) : '—', bold: true },
                { label: 'Área Total', value: `${hectares.toFixed(1)} ha`, bold: false },
                { label: 'Receita / ha', value: revenuePerHa > 0 ? fmtCurrency(revenuePerHa) : '—', bold: true, green: true },
              ].map((item, i) => (
                <div key={i} className="p-2 rounded-lg border border-gray-200 text-center">
                  <p className="text-[8px] text-gray-500 uppercase tracking-wide">{item.label}</p>
                  <p className={cn('text-sm font-bold', item.green ? 'text-emerald-700' : 'text-gray-800')}>{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 hidden sm:block overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-gray-100">
                    {['Custo / ha', 'Custo / Saca', 'Total Área', 'Receita Bruta / ha'].map(h => (
                      <th key={h} className="px-2 py-2 font-semibold text-gray-600 uppercase tracking-wide text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="px-2 py-2 text-center font-bold text-gray-800">{totalCostPerHa > 0 ? fmtCurrency(totalCostPerHa) : '—'}</td>
                    <td className="px-2 py-2 text-center font-bold text-gray-800">{costPerSaca > 0 ? fmtCurrency(costPerSaca) : '—'}</td>
                    <td className="px-2 py-2 text-center text-gray-700">{hectares.toFixed(1)} ha</td>
                    <td className="px-2 py-2 text-center font-bold text-emerald-700">{revenuePerHa > 0 ? fmtCurrency(revenuePerHa) : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {isFormationPhase && (
              <p className="text-[9px] text-gray-400 italic text-center mt-1">Fase de formação — sem produção estimada</p>
            )}

            {!isFormationPhase && revenuePerHa > 0 && (
              <AlertBox variant={profitPerHa > 0 ? 'success' : 'warning'}>
                <strong>Margem estimada:</strong> Receita bruta {fmtCurrency(revenuePerHa)}/ha − Custo {fmtCurrency(totalCostPerHa)}/ha = <strong>{fmtCurrency(profitPerHa)}/ha</strong>
                {profitPerHa > 0 ? ' ✅ Margem positiva' : ' ⚠️ Custo elevado'}
              </AlertBox>
            )}
          </div>

          {/* Sources */}
          <div className="text-[8px] text-gray-400 italic">
            Fontes: EMBRAPA / INCAPER / 5ª Aproximação / ESALQ / UFES
          </div>

          {/* Footer with signatures */}
          <div className="break-inside-avoid pt-3 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src={LOGO_URL} alt="Solo V3" className="h-8 sm:h-10 w-auto object-contain opacity-70" />
                <div>
                  <p className="text-[9px] font-semibold text-gray-700">Solo V3 Tecnologia Agrícola</p>
                  <p className="text-[8px] text-gray-400">Relatório gerado em {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Signature boxes */}
              <div className="flex gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="w-24 sm:w-32 border-b border-gray-400 mb-1 mt-4 sm:mt-6" />
                  <p className="text-[8px] text-gray-500">Responsável Técnico</p>
                  {isConsultor && profileName && (
                    <p className="text-[8px] text-gray-600 font-medium">{profileName}</p>
                  )}
                  {isConsultor && creaArt && (
                    <p className="text-[8px] text-gray-400">{creaArt}</p>
                  )}
                </div>
                <div className="text-center">
                  <div className="w-24 sm:w-32 border-b border-gray-400 mb-1 mt-4 sm:mt-6" />
                  <p className="text-[8px] text-gray-500">Produtor</p>
                  {profileName && (
                    <p className="text-[8px] text-gray-600 font-medium">{profileName}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CoffeeCompleteReport.displayName = 'CoffeeCompleteReport';
