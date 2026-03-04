import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Droplet, Ruler, CheckCircle2, AlertTriangle, Gauge, ArrowLeft,
  Settings2, Map, Sprout, Save, Pipette, Timer, Waves
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRoutePrefix } from '@/hooks/useRoutePrefix';
import { useTalhoes } from '@/hooks/useTalhoes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ── Animated number display ── */
function AnimatedNumber({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    if (from === to) return;
    const duration = 400;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(tick);
      else prev.current = to;
    };
    requestAnimationFrame(tick);
  }, [value]);

  const formatted = display.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <>{formatted}{suffix && <span className="text-sm font-normal opacity-70 ml-1">{suffix}</span>}</>;
}

/* ── Page ── */
export default function IrrigationSectorSetup() {
  const navigate = useNavigate();
  const { prefixRoute } = useRoutePrefix();
  const { talhoes, loading: talhoesLoading } = useTalhoes();
  const [searchParams] = useSearchParams();

  // Selected talhão
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string>(searchParams.get('talhao') || '');
  const selectedTalhao = talhoes.find(t => t.id === selectedTalhaoId);

  // Step 1 – Identification & Geometry (from talhão)
  const [sectorName, setSectorName] = useState('');
  const [areaHa, setAreaHa] = useState('');
  const [rowSpacing, setRowSpacing] = useState('');
  const [plantSpacing, setPlantSpacing] = useState('');

  // Step 3 – Hydraulic Hardware
  const [flowRate, setFlowRate] = useState('');
  const [dripSpacing, setDripSpacing] = useState('');
  const [isAutoCompensating, setIsAutoCompensating] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load talhão data when selected
  useEffect(() => {
    if (selectedTalhao) {
      setSectorName(selectedTalhao.name);
      setAreaHa(String(selectedTalhao.area_ha || ''));
      setRowSpacing(String((selectedTalhao.row_spacing_cm || 0) / 100 || ''));
      setPlantSpacing(String((selectedTalhao.plant_spacing_cm || 0) / 100 || ''));
      setFlowRate(selectedTalhao.drip_flow_rate_lh ? String(selectedTalhao.drip_flow_rate_lh) : '');
      setDripSpacing(selectedTalhao.drip_spacing_m ? String(selectedTalhao.drip_spacing_m) : '');
      setIsAutoCompensating(selectedTalhao.is_autocompensating ?? true);
    }
  }, [selectedTalhao?.id]);

  // Parsed numbers
  const area = parseFloat(areaHa) || 0;
  const rowSp = parseFloat(rowSpacing) || 0;
  const plantSp = parseFloat(plantSpacing) || 0;
  const flow = parseFloat(flowRate) || 0;
  const dripSp = parseFloat(dripSpacing) || 0;

  // Step 2 – Agronomic Results (reactive)
  const estande = useMemo(() => (rowSp > 0 && plantSp > 0 ? 10000 / (rowSp * plantSp) : 0), [rowSp, plantSp]);
  const populacaoTotal = useMemo(() => estande * area, [estande, area]);
  const demandaMangueira = useMemo(() => (rowSp > 0 ? (10000 / rowSp) * area : 0), [rowSp, area]);

  const geometryFilled = area > 0 && rowSp > 0 && plantSp > 0;

  // Step 4 – Performance Simulator
  const taxaAplicacao = useMemo(() => {
    if (flow <= 0 || dripSp <= 0 || rowSp <= 0) return 0;
    return flow / (dripSp * rowSp);
  }, [flow, dripSp, rowSp]);

  const volumeTotalHora = useMemo(() => {
    if (dripSp <= 0 || demandaMangueira <= 0) return 0;
    return (demandaMangueira / dripSp) * flow;
  }, [demandaMangueira, dripSp, flow]);

  const exampleLamina = 10;
  const tempoMinutos = useMemo(() => {
    if (taxaAplicacao <= 0) return 0;
    return (exampleLamina / taxaAplicacao) * 60;
  }, [taxaAplicacao]);

  const allFilled = geometryFilled && flow > 0 && dripSp > 0;

  const formatTime = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    if (h === 0) return `${m} min`;
    return `${h}h e ${m}min`;
  };

  const handleSave = async () => {
    if (!selectedTalhaoId) {
      toast.error('Selecione um talhão');
      return;
    }
    if (!allFilled) {
      toast.error('Preencha todos os campos');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('talhoes')
        .update({
          row_spacing_cm: Math.round(rowSp * 100),
          plant_spacing_cm: Math.round(plantSp * 100),
          area_ha: area,
          drip_flow_rate_lh: flow,
          drip_spacing_m: dripSp,
          is_autocompensating: isAutoCompensating,
        })
        .eq('id', selectedTalhaoId);

      if (error) throw error;

      toast.success('Parametrização salva com sucesso!', {
        description: `${sectorName} — Taxa: ${taxaAplicacao.toFixed(2)} mm/h`
      });
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  // Only irrigated talhoes
  const irrigatedTalhoes = talhoes.filter(t => t.irrigated);

  return (
    <div className="min-h-screen pb-32 space-y-5 px-1 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(prefixRoute('/irrigacao'))}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-blue-500" />
            Cadastro Parametrizado do Talhão
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dados de área, plantio e gotejamento para cálculos integrados
          </p>
        </div>
      </div>

      {/* Talhão Selector */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Selecionar Talhão</Label>
        <Select value={selectedTalhaoId} onValueChange={setSelectedTalhaoId}>
          <SelectTrigger className="border-blue-200 focus:ring-blue-400">
            <SelectValue placeholder={talhoesLoading ? 'Carregando...' : 'Selecione um talhão irrigado'} />
          </SelectTrigger>
          <SelectContent>
            {irrigatedTalhoes.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} — {t.area_ha} ha
              </SelectItem>
            ))}
            {irrigatedTalhoes.length === 0 && !talhoesLoading && (
              <SelectItem value="_none" disabled>Nenhum talhão irrigado cadastrado</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* ═══════ STEP 1 — Identification & Geometry ═══════ */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Map className="h-4 w-4 text-blue-500" />
            Dados do Talhão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sector-name" className="text-sm">Nome do Setor / Talhão</Label>
            <Input
              id="sector-name"
              placeholder="Ex: Setor 1 - Catuaí"
              value={sectorName}
              onChange={(e) => setSectorName(e.target.value)}
              className="border-blue-200 focus-visible:ring-blue-400"
              readOnly={!!selectedTalhao}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="area-ha" className="text-sm flex items-center gap-1.5">
              <Map className="h-3.5 w-3.5 text-blue-400" />
              Área Total
            </Label>
            <div className="relative">
              <Input id="area-ha" type="number" inputMode="decimal" step="0.1" min="0" placeholder="5.0"
                value={areaHa} onChange={(e) => setAreaHa(e.target.value)}
                className="pr-16 border-blue-200 focus-visible:ring-blue-400" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">hectares</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="row-spacing" className="text-sm flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5 text-blue-400" />
              Espaçamento Entrelinhas
            </Label>
            <div className="relative">
              <Input id="row-spacing" type="number" inputMode="decimal" step="0.1" min="0" placeholder="3.5"
                value={rowSpacing} onChange={(e) => setRowSpacing(e.target.value)}
                className="pr-16 border-blue-200 focus-visible:ring-blue-400" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">metros</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plant-spacing" className="text-sm flex items-center gap-1.5">
              <Sprout className="h-3.5 w-3.5 text-blue-400" />
              Espaçamento Entre Plantas
            </Label>
            <div className="relative">
              <Input id="plant-spacing" type="number" inputMode="decimal" step="0.1" min="0" placeholder="0.7"
                value={plantSpacing} onChange={(e) => setPlantSpacing(e.target.value)}
                className="pr-16 border-blue-200 focus-visible:ring-blue-400" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">metros</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════ STEP 2 — Agronomic Results ═══════ */}
      <div className={cn(
        "rounded-xl border p-5 space-y-3 transition-all duration-500",
        geometryFilled
          ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
          : "bg-muted/30 border-border/40"
      )}>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <Sprout className="h-3.5 w-3.5" />
          Resultados Agronômicos
        </p>
        {geometryFilled ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-card rounded-lg p-3 text-center border border-emerald-100 dark:border-emerald-900 shadow-sm">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Estande</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                <AnimatedNumber value={estande} decimals={0} />
              </p>
              <p className="text-[10px] text-muted-foreground">plantas/ha</p>
            </div>
            <div className="bg-white dark:bg-card rounded-lg p-3 text-center border border-emerald-100 dark:border-emerald-900 shadow-sm">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">População Total</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                <AnimatedNumber value={populacaoTotal} decimals={0} />
              </p>
              <p className="text-[10px] text-muted-foreground">plantas no talhão</p>
            </div>
            <div className="bg-white dark:bg-card rounded-lg p-3 text-center border border-emerald-100 dark:border-emerald-900 shadow-sm">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Demanda Mangueira</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                <AnimatedNumber value={demandaMangueira} decimals={0} />
              </p>
              <p className="text-[10px] text-muted-foreground">metros lineares</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            Preencha área e espaçamentos acima para ver os cálculos em tempo real.
          </p>
        )}
      </div>

      {/* ═══════ STEP 3 — Hydraulic Hardware (read-only, from talhão) ═══════ */}
      <Card className="border-blue-100 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Droplet className="h-4 w-4 text-blue-500" />
            Hardware de Irrigação
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Configurado no cadastro do talhão. Edite lá para alterar.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Vazão</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{flow > 0 ? `${flow} L/h` : '—'}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Espaçamento</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{dripSp > 0 ? `${dripSp} m` : '—'}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            {isAutoCompensating ? (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 gap-1.5">
                <CheckCircle2 className="h-3 w-3" /> Autocompensante
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-700 gap-1.5">
                <AlertTriangle className="h-3 w-3" /> Não autocompensante
              </Badge>
            )}
          </div>
          {(!flow || !dripSp) && selectedTalhao && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
              ⚠️ Dados de gotejamento não configurados. Edite o talhão para preencher.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ═══════ STEP 4 — Performance Simulator ═══════ */}
      <Card className="bg-slate-900 dark:bg-slate-950 border-slate-700 text-white shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Gauge className="h-4 w-4 text-blue-400" />
            Simulador de Desempenho
          </CardTitle>
          <p className="text-xs text-slate-400">Motor de cálculo baseado nos dados informados</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {allFilled ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-800 rounded-lg p-4 text-center space-y-1">
                  <Pipette className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Taxa de Aplicação</p>
                  <p className="text-2xl font-bold text-blue-400 tabular-nums">
                    <AnimatedNumber value={taxaAplicacao} decimals={2} suffix="mm/h" />
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 text-center space-y-1">
                  <Waves className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Volume Total/Hora</p>
                  <p className="text-2xl font-bold text-blue-400 tabular-nums">
                    <AnimatedNumber value={volumeTotalHora} decimals={0} suffix="L/h" />
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 text-center space-y-1">
                  <Timer className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Tempo p/ {exampleLamina}mm</p>
                  <p className="text-xl font-bold text-blue-400 tabular-nums">{formatTime(tempoMinutos)}</p>
                </div>
              </div>

              {!isAutoCompensating && (
                <p className="text-[10px] text-amber-400/80 italic text-center">
                  * Valores estimados com vazão nominal. Verificar uniformidade no campo.
                </p>
              )}

              <div className="bg-slate-800/60 rounded-lg p-3 space-y-1 text-[11px] text-slate-400">
                <p className="font-semibold text-slate-300 text-xs mb-1">Uso integrado dos dados:</p>
                <p>• <span className="text-emerald-400">Adubação de Solo</span> → População Total ({populacaoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} plantas)</p>
                <p>• <span className="text-blue-400">Fertirrigação</span> → Volume/Hora ({volumeTotalHora.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L/h) para dosagem da bomba injetora</p>
                <p>• <span className="text-amber-400">Clima (Chuva)</span> → Taxa de Aplicação ({taxaAplicacao.toFixed(2)} mm/h) para desconto de precipitação</p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Gauge className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                Preencha todos os campos acima para ver o desempenho do sistema em tempo real.
              </p>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={!allFilled || !selectedTalhaoId || saving}
            className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            size="lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Parametrização do Talhão'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
