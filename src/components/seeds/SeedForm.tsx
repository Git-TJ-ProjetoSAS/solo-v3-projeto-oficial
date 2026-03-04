import { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PRODUCTIVITY_LEVELS, ProductivityRange } from '@/types/recommendation';
import { Seed } from '@/types/farm';

interface SeedFormProps {
  onSubmit: (seed: Omit<Seed, 'id'>) => void;
}

export function SeedForm({ onSubmit }: SeedFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    productivityRange: '' as ProductivityRange | '',
    bagWeight: '',
    seedsPerBag: '',
    price: '',
  });

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (field === 'name' || field === 'company') {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
    } else if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleProductivityChange = (value: ProductivityRange) => {
    setFormData(prev => ({ ...prev, productivityRange: value }));
  };

  const handleSubmit = () => {
    if (!isFormValid) return;

    onSubmit({
      name: formData.name.trim(),
      company: formData.company.trim(),
      productivityRange: formData.productivityRange as ProductivityRange,
      bagWeight: parseFloat(formData.bagWeight),
      seedsPerBag: parseInt(formData.seedsPerBag),
      price: parseFloat(formData.price),
    });

    setFormData({
      name: '',
      company: '',
      productivityRange: '',
      bagWeight: '',
      seedsPerBag: '',
      price: '',
    });
  };

  const isFormValid = 
    formData.name.trim() && 
    formData.company.trim() && 
    formData.productivityRange && 
    formData.bagWeight && 
    formData.seedsPerBag && 
    formData.price;

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="w-5 h-5 text-accent" />
        <h3 className="font-semibold text-foreground">Cadastro de Semente</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Semente</Label>
          <Input
            id="name"
            type="text"
            placeholder="Ex: AG 8088 PRO3"
            value={formData.name}
            onChange={handleInputChange('name')}
            className="input-agro"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <Input
            id="company"
            type="text"
            placeholder="Ex: Agroceres, Pioneer"
            value={formData.company}
            onChange={handleInputChange('company')}
            className="input-agro"
          />
        </div>

        <div className="space-y-2">
          <Label>Faixa Produtiva</Label>
          <Select value={formData.productivityRange} onValueChange={handleProductivityChange}>
            <SelectTrigger className="input-agro">
              <SelectValue placeholder="Selecione a faixa" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              {Object.entries(PRODUCTIVITY_LEVELS).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bagWeight">Peso do Saco (kg)</Label>
          <Input
            id="bagWeight"
            type="text"
            inputMode="decimal"
            placeholder="Ex: 20, 25, 60"
            value={formData.bagWeight}
            onChange={handleInputChange('bagWeight')}
            className="input-agro"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="seedsPerBag">Sementes por Saco</Label>
          <Input
            id="seedsPerBag"
            type="text"
            inputMode="numeric"
            placeholder="Ex: 60000, 80000"
            value={formData.seedsPerBag}
            onChange={handleInputChange('seedsPerBag')}
            className="input-agro"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Preço (R$)</Label>
          <Input
            id="price"
            type="text"
            inputMode="decimal"
            placeholder="Ex: 850.00"
            value={formData.price}
            onChange={handleInputChange('price')}
            className="input-agro"
          />
        </div>
      </div>

      <Button 
        onClick={handleSubmit}
        disabled={!isFormValid}
        className="w-full mt-6"
      >
        <Plus className="w-4 h-4 mr-2" />
        Cadastrar Semente
      </Button>
    </div>
  );
}
