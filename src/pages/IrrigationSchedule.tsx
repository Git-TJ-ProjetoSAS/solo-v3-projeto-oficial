import { Droplets, Sprout, AlertTriangle, Info, Waves, ArrowRight, Loader2, CloudSun, Thermometer, CloudRain, History, FileText, Settings2, FlaskConical, Badge as BadgeIcon } from 'lucide-react';
import { WaterBalanceDashboard } from '@/components/irrigation/WaterBalanceDashboard';
import { IrrigationSetupPanel } from '@/components/irrigation/IrrigationSetupPanel';
import { DailyScheduleTable } from '@/components/irrigation/DailyScheduleTable';
import { EnergyCostCard } from '@/components/irrigation/EnergyCostCard';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useRoutePrefix } from '@/hooks/useRoutePrefix';
import { Button } from '@/components/ui/button';
import { IrrigationReport } from '@/components/irrigation/IrrigationReport';
import { useIrrigationSchedule } from '@/hooks/useIrrigationSchedule';

export default function IrrigationSchedule() {
  const navigate = useNavigate();
  const { prefixRoute } = useRoutePrefix();

  const {
    talhoes, talhoesLoading,
    selectedTalhaoId, setSelectedTalhaoId,
    selectedTalhao, areaTalhao, totalPlants,
    weather, isLoading,
    latestTalhaoSoilAnalysis, textureCascade, soilInfo,
    dailyEToValues, dailyETcValues, avgETo, avgETc, currentKc,
    system, turnoRega, setTurnoRega,
    doseAdubo, setDoseAdubo, doseFromWizard, wizardProducts,
    tarifaEnergia, setTarifaEnergia, evitarPonta, setEvitarPonta,
    dailyRainfall, savingRainfall, handleRainfallChange, totalRainfall,
    result, adjustedDeficitMm, adjustedLaminaBruta, retroactiveDeficit,
    costResult, schedule, flowRateMmH, usingRealHardware,
    todayLog, recentLogs, isSavingIrrigation,
    handleConfirmIrrigationPersist, handleRainfallCorrectionPersist,
    showReport, setShowReport,
  } = useIrrigationSchedule();

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Irrigação & Fertirrigação"
          description="Cronograma automatizado baseado em clima real, solo e equipamento"
        />
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(prefixRoute('/irrigacao/setor'))}
            className="gap-1.5"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Cadastro do Setor</span>
            <span className="sm:hidden">Setor</span>
          </Button>
          {weather && !isLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReport(true)}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Relatório
            </Button>
          )}
        </div>
      </div>

      {/* ═══ SELEÇÃO DO TALHÃO ═══ */}
      <IrrigationSetupPanel
        talhoes={talhoes}
        talhoesLoading={talhoesLoading}
        selectedTalhaoId={selectedTalhaoId}
        setSelectedTalhaoId={setSelectedTalhaoId}
        selectedTalhao={selectedTalhao}
        areaTalhao={areaTalhao}
        totalPlants={totalPlants}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Buscando dados climáticos do talhão...</span>
        </div>
      )}

      {/* No weather data */}
      {!weather && !isLoading && selectedTalhao && (
        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
            {selectedTalhao.center_lat && selectedTalhao.center_lng
              ? 'Não foi possível carregar os dados climáticos. Tente novamente mais tarde.'
              : <>Este talhão não possui coordenadas geográficas. Edite o talhão em <strong>Talhões</strong> e desenhe o polígono no mapa para habilitar o clima automático.</>
            }
          </AlertDescription>
        </Alert>
      )}

      {weather && !isLoading && (
        <>
          {/* Rainfall Input Card */}
          <Card className="border-sky-200 dark:border-sky-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-sky-500" />
                Registro de Chuva (mm)
                {savingRainfall && (
                  <Badge variant="outline" className="text-[10px] h-5 gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Salvando...
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Informe a precipitação ocorrida ou prevista para cada dia. O sistema desconta da necessidade de irrigação.
              </p>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-7 gap-2">
                {schedule.map((day, idx) => (
                  <div key={idx} className="text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground font-medium capitalize">
                      {day.date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </p>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={dailyRainfall[idx] || ''}
                      onChange={(e) => handleRainfallChange(idx, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="text-center text-sm h-9 px-1"
                    />
                    <p className="text-[10px] text-muted-foreground">mm</p>
                  </div>
                ))}
              </div>
              {totalRainfall > 0 && (
                <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-sky-50 dark:bg-sky-950/20">
                  <CloudRain className="w-4 h-4 text-sky-500 shrink-0" />
                  <p className="text-xs text-sky-700 dark:text-sky-300">
                    <strong>{totalRainfall.toFixed(1)} mm</strong> de chuva no período — descontado automaticamente da lâmina de irrigação.
                  </p>
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(prefixRoute('/historico-chuvas'))}
                  className="text-xs gap-1.5"
                >
                  <History className="w-3.5 h-3.5" />
                  Ver Histórico Completo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Weather Widget */}
          <Card className="border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20 dark:border-sky-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900 flex items-center justify-center">
                    <CloudSun className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {weather.city}{weather.state ? `, ${weather.state}` : ''}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Thermometer className="w-3 h-3" />
                      <span>Atual: {weather.currentTemp}°C</span>
                      <span>•</span>
                      <span>Lat: {weather.lat.toFixed(2)}°</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-sky-700 dark:text-sky-300">
                    ETo média: {avgETo.toFixed(2)} mm/dia
                  </p>
                  <div className="flex items-center justify-end gap-1.5">
                    {weather.source === 'mock' && (
                      <Badge variant="outline" className="text-[10px] h-5 border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        Estimado
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Hargreaves-Samani • {weather.source === 'mock' ? 'Dados estimados' : 'OpenWeatherMap'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mini forecast bar */}
              <div className="grid grid-cols-7 gap-1 mt-4">
                {weather.dailyForecasts.slice(0, 7).map((f, i) => (
                  <div key={i} className="text-center p-1.5 rounded-lg bg-white/60 dark:bg-white/5">
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {f.date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </p>
                    <p className="text-xs font-bold text-foreground">{Math.round(f.tMax)}°</p>
                    <p className="text-[10px] text-muted-foreground">{Math.round(f.tMin)}°</p>
                    {f.rainMm > 0 ? (
                      <p className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 flex items-center justify-center gap-0.5 mt-0.5">
                        <CloudRain className="w-2.5 h-2.5" />
                        {f.rainMm}mm
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">0mm</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ═══ WATER BALANCE DASHBOARD ═══ */}
          {selectedTalhao && (
            <>
              {/* Retroactive deficit indicator */}
              {retroactiveDeficit > 0 && (
                <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                    Défice acumulado dos últimos 7 dias: <strong>{retroactiveDeficit.toFixed(1)} mm</strong> — incorporado à recomendação de rega de hoje.
                  </AlertDescription>
                </Alert>
              )}

              <WaterBalanceDashboard
                moisturePercent={Math.max(0, Math.min(100, ((soilInfo.cad - adjustedDeficitMm) / soilInfo.cad) * 100))}
                deficitMm={Math.max(0, adjustedDeficitMm)}
                etcToday={dailyETcValues[0] ?? avgETc}
                recommendedMm={adjustedLaminaBruta}
                pumpHours={adjustedLaminaBruta / flowRateMmH}
                cadMm={soilInfo.cad}
                weatherAudit={weather ? {
                  tempMax: Math.round(weather.dailyForecasts[0]?.tMax ?? weather.currentTemp),
                  windKmh: Math.round((weather.current?.wind_speed ?? 3) * 3.6),
                  forecastRainMm: weather.dailyForecasts[0]?.rainMm ?? 0,
                } : undefined}
                todayLog={todayLog}
                recentLogs={recentLogs}
                isSaving={isSavingIrrigation}
                onConfirmIrrigation={handleConfirmIrrigationPersist}
                onRainfallCorrection={handleRainfallCorrectionPersist}
                applicationRateMmH={flowRateMmH}
                usingRealHardware={usingRealHardware}
              />
            </>
          )}

          {/* Soil & ETc summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                  <Sprout className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Textura do solo</p>
                  <p className="text-sm font-semibold text-foreground">{soilInfo.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {latestTalhaoSoilAnalysis
                      ? `Análise do talhão ${selectedTalhao?.name || ''} • CAD: ${soilInfo.cad} mm`
                      : `${textureCascade.source} • CAD: ${soilInfo.cad} mm`}
                  </p>
                  {latestTalhaoSoilAnalysis ? (
                    <Badge variant="outline" className="mt-1 text-[10px] h-5 border-green-300 text-green-700 dark:text-green-400">
                      Análise vinculada ao talhão
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mt-1 text-[10px] h-5">
                      Nível {textureCascade.level} de fallback
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Waves className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-primary uppercase tracking-wide">ETc Diária Média</p>
                  <p className="text-xl font-bold text-foreground">{avgETc.toFixed(2)} mm/dia</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ETo {avgETo.toFixed(2)} × Kc {currentKc.kc} ({currentKc.phase})
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Config inputs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configuração do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="turno" className="text-sm font-medium">
                    Turno de Rega (dias)
                  </Label>
                  <Input
                    id="turno"
                    type="number"
                    min={1}
                    max={14}
                    value={turnoRega}
                    onChange={(e) => setTurnoRega(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center text-lg font-semibold h-12"
                  />
                  <p className="text-xs text-muted-foreground">Frequência de irrigação</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adubo" className="text-sm font-medium flex items-center gap-1.5">
                    Dose de Adubo (kg/ha)
                    {doseFromWizard !== null && (
                      <Badge variant="secondary" className="text-[10px] h-4 gap-0.5">
                        <FlaskConical className="w-2.5 h-2.5" />
                        Wizard
                      </Badge>
                    )}
                  </Label>
                  <Input
                    id="adubo"
                    type="number"
                    min={0}
                    step={0.5}
                    value={doseAdubo}
                    onChange={(e) => setDoseAdubo(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="text-center text-lg font-semibold h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    {doseFromWizard !== null
                      ? `Baseado na última recomendação do Wizard (${doseFromWizard} kg/ha)`
                      : 'Selecione um talhão com histórico para auto-preencher'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Energy cost */}
          <EnergyCostCard
            tarifaEnergia={tarifaEnergia}
            setTarifaEnergia={setTarifaEnergia}
            evitarPonta={evitarPonta}
            setEvitarPonta={setEvitarPonta}
            costResult={costResult}
            areaTalhao={areaTalhao}
            talhaoName={selectedTalhao?.name}
            showResults={!result.alertaLixiviacao && adjustedLaminaBruta > 0}
          />

          {/* Leaching Alert */}
          {result.alertaLixiviacao && (
            <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-sm font-medium">
                {result.alertMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Result Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className={cn('text-center', result.alertaLixiviacao && 'opacity-50')}>
              <CardContent className="p-4">
                <Droplets className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-xs text-muted-foreground mb-1">Lâmina Líquida</p>
                <p className="text-2xl font-bold text-foreground">{adjustedDeficitMm.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">mm</p>
              </CardContent>
            </Card>

            <Card className={cn('text-center border-primary/30', result.alertaLixiviacao && 'opacity-50')}>
              <CardContent className="p-4">
                <Waves className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground mb-1">Lâmina Bruta</p>
                <p className="text-2xl font-bold text-primary">{adjustedLaminaBruta.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">mm/bomba</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-4">
                <ArrowRight className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <p className="text-xs text-muted-foreground mb-1">Eficiência</p>
                <p className="text-2xl font-bold text-foreground">{(result.efficiency * 100).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">%</p>
              </CardContent>
            </Card>
          </div>

          {/* Fertigation result */}
          {doseAdubo > 0 && !result.alertaLixiviacao && (
            <Card className="border-green-200 bg-green-50/30 dark:bg-green-950/10 dark:border-green-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                  <Sprout className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fertirrigação</p>
                  <p className="text-lg font-bold text-foreground">{result.fertigacao.toFixed(2)} kg/mm</p>
                  <p className="text-xs text-muted-foreground">
                    {doseAdubo} kg/ha ÷ {adjustedLaminaBruta.toFixed(1)} mm = concentração por mm de água
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wizard products */}
          {wizardProducts.length > 0 && doseFromWizard !== null && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-primary" />
                  Produtos da Última Recomendação (Wizard)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-1.5">
                  {wizardProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium">{p.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {p.dosePerHa} {p.unit}
                      </Badge>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="text-foreground">Total consolidado</span>
                    <span className="text-primary">{doseFromWizard} kg/ha</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 7-Day Table */}
          <Separator />
          <DailyScheduleTable schedule={schedule} />

          {/* Info footer */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              {weather.source === 'mock'
                ? 'Dados climáticos simulados (mock). Para dados reais, configure a chave da API OpenWeatherMap.'
                : 'Dados climáticos obtidos via OpenWeatherMap. ETo calculada pela equação de Hargreaves-Samani (FAO).'
              }
              {' '}A textura do solo segue uma cascata de 3 níveis: análise cadastrada → estimativa por MO → predominância regional.
            </p>
          </div>
        </>
      )}

      {/* Irrigation Report Modal */}
      <IrrigationReport
        open={showReport}
        onClose={() => setShowReport(false)}
        schedule={schedule}
        system={system}
        turnoRega={turnoRega}
        doseAdubo={doseAdubo}
        avgETo={avgETo}
        avgETc={avgETc}
        laminaLiquida={adjustedDeficitMm}
        laminaBruta={adjustedLaminaBruta}
        efficiency={result.efficiency}
        soilTexture={soilInfo.label}
        soilCad={soilInfo.cad}
        talhaoName={selectedTalhao?.name}
        areaHa={areaTalhao}
        totalPlants={totalPlants}
        cityName={weather?.city}
        dailyRainfall={dailyRainfall}
        costResult={!result.alertaLixiviacao && adjustedLaminaBruta > 0 ? costResult : undefined}
        kcInfo={currentKc}
      />
    </div>
  );
}
