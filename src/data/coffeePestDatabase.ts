// ─── Shared Coffee Pest & Disease Database ───────────────────
// Used by CoffeeDiseaseStep (manual reference) and CoffeePestIdentifier (AI cross-reference)

export interface DefensivoEntry {
  id: string;
  alvo: string;
  ativos: string;
  dose: string;
  epoca: string;
  tipo: 'Fungicida Sistêmico' | 'Fungicida' | 'Inseticida' | 'Acaricida' | 'Bactericida' | 'Nematicida';
  categoria: 'doenca' | 'praga';
  obs: string;
  severidade: 'alta' | 'media' | 'baixa';
  culturas: ('conilon' | 'arabica')[];
  // Palavras-chave para cross-reference com IA
  keywords: string[];
}

export interface ProdutoComercial {
  id: string;
  nome: string;
  principio_ativo: string;
  dose: string;
  doseNumerico: number; // dose numérica em L/ha ou Kg/ha
  unidadeDose: 'L/ha' | 'Kg/ha' | 'g/ha';
  metodo: string;
  alvos: string[]; // IDs de DefensivoEntry que este produto trata
  culturas: ('conilon' | 'arabica')[];
  precoEstimado: number; // R$ por unidade (L ou Kg)
  tamanhoEmbalagem: number; // tamanho da embalagem em L ou Kg
}

// ─── Banco de Defensivos ─────────────────────────────────────
export const BANCO_DEFENSIVOS: DefensivoEntry[] = [
  // ─── DOENÇAS ───────────────────────────────────────────
  {
    id: 'ferrugem',
    alvo: 'Ferrugem (Hemileia vastatrix)',
    ativos: 'Ciproconazol + Azoxistrobina',
    dose: '0,75 a 1,0 L/ha',
    epoca: 'Novembro a Janeiro (Início das chuvas)',
    tipo: 'Fungicida Sistêmico',
    categoria: 'doenca',
    obs: 'Realizar rotação de ativos para evitar resistência. Principal doença do cafeeiro, pode causar desfolha severa e queda de até 50% da produção.',
    severidade: 'alta',
    culturas: ['conilon', 'arabica'],
    keywords: ['ferrugem', 'hemileia', 'vastatrix', 'pústulas', 'alaranjadas', 'desfolha', 'rust'],
  },
  {
    id: 'cercosporiose',
    alvo: 'Cercosporiose (Cercospora coffeicola)',
    ativos: 'Piraclostrobina + Epoxiconazol',
    dose: '0,5 a 0,7 L/ha',
    epoca: 'Fase de expansão dos frutos',
    tipo: 'Fungicida',
    categoria: 'doenca',
    obs: 'Comum em solos com baixo Nitrogênio. Causa manchas circulares nas folhas e frutos, reduzindo a qualidade da bebida.',
    severidade: 'media',
    culturas: ['conilon', 'arabica'],
    keywords: ['cercosporiose', 'cercospora', 'olho-pardo', 'manchas circulares', 'halo amarelo'],
  },
  {
    id: 'phoma',
    alvo: 'Phoma (Phoma tarda / P. costarricensis)',
    ativos: 'Clorotalonil + Tiofanato Metílico',
    dose: '2,0 a 2,5 L/ha',
    epoca: 'Florada e pós-florada (Setembro a Novembro)',
    tipo: 'Fungicida',
    categoria: 'doenca',
    obs: 'Ataca flores e chumbinhos, causando seca de ponteiros. Mais severa em altitudes elevadas e períodos frios com chuva.',
    severidade: 'alta',
    culturas: ['arabica'],
    keywords: ['phoma', 'seca de ponteiros', 'necrose apical', 'chumbinhos'],
  },
  {
    id: 'antracnose',
    alvo: 'Antracnose (Colletotrichum spp.)',
    ativos: 'Azoxistrobina + Ciproconazol',
    dose: '0,5 a 0,75 L/ha',
    epoca: 'Período chuvoso (Dezembro a Março)',
    tipo: 'Fungicida Sistêmico',
    categoria: 'doenca',
    obs: 'Causa seca de ramos e frutos, especialmente em lavouras estressadas ou com alta carga pendente. Reforçar adubação com Potássio e Boro.',
    severidade: 'media',
    culturas: ['conilon', 'arabica'],
    keywords: ['antracnose', 'colletotrichum', 'seca de ramos', 'necrose', 'frutos mumificados'],
  },
  {
    id: 'rizoctoniose',
    alvo: 'Rizoctoniose (Rhizoctonia solani)',
    ativos: 'Pencicurom ou Flutolanil',
    dose: 'Aplicação localizada via drench',
    epoca: 'Época chuvosa em solos compactados',
    tipo: 'Fungicida',
    categoria: 'doenca',
    obs: 'Ataca o colo e raízes, causando amarelecimento e morte de plantas. Favorecida por excesso de umidade e solo mal drenado.',
    severidade: 'baixa',
    culturas: ['conilon', 'arabica'],
    keywords: ['rizoctoniose', 'rhizoctonia', 'podridão radicular', 'colo'],
  },
  {
    id: 'mancha-aureolada',
    alvo: 'Mancha Aureolada (Pseudomonas syringae pv. garcae)',
    ativos: 'Oxicloreto de Cobre',
    dose: '3,0 a 4,0 kg/ha',
    epoca: 'Períodos frios e úmidos (Maio a Agosto)',
    tipo: 'Bactericida',
    categoria: 'doenca',
    obs: 'Doença bacteriana que causa necrose com halo amarelado. Mais comum em regiões de altitude. Evitar pulverização em horários frios.',
    severidade: 'media',
    culturas: ['arabica'],
    keywords: ['mancha aureolada', 'pseudomonas', 'halo amarelado', 'bacteriana', 'necrose'],
  },
  {
    id: 'crespeira',
    alvo: 'Crespeira / Mancha-manteigosa (Colletotrichum gloeosporioides)',
    ativos: 'Azoxistrobina + Ciproconazol',
    dose: '0,5 a 0,75 L/ha',
    epoca: 'Período chuvoso (Outubro a Março)',
    tipo: 'Fungicida Sistêmico',
    categoria: 'doenca',
    obs: 'Causa enrugamento e deformação das folhas, queda de frutos e seca de ramos. Comum em clones suscetíveis de Conilon.',
    severidade: 'alta',
    culturas: ['conilon'],
    keywords: ['crespeira', 'mancha-manteigosa', 'enrugamento', 'deformação foliar', 'gloeosporioides'],
  },
  {
    id: 'koleroga',
    alvo: 'Koleroga / Queima-do-fio (Pellicularia koleroga)',
    ativos: 'Oxicloreto de Cobre ou Calda Bordalesa',
    dose: '3,0 a 4,0 kg/ha (Cu metálico)',
    epoca: 'Período chuvoso com alta umidade',
    tipo: 'Fungicida',
    categoria: 'doenca',
    obs: 'Fungo que forma uma película branca ligando folhas, frutos e ramos. Causa queda intensa. Mais severa em lavouras adensadas e sombreadas no Conilon.',
    severidade: 'media',
    culturas: ['conilon'],
    keywords: ['koleroga', 'queima-do-fio', 'pellicularia', 'película branca', 'queda de folhas'],
  },

  // ─── PRAGAS ────────────────────────────────────────────
  {
    id: 'broca',
    alvo: 'Broca-do-café (Hypothenemus hampei)',
    ativos: 'Ciantraniliprole ou Metaflumizona',
    dose: '1,5 a 2,0 L/ha',
    epoca: 'Trânsito da broca (80 a 120 dias após a florada)',
    tipo: 'Inseticida',
    categoria: 'praga',
    obs: 'Monitorar se a infestação atingir 3%. Principal praga do cafeeiro — a broca penetra o fruto e deposita ovos, causando perda direta de qualidade e peso.',
    severidade: 'alta',
    culturas: ['conilon', 'arabica'],
    keywords: ['broca', 'hypothenemus', 'hampei', 'perfuração', 'fruto perfurado', 'orifício'],
  },
  {
    id: 'bicho-mineiro',
    alvo: 'Bicho-mineiro (Leucoptera coffeella)',
    ativos: 'Clorantraniliprole ou Tiametoxam',
    dose: 'Via Solo (Drench) ou Foliar',
    epoca: 'Períodos secos (Maio a Setembro)',
    tipo: 'Inseticida',
    categoria: 'praga',
    obs: 'Em sistemas irrigados, o controle via solo (drench) é altamente eficiente. A lagarta mina as folhas, causando lesões que reduzem a fotossíntese.',
    severidade: 'alta',
    culturas: ['arabica'],
    keywords: ['bicho-mineiro', 'leucoptera', 'minas', 'galerias', 'lesões foliares', 'minador'],
  },
  {
    id: 'acaro-vermelho',
    alvo: 'Ácaro-vermelho (Oligonychus ilicis)',
    ativos: 'Abamectina ou Espirodiclofeno',
    dose: '0,3 a 0,5 L/ha',
    epoca: 'Período seco (Junho a Outubro)',
    tipo: 'Acaricida',
    categoria: 'praga',
    obs: 'Causa bronzeamento das folhas e desfolha. Mais severo em períodos prolongados de estiagem. Monitorar face superior das folhas.',
    severidade: 'media',
    culturas: ['conilon', 'arabica'],
    keywords: ['ácaro-vermelho', 'oligonychus', 'bronzeamento', 'desfolha', 'ácaro'],
  },
  {
    id: 'cigarras',
    alvo: 'Cigarras (Quesada gigas / Fidicina spp.)',
    ativos: 'Tiametoxam (via solo)',
    dose: 'Drench: 750g a 1,0 kg/ha',
    epoca: 'Outubro a Dezembro (emergência dos adultos)',
    tipo: 'Inseticida',
    categoria: 'praga',
    obs: 'As ninfas sugam raízes por anos antes de emergirem. Causa definhamento progressivo da planta. Aplicação via solo é obrigatória.',
    severidade: 'media',
    culturas: ['conilon', 'arabica'],
    keywords: ['cigarra', 'quesada', 'fidicina', 'definhamento', 'raízes'],
  },
  {
    id: 'nematoides',
    alvo: 'Nematoides (Meloidogyne spp.)',
    ativos: 'Fluensulfone ou Cadusafós',
    dose: 'Aplicação localizada no sulco ou drench',
    epoca: 'No plantio ou renovação de lavoura',
    tipo: 'Nematicida',
    categoria: 'praga',
    obs: 'Causam galhas nas raízes, impedindo absorção de água e nutrientes. Usar porta-enxertos resistentes (Apoatã IAC 2258) é a melhor estratégia preventiva.',
    severidade: 'alta',
    culturas: ['conilon', 'arabica'],
    keywords: ['nematoide', 'meloidogyne', 'galhas', 'raízes', 'murcha'],
  },
  {
    id: 'cochonilha',
    alvo: 'Cochonilha-da-raiz (Dysmicoccus texensis)',
    ativos: 'Tiametoxam ou Imidacloprido (drench)',
    dose: 'Drench: 500g a 750g/ha',
    epoca: 'Período chuvoso',
    tipo: 'Inseticida',
    categoria: 'praga',
    obs: 'Suga seiva das raízes, causando amarelecimento e morte de plantas em reboleiras. Associada a formigas que protegem as colônias.',
    severidade: 'media',
    culturas: ['conilon', 'arabica'],
    keywords: ['cochonilha', 'dysmicoccus', 'amarelecimento', 'reboleiras', 'formigas'],
  },
  {
    id: 'acaro-branco',
    alvo: 'Ácaro-branco (Polyphagotarsonemus latus)',
    ativos: 'Abamectina ou Fenpiroximato',
    dose: '0,3 a 0,5 L/ha',
    epoca: 'Períodos quentes e úmidos',
    tipo: 'Acaricida',
    categoria: 'praga',
    obs: 'Ataca brotações novas causando enrolamento e bronzeamento das folhas jovens. Muito comum em viveiros e lavouras jovens de Conilon.',
    severidade: 'alta',
    culturas: ['conilon'],
    keywords: ['ácaro-branco', 'polyphagotarsonemus', 'enrolamento', 'brotações', 'ácaro'],
  },
  {
    id: 'mosca-das-frutas',
    alvo: 'Mosca-das-frutas (Ceratitis capitata)',
    ativos: 'Isca tóxica (Proteína hidrolisada + Malationa)',
    dose: 'Isca: 5% do volume de calda',
    epoca: 'Maturação dos frutos (Maio a Julho)',
    tipo: 'Inseticida',
    categoria: 'praga',
    obs: 'A fêmea oviposita nos frutos maduros, acelerando a queda e fermentação. Mais relevante em Arábica de maturação tardia.',
    severidade: 'baixa',
    culturas: ['arabica'],
    keywords: ['mosca-das-frutas', 'ceratitis', 'oviposição', 'frutos maduros', 'fermentação'],
  },
];

// ─── Produtos Comerciais de Referência ───────────────────────
export const PRODUTOS_COMERCIAIS: ProdutoComercial[] = [
  // Fungicidas
  {
    id: 'opera',
    nome: 'Opera',
    principio_ativo: 'Piraclostrobina + Epoxiconazol',
    dose: '0,5 a 0,75 L/ha',
    doseNumerico: 0.625,
    unidadeDose: 'L/ha',
    metodo: 'Pulverização foliar',
    alvos: ['ferrugem', 'cercosporiose', 'phoma'],
    culturas: ['conilon', 'arabica'],
    precoEstimado: 185,
    tamanhoEmbalagem: 1,
  },
  {
    id: 'priori-xtra',
    nome: 'Priori Xtra',
    principio_ativo: 'Azoxistrobina + Ciproconazol',
    dose: '0,5 a 0,75 L/ha',
    doseNumerico: 0.625,
    unidadeDose: 'L/ha',
    metodo: 'Pulverização foliar',
    alvos: ['ferrugem', 'antracnose', 'cercosporiose', 'crespeira'],
    culturas: ['conilon', 'arabica'],
    precoEstimado: 210,
    tamanhoEmbalagem: 1,
  },
  {
    id: 'alto-100',
    nome: 'Alto 100',
    principio_ativo: 'Ciproconazol',
    dose: '0,3 a 0,5 L/ha',
    doseNumerico: 0.4,
    unidadeDose: 'L/ha',
    metodo: 'Pulverização foliar',
    alvos: ['ferrugem', 'cercosporiose'],
    culturas: ['conilon', 'arabica'],
    precoEstimado: 135,
    tamanhoEmbalagem: 1,
  },
  {
    id: 'sphere-max',
    nome: 'Sphere Max',
    principio_ativo: 'Trifloxistrobina + Ciproconazol',
    dose: '0,2 a 0,3 L/ha',
    doseNumerico: 0.25,
    unidadeDose: 'L/ha',
    metodo: 'Pulverização foliar',
    alvos: ['ferrugem', 'cercosporiose', 'phoma'],
    culturas: ['conilon', 'arabica'],
    precoEstimado: 245,
    tamanhoEmbalagem: 1,
  },
  {
    id: 'nativo',
    nome: 'Nativo',
    principio_ativo: 'Trifloxistrobina + Tebuconazol',
    dose: '0,6 a 0,75 L/ha',
    doseNumerico: 0.675,
    unidadeDose: 'L/ha',
    metodo: 'Pulverização foliar',
    alvos: ['ferrugem', 'phoma', 'antracnose'],
    culturas: ['conilon', 'arabica'],
    precoEstimado: 155,
    tamanhoEmbalagem: 1,
  },
  {
    id: 'bravonil-720',
    nome: 'Bravonil 720',
    principio_ativo: 'Clorotalonil',
    dose: '1,5 a 2,5 L/ha',
    doseNumerico: 2.0,
    unidadeDose: 'L/ha',
    metodo: 'Pulverização foliar',
    alvos: ['phoma', 'cercosporiose'],
    culturas: ['arabica'],
    precoEstimado: 68,
    tamanhoEmbalagem: 5,
  },
  {
    id: 'cobox',
    nome: 'Cobox',
    principio_ativo: 'Oxicloreto de Cobre',
    dose: '3,0 a 4,0 kg/ha',
    doseNumerico: 3.5,
    unidadeDose: 'Kg/ha',
    metodo: 'Pulverização foliar',
    alvos: ['mancha-aureolada', 'koleroga'],
    culturas: ['conilon', 'arabica'],
    precoEstimado: 42,
    tamanhoEmbalagem: 2,
  },
  // Inseticidas
  {
    id: 'benevia',
    nome: 'Benevia',
    principio_ativo: 'Ciantraniliprole',
    dose: '0,75 a 1,0 L/ha',
    doseNumerico: 0.875,
    unidadeDose: 'L/ha',
    metodo: 'Pulverização foliar',
    alvos: ['broca', 'bicho-mineiro'],
    culturas: ['conilon', 'arabica'],
    precoEstimado: 380,
    tamanhoEmbalagem: 1,
  },
  {
    id: 'voliam-targo',
    nome: 'Voliam Targo',
    principio_ativo: 'Clorantraniliprole + Abamectina',
    dose: '0,8 a 1,0 L/ha',
    doseNumerico: 0.9,
    unidadeDose: 'L/ha',
    metodo: 'Pulverização foliar',
    alvos: ['broca', 'bicho-mineiro', 'acaro-vermelho'],
    culturas: ['conilon', 'arabica'],
    precoEstimado: 420,
    tamanhoEmbalagem: 1,
  },
  {
    id: 'actara-250',
    nome: 'Actara 250 WG',
    principio_ativo: 'Tiametoxam',
    dose: '200 a 400 g/ha (drench) ou 100g/ha (foliar)',
    doseNumerico: 300,
    unidadeDose: 'g/ha',
    metodo: 'Drench ou pulverização foliar',
    alvos: ['bicho-mineiro', 'cochonilha', 'cigarras'],
    culturas: ['conilon', 'arabica'],
    precoEstimado: 650,
    tamanhoEmbalagem: 0.25,
  },
  {
    id: 'premio',
    nome: 'Prêmio',
    principio_ativo: 'Clorantraniliprole',
    dose: '0,1 a 0,15 L/ha',
    doseNumerico: 0.125,
    unidadeDose: 'L/ha',
    metodo: 'Pulverização foliar ou drench',
    alvos: ['bicho-mineiro', 'broca'],
    culturas: ['arabica'],
    precoEstimado: 520,
    tamanhoEmbalagem: 0.25,
  },
  // Acaricidas
  {
    id: 'vertimec-18ec',
    nome: 'Vertimec 18 EC',
    principio_ativo: 'Abamectina',
    dose: '0,3 a 0,5 L/ha',
    doseNumerico: 0.4,
    unidadeDose: 'L/ha',
    metodo: 'Pulverização foliar',
    alvos: ['acaro-vermelho', 'acaro-branco'],
    culturas: ['conilon', 'arabica'],
    precoEstimado: 120,
    tamanhoEmbalagem: 1,
  },
  {
    id: 'envidor',
    nome: 'Envidor',
    principio_ativo: 'Espirodiclofeno',
    dose: '0,3 a 0,4 L/ha',
    doseNumerico: 0.35,
    unidadeDose: 'L/ha',
    metodo: 'Pulverização foliar',
    alvos: ['acaro-vermelho', 'acaro-branco'],
    culturas: ['conilon', 'arabica'],
    precoEstimado: 290,
    tamanhoEmbalagem: 1,
  },
  {
    id: 'ortus-50sc',
    nome: 'Ortus 50 SC',
    principio_ativo: 'Fenpiroximato',
    dose: '0,5 a 0,6 L/ha',
    doseNumerico: 0.55,
    unidadeDose: 'L/ha',
    metodo: 'Pulverização foliar',
    alvos: ['acaro-branco', 'acaro-vermelho'],
    culturas: ['conilon'],
    precoEstimado: 195,
    tamanhoEmbalagem: 1,
  },
  // Nematicida
  {
    id: 'nimitz',
    nome: 'Nimitz',
    principio_ativo: 'Fluensulfone',
    dose: '3,0 a 5,0 L/ha',
    doseNumerico: 4.0,
    unidadeDose: 'L/ha',
    metodo: 'Aplicação no sulco ou drench',
    alvos: ['nematoides'],
    culturas: ['conilon', 'arabica'],
    precoEstimado: 310,
    tamanhoEmbalagem: 5,
  },
];

// ─── Helpers ─────────────────────────────────────────────────

/** Find matching DefensivoEntry from AI-identified pest name using fuzzy keyword matching */
export function findMatchingDefensivo(
  pragaName: string,
  coffeeType: 'conilon' | 'arabica' | null
): DefensivoEntry | null {
  const searchLower = pragaName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Try exact ID match first
  const exactMatch = BANCO_DEFENSIVOS.find(d => d.id === searchLower);
  if (exactMatch) return exactMatch;

  // Then keyword search
  let bestMatch: DefensivoEntry | null = null;
  let bestScore = 0;

  for (const entry of BANCO_DEFENSIVOS) {
    let score = 0;
    const alvoLower = entry.alvo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Check alvo name similarity
    if (alvoLower.includes(searchLower) || searchLower.includes(alvoLower.split('(')[0].trim())) {
      score += 10;
    }

    // Check keywords
    for (const kw of entry.keywords) {
      const kwNorm = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (searchLower.includes(kwNorm)) score += 3;
    }

    // Boost for matching coffee type
    if (coffeeType && entry.culturas.includes(coffeeType)) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestScore >= 3 ? bestMatch : null;
}

/** Get commercial products for a specific pest, filtered by coffee type */
export function getProductsForPest(
  defensivoId: string,
  coffeeType: 'conilon' | 'arabica' | null,
  limit = 3
): ProdutoComercial[] {
  let products = PRODUTOS_COMERCIAIS.filter(p => p.alvos.includes(defensivoId));

  if (coffeeType) {
    products = products.filter(p => p.culturas.includes(coffeeType));
  }

  return products.slice(0, limit);
}
