import { useCoffee, COFFEE_STEPS } from '@/contexts/CoffeeContext';
import { cn } from '@/lib/utils';
import {
  FlaskConical,
  Microscope,
  Calculator,
  TrendingUp,
  Layers,
  Leaf,
  Wrench,
  SprayCan,
  FileText,
} from 'lucide-react';

const STEP_ICONS: Record<string, React.ElementType> = {
  'soil-macro': FlaskConical,
  'soil-micro': Microscope,
  'soil-calc': Calculator,
  'productivity': TrendingUp,
  'correction': Layers,
  'coverage': Leaf,
  'maintenance': Wrench,
  'herbicides': SprayCan,
  'result': FileText,
};

export function CoffeeProgress() {
  const { currentStep, getVisibleSteps } = useCoffee();

  const visibleSteps = getVisibleSteps().filter((_, i) => i > 0);
  const currentStepData = COFFEE_STEPS[currentStep];

  // Find the index of the current step within visible steps
  const visibleIndex = visibleSteps.findIndex(s => s.id === currentStepData?.id);
  const adjustedCurrent = visibleIndex >= 0 ? visibleIndex : 0;

  const CurrentIcon = currentStepData ? STEP_ICONS[currentStepData.id] || FlaskConical : FlaskConical;

  return (
    <div className="space-y-3">
      {/* Icon + Label */}
      <div className="flex items-center justify-center gap-2">
        <CurrentIcon className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          {currentStepData?.title || ''}
        </span>
        <span className="text-xs text-muted-foreground">
          ({adjustedCurrent + 1}/{visibleSteps.length})
        </span>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-1">
        {visibleSteps.map((step, index) => (
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
