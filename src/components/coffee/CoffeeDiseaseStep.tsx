import { useState } from 'react';
import { useCoffee } from '@/contexts/CoffeeContext';
import { usePhyto } from '@/contexts/PhytoContext';
import { CoffeePestIdentifier } from './CoffeePestIdentifier';
import { CoffeeTreatmentPlan } from './CoffeeTreatmentPlan';
import { CoffeePhytoProtocolPdfButton } from './CoffeePhytoProtocolPdf';
import { BANCO_DEFENSIVOS, PRODUTOS_COMERCIAIS, type DefensivoEntry } from '@/data/coffeePestDatabase';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTalhoes } from '@/hooks/useTalhoes';
import { cn } from '@/lib/utils';
import {
  Bug,
  Leaf,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Calendar,
  Crosshair,
  AlertTriangle,
  Info,
  Droplets,
  Check,
  FileText,
  ArrowRight,
  Settings2,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ─── Helpers ─────────────────────────────────────────────────
const TIPO_COLORS: Record<string, string> = {
  'Fungicida Sistêmico': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  'Fungicida': 'bg-violet-500/10 text-violet-400 border-violet-500/15',
  'Inseticida': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'Acaricida': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  'Bactericida': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'Nematicida': 'bg-rose-500/15 text-rose-400 border-rose-500/20',
};

const SEVERIDADE_CONFIG = {
  alta: { label: 'Alta', class: 'bg-red-500/15 text-red-400 border-red-500/20' },
  media: { label: 'Média', class: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  baixa: { label: 'Baixa', class: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
};

// ─── Card Component ──────────────────────────────────────────
function DefensivoCard({
  entry,
  isSelected,
  onToggle,
}: {
  entry: DefensivoEntry;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const tipoClass = TIPO_COLORS[entry.tipo] || 'bg-secondary text-muted-foreground';
  const sevConfig = SEVERIDADE_CONFIG[entry.severidade];
  const isDoenca = entry.categoria === 'doenca';

  const isBoth = entry.culturas.length === 2;
  const culturaLabel = isBoth
    ? 'Ambos'
    : entry.culturas[0] === 'conilon'
    ? 'Conilon'
    : 'Arábica';

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card overflow-hidden transition-all',
        isSelected
          ? 'border-primary/40 ring-1 ring-primary/20'
          : 'border-border',
        expanded && !isSelected && 'border-primary/20'
      )}
    >
      <div className="flex items-stretch">
        {/* Selection toggle */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'w-12 shrink-0 flex items-center justify-center border-r transition-colors',
            isSelected
              ? 'bg-primary/10 border-primary/20'
              : 'bg-secondary/20 border-border hover:bg-secondary/40'
          )}
        >
          <div className={cn(
            'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all',
            isSelected
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/30'
          )}>
            {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
          </div>
        </button>

        {/* Main content */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left p-4 flex items-start gap-3 hover:bg-secondary/30 transition-colors"
        >
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
            isDoenca ? 'bg-violet-500/10' : 'bg-amber-500/10'
          )}>
            {isDoenca ? (
              <Leaf className="w-4 h-4 text-violet-400" />
            ) : (
              <Bug className="w-4 h-4 text-amber-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground leading-tight">{entry.alvo}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', tipoClass)}>
                {entry.tipo}
              </Badge>
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', sevConfig.class)}>
                Severidade {sevConfig.label}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                {culturaLabel}
              </Badge>
            </div>
          </div>

          <div className="shrink-0 mt-1">
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 ml-12" style={{ animation: 'fade-in 0.2s ease-out' }}>
          <div className="h-px bg-border" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <FlaskConical className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Princípio Ativo</p>
                <p className="text-sm font-medium text-foreground">{entry.ativos}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Droplets className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Dose Recomendada</p>
                <p className="text-sm font-medium text-foreground">{entry.dose}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Época de Aplicação</p>
                <p className="text-sm font-medium text-foreground">{entry.epoca}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Crosshair className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo de Controle</p>
                <p className="text-sm font-medium text-foreground">{entry.tipo}</p>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">{entry.obs}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function CoffeeDiseaseStep() {
  const { coffeeData, setTreatmentPlanData } = useCoffee();
  const { setCurrentStep } = usePhyto();
  const { profile } = useUserProfile();
  const { talhoes } = useTalhoes();

  const selectedCultura = (coffeeData.coffeeType as 'conilon' | 'arabica') || 'conilon';
  const [filter, setFilter] = useState<'all' | 'doenca' | 'praga'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const culturaLabel = selectedCultura === 'conilon' ? 'Conilon' : 'Arábica';
  const selectedTalhao = talhoes.find(t => t.id === coffeeData.selectedTalhaoId);

  const byCultura = BANCO_DEFENSIVOS.filter(d => d.culturas.includes(selectedCultura));
  const filtered = filter === 'all'
    ? byCultura
    : byCultura.filter(d => d.categoria === filter);

  const doencaCount = byCultura.filter(d => d.categoria === 'doenca').length;
  const pragaCount = byCultura.filter(d => d.categoria === 'praga').length;

  const selectedDefensivos = byCultura.filter(d => selectedIds.has(d.id));

  const toggleDefensivo = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Doenças & Pragas — Café {culturaLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          Selecione os alvos a tratar e calcule o preparo de calda
        </p>
      </div>

      {/* AI Pest Identifier */}
      <CoffeePestIdentifier />

      {/* Protocolo Fitossanitário — Two Options */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
          Protocolo Fitossanitário
        </p>

        {/* 1. Completo — auto-generates full PDF */}
        <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start gap-4 mb-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-foreground">Protocolo Completo</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Todos os produtos e indicações para cada fase do café {culturaLabel}. 
                Gera o relatório A4 automaticamente com cronograma por período fenológico.
              </p>
            </div>
          </div>
          <CoffeePhytoProtocolPdfButton 
            coffeeType={selectedCultura} 
            talhaoName={selectedTalhao?.name}
            consultorName={profile?.full_name || undefined}
            creaArt={profile?.crea_art || undefined}
          />
        </div>

        {/* 2. Ajustável — picks best product per type, goes to spraying */}
        <button
          type="button"
          onClick={() => {
            // Pick the BEST product per DefensivoEntry type (best cost-effectiveness)
            const filtered = PRODUTOS_COMERCIAIS.filter(p =>
              p.culturas.includes(selectedCultura)
            );

            if (filtered.length === 0) {
              toast.error('Nenhum produto encontrado para esta cultura.');
              return;
            }

            // Group products by their target type (Fungicida, Inseticida, etc.)
            const typeGroups: Record<string, typeof filtered> = {};
            filtered.forEach(prod => {
              const alvoEntry = BANCO_DEFENSIVOS.find(d => prod.alvos.includes(d.id));
              const tipo = alvoEntry?.tipo || 'Fungicida';
              if (!typeGroups[tipo]) typeGroups[tipo] = [];
              typeGroups[tipo].push(prod);
            });

            // Select best product per type (broadest coverage = most alvos, then lowest cost/ha)
            const bestProducts = Object.entries(typeGroups).map(([tipo, products]) => {
              const scored = products.map(p => {
                // Convert g/ha to Kg before dividing by tamanhoEmbalagem (Kg)
                const doseInBase = p.unidadeDose === 'g/ha' ? p.doseNumerico / 1000 : p.doseNumerico;
                const costPerHa = (doseInBase / p.tamanhoEmbalagem) * p.precoEstimado;
                const coverage = p.alvos.length;
                return { ...p, costPerHa, coverage };
              });
              // Sort by coverage desc, then cost asc
              scored.sort((a, b) => b.coverage - a.coverage || a.costPerHa - b.costPerHa);
              return { tipo, product: scored[0] };
            });

            const entries = bestProducts.map(({ tipo, product }) => {
              const alvoEntry = BANCO_DEFENSIVOS.find(d => product.alvos.includes(d.id));
              const allAlvos = product.alvos
                .map(id => BANCO_DEFENSIVOS.find(d => d.id === id)?.alvo?.split('(')[0].trim())
                .filter(Boolean)
                .join(', ');
              return {
                alvo: allAlvos || 'Geral',
                produto: product.nome,
                principioAtivo: product.principio_ativo,
                dosePerHa: product.doseNumerico,
                unidade: product.unidadeDose,
                costPerHa: product.costPerHa,
                tipoProduto: tipo,
              };
            });

            setTreatmentPlanData({
              entries,
              equipmentType: coffeeData.treatmentPlan?.equipmentType || 'trator',
              equipmentLabel: coffeeData.treatmentPlan?.equipmentLabel || 'Bomba Jato (Trator)',
              totalCostPerHa: entries.reduce((sum, e) => sum + e.costPerHa, 0),
            });

            toast.success(`${entries.length} produtos selecionados (melhor eficiência por tipo)`);
            setCurrentStep(2);
          }}
          className="w-full p-4 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Settings2 className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-foreground">Protocolo Ajustável</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Seleciona 1 produto de melhor eficiência por tipo de tratamento. 
              Permite ajustar doses e produtos antes de gerar o relatório.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-primary shrink-0" />
        </button>
      </div>

      {/* Separator */}
      <div className="flex items-center gap-3 py-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground font-medium">Banco de Defensivos</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Alert */}
      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Selecione os alvos</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Marque as doenças ou pragas que deseja tratar. O sistema calculará automaticamente 
            o preparo de calda, os custos por hectare e por saca de café.
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all' as const, label: 'Todos', count: byCultura.length },
          { key: 'doenca' as const, label: 'Doenças', count: doencaCount },
          { key: 'praga' as const, label: 'Pragas', count: pragaCount },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              'flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all border',
              filter === tab.key
                ? 'bg-primary/10 border-primary/30 text-foreground'
                : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary'
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Selection counter */}
      {selectedIds.size > 0 && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
          <span className="text-xs font-medium text-foreground flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            {selectedIds.size} {selectedIds.size === 1 ? 'alvo selecionado' : 'alvos selecionados'}
          </span>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpar
          </button>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map(entry => (
          <DefensivoCard
            key={entry.id}
            entry={entry}
            isSelected={selectedIds.has(entry.id)}
            onToggle={() => toggleDefensivo(entry.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum registro encontrado para este filtro.
          </div>
        )}
      </div>

      {/* Treatment Plan */}
      <CoffeeTreatmentPlan
        selectedDefensivos={selectedDefensivos}
        coffeeType={selectedCultura}
      />

      {/* Summary footer */}
      <div className="p-4 rounded-2xl bg-secondary/30 border border-border text-center">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{byCultura.length}</span> defensivos para {culturaLabel} • 
          <span className="font-medium text-violet-400 ml-1">{doencaCount} doenças</span> • 
          <span className="font-medium text-amber-400 ml-1">{pragaCount} pragas</span>
          {selectedIds.size > 0 && (
            <> • <span className="font-medium text-primary ml-1">{selectedIds.size} selecionados</span></>
          )}
        </p>
      </div>
    </div>
  );
}
