import { useState, useRef, useMemo, useEffect } from 'react';
import { AlertTriangle, Beaker, CheckCircle2, Info, Leaf, Camera, Upload, Loader2, Sparkles, History, Pencil, Mountain, Trash2, TrendingUp, TrendingDown, Minus, FileDown } from 'lucide-react';
import { useFarmData } from '@/hooks/useFarmData';
import { useSoilAnalyses, type DbSoilAnalysis } from '@/hooks/useSoilAnalyses';
import { useTalhoes } from '@/hooks/useTalhoes';
import { useUserProfile } from '@/hooks/useUserProfile';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SoilHistoryTab } from '@/components/soil/SoilHistoryTab';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { estimarTextura, estimarTexturaPorPrem, TEXTURA_LABELS, type SoilTexture, type TexturaFonte } from '@/types/farm';
import { SoilPdfHeader, SoilPdfFooter } from '@/components/soil/SoilPdfHeaderFooter';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';

export default function SoilAnalysis() {
  const { selectedFarm, addSoilAnalysis, deleteSoilAnalysis, updateSoilAnalysis, getSelectedFarmSoilAnalyses } = useFarmData();
  const { talhoes } = useTalhoes();
  const { profile } = useUserProfile();
  
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string>('');
  const { analyses: dbAnalyses, loading: dbLoading, createAnalysis, updateAnalysis, deleteAnalysis } = useSoilAnalyses(selectedTalhaoId || undefined);

  const [formData, setFormData] = useState({
    ca: '', mg: '', k: '', hAl: '', p: '', mo: '',
    zn: '', b: '', mn: '', fe: '', cu: '', s: '',
    argila: '', silte: '', areia: '',
  });

  const [texturaFonte, setTexturaFonte] = useState<TexturaFonte>('estimada');
  const [texturaManual, setTexturaManual] = useState<SoilTexture>('media');
  const [pRem, setPRem] = useState('');
  
  const [result, setResult] = useState<{vPercent: number; saved: boolean} | null>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [lastSavedKey, setLastSavedKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('nova');

  const analyses = getSelectedFarmSoilAnalyses();

  // Computed texture
  const computedTextura = useMemo((): SoilTexture => {
    if (texturaFonte === 'informada') return texturaManual;
    if (texturaFonte === 'p_rem') return estimarTexturaPorPrem(parseFloat(pRem) || 0);
    const mo = parseFloat(formData.mo) || 0;
    return estimarTextura(mo);
  }, [texturaFonte, texturaManual, formData.mo, pRem]);

  const processImage = async (file: File) => {
    setAiStatus('analyzing');
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('read-soil-analysis', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      if (!data?.valido) throw new Error('Documento não reconhecido como análise de solo');

      setFormData({
        ca: data.ca?.toString() || '',
        mg: data.mg?.toString() || '',
        k: data.k?.toString() || '',
        hAl: data.hAl?.toString() || '',
        p: data.p?.toString() || '',
        mo: data.mo?.toString() || '',
        zn: data.zn?.toString() || '',
        b: data.b?.toString() || '',
        mn: data.mn?.toString() || '',
        fe: data.fe?.toString() || '',
        cu: data.cu?.toString() || '',
        s: data.s?.toString() || '',
        argila: data.argila?.toString() || '',
        silte: data.silte?.toString() || '',
        areia: data.areia?.toString() || '',
      });

      // If AI extracted P-rem, set texture source to p_rem
      if (data.pRem != null && data.pRem > 0) {
        setPRem(data.pRem.toString());
        setTexturaFonte('p_rem');
      }
      // If AI extracted granulometry, set as 'informada'
      else if (data.argila || data.areia) {
        setTexturaFonte('informada');
        if (data.argila > 35) setTexturaManual('argilosa');
        else if (data.argila < 15) setTexturaManual('arenosa');
        else setTexturaManual('media');
      }

      setAiStatus('success');
      toast.success('Análise extraída com sucesso!');
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      setAiStatus('error');
      toast.error('Não foi possível extrair os dados. Preencha manualmente.');
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [field]: value }));
      setResult(null);
    }
  };

  const calculateVPercent = () => {
    const ca = parseFloat(formData.ca) || 0;
    const mg = parseFloat(formData.mg) || 0;
    const kMg = parseFloat(formData.k) || 0;
    const hAl = parseFloat(formData.hAl) || 0;
    const k = kMg / 391;
    const sb = ca + mg + k;
    const ctc = sb + hAl;
    const vPercent = ctc > 0 ? (sb / ctc) * 100 : 0;
    return vPercent;
  };

  const buildAnalysisData = (vPercent: number) => ({
    farmId: selectedFarm!.id,
    ca: parseFloat(formData.ca) || 0,
    mg: parseFloat(formData.mg) || 0,
    k: parseFloat(formData.k) || 0,
    hAl: parseFloat(formData.hAl) || 0,
    p: parseFloat(formData.p) || 0,
    mo: parseFloat(formData.mo) || 0,
    zn: parseFloat(formData.zn) || 0,
    b: parseFloat(formData.b) || 0,
    mn: parseFloat(formData.mn) || 0,
    fe: parseFloat(formData.fe) || 0,
    cu: parseFloat(formData.cu) || 0,
    s: parseFloat(formData.s) || 0,
    textura: computedTextura,
    texturaFonte: texturaFonte,
    argila: parseFloat(formData.argila) || undefined,
    silte: parseFloat(formData.silte) || undefined,
    areia: parseFloat(formData.areia) || undefined,
    vPercent,
  });

  const handleClear = () => {
    setFormData({ 
      ca: '', mg: '', k: '', hAl: '', p: '', mo: '',
      zn: '', b: '', mn: '', fe: '', cu: '', s: '',
      argila: '', silte: '', areia: '',
    });
    setResult(null);
    setLastSavedKey(null);
    setEditingId(null);
    setTexturaFonte('estimada');
    setTexturaManual('media');
  };

  const handleEdit = (analysis: import('@/types/farm').SoilAnalysis) => {
    setFormData({
      ca: analysis.ca.toString(),
      mg: analysis.mg.toString(),
      k: analysis.k.toString(),
      hAl: analysis.hAl.toString(),
      p: analysis.p.toString(),
      mo: analysis.mo.toString(),
      zn: analysis.zn.toString(),
      b: analysis.b.toString(),
      mn: analysis.mn.toString(),
      fe: analysis.fe.toString(),
      cu: analysis.cu.toString(),
      s: analysis.s.toString(),
      argila: analysis.argila?.toString() || '',
      silte: analysis.silte?.toString() || '',
      areia: analysis.areia?.toString() || '',
    });
    setTexturaFonte(analysis.texturaFonte || 'estimada');
    setTexturaManual(analysis.textura || 'media');
    setEditingId(analysis.id);
    setLastSavedKey(`${analysis.ca}-${analysis.mg}-${analysis.k}-${analysis.hAl}-${analysis.p}-${analysis.mo}-${analysis.zn}-${analysis.b}-${analysis.mn}-${analysis.fe}-${analysis.cu}-${analysis.s}`);
    setActiveTab('nova');
    toast.info('Editando análise. Altere os valores e salve.');
  };

  const isFormValid = formData.ca && formData.mg && formData.k && formData.hAl;

  const liveVPercent = useMemo(() => {
    if (!isFormValid) return null;
    return calculateVPercent();
  }, [formData.ca, formData.mg, formData.k, formData.hAl]);

  // Auto-save (localStorage)
  useEffect(() => {
    if (!selectedFarm || liveVPercent === null) return;
    const key = `${formData.ca}-${formData.mg}-${formData.k}-${formData.hAl}-${formData.p}-${formData.mo}-${formData.zn}-${formData.b}-${formData.mn}-${formData.fe}-${formData.cu}-${formData.s}`;
    if (key === lastSavedKey) return;

    const timeout = setTimeout(() => {
      const data = buildAnalysisData(liveVPercent);
      if (editingId) {
        updateSoilAnalysis(editingId, data);
        toast.success('Análise atualizada');
      } else {
        addSoilAnalysis(data);
        toast.success('Análise salva automaticamente no histórico');
      }
      setLastSavedKey(key);

      // Also save to DB if talhão selected
      if (selectedTalhaoId) {
        const dbData = {
          talhao_id: selectedTalhaoId,
          ca: data.ca,
          mg: data.mg,
          k: data.k,
          h_al: data.hAl,
          p: data.p,
          mo: data.mo,
          zn: data.zn,
          b: data.b,
          mn: data.mn,
          fe: data.fe,
          cu: data.cu,
          s: data.s,
          v_percent: liveVPercent,
          textura: computedTextura,
          textura_fonte: texturaFonte,
          argila: parseFloat(formData.argila) || null,
          silte: parseFloat(formData.silte) || null,
          areia: parseFloat(formData.areia) || null,
          notes: '',
        };
        createAnalysis(dbData);
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [formData, liveVPercent, selectedFarm, lastSavedKey, editingId]);

  if (!selectedFarm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <Beaker className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Selecione uma fazenda para realizar a análise de solo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Calculadora de Solo"
        description="Calcule a Saturação por Bases (V%) e acompanhe a evolução nutricional"
      />

      {/* Talhão selector */}
      {talhoes.length > 0 && (
        <div className="card-elevated p-4">
          <Label className="text-sm font-medium mb-2 block">Vincular a um Talhão (opcional)</Label>
          <Select value={selectedTalhaoId} onValueChange={setSelectedTalhaoId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um talhão para vincular" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum (salvar apenas local)</SelectItem>
              {talhoes.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name} ({t.area_ha} ha)</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTalhaoId && (
            <p className="text-xs text-muted-foreground mt-1">
              A análise será salva no histórico do talhão para comparativo evolutivo.
            </p>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="nova" className="flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            {editingId ? 'Editando' : 'Nova'}
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico
            {analyses.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {analyses.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="evolucao" className="flex items-center gap-2">
            <Mountain className="w-4 h-4" />
            Evolução
            {dbAnalyses.length > 0 && (
              <span className="ml-1 text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
                {dbAnalyses.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nova">
          <div className="grid gap-6 lg:grid-cols-2 mt-4">
            <div className="space-y-6">
              {/* AI Reader */}
              <div className="card-elevated p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Leitura Automática com IA</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Tire uma foto ou envie um arquivo do laudo de análise de solo para preencher automaticamente.
                </p>

                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])} />
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden"
                  onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])} />

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => cameraInputRef.current?.click()} disabled={aiStatus === 'analyzing'}>
                    <Camera className="w-4 h-4 mr-2" /> Câmera
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()} disabled={aiStatus === 'analyzing'}>
                    <Upload className="w-4 h-4 mr-2" /> Arquivo
                  </Button>
                </div>

                {aiStatus === 'analyzing' && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Analisando laudo...
                  </div>
                )}
                {previewUrl && (
                  <div className="mt-4">
                    <img src={previewUrl} alt="Preview do laudo" className="w-full max-h-48 object-contain rounded-lg border border-border" />
                  </div>
                )}
                {aiStatus === 'success' && (
                  <Alert className="mt-4 border-success bg-success/5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">Valores extraídos com sucesso! Confira e ajuste se necessário.</AlertDescription>
                  </Alert>
                )}
                {aiStatus === 'error' && (
                  <Alert className="mt-4 border-destructive bg-destructive/5">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">Não foi possível extrair os dados. Preencha manualmente.</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Macronutrientes */}
              <div className="card-elevated p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Beaker className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Macronutrientes</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { id: 'ca', label: 'Cálcio (Ca) - cmolc/dm³' },
                    { id: 'mg', label: 'Magnésio (Mg) - cmolc/dm³' },
                    { id: 'k', label: 'Potássio (K) - mg/dm³' },
                    { id: 'hAl', label: 'H+Al - cmolc/dm³' },
                    { id: 'p', label: 'Fósforo (P) - mg/dm³' },
                    { id: 'mo', label: 'Matéria Orgânica (MO) - g/dm³' },
                  ].map(({ id, label }) => (
                    <div key={id} className="space-y-2">
                      <Label htmlFor={id}>{label}</Label>
                      <Input id={id} type="text" inputMode="decimal" placeholder="0.00"
                        value={(formData as any)[id]} onChange={handleInputChange(id)} className="input-agro" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Textura do Solo */}
              <div className="card-elevated p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Mountain className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-semibold text-foreground">Textura do Solo</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm">Fonte da Textura</Label>
                    <Select value={texturaFonte} onValueChange={(v) => setTexturaFonte(v as TexturaFonte)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estimada">Estimada (pela MO)</SelectItem>
                        <SelectItem value="p_rem">Estimada (pelo P-rem)</SelectItem>
                        <SelectItem value="informada">Informada (pelo laudo)</SelectItem>
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
                        }}
                        className="input-agro" />
                      <p className="text-xs text-muted-foreground">
                        Arenosa: 0–10 · Média: 10–40 · Argilosa: 40–60
                      </p>
                    </div>
                  )}

                  {texturaFonte === 'informada' && (
                    <>
                      <div>
                        <Label className="text-sm">Textura</Label>
                        <Select value={texturaManual} onValueChange={(v) => setTexturaManual(v as SoilTexture)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="arenosa">Arenosa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="argilosa">Argilosa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-3 grid-cols-3">
                        {[
                          { id: 'argila', label: 'Argila (%)' },
                          { id: 'silte', label: 'Silte (%)' },
                          { id: 'areia', label: 'Areia (%)' },
                        ].map(({ id, label }) => (
                          <div key={id} className="space-y-1">
                            <Label className="text-xs">{label}</Label>
                            <Input type="text" inputMode="decimal" placeholder="0"
                              value={(formData as any)[id]} onChange={handleInputChange(id)} className="input-agro" />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Display computed texture */}
                  <div className={cn(
                    "p-3 rounded-lg text-center",
                    computedTextura === 'arenosa' && "bg-amber-100 dark:bg-amber-900/30",
                    computedTextura === 'media' && "bg-emerald-100 dark:bg-emerald-900/30",
                    computedTextura === 'argilosa' && "bg-red-100 dark:bg-red-900/30",
                  )}>
                    <p className="text-xs text-muted-foreground">
                      {texturaFonte === 'estimada' ? 'Textura Estimada (MO)' : texturaFonte === 'p_rem' ? 'Textura Estimada (P-rem)' : 'Textura Informada'}
                    </p>
                    <p className="text-lg font-bold text-foreground">{TEXTURA_LABELS[computedTextura]}</p>
                    {texturaFonte === 'estimada' && formData.mo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        MO = {formData.mo} g/dm³ → {parseFloat(formData.mo) < 15 ? '< 15' : parseFloat(formData.mo) > 30 ? '> 30' : '15-30'}
                      </p>
                    )}
                    {texturaFonte === 'p_rem' && pRem && (
                      <p className="text-xs text-muted-foreground mt-1">
                        P-rem = {pRem} mg/L → {parseFloat(pRem) <= 10 ? '≤ 10' : parseFloat(pRem) <= 40 ? '10–40' : '> 40'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Micronutrientes */}
              <div className="card-elevated p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Leaf className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-foreground">Micronutrientes</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { id: 'zn', label: 'Zinco (Zn) - mg/dm³' },
                    { id: 'b', label: 'Boro (B) - mg/dm³' },
                    { id: 'mn', label: 'Manganês (Mn) - mg/dm³' },
                    { id: 'fe', label: 'Ferro (Fe) - mg/dm³' },
                    { id: 'cu', label: 'Cobre (Cu) - mg/dm³' },
                  ].map(({ id, label }) => (
                    <div key={id} className="space-y-2">
                      <Label htmlFor={id}>{label}</Label>
                      <Input id={id} type="text" inputMode="decimal" placeholder="0.00"
                        value={(formData as any)[id]} onChange={handleInputChange(id)} className="input-agro" />
                    </div>
                  ))}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="s">Enxofre (S) - mg/dm³</Label>
                    <Input id="s" type="text" inputMode="decimal" placeholder="0.00"
                      value={formData.s} onChange={handleInputChange('s')} className="input-agro" />
                  </div>
                </div>
              </div>

              {editingId && (
                <Alert className="border-primary bg-primary/5">
                  <Pencil className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-primary">
                    Editando análise existente. As alterações serão salvas automaticamente.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClear} className="flex-1">
                  {editingId ? 'Cancelar Edição' : 'Limpar'}
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {liveVPercent !== null && (
                <Alert className={cn("animate-fade-in", liveVPercent >= 60 ? "border-success bg-success/5" : "border-warning bg-warning/5")}>
                  {liveVPercent >= 60 ? <CheckCircle2 className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-warning" />}
                  <AlertTitle className="text-lg font-bold">V% = {liveVPercent.toFixed(2)}%</AlertTitle>
                  <AlertDescription>
                    {liveVPercent >= 60 
                      ? 'Saturação por bases adequada para a cultura do milho (≥60%).'
                      : 'Atenção: V% abaixo do ideal para milho. Recomenda-se calagem para elevar a saturação para 60-70%.'}
                  </AlertDescription>
                </Alert>
              )}

              <div className="card-elevated p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Fórmulas e Referências</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p><strong>SB (Soma de Bases)</strong> = Ca + Mg + K</p>
                  <p><strong>CTC (Capacidade de Troca Catiônica)</strong> = SB + H+Al</p>
                  <p><strong>V% (Saturação por Bases)</strong> = (SB / CTC) × 100</p>
                  <div className="mt-4 p-3 bg-primary/5 rounded-lg space-y-2">
                    <p className="text-primary font-medium">Para milho, o V% ideal é entre 60% e 70%</p>
                    <p className="text-accent font-medium">Matéria Orgânica ideal: &gt; 25 g/dm³</p>
                  </div>
                </div>
              </div>

              <div className="card-elevated p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Mountain className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-semibold text-foreground">Referência de Textura</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Arenosa', value: 'MO < 15 g/dm³', desc: 'Maior risco de lixiviação' },
                    { label: 'Média', value: 'MO 15-30 g/dm³', desc: 'Equilíbrio entre retenção e drenagem' },
                    { label: 'Argilosa', value: 'MO > 30 g/dm³', desc: 'Maior CTC e retenção de nutrientes' },
                  ].map(({ label, value, desc }, i, arr) => (
                    <div key={label} className={cn("flex justify-between items-center py-2", i < arr.length - 1 && "border-b border-border")}>
                      <div>
                        <span className="font-medium text-foreground">{label}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {desc}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-elevated p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Leaf className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-foreground">Níveis Adequados - Micronutrientes</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Zinco (Zn)', value: '> 1,0 mg/dm³' },
                    { label: 'Boro (B)', value: '> 0,3 mg/dm³' },
                    { label: 'Manganês (Mn)', value: '> 5,0 mg/dm³' },
                    { label: 'Ferro (Fe)', value: '> 5,0 mg/dm³' },
                    { label: 'Cobre (Cu)', value: '> 0,5 mg/dm³' },
                    { label: 'Enxofre (S)', value: '> 10 mg/dm³' },
                  ].map(({ label, value }, i, arr) => (
                    <div key={label} className={cn("flex justify-between py-1.5", i < arr.length - 1 && "border-b border-border")}>
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <div className="mt-4">
            <SoilHistoryTab analyses={analyses} onDelete={deleteSoilAnalysis} onEdit={handleEdit} consultorName={profile?.full_name} creaArt={profile?.crea_art} />
          </div>
        </TabsContent>

        <TabsContent value="evolucao">
          <div className="mt-4">
            {!selectedTalhaoId ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Mountain className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Selecione um talhão acima para ver o histórico de evolução.</p>
              </div>
            ) : dbLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : dbAnalyses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Mountain className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma análise registrada para este talhão.</p>
                <p className="text-sm text-muted-foreground">Salve uma análise com o talhão selecionado para começar o histórico.</p>
              </div>
            ) : (
              <TalhaoSoilEvolution analyses={dbAnalyses} onDelete={deleteAnalysis} talhaoName={talhoes.find(t => t.id === selectedTalhaoId)?.name} consultorName={profile?.full_name} creaArt={profile?.crea_art} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Talhão Soil Evolution Sub-component ----

function TalhaoSoilEvolution({ analyses, onDelete, talhaoName, consultorName, creaArt }: { analyses: DbSoilAnalysis[]; onDelete: (id: string) => void; talhaoName?: string; consultorName?: string | null; creaArt?: string | null }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const sorted = useMemo(() => [...analyses].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ), [analyses]);

  const chartData = useMemo(() =>
    sorted.map((a, i) => ({
      name: new Date(a.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      vPercent: Number(Number(a.v_percent).toFixed(1)),
      Ca: Number(a.ca),
      Mg: Number(a.mg),
      P: Number(a.p),
      MO: Number(a.mo),
      textura: a.textura,
    }))
  , [sorted]);

  const microData = useMemo(() =>
    sorted.map((a, i) => ({
      name: new Date(a.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      Zn: Number(a.zn),
      B: Number(a.b),
      Cu: Number(a.cu),
      Mn: Number(a.mn),
      Fe: Number(a.fe),
      S: Number(a.s),
    }))
  , [sorted]);

  const getTrend = (key: keyof DbSoilAnalysis) => {
    if (sorted.length < 2) return null;
    const last = Number(sorted[sorted.length - 1][key]) || 0;
    const prev = Number(sorted[sorted.length - 2][key]) || 0;
    if (last > prev) return 'up';
    if (last < prev) return 'down';
    return 'stable';
  };

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

      const label = talhaoName || 'talhao';
      pdf.save(`evolucao-solo-${label.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
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
          Evolução do V% por Análise
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis domain={[0, 100]} fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="vPercent" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} name="V%" />
              <Line type="monotone" dataKey={() => 60} stroke="hsl(var(--success))" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Ideal (60%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Macro Evolution */}
      {sorted.length >= 2 && (
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Evolução de Macronutrientes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="Ca" stroke="#f59e0b" strokeWidth={2} name="Ca" />
                <Line type="monotone" dataKey="Mg" stroke="#10b981" strokeWidth={2} name="Mg" />
                <Line type="monotone" dataKey="P" stroke="#6366f1" strokeWidth={2} name="P" />
                <Line type="monotone" dataKey="MO" stroke="#ec4899" strokeWidth={2} name="MO" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Micro Evolution */}
      {sorted.length >= 2 && (
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Evolução de Micronutrientes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={microData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="Zn" fill="#8b5cf6" name="Zn" />
                <Bar dataKey="B" fill="#06b6d4" name="B" />
                <Bar dataKey="Cu" fill="#f97316" name="Cu" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Trend Indicators */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Tendências</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { key: 'v_percent' as keyof DbSoilAnalysis, label: 'V%' },
            { key: 'ca' as keyof DbSoilAnalysis, label: 'Ca' },
            { key: 'mg' as keyof DbSoilAnalysis, label: 'Mg' },
            { key: 'p' as keyof DbSoilAnalysis, label: 'P' },
            { key: 'mo' as keyof DbSoilAnalysis, label: 'MO' },
            { key: 'zn' as keyof DbSoilAnalysis, label: 'Zn' },
            { key: 'b' as keyof DbSoilAnalysis, label: 'B' },
            { key: 'mn' as keyof DbSoilAnalysis, label: 'Mn' },
            { key: 'cu' as keyof DbSoilAnalysis, label: 'Cu' },
            { key: 's' as keyof DbSoilAnalysis, label: 'S' },
          ].map(({ key, label }) => {
            const trend = getTrend(key);
            const latest = sorted[sorted.length - 1];
            const val = Number(latest[key]);
            return (
              <div key={key} className="p-3 rounded-lg bg-secondary/30 text-center">
                <span className="text-xs text-muted-foreground block">{label}</span>
                <span className="text-sm font-semibold">{val.toFixed(1)}</span>
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

      {/* Texture Evolution */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Mountain className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          Textura ao Longo do Tempo
        </h3>
        <div className="flex gap-2 flex-wrap">
          {sorted.map((a, i) => (
            <div key={a.id} className={cn(
              "px-3 py-2 rounded-lg text-center text-xs",
              a.textura === 'arenosa' && "bg-amber-100 dark:bg-amber-900/30",
              a.textura === 'media' && "bg-emerald-100 dark:bg-emerald-900/30",
              a.textura === 'argilosa' && "bg-red-100 dark:bg-red-900/30",
            )}>
              <p className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</p>
              <p className="font-semibold text-foreground">{TEXTURA_LABELS[a.textura as SoilTexture] || a.textura}</p>
              <p className="text-[10px] text-muted-foreground">{a.textura_fonte === 'informada' ? 'Laudo' : a.textura_fonte === 'p_rem' ? 'P-rem' : 'Estimada'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* History List */}
      <div className="card-elevated p-6">
        <h3 className="font-semibold text-foreground mb-4">Todas as Análises do Talhão</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sorted.slice().reverse().map((a, index) => (
            <div key={a.id} className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded-lg text-sm">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-muted-foreground">#{sorted.length - index}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(a.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  a.textura === 'arenosa' && "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
                  a.textura === 'media' && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
                  a.textura === 'argilosa' && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
                )}>
                  {TEXTURA_LABELS[a.textura as SoilTexture] || a.textura}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "font-medium",
                  Number(a.v_percent) >= 60 ? "text-success" : "text-warning"
                )}>
                  V% {Number(a.v_percent).toFixed(1)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(a.id)}
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
