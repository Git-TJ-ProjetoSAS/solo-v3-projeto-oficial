import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Droplets, Package, ArrowDownToLine, Backpack } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWizard } from '@/contexts/WizardContext';
import { InsumoFormDialog } from '@/components/insumos/InsumoFormDialog';
import type { SprayingUnit, SprayingProduct } from '@/types/spraying';
import { 
  SPRAYING_UNITS, 
  calculateQuantityPerTank, 
  calculateTotalQuantity,
  formatQuantity 
} from '@/types/spraying';

interface PrincipioAtivoData {
  nome: string;
  concentracao: number;
  unidade: string;
}

interface InsumoOption {
  id: string;
  nome: string;
  tipo_produto: string;
  preco: number;
  tamanho_unidade: number;
  medida: string;
  observacoes: string | null;
  principios_ativos: PrincipioAtivoData[] | null;
  recomendacao_dose_ha: number;
  recomendacao_dose_unidade: string;
}

export function SprayingMixStep() {
  const { wizardData, setSprayingData } = useWizard();
  
  const equipmentType = wizardData.spraying?.equipment?.type || 'trator';
  const tankCapacity = wizardData.spraying?.equipment?.tankCapacity || 500;
  const applicationRate = wizardData.spraying?.equipment?.applicationRate || 150;
  const hectares = wizardData.spraying?.hectares || 10;
  
  const [products, setProducts] = useState<SprayingProduct[]>(
    wizardData.spraying?.products || []
  );
  const [insumoOptions, setInsumoOptions] = useState<InsumoOption[]>([]);
  
  // Form state
  const [selectedInsumo, setSelectedInsumo] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<SprayingUnit>('L/ha');
  const [doseInput, setDoseInput] = useState<string>('');
  
  // Dialog
  const [isInsumoDialogOpen, setIsInsumoDialogOpen] = useState(false);
  const [insumoDialogType, setInsumoDialogType] = useState<string>('Herbicida');

  const loadInsumos = async () => {
    const { data, error } = await supabase
      .from('insumos')
      .select('id, nome, tipo_produto, preco, tamanho_unidade, medida, observacoes, principios_ativos, recomendacao_dose_ha, recomendacao_dose_unidade')
      .in('tipo_produto', ['Herbicida', 'Adjuvantes', 'Fungicida', 'Inseticida', 'Foliar'])
      .eq('status', 'ativo');
    
    if (error) {
      console.error('Erro ao carregar insumos:', error);
      return;
    }
    
    const parsedData = (data || []).map(item => ({
      ...item,
      principios_ativos: Array.isArray(item.principios_ativos) 
        ? item.principios_ativos as unknown as PrincipioAtivoData[]
        : null,
    }));
    
    setInsumoOptions(parsedData);
  };

  useEffect(() => {
    loadInsumos();
  }, []);

  // Auto-save
  useEffect(() => {
    if (wizardData.spraying) {
      setSprayingData({
        ...wizardData.spraying,
        products,
      });
    }
  }, [products]);

  const handleAddProduct = () => {
    if (!selectedInsumo || !doseInput) {
      toast.error('Selecione um produto e informe a dose');
      return;
    }
    
    const insumo = insumoOptions.find(i => i.id === selectedInsumo);
    if (!insumo) return;
    
    const dose = parseFloat(doseInput);
    if (isNaN(dose) || dose <= 0) {
      toast.error('Informe uma dose válida');
      return;
    }
    
    const qtyPerTank = calculateQuantityPerTank(selectedUnit, dose, tankCapacity, applicationRate);
    const totalQty = calculateTotalQuantity(selectedUnit, dose, hectares, tankCapacity, applicationRate);
    
    const newProduct: SprayingProduct = {
      id: crypto.randomUUID(),
      insumoId: insumo.id,
      name: insumo.nome,
      type: insumo.tipo_produto,
      unit: selectedUnit,
      doseInput: dose,
      quantityPerTank: qtyPerTank,
      totalQuantity: totalQty,
    };
    
    setProducts(prev => [...prev, newProduct]);
    setSelectedInsumo('');
    setDoseInput('');
    
    toast.success('Produto adicionado ao mix');
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    toast.success('Produto removido');
  };

  const selectedInsumoData = insumoOptions.find(i => i.id === selectedInsumo);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Monte o Mix de Calda
        </h2>
        <p className="text-sm text-muted-foreground">
          Adicione os produtos para a pulverização
        </p>
      </div>

      {/* Add Product Form */}
      <div className="space-y-4 p-4 bg-secondary rounded-xl">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Adicionar Produto</Label>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setInsumoDialogType('Herbicida');
              setIsInsumoDialogOpen(true);
            }}
            className="gap-2 text-xs"
          >
            <Package className="h-3 w-3" />
            Novo Insumo
          </Button>
        </div>

        {/* Product Selection */}
        <Select value={selectedInsumo} onValueChange={setSelectedInsumo}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um produto..." />
          </SelectTrigger>
          <SelectContent>
            {insumoOptions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Nenhum produto cadastrado.
              </div>
            ) : (
              insumoOptions.map(insumo => (
                <SelectItem key={insumo.id} value={insumo.id}>
                  <div className="flex items-center gap-2">
                    <span>{insumo.nome}</span>
                    <Badge variant="outline" className="text-xs">
                      {insumo.tipo_produto}
                    </Badge>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {/* Selected Product Info */}
        {selectedInsumoData && (
          <div className="p-3 bg-background rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{selectedInsumoData.nome}</span>
              <Badge variant="secondary" className="text-xs">{selectedInsumoData.tipo_produto}</Badge>
            </div>
            
            {selectedInsumoData.principios_ativos && selectedInsumoData.principios_ativos.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedInsumoData.principios_ativos.map((pa, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {pa.nome}: {pa.concentracao} {pa.unidade}
                  </Badge>
                ))}
              </div>
            )}
            
            {selectedInsumoData.recomendacao_dose_ha > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Dose recomendada: {selectedInsumoData.recomendacao_dose_ha} {selectedInsumoData.recomendacao_dose_unidade}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => {
                    setDoseInput(selectedInsumoData.recomendacao_dose_ha.toString());
                    const matchingUnit = SPRAYING_UNITS.find(u => u.value === selectedInsumoData.recomendacao_dose_unidade);
                    if (matchingUnit) setSelectedUnit(matchingUnit.value);
                    toast.success('Dose aplicada');
                  }}
                >
                  <ArrowDownToLine className="h-3 w-3" />
                  Usar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Dose Input */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Unidade</Label>
            <Select value={selectedUnit} onValueChange={(v) => setSelectedUnit(v as SprayingUnit)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPRAYING_UNITS.map(unit => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Dosagem</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Ex: 2.5"
              value={doseInput}
              onChange={(e) => setDoseInput(e.target.value)}
            />
          </div>
        </div>

        <Button 
          onClick={handleAddProduct} 
          disabled={!selectedInsumo || !doseInput}
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar ao Mix
        </Button>
      </div>

      {/* Products List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Mix de Calda ({products.length})</span>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-secondary rounded-xl">
            <Droplets className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum produto adicionado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map(product => (
              <div 
                key={product.id} 
                className="p-4 bg-secondary rounded-xl flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.doseInput} {product.unit} • Total: {formatQuantity(product.totalQuantity, product.unit)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveProduct(product.id)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Insumo Dialog */}
      <InsumoFormDialog
        open={isInsumoDialogOpen}
        onOpenChange={setIsInsumoDialogOpen}
        onSuccess={() => {
          loadInsumos();
          toast.success('Insumo cadastrado!');
        }}
        tipoProduto={insumoDialogType}
        existingInsumos={insumoOptions.map((i: any) => ({ id: i.id, nome: i.nome }))}
      />
    </div>
  );
}
