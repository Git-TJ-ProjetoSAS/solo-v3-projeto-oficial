import { useState, useCallback, useEffect } from 'react';
import { Droplets, Clock, CheckCircle, CloudRain, Pencil, AlertTriangle, Thermometer, Wind, Gauge, History } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface IrrigationLogEntry {
  date: string;
  etc_mm: number;
  rain_mm: number;
  rain_manual_mm: number;
  irrigation_mm: number;
  deficit_mm: number;
  confirmed_at: string | null;
}

interface WaterBalanceDashboardProps {
  moisturePercent: number;
  deficitMm: number;
  etcToday: number;
  recommendedMm: number;
  pumpHours: number;
  weatherAudit?: {
    tempMax: number;
    windKmh: number;
    forecastRainMm: number;
  };
  onConfirmIrrigation?: (irrigationMm: number) => void;
  onRainfallCorrection?: (mm: number) => void;
  cadMm: number;
  /** Persisted log for today — if confirmed_at is set, irrigation was already executed */
  todayLog?: IrrigationLogEntry | null;
  /** Historical logs for accumulated deficit display */
  recentLogs?: IrrigationLogEntry[];
  /** Loading state for persistence */
  isSaving?: boolean;
  /** Application rate from hardware config (mm/h) */
  applicationRateMmH?: number;
  /** Whether using real talhão hardware data vs system defaults */
  usingRealHardware?: boolean;
}

// ─── Gauge SVG Component ─────────────────────────────────────

function MoistureGauge({ percent, deficitMm, etcToday }: { percent: number; deficitMm: number; etcToday: number }) {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  const getColor = (p: number) => {
    if (p >= 60) return { fill: 'hsl(152, 68%, 46%)', label: 'Solo Húmido', bg: 'from-emerald-500/20 to-emerald-600/5' };
    if (p >= 30) return { fill: 'hsl(43, 96%, 56%)', label: 'Atenção', bg: 'from-amber-500/20 to-amber-600/5' };
    return { fill: 'hsl(0, 72%, 51%)', label: 'Stress Hídrico', bg: 'from-red-500/20 to-red-600/5' };
  };

  const color = getColor(clampedPercent);
  const cx = 120, cy = 120, r = 100;
  const startAngle = -220;
  const endAngle = 40;
  const totalAngle = endAngle - startAngle;
  const sweepAngle = (clampedPercent / 100) * totalAngle;

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (start: number, sweep: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(start + sweep);
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className={cn('relative rounded-2xl p-4 bg-gradient-to-b', color.bg)}>
        <svg viewBox="0 0 240 200" className="w-72 h-56 mx-auto">
          <path d={describeArc(startAngle, totalAngle)} fill="none" stroke="hsl(var(--muted))" strokeWidth="20" strokeLinecap="round" />
          {clampedPercent > 0 && (
            <path
              d={describeArc(startAngle, sweepAngle)}
              fill="none"
              stroke={color.fill}
              strokeWidth="20"
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              style={{ filter: `drop-shadow(0 0 10px ${color.fill}50)` }}
            />
          )}
          <text x={cx} y={cy - 18} textAnchor="middle" className="fill-foreground" style={{ fontFamily: 'Inter, sans-serif', fontSize: '52px', fontWeight: 800, letterSpacing: '-1px' }}>
            {Math.round(clampedPercent)}%
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground" style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600 }}>
            {color.label}
          </text>
          <circle cx={cx} cy={cy + 32} r="4" fill={color.fill} opacity="0.6" />
          <circle cx={cx - 8} cy={cy + 36} r="2.5" fill={color.fill} opacity="0.4" />
          <circle cx={cx + 7} cy={cy + 34} r="3" fill={color.fill} opacity="0.5" />
        </svg>
      </div>

      <div className="flex items-center gap-8 mt-4">
        <div className="text-center">
          <p className="text-3xl font-extrabold text-destructive tracking-tight">{deficitMm > 0 ? `-${deficitMm.toFixed(1)}` : '0'} mm</p>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">Défice Atual</p>
        </div>
        <div className="w-px h-10 bg-border" />
        <div className="text-center">
          <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">{etcToday.toFixed(1)} mm</p>
          <p className="text-xs text-muted-foreground font-semibold mt-0.5">ETc de Hoje</p>
        </div>
      </div>
    </div>
  );
}

// ─── Accumulated Deficit Mini Chart ──────────────────────────

function AccumulatedDeficitChart({ logs }: { logs: IrrigationLogEntry[] }) {
  if (logs.length === 0) return null;

  const maxDeficit = Math.max(...logs.map(l => l.deficit_mm), 1);

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          Défice Acumulado (Últimos {logs.length} dias)
        </h4>
        <div className="flex items-end gap-1 h-20">
          {logs.map((log, i) => {
            const height = Math.max(4, (log.deficit_mm / maxDeficit) * 100);
            const wasIrrigated = !!log.confirmed_at;
            const dayLabel = new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    wasIrrigated ? 'bg-blue-500/60' : log.deficit_mm > 20 ? 'bg-destructive/60' : 'bg-amber-400/60'
                  )}
                  style={{ height: `${height}%`, minHeight: '4px' }}
                  title={`${log.deficit_mm.toFixed(1)} mm${wasIrrigated ? ' (irrigado)' : ''}`}
                />
                <span className="text-[9px] text-muted-foreground truncate w-full text-center">{dayLabel}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400/60" /> Défice</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500/60" /> Irrigado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-destructive/60" /> Stress</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard Component ────────────────────────────────

export function WaterBalanceDashboard({
  moisturePercent,
  deficitMm,
  etcToday,
  recommendedMm,
  pumpHours,
  weatherAudit,
  onConfirmIrrigation,
  onRainfallCorrection,
  cadMm,
  todayLog,
  recentLogs = [],
  isSaving = false,
  applicationRateMmH,
  usingRealHardware = false,
}: WaterBalanceDashboardProps) {
  const [showRainfallInput, setShowRainfallInput] = useState(false);
  const [manualRainfall, setManualRainfall] = useState('');

  // Irrigation confirmed = persisted in DB (confirmed_at is set)
  const irrigationConfirmed = !!todayLog?.confirmed_at;

  const handleConfirmIrrigation = useCallback(() => {
    onConfirmIrrigation?.(recommendedMm);
    toast.success('Rega confirmada! Défice zerado.', { icon: '💧' });
  }, [onConfirmIrrigation, recommendedMm]);

  const handleRainfallSubmit = useCallback(() => {
    const mm = parseFloat(manualRainfall);
    if (isNaN(mm) || mm <= 0) {
      toast.error('Insira um valor válido em mm');
      return;
    }
    onRainfallCorrection?.(mm);
    setShowRainfallInput(false);
    setManualRainfall('');
    toast.success(`Chuva de ${mm} mm registrada com sucesso`, { icon: '🌧️' });
  }, [manualRainfall, onRainfallCorrection]);

  const effectiveDeficit = irrigationConfirmed ? 0 : deficitMm;
  const effectiveMoisture = irrigationConfirmed ? Math.min(100, moisturePercent + (recommendedMm / cadMm) * 100) : moisturePercent;

  return (
    <div className="space-y-4">
      {/* ── Passo 1: Indicador Visual de Humidade ── */}
      <Card className="border-blue-500/20 bg-card overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-foreground">Balanço Hídrico do Solo</h3>
          </div>
          <MoistureGauge
            percent={effectiveMoisture}
            deficitMm={effectiveDeficit}
            etcToday={etcToday}
          />
        </CardContent>
      </Card>

      {/* ── Passo 2: Card de Decisão Automatizada ── */}
      <Card className={cn(
        'border-0 overflow-hidden',
        irrigationConfirmed
          ? 'bg-emerald-950/50 border border-emerald-500/30'
          : 'bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-500/30'
      )}>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-6 h-6 text-blue-300" />
            <h3 className="text-lg font-bold text-white">Recomendação de Rega</h3>
          </div>

          {irrigationConfirmed ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-lg font-semibold text-emerald-300">Rega Executada</p>
              <p className="text-sm text-emerald-200/70">
                {todayLog?.irrigation_mm ? `${todayLog.irrigation_mm.toFixed(0)} mm aplicados` : 'Défice zerado'} — Próximo cálculo amanhã.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <p className="text-sm text-blue-300 font-semibold">Aplicar</p>
                  <p className="text-6xl font-extrabold text-white tracking-tighter">{recommendedMm.toFixed(0)} <span className="text-2xl font-semibold text-blue-300">mm</span></p>
                </div>
                <div className="text-right flex items-center gap-2.5 bg-blue-700/40 rounded-xl px-4 py-3">
                  <Clock className="w-6 h-6 text-blue-300" />
                  <div>
                    <p className="text-2xl font-extrabold text-white">{pumpHours.toFixed(1)}h</p>
                    <p className="text-[11px] text-blue-300 font-semibold">Tempo de Bomba</p>
                  </div>
                </div>
              </div>

              {/* Hardware source indicator */}
              <div className="flex items-center gap-1.5 text-[10px] mb-3">
                {usingRealHardware ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300 font-medium">Cálculo baseado no hardware real do talhão</span>
                    {applicationRateMmH != null && <span className="text-blue-300/60">({applicationRateMmH.toFixed(2)} mm/h)</span>}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-300/80 font-medium">Usando taxa padrão — configure o hardware do talhão para precisão</span>
                  </>
                )}
              </div>

              <Button
                onClick={handleConfirmIrrigation}
                disabled={isSaving}
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-700/30 transition-all active:scale-[0.98]"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {isSaving ? 'Salvando...' : 'Confirmar Execução da Rega'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Passo 3: Auditoria Climática ── */}
      {weatherAudit && (
        <Card className="border-border/50 bg-card">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-muted-foreground" />
              Registo Climático (Últimas 24h)
            </h4>

            <div className="flex items-center gap-4 text-sm mb-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                <span>Máx: <strong className="text-foreground">{weatherAudit.tempMax}°C</strong></span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Wind className="w-3.5 h-3.5 text-sky-400" />
                <span>Vento: <strong className="text-foreground">{weatherAudit.windKmh} km/h</strong></span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <CloudRain className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Chuva detetada pela previsão</p>
                  <p className="text-base font-bold text-foreground">{weatherAudit.forecastRainMm} mm</p>
                </div>
              </div>

              {!showRainfallInput ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRainfallInput(true)}
                  className="text-xs text-primary hover:text-primary/80 hover:bg-primary/10 gap-1 shrink-0"
                >
                  <Pencil className="w-3 h-3" />
                  Corrigir Pluviómetro
                </Button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="mm"
                    value={manualRainfall}
                    onChange={(e) => setManualRainfall(e.target.value)}
                    className="w-20 h-8 text-sm text-center"
                    autoFocus
                  />
                  <Button size="sm" className="h-8 text-xs" onClick={handleRainfallSubmit}>OK</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => { setShowRainfallInput(false); setManualRainfall(''); }}
                  >
                    ✕
                  </Button>
                </div>
              )}
            </div>

            {weatherAudit.forecastRainMm === 0 && !showRainfallInput && (
              <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                A API não detetou chuva. Se choveu na fazenda, corrija manualmente.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Passo 4: Histórico de Défice Acumulado ── */}
      <AccumulatedDeficitChart logs={recentLogs} />
    </div>
  );
}
