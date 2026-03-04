import { CoffeeProvider } from '@/contexts/CoffeeContext';
import { FoliarProvider, useFoliar, FOLIAR_STEPS, FOLIAR_TOTAL_STEPS } from '@/contexts/FoliarContext';
import { FoliarIntroStep } from '@/components/foliar/FoliarIntroStep';
import { FoliarResultStep } from '@/components/foliar/FoliarResultStep';
import { CoffeeFoliarDiagnosisStep } from '@/components/coffee/CoffeeFoliarDiagnosisStep';
import { CoffeeFertigationSprayingStep } from '@/components/coffee/CoffeeFertigationSprayingStep';
import { ArrowLeft, ArrowRight, Leaf, FlaskConical, Droplets, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Step icons ──────────────────────────────────────────────
const STEP_ICONS: Record<string, React.ElementType> = {
  'intro': Leaf,
  'foliar-diagnosis': FlaskConical,
  'fertigation-spraying': Droplets,
  'result': FileText,
};

// ─── Progress ────────────────────────────────────────────────
function FoliarProgress() {
  const { currentStep } = useFoliar();
  const steps = FOLIAR_STEPS.filter((_, i) => i > 0);
  const adjustedCurrent = currentStep - 1;
  const currentStepData = steps[adjustedCurrent];
  const CurrentIcon = currentStepData ? STEP_ICONS[currentStepData.id] || FlaskConical : FlaskConical;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <CurrentIcon className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          {currentStepData?.title || ''}
        </span>
        <span className="text-xs text-muted-foreground">
          ({adjustedCurrent + 1}/{steps.length})
        </span>
      </div>
      <div className="flex items-center gap-1">
        {steps.map((step, index) => (
          <div key={step.id} className="flex-1">
            <div
              className={cn(
                'h-1 rounded-full transition-colors duration-200',
                index <= adjustedCurrent ? 'bg-primary' : 'bg-secondary'
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Navigation ──────────────────────────────────────────────
function FoliarNavigation() {
  const { currentStep, goToNextStep, goToPreviousStep, currentStepInfo } = useFoliar();
  const isLastStep = currentStep >= FOLIAR_TOTAL_STEPS - 1;

  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
      <Button variant="ghost" onClick={goToPreviousStep} disabled={currentStep <= 1} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>
      <span className="text-xs text-muted-foreground">{currentStepInfo.title}</span>
      {!isLastStep ? (
        <Button onClick={goToNextStep} className="gap-2">
          Avançar
          <ArrowRight className="w-4 h-4" />
        </Button>
      ) : (
        <div className="w-[100px]" />
      )}
    </div>
  );
}

// ─── Wizard Content ──────────────────────────────────────────
function FoliarWizardContent() {
  const { currentStep, isStarted, currentStepInfo } = useFoliar();

  const renderStep = () => {
    switch (currentStepInfo.id) {
      case 'intro':
        return <FoliarIntroStep />;
      case 'foliar-diagnosis':
        return <CoffeeFoliarDiagnosisStep />;
      case 'fertigation-spraying':
        return <CoffeeFertigationSprayingStep />;
      case 'result':
        return <FoliarResultStep />;
      default:
        return <FoliarIntroStep />;
    }
  };

  if (!isStarted) {
    return (
      <div className="max-w-2xl mx-auto">
        {renderStep()}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <FoliarProgress />
      </div>
      <div
        key={currentStep}
        className="min-h-[400px]"
        style={{ animation: 'fade-in 0.3s ease-out' }}
      >
        {renderStep()}
      </div>
      <FoliarNavigation />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────
export default function FoliarWizard() {
  return (
    <CoffeeProvider>
      <FoliarProvider>
        <FoliarWizardContent />
      </FoliarProvider>
    </CoffeeProvider>
  );
}
