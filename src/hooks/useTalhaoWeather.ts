import { useState, useEffect } from 'react';
import { fetchWeatherByCoords, WeatherData } from '@/lib/weatherService';

const cache = new Map<string, { data: WeatherData; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function useTalhaoWeather(lat: number | null | undefined, lon: number | null | undefined) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lat || !lon) { setWeather(null); return; }

    const key = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setWeather(cached.data);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchWeatherByCoords(lat, lon).then(data => {
      if (cancelled) return;
      cache.set(key, { data, ts: Date.now() });
      setWeather(data);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [lat, lon]);

  return { weather, loading };
}
