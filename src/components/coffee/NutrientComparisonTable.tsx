import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { FlaskConical, TrendingUp, Minus, CheckCircle, AlertTriangle, XCircle, ArrowUp, Leaf, Calendar, Package, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LeafAnalysisData } from '@/contexts/CoffeeContext';
import { getStageForMonth } from '@/data/coffeePhenology';

interface PrincipioAtivoData {
  nome: string;
  concentracao: number;
  unidade: string;
}

interface ProductWithNutrients {
  name: string;
  type: string;
  dosePerHa: number;
  unit: string;
  principios_ativos: PrincipioAtivoData[] | null;
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

interface AvailableInsumo {
  id: string;
  nome: string;
  tipo_produto: string;
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
  recomendacao_dose_ha: number;
  recomendacao_dose_unidade: string;
}

/** Override the generic reference ranges with actual phase-specific demand (in kg/ha) */
export interface DemandOverrides {
  n?: { min: number; max: number };
  p?: { min: number; max: number };
  k?: { min: number; max: number };
  s?: { min: number; max: number };
}

interface Props {
  products: ProductWithNutrients[];
  leafAnalysis?: LeafAnalysisData | null;
  /** When provided, leaf adequate ranges adjust to the phenological stage */
  month?: number;
  /** Available insumos from DB to suggest for deficit coverage */
  availableInsumos?: AvailableInsumo[];
  /** Callback to apply a suggested product to the mix */
  onApplySuggestion?: (insumoId: string, doseKgHa: number) => void;
  /** Override macro reference ranges with actual demand for the coffee phase */
  demandOverrides?: DemandOverrides;
}

// ─── Nutrient definitions with reference ranges (g/ha for café) ──
interface NutrientDef {
  key: string;
  symbol: string;
  name: string;
  dbField: string;
  isMacro: boolean;
  /** Minimum recommended g/ha for coffee */
  refMin: number;
  /** Maximum recommended g/ha for coffee */
  refMax: number;
  /** Toxicity threshold g/ha (above this = risk). 0 means no toxicity limit defined */
  toxLimit: number;
  /** Reference unit label */
  refUnit: string;
  /** Key used in LeafAnalysisData (may differ from key) */
  leafKey: string;
  /** Unit used in leaf analysis */
  leafUnit: string;
  /** Adequate minimum in leaf analysis units */
  leafAdequateMin: number;
  /** Adequate maximum in leaf analysis units */
  leafAdequateMax: number;
}

// Reference ranges based on coffee agronomic recommendations
// Leaf analysis thresholds from CoffeeLeafAnalysis LEAF_REFERENCE
const NUTRIENTS: NutrientDef[] = [
  { key: 'n',  symbol: 'N',    name: 'Nitrogênio', dbField: 'macro_n',    isMacro: true,  refMin: 350000, refMax: 500000, toxLimit: 0,    refUnit: 'kg/ha', leafKey: 'n',  leafUnit: '%',    leafAdequateMin: 3.0,  leafAdequateMax: 3.5 },
  { key: 'p',  symbol: 'P₂O₅', name: 'Fósforo',    dbField: 'macro_p2o5', isMacro: true,  refMin: 40000,  refMax: 100000, toxLimit: 0,    refUnit: 'kg/ha', leafKey: 'p',  leafUnit: '%',    leafAdequateMin: 0.12, leafAdequateMax: 0.15 },
  { key: 'k',  symbol: 'K₂O',  name: 'Potássio',   dbField: 'macro_k2o',  isMacro: true,  refMin: 300000, refMax: 450000, toxLimit: 0,    refUnit: 'kg/ha', leafKey: 'k',  leafUnit: '%',    leafAdequateMin: 2.0,  leafAdequateMax: 2.5 },
  { key: 's',  symbol: 'S',    name: 'Enxofre',    dbField: 'macro_s',    isMacro: true,  refMin: 20000,  refMax: 40000,  toxLimit: 0,    refUnit: 'kg/ha', leafKey: 's',  leafUnit: '%',    leafAdequateMin: 0.15, leafAdequateMax: 0.20 },
  { key: 'b',  symbol: 'B',    name: 'Boro',       dbField: 'micro_b',    isMacro: false, refMin: 500,    refMax: 1500,   toxLimit: 2500, refUnit: 'g/ha',  leafKey: 'b',  leafUnit: 'mg/kg', leafAdequateMin: 40,   leafAdequateMax: 80 },
  { key: 'zn', symbol: 'Zn',   name: 'Zinco',      dbField: 'micro_zn',   isMacro: false, refMin: 300,    refMax: 1000,   toxLimit: 2000, refUnit: 'g/ha',  leafKey: 'zn', leafUnit: 'mg/kg', leafAdequateMin: 10,   leafAdequateMax: 20 },
  { key: 'cu', symbol: 'Cu',   name: 'Cobre',      dbField: 'micro_cu',   isMacro: false, refMin: 200,    refMax: 800,    toxLimit: 1500, refUnit: 'g/ha',  leafKey: 'cu', leafUnit: 'mg/kg', leafAdequateMin: 10,   leafAdequateMax: 20 },
  { key: 'mn', symbol: 'Mn',   name: 'Manganês',   dbField: 'micro_mn',   isMacro: false, refMin: 300,    refMax: 1500,   toxLimit: 3000, refUnit: 'g/ha',  leafKey: 'mn', leafUnit: 'mg/kg', leafAdequateMin: 50,   leafAdequateMax: 150 },
  { key: 'fe', symbol: 'Fe',   name: 'Ferro',      dbField: 'micro_fe',   isMacro: false, refMin: 500,    refMax: 2000,   toxLimit: 4000, refUnit: 'g/ha',  leafKey: 'fe', leafUnit: 'mg/kg', leafAdequateMin: 50,   leafAdequateMax: 200 },
  { key: 'mo', symbol: 'Mo',   name: 'Molibdênio', dbField: 'micro_mo',   isMacro: false, refMin: 5,      refMax: 50,     toxLimit: 100,  refUnit: 'g/ha',  leafKey: 'mo', leafUnit: 'mg/kg', leafAdequateMin: 0.1,  leafAdequateMax: 1.0 },
];

// ─── Dose normalization to kg/ha ─────────────────────────────
function doseToKgPerHa(dose: number, unit: string): number {
  switch (unit) {
    case 'Kg/ha': return dose;
    case 'L/ha': return dose;
    case 'g/ha': return dose / 1000;
    case 'mL/ha': return dose / 1000;
    default: return dose;
  }
}

// ─── Format nutrient quantity ────────────────────────────────
function formatNutrientQty(grams: number, isMacro: boolean): { value: string; unit: string } {
  if (grams <= 0) return { value: '—', unit: '' };

  if (isMacro) {
    if (grams >= 1000) {
      return { value: (grams / 1000).toFixed(2), unit: 'kg/ha' };
    }
    return { value: grams.toFixed(1), unit: 'g/ha' };
  } else {
    if (grams < 1) {
      return { value: (grams * 1000).toFixed(1), unit: 'mg/ha' };
    }
    return { value: grams.toFixed(1), unit: 'g/ha' };
  }
}

function formatRef(grams: number, isMacro: boolean): string {
  if (isMacro) {
    return (grams / 1000).toFixed(0);
  }
  return grams.toFixed(0);
}

type CompareStatus = 'below' | 'adequate' | 'above' | 'toxic' | 'none';

function getCompareStatus(totalGrams: number, refMin: number, refMax: number, toxLimit: number): CompareStatus {
  if (totalGrams <= 0) return 'none';
  if (toxLimit > 0 && totalGrams >= toxLimit) return 'toxic';
  if (totalGrams < refMin) return 'below';
  if (totalGrams > refMax) return 'above';
  return 'adequate';
}

const STATUS_CFG: Record<CompareStatus, { label: string; icon: typeof CheckCircle; colorClass: string; bgClass: string }> = {
  none:     { label: '—',            icon: Minus,          colorClass: 'text-muted-foreground',  bgClass: '' },
  below:    { label: 'Abaixo',       icon: AlertTriangle,  colorClass: 'text-amber-500',         bgClass: 'bg-amber-500/10' },
  adequate: { label: 'Adequado',     icon: CheckCircle,    colorClass: 'text-emerald-500',       bgClass: 'bg-emerald-500/10' },
  above:    { label: 'Acima',        icon: ArrowUp,        colorClass: 'text-sky-500',           bgClass: 'bg-sky-500/10' },
  toxic:    { label: 'Risco Toxidez', icon: XCircle,       colorClass: 'text-destructive',       bgClass: 'bg-destructive/10' },
};

// Toxicity recommendations per nutrient
const TOXICITY_TIPS: Record<string, string> = {
  b:  'Boro em excesso causa queima de bordas foliares. Reduza a dose ou espaçe as aplicações.',
  zn: 'Zinco em excesso inibe a absorção de Ferro e Manganês. Reduza a dose aplicada.',
  cu: 'Cobre em excesso é fitotóxico e acumula no solo. Reduza a dose e monitore o solo.',
  mn: 'Manganês em excesso causa manchas necróticas. Reduza a dose e verifique o pH do solo.',
  fe: 'Ferro em excesso pode causar bronzeamento foliar. Reduza a concentração na calda.',
  mo: 'Molibdênio em excesso é raro, mas pode causar toxidez em bovinos via pastagem. Reduza a dose.',
};

interface ProductSuggestion {
  productId: string;
  productName: string;
  doseKgHa: number;
  doseMaxKgHa: number;
  concentration: number;
}

interface NutrientRow {
  nutrient: NutrientDef;
  totalGrams: number;
  sources: { productName: string; grams: number }[];
  status: CompareStatus;
  leafValue: number | null;
  leafStatus: 'deficient' | 'threshold' | 'adequate' | null;
  deficit: number | null; // how far below adequate min (in leaf units), negative = surplus
  suggestion: ProductSuggestion | null;
  /** All viable product suggestions for this nutrient (top 3 by concentration) */
  suggestions: ProductSuggestion[];
}

export function NutrientComparisonTable({ products, leafAnalysis, month, availableInsumos = [], onApplySuggestion, demandOverrides }: Props) {
  
  const stage = month != null ? getStageForMonth(month) : null;

  const rows = useMemo<NutrientRow[]>(() => {
    // Map demand override keys to nutrient keys
    const overrideMap: Record<string, { min: number; max: number } | undefined> = {
      n: demandOverrides?.n,
      p: demandOverrides?.p,
      k: demandOverrides?.k,
      s: demandOverrides?.s,
    };

    return NUTRIENTS.map(nutrient => {
      // Dynamic leaf adequacy from phenology
      let leafAdequateMin = nutrient.leafAdequateMin;
      let leafAdequateMax = nutrient.leafAdequateMax;

      if (stage) {
        const stageTarget = stage.targets[nutrient.key];
        if (stageTarget) {
          leafAdequateMin = stageTarget.min;
          leafAdequateMax = stageTarget.max;
        }
      }

      // Apply demand overrides for macro nutrients (kg/ha → g/ha = *1000)
      let effectiveRefMin = nutrient.refMin;
      let effectiveRefMax = nutrient.refMax;
      const override = overrideMap[nutrient.key];
      if (override && nutrient.isMacro) {
        effectiveRefMin = override.min * 1000; // kg/ha → g/ha
        effectiveRefMax = override.max * 1000;
      }

      const sources: { productName: string; grams: number }[] = [];

      products.forEach(product => {
        const concentration = Number((product as any)[nutrient.dbField]) || 0;
        if (concentration <= 0) return;

        const kgPerHa = doseToKgPerHa(product.dosePerHa, product.unit);
        const gramsProvided = kgPerHa * (concentration / 100) * 1000;

        if (gramsProvided > 0) {
          sources.push({ productName: product.name, grams: gramsProvided });
        }
      });

      const totalGrams = sources.reduce((sum, s) => sum + s.grams, 0);
      const status = getCompareStatus(totalGrams, effectiveRefMin, effectiveRefMax, nutrient.toxLimit);

      // Leaf analysis data — use dynamic ranges
      const leafEntry = leafAnalysis?.[nutrient.leafKey] ?? null;
      const leafValue = leafEntry?.value ?? null;

      // Re-evaluate leaf status against dynamic phenological ranges
      let leafStatus: 'deficient' | 'threshold' | 'adequate' | null = null;
      if (leafValue !== null) {
        if (leafValue < leafAdequateMin) {
          leafStatus = 'deficient';
        } else if (leafValue > leafAdequateMax) {
          leafStatus = 'adequate'; // above range is still "adequate" (surplus)
        } else {
          leafStatus = 'adequate';
        }
      } else if (leafEntry) {
        leafStatus = leafEntry.status ?? null;
      }

      const deficit = leafValue !== null && leafValue < leafAdequateMin
        ? leafAdequateMin - leafValue
        : leafValue !== null && leafValue >= leafAdequateMin
          ? -(leafValue - leafAdequateMin)
          : null;

      // Find product suggestions for deficit (top 3 by concentration)
      const suggestions: ProductSuggestion[] = [];
      const gapGrams = status === 'below' ? effectiveRefMin - totalGrams : 0;
      const gapMaxGrams = (status === 'below' || status === 'none') ? effectiveRefMax - totalGrams : 0;
      if ((gapGrams > 0 || gapMaxGrams > 0) && availableInsumos.length > 0) {
        // Sort by concentration descending, pick top 3
        const candidates = availableInsumos
          .map(insumo => ({ insumo, conc: Number((insumo as any)[nutrient.dbField]) || 0 }))
          .filter(c => c.conc > 0)
          .sort((a, b) => b.conc - a.conc)
          .slice(0, 3);

        for (const { insumo: bestProduct, conc: bestConcentration } of candidates) {
          const doseMin = Math.max(0, gapGrams) / (bestConcentration / 100 * 1000);
          let doseMax = Math.max(0, gapMaxGrams) / (bestConcentration / 100 * 1000);

          // ── Safety cap: limit dose so NO nutrient in this product exceeds its refMax or toxLimit ──
          for (const otherNut of NUTRIENTS) {
            const otherConc = Number((bestProduct as any)[otherNut.dbField]) || 0;
            if (otherConc <= 0) continue;
            let otherCurrentGrams = 0;
            products.forEach(product => {
              const c = Number((product as any)[otherNut.dbField]) || 0;
              if (c > 0) {
                otherCurrentGrams += doseToKgPerHa(product.dosePerHa, product.unit) * (c / 100) * 1000;
              }
            });
            const ceiling = otherNut.toxLimit > 0 ? otherNut.toxLimit : otherNut.refMax;
            const headroom = Math.max(0, ceiling - otherCurrentGrams);
            const maxForThis = headroom / (otherConc / 100 * 1000);
            doseMax = Math.min(doseMax, maxForThis);
          }
          doseMax = Math.max(0, doseMax);

          if (doseMax > 0) {
            suggestions.push({
              productId: bestProduct.id,
              productName: bestProduct.nome,
              doseKgHa: Math.round(Math.min(doseMin, doseMax) * 100) / 100,
              doseMaxKgHa: Math.round(doseMax * 100) / 100,
              concentration: bestConcentration,
            });
          }
        }
      }

      const suggestion = suggestions.length > 0 ? suggestions[0] : null;

      return { nutrient: { ...nutrient, leafAdequateMin, leafAdequateMax, refMin: effectiveRefMin, refMax: effectiveRefMax }, totalGrams, sources, status, leafValue, leafStatus, deficit, suggestion, suggestions };
    });
  }, [products, leafAnalysis, stage, availableInsumos, demandOverrides]);

  const activeRows = rows.filter(r => r.totalGrams > 0);
  const inactiveRows = rows.filter(r => r.totalGrams === 0);
  const adequateCount = rows.filter(r => r.status === 'adequate').length;
  const belowCount = rows.filter(r => r.status === 'below').length;
  const toxicRows = rows.filter(r => r.status === 'toxic');
  const hasLeafData = !!leafAnalysis && Object.values(leafAnalysis).some(e => e && e.value > 0);

  if (products.length === 0) return null;

  return (
    <div className="space-y-4 p-4 bg-secondary rounded-xl">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Nutrientes Fornecidos pelo Mix</span>
        {stage && (
          <Badge variant="outline" className={cn('text-[10px] gap-1', stage.color)}>
            <Calendar className="w-3 h-3" />
            {stage.name}
          </Badge>
        )}
        <Badge variant="outline" className="ml-auto text-xs">
          {adequateCount}/{rows.length} na faixa
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        {demandOverrides
          ? 'Faixa ideal baseada na demanda real (população de plantas × meta por planta). Valores em kg/ha. Botões "Mín" (80%) e "Máx" (100%) calculam a dose para atingir cada limite.'
          : 'Comparação entre o total fornecido pelo mix e a faixa de referência recomendada para café (kg/ha).'}
        {stage && <> Faixas foliares ajustadas para a fase <strong className={stage.color}>{stage.name}</strong>.</>}
      </p>

      {/* Toxicity Alert */}
      {toxicRows.length > 0 && (
        <div className="space-y-2">
          {toxicRows.map(row => {
            const formatted = formatNutrientQty(row.totalGrams, row.nutrient.isMacro);
            const maxFmt = formatNutrientQty(row.nutrient.toxLimit, row.nutrient.isMacro);
            const tip = TOXICITY_TIPS[row.nutrient.key];
            const excess = ((row.totalGrams / row.nutrient.toxLimit - 1) * 100).toFixed(0);

            return (
              <div key={row.nutrient.key} className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>
                    <strong>⚠ Risco de Toxidez — {row.nutrient.name} ({row.nutrient.symbol}):</strong>{' '}
                    Fornecendo {formatted.value} {formatted.unit}, que é <strong>{excess}% acima</strong> do limite seguro de {maxFmt.value} {maxFmt.unit}.
                  </p>
                  {tip && <p className="text-destructive/80">{tip}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Below Alert */}
      {belowCount > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            <strong>{belowCount} nutriente{belowCount > 1 ? 's' : ''}</strong> {belowCount > 1 ? 'estão' : 'está'} abaixo da faixa recomendada. Considere ajustar a dose ou adicionar fontes complementares.
          </p>
        </div>
      )}

      {/* Main table */}
      <div className="overflow-auto rounded-xl border border-border">
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider first:rounded-tl-xl">
                Nutriente
              </th>
              {hasLeafData && (
                <>
                  <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <Leaf className="w-3 h-3" />
                      Teor Atual
                    </div>
                  </th>
                  <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                    Déficit
                  </th>
                </>
              )}
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Faixa Ideal
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Fornecido
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider">
                Fontes
              </th>
              {availableInsumos.length > 0 && (
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider last:rounded-tr-xl">
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Indicação
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row, idx) => {
              const formatted = formatNutrientQty(row.totalGrams, row.nutrient.isMacro);
              const cfg = STATUS_CFG[row.status];
              const StatusIcon = cfg.icon;
              const isLast = idx === activeRows.length - 1 && inactiveRows.length === 0;

              return (
                <tr key={row.nutrient.key} className="border-b border-border/30">
                  <td className={cn('px-3 py-2.5', isLast && 'first:rounded-bl-xl')}>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {row.nutrient.symbol}
                      </span>
                      <span className="font-medium text-foreground hidden sm:inline">
                        {row.nutrient.name}
                      </span>
                    </div>
                  </td>
                  {hasLeafData && (
                    <>
                      <td className="px-3 py-2.5 text-center">
                        {row.leafValue !== null ? (
                          <div className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                            row.leafStatus === 'deficient' && 'bg-destructive/10 text-destructive',
                            row.leafStatus === 'threshold' && 'bg-amber-500/10 text-amber-600',
                            row.leafStatus === 'adequate' && 'bg-emerald-500/10 text-emerald-600',
                          )}>
                            <span className="font-semibold">{row.leafValue.toFixed(row.nutrient.isMacro ? 2 : 1)}</span>
                            <span className="text-[10px] opacity-70">{row.nutrient.leafUnit}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {row.deficit !== null ? (
                          row.deficit > 0 ? (
                            <span className="font-semibold text-destructive">
                              −{row.deficit.toFixed(row.nutrient.isMacro ? 2 : 1)} {row.nutrient.leafUnit}
                            </span>
                          ) : (
                            <span className="font-medium text-emerald-600">
                              +{Math.abs(row.deficit).toFixed(row.nutrient.isMacro ? 2 : 1)}
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-muted-foreground">
                      {formatRef(row.nutrient.refMin, row.nutrient.isMacro)}–{formatRef(row.nutrient.refMax, row.nutrient.isMacro)}
                    </span>
                    <span className="text-muted-foreground/70 ml-1">{row.nutrient.refUnit}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className={cn('w-3 h-3', cfg.colorClass)} />
                      <span className="font-semibold text-foreground">{formatted.value}</span>
                      <span className="text-muted-foreground">{formatted.unit}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full', cfg.bgClass)}>
                      <StatusIcon className={cn('w-3 h-3', cfg.colorClass)} />
                      <span className={cn('font-medium', cfg.colorClass)}>{cfg.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="space-y-0.5">
                      {row.sources.map((src, i) => {
                        const srcFmt = formatNutrientQty(src.grams, row.nutrient.isMacro);
                        return (
                          <div key={i} className="flex items-center gap-1 text-foreground">
                            <span className="truncate max-w-[100px] font-medium">{src.productName}</span>
                            <span className="text-muted-foreground text-[10px]">
                              {srcFmt.value} {srcFmt.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  {availableInsumos.length > 0 && (
                    <td className={cn('px-3 py-2.5', isLast && 'last:rounded-br-xl')}>
                      {row.suggestions.length > 0 ? (
                        <div className="space-y-2">
                          {row.suggestions.map((sug) => (
                            <div key={sug.productId} className="space-y-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 cursor-help">
                                      <Package className="w-3 h-3 text-amber-500 shrink-0" />
                                      <p className="font-semibold text-foreground text-[10px] truncate max-w-[80px]">{sug.productName}</p>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-[220px]">
                                    <p className="text-xs">
                                      <strong>{sug.productName}</strong> contém {sug.concentration}% de {row.nutrient.symbol}.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {onApplySuggestion ? (
                                <div className="flex gap-1">
                                  {sug.doseKgHa > 0 && (
                                    <button
                                      onClick={() => onApplySuggestion(sug.productId, sug.doseKgHa)}
                                      className="px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-medium transition-colors flex items-center gap-0.5"
                                      title={`Atingir mínimo: +${sug.doseKgHa.toFixed(1)} kg/ha de ${sug.productName}`}
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      Mín {sug.doseKgHa.toFixed(1)}
                                    </button>
                                  )}
                                  {sug.doseMaxKgHa > sug.doseKgHa && (
                                    <button
                                      onClick={() => onApplySuggestion(sug.productId, sug.doseMaxKgHa)}
                                      className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-[9px] font-medium transition-colors flex items-center gap-0.5"
                                      title={`Atingir máximo: +${sug.doseMaxKgHa.toFixed(1)} kg/ha de ${sug.productName}`}
                                    >
                                      <ArrowUp className="w-2.5 h-2.5" />
                                      Máx {sug.doseMaxKgHa.toFixed(1)}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[9px] text-amber-600">
                                  {sug.doseKgHa.toFixed(1)}–{sug.doseMaxKgHa.toFixed(1)} kg/ha
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (row.status === 'adequate' || row.status === 'above') ? (
                        <span className="text-[10px] text-emerald-600">✓ OK</span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}

            {inactiveRows.map((row, idx) => {
              const isLast = idx === inactiveRows.length - 1;

              return (
                <tr key={row.nutrient.key} className="border-b border-border/30 opacity-50">
                  <td className={cn('px-3 py-2.5', isLast && 'first:rounded-bl-xl')}>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-muted/30 text-muted-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                        {row.nutrient.symbol}
                      </span>
                      <span className="font-medium text-muted-foreground hidden sm:inline">
                        {row.nutrient.name}
                      </span>
                    </div>
                  </td>
                  {hasLeafData && (
                    <>
                      <td className="px-3 py-2.5 text-center">
                        {row.leafValue !== null ? (
                          <div className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                            row.leafStatus === 'deficient' && 'bg-destructive/10 text-destructive',
                            row.leafStatus === 'threshold' && 'bg-amber-500/10 text-amber-600',
                            row.leafStatus === 'adequate' && 'bg-emerald-500/10 text-emerald-600',
                          )}>
                            <span className="font-semibold">{row.leafValue.toFixed(row.nutrient.isMacro ? 2 : 1)}</span>
                            <span className="text-[10px] opacity-70">{row.nutrient.leafUnit}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {row.deficit !== null ? (
                          row.deficit > 0 ? (
                            <span className="font-semibold text-destructive">
                              −{row.deficit.toFixed(row.nutrient.isMacro ? 2 : 1)} {row.nutrient.leafUnit}
                            </span>
                          ) : (
                            <span className="font-medium text-emerald-600">OK</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2.5 text-center text-muted-foreground">
                    {formatRef(row.nutrient.refMin, row.nutrient.isMacro)}–{formatRef(row.nutrient.refMax, row.nutrient.isMacro)}
                    <span className="ml-1 opacity-70">{row.nutrient.refUnit}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Minus className="w-3 h-3 text-muted-foreground mx-auto" />
                  </td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground">—</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    Sem produto
                  </td>
                  {availableInsumos.length > 0 && (
                    <td className={cn('px-3 py-2.5', isLast && 'last:rounded-br-xl')}>
                      {row.suggestions.length > 0 ? (
                        <div className="space-y-2 opacity-100">
                          {row.suggestions.map((sug) => (
                            <div key={sug.productId} className="space-y-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 cursor-help">
                                      <Package className="w-3 h-3 text-amber-500 shrink-0" />
                                      <p className="font-semibold text-foreground text-[10px] truncate max-w-[80px]">{sug.productName}</p>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-[220px]">
                                    <p className="text-xs">
                                      <strong>{sug.productName}</strong> contém {sug.concentration}% de {row.nutrient.symbol}.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {onApplySuggestion ? (
                                <div className="flex gap-1">
                                  {sug.doseKgHa > 0 && (
                                    <button
                                      onClick={() => onApplySuggestion(sug.productId, sug.doseKgHa)}
                                      className="px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-medium transition-colors flex items-center gap-0.5"
                                      title={`Atingir mínimo: +${sug.doseKgHa.toFixed(1)} kg/ha de ${sug.productName}`}
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      Mín {sug.doseKgHa.toFixed(1)}
                                    </button>
                                  )}
                                  {sug.doseMaxKgHa > sug.doseKgHa && (
                                    <button
                                      onClick={() => onApplySuggestion(sug.productId, sug.doseMaxKgHa)}
                                      className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-[9px] font-medium transition-colors flex items-center gap-0.5"
                                      title={`Atingir máximo: +${sug.doseMaxKgHa.toFixed(1)} kg/ha de ${sug.productName}`}
                                    >
                                      <ArrowUp className="w-2.5 h-2.5" />
                                      Máx {sug.doseMaxKgHa.toFixed(1)}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[9px] text-amber-600">
                                  {sug.doseKgHa.toFixed(1)}–{sug.doseMaxKgHa.toFixed(1)} kg/ha
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
