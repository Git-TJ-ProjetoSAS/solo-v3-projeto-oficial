import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useCoffee } from '@/contexts/CoffeeContext';
import type { CoffeeTreatmentPlanData } from '@/contexts/CoffeeContext';
import {
  PRODUTOS_COMERCIAIS,
  getProductsForPest,
  type DefensivoEntry,
  type ProdutoComercial,
} from '@/data/coffeePestDatabase';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Tractor,
  PlaneTakeoff,
  Backpack,
  Droplets,
  DollarSign,
  Package,
  Wheat,
  Calculator,
  Info,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Tag,
  Pencil,
  ShoppingCart,
  Beaker,
  Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ─── Equipment Presets ───────────────────────────────────────
type EquipmentType = 'trator' | 'drone' | 'bomba_costal';

interface EquipmentPreset {
  type: EquipmentType;
  label: string;
  icon: typeof Tractor;
  tankCapacity: number;
  applicationRate: number;
  desc: string;
}

const EQUIPMENT_PRESETS: EquipmentPreset[] = [
  { type: 'trator', label: 'Trator', icon: Tractor, tankCapacity: 400, applicationRate: 200, desc: 'Tanque 400L · 200 L/ha' },
  { type: 'drone', label: 'Drone', icon: PlaneTakeoff, tankCapacity: 20, applicationRate: 10, desc: 'Tanque 20L · 10 L/ha' },
  { type: 'bomba_costal', label: 'Costal', icon: Backpack, tankCapacity: 20, applicationRate: 200, desc: 'Tanque 20L · 200 L/ha' },
];

// ─── Calculation Helpers ─────────────────────────────────────
function calcDosePerTank(
  dosePerHa: number,
  unidade: 'L/ha' | 'Kg/ha' | 'g/ha',
  tankCapacity: number,
  appRate: number
): { value: number; unit: string } {
  const areaPerTank = tankCapacity / appRate;
  const raw = dosePerHa * areaPerTank;

  switch (unidade) {
    case 'L/ha':
      return raw < 0.05 ? { value: raw * 1000, unit: 'mL' } : { value: raw, unit: 'L' };
    case 'Kg/ha':
      return raw < 0.05 ? { value: raw * 1000, unit: 'g' } : { value: raw, unit: 'Kg' };
    case 'g/ha':
      return { value: raw, unit: 'g' };
    default:
      return { value: raw, unit: 'L' };
  }
}

function calcCostPerHa(dosePerHa: number, tamanhoEmbalagem: number, preco: number, unidade?: string): number {
  // Convert g/ha to Kg before dividing by tamanhoEmbalagem (which is in Kg)
  const doseInBaseUnit = unidade === 'g/ha' ? dosePerHa / 1000 : dosePerHa;
  const unitsNeeded = doseInBaseUnit / tamanhoEmbalagem;
  return unitsNeeded * preco;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatQty(value: number, unit: string): string {
  if (value >= 100) return `${Math.round(value)} ${unit}`;
  if (value >= 1) return `${value.toFixed(1)} ${unit}`;
  if (value >= 0.01) return `${value.toFixed(2)} ${unit}`;
  return `${(value * 1000).toFixed(1)} ${unit === 'L' ? 'mL' : unit === 'Kg' ? 'g' : unit}`;
}

// ─── Recommended Product Interface ───────────────────────────
interface RecommendedProduct {
  defensivo: DefensivoEntry;
  produto: ProdutoComercial;
  alternatives: ProdutoComercial[];
}

// ─── Product Recommendation Card ─────────────────────────────
function RecommendationCard({
  rec,
  equipment,
  hectares,
  sacas,
  customPrice,
  onPriceChange,
  selectedAltId,
  onSelectAlt,
}: {
  rec: RecommendedProduct;
  equipment: EquipmentPreset;
  hectares: number;
  sacas: number;
  customPrice: number;
  onPriceChange: (price: number) => void;
  selectedAltId: string;
  onSelectAlt: (prodId: string) => void;
}) {
  const [showAlts, setShowAlts] = useState(false);

  // Use the currently selected product (could be an alternative)
  const activeProd = selectedAltId !== rec.produto.id
    ? rec.alternatives.find(a => a.id === selectedAltId) || rec.produto
    : rec.produto;

  const preco = customPrice;
  const dosePerTank = calcDosePerTank(
    activeProd.doseNumerico,
    activeProd.unidadeDose,
    equipment.tankCapacity,
    equipment.applicationRate
  );

  const costPerHa = calcCostPerHa(activeProd.doseNumerico, activeProd.tamanhoEmbalagem, preco, activeProd.unidadeDose);
  const costPerSaca = sacas > 0 ? costPerHa / sacas : 0;
  const totalCost = costPerHa * hectares;
  const totalDose = activeProd.doseNumerico * hectares;
  const totalDoseUnit = activeProd.unidadeDose === 'g/ha' ? 'g' : activeProd.unidadeDose === 'Kg/ha' ? 'Kg' : 'L';
  const embalagemUnit = activeProd.unidadeDose === 'Kg/ha' || activeProd.unidadeDose === 'g/ha' ? 'Kg' : 'L';
  const embalagensNeeded = Math.ceil(
    (activeProd.unidadeDose === 'g/ha'
      ? (totalDose / 1000) / activeProd.tamanhoEmbalagem
      : totalDose / activeProd.tamanhoEmbalagem)
  );

  const tanksNeeded = equipment.applicationRate > 0
    ? Math.ceil((equipment.applicationRate * hectares) / equipment.tankCapacity)
    : 0;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header: Alvo */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Alvo</p>
          <p className="text-sm font-semibold text-foreground truncate">{rec.defensivo.alvo.split('(')[0].trim()}</p>
        </div>
        <Badge variant="outline" className={cn(
          'text-[10px] px-1.5 py-0',
          rec.defensivo.categoria === 'doenca'
            ? 'bg-violet-500/10 text-violet-400 border-violet-500/15'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/15'
        )}>
          {rec.defensivo.categoria === 'doenca' ? 'Doença' : 'Praga'}
        </Badge>
      </div>

      {/* Produto Recomendado */}
      <div className="px-4 py-3 mx-4 mb-2 rounded-xl bg-primary/5 border border-primary/15">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{activeProd.nome}</p>
            <p className="text-[11px] text-muted-foreground">{activeProd.principio_ativo}</p>
          </div>
          {rec.alternatives.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAlts(!showAlts)}
              className="text-[10px] text-primary font-medium flex items-center gap-1 hover:underline shrink-0"
            >
              {showAlts ? 'Fechar' : `+${rec.alternatives.length} opções`}
              {showAlts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Alternatives */}
        {showAlts && rec.alternatives.length > 0 && (
          <div className="space-y-1.5 mb-3 mt-2" style={{ animation: 'fade-in 0.2s ease-out' }}>
            {/* Current as option */}
            <button
              type="button"
              onClick={() => { onSelectAlt(rec.produto.id); onPriceChange(rec.produto.precoEstimado); }}
              className={cn(
                'w-full p-2 rounded-lg border text-left text-xs transition-all flex items-center gap-2',
                selectedAltId === rec.produto.id
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-secondary/30 border-border hover:bg-secondary/50'
              )}
            >
              {selectedAltId === rec.produto.id && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
              <span className="font-medium">{rec.produto.nome}</span>
              <span className="text-muted-foreground ml-auto">{rec.produto.dose}</span>
            </button>
            {rec.alternatives.map(alt => (
              <button
                key={alt.id}
                type="button"
                onClick={() => { onSelectAlt(alt.id); onPriceChange(alt.precoEstimado); }}
                className={cn(
                  'w-full p-2 rounded-lg border text-left text-xs transition-all flex items-center gap-2',
                  selectedAltId === alt.id
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-secondary/30 border-border hover:bg-secondary/50'
                )}
              >
                {selectedAltId === alt.id && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                <span className="font-medium">{alt.nome}</span>
                <span className="text-muted-foreground ml-auto">{alt.dose}</span>
              </button>
            ))}
          </div>
        )}

        {/* Dose info */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Droplets className="w-3 h-3" />
          <span>Dose: <span className="font-medium text-foreground">{activeProd.dose}</span></span>
          <span className="mx-1">•</span>
          <span>{activeProd.metodo}</span>
        </div>
      </div>

      {/* Price Input */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/40 border border-border">
          <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Preço ({activeProd.tamanhoEmbalagem} {embalagemUnit})
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">R$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={preco || ''}
              onChange={e => onPriceChange(parseFloat(e.target.value) || 0)}
              className="w-20 h-8 text-sm text-right font-semibold bg-background border-border"
            />
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Calculations Grid */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-secondary/30 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Dose/ha</p>
            <p className="text-sm font-bold text-foreground">
              {formatQty(activeProd.doseNumerico, totalDoseUnit === 'g' ? 'g' : totalDoseUnit)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-center">
            <p className="text-[9px] text-primary uppercase tracking-wider mb-0.5">
              /{equipment.label}
            </p>
            <p className="text-sm font-bold text-foreground">
              {formatQty(dosePerTank.value, dosePerTank.unit)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-secondary/30 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
              Total {hectares}ha
            </p>
            <p className="text-sm font-bold text-foreground">
              {formatQty(totalDose, totalDoseUnit)}
            </p>
          </div>
        </div>
      </div>

      {/* Cost Row */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-center">
            <p className="text-[9px] text-emerald-600 uppercase tracking-wider mb-0.5">R$/ha</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(costPerHa)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-center">
            <p className="text-[9px] text-emerald-600 uppercase tracking-wider mb-0.5">R$/saca</p>
            <p className={cn('text-sm font-bold', sacas > 0 ? 'text-foreground' : 'text-muted-foreground')}>
              {sacas > 0 ? formatCurrency(costPerSaca) : '—'}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-secondary/30 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Embalagens</p>
            <p className="text-sm font-bold text-foreground">{embalagensNeeded} un.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
interface CoffeeTreatmentPlanProps {
  selectedDefensivos: DefensivoEntry[];
  coffeeType: 'conilon' | 'arabica';
}

export function CoffeeTreatmentPlan({ selectedDefensivos, coffeeType }: CoffeeTreatmentPlanProps) {
  const { coffeeData, setTreatmentPlanData } = useCoffee();
  const existingAiEntries = coffeeData.treatmentPlan?.entries?.filter(e => e.costPerHa === 0) || [];
  const [equipment, setEquipment] = useState<EquipmentType>('trator');
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [selectedAlts, setSelectedAlts] = useState<Record<string, string>>({});

  // Editable equipment overrides
  const [equipOverrides, setEquipOverrides] = useState<Record<EquipmentType, { tankCapacity: number; applicationRate: number }>>({
    trator: { tankCapacity: 400, applicationRate: 200 },
    drone: { tankCapacity: 20, applicationRate: 10 },
    bomba_costal: { tankCapacity: 20, applicationRate: 200 },
  });

  const hectares = coffeeData.productivity?.hectares || coffeeData.hectares || 1;
  const sacas = coffeeData.productivity?.sacasPerHectare || 0;
  const basePreset = EQUIPMENT_PRESETS.find(p => p.type === equipment)!;
  const activePreset = { ...basePreset, ...equipOverrides[equipment] };

  // Auto-recommend products for each selected defensivo
  const recommendations: RecommendedProduct[] = useMemo(() => {
    const usedProductIds = new Set<string>();

    return selectedDefensivos.map(def => {
      const allMatchingProducts = PRODUTOS_COMERCIAIS.filter(
        p => p.alvos.includes(def.id) && p.culturas.includes(coffeeType)
      );

      // Pick the best available (not already used) as primary
      let primary: ProdutoComercial | undefined;
      const alternatives: ProdutoComercial[] = [];

      for (const prod of allMatchingProducts) {
        if (!primary && !usedProductIds.has(prod.id)) {
          primary = prod;
          usedProductIds.add(prod.id);
        } else {
          alternatives.push(prod);
        }
      }

      // Fallback: if all products are used, take the first one anyway
      if (!primary && allMatchingProducts.length > 0) {
        primary = allMatchingProducts[0];
      }

      return primary ? { defensivo: def, produto: primary, alternatives } : null;
    }).filter(Boolean) as RecommendedProduct[];
  }, [selectedDefensivos, coffeeType]);

  const handlePriceChange = useCallback((defId: string, price: number) => {
    setCustomPrices(prev => ({ ...prev, [defId]: price }));
  }, []);

  const handleSelectAlt = useCallback((defId: string, prodId: string) => {
    setSelectedAlts(prev => ({ ...prev, [defId]: prodId }));
  }, []);

  // Get the active product for a recommendation
  const getActiveProd = (rec: RecommendedProduct): ProdutoComercial => {
    const altId = selectedAlts[rec.defensivo.id];
    if (altId && altId !== rec.produto.id) {
      return rec.alternatives.find(a => a.id === altId) || rec.produto;
    }
    return rec.produto;
  };

  const getPrice = (rec: RecommendedProduct): number => {
    return customPrices[rec.defensivo.id] ?? getActiveProd(rec).precoEstimado;
  };

  // Summary calculations
  const totalCostPerHa = useMemo(() => {
    return recommendations.reduce((sum, rec) => {
      const prod = getActiveProd(rec);
      const price = customPrices[rec.defensivo.id] ?? prod.precoEstimado;
      return sum + calcCostPerHa(prod.doseNumerico, prod.tamanhoEmbalagem, price, prod.unidadeDose);
    }, 0);
  }, [recommendations, customPrices, selectedAlts]);

  const totalCost = totalCostPerHa * hectares;
  const costPerSaca = sacas > 0 ? totalCostPerHa / sacas : 0;

  const tanksNeeded = activePreset.applicationRate > 0
    ? Math.ceil((activePreset.applicationRate * hectares) / activePreset.tankCapacity)
    : 0;

  // ─── Sync treatment plan data to context ───────────────────
  const prevPlanRef = useRef<string>('');

  useEffect(() => {
    if (selectedDefensivos.length === 0 || recommendations.length === 0) {
      if (prevPlanRef.current !== '') {
        prevPlanRef.current = '';
        // Preserve AI-originated entries when clearing manual selections
        if (existingAiEntries.length > 0) {
          setTreatmentPlanData({
            entries: existingAiEntries,
            equipmentType: equipment,
            equipmentLabel: activePreset.label,
            totalCostPerHa: 0,
          });
        } else {
          setTreatmentPlanData(null);
        }
      }
      return;
    }

    const manualEntries = recommendations.map(rec => {
      const altId = selectedAlts[rec.defensivo.id];
      const prod = (altId && altId !== rec.produto.id)
        ? rec.alternatives.find(a => a.id === altId) || rec.produto
        : rec.produto;
      const price = customPrices[rec.defensivo.id] ?? prod.precoEstimado;
      const costHa = calcCostPerHa(prod.doseNumerico, prod.tamanhoEmbalagem, price, prod.unidadeDose);
      return {
        alvo: rec.defensivo.alvo.split('(')[0].trim(),
        produto: prod.nome,
        principioAtivo: prod.principio_ativo,
        dosePerHa: prod.doseNumerico,
        unidade: prod.unidadeDose,
        costPerHa: costHa,
      };
    });

    // Merge manual entries with AI entries (avoid duplicates by product name)
    const manualNames = new Set(manualEntries.map(e => e.produto.toLowerCase()));
    const uniqueAiEntries = existingAiEntries.filter(e => !manualNames.has(e.produto.toLowerCase()));
    const allEntries = [...manualEntries, ...uniqueAiEntries];

    const planData: CoffeeTreatmentPlanData = {
      entries: allEntries,
      equipmentType: equipment,
      equipmentLabel: activePreset.label,
      totalCostPerHa,
    };

    const fingerprint = JSON.stringify(planData);
    if (fingerprint !== prevPlanRef.current) {
      prevPlanRef.current = fingerprint;
      setTreatmentPlanData(planData);
    }
  }, [recommendations, customPrices, selectedAlts, equipment, totalCostPerHa, selectedDefensivos.length, activePreset.label, setTreatmentPlanData]);

  if (selectedDefensivos.length === 0) return null;

  return (
    <div className="space-y-4" style={{ animation: 'fade-in 0.3s ease-out' }}>
      {/* Section Header */}
      <div className="flex items-center gap-3 py-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground font-medium flex items-center gap-2">
          <Calculator className="w-3.5 h-3.5" />
          Plano de Tratamento Automático
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Info Banner */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2.5">
        <Beaker className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          O sistema recomendou automaticamente o <span className="font-medium text-foreground">princípio ativo</span> e 
          o <span className="font-medium text-foreground">produto comercial</span> para cada alvo selecionado. 
          Ajuste apenas o <span className="font-medium text-primary">preço de mercado</span> para obter o custo real.
        </p>
      </div>

      {/* Equipment Selector */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground font-medium">Método de Pulverização</p>
        <div className="grid grid-cols-3 gap-2">
          {EQUIPMENT_PRESETS.map(preset => {
            const Icon = preset.icon;
            const isActive = equipment === preset.type;
            const overrides = equipOverrides[preset.type];
            return (
              <button
                key={preset.type}
                type="button"
                onClick={() => setEquipment(preset.type)}
                className={cn(
                  'p-3 rounded-xl border text-center transition-all',
                  isActive
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/60'
                )}
              >
                <Icon className={cn('w-5 h-5 mx-auto mb-1', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <p className={cn('text-xs font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')}>{preset.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{overrides.tankCapacity}L · {overrides.applicationRate} L/ha</p>
              </button>
            );
          })}
        </div>

        {/* Editable Equipment Config */}
        <div className="p-3 rounded-xl bg-secondary/30 border border-border space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Pencil className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] font-medium text-foreground">Configurar {activePreset.label}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                Tanque (L)
              </label>
              <Input
                type="number"
                min={1}
                value={equipOverrides[equipment].tankCapacity}
                onChange={e => setEquipOverrides(prev => ({
                  ...prev,
                  [equipment]: { ...prev[equipment], tankCapacity: parseFloat(e.target.value) || 1 }
                }))}
                className="h-8 text-sm font-semibold bg-background border-border"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                Taxa Aplicação (L/ha)
              </label>
              <Input
                type="number"
                min={1}
                value={equipOverrides[equipment].applicationRate}
                onChange={e => setEquipOverrides(prev => ({
                  ...prev,
                  [equipment]: { ...prev[equipment], applicationRate: parseFloat(e.target.value) || 1 }
                }))}
                className="h-8 text-sm font-semibold bg-background border-border"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Context Info */}
      <div className="p-3 rounded-xl bg-secondary/30 border border-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Área</p>
          <p className="text-sm font-bold text-foreground">{hectares} ha</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Produtividade</p>
          <p className={cn('text-sm font-bold', sacas > 0 ? 'text-foreground' : 'text-muted-foreground')}>
            {sacas > 0 ? `${sacas} sc/ha` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Vol. Calda</p>
          <p className="text-sm font-bold text-foreground">
            {(activePreset.applicationRate * hectares).toLocaleString('pt-BR')} L
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Tanques</p>
          <p className="text-sm font-bold text-foreground">{tanksNeeded}</p>
        </div>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-3">
        {recommendations.map(rec => (
          <RecommendationCard
            key={rec.defensivo.id}
            rec={rec}
            equipment={activePreset}
            hectares={hectares}
            sacas={sacas}
            customPrice={getPrice(rec)}
            onPriceChange={(price) => handlePriceChange(rec.defensivo.id, price)}
            selectedAltId={selectedAlts[rec.defensivo.id] || rec.produto.id}
            onSelectAlt={(prodId) => handleSelectAlt(rec.defensivo.id, prodId)}
          />
        ))}

        {/* No product found message */}
        {selectedDefensivos.length > recommendations.length && (
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-center">
            <p className="text-xs text-muted-foreground">
              {selectedDefensivos.length - recommendations.length} alvo(s) sem produto comercial cadastrado para {coffeeType === 'conilon' ? 'Conilon' : 'Arábica'}
            </p>
          </div>
        )}
      </div>

      {/* Grand Total Summary */}
      {recommendations.length > 0 && (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Custo Total — Defensivos</p>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto bg-secondary text-muted-foreground border-border">
              {recommendations.length} produtos
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-background text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                <Wheat className="w-3 h-3" />
                Custo / Hectare
              </p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalCostPerHa)}</p>
            </div>
            <div className="p-3 rounded-xl bg-background text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                <Package className="w-3 h-3" />
                Custo / Saca
              </p>
              <p className={cn('text-xl font-bold', sacas > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                {sacas > 0 ? formatCurrency(costPerSaca) : '—'}
              </p>
              {sacas <= 0 && (
                <p className="text-[9px] text-muted-foreground mt-0.5">Configure a produtividade</p>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-background">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Investimento total ({hectares} ha)
              </span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totalCost)}</span>
            </div>
          </div>

          {sacas > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Produção esperada</span>
                <span className="font-semibold text-foreground">
                  {(sacas * hectares).toLocaleString('pt-BR')} sacas
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Impacto no custo</span>
                <span className="font-semibold text-amber-600">
                  {((totalCostPerHa / (sacas * 450)) * 100).toFixed(1)}% do valor da produção*
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground pt-1 border-t border-amber-500/10">
                *Referência: R$ 450/saca café beneficiado
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
