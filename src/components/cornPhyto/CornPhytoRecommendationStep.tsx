import { useEffect, useState, useCallback } from 'react';
import { useCornPhyto } from '@/contexts/CornPhytoContext';
import { getCarenciaLabel } from '@/data/cornPestDatabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  ShieldAlert, Pill, AlertTriangle, Clock, CheckCircle2, ArrowRight,
  Target, Leaf, Database, PackageSearch,
} from 'lucide-react';

interface MatchedInsumo {
  nome: string;
  preco: number;
  tamanho_unidade: number;
  medida: string;
  recomendacao_dose_ha: number | null;
  recomendacao_dose_unidade: string | null;
}

export function CornPhytoRecommendationStep() {
  const { data, setData, goToNextStep } = useCornPhyto();
  const { opcoes, selectedOpcaoIndex, matchedPest, matchedDefensivos, matchedProducts, selectedProductId } = data;
  const selectedOpcao = selectedOpcaoIndex !== null ? opcoes[selectedOpcaoIndex] : null;

  // Insumos from DB
  const [insumos, setInsumos] = useState<MatchedInsumo[]>([]);
  const [insumoMatches, setInsumoMatches] = useState<Record<string, MatchedInsumo | null>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('insumos')
        .select('nome, preco, tamanho_unidade, medida, recomendacao_dose_ha, recomendacao_dose_unidade')
        .eq('status', 'ativo')
        .in('tipo_produto', ['Fungicida', 'Inseticida', 'Herbicida', 'Adjuvantes']);
      if (data) setInsumos(data);
    };
    fetch();
  }, []);

  // Fuzzy matching
  const normalize = useCallback((s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''), []);

  const findInsumo = useCallback((productName: string): MatchedInsumo | null => {
    const norm = normalize(productName);
    let match = insumos.find(i => normalize(i.nome) === norm);
    if (match) return match;
    match = insumos.find(i => normalize(i.nome).includes(norm) || norm.includes(normalize(i.nome)));
    if (match) return match;
    const tokens = norm.match(/[a-z0-9]{2,}/g) || [];
    if (tokens.length === 0) return null;
    let best: MatchedInsumo | null = null;
    let bestScore = 0;
    for (const ins of insumos) {
      const insTokens = normalize(ins.nome).match(/[a-z0-9]{2,}/g) || [];
      const shared = tokens.filter(t => insTokens.some(it => it.includes(t) || t.includes(it))).length;
      const score = shared / Math.max(tokens.length, insTokens.length);
      if (score > bestScore && score >= 0.4) { bestScore = score; best = ins; }
    }
    return best;
  }, [insumos, normalize]);

  // Run matching when insumos or products change
  useEffect(() => {
    if (insumos.length === 0 || matchedProducts.length === 0) return;
    const matches: Record<string, MatchedInsumo | null> = {};
    for (const prod of matchedProducts) {
      matches[prod.id] = findInsumo(prod.nome);
    }
    setInsumoMatches(matches);
  }, [insumos, matchedProducts, findInsumo]);

  if (!selectedOpcao) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-sm text-muted-foreground">Nenhum diagnóstico confirmado. Volte à etapa anterior.</p>
      </div>
    );
  }

  const handleSelectProduct = (productId: string) => {
    const product = matchedProducts.find(p => p.id === productId) || null;
    const insumo = insumoMatches[productId];
    
    // Use insumo price if available, otherwise use estimated price
    const finalProduct = product ? {
      ...product,
      precoEstimado: insumo ? insumo.preco : product.precoEstimado,
      tamanhoEmbalagem: insumo ? insumo.tamanho_unidade : product.tamanhoEmbalagem,
    } : null;

    setData(prev => ({
      ...prev,
      selectedProductId: productId,
      sprayCalc: {
        ...prev.sprayCalc,
        produtoSelecionado: finalProduct,
        doseHa: insumo?.recomendacao_dose_ha || (product ? product.doseNumerico : 0),
      },
    }));
  };

  const handleProceed = () => {
    if (selectedProductId) goToNextStep();
  };

  const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtPrecoUn = (preco: number, tamanho: number, medida: string) => {
    if (tamanho <= 0) return '';
    const unit = preco / tamanho;
    return `${fmtCurrency(unit)}/${medida === 'L' ? 'L' : medida === 'Kg' ? 'Kg' : 'un'}`;
  };

  return (
    <div className="space-y-5" style={{ animation: 'fade-in 0.3s ease-out' }}>
      {/* Diagnosis header */}
      <div className="p-4 rounded-2xl border-2 border-red-500/30 bg-red-500/5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground">{selectedOpcao.praga}</p>
            <p className="text-xs text-muted-foreground italic">{selectedOpcao.nomeCientifico}</p>
            <p className="text-sm text-foreground mt-2">{selectedOpcao.orientacao}</p>
          </div>
        </div>
      </div>

      {/* NDE */}
      <div className="p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Nível de Dano Econômico</p>
        </div>
        <p className="text-sm text-foreground">{selectedOpcao.nde || matchedPest?.nde}</p>
      </div>

      {/* Matched pest from internal DB */}
      {matchedPest && (
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-foreground">Base Interna — {matchedPest.alvo}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Severidade</p>
              <p className="font-medium text-foreground capitalize">{matchedPest.severidadePotencial}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Perda Potencial</p>
              <p className="font-medium text-foreground">{matchedPest.perdaPotencial}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fases de Risco</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {matchedPest.fasesRisco.map(f => (
                  <Badge key={f} variant="outline" className="text-[9px] px-1.5 py-0 bg-secondary text-muted-foreground border-border">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Princípios Ativos */}
      {matchedDefensivos.length > 0 && (
        <div className="p-4 rounded-2xl border border-border bg-card">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            Princípios Ativos Recomendados
          </p>
          <div className="space-y-2">
            {matchedDefensivos.map(d => (
              <div key={d.id} className="p-3 rounded-xl bg-secondary/50 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{d.principioAtivo}</p>
                  <p className="text-[10px] text-muted-foreground">{d.grupoQuimico} • {d.tipo}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-foreground">{d.doseMin}–{d.doseMax} {d.unidadeDose}</p>
                  <div className="flex items-center gap-1 text-amber-400 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px]">Carência: {d.carenciaSilagem}d</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Produtos Comerciais */}
      {matchedProducts.length > 0 && (
        <div className="p-4 rounded-2xl border border-border bg-card">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Pill className="w-4 h-4 text-primary" />
            Produtos Comerciais
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-auto bg-secondary text-muted-foreground border-border">
              {matchedProducts.length}
            </Badge>
          </p>
          <div className="space-y-2">
            {matchedProducts.map((prod) => {
              const insumo = insumoMatches[prod.id];
              return (
                <button key={prod.id} type="button" onClick={() => handleSelectProduct(prod.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border transition-all',
                    selectedProductId === prod.id
                      ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                      : 'bg-secondary/30 border-border hover:border-primary/20'
                  )}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-foreground">{prod.nome}</p>
                    <div className="flex items-center gap-1.5">
                      {insumo && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          <Database className="w-2.5 h-2.5 mr-0.5" />
                          Catálogo
                        </Badge>
                      )}
                      {selectedProductId === prod.id && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                          Selecionado
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Dose</p>
                      <p className="font-medium text-foreground">
                        {insumo?.recomendacao_dose_ha
                          ? `${insumo.recomendacao_dose_ha} ${insumo.recomendacao_dose_unidade || prod.unidadeDose}`
                          : prod.dose}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Preço</p>
                      <p className={cn('font-medium', insumo ? 'text-emerald-600' : 'text-foreground')}>
                        {insumo
                          ? `${fmtCurrency(insumo.preco)} / ${insumo.tamanho_unidade}${insumo.medida}`
                          : `R$ ${prod.precoEstimado}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Carência</p>
                      <p className="font-medium text-amber-400">{getCarenciaLabel(prod.carenciaSilagem)}</p>
                    </div>
                  </div>

                  {/* Insumo details row */}
                  {insumo && (
                    <div className="mt-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 flex items-center gap-2">
                      <PackageSearch className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <p className="text-[10px] text-muted-foreground">
                        <span className="font-medium text-foreground">{insumo.nome}</span>
                        {' · '}
                        {fmtPrecoUn(insumo.preco, insumo.tamanho_unidade, insumo.medida)}
                      </p>
                    </div>
                  )}

                  {/* Carência alert */}
                  {prod.carenciaSilagem >= 21 && (
                    <div className="mt-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                      <p className="text-[10px] text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Atenção: Período de carência de {prod.carenciaSilagem} dias. Não colher para silagem antes deste prazo.
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* AI-only products (fallback if no internal match) */}
      {matchedProducts.length === 0 && selectedOpcao.produtos_recomendados.length > 0 && (
        <div className="p-4 rounded-2xl border border-border bg-card">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Pill className="w-4 h-4 text-primary" />
            Sugestões da IA
          </p>
          <div className="space-y-2">
            {selectedOpcao.produtos_recomendados.map((prod, i) => (
              <div key={i} className="p-3 rounded-xl bg-secondary/50">
                <p className="text-sm font-medium text-foreground">{prod.nome}</p>
                <p className="text-[10px] text-muted-foreground">{prod.principio_ativo} • {prod.dose}</p>
                {prod.carencia_silagem_dias > 0 && (
                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Carência silagem: {prod.carencia_silagem_dias} dias
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Button size="lg" onClick={handleProceed} disabled={!selectedProductId && matchedProducts.length > 0} className="w-full gap-2">
        Calcular Calda
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
