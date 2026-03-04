import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWizard } from '@/contexts/WizardContext';

export function WizardMicroStep() {
  const { wizardData, setSoilData } = useWizard();

  const [formData, setFormData] = useState({
    zn: wizardData.soil?.zn?.toString() || '',
    b: wizardData.soil?.b?.toString() || '',
    mn: wizardData.soil?.mn?.toString() || '',
    fe: wizardData.soil?.fe?.toString() || '',
    cu: wizardData.soil?.cu?.toString() || '',
    s: wizardData.soil?.s?.toString() || '',
  });

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Auto-save on change
  useEffect(() => {
    if (wizardData.soil) {
      setSoilData({
        ...wizardData.soil,
        zn: parseFloat(formData.zn) || 0,
        b: parseFloat(formData.b) || 0,
        mn: parseFloat(formData.mn) || 0,
        fe: parseFloat(formData.fe) || 0,
        cu: parseFloat(formData.cu) || 0,
        s: parseFloat(formData.s) || 0,
      });
    }
  }, [formData]);

  const fields = [
    { id: 'zn', label: 'Zinco (Zn)', unit: 'mg/dm³', ideal: '> 1,0' },
    { id: 'b', label: 'Boro (B)', unit: 'mg/dm³', ideal: '> 0,3' },
    { id: 'mn', label: 'Manganês (Mn)', unit: 'mg/dm³', ideal: '> 5,0' },
    { id: 'fe', label: 'Ferro (Fe)', unit: 'mg/dm³', ideal: '> 5,0' },
    { id: 'cu', label: 'Cobre (Cu)', unit: 'mg/dm³', ideal: '> 0,5' },
    { id: 's', label: 'Enxofre (S)', unit: 'mg/dm³', ideal: '> 10' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Preencha os Micronutrientes
        </h2>
        <p className="text-sm text-muted-foreground">
          Campos opcionais para análise completa
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id} className="text-sm">
                {field.label}
              </Label>
              <span className="text-xs text-muted-foreground">
                Ideal: {field.ideal}
              </span>
            </div>
            <div className="relative">
              <Input
                id={field.id}
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
          <span className="text-foreground font-medium">Opcional:</span> Esses valores ajudam a gerar uma recomendação mais precisa.
        </p>
      </div>
    </div>
  );
}
