import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoutePrefix } from '@/hooks/useRoutePrefix';
import { ArrowRight, ArrowLeft, Coffee, Sprout, ShieldAlert, Leaf, Plus, MapPin, TreePine, Ruler, Loader2, CheckCircle2, TrendingUp, Pencil, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCoffee, CoffeeType } from '@/contexts/CoffeeContext';
import { useTalhoes, Talhao } from '@/hooks/useTalhoes';
import { TalhaoFormDialog } from '@/components/talhoes/TalhaoFormDialog';
import { cn } from '@/lib/utils';

const coffeeOptions: { id: CoffeeType; title: string; description: string; characteristics: string[] }[] = [
  {
    id: 'conilon',
    title: 'Café Conilon',
    description: 'Coffea canephora — Robusta brasileiro, adaptado a climas quentes e baixas altitudes.',
    characteristics: ['V% ideal: 60–70%', 'Alta produtividade', 'Tolerante ao calor'],
  },
  {
    id: 'arabica',
    title: 'Café Arábica',
    description: 'Coffea arabica — Grão premium, cultivo em altitudes elevadas com clima ameno.',
    characteristics: ['V% ideal: 60–70%', 'Qualidade superior', 'Clima ameno'],
  },
];

const flowOptions = [
  {
    id: 'adubacao' as const,
    title: 'Recomendação de Adubação',
    description: 'Análise de solo, nutrição, calagem, insumos e produtividade completa.',
    icon: Sprout,
    tags: ['Solo', 'Nutrição', 'Calagem', 'Produtividade'],
  },
  {
    id: 'fitossanitario' as const,
    title: 'Controle Fitossanitário',
    description: 'Manejo de doenças e pragas com cálculo de calda, pulverização e custos por hectare.',
    icon: ShieldAlert,
    tags: ['Doenças', 'Pragas', 'Pulverização', 'Custo/ha'],
  },
  {
    id: 'foliar' as const,
    title: 'Adubação Foliar',
    description: 'Diagnóstico foliar, fertirrigação e pulverização com relatório de custos por saca e hectare.',
    icon: Leaf,
    tags: ['Foliar', 'Diagnóstico', 'Fertirrigação', 'Custo/saca'],
  },
  {
    id: 'biologicos' as const,
    title: 'Controle Biológico',
    description: 'Gestão de defensivos biológicos com viabilidade climática, compatibilidade e receita de tanque.',
    icon: Bug,
    tags: ['Biológicos', 'Clima', 'Compatibilidade', 'Manejo'],
  },
];

type IntroPhase = 'select-type' | 'select-talhao' | 'select-flow';

export function CoffeeIntroStep() {
  const { coffeeData, setCoffeeType, startCoffee, canProceed, setSelectedTalhao, setHectares, setTotalPlants, setProductivity, getProductivityLevel } = useCoffee();
  const navigate = useNavigate();
  const { prefixRoute } = useRoutePrefix();
  const [phase, setPhase] = useState<IntroPhase>('select-type');
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTalhao, setEditingTalhao] = useState<Talhao | null>(null);

  const { talhoes, loading, createTalhao, updateTalhao } = useTalhoes();

  // Filter talhões by selected coffee type
  const filteredTalhoes = talhoes.filter(t => t.coffee_type === coffeeData.coffeeType);

  const selectedTalhao = filteredTalhoes.find(t => t.id === selectedTalhaoId) || null;

  const handleIniciar = () => {
    if (canProceed()) {
      setPhase('select-talhao');
    }
  };

  const handleSelectTalhao = (talhao: Talhao) => {
    setSelectedTalhaoId(talhao.id);
  };

  const handleContinueToFlow = () => {
    if (selectedTalhao) {
      setSelectedTalhao(selectedTalhao.id);
      // Sync hectares from talhão
      if (selectedTalhao.area_ha > 0) {
        setHectares(selectedTalhao.area_ha);
      }
      // Sync total plants from talhão
      if (selectedTalhao.total_plants > 0) {
        setTotalPlants(selectedTalhao.total_plants);
      }
      // Sync productivity from talhão
      if (selectedTalhao.productivity_target > 0) {
        setProductivity({
          sacasPerHectare: selectedTalhao.productivity_target,
          level: getProductivityLevel(selectedTalhao.productivity_target),
          hectares: selectedTalhao.area_ha,
        });
      }
    }
    setPhase('select-flow');
  };

  const handleFlowChoice = (flowId: 'adubacao' | 'fitossanitario' | 'foliar' | 'biologicos') => {
    if (flowId === 'adubacao') {
      startCoffee();
    } else if (flowId === 'fitossanitario') {
      navigate(prefixRoute('/fitossanitario'), {
        state: {
          coffeeType: coffeeData.coffeeType,
          talhaoId: selectedTalhaoId,
          hectares: selectedTalhao?.area_ha,
          productivityTarget: selectedTalhao?.productivity_target,
        },
      });
    } else if (flowId === 'biologicos') {
      navigate(prefixRoute('/bio'), {
        state: {
          coffeeType: coffeeData.coffeeType,
          talhaoId: selectedTalhaoId,
          hectares: selectedTalhao?.area_ha,
          productivityTarget: selectedTalhao?.productivity_target,
        },
      });
    } else {
      navigate(prefixRoute('/foliar'), {
        state: {
          coffeeType: coffeeData.coffeeType,
          talhaoId: selectedTalhaoId,
          hectares: selectedTalhao?.area_ha,
          productivityTarget: selectedTalhao?.productivity_target,
        },
      });
    }
  };

  // ─── Phase 3: Flow Selection ─────────────────────────────────
  if (phase === 'select-flow') {
    const selectedLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica';

    return (
      <div
        className="flex flex-col items-center justify-center py-10 text-center"
        style={{ animation: 'fade-in 0.4s ease-out' }}
      >
        <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mb-6">
          <Coffee className="w-8 h-8 text-background" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
          Café {selectedLabel}
        </h1>

        {selectedTalhao && (
          <div className="flex items-center gap-2 mb-2 px-4 py-2 rounded-full bg-secondary text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            {selectedTalhao.name} — {selectedTalhao.area_ha} ha
            {selectedTalhao.productivity_target > 0 && (
              <span>• {selectedTalhao.productivity_target} sc/ha</span>
            )}
          </div>
        )}

        <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
          Escolha o tipo de planejamento que deseja realizar.
        </p>

        <div className="grid gap-4 w-full max-w-md mb-8">
          {flowOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleFlowChoice(option.id)}
              className="group w-full text-left p-5 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary group-hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0">
                  <option.icon className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-foreground">{option.title}</h3>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                    {option.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {option.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[10px] rounded-full bg-secondary text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          onClick={() => setPhase('select-talhao')}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
      </div>
    );
  }

  // ─── Phase 2: Talhão Selection ───────────────────────────────
  if (phase === 'select-talhao') {
    const selectedLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica';
    const isConilon = coffeeData.coffeeType === 'conilon';

    return (
      <div
        className="flex flex-col items-center justify-center py-10 text-center"
        style={{ animation: 'fade-in 0.4s ease-out' }}
      >
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mb-6',
          isConilon ? 'bg-sky-500' : 'bg-emerald-500'
        )}>
          <MapPin className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
          Selecione o Talhão
        </h1>
        <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
          Escolha o talhão de <strong>Café {selectedLabel}</strong> para o planejamento ou cadastre um novo.
        </p>

        {/* Talhão List */}
        <div className="w-full max-w-md space-y-3 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTalhoes.length === 0 ? (
            <div className="py-8 text-center">
              <MapPin className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                Nenhum talhão de {selectedLabel} cadastrado.
              </p>
              <p className="text-xs text-muted-foreground">
                Cadastre um talhão para iniciar o planejamento.
              </p>
            </div>
          ) : (
            filteredTalhoes.map((talhao) => {
              const isSelected = selectedTalhaoId === talhao.id;
              const plantsPerHa = talhao.area_ha > 0
                ? Math.round(talhao.total_plants / talhao.area_ha)
                : 0;

              return (
                <button
                  key={talhao.id}
                  onClick={() => handleSelectTalhao(talhao)}
                  className={cn(
                    'w-full text-left p-4 rounded-2xl border-2 transition-all duration-200',
                    isSelected
                      ? isConilon
                        ? 'border-sky-500 bg-sky-500/10'
                        : 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border bg-card hover:border-primary/30'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{talhao.name}</h3>
                      {talhao.variety && (
                        <p className="text-xs text-muted-foreground mt-0.5">{talhao.variety}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTalhao(talhao);
                          setFormOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar talhão"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {isSelected && (
                        <CheckCircle2 className={cn(
                          'w-5 h-5 shrink-0',
                          isConilon ? 'text-sky-500' : 'text-emerald-500'
                        )} />
                      )}
                    </div>
                  </div>

                  <div className={cn('grid gap-2', talhao.productivity_target > 0 ? 'grid-cols-4' : 'grid-cols-3')}>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background/60">
                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">Área</p>
                        <p className="text-xs font-semibold">{talhao.area_ha} ha</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background/60">
                      <Ruler className="w-3 h-3 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">Espaçam.</p>
                        <p className="text-xs font-semibold">{talhao.row_spacing_cm}×{talhao.plant_spacing_cm}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background/60">
                      <TreePine className="w-3 h-3 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">Pl/ha</p>
                        <p className="text-xs font-semibold">{plantsPerHa.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                    {talhao.productivity_target > 0 && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background/60">
                        <TrendingUp className="w-3 h-3 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase">Meta</p>
                          <p className="text-xs font-semibold">{talhao.productivity_target} sc/ha</p>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}

          {/* Add talhão button */}
          <button
            onClick={() => setFormOpen(true)}
            className="w-full p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card/50 transition-all flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Novo Talhão
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              setPhase('select-type');
              setSelectedTalhaoId(null);
            }}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
          <Button
            size="lg"
            onClick={handleContinueToFlow}
            disabled={!selectedTalhaoId}
            className="gap-2 px-8"
          >
            Continuar
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Dialog - pass coffee type */}
        <TalhaoFormDialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingTalhao(null);
          }}
          onSubmit={createTalhao}
          onUpdate={async (id, data) => { await updateTalhao(id, data); }}
          defaultCoffeeType={coffeeData.coffeeType === 'conilon' ? 'conilon' : 'arabica'}
          editingTalhao={editingTalhao}
        />
      </div>
    );
  }

  // ─── Phase 1: Coffee Type Selection ──────────────────────────
  return (
    <div
      className="flex flex-col items-center justify-center py-10 text-center"
      style={{ animation: 'fade-in 0.4s ease-out' }}
    >
      <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mb-6">
        <Coffee className="w-8 h-8 text-background" />
      </div>

      <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
        Módulo Café
      </h1>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Selecione o tipo de café para iniciar o planejamento agronômico.
      </p>

      {/* Coffee Type Selection */}
      <div className="grid gap-3 w-full max-w-md mb-8">
        {coffeeOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setCoffeeType(option.id)}
            className={cn(
              'w-full text-left p-5 rounded-2xl border transition-all duration-200',
              coffeeData.coffeeType === option.id
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/30'
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                  coffeeData.coffeeType === option.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                <Coffee className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-1">{option.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                  {option.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {option.characteristics.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 text-[10px] rounded-full bg-secondary text-muted-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Button
        size="lg"
        onClick={handleIniciar}
        disabled={!canProceed()}
        className="gap-2 px-8"
      >
        Iniciar
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
