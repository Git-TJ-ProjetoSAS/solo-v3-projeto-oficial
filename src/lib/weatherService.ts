// ============================================================
// Weather Service — OpenWeatherMap via Edge Function
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import { calculateETo, getDayOfYear } from "@/lib/etoCalculator";

export interface HistoricalDailyWeather {
  date: string;
  tMax: number;
  tMin: number;
  rainfall: number;
  eto: number;
}

export interface DailyForecast {
  date: Date;
  tMax: number;
  tMin: number;
  humidity: number;
  rainMm: number;
  description: string;
  icon: string;
}

export interface CurrentWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  description: string;
  icon: string;
}

export interface WeatherData {
  city: string;
  state: string;
  lat: number;
  lon: number;
  currentTemp: number;
  current: CurrentWeather | null;
  dailyForecasts: DailyForecast[];
  source: 'api' | 'mock';
}

// ---- Mock data generator ----
function generateMockForecasts(cityName: string, lat?: number, lon?: number): WeatherData {
  const baseTemps: Record<string, { tMax: number; tMin: number }> = {
    default: { tMax: 32, tMin: 19 },
    linhares: { tMax: 31, tMin: 21 },
    'são mateus': { tMax: 30, tMin: 20 },
    colatina: { tMax: 33, tMin: 19 },
    franca: { tMax: 29, tMin: 16 },
    patrocínio: { tMax: 28, tMin: 15 },
    araguari: { tMax: 29, tMin: 16 },
    jaguaré: { tMax: 31, tMin: 20 },
  };

  const key = cityName.toLowerCase().trim();
  const base = baseTemps[key] || baseTemps['default'];

  const today = new Date();
  const dailyForecasts: DailyForecast[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const variation = Math.sin(i * 1.3) * 2;
    dailyForecasts.push({
      date,
      tMax: Math.round((base.tMax + variation) * 10) / 10,
      tMin: Math.round((base.tMin + variation * 0.5) * 10) / 10,
      humidity: 55 + Math.round(Math.sin(i) * 15),
      rainMm: i % 3 === 0 ? Math.round(Math.random() * 8) : 0,
      description: i % 3 === 0 ? 'Parcialmente nublado' : 'Céu limpo',
      icon: i % 3 === 0 ? '02d' : '01d',
    });
  }

  return {
    city: cityName || 'Local',
    state: '',
    lat: lat || -19.5,
    lon: lon || -40.5,
    currentTemp: Math.round((base.tMax + base.tMin) / 2),
    current: {
      temp: Math.round((base.tMax + base.tMin) / 2),
      feels_like: Math.round((base.tMax + base.tMin) / 2) + 1,
      humidity: 60,
      wind_speed: 3.5,
      description: 'Parcialmente nublado',
      icon: '02d',
    },
    dailyForecasts,
    source: 'mock',
  };
}

function parseForecasts(data: any): WeatherData {
  const dayMap = new Map<string, { tMax: number; tMin: number; humidity: number[]; rainMm: number; desc: string; icon: string; date: Date }>();

  for (const item of data.forecast) {
    const dt = new Date(item.dt * 1000);
    const dayKey = dt.toISOString().slice(0, 10);

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        tMax: -Infinity,
        tMin: Infinity,
        humidity: [],
        rainMm: 0,
        desc: item.weather[0].description,
        icon: item.weather[0].icon,
        date: dt,
      });
    }

    const d = dayMap.get(dayKey)!;
    d.tMax = Math.max(d.tMax, item.main.temp_max);
    d.tMin = Math.min(d.tMin, item.main.temp_min);
    d.humidity.push(item.main.humidity);
    const itemRain = typeof item.rain === 'number' ? item.rain : (item.rain?.['3h'] || item.rain?.['1h'] || 0);
    d.rainMm += itemRain;
  }

  const forecasts: DailyForecast[] = [];
  for (const [, v] of dayMap) {
    if (forecasts.length >= 7) break;
    forecasts.push({
      date: v.date,
      tMax: Math.round(v.tMax * 10) / 10,
      tMin: Math.round(v.tMin * 10) / 10,
      humidity: Math.round(v.humidity.reduce((a, b) => a + b, 0) / v.humidity.length),
      rainMm: Math.round(v.rainMm * 10) / 10,
      description: v.desc,
      icon: v.icon,
    });
  }

  const currentWeather: CurrentWeather | null = data.current ? {
    temp: data.current.temp,
    feels_like: data.current.feels_like,
    humidity: data.current.humidity,
    wind_speed: data.current.wind_speed,
    description: data.current.description,
    icon: data.current.icon,
  } : null;

  return {
    city: data.city || '',
    state: data.state || '',
    lat: data.lat,
    lon: data.lon,
    currentTemp: currentWeather ? Math.round(currentWeather.temp) : (forecasts.length ? Math.round((forecasts[0].tMax + forecasts[0].tMin) / 2) : 0),
    current: currentWeather,
    dailyForecasts: forecasts,
    source: 'api',
  };
}

// ---- Fetch by city name ----
export async function fetchWeatherData(cityQuery: string): Promise<WeatherData> {
  try {
    const { data, error } = await supabase.functions.invoke('weather-forecast', {
      body: { cityQuery },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const result = parseForecasts(data);
    if (result.dailyForecasts.length > 0) return result;
    return generateMockForecasts(cityQuery);
  } catch (e) {
    console.error('Weather edge function failed, using mock:', e);
    return generateMockForecasts(cityQuery);
  }
}

// ---- Fetch by coordinates (for talhão) ----
export async function fetchWeatherByCoords(lat: number, lon: number): Promise<WeatherData> {
  try {
    const { data, error } = await supabase.functions.invoke('weather-forecast', {
      body: { lat, lon },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const result = parseForecasts(data);
    if (result.dailyForecasts.length > 0) return result;
    return generateMockForecasts('', lat, lon);
  } catch (e) {
    console.error('Weather by coords failed, using mock:', e);
    return generateMockForecasts('', lat, lon);
  }
}

// ---- Fetch historical weather (last N days) via Open-Meteo (free, no API key) ----
export async function fetchHistoricalWeather(
  latitude: number,
  longitude: number,
  days: number = 7
): Promise<HistoricalDailyWeather[]> {
  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - days);

  const startDate = pastDate.toISOString().split('T')[0];
  const endDate = new Date(today.getTime() - 86400000).toISOString().split('T')[0]; // yesterday

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=America%2FSao_Paulo&start_date=${startDate}&end_date=${endDate}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);

    const data = await response.json();
    const dates: string[] = data.daily?.time || [];
    const tMaxArr: number[] = data.daily?.temperature_2m_max || [];
    const tMinArr: number[] = data.daily?.temperature_2m_min || [];
    const rainArr: number[] = data.daily?.precipitation_sum || [];

    return dates.map((dateStr, i) => {
      const tMax = tMaxArr[i] ?? 30;
      const tMin = tMinArr[i] ?? 18;
      const doy = getDayOfYear(new Date(dateStr));
      const eto = calculateETo(tMax, tMin, latitude, doy);

      return {
        date: dateStr,
        tMax,
        tMin,
        rainfall: rainArr[i] || 0,
        eto,
      };
    });
  } catch (error) {
    console.error('Open-Meteo historical fetch failed:', error);
    return [];
  }
}
