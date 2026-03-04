import { CoffeeProvider } from '@/contexts/CoffeeContext';
import { PhytoProvider, usePhyto, PHYTO_STEPS, PHYTO_TOTAL_STEPS } from '@/contexts/PhytoContext';
import { PhytoIntroStep } from '@/components/phyto/PhytoIntroStep';
import { PhytoResultStep } from '@/components/phyto/PhytoResultStep';
import { PhytoReportStep } from '@/components/phyto/PhytoReportStep';
import { CoffeeDiseaseStep } from '@/components/coffee/CoffeeDiseaseStep';
import { CoffeeFertigationSprayingStep } from '@/components/coffee/CoffeeFertigationSprayingStep';
import { ArrowLeft, ArrowRight, ShieldAlert, FlaskConical, Droplets, FileText, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Step icons ──────────────────────────────────────────────
const STEP_ICONS: Record<string, React.ElementType> = {
  'intro': ShieldAlert,
  'disease-treatment': FlaskConical,
  'fertigation-spraying': Droplets,
  'result': FileText,
  'report': ClipboardList,
};

// ─── Progress ────────────────────────────────────────────────
function PhytoProgress() {
  const { currentStep } = usePhyto();
  const steps = PHYTO_STEPS.filter((_, i) => i > 0);
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
function PhytoNavigation() {
  const { currentStep, goToNextStep, goToPreviousStep, currentStepInfo } = usePhyto();
  const isLastStep = currentStep >= PHYTO_TOTAL_STEPS - 1;

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
function PhytoWizardContent() {
  const { currentStep, isStarted, currentStepInfo } = usePhyto();

  const renderStep = () => {
    switch (currentStepInfo.id) {
      case 'intro':
        return <PhytoIntroStep />;
      case 'disease-treatment':
        return <CoffeeDiseaseStep />;
      case 'fertigation-spraying':
        return <CoffeeFertigationSprayingStep phytoOnly />;
      case 'result':
        return <PhytoResultStep />;
      case 'report':
        return <PhytoReportStep />;
      default:
        return <PhytoIntroStep />;
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
        <PhytoProgress />
      </div>
      <div
        key={currentStep}
        className="min-h-[400px]"
        style={{ animation: 'fade-in 0.3s ease-out' }}
      >
        {renderStep()}
      </div>
      <PhytoNavigation />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────
export default function PhytoWizard() {
  return (
    <CoffeeProvider>
      <PhytoProvider>
        <PhytoWizardContent />
      </PhytoProvider>
    </CoffeeProvider>
  );
}
