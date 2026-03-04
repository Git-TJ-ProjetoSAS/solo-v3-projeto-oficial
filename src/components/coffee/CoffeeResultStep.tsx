import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useCoffee } from '@/contexts/CoffeeContext';
import {
  getTextureCascade,
  SOIL_TEXTURE_MAP,
  IRRIGATION_SYSTEMS,
  generate7DaySchedule,
  KC_CAFE,
  getETo,
} from '@/lib/irrigationEngine';
import { supabase } from '@/integrations/supabase/client';
import { useTalhoes } from '@/hooks/useTalhoes';
import { useTalhaoHistory } from '@/hooks/useTalhaoHistory';
import { findDoseK2O, findDoseP2O5, gerarParcelamento, MATRIZ_PARCELAMENTO, type ParcelRow, PULVERIZACAO_PADRAO, PULVERIZACAO_MENSAL, APLICACOES_SOLO, OBSERVACOES_MANEJO } from '@/data/coffeePlantingReference';
import { NutrientComparisonTable } from '@/components/coffee/NutrientComparisonTable';
import { classifyInsumo, GROUP_INFO, type CompatGroup, type InsumoForClassification } from '@/lib/compatibilityEngine';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { getStageForMonth, MONTH_NAMES, PHENOLOGY_STAGES } from '@/data/coffeePhenology';
import { buildHybridPlan, APPLICATION_METHOD_INFO, isNPKGranularFormulado, type ApplicationMethodType, type HybridPlan, type MonthlyPlan, type FirstYearConfig, type CoffeePhase } from '@/lib/coffeeHybridPlan';
import { CoffeeSimplifiedReport, type ShoppingItem, type ClassifiedProductSimple, type NutrientBalanceItem } from '@/components/coffee/CoffeeSimplifiedReport';
import { CoffeeCompleteReport } from '@/components/coffee/CoffeeCompleteReport';
import { getPhaseLabel, getPhaseEmoji, type NIntensity, N_INTENSITY_LABELS, EXTRACTION_FACTORS, getAdultP2O5, getYear1P2O5, calcAdultNDemand, calcAdultK2ODemand } from '@/lib/coffeeRecommendationEngine';
import { useCoffeeDemand } from '@/hooks/useCoffeeDemand';

import type {
  LeafAnalysisData,
  CoffeeFertigationData,
  CoffeeSprayingData,
  CoffeeTreatmentPlanData,
  CoffeeLimingData,
} from '@/contexts/CoffeeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Coffee,
  Beaker,
  Leaf,
  Waves,
  Droplets,
  FlaskConical,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Package,
  DollarSign,
  
  Target,
  ShieldAlert,
  Save,
  Loader2,
  FileDown,
  Printer,
  Share2,
  MessageCircle,
  User,
  CalendarDays,
  Sprout,
  ShoppingCart,
  AlertCircle,
  TreePine,
  Info,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LOGO_URL } from '@/lib/constants';

// ─── Helpers ─────────────────────────────────────────────────
function normalizeDose(dose: number, unit: string): { value: number; outputUnit: string } {
  switch (unit) {
    case 'mL/ha': return { value: dose / 1000, outputUnit: 'L' };
    case 'g/ha': return { value: dose / 1000, outputUnit: 'Kg' };
    case 'Kg/ha': return { value: dose, outputUnit: 'Kg' };
    default: return { value: dose, outputUnit: 'L' };
  }
}

function formatQty(v: number, unit: string): string {
  if (v < 0.01) return `${(v * 1000).toFixed(1)} ${unit === 'L' ? 'mL' : 'g'}`;
  return `${v.toFixed(2)} ${unit}`;
}

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Professional Section Wrapper ────────────────────────────
function ReportSection({
  number,
  title,
  subtitle,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="break-inside-avoid mb-3">
      <div className="flex items-baseline gap-2 mb-2 border-b-2 border-emerald-600 pb-1.5">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold shrink-0">
          {number}
        </span>
        <div>
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h2>
          {subtitle && <p className="text-[9px] text-gray-500 italic">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ─── Interpretation callout ──────────────────────────────────
function InterpretationBox({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warning' | 'success' }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  };
  const icons = {
    info: <Info className="w-4 h-4 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />,
    success: <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />,
  };
  return (
    <div className={cn('flex items-start gap-2 p-2 rounded-lg border text-[10px] leading-relaxed', styles[variant])}>
      {icons[variant]}
      <div>{children}</div>
    </div>
  );
}

// ─── Highlight Box ───────────────────────────────────────────
function HighlightBox({ label, value, sub, variant = 'default' }: { label: string; value: string; sub?: string; variant?: 'default' | 'success' | 'danger' | 'primary' }) {
  const bgStyles = {
    default: 'bg-gray-50 border-gray-200',
    success: 'bg-emerald-50 border-emerald-200',
    danger: 'bg-red-50 border-red-200',
    primary: 'bg-blue-50 border-blue-200',
  };
  const valStyles = {
    default: 'text-gray-800',
    success: 'text-emerald-700',
    danger: 'text-red-700',
    primary: 'text-blue-700',
  };
  return (
    <div className={cn('text-center p-2 rounded-lg border', bgStyles[variant])}>
      <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5 font-medium">{label}</p>
      <p className={cn('text-base font-bold', valStyles[variant])}>{value}</p>
      {sub && <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Zebra Table ─────────────────────────────────────────────
function ZebraTable({ headers, rows, className }: { headers: string[]; rows: React.ReactNode[][]; className?: string }) {
  return (
    <div className={cn('overflow-auto rounded-lg border border-gray-200', className)}>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="bg-gray-100">
            {headers.map((h, i) => (
              <th key={i} className="px-2 py-1.5 font-semibold text-gray-600 uppercase tracking-wider text-left first:text-left text-center">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rIdx) => (
            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {cells.map((cell, cIdx) => (
                <td key={cIdx} className="px-2 py-1.5 text-gray-700 first:text-left text-center">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Nutrient symbols ────────────────────────────────────────
const NUTRIENT_SYMBOLS: Record<string, string> = {
  n: 'N', p: 'P', k: 'K', mg: 'Mg', ca: 'Ca', s: 'S',
  zn: 'Zn', b: 'B', cu: 'Cu', mn: 'Mn', fe: 'Fe', mo: 'Mo',
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string; bgColor: string }> = {
  deficient: { label: 'Deficiente', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  threshold: { label: 'Limiar', icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  adequate: { label: 'Adequado', icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
};

// ─── Monthly distribution weights ───────────────────────────
const MONTH_WEIGHTS = [
  0.10, 0.10, 0.09, 0.08, 0.04, 0.06,
  0.07, 0.08, 0.09, 0.10, 0.10, 0.09,
];

// ─── Compatibility Badge ────────────────────────────────────
function GroupBadge({ group }: { group: CompatGroup }) {
  const info = GROUP_INFO[group];
  return (
    <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold border', info.badgeColor)}>
      {group}
    </span>
  );
}

// ─── Classified Product type ────────────────────────────────
interface ClassifiedProduct {
  id: string;
  name: string;
  type: string;
  dosePerHa: number;
  unit: string;
  group: CompatGroup;
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
}

// ─── WhatsApp Text Builder ──────────────────────────────────
function buildWhatsAppText(params: {
  coffeeLabel: string;
  hectares: number;
  sacas: number;
  totalPlants: number;
  plantsPerHa: number;
  soil: ReturnType<typeof useCoffee>['coffeeData']['soil'];
  limingData: CoffeeLimingData | null;
  leafAnalysis: LeafAnalysisData | null;
  fertigation: CoffeeFertigationData | null;
  spraying: CoffeeSprayingData | null;
  treatmentPlan: CoffeeTreatmentPlanData | null;
  totalCostPerHa: number;
  costPerSaca: number;
}) {
  const { coffeeLabel, hectares, sacas, totalPlants, plantsPerHa, soil, limingData, leafAnalysis, fertigation, spraying, treatmentPlan, totalCostPerHa, costPerSaca } = params;
  const date = new Date().toLocaleDateString('pt-BR');
  let text = `🌿 *RECOMENDAÇÃO DE ADUBAÇÃO — CAFÉ ${coffeeLabel.toUpperCase()}*\n📅 ${date}\n\n`;
  text += `📐 Área: ${hectares} ha\n🎯 Meta: ${sacas} sc/ha\n🌱 Pop.: ${plantsPerHa.toLocaleString('pt-BR')} pl/ha (${totalPlants.toLocaleString('pt-BR')} total)\n\n`;

  if (soil) {
    text += `🔬 *SOLO*\nV%: ${soil.vPercent.toFixed(1)}% | Ca: ${soil.ca} | Mg: ${soil.mg} | K: ${soil.k} | P: ${soil.p}\n\n`;
  }

  if (limingData && limingData.nc > 0) {
    text += `⚒ *CALAGEM*\n${limingData.productName || 'Calcário'} (PRNT ${limingData.prnt}%) — ${limingData.nc.toFixed(2)} t/ha\n`;
    if (limingData.costPerHa > 0) text += `Custo: ${fmtCurrency(limingData.costPerHa)}/ha\n`;
    text += '\n';
  }

  if (leafAnalysis) {
    const entries = Object.entries(leafAnalysis);
    const deficients = entries.filter(([, e]) => e.status === 'deficient');
    if (deficients.length > 0) {
      text += `🍃 *DIAGNÓSTICO FOLIAR*\n❌ Deficientes: ${deficients.map(([id]) => NUTRIENT_SYMBOLS[id] || id).join(', ')}\n\n`;
    }
  }

  if (fertigation && fertigation.products.length > 0) {
    text += `💧 *FERTIRRIGAÇÃO* (Caixa ${fertigation.tankSize}L)\n`;
    fertigation.products.forEach(p => {
      text += `• ${p.name}: ${p.dosePerHa} ${p.unit}\n`;
    });
    text += '\n';
  }

  if (spraying && spraying.products.length > 0) {
    text += `🎯 *PULVERIZAÇÃO* (${spraying.tankCapacity}L)\n`;
    spraying.products.forEach(p => {
      text += `• ${p.name}: ${p.dosePerHa} ${p.unit}\n`;
    });
    text += '\n';
  }

  if (treatmentPlan && treatmentPlan.entries.length > 0) {
    text += `🛡 *DEFENSIVOS*\n`;
    treatmentPlan.entries.forEach(e => {
      text += `• ${e.produto} (${e.alvo}): ${e.dosePerHa} ${e.unidade} — ${fmtCurrency(e.costPerHa)}/ha\n`;
    });
    text += '\n';
  }

  text += `💰 *INVESTIMENTO*\n`;
  text += `• Custo/ha: ${totalCostPerHa > 0 ? fmtCurrency(totalCostPerHa) : 'A definir'}\n`;
  text += `• Custo/saca: ${costPerSaca > 0 ? fmtCurrency(costPerSaca) : 'A definir'}\n\n`;
  text += `_Relatório gerado pelo Solo V3 • ${new Date().getFullYear()}_`;

  return text;
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export function CoffeeResultStep() {
  const { coffeeData, resetCoffee } = useCoffee();
  const { profile } = useUserProfile();
  const { isConsultor } = useUserRole();
  const reportRef = useRef<HTMLDivElement>(null);
  const { saveToHistory } = useTalhaoHistory(coffeeData.selectedTalhaoId || undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const autoSaveTriggered = useRef(false);
  const [nIntensity, setNIntensity] = useState<NIntensity>('alta_performance');
  const [reportMode, setReportMode] = useState<'simplified' | 'complete'>('simplified');

  // ─── Planting date awareness ──────────────────────────────
  const { talhoes } = useTalhoes();
  const selectedTalhao = useMemo(() => {
    if (!coffeeData.selectedTalhaoId) return null;
    return talhoes.find(t => t.id === coffeeData.selectedTalhaoId) ?? null;
  }, [coffeeData.selectedTalhaoId, talhoes]);

  const plantingMonth = selectedTalhao?.planting_month ?? 1;
  const plantingYear = selectedTalhao?.planting_year ?? 2020;

  const isFirstYear = useMemo(() => {
    if (!selectedTalhao) return false;
    const now = new Date();
    const plantDate = new Date(plantingYear, plantingMonth - 1);
    const diffMonths = (now.getFullYear() - plantDate.getFullYear()) * 12 + (now.getMonth() - plantDate.getMonth());
    return diffMonths >= 0 && diffMonths <= 24;
  }, [selectedTalhao, plantingMonth, plantingYear]);

  // Load insumo nutrient data
  const [nutrientProducts, setNutrientProducts] = useState<any[]>([]);

  const allProducts = useMemo(() => {
    const fertiProds = coffeeData.fertigation?.products || [];
    const sprayProds = coffeeData.coffeeSpraying?.products || [];
    return [...fertiProds, ...sprayProds];
  }, [coffeeData.fertigation, coffeeData.coffeeSpraying]);

  useEffect(() => {
    const insumoIds = allProducts.map(p => p.insumoId).filter(Boolean);
    if (insumoIds.length === 0) { setNutrientProducts([]); return; }

    supabase
      .from('insumos')
      .select('id, nome, macro_n, macro_p2o5, macro_k2o, macro_s, micro_b, micro_zn, micro_cu, micro_mn, micro_fe, micro_mo, principios_ativos, preco')
      .in('id', insumoIds)
      .then(({ data }) => {
        if (!data) { setNutrientProducts([]); return; }
        const mapped = allProducts.map(p => {
          const insumo = data.find(i => i.id === p.insumoId);
          return {
            id: insumo?.id || p.insumoId,
            name: p.name,
            type: p.type,
            dosePerHa: p.dosePerHa,
            unit: p.unit,
            principios_ativos: insumo?.principios_ativos as any || null,
            macro_n: insumo?.macro_n || 0,
            macro_p2o5: insumo?.macro_p2o5 || 0,
            macro_k2o: insumo?.macro_k2o || 0,
            macro_s: insumo?.macro_s || 0,
            micro_b: insumo?.micro_b || 0,
            micro_zn: insumo?.micro_zn || 0,
            micro_cu: insumo?.micro_cu || 0,
            micro_mn: insumo?.micro_mn || 0,
            micro_fe: insumo?.micro_fe || 0,
            micro_mo: insumo?.micro_mo || 0,
          };
        });
        setNutrientProducts(mapped);
      });
  }, [allProducts]);

  const coffeeLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica';
  const hectares = coffeeData.productivity?.hectares || coffeeData.hectares || 0;
  const sacas = coffeeData.productivity?.sacasPerHectare || 0;
  const totalSacas = sacas * hectares;
  const totalPlants = coffeeData.totalPlants || 0;
  const plantsPerHa = hectares > 0 ? Math.round(totalPlants / hectares) : 0;
  const PRICE_PER_SACA = 450;
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const safraLabel = `${currentYear}/${currentYear + 1}`;

  const hasSoil = !!coffeeData.soil;
  const hasProductivity = !!coffeeData.productivity;
  const hasLiming = coffeeData.limingData && coffeeData.limingData.nc > 0;
  const hasInsumos = coffeeData.insumos.length > 0;
  const hasFertigation = coffeeData.fertigation && coffeeData.fertigation.products.length > 0;
  const hasSpraying = coffeeData.coffeeSpraying && coffeeData.coffeeSpraying.products.length > 0;
  const hasLeafAnalysis = coffeeData.leafAnalysis && Object.keys(coffeeData.leafAnalysis).length > 0;
  const hasTreatment = coffeeData.treatmentPlan && coffeeData.treatmentPlan.entries.length > 0;

  // ─── Unified demand calculation (shared hook — stand-corrected) ───
  const { demand: unifiedDemand } = useCoffeeDemand({
    isFirstYear,
    sacasPerHa: sacas,
    plantsPerHa,
    coffeeType: coffeeData.coffeeType,
    soilP: coffeeData.soil?.p ?? 0,
    soilK: coffeeData.soil?.k ?? 0,
  });

  // ─── Fertilization product prices + metadata from DB ─────────────────
  const [fertPrices, setFertPrices] = useState<Record<string, number>>({});
  const [insumoMeta, setInsumoMeta] = useState<Record<string, { tipoProduto: string; tamanhoUnidade: number; medida: string }>>({});

  useEffect(() => {
    supabase
      .from('insumos')
      .select('nome, preco, tamanho_unidade, tipo_produto, medida')
      .in('tipo_produto', ['Cobertura', 'Plantio', 'Correção de Solo', 'Foliar', 'Bioestimulante', 'Fungicida', 'Inseticida', 'Herbicida', 'Matéria Orgânica', 'Adjuvante'])
      .then(({ data }) => {
        if (!data) return;
        const priceMap: Record<string, number> = {};
        const metaMap: Record<string, { tipoProduto: string; tamanhoUnidade: number; medida: string }> = {};
        data.forEach(i => {
          const key = i.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          if (i.tamanho_unidade > 0) {
            priceMap[key] = i.preco / i.tamanho_unidade; // R$/kg
          }
          metaMap[key] = { tipoProduto: i.tipo_produto, tamanhoUnidade: i.tamanho_unidade, medida: i.medida };
        });
        setFertPrices(priceMap);
        setInsumoMeta(metaMap);
      });
  }, []);

  // Note: fertCostDetails, totalCostPerHa, etc. are computed after hybridPlan

  const filledSections = useMemo(() => {
    let count = 0;
    if (hasSoil) count++;
    if (hasProductivity) count++;
    if (hasLiming) count++;
    if (hasInsumos) count++;
    if (hasFertigation) count++;
    if (hasSpraying) count++;
    if (hasLeafAnalysis) count++;
    if (hasTreatment) count++;
    return count;
  }, [hasSoil, hasProductivity, hasLiming, hasInsumos, hasFertigation, hasSpraying, hasLeafAnalysis, hasTreatment]);

  // Classified products for annual table
  const classifiedProducts = useMemo((): ClassifiedProduct[] => {
    return allProducts.map(p => {
      const insumo = nutrientProducts.find(i => i.id === (p as any).insumoId);
      const group = insumo
        ? classifyInsumo({
            nome: p.name,
            tipo_produto: p.type || 'Fertilizante',
            macro_n: insumo.macro_n || 0,
            macro_p2o5: insumo.macro_p2o5 || 0,
            macro_k2o: insumo.macro_k2o || 0,
            macro_s: insumo.macro_s || 0,
            micro_b: insumo.micro_b || 0,
            micro_zn: insumo.micro_zn || 0,
            micro_mn: insumo.micro_mn || 0,
            micro_cu: insumo.micro_cu || 0,
            micro_fe: insumo.micro_fe || 0,
          } as InsumoForClassification)
        : 'C' as CompatGroup;

      return {
        id: p.id,
        name: p.name,
        type: p.type || 'Fertilizante',
        dosePerHa: p.dosePerHa,
        unit: p.unit,
        group,
        macro_n: insumo?.macro_n || 0,
        macro_p2o5: insumo?.macro_p2o5 || 0,
        macro_k2o: insumo?.macro_k2o || 0,
        macro_s: insumo?.macro_s || 0,
        micro_b: insumo?.micro_b || 0,
        micro_zn: insumo?.micro_zn || 0,
        micro_cu: insumo?.micro_cu || 0,
        micro_mn: insumo?.micro_mn || 0,
        micro_fe: insumo?.micro_fe || 0,
        micro_mo: insumo?.micro_mo || 0,
      };
    });
  }, [allProducts, nutrientProducts]);

  const monthlyData = useMemo(() => {
    return MONTH_NAMES.map((name, i) => {
      const stage = getStageForMonth(i + 1);
      const weight = MONTH_WEIGHTS[i];
      const products: Record<string, number> = {};
      classifiedProducts.forEach(p => {
        const { value: dosePerHa } = normalizeDose(p.dosePerHa, p.unit);
        products[p.id] = Math.round(dosePerHa * weight * 12 * 100) / 100;
      });
      return { name, shortName: name.slice(0, 3), stage, products, monthIndex: i };
    });
  }, [classifiedProducts]);

  // ─── Hybrid Plan ───────────────────────────────────────────
  // Use coffeeData.insumos (wizard-selected products) as the PRIMARY source
  // Also include fertigation/spraying products if they have nutrient data
  const hybridPlan = useMemo((): HybridPlan | null => {
    const wizardInsumos = coffeeData.insumos || [];
    // 1st year planting: use planting-level N/K demands
    const metaN = coffeeData.coffeeType === 'conilon' ? 60 : 40; // g N per plant per year (1st year ref)
    const plantingNPerHa = plantsPerHa > 0 ? (metaN * plantsPerHa) / 1000 : sacas * 3.5; // kg N/ha
    const doseK2OPerPlant = findDoseK2O(coffeeData.soil?.k ?? 0); // g K2O per plant
    const plantingKPerHa = plantsPerHa > 0 ? (doseK2OPerPlant * plantsPerHa) / 1000 : sacas * 4.0; // kg K2O/ha

    const demandN = isFirstYear ? plantingNPerHa : unifiedDemand.n; // kg/ha annual N demand (stand-corrected)
    const demandK = isFirstYear ? plantingKPerHa : unifiedDemand.k; // kg/ha annual K₂O demand (stand-corrected)
    const limingNc = coffeeData.limingData?.nc || 0; // t/ha
    
    // P₂O₅ demand for broadcast (a lanço) products like MAP
    const pSoloVal = coffeeData.soil?.p ?? 0;
    const demandP = isFirstYear
      ? (plantsPerHa > 0 ? (findDoseP2O5(pSoloVal) * plantsPerHa) / 1000 : 0)
      : unifiedDemand.p; // stand-corrected

    // ── Pre-calculate N from secondary sources (Sulfato de Amônia, Calcinit, MAP) ──
    // Adult phase: discount N contributed by S/Ca/P sources before sizing Uréia
    const isSulfatoAmonia = (name: string) => {
      const l = name.toLowerCase();
      return l.includes('sulfato de amônia') || l.includes('sulfato de amonia');
    };
    const isCalcinit = (name: string) => {
      const l = name.toLowerCase();
      return l.includes('calcinit') || l.includes('nitrato de cálcio') || l.includes('nitrato de calcio');
    };
    const isUreia = (name: string) => {
      const l = name.toLowerCase();
      return l.includes('uréia') || l.includes('ureia') || l.includes('urea');
    };

    // Calculate S demand: formation = population-based; adult = extraction-based
    const demandS = isFirstYear
      ? (plantsPerHa > 0 ? (10 * plantsPerHa) / 1000 : 0)
      : unifiedDemand.s; // kg S/ha (stand-corrected)

    // Estimate how much N is contributed by secondary sources
    let nFromSecondary = 0;
    if (!isFirstYear) {
      for (const ins of wizardInsumos) {
        const name = ins.nome;
        const nPct = (ins.macronutrientes?.n || 0) / 100;
        const sPct = (ins.macronutrientes?.s || 0) / 100;
        const pPct = (ins.macronutrientes?.p2o5 || 0) / 100;

        if (isSulfatoAmonia(name) && sPct > 0) {
          // Sulfato de Amônia: dose driven by S demand, N is a bonus
          const doseByS = demandS > 0 ? demandS / sPct : 0;
          nFromSecondary += doseByS * nPct;
        } else if (isCalcinit(name) && nPct > 0) {
          // Calcinit: fixed reference dose (40g/planta)
          const calcinitKgHa = plantsPerHa > 0 ? (40 * plantsPerHa) / 1000 : 0;
          nFromSecondary += calcinitKgHa * nPct;
        } else if (pPct > 0.10 && nPct > 0 && !isUreia(name)) {
          // MAP or high-P products: dose driven by P₂O₅ demand, N is a bonus
          const doseByP = demandP > 0 ? demandP / pPct : 0;
          nFromSecondary += doseByP * nPct;
        }
      }
    }

    // Helper: estimate annual dose from nutrient demand when recomendacaoDoseHa is 0
    const estimateDose = (ins: any): number => {
      const explicit = ins.recomendacaoDoseHa || 0;
      if (explicit > 0) return explicit;

      // Correção de Solo (Calcário): use liming calculation (t/ha -> kg/ha)
      if (ins.tipoProduto === 'Correção de Solo') {
        return limingNc * 1000; // convert t/ha to kg/ha
      }

      // Cobertura / Plantio: estimate from nutrient composition
      const nPct = (ins.macronutrientes?.n || 0) / 100;
      const kPct = (ins.macronutrientes?.k2o || 0) / 100;
      const pPct = (ins.macronutrientes?.p2o5 || 0) / 100;
      const sPct = (ins.macronutrientes?.s || 0) / 100;

      // MAP or high-P products: use P₂O₅ demand as primary driver
      if (pPct > 0.10) {
        return demandP / pPct;
      }

      // Sulfato de Amônia: dose driven by S demand (not N)
      if (isSulfatoAmonia(ins.nome) && sPct > 0) {
        return demandS > 0 ? demandS / sPct : 0;
      }

      // Calcinit: fixed reference dose (40g/planta)
      if (isCalcinit(ins.nome)) {
        return plantsPerHa > 0 ? (40 * plantsPerHa) / 1000 : 0;
      }

      // Uréia or other pure-N sources: discount N already supplied by secondary sources
      if (isUreia(ins.nome) && nPct > 0) {
        const adjustedDemandN = Math.max(0, demandN - nFromSecondary);
        return adjustedDemandN / nPct;
      }

      if (nPct > 0 && kPct > 0) {
        // NPK formulado: use whichever nutrient requires more product
        return Math.max(demandN / nPct, demandK / kPct);
      } else if (nPct > 0) {
        return demandN / nPct;
      } else if (kPct > 0) {
        return demandK / kPct;
      }

      // Micro/Foliar with no macro: keep at 0 (foliar distribution handles it)
      return 0;
    };

    // Build products from wizard insumos (Cobertura, Plantio, Foliar, Correção, etc.)
    const fromWizard = wizardInsumos.map(ins => ({
      id: (ins as any).id || ins.nome,
      insumoId: (ins as any).id || ins.nome,
      name: ins.nome,
      tipoProduto: ins.tipoProduto,
      dosePerHa: estimateDose(ins),
      unit: ins.recomendacaoDoseUnidade || 'kg/ha',
      macro_n: ins.macronutrientes?.n || 0,
      macro_p2o5: ins.macronutrientes?.p2o5 || 0,
      macro_k2o: ins.macronutrientes?.k2o || 0,
      macro_s: ins.macronutrientes?.s || 0,
      micro_b: ins.micronutrientes?.b || 0,
      micro_zn: ins.micronutrientes?.zn || 0,
    }));

    // Also include fertigation/spraying products (with nutrient data from DB)
    const fromFertiSpray = allProducts.map(p => {
      const insumo = nutrientProducts.find((i: any) => i.id === (p as any).insumoId);
      const { value: doseNorm } = normalizeDose(p.dosePerHa, p.unit);
      return {
        id: p.id,
        insumoId: (p as any).insumoId || p.id,
        name: p.name,
        tipoProduto: p.type || 'Cobertura',
        dosePerHa: doseNorm,
        unit: 'kg/ha',
        macro_n: insumo?.macro_n || 0,
        macro_p2o5: insumo?.macro_p2o5 || 0,
        macro_k2o: insumo?.macro_k2o || 0,
        macro_s: insumo?.macro_s || 0,
        micro_b: insumo?.micro_b || 0,
        micro_zn: insumo?.micro_zn || 0,
      };
    });

    // Merge by insumoId/name: fertiSpray products OVERRIDE wizard products for
    // matching entries (fertigation step refines the wizard's initial selections).
    // Products unique to each source are kept as-is.
    const normalizeProductName = (name: string) =>
      name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

    const combinedMap = new Map<string, typeof fromWizard[number]>();

    // 1) Seed with wizard products
    fromWizard.forEach(product => {
      const keyById = `id:${product.insumoId}`;
      const keyByName = `name:${normalizeProductName(product.name)}`;
      combinedMap.set(keyById, { ...product });
      combinedMap.set(keyByName, combinedMap.get(keyById)!);
    });

    // 2) FertiSpray products REPLACE matching wizard products (later step = final decision)
    //    Products unique to fertiSpray are added normally.
    fromFertiSpray.forEach(product => {
      const keyById = `id:${product.insumoId}`;
      const keyByName = `name:${normalizeProductName(product.name)}`;
      const existing = combinedMap.get(keyById) || combinedMap.get(keyByName);

      if (existing) {
        // Override dose — fertigation step is the final refinement
        existing.dosePerHa = product.dosePerHa;
        return;
      }

      combinedMap.set(keyById, { ...product });
      combinedMap.set(keyByName, combinedMap.get(keyById)!);
    });

    const combined = Array.from(new Set(Array.from(combinedMap.values())));

    // Inject or override liming product with NC from calagem step
    const calcarioIdx = combined.findIndex(p => p.tipoProduto === 'Correção de Solo');
    if (coffeeData.limingData && coffeeData.limingData.nc > 0) {
      const limingProduct = {
        id: 'liming-calcario',
        insumoId: 'liming-calcario',
        name: coffeeData.limingData.productName || 'Calcário Dolomítico',
        tipoProduto: 'Correção de Solo' as const,
        dosePerHa: coffeeData.limingData.nc * 1000, // t/ha → kg/ha
        unit: 'kg/ha',
        macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 0, micro_b: 0, micro_zn: 0,
      };
      if (calcarioIdx >= 0) {
        // Override existing correction product with NC dose from liming step
        combined[calcarioIdx] = { ...combined[calcarioIdx], dosePerHa: limingProduct.dosePerHa, name: limingProduct.name };
      } else {
        combined.push(limingProduct);
      }
    } else if (coffeeData.soil) {
      // Auto-compute NC when liming step was skipped or nc=0 but V% needs correction
      const soilData = coffeeData.soil;
      const vAtual = soilData.vPercent;
      const vAlvo = isFirstYear ? 70 : 60;
      if (vAtual < vAlvo) {
        const ctcCalc = soilData.ca + soilData.mg + (soilData.k / 391) + soilData.hAl;
        const prntDefault = 80;
        const ncAuto = ((vAlvo - vAtual) * ctcCalc) / prntDefault;
        if (ncAuto > 0.1) {
          const doseAutoKgHa = ncAuto * 1000; // t/ha → kg/ha
          if (calcarioIdx >= 0) {
            // Override existing correction product dose with auto-computed NC
            combined[calcarioIdx] = { ...combined[calcarioIdx], dosePerHa: doseAutoKgHa };
          } else {
            combined.push({
              id: 'liming-calcario-auto',
              insumoId: 'liming-calcario-auto',
              name: 'Calcário Dolomítico',
              tipoProduto: 'Correção de Solo',
              dosePerHa: doseAutoKgHa,
              unit: 'kg/ha',
              macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 0, micro_b: 0, micro_zn: 0,
            });
          }
        }
      }
    }

    if (combined.length === 0 && !isFirstYear) return null;

    // Build first-year config if applicable
    const fyConfig: FirstYearConfig | undefined = isFirstYear && coffeeData.coffeeType
      ? {
          culturaNome: coffeeData.coffeeType === 'conilon' ? 'Café Conilon (Irrigado)' : 'Café Arábica (Sequeiro)',
          totalPlants: coffeeData.totalPlants || 0,
          pSolo: coffeeData.soil?.p ?? 0,
          kSolo: coffeeData.soil?.k ?? 0,
        }
      : undefined;

    return buildHybridPlan({
      coffeeType: coffeeData.coffeeType,
      sacasPerHa: sacas,
      hectares,
      vPercent: coffeeData.soil?.vPercent ?? null,
      plantingMonth,
      plantingYear,
      irrigated: selectedTalhao?.irrigated ?? false,
      pSolo: coffeeData.soil?.p ?? undefined,
      kSolo: coffeeData.soil?.k ?? undefined,
      totalPlants: coffeeData.totalPlants || undefined,
      firstYearConfig: fyConfig,
      nIntensity,
      products: combined,
    });
  }, [coffeeData.insumos, coffeeData.limingData, allProducts, nutrientProducts, coffeeData.coffeeType, sacas, hectares, coffeeData.soil, isFirstYear, coffeeData.totalPlants, plantingMonth, plantingYear, selectedTalhao?.irrigated, nIntensity, unifiedDemand]);

  // Phase-aware: calculate phase independently so it works even when hybridPlan is null
  const independentPhase = useMemo(() => {
    if (!selectedTalhao) return 'adulto';
    const now = new Date();
    const plantDate = new Date(plantingYear, plantingMonth - 1);
    const diffMonths = (now.getFullYear() - plantDate.getFullYear()) * 12 + (now.getMonth() - plantDate.getMonth());
    if (diffMonths < 0) return 'adulto';
    if (diffMonths <= 6) return 'plantio' as const;
    if (diffMonths <= 18) return 'ano1' as const;
    if (diffMonths <= 30) return 'ano2' as const;
    return 'adulto' as const;
  }, [selectedTalhao, plantingMonth, plantingYear]);

  const currentPhase = hybridPlan?.phase ?? independentPhase;
  const isFormationPhase = currentPhase === 'plantio' || currentPhase === 'ano1' || currentPhase === 'ano2';

  // ─── Fertilization cost from hybrid plan (sum monthly actions for consistency) ─────────
  const fertCostDetails = useMemo(() => {
    if (!hybridPlan) return { items: [] as { name: string; dosePerHa: number; pricePerKg: number; costPerHa: number }[], total: 0 };

    // Sum doses from the monthly schedule to be consistent with shopping list
    const normalizeKey = (name: string) =>
      name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

    const productDoses = new Map<string, { name: string; totalKgHa: number }>();

    for (const mp of hybridPlan.months) {
      for (const action of mp.actions) {
        const key = normalizeKey(action.product.name);
        const existing = productDoses.get(key);
        if (existing) {
          existing.totalKgHa += action.doseMonthKgHa;
        } else {
          productDoses.set(key, { name: action.product.name, totalKgHa: action.doseMonthKgHa });
        }
      }
    }

    // Also add products that only appear as annualDose (e.g. plantio-only MAP)
    if (hybridPlan.phase === 'plantio' || hybridPlan.phase === 'ano1') {
      for (const product of Object.values(hybridPlan.productsByMethod).flat()) {
        const key = normalizeKey(product.name);
        if (!productDoses.has(key) && product.annualDosePerHa > 0) {
          productDoses.set(key, { name: product.name, totalKgHa: product.annualDosePerHa });
        }
      }
    }

    const items: { name: string; dosePerHa: number; pricePerKg: number; costPerHa: number }[] = [];

    productDoses.forEach(({ name, totalKgHa }) => {
      const nameKey = normalizeKey(name);
      let pricePerKg = fertPrices[nameKey] || 0;
      if (!pricePerKg) {
        const partial = Object.entries(fertPrices).find(([k]) => nameKey.includes(k) || k.includes(nameKey));
        if (partial) pricePerKg = partial[1];
      }
      if (!pricePerKg) {
        const firstWord = nameKey.split(/[\s(]/)[0];
        if (firstWord.length >= 3) {
          const wordMatch = Object.entries(fertPrices).find(([k]) => k.split(/[\s(]/)[0] === firstWord);
          if (wordMatch) pricePerKg = wordMatch[1];
        }
      }
      if (pricePerKg > 0 && totalKgHa > 0) {
        items.push({
          name,
          dosePerHa: totalKgHa,
          pricePerKg,
          costPerHa: totalKgHa * pricePerKg,
        });
      }
    });

    return { items, total: items.reduce((s, i) => s + i.costPerHa, 0) };
  }, [hybridPlan, fertPrices]);

  // Cost calculations
  const limingCostPerHa = coffeeData.limingData?.costPerHa || 0;
  const treatmentCostPerHa = coffeeData.treatmentPlan?.totalCostPerHa || 0;
  const fertCostPerHa = fertCostDetails.total;
  const totalCostPerHa = limingCostPerHa + treatmentCostPerHa + fertCostPerHa;
  const totalAreaCost = totalCostPerHa * hectares;
  const costPerSaca = (!isFirstYear && sacas > 0) ? totalCostPerHa / sacas : 0;
  const revenuePerHa = isFirstYear ? 0 : sacas * PRICE_PER_SACA;
  const profitPerHa = revenuePerHa - totalCostPerHa;


  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    classifiedProducts.forEach(p => {
      result[p.id] = monthlyData.reduce((sum, m) => sum + (m.products[p.id] || 0), 0) * hectares;
    });
    return result;
  }, [monthlyData, classifiedProducts, hectares]);

  const mixGroups = useMemo(() => {
    const groups: Record<CompatGroup, ClassifiedProduct[]> = { A: [], B: [], C: [], D: [], E: [] };
    classifiedProducts.forEach(p => groups[p.group].push(p));
    return groups;
  }, [classifiedProducts]);

  const activeGroups = useMemo(() => {
    return (Object.entries(mixGroups) as [CompatGroup, ClassifiedProduct[]][])
      .filter(([, prods]) => prods.length > 0);
  }, [mixGroups]);

  let sectionNum = 0;

  // ─── PDF Generation ────────────────────────────────────────
  const generatePdf = useCallback(async () => {
    if (!reportRef.current) return;
    toast.info('Gerando PDF otimizado para A4...');
    try {
      const el = reportRef.current;
      const originalStyle = el.style.cssText;
      el.style.width = '800px';
      el.style.maxWidth = '800px';
      el.style.padding = '24px';

      el.classList.add('report-print-mode');
      
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 850,
      });

      // Gather break points BEFORE restoring styles (element is still in print layout)
      const scale = canvas.width / el.offsetWidth;
      const breakPoints = new Set<number>();
      const gatherBreakPoints = (parent: HTMLElement, depth: number) => {
        if (depth > 5) return;
        const kids = Array.from(parent.children) as HTMLElement[];
        for (const child of kids) {
          const top = child.getBoundingClientRect().top - el.getBoundingClientRect().top;
          const bottom = top + child.getBoundingClientRect().height;
          breakPoints.add(Math.round(top * scale));
          breakPoints.add(Math.round(bottom * scale));
          const tag = child.tagName.toLowerCase();
          if (['div', 'tbody', 'table', 'section', 'tr', 'ul', 'ol', 'li'].includes(tag)) {
            gatherBreakPoints(child, depth + 1);
          }
        }
      };
      gatherBreakPoints(el, 0);

      el.classList.remove('report-print-mode');
      el.style.cssText = originalStyle;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = pdfHeight - margin * 2;

      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= contentHeight) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgWidth, imgHeight);
      } else {
        const pxPerMm = imgHeight / canvas.height;
        const maxSlicePx = contentHeight / pxPerMm;

        const sortedBreaks = Array.from(breakPoints).sort((a, b) => a - b);
        sortedBreaks.push(canvas.height);

        const slices: { srcY: number; srcH: number }[] = [];
        let currentY = 0;

        while (currentY < canvas.height) {
          const remaining = canvas.height - currentY;
          if (remaining <= maxSlicePx * 1.15) {
            slices.push({ srcY: currentY, srcH: remaining });
            break;
          }

          const idealEnd = currentY + maxSlicePx;
          let bestBreak = idealEnd;
          let bestDist = Infinity;

          for (const bp of sortedBreaks) {
            if (bp <= currentY + 30 * scale) continue;
            if (bp > idealEnd + maxSlicePx * 0.05) break;
            const dist = idealEnd - bp;
            const absDist = Math.abs(dist);
            const penalty = dist < 0 ? absDist * 3 : absDist;
            if (penalty < bestDist) {
              bestDist = penalty;
              bestBreak = bp;
            }
          }

          bestBreak = Math.min(bestBreak, canvas.height);
          slices.push({ srcY: currentY, srcH: bestBreak - currentY });
          currentY = bestBreak;
        }

        const totalPages = slices.length;
        slices.forEach((slice, page) => {
          if (page > 0) pdf.addPage();
          const destH = (slice.srcH / canvas.height) * imgHeight;

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = slice.srcH;
          const ctx = pageCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, slice.srcY, canvas.width, slice.srcH, 0, 0, canvas.width, slice.srcH);
            pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgWidth, destH);
          }

          pdf.setFontSize(8);
          pdf.setTextColor(150);
          pdf.text(`Solo V3 • Página ${page + 1}/${totalPages}`, pdfWidth / 2, pdfHeight - 5, { align: 'center' });
        });
      }

      const date = new Date().toLocaleDateString('pt-BR');
      pdf.save(`Recomendacao_Cafe_${coffeeLabel}_${date}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erro ao gerar PDF');
    }
  }, [coffeeLabel]);

  const handlePrint = useCallback(() => { window.print(); }, []);

  const handleShareWhatsApp = useCallback(() => {
    const text = buildWhatsAppText({
      coffeeLabel, hectares, sacas, totalPlants, plantsPerHa,
      soil: coffeeData.soil, limingData: coffeeData.limingData,
      leafAnalysis: coffeeData.leafAnalysis, fertigation: coffeeData.fertigation,
      spraying: coffeeData.coffeeSpraying, treatmentPlan: coffeeData.treatmentPlan,
      totalCostPerHa, costPerSaca,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }, [coffeeLabel, hectares, sacas, totalPlants, plantsPerHa, coffeeData, totalCostPerHa, costPerSaca]);

  const handleNativeShare = useCallback(async () => {
    const text = buildWhatsAppText({
      coffeeLabel, hectares, sacas, totalPlants, plantsPerHa,
      soil: coffeeData.soil, limingData: coffeeData.limingData,
      leafAnalysis: coffeeData.leafAnalysis, fertigation: coffeeData.fertigation,
      spraying: coffeeData.coffeeSpraying, treatmentPlan: coffeeData.treatmentPlan,
      totalCostPerHa, costPerSaca,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Recomendação — Café ${coffeeLabel}`,
          text: text.replace(/\*/g, '').replace(/_/g, ''),
        });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text.replace(/\*/g, '').replace(/_/g, ''));
      toast.success('Relatório copiado para a área de transferência!');
    }
  }, [coffeeLabel, hectares, sacas, totalPlants, plantsPerHa, coffeeData, totalCostPerHa, costPerSaca]);

  const handleSaveToHistory = useCallback(async () => {
    if (!coffeeData.selectedTalhaoId) return;
    setSaving(true);
    const ok = await saveToHistory(coffeeData.selectedTalhaoId, coffeeData);
    setSaving(false);
    if (ok) {
      setSaved(true);
      toast.success('Planejamento salvo com sucesso no histórico do talhão!', { duration: 4000 });
    }
  }, [coffeeData, saveToHistory]);

  const handleNewPlanning = useCallback(() => {
    setSaved(false);
    resetCoffee();
  }, [resetCoffee]);

  // Auto-save removed — user saves manually via button

  const getPrimaryNutrients = (p: ClassifiedProduct): string => {
    const nuts: string[] = [];
    if (p.macro_n > 0) nuts.push(`N ${p.macro_n}%`);
    if (p.macro_p2o5 > 0) nuts.push(`P₂O₅ ${p.macro_p2o5}%`);
    if (p.macro_k2o > 0) nuts.push(`K₂O ${p.macro_k2o}%`);
    if (p.macro_s > 0) nuts.push(`S ${p.macro_s}%`);
    if (p.micro_b > 0) nuts.push(`B ${p.micro_b}%`);
    if (p.micro_zn > 0) nuts.push(`Zn ${p.micro_zn}%`);
    if (p.micro_cu > 0) nuts.push(`Cu ${p.micro_cu}%`);
    if (p.micro_mn > 0) nuts.push(`Mn ${p.micro_mn}%`);
    if (p.micro_fe > 0) nuts.push(`Fe ${p.micro_fe}%`);
    if (p.micro_mo > 0) nuts.push(`Mo ${p.micro_mo}%`);
    return nuts.join(' | ');
  };

  // ─── Derived demand aliases (from hook moved above) ───
  const demandN = unifiedDemand.n;
  const demandK = unifiedDemand.k;
  const demandP = unifiedDemand.p;
  const demandS = unifiedDemand.s;

  // ─── Build shopping items for simplified report ─────────────
  const simplifiedShoppingItems = useMemo((): ShoppingItem[] => {
    if (!hybridPlan) return [];
    const normalizeKey = (name: string) =>
      name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

    const normalizeForLookup = (name: string) =>
      name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

    const lookupMeta = (name: string) => {
      const key = normalizeForLookup(name);
      let meta = insumoMeta[key];
      if (!meta) {
        const partial = Object.entries(insumoMeta).find(([k]) => key.includes(k) || k.includes(key));
        if (partial) meta = partial[1];
      }
      if (!meta) {
        const firstWord = key.split(/[\s(]/)[0];
        if (firstWord.length >= 3) {
          const wordMatch = Object.entries(insumoMeta).find(([k]) => k.split(/[\s(]/)[0] === firstWord);
          if (wordMatch) meta = wordMatch[1];
        }
      }
      return meta || { tipoProduto: '', tamanhoUnidade: 0, medida: 'kg' };
    };

    const productTotals = new Map<string, { name: string; type: string; totalKgHa: number }>();
    for (const mp of hybridPlan.months) {
      for (const action of mp.actions) {
        const key = normalizeKey(action.product.name);
        const existing = productTotals.get(key);
        if (existing) {
          existing.totalKgHa += action.doseMonthKgHa;
        } else {
          productTotals.set(key, { name: action.product.name, type: action.product.tipoProduto, totalKgHa: action.doseMonthKgHa });
        }
      }
    }

    if (hybridPlan.phase === 'plantio' || hybridPlan.phase === 'ano1') {
      for (const product of Object.values(hybridPlan.productsByMethod).flat()) {
        const key = normalizeKey(product.name);
        if (!productTotals.has(key) && product.annualDosePerHa > 0) {
          productTotals.set(key, { name: product.name, type: product.tipoProduto, totalKgHa: product.annualDosePerHa });
        }
      }
    }

    const costNormalize = (name: string) =>
      name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const costLookup = new Map<string, { dosePerHa: number; pricePerKg: number; costPerHa: number }>();
    fertCostDetails.items.forEach(item => costLookup.set(costNormalize(item.name), item));
    const findCost = (name: string) => {
      const key = costNormalize(name);
      let match = costLookup.get(key);
      if (!match) {
        for (const [k, v] of costLookup) {
          if (key.includes(k) || k.includes(key)) { match = v; break; }
        }
      }
      if (!match) {
        const firstWord = key.split(/[\s(]/)[0];
        if (firstWord.length >= 3) {
          for (const [k, v] of costLookup) {
            if (k.split(/[\s(]/)[0] === firstWord) { match = v; break; }
          }
        }
      }
      return match;
    };

    const items: ShoppingItem[] = [];
    productTotals.forEach(({ name, type, totalKgHa }) => {
      const totalArea = totalKgHa * hectares;
      if (totalArea > 0.001) {
        const meta = lookupMeta(name);
        const cost = findCost(name);
        items.push({
          name,
          tipoProduto: meta.tipoProduto || type || 'Fertilizante',
          dosePerHa: cost ? cost.dosePerHa : totalKgHa,
          totalKg: totalArea,
          tamanhoUnidade: meta.tamanhoUnidade,
          medida: meta.medida,
          pricePerKg: cost ? cost.pricePerKg : 0,
          costPerHa: cost ? cost.costPerHa : 0,
        });
      }
    });
    return items;
  }, [hybridPlan, hectares, insumoMeta, fertCostDetails]);

  const simplifiedGrandTotal = useMemo(() => {
    return simplifiedShoppingItems.reduce((sum, i) => sum + i.costPerHa, 0);
  }, [simplifiedShoppingItems]);

  // ─── Classified products for compatibility ──────────────────
  const classifiedProductsSimple = useMemo((): ClassifiedProductSimple[] => {
    return allProducts.map(p => {
      const insumo = nutrientProducts.find(i => i.id === (p as any).insumoId);
      const group = insumo
        ? classifyInsumo({
            nome: p.name,
            tipo_produto: p.type || 'Fertilizante',
            macro_n: insumo.macro_n || 0,
            macro_p2o5: insumo.macro_p2o5 || 0,
            macro_k2o: insumo.macro_k2o || 0,
            macro_s: insumo.macro_s || 0,
            micro_b: insumo.micro_b || 0,
            micro_zn: insumo.micro_zn || 0,
            micro_mn: insumo.micro_mn || 0,
            micro_cu: insumo.micro_cu || 0,
            micro_fe: insumo.micro_fe || 0,
          } as InsumoForClassification)
        : 'C' as CompatGroup;
      return { id: p.id, name: p.name, type: p.type || 'Fertilizante', group };
    });
  }, [allProducts, nutrientProducts]);

  // ─── Nutrient Balance (Demanda vs Fornecido) ────────────────
  // FONTE ÚNICA DE VERDADE: hybridPlan.demandN/K/P são as demandas que dimensionaram
  // os produtos. Usar esses valores garante que demanda, fornecido, g/planta e saldo
  // sejam todos derivados do mesmo plano — sem divergências com outras tabelas.
  const nutrientBalance = useMemo((): NutrientBalanceItem[] => {
    if (!hybridPlan) return [];

    const normalizeProductName = (name: string) =>
      name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

    // ── Demanda: usa MESMA fórmula da etapa de fertirrigação (demandOverrides) ──
    // para garantir consistência entre a tabela "Nutrientes Fornecidos pelo Mix"
    // e o "Balanço Nutricional" do relatório.
    const dN = demandN;
    const dP = demandP;
    const dK = demandK;
    const dS = demandS;

    // ── Fornecido: soma anual real a partir das ações mensais do plano ──
    type SourceType = 'lanco' | 'fertigation' | 'spraying';
    const classifySource = (method: string): SourceType => {
      if (method === 'solo_lanco') return 'lanco';
      if (method === 'foliar') return 'spraying';
      return 'fertigation'; // fertirrigacao, jato_trator, cobertura
    };

    const annualByProduct = new Map<string, {
      annualDoseKgHa: number;
      source: SourceType;
      macro_n: number;
      macro_p2o5: number;
      macro_k2o: number;
      macro_s: number;
    }>();

    hybridPlan.months.forEach(month => {
      month.actions.forEach(action => {
        const key = normalizeProductName(action.product.name);
        const existing = annualByProduct.get(key);

        if (existing) {
          existing.annualDoseKgHa += action.doseMonthKgHa;
        } else {
          annualByProduct.set(key, {
            annualDoseKgHa: action.doseMonthKgHa,
            source: classifySource(action.product.method),
            macro_n: action.product.macro_n || 0,
            macro_p2o5: action.product.macro_p2o5 || 0,
            macro_k2o: action.product.macro_k2o || 0,
            macro_s: action.product.macro_s || 0,
          });
        }
      });
    });

    // Cobrir casos de implantação/formação com produtos apenas anuais
    if (hybridPlan.phase === 'plantio' || hybridPlan.phase === 'ano1') {
      Object.values(hybridPlan.productsByMethod).flat().forEach(product => {
        const key = normalizeProductName(product.name);
        if (!annualByProduct.has(key) && product.annualDosePerHa > 0) {
          annualByProduct.set(key, {
            annualDoseKgHa: product.annualDosePerHa,
            source: classifySource(product.method),
            macro_n: product.macro_n || 0,
            macro_p2o5: product.macro_p2o5 || 0,
            macro_k2o: product.macro_k2o || 0,
            macro_s: product.macro_s || 0,
          });
        }
      });
    }

    const emptyNutrients = () => ({ n: 0, p: 0, k: 0, s: 0 });
    const supply = emptyNutrients();
    const supplyBySource: Record<SourceType, { n: number; p: number; k: number; s: number }> = {
      lanco: emptyNutrients(),
      fertigation: emptyNutrients(),
      spraying: emptyNutrients(),
    };

    Array.from(annualByProduct.values()).forEach(p => {
      const nKg = (p.annualDoseKgHa * p.macro_n) / 100;
      const pKg = (p.annualDoseKgHa * p.macro_p2o5) / 100;
      const kKg = (p.annualDoseKgHa * p.macro_k2o) / 100;
      const sKg = (p.annualDoseKgHa * p.macro_s) / 100;
      supply.n += nKg; supply.p += pKg; supply.k += kKg; supply.s += sKg;
      const src = supplyBySource[p.source];
      src.n += nKg; src.p += pKg; src.k += kKg; src.s += sKg;
    });

    // ── Trava absoluta: se fornecido > demanda, escalar proporcionalmente ──
    // Isso garante que o Balanço Nutricional nunca exiba "Excesso"
    const nutrients = ['n', 'p', 'k', 's'] as const;
    const demands = { n: dN, p: dP, k: dK, s: dS };
    
    for (const nut of nutrients) {
      const dem = demands[nut];
      const sup = supply[nut];
      if (dem > 0 && sup > dem) {
        // Calcular fator de escala para reduzir todas as fontes proporcionalmente
        const scaleFactor = dem / sup;
        supply[nut] = dem; // Cap exato na demanda
        // Escalar as fontes por source proporcionalmente
        supplyBySource.lanco[nut] *= scaleFactor;
        supplyBySource.fertigation[nut] *= scaleFactor;
        supplyBySource.spraying[nut] *= scaleFactor;
      }
    }

    const l = supplyBySource.lanco;
    const f = supplyBySource.fertigation;
    const sp = supplyBySource.spraying;

    return [
      { nutrient: 'Nitrogênio (N)', demandMin: dN * 0.8, demand: dN, supply: supply.n, supplyLanco: l.n, supplyFertigation: f.n, supplySpraying: sp.n, unit: 'kg/ha' },
      { nutrient: 'Fósforo (P₂O₅)', demandMin: dP * 0.8, demand: dP, supply: supply.p, supplyLanco: l.p, supplyFertigation: f.p, supplySpraying: sp.p, unit: 'kg/ha' },
      { nutrient: 'Potássio (K₂O)', demandMin: dK * 0.8, demand: dK, supply: supply.k, supplyLanco: l.k, supplyFertigation: f.k, supplySpraying: sp.k, unit: 'kg/ha' },
      { nutrient: 'Enxofre (S)', demandMin: dS * 0.8, demand: dS, supply: supply.s, supplyLanco: l.s, supplyFertigation: f.s, supplySpraying: sp.s, unit: 'kg/ha' },
    ].filter(item => item.demand > 0 || item.supply > 0);
  }, [hybridPlan, sacas, plantsPerHa]);

  return (
    <div className="space-y-6 coffee-report" style={{ animation: 'fade-in 0.3s ease-out' }}>
      {/* ─── Report Mode Toggle ─── */}
      <div className="flex items-center justify-center gap-2 no-print">
        <Button
          variant={reportMode === 'simplified' ? 'default' : 'outline'}
          onClick={() => setReportMode('simplified')}
          className="gap-2"
          size="sm"
        >
          <Leaf className="w-4 h-4" />
          Relatório Simplificado
        </Button>
        <Button
          variant={reportMode === 'complete' ? 'default' : 'outline'}
          onClick={() => setReportMode('complete')}
          className="gap-2"
          size="sm"
        >
          <Beaker className="w-4 h-4" />
          Relatório Completo
        </Button>
      </div>

      {reportMode === 'simplified' ? (
        <CoffeeSimplifiedReport
          ref={reportRef}
          coffeeType={coffeeData.coffeeType}
          coffeeLabel={coffeeLabel}
          safraLabel={safraLabel}
          profileName={profile?.full_name || null}
          isConsultor={isConsultor}
          creaArt={profile?.crea_art || null}
          telefone={profile?.telefone || null}
          hectares={hectares}
          plantsPerHa={plantsPerHa}
          totalPlants={totalPlants}
          sacas={sacas}
          isFormationPhase={isFormationPhase}
          hybridPlan={hybridPlan}
          shoppingItems={simplifiedShoppingItems}
          grandTotalCost={simplifiedGrandTotal}
          allClassifiedProducts={classifiedProductsSimple}
          nutrientBalance={nutrientBalance}
        />
      ) : (
        /* ─── Complete Report ─── */
        <CoffeeCompleteReport
          ref={reportRef}
          coffeeType={coffeeData.coffeeType}
          coffeeLabel={coffeeLabel}
          safraLabel={safraLabel}
          profileName={profile?.full_name || null}
          isConsultor={isConsultor}
          creaArt={profile?.crea_art || null}
          hectares={hectares}
          plantsPerHa={plantsPerHa}
          totalPlants={totalPlants}
          sacas={sacas}
          isFormationPhase={isFormationPhase}
          hybridPlan={hybridPlan}
          shoppingItems={simplifiedShoppingItems}
          grandTotalCost={simplifiedGrandTotal}
          allClassifiedProducts={classifiedProductsSimple}
          soil={coffeeData.soil ? {
            ca: coffeeData.soil.ca,
            mg: coffeeData.soil.mg,
            k: coffeeData.soil.k,
            p: coffeeData.soil.p,
            s: coffeeData.soil.s ?? 0,
            hAl: coffeeData.soil.hAl,
            vPercent: coffeeData.soil.vPercent,
            mo: coffeeData.soil.mo ?? undefined,
            zn: coffeeData.soil.zn ?? undefined,
            b: coffeeData.soil.b ?? undefined,
            mn: coffeeData.soil.mn ?? undefined,
            fe: coffeeData.soil.fe ?? undefined,
            cu: coffeeData.soil.cu ?? undefined,
            textura: coffeeData.soil.texturaEstimada ?? undefined,
          } : null}
          limingData={coffeeData.limingData}
          demandN={demandN}
          demandK={demandK}
          demandP={demandP}
          demandS={demandS}
          fertCostPerHa={fertCostPerHa}
          limingCostPerHa={limingCostPerHa}
          treatmentCostPerHa={treatmentCostPerHa}
          totalCostPerHa={totalCostPerHa}
          costPerSaca={costPerSaca}
          revenuePerHa={revenuePerHa}
          profitPerHa={profitPerHa}
          fertCostItems={fertCostDetails.items}
          nutrientBalance={nutrientBalance}
        />
      )}

      {/* ─── Action Buttons (outside printable area) ─── */}
      {filledSections > 0 && (
        <div className="space-y-3 no-print">
          {coffeeData.selectedTalhaoId && !saved && (
            <Button
              size="lg"
              onClick={handleSaveToHistory}
              disabled={saving}
              className="w-full gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Salvando...' : 'Salvar no Histórico do Talhão'}
            </Button>
          )}
          {saved && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                <CheckCircle className="w-5 h-5 shrink-0" />
                Planejamento salvo com sucesso!
              </div>
              <Button
                size="lg"
                onClick={handleNewPlanning}
                className="w-full gap-2"
                variant="default"
              >
                <Sprout className="w-4 h-4" />
                Novo Planejamento
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" onClick={generatePdf} className="gap-2" variant="default">
              <FileDown className="w-4 h-4" />
              Exportar PDF
            </Button>
            <Button size="lg" onClick={handlePrint} className="gap-2" variant="outline">
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" onClick={handleShareWhatsApp} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button size="lg" onClick={handleNativeShare} className="gap-2" variant="outline">
              <Share2 className="w-4 h-4" />
              Compartilhar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
