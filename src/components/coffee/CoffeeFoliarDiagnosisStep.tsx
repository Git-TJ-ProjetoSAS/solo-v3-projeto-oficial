import { useState } from 'react';
import { useCoffee } from '@/contexts/CoffeeContext';
import { cn } from '@/lib/utils';
import { Leaf, AlertTriangle, Droplets, Eye, ChevronDown, FlaskConical, Camera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CoffeeLeafAnalysis } from './CoffeeLeafAnalysis';
import { FoliarDeficiencyIdentifier } from './FoliarDeficiencyIdentifier';

interface Symptom {
  id: string;
  nutrient: string;
  symbol: string;
  location: 'old' | 'young';
  locationLabel: string;
  description: string;
  solution: string;
  whenToAct: string;
  whyItMatters: string;
  accentClass: string;
  iconBgClass: string;
}

const SYMPTOMS: Symptom[] = [
  {
    id: 'n',
    nutrient: 'Nitrogênio',
    symbol: 'N',
    location: 'old',
    locationLabel: 'Folhas Velhas',
    description: 'Clorose (amarelecimento) generalizada começando pelas folhas mais baixas, que progride para necrose.',
    solution: 'Reforçar adubação de cobertura com Ureia ou Sulfato de Amônio (20–30 kg/ha de N).',
    whenToAct: 'Ao notar amarelecimento nas folhas basais, preferencialmente entre Set–Nov.',
    whyItMatters: 'O nitrogênio é móvel na planta — quando falta, ele é translocado das folhas velhas para as novas, causando a clorose de baixo para cima.',
    accentClass: 'text-amber-400',
    iconBgClass: 'bg-amber-500/15',
  },
  {
    id: 'mg',
    nutrient: 'Magnésio',
    symbol: 'Mg',
    location: 'old',
    locationLabel: 'Folhas Velhas',
    description: 'Amarelecimento internerval — as nervuras permanecem verdes formando o padrão "espinha de peixe".',
    solution: 'Aplicação foliar de Sulfato de Magnésio (2%) ou Calcário Dolomítico na calagem.',
    whenToAct: 'Durante a fase de enchimento de grãos ou quando a carga pendente é alta.',
    whyItMatters: 'O Mg é o átomo central da molécula de clorofila. Sua deficiência reduz a fotossíntese e o acúmulo de açúcar nos frutos.',
    accentClass: 'text-emerald-400',
    iconBgClass: 'bg-emerald-500/15',
  },
  {
    id: 'zn',
    nutrient: 'Zinco',
    symbol: 'Zn',
    location: 'young',
    locationLabel: 'Folhas Jovens',
    description: 'Folhas novas pequenas, estreitas e deformadas. Encurtamento de entrenós formando "roseta".',
    solution: 'Pulverização com Sulfato de Zinco (0,5%) ou Quelatos de Zinco via foliar.',
    whenToAct: 'Na fase vegetativa, antes da florada (Jul–Set).',
    whyItMatters: 'O Zinco é essencial para a síntese de auxinas (hormônio de crescimento). Sem ele, o crescimento vegetativo é severamente comprometido.',
    accentClass: 'text-sky-400',
    iconBgClass: 'bg-sky-500/15',
  },
  {
    id: 'b',
    nutrient: 'Boro',
    symbol: 'B',
    location: 'young',
    locationLabel: 'Folhas Jovens / Flores',
    description: 'Morte de ponteiros, folhas novas deformadas e endurecidas. Queda de flores e frutos pequenos.',
    solution: 'Aplicação foliar de Ácido Bórico (0,3%) ou Bórax no solo (10–15 kg/ha).',
    whenToAct: 'Antes da florada e durante o pegamento dos frutos (Ago–Out).',
    whyItMatters: 'O Boro é imóvel na planta e essencial para a formação do tubo polínico. Sua falta compromete diretamente a produção.',
    accentClass: 'text-violet-400',
    iconBgClass: 'bg-violet-500/15',
  },
  {
    id: 'k',
    nutrient: 'Potássio',
    symbol: 'K',
    location: 'old',
    locationLabel: 'Folhas Velhas',
    description: 'Necrose (queima) nas bordas das folhas mais velhas, progredindo para o centro.',
    solution: 'Adubação com Cloreto de Potássio (KCl) ou Sulfato de Potássio parcelada na fertirrigação.',
    whenToAct: 'Principalmente entre Dez–Fev, durante o enchimento de grãos.',
    whyItMatters: 'O Potássio regula a abertura dos estômatos e o transporte de açúcar. Sua deficiência afeta diretamente o peso e a qualidade dos grãos.',
    accentClass: 'text-orange-400',
    iconBgClass: 'bg-orange-500/15',
  },
  {
    id: 'fe',
    nutrient: 'Ferro',
    symbol: 'Fe',
    location: 'young',
    locationLabel: 'Folhas Jovens',
    description: 'Clorose internerval nas folhas mais novas — nervuras verdes com limbo amarelo-esbranquiçado.',
    solution: 'Aplicação foliar de Quelato de Ferro (Fe-EDDHA) ou Sulfato Ferroso (0,5%).',
    whenToAct: 'Em solos com pH acima de 6,5 ou após calagem excessiva.',
    whyItMatters: 'O Fe é imóvel e necessário para a síntese de clorofila. Solos alcalinos reduzem sua disponibilidade drasticamente.',
    accentClass: 'text-red-400',
    iconBgClass: 'bg-red-500/15',
  },
];

export function CoffeeFoliarDiagnosisStep() {
  const { coffeeData } = useCoffee();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const coffeeLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica';

  const oldLeafSymptoms = SYMPTOMS.filter((s) => s.location === 'old');
  const youngLeafSymptoms = SYMPTOMS.filter((s) => s.location === 'young');

  const toggleSymptom = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Diagnóstico Foliar — Café {coffeeLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          Identifique deficiências por observação visual ou insira dados de análise laboratorial
        </p>
      </div>

      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="visual" className="gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Diagnóstico Visual
          </TabsTrigger>
          <TabsTrigger value="lab" className="gap-1.5">
            <FlaskConical className="w-3.5 h-3.5" />
            Análise Foliar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="mt-6 space-y-8">
          {/* AI Photo Identifier */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Identificação por Foto
                </h3>
                <p className="text-[11px] text-muted-foreground">Envie uma foto da folha para diagnóstico automático por IA</p>
              </div>
            </div>
            <FoliarDeficiencyIdentifier />
          </div>

          {/* Intro card */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-secondary border border-border">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-0.5">Guia de Diagnóstico Visual</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Observe suas plantas no campo e identifique os sintomas abaixo. Clique no nutriente correspondente para ver a ação recomendada, quando agir e o motivo técnico.
              </p>
            </div>
          </div>

          <SymptomGroup
            title="Sintomas em Folhas Velhas"
            subtitle="Nutrientes móveis — translocados para folhas novas quando em falta"
            symptoms={oldLeafSymptoms}
            selectedId={selectedId}
            onToggle={toggleSymptom}
          />

          <SymptomGroup
            title="Sintomas em Folhas Jovens"
            subtitle="Nutrientes imóveis — não se redistribuem na planta"
            symptoms={youngLeafSymptoms}
            selectedId={selectedId}
            onToggle={toggleSymptom}
          />
        </TabsContent>

        <TabsContent value="lab" className="mt-6">
          <CoffeeLeafAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SymptomGroup({
  title,
  subtitle,
  symptoms,
  selectedId,
  onToggle,
}: {
  title: string;
  subtitle: string;
  symptoms: Symptom[];
  selectedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Leaf className="w-4 h-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            {title}
          </h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-2">
        {symptoms.map((symptom) => (
          <SymptomCard
            key={symptom.id}
            symptom={symptom}
            isOpen={selectedId === symptom.id}
            onToggle={() => onToggle(symptom.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SymptomCard({
  symptom,
  isOpen,
  onToggle,
}: {
  symptom: Symptom;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200',
        isOpen ? 'border-primary/30 bg-primary/5' : 'border-border bg-card hover:border-primary/20'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm',
            symptom.iconBgClass,
            symptom.accentClass
          )}
        >
          {symptom.symbol}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{symptom.nutrient}</p>
          <p className="text-xs text-muted-foreground">{symptom.locationLabel}</p>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          className="px-4 pb-4 space-y-3"
          style={{ animation: 'fade-in 0.2s ease-out' }}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                Sintoma
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {symptom.description}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Droplets className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                O que fazer
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {symptom.solution}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-secondary p-3 space-y-2">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                Quando agir
              </p>
              <p className="text-xs text-foreground leading-relaxed">
                {symptom.whenToAct}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                Por que isso acontece
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {symptom.whyItMatters}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
