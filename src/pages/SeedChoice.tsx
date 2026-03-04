import { Leaf, Database, Calculator, CheckCircle2 } from 'lucide-react';
import { useFarmData } from '@/hooks/useFarmData';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeedForm } from '@/components/seeds/SeedForm';
import { SeedList } from '@/components/seeds/SeedList';
import { PopulationCalculator } from '@/components/seeds/PopulationCalculator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function SeedChoice() {
  const { 
    selectedFarm, 
    addSeedCalculation,
    deleteSeedCalculation,
    getSelectedFarmSeedCalculations,
    seeds,
    addSeed,
    deleteSeed,
    updateSeed,
    selectedSeed,
    selectedSeedId,
    setSelectedSeedId,
  } = useFarmData();
  
  const calculations = getSelectedFarmSeedCalculations();

  const handleSelectSeed = (id: string) => {
    if (selectedSeedId === id) {
      setSelectedSeedId(null);
      toast.info('Semente desmarcada');
    } else {
      setSelectedSeedId(id);
      const seed = seeds.find(s => s.id === id);
      toast.success(`${seed?.name} selecionada para o plantio`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Sementes"
        description="Banco de dados de sementes e calculadora de população"
      />

      {selectedSeed && (
        <Alert className="border-primary bg-primary/5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertDescription>
            <strong>Semente selecionada para o plantio:</strong> {selectedSeed.name} ({selectedSeed.company}) — R$ {selectedSeed.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/saco
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="banco" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="banco" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Banco de Sementes
            {seeds.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {seeds.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="populacao" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Calculadora
          </TabsTrigger>
        </TabsList>

        <TabsContent value="banco" className="mt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Cadastre sementes no banco de dados. Clique em uma semente para selecioná-la para uso no plantio.
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            <SeedForm onSubmit={addSeed} />
            <SeedList 
              seeds={seeds} 
              onDelete={deleteSeed}
              onUpdate={updateSeed}
              selectedSeedId={selectedSeedId}
              onSelect={handleSelectSeed}
            />
          </div>
        </TabsContent>

        <TabsContent value="populacao" className="mt-6">
          {!selectedFarm ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Leaf className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Selecione uma fazenda para usar a calculadora de população.
              </p>
            </div>
          ) : (
            <div className="max-w-2xl">
              <PopulationCalculator 
                onCalculate={addSeedCalculation}
                onDeleteCalculation={deleteSeedCalculation}
                farmId={selectedFarm.id}
                calculations={calculations}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
