import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calculator,
  FlaskConical,
  Beaker,
  TrendingUp,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings2,
  ChevronDown,
  Info,
} from 'lucide-react';

// ─── Nutrient Database ───────────────────────────────────────
interface NutrientDef {
  id: string;
  name: string;
  symbol: string;
  min: number;
  max: number;
  description: string;
}

const NUTRIENT_DB: NutrientDef[] = [
  { id: 'zn', name: 'Zinco (Zn)', symbol: 'Zn', min: 10, max: 20, description: 'Crescimento de internódios e folhas novas.' },
  { id: 'b', name: 'Boro (B)', symbol: 'B', min: 40, max: 80, description: 'Essencial para florada e pegamento.' },
  { id: 'cu', name: 'Cobre (Cu)', symbol: 'Cu', min: 10, max: 20, description: 'Sanidade (ferrugem/cercóspora) e fotossíntese.' },
  { id: 'mn', name: 'Manganês (Mn)', symbol: 'Mn', min: 50, max: 150, description: 'Fotossíntese e síntese de clorofila.' },
  { id: 'fe', name: 'Ferro (Fe)', symbol: 'Fe', min: 50, max: 200, description: 'Essencial para energia e respiração.' },
  { id: 'mo', name: 'Molibdênio (Mo)', symbol: 'Mo', min: 0.1, max: 1.0, description: 'Metabolismo do Nitrogênio.' },
];

const DEFAULT_BIOMASS = 9000;

type DoseStatus = 'adequada' | 'insuficiente' | 'toxidez';

function getDoseStatus(finalValue: number, min: number, max: number): DoseStatus {
  if (finalValue < min) return 'insuficiente';
  if (finalValue > max * 1.5) return 'toxidez';
  return 'adequada';
}

const STATUS_CONFIG: Record<DoseStatus, { label: string; icon: typeof CheckCircle; className: string; bgClass: string }> = {
  adequada: { label: 'Dose Adequada', icon: CheckCircle, className: 'text-emerald-500', bgClass: 'bg-emerald-500/10 border-emerald-500/20' },
  insuficiente: { label: 'Dose Insuficiente', icon: XCircle, className: 'text-red-500', bgClass: 'bg-red-500/10 border-red-500/20' },
  toxidez: { label: 'Risco de Toxidez', icon: AlertTriangle, className: 'text-amber-500', bgClass: 'bg-amber-500/10 border-amber-500/20' },
};

export function MicroCorrectionCalculator() {
  const [selectedNutrient, setSelectedNutrient] = useState<string>('');
  const [analysisValue, setAnalysisValue] = useState('');
  const [productName, setProductName] = useState('');
  const [concentration, setConcentration] = useState('');
  const [dosePerHa, setDosePerHa] = useState('');
  const [efficiency, setEfficiency] = useState(60);
  const [biomass, setBiomass] = useState(DEFAULT_BIOMASS);
  const [showConfig, setShowConfig] = useState(false);

  const nutrient = NUTRIENT_DB.find(n => n.id === selectedNutrient);

  const handleDecimalInput = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  // ─── Calculation ───────────────────────────────────────────
  const result = useMemo(() => {
    const currentPpm = parseFloat(analysisValue) || 0;
    const conc = parseFloat(concentration) || 0;
    const dose = parseFloat(dosePerHa) || 0;

    if (!nutrient || conc <= 0 || dose <= 0 || biomass <= 0) {
      return null;
    }

    // Massa de nutriente em gramas: dose (kg/ha) * (conc% / 100) * 1000 (kg→g)
    const massaNutrienteG = dose * (conc / 100) * 1000;
    // Massa em mg para cálculo de ppm
    const massaNutrienteMg = dose * (conc / 100) * 1_000_000;
    // Incremento teórico (ppm) = massa(mg) / biomassa(kg)
    const incrementoTeorico = massaNutrienteMg / biomass;
    // Incremento real
    const incrementoReal = incrementoTeorico * (efficiency / 100);
    // Final
    const finalValue = currentPpm + incrementoReal;
    const status = getDoseStatus(finalValue, nutrient.min, nutrient.max);

    return {
      massaNutrienteG,
      incrementoTeorico,
      incrementoReal,
      finalValue,
      currentPpm,
      status,
    };
  }, [analysisValue, concentration, dosePerHa, efficiency, biomass, nutrient]);

  // ─── Progress bar calculations ─────────────────────────────
  const barData = useMemo(() => {
    if (!nutrient || !result) return null;

    // Scale: 0 to max*2 (or finalValue*1.2, whichever is bigger)
    const scaleMax = Math.max(nutrient.max * 2, (result.finalValue || 0) * 1.2, nutrient.max + 20);

    const currentPct = Math.min((result.currentPpm / scaleMax) * 100, 100);
    const gainPct = Math.min((result.incrementoReal / scaleMax) * 100, 100 - currentPct);
    const idealStartPct = (nutrient.min / scaleMax) * 100;
    const idealEndPct = (nutrient.max / scaleMax) * 100;

    return { scaleMax, currentPct, gainPct, idealStartPct, idealEndPct };
  }, [nutrient, result]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Calculadora de Correção Foliar</h3>
          <p className="text-xs text-muted-foreground">Micronutrientes — Café Arábica Adulto</p>
        </div>
      </div>

      {/* ─── STEP 1: Select Nutrient ─────────────────────────── */}
      <div className="space-y-3 p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">1. Nutriente & Análise</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Escolha o Nutriente</Label>
          <Select value={selectedNutrient} onValueChange={setSelectedNutrient}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Selecione um micronutriente..." />
            </SelectTrigger>
            <SelectContent>
              {NUTRIENT_DB.map(n => (
                <SelectItem key={n.id} value={n.id}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                      {n.symbol}
                    </span>
                    <span>{n.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ideal range badge */}
        {nutrient && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15" style={{ animation: 'fade-in 0.2s ease-out' }}>
            <Target className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">
                Meta para {nutrient.name.split('(')[0].trim()}: <strong className="text-primary">{nutrient.min} a {nutrient.max} ppm</strong>
              </p>
              <p className="text-[10px] text-muted-foreground">{nutrient.description}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Resultado da Análise Foliar (ppm)</Label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Ex: 7.3"
            value={analysisValue}
            onChange={handleDecimalInput(setAnalysisValue)}
            className="h-10"
          />
        </div>
      </div>

      {/* ─── STEP 2: Product Config ──────────────────────────── */}
      <div className="space-y-3 p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-1">
          <Beaker className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">2. Configuração do Produto</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do Produto</Label>
            <Input
              type="text"
              placeholder="Ex: Kellus Zinc"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Concentração (%)</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 15"
              value={concentration}
              onChange={handleDecimalInput(setConcentration)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dose (kg/ha)</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 0.4"
              value={dosePerHa}
              onChange={handleDecimalInput(setDosePerHa)}
              className="h-10"
            />
          </div>
        </div>

        {/* Efficiency Slider */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Eficiência de Aplicação</Label>
            <span className="text-sm font-bold text-primary">{efficiency}%</span>
          </div>
          <Slider
            value={[efficiency]}
            onValueChange={([v]) => setEfficiency(v)}
            min={10}
            max={100}
            step={5}
            className="py-1"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>10%</span>
            <span>Padrão: 60%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* ─── Biomass Config (collapsible) ─────────────────────── */}
      <button
        onClick={() => setShowConfig(!showConfig)}
        className="w-full flex items-center gap-2 p-3 rounded-xl bg-secondary/50 border border-border text-left transition-colors hover:bg-secondary"
      >
        <Settings2 className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-xs font-medium text-foreground">Biomassa Foliar</p>
          <p className="text-[10px] text-muted-foreground">
            {biomass.toLocaleString('pt-BR')} kg/ha (4.500 plantas × 2,0 kg folha seca)
          </p>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', showConfig && 'rotate-180')} />
      </button>

      {showConfig && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-2" style={{ animation: 'fade-in 0.2s ease-out' }}>
          <Label className="text-xs">Biomassa foliar (kg/ha)</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={biomass}
            onChange={(e) => setBiomass(Number(e.target.value) || DEFAULT_BIOMASS)}
            className="h-9"
          />
          <p className="text-[10px] text-muted-foreground">
            Padrão: 9.000 kg/ha = 4.500 plantas × 2,0 kg de matéria seca foliar
          </p>
        </div>
      )}

      {/* ─── RESULTS DASHBOARD ─────────────────────────────── */}
      {result && nutrient && (
        <div className="space-y-4" style={{ animation: 'fade-in 0.3s ease-out' }}>
          {/* 3 Result Cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* Aporte Real */}
            <div className="p-4 rounded-2xl border border-border bg-card text-center space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <FlaskConical className="w-4 h-4 text-primary" />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aporte Real</p>
              <p className="text-lg font-bold text-foreground">
                {result.massaNutrienteG.toFixed(0)}g
              </p>
              <p className="text-[10px] text-muted-foreground">
                de {nutrient.symbol}/ha
              </p>
            </div>

            {/* Impacto no Teor */}
            <div className="p-4 rounded-2xl border border-border bg-card text-center space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Impacto no Teor</p>
              <p className="text-lg font-bold text-emerald-500">
                +{result.incrementoReal.toFixed(1)}
              </p>
              <p className="text-[10px] text-muted-foreground">ppm</p>
            </div>

            {/* Projeção Final */}
            <div className="p-4 rounded-2xl border border-border bg-card text-center space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Projeção Final</p>
              <p className="text-lg font-bold text-foreground">
                {result.finalValue.toFixed(1)}
              </p>
              <p className="text-[10px] text-muted-foreground">ppm</p>
            </div>
          </div>

          {/* ─── Progress Bar ────────────────────────────────── */}
          {barData && (
            <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
              <p className="text-xs font-semibold text-foreground">Projeção Visual</p>

              <div className="relative h-8 rounded-full bg-secondary overflow-hidden">
                {/* Ideal zone background */}
                <div
                  className="absolute top-0 bottom-0 bg-emerald-500/15 border-x border-emerald-500/30"
                  style={{
                    left: `${barData.idealStartPct}%`,
                    width: `${barData.idealEndPct - barData.idealStartPct}%`,
                  }}
                />

                {/* Current value (gray) */}
                <div
                  className="absolute top-0 bottom-0 bg-muted-foreground/30 rounded-l-full transition-all duration-500"
                  style={{ width: `${barData.currentPct}%` }}
                />

                {/* Gain (green) */}
                <div
                  className="absolute top-0 bottom-0 bg-emerald-500/60 transition-all duration-500"
                  style={{
                    left: `${barData.currentPct}%`,
                    width: `${barData.gainPct}%`,
                  }}
                />

                {/* Final marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground transition-all duration-500"
                  style={{ left: `${Math.min((result.finalValue / barData.scaleMax) * 100, 100)}%` }}
                />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-muted-foreground/30" />
                  <span>Atual: {result.currentPpm.toFixed(1)} ppm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500/60" />
                  <span>Ganho: +{result.incrementoReal.toFixed(1)} ppm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500/15 border border-emerald-500/30" />
                  <span>Faixa Ideal: {nutrient.min}–{nutrient.max} ppm</span>
                </div>
              </div>
            </div>
          )}

          {/* ─── Status Badge ────────────────────────────────── */}
          {(() => {
            const cfg = STATUS_CONFIG[result.status];
            const StatusIcon = cfg.icon;
            return (
              <div className={cn('flex items-center gap-3 p-4 rounded-2xl border', cfg.bgClass)}>
                <StatusIcon className={cn('w-6 h-6 shrink-0', cfg.className)} />
                <div>
                  <p className={cn('text-sm font-bold', cfg.className)}>{cfg.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {result.status === 'adequada' && `O teor final de ${result.finalValue.toFixed(1)} ppm está dentro da meta (${nutrient.min}–${nutrient.max} ppm).`}
                    {result.status === 'insuficiente' && `O teor final de ${result.finalValue.toFixed(1)} ppm está abaixo do mínimo de ${nutrient.min} ppm. Aumente a dose ou concentração.`}
                    {result.status === 'toxidez' && `O teor final de ${result.finalValue.toFixed(1)} ppm excede significativamente o máximo de ${nutrient.max} ppm. Reduza a dose.`}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ─── Calculation Details ──────────────────────────── */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-[10px] text-muted-foreground leading-relaxed space-y-0.5">
                <p>
                  <strong className="text-foreground">Cálculo:</strong>{' '}
                  {productName || 'Produto'} ({concentration}% de {nutrient.symbol}) a {dosePerHa} kg/ha
                </p>
                <p>
                  Massa de {nutrient.symbol} = {dosePerHa} × ({concentration}/100) × 10⁶ = <strong className="text-foreground">{result.massaNutrienteG.toFixed(0)}g</strong> ({(result.massaNutrienteG * 1000).toFixed(0)} mg)
                </p>
                <p>
                  Δ Teórico = {(result.massaNutrienteG * 1000).toFixed(0)} mg ÷ {biomass.toLocaleString('pt-BR')} kg = <strong className="text-foreground">{result.incrementoTeorico.toFixed(2)} ppm</strong>
                </p>
                <p>
                  Δ Real = {result.incrementoTeorico.toFixed(2)} × {efficiency}% = <strong className="text-primary">{result.incrementoReal.toFixed(2)} ppm</strong>
                </p>
                <p>
                  Final = {result.currentPpm.toFixed(1)} + {result.incrementoReal.toFixed(2)} = <strong className="text-foreground">{result.finalValue.toFixed(1)} ppm</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && selectedNutrient && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Preencha os dados do produto para ver os resultados
        </div>
      )}
    </div>
  );
}
