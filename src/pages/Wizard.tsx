import { WizardProvider, useWizard, WIZARD_STEPS } from '@/contexts/WizardContext';
import { WizardProgress } from '@/components/wizard/WizardProgress';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { WizardIntroStep } from '@/components/wizard/steps/WizardIntroStep';
import { WizardMacroStep } from '@/components/wizard/steps/WizardMacroStep';
import { WizardMicroStep } from '@/components/wizard/steps/WizardMicroStep';
import { WizardCalcSoilStep } from '@/components/wizard/steps/WizardCalcSoilStep';
import { WizardSeedSelectStep } from '@/components/wizard/steps/WizardSeedSelectStep';
import { WizardSeedConfigStep } from '@/components/wizard/steps/WizardSeedConfigStep';
import { WizardInsumosStep } from '@/components/wizard/steps/WizardInsumosStep';
import { WizardCostsStep } from '@/components/wizard/steps/WizardCostsStep';
import { SprayingEquipmentStep } from '@/components/wizard/steps/spraying/SprayingEquipmentStep';
import { SprayingCostsStep } from '@/components/wizard/steps/spraying/SprayingCostsStep';
import { SprayingMixStep } from '@/components/wizard/steps/spraying/SprayingMixStep';
import { SprayingSummaryStep } from '@/components/wizard/steps/spraying/SprayingSummaryStep';
import { WizardResultStep } from '@/components/wizard/steps/WizardResultStep';
import { WizardReportStep } from '@/components/wizard/steps/WizardReportStep';
import { WizardFoliarInputStep } from '@/components/wizard/steps/WizardFoliarInputStep';
import { WizardFoliarResultStep } from '@/components/wizard/steps/WizardFoliarResultStep';

function WizardContent() {
  const { currentStep, isStarted, currentStepInfo } = useWizard();

  const renderStep = () => {
    switch (currentStepInfo.id) {
      case 'intro':
        return <WizardIntroStep />;
      case 'macro':
        return <WizardMacroStep />;
      case 'micro':
        return <WizardMicroStep />;
      case 'calc-soil':
        return <WizardCalcSoilStep />;
      case 'seed-select':
        return <WizardSeedSelectStep />;
      case 'seed-config':
        return <WizardSeedConfigStep />;
      case 'insumos':
        return <WizardInsumosStep />;
      case 'costs':
        return <WizardCostsStep />;
      case 'spraying-equipment':
        return <SprayingEquipmentStep />;
      case 'spraying-costs':
        return <SprayingCostsStep />;
      case 'spraying-mix':
        return <SprayingMixStep />;
      case 'spraying-summary':
        return <SprayingSummaryStep />;
      case 'foliar-input':
        return <WizardFoliarInputStep />;
      case 'foliar-result':
        return <WizardFoliarResultStep />;
      case 'result':
        return <WizardResultStep />;
      case 'report':
        return <WizardReportStep />;
      default:
        return <WizardIntroStep />;
    }
  };

  // Tela de introdução
  if (!isStarted) {
    return (
      <div className="max-w-2xl mx-auto">
        {renderStep()}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <WizardProgress />
      </div>

      {/* Step Content */}
      <div 
        key={currentStep}
        className="min-h-[400px]"
        style={{ animation: 'fade-in 0.3s ease-out' }}
      >
        {renderStep()}
      </div>

      {/* Navigation */}
      <WizardNavigation />
    </div>
  );
}

export default function Wizard() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
