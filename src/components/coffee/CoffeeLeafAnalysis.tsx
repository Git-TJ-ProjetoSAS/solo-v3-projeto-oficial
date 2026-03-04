import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useCoffee } from '@/contexts/CoffeeContext';
import type { LeafAnalysisData } from '@/contexts/CoffeeContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { FlaskConical, CheckCircle, AlertTriangle, XCircle, Info, Camera, Upload, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { FoliarRecommendationTable } from './FoliarRecommendationTable';

type NutrientStatus = 'deficient' | 'threshold' | 'adequate' | 'empty';

interface NutrientRef {
  id: string;
  symbol: string;
  name: string;
  unit: '%' | 'ppm';
  deficientMax: number | null;
  thresholdValue: number;
  adequateMin: number;
  adequateMax: number | null;
}

interface AILeafResult {
  valido: boolean;
  n?: number | null;
  p?: number | null;
  k?: number | null;
  mg?: number | null;
  ca?: number | null;
  s?: number | null;
  zn?: number | null;
  b?: number | null;
  cu?: number | null;
  mn?: number | null;
  fe?: number | null;
  mo?: number | null;
  observacoes?: string;
}

const LEAF_REFERENCE: NutrientRef[] = [
  { id: 'n',  symbol: 'N',  name: 'Nitrogênio',  unit: '%',   deficientMax: 2.5,  thresholdValue: 3.0,  adequateMin: 3.0,  adequateMax: 3.5  },
  { id: 'p',  symbol: 'P',  name: 'Fósforo',     unit: '%',   deficientMax: 0.05, thresholdValue: 0.12, adequateMin: 0.12, adequateMax: 0.15 },
  { id: 'k',  symbol: 'K',  name: 'Potássio',    unit: '%',   deficientMax: 1.2,  thresholdValue: 1.8,  adequateMin: 1.8,  adequateMax: 2.3  },
  { id: 'mg', symbol: 'Mg', name: 'Magnésio',    unit: '%',   deficientMax: 0.2,  thresholdValue: 0.35, adequateMin: 0.35, adequateMax: 0.5  },
  { id: 'ca', symbol: 'Ca', name: 'Cálcio',      unit: '%',   deficientMax: 0.5,  thresholdValue: 1.0,  adequateMin: 1.0,  adequateMax: 1.5  },
  { id: 's',  symbol: 'S',  name: 'Enxofre',     unit: '%',   deficientMax: 0.05, thresholdValue: 0.15, adequateMin: 0.15, adequateMax: 0.20 },
  { id: 'zn', symbol: 'Zn', name: 'Zinco',       unit: 'ppm', deficientMax: 7,    thresholdValue: 10,   adequateMin: 10,   adequateMax: 20   },
  { id: 'b',  symbol: 'B',  name: 'Boro',        unit: 'ppm', deficientMax: 30,   thresholdValue: 40,   adequateMin: 40,   adequateMax: 80   },
  { id: 'cu', symbol: 'Cu', name: 'Cobre',       unit: 'ppm', deficientMax: 4,    thresholdValue: 10,   adequateMin: 10,   adequateMax: 20   },
  { id: 'mn', symbol: 'Mn', name: 'Manganês',    unit: 'ppm', deficientMax: 30,   thresholdValue: 50,   adequateMin: 50,   adequateMax: 150  },
  { id: 'fe', symbol: 'Fe', name: 'Ferro',       unit: 'ppm', deficientMax: 30,   thresholdValue: 50,   adequateMin: 50,   adequateMax: 200  },
  { id: 'mo', symbol: 'Mo', name: 'Molibdênio',  unit: 'ppm', deficientMax: null,  thresholdValue: 0.1,  adequateMin: 0.1,  adequateMax: 1.0  },
];

function getStatus(value: number | null, ref: NutrientRef): NutrientStatus {
  if (value === null || isNaN(value)) return 'empty';
  if (ref.deficientMax !== null && value < ref.deficientMax) return 'deficient';
  if (value < ref.adequateMin) return 'threshold';
  return 'adequate';
}

const STATUS_CONFIG: Record<NutrientStatus, { label: string; className: string; icon: typeof CheckCircle }> = {
  deficient: {
    label: 'Deficiente',
    className: 'text-red-500 bg-red-500/10 border-red-500/30',
    icon: XCircle,
  },
  threshold: {
    label: 'Limiar',
    className: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    icon: AlertTriangle,
  },
  adequate: {
    label: 'Adequado',
    className: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    icon: CheckCircle,
  },
  empty: {
    label: '',
    className: 'text-muted-foreground bg-secondary border-border',
    icon: Info,
  },
};

export function CoffeeLeafAnalysis() {
  const { coffeeData, setLeafAnalysis } = useCoffee();
  const coffeeLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica';

  // AI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Initialize from context if available
  const initialValues = useMemo(() => {
    if (!coffeeData.leafAnalysis) return {};
    const vals: Record<string, string> = {};
    for (const [id, entry] of Object.entries(coffeeData.leafAnalysis)) {
      vals[id] = String(entry.value);
    }
    return vals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [values, setValues] = useState<Record<string, string>>(initialValues);

  const handleChange = (id: string, raw: string) => {
    const sanitized = raw.replace(',', '.');
    setValues(prev => ({ ...prev, [id]: sanitized }));
  };

  const results = useMemo(() => {
    return LEAF_REFERENCE.map(ref => {
      const raw = values[ref.id];
      const parsed = raw ? parseFloat(raw) : null;
      const status = getStatus(parsed, ref);
      return { ...ref, value: parsed, status };
    });
  }, [values]);

  // Persist to context whenever results change
  const persistToContext = useCallback(() => {
    const data: LeafAnalysisData = {};
    let hasData = false;
    for (const r of results) {
      if (r.value !== null && r.status !== 'empty') {
        data[r.id] = { value: r.value, status: r.status };
        hasData = true;
      }
    }
    setLeafAnalysis(hasData ? data : null as unknown as LeafAnalysisData);
  }, [results, setLeafAnalysis]);

  useEffect(() => {
    persistToContext();
  }, [persistToContext]);

  // AI processing
  const processImage = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    setAiStatus('idle');

    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('read-leaf-analysis', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      const result = data as AILeafResult;

      if (!result.valido) {
        setAiStatus('error');
        toast.error('O documento não parece ser uma análise foliar válida.');
        return;
      }

      // Map AI results to values
      const newValues: Record<string, string> = { ...values };
      const nutrientKeys: (keyof AILeafResult)[] = ['n', 'p', 'k', 'mg', 'ca', 's', 'zn', 'b', 'cu', 'mn', 'fe', 'mo'];
      
      for (const key of nutrientKeys) {
        const val = result[key];
        if (val != null && typeof val === 'number') {
          newValues[key] = String(val);
        }
      }

      setValues(newValues);
      setAiStatus('success');
      toast.success('Valores extraídos com sucesso! Confira e ajuste se necessário.');

      if (result.observacoes) {
        setTimeout(() => toast.info(result.observacoes, { duration: 6000 }), 500);
      }
    } catch (err) {
      console.error('AI leaf analysis error:', err);
      setAiStatus('error');
      toast.error('Erro ao analisar o documento. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [values]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 10MB.');
        return;
      }
      processImage(file);
    }
    e.target.value = '';
  };

  const filledCount = results.filter(r => r.status !== 'empty').length;
  const deficientCount = results.filter(r => r.status === 'deficient').length;
  const thresholdCount = results.filter(r => r.status === 'threshold').length;
  const adequateCount = results.filter(r => r.status === 'adequate').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-secondary border border-border">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <FlaskConical className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground mb-0.5">Análise Foliar — Café {coffeeLabel}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Insira os valores manualmente ou envie uma foto do laudo para leitura automática com IA.
          </p>
        </div>
      </div>

      {/* AI Upload Section */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Leitura automática com IA</span>
          {aiStatus === 'success' && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
          )}
          {aiStatus === 'error' && (
            <AlertCircle className="h-4 w-4 text-red-500 ml-auto" />
          )}
        </div>

        {previewUrl && (
          <div className="relative w-full h-32 rounded-xl overflow-hidden bg-secondary">
            <img src={previewUrl} alt="Laudo foliar" className="w-full h-full object-contain" />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Analisando...</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isAnalyzing}
          >
            <Camera className="h-4 w-4" />
            Câmera
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
          >
            <Upload className="h-4 w-4" />
            Arquivo
          </Button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        <p className="text-[11px] text-muted-foreground leading-tight">
          Envie uma foto do laudo de análise foliar. A IA irá extrair os valores automaticamente.
        </p>
      </div>

      {/* Summary badges */}
      {filledCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {deficientCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
              <XCircle className="w-3 h-3" />
              {deficientCount} deficiente{deficientCount > 1 ? 's' : ''}
            </span>
          )}
          {thresholdCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle className="w-3 h-3" />
              {thresholdCount} no limiar
            </span>
          )}
          {adequateCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle className="w-3 h-3" />
              {adequateCount} adequado{adequateCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Macronutrients */}
      <NutrientSection
        title="Macronutrientes"
        subtitle="Valores em porcentagem (%)"
        nutrients={results.filter(r => r.unit === '%')}
        values={values}
        onChange={handleChange}
      />

      {/* Micronutrients */}
      <NutrientSection
        title="Micronutrientes"
        subtitle="Valores em partes por milhão (ppm)"
        nutrients={results.filter(r => r.unit === 'ppm')}
        values={values}
        onChange={handleChange}
      />

      {/* Reference table */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tabela de Referência — Cafeeiro
        </p>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left px-3 py-2 font-semibold text-foreground">Nutriente</th>
                  <th className="text-center px-3 py-2 font-semibold text-red-500">Deficiente</th>
                  <th className="text-center px-3 py-2 font-semibold text-amber-500">Limiar</th>
                  <th className="text-center px-3 py-2 font-semibold text-emerald-500">Adequado</th>
                </tr>
              </thead>
              <tbody>
                {LEAF_REFERENCE.map((ref, i) => (
                  <tr key={ref.id} className={cn(i % 2 === 0 ? 'bg-card' : 'bg-secondary/50')}>
                    <td className="px-3 py-2 font-medium text-foreground">
                      {ref.symbol} ({ref.unit})
                    </td>
                    <td className="px-3 py-2 text-center text-muted-foreground">
                      {ref.deficientMax !== null ? `< ${ref.deficientMax}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-center text-muted-foreground">
                      {ref.thresholdValue}
                    </td>
                    <td className="px-3 py-2 text-center text-muted-foreground">
                      {ref.adequateMax !== null
                        ? `${ref.adequateMin} – ${ref.adequateMax}`
                        : ref.adequateMin > 0 ? `≥ ${ref.adequateMin}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recommendation Table */}
      <FoliarRecommendationTable />
    </div>
  );
}

function NutrientSection({
  title,
  subtitle,
  nutrients,
  values,
  onChange,
}: {
  title: string;
  subtitle: string;
  nutrients: (NutrientRef & { value: number | null; status: NutrientStatus })[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {nutrients.map(nutrient => (
          <NutrientInput
            key={nutrient.id}
            nutrient={nutrient}
            rawValue={values[nutrient.id] || ''}
            onChange={(val) => onChange(nutrient.id, val)}
          />
        ))}
      </div>
    </div>
  );
}

function NutrientInput({
  nutrient,
  rawValue,
  onChange,
}: {
  nutrient: NutrientRef & { value: number | null; status: NutrientStatus };
  rawValue: string;
  onChange: (value: string) => void;
}) {
  const config = STATUS_CONFIG[nutrient.status];
  const StatusIcon = config.icon;
  const hasValue = nutrient.status !== 'empty';

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all',
        hasValue ? config.className : 'bg-card border-border'
      )}
    >
      {/* Symbol badge */}
      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-foreground">{nutrient.symbol}</span>
      </div>

      {/* Name + reference */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground leading-tight">{nutrient.name}</p>
        <p className="text-[10px] text-muted-foreground">
          Ref: {nutrient.adequateMax !== null
            ? `${nutrient.adequateMin}–${nutrient.adequateMax}`
            : `≥ ${nutrient.adequateMin}`} {nutrient.unit}
        </p>
      </div>

      {/* Input */}
      <div className="flex items-center gap-1.5">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="—"
          value={rawValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 h-8 text-xs text-center px-1 bg-background"
        />
        {hasValue && (
          <StatusIcon className="w-4 h-4 shrink-0" />
        )}
      </div>
    </div>
  );
}
