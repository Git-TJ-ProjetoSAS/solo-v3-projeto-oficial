import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sprout, Droplets, FlaskConical, ChevronDown, ChevronUp, 
  Tractor, AlertTriangle, Beaker
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CORN_PHENOLOGY_MANAGEMENT,
  TIPO_PRODUTO_COLORS,
  TIPO_PRODUTO_LABELS,
  type PhenologicalManagement,
  type SprayRecipe,
} from '@/data/cornPhenologyManagement';

function ProductBadge({ tipo }: { tipo: string }) {
  const colors = TIPO_PRODUTO_COLORS[tipo] || { bg: 'bg-muted', text: 'text-muted-foreground' };
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-medium border-0', colors.bg, colors.text)}>
      {TIPO_PRODUTO_LABELS[tipo] || tipo}
    </Badge>
  );
}

function RecipeCard({ recipe }: { recipe: SprayRecipe }) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-background border border-border/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground">{recipe.produto}</span>
          <ProductBadge tipo={recipe.tipo} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{recipe.funcao}</p>
      </div>
      <div className="text-right shrink-0">
        <span className="text-sm font-bold text-primary">{recipe.dose}</span>
      </div>
    </div>
  );
}

function PhaseCard({ phase, isExpanded, onToggle }: { 
  phase: PhenologicalManagement; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  return (
    <Card className="card-elevated overflow-hidden transition-all">
      {/* Header — always visible */}
      <button 
        onClick={onToggle}
        className="w-full text-left"
      >
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">{phase.icone}</span>
            <div className="min-w-0">
              <CardTitle className="text-base">{phase.faseLabel}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{phase.identificacaoVisual}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {phase.foliarDefensivos.calda.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {phase.foliarDefensivos.calda.length} produto(s)
              </Badge>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CardHeader>
      </button>

      {/* Body — expandable */}
      {isExpanded && (
        <CardContent className="px-4 pb-4 pt-0 space-y-4 animate-fade-in">
          {/* Grid: Solo | Fertirrigação */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Solo */}
            <div className={cn(
              'rounded-lg p-3 border',
              phase.solo ? 'bg-amber-50/50 border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-800/40' : 'bg-muted/30 border-border/40'
            )}>
              <div className="flex items-center gap-2 mb-1.5">
                <Tractor className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400">Solo (A Lanço)</span>
              </div>
              {phase.solo ? (
                <>
                  <p className="font-medium text-sm text-foreground">{phase.solo.acao}</p>
                  <p className="text-xs text-muted-foreground mt-1">{phase.solo.detalhe}</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nenhuma entrada de solo nesta fase.</p>
              )}
            </div>

            {/* Fertirrigação */}
            <div className={cn(
              'rounded-lg p-3 border',
              phase.fertirrigacao ? 'bg-blue-50/50 border-blue-200/60 dark:bg-blue-950/20 dark:border-blue-800/40' : 'bg-muted/30 border-border/40'
            )}>
              <div className="flex items-center gap-2 mb-1.5">
                <Droplets className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-xs uppercase tracking-wide text-blue-700 dark:text-blue-400">Fertirrigação (Pivô)</span>
              </div>
              {phase.fertirrigacao ? (
                <>
                  <p className="font-medium text-sm text-foreground">{phase.fertirrigacao.acao}</p>
                  <p className="text-xs text-muted-foreground mt-1">{phase.fertirrigacao.detalhe}</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">Sem fertirrigação nesta fase.</p>
              )}
            </div>
          </div>

          {/* Foliar / Defensivos — seção principal */}
          <div className="rounded-lg p-3 border bg-green-50/50 border-green-200/60 dark:bg-green-950/20 dark:border-green-800/40">
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-xs uppercase tracking-wide text-green-700 dark:text-green-400">Foliar & Defensivos</span>
            </div>
            <p className="font-medium text-sm text-foreground">{phase.foliarDefensivos.acao}</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">{phase.foliarDefensivos.detalhe}</p>

            {/* Calda / Receita */}
            {phase.foliarDefensivos.calda.length > 0 && (
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <Beaker className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Receita da Calda</span>
                </div>
                {phase.foliarDefensivos.calda.map((recipe, idx) => (
                  <RecipeCard key={idx} recipe={recipe} />
                ))}
              </div>
            )}

            {/* Adjuvante */}
            {phase.foliarDefensivos.adjuvante && (
              <div className="mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">+ Adjuvante</span>
                <RecipeCard recipe={phase.foliarDefensivos.adjuvante} />
              </div>
            )}

            {/* Volume de Calda */}
            {phase.foliarDefensivos.volumeCalda !== 'N/A' && (
              <div className="flex items-center gap-2 p-2 rounded bg-background border border-border/50">
                <Droplets className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">Volume de Calda:</span>
                <span className="text-xs text-primary font-bold">{phase.foliarDefensivos.volumeCalda}</span>
              </div>
            )}

            {/* Observação */}
            {phase.foliarDefensivos.observacao && (
              <div className="flex items-start gap-2 mt-3 p-2 rounded bg-warning/5 border border-warning/20">
                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{phase.foliarDefensivos.observacao}</p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function CornPhenologyGuide() {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['V3_V5']));

  const togglePhase = (fase: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(fase)) next.delete(fase);
      else next.add(fase);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedPhases(new Set(CORN_PHENOLOGY_MANAGEMENT.map(p => p.fase)));
  };

  const collapseAll = () => {
    setExpandedPhases(new Set());
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Sprout className="w-6 h-6 text-primary" />
          Guia de Manejo por Fase
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Recomendações de solo, fertirrigação e foliar/defensivos por estádio fenológico do milho
        </p>
      </div>

      {/* Expand/Collapse controls */}
      <div className="flex justify-end gap-2">
        <button onClick={expandAll} className="text-xs text-primary hover:underline">Expandir tudo</button>
        <span className="text-xs text-muted-foreground">|</span>
        <button onClick={collapseAll} className="text-xs text-primary hover:underline">Recolher tudo</button>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {CORN_PHENOLOGY_MANAGEMENT.map((phase) => (
          <PhaseCard
            key={phase.fase}
            phase={phase}
            isExpanded={expandedPhases.has(phase.fase)}
            onToggle={() => togglePhase(phase.fase)}
          />
        ))}
      </div>

      {/* Legend */}
      <Card className="card-elevated">
        <CardContent className="p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Legenda de Produtos</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TIPO_PRODUTO_LABELS).map(([tipo, label]) => (
              <ProductBadge key={tipo} tipo={tipo} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
