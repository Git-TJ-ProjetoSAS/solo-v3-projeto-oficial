import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  FileText, 
  Beaker, 
  Leaf, 
  Package, 
  DollarSign, 
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Droplets,
  FlaskConical,
  Tractor,
  Users,
  Square,
  SprayCan,
  ArrowLeftRight,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWizard } from '@/contexts/WizardContext';
import { useInsumos } from '@/hooks/useInsumos';
import { calcularRecomendacaoComInsumos, type RecommendationEngineResult, type InsumoRecomendado } from '@/hooks/useRecommendationEngine';
import { ProductivityRange, PRODUCTIVITY_LEVELS } from '@/types/recommendation';
import { cn } from '@/lib/utils';
import { formatQuantity } from '@/types/spraying';
import type { InsumoFormData } from '@/types/insumo';

type CategoryKey = 'calagem' | 'plantio' | 'cobertura' | 'potassio' | 'micro';

const CATEGORY_TIPO_MAP: Record<CategoryKey, string[]> = {
  calagem: ['Correção de Solo'],
  plantio: ['Plantio'],
  cobertura: ['Cobertura'],
  potassio: ['Cobertura', 'Plantio'],
  micro: ['Correção de Solo', 'Foliar'],
};

interface ProductSelectorProps {
  category: CategoryKey;
  label: string;
  alternatives: (InsumoFormData & { id: string })[];
  selectedIds: string[];
  onToggle: (category: CategoryKey, productId: string) => void;
}

function ProductSelector({ category, label, alternatives, selectedIds, onToggle }: ProductSelectorProps) {
  if (alternatives.length === 0) return null;

  return (
    <div className="border border-dashed border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-primary">
        <ArrowLeftRight className="w-3.5 h-3.5" />
        <span>Trocar {label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {alternatives.map((alt) => {
          const isSelected = selectedIds.includes(alt.id);
          const precoUnit = alt.preco / alt.tamanhoUnidade;
          return (
            <button
              key={alt.id}
              onClick={() => onToggle(category, alt.id)}
              className={cn(
                "text-left text-xs px-3 py-2 rounded-lg border transition-all",
                isSelected 
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30" 
                  : "border-border bg-background hover:border-primary/50"
              )}
            >
              <p className="font-medium truncate max-w-[180px]">{alt.nome}</p>
              <p className="text-muted-foreground">
                {alt.marca} • R$ {precoUnit.toFixed(2)}/{alt.medida === 'kg' ? 'kg' : 'L'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface InsumoRecommendationCardProps {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  insumos: InsumoRecomendado[];
  fallbackInfo?: {
    produto: string;
    quantidadePorHa: number;
    quantidadeTotal: number;
    unidade: string;
    custo: number;
  };
  extraInfo?: React.ReactNode;
  selectorNode?: React.ReactNode;
}

function InsumoRecommendationCard({ 
  title, 
  icon, 
  colorClass, 
  insumos, 
  fallbackInfo,
  extraInfo,
  selectorNode,
}: InsumoRecommendationCardProps) {
  const hasInsumos = insumos.length > 0;
  
  return (
    <Card className="card-elevated overflow-hidden">
      <CardHeader className={cn("py-4", colorClass)}>
        <div className="flex items-center gap-3">
          {icon}
          <CardTitle className="text-lg">{title}</CardTitle>
          {hasInsumos && (
            <span className="ml-auto text-xs bg-background/50 px-2 py-1 rounded-full">
              ✓ Insumo cadastrado
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {selectorNode}
        
        {hasInsumos ? (
          insumos.map((insumo, idx) => (
            <div key={insumo.id || idx} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Produto</span>
                  <p className="font-semibold text-foreground">{insumo.nome}</p>
                  <p className="text-sm text-muted-foreground">{insumo.marca}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Quantidade por Hectare</span>
                  <p className="font-semibold text-foreground">
                    {insumo.quantidadePorHa.toFixed(2)} {insumo.unidade}/ha
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Quantidade Total</span>
                  <p className="font-semibold text-primary">
                    {insumo.quantidadeTotal.toFixed(2)} {insumo.unidade}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Preço Unitário</span>
                  <p className="font-semibold text-foreground">
                    R$ {insumo.precoUnitario.toFixed(2)}/{insumo.unidade}
                  </p>
                </div>
              </div>
              
              {insumo.observacao && (
                <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                  {insumo.observacao}
                </p>
              )}
              
              <div className="bg-secondary/50 rounded-lg p-4 flex items-center justify-between">
                <span className="font-medium">Custo</span>
                <span className="text-lg font-bold text-primary">
                  R$ {insumo.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              {idx < insumos.length - 1 && <hr className="border-border" />}
            </div>
          ))
        ) : fallbackInfo ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Produto (referência)</span>
                <p className="font-semibold text-foreground">{fallbackInfo.produto}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Quantidade por Hectare</span>
                <p className="font-semibold text-foreground">
                  {fallbackInfo.quantidadePorHa.toFixed(2)} {fallbackInfo.unidade}/ha
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Quantidade Total</span>
                <p className="font-semibold text-primary">
                  {fallbackInfo.quantidadeTotal.toFixed(2)} {fallbackInfo.unidade}
                </p>
              </div>
            </div>
            
            <div className="bg-secondary/50 rounded-lg p-4 flex items-center justify-between">
              <span className="font-medium">Custo Estimado</span>
              <span className="text-lg font-bold text-primary">
                R$ {fallbackInfo.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ) : null}
        
        {extraInfo}
      </CardContent>
    </Card>
  );
}

export function WizardResultStep() {
  const { wizardData, setHectares } = useWizard();
  const { insumos: insumosDB } = useInsumos();
  const [hectaresInput, setHectaresInput] = useState(wizardData.hectares?.toString() || '');
  const [faixaProdutiva, setFaixaProdutiva] = useState<ProductivityRange>('media');
  const [recommendation, setRecommendation] = useState<RecommendationEngineResult | null>(null);

  // Track selected product IDs per category
  const [selectedByCategory, setSelectedByCategory] = useState<Record<CategoryKey, string[]>>({
    calagem: [],
    plantio: [],
    cobertura: [],
    potassio: [],
    micro: [],
  });

  // Tipos de insumos usados na pulverização (devem aparecer apenas no mix de calda)
  const TIPOS_PULVERIZACAO = ['Foliar', 'Fungicida', 'Inseticida', 'Herbicida', 'Adjuvantes'];

  // ALL insumos from DB filtered for milho silagem culture (or universal)
  const insumosDisponiveis = useMemo(() => {
    return insumosDB.filter(i => 
      i.status === 'ativo' &&
      !TIPOS_PULVERIZACAO.includes(i.tipoProduto) &&
      (i.culturas.length === 0 || i.culturas.some(c => c.toLowerCase().includes('milho')))
    );
  }, [insumosDB]);

  // Group alternatives by category
  const alternativasPorCategoria = useMemo(() => {
    const map: Record<CategoryKey, (InsumoFormData & { id: string })[]> = {
      calagem: [],
      plantio: [],
      cobertura: [],
      potassio: [],
      micro: [],
    };

    insumosDisponiveis.forEach(insumo => {
      if (insumo.tipoProduto === 'Correção de Solo' && insumo.correcao.prnt > 0) {
        map.calagem.push(insumo);
      }
      if (insumo.tipoProduto === 'Plantio' && (insumo.macronutrientes.p2o5 > 0 || insumo.macronutrientes.n > 0)) {
        map.plantio.push(insumo);
      }
      if (insumo.tipoProduto === 'Cobertura' && (insumo.macronutrientes.n > 0 || insumo.macronutrientes.s > 0)) {
        map.cobertura.push(insumo);
      }
      if ((insumo.tipoProduto === 'Cobertura' || insumo.tipoProduto === 'Plantio') && insumo.macronutrientes.k2o > 30) {
        map.potassio.push(insumo);
      }
      if ((insumo.tipoProduto === 'Correção de Solo' || insumo.tipoProduto === 'Foliar') && 
          (insumo.micronutrientes.b > 0 || insumo.micronutrientes.zn > 0 || insumo.micronutrientes.cu > 0 || 
           insumo.micronutrientes.mn > 0 || insumo.micronutrientes.fe > 0)) {
        map.micro.push(insumo);
      }
    });

    return map;
  }, [insumosDisponiveis]);

  const handleToggleProduct = useCallback((category: CategoryKey, productId: string) => {
    setSelectedByCategory(prev => {
      const current = prev[category];
      const isSelected = current.includes(productId);
      
      // For calagem, only allow single selection
      if (category === 'calagem') {
        return { ...prev, [category]: isSelected ? [] : [productId] };
      }
      
      // For others, toggle
      return {
        ...prev,
        [category]: isSelected
          ? current.filter(id => id !== productId)
          : [...current, productId],
      };
    });
  }, []);

  // Build the insumo list from selections
  const insumosParaCalculo = useMemo(() => {
    const allSelectedIds = new Set<string>();
    Object.values(selectedByCategory).forEach(ids => ids.forEach(id => allSelectedIds.add(id)));
    return insumosDisponiveis.filter(i => allSelectedIds.has(i.id));
  }, [selectedByCategory, insumosDisponiveis]);

  // Auto-select best products on first load (when DB loads)
  const autoSelectBestProducts = useCallback(() => {
    const selections: Record<CategoryKey, string[]> = {
      calagem: [],
      plantio: [],
      cobertura: [],
      potassio: [],
      micro: [],
    };

    // Calagem: best PRNT
    const bestCalagem = alternativasPorCategoria.calagem.sort((a, b) => b.correcao.prnt - a.correcao.prnt)[0];
    if (bestCalagem) selections.calagem = [bestCalagem.id];

    // Plantio: best P2O5 concentration
    const bestPlantio = alternativasPorCategoria.plantio.sort((a, b) => b.macronutrientes.p2o5 - a.macronutrientes.p2o5)[0];
    if (bestPlantio) selections.plantio = [bestPlantio.id];

    // Cobertura: best N source + best S source
    const coberturaByN = [...alternativasPorCategoria.cobertura].sort((a, b) => b.macronutrientes.n - a.macronutrientes.n);
    const coberturaByS = [...alternativasPorCategoria.cobertura].sort((a, b) => b.macronutrientes.s - a.macronutrientes.s);
    const cobIds = new Set<string>();
    if (coberturaByS[0] && coberturaByS[0].macronutrientes.s > 0) cobIds.add(coberturaByS[0].id);
    if (coberturaByN[0]) cobIds.add(coberturaByN[0].id);
    selections.cobertura = Array.from(cobIds);

    // Potássio: best K2O
    const bestK = alternativasPorCategoria.potassio.sort((a, b) => b.macronutrientes.k2o - a.macronutrientes.k2o)[0];
    if (bestK) selections.potassio = [bestK.id];

    // Micro: top 2 by micro score
    const microSorted = [...alternativasPorCategoria.micro].sort((a, b) => {
      const scoreA = a.micronutrientes.b + a.micronutrientes.zn + a.micronutrientes.cu + a.micronutrientes.mn + a.micronutrientes.fe;
      const scoreB = b.micronutrientes.b + b.micronutrientes.zn + b.micronutrientes.cu + b.micronutrientes.mn + b.micronutrientes.fe;
      return scoreB - scoreA;
    });
    selections.micro = microSorted.slice(0, 2).map(m => m.id);

    setSelectedByCategory(selections);
    return selections;
  }, [alternativasPorCategoria]);

  const handleGenerateRecommendation = useCallback(() => {
    const hectares = parseFloat(hectaresInput.replace(',', '.')) || 0;
    if (hectares <= 0 || !wizardData.soil) return;

    setHectares(hectares);

    // Auto-select if nothing selected
    let currentSelections = selectedByCategory;
    const hasAnySelection = Object.values(currentSelections).some(ids => ids.length > 0);
    if (!hasAnySelection) {
      currentSelections = autoSelectBestProducts();
    }

    // Build insumo list from current selections
    const allSelectedIds = new Set<string>();
    Object.values(currentSelections).forEach(ids => ids.forEach(id => allSelectedIds.add(id)));
    const insumosParaUsar = insumosDisponiveis.filter(i => allSelectedIds.has(i.id));

    const result = calcularRecomendacaoComInsumos(
      wizardData.soil,
      wizardData.seed,
      insumosParaUsar,
      hectares,
      faixaProdutiva
    );

    setRecommendation(result);
  }, [hectaresInput, wizardData.soil, wizardData.seed, faixaProdutiva, selectedByCategory, insumosDisponiveis, autoSelectBestProducts, setHectares]);

  // Auto-recalculate when selections change (if recommendation already exists)
  const hasRecommendation = useRef(false);
  useEffect(() => {
    if (hasRecommendation.current) {
      handleGenerateRecommendation();
    }
  }, [selectedByCategory]);

  // Track when first recommendation is generated
  useEffect(() => {
    if (recommendation) hasRecommendation.current = true;
  }, [recommendation]);

  const isFormComplete = wizardData.soil !== null && wizardData.seed !== null;

  if (!isFormComplete) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Resultado</h2>
          <p className="text-muted-foreground">Recomendação consolidada baseada nos dados informados</p>
        </div>

        <Alert className="border-warning bg-warning/5">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertTitle>Dados incompletos</AlertTitle>
          <AlertDescription>
            Complete os passos anteriores (Solo e Sementes) para gerar a recomendação.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Resultado</h2>
        <p className="text-muted-foreground">Recomendação consolidada baseada nos dados informados</p>
      </div>

      {/* Resumo dos Dados Coletados */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Beaker className="w-4 h-4 text-primary" />
              Solo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">V%</span>
                <span className={cn(
                  "font-medium",
                  (wizardData.soil?.vPercent || 0) >= 60 ? "text-success" : "text-warning"
                )}>
                  {wizardData.soil?.vPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">P</span>
                <span className="font-medium">{wizardData.soil?.p} mg/dm³</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">K</span>
                <span className="font-medium">{wizardData.soil?.k} mg/dm³</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Leaf className="w-4 h-4 text-primary" />
              Semente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{wizardData.seed?.seed?.name || 'Não selecionada'}</p>
              <p className="text-muted-foreground">{wizardData.seed?.seed?.company}</p>
              <p className="text-primary font-medium">
                {wizardData.seed?.populationPerHectare?.toLocaleString('pt-BR')} plantas/ha
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Insumos Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{insumosDisponiveis.length} insumo(s) no catálogo</p>
              <p className="text-muted-foreground">
                {Object.values(selectedByCategory).reduce((sum, ids) => sum + ids.length, 0)} selecionado(s)
              </p>
            </div>
          </CardContent>
        </Card>

        {wizardData.costs && (
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Custos de Produção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-primary">
                  R$ {wizardData.costs.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-muted-foreground">
                  Trator: R$ {((wizardData.costs.operations.reduce((acc, op) => acc + op.hoursPerHa, 0)) * 
                    (wizardData.costs.tractorType === 'proprio' ? wizardData.costs.costPerHourOwn : wizardData.costs.costPerHourRent) * 
                    (wizardData.hectares || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {wizardData.spraying && wizardData.spraying.products.length > 0 && (
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <SprayCan className="w-4 h-4 text-primary" />
                Pulverização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-primary">
                  {wizardData.spraying.products.length} produto(s) no mix
                </p>
                <p className="text-muted-foreground">
                  {wizardData.spraying.equipment.type === 'drone' ? 'Drone' : 'Trator'} - {wizardData.spraying.equipment.applicationRate} L/ha
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Configuração da Recomendação */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Gerar Recomendação
          </CardTitle>
          <CardDescription>
            O sistema buscará automaticamente os melhores insumos do catálogo para cada categoria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seletor de Faixa Produtiva */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <Label className="text-base font-semibold">Faixa Produtiva (Matéria Natural)</Label>
            </div>
            <Select value={faixaProdutiva} onValueChange={(value: ProductivityRange) => setFaixaProdutiva(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a faixa produtiva" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRODUCTIVITY_LEVELS).map(([key, level]) => (
                  <SelectItem key={key} value={key}>
                    <span className="font-medium">{level.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Info da faixa selecionada */}
            <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Extração estimada para {PRODUCTIVITY_LEVELS[faixaProdutiva].label}:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-background/50 rounded p-2">
                  <span className="text-muted-foreground">N:</span>
                  <span className="ml-1 font-medium">{PRODUCTIVITY_LEVELS[faixaProdutiva].n.min}-{PRODUCTIVITY_LEVELS[faixaProdutiva].n.max} kg/ha</span>
                </div>
                <div className="bg-background/50 rounded p-2">
                  <span className="text-muted-foreground">P₂O₅:</span>
                  <span className="ml-1 font-medium">{PRODUCTIVITY_LEVELS[faixaProdutiva].p2o5.min}-{PRODUCTIVITY_LEVELS[faixaProdutiva].p2o5.max} kg/ha</span>
                </div>
                <div className="bg-background/50 rounded p-2">
                  <span className="text-muted-foreground">K₂O:</span>
                  <span className="ml-1 font-medium">{PRODUCTIVITY_LEVELS[faixaProdutiva].k2o.min}-{PRODUCTIVITY_LEVELS[faixaProdutiva].k2o.max} kg/ha</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Área e botão */}
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="hectares">Área Total (hectares)</Label>
              <Input
                id="hectares"
                type="text"
                inputMode="decimal"
                placeholder="Ex: 100"
                value={hectaresInput}
                onChange={(e) => {
                  const value = e.target.value.replace(',', '.');
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setHectaresInput(value);
                  }
                }}
                className="input-agro"
              />
            </div>
            <Button
              onClick={handleGenerateRecommendation}
              disabled={!hectaresInput || parseFloat(hectaresInput) <= 0}
              className="sm:w-auto w-full"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Gerar Recomendação
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultado da Recomendação */}
      {recommendation && (
        <div className="space-y-6 animate-fade-in">
          {/* Banner informativo */}
          <Alert className="border-primary/30 bg-primary/5">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            <AlertTitle>Seleção automática de insumos</AlertTitle>
            <AlertDescription>
              Os melhores produtos do catálogo foram selecionados automaticamente. Clique nos produtos abaixo para trocar por alternativas da mesma categoria.
            </AlertDescription>
          </Alert>

          {/* Calagem */}
          <Card className={cn(
            "card-elevated overflow-hidden",
            recommendation.calagem.necessaria ? "border-warning" : "border-success"
          )}>
            <CardHeader className={cn(
              "py-4",
              recommendation.calagem.necessaria ? "bg-warning/10" : "bg-success/10"
            )}>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5" />
                Calagem
                {recommendation.calagem.necessaria ? (
                  <AlertTriangle className="w-4 h-4 text-warning" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                )}
                {recommendation.calagem.insumoSelecionado && (
                  <span className="ml-auto text-xs bg-background/50 px-2 py-1 rounded-full">
                    ✓ Insumo cadastrado
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {recommendation.calagem.necessaria && alternativasPorCategoria.calagem.length > 0 && (
                <ProductSelector
                  category="calagem"
                  label="Corretivo"
                  alternatives={alternativasPorCategoria.calagem}
                  selectedIds={selectedByCategory.calagem}
                  onToggle={(cat, id) => { handleToggleProduct(cat, id); }}
                />
              )}
              
              {recommendation.calagem.necessaria ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground uppercase">Produto</span>
                      <p className="font-semibold">{recommendation.calagem.produto}</p>
                      <p className="text-sm text-muted-foreground">PRNT: {recommendation.calagem.prnt}%</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground uppercase">Necessidade por Hectare</span>
                      <p className="font-semibold">{recommendation.calagem.ncPorHa.toFixed(2)} t/ha</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground uppercase">Quantidade Total</span>
                      <p className="font-semibold text-primary">{recommendation.calagem.quantidadeTotal.toFixed(2)} t</p>
                    </div>
                  </div>
                  
                  <div className="bg-secondary/50 rounded-lg p-4 flex items-center justify-between">
                    <span className="font-medium">Custo Estimado</span>
                    <span className="text-lg font-bold text-primary">
                      R$ {recommendation.calagem.custoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-success font-medium">Não é necessária calagem. Solo com V% adequado.</p>
              )}
            </CardContent>
          </Card>

          {/* Adubação de Plantio */}
          <InsumoRecommendationCard
            title="Adubação de Plantio"
            icon={<Leaf className="w-5 h-5" />}
            colorClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            insumos={recommendation.adubacaoPlantio.insumosSelecionados}
            selectorNode={
              alternativasPorCategoria.plantio.length > 0 ? (
                <ProductSelector
                  category="plantio"
                  label="Adubo de Plantio"
                  alternatives={alternativasPorCategoria.plantio}
                  selectedIds={selectedByCategory.plantio}
                  onToggle={handleToggleProduct}
                />
              ) : undefined
            }
            fallbackInfo={{
              produto: `Formulado NPK ${recommendation.adubacaoPlantio.formulaSugerida}`,
              quantidadePorHa: recommendation.adubacaoPlantio.quantidadePorHa,
              quantidadeTotal: recommendation.adubacaoPlantio.quantidadeTotal,
              unidade: 'kg',
              custo: recommendation.adubacaoPlantio.custoEstimado,
            }}
            extraInfo={
              <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                P₂O₅: {recommendation.adubacaoPlantio.p2o5Necessario.toFixed(0)} kg/ha | 
                K₂O: {recommendation.adubacaoPlantio.k2oNecessario.toFixed(0)} kg/ha | 
                N: {recommendation.adubacaoPlantio.nNecessario.toFixed(0)} kg/ha
              </div>
            }
          />

          {/* Cobertura */}
          <InsumoRecommendationCard
            title="Cobertura (Nitrogênio)"
            icon={<Droplets className="w-5 h-5" />}
            colorClass="bg-blue-500/10 text-blue-700 dark:text-blue-400"
            insumos={recommendation.cobertura.insumosSelecionados}
            selectorNode={
              alternativasPorCategoria.cobertura.length > 0 ? (
                <ProductSelector
                  category="cobertura"
                  label="Adubo de Cobertura"
                  alternatives={alternativasPorCategoria.cobertura}
                  selectedIds={selectedByCategory.cobertura}
                  onToggle={handleToggleProduct}
                />
              ) : undefined
            }
            fallbackInfo={{
              produto: 'Ureia (45% N)',
              quantidadePorHa: recommendation.cobertura.quantidadePorHa,
              quantidadeTotal: recommendation.cobertura.quantidadeTotal,
              unidade: 'kg',
              custo: recommendation.cobertura.custoEstimado,
            }}
            extraInfo={
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                  N total: {recommendation.cobertura.nNecessario.toFixed(0)} kg/ha | 
                  N plantio: {recommendation.cobertura.nFornecidoPlantio.toFixed(0)} kg/ha | 
                  N cobertura: {recommendation.cobertura.nCobertura.toFixed(0)} kg/ha
                </div>
                <div className={cn(
                  "text-xs p-3 rounded-lg",
                  recommendation.cobertura.sFornecido >= recommendation.cobertura.sNecessario * 0.8 
                    ? "bg-success/10 text-success" 
                    : "bg-warning/10 text-warning"
                )}>
                  S necessário: {recommendation.cobertura.sNecessario.toFixed(1)} kg/ha | 
                  S fornecido: {recommendation.cobertura.sFornecido.toFixed(1)} kg/ha
                  {recommendation.cobertura.sFornecido < recommendation.cobertura.sNecessario * 0.8 && 
                    " ⚠️ Adicione fonte de enxofre (ex: Sulfato de Amônia)"}
                </div>
              </div>
            }
          />

          {/* Correção de Potássio */}
          {recommendation.correcaoPotassio.k2oCorrecao > 0 && (
            <InsumoRecommendationCard
              title="Correção de Potássio"
              icon={<FlaskConical className="w-5 h-5" />}
              colorClass="bg-purple-500/10 text-purple-700 dark:text-purple-400"
              insumos={recommendation.correcaoPotassio.insumosSelecionados}
              selectorNode={
                alternativasPorCategoria.potassio.length > 0 ? (
                  <ProductSelector
                    category="potassio"
                    label="Fonte de Potássio"
                    alternatives={alternativasPorCategoria.potassio}
                    selectedIds={selectedByCategory.potassio}
                    onToggle={handleToggleProduct}
                  />
                ) : undefined
              }
              fallbackInfo={{
                produto: 'Cloreto de Potássio (KCl 60%)',
                quantidadePorHa: recommendation.correcaoPotassio.quantidadePorHa,
                quantidadeTotal: recommendation.correcaoPotassio.quantidadeTotal,
                unidade: 'kg',
                custo: recommendation.correcaoPotassio.custoEstimado,
              }}
              extraInfo={
                <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                  K₂O total: {recommendation.correcaoPotassio.k2oNecessario.toFixed(0)} kg/ha | 
                  K₂O plantio: {recommendation.correcaoPotassio.k2oFornecidoPlantio.toFixed(0)} kg/ha | 
                  K₂O correção: {recommendation.correcaoPotassio.k2oCorrecao.toFixed(0)} kg/ha
                </div>
              }
            />
          )}

          {/* Micronutrientes */}
          {(recommendation.micronutrientes.insumosSelecionados.length > 0 || alternativasPorCategoria.micro.length > 0) && (
            <Card className="card-elevated">
              <CardHeader className="py-4 bg-teal-500/10">
                <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
                  <Beaker className="w-5 h-5" />
                  Micronutrientes
                  {recommendation.micronutrientes.insumosSelecionados.length > 0 && (
                    <span className="ml-auto text-xs bg-background/50 px-2 py-1 rounded-full">
                      ✓ Insumo cadastrado
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {alternativasPorCategoria.micro.length > 0 && (
                  <ProductSelector
                    category="micro"
                    label="Fonte de Micronutrientes"
                    alternatives={alternativasPorCategoria.micro}
                    selectedIds={selectedByCategory.micro}
                    onToggle={handleToggleProduct}
                  />
                )}
                
                {recommendation.micronutrientes.insumosSelecionados.length > 0 && (
                  <div className="space-y-4">
                    {/* Resumo de atendimento */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-secondary/50 rounded p-2">
                        <span className="text-muted-foreground">B:</span>
                        <span className={cn("ml-1 font-medium", recommendation.micronutrientes.bFornecido >= recommendation.micronutrientes.bNecessario * 0.8 ? "text-success" : "text-warning")}>
                          {(recommendation.micronutrientes.bFornecido * 1000).toFixed(0)}g / {(recommendation.micronutrientes.bNecessario * 1000).toFixed(0)}g
                        </span>
                      </div>
                      <div className="bg-secondary/50 rounded p-2">
                        <span className="text-muted-foreground">Zn:</span>
                        <span className={cn("ml-1 font-medium", recommendation.micronutrientes.znFornecido >= recommendation.micronutrientes.znNecessario * 0.8 ? "text-success" : "text-warning")}>
                          {(recommendation.micronutrientes.znFornecido * 1000).toFixed(0)}g / {(recommendation.micronutrientes.znNecessario * 1000).toFixed(0)}g
                        </span>
                      </div>
                      <div className="bg-secondary/50 rounded p-2">
                        <span className="text-muted-foreground">Cu:</span>
                        <span className={cn("ml-1 font-medium", recommendation.micronutrientes.cuFornecido >= recommendation.micronutrientes.cuNecessario * 0.8 ? "text-success" : "text-warning")}>
                          {(recommendation.micronutrientes.cuFornecido * 1000).toFixed(0)}g / {(recommendation.micronutrientes.cuNecessario * 1000).toFixed(0)}g
                        </span>
                      </div>
                      <div className="bg-secondary/50 rounded p-2">
                        <span className="text-muted-foreground">Mn:</span>
                        <span className={cn("ml-1 font-medium", recommendation.micronutrientes.mnFornecido >= recommendation.micronutrientes.mnNecessario * 0.8 ? "text-success" : "text-warning")}>
                          {(recommendation.micronutrientes.mnFornecido * 1000).toFixed(0)}g / {(recommendation.micronutrientes.mnNecessario * 1000).toFixed(0)}g
                        </span>
                      </div>
                      <div className="bg-secondary/50 rounded p-2">
                        <span className="text-muted-foreground">Fe:</span>
                        <span className={cn("ml-1 font-medium", recommendation.micronutrientes.feFornecido >= recommendation.micronutrientes.feNecessario * 0.8 ? "text-success" : "text-warning")}>
                          {(recommendation.micronutrientes.feFornecido * 1000).toFixed(0)}g / {(recommendation.micronutrientes.feNecessario * 1000).toFixed(0)}g
                        </span>
                      </div>
                    </div>
                    
                    {/* Lista de insumos */}
                    <div className="space-y-3">
                      {recommendation.micronutrientes.insumosSelecionados.map((micro) => (
                        <div key={micro.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                          <div>
                            <p className="font-medium">{micro.nome}</p>
                            <p className="text-sm text-muted-foreground">{micro.quantidadePorHa.toFixed(2)} {micro.unidade}/ha</p>
                            <p className="text-xs text-muted-foreground">{micro.observacao}</p>
                          </div>
                          <p className="font-medium text-primary">
                            R$ {micro.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Outros Insumos (Defensivos) */}
          {recommendation.outrosInsumos.length > 0 && (
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Defensivos e Adjuvantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendation.outrosInsumos.map((insumo) => (
                    <div key={insumo.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="font-medium">{insumo.nome}</p>
                        <p className="text-sm text-muted-foreground">{insumo.tipoProduto}</p>
                      </div>
                      <p className="font-medium text-primary">
                        R$ {insumo.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


          {/* Observações */}
          {recommendation.observacoes.length > 0 && (
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recommendation.observacoes.map((obs, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary">•</span>
                      <span className="text-muted-foreground">{obs}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Custos de Produção */}
          {wizardData.costs && wizardData.costs.totalCost > 0 && (
            <Card className="card-elevated overflow-hidden">
              <CardHeader className="py-4 bg-amber-500/10">
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Tractor className="w-5 h-5" />
                  Custos de Produção
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Detalhamento por categoria */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <Tractor className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Operações Tratorizadas</p>
                    <p className="font-semibold text-foreground">
                      R$ {((wizardData.costs.operations.reduce((acc, op) => acc + op.hoursPerHa, 0)) * 
                        (wizardData.costs.tractorType === 'proprio' ? wizardData.costs.costPerHourOwn : wizardData.costs.costPerHourRent) * 
                        (parseFloat(hectaresInput) || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <Droplets className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Irrigação</p>
                    <p className="font-semibold text-foreground">
                      R$ {(wizardData.costs.irrigationCostPerHa * (parseFloat(hectaresInput) || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <Square className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Lona</p>
                    <p className="font-semibold text-foreground">
                      R$ {(wizardData.costs.tarpaulinCostPerM2 * wizardData.costs.tarpaulinM2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-secondary/30 rounded-lg">
                    <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Mão de Obra</p>
                    <p className="font-semibold text-foreground">
                      R$ {wizardData.costs.labor.reduce((acc, l) => acc + l.quantity * l.unitCost, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Total dos custos operacionais */}
                <div className="bg-amber-500/10 rounded-lg p-4 flex items-center justify-between">
                  <span className="font-medium text-amber-700 dark:text-amber-400">Total Custos Operacionais</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    R$ {(() => {
                      const hectares = parseFloat(hectaresInput) || 1;
                      const tractorHours = wizardData.costs!.operations.reduce((acc, op) => acc + op.hoursPerHa, 0);
                      const tractorCostPerHour = wizardData.costs!.tractorType === 'proprio' 
                        ? wizardData.costs!.costPerHourOwn 
                        : wizardData.costs!.costPerHourRent;
                      const tractorTotal = tractorHours * tractorCostPerHour * hectares;
                      const irrigationTotal = wizardData.costs!.irrigationCostPerHa * hectares;
                      const tarpaulinTotal = wizardData.costs!.tarpaulinCostPerM2 * wizardData.costs!.tarpaulinM2;
                      const laborTotal = wizardData.costs!.labor.reduce((acc, l) => acc + l.quantity * l.unitCost, 0);
                      return (tractorTotal + irrigationTotal + tarpaulinTotal + laborTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    })()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custos de Pulverização */}
          {wizardData.spraying && wizardData.spraying.products.length > 0 && (
            <Card className="card-elevated overflow-hidden">
              <CardHeader className="py-4 bg-cyan-500/10">
                <CardTitle className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                  <SprayCan className="w-5 h-5" />
                  Pulverização - Mix de Calda
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                  <span>
                    Equipamento: <strong className="text-foreground">{wizardData.spraying.equipment.type === 'drone' ? 'Drone' : 'Trator'}</strong>
                  </span>
                  <span>|</span>
                  <span>
                    Taxa: <strong className="text-foreground">{wizardData.spraying.equipment.applicationRate} L/ha</strong>
                  </span>
                  <span>|</span>
                  <span>
                    Tanque: <strong className="text-foreground">{wizardData.spraying.equipment.tankCapacity} L</strong>
                  </span>
                </div>

                <div className="space-y-3">
                  {wizardData.spraying.products.map((product) => {
                    const insumo = insumosDB.find(i => i.id === product.insumoId);
                    const precoUnitario = insumo?.preco || 0;
                    const custoTotal = product.totalQuantity * precoUnitario;
                    
                    return (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.type} • {product.doseInput} {product.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatQuantity(product.quantityPerTank, product.unit)}/tanque • {formatQuantity(product.totalQuantity, product.unit)} total
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-primary">
                            R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {precoUnitario > 0 && (
                            <p className="text-xs text-muted-foreground">
                              R$ {precoUnitario.toFixed(2)}/un
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-cyan-500/10 rounded-lg p-4 flex items-center justify-between">
                  <span className="font-medium text-cyan-700 dark:text-cyan-400">Total Pulverização</span>
                  <span className="text-lg font-bold text-cyan-700 dark:text-cyan-400">
                    R$ {(() => {
                      return wizardData.spraying!.products.reduce((acc, product) => {
                        const insumo = insumosDB.find(i => i.id === product.insumoId);
                        const precoUnitario = insumo?.preco || 0;
                        return acc + (product.totalQuantity * precoUnitario);
                      }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    })()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custo Total Consolidado */}
          <Card className="card-elevated border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Resumo de custos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-primary" />
                      <span className="font-medium">Custo com Insumos</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      R$ {recommendation.custoTotalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      R$ {recommendation.custoPorHa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ha
                    </p>
                  </div>

                  {wizardData.costs && wizardData.costs.totalCost > 0 && (
                    <div className="p-4 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Tractor className="w-5 h-5 text-amber-600" />
                        <span className="font-medium">Custo Operacional</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        R$ {(() => {
                          const hectares = parseFloat(hectaresInput) || 1;
                          const tractorHours = wizardData.costs!.operations.reduce((acc, op) => acc + op.hoursPerHa, 0);
                          const tractorCostPerHour = wizardData.costs!.tractorType === 'proprio' 
                            ? wizardData.costs!.costPerHourOwn 
                            : wizardData.costs!.costPerHourRent;
                          const tractorTotal = tractorHours * tractorCostPerHour * hectares;
                          const irrigationTotal = wizardData.costs!.irrigationCostPerHa * hectares;
                          const tarpaulinTotal = wizardData.costs!.tarpaulinCostPerM2 * wizardData.costs!.tarpaulinM2;
                          const laborTotal = wizardData.costs!.labor.reduce((acc, l) => acc + l.quantity * l.unitCost, 0);
                          return (tractorTotal + irrigationTotal + tarpaulinTotal + laborTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        })()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        R$ {(() => {
                          const hectares = parseFloat(hectaresInput) || 1;
                          const tractorHours = wizardData.costs!.operations.reduce((acc, op) => acc + op.hoursPerHa, 0);
                          const tractorCostPerHour = wizardData.costs!.tractorType === 'proprio' 
                            ? wizardData.costs!.costPerHourOwn 
                            : wizardData.costs!.costPerHourRent;
                          const tractorTotal = tractorHours * tractorCostPerHour * hectares;
                          const irrigationTotal = wizardData.costs!.irrigationCostPerHa * hectares;
                          const tarpaulinTotal = wizardData.costs!.tarpaulinCostPerM2 * wizardData.costs!.tarpaulinM2;
                          const laborTotal = wizardData.costs!.labor.reduce((acc, l) => acc + l.quantity * l.unitCost, 0);
                          return ((tractorTotal + irrigationTotal + tarpaulinTotal + laborTotal) / hectares).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        })()}/ha
                      </p>
                    </div>
                  )}

                  {wizardData.spraying && wizardData.spraying.products.length > 0 && (
                    <div className="p-4 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <SprayCan className="w-5 h-5 text-cyan-600" />
                        <span className="font-medium">Custo Pulverização</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        R$ {(() => {
                          return wizardData.spraying!.products.reduce((acc, product) => {
                            const insumo = insumosDB.find(i => i.id === product.insumoId);
                            const precoUnitario = insumo?.preco || 0;
                            return acc + (product.totalQuantity * precoUnitario);
                          }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        })()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        R$ {(() => {
                          const hectares = parseFloat(hectaresInput) || 1;
                          const total = wizardData.spraying!.products.reduce((acc, product) => {
                            const insumo = insumosDB.find(i => i.id === product.insumoId);
                            const precoUnitario = insumo?.preco || 0;
                            return acc + (product.totalQuantity * precoUnitario);
                          }, 0);
                          return (total / hectares).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        })()}/ha
                      </p>
                    </div>
                  )}
                </div>

                {/* Total Geral */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-primary/10">
                      <DollarSign className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Investimento Total</h3>
                      <p className="text-sm text-muted-foreground">
                        Para {hectaresInput} hectares
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">
                      R$ {(() => {
                        let total = recommendation.custoTotalGeral;
                        const hectares = parseFloat(hectaresInput) || 1;
                        
                        if (wizardData.costs) {
                          const tractorHours = wizardData.costs.operations.reduce((acc, op) => acc + op.hoursPerHa, 0);
                          const tractorCostPerHour = wizardData.costs.tractorType === 'proprio' 
                            ? wizardData.costs.costPerHourOwn 
                            : wizardData.costs.costPerHourRent;
                          const tractorTotal = tractorHours * tractorCostPerHour * hectares;
                          const irrigationTotal = wizardData.costs.irrigationCostPerHa * hectares;
                          const tarpaulinTotal = wizardData.costs.tarpaulinCostPerM2 * wizardData.costs.tarpaulinM2;
                          const laborTotal = wizardData.costs.labor.reduce((acc, l) => acc + l.quantity * l.unitCost, 0);
                          total += tractorTotal + irrigationTotal + tarpaulinTotal + laborTotal;
                        }
                        
                        if (wizardData.spraying && wizardData.spraying.products.length > 0) {
                          const sprayingTotal = wizardData.spraying.products.reduce((acc, product) => {
                            const insumo = insumosDB.find(i => i.id === product.insumoId);
                            const precoUnitario = insumo?.preco || 0;
                            return acc + (product.totalQuantity * precoUnitario);
                          }, 0);
                          total += sprayingTotal;
                        }
                        
                        return total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                      })()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      R$ {(() => {
                        const hectares = parseFloat(hectaresInput) || 1;
                        let total = recommendation.custoTotalGeral;
                        
                        if (wizardData.costs) {
                          const tractorHours = wizardData.costs.operations.reduce((acc, op) => acc + op.hoursPerHa, 0);
                          const tractorCostPerHour = wizardData.costs.tractorType === 'proprio' 
                            ? wizardData.costs.costPerHourOwn 
                            : wizardData.costs.costPerHourRent;
                          const tractorTotal = tractorHours * tractorCostPerHour * hectares;
                          const irrigationTotal = wizardData.costs.irrigationCostPerHa * hectares;
                          const tarpaulinTotal = wizardData.costs.tarpaulinCostPerM2 * wizardData.costs.tarpaulinM2;
                          const laborTotal = wizardData.costs.labor.reduce((acc, l) => acc + l.quantity * l.unitCost, 0);
                          total += tractorTotal + irrigationTotal + tarpaulinTotal + laborTotal;
                        }
                        
                        if (wizardData.spraying && wizardData.spraying.products.length > 0) {
                          const sprayingTotal = wizardData.spraying.products.reduce((acc, product) => {
                            const insumo = insumosDB.find(i => i.id === product.insumoId);
                            const precoUnitario = insumo?.preco || 0;
                            return acc + (product.totalQuantity * precoUnitario);
                          }, 0);
                          total += sprayingTotal;
                        }
                        
                        return (total / hectares).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                      })()}/ha
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
