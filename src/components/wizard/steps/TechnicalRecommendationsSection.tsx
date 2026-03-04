import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Beaker,
  Sprout,
  Leaf,
  Droplets,
  AlertCircle,
  CheckCircle2,
  Info,
  Clock,
  Thermometer,
  CloudRain,
  Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecommendationDetail {
  title: string;
  items: {
    label: string;
    value: string;
    highlight?: boolean;
  }[];
  instructions: string[];
  warnings?: string[];
  tips?: string[];
}

interface TechnicalRecommendationsSectionProps {
  soilData: {
    vPercent: number;
    p: number;
    k: number;
    ca: number;
    mg: number;
    mo: number;
    hAl: number;
    zn?: number;
    b?: number;
    mn?: number;
    fe?: number;
    s?: number;
    cu?: number;
  } | null;
  recommendations: {
    calagem?: {
      produto: string;
      quantidadePorHectare: number;
      quantidadeTotalArea: number;
      valorTotal: number;
    };
    adubacaoPlantio?: {
      produto: string;
      quantidadePorHectare: number;
      quantidadeTotalArea: number;
      valorTotal: number;
    };
    cobertura?: {
      produto: string;
      quantidadePorHectare: number;
      quantidadeTotalArea: number;
      valorTotal: number;
    };
    correcaoK?: {
      produto: string;
      quantidadePorHectare: number;
      quantidadeTotalArea: number;
      valorTotal: number;
    };
  } | null;
  sprayingData: {
    equipment: {
      type: string;
      tankCapacity: number;
      applicationRate: number;
    };
    products: Array<{
      name: string;
      type: string;
      doseInput: number;
      unit: string;
      totalQuantity: number;
      quantityPerTank: number;
      principiosAtivos?: Array<{ nome: string; concentracao: string }>;
    }>;
  } | null;
  hectares: number;
}

export function TechnicalRecommendationsSection({
  soilData,
  recommendations,
  sprayingData,
  hectares
}: TechnicalRecommendationsSectionProps) {
  if (!soilData) return null;

  // Calcular CTC
  const kCmolc = soilData.k / 391;
  const ctc = soilData.ca + soilData.mg + kCmolc + soilData.hAl;
  const satK = ctc > 0 ? (kCmolc / ctc) * 100 : 0;
  const relCaMg = soilData.mg > 0 ? soilData.ca / soilData.mg : 0;

  // Níveis de referência
  const nivelP = soilData.p < 12 ? 'baixo' : soilData.p < 24 ? 'médio' : 'alto';
  const nivelK = soilData.k < 60 ? 'baixo' : soilData.k < 120 ? 'médio' : 'alto';
  const nivelMO = soilData.mo < 15 ? 'baixo' : soilData.mo < 25 ? 'médio' : 'alto';

  // Helper function to get level styles using primary color
  const getLevelStyles = (nivel: string) => {
    if (nivel === 'baixo') return 'text-destructive';
    if (nivel === 'médio') return 'text-muted-foreground';
    return 'text-primary';
  };

  const getLevelBadgeStyles = (nivel: string) => {
    if (nivel === 'baixo') return 'border-destructive/50 text-destructive bg-destructive/10';
    if (nivel === 'médio') return 'border-muted text-muted-foreground bg-muted';
    return 'border-primary/50 text-primary bg-primary/10';
  };

  return (
    <div className="space-y-4 print:space-y-3">
      <h3 className="text-lg font-bold flex items-center gap-2 print:text-base">
        <Info className="h-5 w-5 text-primary print:h-4 print:w-4" />
        Recomendações Técnicas Detalhadas
      </h3>

      {/* 1. Correção de Solo */}
      {recommendations?.calagem && recommendations.calagem.quantidadePorHectare > 0 && (
        <Card className="border-primary/30 bg-secondary/20 print:break-inside-avoid print:shadow-none print:border" data-pdf-section>
          <CardHeader className="py-3 print:py-2">
            <CardTitle className="text-sm flex items-center gap-2 print:text-xs">
              <Beaker className="h-4 w-4 text-primary print:h-3 print:w-3" />
              Correção de Solo - Calagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 print:space-y-2 print:text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">V% Atual</p>
                <p className={cn("font-bold", soilData.vPercent < 60 ? "text-destructive" : "text-primary")}>
                  {soilData.vPercent.toFixed(1)}%
                </p>
              </div>
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">V% Desejado</p>
                <p className="font-bold text-primary">65%</p>
              </div>
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">CTC</p>
                <p className="font-bold text-foreground">{ctc.toFixed(2)} cmolc/dm³</p>
              </div>
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">Dose</p>
                <p className="font-bold text-primary">{recommendations.calagem.quantidadePorHectare.toFixed(2)} t/ha</p>
              </div>
            </div>

            <div className="space-y-2 print:space-y-1">
              <p className="font-semibold text-sm flex items-center gap-2 print:text-xs">
                <CheckCircle2 className="h-4 w-4 text-primary print:h-3 print:w-3" />
                Instruções de Aplicação:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 print:text-xs print:space-y-0">
                <li>Aplicar {recommendations.calagem.produto} na dose de <strong className="text-foreground">{recommendations.calagem.quantidadePorHectare.toFixed(2)} t/ha</strong></li>
                <li>Total para a área: <strong className="text-foreground">{recommendations.calagem.quantidadeTotalArea.toFixed(2)} toneladas</strong></li>
                <li>Aplicar preferencialmente 60-90 dias antes do plantio para melhor reação</li>
                <li>Distribuir de forma uniforme e incorporar a 20-30 cm de profundidade</li>
                <li>Em áreas de plantio direto, aplicar em superfície sem incorporação</li>
              </ul>
            </div>

            <div className="p-2 bg-primary/10 border border-primary/30 rounded text-sm print:text-xs print:p-1">
              <p className="flex items-center gap-2 text-foreground">
                <AlertCircle className="h-4 w-4 text-primary print:h-3 print:w-3" />
                <strong>Atenção:</strong> A relação Ca:Mg atual é de {relCaMg.toFixed(2)}:1 
                {relCaMg < 3 && " (abaixo do ideal de 3:1 a 5:1, considerar calcário calcítico)"}
                {relCaMg > 5 && " (acima do ideal, considerar calcário dolomítico)"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Correção de Potássio */}
      {recommendations?.correcaoK && recommendations.correcaoK.quantidadePorHectare > 0 && (
        <Card className="border-primary/30 bg-secondary/20 print:break-inside-avoid print:shadow-none print:border" data-pdf-section>
          <CardHeader className="py-3 print:py-2">
            <CardTitle className="text-sm flex items-center gap-2 print:text-xs">
              <Beaker className="h-4 w-4 text-primary print:h-3 print:w-3" />
              Correção de Potássio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 print:space-y-2 print:text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">K Atual</p>
                <p className={cn("font-bold", getLevelStyles(nivelK))}>
                  {soilData.k} mg/dm³
                </p>
                <Badge variant="outline" className={cn("text-[10px] mt-1", getLevelBadgeStyles(nivelK))}>
                  {nivelK}
                </Badge>
              </div>
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">Saturação K na CTC</p>
                <p className="font-bold text-foreground">{satK.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">Ideal: 3-5%</p>
              </div>
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">Fonte</p>
                <p className="font-bold text-foreground">{recommendations.correcaoK.produto}</p>
              </div>
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">Dose</p>
                <p className="font-bold text-primary">{recommendations.correcaoK.quantidadePorHectare.toFixed(0)} kg/ha</p>
              </div>
            </div>

            <div className="space-y-2 print:space-y-1">
              <p className="font-semibold text-sm flex items-center gap-2 print:text-xs">
                <CheckCircle2 className="h-4 w-4 text-primary print:h-3 print:w-3" />
                Instruções de Aplicação:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 print:text-xs print:space-y-0">
                <li>Aplicar {recommendations.correcaoK.produto} na dose de <strong className="text-foreground">{recommendations.correcaoK.quantidadePorHectare.toFixed(0)} kg/ha</strong></li>
                <li>Total para a área: <strong className="text-foreground">{recommendations.correcaoK.quantidadeTotalArea.toFixed(0)} kg</strong></li>
                <li>Pode ser aplicado a lanço antes do plantio ou em cobertura</li>
                <li>Evitar aplicação em período de estiagem prolongada</li>
                <li>Em solos arenosos, parcelar a aplicação para evitar perdas por lixiviação</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Adubação de Plantio */}
      {recommendations?.adubacaoPlantio && (
        <Card className="border-primary/30 bg-secondary/20 print:break-inside-avoid print:shadow-none print:border" data-pdf-section>
          <CardHeader className="py-3 print:py-2">
            <CardTitle className="text-sm flex items-center gap-2 print:text-xs">
              <Sprout className="h-4 w-4 text-primary print:h-3 print:w-3" />
              Adubação de Plantio (Base)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 print:space-y-2 print:text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">Fósforo (P)</p>
                <p className={cn("font-bold", getLevelStyles(nivelP))}>
                  {soilData.p} mg/dm³
                </p>
                <Badge variant="outline" className={cn("text-[10px] mt-1", getLevelBadgeStyles(nivelP))}>
                  {nivelP}
                </Badge>
              </div>
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">Formulação</p>
                <p className="font-bold text-foreground">{recommendations.adubacaoPlantio.produto}</p>
              </div>
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">Dose</p>
                <p className="font-bold text-primary">{recommendations.adubacaoPlantio.quantidadePorHectare.toFixed(0)} kg/ha</p>
              </div>
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">Total Área</p>
                <p className="font-bold text-foreground">{recommendations.adubacaoPlantio.quantidadeTotalArea.toFixed(0)} kg</p>
              </div>
            </div>

            <div className="p-2 bg-primary/10 border border-primary/30 rounded print:p-1">
              <p className="text-sm font-semibold text-foreground print:text-xs">Fornecimento de Nutrientes:</p>
              <div className="grid grid-cols-3 gap-2 mt-2 text-sm print:text-xs">
                <div>
                  <span className="text-muted-foreground">N:</span>{' '}
                  <strong className="text-primary">{(recommendations.adubacaoPlantio.quantidadePorHectare * 0.08).toFixed(1)} kg/ha</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">P₂O₅:</span>{' '}
                  <strong className="text-primary">{(recommendations.adubacaoPlantio.quantidadePorHectare * 0.28).toFixed(1)} kg/ha</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">K₂O:</span>{' '}
                  <strong className="text-primary">{(recommendations.adubacaoPlantio.quantidadePorHectare * 0.16).toFixed(1)} kg/ha</strong>
                </div>
              </div>
            </div>

            <div className="space-y-2 print:space-y-1">
              <p className="font-semibold text-sm flex items-center gap-2 print:text-xs">
                <CheckCircle2 className="h-4 w-4 text-primary print:h-3 print:w-3" />
                Instruções de Aplicação:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 print:text-xs print:space-y-0">
                <li>Aplicar no sulco de plantio, 5-10 cm ao lado e abaixo da semente</li>
                <li>Evitar contato direto do fertilizante com a semente</li>
                <li>Regulagem da plantadeira: {recommendations.adubacaoPlantio.quantidadePorHectare.toFixed(0)} kg/ha</li>
                <li>Verificar granulometria e fluidez do fertilizante antes da operação</li>
                <li>Em solos muito argilosos, aumentar profundidade de aplicação para 8-12 cm</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Adubação de Cobertura */}
      {recommendations?.cobertura && recommendations.cobertura.quantidadePorHectare > 0 && (
        <Card className="border-primary/30 bg-secondary/20 print:break-inside-avoid print:shadow-none print:border" data-pdf-section>
          <CardHeader className="py-3 print:py-2">
            <CardTitle className="text-sm flex items-center gap-2 print:text-xs">
              <Leaf className="h-4 w-4 text-primary print:h-3 print:w-3" />
              Adubação de Cobertura (Nitrogênio)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 print:space-y-2 print:text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">Matéria Orgânica</p>
                <p className={cn("font-bold", getLevelStyles(nivelMO))}>
                  {soilData.mo} g/dm³
                </p>
                <Badge variant="outline" className={cn("text-[10px] mt-1", getLevelBadgeStyles(nivelMO))}>
                  {nivelMO}
                </Badge>
              </div>
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">Fonte</p>
                <p className="font-bold text-foreground">{recommendations.cobertura.produto}</p>
              </div>
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">Dose</p>
                <p className="font-bold text-primary">{recommendations.cobertura.quantidadePorHectare.toFixed(0)} kg/ha</p>
              </div>
              <div className="bg-background p-2 rounded border border-primary/20 print:p-1">
                <p className="text-xs text-muted-foreground print:text-[10px]">N Fornecido</p>
                <p className="font-bold text-primary">{(recommendations.cobertura.quantidadePorHectare * 0.45).toFixed(1)} kg/ha</p>
              </div>
            </div>

            <div className="space-y-2 print:space-y-1">
              <p className="font-semibold text-sm flex items-center gap-2 print:text-xs">
                <CheckCircle2 className="h-4 w-4 text-primary print:h-3 print:w-3" />
                Instruções de Aplicação:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 print:text-xs print:space-y-0">
                <li>Aplicar quando a cultura atingir estádio V4-V6 (4 a 6 folhas desenvolvidas)</li>
                <li>Parcelar em 2 aplicações quando a dose total for superior a 150 kg/ha de ureia</li>
                <li>Aplicar preferencialmente em solo úmido ou com previsão de chuva em 24h</li>
                <li>Total para a área: <strong className="text-foreground">{recommendations.cobertura.quantidadeTotalArea.toFixed(0)} kg</strong></li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 print:gap-1">
              <div className="p-2 bg-primary/10 border border-primary/30 rounded text-sm print:text-xs print:p-1">
                <p className="flex items-center gap-2 text-foreground">
                  <Sun className="h-4 w-4 text-primary print:h-3 print:w-3" />
                  <strong>Horário:</strong> Evitar aplicação em dias muito quentes. Preferir início da manhã ou final da tarde.
                </p>
              </div>
              <div className="p-2 bg-primary/10 border border-primary/30 rounded text-sm print:text-xs print:p-1">
                <p className="flex items-center gap-2 text-foreground">
                  <CloudRain className="h-4 w-4 text-primary print:h-3 print:w-3" />
                  <strong>Umidade:</strong> Incorporar com chuva/irrigação em até 48h para reduzir volatilização.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Pulverização - Defensivos e Foliares */}
      {sprayingData && sprayingData.products.length > 0 && (
        <Card className="border-primary/30 bg-secondary/20 print:break-inside-avoid print:shadow-none print:border" data-pdf-section>
          <CardHeader className="py-3 print:py-2">
            <CardTitle className="text-sm flex items-center gap-2 print:text-xs">
              <Droplets className="h-4 w-4 text-primary print:h-3 print:w-3" />
              Pulverização - Defensivos e Foliares
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 print:space-y-2 print:text-xs">
            {/* Agrupar por tipo de produto */}
            {['Herbicida', 'Inseticida', 'Fungicida', 'Foliar', 'Adjuvantes'].map(tipo => {
              const produtosTipo = sprayingData.products.filter(p => p.type === tipo);
              if (produtosTipo.length === 0) return null;

              return (
                <div key={tipo} className="space-y-2 print:space-y-1">
                  <p className="font-semibold text-sm border-b border-primary/20 pb-1 print:text-xs">{tipo}s</p>
                  {produtosTipo.map((produto, idx) => (
                    <div key={idx} className="bg-background p-3 rounded border border-primary/20 print:p-2">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-foreground">{produto.name}</p>
                          {produto.principiosAtivos && produto.principiosAtivos.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Princípio Ativo: {produto.principiosAtivos.map(pa => `${pa.nome} ${pa.concentracao}`).join(', ')}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-0">{produto.doseInput} {produto.unit}</Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1 print:text-xs">
                        {tipo === 'Herbicida' && (
                          <>
                            <p>• Aplicar em pré ou pós-emergência conforme recomendação do fabricante</p>
                            <p>• Verificar estádio das plantas daninhas (máximo 4 folhas para pós-emergentes)</p>
                            <p>• Não aplicar sob temperaturas acima de 30°C ou umidade relativa abaixo de 55%</p>
                          </>
                        )}
                        {tipo === 'Inseticida' && (
                          <>
                            <p>• Monitorar nível de infestação antes da aplicação (MIP)</p>
                            <p>• Respeitar o intervalo de segurança indicado na bula</p>
                            <p>• Rotacionar grupos químicos para evitar resistência</p>
                          </>
                        )}
                        {tipo === 'Fungicida' && (
                          <>
                            <p>• Aplicar preventivamente ou aos primeiros sinais da doença</p>
                            <p>• Garantir boa cobertura do dossel da planta</p>
                            <p>• Respeitar intervalo entre aplicações conforme bula</p>
                          </>
                        )}
                        {tipo === 'Foliar' && (
                          <>
                            <p>• Aplicar preferencialmente no início da manhã ou final da tarde</p>
                            <p>• Evitar aplicação com umidade relativa muito baixa (&lt;50%)</p>
                            <p>• Observar compatibilidade com outros produtos na calda</p>
                          </>
                        )}
                        {tipo === 'Adjuvantes' && (
                          <>
                            <p>• Adicionar por último na preparação da calda</p>
                            <p>• Seguir dosagem recomendada - excesso pode causar fitotoxicidade</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="p-2 bg-primary/10 border border-primary/30 rounded text-sm print:text-xs print:p-1">
              <p className="flex items-center gap-2 text-foreground font-semibold mb-1">
                <Thermometer className="h-4 w-4 text-primary print:h-3 print:w-3" />
                Condições Ideais de Aplicação:
              </p>
              <ul className="text-muted-foreground text-sm space-y-0.5 print:text-xs">
                <li>• Temperatura: entre 15°C e 30°C</li>
                <li>• Umidade relativa: acima de 55%</li>
                <li>• Vento: máximo 10 km/h</li>
                <li>• Sem previsão de chuva em 2 horas após aplicação</li>
              </ul>
            </div>

            <div className="p-2 bg-destructive/10 border border-destructive/30 rounded text-sm print:text-xs print:p-1">
              <p className="flex items-center gap-2 text-foreground">
                <AlertCircle className="h-4 w-4 text-destructive print:h-3 print:w-3" />
                <strong>Segurança:</strong> Utilize sempre EPI completo (macacão, luvas, botas, máscara e óculos). Faça tríplice lavagem das embalagens vazias.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cronograma Sugerido */}
      <Card className="border-primary/30 bg-secondary/20 print:break-inside-avoid print:shadow-none print:border" data-pdf-section>
        <CardHeader className="py-3 print:py-2">
          <CardTitle className="text-sm flex items-center gap-2 print:text-xs">
            <Clock className="h-4 w-4 text-primary print:h-3 print:w-3" />
            Cronograma Sugerido de Aplicações
          </CardTitle>
        </CardHeader>
        <CardContent className="print:text-xs">
          <div className="space-y-2 print:space-y-1">
            <div className="flex items-center gap-3 p-2 bg-background rounded border border-primary/20 print:p-1">
              <div className="w-24 text-xs font-semibold text-primary print:w-20 print:text-[10px]">60-90 dias antes</div>
              <Separator orientation="vertical" className="h-8 bg-primary/30" />
              <div className="text-sm print:text-xs">
                <p className="font-medium text-foreground">Calagem</p>
                <p className="text-muted-foreground text-xs print:text-[10px]">Aplicar calcário para correção do pH</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-2 bg-background rounded border border-primary/20 print:p-1">
              <div className="w-24 text-xs font-semibold text-primary print:w-20 print:text-[10px]">30 dias antes</div>
              <Separator orientation="vertical" className="h-8 bg-primary/30" />
              <div className="text-sm print:text-xs">
                <p className="font-medium text-foreground">Correção de K (se necessário)</p>
                <p className="text-muted-foreground text-xs print:text-[10px]">Aplicar cloreto de potássio a lanço</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 bg-background rounded border border-primary/20 print:p-1">
              <div className="w-24 text-xs font-semibold text-primary print:w-20 print:text-[10px]">No plantio</div>
              <Separator orientation="vertical" className="h-8 bg-primary/30" />
              <div className="text-sm print:text-xs">
                <p className="font-medium text-foreground">Adubação de Base (NPK)</p>
                <p className="text-muted-foreground text-xs print:text-[10px]">Aplicar no sulco junto com a semeadura</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 bg-background rounded border border-primary/20 print:p-1">
              <div className="w-24 text-xs font-semibold text-primary print:w-20 print:text-[10px]">V4-V6</div>
              <Separator orientation="vertical" className="h-8 bg-primary/30" />
              <div className="text-sm print:text-xs">
                <p className="font-medium text-foreground">Cobertura Nitrogenada</p>
                <p className="text-muted-foreground text-xs print:text-[10px]">Aplicar ureia ou sulfato de amônio a lanço</p>
              </div>
            </div>

            {sprayingData && sprayingData.products.length > 0 && (
              <div className="flex items-center gap-3 p-2 bg-background rounded border border-primary/20 print:p-1">
                <div className="w-24 text-xs font-semibold text-primary print:w-20 print:text-[10px]">Conforme MIP</div>
                <Separator orientation="vertical" className="h-8 bg-primary/30" />
                <div className="text-sm print:text-xs">
                  <p className="font-medium text-foreground">Pulverizações</p>
                  <p className="text-muted-foreground text-xs print:text-[10px]">Aplicar defensivos conforme monitoramento e estádio da cultura</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
