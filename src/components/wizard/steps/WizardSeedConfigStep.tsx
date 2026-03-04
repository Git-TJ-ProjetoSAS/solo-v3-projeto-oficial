import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWizard } from '@/contexts/WizardContext';

export function WizardSeedConfigStep() {
  const { wizardData, setSeedData } = useWizard();

  const [formData, setFormData] = useState({
    rowSpacing: wizardData.seed?.rowSpacing?.toString() || '',
    seedsPerMeter: wizardData.seed?.seedsPerMeter?.toString() || '',
  });

  const [result, setResult] = useState<number | null>(wizardData.seed?.populationPerHectare || null);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [field]: value }));
      setResult(null);
    }
  };

  const handleCalculate = () => {
    const rowSpacingCm = parseFloat(formData.rowSpacing) || 0;
    const seedsPerMeter = parseFloat(formData.seedsPerMeter) || 0;

    if (rowSpacingCm <= 0 || seedsPerMeter <= 0) return;

    const rowSpacingMeters = rowSpacingCm / 100;
    const population = Math.round((10000 / rowSpacingMeters) * seedsPerMeter);
    setResult(population);

    setSeedData({
      seed: wizardData.seed?.seed || null,
      rowSpacing: rowSpacingCm,
      seedsPerMeter,
      populationPerHectare: population,
    });
  };

  const isValid = formData.rowSpacing && formData.seedsPerMeter;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Configure a População
        </h2>
        <p className="text-sm text-muted-foreground">
          Defina espaçamento e sementes por metro
        </p>
      </div>

      {/* Seed Selected Info */}
      {wizardData.seed?.seed && (
        <div className="p-4 bg-secondary rounded-xl mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Semente Selecionada</p>
          <p className="font-medium text-foreground">{wizardData.seed.seed.name}</p>
          <p className="text-sm text-muted-foreground">{wizardData.seed.seed.company}</p>
        </div>
      )}

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="rowSpacing" className="text-sm">
            Espaçamento entre linhas (cm)
          </Label>
          <Input
            id="rowSpacing"
            type="text"
            inputMode="decimal"
            placeholder="Ex: 50, 70, 90"
            value={formData.rowSpacing}
            onChange={handleInputChange('rowSpacing')}
          />
          <p className="text-xs text-muted-foreground">
            Comum: 45cm, 50cm, 70cm, 90cm
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seedsPerMeter" className="text-sm">
            Sementes por metro linear
          </Label>
          <Input
            id="seedsPerMeter"
            type="text"
            inputMode="decimal"
            placeholder="Ex: 4"
            value={formData.seedsPerMeter}
            onChange={handleInputChange('seedsPerMeter')}
          />
        </div>

        <Button onClick={handleCalculate} disabled={!isValid} className="w-full">
          Calcular População
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div 
          className="p-6 bg-foreground text-background rounded-xl text-center"
          style={{ animation: 'scale-in 0.2s ease-out' }}
        >
          <CheckCircle2 className="w-8 h-8 mx-auto mb-3" />
          <p className="text-3xl font-bold mb-1">
            {result.toLocaleString('pt-BR')}
          </p>
          <p className="text-sm opacity-80">plantas por hectare</p>
        </div>
      )}
    </div>
  );
}
