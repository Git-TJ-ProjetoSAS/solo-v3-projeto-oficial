import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tractor, PlaneTakeoff, Backpack, Lock } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import { useFarmData } from '@/hooks/useFarmData';
import { cn } from '@/lib/utils';
import type { EquipmentType } from '@/types/spraying';
import { EQUIPMENT_PRESETS, BACKPACK_CAPACITY_OPTIONS } from '@/types/spraying';

export function SprayingEquipmentStep() {
  const { wizardData, setSprayingData } = useWizard();
  const { selectedFarm } = useFarmData();
  
  // Use farm hectares if available from wizard or localStorage
  const farmHectares = wizardData.hectares || 0;
  
  const [equipmentType, setEquipmentType] = useState<EquipmentType>(
    wizardData.spraying?.equipment?.type || 'trator'
  );
  const [tankCapacity, setTankCapacity] = useState(
    wizardData.spraying?.equipment?.tankCapacity || 500
  );
  const [applicationRate, setApplicationRate] = useState(
    wizardData.spraying?.equipment?.applicationRate || 150
  );
  const [hectares, setHectares] = useState(
    wizardData.spraying?.hectares || farmHectares || 10
  );

  // Sync with farm hectares when available
  useEffect(() => {
    if (farmHectares > 0) {
      setHectares(farmHectares);
    }
  }, [farmHectares]);

  const handleEquipmentTypeChange = (type: EquipmentType) => {
    setEquipmentType(type);
    const preset = EQUIPMENT_PRESETS[type];
    setTankCapacity(preset.tankCapacity!);
    setApplicationRate(preset.applicationRate!);
  };

  // Auto-save
  useEffect(() => {
    setSprayingData({
      equipment: {
        type: equipmentType,
        tankCapacity,
        applicationRate,
      },
      products: wizardData.spraying?.products || [],
      hectares,
      costs: wizardData.spraying?.costs || {
        tractorOwnership: 'proprio',
        tractorCostPerHour: 150,
        droneCostPerHectare: 50,
        backpackCostPerTank: 15,
      },
    });
  }, [equipmentType, tankCapacity, applicationRate, hectares]);

  const equipmentOptions = [
    { type: 'trator' as EquipmentType, icon: Tractor, label: 'Trator', desc: 'Pulverizador tratorizado' },
    { type: 'drone' as EquipmentType, icon: PlaneTakeoff, label: 'Drone', desc: 'Pulverização aérea' },
    { type: 'bomba_costal' as EquipmentType, icon: Backpack, label: 'Bomba Costal', desc: 'Aplicação manual' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Selecione o Equipamento
        </h2>
        <p className="text-sm text-muted-foreground">
          Escolha o tipo de equipamento para pulverização
        </p>
      </div>

      {/* Equipment Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {equipmentOptions.map(({ type, icon: Icon, label, desc }) => (
          <button
            key={type}
            type="button"
            onClick={() => handleEquipmentTypeChange(type)}
            className={cn(
              "p-6 rounded-xl border-2 text-left transition-all",
              "hover:border-foreground/30",
              equipmentType === type
                ? "border-foreground bg-secondary"
                : "border-border bg-background"
            )}
          >
            <Icon className={cn(
              "w-8 h-8 mb-3",
              equipmentType === type ? "text-foreground" : "text-muted-foreground"
            )} />
            <p className="font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </button>
        ))}
      </div>

      {/* Bomba Costal Capacity */}
      {equipmentType === 'bomba_costal' && (
        <div className="p-4 bg-secondary rounded-xl space-y-3">
          <Label className="text-sm">Capacidade da Bomba</Label>
          <RadioGroup 
            value={tankCapacity.toString()} 
            onValueChange={(v) => setTankCapacity(parseInt(v))}
            className="flex gap-4"
          >
            {BACKPACK_CAPACITY_OPTIONS.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value.toString()} id={`capacity-${option.value}`} />
                <Label htmlFor={`capacity-${option.value}`} className="cursor-pointer text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Parameters */}
      <div className="grid gap-5 sm:grid-cols-3">
        {equipmentType !== 'bomba_costal' && (
          <div className="space-y-2">
            <Label htmlFor="tankCapacity" className="text-sm">
              Capacidade do Tanque
            </Label>
            <div className="relative">
              <Input
                id="tankCapacity"
                type="number"
                value={tankCapacity}
                onChange={(e) => setTankCapacity(parseFloat(e.target.value) || 0)}
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                L
              </span>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="applicationRate" className="text-sm">
            Taxa de Aplicação
          </Label>
          <div className="relative">
            <Input
              id="applicationRate"
              type="number"
              value={applicationRate}
              onChange={(e) => setApplicationRate(parseFloat(e.target.value) || 0)}
              className="pr-14"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              L/ha
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="hectares" className="text-sm flex items-center gap-1">
            Área Total
            {farmHectares > 0 && <Lock className="w-3 h-3 text-muted-foreground" />}
          </Label>
          <div className="relative">
            <Input
              id="hectares"
              type="number"
              value={hectares}
              onChange={(e) => !farmHectares && setHectares(parseFloat(e.target.value) || 0)}
              readOnly={farmHectares > 0}
              className={cn("pr-12", farmHectares > 0 && "bg-muted cursor-not-allowed")}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              ha
            </span>
          </div>
          {farmHectares > 0 && (
            <p className="text-xs text-muted-foreground">
              Área da fazenda cadastrada
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-secondary rounded-xl">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Volume Total</p>
          <p className="text-lg font-semibold text-foreground">
            {(applicationRate * hectares).toLocaleString()} L
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Nº de Tanques</p>
          <p className="text-lg font-semibold text-foreground">
            {Math.ceil((applicationRate * hectares) / tankCapacity)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Área por Tanque</p>
          <p className="text-lg font-semibold text-foreground">
            {(tankCapacity / applicationRate).toFixed(2)} ha
          </p>
        </div>
      </div>
    </div>
  );
}
