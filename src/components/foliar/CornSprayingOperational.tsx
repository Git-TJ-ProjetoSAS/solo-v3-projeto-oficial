import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  Tractor, PlaneTakeoff, Backpack, Droplets, ArrowRight, ArrowLeft,
  CheckCircle2, FlaskConical, Share2, Printer, Download, Loader2,
  CircleDot, Sprout
} from 'lucide-react';
import { CornSprayingReport, type SprayingReportData } from './CornSprayingReport';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  CORN_PHENOLOGY_MANAGEMENT,
  TIPO_PRODUTO_COLORS,
  TIPO_PRODUTO_LABELS,
  FERTIGATION_TANK_PRESETS,
  type SprayRecipe,
} from '@/data/cornPhenologyManagement';
import {
  EQUIPMENT_PRESETS,
  BACKPACK_CAPACITY_OPTIONS,
  type EquipmentType,
} from '@/types/spraying';

/* ─── Types ─── */
interface ProductCalc {
  recipe: SprayRecipe;
  doseNumeric: number;
  unit: string;
  perTank: number;
  totalArea: number;
  productCost: number;
  matchedInsumo: { nome: string; preco: number; tamanho_unidade: number; medida: string } | null;
}

type AppMode = 'pulverizacao' | 'fertirrigacao';
type FertiEquipType = 'pivo' | 'gotejo' | 'caixa_dagua';

const FERTI_EQUIPMENT_OPTIONS: { type: FertiEquipType; icon: typeof Droplets; label: string; desc: string; color: string; activeColor: string }[] = [
  { type: 'pivo', icon: CircleDot, label: 'Pivô Central', desc: 'Quimigação via pivô', color: 'text-blue-400', activeColor: 'text-blue-600' },
  { type: 'gotejo', icon: Sprout, label: 'Gotejamento', desc: 'Injeção por gotejo/microaspersão', color: 'text-emerald-400', activeColor: 'text-emerald-600' },
  { type: 'caixa_dagua', icon: Droplets, label: 'Aspersão', desc: 'Aspersão convencional em reservatório', color: 'text-cyan-400', activeColor: 'text-cyan-600' },
];

const FERTI_EQUIP_LABELS: Record<FertiEquipType, string> = {
  pivo: 'Pivô Central',
  gotejo: 'Gotejamento',
  caixa_dagua: 'Aspersão',
};

/* ─── Helpers ─── */
function parseDose(dose: string): { value: number; unit: string } {
  const cleaned = dose.replace(/,/g, '.');
  const nums = cleaned.match(/[\d.]+/g);
  if (!nums || nums.length === 0) return { value: 0, unit: '' };
  const values = nums.map(Number);
  const avg = values.length >= 2 ? (values[0] + values[1]) / 2 : values[0];
  const lower = dose.toLowerCase();
  if (lower.includes('ml/100 l') || lower.includes('ml/100l')) return { value: avg, unit: 'mL/100L' };
  if (lower.includes('ml/ha')) return { value: avg / 1000, unit: 'L/ha' };
  if (lower.includes('kg/ha')) return { value: avg, unit: 'Kg/ha' };
  if (lower.includes('l/ha')) return { value: avg, unit: 'L/ha' };
  if (lower.includes('ml/100 kg') || lower.includes('ml/100kg')) return { value: avg, unit: 'mL/100kg sem.' };
  return { value: avg, unit: 'L/ha' };
}

function fmtQty(val: number, unit: string): string {
  if (unit.includes('Kg')) {
    if (val < 1) return `${(val * 1000).toFixed(0)} g`;
    return `${val.toFixed(2)} kg`;
  }
  if (val < 0.1) return `${(val * 1000).toFixed(0)} mL`;
  return `${val.toFixed(2)} L`;
}

/* ─── Phase filters ─── */
const SPRAY_PHASES = CORN_PHENOLOGY_MANAGEMENT.filter(p => p.foliarDefensivos.calda.length > 0);
const FERTI_PHASES = CORN_PHENOLOGY_MANAGEMENT.filter(p => p.fertirrigacao && p.fertirrigacao.calda.length > 0);

/* ─── Steps ─── */
type Step = 'mode' | 'phase' | 'equipment' | 'result';

interface CornSprayingOperationalProps {
  initialPhase?: string;
}

export function CornSprayingOperational({ initialPhase }: CornSprayingOperationalProps = {}) {
  const [step, setStep] = useState<Step>(initialPhase ? 'mode' : 'mode');
  const [mode, setMode] = useState<AppMode>('pulverizacao');
  const [selectedPhase, setSelectedPhase] = useState<string>(initialPhase || '');
  const [equipmentType, setEquipmentType] = useState<EquipmentType>('trator');
  const [tankCapacity, setTankCapacity] = useState(500);
  const [applicationRate, setApplicationRate] = useState(150);
  const [hectares, setHectares] = useState(10);
  const [tractorCostPerHour, setTractorCostPerHour] = useState(150);
  const [droneCostPerHa, setDroneCostPerHa] = useState(50);
  const [costalCostPerTank, setCostalCostPerTank] = useState(15);
  // Fertigation
  const [fertiEquipType, setFertiEquipType] = useState<FertiEquipType>('pivo');
  const [fertiTankCapacity, setFertiTankCapacity] = useState(1000);
  const [fertiCostPerTank, setFertiCostPerTank] = useState(25);

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [insumos, setInsumos] = useState<{ nome: string; preco: number; tamanho_unidade: number; medida: string }[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch insumos from DB for automatic price matching
  useEffect(() => {
    const fetchInsumos = async () => {
      const { data } = await supabase
        .from('insumos')
        .select('nome, preco, tamanho_unidade, medida')
        .eq('status', 'ativo');
      if (data) setInsumos(data);
    };
    fetchInsumos();
  }, []);

  // Fuzzy match: normalize and find best matching insumo for a product name
  const normalize = useCallback((s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''), []);

  const findInsumo = useCallback((productName: string) => {
    const norm = normalize(productName);
    // 1. Exact normalized match
    let match = insumos.find(i => normalize(i.nome) === norm);
    if (match) return match;
    // 2. One contains the other
    match = insumos.find(i => normalize(i.nome).includes(norm) || norm.includes(normalize(i.nome)));
    if (match) return match;
    // 3. Token overlap (fuzzy): score by shared words
    const tokens = norm.match(/[a-z0-9]{2,}/g) || [];
    if (tokens.length === 0) return null;
    let best: typeof insumos[0] | null = null;
    let bestScore = 0;
    for (const ins of insumos) {
      const insTokens = normalize(ins.nome).match(/[a-z0-9]{2,}/g) || [];
      const shared = tokens.filter(t => insTokens.some(it => it.includes(t) || t.includes(it))).length;
      const score = shared / Math.max(tokens.length, insTokens.length);
      if (score > bestScore && score >= 0.4) { bestScore = score; best = ins; }
    }
    return best;
  }, [insumos, normalize]);


  const phase = CORN_PHENOLOGY_MANAGEMENT.find(p => p.fase === selectedPhase);
  const availablePhases = mode === 'pulverizacao' ? SPRAY_PHASES : FERTI_PHASES;

  const handleEquipmentChange = (type: EquipmentType) => {
    setEquipmentType(type);
    const preset = EQUIPMENT_PRESETS[type];
    setTankCapacity(preset.tankCapacity!);
    setApplicationRate(preset.applicationRate!);
  };

  const handleModeSelect = (m: AppMode) => {
    setMode(m);
    if (initialPhase) {
      // Phase already selected from guide — skip phase step
      setSelectedPhase(initialPhase);
      setStep('equipment');
    } else {
      const phases = m === 'pulverizacao' ? SPRAY_PHASES : FERTI_PHASES;
      setSelectedPhase(phases[0]?.fase || '');
      setStep('phase');
    }
  };

  /* ─── PDF Generation ─── */
  const generatePdf = useCallback(async () => {
    if (!reportRef.current) return;
    setGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const el = reportRef.current;
      el.style.display = 'block';
      await new Promise(r => setTimeout(r, 500));
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, width: 794, windowWidth: 794, backgroundColor: '#ffffff' });
      el.style.display = 'none';
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = 210, pdfH = 297;
      const imgW = pdfW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let yOff = 0, page = 0;
      while (yOff < imgH) { if (page > 0) pdf.addPage(); pdf.addImage(imgData, 'JPEG', 0, -yOff, imgW, imgH); yOff += pdfH; page++; }
      const prefix = mode === 'fertirrigacao' ? 'receita-fertirrigacao' : 'receita-pulverizacao';
      pdf.save(`${prefix}-${phase?.fase || 'milho'}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast.error('Erro ao gerar PDF');
    } finally { setGeneratingPdf(false); }
  }, [phase, mode]);

  /* ─── Calculations ─── */
  const isFertigation = mode === 'fertirrigacao';
  const activeTankCapacity = isFertigation ? fertiTankCapacity : tankCapacity;
  const activeRate = isFertigation ? fertiTankCapacity : applicationRate; // fertigation: tank = batch, not rate-based

  const calculations = useMemo<ProductCalc[]>(() => {
    if (!phase) return [];
    const recipes = isFertigation
      ? (phase.fertirrigacao?.calda || [])
      : [...phase.foliarDefensivos.calda, ...(phase.foliarDefensivos.adjuvante ? [phase.foliarDefensivos.adjuvante] : [])];

    return recipes.map(recipe => {
      const { value, unit } = parseDose(recipe.dose);
      let perTank = 0, totalArea = 0;

      if (isFertigation) {
        // Fertigation: dose is per hectare, tank covers X hectares
        // We don't have an "application rate" like spraying — the tank holds the concentrate
        // For fertigation, each tank batch covers a portion of the total area
        // Simple: total needed = dose × hectares, perTank = total / numberOfTanks
        totalArea = value * hectares;
        const nTanks = Math.max(1, Math.ceil(totalArea / (fertiTankCapacity * 0.8))); // 80% fill for dissolving
        perTank = totalArea / nTanks;
      } else {
        if (unit === 'mL/100L') {
          perTank = (tankCapacity / 100) * value / 1000;
          totalArea = perTank * Math.ceil((applicationRate * hectares) / tankCapacity);
        } else if (unit === 'L/ha' || unit === 'Kg/ha') {
          const areaPorTanque = tankCapacity / applicationRate;
          perTank = areaPorTanque * value;
          totalArea = value * hectares;
        }
      }
      const matchedInsumo = findInsumo(recipe.produto);
      const unitPrice = matchedInsumo && matchedInsumo.tamanho_unidade > 0
        ? matchedInsumo.preco / matchedInsumo.tamanho_unidade : 0;
      const productCost = totalArea * unitPrice;
      return { recipe, doseNumeric: value, unit, perTank, totalArea, productCost, matchedInsumo };
    });
  }, [phase, tankCapacity, applicationRate, hectares, isFertigation, fertiTankCapacity, findInsumo]);

  // Spraying volumes
  const volumeTotalCalda = isFertigation ? 0 : applicationRate * hectares;
  const numberOfTanks = isFertigation
    ? (calculations.length > 0 ? Math.max(...calculations.map(c => Math.max(1, Math.ceil(c.totalArea / (fertiTankCapacity * 0.8))))) : 1)
    : Math.ceil(volumeTotalCalda / tankCapacity);
  const areaPorTanque = isFertigation
    ? (numberOfTanks > 0 ? hectares / numberOfTanks : hectares)
    : (tankCapacity / applicationRate);

  const equipmentOptions = [
    { type: 'trator' as EquipmentType, icon: Tractor, label: 'Trator', desc: 'Barra tratorizada' },
    { type: 'drone' as EquipmentType, icon: PlaneTakeoff, label: 'Drone', desc: 'Pulverização aérea' },
    { type: 'bomba_costal' as EquipmentType, icon: Backpack, label: 'Costal', desc: 'Aplicação manual' },
  ];

  const equipmentLabels: Record<EquipmentType, string> = { trator: 'Trator', drone: 'Drone', bomba_costal: 'Bomba Costal' };
  const tankLabel = isFertigation ? 'caixa' : (equipmentType === 'bomba_costal' ? 'bomba' : equipmentType === 'drone' ? 'voo' : 'tanque');
  const activeEquipLabel = isFertigation ? FERTI_EQUIP_LABELS[fertiEquipType] : equipmentLabels[equipmentType];

  /* ─── Cost calc ─── */
  const applicationCost = useMemo(() => {
    if (isFertigation) return numberOfTanks * fertiCostPerTank;
    if (equipmentType === 'trator') return numberOfTanks * 0.5 * tractorCostPerHour;
    if (equipmentType === 'drone') return hectares * droneCostPerHa;
    return numberOfTanks * costalCostPerTank;
  }, [isFertigation, equipmentType, numberOfTanks, hectares, tractorCostPerHour, droneCostPerHa, costalCostPerTank, fertiCostPerTank]);
  const costPerHa = hectares > 0 ? applicationCost / hectares : 0;

  /* ═════════════════════ RENDER ═════════════════════ */

  /* ─── MODE SELECT ─── */
  if (step === 'mode') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Aplicação por Fase
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Escolha o tipo de aplicação</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleModeSelect('pulverizacao')}
            className="p-6 rounded-xl border-2 border-border hover:border-primary/50 text-center transition-all group"
          >
            <FlaskConical className="w-10 h-10 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="font-bold text-foreground text-lg">Pulverização</p>
            <p className="text-xs text-muted-foreground mt-1">Trator, Drone ou Bomba Costal</p>
            <Badge variant="secondary" className="mt-3 text-[10px]">{SPRAY_PHASES.length} fases</Badge>
          </button>
          <button
            onClick={() => handleModeSelect('fertirrigacao')}
            className="p-6 rounded-xl border-2 border-border hover:border-primary/50 text-center transition-all group"
          >
            <Droplets className="w-10 h-10 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="font-bold text-foreground text-lg">Fertirrigação</p>
            <p className="text-xs text-muted-foreground mt-1">Pivô Central — Injeção de nutrientes</p>
            <Badge variant="secondary" className="mt-3 text-[10px]">{FERTI_PHASES.length} fases</Badge>
          </button>
        </div>
      </div>
    );
  }

  /* ─── PHASE SELECT ─── */
  if (step === 'phase') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            {isFertigation ? <Droplets className="w-5 h-5 text-primary" /> : <FlaskConical className="w-5 h-5 text-primary" />}
            {isFertigation ? 'Fertirrigação' : 'Pulverização'} por Fase
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Selecione a fase fenológica</p>
        </div>

        <div className="space-y-3">
          {availablePhases.map(p => {
            const products = isFertigation ? (p.fertirrigacao?.calda || []) : p.foliarDefensivos.calda;
            const desc = isFertigation ? (p.fertirrigacao?.acao || '') : p.foliarDefensivos.acao;
            return (
              <button
                key={p.fase}
                onClick={() => setSelectedPhase(p.fase)}
                className={cn(
                  'w-full text-left rounded-xl border-2 p-4 transition-all',
                  selectedPhase === p.fase ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.icone}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{p.faseLabel}</p>
                    <p className="text-xs text-muted-foreground truncate">{desc}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">{products.length} produto(s)</Badge>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => setStep('mode')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Tipo
          </Button>
          <Button onClick={() => setStep('equipment')} disabled={!selectedPhase} className="gap-2">
            Configurar {isFertigation ? 'Tanque' : 'Equipamento'} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  /* ─── EQUIPMENT / TANK CONFIG ─── */
  if (step === 'equipment') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {isFertigation ? '💧 Tanque de Fertirrigação' : 'Equipamento & Área'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {phase?.icone} {phase?.faseLabel} — {isFertigation ? phase?.fertirrigacao?.acao : phase?.foliarDefensivos.acao}
          </p>
        </div>

        {/* Spraying equipment selector */}
        {!isFertigation && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {equipmentOptions.map(({ type, icon: Icon, label, desc }) => (
                <button key={type} onClick={() => handleEquipmentChange(type)}
                  className={cn('p-4 rounded-xl border-2 text-center transition-all', equipmentType === type ? 'border-primary bg-primary/5' : 'border-border')}>
                  <Icon className={cn('w-7 h-7 mx-auto mb-2', equipmentType === type ? 'text-primary' : 'text-muted-foreground')} />
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </button>
              ))}
            </div>
            {equipmentType === 'bomba_costal' && (
              <div className="p-3 bg-secondary rounded-xl">
                <Label className="text-sm mb-2 block">Capacidade da Bomba</Label>
                <RadioGroup value={tankCapacity.toString()} onValueChange={v => setTankCapacity(parseInt(v))} className="flex gap-4">
                  {BACKPACK_CAPACITY_OPTIONS.map(o => (
                    <div key={o.value} className="flex items-center gap-2">
                      <RadioGroupItem value={o.value.toString()} id={`cap-${o.value}`} />
                      <Label htmlFor={`cap-${o.value}`} className="cursor-pointer text-sm">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </>
        )}

        {/* Fertigation equipment selector */}
        {isFertigation && (
          <div className="grid grid-cols-3 gap-3">
            {FERTI_EQUIPMENT_OPTIONS.map(({ type, icon: Icon, label, desc, color, activeColor }) => (
              <button key={type} onClick={() => setFertiEquipType(type)}
                className={cn(
                  'p-4 rounded-xl border-2 text-center transition-all duration-300',
                  fertiEquipType === type
                    ? 'border-primary bg-primary/5 scale-[1.03] shadow-md'
                    : 'border-border hover:scale-[1.02] hover:shadow-sm'
                )}>
                <Icon className={cn(
                  'w-7 h-7 mx-auto mb-2 transition-all duration-300',
                  fertiEquipType === type ? `${activeColor} animate-scale-in` : color
                )} />
                <p className="font-medium text-sm">{label}</p>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* Fertigation tank selector */}
        {isFertigation && (
          <div className="p-4 bg-secondary rounded-xl space-y-3">
            <Label className="text-sm font-semibold">Volume do Reservatório / Tanque</Label>
            <RadioGroup value={fertiTankCapacity.toString()} onValueChange={v => setFertiTankCapacity(parseInt(v))} className="grid grid-cols-4 gap-3">
              {FERTIGATION_TANK_PRESETS.map(o => (
                <div key={o.value} className="flex items-center gap-2">
                  <RadioGroupItem value={o.value.toString()} id={`ferti-${o.value}`} />
                  <Label htmlFor={`ferti-${o.value}`} className="cursor-pointer text-sm">{o.label}</Label>
                </div>
              ))}
            </RadioGroup>
            <div className="space-y-1.5 mt-2">
              <Label className="text-xs text-muted-foreground">Ou volume personalizado</Label>
              <div className="relative">
                <Input type="number" value={fertiTankCapacity} onChange={e => setFertiTankCapacity(Number(e.target.value) || 0)} className="pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">L</span>
              </div>
            </div>
          </div>
        )}

        {/* Parameters */}
        <div className={cn('grid gap-4', isFertigation ? 'sm:grid-cols-1' : 'sm:grid-cols-3')}>
          {!isFertigation && equipmentType !== 'bomba_costal' && (
            <div className="space-y-1.5">
              <Label className="text-sm">Tanque</Label>
              <div className="relative">
                <Input type="number" value={tankCapacity} onChange={e => setTankCapacity(Number(e.target.value) || 0)} className="pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">L</span>
              </div>
            </div>
          )}
          {!isFertigation && (
            <div className="space-y-1.5">
              <Label className="text-sm">Taxa de Aplicação</Label>
              <div className="relative">
                <Input type="number" value={applicationRate} onChange={e => setApplicationRate(Number(e.target.value) || 0)} className="pr-12" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">L/ha</span>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-sm">Área Total</Label>
            <div className="relative">
              <Input type="number" value={hectares} onChange={e => setHectares(Number(e.target.value) || 0)} className="pr-8" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ha</span>
            </div>
          </div>
        </div>

        {/* Custo Operacional */}
        <div className="p-3 bg-secondary rounded-xl space-y-2">
          <Label className="text-sm font-semibold">💰 Custo Operacional</Label>
          {isFertigation ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Custo por caixa (mão de obra + energia)</Label>
              <div className="relative">
                <Input type="number" value={fertiCostPerTank} onChange={e => setFertiCostPerTank(Number(e.target.value) || 0)} className="pr-14" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$/caixa</span>
              </div>
            </div>
          ) : (
            <>
              {equipmentType === 'trator' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Custo por hora (trator)</Label>
                  <div className="relative">
                    <Input type="number" value={tractorCostPerHour} onChange={e => setTractorCostPerHour(Number(e.target.value) || 0)} className="pr-14" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$/h</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Estimativa: ~30 min por tanque de {tankCapacity}L</p>
                </div>
              )}
              {equipmentType === 'drone' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Custo por hectare (drone)</Label>
                  <div className="relative">
                    <Input type="number" value={droneCostPerHa} onChange={e => setDroneCostPerHa(Number(e.target.value) || 0)} className="pr-14" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$/ha</span>
                  </div>
                </div>
              )}
              {equipmentType === 'bomba_costal' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Custo por tanque (mão de obra)</Label>
                  <div className="relative">
                    <Input type="number" value={costalCostPerTank} onChange={e => setCostalCostPerTank(Number(e.target.value) || 0)} className="pr-14" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$/bomba</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick summary */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-secondary rounded-xl text-center">
          {!isFertigation && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Volume Total</p>
              <p className="font-bold text-foreground">{volumeTotalCalda.toLocaleString()} L</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Nº {tankLabel}s</p>
            <p className="font-bold text-foreground">{numberOfTanks}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">ha/{tankLabel}</p>
            <p className="font-bold text-foreground">{areaPorTanque.toFixed(1)}</p>
          </div>
          {isFertigation && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Tanque</p>
              <p className="font-bold text-foreground">{fertiTankCapacity} L</p>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => setStep('phase')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Fase
          </Button>
          <Button onClick={() => setStep('result')} className="gap-2">
            Gerar Receita <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  /* ═══════════════════ RESULT ═══════════════════ */
  const activeTankCap = isFertigation ? fertiTankCapacity : tankCapacity;
  const activeObservacao = isFertigation ? (phase?.fertirrigacao?.observacao || '') : (phase?.foliarDefensivos.observacao || '');
  const activeVolRecomendado = isFertigation ? (phase?.fertirrigacao?.volumeTanque || '') : (phase?.foliarDefensivos.volumeCalda || '');

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
        <h2 className="text-xl font-bold text-foreground">
          Receita de {isFertigation ? 'Fertirrigação' : 'Pulverização'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {phase?.icone} {phase?.faseLabel} — {activeEquipLabel}
        </p>
      </div>

      {/* Equipment card */}
      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className={cn('grid gap-3 text-center', isFertigation ? 'grid-cols-3' : 'grid-cols-4')}>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Equipamento</p>
              <p className="font-bold text-sm">{activeEquipLabel}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">{isFertigation ? 'Caixa' : 'Tanque'}</p>
              <p className="font-bold text-sm">{activeTankCap} L</p>
            </div>
            {!isFertigation && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Taxa</p>
                <p className="font-bold text-sm">{applicationRate} L/ha</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Área</p>
              <p className="font-bold text-sm">{hectares} ha</p>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="grid grid-cols-3 gap-3 text-center">
            {!isFertigation && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Volume Calda</p>
                <p className="font-bold text-primary">{volumeTotalCalda.toLocaleString()} L</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Nº {tankLabel}s</p>
              <p className="font-bold text-primary">{numberOfTanks}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">ha/{tankLabel}</p>
              <p className="font-bold text-primary">{areaPorTanque.toFixed(1)}</p>
            </div>
            {isFertigation && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Vol. Caixa</p>
                <p className="font-bold text-primary">{fertiTankCapacity} L</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products table */}
      <Card className="card-elevated">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Droplets className="w-4 h-4 text-primary" />
            Receita por {tankLabel.charAt(0).toUpperCase() + tankLabel.slice(1)} ({activeTankCap} L)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-semibold text-muted-foreground text-xs">Produto</th>
                  <th className="pb-2 font-semibold text-muted-foreground text-xs text-center">Tipo</th>
                  <th className="pb-2 font-semibold text-muted-foreground text-xs text-right">Dose/ha</th>
                  <th className="pb-2 font-semibold text-muted-foreground text-xs text-right">Por {tankLabel}</th>
                  <th className="pb-2 font-semibold text-muted-foreground text-xs text-right">Total ({hectares} ha)</th>
                  <th className="pb-2 font-semibold text-muted-foreground text-xs text-right">Custo</th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((calc, idx) => {
                  const colors = TIPO_PRODUTO_COLORS[calc.recipe.tipo] || { bg: 'bg-muted', text: 'text-muted-foreground' };
                  const isFuzzy = calc.matchedInsumo && normalize(calc.matchedInsumo.nome) !== normalize(calc.recipe.produto);
                  return (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2.5 pr-2">
                        <p className="font-medium text-foreground">{calc.recipe.produto}</p>
                        <p className="text-[10px] text-muted-foreground">{calc.recipe.funcao}</p>
                        {calc.matchedInsumo && isFuzzy && (
                          <p className="text-[9px] text-primary">🔗 {calc.matchedInsumo.nome}</p>
                        )}
                        {!calc.matchedInsumo && <p className="text-[9px] text-warning">⚠ Não encontrado nos insumos</p>}
                      </td>
                      <td className="py-2.5 text-center">
                        <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 border-0', colors.bg, colors.text)}>
                          {TIPO_PRODUTO_LABELS[calc.recipe.tipo] || calc.recipe.tipo}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right font-mono text-xs whitespace-nowrap">{calc.recipe.dose}</td>
                      <td className="py-2.5 text-right font-bold text-primary whitespace-nowrap">
                        {calc.perTank > 0 ? fmtQty(calc.perTank, calc.unit) : '—'}
                      </td>
                      <td className="py-2.5 text-right font-mono text-xs whitespace-nowrap">
                        {calc.totalArea > 0 ? fmtQty(calc.totalArea, calc.unit) : '—'}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-xs whitespace-nowrap">
                        {calc.productCost > 0 ? `R$ ${calc.productCost.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Observação */}
      {activeObservacao && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <p className="text-sm text-foreground">{activeObservacao}</p>
          </CardContent>
        </Card>
      )}

      {/* Volume recomendado */}
      {activeVolRecomendado && activeVolRecomendado !== 'N/A' && (
        <Card className="card-elevated">
          <CardContent className="p-4 flex items-center gap-3">
            <Droplets className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">
                {isFertigation ? 'Volume de Tanque Recomendado' : 'Volume de Calda Recomendado'}
              </p>
              <p className="text-sm font-bold text-foreground">{activeVolRecomendado}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custos */}
      {(() => {
        const totalProductCost = calculations.reduce((sum, c) => sum + c.productCost, 0);
        const totalCost = applicationCost + totalProductCost;
        const totalCostPerHa = hectares > 0 ? totalCost / hectares : 0;
        return (
          <Card className="card-elevated border-primary/30">
            <CardContent className="p-4 space-y-4">
              {/* Custo dos Produtos */}
              {totalProductCost > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase mb-3">🧪 Custo dos Produtos</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-secondary rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase">Custo Total</p>
                      <p className="text-lg font-bold text-foreground">R$ {totalProductCost.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-secondary rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase">R$/ha</p>
                      <p className="text-lg font-bold text-primary">R$ {(hectares > 0 ? totalProductCost / hectares : 0).toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-secondary rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase">R$/{tankLabel}</p>
                      <p className="text-lg font-bold text-foreground">R$ {(totalProductCost / numberOfTanks).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Custo Operacional */}
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase mb-3">💰 Custo Operacional de Aplicação</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase">Custo Total</p>
                    <p className="text-lg font-bold text-foreground">R$ {applicationCost.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase">R$/ha</p>
                    <p className="text-lg font-bold text-primary">R$ {costPerHa.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase">R$/{tankLabel}</p>
                    <p className="text-lg font-bold text-foreground">R$ {(applicationCost / numberOfTanks).toFixed(2)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  {isFertigation && `${numberOfTanks} caixa(s) × R$ ${fertiCostPerTank.toFixed(0)}/caixa`}
                  {!isFertigation && equipmentType === 'trator' && `${numberOfTanks} tanques × ~30 min × R$ ${tractorCostPerHour.toFixed(0)}/h`}
                  {!isFertigation && equipmentType === 'drone' && `${hectares} ha × R$ ${droneCostPerHa.toFixed(0)}/ha`}
                  {!isFertigation && equipmentType === 'bomba_costal' && `${numberOfTanks} bombas × R$ ${costalCostPerTank.toFixed(0)}/bomba`}
                </p>
              </div>

              {/* Total Geral */}
              {totalProductCost > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Custo Total Geral</p>
                      <p className="text-xl font-bold text-primary">R$ {totalCost.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Total R$/ha</p>
                      <p className="text-xl font-bold text-primary">R$ {totalCostPerHa.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-between pt-2">
        <Button variant="outline" onClick={() => setStep('equipment')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generatePdf} disabled={generatingPdf} className="gap-1.5">
            {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </Button>
          <Button size="sm" onClick={() => {
            const modeLabel = isFertigation ? 'Fertirrigação' : 'Pulverização';
            const text = `🌽 *Receita de ${modeLabel} - ${phase?.faseLabel}*\n` +
              `Equipamento: ${activeEquipLabel} (${activeTankCap}L)\n` +
              (isFertigation ? '' : `Taxa: ${applicationRate} L/ha | `) + `Área: ${hectares} ha\n` +
              `${tankLabel}s necessários: ${numberOfTanks}\n` +
              `Custo: R$ ${applicationCost.toFixed(2)} (R$ ${costPerHa.toFixed(2)}/ha)\n\n` +
              `*Produtos por ${tankLabel}:*\n` +
              calculations.map(c => `• ${c.recipe.produto}: ${c.perTank > 0 ? fmtQty(c.perTank, c.unit) : c.recipe.dose}`).join('\n') +
              `\n\n_Gerado pelo Solo V3_`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
          }} className="gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> WhatsApp
          </Button>
        </div>
      </div>

      {/* Restart */}
      <div className="text-center pt-2">
        <Button variant="ghost" size="sm" onClick={() => setStep('mode')} className="text-muted-foreground">
          ↻ Nova Receita
        </Button>
      </div>

      {/* Hidden PDF Report */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <CornSprayingReport
          ref={reportRef}
          data={{
            faseLabel: phase?.faseLabel || '',
            faseIcon: phase?.icone || '',
            acao: isFertigation ? (phase?.fertirrigacao?.acao || '') : (phase?.foliarDefensivos.acao || ''),
            detalhe: isFertigation ? (phase?.fertirrigacao?.detalhe || '') : (phase?.foliarDefensivos.detalhe || ''),
            observacao: activeObservacao,
            volumeCaldaRecomendado: activeVolRecomendado,
            equipmentType: equipmentType,
            tankCapacity: activeTankCap,
            applicationRate: isFertigation ? 0 : applicationRate,
            hectares,
            numberOfTanks,
            areaPorTanque,
            volumeTotalCalda: isFertigation ? 0 : volumeTotalCalda,
            products: calculations,
            applicationCost,
            costPerHa,
            totalProductCost: calculations.reduce((s, c) => s + c.productCost, 0),
            mode: mode,
            equipmentLabel: activeEquipLabel,
          }}
        />
      </div>
    </div>
  );
}
