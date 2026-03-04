import { useState, useMemo } from 'react';
import { useCoffee, type LeafAnalysisData } from '@/contexts/CoffeeContext';
import { NutrientRadarChart } from '@/components/coffee/NutrientRadarChart';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FlaskConical,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShoppingCart,
  Droplets,
  MapPin,
  Calculator,
  ArrowUp,
  Minus,
  Leaf,
  Calendar,
  Sprout,
  Info,
} from 'lucide-react';
import {
  checkMixCompatibility,
  type ClassifiedProduct,
  type CompatAlert,
  GROUP_INFO,
  type CompatGroup,
} from '@/lib/compatibilityEngine';
import {
  PHENOLOGY_STAGES,
  getStageForMonth,
  getDynamicTarget,
  MONTH_NAMES,
  type PhenologyStage,
} from '@/data/coffeePhenology';

// ─── Constants ───────────────────────────────────────────────
const BIOMASS_KG = 9000; // Café adulto (kg/ha)
const EFFICIENCY = 0.70; // 70% efficiency

// ─── Reference Table (Static fallbacks) ─────────────────────
interface NutrientReference {
  id: string;
  symbol: string;
  name: string;
  unit: 'ppm' | '%';
  idealMin: number;
  idealMax: number;
  meta: number;
  isPpm: boolean;
}

const REFERENCE_TABLE: NutrientReference[] = [
  { id: 'n',  symbol: 'N',  name: 'Nitrogênio', unit: '%',   idealMin: 3.0,  idealMax: 3.5,  meta: 3.25, isPpm: false },
  { id: 'p',  symbol: 'P',  name: 'Fósforo',    unit: '%',   idealMin: 0.12, idealMax: 0.15, meta: 0.135, isPpm: false },
  { id: 'k',  symbol: 'K',  name: 'Potássio',   unit: '%',   idealMin: 1.8,  idealMax: 2.3,  meta: 2.05, isPpm: false },
  { id: 'mg', symbol: 'Mg', name: 'Magnésio',   unit: '%',   idealMin: 0.35, idealMax: 0.5,  meta: 0.425, isPpm: false },
  { id: 'ca', symbol: 'Ca', name: 'Cálcio',     unit: '%',   idealMin: 1.0,  idealMax: 1.5,  meta: 1.25, isPpm: false },
  { id: 's',  symbol: 'S',  name: 'Enxofre',    unit: '%',   idealMin: 0.15, idealMax: 0.20, meta: 0.175, isPpm: false },
  { id: 'zn', symbol: 'Zn', name: 'Zinco',      unit: 'ppm', idealMin: 10,   idealMax: 20,   meta: 15, isPpm: true },
  { id: 'b',  symbol: 'B',  name: 'Boro',       unit: 'ppm', idealMin: 40,   idealMax: 80,   meta: 60, isPpm: true },
  { id: 'cu', symbol: 'Cu', name: 'Cobre',      unit: 'ppm', idealMin: 10,   idealMax: 20,   meta: 15, isPpm: true },
  { id: 'mn', symbol: 'Mn', name: 'Manganês',   unit: 'ppm', idealMin: 50,   idealMax: 150,  meta: 100, isPpm: true },
  { id: 'fe', symbol: 'Fe', name: 'Ferro',      unit: 'ppm', idealMin: 50,   idealMax: 200,  meta: 125, isPpm: true },
  { id: 'mo', symbol: 'Mo', name: 'Molibdênio', unit: 'ppm', idealMin: 0.1,  idealMax: 1.0,  meta: 0.55, isPpm: true },
];

// ─── Product Database ────────────────────────────────────────
interface ProductDB {
  id: number;
  name: string;
  nutrient: string;
  concentration: number;
  group: CompatGroup;
  type: string;
}

const PRODUCTS_DB: ProductDB[] = [
  { id: 1,  name: 'Ureia',                  nutrient: 'n',  concentration: 45, group: 'C', type: 'Fonte N' },
  { id: 2,  name: 'Sulfato de Zinco',       nutrient: 'zn', concentration: 20, group: 'B', type: 'Sulfato' },
  { id: 3,  name: 'Kellus Zinc (Quelato)',   nutrient: 'zn', concentration: 15, group: 'C', type: 'Quelato' },
  { id: 4,  name: 'Ácido Bórico',           nutrient: 'b',  concentration: 17, group: 'B', type: 'Ácido' },
  { id: 5,  name: 'Boro Líquido (MEA)',      nutrient: 'b',  concentration: 10, group: 'C', type: 'Líquido' },
  { id: 6,  name: 'Sulfato de Manganês',    nutrient: 'mn', concentration: 30, group: 'B', type: 'Sulfato' },
  { id: 7,  name: 'Sulfato de Cobre',       nutrient: 'cu', concentration: 25, group: 'B', type: 'Sulfato' },
  { id: 8,  name: 'Molibdato de Sódio',     nutrient: 'mo', concentration: 39, group: 'C', type: 'Sal' },
  { id: 9,  name: 'MAP (Fosfato Monoamônico)', nutrient: 'p', concentration: 52, group: 'B', type: 'Fosfato' },
  { id: 10, name: 'Cloreto de Potássio (KCl)', nutrient: 'k', concentration: 60, group: 'C', type: 'Cloreto' },
  { id: 11, name: 'Sulfato de Magnésio',    nutrient: 'mg', concentration: 10, group: 'B', type: 'Sulfato' },
  { id: 12, name: 'Nitrato de Cálcio',      nutrient: 'ca', concentration: 19, group: 'A', type: 'Nitrato' },
  { id: 13, name: 'Sulfato de Amônia',      nutrient: 's',  concentration: 24, group: 'B', type: 'Sulfato' },
  { id: 14, name: 'Sulfato Ferroso',        nutrient: 'fe', concentration: 20, group: 'B', type: 'Sulfato' },
];

// ─── Types ───────────────────────────────────────────────────
type RowStatus = 'deficit' | 'adequate' | 'excess';

interface RecommendationRow {
  ref: NutrientReference;
  dynamicTarget: { min: number; max: number; meta: number };
  currentValue: number | null;
  status: RowStatus;
  deficitPpm: number;
  needGrams: number;
  availableProducts: ProductDB[];
  selectedProductId: number | null;
  doseKgHa: number;
  aporteRealPpm: number;
}

// ─── Math Core ───────────────────────────────────────────────
function calcDoseKgHa(deficitPpm: number, concentrationPct: number): number {
  if (deficitPpm <= 0 || concentrationPct <= 0) return 0;
  return (deficitPpm * (BIOMASS_KG / 1000)) / (concentrationPct * EFFICIENCY);
}

function calcAporteReal(doseKgHa: number, concentrationPct: number, biomassKg: number): number {
  if (doseKgHa <= 0 || concentrationPct <= 0 || biomassKg <= 0) return 0;
  const gramsProvided = doseKgHa * (concentrationPct / 100) * 1000;
  return (gramsProvided * 1000) / biomassKg;
}

// ─── Phenology Stage Card ────────────────────────────────────
function PhenologyCard({ stage, month }: { stage: PhenologyStage; month: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-secondary/30 border-b border-border">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center bg-secondary', stage.color)}>
          <Sprout className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold', stage.color)}>{stage.name}</p>
          <p className="text-[10px] text-muted-foreground">{MONTH_NAMES[month - 1]} • Mês {month}</p>
        </div>
        <Calendar className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{stage.description}</p>

        {/* Stage timeline visual */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const isActive = stage.months.includes(m);
            const isCurrent = m === month;
            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-full h-2 rounded-full transition-colors',
                    isCurrent ? 'bg-primary ring-2 ring-primary/30' :
                    isActive ? 'bg-primary/40' : 'bg-secondary'
                  )}
                />
                <span className={cn(
                  'text-[8px] leading-none',
                  isCurrent ? 'font-bold text-primary' :
                  isActive ? 'text-muted-foreground font-medium' : 'text-muted-foreground/50'
                )}>
                  {MONTH_NAMES[i].slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Tips */}
        {stage.tips.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Dicas da Fase</p>
            {stage.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                <Leaf className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        )}

        {/* Key products */}
        <div className="flex flex-wrap gap-1.5">
          {stage.keyProducts.map(p => (
            <Badge key={p} variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
              {p}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────
export function FoliarRecommendationTable() {
  const { coffeeData } = useCoffee();
  const leafAnalysis = coffeeData.leafAnalysis;
  const hectares = coffeeData.hectares || 1;

  // Current month (1-12), user can override
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const currentStage = useMemo(() => getStageForMonth(selectedMonth), [selectedMonth]);

  const [overrides, setOverrides] = useState<Record<string, { productId?: number; dose?: number }>>({});
  const [areaHa, setAreaHa] = useState(hectares);
  const [volumeLHa, setVolumeLHa] = useState(400);

  const rows = useMemo<RecommendationRow[]>(() => {
    return REFERENCE_TABLE.map(ref => {
      const leafEntry = leafAnalysis?.[ref.id];
      const currentValue = leafEntry?.value ?? null;

      // Get dynamic target from phenology calendar
      const dynamicTarget = getDynamicTarget(ref.id, selectedMonth, ref.meta, ref.idealMin, ref.idealMax);

      let status: RowStatus = 'adequate';
      let deficitPpm = 0;

      if (currentValue !== null) {
        deficitPpm = dynamicTarget.meta - currentValue;
        if (deficitPpm > 0) {
          status = 'deficit';
        } else if (currentValue > dynamicTarget.max) {
          status = 'excess';
          deficitPpm = dynamicTarget.max - currentValue;
        }
      }

      const needGrams = Math.max(0, deficitPpm) > 0 ? (Math.max(0, deficitPpm) * BIOMASS_KG) / 1000 : 0;

      const availableProducts = PRODUCTS_DB.filter(p => p.nutrient === ref.id);

      const override = overrides[ref.id];
      let selectedProductId: number | null = null;
      if (override?.productId !== undefined) {
        selectedProductId = override.productId;
      } else if (status === 'deficit' && availableProducts.length > 0) {
        selectedProductId = [...availableProducts].sort((a, b) => b.concentration - a.concentration)[0].id;
      }

      const selectedProduct = availableProducts.find(p => p.id === selectedProductId);
      const concentration = selectedProduct?.concentration ?? 0;

      let doseKgHa = 0;
      if (override?.dose !== undefined) {
        doseKgHa = override.dose;
      } else if (deficitPpm > 0 && concentration > 0) {
        doseKgHa = calcDoseKgHa(deficitPpm, concentration);
      }

      const aporteRealPpm = calcAporteReal(doseKgHa, concentration, BIOMASS_KG);

      return {
        ref,
        dynamicTarget,
        currentValue,
        status,
        deficitPpm,
        needGrams,
        availableProducts,
        selectedProductId,
        doseKgHa,
        aporteRealPpm,
      };
    });
  }, [leafAnalysis, overrides, selectedMonth]);

  // Shopping list
  const shoppingList = useMemo(() => {
    return rows
      .filter(r => r.doseKgHa > 0 && r.selectedProductId !== null)
      .map(r => {
        const product = PRODUCTS_DB.find(p => p.id === r.selectedProductId)!;
        const totalKg = r.doseKgHa * areaHa;
        return {
          nutrientId: r.ref.id,
          product,
          doseKgHa: r.doseKgHa,
          totalKg,
        };
      });
  }, [rows, areaHa]);

  // Compatibility check
  const compatAlerts = useMemo<CompatAlert[]>(() => {
    const classified: ClassifiedProduct[] = shoppingList.map(item => ({
      id: String(item.product.id),
      name: item.product.name,
      type: item.product.type,
      group: item.product.group,
    }));
    return checkMixCompatibility(classified);
  }, [shoppingList]);

  const hasLeafData = leafAnalysis && Object.values(leafAnalysis).some(e => e && e.value > 0);
  const deficitRows = rows.filter(r => r.status === 'deficit');
  const adequateRows = rows.filter(r => r.status === 'adequate' && r.currentValue !== null);
  const excessRows = rows.filter(r => r.status === 'excess');

  if (!hasLeafData) return null;

  const handleProductChange = (nutrientId: string, productIdStr: string) => {
    const productId = productIdStr === 'none' ? null : Number(productIdStr);
    setOverrides(prev => ({
      ...prev,
      [nutrientId]: { ...prev[nutrientId], productId: productId ?? undefined, dose: undefined },
    }));
  };

  const handleDoseChange = (nutrientId: string, val: string) => {
    const dose = parseFloat(val.replace(',', '.'));
    setOverrides(prev => ({
      ...prev,
      [nutrientId]: { ...prev[nutrientId], dose: isNaN(dose) ? 0 : dose },
    }));
  };

  return (
    <div className="space-y-6 mt-8">
      {/* ─── Phenology Stage Card ─────────────────────────── */}
      <PhenologyCard stage={currentStage} month={selectedMonth} />

      {/* ─── Radar Chart ─────────────────────────────────── */}
      <NutrientRadarChart leafAnalysis={leafAnalysis} month={selectedMonth} />

      {/* ─── Month Selector + Header ─────────────────────── */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Recomendação Dinâmica por Fase</h3>
          <p className="text-xs text-muted-foreground">
            Metas ajustadas para <span className={cn('font-semibold', currentStage.color)}>{currentStage.name}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Select value={String(selectedMonth)} onValueChange={(v) => { setSelectedMonth(Number(v)); setOverrides({}); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => {
                const stage = getStageForMonth(i + 1);
                return (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', stage.color.replace('text-', 'bg-'))} />
                      <span>{name}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {deficitRows.length > 0 && (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
            {deficitRows.length} déficit
          </Badge>
        )}
        {adequateRows.length > 0 && (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
            {adequateRows.length} OK
          </Badge>
        )}
        {excessRows.length > 0 && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
            {excessRows.length} excesso
          </Badge>
        )}
      </div>

      {/* ─── Smart Table ─────────────────────────────────── */}
      <div className="overflow-auto rounded-xl border border-border">
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider first:rounded-tl-xl">
                Nutriente
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Análise
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="flex items-center justify-center gap-1">
                  Meta
                  <Info className="w-3 h-3 text-primary/60" />
                </div>
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Déficit
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider min-w-[160px]">
                Produto Sugerido
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Dose (kg/ha)
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider last:rounded-tr-xl">
                Aporte Real
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const hasValue = row.currentValue !== null;
              if (!hasValue) return null;

              const selectedProduct = PRODUCTS_DB.find(p => p.id === row.selectedProductId);
              const groupInfo = selectedProduct ? GROUP_INFO[selectedProduct.group] : null;
              const isLast = idx === rows.length - 1;

              return (
                <tr
                  key={row.ref.id}
                  className={cn(
                    'border-b border-border/30 transition-colors',
                    row.status === 'deficit' && 'bg-destructive/5',
                    row.status === 'excess' && 'bg-amber-500/5',
                  )}
                >
                  {/* Nutrient */}
                  <td className={cn('px-3 py-2.5', isLast && 'first:rounded-bl-xl')}>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0',
                        row.status === 'deficit' ? 'bg-destructive/15 text-destructive' :
                        row.status === 'excess' ? 'bg-amber-500/15 text-amber-600' :
                        'bg-emerald-500/15 text-emerald-600'
                      )}>
                        {row.ref.symbol}
                      </span>
                      <span className="font-medium text-foreground hidden sm:inline">{row.ref.name}</span>
                    </div>
                  </td>

                  {/* Analysis Value */}
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-semibold text-foreground">
                      {row.currentValue?.toFixed(row.ref.isPpm ? 1 : 2)}
                    </span>
                    <span className="text-muted-foreground ml-1">{row.ref.unit}</span>
                  </td>

                  {/* Dynamic Target */}
                  <td className="px-3 py-2.5 text-center">
                    <div>
                      <span className="font-medium text-foreground">
                        {row.dynamicTarget.meta.toFixed(row.ref.isPpm ? 1 : 2)}
                      </span>
                      <span className="text-muted-foreground ml-1">{row.ref.unit}</span>
                    </div>
                    <p className="text-[8px] text-muted-foreground/70 mt-0.5">
                      {row.dynamicTarget.min.toFixed(row.ref.isPpm ? 0 : 2)}–{row.dynamicTarget.max.toFixed(row.ref.isPpm ? 0 : 2)}
                    </p>
                  </td>

                  {/* Status Badge */}
                  <td className="px-3 py-2.5 text-center">
                    {row.status === 'deficit' && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10">
                        <XCircle className="w-3 h-3 text-destructive" />
                        <span className="text-destructive font-medium">Abaixo</span>
                      </div>
                    )}
                    {row.status === 'adequate' && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Adequado</span>
                      </div>
                    )}
                    {row.status === 'excess' && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10">
                        <ArrowUp className="w-3 h-3 text-amber-600" />
                        <span className="text-amber-600 font-medium">Excesso</span>
                      </div>
                    )}
                  </td>

                  {/* Deficit */}
                  <td className="px-3 py-2.5 text-center">
                    {row.status === 'deficit' ? (
                      <div>
                        <span className="font-bold text-destructive">
                          +{row.deficitPpm.toFixed(row.ref.isPpm ? 1 : 2)} {row.ref.unit}
                        </span>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          {row.needGrams.toFixed(1)} g/ha
                        </p>
                      </div>
                    ) : row.status === 'excess' ? (
                      <span className="text-amber-600 font-medium">
                        {row.deficitPpm.toFixed(row.ref.isPpm ? 1 : 2)} {row.ref.unit}
                      </span>
                    ) : (
                      <span className="text-emerald-600">
                        <Minus className="w-3 h-3 inline" /> OK
                      </span>
                    )}
                  </td>

                  {/* Product Selector */}
                  <td className="px-3 py-2.5">
                    {row.availableProducts.length > 0 ? (
                      <Select
                        value={row.selectedProductId !== null ? String(row.selectedProductId) : 'none'}
                        onValueChange={(val) => handleProductChange(row.ref.id, val)}
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">— Nenhum —</span>
                          </SelectItem>
                          {row.availableProducts.map(p => {
                            const gi = GROUP_INFO[p.group];
                            return (
                              <SelectItem key={p.id} value={String(p.id)}>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    'w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border',
                                    gi.badgeColor
                                  )}>
                                    {p.group}
                                  </span>
                                  <span>{p.name}</span>
                                  <span className="text-muted-foreground">({p.concentration}%)</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground text-center block">—</span>
                    )}
                    {groupInfo && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 text-center">
                        Grupo {selectedProduct!.group}: {groupInfo.desc}
                      </p>
                    )}
                  </td>

                  {/* Dose (editable) */}
                  <td className="px-3 py-2.5 text-center">
                    {row.status === 'deficit' && row.selectedProductId ? (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={row.doseKgHa.toFixed(2)}
                        onChange={(e) => handleDoseChange(row.ref.id, e.target.value)}
                        className="w-20 h-7 text-xs text-center mx-auto bg-background"
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Aporte Real */}
                  <td className={cn('px-3 py-2.5 text-center', isLast && 'last:rounded-br-xl')}>
                    {row.aporteRealPpm > 0 ? (
                      <div>
                        <span className="font-semibold text-primary">
                          +{row.aporteRealPpm.toFixed(row.ref.isPpm ? 1 : 2)}
                        </span>
                        <span className="text-muted-foreground ml-1">{row.ref.unit}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Mix de Calda — Ordem de Serviço ───────────────── */}
      {shoppingList.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex-1">
              Ordem de Serviço — Mix de Calda
            </h3>
            <Badge variant="outline" className={cn('text-[10px]', currentStage.color, 'border-current/30')}>
              {currentStage.name}
            </Badge>
          </div>
          <div className="p-5 space-y-5">
            {/* Area + Volume inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Área Total (ha)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={areaHa}
                  onChange={(e) => setAreaHa(Number(e.target.value) || 1)}
                  className="h-9 text-sm font-semibold text-center"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" />
                  Volume de Calda (L/ha)
                </label>
                <Input
                  type="number"
                  step="10"
                  min="10"
                  value={volumeLHa}
                  onChange={(e) => setVolumeLHa(Number(e.target.value) || 400)}
                  className="h-9 text-sm font-semibold text-center"
                />
              </div>
            </div>

            {/* Shopping List */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Lista de Compras
              </p>
              {shoppingList.map(item => {
                const gi = GROUP_INFO[item.product.group];
                return (
                  <div
                    key={item.nutrientId}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
                  >
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0',
                      gi.badgeColor
                    )}>
                      {item.product.group}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.product.type} • {item.product.concentration}% • Grupo {item.product.group}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">
                        {item.totalKg < 1 ? `${(item.totalKg * 1000).toFixed(0)} g` : `${item.totalKg.toFixed(2)} kg`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.doseKgHa < 1 ? `${(item.doseKgHa * 1000).toFixed(0)} g/ha` : `${item.doseKgHa.toFixed(2)} kg/ha`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Volume Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Volume Total</p>
                <p className="text-lg font-bold text-foreground">
                  {(volumeLHa * areaHa).toLocaleString()} L
                </p>
              </div>
              <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Área</p>
                <p className="text-lg font-bold text-foreground">{areaHa} ha</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Produtos</p>
                <p className="text-lg font-bold text-foreground">{shoppingList.length}</p>
              </div>
            </div>

            {/* Compatibility Alerts */}
            {compatAlerts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Alertas de Compatibilidade
                </p>
                {compatAlerts.map((alert, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-2 p-3 rounded-xl border text-xs',
                      alert.level === 'error'
                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                    )}
                  >
                    {alert.level === 'error' ? (
                      <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-semibold">{alert.title}</p>
                      <p className="opacity-90">{alert.message}</p>
                      {alert.suggestion && (
                        <p className="font-medium opacity-80">💡 {alert.suggestion}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {compatAlerts.length === 0 && shoppingList.length > 1 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <p className="font-medium">Todos os produtos são compatíveis entre si. Podem ser misturados na mesma calda.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
