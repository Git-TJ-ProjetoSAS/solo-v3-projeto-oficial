// ─── Pre-defined TankMix Products for Fertigation ───────────
// These are always available in the product selector, independent of the user's insumo catalog.
// IDs are prefixed with "tankmix-" to avoid collisions with DB insumos.

export interface TankmixPreset {
  id: string;
  nome: string;
  tipo_produto: string;
  preco: number;
  tamanho_unidade: number;
  medida: string;
  principios_ativos: null;
  recomendacao_dose_ha: number;
  recomendacao_dose_unidade: string;
  macro_n: number;
  macro_p2o5: number;
  macro_k2o: number;
  macro_s: number;
  micro_b: number;
  micro_zn: number;
  micro_cu: number;
  micro_mn: number;
  micro_fe: number;
  micro_mo: number;
  isPreset: true;
}

export const TANKMIX_PRESETS: TankmixPreset[] = [
  // ── GRUPO A: Cálcio ──
  {
    id: 'tankmix-a1', nome: 'Nitrato de Cálcio', tipo_produto: 'Cobertura',
    preco: 135, tamanho_unidade: 25, medida: 'kg', principios_ativos: null,
    recomendacao_dose_ha: 5, recomendacao_dose_unidade: 'Kg/ha',
    macro_n: 15.5, macro_p2o5: 0, macro_k2o: 0, macro_s: 0,
    micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  // ── GRUPO B: Sulfatos / Fosfatos ──
  {
    id: 'tankmix-b1', nome: 'Sulfato de Amônio', tipo_produto: 'Cobertura',
    preco: 120, tamanho_unidade: 50, medida: 'kg', principios_ativos: null,
    recomendacao_dose_ha: 5, recomendacao_dose_unidade: 'Kg/ha',
    macro_n: 21, macro_p2o5: 0, macro_k2o: 0, macro_s: 24,
    micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  {
    id: 'tankmix-b2', nome: 'MAP Purificado', tipo_produto: 'Plantio',
    preco: 180, tamanho_unidade: 25, medida: 'kg', principios_ativos: null,
    recomendacao_dose_ha: 3, recomendacao_dose_unidade: 'Kg/ha',
    macro_n: 12, macro_p2o5: 61, macro_k2o: 0, macro_s: 0,
    micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  {
    id: 'tankmix-b3', nome: 'Ácido Fosfórico', tipo_produto: 'Foliar',
    preco: 65, tamanho_unidade: 5, medida: 'litro', principios_ativos: null,
    recomendacao_dose_ha: 0.5, recomendacao_dose_unidade: 'L/ha',
    macro_n: 0, macro_p2o5: 52, macro_k2o: 0, macro_s: 0,
    micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  {
    id: 'tankmix-b4', nome: 'Sulfato de Magnésio', tipo_produto: 'Cobertura',
    preco: 85, tamanho_unidade: 25, medida: 'kg', principios_ativos: null,
    recomendacao_dose_ha: 3, recomendacao_dose_unidade: 'Kg/ha',
    macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 13,
    micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  {
    id: 'tankmix-b5', nome: 'Micros Sais (Sulfato Zn, Mn, Cu)', tipo_produto: 'Foliar',
    preco: 48, tamanho_unidade: 5, medida: 'kg', principios_ativos: null,
    recomendacao_dose_ha: 2, recomendacao_dose_unidade: 'Kg/ha',
    macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 10,
    micro_b: 0, micro_zn: 8, micro_cu: 3, micro_mn: 5, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  {
    id: 'tankmix-b6', nome: 'Ácido Bórico', tipo_produto: 'Foliar',
    preco: 32, tamanho_unidade: 5, medida: 'kg', principios_ativos: null,
    recomendacao_dose_ha: 1, recomendacao_dose_unidade: 'Kg/ha',
    macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 0,
    micro_b: 17, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  // ── GRUPO C: Neutros / Quelatos ──
  {
    id: 'tankmix-c1', nome: 'Ureia', tipo_produto: 'Cobertura',
    preco: 150, tamanho_unidade: 50, medida: 'kg', principios_ativos: null,
    recomendacao_dose_ha: 5, recomendacao_dose_unidade: 'Kg/ha',
    macro_n: 46, macro_p2o5: 0, macro_k2o: 0, macro_s: 0,
    micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  {
    id: 'tankmix-c2', nome: 'Cloreto de Potássio (Branco)', tipo_produto: 'Cobertura',
    preco: 180, tamanho_unidade: 50, medida: 'kg', principios_ativos: null,
    recomendacao_dose_ha: 4, recomendacao_dose_unidade: 'Kg/ha',
    macro_n: 0, macro_p2o5: 0, macro_k2o: 60, macro_s: 0,
    micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  {
    id: 'tankmix-c3', nome: 'Nitrato de Potássio', tipo_produto: 'Cobertura',
    preco: 210, tamanho_unidade: 25, medida: 'kg', principios_ativos: null,
    recomendacao_dose_ha: 4, recomendacao_dose_unidade: 'Kg/ha',
    macro_n: 13, macro_p2o5: 0, macro_k2o: 44, macro_s: 0,
    micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  {
    id: 'tankmix-c4', nome: 'Micros Quelatados (EDTA)', tipo_produto: 'Foliar',
    preco: 95, tamanho_unidade: 5, medida: 'kg', principios_ativos: null,
    recomendacao_dose_ha: 1, recomendacao_dose_unidade: 'Kg/ha',
    macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 0,
    micro_b: 1, micro_zn: 5, micro_cu: 2, micro_mn: 4, micro_fe: 6, micro_mo: 0.1,
    isPreset: true,
  },
  // ── GRUPO D: Defensivos ──
  {
    id: 'tankmix-d1', nome: 'Inseticida Sistêmico (Imidacloprido)', tipo_produto: 'Inseticida',
    preco: 85, tamanho_unidade: 1, medida: 'litro', principios_ativos: null,
    recomendacao_dose_ha: 0.3, recomendacao_dose_unidade: 'L/ha',
    macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 0,
    micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  {
    id: 'tankmix-d2', nome: 'Fungicida Solo (Flutriafol)', tipo_produto: 'Fungicida',
    preco: 120, tamanho_unidade: 1, medida: 'litro', principios_ativos: null,
    recomendacao_dose_ha: 0.5, recomendacao_dose_unidade: 'L/ha',
    macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 0,
    micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  {
    id: 'tankmix-d3', nome: 'Nematicida Biológico', tipo_produto: 'Inseticida',
    preco: 75, tamanho_unidade: 1, medida: 'litro', principios_ativos: null,
    recomendacao_dose_ha: 1, recomendacao_dose_unidade: 'L/ha',
    macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 0,
    micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
  // ── GRUPO E: Limpeza / Cloro ──
  {
    id: 'tankmix-e1', nome: 'Hipoclorito de Sódio (Cloro)', tipo_produto: 'Adjuvantes',
    preco: 18, tamanho_unidade: 5, medida: 'litro', principios_ativos: null,
    recomendacao_dose_ha: 0.2, recomendacao_dose_unidade: 'L/ha',
    macro_n: 0, macro_p2o5: 0, macro_k2o: 0, macro_s: 0,
    micro_b: 0, micro_zn: 0, micro_cu: 0, micro_mn: 0, micro_fe: 0, micro_mo: 0,
    isPreset: true,
  },
];
