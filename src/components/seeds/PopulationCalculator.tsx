import { useState } from 'react';
import { Calculator, Info, Leaf, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SeedCalculation } from '@/types/farm';

interface PopulationCalculatorProps {
  onCalculate: (calc: Omit<SeedCalculation, 'id' | 'createdAt'>) => void;
  onDeleteCalculation?: (id: string) => void;
  farmId: string;
  calculations: SeedCalculation[];
}

export function PopulationCalculator({ onCalculate, onDeleteCalculation, farmId, calculations }: PopulationCalculatorProps) {
  const [formData, setFormData] = useState({
    rowSpacing: '',
    seedsPerMeter: '',
  });
  
  const [result, setResult] = useState<number | null>(null);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [field]: value }));
      setResult(null);
    }
  };

  const calculatePopulation = () => {
    const rowSpacing = parseFloat(formData.rowSpacing) || 0;
    const seedsPerMeter = parseFloat(formData.seedsPerMeter) || 0;

    if (rowSpacing <= 0) return 0;

    const rowSpacingMeters = rowSpacing / 100;
    const population = (10000 / rowSpacingMeters) * seedsPerMeter;

    return Math.round(population);
  };

  const handleCalculate = () => {
    const population = calculatePopulation();
    
    onCalculate({
      farmId,
      rowSpacing: parseFloat(formData.rowSpacing) || 0,
      seedsPerMeter: parseFloat(formData.seedsPerMeter) || 0,
      populationPerHectare: population,
    });

    setResult(population);
  };

  const handleClear = () => {
    setFormData({ rowSpacing: '', seedsPerMeter: '' });
    setResult(null);
  };

  const isFormValid = formData.rowSpacing && formData.seedsPerMeter;

  return (
    <div className="space-y-6">
      <div className="card-elevated p-6">
        <div className="flex items-center gap-2 mb-6">
          <Leaf className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">Parâmetros de Plantio</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rowSpacing">Espaçamento entre Linhas (cm)</Label>
            <Input
              id="rowSpacing"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 50, 70, 90"
              value={formData.rowSpacing}
              onChange={handleInputChange('rowSpacing')}
              className="input-agro"
            />
            <p className="text-xs text-muted-foreground">
              Espaçamentos comuns: 45cm, 50cm, 70cm, 90cm
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seedsPerMeter">Sementes por Metro Linear</Label>
            <Input
              id="seedsPerMeter"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 3, 4, 5"
              value={formData.seedsPerMeter}
              onChange={handleInputChange('seedsPerMeter')}
              className="input-agro"
            />
            <p className="text-xs text-muted-foreground">
              Média recomendada: 3 a 5 sementes/m
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button 
            onClick={handleCalculate}
            disabled={!isFormValid}
            className="flex-1"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Calcular População
          </Button>
          <Button 
            variant="outline"
            onClick={handleClear}
          >
            Limpar
          </Button>
        </div>
      </div>

      {result !== null && (
        <Alert className="border-primary bg-primary/5 animate-fade-in">
          <Leaf className="h-5 w-5 text-primary" />
          <AlertTitle className="text-lg font-bold">
            {result.toLocaleString('pt-BR')} plantas/ha
          </AlertTitle>
          <AlertDescription>
            Com espaçamento de {formData.rowSpacing}cm e {formData.seedsPerMeter} sementes/m
          </AlertDescription>
        </Alert>
      )}

      <div className="card-elevated p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Fórmula de Cálculo</h3>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p><strong>População/ha</strong> = (10.000 ÷ Espaçamento em metros) × Sementes/m</p>
          <div className="mt-4 p-3 bg-primary/5 rounded-lg">
            <p className="text-primary font-medium">
              Populações recomendadas para milho:
            </p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>• Grão: 60.000 - 80.000 plantas/ha</li>
              <li>• Silagem: 65.000 - 85.000 plantas/ha</li>
              <li>• Milho safrinha: 55.000 - 65.000 plantas/ha</li>
            </ul>
          </div>
        </div>
      </div>

      {calculations.length > 0 && (
        <div className="card-elevated p-6">
          <h3 className="font-semibold text-foreground mb-4">Histórico de Cálculos</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {calculations.slice().reverse().map((calc) => (
              <div key={calc.id} className="flex justify-between items-center py-2 px-3 bg-secondary/30 rounded-lg text-sm">
                <span className="text-muted-foreground">
                  {calc.rowSpacing}cm × {calc.seedsPerMeter} sem/m
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-primary">
                    {calc.populationPerHectare.toLocaleString('pt-BR')} pl/ha
                  </span>
                  {onDeleteCalculation && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => onDeleteCalculation(calc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
