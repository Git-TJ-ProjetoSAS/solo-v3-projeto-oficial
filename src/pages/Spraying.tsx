import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { WizardProvider } from '@/contexts/WizardContext';
import { SprayingEquipmentStep } from '@/components/wizard/steps/spraying/SprayingEquipmentStep';
import { SprayingCostsStep } from '@/components/wizard/steps/spraying/SprayingCostsStep';
import { SprayingMixStep } from '@/components/wizard/steps/spraying/SprayingMixStep';
import { SprayingSummaryStep } from '@/components/wizard/steps/spraying/SprayingSummaryStep';
import { DrenchConfigStep } from '@/components/wizard/steps/spraying/DrenchConfigStep';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SPRAYING_TABS = [
  { id: 'equipment', label: 'Equipamento' },
  { id: 'costs', label: 'Custos' },
  { id: 'mix', label: 'Mix de Calda' },
  { id: 'drench', label: 'Drench' },
  { id: 'summary', label: 'Resumo' },
] as const;

type SprayingTab = typeof SPRAYING_TABS[number]['id'];

export default function Spraying() {
  const [activeTab, setActiveTab] = useState<SprayingTab>('equipment');

  const renderContent = () => {
    switch (activeTab) {
      case 'equipment':
        return <SprayingEquipmentStep />;
      case 'costs':
        return <SprayingCostsStep />;
      case 'mix':
        return <SprayingMixStep />;
      case 'drench':
        return <DrenchConfigStep />;
      case 'summary':
        return <SprayingSummaryStep />;
      default:
        return <SprayingEquipmentStep />;
    }
  };

  return (
    <WizardProvider>
      <div className="space-y-6">
        <PageHeader
          title="Pulverização"
          description="Configure o equipamento e monte o mix de calda para aplicação na lavoura"
        />

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {SPRAYING_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0",
                activeTab === tab.id && "shadow-sm"
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Content */}
        <div className="max-w-3xl">
          {renderContent()}
        </div>
      </div>
    </WizardProvider>
  );
}
