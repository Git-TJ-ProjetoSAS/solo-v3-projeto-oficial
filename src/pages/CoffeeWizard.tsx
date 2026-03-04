// Coffee Wizard - v2
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CoffeeProvider, useCoffee } from '@/contexts/CoffeeContext';
import { CoffeeIntroStep } from '@/components/coffee/CoffeeIntroStep';
import { CoffeeProgress } from '@/components/coffee/CoffeeProgress';
import { CoffeeNavigation } from '@/components/coffee/CoffeeNavigation';
import { CoffeeResultStep } from '@/components/coffee/CoffeeResultStep';
import { CoffeeSoilAnalysisStep } from '@/components/coffee/CoffeeSoilAnalysisStep';

import { CoffeeProductivityStep } from '@/components/coffee/CoffeeProductivityStep';
import { CoffeeInsumosStep } from '@/components/coffee/CoffeeInsumosStep';
import { CoffeeLimingStep } from '@/components/coffee/CoffeeLimingStep';
import { CoffeeFertigationSprayingStep } from '@/components/coffee/CoffeeFertigationSprayingStep';
import { CoffeePlantingFertStep } from '@/components/coffee/CoffeePlantingFertStep';

const STEP_INSUMO_CONFIG: Record<string, { tipoProduto: string; title: string; description: string }> = {
  correction: {
    tipoProduto: 'Correção de Solo',
    title: 'Correção de Solo',
    description: 'Selecione os insumos de correção de solo cadastrados para esta etapa',
  },
  coverage: {
    tipoProduto: 'Cobertura',
    title: 'Cobertura',
    description: 'Selecione os insumos de cobertura cadastrados para esta etapa',
  },
  maintenance: {
    tipoProduto: 'Plantio',
    title: 'Manutenção',
    description: 'Selecione os insumos de adubação/manutenção cadastrados para esta etapa',
  },
  herbicides: {
    tipoProduto: 'Herbicida',
    title: 'Herbicidas',
    description: 'Selecione os herbicidas cadastrados para esta etapa',
  },
  foliar: {
    tipoProduto: 'Foliar',
    title: 'Foliar',
    description: 'Selecione os produtos foliares cadastrados para esta etapa',
  },
  adjuvants: {
    tipoProduto: 'Adjuvantes',
    title: 'Adjuvantes',
    description: 'Selecione os adjuvantes cadastrados para esta etapa',
  },
};

function CoffeeWizardContent() {
  const { currentStep, isStarted, currentStepInfo, resetCoffee } = useCoffee();
  const location = useLocation();
  const navigate = useNavigate();
  const didReset = useRef(false);

  // Mount guard: if navigated with freshStart flag, force reset to step 0
  useEffect(() => {
    if (location.state?.freshStart && !didReset.current) {
      didReset.current = true;
      resetCoffee();
      // Clear navigation state to prevent re-triggering on re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, resetCoffee, navigate, location.pathname]);

  const renderStep = () => {
    // Check if the step has an insumo config
    const insumoConfig = STEP_INSUMO_CONFIG[currentStepInfo.id];
    if (insumoConfig) {
      return (
        <CoffeeInsumosStep
          tipoProduto={insumoConfig.tipoProduto}
          title={insumoConfig.title}
          description={insumoConfig.description}
        />
      );
    }

    switch (currentStepInfo.id) {
      case 'intro':
        return <CoffeeIntroStep />;
      case 'soil-analysis':
        return <CoffeeSoilAnalysisStep />;
      case 'productivity':
        return <CoffeeProductivityStep />;
      case 'planting-fert':
        return <CoffeePlantingFertStep />;
      case 'liming':
        return <CoffeeLimingStep />;
      case 'fertigation-spraying':
        return <CoffeeFertigationSprayingStep />;
      case 'result':
        return <CoffeeResultStep />;
      default:
        return <CoffeeIntroStep />;
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
        <CoffeeProgress />
      </div>

      <div
        key={currentStep}
        className="min-h-[400px]"
        style={{ animation: 'fade-in 0.3s ease-out' }}
      >
        {renderStep()}
      </div>

      <CoffeeNavigation />
    </div>
  );
}

export default function CoffeeWizard() {
  return (
    <CoffeeProvider>
      <CoffeeWizardContent />
    </CoffeeProvider>
  );
}
