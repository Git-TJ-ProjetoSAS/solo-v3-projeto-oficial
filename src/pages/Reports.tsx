import { PageHeader } from '@/components/PageHeader';
import { WizardProvider } from '@/contexts/WizardContext';
import { WizardReportStep } from '@/components/wizard/steps/WizardReportStep';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Relatórios"
        description="Dashboard consolidado do planejamento agrícola"
      />

      <Card className="border-warning bg-warning/5">
        <CardContent className="p-6 flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Dica</p>
            <p className="text-sm text-muted-foreground">
              Para gerar um relatório completo, utilize o <strong>Assistente (Wizard)</strong> e preencha 
              todos os passos. O relatório consolidado será gerado automaticamente no último passo.
            </p>
          </div>
        </CardContent>
      </Card>

      <WizardProvider>
        <WizardReportStep />
      </WizardProvider>
    </div>
  );
}
