import { useState } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LaborCost } from '@/types/financial';

interface LaborTabProps {
  farmName: string;
  costs: LaborCost[];
  onAdd: (cost: Omit<LaborCost, 'id' | 'createdAt' | 'totalCost'>) => void;
  onDelete: (id: string) => void;
  total: number;
  farmId: string;
}

export function LaborTab({
  farmName,
  costs,
  onAdd,
  onDelete,
  total,
  farmId,
}: LaborTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    description: '',
    type: 'daily' as 'fixed' | 'daily',
    quantity: '',
    unitCost: '',
  });

  const handleSubmit = () => {
    if (!form.description || !form.quantity || !form.unitCost) return;
    
    onAdd({
      farmId,
      description: form.description,
      type: form.type,
      quantity: parseFloat(form.quantity),
      unitCost: parseFloat(form.unitCost),
    });
    
    setForm({ description: '', type: 'daily', quantity: '', unitCost: '' });
    setIsDialogOpen(false);
  };

  const getTypeLabel = (type: 'fixed' | 'daily') => 
    type === 'fixed' ? 'Fixo (Mensal)' : 'Diária';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Mão de Obra - {farmName}</h3>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {costs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum custo de mão de obra registrado.</p>
          <p className="text-sm">Clique em "Adicionar" para começar.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {costs.map(cost => (
              <div 
                key={cost.id} 
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg group"
              >
                <div>
                  <p className="font-medium text-foreground">{cost.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {getTypeLabel(cost.type)} • {cost.quantity} {cost.type === 'fixed' ? 'meses' : 'dias'} × R$ {cost.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="font-bold text-primary">
                    R$ {cost.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={() => onDelete(cost.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Total:</span>
              <span className="text-xl font-bold text-primary">
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Custo de Mão de Obra</DialogTitle>
            <DialogDescription>
              Registre custos com funcionários fixos ou diaristas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição / Função</Label>
              <Input
                id="description"
                placeholder="Ex: Tratorista, Diarista colheita, Operador"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="input-agro"
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select 
                value={form.type} 
                onValueChange={(value: 'fixed' | 'daily') => setForm(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="fixed">Fixo (Mensal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">
                  {form.type === 'fixed' ? 'Quantidade de Meses' : 'Quantidade de Dias'}
                </Label>
                <Input
                  id="quantity"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.quantity}
                  onChange={(e) => {
                    const value = e.target.value.replace(',', '.');
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setForm(prev => ({ ...prev, quantity: value }));
                    }
                  }}
                  className="input-agro"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitCost">
                  {form.type === 'fixed' ? 'Salário Mensal (R$)' : 'Valor da Diária (R$)'}
                </Label>
                <Input
                  id="unitCost"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.unitCost}
                  onChange={(e) => {
                    const value = e.target.value.replace(',', '.');
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setForm(prev => ({ ...prev, unitCost: value }));
                    }
                  }}
                  className="input-agro"
                />
              </div>
            </div>
            {form.quantity && form.unitCost && (
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Custo total estimado:</p>
                <p className="text-lg font-bold text-primary">
                  R$ {(parseFloat(form.quantity) * parseFloat(form.unitCost)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!form.description || !form.quantity || !form.unitCost}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
