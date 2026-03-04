import { useState } from 'react';
import { Square, Plus, Trash2 } from 'lucide-react';
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
import { TarpaulinCost } from '@/types/financial';

interface TarpaulinTabProps {
  farmName: string;
  costs: TarpaulinCost[];
  onAdd: (cost: Omit<TarpaulinCost, 'id' | 'createdAt' | 'totalCost'>) => void;
  onDelete: (id: string) => void;
  total: number;
  farmId: string;
}

export function TarpaulinTab({
  farmName,
  costs,
  onAdd,
  onDelete,
  total,
  farmId,
}: TarpaulinTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    description: '',
    squareMeters: '',
    pricePerSquareMeter: '',
  });

  const handleSubmit = () => {
    if (!form.description || !form.squareMeters || !form.pricePerSquareMeter) return;
    
    onAdd({
      farmId,
      description: form.description,
      squareMeters: parseFloat(form.squareMeters),
      pricePerSquareMeter: parseFloat(form.pricePerSquareMeter),
    });
    
    setForm({ description: '', squareMeters: '', pricePerSquareMeter: '' });
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Square className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Lona - {farmName}</h3>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {costs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Square className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum custo de lona registrado.</p>
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
                    {cost.squareMeters} m² × R$ {cost.pricePerSquareMeter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/m²
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
            <DialogTitle>Adicionar Custo de Lona</DialogTitle>
            <DialogDescription>
              Registre custos com lonas para cobertura de silo, armazenamento, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Lona preta para silo, Lona dupla face"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="input-agro"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sqMeters">Metros Quadrados</Label>
                <Input
                  id="sqMeters"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.squareMeters}
                  onChange={(e) => {
                    const value = e.target.value.replace(',', '.');
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setForm(prev => ({ ...prev, squareMeters: value }));
                    }
                  }}
                  className="input-agro"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priceM2">Preço por m² (R$)</Label>
                <Input
                  id="priceM2"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.pricePerSquareMeter}
                  onChange={(e) => {
                    const value = e.target.value.replace(',', '.');
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setForm(prev => ({ ...prev, pricePerSquareMeter: value }));
                    }
                  }}
                  className="input-agro"
                />
              </div>
            </div>
            {form.squareMeters && form.pricePerSquareMeter && (
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Custo total estimado:</p>
                <p className="text-lg font-bold text-primary">
                  R$ {(parseFloat(form.squareMeters) * parseFloat(form.pricePerSquareMeter)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              disabled={!form.description || !form.squareMeters || !form.pricePerSquareMeter}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
