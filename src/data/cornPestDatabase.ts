// ─── Corn Pest & Disease Database (Milho Silagem) ────────────
// Used by CornPhyto module for recommendation engine

export interface CornPestEntry {
  id: string;
  alvo: string;
  nomePopular: string;
  nomeCientifico: string;
  tipo: 'praga' | 'doenca';
  categoria: 'inseto' | 'acaro' | 'fungo' | 'bacteria' | 'virus' | 'mollicute';
  nde: string; // Nível de Dano Econômico
  sintomas: string;
  fasesRisco: string[]; // fases fenológicas de maior risco
  parteAfetada: string[];
  keywords: string[];
  severidadePotencial: 'alta' | 'media' | 'baixa';
  perdaPotencial: string; // ex: "até 60% da massa verde"
}

export interface CornDefensivoEntry {
  id: string;
  principioAtivo: string;
  grupoQuimico: string;
  tipo: 'inseticida' | 'fungicida' | 'acaricida' | 'inseticida_biologico';
  alvos: string[]; // IDs de CornPestEntry
  doseMin: number;
  doseMax: number;
  unidadeDose: 'mL/ha' | 'L/ha' | 'g/ha' | 'Kg/ha';
  carenciaSilagem: number; // dias até corte para silagem
  alertaCarencia: string;
  metodo: string;
}

export interface CornProdutoComercial {
  id: string;
  nome: string;
  principioAtivo: string;
  defensivoIds: string[]; // refs to CornDefensivoEntry
  dose: string;
  doseNumerico: number;
  unidadeDose: 'mL/ha' | 'L/ha' | 'g/ha' | 'Kg/ha';
  carenciaSilagem: number;
  precoEstimado: number; // R$ por embalagem
  tamanhoEmbalagem: number; // L ou Kg
  metodo: string;
}

// ─── Pragas e Doenças do Milho ───────────────────────────────
export const CORN_PESTS: CornPestEntry[] = [
  // ─── PRAGAS ────────────────────────────────────────────
  {
    id: 'lagarta-cartucho',
    alvo: 'Lagarta-do-Cartucho',
    nomePopular: 'Lagarta-do-Cartucho',
    nomeCientifico: 'Spodoptera frugiperda',
    tipo: 'praga',
    categoria: 'inseto',
    nde: 'Recomendar aplicação se > 20% das plantas apresentarem folhas raspadas (escala Davis ≥ 3)',
    sintomas: 'Folhas raspadas com aspecto de vidraça, excrementos (fezes) no cartucho, perfurações irregulares nas folhas, pode atingir a espiga.',
    fasesRisco: ['V3_V5', 'V6_V8'],
    parteAfetada: ['cartucho', 'folhas', 'espiga'],
    keywords: ['lagarta', 'cartucho', 'spodoptera', 'frugiperda', 'folha raspada', 'fezes', 'excrementos'],
    severidadePotencial: 'alta',
    perdaPotencial: 'até 60% da produção de massa verde para silagem',
  },
  {
    id: 'lagarta-espiga',
    alvo: 'Lagarta-da-Espiga',
    nomePopular: 'Lagarta-da-Espiga',
    nomeCientifico: 'Helicoverpa zea',
    tipo: 'praga',
    categoria: 'inseto',
    nde: 'Monitorar presença nas espigas. Aplicação preventiva na emissão do cabelo.',
    sintomas: 'Grãos danificados na ponta da espiga, excrementos escuros na palha, larvas alimentando-se dos grãos em formação.',
    fasesRisco: ['VT', 'R1_R5'],
    parteAfetada: ['espiga', 'grãos'],
    keywords: ['lagarta', 'espiga', 'helicoverpa', 'grãos danificados', 'cabelo'],
    severidadePotencial: 'media',
    perdaPotencial: 'até 30% dos grãos da espiga',
  },
  {
    id: 'cigarrinha-milho',
    alvo: 'Cigarrinha-do-Milho',
    nomePopular: 'Cigarrinha-do-Milho',
    nomeCientifico: 'Dalbulus maidis',
    tipo: 'praga',
    categoria: 'inseto',
    nde: 'Vetor do enfezamento. Controle obrigatório se > 3 cigarrinhas/planta em V1-V6.',
    sintomas: 'Cigarrinhas pequenas (3-4mm) amareladas no cartucho e axilas das folhas. Sintomas do enfezamento aparecem tardiamente: avermelhamento, encurtamento de entrenós, espigas múltiplas e deformadas.',
    fasesRisco: ['VE', 'V3_V5', 'V6_V8'],
    parteAfetada: ['cartucho', 'axilas', 'planta inteira'],
    keywords: ['cigarrinha', 'dalbulus', 'maidis', 'enfezamento', 'avermelhamento', 'encurtamento', 'espigas múltiplas'],
    severidadePotencial: 'alta',
    perdaPotencial: 'até 70% da massa verde para silagem em casos severos de enfezamento',
  },
  {
    id: 'percevejo-barriga-verde',
    alvo: 'Percevejo-Barriga-Verde',
    nomePopular: 'Percevejo-Barriga-Verde',
    nomeCientifico: 'Diceraeus melacanthus',
    tipo: 'praga',
    categoria: 'inseto',
    nde: 'Aplicação se > 0,5 percevejos/m em plantas jovens (V1-V3).',
    sintomas: 'Plantas jovens com folhas perfuradas em fileira ("coração morto"), perfilhamento anormal, murchamento de plântulas.',
    fasesRisco: ['VE', 'V3_V5'],
    parteAfetada: ['plântula', 'colmo', 'folhas jovens'],
    keywords: ['percevejo', 'barriga-verde', 'diceraeus', 'coração morto', 'perfilhamento', 'perfuração'],
    severidadePotencial: 'alta',
    perdaPotencial: 'até 50% do stand em ataques severos em plântulas',
  },
  {
    id: 'pulgao-milho',
    alvo: 'Pulgão-do-Milho',
    nomePopular: 'Pulgão-do-Milho',
    nomeCientifico: 'Rhopalosiphum maidis',
    tipo: 'praga',
    categoria: 'inseto',
    nde: 'Monitorar. Controle apenas se colônia ocupar > 50% do cartucho e ausência de inimigos naturais.',
    sintomas: 'Colônias de insetos verdes no cartucho e pendão, presença de fumagina (fungos escuros), folhas com aspecto pegajoso.',
    fasesRisco: ['V6_V8', 'VT'],
    parteAfetada: ['cartucho', 'pendão', 'folhas'],
    keywords: ['pulgão', 'rhopalosiphum', 'fumagina', 'pegajoso', 'colônia verde'],
    severidadePotencial: 'baixa',
    perdaPotencial: 'até 15% em ataques severos com fumagina',
  },
  // ─── DOENÇAS ───────────────────────────────────────────
  {
    id: 'cercosporiose-milho',
    alvo: 'Cercosporiose',
    nomePopular: 'Mancha de Cercospora',
    nomeCientifico: 'Cercospora zeae-maydis',
    tipo: 'doenca',
    categoria: 'fungo',
    nde: 'Aplicar fungicida preventivo se condições climáticas forem favoráveis (alta UR + temperaturas amenas) e híbrido suscetível.',
    sintomas: 'Lesões retangulares acinzentadas, delimitadas pelas nervuras, nas folhas inferiores progredindo para as superiores.',
    fasesRisco: ['V6_V8', 'VT', 'R1_R5'],
    parteAfetada: ['folhas inferiores', 'folhas médias', 'folhas superiores'],
    keywords: ['cercosporiose', 'cercospora', 'manchas retangulares', 'acinzentadas', 'nervuras'],
    severidadePotencial: 'alta',
    perdaPotencial: 'até 40% de redução de massa seca digestível',
  },
  {
    id: 'helmintosporiose',
    alvo: 'Helmintosporiose',
    nomePopular: 'Mancha de Turcicum',
    nomeCientifico: 'Exserohilum turcicum',
    tipo: 'doenca',
    categoria: 'fungo',
    nde: 'Aplicação se lesões atingirem folhas acima da espiga antes do enchimento (R3).',
    sintomas: 'Lesões elípticas longas (5-15 cm), verde-acinzentadas a marrons, com formato de charuto, principalmente em folhas inferiores.',
    fasesRisco: ['V6_V8', 'VT', 'R1_R5'],
    parteAfetada: ['folhas inferiores', 'folhas médias'],
    keywords: ['helmintosporiose', 'turcicum', 'exserohilum', 'charuto', 'lesões elípticas', 'longas'],
    severidadePotencial: 'alta',
    perdaPotencial: 'até 50% da área foliar e redução de qualidade da silagem',
  },
  {
    id: 'ferrugem-polissora',
    alvo: 'Ferrugem Polissora',
    nomePopular: 'Ferrugem Polissora',
    nomeCientifico: 'Puccinia polysora',
    tipo: 'doenca',
    categoria: 'fungo',
    nde: 'Aplicar se nota ≥ 3 (escala 1-9) antes do pendoamento em híbridos suscetíveis.',
    sintomas: 'Pústulas alaranjadas a marrom-avermelhadas, circulares e pequenas, distribuídas na face superior das folhas.',
    fasesRisco: ['V6_V8', 'VT'],
    parteAfetada: ['folhas superiores', 'folhas médias'],
    keywords: ['ferrugem', 'polissora', 'puccinia', 'pústulas alaranjadas', 'circulares'],
    severidadePotencial: 'alta',
    perdaPotencial: 'até 60% em híbridos suscetíveis',
  },
  {
    id: 'ferrugem-comum',
    alvo: 'Ferrugem Comum',
    nomePopular: 'Ferrugem Comum',
    nomeCientifico: 'Puccinia sorghi',
    tipo: 'doenca',
    categoria: 'fungo',
    nde: 'Avaliar se > 10% da área foliar acima da espiga com pústulas.',
    sintomas: 'Pústulas marrom-avermelhadas escuras em ambas as faces das folhas, dispostas em linhas. Podem romper a epiderme.',
    fasesRisco: ['V6_V8', 'VT', 'R1_R5'],
    parteAfetada: ['folhas médias', 'folhas superiores'],
    keywords: ['ferrugem comum', 'puccinia sorghi', 'pústulas escuras', 'marrom'],
    severidadePotencial: 'media',
    perdaPotencial: 'até 25% em condições favoráveis',
  },
  {
    id: 'mancha-branca',
    alvo: 'Mancha Branca',
    nomePopular: 'Mancha Branca / Fitobacteriose',
    nomeCientifico: 'Pantoea ananatis + Phaeosphaeria maydis',
    tipo: 'doenca',
    categoria: 'bacteria',
    nde: 'Aplicação preventiva quando ≥ 3 lesões/folha abaixo da espiga, antes do VT.',
    sintomas: 'Lesões aquosas circulares (2-5mm) que evoluem para manchas esbranquiçadas com aspecto de palha seca nas folhas.',
    fasesRisco: ['V6_V8', 'VT', 'R1_R5'],
    parteAfetada: ['folhas inferiores', 'folhas médias', 'folhas superiores'],
    keywords: ['mancha branca', 'pantoea', 'phaeosphaeria', 'lesões aquosas', 'esbranquiçadas', 'palha seca'],
    severidadePotencial: 'alta',
    perdaPotencial: 'até 60% de redução de matéria seca em silagem',
  },
  {
    id: 'enfezamento',
    alvo: 'Enfezamento (Complexo)',
    nomePopular: 'Enfezamento Pálido e Vermelho',
    nomeCientifico: 'Spiroplasma kunkelii / Phytoplasma',
    tipo: 'doenca',
    categoria: 'mollicute',
    nde: 'Controle indireto via vetor (cigarrinha). Sem controle químico direto da doença.',
    sintomas: 'Enfezamento pálido: estrias esbranquiçadas nas folhas. Enfezamento vermelho: avermelhamento das folhas, encurtamento dos entrenós, espigas mal formadas ou múltiplas.',
    fasesRisco: ['VE', 'V3_V5', 'V6_V8'],
    parteAfetada: ['folhas', 'colmo', 'espiga', 'planta inteira'],
    keywords: ['enfezamento', 'spiroplasma', 'phytoplasma', 'avermelhamento', 'estrias', 'espigas múltiplas', 'nanismo'],
    severidadePotencial: 'alta',
    perdaPotencial: 'até 70% da massa verde para silagem',
  },
];

// ─── Defensivos Registrados para Milho ───────────────────────
export const CORN_DEFENSIVOS: CornDefensivoEntry[] = [
  // Inseticidas
  {
    id: 'espinetoraque',
    principioAtivo: 'Espinetoraque',
    grupoQuimico: 'Espinosina',
    tipo: 'inseticida',
    alvos: ['lagarta-cartucho', 'lagarta-espiga'],
    doseMin: 100,
    doseMax: 150,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 7,
    alertaCarencia: 'Período de carência de 7 dias. Não colher para silagem antes deste prazo.',
    metodo: 'Pulverização foliar',
  },
  {
    id: 'clorantraniliprole',
    principioAtivo: 'Clorantraniliprole',
    grupoQuimico: 'Diamida antranílica',
    tipo: 'inseticida',
    alvos: ['lagarta-cartucho', 'lagarta-espiga'],
    doseMin: 50,
    doseMax: 100,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 7,
    alertaCarencia: 'Carência de 7 dias para silagem.',
    metodo: 'Pulverização foliar',
  },
  {
    id: 'metomil',
    principioAtivo: 'Metomil',
    grupoQuimico: 'Carbamato',
    tipo: 'inseticida',
    alvos: ['lagarta-cartucho'],
    doseMin: 600,
    doseMax: 1000,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 14,
    alertaCarencia: 'Carência de 14 dias. Avaliar intervalo antes do corte da silagem.',
    metodo: 'Pulverização foliar',
  },
  {
    id: 'imidacloprido-bifentrina',
    principioAtivo: 'Imidacloprido + Bifentrina',
    grupoQuimico: 'Neonicotinóide + Piretróide',
    tipo: 'inseticida',
    alvos: ['cigarrinha-milho', 'percevejo-barriga-verde', 'pulgao-milho'],
    doseMin: 300,
    doseMax: 500,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 30,
    alertaCarencia: 'Carência de 30 dias até o corte para silagem. Atenção ao intervalo!',
    metodo: 'Pulverização foliar',
  },
  {
    id: 'tiametoxam-lambda',
    principioAtivo: 'Tiametoxam + Lambda-cialotrina',
    grupoQuimico: 'Neonicotinóide + Piretróide',
    tipo: 'inseticida',
    alvos: ['cigarrinha-milho', 'percevejo-barriga-verde', 'pulgao-milho'],
    doseMin: 200,
    doseMax: 300,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 21,
    alertaCarencia: 'Carência de 21 dias para silagem.',
    metodo: 'Pulverização foliar',
  },
  // Fungicidas
  {
    id: 'azoxistrobina-ciproconazol',
    principioAtivo: 'Azoxistrobina + Ciproconazol',
    grupoQuimico: 'Estrobilurina + Triazol',
    tipo: 'fungicida',
    alvos: ['cercosporiose-milho', 'helmintosporiose', 'ferrugem-polissora', 'ferrugem-comum', 'mancha-branca'],
    doseMin: 300,
    doseMax: 400,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 14,
    alertaCarencia: 'Carência de 14 dias para silagem.',
    metodo: 'Pulverização foliar',
  },
  {
    id: 'piraclostrobina-epoxiconazol',
    principioAtivo: 'Piraclostrobina + Epoxiconazol',
    grupoQuimico: 'Estrobilurina + Triazol',
    tipo: 'fungicida',
    alvos: ['cercosporiose-milho', 'helmintosporiose', 'ferrugem-polissora', 'ferrugem-comum'],
    doseMin: 500,
    doseMax: 750,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 21,
    alertaCarencia: 'Carência de 21 dias para silagem.',
    metodo: 'Pulverização foliar',
  },
  {
    id: 'mancozebe',
    principioAtivo: 'Mancozebe',
    grupoQuimico: 'Ditiocarbamato',
    tipo: 'fungicida',
    alvos: ['cercosporiose-milho', 'helmintosporiose', 'ferrugem-comum', 'mancha-branca'],
    doseMin: 2000,
    doseMax: 2500,
    unidadeDose: 'g/ha',
    carenciaSilagem: 30,
    alertaCarencia: 'Carência de 30 dias para silagem. Cuidado com uso tardio!',
    metodo: 'Pulverização foliar',
  },
];

// ─── Produtos Comerciais de Referência ───────────────────────
export const CORN_PRODUTOS: CornProdutoComercial[] = [
  {
    id: 'delegate',
    nome: 'Delegate®',
    principioAtivo: 'Espinetoraque',
    defensivoIds: ['espinetoraque'],
    dose: '100 a 150 mL/ha',
    doseNumerico: 125,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 7,
    precoEstimado: 280,
    tamanhoEmbalagem: 1,
    metodo: 'Pulverização foliar',
  },
  {
    id: 'premio-corn',
    nome: 'Prêmio®',
    principioAtivo: 'Clorantraniliprole',
    defensivoIds: ['clorantraniliprole'],
    dose: '50 a 100 mL/ha',
    doseNumerico: 75,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 7,
    precoEstimado: 520,
    tamanhoEmbalagem: 0.25,
    metodo: 'Pulverização foliar',
  },
  {
    id: 'lannate',
    nome: 'Lannate®',
    principioAtivo: 'Metomil',
    defensivoIds: ['metomil'],
    dose: '600 a 1000 mL/ha',
    doseNumerico: 800,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 14,
    precoEstimado: 85,
    tamanhoEmbalagem: 1,
    metodo: 'Pulverização foliar',
  },
  {
    id: 'galil-sc',
    nome: 'Galil SC®',
    principioAtivo: 'Imidacloprido + Bifentrina',
    defensivoIds: ['imidacloprido-bifentrina'],
    dose: '300 a 500 mL/ha',
    doseNumerico: 400,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 30,
    precoEstimado: 165,
    tamanhoEmbalagem: 1,
    metodo: 'Pulverização foliar',
  },
  {
    id: 'engeo-pleno',
    nome: 'Engeo Pleno S®',
    principioAtivo: 'Tiametoxam + Lambda-cialotrina',
    defensivoIds: ['tiametoxam-lambda'],
    dose: '200 a 300 mL/ha',
    doseNumerico: 250,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 21,
    precoEstimado: 195,
    tamanhoEmbalagem: 1,
    metodo: 'Pulverização foliar',
  },
  {
    id: 'priori-xtra-corn',
    nome: 'Priori Xtra®',
    principioAtivo: 'Azoxistrobina + Ciproconazol',
    defensivoIds: ['azoxistrobina-ciproconazol'],
    dose: '300 a 400 mL/ha',
    doseNumerico: 350,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 14,
    precoEstimado: 210,
    tamanhoEmbalagem: 1,
    metodo: 'Pulverização foliar',
  },
  {
    id: 'opera-corn',
    nome: 'Opera®',
    principioAtivo: 'Piraclostrobina + Epoxiconazol',
    defensivoIds: ['piraclostrobina-epoxiconazol'],
    dose: '500 a 750 mL/ha',
    doseNumerico: 625,
    unidadeDose: 'mL/ha',
    carenciaSilagem: 21,
    precoEstimado: 185,
    tamanhoEmbalagem: 1,
    metodo: 'Pulverização foliar',
  },
  {
    id: 'dithane-corn',
    nome: 'Dithane NT®',
    principioAtivo: 'Mancozebe',
    defensivoIds: ['mancozebe'],
    dose: '2,0 a 2,5 Kg/ha',
    doseNumerico: 2250,
    unidadeDose: 'g/ha',
    carenciaSilagem: 30,
    precoEstimado: 68,
    tamanhoEmbalagem: 3,
    metodo: 'Pulverização foliar',
  },
];

// ─── Helpers ─────────────────────────────────────────────────

/** Find matching CornPestEntry from AI-identified pest name using fuzzy keyword matching */
export function findMatchingCornPest(pragaName: string): CornPestEntry | null {
  const searchLower = pragaName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let bestMatch: CornPestEntry | null = null;
  let bestScore = 0;

  for (const entry of CORN_PESTS) {
    let score = 0;
    const alvoLower = entry.alvo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const nomeLower = entry.nomeCientifico.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (alvoLower.includes(searchLower) || searchLower.includes(alvoLower)) score += 10;
    if (nomeLower.includes(searchLower) || searchLower.includes(nomeLower)) score += 8;

    for (const kw of entry.keywords) {
      const kwNorm = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (searchLower.includes(kwNorm)) score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestScore >= 3 ? bestMatch : null;
}

/** Get defensivos for a given pest */
export function getDefensivosForPest(pestId: string): CornDefensivoEntry[] {
  return CORN_DEFENSIVOS.filter(d => d.alvos.includes(pestId));
}

/** Get commercial products for a given pest */
export function getProductsForCornPest(pestId: string, limit = 4): CornProdutoComercial[] {
  const defensivoIds = CORN_DEFENSIVOS
    .filter(d => d.alvos.includes(pestId))
    .map(d => d.id);

  return CORN_PRODUTOS
    .filter(p => p.defensivoIds.some(did => defensivoIds.includes(did)))
    .slice(0, limit);
}

/** Get carência info string */
export function getCarenciaLabel(dias: number): string {
  if (dias <= 7) return `${dias} dias (curto)`;
  if (dias <= 14) return `${dias} dias (médio)`;
  return `${dias} dias (longo — atenção!)`;
}
