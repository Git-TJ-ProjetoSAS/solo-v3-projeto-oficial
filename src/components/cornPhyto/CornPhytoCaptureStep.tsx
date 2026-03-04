import { useState, useRef } from 'react';
import { useCornPhyto } from '@/contexts/CornPhytoContext';
import { supabase } from '@/integrations/supabase/client';
import { findMatchingCornPest, getDefensivosForPest, getProductsForCornPest } from '@/data/cornPestDatabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Camera,
  Upload,
  Loader2,
  Sparkles,
  ArrowRight,
  Wheat,
  CloudRain,
  Sun,
  CloudDrizzle,
  ThermometerSun,
} from 'lucide-react';

const ESTADIOS = [
  { id: 'VE', label: 'VE — Emergência' },
  { id: 'V3_V5', label: 'V3-V5 — Definição' },
  { id: 'V6_V8', label: 'V6-V8 — Crescimento' },
  { id: 'VT', label: 'VT — Pendoamento' },
  { id: 'R1_R5', label: 'R1-R5 — Grão' },
];

const PARTES = [
  { id: 'terco-inferior', label: 'Terço Inferior' },
  { id: 'terco-medio', label: 'Terço Médio' },
  { id: 'terco-superior', label: 'Terço Superior / Cartucho' },
  { id: 'espiga', label: 'Espiga' },
  { id: 'colmo', label: 'Colmo' },
  { id: 'raiz', label: 'Raiz / Colo' },
];

const CLIMA_OPTIONS = [
  { id: 'chuva_intensa', label: 'Chuvas intensas', icon: CloudRain },
  { id: 'seca', label: 'Seca prolongada', icon: Sun },
  { id: 'chuva_moderada', label: 'Chuvas moderadas', icon: CloudDrizzle },
  { id: 'calor_umido', label: 'Calor + Umidade alta', icon: ThermometerSun },
];

export function CornPhytoCaptureStep() {
  const { data, setData, goToNextStep } = useCornPhyto();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setData(prev => ({ ...prev, imageBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const canProceed = data.imageBase64 && data.estadioFenologico && data.parteAfetada;

  const handleAnalyze = async () => {
    if (!canProceed) return;
    setIsAnalyzing(true);

    try {
      const { data: aiResult, error } = await supabase.functions.invoke('identify-corn-pest', {
        body: {
          imageBase64: data.imageBase64,
          estadioFenologico: ESTADIOS.find(e => e.id === data.estadioFenologico)?.label || data.estadioFenologico,
          parteAfetada: PARTES.find(p => p.id === data.parteAfetada)?.label || data.parteAfetada,
          climaRecente: CLIMA_OPTIONS.find(c => c.id === data.climaRecente)?.label || data.climaRecente,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Erro ao analisar a imagem. Tente novamente.');
        return;
      }

      if (aiResult?.error) {
        toast.error(aiResult.error);
        return;
      }

      const opcoes = aiResult.opcoes || [];
      const contextoAnalise = aiResult.contexto_analise || '';

      setData(prev => ({
        ...prev,
        opcoes,
        contextoAnalise,
        selectedOpcaoIndex: null,
        matchedPest: null,
        matchedDefensivos: [],
        matchedProducts: [],
        selectedProductId: null,
      }));

      goToNextStep();
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error('Erro de conexão. Verifique sua internet.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5" style={{ animation: 'fade-in 0.3s ease-out' }}>
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
          <Wheat className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Diagnóstico Fitossanitário</h2>
        <p className="text-sm text-muted-foreground">Milho Silagem — Foto + Contexto da Lavoura</p>
      </div>

      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

      {/* Photo capture */}
      {!data.imageBase64 ? (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => cameraRef.current?.click()}
            className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-secondary/20 hover:bg-secondary/40 transition-all flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Câmera</p>
              <p className="text-[10px] text-muted-foreground">Tirar foto agora</p>
            </div>
          </button>
          <button type="button" onClick={() => galleryRef.current?.click()}
            className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-secondary/20 hover:bg-secondary/40 transition-all flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Galeria</p>
              <p className="text-[10px] text-muted-foreground">Enviar da galeria</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-border">
          <img src={data.imageBase64} alt="Foto da lavoura" className="w-full max-h-48 object-cover" />
          <button type="button" onClick={() => setData(prev => ({ ...prev, imageBase64: null }))}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background text-muted-foreground text-xs font-bold">✕</button>
        </div>
      )}

      {/* Estádio Fenológico */}
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Estádio Fenológico *</p>
        <div className="grid grid-cols-2 gap-2">
          {ESTADIOS.map(e => (
            <button key={e.id} type="button" onClick={() => setData(prev => ({ ...prev, estadioFenologico: e.id }))}
              className={cn('p-3 rounded-xl border text-left text-sm transition-all',
                data.estadioFenologico === e.id ? 'border-primary bg-primary/5 font-medium' : 'border-border bg-card hover:border-primary/30')}>
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Parte da planta */}
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Parte da Planta Afetada *</p>
        <div className="grid grid-cols-2 gap-2">
          {PARTES.map(p => (
            <button key={p.id} type="button" onClick={() => setData(prev => ({ ...prev, parteAfetada: p.id }))}
              className={cn('p-3 rounded-xl border text-left text-sm transition-all',
                data.parteAfetada === p.id ? 'border-primary bg-primary/5 font-medium' : 'border-border bg-card hover:border-primary/30')}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clima recente */}
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Clima Recente (Opcional)</p>
        <div className="grid grid-cols-2 gap-2">
          {CLIMA_OPTIONS.map(c => (
            <button key={c.id} type="button" onClick={() => setData(prev => ({ ...prev, climaRecente: prev.climaRecente === c.id ? '' : c.id }))}
              className={cn('p-3 rounded-xl border text-left text-sm transition-all flex items-center gap-2',
                data.climaRecente === c.id ? 'border-primary bg-primary/5 font-medium' : 'border-border bg-card hover:border-primary/30')}>
              <c.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Área */}
      <div>
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Área Total (ha)</p>
        <Input type="number" step="0.1" min="0.1" value={data.areaHa}
          onChange={e => setData(prev => ({ ...prev, areaHa: Number(e.target.value) || 0 }))}
          className="text-lg font-semibold text-center" />
      </div>

      {/* Analyze button */}
      <Button size="lg" onClick={handleAnalyze} disabled={!canProceed || isAnalyzing} className="w-full gap-2">
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analisando imagem...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Diagnosticar via IA
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </div>
  );
}
