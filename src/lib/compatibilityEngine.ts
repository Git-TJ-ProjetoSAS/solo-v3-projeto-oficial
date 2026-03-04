// ─── Chemical Compatibility Engine for Fertigation/Spraying ──
// Classifies real insumos into compatibility groups and checks mix safety.

export type CompatGroup = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ClassifiedProduct {
  id: string;
  name: string;
  type: string;
  group: CompatGroup;
}

export interface CompatAlert {
  level: 'error' | 'warning';
  title: string;
  message: string;
  products: string[];
  suggestion?: string;
}

// ─── Group Labels ────────────────────────────────────────────
export const GROUP_INFO: Record<CompatGroup, { label: string; desc: string; colorClass: string; badgeColor: string }> = {
  A: { label: 'Grupo A', desc: 'Cálcio', colorClass: 'bg-red-500/15 border-red-500/40 text-red-400', badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30' },
  B: { label: 'Grupo B', desc: 'Sulfatos/Fosfatos', colorClass: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400', badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  C: { label: 'Grupo C', desc: 'Neutros/Quelatos', colorClass: 'bg-green-500/15 border-green-500/40 text-green-400', badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30' },
  D: { label: 'Grupo D', desc: 'Defensivos', colorClass: 'bg-purple-500/15 border-purple-500/40 text-purple-400', badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  E: { label: 'Grupo E', desc: 'Limpeza/Cloro', colorClass: 'bg-gray-500/15 border-gray-500/40 text-gray-400', badgeColor: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

// ─── Classify an insumo into a compatibility group ───────────
export interface InsumoForClassification {
  nome: string;
  tipo_produto: string;
  macro_n?: number;
  macro_p2o5?: number;
  macro_k2o?: number;
  macro_s?: number;
  micro_b?: number;
  micro_zn?: number;
  micro_mn?: number;
  micro_cu?: number;
  micro_fe?: number;
}

export function classifyInsumo(insumo: InsumoForClassification): CompatGroup {
  const tipo = insumo.tipo_produto;
  const nome = insumo.nome.toLowerCase();

  // Group D — Defensivos (Fungicida, Inseticida, Herbicida, Nematicida)
  if (['Fungicida', 'Inseticida', 'Herbicida'].includes(tipo)) return 'D';
  if (nome.includes('nematicida') || nome.includes('inseticida') || nome.includes('fungicida')) return 'D';

  // Group E — Cloro / Limpeza
  if (nome.includes('cloro') || nome.includes('hipoclorito')) return 'E';

  // Group A — Cálcio (Nitrato de Cálcio, fontes de Ca puras)
  if (nome.includes('nitrato de cálcio') || nome.includes('nitrato de calcio')) return 'A';
  if (nome.includes('cloreto de cálcio') || nome.includes('cloreto de calcio')) return 'A';
  if (tipo === 'Correção de Solo' && (nome.includes('cálcio') || nome.includes('calcio')) && !(nome.includes('sulfato'))) return 'A';

  // Group B — Sulfatos, Fosfatos, Ácidos, Micros Sulfatados
  const p2o5 = insumo.macro_p2o5 || 0;
  const s = insumo.macro_s || 0;
  if (nome.includes('sulfato') || nome.includes('fosfór') || nome.includes('fosfor') || nome.includes('map ') || nome.includes('map.')) return 'B';
  if (nome.includes('ácido bórico') || nome.includes('acido borico')) return 'B';
  if (nome.includes('ácido fosfórico') || nome.includes('acido fosforico')) return 'B';
  if (p2o5 > 15) return 'B'; // High phosphorus content
  if (s > 10) return 'B'; // High sulfur content = likely sulfate
  // Micro sulfatados
  if (nome.includes('sulfato de zinco') || nome.includes('sulfato de manganês') || nome.includes('sulfato de cobre')) return 'B';

  // Group C — Neutros: Ureia, KCl, Quelatos, Foliar, Cobertura, Adjuvantes, Plantio
  return 'C';
}

// ─── Check compatibility of a mix ────────────────────────────
export function checkMixCompatibility(products: ClassifiedProduct[]): CompatAlert[] {
  if (products.length < 2) return [];

  const alerts: CompatAlert[] = [];
  const groups = new Set(products.map(p => p.group));
  const hasA = groups.has('A');
  const hasB = groups.has('B');
  const hasC = groups.has('C');
  const hasD = groups.has('D');
  const hasE = groups.has('E');

  const namesByGroup = (g: CompatGroup) => products.filter(p => p.group === g).map(p => p.name);

  // A + B: CRITICAL — Precipitation
  if (hasA && hasB) {
    alerts.push({
      level: 'error',
      title: '⛔ Precipitação / Formação de Gesso',
      message: 'Cálcio (Grupo A) + Sulfatos/Fosfatos (Grupo B) causam precipitação imediata, entupimento de gotejadores e perda do produto.',
      products: [...namesByGroup('A'), ...namesByGroup('B')],
      suggestion: 'Separe em tanques diferentes. Injete o Cálcio primeiro e os Sulfatos/Fosfatos depois.',
    });
  }

  // D + E: CRITICAL — Molecule inactivation
  if (hasD && hasE) {
    alerts.push({
      level: 'error',
      title: '⛔ Inativação da Molécula Ativa',
      message: 'Cloro inativa defensivos biológicos e químicos! Aplique em momentos completamente diferentes.',
      products: [...namesByGroup('D'), ...namesByGroup('E')],
      suggestion: 'Aplique os defensivos primeiro. Faça a cloração somente após finalizar toda a quimigação.',
    });
  }

  // D + KCl (contains Cl-)
  const hasKCl = products.some(p => p.name.toLowerCase().includes('cloreto de potássio') || p.name.toLowerCase().includes('kcl'));
  if (hasD && hasKCl) {
    alerts.push({
      level: 'error',
      title: '⛔ Cloro do KCl + Defensivo',
      message: 'O Cloreto de Potássio libera íons cloro que podem inativar defensivos. Aplique separadamente.',
      products: [...namesByGroup('D'), ...products.filter(p => p.name.toLowerCase().includes('cloreto') || p.name.toLowerCase().includes('kcl')).map(p => p.name)],
      suggestion: 'Use Nitrato de Potássio ou Sulfato de Potássio como alternativa ao KCl durante a quimigação.',
    });
  }

  // D + Concentrated fertilizers: WARNING — Hydrolysis
  if (hasD && (hasA || hasB || hasC)) {
    alerts.push({
      level: 'warning',
      title: '⚠️ Risco de Hidrólise / Salting Out',
      message: 'A alta concentração de sais ou pH extremo do adubo pode reduzir a eficiência do defensivo. Recomendado aplicar o defensivo sozinho ou injetar separadamente.',
      products: [...namesByGroup('D'), ...namesByGroup('A'), ...namesByGroup('B'), ...namesByGroup('C')],
      suggestion: 'Injete os adubos primeiro e aplique o defensivo sozinho no final (Tanque Único).',
    });
  }

  return alerts;
}

// ─── Injection Order Suggestion ──────────────────────────────
export function getInjectionOrder(products: ClassifiedProduct[]): string[] | null {
  const groups = new Set(products.map(p => p.group));
  const hasIncompatible =
    (groups.has('A') && groups.has('B')) ||
    (groups.has('D') && groups.has('E')) ||
    (groups.has('D') && (groups.has('A') || groups.has('B') || groups.has('C')));

  if (!hasIncompatible || products.length < 2) return null;

  const order: string[] = ['1º — Água limpa no sistema'];
  let step = 2;
  if (groups.has('A')) { order.push(`${step}º — Tanque A: ${products.filter(p => p.group === 'A').map(p => p.name).join(', ')}`); step++; }
  if (groups.has('B')) { order.push(`${step}º — Tanque B: ${products.filter(p => p.group === 'B').map(p => p.name).join(', ')}`); step++; }
  if (groups.has('C')) { order.push(`${step}º — Tanque C: ${products.filter(p => p.group === 'C').map(p => p.name).join(', ')}`); step++; }
  if (groups.has('D')) { order.push(`${step}º — Defensivos (SOZINHO): ${products.filter(p => p.group === 'D').map(p => p.name).join(', ')}`); step++; }
  if (groups.has('E')) { order.push(`${step}º — Limpeza com Cloro (APÓS toda aplicação)`); }

  return order;
}
