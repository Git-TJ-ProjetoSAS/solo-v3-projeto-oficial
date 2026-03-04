// Faixas de suficiência para análise foliar de Milho (Malavolta/Embrapa)
// Valores por estádio fenológico

export type PhenologicalStage = 'V4' | 'V6' | 'V8' | 'V10' | 'VT' | 'R1' | 'R2' | 'R3';

export const PHENOLOGICAL_STAGES: { value: PhenologicalStage; label: string; description: string }[] = [
  { value: 'V4', label: 'V4', description: '4 folhas expandidas' },
  { value: 'V6', label: 'V6', description: '6 folhas expandidas' },
  { value: 'V8', label: 'V8', description: '8 folhas expandidas (folha oposta e abaixo da espiga)' },
  { value: 'V10', label: 'V10', description: '10 folhas expandidas' },
  { value: 'VT', label: 'VT', description: 'Pendoamento' },
  { value: 'R1', label: 'R1', description: 'Embonecamento (estilo-estigma visível)' },
  { value: 'R2', label: 'R2', description: 'Bolha d\'água (grão leitoso)' },
  { value: 'R3', label: 'R3', description: 'Grão pastoso' },
];

export interface NutrientRange {
  min: number;
  max: number;
  unit: string;
  produto: string;
  doseMedia: string;
  doseLeve: string;
  doseSevera: string;
  tipo: 'macro' | 'micro';
}

// Faixas padrão baseadas em V8 (referência Malavolta/Embrapa)
export const CORN_FOLIAR_REFERENCE: Record<string, NutrientRange> = {
  N:  { min: 27.5, max: 32.5, unit: 'g/kg', produto: 'Ureia Foliar', doseMedia: '5-10 kg/ha', doseLeve: '5 kg/ha', doseSevera: '10 kg/ha', tipo: 'macro' },
  P:  { min: 2.0, max: 3.5, unit: 'g/kg', produto: 'MAP Purificado / Fosfito de Potássio', doseMedia: '2-3 kg/ha', doseLeve: '2 kg/ha', doseSevera: '3 kg/ha', tipo: 'macro' },
  K:  { min: 17.5, max: 22.5, unit: 'g/kg', produto: 'K-Fol (Citrato/Nitrato de Potássio)', doseMedia: '3-5 L/ha', doseLeve: '3 L/ha', doseSevera: '5 L/ha', tipo: 'macro' },
  Ca: { min: 2.5, max: 8.0, unit: 'g/kg', produto: 'Cloreto de Cálcio Foliar', doseMedia: '2-4 kg/ha', doseLeve: '2 kg/ha', doseSevera: '4 kg/ha', tipo: 'macro' },
  Mg: { min: 2.0, max: 5.0, unit: 'g/kg', produto: 'Sulfato de Magnésio (Sal de Epsom)', doseMedia: '2-4 kg/ha', doseLeve: '2 kg/ha', doseSevera: '4 kg/ha', tipo: 'macro' },
  S:  { min: 1.5, max: 3.0, unit: 'g/kg', produto: 'Sulfato de Amônio Foliar', doseMedia: '3-5 kg/ha', doseLeve: '3 kg/ha', doseSevera: '5 kg/ha', tipo: 'macro' },
  B:  { min: 15, max: 25, unit: 'mg/kg', produto: 'Ácido Bórico / Octaborato de Sódio', doseMedia: '1-2 kg/ha', doseLeve: '1 kg/ha', doseSevera: '2 kg/ha', tipo: 'micro' },
  Cu: { min: 6, max: 20, unit: 'mg/kg', produto: 'Sulfato de Cobre / Cobre Quelato', doseMedia: '0.5-1 kg/ha', doseLeve: '0.5 kg/ha', doseSevera: '1 kg/ha', tipo: 'micro' },
  Mn: { min: 50, max: 150, unit: 'mg/kg', produto: 'Sulfato de Manganês', doseMedia: '1-2 kg/ha', doseLeve: '1 kg/ha', doseSevera: '2 kg/ha', tipo: 'micro' },
  Zn: { min: 20, max: 60, unit: 'mg/kg', produto: 'Sulfato de Zinco / Zinco Quelato', doseMedia: '1-2 kg/ha', doseLeve: '1 kg/ha', doseSevera: '2 kg/ha', tipo: 'micro' },
  Fe: { min: 50, max: 250, unit: 'mg/kg', produto: 'Sulfato Ferroso / Fe-EDDHA', doseMedia: '1-3 kg/ha', doseLeve: '1 kg/ha', doseSevera: '3 kg/ha', tipo: 'micro' },
};

export type NutrientStatus = 'deficiente' | 'adequado' | 'excesso';

export interface NutrientAnalysisResult {
  nutrient: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  status: NutrientStatus;
  severity?: 'leve' | 'moderada' | 'severa';
  produto: string;
  dose: string;
  tipo: 'macro' | 'micro';
}

export function analyzeNutrients(values: Record<string, number>): NutrientAnalysisResult[] {
  return Object.entries(CORN_FOLIAR_REFERENCE).map(([nutrient, ref]) => {
    const value = values[nutrient] ?? 0;
    let status: NutrientStatus = 'adequado';
    let severity: 'leve' | 'moderada' | 'severa' | undefined;
    let dose = '';

    if (value < ref.min) {
      status = 'deficiente';
      const deficit = ((ref.min - value) / ref.min) * 100;
      if (deficit > 40) {
        severity = 'severa';
        dose = ref.doseSevera;
      } else if (deficit > 20) {
        severity = 'moderada';
        dose = ref.doseMedia;
      } else {
        severity = 'leve';
        dose = ref.doseLeve;
      }
    } else if (value > ref.max) {
      status = 'excesso';
    }

    return {
      nutrient,
      value,
      min: ref.min,
      max: ref.max,
      unit: ref.unit,
      status,
      severity,
      produto: ref.produto,
      dose,
      tipo: ref.tipo,
    };
  });
}
