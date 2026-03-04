import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Beaker,
  Sprout,
  Leaf,
  Wheat,
  Clock,
  Wrench,
  HelpCircle,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Info,
  Droplets,
  Tractor,
  PlaneTakeoff,
  Backpack,
  Bug,
  Shield,
  Flower2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardSprayingData, SprayingProduct, EquipmentType } from '@/types/spraying';
import { calculateQuantityPerTank } from '@/types/spraying';

interface DosePerMethod {
  equipamento: string;
  icon: React.ReactNode;
  dosePorUnidade: string;
  unidadeLabel: string;
  recomendacao: string;
}

interface ProductRecommendation {
  id: string;
  produto: string;
  categoria: string;
  icon: React.ReactNode;
  doseHa: string;
  quantidadeTotal: string;
  quando: {
    titulo: string;
    descricao: string;
    diasAntes?: string;
  };
  como: {
    titulo: string;
    passos: string[];
  };
  porQue: {
    titulo: string;
    explicacao: string;
  };
  dicas?: string[];
  alertas?: string[];
  dosesPerMethod?: DosePerMethod[];
}

interface DetailedProductRecommendationsProps {
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
      comoSeraFeito?: string;
      quandoSeraFeito?: string;
      observacoes?: string;
    };
    adubacaoPlantio?: {
      produto: string;
      quantidadePorHectare: number;
      quantidadeTotalArea: number;
      valorTotal: number;
      comoSeraFeito?: string;
      quandoSeraFeito?: string;
      observacoes?: string;
    };
    cobertura?: {
      produto: string;
      quantidadePorHectare: number;
      quantidadeTotalArea: number;
      valorTotal: number;
      comoSeraFeito?: string;
      quandoSeraFeito?: string;
      observacoes?: string;
    };
    correcaoK?: {
      produto: string;
      quantidadePorHectare: number;
      quantidadeTotalArea: number;
      valorTotal: number;
      comoSeraFeito?: string;
      quandoSeraFeito?: string;
      observacoes?: string;
    };
  } | null;
  seedData: {
    seed: {
      name: string;
      company: string;
      productivityRange: string;
    } | null;
    rowSpacing: number;
    seedsPerMeter: number;
    populationPerHectare: number;
  } | null;
  sprayingData: WizardSprayingData | null;
  hectares: number;
}

function RecommendationCard({ rec }: { rec: ProductRecommendation }) {
  return (
    <Card className="border border-primary/30 bg-secondary/10 print:break-inside-avoid print:shadow-none print:border-gray-300" data-pdf-section>
      <CardHeader className="py-3 pb-2 print:py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 print:text-xs">
            <span className="text-primary print:hidden">{rec.icon}</span>
            {rec.produto}
          </CardTitle>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 print:text-[8pt]">
            {rec.categoria}
          </Badge>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground print:text-[9pt]">
          <span><strong className="text-foreground">Dose:</strong> {rec.doseHa}</span>
          <span><strong className="text-foreground">Total:</strong> {rec.quantidadeTotal}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 print:space-y-2 print:text-xs">
        {/* DOSES POR MÉTODO DE APLICAÇÃO */}
        {rec.dosesPerMethod && rec.dosesPerMethod.length > 0 && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 print:p-2">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="h-4 w-4 text-primary print:h-3 print:w-3" />
              <span className="font-semibold text-sm text-primary print:text-xs">DOSE POR MÉTODO DE APLICAÇÃO</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 print:gap-1">
              {rec.dosesPerMethod.map((dose, idx) => (
                <div key={idx} className="p-2 bg-background rounded border border-primary/15 print:p-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-primary print:hidden">{dose.icon}</span>
                    <span className="text-xs font-semibold text-foreground">{dose.equipamento}</span>
                  </div>
                  <p className="text-lg font-bold text-primary print:text-sm">{dose.dosePorUnidade}</p>
                  <p className="text-xs text-muted-foreground">{dose.unidadeLabel}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">({dose.recomendacao})</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QUANDO */}
        <div className="p-3 bg-background rounded-lg border border-primary/20 print:p-2">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-primary print:h-3 print:w-3" />
            <span className="font-semibold text-sm text-primary print:text-xs">QUANDO FAZER</span>
            {rec.quando.diasAntes && (
              <Badge variant="secondary" className="ml-auto bg-primary/20 text-primary border-0 text-xs print:text-[8pt]">
                {rec.quando.diasAntes}
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground font-medium print:text-xs">{rec.quando.titulo}</p>
          <p className="text-sm text-muted-foreground mt-1 print:text-xs">{rec.quando.descricao}</p>
        </div>

        {/* COMO */}
        <div className="p-3 bg-background rounded-lg border border-primary/20 print:p-2">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-4 w-4 text-primary print:h-3 print:w-3" />
            <span className="font-semibold text-sm text-primary print:text-xs">COMO FAZER</span>
          </div>
          <p className="text-sm text-foreground font-medium mb-2 print:text-xs">{rec.como.titulo}</p>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 print:text-xs print:space-y-0">
            {rec.como.passos.map((passo, idx) => (
              <li key={idx}>{passo}</li>
            ))}
          </ol>
        </div>

        {/* POR QUÊ */}
        <div className="p-3 bg-background rounded-lg border border-primary/20 print:p-2">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="h-4 w-4 text-primary print:h-3 print:w-3" />
            <span className="font-semibold text-sm text-primary print:text-xs">POR QUÊ FAZER</span>
          </div>
          <p className="text-sm text-foreground font-medium print:text-xs">{rec.porQue.titulo}</p>
          <p className="text-sm text-muted-foreground mt-1 print:text-xs">{rec.porQue.explicacao}</p>
        </div>

        {/* Dicas e Alertas */}
        {(rec.dicas || rec.alertas) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 print:gap-1">
            {rec.dicas && rec.dicas.length > 0 && (
              <div className="p-2 bg-primary/10 border border-primary/30 rounded print:p-1">
                <p className="flex items-center gap-1 text-xs font-semibold text-primary mb-1 print:text-[9pt]">
                  <CheckCircle2 className="h-3 w-3" /> Dicas
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5 print:text-[8pt]">
                  {rec.dicas.map((d, i) => <li key={i}>• {d}</li>)}
                </ul>
              </div>
            )}
            {rec.alertas && rec.alertas.length > 0 && (
              <div className="p-2 bg-destructive/10 border border-destructive/30 rounded print:p-1">
                <p className="flex items-center gap-1 text-xs font-semibold text-destructive mb-1 print:text-[9pt]">
                  <AlertTriangle className="h-3 w-3" /> Atenção
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5 print:text-[8pt]">
                  {rec.alertas.map((a, i) => <li key={i}>• {a}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DetailedProductRecommendations({
  soilData,
  recommendations,
  seedData,
  sprayingData,
  hectares
}: DetailedProductRecommendationsProps) {
  if (!soilData || !recommendations) return null;

  const productRecs: ProductRecommendation[] = [];

  // 1. Calcário Dolomítico
  if (recommendations.calagem && recommendations.calagem.quantidadePorHectare > 0) {
    productRecs.push({
      id: 'calagem',
      produto: recommendations.calagem.produto,
      categoria: 'Correção de pH',
      icon: <Beaker className="h-4 w-4" />,
      doseHa: `${recommendations.calagem.quantidadePorHectare.toFixed(2)} t/ha`,
      quantidadeTotal: `${recommendations.calagem.quantidadeTotalArea.toFixed(2)} toneladas`,
      quando: {
        titulo: 'Aplicar 60 a 90 dias antes do plantio',
        descricao: 'Esse tempo é necessário para que o calcário reaja com o solo e corrija a acidez. A reação do calcário depende da umidade do solo, por isso é importante que haja chuvas ou irrigação após a aplicação.',
        diasAntes: '60-90 dias antes'
      },
      como: {
        titulo: 'Aplicação a lanço com incorporação',
        passos: [
          `Espalhe ${recommendations.calagem.quantidadePorHectare.toFixed(2)} toneladas por hectare de forma uniforme usando distribuidor a lanço`,
          'Passe a grade aradora para incorporar o calcário até 20cm de profundidade',
          'Em áreas de plantio direto, aplique em superfície sem incorporação',
          'Se a dose for maior que 4 t/ha, divida em duas aplicações (antes e depois da aração)'
        ]
      },
      porQue: {
        titulo: 'Corrigir a acidez e fornecer Ca e Mg',
        explicacao: `Seu solo está com V% de ${soilData.vPercent.toFixed(1)}%, mas o milho precisa de pelo menos 65% para produzir bem. O calcário vai corrigir a acidez, fornecer cálcio e magnésio para as plantas, e ajudar as raízes a absorverem melhor os nutrientes.`
      },
      dicas: [
        'Aplique preferencialmente antes do período chuvoso',
        'Calcário mais fino reage mais rápido no solo',
        'Em solos muito ácidos, a calagem melhora a eficiência dos fertilizantes'
      ],
      alertas: [
        'Não aplique junto com fertilizantes fosfatados (causa insolubilização)',
        'Evite aplicar com solo muito seco'
      ]
    });
  }

  // 2. Cloreto de Potássio (KCl)
  if (recommendations.correcaoK && recommendations.correcaoK.quantidadePorHectare > 0) {
    const kCmolc = soilData.k / 391;
    const ctc = soilData.ca + soilData.mg + kCmolc + soilData.hAl;
    const satK = ctc > 0 ? (kCmolc / ctc) * 100 : 0;
    
    productRecs.push({
      id: 'kcl',
      produto: recommendations.correcaoK.produto,
      categoria: 'Correção de Potássio',
      icon: <Beaker className="h-4 w-4" />,
      doseHa: `${recommendations.correcaoK.quantidadePorHectare.toFixed(0)} kg/ha`,
      quantidadeTotal: `${recommendations.correcaoK.quantidadeTotalArea.toFixed(0)} kg`,
      quando: {
        titulo: 'Aplicar 30 a 45 dias antes do plantio',
        descricao: 'Pode ser feito no mesmo período da calagem, mas em operação separada. Isso permite que o potássio se distribua uniformemente no perfil do solo antes do plantio.',
        diasAntes: '30-45 dias antes'
      },
      como: {
        titulo: 'Aplicação a lanço sem incorporação',
        passos: [
          `Espalhe ${recommendations.correcaoK.quantidadePorHectare.toFixed(0)} kg por hectare de forma uniforme`,
          'Use distribuidor a lanço calibrado',
          'Não precisa incorporar ao solo - o potássio se move com a água da chuva',
          'Em solos arenosos, divida a dose em duas aplicações para evitar perdas'
        ]
      },
      porQue: {
        titulo: 'Garantir reserva de potássio para a cultura',
        explicacao: `Seu solo tem ${satK.toFixed(1)}% de saturação de K na CTC, que está ${satK < 3 ? 'baixo (ideal: 3-5%)' : 'adequado'}. O potássio é essencial para enchimento de grãos, resistência a doenças e tolerância à seca.`
      },
      dicas: [
        'KCl é a fonte mais econômica de potássio',
        'Em solos com baixo teor de enxofre, considerar sulfato de potássio',
        'O potássio não volatiliza - pode aplicar a qualquer hora'
      ],
      alertas: [
        'Doses altas podem queimar sementes se aplicadas no sulco',
        'Em solos muito arenosos, há risco de lixiviação'
      ]
    });
  }

  // 3. Semente
  if (seedData?.seed) {
    productRecs.push({
      id: 'semente',
      produto: `Semente ${seedData.seed.name}`,
      categoria: 'Plantio',
      icon: <Wheat className="h-4 w-4" />,
      doseHa: `${((seedData.populationPerHectare || 0) / 1000).toFixed(1)} mil sementes/ha`,
      quantidadeTotal: `${(((seedData.populationPerHectare || 0) * hectares) / 1000).toFixed(0)} mil sementes`,
      quando: {
        titulo: 'No dia do plantio',
        descricao: 'Plantar quando o solo estiver com umidade adequada (após primeiras chuvas do período ou sob irrigação). Evitar plantio em solo muito seco ou encharcado.',
        diasAntes: 'Dia 0'
      },
      como: {
        titulo: 'Semeadura mecanizada com regulagem precisa',
        passos: [
          `Configure a plantadeira para espaçamento de ${seedData.rowSpacing} cm entre linhas`,
          `Regule para ${seedData.seedsPerMeter.toFixed(1)} sementes por metro linear`,
          'Profundidade de semeadura: 3-5 cm (ajustar conforme umidade do solo)',
          'Velocidade de plantio: máximo 6 km/h para garantir distribuição uniforme',
          'Verifique regularmente a distribuição das sementes no sulco'
        ]
      },
      porQue: {
        titulo: 'Estabelecer população ideal de plantas',
        explicacao: `A população de ${((seedData.populationPerHectare || 0) / 1000).toFixed(1)} mil plantas/ha foi definida para a faixa de produtividade ${seedData.seed.productivityRange}. População adequada maximiza a interceptação de luz e uso de recursos.`
      },
      dicas: [
        'Fazer teste de germinação antes do plantio',
        'Tratar sementes com fungicida/inseticida se não vierem tratadas',
        'Manter sementes em local fresco e seco antes do plantio'
      ],
      alertas: [
        'Não plantar sementes velhas ou mal armazenadas',
        'Verificar emergência 5-7 dias após plantio'
      ]
    });
  }

  // 4. Formulado NPK (Plantio)
  if (recommendations.adubacaoPlantio) {
    const nFornecido = recommendations.adubacaoPlantio.quantidadePorHectare * 0.08;
    const p2o5Fornecido = recommendations.adubacaoPlantio.quantidadePorHectare * 0.28;
    const k2oFornecido = recommendations.adubacaoPlantio.quantidadePorHectare * 0.16;

    productRecs.push({
      id: 'npk-plantio',
      produto: recommendations.adubacaoPlantio.produto,
      categoria: 'Adubação de Base',
      icon: <Sprout className="h-4 w-4" />,
      doseHa: `${recommendations.adubacaoPlantio.quantidadePorHectare.toFixed(0)} kg/ha`,
      quantidadeTotal: `${recommendations.adubacaoPlantio.quantidadeTotalArea.toFixed(0)} kg`,
      quando: {
        titulo: 'No mesmo momento do plantio',
        descricao: 'O adubo vai junto com a semente na mesma operação de plantio. A plantadeira faz a deposição simultânea de semente e fertilizante.',
        diasAntes: 'Dia 0 (plantio)'
      },
      como: {
        titulo: 'Aplicação no sulco de plantio',
        passos: [
          `Regule a plantadeira para distribuir ${recommendations.adubacaoPlantio.quantidadePorHectare.toFixed(0)} kg/ha`,
          'Posicione o adubo 5 cm ao lado e 5 cm abaixo da semente',
          'Isso evita contato direto e possível queima das raízes',
          'Verifique regularmente a vazão do fertilizante durante a operação'
        ]
      },
      porQue: {
        titulo: 'Fornecer nutrientes essenciais no início do ciclo',
        explicacao: `Este formulado vai fornecer ${nFornecido.toFixed(0)} kg/ha de Nitrogênio para crescimento inicial, ${p2o5Fornecido.toFixed(0)} kg/ha de Fósforo para desenvolvimento das raízes, e ${k2oFornecido.toFixed(0)} kg/ha de Potássio. O restante do N será aplicado em cobertura.`
      },
      dicas: [
        'Verificar granulometria e fluidez do fertilizante',
        'Fazer calibração da plantadeira antes de iniciar',
        'Formulados com micronutrientes são uma boa opção'
      ],
      alertas: [
        'Contato direto fertilizante-semente pode reduzir germinação',
        'Em solos muito argilosos, aumentar profundidade para 8-12 cm'
      ]
    });
  }

  // 5. Ureia (Cobertura)
  if (recommendations.cobertura && recommendations.cobertura.quantidadePorHectare > 0) {
    const nFornecido = recommendations.cobertura.quantidadePorHectare * 0.45;
    const primeiraAplicacao = Math.round(recommendations.cobertura.quantidadePorHectare * 0.3);
    const segundaAplicacao = Math.round(recommendations.cobertura.quantidadePorHectare * 0.7);

    productRecs.push({
      id: 'ureia-cobertura',
      produto: recommendations.cobertura.produto,
      categoria: 'Cobertura Nitrogenada',
      icon: <Leaf className="h-4 w-4" />,
      doseHa: `${recommendations.cobertura.quantidadePorHectare.toFixed(0)} kg/ha`,
      quantidadeTotal: `${recommendations.cobertura.quantidadeTotalArea.toFixed(0)} kg`,
      quando: {
        titulo: 'Dividir em 2 aplicações: V4 e V8',
        descricao: `1ª aplicação (${primeiraAplicacao} kg/ha): quando o milho tiver 4 folhas desenvolvidas (15-20 dias após plantio). 2ª aplicação (${segundaAplicacao} kg/ha): quando tiver 8 folhas (30-35 dias após plantio).`,
        diasAntes: '15-35 dias após plantio'
      },
      como: {
        titulo: 'Aplicação a lanço entre as fileiras',
        passos: [
          'Espalhe a ureia uniformemente entre as linhas de milho',
          'Aplique preferencialmente no final da tarde ou com previsão de chuva em 24h',
          'Isso reduz perdas de nitrogênio por volatilização',
          'Em áreas irrigadas, aplicar antes da irrigação',
          'Evitar aplicação com solo muito seco ou em dias muito quentes'
        ]
      },
      porQue: {
        titulo: 'Nitrogênio é o nutriente mais limitante no milho',
        explicacao: `O N é essencial para crescimento vegetativo e formação de espigas. Seu solo com ${soilData.mo.toFixed(1)} g/dm³ de matéria orgânica ${soilData.mo >= 25 ? 'já contribui fornecendo parte do N' : 'tem baixa contribuição natural de N'}. A ureia fornece ${nFornecido.toFixed(0)} kg/ha de N.`
      },
      dicas: [
        'Parcelamento melhora eficiência e reduz perdas',
        'Sulfato de amônio é alternativa em áreas com pouco enxofre',
        'Cobertura tardia (após V10) tem menor aproveitamento'
      ],
      alertas: [
        'Ureia em solo seco perde até 40% do N por volatilização',
        'Não aplicar com temperatura acima de 30°C',
        'Incorporar com chuva ou irrigação em até 48h'
      ]
    });
  }

  // 6. Produtos de Pulverização (Herbicidas, Inseticidas, Fungicidas, etc.)
  if (sprayingData && sprayingData.products.length > 0) {
    const { equipment, products } = sprayingData;
    
    const SPRAYING_ICONS: Record<string, React.ReactNode> = {
      'Herbicida': <Leaf className="h-4 w-4" />,
      'Inseticida': <Bug className="h-4 w-4" />,
      'Fungicida': <Shield className="h-4 w-4" />,
      'Adjuvante': <Sparkles className="h-4 w-4" />,
      'Foliar': <Flower2 className="h-4 w-4" />,
    };

    const SPRAYING_TIMING: Record<string, { titulo: string; descricao: string; diasAntes: string }> = {
      'Herbicida': {
        titulo: 'Pré-plantio ou Pós-emergência conforme recomendação',
        descricao: 'Herbicidas pré-emergentes devem ser aplicados antes do plantio ou logo após, antes da emergência das plantas daninhas. Pós-emergentes devem ser aplicados quando as daninhas estiverem com 2 a 4 folhas para melhor controle.',
        diasAntes: 'Conforme estádio'
      },
      'Inseticida': {
        titulo: 'Ao identificar praga ou preventivamente conforme histórico',
        descricao: 'Monitore a lavoura semanalmente. Aplique quando atingir o nível de controle econômico. Em áreas com histórico de ataque, a aplicação preventiva no início do ciclo é recomendada.',
        diasAntes: 'Quando necessário'
      },
      'Fungicida': {
        titulo: 'Preventivamente ou ao primeiro sinal da doença',
        descricao: 'A aplicação preventiva é mais eficiente. Em condições de alta umidade e temperatura, aplique antes do aparecimento dos sintomas. Para controle curativo, atue ao primeiro sinal.',
        diasAntes: 'V6-VT (preventivo)'
      },
      'Adjuvante': {
        titulo: 'Junto com o produto principal na mesma calda',
        descricao: 'O adjuvante é adicionado à calda junto com o produto principal para melhorar a eficiência de aplicação, espalhamento e absorção. Sempre adicione por último no preparo da calda.',
        diasAntes: 'Com o defensivo'
      },
      'Foliar': {
        titulo: 'Nos estádios recomendados para absorção foliar',
        descricao: 'A adubação foliar é complementar e deve ser aplicada nos momentos de maior demanda nutricional. Evite aplicar em horários de sol forte para reduzir a evaporação e risco de fitotoxicidade.',
        diasAntes: 'V4-V8 / R1'
      },
    };

    const SPRAYING_WHY: Record<string, { titulo: string; explicacao: string }> = {
      'Herbicida': {
        titulo: 'Controlar plantas daninhas que competem com a cultura',
        explicacao: 'As plantas daninhas competem por água, luz, nutrientes e espaço, reduzindo a produtividade. O controle eficiente no momento certo evita perdas que podem chegar a 80% da produção.'
      },
      'Inseticida': {
        titulo: 'Proteger a lavoura contra pragas',
        explicacao: 'Insetos-praga causam danos diretos (desfolha, perfuração de grãos) e indiretos (transmissão de doenças). O controle adequado mantém a produtividade e qualidade da produção.'
      },
      'Fungicida': {
        titulo: 'Prevenir e controlar doenças fúngicas',
        explicacao: 'Doenças como a ferrugem e a cercosporiose podem reduzir drasticamente a produtividade. A aplicação preventiva é mais eficaz e econômica que o controle curativo.'
      },
      'Adjuvante': {
        titulo: 'Melhorar a eficiência da aplicação',
        explicacao: 'O adjuvante melhora o espalhamento, a aderência e a penetração dos defensivos nas folhas, aumentando a eficiência dos produtos e reduzindo perdas por escorrimento ou evaporação.'
      },
      'Foliar': {
        titulo: 'Suplementar nutrientes por via foliar',
        explicacao: 'A nutrição foliar complementa a adubação de solo, corrigindo deficiências pontuais de micronutrientes em momentos críticos do ciclo, quando a absorção radicular pode ser insuficiente.'
      },
    };

    // Helper to format volume for display
    const formatDoseVolume = (value: number, unit: string): string => {
      if (value === 0) return '-';
      if (unit.includes('Kg') || unit.includes('kg')) {
        return value < 1 ? `${(value * 1000).toFixed(0)} g` : `${value.toFixed(2)} kg`;
      }
      return value < 1 ? `${(value * 1000).toFixed(0)} mL` : `${value.toFixed(2)} L`;
    };

    // Calculate doses for all 3 methods for each product
    const EQUIPMENT_CONFIGS: { type: EquipmentType; label: string; icon: React.ReactNode; tankCapacity: number; applicationRate: number }[] = [
      { type: 'bomba_costal', label: 'Bomba Costal', icon: <Backpack className="h-3.5 w-3.5" />, tankCapacity: 20, applicationRate: 200 },
      { type: 'trator', label: 'Trator', icon: <Tractor className="h-3.5 w-3.5" />, tankCapacity: 500, applicationRate: 150 },
      { type: 'drone', label: 'Drone', icon: <PlaneTakeoff className="h-3.5 w-3.5" />, tankCapacity: 20, applicationRate: 10 },
    ];

    products.forEach((product, index) => {
      const type = product.type || 'Herbicida';
      const icon = SPRAYING_ICONS[type] || <Droplets className="h-4 w-4" />;
      const timing = SPRAYING_TIMING[type] || SPRAYING_TIMING['Herbicida'];
      const why = SPRAYING_WHY[type] || SPRAYING_WHY['Herbicida'];

      // Calculate dose per method
      const dosesPerMethod: DosePerMethod[] = EQUIPMENT_CONFIGS.map(config => {
        const qtyPerTank = calculateQuantityPerTank(
          product.unit,
          product.doseInput,
          config.tankCapacity,
          config.applicationRate
        );
        
        return {
          equipamento: config.label,
          icon: config.icon,
          dosePorUnidade: formatDoseVolume(qtyPerTank, product.unit),
          unidadeLabel: `por ${config.type === 'bomba_costal' ? 'bomba' : 'tanque'} de ${config.tankCapacity}L`,
          recomendacao: `Recomendação: ${product.doseInput} ${product.unit}`
        };
      });

      // Highlight the selected equipment
      const selectedIdx = EQUIPMENT_CONFIGS.findIndex(c => c.type === equipment.type);
      if (selectedIdx >= 0) {
        // Put selected method first and use actual equipment config
        const selectedConfig = {
          type: equipment.type,
          label: EQUIPMENT_CONFIGS[selectedIdx].label,
          icon: EQUIPMENT_CONFIGS[selectedIdx].icon,
          tankCapacity: equipment.tankCapacity,
          applicationRate: equipment.applicationRate,
        };
        const actualQty = calculateQuantityPerTank(
          product.unit,
          product.doseInput,
          selectedConfig.tankCapacity,
          selectedConfig.applicationRate
        );
        dosesPerMethod[selectedIdx] = {
          equipamento: `${selectedConfig.label} ★`,
          icon: selectedConfig.icon,
          dosePorUnidade: formatDoseVolume(actualQty, product.unit),
          unidadeLabel: `por ${equipment.type === 'bomba_costal' ? 'bomba' : 'tanque'} de ${equipment.tankCapacity}L`,
          recomendacao: `Recomendação: ${product.doseInput} ${product.unit}`
        };
      }

      // Equipment-specific application steps
      const equipLabel = equipment.type === 'bomba_costal' ? 'bomba costal' : equipment.type === 'drone' ? 'drone' : 'pulverizador tratorizado';
      const selectedQty = calculateQuantityPerTank(
        product.unit,
        product.doseInput,
        equipment.tankCapacity,
        equipment.applicationRate
      );

      productRecs.push({
        id: `spraying-${index}`,
        produto: product.name,
        categoria: type,
        icon,
        doseHa: `${product.doseInput} ${product.unit}`,
        quantidadeTotal: `${product.totalQuantity.toFixed(2)} ${product.unit.includes('Kg') ? 'kg' : 'L'}`,
        dosesPerMethod,
        quando: timing,
        como: {
          titulo: `Aplicação via ${equipLabel}`,
          passos: [
            `Adicione ${formatDoseVolume(selectedQty, product.unit)} de ${product.name} para cada ${equipment.type === 'bomba_costal' ? 'bomba' : 'tanque'} de ${equipment.tankCapacity}L`,
            `Taxa de aplicação: ${equipment.applicationRate} L/ha`,
            type === 'Adjuvante' 
              ? 'Adicione o adjuvante por último na calda, após todos os outros produtos' 
              : 'Adicione na água com agitação constante',
            `Para a área total de ${hectares} ha serão necessários ${product.totalQuantity.toFixed(2)} ${product.unit.includes('Kg') ? 'kg' : 'L'} do produto`,
            'Respeite o intervalo de segurança antes da colheita conforme a bula'
          ]
        },
        porQue: why,
        dicas: [
          'Aplique nas horas mais frescas do dia (início da manhã ou final da tarde)',
          'Verifique a umidade relativa do ar (acima de 55% para melhor absorção)',
          type === 'Herbicida' ? 'Aplique com as daninhas ainda jovens para maior eficácia' :
          type === 'Inseticida' ? 'Monitore a reinfestação após 7-14 dias da aplicação' :
          type === 'Fungicida' ? 'Em períodos chuvosos, reaplicar conforme recomendação do fabricante' :
          'Siga a bula do fabricante para diluição e compatibilidade'
        ],
        alertas: [
          'Não aplique com ventos acima de 10 km/h para evitar deriva',
          'Use EPI completo durante o manuseio e aplicação',
          'Observe o período de carência indicado na bula do produto'
        ]
      });
    });
  }

  if (productRecs.length === 0) {
    return (
      <Card className="border border-primary/30 bg-secondary/10">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Info className="h-8 w-8 mx-auto mb-2 text-primary" />
          <p>Nenhuma recomendação de produto disponível.</p>
          <p className="text-sm">Preencha os dados do solo e sementes para gerar recomendações.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 print:space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="h-5 w-5 text-primary print:h-4 print:w-4" />
        <h3 className="text-lg font-bold text-foreground print:text-base">
          Recomendações Detalhadas por Produto
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4 print:text-xs print:mb-2">
        Instruções completas de <strong>Quando</strong>, <strong>Como</strong> e <strong>Por quê</strong> para cada insumo do seu planejamento.
      </p>
      
      {productRecs.map((rec) => (
        <RecommendationCard key={rec.id} rec={rec} />
      ))}
    </div>
  );
}
