import { useState } from 'react';
import { Trash2, Package, CheckCircle2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Seed } from '@/types/farm';
import { PRODUCTIVITY_LEVELS, ProductivityRange } from '@/types/recommendation';
import { cn } from '@/lib/utils';
import { SeedEditDialog } from './SeedEditDialog';
import { toast } from 'sonner';

interface SeedListProps {
  seeds: Seed[];
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Omit<Seed, 'id'>>) => void;
  selectedSeedId?: string | null;
  onSelect?: (id: string) => void;
}

const productivityColors: Record<ProductivityRange, string> = {
  baixa: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
  media: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  alta: 'bg-green-500/20 text-green-700 border-green-500/30',
  muito_alta: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
};

export function SeedList({ seeds, onDelete, onUpdate, selectedSeedId, onSelect }: SeedListProps) {
  const [editingSeed, setEditingSeed] = useState<Seed | null>(null);

  const handleSave = (id: string, updates: Partial<Omit<Seed, 'id'>>) => {
    onUpdate?.(id, updates);
    toast.success('Semente atualizada com sucesso!');
  };

  if (seeds.length === 0) {
    return (
      <div className="card-elevated p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Package className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma semente cadastrada ainda.</p>
          <p className="text-sm text-muted-foreground mt-1">Cadastre uma semente para começar.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card-elevated p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Sementes Cadastradas</h3>
          <Badge variant="secondary" className="ml-auto">
            {seeds.length} {seeds.length === 1 ? 'semente' : 'sementes'}
          </Badge>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {seeds.map((seed) => {
            const isSelected = selectedSeedId === seed.id;
            return (
              <div 
                key={seed.id} 
                className={cn(
                  "flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-lg border transition-all",
                  isSelected 
                    ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20" 
                    : "bg-secondary/30 border-border/50",
                  onSelect && "cursor-pointer hover:border-primary/30"
                )}
                onClick={() => onSelect?.(seed.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    <h4 className="font-medium text-foreground">{seed.name}</h4>
                    <Badge className={productivityColors[seed.productivityRange]}>
                      {PRODUCTIVITY_LEVELS[seed.productivityRange].label}
                    </Badge>
                    {isSelected && (
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                        Em uso
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{seed.company}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Saco: {seed.bagWeight}kg</span>
                    <span>{seed.seedsPerBag.toLocaleString('pt-BR')} sem/saco</span>
                    <span className="font-medium text-primary">
                      R$ {seed.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {onUpdate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); setEditingSeed(seed); }}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); onDelete(seed.id); }}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SeedEditDialog
        seed={editingSeed}
        open={!!editingSeed}
        onOpenChange={(open) => !open && setEditingSeed(null)}
        onSave={handleSave}
      />
    </>
  );
}
