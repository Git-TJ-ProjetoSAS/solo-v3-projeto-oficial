import { useMemo, useRef, useState } from 'react';
import { Trash2, TrendingUp, TrendingDown, Minus, Pencil, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';
import type { SoilAnalysis } from '@/types/farm';
import { TEXTURA_LABELS, type SoilTexture } from '@/types/farm';
import { SoilPdfHeader, SoilPdfFooter } from './SoilPdfHeaderFooter';

interface SoilHistoryTabProps {
  analyses: SoilAnalysis[];
  onDelete: (id: string) => void;
  onEdit?: (analysis: SoilAnalysis) => void;
  talhaoName?: string;
  consultorName?: string | null;
  creaArt?: string | null;
}

const IDEAL_VALUES: Record<string, { min: number; label: string }> = {
  ca: { min: 4.0, label: 'Ca' },
  mg: { min: 1.0, label: 'Mg' },
  p: { min: 12, label: 'P' },
  mo: { min: 25, label: 'MO' },
  zn: { min: 1.0, label: 'Zn' },
  b: { min: 0.3, label: 'B' },
  mn: { min: 5.0, label: 'Mn' },
  fe: { min: 5.0, label: 'Fe' },
  cu: { min: 0.5, label: 'Cu' },
  s: { min: 10, label: 'S' },
};

export function SoilHistoryTab({ analyses, onDelete, onEdit, talhaoName, consultorName, creaArt }: SoilHistoryTabProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const sorted = useMemo(() => [...analyses].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  ), [analyses]);

  const handleExportPdf = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const el = printRef.current;
      el.style.width = '794px';
      el.style.background = '#ffffff';
      el.style.color = '#1a1a1a';
      el.style.padding = '24px';

      await new Promise(r => setTimeout(r, 600));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      el.style.width = '';
      el.style.background = '';
      el.style.color = '';
      el.style.padding = '';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;
      const margin = 8;
      const usableW = pageW - margin * 2;
      const imgH = (canvas.height * usableW) / canvas.width;

      let yOffset = 0;
      const usableH = pageH - margin * 2;

      while (yOffset < imgH) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, margin - yOffset, usableW, imgH);
        yOffset += usableH;
      }

      const label = talhaoName || 'geral';
      pdf.save(`evolucao-solo-${label.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
  };

  const vPercentData = useMemo(() => 
    sorted.map((a, i) => ({
      name: `#${i + 1}`,
      vPercent: parseFloat(a.vPercent.toFixed(1)),
      ideal: 60,
    }))
  , [sorted]);

  const macroData = useMemo(() => 
    sorted.map((a, i) => ({
      name: `#${i + 1}`,
      Ca: a.ca,
      Mg: a.mg,
      P: a.p,
      MO: a.mo,
    }))
  , [sorted]);

  const latestRadar = useMemo(() => {
    if (sorted.length === 0) return [];
    const latest = sorted[sorted.length - 1];
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

    return Object.entries(IDEAL_VALUES).map(([key, { min, label }]) => {
      const val = (latest as any)[key] || 0;
      const pct = Math.min((val / min) * 100, 150);
      const prevVal = previous ? (previous as any)[key] || 0 : null;
      const prevPct = prevVal !== null ? Math.min((prevVal / min) * 100, 150) : null;
      return { nutrient: label, atual: pct, anterior: prevPct, ideal: 100 };
    });
  }, [sorted]);

  const getTrend = (key: string) => {
    if (sorted.length < 2) return null;
    const last = (sorted[sorted.length - 1] as any)[key] || 0;
    const prev = (sorted[sorted.length - 2] as any)[key] || 0;
    if (last > prev) return 'up';
    if (last < prev) return 'down';
    return 'stable';
  };

  if (analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhuma análise registrada ainda.</p>
        <p className="text-sm text-muted-foreground">Preencha os dados na aba "Nova Análise" para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export PDF button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting} className="gap-2">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          Exportar PDF
        </Button>
      </div>

      <div ref={printRef} className="space-y-6">
      <SoilPdfHeader talhaoName={talhaoName} />
      {/* V% Evolution */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Evolução do V% (Saturação por Bases)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={vPercentData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Line type="monotone" dataKey="vPercent" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} name="V%" />
              <Line type="monotone" dataKey="ideal" stroke="hsl(var(--success))" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Ideal (60%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Macronutrients Evolution */}
      {sorted.length >= 2 && (
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Evolução de Macronutrientes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={macroData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line type="monotone" dataKey="Ca" stroke="#f59e0b" strokeWidth={2} name="Ca (cmolc)" />
                <Line type="monotone" dataKey="Mg" stroke="#10b981" strokeWidth={2} name="Mg (cmolc)" />
                <Line type="monotone" dataKey="P" stroke="#6366f1" strokeWidth={2} name="P (mg/dm³)" />
                <Line type="monotone" dataKey="MO" stroke="#ec4899" strokeWidth={2} name="MO (g/dm³)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Radar - Nutrient adequacy */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Perfil Nutricional (% do Ideal)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={latestRadar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="nutrient" fontSize={11} />
              <PolarRadiusAxis domain={[0, 150]} tick={false} />
              <Radar name="Atual" dataKey="atual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              {sorted.length > 1 && (
                <Radar name="Anterior" dataKey="anterior" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} strokeDasharray="3 3" />
              )}
              <Radar name="Ideal (100%)" dataKey="ideal" stroke="hsl(var(--success))" fill="none" strokeDasharray="5 5" />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend indicators */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Tendências</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { key: 'vPercent', label: 'V%', unit: '%' },
            { key: 'ca', label: 'Ca', unit: 'cmolc' },
            { key: 'mg', label: 'Mg', unit: 'cmolc' },
            { key: 'p', label: 'P', unit: 'mg/dm³' },
            { key: 'zn', label: 'Zn', unit: 'mg/dm³' },
            { key: 'b', label: 'B', unit: 'mg/dm³' },
            { key: 'mn', label: 'Mn', unit: 'mg/dm³' },
            { key: 'cu', label: 'Cu', unit: 'mg/dm³' },
            { key: 's', label: 'S', unit: 'mg/dm³' },
            { key: 'mo', label: 'MO', unit: 'g/dm³' },
          ].map(({ key, label, unit }) => {
            const trend = getTrend(key);
            const latest = sorted[sorted.length - 1];
            const val = (latest as any)[key];
            return (
              <div key={key} className="p-3 rounded-lg bg-secondary/30 text-center">
                <span className="text-xs text-muted-foreground block">{label}</span>
                <span className="text-sm font-semibold">{typeof val === 'number' ? val.toFixed(1) : '-'}</span>
                {trend && (
                  <div className="flex justify-center mt-1">
                    {trend === 'up' && <TrendingUp className="w-4 h-4 text-success" />}
                    {trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive" />}
                    {trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* History list */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Todas as Análises</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sorted.slice().reverse().map((analysis, index) => (
            <div key={analysis.id} className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Análise #{sorted.length - index}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(analysis.createdAt).toLocaleDateString('pt-BR')}
                </span>
                {analysis.textura && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    analysis.textura === 'arenosa' && "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
                    analysis.textura === 'media' && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
                    analysis.textura === 'argilosa' && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
                  )}>
                    {TEXTURA_LABELS[analysis.textura] || analysis.textura}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "font-medium",
                  analysis.vPercent >= 60 ? "text-success" : "text-warning"
                )}>
                  V% {analysis.vPercent.toFixed(1)}
                </span>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => onEdit(analysis)}
                    title="Editar análise"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(analysis.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <SoilPdfFooter consultorName={consultorName} creaArt={creaArt} />
      </div>
    </div>
  );
}
