import { useState } from 'react';
import { Droplets, Plus, Trash2 } from 'lucide-react';
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
import { IrrigationCost } from '@/types/financial';

interface IrrigationTabProps {
  farmName: string;
  costs: IrrigationCost[];
  onAdd: (cost: Omit<IrrigationCost, 'id' | 'createdAt' | 'totalCost'>) => void;
  onDelete: (id: string) => void;
  total: number;
  farmId: string;
}

export function IrrigationTab({
  farmName,
  costs,
  onAdd,
  onDelete,
  total,
  farmId,
}: IrrigationTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    description: '',
    costPerHectare: '',
    hectares: '',
  });

  const handleSubmit = () => {
    if (!form.description || !form.costPerHectare || !form.hectares) return;
    
    onAdd({
      farmId,
      description: form.description,
      costPerHectare: parseFloat(form.costPerHectare),
      hectares: parseFloat(form.hectares),
    });
    
    setForm({ description: '', costPerHectare: '', hectares: '' });
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Custos com Irrigação - {farmName}</h3>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {costs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Droplets className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum custo de irrigação registrado.</p>
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
                    {cost.hectares} ha × R$ {cost.costPerHectare.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ha
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
            <DialogTitle>Adicionar Custo de Irrigação</DialogTitle>
            <DialogDescription>
              Registre custos com energia, água, manutenção do sistema de irrigação.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Energia elétrica, Manutenção pivô central"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="input-agro"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="costHa">Custo por Hectare (R$)</Label>
                <Input
                  id="costHa"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.costPerHectare}
                  onChange={(e) => {
                    const value = e.target.value.replace(',', '.');
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setForm(prev => ({ ...prev, costPerHectare: value }));
                    }
                  }}
                  className="input-agro"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hectares">Hectares</Label>
                <Input
                  id="hectares"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.hectares}
                  onChange={(e) => {
                    const value = e.target.value.replace(',', '.');
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setForm(prev => ({ ...prev, hectares: value }));
                    }
                  }}
                  className="input-agro"
                />
              </div>
            </div>
            {form.costPerHectare && form.hectares && (
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Custo total estimado:</p>
                <p className="text-lg font-bold text-primary">
                  R$ {(parseFloat(form.costPerHectare) * parseFloat(form.hectares)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              disabled={!form.description || !form.costPerHectare || !form.hectares}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
