import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCoffee } from '@/contexts/CoffeeContext';
import { estimateSoilTexture, type SoilTexture } from '@/contexts/CoffeeContext';
import { useSoilAnalyses, type DbSoilAnalysis } from '@/hooks/useSoilAnalyses';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Upload, Loader2, Sparkles, CheckCircle2, AlertCircle, HelpCircle, Layers, AlertTriangle, History, Save, Database, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AIResult {
  valido: boolean;
  ca?: number | null;
  mg?: number | null;
  k?: number | null;
  hAl?: number | null;
  p?: number | null;
  mo?: number | null;
  zn?: number | null;
  b?: number | null;
  mn?: number | null;
  fe?: number | null;
  cu?: number | null;
  s?: number | null;
  pRem?: number | null;
  observacoes?: string;
}

type NutrientLevel = 'empty' | 'critical' | 'attention' | 'good';

interface NutrientThreshold {
  critical: number;
  good: number;
  inverse?: boolean;
}

const MACRO_THRESHOLDS: Record<string, NutrientThreshold> = {
  ca:  { critical: 1.5, good: 3.0 },
  mg:  { critical: 0.5, good: 1.0 },
  k:   { critical: 60,  good: 120 },
  hAl: { critical: 5.0, good: 2.5, inverse: true },
  p:   { critical: 5,   good: 12 },
  mo:  { critical: 15,  good: 25 },
};

const MICRO_THRESHOLDS: Record<string, NutrientThreshold> = {
  zn: { critical: 0.5, good: 1.0 },
  b:  { critical: 0.2, good: 0.6 },
  mn: { critical: 2.0, good: 5.0 },
  fe: { critical: 2.0, good: 5.0 },
  cu: { critical: 0.2, good: 0.5 },
  s:  { critical: 5,   good: 10 },
};

function getNutrientLevel(value: string, threshold: NutrientThreshold): NutrientLevel {
  const num = parseFloat(value);
  if (!value || isNaN(num)) return 'empty';
  if (threshold.inverse) {
    if (num <= threshold.good) return 'good';
    if (num <= threshold.critical) return 'attention';
    return 'critical';
  }
  if (num >= threshold.good) return 'good';
  if (num >= threshold.critical) return 'attention';
  return 'critical';
}

const LEVEL_CONFIG: Record<Exclude<NutrientLevel, 'empty'>, { label: string; dotClass: string; bgClass: string }> = {
  critical: { label: 'Baixo', dotClass: 'bg-destructive', bgClass: 'border-destructive/30' },
  attention: { label: 'Atenção', dotClass: 'bg-warning', bgClass: 'border-warning/30' },
  good:     { label: 'Bom', dotClass: 'bg-success', bgClass: 'border-success/30' },
};

function LevelIndicator({ level }: { level: NutrientLevel }) {
  if (level === 'empty') return null;
  const config = LEVEL_CONFIG[level];
  return (
    <span className="inline-flex items-center gap-1 ml-auto">
      <span className={`h-2 w-2 rounded-full ${config.dotClass}`} />
      <span className="text-[10px] text-muted-foreground font-medium">{config.label}</span>
    </span>
  );
}

const TEXTURE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; tip: string }> = {
  arenosa: {
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-300 dark:border-amber-700',
    label: '🏜️ ARENOSA',
    tip: 'Solo arenoso exige mais parcelamento de adubo e atenção ao risco de lixiviação de Boro.',
  },
  media: {
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-300 dark:border-emerald-700',
    label: '🌱 MÉDIA',
    tip: 'Textura equilibrada. Mantenha a dose padrão de Fósforo e o parcelamento em 6 vezes.',
  },
  argilosa: {
    color: 'text-rose-700 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-300 dark:border-rose-700',
    label: '🧱 ARGILOSA',
    tip: 'Solo argiloso retém mais nutrientes. O parcelamento pode ser reduzido para 4 vezes.',
  },
};

export function CoffeeSoilAnalysisStep() {
  const { coffeeData, setSoilData } = useCoffee();
  const talhaoId = coffeeData.selectedTalhaoId || undefined;

  // DB integration
  const { analyses: dbAnalyses, loading: dbLoading, createAnalysis, deleteAnalysis } = useSoilAnalyses(talhaoId);

  const [macroData, setMacroData] = useState({
    ca: coffeeData.soil?.ca?.toString() || '',
    mg: coffeeData.soil?.mg?.toString() || '',
    k: coffeeData.soil?.k?.toString() || '',
    hAl: coffeeData.soil?.hAl?.toString() || '',
    p: coffeeData.soil?.p?.toString() || '',
    mo: coffeeData.soil?.mo?.toString() || '',
  });

  const [moUnit, setMoUnit] = useState<'g/dm³' | '%' | 'dag/kg'>(coffeeData.soil?.moUnit || 'g/dm³');

  const [microData, setMicroData] = useState({
    zn: coffeeData.soil?.zn?.toString() || '',
    b: coffeeData.soil?.b?.toString() || '',
    mn: coffeeData.soil?.mn?.toString() || '',
    fe: coffeeData.soil?.fe?.toString() || '',
    cu: coffeeData.soil?.cu?.toString() || '',
    s: coffeeData.soil?.s?.toString() || '',
  });

  const [texturaFonte, setTexturaFonte] = useState<'estimada' | 'informada' | 'p_rem'>(coffeeData.soil?.texturaFonte || 'estimada');
  const [texturaManual, setTexturaManual] = useState<SoilTexture>(coffeeData.soil?.texturaEstimada || 'media');
  const [pRem, setPRem] = useState('');
  const [granulometry, setGranulometry] = useState({
    argila: coffeeData.soil?.argila?.toString() || '',
    silte: coffeeData.soil?.silte?.toString() || '',
    areia: coffeeData.soil?.areia?.toString() || '',
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('macro');
  const [loadedFromDb, setLoadedFromDb] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load latest analysis from DB when talhão changes
  useEffect(() => {
    if (dbAnalyses.length > 0 && talhaoId && !loadedFromDb) {
      const latest = dbAnalyses[0]; // already sorted desc
      setMacroData({
        ca: latest.ca.toString(),
        mg: latest.mg.toString(),
        k: latest.k.toString(),
        hAl: latest.h_al.toString(),
        p: latest.p.toString(),
        mo: latest.mo.toString(),
      });
      setMicroData({
        zn: latest.zn.toString(),
        b: latest.b.toString(),
        mn: latest.mn.toString(),
        fe: latest.fe.toString(),
        cu: latest.cu.toString(),
        s: latest.s.toString(),
      });
      setTexturaFonte((latest.textura_fonte as 'estimada' | 'informada') || 'estimada');
      setTexturaManual((latest.textura as SoilTexture) || 'media');
      setGranulometry({
        argila: latest.argila?.toString() || '',
        silte: latest.silte?.toString() || '',
        areia: latest.areia?.toString() || '',
      });
      setLoadedFromDb(true);
      toast.info(`Análise carregada do talhão (${new Date(latest.created_at).toLocaleDateString('pt-BR')})`);
    }
  }, [dbAnalyses, talhaoId, loadedFromDb]);

  // Reset loaded flag when talhão changes
  useEffect(() => {
    setLoadedFromDb(false);
  }, [talhaoId]);

  const handleInputChange = (
    group: 'macro' | 'micro' | 'granulo',
    field: string
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      if (group === 'macro') {
        setMacroData(prev => ({ ...prev, [field]: value }));
      } else if (group === 'micro') {
        setMicroData(prev => ({ ...prev, [field]: value }));
      } else {
        setGranulometry(prev => ({ ...prev, [field]: value }));
      }
    }
  };

  const moInGdm3 = useMemo(() => {
    const rawMo = parseFloat(macroData.mo) || 0;
    if (moUnit === '%') return rawMo * 10;
    if (moUnit === 'dag/kg') return rawMo * 10;
    return rawMo;
  }, [macroData.mo, moUnit]);

  const computedTextura = useMemo((): SoilTexture => {
    if (texturaFonte === 'informada') return texturaManual;
    if (texturaFonte === 'p_rem') {
      const val = parseFloat(pRem) || 0;
      if (val <= 10) return 'arenosa';
      if (val <= 40) return 'media';
      return 'argilosa';
    }
    return estimateSoilTexture(moInGdm3);
  }, [texturaFonte, texturaManual, moInGdm3, pRem]);

  // Sync to context
  useEffect(() => {
    const ca = parseFloat(macroData.ca) || 0;
    const mg = parseFloat(macroData.mg) || 0;
    const k = parseFloat(macroData.k) || 0;
    const hAl = parseFloat(macroData.hAl) || 0;
    const kConverted = k / 391;
    const sb = ca + mg + kConverted;
    const ctc = sb + hAl;
    const vPercent = ctc > 0 ? (sb / ctc) * 100 : 0;

    setSoilData({
      ca, mg, k, hAl,
      p: parseFloat(macroData.p) || 0,
      mo: moInGdm3,
      moUnit,
      texturaEstimada: computedTextura,
      texturaFonte,
      argila: parseFloat(granulometry.argila) || null,
      silte: parseFloat(granulometry.silte) || null,
      areia: parseFloat(granulometry.areia) || null,
      zn: parseFloat(microData.zn) || 0,
      b: parseFloat(microData.b) || 0,
      mn: parseFloat(microData.mn) || 0,
      fe: parseFloat(microData.fe) || 0,
      cu: parseFloat(microData.cu) || 0,
      s: parseFloat(microData.s) || 0,
      vPercent,
    });
  }, [macroData, microData, moUnit, moInGdm3, computedTextura, texturaFonte, granulometry]);

  // Save to DB
  const handleSaveToDb = async () => {
    if (!talhaoId) {
      toast.error('Selecione um talhão na etapa anterior para salvar no histórico.');
      return;
    }
    const ca = parseFloat(macroData.ca) || 0;
    const mg = parseFloat(macroData.mg) || 0;
    const k = parseFloat(macroData.k) || 0;
    const hAl = parseFloat(macroData.hAl) || 0;
    const kConverted = k / 391;
    const sb = ca + mg + kConverted;
    const ctc = sb + hAl;
    const vPercent = ctc > 0 ? (sb / ctc) * 100 : 0;

    await createAnalysis({
      talhao_id: talhaoId,
      ca, mg, k,
      h_al: hAl,
      p: parseFloat(macroData.p) || 0,
      mo: moInGdm3,
      zn: parseFloat(microData.zn) || 0,
      b: parseFloat(microData.b) || 0,
      mn: parseFloat(microData.mn) || 0,
      fe: parseFloat(microData.fe) || 0,
      cu: parseFloat(microData.cu) || 0,
      s: parseFloat(microData.s) || 0,
      v_percent: vPercent,
      textura: computedTextura || 'media',
      textura_fonte: texturaFonte,
      argila: parseFloat(granulometry.argila) || null,
      silte: parseFloat(granulometry.silte) || null,
      areia: parseFloat(granulometry.areia) || null,
      notes: `Café ${coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica'}`,
    });
  };

  const loadAnalysis = (a: DbSoilAnalysis) => {
    setMacroData({
      ca: a.ca.toString(), mg: a.mg.toString(), k: a.k.toString(),
      hAl: a.h_al.toString(), p: a.p.toString(), mo: a.mo.toString(),
    });
    setMicroData({
      zn: a.zn.toString(), b: a.b.toString(), mn: a.mn.toString(),
      fe: a.fe.toString(), cu: a.cu.toString(), s: a.s.toString(),
    });
    setTexturaFonte((a.textura_fonte as 'estimada' | 'informada') || 'estimada');
    setTexturaManual((a.textura as SoilTexture) || 'media');
    setGranulometry({
      argila: a.argila?.toString() || '',
      silte: a.silte?.toString() || '',
      areia: a.areia?.toString() || '',
    });
    setActiveTab('macro');
    toast.success('Análise carregada');
  };

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

      const { data, error } = await supabase.functions.invoke('read-soil-analysis', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      const result = data as AIResult;
      if (!result.valido) {
        setAiStatus('error');
        toast.error('O documento não parece ser uma análise de solo válida.');
        return;
      }

      setMacroData({
        ca: result.ca != null ? String(result.ca) : '',
        mg: result.mg != null ? String(result.mg) : '',
        k: result.k != null ? String(result.k) : '',
        hAl: result.hAl != null ? String(result.hAl) : '',
        p: result.p != null ? String(result.p) : '',
        mo: result.mo != null ? String(result.mo) : '',
      });
      setMicroData({
        zn: result.zn != null ? String(result.zn) : '',
        b: result.b != null ? String(result.b) : '',
        mn: result.mn != null ? String(result.mn) : '',
        fe: result.fe != null ? String(result.fe) : '',
        cu: result.cu != null ? String(result.cu) : '',
        s: result.s != null ? String(result.s) : '',
      });

      // If AI extracted P-rem, auto-set texture source
      if (result.pRem != null && result.pRem > 0) {
        setPRem(String(result.pRem));
        setTexturaFonte('p_rem');
      }

      setAiStatus('success');
      toast.success('Valores extraídos com sucesso! Confira e ajuste se necessário.');
      if (result.observacoes) {
        setTimeout(() => toast.info(result.observacoes, { duration: 6000 }), 500);
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      setAiStatus('error');
      toast.error('Erro ao analisar o documento. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

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

  const macroFilledCount = Object.values(macroData).filter(v => v !== '').length;
  const microFilledCount = Object.values(microData).filter(v => v !== '').length;

  const getMacroCriticalCount = () =>
    Object.entries(macroData).filter(([id, val]) => {
      const t = MACRO_THRESHOLDS[id];
      return t && getNutrientLevel(val, t) === 'critical';
    }).length;

  const getMicroCriticalCount = () =>
    Object.entries(microData).filter(([id, val]) => {
      const t = MICRO_THRESHOLDS[id];
      return t && getNutrientLevel(val, t) === 'critical';
    }).length;

  const coffeeLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica';

  const macroFields = [
    { id: 'ca', label: 'Cálcio (Ca)', unit: 'cmolc/dm³', required: true },
    { id: 'mg', label: 'Magnésio (Mg)', unit: 'cmolc/dm³', required: true },
    { id: 'k', label: 'Potássio (K)', unit: 'mg/dm³', required: true },
    { id: 'hAl', label: 'H+Al', unit: 'cmolc/dm³', required: true },
    { id: 'p', label: 'Fósforo (P)', unit: 'mg/dm³', required: false },
  ];

  const microFields = [
    { id: 'zn', label: 'Zinco (Zn)', unit: 'mg/dm³', ideal: '> 1,0' },
    { id: 'b', label: 'Boro (B)', unit: 'mg/dm³', ideal: '> 0,6' },
    { id: 'mn', label: 'Manganês (Mn)', unit: 'mg/dm³', ideal: '> 5,0' },
    { id: 'fe', label: 'Ferro (Fe)', unit: 'mg/dm³', ideal: '> 5,0' },
    { id: 'cu', label: 'Cobre (Cu)', unit: 'mg/dm³', ideal: '> 0,5' },
    { id: 's', label: 'Enxofre (S)', unit: 'mg/dm³', ideal: '> 10' },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Análise de Solo — Café {coffeeLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          Insira os valores manualmente ou envie uma foto do laudo
        </p>
        {talhaoId && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-primary">
            <Database className="h-3.5 w-3.5" />
            <span>Vinculado ao talhão — análises salvas no histórico</span>
          </div>
        )}
      </div>

      {/* AI Upload Section */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Leitura automática com IA</span>
          {aiStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-success ml-auto" />}
          {aiStatus === 'error' && <AlertCircle className="h-4 w-4 text-destructive ml-auto" />}
        </div>
        {previewUrl && (
          <div className="relative w-full h-32 rounded-xl overflow-hidden bg-secondary">
            <img src={previewUrl} alt="Laudo" className="w-full h-full object-contain" />
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
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => cameraInputRef.current?.click()} disabled={isAnalyzing}>
            <Camera className="h-4 w-4" /> Câmera
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}>
            <Upload className="h-4 w-4" /> Arquivo
          </Button>
        </div>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileSelect} className="hidden" />
        <p className="text-[11px] text-muted-foreground leading-tight">
          Envie uma foto do laudo de análise de solo. A IA irá extrair os valores automaticamente.
        </p>
      </div>

      {/* Tabs for Macro / Micro / Textura / Histórico */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="macro" className="gap-1 text-xs">
            Macro
            {macroFilledCount > 0 && (
              <span className={`text-[10px] px-1 py-0.5 rounded-full font-medium ${
                getMacroCriticalCount() > 0 ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'
              }`}>{macroFilledCount}/6</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="micro" className="gap-1 text-xs">
            Micro
            {microFilledCount > 0 && (
              <span className={`text-[10px] px-1 py-0.5 rounded-full font-medium ${
                getMicroCriticalCount() > 0 ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'
              }`}>{microFilledCount}/6</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="textura" className="gap-1 text-xs">
            <Layers className="h-3.5 w-3.5" />
            Textura
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1 text-xs">
            <History className="h-3.5 w-3.5" />
            {dbAnalyses.length > 0 && (
              <span className="text-[10px] px-1 py-0.5 rounded-full font-medium bg-primary/20 text-primary">
                {dbAnalyses.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Macronutrientes */}
        <TabsContent value="macro" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {macroFields.map((field) => {
              const level = getNutrientLevel(macroData[field.id as keyof typeof macroData], MACRO_THRESHOLDS[field.id]);
              const borderClass = level !== 'empty' ? LEVEL_CONFIG[level].bgClass : '';
              return (
                <div key={field.id} className={`space-y-1.5 p-3 rounded-xl border transition-colors ${borderClass || 'border-border'}`}>
                  <div className="flex items-center">
                    <Label htmlFor={`macro-${field.id}`} className="text-sm">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <LevelIndicator level={level} />
                  </div>
                  <div className="relative">
                    <Input id={`macro-${field.id}`} type="text" inputMode="decimal" placeholder="0.00"
                      value={macroData[field.id as keyof typeof macroData]} onChange={handleInputChange('macro', field.id)} className="pr-20" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* M.O. field */}
          <div className="space-y-3">
            <div className="space-y-1.5 p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <Label htmlFor="macro-mo" className="text-sm">Matéria Orgânica (M.O.)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
                      <p className="font-semibold mb-1">Como sabemos a textura sem análise física?</p>
                      <p>A M.O. é usada para estimar a textura do solo. Arenosa &lt; 15 g/dm³, Média 15–30, Argilosa &gt; 30.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <LevelIndicator level={getNutrientLevel(macroData.mo, MACRO_THRESHOLDS.mo)} />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input id="macro-mo" type="text" inputMode="decimal" placeholder="0.00"
                    value={macroData.mo} onChange={handleInputChange('macro', 'mo')} className="pr-16" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{moUnit}</span>
                </div>
                <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                  {(['g/dm³', '%', 'dag/kg'] as const).map(u => (
                    <button key={u} type="button" onClick={() => setMoUnit(u)}
                      className={cn('px-2.5 py-1.5 text-xs font-medium transition-colors',
                        moUnit === u ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                      )}>{u}</button>
                  ))}
                </div>
              </div>
              {(moUnit === '%' || moUnit === 'dag/kg') && moInGdm3 > 0 && (
                <p className="text-[10px] text-muted-foreground">Convertido: {moInGdm3.toFixed(1)} g/dm³</p>
              )}
            </div>
          </div>

          <div className="p-3 bg-secondary rounded-xl">
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">Legenda:</span>{' '}
              <span className="inline-flex items-center gap-1 mr-2"><span className="h-2 w-2 rounded-full bg-success" /> Bom</span>
              <span className="inline-flex items-center gap-1 mr-2"><span className="h-2 w-2 rounded-full bg-warning" /> Atenção</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Baixo</span>
            </p>
          </div>
        </TabsContent>

        {/* Micronutrientes */}
        <TabsContent value="micro" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {microFields.map((field) => {
              const level = getNutrientLevel(microData[field.id as keyof typeof microData], MICRO_THRESHOLDS[field.id]);
              const borderClass = level !== 'empty' ? LEVEL_CONFIG[level].bgClass : '';
              return (
                <div key={field.id} className={`space-y-1.5 p-3 rounded-xl border transition-colors ${borderClass || 'border-border'}`}>
                  <div className="flex items-center">
                    <Label htmlFor={`micro-${field.id}`} className="text-sm">{field.label}</Label>
                    {level === 'empty' ? (
                      <span className="text-[10px] text-muted-foreground ml-auto">Ideal: {field.ideal}</span>
                    ) : (
                      <LevelIndicator level={level} />
                    )}
                  </div>
                  <div className="relative">
                    <Input id={`micro-${field.id}`} type="text" inputMode="decimal" placeholder="0.00"
                      value={microData[field.id as keyof typeof microData]} onChange={handleInputChange('micro', field.id)} className="pr-20" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 bg-secondary rounded-xl">
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">Legenda:</span>{' '}
              <span className="inline-flex items-center gap-1 mr-2"><span className="h-2 w-2 rounded-full bg-success" /> Bom</span>
              <span className="inline-flex items-center gap-1 mr-2"><span className="h-2 w-2 rounded-full bg-warning" /> Atenção</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Baixo</span>
            </p>
          </div>
        </TabsContent>

        {/* Textura do Solo */}
        <TabsContent value="textura" className="mt-4 space-y-4">
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Fonte da Textura</Label>
              <Select value={texturaFonte} onValueChange={(v) => setTexturaFonte(v as 'estimada' | 'informada' | 'p_rem')}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estimada">Estimada (pela M.O.)</SelectItem>
                  <SelectItem value="p_rem">Estimada (pelo P-rem)</SelectItem>
                  <SelectItem value="informada">Informada (pelo laudo / granulometria)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {texturaFonte === 'p_rem' && (
              <div className="space-y-1">
                <Label className="text-sm">P-rem (mg/L)</Label>
                <Input type="text" inputMode="decimal" placeholder="0"
                  value={pRem}
                  onChange={(e) => {
                    const v = e.target.value.replace(',', '.');
                    if (v === '' || /^\d*\.?\d*$/.test(v)) setPRem(v);
                  }} />
                <p className="text-xs text-muted-foreground">
                  Arenosa: 0–10 · Média: 10–40 · Argilosa: 40–60
                </p>
              </div>
            )}

            {texturaFonte === 'informada' && (
              <>
                <div>
                  <Label className="text-sm">Textura</Label>
                  <Select value={texturaManual || 'media'} onValueChange={(v) => setTexturaManual(v as SoilTexture)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arenosa">Arenosa (&lt; 15% argila)</SelectItem>
                      <SelectItem value="media">Média (15–35% argila)</SelectItem>
                      <SelectItem value="argilosa">Argilosa (&gt; 35% argila)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 grid-cols-3">
                  {[
                    { id: 'argila', label: 'Argila %' },
                    { id: 'silte', label: 'Silte %' },
                    { id: 'areia', label: 'Areia %' },
                  ].map(({ id, label }) => (
                    <div key={id} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input type="text" inputMode="decimal" placeholder="0"
                        value={granulometry[id as keyof typeof granulometry]}
                        onChange={handleInputChange('granulo', id)} />
                    </div>
                  ))}
                </div>

                {(() => {
                  const sum = (parseFloat(granulometry.argila) || 0) + (parseFloat(granulometry.silte) || 0) + (parseFloat(granulometry.areia) || 0);
                  if (sum > 0 && Math.abs(sum - 100) > 2) {
                    return (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Soma da granulometria: {sum.toFixed(1)}% (deveria ser ~100%)
                      </p>
                    );
                  }
                  return null;
                })()}
              </>
            )}

            {/* Texture result card */}
            {computedTextura && TEXTURE_CONFIG[computedTextura] && (
              <div className={cn('p-4 rounded-2xl border-2 space-y-2', TEXTURE_CONFIG[computedTextura].bg, TEXTURE_CONFIG[computedTextura].border)}
                style={{ animation: 'scale-in 0.3s ease-out' }}>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Textura {texturaFonte === 'estimada' ? 'Estimada (MO)' : texturaFonte === 'p_rem' ? 'Estimada (P-rem)' : 'Informada'}
                  </span>
                </div>
                <p className={cn('text-lg font-bold', TEXTURE_CONFIG[computedTextura].color)}>
                  {TEXTURE_CONFIG[computedTextura].label}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {TEXTURE_CONFIG[computedTextura].tip}
                </p>
                {computedTextura === 'arenosa' && (
                  <div className="flex items-start gap-2 mt-1 p-2 rounded-lg bg-amber-100/50 dark:bg-amber-900/30">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      ⚠️ Risco de Lixiviação de Boro. Parcelamento recomendado: 8 a 10 vezes.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Histórico de Análises */}
        <TabsContent value="historico" className="mt-4 space-y-4">
          {!talhaoId ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Selecione um talhão para ver o histórico de análises.</p>
            </div>
          ) : dbLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando histórico...</span>
            </div>
          ) : dbAnalyses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhuma análise salva para este talhão.</p>
              <p className="text-xs mt-1">Preencha os dados e salve para iniciar o histórico.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {dbAnalyses.map((a, i) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30 text-sm">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        #{dbAnalyses.length - i}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full',
                        a.textura === 'arenosa' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
                        a.textura === 'media' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
                        a.textura === 'argilosa' && 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
                      )}>
                        {a.textura}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      V% <span className={a.v_percent >= 60 ? 'text-success font-medium' : 'text-warning font-medium'}>
                        {a.v_percent.toFixed(1)}
                      </span>
                      {' · '}Ca {a.ca} · Mg {a.mg} · K {a.k} · P {a.p}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadAnalysis(a)} title="Carregar">
                      <Upload className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAnalysis(a.id)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Save to DB button */}
      {talhaoId && (parseFloat(macroData.ca) > 0 || parseFloat(macroData.mg) > 0) && (
        <Button variant="outline" className="w-full gap-2" onClick={handleSaveToDb}>
          <Save className="h-4 w-4" />
          Salvar Análise no Histórico do Talhão
        </Button>
      )}

      {/* Inline V% Result */}
      {coffeeData.soil && (parseFloat(macroData.ca) > 0 || parseFloat(macroData.mg) > 0) && (() => {
        const soil = coffeeData.soil!;
        const kConverted = soil.k / 391;
        const sb = soil.ca + soil.mg + kConverted;
        const ctc = sb + soil.hAl;
        const isIdeal = soil.vPercent >= 60 && soil.vPercent <= 70;
        const needsCorrection = soil.vPercent < 60;

        return (
          <div className="space-y-4" style={{ animation: 'scale-in 0.3s ease-out' }}>
            <div className="p-6 rounded-2xl text-center bg-secondary">
              <div className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center mx-auto mb-3">
                {needsCorrection ? (
                  <AlertTriangle className="w-6 h-6 text-background" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-background" />
                )}
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{soil.vPercent.toFixed(1)}%</p>
              <p className="text-sm font-medium text-foreground">
                {needsCorrection ? 'Correção Recomendada' : isIdeal ? 'Saturação Ideal' : 'Saturação Adequada'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">V% ideal para café: entre 60% e 70%</p>
              {computedTextura && (
                <p className="text-xs text-muted-foreground mt-1">
                  Textura: <span className="font-medium text-foreground">{computedTextura}</span>
                  {' '}({texturaFonte})
                </p>
              )}
            </div>
            <div className="grid gap-3 grid-cols-2">
              <div className="p-3 bg-secondary rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Fórmulas</p>
                <div className="space-y-1 text-xs">
                  <p><span className="font-medium">SB</span> = {sb.toFixed(2)}</p>
                  <p><span className="font-medium">CTC</span> = {ctc.toFixed(2)}</p>
                </div>
              </div>
              <div className="p-3 bg-secondary rounded-xl">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Valores</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <p><span className="text-muted-foreground">Ca:</span> {soil.ca}</p>
                  <p><span className="text-muted-foreground">Mg:</span> {soil.mg}</p>
                  <p><span className="text-muted-foreground">K:</span> {soil.k}</p>
                  <p><span className="text-muted-foreground">H+Al:</span> {soil.hAl}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
