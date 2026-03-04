import { useState } from 'react';
import { Package, Plus, Loader2, Wheat, Coffee, Sprout } from 'lucide-react';
import { useFarmData } from '@/hooks/useFarmData';
import { useInsumos } from '@/hooks/useInsumos';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { InsumoFormDialog } from '@/components/insumos/InsumoFormDialog';
import { InsumoCard } from '@/components/insumos/InsumoCard';
import { InsumoDetailDialog } from '@/components/insumos/InsumoDetailDialog';
import { InsumoEditDialog } from '@/components/insumos/InsumoEditDialog';
import { TIPOS_PRODUTO } from '@/types/insumo';
import { Card, CardContent } from '@/components/ui/card';

import type { InsumoFormData } from '@/types/insumo';

const CULTURE_TABS = [
  { value: 'Milho Grão', label: 'Milho Grão', icon: Wheat },
  { value: 'Milho Silagem', label: 'Milho Silagem', icon: Sprout },
  { value: 'Café', label: 'Café', icon: Coffee },
] as const;

export default function Insumos() {
  const { selectedFarm } = useFarmData();
  const { insumos, loading, addInsumo, updateInsumo, deleteInsumo } = useInsumos();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCultura, setSelectedCultura] = useState<string>('Milho Grão');
  const [selectedTipoProduto, setSelectedTipoProduto] = useState<string>(TIPOS_PRODUTO[0]);
  const [selectedInsumo, setSelectedInsumo] = useState<(InsumoFormData & { id: string }) | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleSubmit = async (data: InsumoFormData) => {
    await addInsumo(data);
  };

  const handleCardClick = (insumo: InsumoFormData & { id: string }) => {
    setSelectedInsumo(insumo);
    setDetailDialogOpen(true);
  };

  const handleDelete = async () => {
    if (selectedInsumo) {
      await deleteInsumo(selectedInsumo.id);
      setSelectedInsumo(null);
    }
  };

  const handleEdit = () => {
    setDetailDialogOpen(false);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (updatedInsumo: InsumoFormData) => {
    if (selectedInsumo) {
      await updateInsumo(selectedInsumo.id, updatedInsumo);
      setSelectedInsumo({ ...updatedInsumo, id: selectedInsumo.id });
    }
  };

  const handleCulturaChange = (cultura: string) => {
    setSelectedCultura(cultura);
    setSelectedTipoProduto(TIPOS_PRODUTO[0]);
  };

  const filteredByculture = insumos.filter(i => i.culturas?.includes(selectedCultura));

  const filteredByType = filteredByculture.filter(i => i.tipoProduto === selectedTipoProduto);

  if (!selectedFarm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="glass-card p-10 animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 mx-auto">
            <Package className="w-8 h-8 text-muted-foreground/60" />
          </div>
          <p className="text-muted-foreground">
            Selecione uma fazenda para gerenciar insumos.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="glass-card p-10 animate-scale-in">
          <Loader2 className="w-12 h-12 text-primary mb-4 animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando insumos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insumos"
        description="Gerencie os insumos utilizados na fazenda"
      />

      {/* Culture Tabs */}
      <Tabs value={selectedCultura} onValueChange={handleCulturaChange} className="w-full">
        <TabsList className="h-12 p-1 bg-muted/50 rounded-xl w-full grid grid-cols-3">
          {CULTURE_TABS.map(({ value, label, icon: Icon }) => {
            const count = insumos.filter(i => i.culturas?.includes(value)).length;
            return (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs sm:text-sm"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(' ').pop()}</span>
                {count > 0 && (
                  <span className="ml-0.5 bg-primary/15 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CULTURE_TABS.map(({ value }) => (
          <TabsContent key={value} value={value} className="mt-5 space-y-4">
            {/* Product Type Pills */}
            <div className="flex flex-wrap gap-2 animate-fade-in">
              {TIPOS_PRODUTO.map((tipo) => {
                const count = filteredByculture.filter(i => i.tipoProduto === tipo).length;
                return (
                  <button
                    key={tipo}
                    onClick={() => setSelectedTipoProduto(tipo)}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-xl border transition-all duration-150 ${
                      selectedTipoProduto === tipo
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-card text-foreground border-border/50 hover:bg-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    {tipo} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div className="space-y-3">
              {filteredByType.length > 0 ? (
                <>
                  <div className="flex justify-end">
                    <Button className="gap-2 shadow-md" onClick={() => setDialogOpen(true)}>
                      <Plus className="w-4 h-4" />
                      Novo Insumo
                    </Button>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/40 overflow-hidden">
                    {filteredByType.map((insumo) => (
                      <InsumoCard
                        key={insumo.id}
                        insumo={insumo}
                        onClick={() => handleCardClick(insumo)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                      <Package className="w-8 h-8 text-muted-foreground/60" />
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Nenhum insumo de <span className="font-medium text-foreground">{selectedTipoProduto}</span> para{' '}
                      <span className="font-medium text-foreground">{value}</span>
                    </p>
                    <Button size="lg" className="gap-2 shadow-md" onClick={() => setDialogOpen(true)}>
                      <Plus className="w-5 h-5" />
                      Cadastrar Novo Insumo
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

          </TabsContent>
        ))}
      </Tabs>

      <InsumoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        tipoProduto={selectedTipoProduto}
        existingInsumos={insumos.map(i => ({ id: i.id, nome: i.nome }))}
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
