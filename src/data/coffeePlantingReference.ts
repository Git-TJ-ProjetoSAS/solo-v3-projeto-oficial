// Reference data for first-year coffee planting fertilization recommendation

/** Idade máxima (meses) para considerar lavoura em fase de formação */
export const FIRST_YEAR_MAX_MONTHS = 24;

export const CAD_CULTURAS = [
  { id: 1, nome: "Café Conilon (Irrigado)", meta_n: 60 },
  { id: 2, nome: "Café Arábica (Sequeiro)", meta_n: 40 },
] as const;

/**
 * Catálogo ESTRITO de fertilizantes para fase de formação fertirrigada.
 * Somente sais de referência — proibido usar NPK de produção.
 */
export const FERTILIZANTES_FORMACAO = {
  ureia:       { nome: "Uréia",                      nutriente: "N",   concentracao: 0.45 },
  kcl:         { nome: "Cloreto de Potássio",         nutriente: "K2O", concentracao: 0.60 },
  map:         { nome: "MAP Purificado",              nutriente_principal: "P2O5", concentracao_p2o5: 0.61, concentracao_n: 0.12 },
  calcinit:    { nome: "Nitrato de Cálcio (Calcinit)", nutriente: "Ca", concentracao_n: 0.155, concentracao_ca: 0.19 },
  mgso4:       { nome: "Sulfato de Magnésio",         nutriente: "Mg",  concentracao_mg: 0.09, concentracao_s: 0.13 },
  sulfato_amonia: { nome: "Sulfato de Amônia",        nutriente: "S",   concentracao_n: 0.22, concentracao_s: 0.24 },
  znso4:       { nome: "Sulfato de Zinco",            nutriente: "Zn",  concentracao_zn: 0.20 },
  cuso4:       { nome: "Sulfato de Cobre",            nutriente: "Cu",  concentracao_cu: 0.25 },
  acido_borico:{ nome: "Ácido Bórico",                nutriente: "B",   concentracao_b: 0.17 },
} as const;

export const REF_FOSFORO = [
  { min: 0, max: 10.0, g_p2o5: 60 },
  { min: 10.1, max: 20.0, g_p2o5: 40 },
  { min: 20.1, max: 999.0, g_p2o5: 20 },
] as const;

export const REF_POTASSIO = [
  { min: 0, max: 1.5, g_k2o: 40 },
  { min: 1.51, max: 3.0, g_k2o: 20 },
  { min: 3.01, max: 999.0, g_k2o: 0 },
] as const;

/** Valores em g/planta do produto comercial (Ref: EMBRAPA/INCAPER/5ª Aproximação) */
export const META_MICROS = {
  sulfato_mg: 25, // g/planta (Ref: comparativo agronômico — faixa 20-30g/pl)
  sulfato_amonia: 20, // g/planta — fonte de S (24%) + N complementar (22%)
  sulfato_zn: 0.5,
  acido_borico: 0.5,
  sulfato_cu: 0.25,
  sulfato_mn: 0.5,
} as const;

/** Calcinit (Nitrato de Cálcio): 15.5% N, 19% Ca – fonte complementar de N e Ca */
export const CALCINIT = {
  gPlanta: 40, // g/planta (Ref: comparativo agronômico — faixa 30-50g/pl)
  percN: 0.155,
  percCa: 0.19,
} as const;

/** V% alvo para calagem no 1º ano (fase de formação) */
export const V_ALVO_PRIMEIRO_ANO = 70;

/** PRNT padrão quando não informado pelo usuário */
export const PRNT_DEFAULT = 85;

/**
 * Curva progressiva: doses crescentes conforme a planta se desenvolve.
 * perc_ureia / perc_kcl / perc_calcinit = distribuição individual por produto.
 * perc_micro = distribuição de micronutrientes (concentrada nos primeiros meses).
 */
export const MATRIZ_PARCELAMENTO = [
  // ── Conilon Irrigado (10 parcelas, Dez → Set) ──
  { cultura: "Café Conilon (Irrigado)", mes: "Dezembro",  perc_ureia: 0.03, perc_kcl: 0.03, perc_calcinit: 0.05, perc_micro: 0.10 },
  { cultura: "Café Conilon (Irrigado)", mes: "Janeiro",   perc_ureia: 0.05, perc_kcl: 0.05, perc_calcinit: 0.08, perc_micro: 0.20 },
  { cultura: "Café Conilon (Irrigado)", mes: "Fevereiro", perc_ureia: 0.07, perc_kcl: 0.07, perc_calcinit: 0.10, perc_micro: 0.20 },
  { cultura: "Café Conilon (Irrigado)", mes: "Março",     perc_ureia: 0.09, perc_kcl: 0.09, perc_calcinit: 0.10, perc_micro: 0.20 },
  { cultura: "Café Conilon (Irrigado)", mes: "Abril",     perc_ureia: 0.11, perc_kcl: 0.11, perc_calcinit: 0.12, perc_micro: 0.30 },
  { cultura: "Café Conilon (Irrigado)", mes: "Maio",      perc_ureia: 0.12, perc_kcl: 0.12, perc_calcinit: 0.12, perc_micro: 0.00 },
  { cultura: "Café Conilon (Irrigado)", mes: "Junho",     perc_ureia: 0.13, perc_kcl: 0.13, perc_calcinit: 0.12, perc_micro: 0.00 },
  { cultura: "Café Conilon (Irrigado)", mes: "Julho",     perc_ureia: 0.13, perc_kcl: 0.13, perc_calcinit: 0.11, perc_micro: 0.00 },
  { cultura: "Café Conilon (Irrigado)", mes: "Agosto",    perc_ureia: 0.14, perc_kcl: 0.14, perc_calcinit: 0.10, perc_micro: 0.00 },
  { cultura: "Café Conilon (Irrigado)", mes: "Setembro",  perc_ureia: 0.13, perc_kcl: 0.13, perc_calcinit: 0.10, perc_micro: 0.00 },
  // ── Arábica Sequeiro (3 parcelas) ──
  { cultura: "Café Arábica (Sequeiro)", mes: "Novembro",  perc_ureia: 0.25, perc_kcl: 0.25, perc_calcinit: 0.30, perc_micro: 0.33 },
  { cultura: "Café Arábica (Sequeiro)", mes: "Janeiro",   perc_ureia: 0.40, perc_kcl: 0.40, perc_calcinit: 0.40, perc_micro: 0.34 },
  { cultura: "Café Arábica (Sequeiro)", mes: "Março",     perc_ureia: 0.35, perc_kcl: 0.35, perc_calcinit: 0.30, perc_micro: 0.33 },
] as const;

// ─── 3º Passo: Pulverização Mensal ──────────────────────────────

export interface SprayingBaseProduct {
  nome: string;
  dose: string; // dose per 20L tank
  tipo: 'padrao' | 'mensal';
}

/** Calda padrão: aplicar a cada 30 dias na fase inicial */
export const PULVERIZACAO_PADRAO: SprayingBaseProduct[] = [
  { nome: 'Stimulate', dose: '20 mL', tipo: 'padrao' },
  { nome: 'Yara Vita Café', dose: '80 mL', tipo: 'padrao' },
  { nome: 'Mancozin', dose: '20 mL', tipo: 'padrao' },
  { nome: 'SULFATO DE ZINCO', dose: '30 mL', tipo: 'padrao' },
  { nome: 'SULFATO DE COBRE', dose: '30 mL', tipo: 'padrao' },
  { nome: 'Ácido Bórico', dose: '30 mL', tipo: 'padrao' },
  { nome: 'SULFATO DE MANGANÊS', dose: '30 mL', tipo: 'padrao' },
  { nome: 'Espalhante', dose: 'conforme rótulo', tipo: 'padrao' },
];

export interface SprayingMonthEntry {
  mes: string;
  produtos: { nome: string; dose: string }[];
}

/** Produtos adicionais específicos por mês (junto à calda padrão) */
export const PULVERIZACAO_MENSAL: SprayingMonthEntry[] = [
  { mes: 'Novembro', produtos: [
    { nome: 'Miravis Duo', dose: '30 mL' },
    { nome: 'AminoPro', dose: '50 mL' },
  ]},
  { mes: 'Dezembro', produtos: [
    { nome: 'Comet', dose: '30 mL' },
  ]},
  { mes: 'Janeiro', produtos: [
    { nome: 'Miravis Duo', dose: '30 mL' },
  ]},
];

// ─── Protocolo Fitossanitário Completo (EMBRAPA/INCAPER) ────────

export type CoffeeSpecies = 'conilon' | 'arabica';

export interface DefensivoFormacao {
  nome: string;
  principioAtivo: string;
  categoria: 'fungicida' | 'inseticida' | 'bioestimulante' | 'herbicida' | 'acaricida';
  dose: string;
  doseHa: string;
  alvo: string;
  periodo: string[];
  instrucao: string;
  carencia?: number; // dias
  grupoQuimico?: string;
  /** Culturas compatíveis. Se vazio/undefined = ambas */
  culturas?: CoffeeSpecies[];
}

/**
 * Protocolo de defensivos para formação de café (0-24 meses)
 * Ref: EMBRAPA Café, INCAPER (Café Conilon – Técnicas de Produção), 5ª Aproximação MG
 */
export const PROTOCOLO_DEFENSIVOS_FORMACAO: DefensivoFormacao[] = [
  // ══════════════════════════════════════════════════════════════
  // ── FUNGICIDAS (AMBAS ESPÉCIES) ──
  // ══════════════════════════════════════════════════════════════
  {
    nome: 'Oxicloreto de Cobre 840 WP',
    principioAtivo: 'Oxicloreto de Cobre (840 g/kg)',
    categoria: 'fungicida',
    dose: '60 g / 20L',
    doseHa: '3,0 kg/ha',
    alvo: 'Ferrugem (Hemileia vastatrix), Cercosporiose',
    periodo: ['Setembro', 'Outubro', 'Novembro', 'Dezembro', 'Janeiro', 'Fevereiro', 'Março'],
    instrucao: 'Preventivo. Pulverizar a cada 30-45 dias durante o período chuvoso. Iniciar antes das primeiras chuvas.',
    grupoQuimico: 'Inorgânico (cúprico)',
  },
  {
    nome: 'Miravis Duo',
    principioAtivo: 'Difenoconazol (75 g/L) + Pydiflumetofen (75 g/L)',
    categoria: 'fungicida',
    dose: '30 mL / 20L',
    doseHa: '0,75 L/ha',
    alvo: 'Ferrugem, Cercosporiose, Mancha de Olho Pardo',
    periodo: ['Novembro', 'Janeiro', 'Março'],
    instrucao: 'Curativo/Sistêmico. Alternar com Cobre para manejo de resistência. Intervalo mínimo de 30 dias.',
    carencia: 30,
    grupoQuimico: 'Triazol + Carboxamida',
  },
  {
    nome: 'Comet (Piraclostrobina)',
    principioAtivo: 'Piraclostrobina (250 g/L)',
    categoria: 'fungicida',
    dose: '20 mL / 20L',
    doseHa: '0,5 L/ha',
    alvo: 'Cercosporiose, efeito tônico (greening)',
    periodo: ['Dezembro', 'Fevereiro'],
    instrucao: 'Sistêmico com efeito fisiológico positivo (maior vigor vegetativo). Ideal na fase de expansão rápida.',
    carencia: 35,
    grupoQuimico: 'Estrobilurina',
  },
  // ══════════════════════════════════════════════════════════════
  // ── FUNGICIDAS EXCLUSIVOS ARÁBICA ──
  // ══════════════════════════════════════════════════════════════
  {
    nome: 'Cantus (Boscalida)',
    principioAtivo: 'Boscalida (500 g/kg)',
    categoria: 'fungicida',
    dose: '6 g / 20L',
    doseHa: '150 g/ha',
    alvo: 'Phoma (Phoma tarda / P. costarricensis)',
    periodo: ['Junho', 'Julho', 'Agosto', 'Setembro'],
    instrucao: 'Preventivo na pré-florada. Phoma ataca ramos e rosetas em regiões de altitude com ventos frios e garoa. Comum acima de 800m.',
    carencia: 28,
    grupoQuimico: 'Carboxamida (SDHI)',
    culturas: ['arabica'],
  },
  {
    nome: 'Kasumin (Casugamicina)',
    principioAtivo: 'Casugamicina (20 g/L)',
    categoria: 'fungicida',
    dose: '60 mL / 20L',
    doseHa: '1,5 L/ha',
    alvo: 'Mancha Aureolada (Pseudomonas syringae pv. garcae)',
    periodo: ['Julho', 'Agosto', 'Setembro', 'Outubro'],
    instrucao: 'Bacteriose favorecida por ventos frios + alta umidade. Aplicar preventivamente antes da florada. Comum em lavouras de altitude.',
    carencia: 14,
    grupoQuimico: 'Antibiótico (aminoglicosídeo)',
    culturas: ['arabica'],
  },
  {
    nome: 'Amistar Top',
    principioAtivo: 'Azoxistrobina (200 g/L) + Difenoconazol (125 g/L)',
    categoria: 'fungicida',
    dose: '20 mL / 20L',
    doseHa: '0,5 L/ha',
    alvo: 'Ferrugem, Phoma, Mancha de Olho Pardo',
    periodo: ['Outubro', 'Dezembro', 'Fevereiro'],
    instrucao: 'Sistêmico de amplo espectro. Alternativa ao Miravis Duo para rotação de ativos em Arábica.',
    carencia: 30,
    grupoQuimico: 'Estrobilurina + Triazol',
    culturas: ['arabica'],
  },
  // ══════════════════════════════════════════════════════════════
  // ── FUNGICIDAS / PRAGAS EXCLUSIVOS CONILON ──
  // ══════════════════════════════════════════════════════════════
  {
    nome: 'Verdadero 600 WG',
    principioAtivo: 'Tiametoxam (200 g/kg) + Ciproconazol (80 g/kg)',
    categoria: 'fungicida',
    dose: '15 g / 20L',
    doseHa: '750 g/ha',
    alvo: 'Crespeira (Brevipalpus phoenicis) + Ferrugem',
    periodo: ['Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    instrucao: 'Dupla ação: controle do ácaro-vetor da Mancha Anular + fungicida sistêmico. Ideal para Conilon irrigado com alta pressão de crespeira.',
    carencia: 30,
    grupoQuimico: 'Neonicotinóide + Triazol',
    culturas: ['conilon'],
  },
  {
    nome: 'Abamectina 18 EC',
    principioAtivo: 'Abamectina (18 g/L)',
    categoria: 'acaricida',
    dose: '20 mL / 20L',
    doseHa: '0,5 L/ha',
    alvo: 'Ácaro-branco (Polyphagotarsonemus latus), Ácaro-vermelho',
    periodo: ['Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro'],
    instrucao: 'Ácaro-branco é praga-chave do Conilon (causa bronzeamento e deformação de folhas novas). Aplicar quando >20% de ramos atacados. Período seco = maior pressão.',
    carencia: 7,
    grupoQuimico: 'Avermectina',
    culturas: ['conilon'],
  },
  {
    nome: 'Envidor (Espirodiclofeno)',
    principioAtivo: 'Espirodiclofeno (240 g/L)',
    categoria: 'acaricida',
    dose: '10 mL / 20L',
    doseHa: '0,25 L/ha',
    alvo: 'Ácaro-branco, ovos e formas jovens',
    periodo: ['Julho', 'Agosto', 'Setembro'],
    instrucao: 'Ovicida/juvenicida. Alternar com Abamectina para manejo de resistência. Seletivo a ácaros predadores.',
    carencia: 14,
    grupoQuimico: 'Cetoenol',
    culturas: ['conilon'],
  },
  // ══════════════════════════════════════════════════════════════
  // ── INSETICIDAS (AMBAS ESPÉCIES) ──
  // ══════════════════════════════════════════════════════════════
  {
    nome: 'Actara 250 WG',
    principioAtivo: 'Tiametoxam (250 g/kg)',
    categoria: 'inseticida',
    dose: '4 g / 20L',
    doseHa: '200 g/ha',
    alvo: 'Bicho-mineiro (Leucoptera coffeella), Cochonilha',
    periodo: ['Outubro', 'Novembro', 'Dezembro', 'Janeiro'],
    instrucao: 'Foliar ou via solo (drench 100 mL/pl). Monitorar NDE: ≥30% de folhas minadas. Não misturar com Cobre.',
    carencia: 15,
    grupoQuimico: 'Neonicotinóide',
  },
  {
    nome: 'Premio (Clorantraniliprole)',
    principioAtivo: 'Clorantraniliprole (200 g/L)',
    categoria: 'inseticida',
    dose: '10 mL / 20L',
    doseHa: '0,25 L/ha',
    alvo: 'Bicho-mineiro, Broca-do-café (Hypothenemus hampei)',
    periodo: ['Novembro', 'Janeiro', 'Março'],
    instrucao: 'Alternativa ao Actara em áreas com resistência. Seletivo a abelhas em doses recomendadas.',
    carencia: 14,
    grupoQuimico: 'Diamida Antranílica',
  },
  {
    nome: 'Óleo Mineral (Nimbus/Assist)',
    principioAtivo: 'Óleo mineral parafínico (756 g/L)',
    categoria: 'acaricida',
    dose: '100 mL / 20L',
    doseHa: '2,5 L/ha',
    alvo: 'Ácaro-vermelho, Ácaro-branco (Polyphagotarsonemus latus)',
    periodo: ['Julho', 'Agosto', 'Setembro'],
    instrucao: 'Aplicar no período seco quando a infestação for > 30% de folhas atacadas. Pode ser usado como adjuvante.',
    grupoQuimico: 'Hidrocarboneto',
  },
  // ── INSETICIDA EXCLUSIVO ARÁBICA ──
  {
    nome: 'Voliam Targo',
    principioAtivo: 'Clorantraniliprole (100 g/L) + Abamectina (36 g/L)',
    categoria: 'inseticida',
    dose: '15 mL / 20L',
    doseHa: '0,375 L/ha',
    alvo: 'Bicho-mineiro + Ácaro-da-leprose (complexo sequeiro)',
    periodo: ['Outubro', 'Dezembro', 'Fevereiro'],
    instrucao: 'Produto combinado ideal para Arábica sequeiro onde bicho-mineiro e ácaros coexistem. Reduz número de aplicações.',
    carencia: 14,
    grupoQuimico: 'Diamida + Avermectina',
    culturas: ['arabica'],
  },
  // ══════════════════════════════════════════════════════════════
  // ── BIOESTIMULANTES (AMBAS ESPÉCIES) ──
  // ══════════════════════════════════════════════════════════════
  {
    nome: 'Stimulate',
    principioAtivo: 'AIB (0,005%) + GA₃ (0,005%) + Cinetina (0,009%)',
    categoria: 'bioestimulante',
    dose: '20 mL / 20L',
    doseHa: '0,5 L/ha',
    alvo: 'Enraizamento, pegamento, crescimento vegetativo',
    periodo: ['Outubro', 'Novembro', 'Dezembro', 'Janeiro', 'Fevereiro', 'Março', 'Abril'],
    instrucao: 'Aplicar na calda padrão mensal. Em mudas recém-transplantadas, fazer drench com 250 mL/planta.',
  },
  {
    nome: 'Trichodermil SC (Trichoderma harzianum)',
    principioAtivo: 'Trichoderma harzianum (2×10⁹ UFC/mL)',
    categoria: 'bioestimulante',
    dose: '660 mL / ha (fertirrigação)',
    doseHa: '0,66 L/ha',
    alvo: 'Biocontrole de Fusarium, Rhizoctonia; promoção de crescimento radicular',
    periodo: ['Dezembro', 'Março', 'Junho'],
    instrucao: 'Aplicar via fertirrigação ou drench. NÃO misturar com fungicidas cúpricos. Intervalo mínimo de 15 dias após aplicação de cobre.',
  },
  {
    nome: 'Serenade (Bacillus subtilis)',
    principioAtivo: 'Bacillus subtilis QST 713 (13,68 g/L)',
    categoria: 'bioestimulante',
    dose: '40 mL / 20L',
    doseHa: '1,0 L/ha',
    alvo: 'Cercosporiose, Phoma; indução de resistência sistêmica',
    periodo: ['Outubro', 'Dezembro', 'Fevereiro', 'Abril'],
    instrucao: 'Alternar com fungicidas químicos. Compatível com a maioria dos inseticidas. Aplicar ao entardecer.',
  },
  // ══════════════════════════════════════════════════════════════
  // ── HERBICIDAS (AMBAS ESPÉCIES) ──
  // ══════════════════════════════════════════════════════════════
  {
    nome: 'Glifosato (Roundup Original)',
    principioAtivo: 'Glifosato (480 g/L)',
    categoria: 'herbicida',
    dose: '60 mL / 20L',
    doseHa: '3,0 L/ha',
    alvo: 'Plantas daninhas nas entrelinhas',
    periodo: ['Outubro', 'Dezembro', 'Fevereiro'],
    instrucao: 'Aplicar SOMENTE nas entrelinhas com proteção contra deriva (chapéu-de-napoleão). NUNCA atingir o cafeeiro jovem.',
  },
  {
    nome: 'Yamato (Oxyfluorfen)',
    principioAtivo: 'Oxyfluorfen (240 g/L)',
    categoria: 'herbicida',
    dose: '30 mL / 20L',
    doseHa: '1,5 L/ha',
    alvo: 'Pré-emergente na trilhação (linha do café)',
    periodo: ['Outubro', 'Janeiro', 'Abril'],
    instrucao: 'Aplicar sobre solo limpo e úmido na linha do café. Forma barreira pré-emergente. Não aplicar sobre folhas.',
  },
];

/** Filtra defensivos por espécie de café */
function filterDefensivosByCoffeeType(
  defensivos: DefensivoFormacao[],
  coffeeType: CoffeeSpecies,
): DefensivoFormacao[] {
  return defensivos.filter(d =>
    !d.culturas || d.culturas.length === 0 || d.culturas.includes(coffeeType)
  );
}

/** Cronograma de defensivos agrupado por período fenológico para formação */
export interface ProtocoloPeriodo {
  periodo: string;
  meses: string[];
  foco: string;
  defensivos: DefensivoFormacao[];
}

export function getProtocoloPorPeriodo(coffeeType: CoffeeSpecies = 'conilon'): ProtocoloPeriodo[] {
  const filtered = filterDefensivosByCoffeeType(PROTOCOLO_DEFENSIVOS_FORMACAO, coffeeType);

  const focoConilon = {
    pre: 'Preventivo cúprico + controle de crespeira e ácaro-branco (pragas-chave do Conilon).',
    ini: 'Maior pressão de ferrugem e pragas. Fungicida sistêmico + inseticida se necessário.',
    exp: 'Pico vegetativo. Manter proteção fungicida e monitorar bicho-mineiro (NDE ≥ 30%).',
    sec: 'Reduzir aplicações. Foco em ácaros (ácaro-branco é crítico no Conilon em período seco) e biocontrole.',
  };

  const focoArabica = {
    pre: 'Preventivo contra Phoma e Mancha Aureolada (regiões de altitude). Cobre + Casugamicina.',
    ini: 'Ferrugem + Cercosporiose sob chuva. Rotação Triazol → Estrobilurina. Monitorar bicho-mineiro.',
    exp: 'Pico vegetativo. Manter rotação fungicida. Voliam Targo para bicho-mineiro + ácaros.',
    sec: 'Phoma em regiões frias/úmidas. Biocontrole (Trichoderma, Bacillus). Calagem se necessário.',
  };

  const foco = coffeeType === 'arabica' ? focoArabica : focoConilon;

  const periodos: ProtocoloPeriodo[] = [
    {
      periodo: 'Pré-Chuvas (Set–Out)',
      meses: ['Setembro', 'Outubro'],
      foco: foco.pre,
      defensivos: filtered.filter(d =>
        d.periodo.includes('Setembro') || d.periodo.includes('Outubro')
      ),
    },
    {
      periodo: 'Chuvas Iniciais (Nov–Dez)',
      meses: ['Novembro', 'Dezembro'],
      foco: foco.ini,
      defensivos: filtered.filter(d =>
        d.periodo.includes('Novembro') || d.periodo.includes('Dezembro')
      ),
    },
    {
      periodo: 'Expansão Rápida (Jan–Mar)',
      meses: ['Janeiro', 'Fevereiro', 'Março'],
      foco: foco.exp,
      defensivos: filtered.filter(d =>
        d.periodo.includes('Janeiro') || d.periodo.includes('Fevereiro') || d.periodo.includes('Março')
      ),
    },
    {
      periodo: 'Pós-Chuvas / Seco (Abr–Ago)',
      meses: ['Abril', 'Maio', 'Junho', 'Julho', 'Agosto'],
      foco: foco.sec,
      defensivos: filtered.filter(d =>
        d.periodo.includes('Abril') || d.periodo.includes('Maio') || d.periodo.includes('Junho') ||
        d.periodo.includes('Julho') || d.periodo.includes('Agosto')
      ),
    },
  ];
  return periodos;
}

/** Cores por categoria de defensivo */
export const CATEGORIA_DEFENSIVO_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  fungicida:      { label: 'Fungicida',      color: 'text-blue-700',    bgColor: 'bg-blue-50 border-blue-200',    icon: '🛡️' },
  inseticida:     { label: 'Inseticida',     color: 'text-red-700',     bgColor: 'bg-red-50 border-red-200',      icon: '🐛' },
  bioestimulante: { label: 'Bioestimulante', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: '🌱' },
  herbicida:      { label: 'Herbicida',      color: 'text-amber-700',   bgColor: 'bg-amber-50 border-amber-200',  icon: '🌿' },
  acaricida:      { label: 'Acaricida',      color: 'text-orange-700',  bgColor: 'bg-orange-50 border-orange-200', icon: '🕷️' },
};

// ─── 4º Passo: Aplicação via Solo / Drench ──────────────────────

export interface SoilApplicationEntry {
  momento: string;
  descricao: string;
  produtos: { nome: string; dose: string }[];
  instrucao: string;
}

export const APLICACOES_SOLO: SoilApplicationEntry[] = [
  {
    momento: '25 dias após plantio',
    descricao: 'Via Drench',
    produtos: [
      { nome: 'Durivo', dose: '25 mL' },
      { nome: 'Root', dose: '40 mL' },
      { nome: 'Matéria orgânica líquida', dose: '400 mL' },
    ],
    instrucao: 'Após fazer a calda, aplicar 50 mL por planta, sendo 25 mL de cada lado.',
  },
  {
    momento: '3 meses após plantio',
    descricao: 'Fertirrigação',
    produtos: [
      { nome: 'Trichodermil', dose: '660 mL' },
      { nome: 'Matéria orgânica líquida', dose: '5,3 L' },
    ],
    instrucao: 'Aplicar via sistema de fertirrigação.',
  },
  {
    momento: '6 meses após plantio',
    descricao: 'Fertirrigação',
    produtos: [
      { nome: 'Durivo', dose: '660 mL' },
      { nome: 'Matéria orgânica líquida', dose: '5,3 L' },
    ],
    instrucao: 'Aplicar via sistema de fertirrigação.',
  },
];

/** Observações gerais do plano de manejo */
export const OBSERVACOES_MANEJO = [
  'Para controle das plantas daninhas (controle do mato) na linha do café, recomenda-se a aplicação do produto Yamato na trilhação do café (30 mL por bomba), de forma a cobrir toda superfície do solo, que deverá estar limpo no momento da aplicação.',
  'UTILIZAR EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI) EM TODAS AS APLICAÇÕES.',
];

// Calculation engine

export interface CalcResult {
  // Per plant (g)
  gMapPlanta: number;
  descontoNMap: number;
  gCalcinitPlanta: number;
  descontoNCalcinit: number;
  gSulfatoAmoniaPlanta: number;
  descontoNSulfatoAmonia: number;
  gUreiaPlanta: number;
  gKclPlanta: number;
  // Totals (kg)
  totalMapKg: number;
  totalCalcinitKg: number;
  totalSulfatoAmoniaKg: number;
  totalUreiaKg: number;
  totalKclKg: number;
  totalMgKg: number;
  totalZnKg: number;
  totalBKg: number;
  totalCuKg: number;
  totalMnKg: number;
  // Reference values used
  doseP2O5: number;
  doseK2O: number;
  metaN: number;
  nFaltante: number;
}

export function findDoseP2O5(pSolo: number): number {
  const ref = REF_FOSFORO.find((r) => pSolo >= r.min && pSolo <= r.max);
  return ref ? ref.g_p2o5 : 20;
}

export function findDoseK2O(kSoloMgDm3: number): number {
  // Converter K de mg/dm³ para cmolc/dm³ (fator 391) antes de consultar a tabela
  const kCmolc = kSoloMgDm3 / 391;
  const ref = REF_POTASSIO.find((r) => kCmolc >= r.min && kCmolc <= r.max);
  return ref ? ref.g_k2o : 0;
}

export function calcularRecomendacao(
  culturaNome: string,
  plantas: number,
  pSolo: number,
  kSolo: number
): CalcResult {
  const cultura = CAD_CULTURAS.find((c) => c.nome === culturaNome);
  const metaN = cultura?.meta_n ?? 60;

  // Passo 1: Fósforo via MAP Purificado (61% P₂O₅, 12% N)
  const doseP2O5 = findDoseP2O5(pSolo);
  const mapP2O5Conc = FERTILIZANTES_FORMACAO.map.concentracao_p2o5 * 100; // 61
  const mapNConc = FERTILIZANTES_FORMACAO.map.concentracao_n * 100; // 12
  const gMapPlanta = (doseP2O5 / mapP2O5Conc) * 100;
  const descontoNMap = (gMapPlanta * mapNConc) / 100;
  const totalMapKg = (gMapPlanta * plantas) / 1000;

  // Passo 1b: Calcinit (Nitrato de Cálcio) – fonte complementar de N + Ca
  const gCalcinitPlanta = CALCINIT.gPlanta;
  const descontoNCalcinit = gCalcinitPlanta * CALCINIT.percN;
  const totalCalcinitKg = (gCalcinitPlanta * plantas) / 1000;

  // Passo 1c: Sulfato de Amônia — fonte de S (24%) + N complementar (22%)
  const gSulfatoAmoniaPlanta = META_MICROS.sulfato_amonia;
  const descontoNSulfatoAmonia = gSulfatoAmoniaPlanta * FERTILIZANTES_FORMACAO.sulfato_amonia.concentracao_n;
  const totalSulfatoAmoniaKg = (gSulfatoAmoniaPlanta * plantas) / 1000;

  // Passo 2: Nitrogênio via Uréia (45% N — desconta N do MAP + Calcinit + Sulfato de Amônia)
  const ureiaConc = FERTILIZANTES_FORMACAO.ureia.concentracao * 100; // 45
  const nFaltante = Math.max(0, metaN - descontoNMap - descontoNCalcinit - descontoNSulfatoAmonia);
  const gUreiaPlanta = (nFaltante / ureiaConc) * 100;
  const totalUreiaKg = (gUreiaPlanta * plantas) / 1000;

  // Passo 3: Potássio via KCl (60%)
  const kclConc = FERTILIZANTES_FORMACAO.kcl.concentracao * 100; // 60
  const doseK2O = findDoseK2O(kSolo);
  const gKclPlanta = (doseK2O / kclConc) * 100;
  const totalKclKg = (gKclPlanta * plantas) / 1000;

  // Passo 4: Micronutrientes
  const totalMgKg = (META_MICROS.sulfato_mg * plantas) / 1000;
  const totalZnKg = (META_MICROS.sulfato_zn * plantas) / 1000;
  const totalBKg = (META_MICROS.acido_borico * plantas) / 1000;
  const totalCuKg = (META_MICROS.sulfato_cu * plantas) / 1000;
  const totalMnKg = (META_MICROS.sulfato_mn * plantas) / 1000;

  return {
    gMapPlanta,
    descontoNMap,
    gCalcinitPlanta,
    descontoNCalcinit,
    gSulfatoAmoniaPlanta,
    descontoNSulfatoAmonia,
    gUreiaPlanta,
    gKclPlanta,
    totalMapKg,
    totalCalcinitKg,
    totalSulfatoAmoniaKg,
    totalUreiaKg,
    totalKclKg,
    totalMgKg,
    totalZnKg,
    totalBKg,
    totalCuKg,
    totalMnKg,
    doseP2O5,
    doseK2O,
    metaN,
    nFaltante,
  };
}

export interface ParcelRow {
  mes: string;
  ureiaKg: number;
  kclKg: number;
  calcinitKg: number;
  sulfatoAmoniaKg: number;
  sulfatoMgKg: number;
  sulfatoZnKg: number;
  acidoBoricoKg: number;
  sulfatoCuKg: number;
  sulfatoMnKg: number;
}

export function gerarParcelamento(culturaNome: string, result: CalcResult): ParcelRow[] {
  const meses = MATRIZ_PARCELAMENTO.filter((m) => m.cultura === culturaNome);

  return meses.map((m) => ({
    mes: m.mes,
    ureiaKg: result.totalUreiaKg * m.perc_ureia,
    kclKg: result.totalKclKg * m.perc_kcl,
    calcinitKg: result.totalCalcinitKg * m.perc_calcinit,
    sulfatoAmoniaKg: result.totalSulfatoAmoniaKg * m.perc_micro,
    sulfatoMgKg: result.totalMgKg * m.perc_micro,
    sulfatoZnKg: result.totalZnKg * m.perc_micro,
    acidoBoricoKg: result.totalBKg * m.perc_micro,
    sulfatoCuKg: result.totalCuKg * m.perc_micro,
    sulfatoMnKg: result.totalMnKg * m.perc_micro,
  }));
}
