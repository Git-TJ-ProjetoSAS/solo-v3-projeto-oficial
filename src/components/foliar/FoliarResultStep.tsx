import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useCoffee } from '@/contexts/CoffeeContext';
import { supabase } from '@/integrations/supabase/client';
import { useTalhaoHistory } from '@/hooks/useTalhaoHistory';
import { NutrientComparisonTable } from '@/components/coffee/NutrientComparisonTable';
import { classifyInsumo, GROUP_INFO, type CompatGroup, type InsumoForClassification } from '@/lib/compatibilityEngine';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { getStageForMonth, MONTH_NAMES, PHENOLOGY_STAGES } from '@/data/coffeePhenology';

import type {
  CoffeeFertigationData,
  CoffeeSprayingData,
  LeafAnalysisData,
} from '@/contexts/CoffeeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Leaf,
  Waves,
  Droplets,
  Tractor,
  PlaneTakeoff,
  Backpack,
  DollarSign,
  BarChart3,
  FileDown,
  FlaskConical,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Coffee,
  TreePine,
  CalendarDays,
  Info,
  Calculator,
  Printer,
  Share2,
  MessageCircle,
  User,
  MapPin,
  ShoppingCart,
  AlertCircle,
  Sprout,
  Save,
  Loader2,
  Shield,
  ShieldAlert,
  Target,
  Beaker,
} from 'lucide-react';
import { LOGO_URL } from '@/lib/constants';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

function fmtPerPlant(dose: number, unit: string): string {
  if (dose < 1) {
    const isLiquid = unit.includes('L') || unit.includes('mL');
    return `${(dose * 1000).toFixed(1)} ${isLiquid ? 'mL' : 'g'}`;
  }
  return `${dose.toFixed(2)} ${unit.replace('/ha', '')}`;
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
    <div className="break-inside-avoid mb-6">
      <div className="flex items-baseline gap-3 mb-3 border-b-2 border-emerald-600 pb-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold shrink-0">
          {number}
        </span>
        <div>
          <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 italic">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
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
    <div className={cn('flex items-start gap-2.5 p-3 rounded-lg border text-xs leading-relaxed', styles[variant])}>
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
    <div className={cn('text-center p-3 rounded-lg border', bgStyles[variant])}>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-medium">{label}</p>
      <p className={cn('text-lg font-bold', valStyles[variant])}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Zebra Table ─────────────────────────────────────────────
function ZebraTable({ headers, rows, className }: { headers: string[]; rows: React.ReactNode[][]; className?: string }) {
  return (
    <div className={cn('overflow-auto rounded-lg border border-gray-200', className)}>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-100">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2.5 font-semibold text-gray-600 uppercase tracking-wider text-left first:text-left text-center">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rIdx) => (
            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {cells.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-2 text-gray-700 first:text-left text-center">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section wrapper (kept for sub-components) ───────────────
function Section({
  icon,
  title,
  step,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  step?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden break-inside-avoid">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
        {icon}
        <div className="flex-1 min-w-0">
          {step && <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{step}</p>}
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {title}
          </h3>
        </div>
        {badge}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function StatBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center p-3 rounded-xl bg-secondary/50">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Nutrient symbols ────────────────────────────────────────
const NUTRIENT_SYMBOLS: Record<string, string> = {
  n: 'N', p: 'P', k: 'K', mg: 'Mg', ca: 'Ca', s: 'S',
  zn: 'Zn', b: 'B', cu: 'Cu', mn: 'Mn', fe: 'Fe', mo: 'Mo',
};

const NUTRIENT_NAMES: Record<string, string> = {
  n: 'Nitrogênio', p: 'Fósforo', k: 'Potássio', mg: 'Magnésio',
  ca: 'Cálcio', s: 'Enxofre', zn: 'Zinco', b: 'Boro',
  cu: 'Cobre', mn: 'Manganês', fe: 'Ferro', mo: 'Molibdênio',
};

const STATUS_LABELS: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  deficient: { label: 'Deficiente', icon: XCircle, className: 'text-red-500' },
  threshold: { label: 'Limiar', icon: AlertTriangle, className: 'text-amber-500' },
  adequate: { label: 'Adequado', icon: CheckCircle, className: 'text-emerald-500' },
};

// ─── Monthly distribution weights by phenological intensity ──
const MONTH_WEIGHTS = [
  0.10, // Jan - Expansão
  0.10, // Fev - Enchimento
  0.09, // Mar - Enchimento
  0.08, // Abr - Enchimento
  0.04, // Mai - Maturação
  0.06, // Jun - Repouso
  0.07, // Jul - Repouso
  0.08, // Ago - Repouso
  0.09, // Set - Florada
  0.10, // Out - Florada
  0.10, // Nov - Expansão
  0.09, // Dez - Expansão
];

// ─── Leaf Analysis Summary ───────────────────────────────────
function LeafAnalysisSummary({ data }: { data: LeafAnalysisData }) {
  const entries = Object.entries(data);
  const defCount = entries.filter(([, e]) => e.status === 'deficient').length;
  const threshCount = entries.filter(([, e]) => e.status === 'threshold').length;
  const adeqCount = entries.filter(([, e]) => e.status === 'adequate').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <XCircle className="w-4 h-4 mx-auto mb-1 text-red-500" />
          <p className="text-lg font-bold text-foreground">{defCount}</p>
          <p className="text-[10px] text-muted-foreground">Deficiente</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
          <p className="text-lg font-bold text-foreground">{threshCount}</p>
          <p className="text-[10px] text-muted-foreground">Limiar</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
          <p className="text-lg font-bold text-foreground">{adeqCount}</p>
          <p className="text-[10px] text-muted-foreground">Adequado</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {entries.map(([id, entry]) => {
          const cfg = STATUS_LABELS[entry.status];
          const Icon = cfg.icon;
          return (
            <div key={id} className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/50">
              <Icon className={cn('w-3.5 h-3.5 shrink-0', cfg.className)} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {NUTRIENT_SYMBOLS[id] || id} — {NUTRIENT_NAMES[id] || id}
                </p>
                <p className={cn('text-[10px] font-medium', cfg.className)}>
                  {entry.value} — {cfg.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Compatibility Group Badge ───────────────────────────────
function GroupBadge({ group }: { group: CompatGroup }) {
  const info = GROUP_INFO[group];
  return (
    <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold border', info.badgeColor)}>
      {group}
    </span>
  );
}

// ─── Insumo with classification ──────────────────────────────
interface ClassifiedFertiProduct {
  id: string;
  name: string;
  type: string;
  dosePerHa: number;
  unit: string;
  group: CompatGroup;
  insumoId?: string;
  price?: number;
  // nutrient concentrations
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

// ─── Monthly Fertigation Schedule with Compatibility Groups ──
function MonthlyFertigationGrid({
  data,
  hectares,
  insumoData,
}: {
  data: CoffeeFertigationData;
  hectares: number;
  insumoData: any[];
}) {
  if (!data.products || data.products.length === 0) return null;

  // Classify products into compatibility groups
  const classifiedProducts = useMemo((): ClassifiedFertiProduct[] => {
    return data.products.map(p => {
      const insumo = insumoData.find(i => i.id === p.insumoId);
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
        insumoId: p.insumoId,
        price: (p as any).price || 0,
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
  }, [data.products, insumoData]);

  // Separate macro and micro nutrient products
  const { macroProducts, microProducts } = useMemo(() => {
    const macro: ClassifiedFertiProduct[] = [];
    const micro: ClassifiedFertiProduct[] = [];
    classifiedProducts.forEach(p => {
      const hasMacro = p.macro_n > 0 || p.macro_p2o5 > 0 || p.macro_k2o > 0 || p.macro_s > 0;
      const hasMicro = p.micro_b > 0 || p.micro_zn > 0 || p.micro_cu > 0 || p.micro_mn > 0 || p.micro_fe > 0 || p.micro_mo > 0;
      if (hasMicro && !hasMacro) micro.push(p);
      else macro.push(p);
    });
    return { macroProducts: macro, microProducts: micro };
  }, [classifiedProducts]);

  // Distribute each product's annual dose across months
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

  // Shopping list totals
  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    classifiedProducts.forEach(p => {
      result[p.id] = monthlyData.reduce((sum, m) => sum + (m.products[p.id] || 0), 0) * hectares;
    });
    return result;
  }, [monthlyData, classifiedProducts, hectares]);

  // Build mix recommendations by group
  const mixGroups = useMemo(() => {
    const groups: Record<CompatGroup, ClassifiedFertiProduct[]> = { A: [], B: [], C: [], D: [], E: [] };
    classifiedProducts.forEach(p => groups[p.group].push(p));
    return groups;
  }, [classifiedProducts]);

  const activeGroups = useMemo(() => {
    return (Object.entries(mixGroups) as [CompatGroup, ClassifiedFertiProduct[]][])
      .filter(([, prods]) => prods.length > 0);
  }, [mixGroups]);

  // Get primary nutrient for a product
  const getPrimaryNutrients = (p: ClassifiedFertiProduct): string => {
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

  // Render the product table for a category
  const renderProductTable = (title: string, icon: React.ReactNode, products: ClassifiedFertiProduct[]) => {
    if (products.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{title}</span>
        </div>
        <div className="overflow-auto rounded-xl border border-border">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 bg-muted/30 z-10 min-w-[130px]">
                  Produto
                </th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider min-w-[35px]">
                  Grp
                </th>
                {monthlyData.map(m => (
                  <th key={m.name} className="text-center px-1.5 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider min-w-[42px]">
                    {m.shortName}
                  </th>
                ))}
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider min-w-[55px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const annualTotal = monthlyData.reduce((s, m) => s + (m.products[p.id] || 0), 0);
                return (
                  <tr key={p.id} className={cn('border-b border-border/20', idx % 2 === 0 ? 'bg-background' : 'bg-secondary/20')}>
                    <td className="px-3 py-2 sticky left-0 bg-inherit z-10">
                      <div>
                        <p className="font-medium text-foreground truncate max-w-[120px]" title={p.name}>{p.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate" title={getPrimaryNutrients(p)}>{getPrimaryNutrients(p)}</p>
                      </div>
                    </td>
                    <td className="text-center px-2 py-2">
                      <GroupBadge group={p.group} />
                    </td>
                    {monthlyData.map(m => {
                      const val = m.products[p.id] || 0;
                      return (
                        <td key={m.name} className="text-center px-1.5 py-2">
                          {val > 0 ? (
                            <span className="font-medium text-foreground">{val < 1 ? val.toFixed(2) : val.toFixed(1)}</span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center px-2 py-2">
                      <span className="font-bold text-primary">{annualTotal < 1 ? annualTotal.toFixed(2) : annualTotal.toFixed(1)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3 mb-3">
        <StatBlock label="Caixa" value={`${data.tankSize} L`} />
        <StatBlock label="Taxa" value={`${data.volumePerHa} L/ha`} />
        <StatBlock label="Área" value={`${hectares} ha`} />
      </div>

      {/* ─── Compatibility Group Legend ─── */}
      <div className="p-3 rounded-xl border border-border bg-secondary/20 space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Grupos de Compatibilidade</p>
        <div className="flex flex-wrap gap-2">
          {activeGroups.map(([group]) => {
            const info = GROUP_INFO[group];
            return (
              <div key={group} className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px]', info.colorClass)}>
                <GroupBadge group={group} />
                <span className="font-medium">{info.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Monthly Tables (split by macro/micro) ─── */}
      {renderProductTable('Macronutrientes', <Leaf className="w-3.5 h-3.5 text-emerald-500" />, macroProducts)}
      {renderProductTable('Micronutrientes', <FlaskConical className="w-3.5 h-3.5 text-amber-500" />, microProducts)}

      <p className="text-[10px] text-muted-foreground">
        * Valores em Kg/ha por mês. Distribuição baseada na marcha de absorção fenológica do café Conilon.
      </p>

      {/* ─── Mix Composition by Group (Tanques) ─── */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Composição das Misturas</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Separar os produtos nos tanques abaixo para evitar incompatibilidades químicas. Seguir a ordem de injeção indicada.
        </p>

        <div className="space-y-2">
          {activeGroups.map(([group, products], idx) => {
            const info = GROUP_INFO[group];
            return (
              <div key={group} className={cn('p-3 rounded-xl border', info.colorClass)}>
                <div className="flex items-center gap-2 mb-2">
                  <GroupBadge group={group} />
                  <span className="text-xs font-bold">{idx + 1}º Tanque — {info.label}: {info.desc}</span>
                </div>
                <div className="space-y-1.5">
                  {products.map(p => {
                    const { value: doseNorm, outputUnit } = normalizeDose(p.dosePerHa, p.unit);
                    const areaPerTank = data.volumePerHa > 0 ? data.tankSize / data.volumePerHa : 0;
                    const perTank = doseNorm * areaPerTank;
                    return (
                      <div key={p.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-background/60">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-[9px] text-muted-foreground">{getPrimaryNutrients(p)}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs font-bold text-foreground">{formatQty(perTank, outputUnit)}/caixa</p>
                          <p className="text-[9px] text-muted-foreground">{p.dosePerHa} {p.unit}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Injection order */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-[10px] font-semibold text-primary mb-1.5">Ordem de Injeção Recomendada:</p>
          <div className="space-y-1">
            {['1º — Água limpa no sistema',
              ...(mixGroups.A.length > 0 ? [`2º — ${mixGroups.A.map(p => p.name).join(', ')} (Cálcio)`] : []),
              ...(mixGroups.B.length > 0 ? [`${mixGroups.A.length > 0 ? '3' : '2'}º — ${mixGroups.B.map(p => p.name).join(', ')} (Sulfatos/Fosfatos)`] : []),
              ...(mixGroups.C.length > 0 ? [`${2 + (mixGroups.A.length > 0 ? 1 : 0) + (mixGroups.B.length > 0 ? 1 : 0)}º — ${mixGroups.C.map(p => p.name).join(', ')} (Neutros)`] : []),
              ...(mixGroups.D.length > 0 ? ['Defensivos — APLICAR SOZINHO no final'] : []),
              ...(mixGroups.E.length > 0 ? ['Cloro — SOMENTE APÓS toda aplicação'] : []),
            ].map((step, i) => (
              <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[8px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Shopping List ─── */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Total a Comprar ({hectares} ha)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {classifiedProducts.map(p => {
            const total = totals[p.id] || 0;
            return (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-1.5 min-w-0">
                  <GroupBadge group={p.group} />
                  <span className="text-xs font-medium text-foreground truncate">{p.name}</span>
                </div>
                <span className="text-xs font-bold text-primary shrink-0 ml-1">
                  {total < 1 ? `${(total * 1000).toFixed(0)} g` : `${total.toFixed(1)} Kg`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Compatibility Warning ─── */}
      <div className="space-y-2">
        {mixGroups.A.length > 0 && mixGroups.B.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="font-semibold text-red-400">⛔ Precipitação — Não misturar!</p>
              <p className="text-red-400/80">
                <strong>{mixGroups.A.map(p => p.name).join(', ')}</strong> (Grupo A) com <strong>{mixGroups.B.map(p => p.name).join(', ')}</strong> (Grupo B) causam precipitação. Usar tanques separados obrigatoriamente.
              </p>
            </div>
          </div>
        )}
        {mixGroups.D.length > 0 && classifiedProducts.some(p => p.group !== 'D') && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-purple-500" />
            <div>
              <p className="font-semibold text-purple-400">⚠️ Defensivos — Aplicar separadamente</p>
              <p className="text-purple-400/80">
                <strong>{mixGroups.D.map(p => p.name).join(', ')}</strong> devem ser injetados sozinhos para evitar hidrólise e perda de eficácia. Nunca misturar com adubos concentrados na mesma calda.
              </p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Atenção — Compatibilidade de Mistura</p>
            <p className="text-amber-500/80">
              Verifique os grupos de compatibilidade (A–E) antes de preparar a calda. Produtos do <strong>mesmo grupo</strong> podem ser misturados no mesmo tanque. Produtos de <strong>grupos diferentes</strong> devem seguir a ordem de injeção acima.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Spraying Summary ────────────────────────────────────────
function SprayingSummary({ data, hectares, plantsPerHa, insumoData }: { data: CoffeeSprayingData; hectares: number; plantsPerHa: number; insumoData: any[] }) {
  const volTotal = data.applicationRate * hectares;
  const tanksNeeded = data.tankCapacity > 0 ? Math.ceil(volTotal / data.tankCapacity) : 0;
  const equipLabel: Record<string, string> = {
    trator: 'Bomba Jato (Trator)',
    drone: 'Drone',
    bomba_costal: 'Bomba Costal',
  };
  const EquipIcon = data.equipmentType === 'trator' ? Tractor : data.equipmentType === 'drone' ? PlaneTakeoff : Backpack;

  // Classify products into compatibility groups
  const classifiedProducts = useMemo(() => {
    return data.products.map(p => {
      const insumo = insumoData.find(i => i.id === p.insumoId);
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
        : classifyInsumo({
            nome: p.name,
            tipo_produto: p.type || 'Fertilizante',
          } as InsumoForClassification);

      const getNutrients = (): string => {
        if (!insumo) return p.type || '';
        const nuts: string[] = [];
        if (insumo.macro_n > 0) nuts.push(`N ${insumo.macro_n}%`);
        if (insumo.macro_p2o5 > 0) nuts.push(`P₂O₅ ${insumo.macro_p2o5}%`);
        if (insumo.macro_k2o > 0) nuts.push(`K₂O ${insumo.macro_k2o}%`);
        if (insumo.macro_s > 0) nuts.push(`S ${insumo.macro_s}%`);
        if (insumo.micro_b > 0) nuts.push(`B ${insumo.micro_b}%`);
        if (insumo.micro_zn > 0) nuts.push(`Zn ${insumo.micro_zn}%`);
        if (insumo.micro_cu > 0) nuts.push(`Cu ${insumo.micro_cu}%`);
        if (insumo.micro_mn > 0) nuts.push(`Mn ${insumo.micro_mn}%`);
        if (insumo.micro_fe > 0) nuts.push(`Fe ${insumo.micro_fe}%`);
        if (insumo.micro_mo > 0) nuts.push(`Mo ${insumo.micro_mo}%`);
        return nuts.length > 0 ? nuts.join(' | ') : p.type || '';
      };

      return { ...p, group, nutrients: getNutrients() };
    });
  }, [data.products, insumoData]);

  // Mix groups
  const mixGroups = useMemo(() => {
    const groups: Record<CompatGroup, typeof classifiedProducts> = { A: [], B: [], C: [], D: [], E: [] };
    classifiedProducts.forEach(p => groups[p.group].push(p));
    return groups;
  }, [classifiedProducts]);

  const activeGroups = useMemo(() => {
    return (Object.entries(mixGroups) as [CompatGroup, typeof classifiedProducts][])
      .filter(([, prods]) => prods.length > 0);
  }, [mixGroups]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
        <EquipIcon className="w-6 h-6 text-primary shrink-0" />
        <div>
          <p className="font-medium text-sm">{equipLabel[data.equipmentType]}</p>
          <p className="text-xs text-muted-foreground">
            Tanque: {data.tankCapacity}L • Taxa: {data.applicationRate} L/ha
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatBlock label="Volume Total" value={`${volTotal.toLocaleString()} L`} />
        <StatBlock
          label={data.equipmentType === 'bomba_costal' ? 'Nº Bombas' : data.equipmentType === 'drone' ? 'Nº Voos' : 'Nº Tanques'}
          value={String(tanksNeeded)}
        />
        <StatBlock
          label="Área/Tanque"
          value={data.applicationRate > 0 ? `${(data.tankCapacity / data.applicationRate).toFixed(2)} ha` : '—'}
        />
      </div>

      {/* ─── Compatibility Group Legend ─── */}
      {classifiedProducts.length > 0 && (
        <div className="p-3 rounded-xl border border-border bg-secondary/20 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Grupos de Compatibilidade</p>
          <div className="flex flex-wrap gap-2">
            {activeGroups.map(([group]) => {
              const info = GROUP_INFO[group];
              return (
                <div key={group} className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px]', info.colorClass)}>
                  <GroupBadge group={group} />
                  <span className="font-medium">{info.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spraying recipe card with groups */}
      {data.products.length > 0 && (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Receita de Calda — {equipLabel[data.equipmentType]} ({data.tankCapacity}L)
          </p>
          <div className="space-y-2">
            {classifiedProducts.map(p => {
              const { value: doseNorm, outputUnit } = normalizeDose(p.dosePerHa, p.unit);
              const areaPerTank = data.applicationRate > 0 ? data.tankCapacity / data.applicationRate : 0;
              const perTank = doseNorm * areaPerTank;
              const total = doseNorm * hectares;
              const perPlant = plantsPerHa > 0 ? p.dosePerHa / plantsPerHa : 0;

              return (
                <div key={p.id} className="p-3 rounded-xl bg-background space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <GroupBadge group={p.group} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{p.nutrients}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Dose/ha</p>
                      <p className="font-medium">{p.dosePerHa} {p.unit}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Por Tanque</p>
                      <p className="font-medium">{formatQty(perTank, outputUnit)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Total</p>
                      <p className="font-medium">{formatQty(total, outputUnit)}</p>
                    </div>
                  </div>
                  {plantsPerHa > 0 && (
                    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
                      <span className="text-[10px] text-muted-foreground">Dose por pé:</span>
                      <span className="text-xs font-bold text-primary">{fmtPerPlant(perPlant, p.unit)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Mix Composition by Group ─── */}
      {activeGroups.length > 1 && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground uppercase tracking-wider">Composição das Misturas</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Separar os produtos conforme os grupos abaixo para evitar incompatibilidades químicas.
          </p>
          <div className="space-y-2">
            {activeGroups.map(([group, products], idx) => {
              const info = GROUP_INFO[group];
              return (
                <div key={group} className={cn('p-3 rounded-xl border', info.colorClass)}>
                  <div className="flex items-center gap-2 mb-2">
                    <GroupBadge group={group} />
                    <span className="text-xs font-bold">{idx + 1}º Tanque — {info.label}: {info.desc}</span>
                  </div>
                  <div className="space-y-1.5">
                    {products.map(p => {
                      const { value: doseNorm, outputUnit } = normalizeDose(p.dosePerHa, p.unit);
                      const areaPerTank = data.applicationRate > 0 ? data.tankCapacity / data.applicationRate : 0;
                      const perTank = doseNorm * areaPerTank;
                      return (
                        <div key={p.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-background/60">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                            <p className="text-[9px] text-muted-foreground">{p.nutrients}</p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-xs font-bold text-foreground">{formatQty(perTank, outputUnit)}/tanque</p>
                            <p className="text-[9px] text-muted-foreground">{p.dosePerHa} {p.unit}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Injection order */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-[10px] font-semibold text-primary mb-1.5">Ordem de Aplicação Recomendada:</p>
            <div className="space-y-1">
              {['1º — Água limpa no tanque',
                ...(mixGroups.C.length > 0 ? [`Adubos neutros: ${mixGroups.C.map(p => p.name).join(', ')}`] : []),
                ...(mixGroups.B.length > 0 ? [`Sulfatos/Fosfatos: ${mixGroups.B.map(p => p.name).join(', ')}`] : []),
                ...(mixGroups.D.length > 0 ? [`Defensivos (SEPARADO): ${mixGroups.D.map(p => p.name).join(', ')}`] : []),
                ...(mixGroups.A.length > 0 ? [`Cálcio (NÃO MISTURAR com B): ${mixGroups.A.map(p => p.name).join(', ')}`] : []),
              ].map((step, i) => (
                <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[8px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Compatibility Warnings ─── */}
      {classifiedProducts.length > 0 && (
        <div className="space-y-2">
          {mixGroups.A.length > 0 && mixGroups.B.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-semibold text-red-400">⛔ Precipitação — Não misturar!</p>
                <p className="text-red-400/80">
                  <strong>{mixGroups.A.map(p => p.name).join(', ')}</strong> (Grupo A) com <strong>{mixGroups.B.map(p => p.name).join(', ')}</strong> (Grupo B).
                </p>
              </div>
            </div>
          )}
          {mixGroups.D.length > 0 && classifiedProducts.some(p => p.group !== 'D') && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-purple-500" />
              <div>
                <p className="font-semibold text-purple-400">⚠️ Defensivos — Aplicar separadamente</p>
                <p className="text-purple-400/80">
                  <strong>{mixGroups.D.map(p => p.name).join(', ')}</strong> não devem ser misturados com adubos concentrados na mesma calda.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function ApplicationGuidance({ plantsPerHa }: { plantsPerHa: number }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Quando Aplicar</p>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          {[
            { label: 'Pré-Florada (Jul–Set)', desc: 'Aplicação de Boro (0,3%) e Zinco (0,5%) para garantir floração uniforme e pegamento de frutos.' },
            { label: 'Pós-Florada (Out–Dez)', desc: 'Reforço de Zinco, Magnésio (0,5%) e micronutrientes para expansão dos frutos.' },
            { label: 'Enchimento (Jan–Mar)', desc: 'Potássio foliar (1,0%) e Magnésio para peso e qualidade dos grãos.' },
            { label: 'Maturação (Abr–Jun)', desc: 'Aplicações de manutenção. Evitar adubação foliar em período de seca prolongada sem irrigação.' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <p><strong>{item.label}:</strong> {item.desc}</p>
            </div>
          ))}
        </div>

        {/* Visual timeline */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mt-3">
          {[
            { month: 'Jul', stage: 'Pré-Florada', intensity: 60 },
            { month: 'Ago', stage: 'Pré-Florada', intensity: 70 },
            { month: 'Set', stage: 'Pré-Florada', intensity: 80 },
            { month: 'Out', stage: 'Pós-Florada', intensity: 90 },
            { month: 'Nov', stage: 'Pós-Florada', intensity: 95 },
            { month: 'Dez', stage: 'Pós-Florada', intensity: 100 },
            { month: 'Jan', stage: 'Enchimento', intensity: 100 },
            { month: 'Fev', stage: 'Enchimento', intensity: 95 },
            { month: 'Mar', stage: 'Enchimento', intensity: 85 },
            { month: 'Abr', stage: 'Maturação', intensity: 50 },
            { month: 'Mai', stage: 'Maturação', intensity: 30 },
            { month: 'Jun', stage: 'Maturação', intensity: 20 },
          ].map(s => (
            <div key={s.month} className="text-center">
              <p className="text-[9px] text-muted-foreground uppercase">{s.month}</p>
              <div className="mt-1 mx-auto w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${s.intensity}%` }} />
              </div>
              <p className="text-[8px] text-muted-foreground mt-0.5 truncate">{s.stage}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Como Aplicar</p>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          {[
            'Aplicar nas **primeiras horas da manhã** (6h–10h) ou final da tarde (16h–18h), evitando calor intenso.',
            'Utilizar gotas **finas a médias** para garantir cobertura uniforme na face inferior e superior das folhas.',
            'Adicionar **adjuvante espalhante adesivo** para melhorar a fixação e reduzir escorrimento.',
            'Respeitar o **intervalo mínimo de 15 dias** entre aplicações foliares consecutivas.',
            'Não aplicar com **vento acima de 10 km/h** ou quando houver previsão de chuva nas próximas 4 horas.',
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <p dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          ))}
          {plantsPerHa > 0 && (
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">6</span>
              <p>Com população de <strong>{plantsPerHa.toLocaleString('pt-BR')} pl/ha</strong>, garantir <strong>cobertura completa da copa</strong> de cada planta.</p>
            </div>
          )}
        </div>
      </div>

      {/* EPI warning */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="font-medium">
          UTILIZAR EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI) EM TODAS AS APLICAÇÕES.
        </p>
      </div>
    </div>
  );
}

// ─── WhatsApp text builder ───────────────────────────────────
function buildWhatsAppText({
  coffeeLabel,
  hectares,
  sacas,
  totalPlants,
  plantsPerHa,
  hasLeafAnalysis,
  leafAnalysis,
  hasFertigation,
  fertigation,
  hasSpraying,
  spraying,
  totalCostPerHa,
  costPerSaca,
}: {
  coffeeLabel: string;
  hectares: number;
  sacas: number;
  totalPlants: number;
  plantsPerHa: number;
  hasLeafAnalysis: boolean;
  leafAnalysis: LeafAnalysisData | null;
  hasFertigation: boolean;
  fertigation: CoffeeFertigationData | null;
  hasSpraying: boolean;
  spraying: CoffeeSprayingData | null;
  totalCostPerHa: number;
  costPerSaca: number;
}) {
  const date = new Date().toLocaleDateString('pt-BR');
  let text = `🌿 *RECOMENDAÇÃO DE ADUBAÇÃO FOLIAR*\n📅 ${date}\n\n`;
  text += `☕ Café ${coffeeLabel}\n📐 Área: ${hectares} ha\n🎯 Meta: ${sacas} sc/ha\n🌱 Pop.: ${plantsPerHa.toLocaleString('pt-BR')} pl/ha (${totalPlants.toLocaleString('pt-BR')} total)\n\n`;

  if (hasLeafAnalysis && leafAnalysis) {
    const entries = Object.entries(leafAnalysis);
    const deficients = entries.filter(([, e]) => e.status === 'deficient');
    const thresholds = entries.filter(([, e]) => e.status === 'threshold');
    text += `🔬 *DIAGNÓSTICO FOLIAR*\n`;
    if (deficients.length > 0) {
      text += `❌ Deficientes: ${deficients.map(([id]) => (NUTRIENT_SYMBOLS[id] || id)).join(', ')}\n`;
    }
    if (thresholds.length > 0) {
      text += `⚠️ Limiar: ${thresholds.map(([id]) => (NUTRIENT_SYMBOLS[id] || id)).join(', ')}\n`;
    }
    text += '\n';
  }

  if (hasFertigation && fertigation && fertigation.products.length > 0) {
    text += `💧 *FERTIRRIGAÇÃO* (Caixa ${fertigation.tankSize}L)\n`;
    fertigation.products.forEach(p => {
      const perPlant = plantsPerHa > 0 ? p.dosePerHa / plantsPerHa : 0;
      text += `• ${p.name}: ${p.dosePerHa} ${p.unit}`;
      if (perPlant > 0) text += ` (${fmtPerPlant(perPlant, p.unit)}/pé)`;
      text += '\n';
    });
    text += '\n';
  }

  if (hasSpraying && spraying && spraying.products.length > 0) {
    text += `🎯 *PULVERIZAÇÃO* (${spraying.tankCapacity}L)\n`;
    spraying.products.forEach(p => {
      const perPlant = plantsPerHa > 0 ? p.dosePerHa / plantsPerHa : 0;
      text += `• ${p.name}: ${p.dosePerHa} ${p.unit}`;
      if (perPlant > 0) text += ` (${fmtPerPlant(perPlant, p.unit)}/pé)`;
      text += '\n';
    });
    text += '\n';
  }

  text += `💰 *INVESTIMENTO*\n`;
  text += `• Custo/ha: ${totalCostPerHa > 0 ? fmtCurrency(totalCostPerHa) : 'A definir'}\n`;
  text += `• Custo/saca: ${costPerSaca > 0 ? fmtCurrency(costPerSaca) : 'A definir'}\n\n`;

  text += `📋 *CRONOGRAMA*\nPré-Florada (Jul-Set) → Pós-Florada (Out-Dez) → Enchimento (Jan-Mar)\n\n`;
  text += `_Relatório gerado pelo Solo V3 • ${new Date().getFullYear()}_`;

  return text;
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export function FoliarResultStep() {
  const { coffeeData } = useCoffee();
  const { profile } = useUserProfile();
  const { role } = useUserRole();
  const isConsultor = role === 'consultor';
  const reportRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const talhaoId = coffeeData.selectedTalhaoId;
  const { saveFoliarToHistory } = useTalhaoHistory(talhaoId || undefined);

  // ─── Load insumo nutrient data for NutrientComparisonTable ──
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
      .select('id, macro_n, macro_p2o5, macro_k2o, macro_s, micro_b, micro_zn, micro_cu, micro_mn, micro_fe, micro_mo, principios_ativos')
      .in('id', insumoIds)
      .then(({ data }) => {
        if (!data) { setNutrientProducts([]); return; }
        const mapped = allProducts.map(p => {
          const insumo = data.find(i => i.id === p.insumoId);
          return {
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

  const spacing = coffeeData.productivity
    ? `${(coffeeData as any).rowSpacing || '—'} × ${(coffeeData as any).plantSpacing || '—'}`
    : '—';

  const hasLeafAnalysis = coffeeData.leafAnalysis && Object.keys(coffeeData.leafAnalysis).length > 0;
  const hasFertigation = coffeeData.fertigation && coffeeData.fertigation.products.length > 0;
  const hasSpraying = coffeeData.coffeeSpraying && coffeeData.coffeeSpraying.products.length > 0;

  // ─── Cost calculation ──────────────────────────────────────
  const { fertigationCostPerHa, sprayingCostPerHa } = useMemo(() => {
    let fertCost = 0;
    let sprayCost = 0;
    if (coffeeData.fertigation?.products) {
      coffeeData.fertigation.products.forEach(p => {
        if ((p as any).price && (p as any).price > 0) fertCost += (p as any).price;
      });
    }
    if (coffeeData.coffeeSpraying?.products) {
      coffeeData.coffeeSpraying.products.forEach(p => {
        if ((p as any).price && (p as any).price > 0) sprayCost += (p as any).price;
      });
    }
    return { fertigationCostPerHa: fertCost, sprayingCostPerHa: sprayCost };
  }, [coffeeData.fertigation, coffeeData.coffeeSpraying]);

  const totalCostPerHa = fertigationCostPerHa + sprayingCostPerHa;
  const totalAreaCost = totalCostPerHa * hectares;
  const costPerSaca = sacas > 0 ? totalCostPerHa / sacas : 0;
  const revenuePerHa = sacas * PRICE_PER_SACA;
  const profitPerHa = revenuePerHa - totalCostPerHa;

  const filledSections = useMemo(() => {
    let count = 0;
    if (hasLeafAnalysis) count++;
    if (hasFertigation) count++;
    if (hasSpraying) count++;
    return count;
  }, [hasLeafAnalysis, hasFertigation, hasSpraying]);

  // ─── PDF Generation (A4 optimized) ─────────────────────────
  const generatePdf = useCallback(async () => {
    if (!reportRef.current) return;
    toast.info('Gerando PDF otimizado para A4...');
    try {
      // Temporarily expand the report container for full-width capture
      const el = reportRef.current;
      const originalStyle = el.style.cssText;
      el.style.width = '800px';
      el.style.maxWidth = '800px';
      el.style.padding = '24px';

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

      // Restore original styles
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
      pdf.save(`Recomendacao_Foliar_${coffeeLabel}_${date}.pdf`);
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
      hasLeafAnalysis: !!hasLeafAnalysis, leafAnalysis: coffeeData.leafAnalysis,
      hasFertigation: !!hasFertigation, fertigation: coffeeData.fertigation,
      hasSpraying: !!hasSpraying, spraying: coffeeData.coffeeSpraying,
      totalCostPerHa, costPerSaca,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }, [coffeeLabel, hectares, sacas, totalPlants, plantsPerHa, hasLeafAnalysis, hasFertigation, hasSpraying, totalCostPerHa, costPerSaca, coffeeData]);

  const handleNativeShare = useCallback(async () => {
    const text = buildWhatsAppText({
      coffeeLabel, hectares, sacas, totalPlants, plantsPerHa,
      hasLeafAnalysis: !!hasLeafAnalysis, leafAnalysis: coffeeData.leafAnalysis,
      hasFertigation: !!hasFertigation, fertigation: coffeeData.fertigation,
      hasSpraying: !!hasSpraying, spraying: coffeeData.coffeeSpraying,
      totalCostPerHa, costPerSaca,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Recomendação Foliar — Café ${coffeeLabel}`,
          text: text.replace(/\*/g, '').replace(/_/g, ''),
        });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text.replace(/\*/g, '').replace(/_/g, ''));
      toast.success('Relatório copiado para a área de transferência!');
    }
  }, [coffeeLabel, hectares, sacas, totalPlants, plantsPerHa, hasLeafAnalysis, hasFertigation, hasSpraying, totalCostPerHa, costPerSaca, coffeeData]);

  const handleSaveToHistory = useCallback(async () => {
    if (!talhaoId) {
      toast.error('Nenhum talhão selecionado. Inicie o planejamento a partir de um talhão.');
      return;
    }
    setSaving(true);
    const success = await saveFoliarToHistory(talhaoId, {
      coffeeType: coffeeData.coffeeType || undefined,
      hectares,
      sacas,
      leafAnalysis: coffeeData.leafAnalysis as Record<string, unknown> | null,
      fertigation: coffeeData.fertigation as unknown as Record<string, unknown> | null,
      spraying: coffeeData.coffeeSpraying as unknown as Record<string, unknown> | null,
      totalCostPerHa,
      costPerSaca,
    });
    setSaving(false);
    if (success) setSaved(true);
  }, [talhaoId, coffeeData, hectares, sacas, totalCostPerHa, costPerSaca, saveFoliarToHistory]);

  let sectionNum = 0;

  return (
    <div className="space-y-6 foliar-report" style={{ animation: 'fade-in 0.3s ease-out' }}>
      {/* ─── Printable Report Area ─── */}
      <div ref={reportRef} className="report-print-mode bg-white text-gray-800 p-4 rounded-xl print-report" style={{ backgroundColor: '#ffffff', color: '#1f2937' }}>

        {/* ═══ CABEÇALHO PROFISSIONAL ═══ */}
        <div className="mb-6">
          {/* Title bar with logo */}
          <div className="flex items-center gap-4 py-3 px-4 bg-white border border-emerald-200 rounded-lg mb-4">
            <img src={LOGO_URL} alt="Solo V3" className="h-[4.2rem] w-auto object-contain shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-emerald-800 uppercase tracking-wider leading-tight">
                Recomendação de Adubação Foliar
              </h1>
              <p className="text-sm text-emerald-700 font-medium mt-0.5">
                Café {coffeeLabel} — Safra {safraLabel}
              </p>
            </div>
            <div className="text-right text-xs text-gray-500 space-y-0.5 shrink-0">
              <p className="font-medium text-gray-700">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Producer data grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-gray-500">Produtor:</span>
              <span className="font-semibold text-gray-800">{profile?.full_name || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-gray-500">Data:</span>
              <span className="font-semibold text-gray-800">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-gray-500">Área Total:</span>
              <span className="font-semibold text-gray-800">{hectares > 0 ? `${hectares.toFixed(2)} ha` : '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sprout className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-gray-500">População:</span>
              <span className="font-semibold text-gray-800">
                {plantsPerHa > 0 ? `${plantsPerHa.toLocaleString('pt-BR')} pl/ha (${totalPlants.toLocaleString('pt-BR')} total)` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Coffee className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-gray-500">Produtividade Alvo:</span>
              <span className="font-semibold text-emerald-700">{sacas > 0 ? `${sacas} sc/ha` : '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-gray-500">Resp. Técnico:</span>
              <span className="font-semibold text-gray-800">
                {isConsultor
                  ? `Eng. Agr. ${profile?.full_name || '—'}${profile?.crea_art ? ` · ${profile.crea_art}` : ''}`
                  : 'SOLO V3'}
              </span>
            </div>
            {isConsultor && profile?.telefone && (
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 shrink-0" />
                <span className="text-gray-500">Telefone:</span>
                <span className="font-semibold text-gray-800">{profile.telefone}</span>
              </div>
            )}
          </div>
        </div>

        {/* ═══ SEÇÃO 1: DIAGNÓSTICO FOLIAR ═══ */}
        {hasLeafAnalysis && coffeeData.leafAnalysis && (() => {
          sectionNum++;
          const entries = Object.entries(coffeeData.leafAnalysis);
          const defCount = entries.filter(([, e]) => e.status === 'deficient').length;
          const threshCount = entries.filter(([, e]) => e.status === 'threshold').length;
          const adeqCount = entries.filter(([, e]) => e.status === 'adequate').length;

          return (
            <ReportSection number={sectionNum} title="Diagnóstico Foliar" subtitle="Estado nutricional atual da lavoura">
              {/* Summary counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                  <XCircle className="w-4 h-4 mx-auto mb-1 text-red-500" />
                  <p className="text-lg font-bold text-red-700">{defCount}</p>
                  <p className="text-[10px] text-red-600">Deficiente</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  <p className="text-lg font-bold text-amber-700">{threshCount}</p>
                  <p className="text-[10px] text-amber-600">Limiar</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <CheckCircle className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                  <p className="text-lg font-bold text-emerald-700">{adeqCount}</p>
                  <p className="text-[10px] text-emerald-600">Adequado</p>
                </div>
              </div>

              <ZebraTable
                headers={['Nutriente', 'Valor Atual', 'Status']}
                rows={entries.map(([id, entry]) => {
                  const statusCfg: Record<string, { label: string; icon: typeof CheckCircle; color: string; bgColor: string }> = {
                    deficient: { label: 'Deficiente', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
                    threshold: { label: 'Limiar', icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-100' },
                    adequate: { label: 'Adequado', icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
                  };
                  const cfg = statusCfg[entry.status];
                  const Icon = cfg.icon;
                  return [
                    <span className="font-semibold">{NUTRIENT_SYMBOLS[id] || id}</span>,
                    <span className="font-medium">{entry.value}</span>,
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.bgColor, cfg.color)}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>,
                  ];
                })}
              />
            </ReportSection>
          );
        })()}

        {/* ═══ SEÇÃO 2: FERTIRRIGAÇÃO ═══ */}
        {hasFertigation && coffeeData.fertigation && (() => {
          sectionNum++;
          return (
            <ReportSection number={sectionNum} title="Fertirrigação — Cronograma Mensal" subtitle="Quantidades expressas em kg do produto comercial por hectare">
              <MonthlyFertigationGrid data={coffeeData.fertigation} hectares={hectares} insumoData={nutrientProducts} />
            </ReportSection>
          );
        })()}

        {/* ═══ SEÇÃO 3: PULVERIZAÇÃO ═══ */}
        {hasSpraying && coffeeData.coffeeSpraying && (() => {
          sectionNum++;
          return (
            <ReportSection number={sectionNum} title="Pulverização" subtitle="Receita de calda e equipamento">
              <SprayingSummary data={coffeeData.coffeeSpraying} hectares={hectares} plantsPerHa={plantsPerHa} insumoData={nutrientProducts} />
            </ReportSection>
          );
        })()}

        {/* ═══ SEÇÃO: BALANÇO NUTRICIONAL ═══ */}
        {hasLeafAnalysis && coffeeData.leafAnalysis && nutrientProducts.length > 0 && (() => {
          sectionNum++;
          return (
            <ReportSection number={sectionNum} title="Balanço Nutricional" subtitle="Aporte real dos produtos vs. necessidade foliar">
              <NutrientComparisonTable
                products={nutrientProducts}
                leafAnalysis={coffeeData.leafAnalysis}
                month={currentMonth}
              />
            </ReportSection>
          );
        })()}

        {/* ═══ SEÇÃO: ORIENTAÇÕES DE APLICAÇÃO ═══ */}
        {filledSections > 0 && (() => {
          sectionNum++;
          return (
            <ReportSection number={sectionNum} title="Orientações de Aplicação">
              <div className="space-y-3">
                {/* Eficiência */}
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-2">
                    <Leaf className="w-3.5 h-3.5" />
                    Quando Aplicar
                  </p>
                  <ul className="text-xs text-emerald-800 space-y-1.5 list-disc list-inside">
                    <li><strong>Pré-Florada (Jul–Set):</strong> Aplicação de Boro (0,3%) e Zinco (0,5%) para garantir floração uniforme.</li>
                    <li><strong>Pós-Florada (Out–Dez):</strong> Reforço de Zinco, Magnésio (0,5%) e micronutrientes para expansão dos frutos.</li>
                    <li><strong>Enchimento (Jan–Mar):</strong> Potássio foliar (1,0%) e Magnésio para peso e qualidade dos grãos.</li>
                    <li><strong>Maturação (Abr–Jun):</strong> Aplicações de manutenção. Evitar em período de seca prolongada.</li>
                  </ul>
                </div>

                {/* Como aplicar */}
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <Droplets className="w-3.5 h-3.5" />
                    Como Aplicar
                  </p>
                  <ul className="text-xs text-blue-800 space-y-1.5 list-disc list-inside">
                    <li>Aplicar nas <strong>primeiras horas da manhã</strong> (6h–10h) ou final da tarde (16h–18h).</li>
                    <li>Utilizar gotas <strong>finas a médias</strong> para garantir cobertura uniforme.</li>
                    <li>Adicionar <strong>adjuvante espalhante adesivo</strong> para melhorar a fixação.</li>
                    <li>Respeitar o <strong>intervalo mínimo de 15 dias</strong> entre aplicações foliares.</li>
                    <li>Não aplicar com <strong>vento acima de 10 km/h</strong> ou previsão de chuva em 4h.</li>
                  </ul>
                </div>

                {/* Segurança */}
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xs font-bold text-red-800 mb-2 flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Segurança
                  </p>
                  <p className="text-xs text-red-800">
                    Uso <strong>obrigatório de EPI</strong> no manuseio de defensivos e fertilizantes concentrados. Respeitar período de carência e intervalos de reentrada.
                  </p>
                </div>
              </div>
            </ReportSection>
          );
        })()}

        {/* ═══ SEÇÃO: ANÁLISE ECONÔMICA ═══ */}
        {filledSections > 0 && totalCostPerHa > 0 && (() => {
          sectionNum++;
          const impactPct = revenuePerHa > 0 ? ((totalCostPerHa / revenuePerHa) * 100) : 0;

          return (
            <ReportSection number={sectionNum} title="Análise Econômica da Adubação Foliar">
              {/* Cost breakdown */}
              <div className="space-y-2">
                {fertigationCostPerHa > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Waves className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="text-xs font-medium text-gray-700">Fertirrigação</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{fmtCurrency(fertigationCostPerHa)}/ha</span>
                  </div>
                )}
                {sprayingCostPerHa > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="text-xs font-medium text-gray-700">Pulverização</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{fmtCurrency(sprayingCostPerHa)}/ha</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <HighlightBox label="Custo / ha" value={fmtCurrency(totalCostPerHa)} variant="primary" />
                <HighlightBox label="Custo / Saca" value={sacas > 0 ? fmtCurrency(costPerSaca) : '—'} />
                <HighlightBox
                  label="Total Área"
                  value={hectares > 0 ? fmtCurrency(totalAreaCost) : '—'}
                  sub={hectares > 0 ? `${hectares} ha` : undefined}
                />
                <HighlightBox
                  label="Receita Bruta / ha"
                  value={fmtCurrency(revenuePerHa)}
                  sub={`${sacas} sc × ${fmtCurrency(PRICE_PER_SACA)}`}
                  variant="success"
                />
              </div>

              {sacas > 0 && (
                <div className={cn(
                  "p-4 rounded-lg border text-center",
                  profitPerHa >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                )}>
                  <p className="text-xs text-gray-600 mb-1">Margem por Hectare (Receita − Custo Foliar)</p>
                  <p className={cn("text-2xl font-bold", profitPerHa >= 0 ? "text-emerald-700" : "text-red-700")}>
                    {fmtCurrency(profitPerHa)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Impacto: <strong>{impactPct.toFixed(1)}%</strong> da Receita Bruta.
                  </p>
                </div>
              )}

              {hectares > 0 && totalSacas > 0 && (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                  <p className="text-xs text-gray-600 mb-1">Receita Bruta Esperada ({hectares} ha)</p>
                  <p className="text-2xl font-bold text-emerald-700">{fmtCurrency(totalSacas * PRICE_PER_SACA)}</p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Base: {totalSacas.toLocaleString('pt-BR')} sacas × {fmtCurrency(PRICE_PER_SACA)}/sc
                  </p>
                </div>
              )}
            </ReportSection>
          );
        })()}

        {/* ═══ EMPTY STATE ═══ */}
        {filledSections === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">
              Preencha as etapas anteriores para visualizar o relatório consolidado.
            </p>
          </div>
        )}

        {/* ═══ RODAPÉ PROFISSIONAL ═══ */}
        {filledSections > 0 && (
          <div className="mt-6 pt-4 border-t-2 border-emerald-600">
            {/* Assinaturas */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div className="text-center">
                <div className="border-b-2 border-gray-400 w-48 mx-auto mb-1 mt-10" />
                <p className="text-xs font-semibold text-gray-800">Responsável Técnico</p>
                {isConsultor ? (
                  <>
                    {profile?.full_name && <p className="text-[10px] text-gray-500">Eng. Agr. {profile.full_name}</p>}
                    {profile?.crea_art && <p className="text-[10px] text-gray-500">{profile.crea_art}</p>}
                    {profile?.telefone && <p className="text-[10px] text-gray-500">Tel: {profile.telefone}</p>}
                  </>
                ) : (
                  <p className="text-[10px] text-gray-500">SOLO V3</p>
                )}
              </div>
              <div className="text-center">
                <div className="border-b-2 border-gray-400 w-48 mx-auto mb-1 mt-10" />
                <p className="text-xs font-semibold text-gray-800">Produtor</p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center space-y-2 pt-3 border-t border-gray-200">
              <img src={LOGO_URL} alt="Solo V3" className="h-16 mx-auto opacity-60" />
              <p className="text-[9px] text-gray-400 leading-relaxed">
                Solo V3 Tecnologia Agrícola | Relatório gerado em {new Date().toLocaleDateString('pt-BR')} | Fontes: EMBRAPA / INCAPER / 5ª Aproximação / ESALQ / UFES.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Action Buttons (outside printable area) ─── */}
      {filledSections > 0 && (
        <div className="space-y-3 no-print">
          {talhaoId && (
            <Button
              size="lg"
              onClick={handleSaveToHistory}
              disabled={saving || saved}
              className="w-full gap-2"
              variant={saved ? 'outline' : 'default'}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Salvando...' : saved ? 'Salvo no Histórico' : 'Salvar no Histórico do Talhão'}
            </Button>
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
