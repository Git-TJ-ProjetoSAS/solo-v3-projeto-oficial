// Faixas produtivas baseadas em produção de grãos (t/ha)
export type ProductivityRange = 'baixa' | 'media' | 'alta' | 'muito_alta';

export interface ProductivityLevel {
  label: string;
  grainRange: string;
  n: { min: number; max: number };
  p2o5: { min: number; max: number };
  k2o: { min: number; max: number };
  ca: { min: number; max: number };
  mg: { min: number; max: number };
  s: { min: number; max: number };
  // Micronutrientes em g/ha
  b: { min: number; max: number };
  zn: { min: number; max: number };
  cu: { min: number; max: number };
  mn: { min: number; max: number };
  fe: { min: number; max: number };
}

// Tabelas de extração por faixa produtiva (silagem - Matéria Natural t/ha)
export const PRODUCTIVITY_LEVELS: Record<ProductivityRange, ProductivityLevel> = {
  baixa: {
    label: 'Baixa (< 30 t/ha)',
    grainRange: '< 30',
    n: { min: 150, max: 180 },
    p2o5: { min: 60, max: 70 },
    k2o: { min: 30, max: 30 },
    ca: { min: 30, max: 40 },
    mg: { min: 20, max: 25 },
    s: { min: 15, max: 20 },
    b: { min: 150, max: 200 },
    zn: { min: 250, max: 350 },
    cu: { min: 60, max: 80 },
    mn: { min: 300, max: 500 },
    fe: { min: 1500, max: 2500 },
  },
  media: {
    label: 'Média (30 - 45 t/ha)',
    grainRange: '30 - 45',
    n: { min: 180, max: 220 },
    p2o5: { min: 70, max: 85 },
    k2o: { min: 30, max: 50 },
    ca: { min: 40, max: 50 },
    mg: { min: 25, max: 30 },
    s: { min: 20, max: 25 },
    b: { min: 200, max: 280 },
    zn: { min: 350, max: 500 },
    cu: { min: 80, max: 110 },
    mn: { min: 500, max: 700 },
    fe: { min: 2500, max: 3500 },
  },
  alta: {
    label: 'Alta (45 - 60 t/ha)',
    grainRange: '45 - 60',
    n: { min: 220, max: 260 },
    p2o5: { min: 85, max: 100 },
    k2o: { min: 50, max: 70 },
    ca: { min: 50, max: 60 },
    mg: { min: 30, max: 35 },
    s: { min: 25, max: 30 },
    b: { min: 280, max: 350 },
    zn: { min: 500, max: 700 },
    cu: { min: 110, max: 140 },
    mn: { min: 700, max: 900 },
    fe: { min: 3500, max: 4500 },
  },
  muito_alta: {
    label: 'Muito Alta (> 60 t/ha)',
    grainRange: '> 60',
    n: { min: 260, max: 320 },
    p2o5: { min: 100, max: 120 },
    k2o: { min: 70, max: 90 },
    ca: { min: 60, max: 70 },
    mg: { min: 35, max: 45 },
    s: { min: 30, max: 40 },
    b: { min: 350, max: 450 },
    zn: { min: 700, max: 900 },
    cu: { min: 140, max: 180 },
    mn: { min: 900, max: 1100 },
    fe: { min: 4500, max: 5500 },
  },
};

export interface RecommendationItem {
  produto: string;
  quantidade: number;
  unidade: string;
  quantidadePorHectare: number;
  quantidadeTotalArea: number;
  comoSeraFeito: string;
  quandoSeraFeito: string;
  observacoes: string;
  valorUnitario: number;
  valorTotal: number;
}

export interface Recommendation {
  id: string;
  farmId: string;
  soilAnalysisId: string;
  hectares: number;
  calagem: RecommendationItem;
  adubacaoPlantio: RecommendationItem;
  cobertura: RecommendationItem;
  correcaoPotassio: RecommendationItem;
  createdAt: Date;
}

// Função para calcular recomendação de calagem
export function calcularCalagem(
  vAtual: number,
  vDesejada: number,
  ctc: number,
  hectares: number,
  prnt: number = 90
): RecommendationItem {
  // Necessidade de calagem (NC) = (V2 - V1) × CTC / 100 / (PRNT/100)
  // Resultado em t/ha de calcário
  const ncPorHectare = vAtual < vDesejada 
    ? ((vDesejada - vAtual) * ctc) / 100 / (prnt / 100)
    : 0;
  
  const quantidadeTotal = ncPorHectare * hectares;
  const precoTonelada = 180; // Preço médio do calcário por tonelada

  return {
    produto: 'Calcário Dolomítico (PRNT 90%)',
    quantidade: quantidadeTotal,
    unidade: 't',
    quantidadePorHectare: ncPorHectare,
    quantidadeTotalArea: quantidadeTotal,
    comoSeraFeito: vAtual >= vDesejada 
      ? 'Não é necessário aplicar calcário neste momento.'
      : `Espalhe ${ncPorHectare.toFixed(2)} toneladas por hectare de forma uniforme em toda a área usando um distribuidor a lanço. Depois, passe a grade aradora para incorporar o calcário até 20cm de profundidade no solo.`,
    quandoSeraFeito: vAtual >= vDesejada 
      ? 'Sem necessidade no momento'
      : 'Faça a aplicação entre 60 e 90 dias ANTES do plantio. Esse tempo é necessário para que o calcário reaja com o solo e corrija a acidez.',
    observacoes: vAtual >= vDesejada 
      ? `Boa notícia! Seu solo já está com a saturação de bases (V%) em ${vAtual.toFixed(1)}%, que está adequada para o milho. Não precisa gastar com calagem agora.`
      : `Seu solo está com V% de ${vAtual.toFixed(1)}%, mas o milho precisa de pelo menos ${vDesejada}% para produzir bem. O calcário vai corrigir a acidez, fornecer cálcio e magnésio, e ajudar as raízes a absorverem melhor os nutrientes.`,
    valorUnitario: precoTonelada,
    valorTotal: quantidadeTotal * precoTonelada,
  };
}

// Função para calcular adubação de plantio (NPK) baseada na faixa produtiva
export function calcularAdubacaoPlantio(
  p: number,
  k: number,
  hectares: number,
  faixaProdutiva: ProductivityRange = 'media'
): RecommendationItem {
  const nivel = PRODUCTIVITY_LEVELS[faixaProdutiva];
  
  // P2O5 necessário baseado na faixa produtiva (média do range)
  const p2o5Necessario = (nivel.p2o5.min + nivel.p2o5.max) / 2;
  
  // Ajustar P2O5 baseado no teor de P no solo
  let fatorAjusteP = 1;
  if (p < 5) fatorAjusteP = 1.2; // Solo muito pobre, aumentar 20%
  else if (p < 10) fatorAjusteP = 1.1;
  else if (p < 20) fatorAjusteP = 1.0;
  else fatorAjusteP = 0.8; // Solo rico, reduzir 20%
  
  const p2o5Final = p2o5Necessario * fatorAjusteP;
  
  // K2O necessário baseado na faixa produtiva
  const k2oNecessario = (nivel.k2o.min + nivel.k2o.max) / 2;
  
  // Calcular quantidade de formulado NPK 08-28-16
  // 28% P2O5 no formulado
  const kgFormulado = p2o5Final / 0.28;
  
  // N fornecido pelo formulado (8%)
  const nFornecido = kgFormulado * 0.08;
  
  // K2O fornecido pelo formulado (16%)
  const k2oFornecido = kgFormulado * 0.16;
  
  const quantidadeTotal = kgFormulado * hectares;
  const precoSaca = 180;

  return {
    produto: 'Formulado NPK 08-28-16',
    quantidade: quantidadeTotal,
    unidade: 'kg',
    quantidadePorHectare: Math.round(kgFormulado),
    quantidadeTotalArea: Math.round(quantidadeTotal),
    comoSeraFeito: `Coloque ${Math.round(kgFormulado)} kg por hectare diretamente no sulco de plantio, junto com a semente. Use a plantadeira regulada para distribuir o adubo 5cm ao lado e 5cm abaixo da semente (evita queimar as raízes).`,
    quandoSeraFeito: 'No mesmo dia do plantio, usando a plantadeira. O adubo vai junto com a semente em uma única operação.',
    observacoes: `Este adubo vai fornecer os nutrientes que a planta precisa para começar bem: ${Math.round(nFornecido)} kg de Nitrogênio para crescimento inicial, ${Math.round(p2o5Final)} kg de Fósforo para as raízes crescerem fortes, e ${Math.round(k2oFornecido)} kg de Potássio. O restante do Nitrogênio e Potássio será aplicado depois, em cobertura.`,
    valorUnitario: precoSaca / 50,
    valorTotal: (quantidadeTotal / 50) * precoSaca,
  };
}

// Função para calcular adubação de cobertura baseada na faixa produtiva
export function calcularCobertura(
  mo: number,
  hectares: number,
  faixaProdutiva: ProductivityRange = 'media',
  nFornecidoPlantio: number = 0
): RecommendationItem {
  const nivel = PRODUCTIVITY_LEVELS[faixaProdutiva];
  
  // N total necessário baseado na faixa produtiva (média do range)
  const nTotal = (nivel.n.min + nivel.n.max) / 2;
  
  // Ajustar baseado na MO do solo (mineralização de N)
  let fatorMO = 1;
  if (mo >= 35) fatorMO = 0.85; // Solo com alta MO, reduzir 15%
  else if (mo >= 25) fatorMO = 0.92;
  else if (mo < 15) fatorMO = 1.1; // Solo com baixa MO, aumentar 10%
  
  // N necessário em cobertura = N total - N fornecido no plantio
  const nCobertura = Math.max(0, (nTotal * fatorMO) - nFornecidoPlantio);

  // Usando Ureia (45% N)
  const ureiaPorHectare = nCobertura / 0.45;
  const quantidadeTotal = ureiaPorHectare * hectares;
  const precoSaca = 150;

  return {
    produto: 'Ureia (45% N)',
    quantidade: quantidadeTotal,
    unidade: 'kg',
    quantidadePorHectare: Math.round(ureiaPorHectare),
    quantidadeTotalArea: Math.round(quantidadeTotal),
    comoSeraFeito: `Espalhe a ureia a lanço entre as fileiras de milho. IMPORTANTE: Aplique preferencialmente no final da tarde ou quando houver previsão de chuva nas próximas 24 horas. Isso evita perder nitrogênio por evaporação.`,
    quandoSeraFeito: `Divida em 2 aplicações: 1ª aplicação (${Math.round(ureiaPorHectare * 0.3)} kg/ha) quando o milho estiver com 4 folhas (estágio V4, cerca de 15-20 dias após plantio). 2ª aplicação (${Math.round(ureiaPorHectare * 0.7)} kg/ha) com 8 folhas (estágio V8, cerca de 30-35 dias após plantio).`,
    observacoes: `O Nitrogênio é o nutriente que mais influencia na produtividade do milho. Seu solo com ${mo.toFixed(1)} g/dm³ de matéria orgânica ${mo >= 25 ? 'já ajuda fornecendo parte do N, por isso a dose foi ajustada.' : 'tem baixa contribuição, então a planta depende mais do adubo.'} Total de N necessário: ${Math.round(nTotal * fatorMO)} kg/ha. Como já aplicamos ${Math.round(nFornecidoPlantio)} kg no plantio, faltam ${Math.round(nCobertura)} kg para aplicar em cobertura.`,
    valorUnitario: precoSaca / 50,
    valorTotal: (quantidadeTotal / 50) * precoSaca,
  };
}

// Função para calcular correção de potássio pré-plantio baseada na faixa produtiva
export function calcularCorrecaoPotassio(
  kSolo: number,
  ctc: number,
  hectares: number,
  faixaProdutiva: ProductivityRange = 'media',
  k2oFornecidoPlantio: number = 0
): RecommendationItem {
  const nivel = PRODUCTIVITY_LEVELS[faixaProdutiva];
  
  // K2O total necessário baseado na faixa produtiva
  const k2oTotal = (nivel.k2o.min + nivel.k2o.max) / 2;
  
  // K% atual na CTC (K em mg/dm³ convertido para cmolc/dm³ dividindo por 391)
  const kEmCmolc = kSolo / 391;
  const kAtualPercent = ctc > 0 ? (kEmCmolc / ctc) * 100 : 0;
  
  // Correção de K necessária (K2O total - K2O do plantio)
  // Considerar também a reposição para a cultura
  let k2oPorHectare = Math.max(0, k2oTotal - k2oFornecidoPlantio);
  
  // Se K% está baixo na CTC (< 3%), adicionar correção proporcional
  // Fórmula: (K% desejado - K% atual) * CTC * 391 * 1.2 / 1000
  // 391 = fator conversão cmolc para mg/dm³, 1.2 = fator K para K2O, /1000 ajuste para kg/ha
  if (kAtualPercent < 3 && ctc > 0) {
    // Elevar K para 3% da CTC
    const kDeficitCmolc = ((3 - kAtualPercent) / 100) * ctc;
    // Converter para kg/ha de K2O (considerando camada de 20cm = fator 2)
    const kCorrecaoK2O = kDeficitCmolc * 391 * 2 * 1.2 / 1000;
    k2oPorHectare += Math.max(0, kCorrecaoK2O);
  }

  // Usando KCl (60% K2O)
  const kclPorHectare = k2oPorHectare / 0.6;
  const quantidadeTotal = kclPorHectare * hectares;
  const precoSaca = 180;

  const kStatus = kAtualPercent < 3 
    ? `Seu solo tem apenas ${kAtualPercent.toFixed(1)}% de Potássio na CTC, que está baixo. Precisamos corrigir isso para garantir boa produção.`
    : `Seu solo já tem ${kAtualPercent.toFixed(1)}% de Potássio na CTC, que está adequado. Esta aplicação é apenas para repor o que a planta vai extrair.`;

  return {
    produto: 'Cloreto de Potássio (KCl 60%)',
    quantidade: quantidadeTotal,
    unidade: 'kg',
    quantidadePorHectare: Math.round(kclPorHectare),
    quantidadeTotalArea: Math.round(quantidadeTotal),
    comoSeraFeito: kclPorHectare > 0 
      ? `Espalhe ${Math.round(kclPorHectare)} kg por hectare de forma uniforme em toda a área usando distribuidor a lanço. Não precisa incorporar ao solo.`
      : 'Não é necessário aplicar KCl neste momento, o potássio do formulado de plantio será suficiente.',
    quandoSeraFeito: kclPorHectare > 0 
      ? 'Aplique entre 30 e 45 dias antes do plantio. Pode fazer no mesmo dia da calagem, mas em operação separada.'
      : 'Sem necessidade de aplicação adicional.',
    observacoes: `${kStatus} O Potássio é essencial para enchimento de grãos e resistência a doenças. No plantio, você já vai aplicar ${Math.round(k2oFornecidoPlantio)} kg/ha de K₂O junto com o formulado. ${kclPorHectare > 0 ? `Esta aplicação antecipada de ${Math.round(k2oPorHectare)} kg/ha de K₂O garante que a planta terá potássio suficiente durante todo o ciclo.` : ''}`,
    valorUnitario: precoSaca / 50,
    valorTotal: (quantidadeTotal / 50) * precoSaca,
  };
}

// Função auxiliar para calcular micronutrientes
export function calcularMicronutrientes(
  hectares: number,
  faixaProdutiva: ProductivityRange = 'media'
): {
  boro: RecommendationItem;
  zinco: RecommendationItem;
  cobre: RecommendationItem;
  manganes: RecommendationItem;
  ferro: RecommendationItem;
} {
  const nivel = PRODUCTIVITY_LEVELS[faixaProdutiva];
  
  const microDescriptions: Record<string, { como: string; quando: string; obs: string }> = {
    'Boro': {
      como: 'Aplique via foliar diluindo em água conforme recomendação do fabricante. Use pulverizador com bicos adequados para cobertura uniforme.',
      quando: 'Faça 2-3 aplicações: a primeira no estágio V6-V8 e as demais a cada 15 dias. O Boro é importante na formação das espigas.',
      obs: 'O Boro ajuda na formação do pólen e no enchimento de grãos. Deficiência causa espigas mal formadas e falhas de grãos.',
    },
    'Zinco': {
      como: 'Pode aplicar no solo junto com o adubo de plantio ou via foliar. Na aplicação foliar, dilua em água e pulverize nas folhas.',
      quando: 'Se for no solo, aplique no plantio. Se for foliar, aplique em V4-V6 quando as plantas estão crescendo ativamente.',
      obs: 'O Zinco é essencial para o crescimento inicial do milho. Solos arenosos e com alto pH costumam ter deficiência.',
    },
    'Cobre': {
      como: 'Aplicação via foliar é mais eficiente. Dilua o produto em água e pulverize uniformemente sobre as folhas.',
      quando: 'Aplique entre V6 e V10, quando a planta está em pleno crescimento vegetativo.',
      obs: 'O Cobre ajuda na fotossíntese e resistência a doenças. Solos orgânicos e arenosos costumam ser deficientes.',
    },
    'Manganês': {
      como: 'Aplicação via foliar com pulverizador. Dilua conforme recomendação e aplique nas horas mais frescas do dia.',
      quando: 'Aplique em V4-V8. Se notar folhas com listras amareladas entre as nervuras, aplique imediatamente.',
      obs: 'O Manganês participa da fotossíntese. Deficiência aparece como listras amarelas nas folhas mais novas.',
    },
    'Ferro': {
      como: 'Aplicação via foliar quando necessário. É raro precisar suplementar Ferro em solos brasileiros.',
      quando: 'Apenas se identificar deficiência visual (folhas novas amarelas com nervuras verdes).',
      obs: 'Deficiência de Ferro é rara em milho, exceto em solos muito calcários. Geralmente o solo supre a demanda.',
    },
  };

  const createMicroItem = (
    nome: string,
    nutriente: { min: number; max: number },
    produto: string,
    concentracao: number,
    precoKg: number
  ): RecommendationItem => {
    const necessidadeGramas = (nutriente.min + nutriente.max) / 2;
    const necessidadeKg = necessidadeGramas / 1000;
    const produtoPorHectare = necessidadeKg / concentracao;
    const quantidadeTotal = produtoPorHectare * hectares;
    const desc = microDescriptions[nome] || { como: '', quando: '', obs: '' };
    
    return {
      produto,
      quantidade: quantidadeTotal,
      unidade: 'kg',
      quantidadePorHectare: produtoPorHectare,
      quantidadeTotalArea: quantidadeTotal,
      comoSeraFeito: desc.como,
      quandoSeraFeito: desc.quando,
      observacoes: `${desc.obs} Necessidade estimada: ${Math.round(necessidadeGramas)} gramas por hectare.`,
      valorUnitario: precoKg,
      valorTotal: quantidadeTotal * precoKg,
    };
  };

  return {
    boro: createMicroItem('Boro', nivel.b, 'Ácido Bórico (17% B)', 0.17, 12),
    zinco: createMicroItem('Zinco', nivel.zn, 'Sulfato de Zinco (22% Zn)', 0.22, 8),
    cobre: createMicroItem('Cobre', nivel.cu, 'Sulfato de Cobre (25% Cu)', 0.25, 15),
    manganes: createMicroItem('Manganês', nivel.mn, 'Sulfato de Manganês (32% Mn)', 0.32, 6),
    ferro: createMicroItem('Ferro', nivel.fe, 'Sulfato Ferroso (20% Fe)', 0.20, 4),
  };
}
