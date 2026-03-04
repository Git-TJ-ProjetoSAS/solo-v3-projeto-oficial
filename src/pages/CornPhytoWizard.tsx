import { CornPhytoProvider, useCornPhyto, CORN_PHYTO_STEPS, CORN_PHYTO_TOTAL_STEPS } from '@/contexts/CornPhytoContext';
import { CornPhytoCaptureStep } from '@/components/cornPhyto/CornPhytoCaptureStep';
import { CornPhytoTriageStep } from '@/components/cornPhyto/CornPhytoTriageStep';
import { CornPhytoRecommendationStep } from '@/components/cornPhyto/CornPhytoRecommendationStep';
import { CornPhytoSprayStep } from '@/components/cornPhyto/CornPhytoSprayStep';
import { ArrowLeft, ArrowRight, Camera, ScanSearch, Pill, Droplets, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEP_ICONS: Record<string, React.ElementType> = {
  capture: Camera,
  triage: ScanSearch,
  recommendation: Pill,
  spray: Droplets,
};

function CornPhytoProgress() {
  const { currentStep } = useCornPhyto();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        {(() => {
          const step = CORN_PHYTO_STEPS[currentStep];
          const Icon = step ? STEP_ICONS[step.id] || Camera : Camera;
          return (
            <>
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">{step?.title}</span>
              <span className="text-xs text-muted-foreground">({currentStep + 1}/{CORN_PHYTO_TOTAL_STEPS})</span>
            </>
          );
        })()}
      </div>
      <div className="flex items-center gap-1">
        {CORN_PHYTO_STEPS.map((step, index) => (
          <div key={step.id} className="flex-1">
            <div className={cn('h-1 rounded-full transition-colors duration-200',
              index <= currentStep ? 'bg-primary' : 'bg-secondary')} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CornPhytoNavigation() {
  const { currentStep, goToNextStep, goToPreviousStep } = useCornPhyto();
  const isFirst = currentStep === 0;
  const isLast = currentStep >= CORN_PHYTO_TOTAL_STEPS - 1;

  // Step 0 has its own "Analyze" button, step 1 has its own "Confirm" button, step 2 has "Calculate" button
  // Only show generic nav on the last step
  if (currentStep < 3) {
    return (
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <Button variant="ghost" onClick={goToPreviousStep} disabled={isFirst} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <span className="text-xs text-muted-foreground">{CORN_PHYTO_STEPS[currentStep]?.title}</span>
        <div className="w-[100px]" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
      <Button variant="ghost" onClick={goToPreviousStep} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>
      <span className="text-xs text-muted-foreground">{CORN_PHYTO_STEPS[currentStep]?.title}</span>
      <div className="w-[100px]" />
    </div>
  );
}

function CornPhytoWizardContent() {
  const { currentStep, currentStepInfo } = useCornPhyto();

  const renderStep = () => {
    switch (currentStepInfo.id) {
      case 'capture': return <CornPhytoCaptureStep />;
      case 'triage': return <CornPhytoTriageStep />;
      case 'recommendation': return <CornPhytoRecommendationStep />;
      case 'spray': return <CornPhytoSprayStep />;
      default: return <CornPhytoCaptureStep />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <CornPhytoProgress />
      </div>
      <div key={currentStep} className="min-h-[400px]" style={{ animation: 'fade-in 0.3s ease-out' }}>
        {renderStep()}
      </div>
      {currentStep > 0 && <CornPhytoNavigation />}
    </div>
  );
}

export default function CornPhytoWizard() {
  return (
    <CornPhytoProvider>
      <CornPhytoWizardContent />
    </CornPhytoProvider>
  );
}
