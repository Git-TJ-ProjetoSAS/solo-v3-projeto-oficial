import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Droplets, Package, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWizard } from '@/contexts/WizardContext';
import { useFarmData } from '@/hooks/useFarmData';
import { InsumoFormDialog } from '@/components/insumos/InsumoFormDialog';
import { cn } from '@/lib/utils';

type DrenchEquipment = 'costal' | 'barra_caneta';

interface DrenchProduct {
  id: string;
  insumoId: string;
  name: string;
  type: string;
  dosePerPlantMl: number;
  concentrationGPerL: number;
  totalProductKg: number;
}

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
  principios_ativos: PrincipioAtivoData[] | null;
  recomendacao_dose_ha: number;
  recomendacao_dose_unidade: string;
}

const DRENCH_EQUIPMENT_OPTIONS = [
  { value: 'costal' as DrenchEquipment, label: 'Pulverizador Costal', desc: 'Aplicação manual planta a planta' },
  { value: 'barra_caneta' as DrenchEquipment, label: 'Barra com Caneta', desc: 'Barra tratorizada com caneta direcional' },
];

export function DrenchConfigStep() {
  const { wizardData, setDrenchData } = useWizard();
  const { selectedFarm } = useFarmData();

  // Drench parameters - restore from context if available
  const savedDrench = wizardData.drench;
  const [equipment, setEquipment] = useState<DrenchEquipment>(savedDrench?.equipment || 'costal');
  const [volumePerPlantMl, setVolumePerPlantMl] = useState(savedDrench?.volumePerPlantMl || 200);
  const [populationPerHa, setPopulationPerHa] = useState(
    savedDrench?.populationPerHa || wizardData.seed?.populationPerHectare || 4082
  );
  const [hectares, setHectares] = useState(
    savedDrench?.hectares || wizardData.spraying?.hectares || wizardData.hectares || 10
  );

  // Operational costs
  const [costalCostPerHour, setCostalCostPerHour] = useState(savedDrench?.costalCostPerHour ?? 20);
  const [costalPlantsPerHour, setCostalPlantsPerHour] = useState(savedDrench?.costalPlantsPerHour ?? 120);
  const [barraCostPerHour, setBarraCostPerHour] = useState(savedDrench?.barraCostPerHour ?? 150);
  const [barraPlantsPerHour, setBarraPlantsPerHour] = useState(savedDrench?.barraPlantsPerHour ?? 600);

  // Products - restore from context
  const [products, setProducts] = useState<DrenchProduct[]>(
    savedDrench?.products?.map(p => ({
      ...p,
      dosePerPlantMl: savedDrench.volumePerPlantMl || 200,
    })) || []
  );
  const [insumoOptions, setInsumoOptions] = useState<InsumoOption[]>([]);

  // Form state
  const [selectedInsumo, setSelectedInsumo] = useState('');
  const [concentrationInput, setConcentrationInput] = useState('');

  // Dialog
  const [isInsumoDialogOpen, setIsInsumoDialogOpen] = useState(false);

  // Calculations
  const totalVolumeLPerHa = (populationPerHa * volumePerPlantMl) / 1000;
  const totalVolumeL = totalVolumeLPerHa * hectares;
  const totalPlants = populationPerHa * hectares;

  // Operational cost calculations
  const plantsPerHour = equipment === 'costal' ? costalPlantsPerHour : barraPlantsPerHour;
  const costPerHour = equipment === 'costal' ? costalCostPerHour : barraCostPerHour;
  const totalHours = totalPlants / plantsPerHour;
  const operationalCost = totalHours * costPerHour;
  const operationalCostPerHa = hectares > 0 ? operationalCost / hectares : 0;
  const operationalCostPerPlant = totalPlants > 0 ? operationalCost / totalPlants : 0;

  // Product cost
  const productCost = products.reduce((sum, p) => {
    const insumo = insumoOptions.find(i => i.id === p.insumoId);
    if (!insumo || insumo.tamanho_unidade <= 0) return sum;
    return sum + (p.totalProductKg / (insumo.tamanho_unidade / 1000)) * insumo.preco;
  }, 0);
  const totalCost = operationalCost + productCost;
  const totalCostPerHa = hectares > 0 ? totalCost / hectares : 0;

  const loadInsumos = async () => {
    const { data, error } = await supabase
      .from('insumos')
      .select('id, nome, tipo_produto, preco, tamanho_unidade, medida, principios_ativos, recomendacao_dose_ha, recomendacao_dose_unidade')
      .in('tipo_produto', ['Fungicida', 'Inseticida', 'Nematicida', 'Herbicida', 'Foliar'])
      .eq('status', 'ativo');

    if (error) {
      console.error('Erro ao carregar insumos:', error);
      return;
    }

    setInsumoOptions((data || []).map(item => ({
      ...item,
      principios_ativos: Array.isArray(item.principios_ativos)
        ? item.principios_ativos as unknown as PrincipioAtivoData[]
        : null,
    })));
  };

  useEffect(() => {
    loadInsumos();
  }, []);

  // Sync population from wizard seed data
  useEffect(() => {
    if (wizardData.seed?.populationPerHectare) {
      setPopulationPerHa(wizardData.seed.populationPerHectare);
    }
  }, [wizardData.seed?.populationPerHectare]);

  // Sync drench data to wizard context
  useEffect(() => {
    setDrenchData({
      equipment,
      volumePerPlantMl,
      populationPerHa,
      hectares,
      products: products.map(p => ({
        id: p.id,
        insumoId: p.insumoId,
        name: p.name,
        type: p.type,
        concentrationGPerL: p.concentrationGPerL,
        totalProductKg: p.totalProductKg,
      })),
      costalCostPerHour,
      costalPlantsPerHour,
      barraCostPerHour,
      barraPlantsPerHour,
    });
  }, [equipment, volumePerPlantMl, populationPerHa, hectares, products, costalCostPerHour, costalPlantsPerHour, barraCostPerHour, barraPlantsPerHour]);

  const handleAddProduct = () => {
    if (!selectedInsumo || !concentrationInput) {
      toast.error('Selecione o produto e informe a concentração');
      return;
    }

    const insumo = insumoOptions.find(i => i.id === selectedInsumo);
    if (!insumo) return;

    const concentrationGPerL = parseFloat(concentrationInput);
    if (isNaN(concentrationGPerL) || concentrationGPerL <= 0) {
      toast.error('Informe uma concentração válida');
      return;
    }

    // Dose per plant in g
    const dosePerPlantG = concentrationGPerL * (volumePerPlantMl / 1000);
    // Total product in kg for entire area
    const totalProductKg = (dosePerPlantG * totalPlants) / 1000;

    const newProduct: DrenchProduct = {
      id: crypto.randomUUID(),
      insumoId: insumo.id,
      name: insumo.nome,
      type: insumo.tipo_produto,
      dosePerPlantMl: volumePerPlantMl,
      concentrationGPerL,
      totalProductKg,
    };

    setProducts(prev => [...prev, newProduct]);
    setSelectedInsumo('');
    setConcentrationInput('');
    toast.success('Produto adicionado ao drench');
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    toast.success('Produto removido');
  };

  const selectedInsumoData = insumoOptions.find(i => i.id === selectedInsumo);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Drench no Colo da Planta
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure volume, concentração e equipamento para aplicação via drench
        </p>
      </div>

      {/* Equipment Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Equipamento</Label>
        <RadioGroup
          value={equipment}
          onValueChange={(v) => setEquipment(v as DrenchEquipment)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {DRENCH_EQUIPMENT_OPTIONS.map(opt => (
            <label
              key={opt.value}
              htmlFor={`drench-eq-${opt.value}`}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                equipment === opt.value
                  ? "border-foreground bg-secondary"
                  : "border-border bg-background hover:border-foreground/30"
              )}
            >
              <RadioGroupItem value={opt.value} id={`drench-eq-${opt.value}`} className="mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Parameters */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="volumePerPlant" className="text-sm">
            Volume por Planta
          </Label>
          <div className="relative">
            <Input
              id="volumePerPlant"
              type="number"
              value={volumePerPlantMl}
              onChange={(e) => setVolumePerPlantMl(parseFloat(e.target.value) || 0)}
              className="pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              mL
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="populationHa" className="text-sm">
            Plantas / Hectare
          </Label>
          <div className="relative">
            <Input
              id="populationHa"
              type="number"
              value={populationPerHa}
              onChange={(e) => setPopulationPerHa(parseFloat(e.target.value) || 0)}
              className="pr-14"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              pl/ha
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="drenchHectares" className="text-sm">
            Área Total
          </Label>
          <div className="relative">
            <Input
              id="drenchHectares"
              type="number"
              value={hectares}
              onChange={(e) => setHectares(parseFloat(e.target.value) || 0)}
              className="pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              ha
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-secondary rounded-xl">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Vol/ha</p>
          <p className="text-lg font-semibold text-foreground">
            {totalVolumeLPerHa.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Volume Total</p>
          <p className="text-lg font-semibold text-foreground">
            {totalVolumeL.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Plantas</p>
          <p className="text-lg font-semibold text-foreground">
            {totalPlants.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">mL/planta</p>
          <p className="text-lg font-semibold text-foreground">
            {volumePerPlantMl}
          </p>
        </div>
      </div>

      {/* Operational Cost Config */}
      <div className="space-y-4 p-4 bg-secondary rounded-xl">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Custo Operacional do Drench</Label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">
              {equipment === 'costal' ? 'Custo mão de obra (R$/hora)' : 'Custo trator + operador (R$/hora)'}
            </Label>
            <div className="relative">
              <Input
                type="number"
                value={equipment === 'costal' ? costalCostPerHour : barraCostPerHour}
                onChange={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  equipment === 'costal' ? setCostalCostPerHour(v) : setBarraCostPerHour(v);
                }}
                className="pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                R$/h
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Rendimento (plantas/hora)</Label>
            <div className="relative">
              <Input
                type="number"
                value={equipment === 'costal' ? costalPlantsPerHour : barraPlantsPerHour}
                onChange={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  equipment === 'costal' ? setCostalPlantsPerHour(v) : setBarraPlantsPerHour(v);
                }}
                className="pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                pl/h
              </span>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-background rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Horas estimadas</p>
            <p className="text-sm font-semibold text-foreground">{totalHours.toFixed(1)} h</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Custo operação</p>
            <p className="text-sm font-semibold text-foreground">
              R$ {operationalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">R$/ha</p>
            <p className="text-sm font-semibold text-foreground">
              R$ {operationalCostPerHa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">R$/planta</p>
            <p className="text-sm font-semibold text-foreground">
              R$ {operationalCostPerPlant.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
            </p>
          </div>
        </div>

        {/* Total Cost with Products */}
        {products.length > 0 && (
          <div className="p-3 bg-primary/10 rounded-lg space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Custo operacional</span>
              <span>R$ {operationalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Custo produtos</span>
              <span>R$ {productCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-foreground border-t border-border pt-1 mt-1">
              <span>Custo total</span>
              <span>R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <p className="text-xs text-muted-foreground text-right">
              = R$ {totalCostPerHa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/ha
            </p>
          </div>
        )}
      </div>

      {/* Add Product */}
      <div className="space-y-4 p-4 bg-secondary rounded-xl">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Adicionar Produto ao Drench</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsInsumoDialogOpen(true)}
            className="gap-2 text-xs"
          >
            <Package className="h-3 w-3" />
            Novo Insumo
          </Button>
        </div>

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

        {selectedInsumoData && (
          <div className="p-3 bg-background rounded-lg space-y-2">
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
              <p className="text-xs text-muted-foreground">
                Dose fabricante: {selectedInsumoData.recomendacao_dose_ha} {selectedInsumoData.recomendacao_dose_unidade}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Concentração do produto na calda</Label>
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              placeholder="Ex: 2.0"
              value={concentrationInput}
              onChange={(e) => setConcentrationInput(e.target.value)}
              className="pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              g/L
            </span>
          </div>
          {concentrationInput && volumePerPlantMl > 0 && (
            <p className="text-xs text-muted-foreground">
              = {((parseFloat(concentrationInput) || 0) * (volumePerPlantMl / 1000)).toFixed(2)} g/planta
            </p>
          )}
        </div>

        <Button
          onClick={handleAddProduct}
          disabled={!selectedInsumo || !concentrationInput}
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar ao Drench
        </Button>
      </div>

      {/* Products List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Produtos no Drench ({products.length})</span>
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
                    {product.concentrationGPerL} g/L •{' '}
                    {(product.concentrationGPerL * (volumePerPlantMl / 1000)).toFixed(2)} g/planta •{' '}
                    Total: {product.totalProductKg.toFixed(2)} kg
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
        tipoProduto="Fungicida"
        existingInsumos={insumoOptions.map(i => ({ id: i.id, nome: i.nome }))}
      />
    </div>
  );
}
