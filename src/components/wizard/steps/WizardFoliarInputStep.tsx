import { useState, useCallback } from 'react';
import { 
  Camera, Upload, FileText, Leaf, AlertTriangle, Loader2, 
  ScanLine, Eye, FlaskConical
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useWizard, type WizardFoliarData } from '@/contexts/WizardContext';
import { 
  PHENOLOGICAL_STAGES, 
  CORN_FOLIAR_REFERENCE, 
  analyzeNutrients,
  type PhenologicalStage 
} from '@/data/cornFoliarReference';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WizardFoliarInputStepProps {
  onComplete?: () => void;
}

export function WizardFoliarInputStep({ onComplete }: WizardFoliarInputStepProps = {}) {
  const { wizardData, setFoliarData, goToNextStep } = useWizard();
  
  const handleComplete = () => {
    if (onComplete) onComplete();
    else goToNextStep();
  };

  const [mode, setMode] = useState<'visual' | 'laudo' | null>(wizardData.foliar?.mode || null);
  const [stage, setStage] = useState<PhenologicalStage>(wizardData.foliar?.phenologicalStage || 'V8');
  const [imagePreview, setImagePreview] = useState<string | null>(wizardData.foliar?.imagePreview || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAnalyzeImage = async () => {
    if (!imagePreview) return;
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-corn-leaf', {
        body: {
          imageBase64: imagePreview,
          mode: mode,
          phenologicalStage: stage,
        },
      });

      if (error) throw error;

      if (!data.identificado) {
        toast.error(data.motivo || 'Imagem não reconhecida');
        setIsAnalyzing(false);
        return;
      }

      if (data.modo === 'laudo' && data.valores) {
        const results = analyzeNutrients(data.valores);
        const foliarData: WizardFoliarData = {
          mode: 'laudo',
          phenologicalStage: stage,
          imagePreview,
          labValues: data.valores,
          analysisResults: results,
          visualDeficiencies: null,
          disclaimer: null,
          resumo: null,
        };
        setFoliarData(foliarData);
        toast.success('Laudo processado com sucesso!');
        handleComplete();
      } else if (data.modo === 'visual') {
        const foliarData: WizardFoliarData = {
          mode: 'visual',
          phenologicalStage: stage,
          imagePreview,
          labValues: null,
          analysisResults: null,
          visualDeficiencies: data.deficiencias || [],
          disclaimer: data.disclaimer || 'Diagnose visual é probabilística. Recomenda-se confirmação laboratorial.',
          resumo: data.resumo || '',
        };
        setFoliarData(foliarData);
        toast.success('Análise visual concluída!');
        handleComplete();
      }
    } catch (err) {
      console.error('Erro na análise foliar:', err);
      toast.error('Erro ao analisar imagem. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSubmit = () => {
    const values: Record<string, number> = {};
    Object.entries(manualValues).forEach(([key, val]) => {
      const num = parseFloat(val.replace(',', '.'));
      if (!isNaN(num)) values[key] = num;
    });

    if (Object.keys(values).length === 0) {
      toast.error('Preencha ao menos um nutriente');
      return;
    }

    const results = analyzeNutrients(values);
    const foliarData: WizardFoliarData = {
      mode: 'laudo',
      phenologicalStage: stage,
      imagePreview: null,
      labValues: values,
      analysisResults: results,
      visualDeficiencies: null,
      disclaimer: null,
      resumo: null,
    };
    setFoliarData(foliarData);
    toast.success('Valores processados!');
    handleComplete();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Análise Foliar</h2>
        <p className="text-muted-foreground">Análise inteligente da nutrição foliar do milho</p>
      </div>

      {/* Estádio Fenológico */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Leaf className="w-5 h-5 text-primary" />
            Estádio Fenológico
          </CardTitle>
          <CardDescription>Selecione o estádio atual da planta</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={stage} onValueChange={(v: PhenologicalStage) => setStage(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHENOLOGICAL_STAGES.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  <span className="font-medium">{s.label}</span>
                  <span className="text-muted-foreground ml-2">— {s.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {['VT', 'R1', 'R2', 'R3'].includes(stage) && (
            <Alert className="mt-3 border-warning bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm">
                Em estádios avançados (VT+), a correção foliar de macronutrientes pode ter baixo ROI. 
                Considere focar na próxima safra para N, P e K.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Seletor de Modo */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card 
          className={`card-elevated cursor-pointer transition-all hover:shadow-lg ${mode === 'visual' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setMode('visual')}
        >
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Eye className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Diagnose Visual</h3>
            <p className="text-sm text-muted-foreground">
              Tire uma foto da folha com sintomas. A IA identifica deficiências por padrões visuais.
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`card-elevated cursor-pointer transition-all hover:shadow-lg ${mode === 'laudo' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setMode('laudo')}
        >
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <ScanLine className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Laudo Laboratorial</h3>
            <p className="text-sm text-muted-foreground">
              Upload do laudo (PDF/foto) ou insira manualmente os valores da análise foliar.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload de Imagem (Visual ou Laudo OCR) */}
      {mode && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {mode === 'visual' ? <Camera className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
              {mode === 'visual' ? 'Foto da Folha' : 'Upload do Laudo'}
            </CardTitle>
            <CardDescription>
              {mode === 'visual' 
                ? 'Envie uma foto clara da folha com sintomas visíveis'
                : 'Envie a foto ou PDF do laudo, ou preencha os valores abaixo'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              {imagePreview ? (
                <div className="space-y-3">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-h-48 mx-auto rounded-lg object-contain"
                  />
                  <Button variant="outline" size="sm" onClick={() => setImagePreview(null)}>
                    Trocar imagem
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer space-y-2 block">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique ou arraste para enviar
                  </p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>

            {imagePreview && (
              <Button 
                onClick={handleAnalyzeImage} 
                disabled={isAnalyzing}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando com IA...
                  </>
                ) : (
                  <>
                    <FlaskConical className="w-4 h-4 mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>
            )}

            {/* Manual input for laudo mode */}
            {mode === 'laudo' && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Ou insira manualmente:</span>
                </div>
                
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(CORN_FOLIAR_REFERENCE).map(([nutrient, ref]) => (
                    <div key={nutrient} className="space-y-1">
                      <Label className="text-xs">
                        {nutrient} ({ref.unit})
                        <span className="text-muted-foreground ml-1">
                          [{ref.min}-{ref.max}]
                        </span>
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={`${ref.min}`}
                        value={manualValues[nutrient] || ''}
                        onChange={(e) => setManualValues(prev => ({
                          ...prev,
                          [nutrient]: e.target.value
                        }))}
                        className="input-agro h-9"
                      />
                    </div>
                  ))}
                </div>

                <Button onClick={handleManualSubmit} variant="outline" className="w-full">
                  <FlaskConical className="w-4 h-4 mr-2" />
                  Processar Valores Manuais
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
