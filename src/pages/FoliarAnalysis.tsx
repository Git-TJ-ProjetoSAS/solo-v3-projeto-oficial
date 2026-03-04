import { useState } from 'react';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { WizardFoliarInputStep } from '@/components/wizard/steps/WizardFoliarInputStep';
import { WizardFoliarResultStep } from '@/components/wizard/steps/WizardFoliarResultStep';
import { CornSprayingOperational } from '@/components/foliar/CornSprayingOperational';
import { CornPhenologyGuide } from '@/components/foliar/CornPhenologyGuide';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, ArrowRight, Sprout, FlaskConical, Leaf, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CORN_PHENOLOGY_MANAGEMENT,
  TIPO_PRODUTO_LABELS,
  TIPO_PRODUTO_COLORS,
} from '@/data/cornPhenologyManagement';

/* Map foliar phenological stage (V4, V6, V8, VT, R1…) to management phase ID */
function mapStageToPhase(stage?: string): string {
  if (!stage) return '';
  const s = stage.toUpperCase();
  if (['V3', 'V4', 'V5'].includes(s)) return 'V3_V5';
  if (['V6', 'V7', 'V8'].includes(s)) return 'V6_V8';
  if (s === 'VT') return 'VT';
  if (s.startsWith('R')) return 'R1_R5';
  if (s === 'VE' || s === 'V1' || s === 'V2') return 'VE';
  return '';
}

type FlowPath = null | 'sem_analise' | 'com_analise';

/* Step labels per path */
const PATH_STEPS = {
  sem_analise: ['Guia de Manejo', 'Pulverização / Fertirrigação', 'Resultado & Relatório'],
  com_analise: ['Análise Foliar', 'Receituário', 'Pulverização / Fertirrigação', 'Resultado & Relatório'],
};

function FoliarFlowContent() {
  const [path, setPath] = useState<FlowPath>(null);
  const [step, setStep] = useState(0);
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const { wizardData } = useWizard();

  const totalSteps = path ? PATH_STEPS[path].length : 0;
  const progressPercent = totalSteps > 0 ? ((step + 1) / totalSteps) * 100 : 0;

  /* ─── PATH SELECTION ─── */
  if (!path) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center mb-6">
          <Leaf className="w-10 h-10 text-primary mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-foreground">Nutrição Foliar — Milho</h2>
          <p className="text-muted-foreground text-sm mt-1">Escolha como deseja iniciar</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => { setPath('sem_analise'); setStep(0); }}
            className="p-6 rounded-xl border-2 border-border hover:border-primary/50 text-left transition-all group"
          >
            <BookOpen className="w-10 h-10 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="font-bold text-foreground text-lg">Sem Análise Foliar</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use o Guia de Manejo Fenológico para selecionar a fase e gerar a receita de pulverização ou fertirrigação.
            </p>
            <Badge variant="secondary" className="mt-3 text-[10px]">
              {CORN_PHENOLOGY_MANAGEMENT.length} fases disponíveis
            </Badge>
          </button>

          <button
            onClick={() => { setPath('com_analise'); setStep(0); }}
            className="p-6 rounded-xl border-2 border-border hover:border-primary/50 text-left transition-all group"
          >
            <FlaskConical className="w-10 h-10 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="font-bold text-foreground text-lg">Com Análise Foliar</p>
            <p className="text-sm text-muted-foreground mt-1">
              Envie um laudo laboratorial ou foto da folha para diagnóstico automático por IA, depois configure a aplicação.
            </p>
            <Badge variant="secondary" className="mt-3 text-[10px]">IA + Laudo OCR</Badge>
          </button>
        </div>
      </div>
    );
  }

  /* ─── PROGRESS BAR ─── */
  const StepHeader = () => (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (step === 0) { setPath(null); setSelectedPhase(''); }
            else setStep(step - 1);
          }}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? 'Voltar ao Início' : 'Voltar'}
        </button>
        <span className="text-xs text-muted-foreground">
          {step + 1} de {totalSteps}
        </span>
      </div>
      <Progress value={progressPercent} className="h-1.5" />
      <div className="flex gap-1 justify-center">
        {PATH_STEPS[path].map((label, i) => (
          <span
            key={i}
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full transition-colors',
              i === step
                ? 'bg-primary text-primary-foreground font-semibold'
                : i < step
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );

  /* ═══════════ PATH A: SEM ANÁLISE ═══════════ */
  if (path === 'sem_analise') {
    // Step 0: Phase selection (guide-style)
    if (step === 0) {
      return (
        <div className="max-w-3xl mx-auto animate-fade-in">
          <StepHeader />
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
              <Sprout className="w-5 h-5 text-primary" />
              Selecione a Fase Fenológica
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Escolha o estádio atual da lavoura para gerar a receita
            </p>
          </div>

          <div className="space-y-3">
            {CORN_PHENOLOGY_MANAGEMENT.map(p => {
              const sprayCount = p.foliarDefensivos.calda.length;
              const fertiCount = p.fertirrigacao?.calda?.length || 0;
              const totalProducts = sprayCount + fertiCount;
              return (
                <button
                  key={p.fase}
                  onClick={() => setSelectedPhase(p.fase)}
                  className={cn(
                    'w-full text-left rounded-xl border-2 p-4 transition-all',
                    selectedPhase === p.fase ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.icone}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{p.faseLabel}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.identificacaoVisual}</p>
                      <div className="flex gap-2 mt-1">
                        {sprayCount > 0 && (
                          <span className="text-[10px] text-muted-foreground">🧪 {sprayCount} pulv.</span>
                        )}
                        {fertiCount > 0 && (
                          <span className="text-[10px] text-muted-foreground">💧 {fertiCount} ferti.</span>
                        )}
                        {p.solo && (
                          <span className="text-[10px] text-muted-foreground">🚜 Solo</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {totalProducts} produto(s)
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setStep(1)}
              disabled={!selectedPhase}
              className="gap-2"
            >
              Configurar Aplicação <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Step 1 & 2: Spraying operational (has its own mode→equipment→result flow)
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <StepHeader />
        <CornSprayingOperational initialPhase={selectedPhase} />
      </div>
    );
  }

  /* ═══════════ PATH B: COM ANÁLISE ═══════════ */
  if (path === 'com_analise') {
    // Step 0: Foliar input
    if (step === 0) {
      return (
        <div className="max-w-3xl mx-auto animate-fade-in">
          <StepHeader />
          <WizardFoliarInputStep onComplete={() => setStep(1)} />
        </div>
      );
    }

    // Step 1: Foliar result (receituário)
    if (step === 1) {
      return (
        <div className="max-w-3xl mx-auto animate-fade-in">
          <StepHeader />
          <WizardFoliarResultStep />
          <div className="flex justify-end mt-6">
            <Button onClick={() => setStep(2)} className="gap-2">
              Configurar Aplicação <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Step 2 & 3: Spraying operational — phase from foliar analysis
    const resolvedPhase = mapStageToPhase(wizardData.foliar?.phenologicalStage);
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <StepHeader />
        <CornSprayingOperational initialPhase={resolvedPhase || undefined} />
      </div>
    );
  }

  return null;
}

export default function FoliarAnalysis() {
  return (
    <WizardProvider>
      <FoliarFlowContent />
    </WizardProvider>
  );
}
