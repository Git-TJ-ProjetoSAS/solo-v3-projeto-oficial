import { useState, useRef, useEffect } from 'react';
import { useCoffee } from '@/contexts/CoffeeContext';
import type { CoffeeFertigationProduct } from '@/contexts/CoffeeContext';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Upload, Loader2, AlertTriangle, Leaf, Droplets, Package, ShieldCheck, ShieldAlert, ShieldX, ChevronDown, X, FlaskConical, Database, CheckCircle2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Map nutrient symbols to DB column names
const NUTRIENT_DB_MAP: Record<string, string> = {
  'N': 'macro_n',
  'P': 'macro_p2o5',
  'K': 'macro_k2o',
  'S': 'macro_s',
  'B': 'micro_b',
  'Zn': 'micro_zn',
  'Cu': 'micro_cu',
  'Mn': 'micro_mn',
  'Fe': 'micro_fe',
  'Mo': 'micro_mo',
  'Ca': 'correcao_caco3',
  'Mg': 'correcao_camg',
};

interface InsumoMatch {
  id: string;
  nome: string;
  marca: string;
  tipo_produto: string;
  concentracao: number;
  campo: string;
  dose_ha: number | null;
  dose_unidade: string | null;
  preco: number;
  tamanho_unidade: number;
  medida: string;
}

interface Product {
  nome: string;
  principio_ativo: string;
  dose: string;
  modo_aplicacao: string;
}

interface Deficiency {
  nutriente: string;
  simbolo: string;
  severidade: 'leve' | 'moderada' | 'severa';
  confianca: number;
  sintomas_observados: string;
  causas_provaveis: string[];
  suplementacao: {
    via_solo: string;
    via_foliar: string;
    dose: string;
    epoca: string;
  };
  produtos_recomendados: Product[];
}

interface AnalysisResult {
  identificado: boolean;
  saude_geral: 'deficiente' | 'saudavel' | 'atencao';
  resumo: string;
  deficiencias: Deficiency[];
  orientacao_geral: string;
}

const SEVERITY_CONFIG = {
  saudavel: { icon: ShieldCheck, label: 'Saudável', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  atencao: { icon: ShieldAlert, label: 'Atenção', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  deficiente: { icon: ShieldX, label: 'Deficiente', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
};

const DEF_SEVERITY_CONFIG = {
  leve: { color: 'text-amber-400', bg: 'bg-amber-500/15' },
  moderada: { color: 'text-orange-400', bg: 'bg-orange-500/15' },
  severa: { color: 'text-red-400', bg: 'bg-red-500/15' },
};

export function FoliarDeficiencyIdentifier() {
  const { coffeeData, setFertigationData } = useCoffee();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [matchedInsumos, setMatchedInsumos] = useState<Record<string, InsumoMatch[]>>({});
  const [addedInsumoIds, setAddedInsumoIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleAddToMix = (ins: InsumoMatch) => {
    const existingProducts = coffeeData.fertigation?.products || [];
    const alreadyAdded = existingProducts.some(p => p.insumoId === ins.id);
    if (alreadyAdded) {
      toast.info(`${ins.nome} já está no mix`);
      return;
    }

    const newProduct: CoffeeFertigationProduct = {
      id: `diag-${ins.id}-${Date.now()}`,
      insumoId: ins.id,
      name: ins.nome,
      type: ins.tipo_produto,
      dosePerHa: ins.dose_ha || 1,
      unit: (ins.dose_unidade as CoffeeFertigationProduct['unit']) || 'L/ha',
    };

    setFertigationData({
      tankSize: coffeeData.fertigation?.tankSize || 500,
      volumePerHa: coffeeData.fertigation?.volumePerHa || 500,
      products: [...existingProducts, newProduct],
    });

    setAddedInsumoIds(prev => new Set(prev).add(ins.id));
    toast.success(`${ins.nome} adicionado ao mix de fertirrigação`);
  };

  // Fetch matching insumos from DB when result arrives
  useEffect(() => {
    if (!result || !result.deficiencias || result.deficiencias.length === 0) {
      setMatchedInsumos({});
      return;
    }

    const fetchMatches = async () => {
      try {
        const { data: insumos, error } = await supabase
          .from('insumos')
          .select('*')
          .eq('status', 'ativo');

        if (error || !insumos) return;

        const matches: Record<string, InsumoMatch[]> = {};

        for (const def of result.deficiencias) {
          const dbCol = NUTRIENT_DB_MAP[def.simbolo];
          if (!dbCol) continue;

          const matching = insumos
            .filter((ins: any) => {
              const val = Number(ins[dbCol]) || 0;
              return val > 0;
            })
            .map((ins: any) => ({
              id: ins.id,
              nome: ins.nome,
              marca: ins.marca,
              tipo_produto: ins.tipo_produto,
              concentracao: Number(ins[dbCol]) || 0,
              campo: dbCol,
              dose_ha: ins.recomendacao_dose_ha,
              dose_unidade: ins.recomendacao_dose_unidade,
              preco: ins.preco,
              tamanho_unidade: ins.tamanho_unidade,
              medida: ins.medida,
            }))
            .sort((a, b) => b.concentracao - a.concentracao)
            .slice(0, 5);

          if (matching.length > 0) {
            matches[def.simbolo] = matching;
          }
        }

        setMatchedInsumos(matches);
      } catch (err) {
        console.error('Error fetching matching insumos:', err);
      }
    };

    fetchMatches();
  }, [result]);

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!imagePreview) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('identify-foliar-deficiency', {
        body: { imageBase64: imagePreview, coffeeType: coffeeData.coffeeType },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data as AnalysisResult);
      toast.success('Análise concluída!');
    } catch (err: any) {
      console.error('Foliar deficiency analysis error:', err);
      toast.error(err.message || 'Erro ao analisar imagem');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImagePreview(null);
    setResult(null);
    setExpandedId(null);
    setMatchedInsumos({});
  };

  const statusConfig = result ? SEVERITY_CONFIG[result.saude_geral] || SEVERITY_CONFIG.atencao : null;
  const StatusIcon = statusConfig?.icon || ShieldCheck;

  return (
    <div className="space-y-4">
      {/* Upload area */}
      {!imagePreview && (
        <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Camera className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Fotografe ou envie uma imagem</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tire uma foto da folha de café para identificação automática de deficiências nutricionais
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()} className="gap-2">
              <Camera className="w-4 h-4" />
              Câmera
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" />
              Galeria
            </Button>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      )}

      {/* Image preview + actions */}
      {imagePreview && !result && (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-border">
            <img src={imagePreview} alt="Folha de café" className="w-full max-h-64 object-cover" />
            <button onClick={reset} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <Button onClick={analyze} disabled={isAnalyzing} className="w-full gap-2">
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando deficiências...
              </>
            ) : (
              <>
                <FlaskConical className="w-4 h-4" />
                Identificar Deficiências
              </>
            )}
          </Button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4" style={{ animation: 'fade-in 0.3s ease-out' }}>
          {/* Image mini + status */}
          <div className="flex items-start gap-3">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border shrink-0">
              <img src={imagePreview!} alt="Análise" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', statusConfig?.bg, statusConfig?.color)}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig?.label}
              </div>
              <p className="text-sm text-foreground mt-1.5 leading-relaxed">{result.resumo}</p>
            </div>
          </div>

          {/* Deficiencies list */}
          {result.deficiencias && result.deficiencias.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Deficiências Identificadas ({result.deficiencias.length})
              </h4>
              {result.deficiencias.map((def, i) => {
                const sevConf = DEF_SEVERITY_CONFIG[def.severidade] || DEF_SEVERITY_CONFIG.leve;
                const isOpen = expandedId === `${def.simbolo}-${i}`;
                return (
                  <div key={`${def.simbolo}-${i}`} className={cn('rounded-2xl border transition-all', isOpen ? 'border-primary/30 bg-primary/5' : 'border-border bg-card')}>
                    <button onClick={() => setExpandedId(isOpen ? null : `${def.simbolo}-${i}`)} className="w-full flex items-center gap-3 p-4 text-left">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm', sevConf.bg, sevConf.color)}>
                        {def.simbolo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{def.nutriente}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn('text-[11px] font-semibold uppercase', sevConf.color)}>{def.severidade}</span>
                          <span className="text-[11px] text-muted-foreground">• {Math.round(def.confianca * 100)}% confiança</span>
                        </div>
                      </div>
                      <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3" style={{ animation: 'fade-in 0.2s ease-out' }}>
                        {/* Symptoms */}
                        <div className="flex items-start gap-2.5">
                          <Leaf className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Sintomas Observados</p>
                            <p className="text-sm text-foreground leading-relaxed">{def.sintomas_observados}</p>
                          </div>
                        </div>

                        {/* Causes */}
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Causas Prováveis</p>
                            <ul className="text-sm text-foreground space-y-0.5">
                              {def.causas_provaveis.map((c, ci) => (
                                <li key={ci} className="flex items-start gap-1.5">
                                  <span className="text-muted-foreground mt-1">•</span>
                                  <span>{c}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Supplementation */}
                        <div className="flex items-start gap-2.5">
                          <Droplets className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Suplementação Nutricional</p>
                            <div className="rounded-xl bg-secondary p-3 space-y-2 text-xs">
                              {def.suplementacao.via_foliar && (
                                <div><span className="font-semibold text-foreground">Via Foliar:</span> <span className="text-muted-foreground">{def.suplementacao.via_foliar}</span></div>
                              )}
                              {def.suplementacao.via_solo && (
                                <div><span className="font-semibold text-foreground">Via Solo:</span> <span className="text-muted-foreground">{def.suplementacao.via_solo}</span></div>
                              )}
                              {def.suplementacao.dose && (
                                <div><span className="font-semibold text-foreground">Dose:</span> <span className="text-muted-foreground">{def.suplementacao.dose}</span></div>
                              )}
                              {def.suplementacao.epoca && (
                                <div><span className="font-semibold text-foreground">Época:</span> <span className="text-muted-foreground">{def.suplementacao.epoca}</span></div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Products */}
                        {def.produtos_recomendados?.length > 0 && (
                          <div className="flex items-start gap-2.5">
                            <Package className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Produtos Indicados</p>
                              <div className="space-y-2">
                                {def.produtos_recomendados.map((prod, pi) => (
                                  <div key={pi} className="rounded-xl bg-secondary p-3 text-xs space-y-1">
                                    <p className="font-semibold text-foreground">{prod.nome}</p>
                                    <p className="text-muted-foreground">
                                      <span className="font-medium text-foreground">P.A.:</span> {prod.principio_ativo}
                                    </p>
                                    <p className="text-muted-foreground">
                                      <span className="font-medium text-foreground">Dose:</span> {prod.dose}
                                    </p>
                                    <p className="text-muted-foreground">
                                      <span className="font-medium text-foreground">Aplicação:</span> {prod.modo_aplicacao}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Matched insumos from DB */}
                        {matchedInsumos[def.simbolo]?.length > 0 && (
                          <div className="flex items-start gap-2.5">
                            <Database className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-primary" />
                                Seus Insumos Cadastrados
                              </p>
                              <p className="text-[11px] text-muted-foreground mb-2">
                                Produtos do seu catálogo que contêm {def.nutriente}
                              </p>
                              <div className="space-y-2">
                                {matchedInsumos[def.simbolo].map((ins) => {
                                  const isAdded = addedInsumoIds.has(ins.id) || (coffeeData.fertigation?.products || []).some(p => p.insumoId === ins.id);
                                  return (
                                    <div key={ins.id} className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs space-y-1">
                                      <div className="flex items-center justify-between">
                                        <p className="font-semibold text-foreground">{ins.nome}</p>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                                          {ins.concentracao}% {def.simbolo}
                                        </span>
                                      </div>
                                      <p className="text-muted-foreground">
                                        <span className="font-medium text-foreground">Marca:</span> {ins.marca} • <span className="font-medium text-foreground">Tipo:</span> {ins.tipo_produto}
                                      </p>
                                      {ins.dose_ha != null && ins.dose_ha > 0 && (
                                        <p className="text-muted-foreground">
                                          <span className="font-medium text-foreground">Dose:</span> {ins.dose_ha} {ins.dose_unidade || 'L/ha'}
                                        </p>
                                      )}
                                      <p className="text-muted-foreground">
                                        <span className="font-medium text-foreground">Preço:</span> R$ {ins.preco.toFixed(2)} / {ins.tamanho_unidade} {ins.medida}
                                      </p>
                                      <Button
                                        variant={isAdded ? "secondary" : "default"}
                                        size="sm"
                                        className="w-full gap-2 mt-2 text-xs"
                                        disabled={isAdded}
                                        onClick={() => handleAddToMix(ins)}
                                      >
                                        {isAdded ? (
                                          <>
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Adicionado ao Mix
                                          </>
                                        ) : (
                                          <>
                                            <PlusCircle className="w-3.5 h-3.5" />
                                            Adicionar ao Mix
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* General guidance */}
          {result.orientacao_geral && (
            <div className="rounded-2xl bg-secondary border border-border p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Orientação Geral</p>
              <p className="text-sm text-foreground leading-relaxed">{result.orientacao_geral}</p>
            </div>
          )}

          {/* New analysis */}
          <Button variant="outline" onClick={reset} className="w-full gap-2">
            <Camera className="w-4 h-4" />
            Nova Análise
          </Button>
        </div>
      )}
    </div>
  );
}
