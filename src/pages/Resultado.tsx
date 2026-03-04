import { useState } from 'react';
import { FileText, Calculator, Leaf, FlaskConical, Beaker, DollarSign, Calendar, Info, AlertTriangle, TrendingUp, Package, Loader2 } from 'lucide-react';
import { useFarmData } from '@/hooks/useFarmData';
import { useInsumos } from '@/hooks/useInsumos';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileResultado } from '@/components/resultado/MobileResultado';
import { ProductivityRange, PRODUCTIVITY_LEVELS } from '@/types/recommendation';
import { 
  calcularRecomendacaoComInsumos, 
  RecommendationEngineResult, 
  InsumoRecomendado 
} from '@/hooks/useRecommendationEngine';
import { cn } from '@/lib/utils';

interface InsumoCardProps {
  insumo: InsumoRecomendado;
}

function InsumoCard({ insumo }: InsumoCardProps) {
  return (
    <div className="p-3 bg-background/50 rounded-lg border border-border/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{insumo.nome}</p>
          <p className="text-xs text-muted-foreground">{insumo.marca} • {insumo.tipoProduto}</p>
        </div>
        <span className="text-sm font-bold text-primary whitespace-nowrap">
          R$ {insumo.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
        <div>
          <span className="text-muted-foreground">Dose/ha:</span>
          <span className="ml-1 font-medium">{insumo.quantidadePorHa.toFixed(1)} {insumo.unidade}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total:</span>
          <span className="ml-1 font-medium">{insumo.quantidadeTotal.toFixed(1)} {insumo.unidade}</span>
        </div>
      </div>
      {insumo.observacao && (
        <p className="text-xs text-muted-foreground mt-1.5 italic">{insumo.observacao}</p>
      )}
    </div>
  );
}

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  custoEstimado: number;
  children: React.ReactNode;
}

function SectionCard({ title, icon, colorClass, custoEstimado, children }: SectionCardProps) {
  return (
    <Card className="card-elevated overflow-hidden">
      <CardHeader className={cn("py-4", colorClass)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <span className="text-sm font-bold">
            R$ {custoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {children}
      </CardContent>
    </Card>
  );
}

export default function Resultado() {
  const { selectedFarm, getSelectedFarmSoilAnalyses } = useFarmData();
  const { insumos, loading: insumosLoading } = useInsumos();
  const [hectares, setHectares] = useState('');
  const [faixaProdutiva, setFaixaProdutiva] = useState<ProductivityRange>('media');
  const [recommendation, setRecommendation] = useState<RecommendationEngineResult | null>(null);

  const analyses = getSelectedFarmSoilAnalyses();
  const latestAnalysis = analyses.length > 0 ? analyses[analyses.length - 1] : null;

  // Filter only nutrition-related insumos (exclude spraying products)
  const insumosNutricao = insumos.filter(i => 
    !['Fungicida', 'Inseticida', 'Herbicida', 'Adjuvantes'].includes(i.tipoProduto)
  );

  const handleGenerateRecommendation = () => {
    if (!latestAnalysis || !hectares) return;

    const ha = parseFloat(hectares.replace(',', '.')) || 0;
    if (ha <= 0) return;

    const soilData = {
      vPercent: latestAnalysis.vPercent,
      ca: latestAnalysis.ca,
      mg: latestAnalysis.mg,
      k: latestAnalysis.k,
      p: latestAnalysis.p,
      hAl: latestAnalysis.hAl,
      mo: latestAnalysis.mo,
      zn: 0,
      b: 0,
      mn: 0,
      fe: 0,
      cu: 0,
      s: 0,
    };

    const result = calcularRecomendacaoComInsumos(
      soilData,
      null,
      insumosNutricao,
      ha,
      faixaProdutiva
    );

    setRecommendation(result);
  };

  // Desktop version - early returns
  if (!selectedFarm) {
    return (
      <>
        <div className="md:hidden">
          <MobileResultado />
        </div>
        <div className="hidden md:flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Selecione uma fazenda para visualizar as recomendações.
          </p>
        </div>
      </>
    );
  }

  if (!latestAnalysis) {
    return (
      <>
        <div className="md:hidden">
          <MobileResultado />
        </div>
        <div className="hidden md:block space-y-6 animate-fade-in">
          <PageHeader 
            title="Recomendações"
            description="Gere recomendações personalizadas baseadas na análise de solo"
          />
          <Alert className="border-warning bg-warning/5">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <AlertTitle>Nenhuma análise de solo encontrada</AlertTitle>
            <AlertDescription>
              Para gerar recomendações, primeiro realize uma análise de solo na aba "Análise de Solo".
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <MobileResultado />
      </div>
      
      <div className="hidden md:block space-y-6 animate-fade-in">
        <PageHeader 
          title="Recomendações"
          description="Gere recomendações personalizadas baseadas na análise de solo e nos insumos cadastrados"
        />

        {/* Resumo da última análise */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="w-5 h-5 text-primary" />
              Última Análise de Solo
            </CardTitle>
            <CardDescription>
              Dados utilizados para calcular as recomendações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="text-center p-3 bg-secondary/30 rounded-lg">
                <span className="text-xs text-muted-foreground">V%</span>
                <p className={cn(
                  "text-lg font-bold",
                  latestAnalysis.vPercent >= 60 ? "text-success" : "text-warning"
                )}>
                  {latestAnalysis.vPercent.toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-3 bg-secondary/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Ca</span>
                <p className="text-lg font-bold text-foreground">{latestAnalysis.ca}</p>
              </div>
              <div className="text-center p-3 bg-secondary/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Mg</span>
                <p className="text-lg font-bold text-foreground">{latestAnalysis.mg}</p>
              </div>
              <div className="text-center p-3 bg-secondary/30 rounded-lg">
                <span className="text-xs text-muted-foreground">K</span>
                <p className="text-lg font-bold text-foreground">{latestAnalysis.k}</p>
              </div>
              <div className="text-center p-3 bg-secondary/30 rounded-lg">
                <span className="text-xs text-muted-foreground">P</span>
                <p className="text-lg font-bold text-foreground">{latestAnalysis.p}</p>
              </div>
              <div className="text-center p-3 bg-secondary/30 rounded-lg">
                <span className="text-xs text-muted-foreground">MO</span>
                <p className="text-lg font-bold text-foreground">{latestAnalysis.mo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insumos disponíveis info */}
        <Alert className={cn(
          "border",
          insumosNutricao.length > 0 
            ? "border-primary/30 bg-primary/5" 
            : "border-warning bg-warning/5"
        )}>
          <Package className="h-5 w-5" />
          <AlertTitle>
            {insumosLoading 
              ? 'Carregando insumos...' 
              : `${insumosNutricao.length} insumo(s) de nutrição cadastrados`
            }
          </AlertTitle>
          <AlertDescription>
            {insumosNutricao.length > 0 
              ? 'A recomendação utilizará os produtos cadastrados no seu catálogo de insumos, com preços e composições reais.'
              : 'Cadastre insumos na aba "Insumos" para que a recomendação utilize seus produtos reais com preços atualizados. Sem insumos cadastrados, serão usados valores de referência.'
            }
          </AlertDescription>
        </Alert>

        {/* Gerar Recomendação */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Gerar Recomendação
            </CardTitle>
            <CardDescription>
              Configure os parâmetros para gerar recomendações personalizadas
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
                      <div className="flex flex-col">
                        <span className="font-medium">{level.label}</span>
                      </div>
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
                  <div className="bg-background/50 rounded p-2">
                    <span className="text-muted-foreground">Ca:</span>
                    <span className="ml-1 font-medium">{PRODUCTIVITY_LEVELS[faixaProdutiva].ca.min}-{PRODUCTIVITY_LEVELS[faixaProdutiva].ca.max} kg/ha</span>
                  </div>
                  <div className="bg-background/50 rounded p-2">
                    <span className="text-muted-foreground">Mg:</span>
                    <span className="ml-1 font-medium">{PRODUCTIVITY_LEVELS[faixaProdutiva].mg.min}-{PRODUCTIVITY_LEVELS[faixaProdutiva].mg.max} kg/ha</span>
                  </div>
                  <div className="bg-background/50 rounded p-2">
                    <span className="text-muted-foreground">S:</span>
                    <span className="ml-1 font-medium">{PRODUCTIVITY_LEVELS[faixaProdutiva].s.min}-{PRODUCTIVITY_LEVELS[faixaProdutiva].s.max} kg/ha</span>
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
                  value={hectares}
                  onChange={(e) => {
                    const value = e.target.value.replace(',', '.');
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setHectares(value);
                    }
                  }}
                  className="input-agro"
                />
              </div>
              <Button 
                onClick={handleGenerateRecommendation}
                disabled={!hectares || parseFloat(hectares) <= 0 || insumosLoading}
                className="sm:w-auto w-full"
              >
                {insumosLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Calculator className="w-4 h-4 mr-2" />
                )}
                Gerar Recomendação
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Recomendação */}
        {recommendation && (
          <div className="space-y-6 animate-fade-in">
            {/* Observações */}
            {recommendation.observacoes.length > 0 && (
              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-5 w-5 text-primary" />
                <AlertTitle>Observações da Recomendação</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1">
                    {recommendation.observacoes.map((obs, i) => (
                      <li key={i} className="text-sm">{obs}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Calagem */}
              <SectionCard
                title="Calagem"
                icon={<FlaskConical className="w-5 h-5" />}
                colorClass="bg-amber-500/10 text-amber-700 dark:text-amber-400"
                custoEstimado={recommendation.calagem.custoEstimado}
              >
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">NC (t/ha)</span>
                    <p className="font-semibold">{recommendation.calagem.ncPorHa.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Total</span>
                    <p className="font-semibold">{recommendation.calagem.quantidadeTotal.toFixed(1)} t</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Produto</span>
                    <p className="font-semibold">{recommendation.calagem.produto}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">PRNT</span>
                    <p className="font-semibold">{recommendation.calagem.prnt}%</p>
                  </div>
                </div>
                {recommendation.calagem.insumoSelecionado && (
                  <InsumoCard insumo={recommendation.calagem.insumoSelecionado} />
                )}
                {!recommendation.calagem.necessaria && (
                  <p className="text-sm text-success">✓ V% adequado, calagem não necessária.</p>
                )}
              </SectionCard>

              {/* Adubação de Plantio */}
              <SectionCard
                title="Adubação de Plantio"
                icon={<Leaf className="w-5 h-5" />}
                colorClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                custoEstimado={recommendation.adubacaoPlantio.custoEstimado}
              >
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">N</span>
                    <p className="font-semibold">{recommendation.adubacaoPlantio.nNecessario.toFixed(1)} kg/ha</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">P₂O₅</span>
                    <p className="font-semibold">{recommendation.adubacaoPlantio.p2o5Necessario.toFixed(1)} kg/ha</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">K₂O</span>
                    <p className="font-semibold">{recommendation.adubacaoPlantio.k2oNecessario.toFixed(1)} kg/ha</p>
                  </div>
                </div>
                {recommendation.adubacaoPlantio.insumosSelecionados.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produtos do Catálogo</p>
                    {recommendation.adubacaoPlantio.insumosSelecionados.map(insumo => (
                      <InsumoCard key={insumo.id} insumo={insumo} />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <p>Fórmula sugerida: {recommendation.adubacaoPlantio.formulaSugerida}</p>
                    <p>{recommendation.adubacaoPlantio.quantidadePorHa.toFixed(0)} kg/ha</p>
                  </div>
                )}
              </SectionCard>

              {/* Cobertura */}
              <SectionCard
                title="Cobertura (N + S)"
                icon={<Beaker className="w-5 h-5" />}
                colorClass="bg-blue-500/10 text-blue-700 dark:text-blue-400"
                custoEstimado={recommendation.cobertura.custoEstimado}
              >
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">N Total</span>
                    <p className="font-semibold">{recommendation.cobertura.nNecessario.toFixed(1)} kg/ha</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">N Cobertura</span>
                    <p className="font-semibold">{recommendation.cobertura.nCobertura.toFixed(1)} kg/ha</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">S Necessário</span>
                    <p className="font-semibold">{recommendation.cobertura.sNecessario.toFixed(1)} kg/ha</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">S Fornecido</span>
                    <p className="font-semibold">{recommendation.cobertura.sFornecido.toFixed(1)} kg/ha</p>
                  </div>
                </div>
                {recommendation.cobertura.insumosSelecionados.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produtos do Catálogo</p>
                    {recommendation.cobertura.insumosSelecionados.map(insumo => (
                      <InsumoCard key={insumo.id} insumo={insumo} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {recommendation.cobertura.quantidadePorHa.toFixed(0)} kg/ha de Ureia (45% N) - valor de referência
                  </p>
                )}
              </SectionCard>

              {/* Correção de Potássio */}
              <SectionCard
                title="Correção de Potássio"
                icon={<FlaskConical className="w-5 h-5" />}
                colorClass="bg-purple-500/10 text-purple-700 dark:text-purple-400"
                custoEstimado={recommendation.correcaoPotassio.custoEstimado}
              >
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">K₂O Necessário</span>
                    <p className="font-semibold">{recommendation.correcaoPotassio.k2oNecessario.toFixed(1)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">K₂O Plantio</span>
                    <p className="font-semibold">{recommendation.correcaoPotassio.k2oFornecidoPlantio.toFixed(1)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">K₂O Correção</span>
                    <p className="font-semibold">{recommendation.correcaoPotassio.k2oCorrecao.toFixed(1)}</p>
                  </div>
                </div>
                {recommendation.correcaoPotassio.insumosSelecionados.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produtos do Catálogo</p>
                    {recommendation.correcaoPotassio.insumosSelecionados.map(insumo => (
                      <InsumoCard key={insumo.id} insumo={insumo} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {recommendation.correcaoPotassio.quantidadePorHa.toFixed(0)} kg/ha de KCl (60% K₂O) - valor de referência
                  </p>
                )}
              </SectionCard>

              {/* Micronutrientes */}
              {(recommendation.micronutrientes.insumosSelecionados.length > 0 || 
                recommendation.micronutrientes.custoEstimado > 0) && (
                <SectionCard
                  title="Micronutrientes"
                  icon={<Beaker className="w-5 h-5" />}
                  colorClass="bg-teal-500/10 text-teal-700 dark:text-teal-400"
                  custoEstimado={recommendation.micronutrientes.custoEstimado}
                >
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-1.5 bg-secondary/30 rounded">
                      <span className="text-muted-foreground">B</span>
                      <p className="font-medium">{(recommendation.micronutrientes.bFornecido * 1000).toFixed(0)}g</p>
                    </div>
                    <div className="text-center p-1.5 bg-secondary/30 rounded">
                      <span className="text-muted-foreground">Zn</span>
                      <p className="font-medium">{(recommendation.micronutrientes.znFornecido * 1000).toFixed(0)}g</p>
                    </div>
                    <div className="text-center p-1.5 bg-secondary/30 rounded">
                      <span className="text-muted-foreground">Cu</span>
                      <p className="font-medium">{(recommendation.micronutrientes.cuFornecido * 1000).toFixed(0)}g</p>
                    </div>
                    <div className="text-center p-1.5 bg-secondary/30 rounded">
                      <span className="text-muted-foreground">Mn</span>
                      <p className="font-medium">{(recommendation.micronutrientes.mnFornecido * 1000).toFixed(0)}g</p>
                    </div>
                    <div className="text-center p-1.5 bg-secondary/30 rounded">
                      <span className="text-muted-foreground">Fe</span>
                      <p className="font-medium">{(recommendation.micronutrientes.feFornecido * 1000).toFixed(0)}g</p>
                    </div>
                  </div>
                  {recommendation.micronutrientes.insumosSelecionados.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produtos do Catálogo</p>
                      {recommendation.micronutrientes.insumosSelecionados.map(insumo => (
                        <InsumoCard key={insumo.id} insumo={insumo} />
                      ))}
                    </div>
                  )}
                </SectionCard>
              )}
            </div>

            {/* Resumo Financeiro Total */}
            <Card className="card-elevated border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-primary/10">
                      <DollarSign className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Investimento Total Estimado</h3>
                      <p className="text-sm text-muted-foreground">
                        Para {hectares} hectares • {insumosNutricao.length > 0 ? 'Baseado nos insumos cadastrados' : 'Valores de referência'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">
                      R$ {recommendation.custoTotalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      R$ {recommendation.custoPorHa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ha
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
