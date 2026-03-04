import { 
  Check, 
  FlaskConical, 
  Microscope, 
  Calculator, 
  Wheat, 
  Settings2, 
  Package, 
  DollarSign,
  Tractor,
  Receipt,
  Beaker,
  ClipboardList,
  Target,
  FileText,
  Leaf,
  ScanLine,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWizard, WIZARD_STEPS } from '@/contexts/WizardContext';

// Map step IDs to icons
const STEP_ICONS: Record<string, LucideIcon> = {
  'intro': FlaskConical,
  'macro': FlaskConical,
  'micro': Microscope,
  'calc-soil': Calculator,
  'seed-select': Wheat,
  'seed-config': Settings2,
  'insumos': Package,
  'costs': DollarSign,
  'spraying-equipment': Tractor,
  'spraying-costs': Receipt,
  'spraying-mix': Beaker,
  'spraying-summary': ClipboardList,
  'foliar-input': Leaf,
  'foliar-result': ScanLine,
  'result': Target,
  'report': FileText,
};

export function WizardProgress() {
  const { currentStep, setCurrentStep, canProceed, totalSteps } = useWizard();

  // Skip intro step (index 0) in progress display
  const displaySteps = WIZARD_STEPS.slice(1);
  const displayCurrentStep = currentStep; // currentStep is 1-indexed for display

  const handleStepClick = (stepNumber: number) => {
    if (stepNumber <= currentStep) {
      setCurrentStep(stepNumber);
    } else if (canProceed(stepNumber - 1)) {
      setCurrentStep(stepNumber);
    }
  };

  // Get the current step's icon
  const CurrentStepIcon = STEP_ICONS[WIZARD_STEPS[currentStep]?.id] || FlaskConical;

  return (
    <div className="w-full">
      {/* Desktop - Mini Steps */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CurrentStepIcon className="w-5 h-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">
              {WIZARD_STEPS[currentStep]?.title}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {currentStep} de {totalSteps - 1}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-foreground transition-all duration-300 rounded-full"
            style={{ width: `${((currentStep) / (totalSteps - 1)) * 100}%` }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mt-3">
          {displaySteps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = currentStep > stepNumber;
            const isCurrent = currentStep === stepNumber;
            const isClickable = stepNumber <= currentStep || canProceed(stepNumber - 1);

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(stepNumber)}
                disabled={!isClickable}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200",
                  isCompleted && "bg-foreground text-background",
                  isCurrent && "bg-foreground text-background ring-4 ring-secondary",
                  !isCompleted && !isCurrent && "bg-secondary text-muted-foreground",
                  !isClickable && "opacity-40 cursor-not-allowed"
                )}
                title={step.title}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : stepNumber}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CurrentStepIcon className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium text-foreground">
              {WIZARD_STEPS[currentStep]?.title}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {currentStep}/{totalSteps - 1}
          </span>
        </div>
        
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-foreground transition-all duration-300 rounded-full"
            style={{ width: `${((currentStep) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
