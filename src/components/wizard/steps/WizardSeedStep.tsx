import { useState } from 'react';
import { Leaf, Plus, Trash2, CheckCircle2, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWizard, WizardSeedData } from '@/contexts/WizardContext';
import { useFarmData } from '@/hooks/useFarmData';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Seed } from '@/types/farm';

const PRODUCTIVITY_RANGES = [
  { value: 'baixa', label: 'Baixa (< 6t/ha)' },
  { value: 'media', label: 'Média (6-10t/ha)' },
  { value: 'alta', label: 'Alta (10-14t/ha)' },
  { value: 'muito_alta', label: 'Muito Alta (> 14t/ha)' },
] as const;

export function WizardSeedStep() {
  const { wizardData, setSeedData } = useWizard();
  const { seeds, addSeed, deleteSeed } = useFarmData();

  const [showSeedForm, setShowSeedForm] = useState(false);
  const [selectedSeedId, setSelectedSeedId] = useState<string>(wizardData.seed?.seed?.id || '');
  
  const [seedForm, setSeedForm] = useState({
    name: '',
    company: '',
    productivityRange: 'media' as 'baixa' | 'media' | 'alta' | 'muito_alta',
    bagWeight: '',
    seedsPerBag: '',
    price: '',
  });

  const [calculatorForm, setCalculatorForm] = useState({
    rowSpacing: wizardData.seed?.rowSpacing?.toString() || '',
    seedsPerMeter: wizardData.seed?.seedsPerMeter?.toString() || '',
  });

  const [calculationResult, setCalculationResult] = useState<number | null>(
    wizardData.seed?.populationPerHectare || null
  );

  const handleSeedFormChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSeedForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSeed = () => {
    if (!seedForm.name || !seedForm.company || !seedForm.bagWeight || !seedForm.seedsPerBag || !seedForm.price) {
      return;
    }

    const newSeed = addSeed({
      name: seedForm.name,
      company: seedForm.company,
      productivityRange: seedForm.productivityRange,
      bagWeight: parseFloat(seedForm.bagWeight) || 0,
      seedsPerBag: parseInt(seedForm.seedsPerBag) || 0,
      price: parseFloat(seedForm.price) || 0,
    });

    setSelectedSeedId(newSeed.id);
    setSeedForm({
      name: '',
      company: '',
      productivityRange: 'media',
      bagWeight: '',
      seedsPerBag: '',
      price: '',
    });
    setShowSeedForm(false);
  };

  const handleCalculate = () => {
    const rowSpacingCm = parseFloat(calculatorForm.rowSpacing.replace(',', '.')) || 0;
    const seedsPerMeter = parseFloat(calculatorForm.seedsPerMeter.replace(',', '.')) || 0;

    if (rowSpacingCm <= 0 || seedsPerMeter <= 0) return;

    // Converter centímetros para metros
    const rowSpacingMeters = rowSpacingCm / 100;
    // População = (10.000 / espaçamento em metros) * sementes por metro
    const population = Math.round((10000 / rowSpacingMeters) * seedsPerMeter);
    setCalculationResult(population);

    const selectedSeed = seeds.find(s => s.id === selectedSeedId) || null;

    const seedData: WizardSeedData = {
      seed: selectedSeed,
      rowSpacing: rowSpacingCm,
      seedsPerMeter,
      populationPerHectare: population,
    };

    setSeedData(seedData);
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCalculatorForm(prev => ({ ...prev, [field]: value }));
      setCalculationResult(null);
    }
  };

  const isCalculatorValid = calculatorForm.rowSpacing && calculatorForm.seedsPerMeter;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Escolha de Sementes</h2>
        <p className="text-muted-foreground">Selecione uma semente e calcule a população por hectare</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lista de Sementes */}
        <div className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-primary" />
                    Sementes Cadastradas
                  </CardTitle>
                  <CardDescription>
                    Selecione uma semente para usar no cálculo
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowSeedForm(!showSeedForm)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nova
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showSeedForm && (
                <div className="p-4 border border-border rounded-lg space-y-4 bg-muted/30">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome da Semente</Label>
                      <Input
                        placeholder="Ex: AG 1051"
                        value={seedForm.name}
                        onChange={handleSeedFormChange('name')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Empresa</Label>
                      <Input
                        placeholder="Ex: Agroceres"
                        value={seedForm.company}
                        onChange={handleSeedFormChange('company')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Faixa Produtiva</Label>
                      <Select
                        value={seedForm.productivityRange}
                        onValueChange={(value) => setSeedForm(prev => ({ ...prev, productivityRange: value as typeof seedForm.productivityRange }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCTIVITY_RANGES.map(range => (
                            <SelectItem key={range.value} value={range.value}>
                              {range.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Peso do Saco (kg)</Label>
                      <Input
                        type="number"
                        placeholder="20"
                        value={seedForm.bagWeight}
                        onChange={handleSeedFormChange('bagWeight')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sementes por Saco</Label>
                      <Input
                        type="number"
                        placeholder="60000"
                        value={seedForm.seedsPerBag}
                        onChange={handleSeedFormChange('seedsPerBag')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço (R$)</Label>
                      <Input
                        type="number"
                        placeholder="350.00"
                        value={seedForm.price}
                        onChange={handleSeedFormChange('price')}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowSeedForm(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleAddSeed}>
                      Adicionar
                    </Button>
                  </div>
                </div>
              )}

              {seeds.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">
                  Nenhuma semente cadastrada. Clique em "Nova" para adicionar.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {seeds.map(seed => (
                    <div
                      key={seed.id}
                      onClick={() => setSelectedSeedId(seed.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedSeedId === seed.id
                          ? 'bg-primary/10 border-2 border-primary'
                          : 'bg-secondary/30 border-2 border-transparent hover:bg-secondary/50'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{seed.name}</p>
                        <p className="text-sm text-muted-foreground">{seed.company}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedSeedId === seed.id && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSeed(seed.id);
                            if (selectedSeedId === seed.id) {
                              setSelectedSeedId('');
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Calculadora de População */}
        <div className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Calculadora de População
              </CardTitle>
              <CardDescription>
                Configure o espaçamento para calcular plantas por hectare
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rowSpacing">Espaçamento entre linhas (cm)</Label>
                <Input
                  id="rowSpacing"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 50, 70, 90"
                  value={calculatorForm.rowSpacing}
                  onChange={handleInputChange('rowSpacing')}
                  className="input-agro"
                />
                <p className="text-xs text-muted-foreground">
                  Espaçamentos comuns: 45cm, 50cm, 70cm, 90cm
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seedsPerMeter">Sementes por metro linear</Label>
                <Input
                  id="seedsPerMeter"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 4"
                  value={calculatorForm.seedsPerMeter}
                  onChange={handleInputChange('seedsPerMeter')}
                  className="input-agro"
                />
              </div>

              <Button
                onClick={handleCalculate}
                disabled={!isCalculatorValid}
                className="w-full"
              >
                Calcular População
              </Button>

              {calculationResult && (
                <Alert className="border-success bg-success/5 animate-fade-in">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <AlertTitle className="text-lg font-bold">
                    {calculationResult.toLocaleString('pt-BR')} plantas/ha
                  </AlertTitle>
                  <AlertDescription>
                    População calculada e salva com sucesso!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {selectedSeedId && (
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="text-base">Semente Selecionada</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const seed = seeds.find(s => s.id === selectedSeedId);
                  if (!seed) return null;
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nome</span>
                        <span className="font-medium">{seed.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Empresa</span>
                        <span className="font-medium">{seed.company}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Peso do Saco</span>
                        <span className="font-medium">{seed.bagWeight} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sementes/Saco</span>
                        <span className="font-medium">{seed.seedsPerBag.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Preço</span>
                        <span className="font-medium">R$ {seed.price.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
