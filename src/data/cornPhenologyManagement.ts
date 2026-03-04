// Guia de Manejo Fenológico do Milho (Grão e Silagem)
// Recomendações por fase: Solo, Fertirrigação, Foliar/Defensivos

export interface SprayRecipe {
  produto: string;
  dose: string;
  funcao: string;
  tipo: 'herbicida' | 'inseticida' | 'fungicida' | 'foliar' | 'adjuvante' | 'dessecante' | 'tratamento_semente' | 'fertirrigacao';
}

export interface FertigationData {
  acao: string;
  detalhe: string;
  calda: SprayRecipe[];
  volumeTanque: string; // ex: "500-1000 L"
  observacao: string;
}

export interface PhenologicalManagement {
  fase: string;
  faseLabel: string;
  identificacaoVisual: string;
  icone: string;
  corFundo: string;
  solo: {
    acao: string;
    detalhe: string;
  } | null;
  fertirrigacao: FertigationData | null;
  foliarDefensivos: {
    acao: string;
    detalhe: string;
    calda: SprayRecipe[];
    volumeCalda: string;
    adjuvante: SprayRecipe | null;
    observacao: string;
  };
}

export const CORN_PHENOLOGY_MANAGEMENT: PhenologicalManagement[] = [
  {
    fase: 'PRE_PLANTIO',
    faseLabel: 'Pré-Plantio',
    identificacaoVisual: 'Solo nu, sem cobertura vegetal ou palhada a ser dessecada',
    icone: '🌱',
    corFundo: 'hsl(30, 60%, 95%)',
    solo: {
      acao: 'Gesso + Calcário',
      detalhe: 'Aprofundar raiz é vital para silagem (busca de água em profundidade). Aplicar calcário conforme V% e gesso agrícola (1-2 t/ha) se Al³⁺ subsuperficial > 0,5 cmolc/dm³.',
    },
    fertirrigacao: null,
    foliarDefensivos: {
      acao: 'Dessecação — Limpeza Total',
      detalhe: 'Eliminar plantas daninhas antes do plantio. Operar 15-21 dias antes da semeadura.',
      calda: [
        { produto: 'Glifosato (480 g/L)', dose: '2,0 - 3,0 L/ha', funcao: 'Dessecante sistêmico de amplo espectro', tipo: 'dessecante' },
        { produto: 'Cletodim (240 g/L)', dose: '0,35 - 0,45 L/ha', funcao: 'Graminicida pós-emergente (capim-amargoso, capim-pé-de-galinha)', tipo: 'herbicida' },
      ],
      volumeCalda: '150-200 L/ha (barra tratorizada)',
      adjuvante: { produto: 'Óleo Mineral (Nimbus / Assist)', dose: '0,5 L/ha', funcao: 'Melhora absorção e penetração cuticular', tipo: 'adjuvante' },
      observacao: 'Aplicar em condições ideais: temp. < 30°C, UR > 60%, vento 3-10 km/h. Evitar inversão térmica.',
    },
  },
  {
    fase: 'VE',
    faseLabel: 'Plantio (VE)',
    identificacaoVisual: 'Semente recém-germinada, coleóptilo rompendo o solo',
    icone: '🌾',
    corFundo: 'hsl(120, 40%, 95%)',
    solo: {
      acao: 'Base Forte (NPK + Zn) no sulco',
      detalhe: 'Ex: 08-24-12 + Zinco. O Fósforo DEVE estar no sulco de plantio para máxima eficiência. Dose conforme análise de solo.',
    },
    fertirrigacao: null,
    foliarDefensivos: {
      acao: 'Tratamento de Sementes (TS)',
      detalhe: 'Proteção inicial contra pragas de solo e percevejo-barriga-verde. Inseticida no TS é OBRIGATÓRIO.',
      calda: [
        { produto: 'Fipronil + Piraclostrobina (Standak Top)', dose: '200 mL/100 kg semente', funcao: 'Inseticida + Fungicida no TS', tipo: 'tratamento_semente' },
        { produto: 'Tiametoxam (Cruiser 350 FS)', dose: '300 mL/100 kg semente', funcao: 'Inseticida sistêmico (percevejo, coró)', tipo: 'tratamento_semente' },
      ],
      volumeCalda: 'Aplicação industrial no TS (sem calda de campo)',
      adjuvante: null,
      observacao: 'Garantir cobertura uniforme das sementes. Complementar com inseticida no sulco se pressão de percevejo for alta na região.',
    },
  },
  {
    fase: 'V3_V5',
    faseLabel: 'Definição (V3 - V5)',
    identificacaoVisual: '3 a 5 folhas completamente expandidas. Planta com ~20-40 cm de altura.',
    icone: '🌿',
    corFundo: 'hsl(142, 50%, 94%)',
    solo: {
      acao: '1ª Cobertura (V4): UREIA',
      detalhe: 'Aplique 60% do Nitrogênio total aqui. O milho define o número de fileiras e o tamanho potencial da espiga NESTE MOMENTO. Atraso = perda irreversível.',
    },
    fertirrigacao: {
      acao: 'Ureia Líquida via Pivô',
      detalhe: 'Injetar Nitrogênio pesado (UAN-32 ou Ureia dissolvida). Manter lâmina de irrigação adequada. Aplicar 60% do N total nesta fase.',
      calda: [
        { produto: 'UAN-32 (32% N)', dose: '150 - 200 L/ha', funcao: 'Fonte líquida de Nitrogênio (amídico + nítrico + amoniacal)', tipo: 'fertirrigacao' },
        { produto: 'Sulfato de Zinco (22% Zn)', dose: '3,0 - 5,0 kg/ha', funcao: 'Micronutriente essencial — destrava crescimento vegetativo', tipo: 'fertirrigacao' },
      ],
      volumeTanque: '500-1000 L',
      observacao: 'Dissolver completamente o Sulfato de Zinco antes de injetar. Não misturar com fosfatados. Injetar em lâmina de irrigação de 5-8mm.',
    },
    foliarDefensivos: {
      acao: 'Herbicida Pós-Emergente + Zinco Foliar',
      detalhe: 'Janela crítica para controle de plantas daninhas. O Zinco destrava o crescimento vegetativo. CUIDADO com fitotoxidez — respeitar estádio e dose.',
      calda: [
        { produto: 'Atrazina (500 g/L)', dose: '3,0 - 4,0 L/ha', funcao: 'Herbicida pré/pós-emergente (folhas largas)', tipo: 'herbicida' },
        { produto: 'Nicosulfuron (40 g/L)', dose: '1,25 - 1,5 L/ha', funcao: 'Herbicida pós-emergente (gramíneas)', tipo: 'herbicida' },
        { produto: 'Sulfato de Zinco (22% Zn)', dose: '1,0 - 2,0 kg/ha', funcao: 'Nutrição foliar — destrava crescimento', tipo: 'foliar' },
      ],
      volumeCalda: '200-250 L/ha (barra tratorizada) ou 20-30 L/ha (drone)',
      adjuvante: { produto: 'Espalhante Adesivo (Silwet / Break-Thru)', dose: '100 mL/100 L calda', funcao: 'Reduz tensão superficial e melhora cobertura foliar', tipo: 'adjuvante' },
      observacao: '⚠️ Não misturar Nicosulfuron com organofosforados. Verificar compatibilidade do híbrido com Nicosulfuron (alguns são sensíveis).',
    },
  },
  {
    fase: 'V6_V8',
    faseLabel: 'Crescimento (V6 - V8)',
    identificacaoVisual: 'Planta na altura do joelho a cintura (~60-100 cm). Cartucho formando.',
    icone: '🌳',
    corFundo: 'hsl(142, 60%, 92%)',
    solo: {
      acao: '2ª Cobertura (V8): UREIA + KCL',
      detalhe: 'Restante do Nitrogênio (40%) e Potássio. Se faltar água agora, a quebra de produtividade é certa.',
    },
    fertirrigacao: {
      acao: 'N + K via Pivô',
      detalhe: 'Manter suprimento contínuo de Nitrogênio e Potássio. Complementar com K₂SO₄ para evitar deficiência de K e S.',
      calda: [
        { produto: 'UAN-32 (32% N)', dose: '80 - 120 L/ha', funcao: 'Restante do Nitrogênio (40% do total)', tipo: 'fertirrigacao' },
        { produto: 'Cloreto de Potássio (KCl 60%)', dose: '30 - 50 kg/ha', funcao: 'Reposição de Potássio — enchimento de grão e resistência a seca', tipo: 'fertirrigacao' },
        { produto: 'Ácido Bórico (17% B)', dose: '1,0 - 2,0 kg/ha', funcao: 'Micronutriente — auxilia na polinização e pegamento de grão', tipo: 'fertirrigacao' },
      ],
      volumeTanque: '500-1000 L',
      observacao: 'Dissolver KCl e Ácido Bórico separadamente antes de adicionar ao tanque. Aplicar em lâmina de 5-8mm. Não misturar KCl com Sulfato de Cálcio.',
    },
    foliarDefensivos: {
      acao: 'Lagarticida (V6-V8) — Monitorar Cartucho',
      detalhe: 'Monitorar lagarta-do-cartucho (Spodoptera frugiperda). Aplique ANTES de fechar o cartucho para garantir contato.',
      calda: [
        { produto: 'Clorantraniliprole (Premio)', dose: '100 - 150 mL/ha', funcao: 'Inseticida (lagartas — diamida)', tipo: 'inseticida' },
        { produto: 'Metomil (Lannate)', dose: '0,6 - 1,0 L/ha', funcao: 'Inseticida de contato/ingestão (lagartas)', tipo: 'inseticida' },
        { produto: 'Boro (Ácido Bórico 17%)', dose: '0,5 - 1,0 kg/ha', funcao: 'Nutrição foliar — auxilia na polinização', tipo: 'foliar' },
      ],
      volumeCalda: '150-200 L/ha (barra) ou 10-15 L/ha (drone — direcionado ao cartucho)',
      adjuvante: { produto: 'Óleo Vegetal (Aureo / Veget Oil)', dose: '0,5 L/ha', funcao: 'Melhora penetração no cartucho e reduz evaporação', tipo: 'adjuvante' },
      observacao: 'Preferir aplicação no final da tarde (lagarta ativa à noite). Em drone, usar bico cônico para penetrar no cartucho.',
    },
  },
  {
    fase: 'VT',
    faseLabel: 'Pendoamento (VT)',
    identificacaoVisual: 'Pendão (parte masculina) solto, liberando pólen. Planta na altura máxima.',
    icone: '🌽',
    corFundo: 'hsl(45, 70%, 92%)',
    solo: null,
    fertirrigacao: {
      acao: 'Fertirrigação Final',
      detalhe: 'Última injeção de N (pequena dose) e K (dose média) para enchimento de grão. Manter irrigação — estresse hídrico agora = aborto de óvulos.',
      calda: [
        { produto: 'Nitrato de Potássio (13-0-44)', dose: '30 - 50 kg/ha', funcao: 'N + K simultâneo — enchimento de grão sem excesso de N', tipo: 'fertirrigacao' },
        { produto: 'MAP Purificado (12-61-0)', dose: '10 - 15 kg/ha', funcao: 'Fósforo solúvel para translocação ao grão', tipo: 'fertirrigacao' },
      ],
      volumeTanque: '500-1000 L',
      observacao: 'Dose reduzida de N para evitar acamamento. Priorizar K para enchimento. Manter irrigação constante — estresse hídrico agora = aborto de óvulos.',
    },
    foliarDefensivos: {
      acao: 'Fungicida (Pré-VT / VT) — Sanidade Foliar',
      detalhe: 'Aplicação aérea ou tratorizada com autopropelido alto. NENHUMA entrada de trator convencional — risco de quebrar plantas.',
      calda: [
        { produto: 'Azoxistrobina + Ciproconazol (Priori Xtra)', dose: '300 mL/ha', funcao: 'Fungicida sistêmico (Cercospora, Ferrugem, Helmintospório)', tipo: 'fungicida' },
        { produto: 'Mancozebe (Dithane)', dose: '2,0 - 2,5 kg/ha', funcao: 'Fungicida protetor de contato (amplo espectro)', tipo: 'fungicida' },
        { produto: 'Manganês Quelatado (10%)', dose: '0,5 - 1,0 L/ha', funcao: 'Nutrição foliar — ativa enzimas de defesa', tipo: 'foliar' },
      ],
      volumeCalda: '100-150 L/ha (aéreo/autopropelido) ou 15-20 L/ha (drone)',
      adjuvante: { produto: 'Óleo Mineral (Nimbus)', dose: '0,5 L/ha', funcao: 'Melhora cobertura e aderência do fungicida', tipo: 'adjuvante' },
      observacao: '⚠️ NENHUMA entrada de trator convencional nesta fase. Usar aviação agrícola, drone ou autopropelido alto.',
    },
  },
  {
    fase: 'R1_R5',
    faseLabel: 'Grão (R1 - R5)',
    identificacaoVisual: 'Espiga formando, grão passando de leitoso → pastoso → farináceo. Linha do leite descendo.',
    icone: '🌾',
    corFundo: 'hsl(40, 50%, 93%)',
    solo: null,
    fertirrigacao: {
      acao: 'ÁGUA — Irrigação Prioritária',
      detalhe: 'O milho silagem precisa de água para encher o grão (amido = qualidade). Manter irrigação até ⅔ da linha do leite.',
      calda: [],
      volumeTanque: 'N/A',
      observacao: 'Apenas irrigação. Nenhuma fertirrigação nesta fase. Manter lâmina adequada até ponto de corte.',
    },
    foliarDefensivos: {
      acao: 'Monitoramento — Aguardar Ponto de Corte',
      detalhe: 'Nenhuma aplicação foliar recomendada. Apenas monitorar sanidade e aguardar ponto ideal de corte (⅔ linha do leite, 30-35% MS).',
      calda: [],
      volumeCalda: 'N/A',
      adjuvante: null,
      observacao: 'Ponto de corte silagem: ⅔ da linha do leite (30-35% MS). Corte precoce = excesso de umidade e efluente. Corte tardio = baixa digestibilidade.',
    },
  },
];

// Cores por tipo de produto para badges
export const TIPO_PRODUTO_COLORS: Record<string, { bg: string; text: string }> = {
  herbicida: { bg: 'bg-orange-100', text: 'text-orange-700' },
  inseticida: { bg: 'bg-red-100', text: 'text-red-700' },
  fungicida: { bg: 'bg-purple-100', text: 'text-purple-700' },
  foliar: { bg: 'bg-green-100', text: 'text-green-700' },
  adjuvante: { bg: 'bg-blue-100', text: 'text-blue-700' },
  dessecante: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  tratamento_semente: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  fertirrigacao: { bg: 'bg-sky-100', text: 'text-sky-700' },
};

export const TIPO_PRODUTO_LABELS: Record<string, string> = {
  herbicida: 'Herbicida',
  inseticida: 'Inseticida',
  fungicida: 'Fungicida',
  foliar: 'Foliar',
  adjuvante: 'Adjuvante',
  dessecante: 'Dessecante',
  tratamento_semente: 'Trat. Semente',
  fertirrigacao: 'Fertirrigação',
};

export const FERTIGATION_TANK_PRESETS = [
  { value: 300, label: '300 L' },
  { value: 500, label: '500 L' },
  { value: 1000, label: '1.000 L' },
  { value: 2000, label: '2.000 L' },
];
