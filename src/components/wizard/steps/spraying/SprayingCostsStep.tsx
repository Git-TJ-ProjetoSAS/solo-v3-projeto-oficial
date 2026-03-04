import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DollarSign } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import type { SprayingCosts, TractorOwnership } from '@/types/spraying';
import { DEFAULT_SPRAYING_COSTS, calculateApplicationCost } from '@/types/spraying';

export function SprayingCostsStep() {
  const { wizardData, setSprayingData } = useWizard();
  
  const equipmentType = wizardData.spraying?.equipment?.type || 'trator';
  const tankCapacity = wizardData.spraying?.equipment?.tankCapacity || 500;
  const applicationRate = wizardData.spraying?.equipment?.applicationRate || 150;
  const hectares = wizardData.spraying?.hectares || 10;
  
  const [costs, setCosts] = useState<SprayingCosts>(
    wizardData.spraying?.costs || DEFAULT_SPRAYING_COSTS
  );

  // Auto-save
  useEffect(() => {
    if (wizardData.spraying) {
      setSprayingData({
        ...wizardData.spraying,
        costs,
      });
    }
  }, [costs]);

  const applicationCost = calculateApplicationCost(
    equipmentType, 
    costs, 
    hectares, 
    tankCapacity, 
    applicationRate
  );

  const equipmentLabels = {
    trator: 'Trator',
    drone: 'Drone',
    bomba_costal: 'Bomba Costal',
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Custos de Aplicação
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure os custos para {equipmentLabels[equipmentType]}
        </p>
      </div>

      {/* Equipment Info */}
      <div className="p-4 bg-secondary rounded-xl">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Equipamento Selecionado</p>
        <p className="font-medium text-foreground">{equipmentLabels[equipmentType]}</p>
        <p className="text-sm text-muted-foreground">
          {hectares} ha • {tankCapacity}L/tanque • {applicationRate} L/ha
        </p>
      </div>

      {/* Tractor Costs */}
      {equipmentType === 'trator' && (
        <div className="space-y-5">
          <div className="space-y-3">
            <Label className="text-sm">Tipo de Trator</Label>
            <RadioGroup 
              value={costs.tractorOwnership} 
              onValueChange={(v) => setCosts(prev => ({ ...prev, tractorOwnership: v as TractorOwnership }))}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="proprio" id="trator-proprio" />
                <Label htmlFor="trator-proprio" className="cursor-pointer text-sm">Próprio</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="alugado" id="trator-alugado" />
                <Label htmlFor="trator-alugado" className="cursor-pointer text-sm">Alugado</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tractorCost" className="text-sm">
              Custo por Hora
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                id="tractorCost"
                type="number"
                value={costs.tractorCostPerHour}
                onChange={(e) => setCosts(prev => ({ ...prev, tractorCostPerHour: parseFloat(e.target.value) || 0 }))}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Estimativa: 30 minutos por tanque aplicado
            </p>
          </div>
        </div>
      )}

      {/* Drone Costs */}
      {equipmentType === 'drone' && (
        <div className="space-y-2">
          <Label htmlFor="droneCost" className="text-sm">
            Custo por Hectare
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <Input
              id="droneCost"
              type="number"
              value={costs.droneCostPerHectare}
              onChange={(e) => setCosts(prev => ({ ...prev, droneCostPerHectare: parseFloat(e.target.value) || 0 }))}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Valor cobrado por hectare pulverizado
          </p>
        </div>
      )}

      {/* Backpack Costs */}
      {equipmentType === 'bomba_costal' && (
        <div className="space-y-2">
          <Label htmlFor="backpackCost" className="text-sm">
            Custo por Bomba/Tanque
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <Input
              id="backpackCost"
              type="number"
              value={costs.backpackCostPerTank}
              onChange={(e) => setCosts(prev => ({ ...prev, backpackCostPerTank: parseFloat(e.target.value) || 0 }))}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Custo estimado por cada tanque de {tankCapacity}L aplicado
          </p>
        </div>
      )}

      {/* Cost Summary */}
      <div 
        className="p-6 bg-foreground text-background rounded-xl text-center"
        style={{ animation: 'scale-in 0.2s ease-out' }}
      >
        <DollarSign className="w-8 h-8 mx-auto mb-3" />
        <p className="text-3xl font-bold mb-1">
          R$ {applicationCost.toFixed(2)}
        </p>
        <p className="text-sm opacity-80">custo total de aplicação</p>
        <p className="text-xs opacity-60 mt-2">
          R$ {(applicationCost / hectares).toFixed(2)}/ha
        </p>
      </div>
    </div>
  );
}
