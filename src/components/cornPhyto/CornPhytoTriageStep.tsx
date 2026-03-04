import { useCornPhyto, type CornPhytoOpcaoIA } from '@/contexts/CornPhytoContext';
import { findMatchingCornPest, getDefensivosForPest, getProductsForCornPest } from '@/data/cornPestDatabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bug,
  Leaf,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ArrowRight,
  Wrench,
} from 'lucide-react';

function getSeverityConfig(opcao: CornPhytoOpcaoIA) {
  if (opcao.tipo === 'saudavel') return {
    label: 'Saudável', borderClass: 'border-emerald-500/40', bgClass: 'bg-emerald-500/5',
    textClass: 'text-emerald-400', barClass: 'bg-emerald-500', Icon: ShieldCheck,
  };
  if (opcao.severidade === 'severa') return {
    label: 'Crítico', borderClass: 'border-red-500/40', bgClass: 'bg-red-500/5',
    textClass: 'text-red-400', barClass: 'bg-red-500', Icon: XCircle,
  };
  if (opcao.severidade === 'moderada') return {
    label: 'Atenção', borderClass: 'border-amber-500/40', bgClass: 'bg-amber-500/5',
    textClass: 'text-amber-400', barClass: 'bg-amber-500', Icon: AlertTriangle,
  };
  return {
    label: 'Leve', borderClass: 'border-blue-500/40', bgClass: 'bg-blue-500/5',
    textClass: 'text-blue-400', barClass: 'bg-blue-500', Icon: AlertTriangle,
  };
}

export function CornPhytoTriageStep() {
  const { data, setData, goToNextStep } = useCornPhyto();
  const { opcoes, contextoAnalise, selectedOpcaoIndex, imageBase64 } = data;

  const handleSelect = (index: number) => {
    const opcao = opcoes[index];
    const matched = findMatchingCornPest(opcao.praga);
    const defensivos = matched ? getDefensivosForPest(matched.id) : [];
    const products = matched ? getProductsForCornPest(matched.id) : [];

    setData(prev => ({
      ...prev,
      selectedOpcaoIndex: index,
      matchedPest: matched,
      matchedDefensivos: defensivos,
      matchedProducts: products,
      selectedProductId: products.length > 0 ? products[0].id : null,
      sprayCalc: {
        ...prev.sprayCalc,
        areaHa: prev.areaHa,
        produtoSelecionado: products.length > 0 ? products[0] : null,
        doseHa: products.length > 0 ? products[0].doseNumerico : 0,
      },
    }));
  };

  const handleConfirm = () => {
    if (selectedOpcaoIndex !== null) goToNextStep();
  };

  if (opcoes.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground text-sm">Nenhum resultado da análise. Volte e tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ animation: 'fade-in 0.3s ease-out' }}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground mb-1">Triagem por IA</h2>
        <p className="text-sm text-muted-foreground">
          Selecione a opção que mais se assemelha ao que você observa no campo
        </p>
      </div>

      {/* Image preview */}
      {imageBase64 && (
        <div className="rounded-2xl overflow-hidden border border-border">
          <img src={imageBase64} alt="Foto analisada" className="w-full max-h-40 object-cover" />
        </div>
      )}

      {/* Context analysis */}
      {contextoAnalise && (
        <div className="p-3 rounded-xl bg-secondary/50 border border-border">
          <p className="text-xs text-muted-foreground">{contextoAnalise}</p>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        {opcoes.map((opcao, index) => {
          const config = getSeverityConfig(opcao);
          const pct = Math.round(opcao.confianca * 100);
          const isSelected = selectedOpcaoIndex === index;
          const TypeIcon = opcao.tipo === 'praga' ? Bug : opcao.tipo === 'saudavel' ? ShieldCheck : Leaf;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(index)}
              className={cn(
                'w-full text-left p-4 rounded-2xl border-2 transition-all',
                isSelected
                  ? `${config.borderClass} ${config.bgClass} ring-2 ring-primary/20`
                  : 'border-border bg-card hover:border-primary/30'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  isSelected ? 'bg-primary/10' : 'bg-secondary')}>
                  <TypeIcon className={cn('w-5 h-5', isSelected ? config.textClass : 'text-muted-foreground')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-foreground text-sm">{opcao.praga}</p>
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', isSelected ? `${config.textClass} border-current` : 'text-muted-foreground')}>
                      {pct}%
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic mb-1">{opcao.nomeCientifico}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{opcao.sintomas}</p>

                  {isSelected && (
                    <div className="mt-3 space-y-2" style={{ animation: 'fade-in 0.2s ease-out' }}>
                      {/* NDE */}
                      <div className="p-2 rounded-lg bg-secondary/50">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Nível de Dano Econômico</p>
                        <p className="text-xs text-foreground">{opcao.nde}</p>
                      </div>
                      {/* Silage risk */}
                      {opcao.riscoPerdaSilagem && (
                        <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                          <p className="text-[10px] text-red-400 uppercase tracking-wider mb-0.5">Risco para Silagem</p>
                          <p className="text-xs text-foreground">{opcao.riscoPerdaSilagem}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-primary">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Selecionado</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', config.textClass, 'border-current')}>
                    <config.Icon className="w-3 h-3 mr-0.5" />
                    {config.label}
                  </Badge>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-500', config.barClass)}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <p className="text-[10px] text-amber-400">
          ⚠️ A IA indica probabilidades, não um diagnóstico absoluto. Confirme visualmente qual opção se assemelha ao que você observa no campo.
        </p>
      </div>

      {/* Confirm */}
      <Button size="lg" onClick={handleConfirm} disabled={selectedOpcaoIndex === null} className="w-full gap-2">
        Confirmar Diagnóstico
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
