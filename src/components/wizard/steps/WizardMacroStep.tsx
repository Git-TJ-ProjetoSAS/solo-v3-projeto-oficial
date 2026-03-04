import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useWizard } from '@/contexts/WizardContext';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Upload, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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
  observacoes?: string;
}

export function WizardMacroStep() {
  const { wizardData, setSoilData } = useWizard();

  const [formData, setFormData] = useState({
    ca: wizardData.soil?.ca?.toString() || '',
    mg: wizardData.soil?.mg?.toString() || '',
    k: wizardData.soil?.k?.toString() || '',
    hAl: wizardData.soil?.hAl?.toString() || '',
    p: wizardData.soil?.p?.toString() || '',
    mo: wizardData.soil?.mo?.toString() || '',
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Auto-save on change
  useEffect(() => {
    const ca = parseFloat(formData.ca) || 0;
    const mg = parseFloat(formData.mg) || 0;
    const k = parseFloat(formData.k) || 0;
    const hAl = parseFloat(formData.hAl) || 0;

    if (ca > 0 || mg > 0 || k > 0 || hAl > 0) {
      const kConverted = k / 391;
      const sb = ca + mg + kConverted;
      const ctc = sb + hAl;
      const vPercent = ctc > 0 ? (sb / ctc) * 100 : 0;

      setSoilData({
        ca,
        mg,
        k,
        hAl,
        p: parseFloat(formData.p) || wizardData.soil?.p || 0,
        mo: parseFloat(formData.mo) || wizardData.soil?.mo || 0,
        zn: wizardData.soil?.zn || 0,
        b: wizardData.soil?.b || 0,
        mn: wizardData.soil?.mn || 0,
        fe: wizardData.soil?.fe || 0,
        cu: wizardData.soil?.cu || 0,
        s: wizardData.soil?.s || 0,
        vPercent,
      });
    }
  }, [formData]);

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

      // Fill macro fields
      setFormData({
        ca: result.ca != null ? String(result.ca) : '',
        mg: result.mg != null ? String(result.mg) : '',
        k: result.k != null ? String(result.k) : '',
        hAl: result.hAl != null ? String(result.hAl) : '',
        p: result.p != null ? String(result.p) : '',
        mo: result.mo != null ? String(result.mo) : '',
      });

      // Also save micro values to wizard context if available
      const ca = result.ca || 0;
      const mg = result.mg || 0;
      const k = result.k || 0;
      const hAl = result.hAl || 0;
      const kConverted = k / 391;
      const sb = ca + mg + kConverted;
      const ctc = sb + hAl;
      const vPercent = ctc > 0 ? (sb / ctc) * 100 : 0;

      setSoilData({
        ca, mg, k, hAl,
        p: result.p || 0,
        mo: result.mo || 0,
        zn: result.zn || wizardData.soil?.zn || 0,
        b: result.b || wizardData.soil?.b || 0,
        mn: result.mn || wizardData.soil?.mn || 0,
        fe: result.fe || wizardData.soil?.fe || 0,
        cu: result.cu || wizardData.soil?.cu || 0,
        s: result.s || wizardData.soil?.s || 0,
        vPercent,
      });

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
  }, [setSoilData, wizardData.soil]);

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

  const fields = [
    { id: 'ca', label: 'Cálcio (Ca)', unit: 'cmolc/dm³', required: true },
    { id: 'mg', label: 'Magnésio (Mg)', unit: 'cmolc/dm³', required: true },
    { id: 'k', label: 'Potássio (K)', unit: 'mg/dm³', required: true },
    { id: 'hAl', label: 'H+Al', unit: 'cmolc/dm³', required: true },
    { id: 'p', label: 'Fósforo (P)', unit: 'mg/dm³', required: false },
    { id: 'mo', label: 'Matéria Orgânica', unit: 'g/dm³', required: false },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Preencha os Macronutrientes
        </h2>
        <p className="text-sm text-muted-foreground">
          Insira os valores manualmente ou envie uma foto do laudo
        </p>
      </div>

      {/* AI Upload Section */}
      <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Leitura automática com IA</span>
          {aiStatus === 'success' && (
            <CheckCircle2 className="h-4 w-4 text-success ml-auto" />
          )}
          {aiStatus === 'error' && (
            <AlertCircle className="h-4 w-4 text-destructive ml-auto" />
          )}
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
          Envie uma foto ou PDF do laudo de análise de solo. A IA irá extrair os valores automaticamente.
        </p>
      </div>

      {/* Manual fields */}
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="relative">
              <Input
                id={field.id}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData[field.id as keyof typeof formData]}
                onChange={handleInputChange(field.id)}
                className="pr-20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {field.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-secondary rounded-xl mt-6">
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">Dica:</span> Os campos marcados com * são obrigatórios para o cálculo do V%.
        </p>
      </div>
    </div>
  );
}
