import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCoffee } from '@/contexts/CoffeeContext';
import { estimateSoilTexture } from '@/contexts/CoffeeContext';

export function CoffeeMacroStep() {
  const { coffeeData, setSoilData } = useCoffee();

  const [formData, setFormData] = useState({
    ca: coffeeData.soil?.ca?.toString() || '',
    mg: coffeeData.soil?.mg?.toString() || '',
    k: coffeeData.soil?.k?.toString() || '',
    hAl: coffeeData.soil?.hAl?.toString() || '',
    p: coffeeData.soil?.p?.toString() || '',
    mo: coffeeData.soil?.mo?.toString() || '',
  });

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  useEffect(() => {
    const ca = parseFloat(formData.ca) || 0;
    const mg = parseFloat(formData.mg) || 0;
    const k = parseFloat(formData.k) || 0;
    const hAl = parseFloat(formData.hAl) || 0;

    if (ca > 0 || mg > 0 || k > 0 || hAl > 0) {
      const kConverted = k / 391;
      const sb = ca + mg + kConverted;
      const ctc = sb + hAl;
      const vPercent = ctc > 0 ? (sb / ctc) * 100 : 0;

      const moVal = parseFloat(formData.mo) || 0;
      const texture = estimateSoilTexture(moVal);
      setSoilData({
        ca,
        mg,
        k,
        hAl,
        p: parseFloat(formData.p) || coffeeData.soil?.p || 0,
        mo: moVal,
        moUnit: 'g/dm³',
        texturaEstimada: texture,
        texturaFonte: coffeeData.soil?.texturaFonte || 'estimada',
        argila: coffeeData.soil?.argila ?? null,
        silte: coffeeData.soil?.silte ?? null,
        areia: coffeeData.soil?.areia ?? null,
        zn: coffeeData.soil?.zn || 0,
        b: coffeeData.soil?.b || 0,
        mn: coffeeData.soil?.mn || 0,
        fe: coffeeData.soil?.fe || 0,
        cu: coffeeData.soil?.cu || 0,
        s: coffeeData.soil?.s || 0,
        vPercent,
      });
    }
  }, [formData]);

  const coffeeLabel = coffeeData.coffeeType === 'conilon' ? 'Conilon' : 'Arábica';

  const fields = [
    { id: 'ca', label: 'Cálcio (Ca)', unit: 'cmolc/dm³', required: true },
    { id: 'mg', label: 'Magnésio (Mg)', unit: 'cmolc/dm³', required: true },
    { id: 'k', label: 'Potássio (K)', unit: 'mg/dm³', required: true },
    { id: 'hAl', label: 'H+Al', unit: 'cmolc/dm³', required: true },
    { id: 'p', label: 'Fósforo (P)', unit: 'mg/dm³', required: false },
    { id: 'mo', label: 'Matéria Orgânica', unit: 'g/dm³', required: false },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Macronutrientes — Café {coffeeLabel}
        </h2>
        <p className="text-sm text-muted-foreground">
          Insira os valores da análise de solo
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`coffee-${field.id}`} className="text-sm">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="relative">
              <Input
                id={`coffee-${field.id}`}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData[field.id as keyof typeof formData]}
                onChange={handleInputChange(field.id)}
                className="pr-20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {field.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-secondary rounded-xl mt-6">
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">Dica:</span> Os campos marcados com * são obrigatórios para o cálculo do V%. O V% ideal para café é entre 60% e 70%.
        </p>
      </div>
    </div>
  );
}
