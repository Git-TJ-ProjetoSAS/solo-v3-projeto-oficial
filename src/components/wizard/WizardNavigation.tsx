import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWizard, WIZARD_STEPS } from '@/contexts/WizardContext';

export function WizardNavigation() {
  const { currentStep, goToNextStep, goToPreviousStep, canProceed, resetWizard, totalSteps } = useWizard();

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps - 1;
  const canGoNext = canProceed(currentStep);

  const nextStep = WIZARD_STEPS[currentStep + 1];

  return (
    <div className="flex items-center justify-between pt-8 mt-8 border-t border-border">
      {/* Back */}
      <div className="w-24">
        {!isFirstStep && (
          <button
            onClick={goToPreviousStep}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        )}
      </div>

      {/* Center - Step indicator */}
      <div className="flex gap-1">
        {Array.from({ length: totalSteps - 1 }, (_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i + 1 <= currentStep ? 'bg-foreground' : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Next/Actions */}
      <div className="w-24 flex justify-end">
        {isLastStep ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={resetWizard}
            className="gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </Button>
        ) : (
          <Button 
            size="sm"
            onClick={goToNextStep} 
            disabled={!canGoNext}
            className="gap-2"
          >
            Próximo
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
