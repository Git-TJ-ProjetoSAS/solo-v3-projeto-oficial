export interface Macronutrientes {
  n: number;
  p2o5: number;
  k2o: number;
  ca: number;
  s: number;
}

export interface Micronutrientes {
  b: number;
  zn: number;
  cu: number;
  mn: number;
  fe: number;
  mo: number;
  co: number;
  se: number;
  mg: number;
  carbonoOrganico: number;
}

export interface Correcao {
  caco3: number;
  camg: number;
  prnt: number;
}

// Interface para princípios ativos
export interface PrincipioAtivo {
  nome: string;
  concentracao: number;
  unidade: string;
}

// Tipos de produtos que suportam princípios ativos
export const TIPOS_COM_PRINCIPIOS_ATIVOS = [
  'Foliar',
  'Fungicida',
  'Inseticida',
  'Herbicida',
  'Adjuvantes',
  'Bioestimulante',
] as const;

// Unidades de dose recomendada
export const UNIDADES_DOSE = [
  'L/ha',
  'mL/ha',
  'kg/ha',
  'g/ha',
] as const;

export interface MateriaOrganicaNutrientes {
  n: number;
  k2o: number;
  carbonoOrganicoTotal: number;
  acidoHumico: number;
  acidoFulvico: number;
  materiaOrganica: number;
  aminoacidos: number;
}

export interface Insumo {
  id: string;
  culturas: string[];
  tipoProduto: string;
  nome: string;
  marca: string;
  fornecedor: string;
  status: 'ativo' | 'inativo';
  tamanhoUnidade: number;
  medida: 'kg' | 'litro';
  preco: number;
  macronutrientes: Macronutrientes;
  micronutrientes: Micronutrientes;
  correcao: Correcao;
  principiosAtivos: PrincipioAtivo[];
  recomendacaoDoseHa: number;
  recomendacaoDoseUnidade: string;
  solubilidade: number;
  indiceSalino: number;
  materiaOrganicaNutrientes: MateriaOrganicaNutrientes;
  observacoes: string;
  fotoUrl: string | null;
  createdAt: Date;
}

export const CULTURAS = [
  'Milho Grão',
  'Milho Silagem',
  'Café',
] as const;

export const TIPOS_PRODUTO = [
  'Correção de Solo',
  'Plantio',
  'Cobertura',
  'Foliar',
  'Fungicida',
  'Inseticida',
  'Herbicida',
  'Adjuvantes',
  'Bioestimulante',
  'Matéria Orgânica',
] as const;

export const TAMANHOS_SACARIA = [10, 25, 50] as const;
export const TAMANHOS_LITROS = [1, 5, 10, 20] as const;

export const MEDIDAS = [
  { value: 'kg', label: 'KG', divisor: 1 },
  { value: 'litro', label: 'Litro', divisor: 1 },
] as const;

export const MACRONUTRIENTES_LABELS = {
  n: 'N (Nitrogênio)',
  p2o5: 'P₂O₅ (Fósforo)',
  k2o: 'K₂O (Potássio)',
  ca: 'Ca (Cálcio)',
  s: 'S (Enxofre)',
} as const;

export const MICRONUTRIENTES_LABELS = {
  b: 'B (Boro)',
  zn: 'Zn (Zinco)',
  cu: 'Cu (Cobre)',
  mn: 'Mn (Manganês)',
  fe: 'Fe (Ferro)',
  mo: 'Mo (Molibdênio)',
  co: 'Co (Cobalto)',
  se: 'Se (Selênio)',
  mg: 'Mg (Magnésio)',
  carbonoOrganico: 'C.O. (Carbono Orgânico)',
} as const;

export const CORRECAO_LABELS = {
  caco3: 'CaO (Óxido de Cálcio)',
  camg: 'MgO (Óxido de Magnésio)',
  prnt: 'PRNT',
} as const;

export type InsumoFormData = Omit<Insumo, 'id' | 'createdAt'>;

