import type { InsumoFormData } from '@/types/insumo';
import type { WizardSoilData, WizardSeedData } from '@/contexts/WizardContext';
import { ProductivityRange, PRODUCTIVITY_LEVELS } from '@/types/recommendation';

export interface InsumoRecomendado {
  id: string;
  nome: string;
  marca: string;
  tipoProduto: string;
  quantidadePorHa: number;
  quantidadeTotal: number;
  unidade: string;
  precoUnitario: number;
  custoTotal: number;
  nutrientesFornecidos: {
    n?: number;
    p2o5?: number;
    k2o?: number;
    s?: number;
    cao?: number;
    mgo?: number;
    b?: number;
    zn?: number;
    cu?: number;
    mn?: number;
    fe?: number;
    mo?: number;
  };
  observacao: string;
}

export interface RecommendationEngineResult {
  calagem: {
    necessaria: boolean;
    ncPorHa: number;
    quantidadeTotal: number;
    produto: string;
    prnt: number;
    custoEstimado: number;
    insumoSelecionado: InsumoRecomendado | null;
  };
  adubacaoPlantio: {
    nNecessario: number;
    p2o5Necessario: number;
    k2oNecessario: number;
    formulaSugerida: string;
    quantidadePorHa: number;
    quantidadeTotal: number;
    custoEstimado: number;
    insumosSelecionados: InsumoRecomendado[];
  };
  cobertura: {
    nNecessario: number;
    nFornecidoPlantio: number;
    nCobertura: number;
    sNecessario: number;
    sFornecido: number;
    quantidadePorHa: number;
    quantidadeTotal: number;
    custoEstimado: number;
    insumosSelecionados: InsumoRecomendado[];
  };
  correcaoPotassio: {
    k2oNecessario: number;
    k2oFornecidoPlantio: number;
    k2oCorrecao: number;
    quantidadePorHa: number;
    quantidadeTotal: number;
    custoEstimado: number;
    insumosSelecionados: InsumoRecomendado[];
  };
  micronutrientes: {
    bNecessario: number;
    bFornecido: number;
    znNecessario: number;
    znFornecido: number;
    cuNecessario: number;
    cuFornecido: number;
    mnNecessario: number;
    mnFornecido: number;
    feNecessario: number;
    feFornecido: number;
    custoEstimado: number;
    insumosSelecionados: InsumoRecomendado[];
  };
  outrosInsumos: InsumoRecomendado[];
  custoTotalGeral: number;
  custoPorHa: number;
  observacoes: string[];
  texturaEstimada: 'arenosa' | 'media' | 'argilosa';
  parcelamentoCobertura: {
    parcelas: number;
    descricao: string;
  };
}

// Criar InsumoRecomendado a partir de um insumo do banco
function criarInsumoRecomendado(
  insumo: InsumoFormData & { id: string },
  quantidadePorHa: number,
  hectares: number,
  nutrientesFornecidos: InsumoRecomendado['nutrientesFornecidos'],
  observacao: string
): InsumoRecomendado {
  const quantidadeTotal = quantidadePorHa * hectares;
  
  // Calcular preço por unidade (kg ou litro)
  const precoPorUnidade = insumo.preco / insumo.tamanhoUnidade;
  const unidade = insumo.medida;
  
  const custoTotal = quantidadeTotal * precoPorUnidade;
  
  // Converter para exibição
  const displayUnidade = insumo.medida === 'kg' ? 'kg' : 'L';

  return {
    id: insumo.id,
    nome: insumo.nome,
    marca: insumo.marca,
    tipoProduto: insumo.tipoProduto,
    quantidadePorHa,
    quantidadeTotal,
    unidade: displayUnidade,
    precoUnitario: precoPorUnidade,
    custoTotal,
    nutrientesFornecidos,
    observacao,
  };
}

// Processar TODOS os insumos de correção selecionados
function processarCorretivos(
  insumos: (InsumoFormData & { id: string })[],
  ncPorHa: number,
  hectares: number
): InsumoRecomendado | null {
  const corretivos = insumos.filter(
    i => i.tipoProduto === 'Correção de Solo' && i.correcao.prnt > 0
  );

  if (corretivos.length === 0 || ncPorHa <= 0) return null;

  // Usar o melhor corretivo (maior PRNT)
  const melhorCorretivo = corretivos.sort((a, b) => b.correcao.prnt - a.correcao.prnt)[0];
  
  const prnt = melhorCorretivo.correcao.prnt || 90;
  const quantidadePorHa = ncPorHa * (100 / prnt);
  
  return criarInsumoRecomendado(
    melhorCorretivo,
    quantidadePorHa,
    hectares,
    {
      cao: melhorCorretivo.correcao.caco3,
      mgo: melhorCorretivo.correcao.camg,
    },
    `PRNT: ${prnt}%. ${melhorCorretivo.correcao.caco3}% CaO, ${melhorCorretivo.correcao.camg}% MgO.`
  );
}

// Processar insumos de plantio — prioriza o produto com MAIOR concentração de P₂O₅ por embalagem
function processarPlantio(
  insumos: (InsumoFormData & { id: string })[],
  p2o5Necessario: number,
  hectares: number
): InsumoRecomendado[] {
  const formulados = insumos.filter(
    i => i.tipoProduto === 'Plantio' && 
    (i.macronutrientes.p2o5 > 0 || i.macronutrientes.k2o > 0 || i.macronutrientes.n > 0)
  );

  // Only use formulados with actual P₂O₅ for planting fertilization
  const formuladosComP = formulados.filter(f => f.macronutrientes.p2o5 > 0);
  if (formuladosComP.length === 0) return [];

  // Ordenar por kg de P₂O₅ por embalagem (concentração × tamanho), decrescente
  const ordenados = [...formuladosComP].sort((a, b) => {
    const pPorSacoA = (a.macronutrientes.p2o5 / 100) * a.tamanhoUnidade;
    const pPorSacoB = (b.macronutrientes.p2o5 / 100) * b.tamanhoUnidade;
    return pPorSacoB - pPorSacoA;
  });

  // Use ONLY the best single product to avoid accumulating costs across all products
  const melhor = ordenados[0];
  const p2o5Concentracao = melhor.macronutrientes.p2o5 / 100;
  const quantidadePorHa = p2o5Necessario / p2o5Concentracao;

  // Cap at a reasonable agronomic maximum (600 kg/ha)
  const quantidadeCapped = Math.min(quantidadePorHa, 600);

  const nFornecido = quantidadeCapped * (melhor.macronutrientes.n / 100);
  const p2o5Fornecido = quantidadeCapped * (melhor.macronutrientes.p2o5 / 100);
  const k2oFornecido = quantidadeCapped * (melhor.macronutrientes.k2o / 100);
  const sFornecido = quantidadeCapped * (melhor.macronutrientes.s / 100);
  const kgPorSaco = p2o5Concentracao * melhor.tamanhoUnidade;

  return [criarInsumoRecomendado(
    melhor,
    quantidadeCapped,
    hectares,
    {
      n: nFornecido,
      p2o5: p2o5Fornecido,
      k2o: k2oFornecido,
      s: sFornecido,
    },
    `Fórmula: ${melhor.macronutrientes.n}-${melhor.macronutrientes.p2o5}-${melhor.macronutrientes.k2o}${melhor.macronutrientes.s > 0 ? ` + ${melhor.macronutrientes.s}S` : ''} (${kgPorSaco.toFixed(1)} kg P₂O₅/${melhor.tamanhoUnidade}${melhor.medida === 'kg' ? 'kg' : 'L'})`
  )];
}

// Processar insumos de cobertura selecionados (N e S)
// ESTRATÉGIA DE PRIORIDADE AGRONÔMICA:
// 1. Fonte com MAIOR concentração de S → dose mínima para cobrir demanda de S
// 2. Fonte com MAIOR concentração de N → recebe TODO o N restante
// 3. Fontes secundárias (NPKs, etc.) → só entram se as fontes puras não estiverem disponíveis
function processarCobertura(
  insumos: (InsumoFormData & { id: string })[],
  nNecessario: number,
  sNecessario: number,
  hectares: number
): { insumos: InsumoRecomendado[]; nFornecido: number; sFornecido: number } {
  const fontesCobertura = insumos.filter(
    i => i.tipoProduto === 'Cobertura' && (i.macronutrientes.n > 0 || i.macronutrientes.s > 0)
  );

  if (fontesCobertura.length === 0) {
    return { insumos: [], nFornecido: 0, sFornecido: 0 };
  }

  const resultado: InsumoRecomendado[] = [];
  let nTotalFornecido = 0;
  let sTotalFornecido = 0;

  // PASSO 1: Identificar a MELHOR fonte de S (maior concentração de S)
  const fontesComS = fontesCobertura
    .filter(f => f.macronutrientes.s > 0)
    .sort((a, b) => b.macronutrientes.s - a.macronutrientes.s);

  const fontesJaUsadas = new Set<string>();

  if (fontesComS.length > 0 && sNecessario > 0) {
    const fonteS = fontesComS[0]; // Melhor fonte de S (ex: Sulfato de Amônio)
    const sConc = fonteS.macronutrientes.s / 100;
    const nConc = fonteS.macronutrientes.n / 100;

    const quantidadePorHa = Math.min(sNecessario / sConc, 300); // Cap at 300 kg/ha
    const nFornecido = quantidadePorHa * nConc;
    const sFornecido = quantidadePorHa * sConc;
    const kgSPorSaco = sConc * fonteS.tamanhoUnidade;

    nTotalFornecido += nFornecido;
    sTotalFornecido += sFornecido;
    fontesJaUsadas.add(fonteS.id);

    resultado.push(criarInsumoRecomendado(
      fonteS,
      quantidadePorHa,
      hectares,
      { n: nFornecido, s: sFornecido },
      `${fonteS.macronutrientes.n}% N, ${fonteS.macronutrientes.s}% S (${kgSPorSaco.toFixed(1)} kg S/${fonteS.tamanhoUnidade}${fonteS.medida === 'kg' ? 'kg' : 'L'}). Fonte primária de Enxofre.`
    ));
  }

  // PASSO 2: N restante → vai para a fonte com MAIOR concentração de N
  const nRestante = Math.max(0, nNecessario - nTotalFornecido);

  if (nRestante > 0) {
    // Ordenar por concentração de N (decrescente), excluindo a fonte já usada para S
    const fontesN = fontesCobertura
      .filter(f => f.macronutrientes.n > 0 && !fontesJaUsadas.has(f.id))
      .sort((a, b) => b.macronutrientes.n - a.macronutrientes.n);

    if (fontesN.length > 0) {
      // Usar a fonte com MAIOR N (ex: Ureia 45%) para todo o restante
      const fonteN = fontesN[0];
      const nConc = fonteN.macronutrientes.n / 100;
      const quantidadePorHa = Math.min(nRestante / nConc, 500); // Cap at 500 kg/ha
      const nFornecido = quantidadePorHa * nConc;
      const k2oConc = fonteN.macronutrientes.k2o / 100;
      const k2oFornecido = quantidadePorHa * k2oConc;
      const kgNPorSaco = nConc * fonteN.tamanhoUnidade;

      nTotalFornecido += nFornecido;
      fontesJaUsadas.add(fonteN.id);

      const nutrientes: InsumoRecomendado['nutrientesFornecidos'] = { n: nFornecido };
      if (k2oFornecido > 0) nutrientes.k2o = k2oFornecido;

      resultado.push(criarInsumoRecomendado(
        fonteN,
        quantidadePorHa,
        hectares,
        nutrientes,
        `${fonteN.macronutrientes.n}% N${k2oConc > 0 ? `, ${fonteN.macronutrientes.k2o}% K₂O` : ''} (${kgNPorSaco.toFixed(1)} kg N/${fonteN.tamanhoUnidade}${fonteN.medida === 'kg' ? 'kg' : 'L'}). Fonte primária de Nitrogênio.`
      ));
    }
  }

  return { insumos: resultado, nFornecido: nTotalFornecido, sFornecido: sTotalFornecido };
}

// Processar fontes de potássio — prioriza maior kg K₂O por embalagem
function processarPotassio(
  insumos: (InsumoFormData & { id: string })[],
  k2oNecessario: number,
  hectares: number
): InsumoRecomendado[] {
  const fontesK = insumos.filter(
    i => (i.tipoProduto === 'Cobertura' || i.tipoProduto === 'Plantio') && 
    i.macronutrientes.k2o > 30
  );

  if (fontesK.length === 0 || k2oNecessario <= 0) return [];

  // Ordenar por kg K₂O por embalagem (concentração × tamanho), decrescente
  const ordenados = [...fontesK].sort((a, b) => {
    const kPorSacoA = (a.macronutrientes.k2o / 100) * a.tamanhoUnidade;
    const kPorSacoB = (b.macronutrientes.k2o / 100) * b.tamanhoUnidade;
    return kPorSacoB - kPorSacoA;
  });

  // Use ONLY the best potassium source (highest K₂O per package)
  const melhor = ordenados[0];
  const k2oConcentracao = melhor.macronutrientes.k2o / 100;
  const quantidadePorHa = Math.min(k2oNecessario / k2oConcentracao, 400); // Cap at 400 kg/ha
  const kgKPorSaco = k2oConcentracao * melhor.tamanhoUnidade;
  const k2oFornecido = quantidadePorHa * k2oConcentracao;

  return [criarInsumoRecomendado(
    melhor,
    quantidadePorHa,
    hectares,
    { k2o: k2oFornecido },
    `${melhor.macronutrientes.k2o}% K₂O (${kgKPorSaco.toFixed(1)} kg K₂O/${melhor.tamanhoUnidade}${melhor.medida === 'kg' ? 'kg' : 'L'}). Aplicar a lanço 30-45 dias antes do plantio.`
  )];
}

// Processar micronutrientes com PRIORIDADE: 1º Plantio, 2º Cobertura, 3º Foliar
// Primeiro busca ao máximo nos adubos de plantio e cobertura, depois completa com foliares
function processarMicronutrientes(
  insumos: (InsumoFormData & { id: string })[],
  insumosPlantio: InsumoRecomendado[],
  insumosCobertura: InsumoRecomendado[],
  hectares: number,
  faixaProdutiva: ProductivityRange
): { insumos: InsumoRecomendado[]; fornecido: { b: number; zn: number; cu: number; mn: number; fe: number; mo: number } } {
  const nivel = PRODUCTIVITY_LEVELS[faixaProdutiva];
  
  const resultado: InsumoRecomendado[] = [];
  const totalFornecido = { b: 0, zn: 0, cu: 0, mn: 0, fe: 0, mo: 0 };

  // Necessidade em kg/ha (convertendo de g/ha)
  const necessidade = {
    b: ((nivel.b.min + nivel.b.max) / 2) / 1000,
    zn: ((nivel.zn.min + nivel.zn.max) / 2) / 1000,
    cu: ((nivel.cu.min + nivel.cu.max) / 2) / 1000,
    mn: ((nivel.mn.min + nivel.mn.max) / 2) / 1000,
    fe: ((nivel.fe.min + nivel.fe.max) / 2) / 1000,
    mo: 0.01, // Mo geralmente em doses muito baixas
  };

  // Rastrear necessidade restante
  const restante = { ...necessidade };

  // PASSO 1: Contabilizar micronutrientes já fornecidos pelos adubos de PLANTIO
  insumosPlantio.forEach(insumoPlantio => {
    const fonteOriginal = insumos.find(i => i.id === insumoPlantio.id);
    if (!fonteOriginal) return;

    const quantidadePorHa = insumoPlantio.quantidadePorHa;
    
    // Calcular micros fornecidos pelo adubo de plantio
    const microFornecido = {
      b: quantidadePorHa * (fonteOriginal.micronutrientes.b / 100),
      zn: quantidadePorHa * (fonteOriginal.micronutrientes.zn / 100),
      cu: quantidadePorHa * (fonteOriginal.micronutrientes.cu / 100),
      mn: quantidadePorHa * (fonteOriginal.micronutrientes.mn / 100),
      fe: quantidadePorHa * (fonteOriginal.micronutrientes.fe / 100),
      mo: quantidadePorHa * (fonteOriginal.micronutrientes.mo / 100),
    };

    // Acumular e descontar da necessidade
    totalFornecido.b += microFornecido.b;
    totalFornecido.zn += microFornecido.zn;
    totalFornecido.cu += microFornecido.cu;
    totalFornecido.mn += microFornecido.mn;
    totalFornecido.fe += microFornecido.fe;
    totalFornecido.mo += microFornecido.mo;

    restante.b = Math.max(0, restante.b - microFornecido.b);
    restante.zn = Math.max(0, restante.zn - microFornecido.zn);
    restante.cu = Math.max(0, restante.cu - microFornecido.cu);
    restante.mn = Math.max(0, restante.mn - microFornecido.mn);
    restante.fe = Math.max(0, restante.fe - microFornecido.fe);
    restante.mo = Math.max(0, restante.mo - microFornecido.mo);
  });

  // PASSO 2: Contabilizar micronutrientes já fornecidos pelos adubos de COBERTURA
  insumosCobertura.forEach(insumoCobertura => {
    const fonteOriginal = insumos.find(i => i.id === insumoCobertura.id);
    if (!fonteOriginal) return;

    const quantidadePorHa = insumoCobertura.quantidadePorHa;
    
    // Calcular micros fornecidos pelo adubo de cobertura
    const microFornecido = {
      b: quantidadePorHa * (fonteOriginal.micronutrientes.b / 100),
      zn: quantidadePorHa * (fonteOriginal.micronutrientes.zn / 100),
      cu: quantidadePorHa * (fonteOriginal.micronutrientes.cu / 100),
      mn: quantidadePorHa * (fonteOriginal.micronutrientes.mn / 100),
      fe: quantidadePorHa * (fonteOriginal.micronutrientes.fe / 100),
      mo: quantidadePorHa * (fonteOriginal.micronutrientes.mo / 100),
    };

    // Acumular e descontar da necessidade
    totalFornecido.b += microFornecido.b;
    totalFornecido.zn += microFornecido.zn;
    totalFornecido.cu += microFornecido.cu;
    totalFornecido.mn += microFornecido.mn;
    totalFornecido.fe += microFornecido.fe;
    totalFornecido.mo += microFornecido.mo;

    restante.b = Math.max(0, restante.b - microFornecido.b);
    restante.zn = Math.max(0, restante.zn - microFornecido.zn);
    restante.cu = Math.max(0, restante.cu - microFornecido.cu);
    restante.mn = Math.max(0, restante.mn - microFornecido.mn);
    restante.fe = Math.max(0, restante.fe - microFornecido.fe);
    restante.mo = Math.max(0, restante.mo - microFornecido.mo);
  });

  // PASSO 3: Buscar fontes específicas de micronutrientes (FTE, Correção de Solo com micros)
  // Priorizar pelo produto com maior kg do micro mais deficitário por embalagem
  const fontesMicroSolo = insumos.filter(i => 
    (i.tipoProduto === 'Correção de Solo') &&
    (i.micronutrientes.b > 0 || i.micronutrientes.zn > 0 || i.micronutrientes.cu > 0 ||
     i.micronutrientes.mn > 0 || i.micronutrientes.fe > 0 || i.micronutrientes.mo > 0) &&
    (i.culturas.length === 0 || i.culturas.some(c => c.toLowerCase().includes('milho')))
  );

  // Identificar o micro com maior déficit restante para ordenar
  const getMicroScore = (fonte: InsumoFormData & { id: string }) => {
    const micros = ['b', 'zn', 'cu', 'mn', 'fe', 'mo'] as const;
    let bestScore = 0;
    for (const m of micros) {
      if (restante[m] <= 0) continue;
      const conc = fonte.micronutrientes[m] / 100;
      const kgPorSaco = conc * fonte.tamanhoUnidade;
      bestScore = Math.max(bestScore, kgPorSaco * (restante[m] / Math.max(necessidade[m], 0.001)));
    }
    return bestScore;
  };

  // Ordenar por melhor cobertura do déficit por embalagem
  const fontesMicroOrdenadas = [...fontesMicroSolo].sort((a, b) => getMicroScore(b) - getMicroScore(a));

  fontesMicroOrdenadas.forEach(fonte => {
    // Pular se não há mais déficit
    const temDeficitLocal = restante.b > 0 || restante.zn > 0 || restante.cu > 0 || 
                            restante.mn > 0 || restante.fe > 0 || restante.mo > 0;
    if (!temDeficitLocal) return;

    const microConcentracoes = {
      b: fonte.micronutrientes.b / 100,
      zn: fonte.micronutrientes.zn / 100,
      cu: fonte.micronutrientes.cu / 100,
      mn: fonte.micronutrientes.mn / 100,
      fe: fonte.micronutrientes.fe / 100,
      mo: fonte.micronutrientes.mo / 100,
    };

    // Calcular dose pelo micro mais deficitário que este produto melhor fornece
    let quantidadePorHa = 0;
    let microPrincipal = '';
    let melhorRelacao = 0;

    const micros = ['b', 'zn', 'cu', 'mn', 'fe', 'mo'] as const;
    for (const m of micros) {
      if (restante[m] <= 0 || microConcentracoes[m] <= 0) continue;
      const kgPorSaco = microConcentracoes[m] * fonte.tamanhoUnidade;
      const relacao = kgPorSaco / restante[m];
      if (kgPorSaco > melhorRelacao) {
        melhorRelacao = kgPorSaco;
        microPrincipal = m;
        quantidadePorHa = restante[m] / microConcentracoes[m];
      }
    }

    if (quantidadePorHa <= 0) return;

    const fornecido = {
      b: quantidadePorHa * microConcentracoes.b,
      zn: quantidadePorHa * microConcentracoes.zn,
      cu: quantidadePorHa * microConcentracoes.cu,
      mn: quantidadePorHa * microConcentracoes.mn,
      fe: quantidadePorHa * microConcentracoes.fe,
      mo: quantidadePorHa * microConcentracoes.mo,
    };

    totalFornecido.b += fornecido.b;
    totalFornecido.zn += fornecido.zn;
    totalFornecido.cu += fornecido.cu;
    totalFornecido.mn += fornecido.mn;
    totalFornecido.fe += fornecido.fe;
    totalFornecido.mo += fornecido.mo;

    restante.b = Math.max(0, restante.b - fornecido.b);
    restante.zn = Math.max(0, restante.zn - fornecido.zn);
    restante.cu = Math.max(0, restante.cu - fornecido.cu);
    restante.mn = Math.max(0, restante.mn - fornecido.mn);
    restante.fe = Math.max(0, restante.fe - fornecido.fe);
    restante.mo = Math.max(0, restante.mo - fornecido.mo);

    const microInfo = [];
    if (fonte.micronutrientes.b > 0) microInfo.push(`B: ${fonte.micronutrientes.b}%`);
    if (fonte.micronutrientes.zn > 0) microInfo.push(`Zn: ${fonte.micronutrientes.zn}%`);
    if (fonte.micronutrientes.cu > 0) microInfo.push(`Cu: ${fonte.micronutrientes.cu}%`);
    if (fonte.micronutrientes.mn > 0) microInfo.push(`Mn: ${fonte.micronutrientes.mn}%`);
    if (fonte.micronutrientes.fe > 0) microInfo.push(`Fe: ${fonte.micronutrientes.fe}%`);
    if (fonte.micronutrientes.mo > 0) microInfo.push(`Mo: ${fonte.micronutrientes.mo}%`);

    const kgPrincipal = microPrincipal ? (fonte.micronutrientes[microPrincipal as keyof typeof fonte.micronutrientes] as number / 100) * fonte.tamanhoUnidade : 0;

    resultado.push(criarInsumoRecomendado(
      fonte,
      quantidadePorHa,
      hectares,
      fornecido,
      `${microInfo.join(', ')} (${kgPrincipal.toFixed(2)} kg ${microPrincipal.toUpperCase()}/${fonte.tamanhoUnidade}${fonte.medida === 'kg' ? 'kg' : 'L'}). Aplicar a lanço no solo junto com o plantio.`
    ));
  });

  // PASSO 4: Se ainda há déficit, buscar FOLIARES — priorizar por maior kg do micro/embalagem
  const temDeficit = restante.b > 0 || restante.zn > 0 || restante.cu > 0 || 
                     restante.mn > 0 || restante.fe > 0 || restante.mo > 0;

  if (temDeficit) {
    const fontesFoliar = insumos.filter(i => 
      i.tipoProduto === 'Foliar' &&
      (i.micronutrientes.b > 0 || i.micronutrientes.zn > 0 || i.micronutrientes.cu > 0 ||
       i.micronutrientes.mn > 0 || i.micronutrientes.fe > 0 || i.micronutrientes.mo > 0) &&
      (i.culturas.length === 0 || i.culturas.some(c => c.toLowerCase().includes('milho')))
    );

    // Ordenar por maior cobertura do déficit restante por embalagem
    const foliarOrdenadas = [...fontesFoliar].sort((a, b) => getMicroScore(b) - getMicroScore(a));

    foliarOrdenadas.forEach(fonte => {
      const temDeficitLocal = restante.b > 0 || restante.zn > 0 || restante.cu > 0 || 
                              restante.mn > 0 || restante.fe > 0 || restante.mo > 0;
      if (!temDeficitLocal) return;

      const microConcentracoes = {
        b: fonte.micronutrientes.b / 100,
        zn: fonte.micronutrientes.zn / 100,
        cu: fonte.micronutrientes.cu / 100,
        mn: fonte.micronutrientes.mn / 100,
        fe: fonte.micronutrientes.fe / 100,
        mo: fonte.micronutrientes.mo / 100,
      };

      // Calcular dose pelo micro com maior kg/embalagem que ainda tem déficit
      let quantidadePorHa = 0;
      let microPrincipalFoliar = '';
      let melhorKgSaco = 0;

      const micros = ['b', 'zn', 'cu', 'mn', 'fe', 'mo'] as const;
      for (const m of micros) {
        if (restante[m] <= 0 || microConcentracoes[m] <= 0) continue;
        const kgPorSaco = microConcentracoes[m] * fonte.tamanhoUnidade;
        if (kgPorSaco > melhorKgSaco) {
          melhorKgSaco = kgPorSaco;
          microPrincipalFoliar = m;
          quantidadePorHa = Math.min(restante[m] / microConcentracoes[m], 5); // Max 5 L/ha foliar
        }
      }

      if (quantidadePorHa <= 0) return;

      const fornecido = {
        b: quantidadePorHa * microConcentracoes.b,
        zn: quantidadePorHa * microConcentracoes.zn,
        cu: quantidadePorHa * microConcentracoes.cu,
        mn: quantidadePorHa * microConcentracoes.mn,
        fe: quantidadePorHa * microConcentracoes.fe,
        mo: quantidadePorHa * microConcentracoes.mo,
      };

      totalFornecido.b += fornecido.b;
      totalFornecido.zn += fornecido.zn;
      totalFornecido.cu += fornecido.cu;
      totalFornecido.mn += fornecido.mn;
      totalFornecido.fe += fornecido.fe;
      totalFornecido.mo += fornecido.mo;

      restante.b = Math.max(0, restante.b - fornecido.b);
      restante.zn = Math.max(0, restante.zn - fornecido.zn);
      restante.cu = Math.max(0, restante.cu - fornecido.cu);
      restante.mn = Math.max(0, restante.mn - fornecido.mn);
      restante.fe = Math.max(0, restante.fe - fornecido.fe);
      restante.mo = Math.max(0, restante.mo - fornecido.mo);

      const microInfo = [];
      if (fonte.micronutrientes.b > 0) microInfo.push(`B: ${fonte.micronutrientes.b}%`);
      if (fonte.micronutrientes.zn > 0) microInfo.push(`Zn: ${fonte.micronutrientes.zn}%`);
      if (fonte.micronutrientes.cu > 0) microInfo.push(`Cu: ${fonte.micronutrientes.cu}%`);
      if (fonte.micronutrientes.mn > 0) microInfo.push(`Mn: ${fonte.micronutrientes.mn}%`);
      if (fonte.micronutrientes.fe > 0) microInfo.push(`Fe: ${fonte.micronutrientes.fe}%`);
      if (fonte.micronutrientes.mo > 0) microInfo.push(`Mo: ${fonte.micronutrientes.mo}%`);

      const kgPrincipalFoliar = microPrincipalFoliar ? (fonte.micronutrientes[microPrincipalFoliar as keyof typeof fonte.micronutrientes] as number / 100) * fonte.tamanhoUnidade : 0;

      resultado.push(criarInsumoRecomendado(
        fonte,
        quantidadePorHa,
        hectares,
        fornecido,
        `${microInfo.join(', ')} (${kgPrincipalFoliar.toFixed(2)} kg ${microPrincipalFoliar.toUpperCase()}/${fonte.tamanhoUnidade}${fonte.medida === 'kg' ? 'kg' : 'L'}). Foliar para complementar déficit. Parcelar em 2-3 aplicações.`
      ));
    });
  }

  return { insumos: resultado, fornecido: totalFornecido };
}

// Processar outros insumos (defensivos, adjuvantes)
function processarOutros(
  insumos: (InsumoFormData & { id: string })[],
  hectares: number
): InsumoRecomendado[] {
  const outros = insumos.filter(
    i => ['Fungicida', 'Inseticida', 'Herbicida', 'Adjuvantes'].includes(i.tipoProduto)
  );

  return outros.map(insumo => {
    const quantidadePorHa = insumo.tamanhoUnidade / 20; // Dose estimada
    
    return criarInsumoRecomendado(
      insumo,
      quantidadePorHa,
      hectares,
      {},
      insumo.observacoes || 'Aplicar conforme recomendação técnica.'
    );
  });
}

export function calcularRecomendacaoComInsumos(
  soil: WizardSoilData,
  seed: WizardSeedData | null,
  insumos: (InsumoFormData & { id: string })[],
  hectares: number,
  faixaProdutiva: ProductivityRange = 'media'
): RecommendationEngineResult {
  const nivel = PRODUCTIVITY_LEVELS[faixaProdutiva];
  const observacoes: string[] = [];

  // === CALAGEM ===
  // === TEXTURA ESTIMADA ===
  const textura: 'arenosa' | 'media' | 'argilosa' = soil.mo < 15 ? 'arenosa' : soil.mo <= 30 ? 'media' : 'argilosa';
  const parcelasTextura = textura === 'arenosa' ? { parcelas: 4, descricao: 'Parcelar em 4 aplicações (V2: 15%, V4: 30%, V6: 30%, V8: 25%) — solo arenoso, alto risco de lixiviação' }
    : textura === 'media' ? { parcelas: 3, descricao: 'Parcelar em 3 aplicações (V2: 20%, V4: 40%, V8: 40%) — solo de textura média' }
    : { parcelas: 2, descricao: 'Parcelar em 2 aplicações: V4 (40%) e V8 (60%) — solo argiloso, boa retenção' };

  const vAtual = soil.vPercent;
  const vDesejada = 65;
  const kEmCmolc = soil.k / 391;
  const sb = soil.ca + soil.mg + kEmCmolc;
  const ctc = sb + soil.hAl;
  
  const ncBase = vAtual < vDesejada 
    ? ((vDesejada - vAtual) * ctc) / 100
    : 0;
  
  const calagemInsumo = processarCorretivos(insumos, ncBase, hectares);
  
  if (ncBase > 0) {
    observacoes.push(`V% atual (${vAtual.toFixed(1)}%) está abaixo do ideal (65%). Recomendada calagem.`);
  } else {
    observacoes.push(`V% atual (${vAtual.toFixed(1)}%) está adequado. Não necessita calagem.`);
  }

  // === ADUBAÇÃO DE PLANTIO ===
  const p2o5Base = (nivel.p2o5.min + nivel.p2o5.max) / 2;
  // Fator de ajuste por teor de P no solo
  let fatorAjusteP = 1;
  if (soil.p < 5) fatorAjusteP = 1.2;
  else if (soil.p < 10) fatorAjusteP = 1.1;
  else if (soil.p < 20) fatorAjusteP = 1.0;
  else fatorAjusteP = 0.8;

  // Fator de ajuste por textura do solo (fixação de P em argilosos)
  let fatorTexturaP = 1;
  if (textura === 'argilosa') {
    fatorTexturaP = 1.25; // +25% para compensar fixação em argila
    observacoes.push('🧱 P₂O₅ ajustado +25% — solo argiloso fixa Fósforo, exigindo dose maior.');
  } else if (textura === 'arenosa') {
    fatorTexturaP = 0.9; // -10% — menor fixação, mas maior risco de lixiviação
    observacoes.push('🏜️ P₂O₅ ajustado -10% — solo arenoso com baixa fixação. Parcelar aplicação para evitar perda.');
  }
  
  const p2o5Necessario = p2o5Base * fatorAjusteP * fatorTexturaP;
  const k2oPlantioBase = (nivel.k2o.min + nivel.k2o.max) / 2;
  
  const plantioInsumos = processarPlantio(insumos, p2o5Necessario, hectares);
  const nFornecidoPlantio = plantioInsumos.reduce((sum, i) => sum + (i.nutrientesFornecidos.n || 0), 0);
  const k2oFornecidoPlantio = plantioInsumos.reduce((sum, i) => sum + (i.nutrientesFornecidos.k2o || 0), 0);
  const sFornecidoPlantio = plantioInsumos.reduce((sum, i) => sum + (i.nutrientesFornecidos.s || 0), 0);
  
  if (soil.p < 10) {
    observacoes.push('Fósforo baixo no solo - dose de P₂O₅ ajustada para cima.');
  }

  // === COBERTURA (N e S) ===
  const nTotal = (nivel.n.min + nivel.n.max) / 2;
  const sTotal = (nivel.s.min + nivel.s.max) / 2;
  
  let fatorMO = 1;
  if (soil.mo >= 35) fatorMO = 0.85;
  else if (soil.mo >= 25) fatorMO = 0.92;
  else if (soil.mo < 15) fatorMO = 1.1;
  
  const nNecessarioTotal = nTotal * fatorMO;
  const nCobertura = Math.max(0, nNecessarioTotal - nFornecidoPlantio);
  const sNecessario = Math.max(0, sTotal - sFornecidoPlantio);
  
  const coberturaResultado = processarCobertura(insumos, nCobertura, sNecessario, hectares);
  
  if (soil.mo >= 25) {
    observacoes.push('Solo com boa matéria orgânica - dose de N ajustada.');
  }

  // Observações de textura e parcelamento
  if (textura === 'arenosa') {
    observacoes.push(`🏜️ Solo Arenoso (M.O. ${soil.mo.toFixed(1)} g/dm³): ${parcelasTextura.descricao}. ⚠️ Atenção ao Boro — risco de lixiviação.`);
  } else if (textura === 'media') {
    observacoes.push(`🌱 Solo Textura Média (M.O. ${soil.mo.toFixed(1)} g/dm³): ${parcelasTextura.descricao}.`);
  } else {
    observacoes.push(`🧱 Solo Argiloso (M.O. ${soil.mo.toFixed(1)} g/dm³): ${parcelasTextura.descricao}. Atenção à fixação de Fósforo.`);
  }
  
  // Verificar se S foi atendido
  if (sNecessario > 0 && coberturaResultado.sFornecido < sNecessario * 0.8) {
    observacoes.push(`⚠️ Enxofre: necessário ${sNecessario.toFixed(1)} kg/ha, fornecido ${coberturaResultado.sFornecido.toFixed(1)} kg/ha. Considere adicionar fonte de S.`);
  }

  // === CORREÇÃO DE POTÁSSIO ===
  const kAtualPercent = ctc > 0 ? (kEmCmolc / ctc) * 100 : 0;
  let k2oCorrecao = Math.max(0, k2oPlantioBase - k2oFornecidoPlantio);
  
  if (kAtualPercent < 3 && ctc > 0) {
    const kDeficitCmolc = ((3 - kAtualPercent) / 100) * ctc;
    const kCorrecaoK2O = kDeficitCmolc * 391 * 2 * 1.2 / 1000;
    k2oCorrecao += Math.max(0, kCorrecaoK2O);
    observacoes.push(`K atual: ${kAtualPercent.toFixed(1)}% da CTC - correção de K incluída.`);
  }
  
  const potassioInsumos = processarPotassio(insumos, k2oCorrecao, hectares);

  // === MICRONUTRIENTES ===
  // Prioridade: 1º aproveitar micros do Plantio, 2º Cobertura, 3º Foliar/FTE
  const microResultado = processarMicronutrientes(
    insumos, 
    plantioInsumos, 
    coberturaResultado.insumos, 
    hectares, 
    faixaProdutiva
  );
  
  // Verificar se micronutrientes foram atendidos
  const necessidadeMicro = {
    b: ((nivel.b.min + nivel.b.max) / 2) / 1000,
    zn: ((nivel.zn.min + nivel.zn.max) / 2) / 1000,
    cu: ((nivel.cu.min + nivel.cu.max) / 2) / 1000,
    mn: ((nivel.mn.min + nivel.mn.max) / 2) / 1000,
    fe: ((nivel.fe.min + nivel.fe.max) / 2) / 1000,
  };
  
  const microDeficientes: string[] = [];
  if (microResultado.fornecido.b < necessidadeMicro.b * 0.5) microDeficientes.push('B');
  if (microResultado.fornecido.zn < necessidadeMicro.zn * 0.5) microDeficientes.push('Zn');
  if (microResultado.fornecido.cu < necessidadeMicro.cu * 0.5) microDeficientes.push('Cu');
  if (microResultado.fornecido.mn < necessidadeMicro.mn * 0.5) microDeficientes.push('Mn');
  
  if (microDeficientes.length > 0 && microResultado.insumos.length === 0) {
    observacoes.push(`⚠️ Micronutrientes não atendidos: ${microDeficientes.join(', ')}. Considere adicionar FTE ou foliar.`);
  } else if (microDeficientes.length > 0) {
    observacoes.push(`⚠️ Micronutrientes parcialmente atendidos. Deficientes: ${microDeficientes.join(', ')}.`);
  }

  // === OUTROS INSUMOS ===
  const outrosInsumos = processarOutros(insumos, hectares);

  // === CUSTOS ===
  const custoCalagem = calagemInsumo?.custoTotal || (ncBase > 0 ? ncBase * hectares * 180 : 0);
  const custoPlantio = plantioInsumos.reduce((sum, i) => sum + i.custoTotal, 0) || 
    (p2o5Necessario / 0.28 * hectares * 3.6);
  const custoCobertura = coberturaResultado.insumos.reduce((sum, i) => sum + i.custoTotal, 0) ||
    (nCobertura / 0.45 * hectares * 3);
  const custoPotassio = potassioInsumos.reduce((sum, i) => sum + i.custoTotal, 0) ||
    (k2oCorrecao / 0.6 * hectares * 3.6);
  const custoMicro = microResultado.insumos.reduce((sum, i) => sum + i.custoTotal, 0);
  const custoOutros = outrosInsumos.reduce((sum, i) => sum + i.custoTotal, 0);
  
  // Custo de sementes
  let custoSementes = 0;
  if (seed?.seed) {
    const population = seed.populationPerHectare || 0;
    const seedsPerBag = seed.seed.seedsPerBag || 60000;
    const bagsNeeded = Math.ceil((population * hectares) / seedsPerBag);
    custoSementes = bagsNeeded * seed.seed.price;
  }

  const custoTotalGeral = custoCalagem + custoPlantio + custoCobertura + custoPotassio + custoMicro + custoOutros + custoSementes;

  // Informação sobre semente
  if (seed?.seed) {
    const population = seed.populationPerHectare || 0;
    const seedsPerBag = seed.seed.seedsPerBag || 60000;
    const bagsNeeded = Math.ceil((population * hectares) / seedsPerBag);
    observacoes.push(`🌱 Semente ${seed.seed.name}: ${bagsNeeded} sacos × R$ ${seed.seed.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R$ ${custoSementes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${population.toLocaleString('pt-BR')} plantas/ha).`);
  }

  // Indicar uso de insumos cadastrados
  const totalInsumosUsados = (calagemInsumo ? 1 : 0) + plantioInsumos.length + coberturaResultado.insumos.length + 
    potassioInsumos.length + microResultado.insumos.length + outrosInsumos.length;
  
  if (totalInsumosUsados > 0) {
    observacoes.push(`✓ ${totalInsumosUsados} insumo(s) do catálogo utilizado(s) na recomendação.`);
  } else if (insumos.length === 0) {
    observacoes.push('Nenhum insumo selecionado. Usando valores de referência de mercado.');
  } else {
    observacoes.push('Insumos cadastrados não corresponderam às categorias necessárias. Usando valores de referência.');
  }

  return {
    calagem: {
      necessaria: ncBase > 0,
      ncPorHa: ncBase,
      quantidadeTotal: calagemInsumo?.quantidadeTotal || (ncBase * hectares),
      produto: calagemInsumo?.nome || 'Calcário Dolomítico (PRNT 90%)',
      prnt: calagemInsumo ? 
        (insumos.find(i => i.id === calagemInsumo.id)?.correcao.prnt || 90) : 90,
      custoEstimado: custoCalagem,
      insumoSelecionado: calagemInsumo,
    },
    adubacaoPlantio: {
      nNecessario: nFornecidoPlantio,
      p2o5Necessario,
      k2oNecessario: k2oFornecidoPlantio,
      formulaSugerida: plantioInsumos[0]?.observacao || '08-28-16',
      quantidadePorHa: plantioInsumos[0]?.quantidadePorHa || (p2o5Necessario / 0.28),
      quantidadeTotal: plantioInsumos[0]?.quantidadeTotal || (p2o5Necessario / 0.28 * hectares),
      custoEstimado: custoPlantio,
      insumosSelecionados: plantioInsumos,
    },
    cobertura: {
      nNecessario: nNecessarioTotal,
      nFornecidoPlantio,
      nCobertura,
      sNecessario,
      sFornecido: coberturaResultado.sFornecido + sFornecidoPlantio,
      quantidadePorHa: coberturaResultado.insumos[0]?.quantidadePorHa || (nCobertura / 0.45),
      quantidadeTotal: coberturaResultado.insumos[0]?.quantidadeTotal || (nCobertura / 0.45 * hectares),
      custoEstimado: custoCobertura,
      insumosSelecionados: coberturaResultado.insumos,
    },
    correcaoPotassio: {
      k2oNecessario: k2oPlantioBase,
      k2oFornecidoPlantio,
      k2oCorrecao,
      quantidadePorHa: potassioInsumos[0]?.quantidadePorHa || (k2oCorrecao / 0.6),
      quantidadeTotal: potassioInsumos[0]?.quantidadeTotal || (k2oCorrecao / 0.6 * hectares),
      custoEstimado: custoPotassio,
      insumosSelecionados: potassioInsumos,
    },
    micronutrientes: {
      bNecessario: necessidadeMicro.b,
      bFornecido: microResultado.fornecido.b,
      znNecessario: necessidadeMicro.zn,
      znFornecido: microResultado.fornecido.zn,
      cuNecessario: necessidadeMicro.cu,
      cuFornecido: microResultado.fornecido.cu,
      mnNecessario: necessidadeMicro.mn,
      mnFornecido: microResultado.fornecido.mn,
      feNecessario: necessidadeMicro.fe,
      feFornecido: microResultado.fornecido.fe,
      custoEstimado: custoMicro,
      insumosSelecionados: microResultado.insumos,
    },
    outrosInsumos,
    custoTotalGeral,
    custoPorHa: custoTotalGeral / hectares,
    observacoes,
    texturaEstimada: textura,
    parcelamentoCobertura: parcelasTextura,
  };
}
