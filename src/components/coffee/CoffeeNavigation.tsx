import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCoffee, COFFEE_TOTAL_STEPS } from '@/contexts/CoffeeContext';

export function CoffeeNavigation() {
  const { currentStep, goToNextStep, goToPreviousStep, canProceed, currentStepInfo } = useCoffee();

  const isLastStep = currentStep >= COFFEE_TOTAL_STEPS - 1;

  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-border relative z-20 bg-background">
      <Button
        variant="ghost"
        onClick={goToPreviousStep}
        disabled={currentStep <= 1}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      <span className="text-xs text-muted-foreground">
        {currentStepInfo.title}
      </span>

      {!isLastStep ? (
        <Button
          onClick={goToNextStep}
          disabled={!canProceed()}
          className="gap-2"
        >
          Avançar
          <ArrowRight className="w-4 h-4" />
        </Button>
      ) : (
        <div className="w-[100px]" />
      )}
    </div>
  );
}
