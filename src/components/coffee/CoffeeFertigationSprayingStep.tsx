import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Droplets, Plus, Trash2, Package, ArrowDownToLine,
  Tractor, PlaneTakeoff, Backpack, Waves, Search, FlaskConical, Sparkles, Loader2, Hand, PackageCheck, AlertTriangle, Check, X,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCoffee } from '@/contexts/CoffeeContext';
import { useTalhoes } from '@/hooks/useTalhoes';
import { findDoseK2O, findDoseP2O5 } from '@/data/coffeePlantingReference';
import { EXTRACTION_FACTORS, calcAdultNDemand, calcAdultK2ODemand, getAdultP2O5, getYear2P2O5, getYear1P2O5, calcStandFactor } from '@/lib/coffeeRecommendationEngine';
// buildHybridPlan removed — productsForComparison now uses only mix products directly
import type { DemandOverrides } from '@/components/coffee/NutrientComparisonTable';
import { useCoffeeDemand } from '@/hooks/useCoffeeDemand';
import type { CoffeeFertigationProduct, CoffeeSprayingProduct } from '@/contexts/CoffeeContext';
import { InsumoFormDialog } from '@/components/insumos/InsumoFormDialog';
import { NutrientComparisonTable } from '@/components/coffee/NutrientComparisonTable';
import { CompatibilityAlerts } from '@/components/coffee/CompatibilityAlerts';
import { TANKMIX_PRESETS } from '@/data/tankmixPresets';
import { getStageForMonth, MONTH_NAMES } from '@/data/coffeePhenology';
import { cn } from '@/lib/utils';
import { generateAutoRecommendation, getNutrientSymbol } from '@/lib/autoRecommendationEngine';
import type { FirstYearOverride } from '@/lib/autoRecommendationEngine';
import { GROUP_INFO, classifyInsumo, type CompatGroup } from '@/lib/compatibilityEngine';
import type { RecommendedProduct } from '@/lib/autoRecommendationEngine';


// ─── Types ───────────────────────────────────────────────────
interface PrincipioAtivoData {
  nome: string;
  concentracao: number;
  unidade: string;
}

interface InsumoOption {
  id: string;
  nome: string;
  tipo_produto: string;
  preco: number;
  tamanho_unidade: number;
  medida: string;
  principios_ativos: PrincipioAtivoData[] | null;
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
}

type DoseUnit = 'L/ha' | 'Kg/ha' | 'mL/ha' | 'g/ha';

const DOSE_UNITS: { value: DoseUnit; label: string }[] = [
  { value: 'L/ha', label: 'L/ha' },
  { value: 'Kg/ha', label: 'Kg/ha' },
  { value: 'mL/ha', label: 'mL/ha' },
  { value: 'g/ha', label: 'g/ha' },
];

// ─── Fertigation Tank Sizes ──────────────────────────────────
const FERTIGATION_TANKS = [
  { value: 300, label: '300 L' },
  { value: 500, label: '500 L' },
  { value: 1000, label: '1.000 L' },
];

// ─── Spraying Equipment ──────────────────────────────────────
type SprayEquipmentType = 'trator' | 'drone' | 'bomba_costal';

interface SprayEquipmentPreset {
  type: SprayEquipmentType;
  label: string;
  icon: typeof Tractor;
  desc: string;
  defaultTank: number;
  defaultRate: number;
  tankMin: number;
  tankMax: number;
}

const SPRAY_PRESETS: SprayEquipmentPreset[] = [
  {
    type: 'trator',
    label: 'Bomba Jato (Trator)',
    icon: Tractor,
    desc: 'Pulverizador tratorizado',
    defaultTank: 2000,
    defaultRate: 200,
    tankMin: 50,
    tankMax: 99999,
  },
  {
    type: 'drone',
    label: 'Drone',
    icon: PlaneTakeoff,
    desc: 'Pulverização aérea',
    defaultTank: 20,
    defaultRate: 10,
    tankMin: 10,
    tankMax: 50,
  },
  {
    type: 'bomba_costal',
    label: 'Bomba Costal',
    icon: Backpack,
    desc: 'Aplicação manual',
    defaultTank: 20,
    defaultRate: 200,
    tankMin: 20,
    tankMax: 30,
  },
];

const BACKPACK_OPTIONS = [
  { value: 20, label: '20 L' },
  { value: 30, label: '30 L' },
];

// ─── Calculation helpers ─────────────────────────────────────
function normalizeDoseToPerHa(dose: number, unit: DoseUnit): { valuePerHa: number; outputUnit: string } {
  switch (unit) {
    case 'L/ha':
      return { valuePerHa: dose, outputUnit: 'L' };
    case 'Kg/ha':
      return { valuePerHa: dose, outputUnit: 'Kg' };
    case 'mL/ha':
      return { valuePerHa: dose / 1000, outputUnit: 'L' };
    case 'g/ha':
      return { valuePerHa: dose / 1000, outputUnit: 'Kg' };
    default:
      return { valuePerHa: dose, outputUnit: 'L' };
  }
}

function calcPerTank(dosePerHa: number, tankCapacity: number, applicationRate: number): number {
  const areaPerTank = tankCapacity / applicationRate;
  return dosePerHa * areaPerTank;
}

function calcTotal(dosePerHa: number, hectares: number): number {
  return dosePerHa * hectares;
}

function formatQty(value: number, outputUnit: string): string {
  if (value < 0.01) return `${(value * 1000).toFixed(1)} ${outputUnit === 'L' ? 'mL' : 'g'}`;
  return `${value.toFixed(2)} ${outputUnit}`;
}

// ─── Category filter options ─────────────────────────────────
const CATEGORY_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'preset', label: '⚗️ TankMix' },
  { value: 'Foliar', label: 'Foliar' },
  { value: 'Cobertura', label: 'Cobertura' },
  { value: 'Correção de Solo', label: 'Correção' },
  { value: 'Plantio', label: 'Plantio' },
  { value: 'Fungicida', label: 'Fungicida' },
  { value: 'Inseticida', label: 'Inseticida' },
  { value: 'Herbicida', label: 'Herbicida' },
  { value: 'Adjuvantes', label: 'Adjuvantes' },
];

const PHYTO_ONLY_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'ai_recommended', label: '🤖 Recomendados' },
  { value: 'Fungicida', label: 'Fungicida' },
  { value: 'Inseticida', label: 'Inseticida' },
  { value: 'Herbicida', label: 'Herbicida' },
  { value: 'Adjuvantes', label: 'Adjuvantes' },
];

const PHYTO_PRODUCT_TYPES = ['Fungicida', 'Inseticida', 'Herbicida', 'Adjuvantes'];

// ─── Nutrient deficit reference (g/ha) for dose suggestion ───
const DEFICIT_NUTRIENTS = [
  { key: 'n', symbol: 'N', dbField: 'macro_n', refMin: 350000, refMax: 500000, toxLimit: 0, isMacro: true },
  { key: 'p', symbol: 'P₂O₅', dbField: 'macro_p2o5', refMin: 40000, refMax: 100000, toxLimit: 0, isMacro: true },
  { key: 'k', symbol: 'K₂O', dbField: 'macro_k2o', refMin: 300000, refMax: 450000, toxLimit: 0, isMacro: true },
  { key: 's', symbol: 'S', dbField: 'macro_s', refMin: 20000, refMax: 40000, toxLimit: 0, isMacro: true },
  { key: 'b', symbol: 'B', dbField: 'micro_b', refMin: 500, refMax: 1500, toxLimit: 2500, isMacro: false },
  { key: 'zn', symbol: 'Zn', dbField: 'micro_zn', refMin: 300, refMax: 1000, toxLimit: 2000, isMacro: false },
  { key: 'cu', symbol: 'Cu', dbField: 'micro_cu', refMin: 200, refMax: 800, toxLimit: 1500, isMacro: false },
  { key: 'mn', symbol: 'Mn', dbField: 'micro_mn', refMin: 300, refMax: 1500, toxLimit: 3000, isMacro: false },
  { key: 'fe', symbol: 'Fe', dbField: 'micro_fe', refMin: 500, refMax: 2000, toxLimit: 4000, isMacro: false },
  { key: 'mo', symbol: 'Mo', dbField: 'micro_mo', refMin: 5, refMax: 50, toxLimit: 100, isMacro: false },
];

function calcCurrentTotals(products: Array<{ dosePerHa: number; unit: string; [k: string]: any }>, insumoOptions: InsumoOption[]): Record<string, number> {
  const totals: Record<string, number> = {};
  DEFICIT_NUTRIENTS.forEach(n => { totals[n.key] = 0; });
  products.forEach(p => {
    const insumo = insumoOptions.find(i => i.id === p.insumoId) || p;
    const kgPerHa = normalizeDoseToPerHa(p.dosePerHa, p.unit as DoseUnit).valuePerHa;
    DEFICIT_NUTRIENTS.forEach(n => {
      const conc = Number((insumo as any)[n.dbField]) || 0;
      if (conc > 0) totals[n.key] += kgPerHa * (conc / 100) * 1000;
    });
  });
  return totals;
}

interface DeficitSuggestion {
  nutrient: string;
  symbol: string;
  suggestedDoseKgHa: number;
  gapGrams: number;
  isMacro: boolean;
}

function calcDeficitDose(insumo: InsumoOption, currentTotals: Record<string, number>): DeficitSuggestion | null {
  let bestSuggestion: DeficitSuggestion | null = null;
  let biggestRelativeGap = 0;

  DEFICIT_NUTRIENTS.forEach(n => {
    const conc = Number((insumo as any)[n.dbField]) || 0;
    if (conc <= 0) return;
    const gap = n.refMin - (currentTotals[n.key] || 0);
    if (gap <= 0) return; // already covered

    // dose (kg/ha) = gap (g) / (concentration% / 100 * 1000)
    const doseKgHa = gap / (conc / 100 * 1000);
    // Respect toxicity: check all nutrients this dose would provide
    let safe = true;
    if (doseKgHa > 0) {
      DEFICIT_NUTRIENTS.forEach(check => {
        const checkConc = Number((insumo as any)[check.dbField]) || 0;
        if (checkConc <= 0 || check.toxLimit <= 0) return;
        const wouldProvide = (currentTotals[check.key] || 0) + doseKgHa * (checkConc / 100) * 1000;
        if (wouldProvide > check.toxLimit) safe = false;
      });
    }

    const relativeGap = gap / n.refMin;
    if (safe && relativeGap > biggestRelativeGap && doseKgHa > 0) {
      biggestRelativeGap = relativeGap;
      bestSuggestion = { nutrient: n.key, symbol: n.symbol, suggestedDoseKgHa: doseKgHa, gapGrams: gap, isMacro: n.isMacro };
    }
  });

  return bestSuggestion;
}

// ─── Shared Product Selector ─────────────────────────────────
interface TreatmentPlanRef {
  produto: string;
  principioAtivo: string;
  alvo: string;
  dosePerHa: number;
  unidade: string;
  tipoProduto?: string;
}

function ProductSelector({
  insumoOptions,
  onAdd,
  onOpenNewInsumo,
  currentProducts,
  phytoOnly = false,
  treatmentPlanEntries = [],
}: {
  insumoOptions: InsumoOption[];
  onAdd: (insumo: InsumoOption, dose: number, unit: DoseUnit) => void;
  onOpenNewInsumo: () => void;
  currentProducts?: Array<{ id: string; insumoId?: string; dosePerHa: number; unit: string; [k: string]: any }>;
  phytoOnly?: boolean;
  treatmentPlanEntries?: TreatmentPlanRef[];
}) {
  const [selectedId, setSelectedId] = useState('');
  const [doseInput, setDoseInput] = useState('');
  const [unit, setUnit] = useState<DoseUnit>('L/ha');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(treatmentPlanEntries.length > 0 ? 'ai_recommended' : 'all');

  // Build AI-recommended virtual options from treatment plan
  const aiRecommendedOptions = useMemo(() => {
    if (treatmentPlanEntries.length === 0) return [];
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const results: (InsumoOption & { _aiLabel: string })[] = [];
    const addedIds = new Set<string>();

    treatmentPlanEntries.forEach(entry => {
      const entryNorm = normalize(entry.produto);
      // Try to find matching DB product
      let matched = insumoOptions.find(i => normalize(i.nome) === entryNorm);
      if (!matched) matched = insumoOptions.find(i => normalize(i.nome).includes(entryNorm) || entryNorm.includes(normalize(i.nome)));

      if (matched && !addedIds.has(matched.id)) {
        addedIds.add(matched.id);
        results.push({ ...matched, _aiLabel: `🎯 ${entry.alvo}` });
      }

      // Also find alternatives by active ingredient
      const principioNorm = normalize(entry.principioAtivo);
      insumoOptions.forEach(i => {
        if (addedIds.has(i.id)) return;
        if (!i.principios_ativos || i.principios_ativos.length === 0) return;
        const hasMatch = i.principios_ativos.some(pa => {
          const paNorm = normalize(pa.nome);
          return paNorm.includes(principioNorm) || principioNorm.includes(paNorm);
        });
        if (hasMatch) {
          addedIds.add(i.id);
          results.push({ ...i, _aiLabel: `🧪 ${entry.principioAtivo}` });
        }
      });

      // If no match at all, create a virtual entry
      if (!matched) {
        const virtualId = `ai-ref-${entryNorm}`;
        if (!addedIds.has(virtualId)) {
          addedIds.add(virtualId);
          const unitMap: Record<string, DoseUnit> = { 'L/ha': 'L/ha', 'Kg/ha': 'Kg/ha', 'g/ha': 'g/ha', 'mL/ha': 'mL/ha' };
          results.push({
            id: virtualId,
            nome: entry.produto,
            tipo_produto: 'Fungicida',
            preco: 0,
            tamanho_unidade: 1,
            medida: 'L',
            principios_ativos: [{ nome: entry.principioAtivo, concentracao: 0, unidade: '' }],
            recomendacao_dose_ha: entry.dosePerHa,
            recomendacao_dose_unidade: unitMap[entry.unidade] || 'L/ha',
            macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 0,
            micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
            _aiLabel: `🎯 ${entry.alvo}`,
          } as InsumoOption & { _aiLabel: string });
        }
      }
    });

    return results;
  }, [treatmentPlanEntries, insumoOptions]);

  // Merge all options for lookup
  const allOptions = useMemo(() => {
    const ids = new Set(insumoOptions.map(i => i.id));
    const virtualOnly = aiRecommendedOptions.filter(ai => !ids.has(ai.id));
    return [...insumoOptions, ...virtualOnly];
  }, [insumoOptions, aiRecommendedOptions]);

  const filteredOptions = useMemo(() => {
    if (categoryFilter === 'ai_recommended') {
      return aiRecommendedOptions.filter(i => 
        searchTerm === '' || i.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return insumoOptions.filter(i => {
      const isPreset = (i as any).isPreset === true;
      const matchesCategory = categoryFilter === 'all' 
        || (categoryFilter === 'preset' && isPreset) 
        || (categoryFilter !== 'preset' && i.tipo_produto === categoryFilter);
      const matchesSearch = searchTerm === '' || i.nome.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, aiRecommendedOptions, insumoOptions, searchTerm]);

  const selectedInsumo = allOptions.find(i => i.id === selectedId);

  // Calculate deficit-based dose suggestion
  const deficitSuggestion = useMemo(() => {
    if (!selectedInsumo || !currentProducts) return null;
    const totals = calcCurrentTotals(currentProducts, insumoOptions);
    return calcDeficitDose(selectedInsumo, totals);
  }, [selectedInsumo, currentProducts, insumoOptions]);

  const handleAdd = () => {
    if (!selectedInsumo || !doseInput) {
      toast.error('Selecione um produto e informe a dose');
      return;
    }
    const dose = parseFloat(doseInput.replace(',', '.'));
    if (isNaN(dose) || dose <= 0) {
      toast.error('Informe uma dose válida');
      return;
    }
    onAdd(selectedInsumo, dose, unit);
    setSelectedId('');
    setDoseInput('');
  };

  return (
    <div className="space-y-4 p-4 bg-secondary rounded-xl">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Adicionar Produto</Label>
        <Button variant="ghost" size="sm" onClick={onOpenNewInsumo} className="gap-2 text-xs">
          <Package className="h-3 w-3" />
          Novo Insumo
        </Button>
      </div>

      {/* Search field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produto pelo nome..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        {(phytoOnly ? PHYTO_ONLY_FILTERS : CATEGORY_FILTERS).map(cat => (
          <button
            key={cat.value}
            onClick={() => { setCategoryFilter(cat.value); setSelectedId(''); }}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              categoryFilter === cat.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-accent'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Compatibility group legend */}
      <div className="p-3 bg-background rounded-lg space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Grupos de Compatibilidade</span>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(GROUP_INFO) as [CompatGroup, typeof GROUP_INFO[CompatGroup]][]).map(([key, info]) => (
            <div key={key} className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', info.badgeColor)}>
              {key} — {info.desc}
            </div>
          ))}
        </div>
      </div>

      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um produto..." />
        </SelectTrigger>
        <SelectContent>
          {filteredOptions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Nenhum produto encontrado.</div>
          ) : (
            filteredOptions.map(i => {
              const group = classifyInsumo(i);
              const gInfo = GROUP_INFO[group];
              const aiLabel = (i as any)._aiLabel as string | undefined;
              return (
                <SelectItem key={i.id} value={i.id}>
                  <div className="flex items-center gap-2">
                    <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0', gInfo.badgeColor)}>
                      {group}
                    </span>
                    <span>{i.nome}</span>
                    {aiLabel && (
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">{aiLabel}</Badge>
                    )}
                    {(i as any).isPreset && (
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">TankMix</Badge>
                    )}
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>

      {selectedInsumo && (
        <div className="p-3 bg-background rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{selectedInsumo.nome}</span>
            <Badge variant="secondary" className="text-xs">{selectedInsumo.tipo_produto}</Badge>
          </div>
          {selectedInsumo.principios_ativos && selectedInsumo.principios_ativos.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedInsumo.principios_ativos.map((pa, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {pa.nome}: {pa.concentracao} {pa.unidade}
                </Badge>
              ))}
            </div>
          )}
          {selectedInsumo.recomendacao_dose_ha > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Dose recomendada: {selectedInsumo.recomendacao_dose_ha} {selectedInsumo.recomendacao_dose_unidade}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => {
                  setDoseInput(selectedInsumo.recomendacao_dose_ha.toString());
                  const match = DOSE_UNITS.find(u => u.value === selectedInsumo.recomendacao_dose_unidade);
                  if (match) setUnit(match.value);
                  toast.success('Dose aplicada');
                }}
              >
                <ArrowDownToLine className="h-3 w-3" />
                Usar
              </Button>
            </div>
          )}

          {/* Deficit-based dose suggestion */}
          {deficitSuggestion && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  💡 Dose p/ cobrir déficit de {deficitSuggestion.symbol}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {deficitSuggestion.suggestedDoseKgHa < 1
                    ? `${(deficitSuggestion.suggestedDoseKgHa * 1000).toFixed(0)} g/ha`
                    : `${deficitSuggestion.suggestedDoseKgHa.toFixed(2)} kg/ha`}
                  <span className="text-[10px] text-muted-foreground ml-1.5">
                    (faltam {deficitSuggestion.isMacro
                      ? `${(deficitSuggestion.gapGrams / 1000).toFixed(1)} kg/ha`
                      : `${deficitSuggestion.gapGrams.toFixed(0)} g/ha`} de {deficitSuggestion.symbol})
                  </span>
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs gap-1 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 shrink-0"
                onClick={() => {
                  if (deficitSuggestion.suggestedDoseKgHa < 1) {
                    setDoseInput((deficitSuggestion.suggestedDoseKgHa * 1000).toFixed(0));
                    setUnit('g/ha');
                  } else {
                    setDoseInput(deficitSuggestion.suggestedDoseKgHa.toFixed(2));
                    setUnit('Kg/ha');
                  }
                  toast.success(`Dose sugerida para cobrir déficit de ${deficitSuggestion.symbol} aplicada`);
                }}
              >
                <ArrowDownToLine className="h-3 w-3" />
                Usar
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Unidade</Label>
          <Select value={unit} onValueChange={v => setUnit(v as DoseUnit)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOSE_UNITS.map(u => (
                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Dosagem</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="Ex: 2.5"
            value={doseInput}
            onChange={e => setDoseInput(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={handleAdd} disabled={!selectedId || !doseInput} className="w-full gap-2">
        <Plus className="h-4 w-4" />
        Adicionar ao Mix
      </Button>
    </div>
  );
}

// ─── AI Recommendation Metadata ─────────────────────────────
interface AiRecommendationMeta {
  alvo: string;
  principioAtivo: string;
  alternatives: Array<{ id: string; nome: string; tipo_produto: string; principios_ativos: PrincipioAtivoData[] | null; recomendacao_dose_ha: number; recomendacao_dose_unidade: string }>;
}

// ─── Product List ────────────────────────────────────────────
function ProductList({
  products,
  onRemove,
  tankCapacity,
  applicationRate,
  hectares,
  label,
  aiMeta,
  onSwapProduct,
}: {
  products: Array<{ id: string; name: string; type: string; dosePerHa: number; unit: DoseUnit; insumoId?: string }>;
  onRemove: (id: string) => void;
  tankCapacity: number;
  applicationRate: number;
  hectares: number;
  label: string;
  aiMeta?: Record<string, AiRecommendationMeta>;
  onSwapProduct?: (productId: string, newInsumo: { id: string; nome: string; tipo_produto: string; recomendacao_dose_ha: number; recomendacao_dose_unidade: string }) => void;
}) {
  const [expandedAlts, setExpandedAlts] = useState<Record<string, boolean>>({});

  // Group products by type when aiMeta is present (protocol mode)
  const hasAiProducts = aiMeta && Object.keys(aiMeta).length > 0;

  const groupedProducts = useMemo(() => {
    if (!hasAiProducts) return null;
    const groups: Record<string, typeof products> = {};
    const TYPE_ORDER = ['Fungicida', 'Fungicida Sistêmico', 'Inseticida', 'Acaricida', 'Bactericida', 'Nematicida', 'Herbicida', 'Adjuvantes'];
    products.forEach(p => {
      const type = p.type || 'Outros';
      if (!groups[type]) groups[type] = [];
      groups[type].push(p);
    });
    // Sort groups by TYPE_ORDER
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      const ia = TYPE_ORDER.indexOf(a);
      const ib = TYPE_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return sorted;
  }, [products, hasAiProducts]);

  const TYPE_COLORS: Record<string, string> = {
    'Fungicida': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    'Fungicida Sistêmico': 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    'Inseticida': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'Acaricida': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    'Bactericida': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    'Nematicida': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    'Herbicida': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'Adjuvantes': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };

  const TYPE_ICONS: Record<string, string> = {
    'Fungicida': '🍄',
    'Fungicida Sistêmico': '🍄',
    'Inseticida': '🐛',
    'Acaricida': '🕷️',
    'Bactericida': '🦠',
    'Nematicida': '🪱',
    'Herbicida': '🌿',
    'Adjuvantes': '🧪',
  };

  const renderProduct = (product: typeof products[0]) => {
    const { valuePerHa, outputUnit } = normalizeDoseToPerHa(product.dosePerHa, product.unit);
    const perTank = calcPerTank(valuePerHa, tankCapacity, applicationRate);
    const total = calcTotal(valuePerHa, hectares);
    const meta = aiMeta?.[product.id];
    const showAlts = expandedAlts[product.id];

    return (
      <div key={product.id} className="p-4 bg-secondary rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">{product.name}</p>
              {meta && (
                <Badge className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/20 border">
                  🤖 Recomendação IA
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {!hasAiProducts && <Badge variant="outline" className="text-xs">{product.type}</Badge>}
              {meta && (
                <>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/5 text-amber-600 border-amber-500/20">
                    🎯 {meta.alvo}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-blue-500/5 text-blue-600 border-blue-500/20">
                    <FlaskConical className="w-3 h-3 mr-1" />
                    {meta.principioAtivo}
                  </Badge>
                </>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(product.id)}
            className="text-destructive hover:text-destructive shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Alternatives from catalog with same active ingredient */}
        {meta && meta.alternatives.length > 0 && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setExpandedAlts(prev => ({ ...prev, [product.id]: !prev[product.id] }))}
              className="text-[11px] text-primary font-medium flex items-center gap-1 hover:underline"
            >
              <Package className="w-3 h-3" />
              {showAlts ? 'Ocultar' : `${meta.alternatives.length} alternativa(s) no catálogo com mesmo princípio ativo`}
            </button>
            {showAlts && (
              <div className="mt-2 space-y-1.5" style={{ animation: 'fade-in 0.2s ease-out' }}>
                {meta.alternatives.map(alt => (
                  <div
                    key={alt.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{alt.nome}</p>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-[9px]">{alt.tipo_produto}</Badge>
                        {alt.principios_ativos?.map((pa, idx) => (
                          <span key={idx} className="text-[9px] text-muted-foreground">
                            {pa.nome} {pa.concentracao}{pa.unidade}
                          </span>
                        ))}
                      </div>
                      {alt.recomendacao_dose_ha > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Dose: {alt.recomendacao_dose_ha} {alt.recomendacao_dose_unidade}
                        </p>
                      )}
                    </div>
                    {onSwapProduct && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-7 px-2 shrink-0 ml-2"
                        onClick={() => onSwapProduct(product.id, alt)}
                      >
                        Substituir
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-background rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase">Dose/ha</p>
            <p className="text-sm font-semibold">{product.dosePerHa} {product.unit}</p>
          </div>
          <div className="p-2 bg-background rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase">Por Tanque</p>
            <p className="text-sm font-semibold">{formatQty(perTank, outputUnit)}</p>
          </div>
          <div className="p-2 bg-background rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase">Total ({hectares} ha)</p>
            <p className="text-sm font-semibold">{formatQty(total, outputUnit)}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Droplets className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label} ({products.length})</span>
      </div>

      {products.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground bg-secondary rounded-xl">
          <Droplets className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhum produto adicionado</p>
        </div>
      ) : groupedProducts ? (
        <div className="space-y-4">
          {groupedProducts.map(([type, prods]) => (
            <div key={type} className="space-y-2">
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold',
                TYPE_COLORS[type] || 'bg-secondary text-muted-foreground border-border'
              )}>
                <span>{TYPE_ICONS[type] || '📦'}</span>
                <span>{type}</span>
                <span className="ml-auto opacity-70">({prods.length})</span>
              </div>
              <div className="space-y-2 pl-1">
                {prods.map(renderProduct)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map(renderProduct)}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function CoffeeFertigationSprayingStep({ phytoOnly = false }: { phytoOnly?: boolean } = {}) {
  const {
    coffeeData,
    setFertigationData,
    setCoffeeSprayingData,
  } = useCoffee();

  const hectares = coffeeData.productivity?.hectares || coffeeData.hectares || 1;

  // ── Insumos from DB ──
  const [insumoOptions, setInsumoOptions] = useState<InsumoOption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('Foliar');

  const loadInsumos = useCallback(async () => {
    const { data, error } = await supabase
      .from('insumos')
      .select('id, nome, tipo_produto, preco, tamanho_unidade, medida, principios_ativos, recomendacao_dose_ha, recomendacao_dose_unidade, macro_n, macro_p2o5, macro_k2o, macro_s, micro_b, micro_zn, micro_cu, micro_mn, micro_fe, micro_mo')
      .in('tipo_produto', phytoOnly ? PHYTO_PRODUCT_TYPES : ['Herbicida', 'Adjuvantes', 'Fungicida', 'Inseticida', 'Foliar', 'Cobertura', 'Plantio', 'Correção de Solo'])
      .eq('status', 'ativo');
    if (error) { console.error(error); return; }
    const dbInsumos: InsumoOption[] = (data || []).map(item => ({
      ...item,
      principios_ativos: Array.isArray(item.principios_ativos)
        ? item.principios_ativos as unknown as PrincipioAtivoData[]
        : null,
      macro_n: Number(item.macro_n) || 0,
      macro_p2o5: Number(item.macro_p2o5) || 0,
      macro_k2o: Number(item.macro_k2o) || 0,
      macro_s: Number(item.macro_s) || 0,
      micro_b: Number(item.micro_b) || 0,
      micro_zn: Number(item.micro_zn) || 0,
      micro_cu: Number(item.micro_cu) || 0,
      micro_mn: Number(item.micro_mn) || 0,
      micro_fe: Number(item.micro_fe) || 0,
      micro_mo: Number(item.micro_mo) || 0,
    }));

    // Merge presets (avoid duplicates by normalized name)
    // Normalize: strip parenthetical suffixes and common synonyms for dedup
    const normalizeName = (n: string) => n.toLowerCase()
      .replace(/\s*\(.*?\)\s*/g, '') // remove (Branco), (KCl), etc.
      .replace(/\s+/g, ' ')
      .trim();
    const dbNamesNorm = new Set(dbInsumos.map(i => normalizeName(i.nome)));
    const uniquePresets = TANKMIX_PRESETS.filter(p => !dbNamesNorm.has(normalizeName(p.nome)));
    setInsumoOptions([...uniquePresets, ...dbInsumos]);
  }, []);

  useEffect(() => { loadInsumos(); }, [loadInsumos]);

  // ── Fertigation State ──
  const [fertiTank, setFertiTank] = useState(coffeeData.fertigation?.tankSize || 500);
  const [fertiRate, setFertiRate] = useState(coffeeData.fertigation?.volumePerHa || 500);
  const [fertiProducts, setFertiProducts] = useState<CoffeeFertigationProduct[]>(
    coffeeData.fertigation?.products || []
  );

  // ── Spraying State ──
  const [sprayEquip, setSprayEquip] = useState<SprayEquipmentType>(
    coffeeData.coffeeSpraying?.equipmentType || 'trator'
  );
  const [sprayTank, setSprayTank] = useState(coffeeData.coffeeSpraying?.tankCapacity || 400);
  const [sprayRate, setSprayRate] = useState(coffeeData.coffeeSpraying?.applicationRate || 200);
  const [sprayProducts, setSprayProducts] = useState<CoffeeSprayingProduct[]>(
    coffeeData.coffeeSpraying?.products || []
  );

  const activePreset = SPRAY_PRESETS.find(p => p.type === sprayEquip)!;

  // ── Auto-load wizard insumos from previous steps ──
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current || phytoOnly) return;
    if (insumoOptions.length === 0) return;
    if (fertiProducts.length > 0 || sprayProducts.length > 0) return;
    const wizardInsumos = coffeeData.insumos;
    if (wizardInsumos.length === 0) return;

    autoLoadedRef.current = true;
    const normName = (n: string) => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const newFertiProducts: CoffeeFertigationProduct[] = [];
    const newSprayProducts: CoffeeSprayingProduct[] = [];

    wizardInsumos.forEach(wi => {
      const dbInsumo = insumoOptions.find(io => normName(io.nome) === normName(wi.nome));
      const isSprayType = ['Foliar', 'Adjuvantes'].includes(wi.tipoProduto);
      const wizardDose = (wi as any).recomendacaoDoseHa || 0;
      const wizardUnit = ((wi as any).recomendacaoDoseUnidade || 'Kg/ha') as DoseUnit;
      const dbDose = dbInsumo?.recomendacao_dose_ha || 0;
      const dbUnit = (dbInsumo?.recomendacao_dose_unidade || 'Kg/ha') as DoseUnit;
      // Regra crítica: sempre priorizar a dose já calculada nas etapas anteriores do wizard.
      const dose = wizardDose > 0 ? wizardDose : dbDose;
      const unit = wizardDose > 0 ? wizardUnit : dbUnit;
      if (dose <= 0) return;

      const product = {
        id: crypto.randomUUID(),
        insumoId: dbInsumo?.id || (wi as any).id || wi.nome,
        name: wi.nome,
        type: wi.tipoProduto,
        dosePerHa: dose,
        unit,
      };

      if (isSprayType) {
        newSprayProducts.push(product);
      } else {
        newFertiProducts.push(product);
      }
    });

    if (newFertiProducts.length > 0) {
      setFertiProducts(newFertiProducts);
      toast.success(`${newFertiProducts.length} produto(s) das etapas anteriores carregado(s) na fertirrigação`);
    }
    if (newSprayProducts.length > 0) {
      setSprayProducts(newSprayProducts);
      toast.success(`${newSprayProducts.length} produto(s) das etapas anteriores carregado(s) na pulverização`);
    }
  }, [insumoOptions, coffeeData.insumos]);

  // ── Pre-load treatment plan products (phytoOnly mode) ──
  const [aiProductMeta, setAiProductMeta] = useState<Record<string, AiRecommendationMeta>>({});
  const [aiFertiMeta, setAiFertiMeta] = useState<Record<string, AiRecommendationMeta>>({});
  const preloadedPlanRef = useRef<string>('');

  useEffect(() => {
    if (!phytoOnly || insumoOptions.length === 0) return;
    const plan = coffeeData.treatmentPlan;
    if (!plan || plan.entries.length === 0) return;

    // Use fingerprint to avoid re-processing the same plan
    const fingerprint = JSON.stringify(plan.entries.map(e => e.produto + e.alvo));
    if (preloadedPlanRef.current === fingerprint) return;

    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const sprayMetaMap: Record<string, AiRecommendationMeta> = {};
    const fertiMetaMap: Record<string, AiRecommendationMeta> = {};

    const buildProduct = (entry: typeof plan.entries[0]) => {
      const entryNorm = normalize(entry.produto);
      let matched = insumoOptions.find(i => normalize(i.nome) === entryNorm);
      if (!matched) matched = insumoOptions.find(i => normalize(i.nome).includes(entryNorm) || entryNorm.includes(normalize(i.nome)));

      const unitMap: Record<string, DoseUnit> = { 'L/ha': 'L/ha', 'Kg/ha': 'Kg/ha', 'g/ha': 'g/ha', 'mL/ha': 'mL/ha' };
      const unit = unitMap[entry.unidade] || 'L/ha';

      const productId = crypto.randomUUID();

      const principioNorm = normalize(entry.principioAtivo);
      const alternatives = insumoOptions.filter(i => {
        if (matched && i.id === matched.id) return false;
        if (!i.principios_ativos || i.principios_ativos.length === 0) return false;
        return i.principios_ativos.some(pa => {
          const paNorm = normalize(pa.nome);
          return paNorm.includes(principioNorm) || principioNorm.includes(paNorm);
        });
      }).map(i => ({
        id: i.id,
        nome: i.nome,
        tipo_produto: i.tipo_produto,
        principios_ativos: i.principios_ativos,
        recomendacao_dose_ha: i.recomendacao_dose_ha,
        recomendacao_dose_unidade: i.recomendacao_dose_unidade || 'L/ha',
      }));

      const meta: AiRecommendationMeta = {
        alvo: entry.alvo,
        principioAtivo: entry.principioAtivo,
        alternatives,
      };

      return {
        product: {
          id: productId,
          insumoId: matched?.id || '',
          name: matched?.nome || entry.produto,
          type: entry.tipoProduto || matched?.tipo_produto || 'Fungicida',
          dosePerHa: matched?.recomendacao_dose_ha || entry.dosePerHa,
          unit,
        },
        meta,
        productId,
      };
    };

    const newSprayProducts: CoffeeSprayingProduct[] = [];
    const newFertiProducts: CoffeeFertigationProduct[] = [];

    plan.entries.forEach(entry => {
      const sprayResult = buildProduct(entry);
      newSprayProducts.push(sprayResult.product);
      sprayMetaMap[sprayResult.productId] = sprayResult.meta;

      const fertiResult = buildProduct(entry);
      newFertiProducts.push(fertiResult.product);
      fertiMetaMap[fertiResult.productId] = fertiResult.meta;
    });

    if (newSprayProducts.length > 0) {
      preloadedPlanRef.current = fingerprint;
      setSprayProducts(newSprayProducts);
      setAiProductMeta(sprayMetaMap);
      setFertiProducts(newFertiProducts);
      setAiFertiMeta(fertiMetaMap);
      toast.success(`${newSprayProducts.length} produto(s) do diagnóstico carregado(s) na calda e fertirrigação`);
    }
  }, [phytoOnly, insumoOptions, coffeeData.treatmentPlan]);

  // ── Fallback entries from meta (when treatmentPlan context is lost) ──
  const fertiMetaAsEntries = useMemo<TreatmentPlanRef[]>(() => {
    if (Object.keys(aiFertiMeta).length === 0) return [];
    return Object.values(aiFertiMeta).map(meta => {
      const product = fertiProducts.find(p => aiFertiMeta[p.id] === meta);
      return {
        produto: product?.name || '',
        principioAtivo: meta.principioAtivo,
        alvo: meta.alvo,
        dosePerHa: product?.dosePerHa || 0,
        unidade: product?.unit || 'L/ha',
      };
    }).filter(e => e.produto);
  }, [aiFertiMeta, fertiProducts]);

  const sprayMetaAsEntries = useMemo<TreatmentPlanRef[]>(() => {
    if (Object.keys(aiProductMeta).length === 0) return [];
    return Object.values(aiProductMeta).map(meta => {
      const product = sprayProducts.find(p => aiProductMeta[p.id] === meta);
      return {
        produto: product?.name || '',
        principioAtivo: meta.principioAtivo,
        alvo: meta.alvo,
        dosePerHa: product?.dosePerHa || 0,
        unidade: product?.unit || 'L/ha',
      };
    }).filter(e => e.produto);
  }, [aiProductMeta, sprayProducts]);

  // ── Handle swapping a product for an alternative ──
  const handleSwapProduct = useCallback((productId: string, newInsumo: { id: string; nome: string; tipo_produto: string; recomendacao_dose_ha: number; recomendacao_dose_unidade: string }) => {
    const unitMap: Record<string, DoseUnit> = { 'L/ha': 'L/ha', 'Kg/ha': 'Kg/ha', 'g/ha': 'g/ha', 'mL/ha': 'mL/ha' };
    const updater = (prev: any[]) => prev.map((p: any) => {
      if (p.id !== productId) return p;
      return {
        ...p,
        insumoId: newInsumo.id,
        name: newInsumo.nome,
        type: newInsumo.tipo_produto,
        dosePerHa: newInsumo.recomendacao_dose_ha || p.dosePerHa,
        unit: unitMap[newInsumo.recomendacao_dose_unidade] || p.unit,
      };
    });
    setSprayProducts(updater);
    setFertiProducts(updater);
    toast.success(`Produto substituído por ${newInsumo.nome}`);
  }, []);

  // ── Auto-Recommendation State ──
  const [autoRecLoading, setAutoRecLoading] = useState(false);
  const [autoRecResults, setAutoRecResults] = useState<RecommendedProduct[] | null>(null);
  const [sprayAutoRecLoading, setSprayAutoRecLoading] = useState(false);
  const [sprayAutoRecResults, setSprayAutoRecResults] = useState<RecommendedProduct[] | null>(null);
  const [fertiAutoMode, setFertiAutoMode] = useState(true);
  const [sprayAutoMode, setSprayAutoMode] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('fertigation');

  const sacasPerHa = coffeeData.productivity?.sacasPerHectare || 0;
  const totalPlants = coffeeData.totalPlants || 0;
  const plantsPerHa = hectares > 0 ? Math.round(totalPlants / hectares) : 0;

  // ─── 1st year planting detection ──────────────────────────
  const { talhoes } = useTalhoes();
  const selectedTalhao = useMemo(() => {
    if (!coffeeData.selectedTalhaoId) return null;
    return talhoes.find(t => t.id === coffeeData.selectedTalhaoId) ?? null;
  }, [coffeeData.selectedTalhaoId, talhoes]);

  const isIrrigated = selectedTalhao?.irrigated ?? true; // default to true if no talhão selected

  // Force spraying tab when not irrigated
  useEffect(() => {
    if (!isIrrigated) {
      setActiveTab('spraying');
    }
  }, [isIrrigated]);

  const isFirstYear = useMemo(() => {
    if (!selectedTalhao) return false;
    const pm = selectedTalhao.planting_month ?? 1;
    const py = selectedTalhao.planting_year ?? 2020;
    const now = new Date();
    const plantDate = new Date(py, pm - 1);
    const diffMonths = (now.getFullYear() - plantDate.getFullYear()) * 12 + (now.getMonth() - plantDate.getMonth());
    return diffMonths >= 0 && diffMonths <= 24;
  }, [selectedTalhao]);

  const firstYearOverride = useMemo((): FirstYearOverride | undefined => {
    if (!isFirstYear || plantsPerHa <= 0) return undefined;
    const metaN = coffeeData.coffeeType === 'conilon' ? 60 : 40; // g N/plant
    const doseK2O = findDoseK2O(coffeeData.soil?.k ?? 0); // g K2O/plant
    return {
      nGPerHa: metaN * plantsPerHa,
      k2oGPerHa: doseK2O * plantsPerHa,
      microScale: 0.4, // 1st year plants need ~40% of production-level micros
    };
  }, [isFirstYear, plantsPerHa, coffeeData.coffeeType, coffeeData.soil]);

  // ─── Demand overrides for NutrientComparisonTable (shared hook) ─────────
  const { demandOverrides } = useCoffeeDemand({
    isFirstYear,
    sacasPerHa,
    plantsPerHa,
    coffeeType: coffeeData.coffeeType,
    soilP: coffeeData.soil?.p ?? 0,
    soilK: coffeeData.soil?.k ?? 0,
  });


  // ─── Products for the NutrientComparisonTable ──────────────
  // Show ONLY the current mix (fertiProducts + sprayProducts).
  // Previous versions also merged wizardExtras from earlier wizard steps,
  // which caused double-counting and inflated "Fornecido" values.
  const productsForComparison = useMemo(() => {
    return [...fertiProducts, ...sprayProducts].map(p => {
      const insumo = insumoOptions.find(i => i.id === p.insumoId);
      return {
        name: p.name,
        type: p.type,
        dosePerHa: p.dosePerHa,
        unit: p.unit,
        principios_ativos: insumo?.principios_ativos || null,
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
  }, [fertiProducts, sprayProducts, insumoOptions]);

  // Build manual candidates from user-selected insumos in context
  const mapInsumoToCandidate = (i: any) => ({
    id: i.id || i.nome,
    nome: i.nome || i.name,
    tipo_produto: i.tipoProduto || i.tipo_produto,
    preco: i.preco || 0,
    tamanho_unidade: i.tamanhoUnidade || i.tamanho_unidade || 1,
    medida: i.medida || 'kg',
    recomendacao_dose_ha: i.recomendacaoDoseHa || i.recomendacao_dose_ha || 0,
    recomendacao_dose_unidade: i.recomendacaoDoseUnidade || i.recomendacao_dose_unidade || 'kg/ha',
    macro_n: i.macronutrientes?.n ?? i.macro_n ?? 0,
    macro_p2o5: i.macronutrientes?.p2o5 ?? i.macro_p2o5 ?? 0,
    macro_k2o: i.macronutrientes?.k2o ?? i.macro_k2o ?? 0,
    macro_s: i.macronutrientes?.s ?? i.macro_s ?? 0,
    micro_b: i.micronutrientes?.b ?? i.micro_b ?? 0,
    micro_zn: i.micronutrientes?.zn ?? i.micro_zn ?? 0,
    micro_cu: i.micronutrientes?.cu ?? i.micro_cu ?? 0,
    micro_mn: i.micronutrientes?.mn ?? i.micro_mn ?? 0,
    micro_fe: i.micronutrientes?.fe ?? i.micro_fe ?? 0,
    micro_mo: i.micronutrientes?.mo ?? i.micro_mo ?? 0,
  });

  const fertiManualCandidates = coffeeData.insumos
    .filter(i => {
      const n = i.macronutrientes?.n ?? 0;
      const p = i.macronutrientes?.p2o5 ?? 0;
      const k = i.macronutrientes?.k2o ?? 0;
      const s = i.macronutrientes?.s ?? 0;
      return (n > 0 || p > 0 || k > 0 || s > 0) &&
        !['Inseticida', 'Fungicida', 'Herbicida', 'Adjuvantes'].includes(i.tipoProduto);
    })
    .map(mapInsumoToCandidate);

  const sprayManualCandidates = coffeeData.insumos
    .filter(i => {
      const hasNutrients = (i.macronutrientes?.n ?? 0) > 0 || (i.macronutrientes?.p2o5 ?? 0) > 0 ||
        (i.macronutrientes?.k2o ?? 0) > 0 || (i.macronutrientes?.s ?? 0) > 0 ||
        (i.micronutrientes?.b ?? 0) > 0 || (i.micronutrientes?.zn ?? 0) > 0 ||
        (i.micronutrientes?.cu ?? 0) > 0 || (i.micronutrientes?.mn ?? 0) > 0 ||
        (i.micronutrientes?.fe ?? 0) > 0 || (i.micronutrientes?.mo ?? 0) > 0;
      return hasNutrients && ['Foliar', 'Adjuvantes', 'Cobertura'].includes(i.tipoProduto);
    })
    .map(mapInsumoToCandidate);

  // ── Phenological month for dynamic targets ──
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const currentStage = getStageForMonth(selectedMonth);

  const handleAutoRecommend = (useManual = false) => {
    const candidates = useManual ? fertiManualCandidates : insumoOptions;
    if (candidates.length === 0) {
      toast.warning(useManual
        ? 'Nenhum insumo selecionado com composição nutricional nas etapas anteriores.'
        : 'Nenhum produto encontrado no banco de insumos.');
      return;
    }
    setAutoRecLoading(true);
    setTimeout(() => {
      const sf = calcStandFactor(plantsPerHa, coffeeData.coffeeType);
      const results = generateAutoRecommendation(
        sacasPerHa,
        coffeeData.leafAnalysis,
        candidates as any,
        'fertigation',
        selectedMonth,
        firstYearOverride,
        coffeeData.soil?.p,
        sf,
      );
      setAutoRecLoading(false);

      if (results.length === 0) {
        toast.info(useManual
          ? 'Os insumos selecionados não cobrem a demanda nutricional.'
          : 'Nenhum produto compatível encontrado. Cadastre insumos com composição nutricional.');
        return;
      }

      // Directly add all products, classified and sorted by compatibility group
      const newProducts: CoffeeFertigationProduct[] = results.map(rec => ({
        id: crypto.randomUUID(),
        insumoId: rec.product.id,
        name: rec.product.nome,
        type: rec.product.tipo_produto,
        dosePerHa: rec.dose,
        unit: rec.unit as any,
      }));

      const groupOrder: CompatGroup[] = ['A', 'B', 'C', 'D', 'E'];
      const classified = newProducts.map(p => {
        const insumo = insumoOptions.find(i => i.id === p.insumoId);
        const group = insumo ? classifyInsumo(insumo) : 'C' as CompatGroup;
        return { ...p, _group: group };
      });
      classified.sort((a, b) => groupOrder.indexOf(a._group) - groupOrder.indexOf(b._group));

      const cleanProducts = classified.map(({ _group, ...rest }) => rest);
      setFertiProducts(prev => [...prev, ...cleanProducts]);

      const groupSummary = groupOrder
        .map(g => {
          const count = classified.filter(p => p._group === g).length;
          return count > 0 ? `${g}: ${count}` : null;
        })
        .filter(Boolean)
        .join(' · ');

      toast.success(`${results.length} produtos adicionados ao mix (${groupSummary})`, { duration: 5000 });
    }, 300);
  };

  const handleSprayAutoRecommend = (useManual = false) => {
    const candidates = useManual ? sprayManualCandidates : insumoOptions;
    if (candidates.length === 0) {
      toast.warning(useManual
        ? 'Nenhum insumo foliar selecionado com composição nutricional nas etapas anteriores.'
        : 'Nenhum produto foliar encontrado no banco de insumos.');
      return;
    }
    setSprayAutoRecLoading(true);
    setTimeout(() => {
      const sf = calcStandFactor(plantsPerHa, coffeeData.coffeeType);
      const results = generateAutoRecommendation(
        sacasPerHa,
        coffeeData.leafAnalysis,
        candidates as any,
        'spraying',
        selectedMonth,
        firstYearOverride,
        coffeeData.soil?.p,
        sf,
      );
      setSprayAutoRecLoading(false);

      if (results.length === 0) {
        toast.info(useManual
          ? 'Os insumos selecionados não cobrem a demanda foliar.'
          : 'Nenhum produto foliar compatível encontrado.');
        return;
      }

      // Directly add all products, classified and sorted by compatibility group
      const newProducts: CoffeeSprayingProduct[] = results.map(rec => ({
        id: crypto.randomUUID(),
        insumoId: rec.product.id,
        name: rec.product.nome,
        type: rec.product.tipo_produto,
        dosePerHa: rec.dose,
        unit: rec.unit as any,
      }));

      const groupOrder: CompatGroup[] = ['A', 'B', 'C', 'D', 'E'];
      const classified = newProducts.map(p => {
        const insumo = insumoOptions.find(i => i.id === p.insumoId);
        const group = insumo ? classifyInsumo(insumo) : 'C' as CompatGroup;
        return { ...p, _group: group };
      });
      classified.sort((a, b) => groupOrder.indexOf(a._group) - groupOrder.indexOf(b._group));

      const cleanProducts = classified.map(({ _group, ...rest }) => rest);
      setSprayProducts(prev => [...prev, ...cleanProducts]);

      const groupSummary = groupOrder
        .map(g => {
          const count = classified.filter(p => p._group === g).length;
          return count > 0 ? `${g}: ${count}` : null;
        })
        .filter(Boolean)
        .join(' · ');

      toast.success(`${results.length} produtos foliares adicionados ao mix (${groupSummary})`, { duration: 5000 });
    }, 300);
  };


  const handleEquipChange = (type: SprayEquipmentType) => {
    setSprayEquip(type);
    const preset = SPRAY_PRESETS.find(p => p.type === type)!;
    setSprayTank(preset.defaultTank);
    setSprayRate(preset.defaultRate);
  };

  // ── Persist fertigation ──
  useEffect(() => {
    setFertigationData({
      tankSize: fertiTank,
      volumePerHa: fertiRate,
      products: fertiProducts,
    });
  }, [fertiTank, fertiRate, fertiProducts, setFertigationData]);

  // ── Persist spraying ──
  useEffect(() => {
    setCoffeeSprayingData({
      equipmentType: sprayEquip,
      tankCapacity: sprayTank,
      applicationRate: sprayRate,
      products: sprayProducts,
    });
  }, [sprayEquip, sprayTank, sprayRate, sprayProducts, setCoffeeSprayingData]);

  // ── Duplicate detection helpers ──
  const normalizePAName = (name: string) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const findDuplicateByActiveIngredient = (
    insumo: InsumoOption,
    existingProducts: Array<{ insumoId: string; name: string }>,
  ): string | null => {
    // 1. Exact same insumoId
    if (existingProducts.some(p => p.insumoId === insumo.id)) {
      return insumo.nome;
    }

    // 2. Same active ingredient + concentration
    if (insumo.principios_ativos && insumo.principios_ativos.length > 0) {
      for (const existing of existingProducts) {
        const existingInsumo = insumoOptions.find(i => i.id === existing.insumoId);
        if (!existingInsumo?.principios_ativos?.length) continue;

        for (const pa of insumo.principios_ativos) {
          const match = existingInsumo.principios_ativos.find(epa =>
            normalizePAName(epa.nome) === normalizePAName(pa.nome) &&
            epa.concentracao === pa.concentracao
          );
          if (match) {
            return `${existing.name} (mesmo P.A.: ${pa.nome} ${pa.concentracao}${pa.unidade})`;
          }
        }
      }
    }

    // 3. Same nutrient profile for fertilizers (same dominant nutrient, same name base)
    const normalizeBase = (n: string) => n.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
    const insumoBase = normalizeBase(insumo.nome);
    const duplicate = existingProducts.find(p => normalizeBase(p.name) === insumoBase);
    if (duplicate) {
      return duplicate.name;
    }

    return null;
  };

  // ── Add product handlers ──
  const handleAddFertiProduct = (insumo: InsumoOption, dose: number, unit: DoseUnit) => {
    const duplicate = findDuplicateByActiveIngredient(insumo, fertiProducts);
    if (duplicate) {
      toast.error(`Produto duplicado: "${duplicate}" já está no mix de fertirrigação com o mesmo princípio ativo.`, { duration: 5000 });
      return;
    }
    const product: CoffeeFertigationProduct = {
      id: crypto.randomUUID(),
      insumoId: insumo.id,
      name: insumo.nome,
      type: insumo.tipo_produto,
      dosePerHa: dose,
      unit,
    };
    setFertiProducts(prev => [...prev, product]);
    toast.success('Produto adicionado à fertirrigação');
  };

  const handleAddSprayProduct = (insumo: InsumoOption, dose: number, unit: DoseUnit) => {
    const duplicate = findDuplicateByActiveIngredient(insumo, sprayProducts);
    if (duplicate) {
      toast.error(`Produto duplicado: "${duplicate}" já está no mix de pulverização com o mesmo princípio ativo.`, { duration: 5000 });
      return;
    }
    const product: CoffeeSprayingProduct = {
      id: crypto.randomUUID(),
      insumoId: insumo.id,
      name: insumo.nome,
      type: insumo.tipo_produto,
      dosePerHa: dose,
      unit,
    };
    setSprayProducts(prev => [...prev, product]);
    toast.success('Produto adicionado à pulverização');
  };

  // ── Summary values ──
  const fertiTanksNeeded = fertiRate > 0 ? Math.ceil((fertiRate * hectares) / fertiTank) : 0;
  const sprayVolTotal = sprayRate * hectares;
  const sprayTanksNeeded = sprayTank > 0 ? Math.ceil(sprayVolTotal / sprayTank) : 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Fertirrigação & Pulverização
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure a calda para fertirrigação e pulverização com cálculo automático por tanque
        </p>
      </div>


      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {isIrrigated ? (
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fertigation" className="gap-2">
              <Waves className="h-4 w-4" />
              Fertirrigação
            </TabsTrigger>
            <TabsTrigger value="spraying" className="gap-2">
              <Droplets className="h-4 w-4" />
              Pulverização
            </TabsTrigger>
          </TabsList>
        ) : (
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Talhão não irrigado</span> — apenas pulverização disponível. Para habilitar fertirrigação, marque o talhão como irrigado nas configurações.
            </p>
          </div>
        )}

        {/* ─── Fertigation Tab ─── */}
        <TabsContent value="fertigation" className="space-y-6 mt-6">
          {/* Tank Size */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tamanho da Caixa (Litros)</Label>
            <div className="grid grid-cols-3 gap-3">
              {FERTIGATION_TANKS.map(tank => (
                <button
                  key={tank.value}
                  type="button"
                  onClick={() => setFertiTank(tank.value)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-center transition-all hover:border-foreground/30",
                    fertiTank === tank.value
                      ? "border-foreground bg-secondary"
                      : "border-border bg-background"
                  )}
                >
                  <Waves className={cn("w-6 h-6 mx-auto mb-2", fertiTank === tank.value ? "text-foreground" : "text-muted-foreground")} />
                  <p className="font-semibold">{tank.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Volume per hectare */}
          <div className="space-y-2">
            <Label htmlFor="fertiRate" className="text-sm">Volume de Calda por Hectare</Label>
            <div className="relative">
              <Input
                id="fertiRate"
                type="number"
                value={fertiRate}
                onChange={e => setFertiRate(parseFloat(e.target.value) || 0)}
                className="pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">L/ha</span>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-secondary rounded-xl text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Volume Total</p>
              <p className="text-lg font-semibold">{(fertiRate * hectares).toLocaleString()} L</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nº de Caixas</p>
              <p className="text-lg font-semibold">{fertiTanksNeeded}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Área</p>
              <p className="text-lg font-semibold">{hectares} ha</p>
            </div>
          </div>

          {/* Phenological Month Selector + Auto-Recommend */}
          {!phytoOnly && (
          <div className="space-y-4">
            {/* Month selector */}
            <div className="p-3 bg-secondary rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fase Fenológica</Label>
                <Badge variant="outline" className={cn('text-xs', currentStage.color)}>
                  {currentStage.name}
                </Badge>
              </div>
              <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, idx) => {
                    const m = idx + 1;
                    const st = getStageForMonth(m);
                    return (
                      <SelectItem key={m} value={String(m)}>
                        {name} — {st.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{currentStage.description}</p>
            </div>

            {/* Manual / Auto toggle */}
            <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
              <span className="text-sm font-medium text-foreground">Recomendação de Mix</span>
              <div className="flex items-center gap-2">
                <Hand className="w-3.5 h-3.5 text-muted-foreground" />
                <span className={cn('text-xs font-medium', !fertiAutoMode ? 'text-foreground' : 'text-muted-foreground')}>Manual</span>
                <Switch
                  checked={fertiAutoMode}
                  onCheckedChange={(checked) => {
                    setFertiAutoMode(checked);
                    setAutoRecResults(null);
                  }}
                />
                <span className={cn('text-xs font-medium', fertiAutoMode ? 'text-foreground' : 'text-muted-foreground')}>Auto</span>
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>

            {!fertiAutoMode && (
              <>
                <p className="text-xs text-muted-foreground">
                  Gera a recomendação usando apenas os <strong className="text-foreground">{fertiManualCandidates.length} insumos</strong> selecionados nas etapas anteriores.
                </p>
                {fertiManualCandidates.length === 0 && (
                  <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Nenhum insumo com composição nutricional foi selecionado. Volte às etapas anteriores e escolha os produtos.
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleAutoRecommend(true)}
                  disabled={autoRecLoading || fertiManualCandidates.length === 0}
                  className="w-full gap-2 border-primary/30 hover:bg-primary/10 text-primary"
                >
                  {autoRecLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PackageCheck className="h-4 w-4" />
                  )}
                  Gerar com Insumos Selecionados ({fertiManualCandidates.length})
                </Button>
              </>
            )}

            {fertiAutoMode && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleAutoRecommend(false)}
                  disabled={autoRecLoading || insumoOptions.length === 0}
                  className="w-full gap-2 border-primary/30 hover:bg-primary/10 text-primary"
                >
                  {autoRecLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Auto-Recomendar Mix Nutricional
                </Button>
              </>
            )}

            {sacasPerHa > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Meta: {sacasPerHa} sc/ha • {currentStage.name} • {coffeeData.leafAnalysis ? '📊 Análise foliar detectada' : '⚠️ Sem análise foliar'}
              </p>
            )}
          </div>
          )}

          {/* AI Pre-loaded Products Summary Banner (Fertigation) */}
          {phytoOnly && Object.keys(aiFertiMeta).length > 0 && (
            <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20 space-y-3" style={{ animation: 'fade-in 0.3s ease-out' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-semibold text-foreground">Produtos do Diagnóstico por Imagem</span>
                <Badge variant="outline" className="text-[10px] ml-auto bg-violet-500/10 text-violet-400 border-violet-500/20">
                  {Object.keys(aiFertiMeta).length} produto(s)
                </Badge>
              </div>
              <div className="space-y-1.5">
                {fertiProducts.filter(p => aiFertiMeta[p.id]).map(product => {
                  const meta = aiFertiMeta[product.id];
                  const { valuePerHa, outputUnit } = normalizeDoseToPerHa(product.dosePerHa, product.unit);
                  const total = calcTotal(valuePerHa, hectares);
                  const perTank = calcPerTank(valuePerHa, fertiTank, fertiRate);
                  return (
                    <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                        <FlaskConical className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <Badge variant="outline" className="text-[9px] bg-amber-500/5 text-amber-600 border-amber-500/20">
                            🎯 {meta.alvo}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] bg-blue-500/5 text-blue-600 border-blue-500/20">
                            🧪 {meta.principioAtivo}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{product.dosePerHa} {product.unit}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatQty(perTank, outputUnit)}/caixa · {formatQty(total, outputUnit)} total
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                ✅ Produtos adicionados automaticamente com base no diagnóstico da IA
              </p>
            </div>
          )}

          {/* Product Selector */}
          <ProductSelector
            insumoOptions={insumoOptions}
            onAdd={handleAddFertiProduct}
            onOpenNewInsumo={() => { setDialogType(phytoOnly ? 'Fungicida' : 'Foliar'); setIsDialogOpen(true); }}
            currentProducts={fertiProducts}
            phytoOnly={phytoOnly}
            treatmentPlanEntries={phytoOnly ? (coffeeData.treatmentPlan?.entries ?? fertiMetaAsEntries) : undefined}
          />

          {/* Products List */}
          <ProductList
            products={fertiProducts}
            onRemove={id => setFertiProducts(prev => prev.filter(p => p.id !== id))}
            tankCapacity={fertiTank}
            applicationRate={fertiRate}
            hectares={hectares}
            label="Mix de Fertirrigação"
            aiMeta={phytoOnly ? aiFertiMeta : undefined}
            onSwapProduct={phytoOnly ? handleSwapProduct : undefined}
          />

          {/* Compatibility Alerts */}
          <CompatibilityAlerts products={fertiProducts} insumoOptions={insumoOptions} />
        </TabsContent>

        {/* ─── Spraying Tab ─── */}
        <TabsContent value="spraying" className="space-y-6 mt-6">
          {/* Equipment Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SPRAY_PRESETS.map(preset => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => handleEquipChange(preset.type)}
                  className={cn(
                    "p-5 rounded-xl border-2 text-left transition-all hover:border-foreground/30",
                    sprayEquip === preset.type
                      ? "border-foreground bg-secondary"
                      : "border-border bg-background"
                  )}
                >
                  <Icon className={cn("w-7 h-7 mb-2", sprayEquip === preset.type ? "text-foreground" : "text-muted-foreground")} />
                  <p className="font-medium text-sm">{preset.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{preset.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Bomba Costal capacity selector */}
          {sprayEquip === 'bomba_costal' && (
            <div className="p-4 bg-secondary rounded-xl space-y-3">
              <Label className="text-sm">Capacidade da Bomba</Label>
              <RadioGroup
                value={sprayTank.toString()}
                onValueChange={v => setSprayTank(parseInt(v))}
                className="flex gap-4"
              >
                {BACKPACK_OPTIONS.map(o => (
                  <div key={o.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={o.value.toString()} id={`bp-${o.value}`} />
                    <Label htmlFor={`bp-${o.value}`} className="cursor-pointer text-sm">{o.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Tank & Rate inputs */}
          <div className="grid gap-4 sm:grid-cols-2">
            {sprayEquip !== 'bomba_costal' && (
              <div className="space-y-2">
                <Label className="text-sm">
                  {sprayEquip === 'drone' ? 'Capacidade do Drone' : 'Capacidade do Tanque'}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={sprayTank}
                    min={1}
                    onChange={e => setSprayTank(parseFloat(e.target.value) || 0)}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">L</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm">Taxa de Aplicação</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={sprayRate}
                  onChange={e => setSprayRate(parseFloat(e.target.value) || 0)}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">L/ha</span>
              </div>
            </div>
          </div>

          {/* Spray Summary */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-secondary rounded-xl text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Volume Total</p>
              <p className="text-lg font-semibold">{sprayVolTotal.toLocaleString()} L</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {sprayEquip === 'bomba_costal' ? 'Nº Bombas' : sprayEquip === 'drone' ? 'Nº Voos' : 'Nº Tanques'}
              </p>
              <p className="text-lg font-semibold">{sprayTanksNeeded}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Área/Tanque</p>
              <p className="text-lg font-semibold">
                {sprayRate > 0 ? (sprayTank / sprayRate).toFixed(2) : '0'} ha
              </p>
            </div>
          </div>

          {/* Auto-Recommend Button (Spraying) */}
          {!phytoOnly && (
          <div className="space-y-4">
            {/* Manual / Auto toggle */}
            <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
              <span className="text-sm font-medium text-foreground">Recomendação Foliar</span>
              <div className="flex items-center gap-2">
                <Hand className="w-3.5 h-3.5 text-muted-foreground" />
                <span className={cn('text-xs font-medium', !sprayAutoMode ? 'text-foreground' : 'text-muted-foreground')}>Manual</span>
                <Switch
                  checked={sprayAutoMode}
                  onCheckedChange={(checked) => {
                    setSprayAutoMode(checked);
                    setSprayAutoRecResults(null);
                  }}
                />
                <span className={cn('text-xs font-medium', sprayAutoMode ? 'text-foreground' : 'text-muted-foreground')}>Auto</span>
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>

            {!sprayAutoMode && (
              <>
                <p className="text-xs text-muted-foreground">
                  Gera a recomendação usando apenas os <strong className="text-foreground">{sprayManualCandidates.length} insumos foliares</strong> selecionados nas etapas anteriores.
                </p>
                {sprayManualCandidates.length === 0 && (
                  <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Nenhum insumo foliar com composição nutricional foi selecionado. Volte às etapas anteriores e escolha os produtos.
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleSprayAutoRecommend(true)}
                  disabled={sprayAutoRecLoading || sprayManualCandidates.length === 0}
                  className="w-full gap-2 border-primary/30 hover:bg-primary/10 text-primary"
                >
                  {sprayAutoRecLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PackageCheck className="h-4 w-4" />
                  )}
                  Gerar com Insumos Selecionados ({sprayManualCandidates.length})
                </Button>
              </>
            )}

            {sprayAutoMode && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSprayAutoRecommend(false)}
                  disabled={sprayAutoRecLoading || insumoOptions.length === 0}
                  className="w-full gap-2 border-primary/30 hover:bg-primary/10 text-primary"
                >
                  {sprayAutoRecLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Auto-Recomendar Foliares & Micros
                </Button>
              </>
            )}
            {sacasPerHa > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Foco em micronutrientes • {coffeeData.leafAnalysis ? '📊 Análise foliar detectada' : '⚠️ Sem análise foliar'}
              </p>
            )}

          </div>
          )}

          {/* AI Pre-loaded Products Summary Banner */}
          {phytoOnly && Object.keys(aiProductMeta).length > 0 && (
            <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20 space-y-3" style={{ animation: 'fade-in 0.3s ease-out' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-semibold text-foreground">Produtos do Diagnóstico por Imagem</span>
                <Badge variant="outline" className="text-[10px] ml-auto bg-violet-500/10 text-violet-400 border-violet-500/20">
                  {Object.keys(aiProductMeta).length} produto(s) adicionado(s)
                </Badge>
              </div>
              <div className="space-y-1.5">
                {sprayProducts.filter(p => aiProductMeta[p.id]).map(product => {
                  const meta = aiProductMeta[product.id];
                  const { valuePerHa, outputUnit } = normalizeDoseToPerHa(product.dosePerHa, product.unit);
                  const total = calcTotal(valuePerHa, hectares);
                  const perTank = calcPerTank(valuePerHa, sprayTank, sprayRate);
                  return (
                    <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                        <FlaskConical className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <Badge variant="outline" className="text-[9px] bg-amber-500/5 text-amber-600 border-amber-500/20">
                            🎯 {meta.alvo}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] bg-blue-500/5 text-blue-600 border-blue-500/20">
                            🧪 {meta.principioAtivo}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{product.dosePerHa} {product.unit}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatQty(perTank, outputUnit)}/tanque · {formatQty(total, outputUnit)} total
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                ✅ Produtos adicionados automaticamente ao mix com base no diagnóstico da IA
              </p>
            </div>
          )}

          {/* Product Selector */}
          <ProductSelector
            insumoOptions={insumoOptions}
            onAdd={handleAddSprayProduct}
            onOpenNewInsumo={() => { setDialogType('Herbicida'); setIsDialogOpen(true); }}
            currentProducts={sprayProducts}
            phytoOnly={phytoOnly}
            treatmentPlanEntries={phytoOnly ? (coffeeData.treatmentPlan?.entries ?? sprayMetaAsEntries) : undefined}
          />

          {/* Products List */}
          <ProductList
            products={sprayProducts}
            onRemove={id => setSprayProducts(prev => prev.filter(p => p.id !== id))}
            tankCapacity={sprayTank}
            applicationRate={sprayRate}
            hectares={hectares}
            label="Mix de Calda"
            aiMeta={phytoOnly ? aiProductMeta : undefined}
            onSwapProduct={phytoOnly ? handleSwapProduct : undefined}
          />

          {/* Compatibility Alerts */}
          <CompatibilityAlerts products={sprayProducts} insumoOptions={insumoOptions} />
        </TabsContent>
      </Tabs>

      {/* ─── Nutrient Comparison Table ─── */}
      {!phytoOnly && (fertiProducts.length > 0 || sprayProducts.length > 0) && (
        <NutrientComparisonTable
          leafAnalysis={coffeeData.leafAnalysis}
          month={selectedMonth}
          availableInsumos={insumoOptions}
          demandOverrides={demandOverrides}
          onApplySuggestion={(insumoId, doseKgHa) => {
            const insumo = insumoOptions.find(i => i.id === insumoId);
            if (!insumo) return;

            // ── Safety cap: compute max additional dose so no nutrient exceeds toxLimit/refMax ──
            const allProducts = [...fertiProducts, ...sprayProducts];
            const currentTotals: Record<string, number> = {};
            DEFICIT_NUTRIENTS.forEach(n => { currentTotals[n.key] = 0; });
            allProducts.forEach(p => {
              const pInsumo = insumoOptions.find(i => i.id === p.insumoId) || p;
              const kgPerHa = normalizeDoseToPerHa(p.dosePerHa, p.unit as DoseUnit).valuePerHa;
              DEFICIT_NUTRIENTS.forEach(n => {
                const conc = Number((pInsumo as any)[n.dbField]) || 0;
                if (conc > 0) currentTotals[n.key] += kgPerHa * (conc / 100) * 1000;
              });
            });

            let safeDose = doseKgHa;
            DEFICIT_NUTRIENTS.forEach(n => {
              const conc = Number((insumo as any)[n.dbField]) || 0;
              if (conc <= 0) return;
              const ceiling = n.toxLimit > 0 ? n.toxLimit : n.refMax;
              if (ceiling <= 0) return;
              const headroom = Math.max(0, ceiling - (currentTotals[n.key] || 0));
              const maxDoseForNutrient = headroom / (conc / 100 * 1000);
              safeDose = Math.min(safeDose, maxDoseForNutrient);
            });
            safeDose = Math.max(0, Math.round(safeDose * 100) / 100);

            if (safeDose <= 0) {
              toast.warning(`Teto de segurança atingido — não é possível aumentar a dose de "${insumo.nome}" sem exceder limites de toxicidade.`);
              return;
            }

            if (safeDose < doseKgHa) {
              toast.info(`Dose limitada a ${safeDose.toFixed(1)} kg/ha para respeitar teto de segurança multi-nutriente.`);
            }

            // If product already in mix, update its dose instead of adding duplicate
            const existingIdx = fertiProducts.findIndex(p => p.insumoId === insumoId);
            if (existingIdx >= 0) {
              const currentDose = fertiProducts[existingIdx].dosePerHa;
              const newDose = currentDose + safeDose;
              setFertiProducts(prev => prev.map((p, i) => i === existingIdx ? { ...p, dosePerHa: newDose, unit: 'Kg/ha' as DoseUnit } : p));
              toast.success(`Dose de "${insumo.nome}" atualizada para ${newDose.toFixed(1)} kg/ha`);
            } else {
              // Check if this product already contributes via wizardExtras (previous steps).
              // If so, the suggested dose is just the GAP beyond the wizardExtra contribution.
              // We need to carry over the wizardExtra dose so it's not lost when deduplication removes it.
              const normName = insumo.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              const wizardMatch = coffeeData.insumos.find(wi => {
                const wiNorm = wi.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                return wiNorm === normName;
              });
              let baseDose = 0;
              if (wizardMatch) {
                const dbInsumo = insumoOptions.find(io => io.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() === normName);
                const wizardDose = (wizardMatch as any).recomendacaoDoseHa || 0;
                const wizardUnit = ((wizardMatch as any).recomendacaoDoseUnidade || 'Kg/ha') as DoseUnit;
                const dbDose = dbInsumo?.recomendacao_dose_ha || 0;
                const dbUnit = ((dbInsumo?.recomendacao_dose_unidade || 'Kg/ha') as DoseUnit);
                // Regra crítica: manter a base calculada no wizard; DB é só fallback.
                baseDose = wizardDose > 0 ? wizardDose : dbDose;
                const baseUnit = wizardDose > 0 ? wizardUnit : dbUnit;
                baseDose = normalizeDoseToPerHa(baseDose, baseUnit as DoseUnit).valuePerHa;
              }
              const totalDose = Math.round((baseDose + safeDose) * 100) / 100;
              handleAddFertiProduct(insumo, totalDose, 'Kg/ha');
              if (baseDose > 0) {
                toast.success(`Dose de "${insumo.nome}" = ${baseDose.toFixed(1)} (base) + ${safeDose.toFixed(1)} (ajuste) = ${totalDose.toFixed(1)} kg/ha`);
              }
            }
          }}
          products={productsForComparison}
        />
      )}

      {/* Insumo Dialog */}
      <InsumoFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => { loadInsumos(); toast.success('Insumo cadastrado!'); }}
        tipoProduto={dialogType}
        existingInsumos={insumoOptions.map(i => ({ id: i.id, nome: i.nome }))}
      />
    </div>
  );
}
