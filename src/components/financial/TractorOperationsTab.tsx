import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tractor, Save, Loader2 } from 'lucide-react';
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
import { TractorOperation } from '@/types/financial';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TractorOperationsTabProps {
  farmName: string;
  operations: TractorOperation[];
  onAdd: (op: Omit<TractorOperation, 'id' | 'createdAt' | 'totalCost'>) => void;
  onDelete: (id: string) => void;
  total: number;
  farmId: string;
}

interface OperationConfig {
  name: string;
  hoursPerHa: number;
}

const DEFAULT_OPERATIONS: OperationConfig[] = [
  { name: 'Aração', hoursPerHa: 3 },
  { name: 'Plantio', hoursPerHa: 2 },
  { name: 'Colheita', hoursPerHa: 4 },
  { name: 'Transporte', hoursPerHa: 3 },
  { name: 'Compactação', hoursPerHa: 2 },
];

export function TractorOperationsTab({
  farmName,
  operations,
  onAdd,
  onDelete,
  total,
  farmId,
}: TractorOperationsTabProps) {
  const [tractorType, setTractorType] = useState<'proprio' | 'alugado'>('proprio');
  const [costPerHourOwn, setCostPerHourOwn] = useState('150');
  const [costPerHourRent, setCostPerHourRent] = useState('200');
  const [hectares, setHectares] = useState('3');
  const [operationsConfig, setOperationsConfig] = useState<OperationConfig[]>(DEFAULT_OPERATIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load saved configuration from database
  useEffect(() => {
    const loadConfig = async () => {
      if (!farmId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tractor_operations_config')
          .select('*')
          .eq('farm_id', farmId);

        if (error) {
          console.error('Erro ao carregar configurações:', error);
          setIsLoading(false);
          return;
        }

        if (data && data.length > 0) {
          // Get general config from first row
          const firstRow = data[0];
          setTractorType(firstRow.tractor_type as 'proprio' | 'alugado');
          setCostPerHourOwn(String(firstRow.cost_per_hour_own));
          setCostPerHourRent(String(firstRow.cost_per_hour_rent));
          setHectares(String(firstRow.hectares));

          // Map operations from database
          const savedOps = DEFAULT_OPERATIONS.map(defaultOp => {
            const savedOp = data.find(d => d.operation_name === defaultOp.name);
            return {
              name: defaultOp.name,
              hoursPerHa: savedOp ? Number(savedOp.hours_per_ha) : defaultOp.hoursPerHa,
            };
          });
          setOperationsConfig(savedOps);
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [farmId]);

  // Save configuration to database
  const saveConfig = useCallback(async () => {
    if (!farmId) {
      toast.error('Selecione uma fazenda primeiro');
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // Upsert each operation
      for (const op of operationsConfig) {
        const { error } = await supabase
          .from('tractor_operations_config')
          .upsert({
            farm_id: farmId,
            operation_name: op.name,
            hours_per_ha: op.hoursPerHa,
            tractor_type: tractorType,
            cost_per_hour_own: parseFloat(costPerHourOwn) || 150,
            cost_per_hour_rent: parseFloat(costPerHourRent) || 200,
            hectares: parseFloat(hectares) || 3,
            user_id: userId,
          } as any, {
            onConflict: 'farm_id,operation_name',
          });

        if (error) {
          console.error('Erro ao salvar operação:', error);
          throw error;
        }
      }

      toast.success('Configurações salvas com sucesso!');
      setHasChanges(false);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  }, [farmId, operationsConfig, tractorType, costPerHourOwn, costPerHourRent, hectares]);

  const costPerHour = tractorType === 'proprio' 
    ? parseFloat(costPerHourOwn) || 0 
    : parseFloat(costPerHourRent) || 0;

  const hectaresValue = parseFloat(hectares) || 0;

  const totalHoursPerHa = useMemo(() => {
    return operationsConfig.reduce((acc, op) => acc + op.hoursPerHa, 0);
  }, [operationsConfig]);

  const operationCosts = useMemo(() => {
    return operationsConfig.map(op => ({
      ...op,
      costPerHa: op.hoursPerHa * costPerHour,
      totalCost: op.hoursPerHa * costPerHour * hectaresValue,
    }));
  }, [operationsConfig, costPerHour, hectaresValue]);

  const grandTotal = useMemo(() => {
    return totalHoursPerHa * costPerHour * hectaresValue;
  }, [totalHoursPerHa, costPerHour, hectaresValue]);

  const handleHoursChange = (index: number, value: string) => {
    const numValue = parseFloat(value.replace(',', '.'));
    if (value === '' || /^\d*\.?\d*$/.test(value.replace(',', '.'))) {
      setOperationsConfig(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], hoursPerHa: isNaN(numValue) ? 0 : numValue };
        return updated;
      });
      setHasChanges(true);
    }
  };

  const handleConfigChange = () => {
    setHasChanges(true);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tractor className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Operações Tratorizadas - {farmName}</h3>
        </div>
        <Button 
          onClick={saveConfig} 
          disabled={isSaving || !hasChanges}
          size="sm"
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar
        </Button>
      </div>

      {/* Configuration Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tractor Type */}
        <div className="space-y-2">
          <Label>Tipo de Trator</Label>
          <Select 
            value={tractorType} 
            onValueChange={(v: 'proprio' | 'alugado') => {
              setTractorType(v);
              handleConfigChange();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="proprio">Próprio</SelectItem>
              <SelectItem value="alugado">Alugado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cost per hour */}
        <div className="space-y-2">
          <Label>
            Custo do Trator (R$/hora) 
            <span className="text-xs text-muted-foreground ml-1">
              ({tractorType === 'proprio' ? 'custo operacional próprio' : 'custo aluguel'})
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
                handleConfigChange();
              }
            }}
            className="input-agro"
          />
        </div>

        {/* Hectares */}
        <div className="space-y-2">
          <Label>Área (hectares)</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={hectares}
            onChange={(e) => {
              const value = e.target.value.replace(',', '.');
              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setHectares(value);
                handleConfigChange();
              }
            }}
            className="input-agro"
          />
        </div>
      </div>

      {/* Operations Reference Cards */}
      <Card className="p-4 bg-secondary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tractor className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Operações Tratorizadas - Referência</span>
          </div>
          <span className="text-sm font-medium text-foreground">
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
                R$ {formatCurrency(operationCosts[index]?.costPerHa || 0)}/ha
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Total Cost Summary */}
      <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
        <span className="font-medium text-muted-foreground">
          Custo Total Tratorizado ({hectaresValue} ha):
        </span>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">
            {totalHoursPerHa} h/ha × R$ {formatCurrency(costPerHour)}/h × {hectaresValue} ha
          </p>
          <p className="text-xl font-bold text-primary">
            R$ {formatCurrency(grandTotal)}
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Detalhamento por operação:</p>
        <div className="grid gap-2">
          {operationCosts.map((op) => (
            <div 
              key={op.name}
              className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
            >
              <div>
                <p className="font-medium text-foreground">{op.name}</p>
                <p className="text-xs text-muted-foreground">
                  {op.hoursPerHa} h/ha × R$ {formatCurrency(costPerHour)}/h × {hectaresValue} ha
                </p>
              </div>
              <p className="font-bold text-primary">
                R$ {formatCurrency(op.totalCost)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {hasChanges && (
        <p className="text-sm text-destructive text-center">
          Você tem alterações não salvas. Clique em "Salvar" para persistir as configurações.
        </p>
      )}
    </div>
  );
}
