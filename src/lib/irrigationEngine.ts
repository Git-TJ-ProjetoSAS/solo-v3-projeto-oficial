// ============================================================
// Irrigation & Fertigation Calculation Engine
// ============================================================

export interface DailyWaterData {
  date: string;
  eto: number;
  kc: number;
  rainfall: number;
  irrigation: number;
}

/**
 * Calcula o déficit hídrico acumulado com base no histórico recente.
 * Aplica chuva efetiva (80%), clamp no zero (excesso drena) e clamp na CAD (ponto de murcha).
 */
export const calculateRetroactiveDeficit = (
  historicalData: DailyWaterData[],
  cad: number,
  initialDeficit: number = 0
): number => {
  const sortedData = [...historicalData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentDeficit = initialDeficit;

  sortedData.forEach(day => {
    const etc = day.eto * day.kc;
    const effectiveRainfall = day.rainfall * 0.8;
    currentDeficit = currentDeficit + etc - effectiveRainfall - day.irrigation;

    if (currentDeficit < 0) currentDeficit = 0;
    if (currentDeficit > cad) currentDeficit = cad;
  });

  return currentDeficit;
};

// --- Regional ETo Mock Database (mm/day average by month) ---
// Based on INMET/Embrapa data for major Brazilian coffee regions
export interface RegionalEToData {
  city: string;
  state: string;
  monthlyETo: Record<number, number>; // month (0-11) -> mm/day
}

const REGIONAL_ETO_DATABASE: RegionalEToData[] = [
  {
    city: 'Linhares', state: 'ES',
    monthlyETo: { 0: 5.2, 1: 5.5, 2: 4.8, 3: 4.0, 4: 3.2, 5: 2.8, 6: 2.9, 7: 3.3, 8: 3.8, 9: 4.3, 10: 4.7, 11: 5.0 },
  },
  {
    city: 'São Mateus', state: 'ES',
    monthlyETo: { 0: 5.0, 1: 5.3, 2: 4.6, 3: 3.8, 4: 3.0, 5: 2.7, 6: 2.8, 7: 3.1, 8: 3.6, 9: 4.1, 10: 4.5, 11: 4.8 },
  },
  {
    city: 'Colatina', state: 'ES',
    monthlyETo: { 0: 5.4, 1: 5.7, 2: 5.0, 3: 4.2, 4: 3.4, 5: 3.0, 6: 3.1, 7: 3.5, 8: 4.0, 9: 4.5, 10: 4.9, 11: 5.2 },
  },
  {
    city: 'Vitória', state: 'ES',
    monthlyETo: { 0: 4.8, 1: 5.1, 2: 4.5, 3: 3.7, 4: 3.0, 5: 2.6, 6: 2.7, 7: 3.0, 8: 3.5, 9: 4.0, 10: 4.4, 11: 4.7 },
  },
  {
    city: 'Patrocínio', state: 'MG',
    monthlyETo: { 0: 4.5, 1: 4.8, 2: 4.3, 3: 3.8, 4: 3.0, 5: 2.5, 6: 2.6, 7: 3.0, 8: 3.8, 9: 4.2, 10: 4.4, 11: 4.5 },
  },
  {
    city: 'Araguari', state: 'MG',
    monthlyETo: { 0: 4.6, 1: 4.9, 2: 4.4, 3: 3.9, 4: 3.1, 5: 2.6, 6: 2.7, 7: 3.1, 8: 3.9, 9: 4.3, 10: 4.5, 11: 4.6 },
  },
  {
    city: 'Jaguaré', state: 'ES',
    monthlyETo: { 0: 5.1, 1: 5.4, 2: 4.7, 3: 3.9, 4: 3.1, 5: 2.7, 6: 2.8, 7: 3.2, 8: 3.7, 9: 4.2, 10: 4.6, 11: 4.9 },
  },
  {
    city: 'Sooretama', state: 'ES',
    monthlyETo: { 0: 5.1, 1: 5.4, 2: 4.7, 3: 3.9, 4: 3.1, 5: 2.7, 6: 2.8, 7: 3.2, 8: 3.7, 9: 4.2, 10: 4.6, 11: 4.9 },
  },
];

// Default ETo for unknown cities (ES average)
const DEFAULT_ETO: Record<number, number> = {
  0: 5.0, 1: 5.3, 2: 4.6, 3: 3.9, 4: 3.1, 5: 2.7, 6: 2.8, 7: 3.2, 8: 3.7, 9: 4.2, 10: 4.6, 11: 4.9,
};

// --- Kc Coffee (static fallback) ---
export const KC_CAFE = 1.05;

/**
 * Kc dinâmico por fase fenológica e idade da lavoura de café.
 * Baseado em Allen et al. (FAO-56) e calibrações regionais (Incaper/ES).
 *
 * Fases:
 *  - Implantação (0-6 meses): Kc 0.50–0.70 (cobertura <30%)
 *  - Formação Ano 1 (7-12 meses): Kc 0.70–0.85
 *  - Formação Ano 2 (13-24 meses): Kc 0.85–1.00
 *  - Adulto (>24 meses): varia por período fenológico
 *    - Repouso (Mai-Ago): 0.80
 *    - Pré-Florada (Set-Out): 0.90
 *    - Florada/Expansão (Nov-Dez): 1.05
 *    - Granação/Enchimento (Jan-Fev): 1.15 (pico)
 *    - Maturação (Mar-Abr): 0.95
 *
 * @param ageMonths — idade da lavoura em meses
 * @param month — mês do ano (1-12). Se omitido, usa o mês atual.
 */
export function getKcCoffee(ageMonths: number, month?: number): { kc: number; phase: string } {
  const m = month ?? (new Date().getMonth() + 1);

  // Implantação
  if (ageMonths <= 6) {
    const kc = 0.50 + (ageMonths / 6) * 0.20; // 0.50 → 0.70
    return { kc: parseFloat(kc.toFixed(2)), phase: 'Implantação' };
  }

  // Formação Ano 1
  if (ageMonths <= 12) {
    const kc = 0.70 + ((ageMonths - 6) / 6) * 0.15; // 0.70 → 0.85
    return { kc: parseFloat(kc.toFixed(2)), phase: 'Formação (Ano 1)' };
  }

  // Formação Ano 2
  if (ageMonths <= 24) {
    const kc = 0.85 + ((ageMonths - 12) / 12) * 0.15; // 0.85 → 1.00
    return { kc: parseFloat(kc.toFixed(2)), phase: 'Formação (Ano 2)' };
  }

  // Adulto — varia por período fenológico
  if (m >= 5 && m <= 8) return { kc: 0.80, phase: 'Repouso' };
  if (m >= 9 && m <= 10) return { kc: 0.90, phase: 'Pré-Florada' };
  if (m >= 11 || m === 12) return { kc: 1.05, phase: 'Florada/Expansão' };
  if (m >= 1 && m <= 2) return { kc: 1.15, phase: 'Granação (Pico)' };
  // Mar-Abr
  return { kc: 0.95, phase: 'Maturação' };
}

// --- Soil Texture & CAD ---
export type SoilTexture = 'arenosa' | 'media' | 'argilosa';

export interface SoilTextureInfo {
  texture: SoilTexture;
  label: string;
  cad: number; // mm per layer (capacity of available water)
}

export const SOIL_TEXTURE_MAP: Record<SoilTexture, SoilTextureInfo> = {
  arenosa: { texture: 'arenosa', label: 'Arenosa', cad: 25 },
  media: { texture: 'media', label: 'Média', cad: 40 },
  argilosa: { texture: 'argilosa', label: 'Argilosa', cad: 60 },
};

// --- Regional Soil Texture (Embrapa mock) ---
const REGIONAL_SOIL_TEXTURE: Record<string, SoilTexture> = {
  'Linhares': 'media',
  'São Mateus': 'arenosa',
  'Colatina': 'argilosa',
  'Vitória': 'media',
  'Jaguaré': 'arenosa',
  'Sooretama': 'arenosa',
  'Patrocínio': 'argilosa',
  'Araguari': 'argilosa',
};

// --- Irrigation System Efficiencies ---
export type IrrigationSystem = 'gotejamento' | 'aspersao' | 'pivo';

export interface IrrigationSystemInfo {
  id: IrrigationSystem;
  label: string;
  efficiency: number;
  icon: string;
  description: string;
  flowRateMmH: number; // taxa de aplicação em mm/hora
}

export const IRRIGATION_SYSTEMS: IrrigationSystemInfo[] = [
  { id: 'gotejamento', label: 'Gotejamento', efficiency: 0.90, icon: '💧', description: 'Eficiência 90% • Menor consumo', flowRateMmH: 4.0 },
  { id: 'aspersao', label: 'Aspersão Convencional', efficiency: 0.75, icon: '🌊', description: 'Eficiência 75% • Cobertura ampla', flowRateMmH: 8.0 },
  { id: 'pivo', label: 'Pivô Central', efficiency: 0.85, icon: '🔄', description: 'Eficiência 85% • Grande escala', flowRateMmH: 6.0 },
];

// --- Texture Estimation from MO ---
export function estimateTextureFromMO(mo: number | null): SoilTexture | null {
  if (mo === null || mo === undefined) return null;
  if (mo < 15) return 'arenosa';
  if (mo <= 30) return 'media';
  return 'argilosa';
}

// --- ETo Lookup ---
export function getETo(city: string | null, month?: number): { eto: number; source: string } {
  const currentMonth = month ?? new Date().getMonth();
  
  if (city) {
    const normalizedCity = city.trim().toLowerCase();
    const found = REGIONAL_ETO_DATABASE.find(r => r.city.toLowerCase() === normalizedCity);
    if (found) {
      return { eto: found.monthlyETo[currentMonth], source: `INMET - ${found.city}/${found.state}` };
    }
  }

  return { eto: DEFAULT_ETO[currentMonth], source: 'Média Regional ES (padrão)' };
}

// --- Soil Texture Cascade ---
export interface TextureCascadeResult {
  texture: SoilTexture;
  source: string;
  level: 1 | 2 | 3;
}

export function getTextureCascade(
  soilTextureFromAnalysis: SoilTexture | null,
  moFromAnalysis: number | null,
  city: string | null
): TextureCascadeResult {
  // Level 1: Direct from soil analysis
  if (soilTextureFromAnalysis) {
    return { texture: soilTextureFromAnalysis, source: 'Análise de Solo (cadastrada)', level: 1 };
  }

  // Level 2: Estimated from MO
  const estimatedFromMO = estimateTextureFromMO(moFromAnalysis);
  if (estimatedFromMO) {
    return { texture: estimatedFromMO, source: `Estimada via Matéria Orgânica (${moFromAnalysis} g/dm³)`, level: 2 };
  }

  // Level 3: Regional default
  if (city) {
    const normalizedCity = city.trim();
    const capitalizedCity = normalizedCity.charAt(0).toUpperCase() + normalizedCity.slice(1);
    const regional = REGIONAL_SOIL_TEXTURE[capitalizedCity];
    if (regional) {
      return { texture: regional, source: `Predominante em ${capitalizedCity} (Embrapa)`, level: 3 };
    }
  }

  // Ultimate fallback
  return { texture: 'media', source: 'Padrão regional (textura média)', level: 3 };
}

// --- Calculation Engine ---
export interface IrrigationInputs {
  system: IrrigationSystem;
  turnoRega: number; // days
  doseAdubo: number; // kg/ha
}

export interface IrrigationResult {
  etcDaily: number;
  laminaLiquida: number;
  laminaBruta: number;
  efficiency: number;
  fertigacao: number; // kg per mm
  cad: number;
  alertaLixiviacao: boolean;
  alertMessage: string | null;
}

export function calculateIrrigation(
  etcDaily: number,
  cad: number,
  inputs: IrrigationInputs
): IrrigationResult {
  const systemInfo = IRRIGATION_SYSTEMS.find(s => s.id === inputs.system)!;
  const efficiency = systemInfo.efficiency;
  const laminaLiquida = etcDaily * inputs.turnoRega;
  const alertaLixiviacao = laminaLiquida > cad;
  // When leaching risk: cap at CAD instead of zeroing (agronomically conservative)
  const laminaBruta = alertaLixiviacao ? cad / efficiency : laminaLiquida / efficiency;
  const fertigacao = laminaBruta > 0 && inputs.doseAdubo > 0 ? inputs.doseAdubo / laminaBruta : 0;

  return {
    etcDaily,
    laminaLiquida,
    laminaBruta,
    efficiency,
    fertigacao,
    cad,
    alertaLixiviacao,
    alertMessage: alertaLixiviacao
      ? `Atenção: A lâmina exigida no turno de rega (${laminaLiquida.toFixed(1)} mm) excede a retenção do solo (CAD: ${cad} mm). Reduza o intervalo de dias para evitar lixiviação do adubo.`
      : null,
  };
}

// --- Energy Consumption Constants (kWh per mm per hectare) ---
export const ENERGY_CONSUMPTION: Record<IrrigationSystem, number> = {
  gotejamento: 3.5,
  pivo: 4.5,
  aspersao: 6.0,
};

export const PEAK_MULTIPLIER = 4; // Bandeira tarifária horário de ponta (18h-21h)

export interface IrrigationCostResult {
  custoRega: number;        // R$ per irrigation event
  custoMensal: number;      // R$ projected monthly
  regasMes: number;         // number of irrigations/month
  eficienciaRsMmHa: number; // R$/mm/ha
  tarifaEfetiva: number;    // tariff after peak adjustment
}

/**
 * Calculate energy cost for irrigation.
 */
export function calculateIrrigationCost(
  laminaBruta: number,
  system: IrrigationSystem,
  area: number,
  tarifa: number,
  evitarPonta: boolean,
  turnoRega: number
): IrrigationCostResult {
  const tarifaEfetiva = evitarPonta ? tarifa : tarifa * PEAK_MULTIPLIER;
  const consumoKwh = ENERGY_CONSUMPTION[system];
  const custoRega = laminaBruta * consumoKwh * area * tarifaEfetiva;
  const regasMes = turnoRega > 0 ? Math.floor(30 / turnoRega) : 0;
  const custoMensal = custoRega * regasMes;
  const eficienciaRsMmHa = laminaBruta > 0 ? (custoRega / area) / laminaBruta : 0;

  return { custoRega, custoMensal, regasMes, eficienciaRsMmHa, tarifaEfetiva };
}

// --- 7-day Schedule (supports per-day ETc from weather API) ---
export interface ScheduleDay {
  date: Date;
  dayLabel: string;
  tMax?: number;
  tMin?: number;
  etoDay: number;
  etcDay: number;
  rainfallMm: number;
  etcNetDay: number; // ETc - chuva (mínimo 0)
  etcAccumulated: number;
  laminaAplicar: number;
  tempoIrrigacaoH: number;
  aduboKgHa: number;
  status: 'Irrigar' | 'Aguardar' | 'Chuva suficiente';
}

/**
 * Generate a 7-day irrigation schedule with dynamic per-day ETc and rainfall discount.
 */
export function generate7DaySchedule(
  dailyEtcValues: number[],
  turnoRega: number,
  systemEfficiency: number,
  cad: number,
  doseAdubo: number,
  dailyTemps?: { tMax: number; tMin: number }[],
  flowRateMmH: number = 4.0,
  dailyRainfall: number[] = [],
  dailyKcValues: number[] = []
): ScheduleDay[] {
  const today = new Date();
  const schedule: ScheduleDay[] = [];
  let etcAccum = 0;

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const etcDay = dailyEtcValues[i] ?? dailyEtcValues[dailyEtcValues.length - 1] ?? 0;
    const rain = dailyRainfall[i] ?? 0;
    // Chuva efetiva: ~80% aproveitamento (desconto de runoff/escorrimento)
    const effectiveRain = rain * 0.8;
    const etcNetDay = Math.max(0, etcDay - effectiveRain);
    etcAccum += etcNetDay;

    // Clamp: déficit acumulado não ultrapassa CAD (ponto de murcha) nem fica negativo (excesso drena)
    etcAccum = Math.min(Math.max(0, etcAccum), cad);

    const isIrrigationDay = i % turnoRega === 0;

    // Sum net ETc (after rain) of the current irrigation cycle
    let etcCycle = 0;
    for (let j = Math.max(0, i - turnoRega + 1); j <= i; j++) {
      const etc = dailyEtcValues[j] ?? dailyEtcValues[dailyEtcValues.length - 1] ?? 0;
      const r = (dailyRainfall[j] ?? 0) * 0.8; // Chuva efetiva no ciclo
      etcCycle += Math.max(0, etc - r);
    }
    const laminaLiquida = etcCycle;
    const alertaLixiviacao = laminaLiquida > cad;
    // Cap at CAD instead of zeroing when leaching risk
    const laminaBruta = alertaLixiviacao ? cad / systemEfficiency : laminaLiquida / systemEfficiency;
    const irrigationCount = Math.ceil(7 / turnoRega);

    const laminaFinal = isIrrigationDay && !alertaLixiviacao ? parseFloat(laminaBruta.toFixed(1)) : 0;
    const tempoH = laminaFinal > 0 && flowRateMmH > 0 ? laminaFinal / flowRateMmH : 0;

    // Determine status
    let status: ScheduleDay['status'] = 'Aguardar';
    if (isIrrigationDay) {
      if (laminaFinal <= 0 && rain > 0) {
        status = 'Chuva suficiente';
      } else if (!alertaLixiviacao && laminaFinal > 0) {
        status = 'Irrigar';
      }
    }

    schedule.push({
      date,
      dayLabel: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      tMax: dailyTemps?.[i]?.tMax,
      tMin: dailyTemps?.[i]?.tMin,
      etoDay: (dailyKcValues[i] && dailyKcValues[i] > 0) ? etcDay / dailyKcValues[i] : etcDay / KC_CAFE,
      etcDay,
      rainfallMm: rain,
      etcNetDay,
      etcAccumulated: parseFloat(etcAccum.toFixed(1)),
      laminaAplicar: laminaFinal,
      tempoIrrigacaoH: parseFloat(tempoH.toFixed(2)),
      aduboKgHa: isIrrigationDay && !alertaLixiviacao && doseAdubo > 0 && laminaFinal > 0
        ? parseFloat((doseAdubo / irrigationCount).toFixed(2))
        : 0,
      status,
    });
  }

  return schedule;
}
