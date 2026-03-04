/**
 * CoffeeSimplifiedReport — Relatório simplificado para o produtor rural.
 * Contém APENAS:
 *   1. Cabeçalho com informações da lavoura
 *   2. Cronograma de Adubação a Lanço (bimestral, g/planta)
 *   3. Cronograma Mensal de Fertirrigação
 *   4. Compatibilidade de Calda — Fertirrigação e Composição por Tanque
 *   5. Lista de Compras & Custos (kg, sacos, valor)
 *
 * Funciona para Conilon E Arábica.
 */

import { forwardRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Coffee, Sprout, Target, Shield, User, CalendarDays,
  FlaskConical, AlertCircle, ShoppingCart, Leaf,
} from 'lucide-react';
import { LOGO_URL } from '@/lib/constants';
import {
  APPLICATION_METHOD_INFO,
  isNPKGranularFormulado,
  type ApplicationMethodType,
  type HybridPlan,
  type MonthlyPlan,
} from '@/lib/coffeeHybridPlan';
import { getPhaseLabel, getPhaseEmoji } from '@/lib/coffeeRecommendationEngine';
import { classifyInsumo, GROUP_INFO, type CompatGroup, type InsumoForClassification } from '@/lib/compatibilityEngine';
import { FertigationPivotTable } from './FertigationPivotTable';
import type { CoffeeType } from '@/contexts/CoffeeContext';

// ─── Helpers ─────────────────────────────────────────────────
function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ─── Section Wrapper ─────────────────────────────────────────
function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="break-inside-avoid mb-4">
      <div className="flex items-center gap-2 mb-2 border-b-2 border-emerald-600 pb-1.5">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold shrink-0">{number}</span>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ─── GroupBadge ───────────────────────────────────────────────
function GroupBadge({ group }: { group: CompatGroup }) {
  const info = GROUP_INFO[group];
  return (
    <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold border', info.badgeColor)}>
      {group}
    </span>
  );
}

// ─── Props ───────────────────────────────────────────────────
export interface NutrientBalanceItem {
  nutrient: string;
  demandMin: number;
  demand: number;
  supply: number;
  /** Per-source breakdown (kg/ha) — only populated sources are shown */
  supplyLanco?: number;
  supplyFertigation?: number;
  supplySpraying?: number;
  unit: string;
}

export interface SimplifiedReportProps {
  coffeeType: CoffeeType;
  coffeeLabel: string;
  safraLabel: string;
  profileName: string | null;
  isConsultor: boolean;
  creaArt: string | null;
  telefone: string | null;
  hectares: number;
  plantsPerHa: number;
  totalPlants: number;
  sacas: number;
  isFormationPhase: boolean;
  hybridPlan: HybridPlan | null;
  // Shopping list data
  shoppingItems: ShoppingItem[];
  grandTotalCost: number;
  // Compatibility data from fertigation/spraying classified products
  allClassifiedProducts: ClassifiedProductSimple[];
  // Nutrient balance for audit
  nutrientBalance?: NutrientBalanceItem[];
}

export interface ShoppingItem {
  name: string;
  tipoProduto: string;
  dosePerHa: number;
  totalKg: number;
  tamanhoUnidade: number;
  medida: string;
  pricePerKg: number;
  costPerHa: number;
}

export interface ClassifiedProductSimple {
  id: string;
  name: string;
  type: string;
  group: CompatGroup;
}

// ═════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════
export const CoffeeSimplifiedReport = forwardRef<HTMLDivElement, SimplifiedReportProps>(
  (props, ref) => {
    const {
      coffeeType, coffeeLabel, safraLabel, profileName, isConsultor, creaArt, telefone,
      hectares, plantsPerHa, totalPlants, sacas, isFormationPhase, hybridPlan,
      shoppingItems, grandTotalCost, allClassifiedProducts, nutrientBalance,
    } = props;

    let sectionNum = 0;
    const fmt2 = (v: number) => v < 0.01 ? '—' : v.toFixed(2).replace('.', ',');

    // ─── Solo a Lanço bimonthly data ─────────────────────────
    const lancoData = useMemo(() => {
      if (!hybridPlan) return null;
      const lancoProducts = hybridPlan.productsByMethod['solo_lanco'] || [];
      if (lancoProducts.length === 0) return null;

      const BIMONTHLY = [
        { label: 'Jul/Ago', months: [7, 8], phase: 'Pós-Colheita / Calagem' },
        { label: 'Set/Out', months: [9, 10], phase: 'Pré-Florada / Fosfatagem' },
        { label: 'Nov/Dez', months: [11, 12], phase: 'Chumbinho / Expansão' },
        { label: 'Jan/Fev', months: [1, 2], phase: 'Enchimento de Grãos' },
        { label: 'Mar/Abr', months: [3, 4], phase: 'Fim de Enchimento' },
        { label: 'Mai/Jun', months: [5, 6], phase: '🍒 Colheita — Sem operação' },
      ];

      return BIMONTHLY.map(bm => {
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

    // ─── Foliar data by phenological phase ───────────────────
    // (foliarPhaseData removed — simplified report scope)

    // ─── Compatibility groups ────────────────────────────────
    const mixGroups = useMemo(() => {
      const groups: Record<CompatGroup, ClassifiedProductSimple[]> = { A: [], B: [], C: [], D: [], E: [] };
      allClassifiedProducts.forEach(p => groups[p.group].push(p));
      return groups;
    }, [allClassifiedProducts]);

    const activeGroups = useMemo(() => {
      return (Object.entries(mixGroups) as [CompatGroup, ClassifiedProductSimple[]][])
        .filter(([, prods]) => prods.length > 0);
    }, [mixGroups]);

    const hasData = hybridPlan || shoppingItems.length > 0;

    if (!hasData) {
      return (
        <div ref={ref} className="report-print-mode bg-white text-gray-800 p-4 rounded-xl" style={{ backgroundColor: '#ffffff', color: '#1f2937' }}>
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Preencha as etapas anteriores para visualizar o relatório.</p>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="report-print-mode bg-white text-gray-800 p-4 rounded-xl print-report" style={{ backgroundColor: '#ffffff', color: '#1f2937' }}>

        {/* ═══ CABEÇALHO ═══ */}
        <div className="mb-4">
          <div className="flex items-center gap-3 py-2 px-3 bg-white border border-emerald-200 rounded-lg mb-3">
            <img src={LOGO_URL} alt="Solo V3" className="h-[3.5rem] w-auto object-contain shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-emerald-800 uppercase tracking-wider leading-tight">
                Planejamento de Adubação — Café {coffeeLabel}
              </h1>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">
                Safra {safraLabel}
              </p>
            </div>
            <div className="text-right text-[10px] text-gray-500 shrink-0">
              <p className="font-medium text-gray-700">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="text-gray-500">Produtor:</span>
              <span className="font-semibold text-gray-800">{profileName || '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="text-gray-500">Área:</span>
              <span className="font-semibold text-gray-800">{hectares > 0 ? `${hectares.toFixed(2)} ha` : '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sprout className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="text-gray-500">Estande:</span>
              <span className="font-semibold text-gray-800">
                {plantsPerHa > 0 ? `${plantsPerHa.toLocaleString('pt-BR')} pl/ha` : '—'}
              </span>
            </div>
            {totalPlants > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 shrink-0" />
                <span className="text-gray-500">Total:</span>
                <span className="font-semibold text-gray-800">{totalPlants.toLocaleString('pt-BR')} plantas</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Coffee className="w-3 h-3 text-gray-400 shrink-0" />
              {isFormationPhase ? (
                <>
                  <span className="text-gray-500">Fase:</span>
                  <span className="font-semibold text-amber-700">
                    {hybridPlan ? `${getPhaseEmoji(hybridPlan.phase)} ${getPhaseLabel(hybridPlan.phase)}` : 'Formação'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-gray-500">Meta:</span>
                  <span className="font-semibold text-emerald-700">{sacas > 0 ? `${sacas} sc/ha` : '—'}</span>
                </>
              )}
            </div>
            {hybridPlan && hybridPlan.phase !== 'adulto' && (
              <div className="col-span-2 flex items-center gap-1.5 pt-1 border-t border-gray-200">
                <CalendarDays className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="text-gray-500">Ano da Lavoura:</span>
                <span className="font-semibold text-gray-800">
                  {getPhaseLabel(hybridPlan.phase)} — {hybridPlan.monthsSincePlanting} meses desde o plantio
                </span>
              </div>
            )}
            <div className="col-span-2 flex items-center gap-1.5 pt-1 border-t border-gray-200">
              <Shield className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="text-gray-500">Resp. Técnico:</span>
              <span className="font-semibold text-gray-800">
                {isConsultor
                  ? `Eng. Agr. ${profileName || '—'}${creaArt ? ` · ${creaArt}` : ''}`
                  : 'SOLO V3'}
              </span>
            </div>
          </div>
        </div>

        {/* ═══ 1. CRONOGRAMA DE ADUBAÇÃO A LANÇO ═══ */}
        {lancoData && (() => {
          sectionNum++;
          return (
            <Section number={sectionNum} title="Cronograma de Adubação a Lanço">
              <p className="text-[10px] text-gray-600 mb-2">
                Aplicar na projeção da saia do cafeeiro. Doses em <strong>g/planta</strong> para facilitar a medição no campo.
              </p>
              <div className="overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-amber-50">
                      <th className="px-2 py-1.5 text-left font-semibold text-amber-800 uppercase tracking-wider">Período</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-amber-800 uppercase tracking-wider">Fase</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-amber-800 uppercase tracking-wider">Produto</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-amber-800 uppercase tracking-wider">Kg Total</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-amber-800 uppercase tracking-wider">g/planta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lancoData.map((bm, bIdx) => {
                      if (bm.actions.length === 0) {
                        return (
                          <tr key={bIdx} className={bIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-1.5 font-bold text-gray-700">{bm.label}</td>
                            <td className="px-2 py-1.5 text-gray-500 italic" colSpan={4}>{bm.phase}</td>
                          </tr>
                        );
                      }
                      return bm.actions.map((action, aIdx) => (
                        <tr key={`${bIdx}-${aIdx}`} className={bIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {aIdx === 0 && (
                            <>
                              <td className="px-2 py-1.5 font-bold text-gray-700" rowSpan={bm.actions.length}>{bm.label}</td>
                              <td className="px-2 py-1.5 text-gray-600 text-[9px]" rowSpan={bm.actions.length}>{bm.phase}</td>
                            </>
                          )}
                          <td className="px-2 py-1.5 font-medium text-gray-800">{action.productName}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-amber-700">{fmt2(action.kgHa * hectares)}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-emerald-700">{action.gPlanta > 0 ? action.gPlanta.toFixed(1) : '—'}</td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </Section>
          );
        })()}

        {/* ═══ CRONOGRAMA MENSAL DE FERTIRRIGAÇÃO — COMPATIBILIDADE DA CALDA ═══ */}
        {hybridPlan && ((hybridPlan.productsByMethod['fertirrigacao'] || []).length > 0 || (hybridPlan.productsByMethod['foliar'] || []).length > 0) && (() => {
          sectionNum++;
          return (
            <Section number={sectionNum} title="Cronograma Mensal de Aplicação — Compatibilidade da Calda">
              <p className="text-[10px] text-gray-600 mb-2">
                Dividir a dose mensal em <strong>4 aplicações semanais</strong> via venturi ou bomba dosadora. Produtos agrupados por compatibilidade química. Foliares em grupo separado.
              </p>
              <FertigationPivotTable hybridPlan={hybridPlan} hectares={hectares} totalPlants={totalPlants} />
            </Section>
          );
        })()}

        {/* ═══ COMPATIBILIDADE DE CALDA — FERTIRRIGAÇÃO E COMPOSIÇÃO POR TANQUE ═══ */}
        {(() => {
          // Build fertirrigação-specific compatibility data
          const fertiProducts = hybridPlan ? (hybridPlan.productsByMethod['fertirrigacao'] || []) : [];
          const fertiClassified = fertiProducts.map(p => {
            const group = classifyInsumo({
              nome: p.name, tipo_produto: p.tipoProduto,
              macro_n: p.macro_n, macro_p2o5: p.macro_p2o5, macro_k2o: p.macro_k2o,
              macro_s: p.macro_s, micro_b: p.micro_b, micro_zn: p.micro_zn,
              micro_mn: 0, micro_cu: 0, micro_fe: 0,
            } as InsumoForClassification);
            return { id: p.id, name: p.name, type: p.tipoProduto, group };
          });

          // Use fertirrigação products if available, otherwise fall back to allClassifiedProducts
          const productsToShow = fertiClassified.length > 0 ? fertiClassified : allClassifiedProducts;
          if (productsToShow.length === 0) return null;

          const groups: Record<CompatGroup, typeof productsToShow> = { A: [], B: [], C: [], D: [], E: [] };
          productsToShow.forEach(p => groups[p.group].push(p));
          const active = (Object.entries(groups) as [CompatGroup, typeof productsToShow][]).filter(([, prods]) => prods.length > 0);
          if (active.length === 0) return null;

          sectionNum++;

          // Build tank composition: group incompatible products into separate tanks
          const tanks: { label: string; products: string[]; color: string }[] = [];
          // Tank 1: Groups A + C + E (compatible)
          const tank1 = [...groups.A, ...groups.C, ...groups.E].map(p => p.name);
          // Tank 2: Group B (sulfates — incompatible with A)
          const tank2 = groups.B.map(p => p.name);
          // Tank 3: Group D (defensivos — separate)
          const tank3 = groups.D.map(p => p.name);

          if (groups.A.length > 0 && groups.B.length > 0) {
            // Need separate tanks for A and B
            const tankA = [...groups.A, ...groups.C, ...groups.E].map(p => p.name);
            const tankB = groups.B.map(p => p.name);
            if (tankA.length > 0) tanks.push({ label: 'Tanque 1 — Cálcio + Neutros', products: tankA, color: 'bg-blue-50 border-blue-200' });
            if (tankB.length > 0) tanks.push({ label: 'Tanque 2 — Sulfatos/Fosfatos', products: tankB, color: 'bg-amber-50 border-amber-200' });
            if (tank3.length > 0) tanks.push({ label: 'Tanque 3 — Defensivos', products: tank3, color: 'bg-red-50 border-red-200' });
          } else {
            // All compatible in one tank
            const allNames = [...tank1, ...tank2].filter(Boolean);
            if (allNames.length > 0) tanks.push({ label: 'Tanque Único — Todos Compatíveis', products: allNames, color: 'bg-emerald-50 border-emerald-200' });
            if (tank3.length > 0) tanks.push({ label: 'Tanque Separado — Defensivos', products: tank3, color: 'bg-red-50 border-red-200' });
          }

          return (
            <Section number={sectionNum} title="Compatibilidade de Calda — Fertirrigação">
              {/* Groups */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {active.map(([group, products]) => {
                  const gStyles: Record<CompatGroup, string> = {
                    A: 'bg-red-50 border-red-200',
                    B: 'bg-amber-50 border-amber-200',
                    C: 'bg-emerald-50 border-emerald-200',
                    D: 'bg-purple-50 border-purple-200',
                    E: 'bg-gray-50 border-gray-200',
                  };
                  return (
                    <div key={group} className={cn('p-2.5 rounded-lg border', gStyles[group])}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <GroupBadge group={group} />
                        <span className="text-[10px] font-bold">{GROUP_INFO[group].desc}</span>
                      </div>
                      <p className="text-[9px] leading-relaxed text-gray-700">{products.map(p => p.name).join(', ')}</p>
                      <p className="text-[8px] mt-1 opacity-70 font-medium text-gray-500">✅ Podem ser misturados na mesma calda</p>
                    </div>
                  );
                })}
              </div>

              {/* Warnings */}
              {groups.A.length > 0 && groups.B.length > 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <div className="text-[10px] text-red-700">
                    <p className="font-semibold">⛔ NÃO misturar Grupo A com Grupo B</p>
                    <p><strong>{groups.A.map(p => p.name).join(', ')}</strong> (Ca²⁺) precipita com <strong>{groups.B.map(p => p.name).join(', ')}</strong> (SO₄²⁻).</p>
                  </div>
                </div>
              )}

              {/* Composição por Tanque */}
              <div className="mt-3">
                <p className="text-[10px] font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
                  Composição por Tanque
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tanks.map((tank, tIdx) => (
                    <div key={tIdx} className={cn('p-2.5 rounded-lg border', tank.color)}>
                      <p className="text-[10px] font-bold text-gray-800 mb-1">{tank.label}</p>
                      <div className="space-y-0.5">
                        {tank.products.map((name, nIdx) => (
                          <p key={nIdx} className="text-[9px] text-gray-700 flex items-center gap-1">
                            <span className="text-[8px]">•</span> {name}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mixing order */}
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 mt-2">
                <p className="text-[10px] font-semibold text-blue-700 mb-1">Ordem de Mistura Recomendada:</p>
                <div className="space-y-0.5 text-[10px] text-blue-800">
                  <p>1º — Água (meia carga)</p>
                  {groups.A.length > 0 && <p>2º — <strong>{groups.A.map(p => p.name).join(', ')}</strong> (Grupo A — Cálcio)</p>}
                  {groups.C.length > 0 && <p>{groups.A.length > 0 ? '3º' : '2º'} — <strong>{groups.C.map(p => p.name).join(', ')}</strong> (Grupo C — Neutros)</p>}
                  {groups.B.length > 0 && <p>⛔ <strong>{groups.B.map(p => p.name).join(', ')}</strong> (Grupo B — tanque separado se houver Grupo A)</p>}
                  {groups.D.length > 0 && <p>⚠️ <strong>{groups.D.map(p => p.name).join(', ')}</strong> (Defensivos — por último ou sozinho)</p>}
                  <p>Último — Completar volume e agitar</p>
                </div>
              </div>
            </Section>
          );
        })()}

        {/* ═══ BALANÇO NUTRICIONAL — DEMANDA vs FORNECIDO ═══ */}
        {nutrientBalance && nutrientBalance.length > 0 && (() => {
          sectionNum++;
          const hasLanco = nutrientBalance.some(item => (item.supplyLanco ?? 0) > 0.01);
          const hasFertig = nutrientBalance.some(item => (item.supplyFertigation ?? 0) > 0.01);
          const hasSpray = nutrientBalance.some(item => (item.supplySpraying ?? 0) > 0.01);
          return (
            <Section number={sectionNum} title="Balanço Nutricional — Demanda vs Fornecido">
              <p className="text-[10px] text-gray-600 mb-2">
                Demanda calculada com base em <strong>{totalPlants.toLocaleString('pt-BR')} plantas</strong> ({plantsPerHa.toLocaleString('pt-BR')} pl/ha) · Área: <strong>{hectares.toFixed(2).replace('.', ',')} ha</strong>.
                Valores totais para o talhão (Kg) e por planta (g/pl).
              </p>
              <div className="w-full overflow-x-auto block rounded-lg border border-gray-200">
                <table className="w-full text-[10px] min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Nutriente</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Dem. Mín<br/><span className="text-[8px] font-normal">(Kg)</span></th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Dem. Máx<br/><span className="text-[8px] font-normal">(Kg)</span></th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Fornecido<br/><span className="text-[8px] font-normal">(Kg)</span></th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Fornecido<br/><span className="text-[8px] font-normal">(kg/ha)</span></th>
                      {hasLanco && (
                        <th className="px-2 py-1.5 text-center font-semibold text-emerald-700 uppercase tracking-wider whitespace-nowrap">🟢 Lanço<br/><span className="text-[8px] font-normal">(Kg)</span></th>
                      )}
                      {hasFertig && (
                        <th className="px-2 py-1.5 text-center font-semibold text-blue-700 uppercase tracking-wider whitespace-nowrap">🔵 Fertirrig.<br/><span className="text-[8px] font-normal">(Kg)</span></th>
                      )}
                      {hasSpray && (
                        <th className="px-2 py-1.5 text-center font-semibold text-orange-700 uppercase tracking-wider whitespace-nowrap">🟠 Pulveriz.<br/><span className="text-[8px] font-normal">(Kg)</span></th>
                      )}
                      {plantsPerHa > 0 && (
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Dem. Máx<br/><span className="text-[8px] font-normal">(g/planta)</span></th>
                      )}
                      {plantsPerHa > 0 && (
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Fornecido<br/><span className="text-[8px] font-normal">(g/planta)</span></th>
                      )}
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Saldo<br/><span className="text-[8px] font-normal">(Kg)</span></th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Status</th>
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
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold',
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
            </Section>
          );
        })()}


        {shoppingItems.length > 0 && (() => {
          sectionNum++;
          return (
            <Section number={sectionNum} title={`Lista de Compras & Custos (${hectares} ha)`}>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-[10px] min-w-[550px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-600 uppercase tracking-wider">Produto</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider">Categoria</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider">Dose/ha</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider">Qtd. Total</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider">Sacos</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider">R$/kg</th>
                      <th className="px-2 py-1.5 text-center font-semibold text-gray-600 uppercase tracking-wider">R$/ha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shoppingItems.map((item, idx) => {
                      const bagLabel = item.tamanhoUnidade > 0
                        ? `${Math.ceil(item.totalKg / item.tamanhoUnidade)} × ${item.tamanhoUnidade}${item.medida === 'L' ? 'L' : 'kg'}`
                        : '—';
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1.5 font-medium text-gray-800">{item.name}</td>
                          <td className="px-2 py-1.5 text-center text-gray-600">{item.tipoProduto}</td>
                          <td className="px-2 py-1.5 text-center text-gray-700 tabular-nums">
                            {item.dosePerHa < 1 ? `${(item.dosePerHa * 1000).toFixed(0)} g` : `${item.dosePerHa.toFixed(1)} kg`}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-emerald-700">
                            {item.totalKg < 1 ? `${(item.totalKg * 1000).toFixed(0)} g` : `${item.totalKg.toFixed(1)} kg`}
                          </td>
                          <td className="px-2 py-1.5 text-center text-gray-600">{bagLabel}</td>
                          <td className="px-2 py-1.5 text-center text-gray-600 tabular-nums">{item.pricePerKg > 0 ? fmtCurrency(item.pricePerKg) : '—'}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-emerald-700 tabular-nums">{item.costPerHa > 0 ? fmtCurrency(item.costPerHa) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {grandTotalCost > 0 && (
                    <tfoot>
                      <tr className="bg-emerald-50 border-t border-emerald-200">
                        <td colSpan={6} className="px-2 py-1.5 text-right font-bold text-emerald-800 text-[10px] uppercase tracking-wider">Total Adubação</td>
                        <td className="px-2 py-1.5 text-center font-extrabold text-emerald-800 tabular-nums">{fmtCurrency(grandTotalCost)}/ha</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Section>
          );
        })()}

        {/* ═══ RODAPÉ ═══ */}
        <div className="mt-4 pt-3 border-t-2 border-emerald-600">
          <div className="grid grid-cols-2 gap-8 mb-4">
            <div className="text-center">
              <div className="border-b-2 border-gray-400 w-48 mx-auto mb-1 mt-6" />
              <p className="text-[10px] font-semibold text-gray-800">Responsável Técnico</p>
              {isConsultor ? (
                <>
                  {profileName && <p className="text-[9px] text-gray-500">Eng. Agr. {profileName}</p>}
                  {creaArt && <p className="text-[9px] text-gray-500">{creaArt}</p>}
                  {telefone && <p className="text-[9px] text-gray-500">Tel: {telefone}</p>}
                </>
              ) : (
                <p className="text-[9px] text-gray-500">SOLO V3</p>
              )}
            </div>
            <div className="text-center">
              <div className="border-b-2 border-gray-400 w-48 mx-auto mb-1 mt-6" />
              <p className="text-[10px] font-semibold text-gray-800">Produtor</p>
            </div>
          </div>
          <div className="text-center space-y-1 pt-2 border-t border-gray-200">
            <img src={LOGO_URL} alt="Solo V3" className="h-12 mx-auto opacity-60" />
            <p className="text-[8px] text-gray-400 leading-relaxed">
              Solo V3 Tecnologia Agrícola | {new Date().toLocaleDateString('pt-BR')} | Fontes: EMBRAPA / INCAPER / 5ª Aproximação
            </p>
          </div>
        </div>
      </div>
    );
  }
);

CoffeeSimplifiedReport.displayName = 'CoffeeSimplifiedReport';
