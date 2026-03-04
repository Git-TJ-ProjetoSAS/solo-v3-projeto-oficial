import { useState, useRef } from 'react';
import { useCoffee } from '@/contexts/CoffeeContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Camera,
  Upload,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Bug,
  Leaf,
  Droplets,
  FlaskConical,
  X,
  Sparkles,
  ImageIcon,
  ScanSearch,
  CheckCircle2,
  XCircle,
  Clock,
  Pill,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  findMatchingDefensivo,
  getProductsForPest,
  type DefensivoEntry,
  type ProdutoComercial,
} from '@/data/coffeePestDatabase';

// ─── Types ───────────────────────────────────────────────────
interface ProdutoRecomendadoIA {
  nome: string;
  principio_ativo: string;
  dose: string;
  metodo: string;
}

interface IdentificationResult {
  identificado: boolean;
  praga: string;
  tipo: 'doenca' | 'praga' | 'deficiencia' | 'saudavel';
  confianca: number;
  severidade: 'leve' | 'moderada' | 'severa';
  sintomas: string;
  produtos_recomendados: ProdutoRecomendadoIA[];
  orientacao: string;
  culturas_afetadas: string[];
}

// ─── Alert Level System ──────────────────────────────────────
type AlertLevel = 'saudavel' | 'atencao' | 'critico';

function getAlertLevel(result: IdentificationResult): AlertLevel {
  if (result.tipo === 'saudavel') return 'saudavel';
  if (result.severidade === 'severa' || result.severidade === 'moderada') return 'critico';
  return 'atencao';
}

const ALERT_CONFIG: Record<AlertLevel, {
  label: string;
  borderClass: string;
  bgClass: string;
  iconBgClass: string;
  textClass: string;
  barClass: string;
  badgeClass: string;
  description: string;
}> = {
  saudavel: {
    label: 'Saudável',
    borderClass: 'border-emerald-500/40',
    bgClass: 'bg-emerald-500/5',
    iconBgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-400',
    barClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    description: 'Nenhum sinal de doença ou praga detectado',
  },
  atencao: {
    label: 'Atenção',
    borderClass: 'border-amber-500/40',
    bgClass: 'bg-amber-500/5',
    iconBgClass: 'bg-amber-500/15',
    textClass: 'text-amber-400',
    barClass: 'bg-amber-500',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    description: 'Severidade leve — monitorar evolução',
  },
  critico: {
    label: 'Crítico',
    borderClass: 'border-red-500/40',
    bgClass: 'bg-red-500/5',
    iconBgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    barClass: 'bg-red-500',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/20',
    description: 'Severidade moderada a severa — ação imediata recomendada',
  },
};

const TIPO_ICON = {
  doenca: Leaf,
  praga: Bug,
  deficiencia: Droplets,
  saudavel: ShieldCheck,
};

// ─── Main Component ──────────────────────────────────────────
export function CoffeePestIdentifier() {
  const { coffeeData, setTreatmentPlanData } = useCoffee();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [matchedDefensivo, setMatchedDefensivo] = useState<DefensivoEntry | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<ProdutoComercial[]>([]);

  const coffeeType = coffeeData.coffeeType as 'conilon' | 'arabica' | null;

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      setResult(null);
      setMatchedDefensivo(null);
      setMatchedProducts([]);
      await analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('identify-pest', {
        body: { imageBase64, coffeeType },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Erro ao analisar a imagem. Tente novamente.');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const aiResult = data as IdentificationResult;
      setResult(aiResult);

      // Cross-reference with internal database
      if (aiResult.tipo !== 'saudavel' && aiResult.praga) {
        const match = findMatchingDefensivo(aiResult.praga, coffeeType);
        setMatchedDefensivo(match);
        if (match) {
          const products = getProductsForPest(match.id, coffeeType, 4);
          setMatchedProducts(products);
        }

        // Save AI-recommended products to context for the fertigation/spraying step
        if (aiResult.produtos_recomendados && aiResult.produtos_recomendados.length > 0) {
          const parseDose = (doseStr: string): { value: number; unit: string } => {
            // Handle ranges like "200-300 mL/ha" or "0,7 a 1,0 L/ha"
            const cleaned = doseStr.replace(',', '.');
            const numbers = cleaned.match(/[\d.]+/g);
            const unitMatch = cleaned.match(/(mL\/ha|L\/ha|kg\/ha|g\/ha)/i);
            const value = numbers ? (numbers.length > 1 ? (parseFloat(numbers[0]) + parseFloat(numbers[1])) / 2 : parseFloat(numbers[0])) : 0;
            return { value, unit: unitMatch ? unitMatch[1] : 'L/ha' };
          };

          const aiEntries = aiResult.produtos_recomendados.map(prod => {
            const { value, unit } = parseDose(prod.dose);
            return {
              alvo: aiResult.praga.split('(')[0].trim(),
              produto: prod.nome.replace(/\s*\(ou similar\)\s*/i, '').trim(),
              principioAtivo: prod.principio_ativo,
              dosePerHa: value,
              unidade: unit,
              costPerHa: 0,
            };
          });

          // Merge with existing treatment plan entries (from manual selection)
          const existing = coffeeData.treatmentPlan?.entries || [];
          const existingNames = new Set(existing.map(e => e.produto.toLowerCase()));
          const newEntries = aiEntries.filter(e => !existingNames.has(e.produto.toLowerCase()));

          setTreatmentPlanData({
            entries: [...existing, ...newEntries],
            equipmentType: coffeeData.treatmentPlan?.equipmentType || 'trator',
            equipmentLabel: coffeeData.treatmentPlan?.equipmentLabel || 'Bomba Jato (Trator)',
            totalCostPerHa: coffeeData.treatmentPlan?.totalCostPerHa || 0,
          });
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAnalysis = () => {
    setImagePreview(null);
    setResult(null);
    setMatchedDefensivo(null);
    setMatchedProducts([]);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const alertLevel = result ? getAlertLevel(result) : null;
  const alertConfig = alertLevel ? ALERT_CONFIG[alertLevel] : null;
  const confiancaPct = result ? Math.round(result.confianca * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ScanSearch className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Diagnóstico por Imagem</h3>
            <p className="text-xs text-muted-foreground">
              Fotografe a folha, fruto ou ramo para identificação automática via IA
            </p>
          </div>
        </div>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelect(f);
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelect(f);
        }}
      />

      {/* Upload area — camera & gallery split */}
      {!imagePreview && !isAnalyzing && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-secondary/20 hover:bg-secondary/40 transition-all flex flex-col items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Câmera</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tirar foto agora</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-secondary/20 hover:bg-secondary/40 transition-all flex flex-col items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Galeria</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Enviar da galeria</p>
            </div>
          </button>
        </div>
      )}

      {/* Image preview + loading */}
      {imagePreview && (
        <div className={cn(
          'relative rounded-2xl overflow-hidden border-2 transition-all',
          alertConfig ? alertConfig.borderClass : 'border-border'
        )}>
          <img
            src={imagePreview}
            alt="Imagem para análise"
            className={cn(
              'w-full max-h-56 object-cover transition-all',
              isAnalyzing && 'opacity-40 scale-[1.02] blur-[1px]'
            )}
          />

          {/* Loading overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full border-2 border-primary/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <Sparkles className="w-4 h-4 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-foreground">Analisando imagem...</p>
              <p className="text-xs text-muted-foreground mt-1">Diagnóstico fitopatológico via IA</p>
              <div className="flex gap-1.5 mt-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Clear button */}
          {!isAnalyzing && (
            <button
              type="button"
              onClick={clearAnalysis}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* ─── Result Card ────────────────────────────────────── */}
      {result && !isAnalyzing && alertConfig && (
        <div className="space-y-3" style={{ animation: 'fade-in 0.3s ease-out' }}>

          {/* Alert Status Banner */}
          <div className={cn('p-4 rounded-2xl border-2', alertConfig.borderClass, alertConfig.bgClass)}>
            <div className="flex items-start gap-3">
              {(() => {
                const Icon = TIPO_ICON[result.tipo];
                return (
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', alertConfig.iconBgClass)}>
                    <Icon className={cn('w-5 h-5', alertConfig.textClass)} />
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-foreground text-base">{result.praga}</p>
                </div>
                <p className={cn('text-xs mt-0.5', alertConfig.textClass)}>{alertConfig.description}</p>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 font-semibold', alertConfig.badgeClass)}>
                    {alertLevel === 'saudavel' ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" />{alertConfig.label}</>
                    ) : alertLevel === 'atencao' ? (
                      <><AlertTriangle className="w-3 h-3 mr-1" />{alertConfig.label}</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" />{alertConfig.label}</>
                    )}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                    {confiancaPct}% confiança
                  </Badge>
                  {coffeeType && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-secondary text-muted-foreground border-border">
                      {coffeeType === 'conilon' ? 'Conilon' : 'Arábica'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="mt-3">
              <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700 ease-out', alertConfig.barClass)}
                  style={{ width: `${confiancaPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Symptoms Card */}
          {result.sintomas && (
            <div className="p-4 rounded-2xl border border-border bg-card">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
                <ScanSearch className="w-3.5 h-3.5" />
                Sintomas Identificados
              </p>
              <p className="text-sm text-foreground leading-relaxed">{result.sintomas}</p>
            </div>
          )}

          {/* ─── Internal DB Match ──────────────────────────── */}
          {matchedDefensivo && (
            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-foreground">
                  Correspondência na Base Interna
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Controle</p>
                  <p className="text-sm font-medium text-foreground">{matchedDefensivo.tipo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Princípio Ativo</p>
                  <p className="text-sm font-medium text-foreground">{matchedDefensivo.ativos}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Dose Base</p>
                  <p className="text-sm font-medium text-foreground">{matchedDefensivo.dose}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Época</p>
                  <p className="text-sm font-medium text-foreground">{matchedDefensivo.epoca}</p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Commercial Products ────────────────────────── */}
          {matchedProducts.length > 0 && (
            <div className="p-4 rounded-2xl border border-border bg-card">
              <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                <Pill className="w-4 h-4 text-primary" />
                Produtos Comerciais de Referência
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto bg-secondary text-muted-foreground border-border">
                  {matchedProducts.length} produtos
                </Badge>
              </p>
              <div className="space-y-2">
                {matchedProducts.map((prod, i) => (
                  <div key={prod.id} className={cn(
                    'p-3 rounded-xl border transition-all',
                    i === 0
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-secondary/30 border-border'
                  )}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-foreground">{prod.nome}</p>
                      {i === 0 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                          Recomendado
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <p className="text-[10px] text-muted-foreground">
                        <span className="uppercase tracking-wider font-medium">Ativo:</span>{' '}
                        <span className="text-foreground/80">{prod.principio_ativo}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        <span className="uppercase tracking-wider font-medium">Dose:</span>{' '}
                        <span className="text-foreground/80">{prod.dose}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground col-span-2">
                        <span className="uppercase tracking-wider font-medium">Método:</span>{' '}
                        <span className="text-foreground/80">{prod.metodo}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI-only products fallback (when no internal DB match) */}
          {!matchedDefensivo && result.produtos_recomendados && result.produtos_recomendados.length > 0 && (
            <div className="p-4 rounded-2xl border border-border bg-card">
              <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary" />
                Sugestões da IA
              </p>
              <p className="text-[10px] text-muted-foreground mb-3">
                Sem correspondência na base interna — recomendações geradas pela IA
              </p>
              <div className="space-y-2">
                {result.produtos_recomendados.map((prod, i) => (
                  <div key={i} className="p-3 rounded-xl bg-secondary/30 border border-border">
                    <p className="text-sm font-medium text-foreground">{prod.nome}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1.5">
                      <p className="text-[10px] text-muted-foreground">
                        <span className="uppercase tracking-wider">Ativo:</span>{' '}
                        <span className="text-foreground/80">{prod.principio_ativo}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        <span className="uppercase tracking-wider">Dose:</span>{' '}
                        <span className="text-foreground/80">{prod.dose}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical guidance */}
          {result.orientacao && (
            <div className={cn(
              'p-4 rounded-2xl border flex items-start gap-3',
              alertLevel === 'critico'
                ? 'bg-red-500/5 border-red-500/15'
                : alertLevel === 'atencao'
                ? 'bg-amber-500/5 border-amber-500/15'
                : 'bg-primary/5 border-primary/10'
            )}>
              <Clock className={cn('w-5 h-5 shrink-0 mt-0.5', alertConfig.textClass)} />
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Orientação Técnica</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.orientacao}</p>
              </div>
            </div>
          )}

          {/* New analysis */}
          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl"
            onClick={clearAnalysis}
          >
            <ImageIcon className="w-4 h-4" />
            Nova Análise
          </Button>
        </div>
      )}
    </div>
  );
}
