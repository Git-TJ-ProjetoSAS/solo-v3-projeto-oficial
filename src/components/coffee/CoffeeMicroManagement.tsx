import { useState } from 'react';
import { Flower2, Sprout, Apple, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhaseNutrient {
  symbol: string;
  name: string;
  concentration: string; // ex: "0.3%" — concentração na calda
  role: string;
  note?: string; // nota pedagógica opcional
}

interface Phase {
  id: string;
  title: string;
  icon: typeof Flower2;
  objective: string;
  accentClass: string;
  borderClass: string;
  bgClass: string;
  iconBgClass: string;
  nutrients: PhaseNutrient[];
}

const PHASES: Phase[] = [
  {
    id: 'pre-florada',
    title: 'Pré-Florada',
    icon: Flower2,
    objective: 'Melhorar a polinização e pegamento',
    accentClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    bgClass: 'bg-emerald-500/5',
    iconBgClass: 'bg-emerald-500/15',
    nutrients: [
      { symbol: 'B', name: 'Boro', concentration: '0.3%', role: 'Essencial para a formação do tubo polínico e fixação da florada' },
      { symbol: 'Zn', name: 'Zinco', concentration: '0.5%', role: 'Estimula a síntese de auxinas, garantindo pegamento dos frutos' },
    ],
  },
  {
    id: 'pos-florada',
    title: 'Pós-Florada',
    icon: Sprout,
    objective: 'Estimular o crescimento de ramos novos',
    accentClass: 'text-teal-400',
    borderClass: 'border-teal-500/30',
    bgClass: 'bg-teal-500/5',
    iconBgClass: 'bg-teal-500/15',
    nutrients: [
      { symbol: 'Zn', name: 'Zinco', concentration: '0.5%', role: 'Promove elongação celular e desenvolvimento vegetativo dos ramos' },
      {
        symbol: 'Mg', name: 'Magnésio', concentration: '0.5%',
        role: 'Componente central da clorofila, otimiza a fotossíntese ativa',
        note: 'Embora seja um macronutriente secundário, no Conilon o Magnésio é muito exigido via foliar para evitar o amarelecimento entre as nervuras das folhas velhas durante a carga pendente.',
      },
    ],
  },
  {
    id: 'enchimento',
    title: 'Enchimento de Grãos',
    icon: Apple,
    objective: 'Transportar açúcar para o grão e evitar queda',
    accentClass: 'text-sky-400',
    borderClass: 'border-sky-500/30',
    bgClass: 'bg-sky-500/5',
    iconBgClass: 'bg-sky-500/15',
    nutrients: [
      { symbol: 'K', name: 'Potássio', concentration: '1.0%', role: 'Regula o transporte de fotoassimilados e açúcares para o grão' },
      { symbol: 'B', name: 'Boro', concentration: '0.3%', role: 'Mantém integridade da parede celular, prevenindo queda de frutos' },
    ],
  },
];

export function CoffeeMicroManagement() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Sprout className="w-5 h-5 text-emerald-400" />
          Manejo de Micronutrientes
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Recomendações foliares por fase fenológica para maximizar qualidade e produtividade
        </p>
      </div>

      <div className="space-y-3">
        {PHASES.map((phase) => {
          const isOpen = expanded === phase.id;
          const Icon = phase.icon;

          return (
            <div
              key={phase.id}
              className={cn(
                'rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden',
                isOpen ? phase.borderClass : 'border-border',
                isOpen ? phase.bgClass : 'hover:border-muted-foreground/30'
              )}
              onClick={() => toggle(phase.id)}
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-4">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    isOpen ? phase.iconBgClass : 'bg-secondary'
                  )}
                >
                  <Icon className={cn('w-5 h-5', isOpen ? phase.accentClass : 'text-muted-foreground')} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold', isOpen ? phase.accentClass : 'text-foreground')}>
                    {phase.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {phase.objective}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Nutrient pills */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    {phase.nutrients.map((n) => (
                      <span
                        key={n.symbol}
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                          isOpen
                            ? `${phase.borderClass} ${phase.accentClass}`
                            : 'border-border text-muted-foreground'
                        )}
                      >
                        {n.symbol}
                      </span>
                    ))}
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-muted-foreground transition-transform duration-300',
                      isOpen && 'rotate-180'
                    )}
                  />
                </div>
              </div>

              {/* Expanded content */}
              <div
                className={cn(
                  'grid transition-all duration-300 ease-out',
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                )}
              >
                <div className="overflow-hidden">
                  <div className="px-4 pb-4 space-y-2.5">
                    {phase.nutrients.map((nutrient) => (
                      <div
                        key={nutrient.symbol}
                        className="rounded-xl bg-background/60 border border-border p-3 flex items-start gap-3"
                      >
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <div
                            className={cn(
                              'w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm',
                              phase.iconBgClass,
                              phase.accentClass
                            )}
                          >
                            {nutrient.symbol}
                          </div>
                          <span className={cn('text-[10px] font-semibold', phase.accentClass)}>
                            {nutrient.concentration}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{nutrient.name}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground">
                              {nutrient.concentration} na calda
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                            {nutrient.role}
                          </p>
                          {nutrient.note && (
                            <p className="text-[11px] text-amber-400/80 leading-relaxed mt-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                              💡 {nutrient.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
