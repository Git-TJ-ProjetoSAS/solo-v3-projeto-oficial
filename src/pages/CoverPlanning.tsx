import React, { useState, useMemo, useRef } from 'react';
import {
  CloudRain, Sun, Droplets, AlertTriangle, CheckCircle2, Sprout,
  Wheat, Calculator, Download, Loader2, Clock, Zap, ShieldAlert,
  ArrowRight, Beaker, Tractor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LOGO_URL } from '@/lib/constants';

// ─── Types ──────────────────────────────────────────────────
type SoilTexture = 'argiloso' | 'arenoso';
type WeatherForecast = 'chuva' | 'seco' | 'irrigacao';
type SulfurLevel = 'baixo' | 'adequado';

interface CoverPlanResult {
  nSource: string;
  nSourceConcentration: number;
  nSourceAlert: string;
  nSourceAlertType: 'warning' | 'success';
  // V3-V4
  nDoseV4: number;
  nProductV4: number;
  k2oDoseV4: number;
  // V6-V8
  nDoseV8: number;
  nProductV8: number;
  k2oDoseV8: number;
  // K strategy
  kStrategy: string;
  kReason: string;
  // Totals
  totalNDose: number;
  totalK2ODose: number;
  strategyTitle: string;
}

// ─── Business Logic ─────────────────────────────────────────
function calculateCoverPlan(
  productivity: number,
  totalN: number,
  totalK2O: number,
  texture: SoilTexture,
  weather: WeatherForecast,
  sulfur: SulfurLevel,
): CoverPlanResult {
  // Regra A: Fonte de Nitrogênio
  let nSource: string;
  let nSourceConcentration: number;
  let nSourceAlert: string;
  let nSourceAlertType: 'warning' | 'success';

  if (weather === 'seco' || sulfur === 'baixo') {
    nSource = sulfur === 'baixo' ? 'Sulfato de Amônio' : 'Ureia Protegida (NBPT)';
    nSourceConcentration = sulfur === 'baixo' ? 0.21 : 0.45;
    nSourceAlert = 'Risco de volatilização alto. Evite Ureia comum se não houver chuva ou irrigação imediata.';
    nSourceAlertType = 'warning';
  } else {
    nSource = 'Ureia Comum';
    nSourceConcentration = 0.45;
    nSourceAlert = 'Condição ideal para Ureia comum (menor custo). Aplique preferencialmente antes da chuva/rega.';
    nSourceAlertType = 'success';
  }

  // Regra B: Fracionamento de Nitrogênio
  const nFractionV4 = 0.35; // 35% em V3-V4
  const nFractionV8 = 0.65; // 65% em V6-V8

  const nDoseV4 = totalN * nFractionV4;
  const nDoseV8 = totalN * nFractionV8;
  const nProductV4 = nDoseV4 / nSourceConcentration;
  const nProductV8 = nDoseV8 / nSourceConcentration;

  // Regra C: Fracionamento de Potássio
  let k2oDoseV4: number;
  let k2oDoseV8: number;
  let kStrategy: string;
  let kReason: string;

  if (texture === 'arenoso') {
    k2oDoseV4 = totalK2O * 0.5; // 50% junto com N em V3-V4
    k2oDoseV8 = 0; // restante já foi no plantio
    kStrategy = '50% Plantio + 50% Cobertura V3-V4';
    kReason = 'Solo arenoso retém pouco potássio. O parcelamento evita perda para o lençol freático.';
  } else {
    k2oDoseV4 = 0; // Tudo no plantio ou V3
    k2oDoseV8 = 0;
    kStrategy = '100% no Plantio ou V3';
    kReason = 'Solo argiloso tem boa retenção de K. Aplicação única é eficiente e reduz custos operacionais.';
  }

  const strategyTitle = `Estratégia de Alto Rendimento com ${nSource}`;

  return {
    nSource,
    nSourceConcentration,
    nSourceAlert,
    nSourceAlertType,
    nDoseV4,
    nProductV4,
    k2oDoseV4,
    nDoseV8,
    nProductV8,
    k2oDoseV8,
    kStrategy,
    kReason,
    totalNDose: totalN,
    totalK2ODose: totalK2O,
    strategyTitle,
  };
}

// ─── Timeline Milestone Component ───────────────────────────
function TimelineMilestone({
  phase,
  title,
  nProduct,
  nSource,
  nUnit,
  nDose,
  k2oDose,
  tip,
  isLast,
}: {
  phase: string;
  title: string;
  nProduct: number;
  nSource: string;
  nUnit: string;
  nDose: number;
  k2oDose: number;
  tip: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Sprout className="w-5 h-5" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border mt-2" />}
      </div>

      {/* Content */}
      <div className="pb-8 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs font-semibold">{phase}</Badge>
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>

        <Card className="border-border">
          <CardContent className="p-4 space-y-3">
            {/* N application */}
            <div className="flex items-start gap-3">
              <Tractor className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">
                  Aplicar {nProduct.toFixed(0)} kg de {nSource}/ha
                </p>
                <p className="text-sm text-muted-foreground">
                  ({nDose.toFixed(1)} kg de N elemento/ha)
                </p>
              </div>
            </div>

            {/* K2O if applicable */}
            {k2oDose > 0 && (
              <div className="flex items-start gap-3">
                <Beaker className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">
                    Aplicar {(k2oDose / 0.6).toFixed(0)} kg de KCl/ha
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ({k2oDose.toFixed(1)} kg de K₂O/ha — KCl 60%)
                  </p>
                </div>
              </div>
            )}

            {/* Tip */}
            <div className="flex items-start gap-2 bg-secondary/50 rounded-lg p-3">
              <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">{tip}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function CoverPlanning() {
  const [productivity, setProductivity] = useState('');
  const [totalN, setTotalN] = useState('');
  const [totalK2O, setTotalK2O] = useState('');
  const [texture, setTexture] = useState<SoilTexture | ''>('');
  const [weather, setWeather] = useState<WeatherForecast | ''>('');
  const [sulfur, setSulfur] = useState<SulfurLevel | ''>('');
  const [result, setResult] = useState<CoverPlanResult | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const isFormValid = productivity && totalN && totalK2O && texture && weather && sulfur;

  const handleGenerate = () => {
    if (!isFormValid) {
      toast.error('Preencha todos os campos antes de gerar o planejamento.');
      return;
    }

    const res = calculateCoverPlan(
      parseFloat(productivity),
      parseFloat(totalN),
      parseFloat(totalK2O),
      texture as SoilTexture,
      weather as WeatherForecast,
      sulfur as SulfurLevel,
    );

    setResult(res);
    toast.success('Planejamento de cobertura gerado!');
  };

  // ─── PDF Generation ────────────────────────────────────────
  const handleGeneratePdf = async () => {
    if (!result || !reportRef.current) return;

    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const el = reportRef.current;

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      const contentHeight = pdfHeight - margin * 2;

      if (imgHeight <= contentHeight) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, contentWidth, imgHeight);
      } else {
        // Multi-page
        let currentY = 0;
        const pxPerMm = canvas.height / imgHeight;
        const sliceHeightPx = contentHeight * pxPerMm;
        let page = 0;

        while (currentY < canvas.height) {
          if (page > 0) pdf.addPage();
          const h = Math.min(sliceHeightPx, canvas.height - currentY);

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = h;
          const ctx = sliceCanvas.getContext('2d')!;
          ctx.drawImage(canvas, 0, currentY, canvas.width, h, 0, 0, canvas.width, h);

          const sliceImgH = (h * contentWidth) / canvas.width;
          pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, contentWidth, sliceImgH);
          currentY += h;
          page++;
        }
      }

      pdf.save('planejamento-cobertura-eficiente.pdf');
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Erro ao gerar o PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const weatherIcon = weather === 'chuva' ? <CloudRain className="w-4 h-4" /> : weather === 'seco' ? <Sun className="w-4 h-4" /> : <Droplets className="w-4 h-4" />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="w-6 h-6 text-primary" />
          Planejamento de Cobertura Eficiente
        </h1>
        <p className="text-sm text-muted-foreground">
          Cronograma inteligente de N e K₂O para milho — evite desperdícios por volatilização e lixiviação.
        </p>
      </div>

      {/* ─── Input Form ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wheat className="w-4 h-4 text-primary" />
            Dados da Lavoura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Meta de Produtividade (sc/ha)</Label>
              <Input
                type="number"
                placeholder="Ex: 180"
                value={productivity}
                onChange={(e) => setProductivity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dose Total de N (kg/ha)</Label>
              <Input
                type="number"
                placeholder="Ex: 160"
                value={totalN}
                onChange={(e) => setTotalN(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dose Total de K₂O (kg/ha)</Label>
              <Input
                type="number"
                placeholder="Ex: 80"
                value={totalK2O}
                onChange={(e) => setTotalK2O(e.target.value)}
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Textura do Solo</Label>
              <Select value={texture} onValueChange={(v) => setTexture(v as SoilTexture)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="argiloso">Argiloso / Pesado</SelectItem>
                  <SelectItem value="arenoso">Arenoso / Leve</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Previsão do Tempo</Label>
              <Select value={weather} onValueChange={(v) => setWeather(v as WeatherForecast)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chuva">🌧️ Chuva prevista (até 3 dias)</SelectItem>
                  <SelectItem value="seco">☀️ Tempo Seco / Veranico</SelectItem>
                  <SelectItem value="irrigacao">💧 Possibilidade de Irrigação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Enxofre no Solo</Label>
              <Select value={sulfur} onValueChange={(v) => setSulfur(v as SulfurLevel)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixo">Baixo / Necessita Reposição</SelectItem>
                  <SelectItem value="adequado">Adequado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={!isFormValid} className="w-full sm:w-auto">
            <Sprout className="w-4 h-4 mr-2" />
            Gerar Planejamento
          </Button>
        </CardContent>
      </Card>

      {/* ─── Result ─── */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Print-ready report container */}
          <div ref={reportRef} className="report-print-mode bg-background" style={{ width: 794, position: 'absolute', left: -9999 }}>
            <ReportContent result={result} productivity={productivity} texture={texture as SoilTexture} weather={weather as WeatherForecast} sulfur={sulfur as SulfurLevel} />
          </div>

          {/* On-screen display */}
          <ReportContent result={result} productivity={productivity} texture={texture as SoilTexture} weather={weather as WeatherForecast} sulfur={sulfur as SulfurLevel} />

          {/* PDF Button */}
          <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} variant="outline" className="w-full">
            {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF da Receita'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Report Content (reused for screen + PDF) ───────────────
function ReportContent({
  result,
  productivity,
  texture,
  weather,
  sulfur,
}: {
  result: CoverPlanResult;
  productivity: string;
  texture: SoilTexture;
  weather: WeatherForecast;
  sulfur: SulfurLevel;
}) {
  return (
    <div className="space-y-4">
      {/* Strategy Header */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Solo" className="h-8 object-contain" />
            <div className="flex-1">
              <CardTitle className="text-base">{result.strategyTitle}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Meta: {productivity} sc/ha · {result.nSource} ({(result.nSourceConcentration * 100).toFixed(0)}% N)
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Alert className={cn(
            "border",
            result.nSourceAlertType === 'warning'
              ? "border-warning/40 bg-warning/10"
              : "border-primary/30 bg-primary/5"
          )}>
            <div className="flex items-start gap-2">
              {result.nSourceAlertType === 'warning'
                ? <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                : <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              }
              <AlertDescription className="text-sm">{result.nSourceAlert}</AlertDescription>
            </div>
          </Alert>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniCard label="N Total" value={`${result.totalNDose} kg/ha`} icon={<Beaker className="w-4 h-4" />} />
        <MiniCard label="K₂O Total" value={`${result.totalK2ODose} kg/ha`} icon={<Beaker className="w-4 h-4" />} />
        <MiniCard label="Fonte N" value={result.nSource} icon={<Wheat className="w-4 h-4" />} />
        <MiniCard label="Solo" value={texture === 'argiloso' ? 'Argiloso' : 'Arenoso'} icon={<Sprout className="w-4 h-4" />} />
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Cronograma de Aplicação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            <TimelineMilestone
              phase="V3-V4"
              title="Fase de Definição (3-4 folhas)"
              nProduct={result.nProductV4}
              nSource={result.nSource}
              nUnit="kg/ha"
              nDose={result.nDoseV4}
              k2oDose={result.k2oDoseV4}
              tip="Fase crítica para definição do potencial produtivo. Aplicar preferencialmente à tarde com solo úmido."
            />
            <TimelineMilestone
              phase="V6-V8"
              title="Pico de Absorção (6-8 folhas)"
              nProduct={result.nProductV8}
              nSource={result.nSource}
              nUnit="kg/ha"
              nDose={result.nDoseV8}
              k2oDose={result.k2oDoseV8}
              tip="Fase de definição do tamanho da espiga. Não atrase esta aplicação — atrasos reduzem diretamente a produtividade."
              isLast
            />
          </div>
        </CardContent>
      </Card>

      {/* K Strategy Card */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Estratégia de Potássio (Anti-Lixiviação)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{result.kStrategy}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{result.kReason}</p>
        </CardContent>
      </Card>

      {/* Conversion Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            Calculadora de Conversão Automática
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Fase</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">N Elemento</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Produto Comercial</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">K₂O</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">KCl (60%)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-medium">V3-V4</td>
                  <td className="py-2 px-3 text-right">{result.nDoseV4.toFixed(1)} kg/ha</td>
                  <td className="py-2 px-3 text-right font-semibold text-primary">{result.nProductV4.toFixed(0)} kg/ha</td>
                  <td className="py-2 px-3 text-right">{result.k2oDoseV4.toFixed(1)} kg/ha</td>
                  <td className="py-2 px-3 text-right font-semibold text-primary">{result.k2oDoseV4 > 0 ? (result.k2oDoseV4 / 0.6).toFixed(0) : '—'} {result.k2oDoseV4 > 0 ? 'kg/ha' : ''}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">V6-V8</td>
                  <td className="py-2 px-3 text-right">{result.nDoseV8.toFixed(1)} kg/ha</td>
                  <td className="py-2 px-3 text-right font-semibold text-primary">{result.nProductV8.toFixed(0)} kg/ha</td>
                  <td className="py-2 px-3 text-right">{result.k2oDoseV8.toFixed(1)} kg/ha</td>
                  <td className="py-2 px-3 text-right font-semibold text-primary">{result.k2oDoseV8 > 0 ? (result.k2oDoseV8 / 0.6).toFixed(0) : '—'} {result.k2oDoseV8 > 0 ? 'kg/ha' : ''}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-semibold">
                  <td className="py-2 px-3">Total</td>
                  <td className="py-2 px-3 text-right">{result.totalNDose.toFixed(1)} kg/ha</td>
                  <td className="py-2 px-3 text-right text-primary">{(result.nProductV4 + result.nProductV8).toFixed(0)} kg/ha</td>
                  <td className="py-2 px-3 text-right">{(result.k2oDoseV4 + result.k2oDoseV8).toFixed(1)} kg/ha</td>
                  <td className="py-2 px-3 text-right text-primary">
                    {(result.k2oDoseV4 + result.k2oDoseV8) > 0
                      ? ((result.k2oDoseV4 + result.k2oDoseV8) / 0.6).toFixed(0) + ' kg/ha'
                      : '—'
                    }
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Mini Summary Card ──────────────────────────────────────
function MiniCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}
