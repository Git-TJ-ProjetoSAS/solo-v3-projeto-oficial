import { DollarSign, Tractor, Square, Droplets, Users } from 'lucide-react';
import { useFarmData } from '@/hooks/useFarmData';
import { useFinancialData } from '@/hooks/useFinancialData';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TractorOperationsTab } from '@/components/financial/TractorOperationsTab';
import { TarpaulinTab } from '@/components/financial/TarpaulinTab';
import { IrrigationTab } from '@/components/financial/IrrigationTab';
import { LaborTab } from '@/components/financial/LaborTab';

export default function FinancialManagement() {
  const { selectedFarm, selectedFarmId } = useFarmData();
  
  const {
    tractorOperations,
    addTractorOperation,
    deleteTractorOperation,
    getTotalTractorCost,
    tarpaulinCosts,
    addTarpaulinCost,
    deleteTarpaulinCost,
    getTotalTarpaulinCost,
    irrigationCosts,
    addIrrigationCost,
    deleteIrrigationCost,
    getTotalIrrigationCost,
    laborCosts,
    addLaborCost,
    deleteLaborCost,
    getTotalLaborCost,
    getGrandTotal,
  } = useFinancialData(selectedFarmId);

  if (!selectedFarm) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader 
          title="Custos de Produção"
          description="Gerencie todos os custos da sua fazenda"
        />
        <div className="card-elevated p-8 text-center">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Selecione uma fazenda para gerenciar os custos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Custos de Produção"
        description={`Gerencie os custos de ${selectedFarm.name}`}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Tractor className="w-4 h-4" />
            <span className="text-xs">Trator</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            R$ {getTotalTractorCost().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Square className="w-4 h-4" />
            <span className="text-xs">Lona</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            R$ {getTotalTarpaulinCost().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Droplets className="w-4 h-4" />
            <span className="text-xs">Irrigação</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            R$ {getTotalIrrigationCost().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Mão de Obra</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            R$ {getTotalLaborCost().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-elevated p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-primary mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Total Geral</span>
          </div>
          <p className="text-lg font-bold text-primary">
            R$ {getGrandTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card-elevated p-6">
        <Tabs defaultValue="tractor" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="tractor" className="flex items-center gap-2">
              <Tractor className="w-4 h-4" />
              <span className="hidden sm:inline">Trator</span>
            </TabsTrigger>
            <TabsTrigger value="tarpaulin" className="flex items-center gap-2">
              <Square className="w-4 h-4" />
              <span className="hidden sm:inline">Lona</span>
            </TabsTrigger>
            <TabsTrigger value="irrigation" className="flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              <span className="hidden sm:inline">Irrigação</span>
            </TabsTrigger>
            <TabsTrigger value="labor" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Mão de Obra</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tractor">
            <TractorOperationsTab
              farmName={selectedFarm.name}
              farmId={selectedFarm.id}
              operations={tractorOperations}
              onAdd={addTractorOperation}
              onDelete={deleteTractorOperation}
              total={getTotalTractorCost()}
            />
          </TabsContent>

          <TabsContent value="tarpaulin">
            <TarpaulinTab
              farmName={selectedFarm.name}
              farmId={selectedFarm.id}
              costs={tarpaulinCosts}
              onAdd={addTarpaulinCost}
              onDelete={deleteTarpaulinCost}
              total={getTotalTarpaulinCost()}
            />
          </TabsContent>

          <TabsContent value="irrigation">
            <IrrigationTab
              farmName={selectedFarm.name}
              farmId={selectedFarm.id}
              costs={irrigationCosts}
              onAdd={addIrrigationCost}
              onDelete={deleteIrrigationCost}
              total={getTotalIrrigationCost()}
            />
          </TabsContent>

          <TabsContent value="labor">
            <LaborTab
              farmName={selectedFarm.name}
              farmId={selectedFarm.id}
              costs={laborCosts}
              onAdd={addLaborCost}
              onDelete={deleteLaborCost}
              total={getTotalLaborCost()}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
