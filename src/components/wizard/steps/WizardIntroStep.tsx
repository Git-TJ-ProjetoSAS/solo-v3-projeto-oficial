import { ArrowRight, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWizard } from '@/contexts/WizardContext';

export function WizardIntroStep() {
  const { startWizard } = useWizard();

  return (
    <div 
      className="flex flex-col items-center justify-center py-16 text-center"
      style={{ animation: 'fade-in 0.4s ease-out' }}
    >
      <div className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center mb-6">
        <Leaf className="w-8 h-8 text-background" />
      </div>

      <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-3">
        Assistente de Planejamento
      </h1>

      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Faça uma nova análise do solo e gere uma recomendação técnica completa para sua safra.
      </p>

      <Button 
        size="lg" 
        onClick={startWizard}
        className="gap-2 px-8"
      >
        Iniciar
        <ArrowRight className="w-4 h-4" />
      </Button>

      <div className="mt-12 grid grid-cols-3 gap-8 text-center max-w-lg">
        <div>
          <p className="text-2xl font-semibold text-foreground">11</p>
          <p className="text-xs text-muted-foreground mt-1">Etapas</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground">~5</p>
          <p className="text-xs text-muted-foreground mt-1">Minutos</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground">1</p>
          <p className="text-xs text-muted-foreground mt-1">Relatório</p>
        </div>
      </div>
    </div>
  );
}
