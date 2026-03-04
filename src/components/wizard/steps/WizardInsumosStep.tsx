import { useState, useEffect } from 'react';
import { Package, Plus, Loader2, Database, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWizard } from '@/contexts/WizardContext';
import { InsumoFormDialog } from '@/components/insumos/InsumoFormDialog';
import { InsumoDetailDialog } from '@/components/insumos/InsumoDetailDialog';
import { InsumoEditDialog } from '@/components/insumos/InsumoEditDialog';
import { InsumoCard } from '@/components/insumos/InsumoCard';
import { TIPOS_PRODUTO } from '@/types/insumo';
import { useToast } from '@/hooks/use-toast';
import { useInsumos } from '@/hooks/useInsumos';
import { cn } from '@/lib/utils';
import type { InsumoFormData } from '@/types/insumo';

export function WizardInsumosStep() {
  const { wizardData, addInsumo: addInsumoToWizard, removeInsumo: removeInsumoFromWizard } = useWizard();
  const { insumos: insumosDB, loading, addInsumo: addInsumoToDB, updateInsumo: updateInsumoInDB, deleteInsumo: deleteInsumoFromDB } = useInsumos();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTipoProduto, setSelectedTipoProduto] = useState<string>(TIPOS_PRODUTO[0]);
  const [selectedInsumo, setSelectedInsumo] = useState<(InsumoFormData & { id: string }) | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // IDs dos insumos selecionados para a recomendação
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sincronizar seleção inicial com os insumos do wizard
  useEffect(() => {
    const wizardInsumoIds = new Set(
      wizardData.insumos
        .filter((i): i is InsumoFormData & { id: string } => 'id' in i && typeof (i as any).id === 'string')
        .map(i => (i as any).id)
    );
    setSelectedIds(wizardInsumoIds);
  }, []);

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
        // Remover do wizard (encontrar pelo id)
        const indexInWizard = wizardData.insumos.findIndex(
          (i): i is InsumoFormData & { id: string } => 'id' in i && (i as any).id === insumo.id
        );
        if (indexInWizard >= 0) {
          removeInsumoFromWizard(indexInWizard);
        }
      } else {
        newSet.add(insumo.id);
        // Adicionar ao wizard
        addInsumoToWizard({ ...insumo });
      }
      return newSet;
    });
  };

  const handleDelete = async () => {
    if (selectedInsumo) {
      const success = await deleteInsumoFromDB(selectedInsumo.id);
      if (success) {
        // Remover da seleção se estava selecionado
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
    (insumo) => insumo.tipoProduto === selectedTipoProduto
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
        <h2 className="text-2xl font-bold text-foreground">Insumos</h2>
        <p className="text-muted-foreground">Selecione os insumos do catálogo para usar na recomendação</p>
      </div>

      {/* Indicador de seleção */}
      <div className="flex items-center justify-center gap-2 p-4 bg-secondary/30 rounded-lg">
        <Database className="w-5 h-5 text-primary" />
        <span className="text-sm">
          <strong>{totalSelecionados}</strong> insumo(s) selecionado(s) para esta recomendação
        </span>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Catálogo de Insumos
              </CardTitle>
              <CardDescription>
                Total no banco: {insumosDB.length} insumo(s)
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Insumo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Abas de Tipos de Produto */}
          <div className="flex flex-wrap gap-2 mb-6">
            {TIPOS_PRODUTO.map((tipo) => {
              const count = insumosDB.filter(i => i.tipoProduto === tipo).length;
              const selectedCount = insumosDB.filter(i => i.tipoProduto === tipo && selectedIds.has(i.id)).length;
              return (
                <button
                  key={tipo}
                  onClick={() => setSelectedTipoProduto(tipo)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-full border transition-colors',
                    selectedTipoProduto === tipo
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  )}
                >
                  {tipo} {count > 0 && (
                    <span className="ml-1">
                      ({selectedCount > 0 ? `${selectedCount}/` : ''}{count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Grid de Insumos */}
          {insumosFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {insumosFiltrados.map((insumo) => {
                const isSelected = selectedIds.has(insumo.id);
                return (
                  <div key={insumo.id} className="relative">
                    {/* Checkbox de seleção */}
                    <button
                      onClick={() => handleToggleSelection(insumo)}
                      className={cn(
                        'absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                        isSelected 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'bg-background border-border hover:border-primary'
                      )}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>
                    
                    <div className={cn(
                      'transition-all',
                      isSelected && 'ring-2 ring-primary ring-offset-2 rounded-lg'
                    )}>
                      <InsumoCard
                        insumo={insumo}
                        onClick={() => handleCardClick(insumo)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhum insumo cadastrado em <span className="font-medium text-foreground">{selectedTipoProduto}</span>
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
        tipoProduto={selectedTipoProduto}
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
