import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tractor, Save, Loader2, DollarSign, Droplets, Users, Square } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWizard } from '@/contexts/WizardContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OperationConfig {
  name: string;
  hoursPerHa: number;
}

interface LaborConfig {
  type: 'fixed' | 'daily';
  description: string;
  quantity: number;
  unitCost: number;
}

const DEFAULT_OPERATIONS: OperationConfig[] = [
  { name: 'Aração', hoursPerHa: 3 },
  { name: 'Plantio', hoursPerHa: 2 },
  { name: 'Colheita', hoursPerHa: 4 },
  { name: 'Transporte', hoursPerHa: 3 },
  { name: 'Compactação', hoursPerHa: 2 },
];

const DEFAULT_LABOR: LaborConfig[] = [
  { type: 'daily', description: 'Diaristas', quantity: 0, unitCost: 100 },
  { type: 'fixed', description: 'Funcionários fixos', quantity: 0, unitCost: 2000 },
];

// Use a fixed farm_id for wizard context (can be customized later)
const WIZARD_FARM_ID = 'wizard-default';

export function WizardCostsStep() {
  const { wizardData, setCostsData } = useWizard();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Tractor state
  const [tractorType, setTractorType] = useState<'proprio' | 'alugado'>(
    wizardData.costs?.tractorType || 'proprio'
  );
  const [costPerHourOwn, setCostPerHourOwn] = useState(
    String(wizardData.costs?.costPerHourOwn || 150)
  );
  const [costPerHourRent, setCostPerHourRent] = useState(
    String(wizardData.costs?.costPerHourRent || 200)
  );
  const [operationsConfig, setOperationsConfig] = useState<OperationConfig[]>(
    wizardData.costs?.operations || DEFAULT_OPERATIONS
  );

  // Irrigation state
  const [irrigationCostPerHa, setIrrigationCostPerHa] = useState(
    String(wizardData.costs?.irrigationCostPerHa || 0)
  );

  // Tarpaulin state
  const [tarpaulinCostPerM2, setTarpaulinCostPerM2] = useState(
    String(wizardData.costs?.tarpaulinCostPerM2 || 0)
  );
  const [tarpaulinM2, setTarpaulinM2] = useState(
    String(wizardData.costs?.tarpaulinM2 || 0)
  );

  // Labor state
  const [laborConfigs, setLaborConfigs] = useState<LaborConfig[]>(
    wizardData.costs?.labor || DEFAULT_LABOR
  );

  const hectares = wizardData.hectares || 1;

  // Load data from database on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load tractor operations config
        const { data: tractorData } = await supabase
          .from('tractor_operations_config')
          .select('*')
          .eq('farm_id', WIZARD_FARM_ID);

        if (tractorData && tractorData.length > 0) {
          const firstOp = tractorData[0];
          setTractorType(firstOp.tractor_type as 'proprio' | 'alugado');
          setCostPerHourOwn(String(firstOp.cost_per_hour_own));
          setCostPerHourRent(String(firstOp.cost_per_hour_rent));

          const loadedOps = DEFAULT_OPERATIONS.map(defaultOp => {
            const dbOp = tractorData.find(d => d.operation_name === defaultOp.name);
            return dbOp 
              ? { name: dbOp.operation_name, hoursPerHa: Number(dbOp.hours_per_ha) }
              : defaultOp;
          });
          setOperationsConfig(loadedOps);
        }

        // Load production costs config
        const { data: costsData } = await supabase
          .from('production_costs_config')
          .select('*')
          .eq('farm_id', WIZARD_FARM_ID)
          .single();

        if (costsData) {
          setIrrigationCostPerHa(String(costsData.irrigation_cost_per_ha));
          setTarpaulinCostPerM2(String(costsData.tarpaulin_cost_per_m2));
          setTarpaulinM2(String(costsData.tarpaulin_m2));
        }

        // Load labor config
        const { data: laborData } = await supabase
          .from('labor_config')
          .select('*')
          .eq('farm_id', WIZARD_FARM_ID);

        if (laborData && laborData.length > 0) {
          const loadedLabor = laborData.map(l => ({
            type: l.labor_type as 'fixed' | 'daily',
            description: l.description,
            quantity: l.quantity,
            unitCost: Number(l.unit_cost),
          }));
          setLaborConfigs(loadedLabor);
        }
      } catch (error) {
        console.error('Erro ao carregar dados de custos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate costs
  const costPerHour = tractorType === 'proprio'
    ? parseFloat(costPerHourOwn) || 0
    : parseFloat(costPerHourRent) || 0;

  const totalHoursPerHa = useMemo(() => {
    return operationsConfig.reduce((acc, op) => acc + op.hoursPerHa, 0);
  }, [operationsConfig]);

  const tractorCostPerHa = totalHoursPerHa * costPerHour;
  const tractorTotal = tractorCostPerHa * hectares;

  const irrigationTotal = (parseFloat(irrigationCostPerHa) || 0) * hectares;

  const tarpaulinTotal = (parseFloat(tarpaulinCostPerM2) || 0) * (parseFloat(tarpaulinM2) || 0);

  const laborTotal = laborConfigs.reduce((acc, labor) => {
    return acc + labor.quantity * labor.unitCost;
  }, 0);

  const grandTotal = tractorTotal + irrigationTotal + tarpaulinTotal + laborTotal;

  // Save to wizard context
  const saveToContext = useCallback(() => {
    setCostsData({
      tractorType,
      costPerHourOwn: parseFloat(costPerHourOwn) || 150,
      costPerHourRent: parseFloat(costPerHourRent) || 200,
      operations: operationsConfig,
      irrigationCostPerHa: parseFloat(irrigationCostPerHa) || 0,
      tarpaulinCostPerM2: parseFloat(tarpaulinCostPerM2) || 0,
      tarpaulinM2: parseFloat(tarpaulinM2) || 0,
      labor: laborConfigs,
      totalCost: grandTotal,
    });
  }, [
    tractorType, costPerHourOwn, costPerHourRent, operationsConfig,
    irrigationCostPerHa, tarpaulinCostPerM2, tarpaulinM2, laborConfigs,
    grandTotal, setCostsData
  ]);

  // Auto-save to context on changes
  useEffect(() => {
    if (!isLoading) {
      saveToContext();
    }
  }, [saveToContext, isLoading]);

  // Save to database
  const saveToDatabase = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // Save tractor operations
      for (const op of operationsConfig) {
        await supabase
          .from('tractor_operations_config')
          .upsert({
            farm_id: WIZARD_FARM_ID,
            operation_name: op.name,
            hours_per_ha: op.hoursPerHa,
            tractor_type: tractorType,
            cost_per_hour_own: parseFloat(costPerHourOwn) || 150,
            cost_per_hour_rent: parseFloat(costPerHourRent) || 200,
            hectares: hectares,
            user_id: userId,
          } as any, { onConflict: 'farm_id,operation_name' });
      }

      // Save production costs
      await supabase
        .from('production_costs_config')
        .upsert({
          farm_id: WIZARD_FARM_ID,
          irrigation_cost_per_ha: parseFloat(irrigationCostPerHa) || 0,
          tarpaulin_cost_per_m2: parseFloat(tarpaulinCostPerM2) || 0,
          tarpaulin_m2: parseFloat(tarpaulinM2) || 0,
          user_id: userId,
        } as any, { onConflict: 'farm_id' });

      // Delete old labor configs and insert new ones
      await supabase
        .from('labor_config')
        .delete()
        .eq('farm_id', WIZARD_FARM_ID);

      for (const labor of laborConfigs) {
        await supabase
          .from('labor_config')
          .insert({
            farm_id: WIZARD_FARM_ID,
            labor_type: labor.type,
            description: labor.description,
            quantity: labor.quantity,
            unit_cost: labor.unitCost,
            user_id: userId,
          } as any);
      }

      toast.success('Custos salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar custos:', error);
      toast.error('Erro ao salvar custos');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHoursChange = (index: number, value: string) => {
    const numValue = parseFloat(value.replace(',', '.'));
    if (value === '' || /^\d*\.?\d*$/.test(value.replace(',', '.'))) {
      setOperationsConfig(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], hoursPerHa: isNaN(numValue) ? 0 : numValue };
        return updated;
      });
    }
  };

  const handleLaborChange = (index: number, field: keyof LaborConfig, value: string | number) => {
    setLaborConfigs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando custos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Custos de Produção</h2>
        <p className="text-muted-foreground">
          Informe os custos operacionais para {hectares} hectare{hectares !== 1 ? 's' : ''}
        </p>
      </div>

      <Tabs defaultValue="tractor" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tractor" className="gap-2">
            <Tractor className="w-4 h-4" />
            <span className="hidden sm:inline">Trator</span>
          </TabsTrigger>
          <TabsTrigger value="irrigation" className="gap-2">
            <Droplets className="w-4 h-4" />
            <span className="hidden sm:inline">Irrigação</span>
          </TabsTrigger>
          <TabsTrigger value="tarpaulin" className="gap-2">
            <Square className="w-4 h-4" />
            <span className="hidden sm:inline">Lona</span>
          </TabsTrigger>
          <TabsTrigger value="labor" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Mão de Obra</span>
          </TabsTrigger>
        </TabsList>

        {/* Tractor Tab */}
        <TabsContent value="tractor" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Trator</Label>
              <Select
                value={tractorType}
                onValueChange={(v: 'proprio' | 'alugado') => setTractorType(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proprio">Próprio</SelectItem>
                  <SelectItem value="alugado">Alugado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Custo (R$/hora)
                <span className="text-xs text-muted-foreground ml-1">
                  ({tractorType === 'proprio' ? 'próprio' : 'alugado'})
                </span>
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                value={tractorType === 'proprio' ? costPerHourOwn : costPerHourRent}
                onChange={(e) => {
                  const value = e.target.value.replace(',', '.');
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    if (tractorType === 'proprio') {
                      setCostPerHourOwn(value);
                    } else {
                      setCostPerHourRent(value);
                    }
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Total Trator</Label>
              <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center">
                <span className="font-semibold text-primary">R$ {formatCurrency(tractorTotal)}</span>
              </div>
            </div>
          </div>

          <Card className="p-4 bg-secondary/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Operações Tratorizadas</span>
              <span className="text-sm font-medium">
                Total: <span className="text-primary">{totalHoursPerHa} h/ha</span>
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {operationsConfig.map((op, index) => (
                <div
                  key={op.name}
                  className="bg-background border border-border rounded-lg p-3 text-center space-y-2"
                >
                  <p className="font-medium text-foreground text-sm">{op.name}</p>
                  <div className="flex items-center justify-center gap-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={op.hoursPerHa}
                      onChange={(e) => handleHoursChange(index, e.target.value)}
                      className="w-12 h-7 text-center text-sm p-1"
                    />
                    <span className="text-xs text-muted-foreground">h/ha</span>
                  </div>
                  <p className="text-xs font-semibold text-primary">
                    R$ {formatCurrency(op.hoursPerHa * costPerHour)}/ha
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Irrigation Tab */}
        <TabsContent value="irrigation" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Custo de Irrigação (R$/ha)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={irrigationCostPerHa}
                onChange={(e) => {
                  const value = e.target.value.replace(',', '.');
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setIrrigationCostPerHa(value);
                  }
                }}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Total Irrigação ({hectares} ha)</Label>
              <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center">
                <span className="font-semibold text-primary">R$ {formatCurrency(irrigationTotal)}</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tarpaulin Tab */}
        <TabsContent value="tarpaulin" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Custo da Lona (R$/m²)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={tarpaulinCostPerM2}
                onChange={(e) => {
                  const value = e.target.value.replace(',', '.');
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setTarpaulinCostPerM2(value);
                  }
                }}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Área de Lona (m²)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={tarpaulinM2}
                onChange={(e) => {
                  const value = e.target.value.replace(',', '.');
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setTarpaulinM2(value);
                  }
                }}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Total Lona</Label>
              <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center">
                <span className="font-semibold text-primary">R$ {formatCurrency(tarpaulinTotal)}</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Labor Tab */}
        <TabsContent value="labor" className="space-y-4 mt-4">
          <div className="space-y-4">
            {laborConfigs.map((labor, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={labor.type}
                      onValueChange={(v: 'fixed' | 'daily') => handleLaborChange(index, 'type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diarista</SelectItem>
                        <SelectItem value="fixed">Fixo (mensal)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{labor.type === 'daily' ? 'Dias' : 'Meses'}</Label>
                    <Input
                      type="number"
                      value={labor.quantity}
                      onChange={(e) => handleLaborChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      min={0}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{labor.type === 'daily' ? 'Valor da Diária (R$)' : 'Salário Mensal (R$)'}</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={labor.unitCost}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value.replace(',', '.')) || 0;
                        handleLaborChange(index, 'unitCost', value);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Subtotal</Label>
                    <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center">
                      <span className="font-semibold text-primary">
                        R$ {formatCurrency(labor.quantity * labor.unitCost)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Mão de Obra</p>
                <p className="text-lg font-bold text-primary">R$ {formatCurrency(laborTotal)}</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Grand Total Summary */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Custo Total de Produção</p>
              <p className="text-xs text-muted-foreground">
                Para {hectares} hectare{hectares !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">R$ {formatCurrency(grandTotal)}</p>
            <p className="text-sm text-muted-foreground">
              R$ {formatCurrency(grandTotal / hectares)}/ha
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <Tractor className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Trator</p>
            <p className="font-semibold">R$ {formatCurrency(tractorTotal)}</p>
          </div>
          <div className="text-center">
            <Droplets className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Irrigação</p>
            <p className="font-semibold">R$ {formatCurrency(irrigationTotal)}</p>
          </div>
          <div className="text-center">
            <Square className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Lona</p>
            <p className="font-semibold">R$ {formatCurrency(tarpaulinTotal)}</p>
          </div>
          <div className="text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Mão de Obra</p>
            <p className="font-semibold">R$ {formatCurrency(laborTotal)}</p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveToDatabase} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Custos
        </Button>
      </div>
    </div>
  );
}
