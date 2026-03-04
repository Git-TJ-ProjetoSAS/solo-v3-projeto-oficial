import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PRODUCTIVITY_LEVELS, ProductivityRange } from '@/types/recommendation';
import { Seed } from '@/types/farm';

interface SeedEditDialogProps {
  seed: Seed | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Omit<Seed, 'id'>>) => void;
}

export function SeedEditDialog({ seed, open, onOpenChange, onSave }: SeedEditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    productivityRange: '' as ProductivityRange | '',
    bagWeight: '',
    seedsPerBag: '',
    price: '',
  });

  useEffect(() => {
    if (seed) {
      setFormData({
        name: seed.name,
        company: seed.company,
        productivityRange: seed.productivityRange,
        bagWeight: seed.bagWeight.toString(),
        seedsPerBag: seed.seedsPerBag.toString(),
        price: seed.price.toString(),
      });
    }
  }, [seed]);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (field === 'name' || field === 'company') {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
    } else if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = () => {
    if (!seed) return;
    onSave(seed.id, {
      name: formData.name.trim(),
      company: formData.company.trim(),
      productivityRange: formData.productivityRange as ProductivityRange,
      bagWeight: parseFloat(formData.bagWeight) || 0,
      seedsPerBag: parseInt(formData.seedsPerBag) || 0,
      price: parseFloat(formData.price) || 0,
    });
    onOpenChange(false);
  };

  const isFormValid = formData.name.trim() && formData.company.trim() && formData.productivityRange && formData.bagWeight && formData.seedsPerBag && formData.price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Semente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={formData.name} onChange={handleInputChange('name')} className="input-agro" />
          </div>
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input value={formData.company} onChange={handleInputChange('company')} className="input-agro" />
          </div>
          <div className="space-y-2">
            <Label>Faixa Produtiva</Label>
            <Select value={formData.productivityRange} onValueChange={(v: ProductivityRange) => setFormData(prev => ({ ...prev, productivityRange: v }))}>
              <SelectTrigger className="input-agro">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {Object.entries(PRODUCTIVITY_LEVELS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Peso (kg)</Label>
              <Input value={formData.bagWeight} onChange={handleInputChange('bagWeight')} inputMode="decimal" className="input-agro" />
            </div>
            <div className="space-y-2">
              <Label>Sem/Saco</Label>
              <Input value={formData.seedsPerBag} onChange={handleInputChange('seedsPerBag')} inputMode="numeric" className="input-agro" />
            </div>
            <div className="space-y-2">
              <Label>Preço (R$)</Label>
              <Input value={formData.price} onChange={handleInputChange('price')} inputMode="decimal" className="input-agro" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!isFormValid}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
