import { useState, useEffect } from 'react';
import { Package, Plus, Loader2, Database, Check, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCoffee } from '@/contexts/CoffeeContext';
import { InsumoFormDialog } from '@/components/insumos/InsumoFormDialog';
import { InsumoDetailDialog } from '@/components/insumos/InsumoDetailDialog';
import { InsumoEditDialog } from '@/components/insumos/InsumoEditDialog';
import { useInsumos } from '@/hooks/useInsumos';
import { cn } from '@/lib/utils';
import type { InsumoFormData } from '@/types/insumo';

interface CoffeeInsumosStepProps {
  tipoProduto: string;
  title: string;
  description: string;
}

export function CoffeeInsumosStep({ tipoProduto, title, description }: CoffeeInsumosStepProps) {
  const { coffeeData, addInsumo: addInsumoToContext, removeInsumo: removeInsumoFromContext } = useCoffee();
  const { insumos: insumosDB, loading, addInsumo: addInsumoToDB, updateInsumo: updateInsumoInDB, deleteInsumo: deleteInsumoFromDB } = useInsumos();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<(InsumoFormData & { id: string }) | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sincronizar seleção inicial com os insumos do context
  useEffect(() => {
    const contextInsumoIds = new Set(
      coffeeData.insumos
        .filter((i): i is InsumoFormData & { id: string } => 'id' in i && typeof (i as any).id === 'string' && i.tipoProduto === tipoProduto)
        .map(i => (i as any).id)
    );
    setSelectedIds(contextInsumoIds);
  }, [tipoProduto]);

  const handleSubmit = async (data: InsumoFormData) => {
    const success = await addInsumoToDB(data);
    if (success) {
      setDialogOpen(false);
    }
  };

  const handleCardClick = (insumo: InsumoFormData & { id: string }) => {
    setSelectedInsumo(insumo);
    setDetailDialogOpen(true);
  };

  const handleToggleSelection = (insumo: InsumoFormData & { id: string }) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insumo.id)) {
        newSet.delete(insumo.id);
        const indexInContext = coffeeData.insumos.findIndex(
          (i): i is InsumoFormData & { id: string } => 'id' in i && (i as any).id === insumo.id
        );
        if (indexInContext >= 0) {
          removeInsumoFromContext(indexInContext);
        }
      } else {
        newSet.add(insumo.id);
        addInsumoToContext({ ...insumo });
      }
      return newSet;
    });
  };

  const handleDelete = async () => {
    if (selectedInsumo) {
      const success = await deleteInsumoFromDB(selectedInsumo.id);
      if (success) {
        if (selectedIds.has(selectedInsumo.id)) {
          setSelectedIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(selectedInsumo.id);
            return newSet;
          });
        }
        setSelectedInsumo(null);
        setDetailDialogOpen(false);
      }
    }
  };

  const handleEdit = () => {
    setDetailDialogOpen(false);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (updatedInsumo: InsumoFormData) => {
    if (selectedInsumo) {
      const success = await updateInsumoInDB(selectedInsumo.id, updatedInsumo);
      if (success) {
        setSelectedInsumo({ ...updatedInsumo, id: selectedInsumo.id });
        setEditDialogOpen(false);
      }
    }
  };

  const insumosFiltrados = insumosDB.filter(
    (insumo) => insumo.tipoProduto === tipoProduto && insumo.status === 'ativo'
  );

  const totalSelecionados = selectedIds.size;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando insumos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Indicador de seleção */}
      <div className="flex items-center justify-center gap-2 p-4 bg-secondary/30 rounded-lg">
        <Database className="w-5 h-5 text-primary" />
        <span className="text-sm">
          <strong>{totalSelecionados}</strong> insumo(s) selecionado(s) para {title.toLowerCase()}
        </span>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {tipoProduto}
              </CardTitle>
              <CardDescription>
                {insumosFiltrados.length} insumo(s) disponível(is)
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Insumo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {insumosFiltrados.length > 0 ? (
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {insumosFiltrados.map((insumo) => {
                const isSelected = selectedIds.has(insumo.id);
                const displayPrice = insumo.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                return (
                  <div
                    key={insumo.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 transition-colors',
                      isSelected ? 'bg-primary/5' : 'bg-background hover:bg-secondary/50'
                    )}
                  >
                    {/* Toggle de seleção */}
                    <button
                      onClick={() => handleToggleSelection(insumo)}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-background border-border hover:border-primary'
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', isSelected && 'text-primary')}>{insumo.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{insumo.marca} · {insumo.fornecedor}</p>
                    </div>

                    {/* Preço e tamanho */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-sm font-semibold text-foreground">{displayPrice}</p>
                      <p className="text-[10px] text-muted-foreground">{insumo.tamanhoUnidade} {insumo.medida.toUpperCase()}</p>
                    </div>

                    {/* Botão detalhe */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleCardClick(insumo); }}
                    >
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhum insumo cadastrado em <span className="font-medium text-foreground">{tipoProduto}</span>
              </p>
              <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Cadastrar Insumo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <InsumoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        tipoProduto={tipoProduto}
        existingInsumos={insumosDB.map(i => ({ id: i.id, nome: i.nome }))}
      />

      <InsumoDetailDialog
        insumo={selectedInsumo}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />

      <InsumoEditDialog
        insumo={selectedInsumo}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
