import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTalhoes } from '@/hooks/useTalhoes';
import { useSoilAnalyses } from '@/hooks/useSoilAnalyses';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useFarmData } from '@/hooks/useFarmData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addOfflineMutation, type OfflineMutation } from '@/lib/offlineDb';
import {
  getTextureCascade,
  calculateIrrigation,
  calculateIrrigationCost,
  generate7DaySchedule,
  calculateRetroactiveDeficit,
  IRRIGATION_SYSTEMS,
  SOIL_TEXTURE_MAP,
  KC_CAFE,
  getKcCoffee,
  PEAK_MULTIPLIER,
  type IrrigationSystem,
  type TextureCascadeResult,
  type IrrigationResult,
  type IrrigationCostResult,
  type ScheduleDay,
  type SoilTextureInfo,
  type DailyWaterData,
} from '@/lib/irrigationEngine';
import { calculateETo, calculateETc, getDayOfYear } from '@/lib/etoCalculator';
import { fetchWeatherData, fetchWeatherByCoords, fetchHistoricalWeather, type WeatherData } from '@/lib/weatherService';
import type { Tables } from '@/integrations/supabase/types';

type IrrigationLog = Tables<'irrigation_logs'>;

export function useIrrigationSchedule() {
  const { profile } = useUserProfile();
  const { soilAnalyses, selectedFarmId } = useFarmData();
  const { talhoes, loading: talhoesLoading } = useTalhoes();

  // Weather state
  const profileCity = profile?.endereco_propriedade?.split(',')[0]?.trim() || '';
  const [isLoading, setIsLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherFetchedForTalhao, setWeatherFetchedForTalhao] = useState<string | null>(null);

  // Selection
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string>('');
  const selectedTalhao = talhoes.find(t => t.id === selectedTalhaoId) || null;
  const areaTalhao = selectedTalhao?.area_ha || 1;
  const totalPlants = selectedTalhao?.total_plants || 0;

  // Soil analysis — specific to selected talhão
  const { analyses: talhaoSoilAnalyses } = useSoilAnalyses(selectedTalhaoId || undefined);

  const latestTalhaoSoilAnalysis = useMemo(() => {
    if (talhaoSoilAnalyses.length === 0) return null;
    return [...talhaoSoilAnalyses].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [talhaoSoilAnalyses]);

  const latestSoilAnalysis = useMemo(() => {
    if (latestTalhaoSoilAnalysis) return latestTalhaoSoilAnalysis;
    const relevant = selectedFarmId
      ? soilAnalyses.filter(s => s.farmId === selectedFarmId)
      : soilAnalyses;
    if (relevant.length === 0) return null;
    return [...relevant].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [latestTalhaoSoilAnalysis, soilAnalyses, selectedFarmId]);

  // --- ETo ---
  const dailyEToValues = useMemo(() => {
    if (!weather) return [];
    return weather.dailyForecasts.map((f) => {
      const doy = getDayOfYear(f.date);
      return calculateETo(f.tMax, f.tMin, weather.lat, doy);
    });
  }, [weather]);

  // Dynamic Kc
  const talhaoAgeMonths = useMemo(() => {
    if (!selectedTalhao) return 36;
    const now = new Date();
    const plantDate = new Date(selectedTalhao.planting_year, (selectedTalhao.planting_month || 1) - 1);
    return Math.max(0, (now.getFullYear() - plantDate.getFullYear()) * 12 + (now.getMonth() - plantDate.getMonth()));
  }, [selectedTalhao]);

  const dailyKcValues = useMemo(() => {
    if (!weather) return [];
    return weather.dailyForecasts.map(f => {
      const month = f.date.getMonth() + 1;
      return getKcCoffee(talhaoAgeMonths, month);
    });
  }, [weather, talhaoAgeMonths]);

  const currentKc = dailyKcValues[0] ?? getKcCoffee(talhaoAgeMonths);

  const dailyETcValues = useMemo(() => {
    return dailyEToValues.map((eto, i) => {
      const kc = dailyKcValues[i]?.kc ?? KC_CAFE;
      return calculateETc(eto, kc);
    });
  }, [dailyEToValues, dailyKcValues]);

  const avgETo = dailyEToValues.length > 0
    ? dailyEToValues.reduce((a, b) => a + b, 0) / dailyEToValues.length
    : 0;
  const avgETc = avgETo * currentKc.kc;

  // Texture cascade
  const userCity = weather?.city || profileCity || null;
  const textureCascade = useMemo(() => {
    const directTexture = (latestTalhaoSoilAnalysis?.textura as 'arenosa' | 'media' | 'argilosa') || null;
    const moValue = latestTalhaoSoilAnalysis?.mo ?? latestSoilAnalysis?.mo ?? null;
    return getTextureCascade(directTexture, moValue, userCity);
  }, [latestTalhaoSoilAnalysis, latestSoilAnalysis, userCity]);
  const soilInfo = SOIL_TEXTURE_MAP[textureCascade.texture];

  // User inputs
  const [system, setSystem] = useState<IrrigationSystem>('gotejamento');
  const [turnoRega, setTurnoRega] = useState(3);
  const [doseAdubo, setDoseAdubo] = useState(15);
  const [doseFromWizard, setDoseFromWizard] = useState<number | null>(null);
  const [wizardProducts, setWizardProducts] = useState<{ name: string; dosePerHa: number; unit: string }[]>([]);
  const [tarifaEnergia, setTarifaEnergia] = useState(0.45);
  const [evitarPonta, setEvitarPonta] = useState(true);
  const [dailyRainfall, setDailyRainfall] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [savingRainfall, setSavingRainfall] = useState(false);
  const rainfallSaveTimeout = useMemo(() => ({ current: null as ReturnType<typeof setTimeout> | null }), []);
  const [showReport, setShowReport] = useState(false);
  const [todayLog, setTodayLog] = useState<IrrigationLog | null>(null);
  const [recentLogs, setRecentLogs] = useState<IrrigationLog[]>([]);
  const [isSavingIrrigation, setIsSavingIrrigation] = useState(false);
  const [historicalWeather, setHistoricalWeather] = useState<DailyWaterData[]>([]);

  // ── Retroactive deficit from recent logs (engine with effective rainfall & CAD clamp) ──
  const retroactiveDeficit = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const cad = soilInfo.cad;
    const kc = currentKc.kc || 1.05;

    // Build irrigation map from logs
    const irrigationMap = new Map<string, { rain: number; irrigation: number; etc: number }>();
    recentLogs
      .filter(log => log.date !== today)
      .forEach(log => {
        const rain = Math.max(Number(log.rain_mm) || 0, Number(log.rain_manual_mm) || 0);
        const irrigated = log.confirmed_at ? (Number(log.irrigation_mm) || 0) : 0;
        irrigationMap.set(log.date, { rain, irrigation: irrigated, etc: Number(log.etc_mm) || 0 });
      });

    // Merge historical weather with irrigation logs
    let mergedData: DailyWaterData[];

    if (historicalWeather.length > 0) {
      // Use weather cache as base, overlay with log data
      mergedData = historicalWeather.map(hw => {
        const logEntry = irrigationMap.get(hw.date);
        return {
          date: hw.date,
          eto: hw.eto,
          kc: hw.kc,
          rainfall: logEntry ? Math.max(logEntry.rain, hw.rainfall) : hw.rainfall,
          irrigation: logEntry?.irrigation ?? 0,
        };
      });
    } else if (recentLogs.length > 0) {
      // Fallback: use logs only (old behavior)
      mergedData = recentLogs
        .filter(log => log.date !== today)
        .map(log => {
          const rain = Math.max(Number(log.rain_mm) || 0, Number(log.rain_manual_mm) || 0);
          const irrigated = log.confirmed_at ? (Number(log.irrigation_mm) || 0) : 0;
          const etc = Number(log.etc_mm) || 0;
          return {
            date: log.date,
            eto: kc > 0 ? etc / kc : etc,
            kc,
            rainfall: rain,
            irrigation: irrigated,
          };
        });
    } else {
      return 0;
    }

    if (mergedData.length === 0) return 0;
    return calculateRetroactiveDeficit(mergedData, cad);
  }, [recentLogs, historicalWeather, soilInfo.cad, currentKc.kc]);

  // Load irrigation logs
  useEffect(() => {
    if (!selectedTalhaoId) {
      setTodayLog(null);
      setRecentLogs([]);
      return;
    }
    const loadIrrigationLogs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];

      const { data } = await supabase
        .from('irrigation_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('talhao_id', selectedTalhaoId)
        .gte('date', startDate)
        .lte('date', today)
        .order('date', { ascending: true });

      if (data) {
        const todayEntry = data.find(l => l.date === today) || null;
        setTodayLog(todayEntry);
        setRecentLogs(data);
      }
    };
    loadIrrigationLogs();
  }, [selectedTalhaoId]);

  // Save irrigation log
  const handleConfirmIrrigationPersist = useCallback(async (irrigationMm: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedTalhaoId) return;

    setIsSavingIrrigation(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const etcValue = dailyETcValues[0] ?? avgETc;
      const forecastRain = weather?.dailyForecasts[0]?.rainMm ?? 0;

      const logData = {
        user_id: user.id,
        talhao_id: selectedTalhaoId,
        date: today,
        etc_mm: etcValue,
        rain_mm: forecastRain,
        rain_manual_mm: dailyRainfall[0] || 0,
        irrigation_mm: irrigationMm,
        deficit_mm: 0,
        confirmed_at: new Date().toISOString(),
        weather_snapshot: weather ? {
          city: weather.city,
          temp: weather.currentTemp,
          tMax: weather.dailyForecasts[0]?.tMax,
          tMin: weather.dailyForecasts[0]?.tMin,
        } : null,
      };

      if (!navigator.onLine) {
        // Queue for offline sync
        const mutation: OfflineMutation = {
          id: `irrig_${today}_${selectedTalhaoId}_${Date.now()}`,
          table: 'irrigation_logs',
          operation: 'upsert',
          payload: logData,
          conflictKey: 'user_id,talhao_id,date',
          createdAt: new Date().toISOString(),
          retries: 0,
        };
        await addOfflineMutation(mutation);
        // Update local state optimistically
        const optimisticLog = { ...logData, id: mutation.id, created_at: logData.confirmed_at!, updated_at: logData.confirmed_at! } as any;
        setTodayLog(optimisticLog);
        setRecentLogs(prev => {
          const filtered = prev.filter(l => l.date !== today);
          return [...filtered, optimisticLog].sort((a, b) => a.date.localeCompare(b.date));
        });
        toast.info('Rega salva offline — sincronizará automaticamente', { duration: 3000 });
      } else {
        const { data, error } = await supabase
          .from('irrigation_logs')
          .upsert(logData, { onConflict: 'user_id,talhao_id,date' })
          .select()
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setTodayLog(data);
          setRecentLogs(prev => {
            const filtered = prev.filter(l => l.date !== today);
            return [...filtered, data].sort((a, b) => a.date.localeCompare(b.date));
          });
        }
      }
    } catch (err) {
      console.error('Erro ao salvar irrigação:', err);
      toast.error('Erro ao salvar registro de irrigação');
    } finally {
      setIsSavingIrrigation(false);
    }
  }, [selectedTalhaoId, dailyETcValues, avgETc, weather, dailyRainfall]);

  // Save rainfall correction
  const handleRainfallCorrectionPersist = useCallback(async (mm: number) => {
    setDailyRainfall(prev => {
      const next = [...prev];
      next[0] = Math.max(0, mm);
      return next;
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedTalhaoId) return;

    const today = new Date().toISOString().split('T')[0];
    const etcValue = dailyETcValues[0] ?? avgETc;
    const forecastRain = weather?.dailyForecasts[0]?.rainMm ?? 0;
    const currentDeficit = todayLog?.deficit_mm ?? 0;
    const newDeficit = Math.max(0, Number(currentDeficit) - mm);

    const logData = {
      user_id: user.id,
      talhao_id: selectedTalhaoId,
      date: today,
      etc_mm: etcValue,
      rain_mm: forecastRain,
      rain_manual_mm: mm,
      irrigation_mm: todayLog?.irrigation_mm ?? 0,
      deficit_mm: newDeficit,
      confirmed_at: todayLog?.confirmed_at ?? null,
      weather_snapshot: todayLog?.weather_snapshot ?? null,
    };

    if (!navigator.onLine) {
      const mutation: OfflineMutation = {
        id: `rain_${today}_${selectedTalhaoId}_${Date.now()}`,
        table: 'irrigation_logs',
        operation: 'upsert',
        payload: logData,
        conflictKey: 'user_id,talhao_id,date',
        createdAt: new Date().toISOString(),
        retries: 0,
      };
      await addOfflineMutation(mutation);
      toast.info('Chuva salva offline — sincronizará automaticamente', { duration: 3000 });
    } else {
      await supabase
        .from('irrigation_logs')
        .upsert(logData, { onConflict: 'user_id,talhao_id,date' });
    }

    setTodayLog(prev => prev ? { ...prev, ...logData } : null);
  }, [selectedTalhaoId, dailyETcValues, avgETc, weather, todayLog]);

  // Auto-select first talhão
  useEffect(() => {
    if (talhoes.length > 0 && !selectedTalhaoId) {
      setSelectedTalhaoId(talhoes[0].id);
    }
  }, [talhoes, selectedTalhaoId]);

  useEffect(() => {
    if (selectedTalhao) {
      if (selectedTalhao.irrigated && selectedTalhao.irrigation_system) {
        setSystem(selectedTalhao.irrigation_system as IrrigationSystem);
      }
    }
  }, [selectedTalhao]);

  // Auto-fetch weather
  useEffect(() => {
    if (!selectedTalhaoId || weatherFetchedForTalhao === selectedTalhaoId) return;

    const fetchWeather = async () => {
      setIsLoading(true);
      setWeatherFetchedForTalhao(selectedTalhaoId);
      try {
        let data: WeatherData;
        if (selectedTalhao?.center_lat && selectedTalhao?.center_lng) {
          data = await fetchWeatherByCoords(selectedTalhao.center_lat, selectedTalhao.center_lng);
        } else if (profileCity) {
          data = await fetchWeatherData(profileCity);
        } else {
          setIsLoading(false);
          return;
        }
        setWeather(data);
        if (data.source === 'mock') {
          toast.warning('Usando dados climáticos estimados.', { duration: 5000 });
        }
      } catch {
        toast.error('Erro ao buscar dados climáticos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, [selectedTalhaoId, selectedTalhao, profileCity, weatherFetchedForTalhao]);

  // ── Fetch historical weather & persist to daily_weather_history ──
  useEffect(() => {
    if (!selectedTalhao || !weather) return;
    const lat = selectedTalhao.center_lat || weather.lat;
    const lng = selectedTalhao.center_lng || weather.lon;
    if (!lat || !lng) return;

    const loadHistorical = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const endDate = yesterday.toISOString().split('T')[0];

      const { data: cached } = await supabase
        .from('daily_weather_history')
        .select('*')
        .eq('talhao_id', selectedTalhaoId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      const cachedDates = new Set((cached || []).map(r => r.date));

      const allDates: string[] = [];
      const tempDate = new Date(sevenDaysAgo);
      while (tempDate <= yesterday) {
        allDates.push(tempDate.toISOString().split('T')[0]);
        tempDate.setDate(tempDate.getDate() + 1);
      }
      const missingDates = allDates.filter(d => !cachedDates.has(d));

      if (missingDates.length > 0) {
        const historical = await fetchHistoricalWeather(lat, lng, 7);
        const toInsert = historical
          .filter(h => missingDates.includes(h.date))
          .map(h => ({
            talhao_id: selectedTalhaoId,
            date: h.date,
            t_max: h.tMax,
            t_min: h.tMin,
            eto: h.eto,
            rainfall_api: h.rainfall,
          }));

        if (toInsert.length > 0) {
          await supabase
            .from('daily_weather_history')
            .upsert(toInsert, { onConflict: 'talhao_id,date' });
        }
      }

      // Build full dataset for deficit
      const { data: fullHistory } = await supabase
        .from('daily_weather_history')
        .select('*')
        .eq('talhao_id', selectedTalhaoId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (fullHistory && fullHistory.length > 0) {
        const kc = currentKc.kc || KC_CAFE;
        const weatherData: DailyWaterData[] = fullHistory.map(row => ({
          date: row.date,
          eto: Number(row.eto) || 0,
          kc,
          rainfall: Number(row.rainfall_api) || 0,
          irrigation: 0,
        }));
        setHistoricalWeather(weatherData);
      }
    };

    loadHistorical();
  }, [selectedTalhaoId, selectedTalhao, weather, currentKc.kc]);

  // Fetch wizard recommendation
  useEffect(() => {
    if (!selectedTalhaoId) {
      setDoseFromWizard(null);
      setWizardProducts([]);
      return;
    }

    const fetchLastRecommendation = async () => {
      const { data } = await supabase
        .from('talhao_history')
        .select('fertigation_data, insumos_data')
        .eq('talhao_id', selectedTalhaoId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const entry = data[0];
        const fertiData = entry.fertigation_data as any;

        if (fertiData?.products && Array.isArray(fertiData.products) && fertiData.products.length > 0) {
          const products = fertiData.products.map((p: any) => ({
            name: p.name || p.nome || 'Produto',
            dosePerHa: p.dosePerHa || 0,
            unit: p.unit || 'kg/ha',
          }));
          setWizardProducts(products);

          const totalDose = products.reduce((sum: number, p: any) => {
            let dose = p.dosePerHa || 0;
            if (p.unit === 'mL/ha') dose /= 1000;
            if (p.unit === 'g/ha') dose /= 1000;
            return sum + dose;
          }, 0);

          if (totalDose > 0) {
            setDoseFromWizard(parseFloat(totalDose.toFixed(2)));
            setDoseAdubo(parseFloat(totalDose.toFixed(2)));
          } else {
            setDoseFromWizard(null);
          }
        } else {
          setDoseFromWizard(null);
          setWizardProducts([]);
        }
      } else {
        setDoseFromWizard(null);
        setWizardProducts([]);
      }
    };

    fetchLastRecommendation();
  }, [selectedTalhaoId]);

  // Load rainfall
  useEffect(() => {
    if (!selectedTalhaoId) return;
    const loadRainfall = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
      });

      const { data } = await supabase
        .from('rainfall_history')
        .select('date, rainfall_mm')
        .eq('user_id', user.id)
        .eq('talhao_id', selectedTalhaoId)
        .in('date', dates);

      if (data && data.length > 0) {
        const rainfallMap = new Map(data.map(r => [r.date, Number(r.rainfall_mm)]));
        setDailyRainfall(dates.map(d => rainfallMap.get(d) || 0));
      } else {
        setDailyRainfall([0, 0, 0, 0, 0, 0, 0]);
      }
    };
    loadRainfall();
  }, [selectedTalhaoId]);

  // Save rainfall (debounced)
  const saveRainfallToDb = useCallback(async (rainfall: number[], talhaoId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !talhaoId) return;

    setSavingRainfall(true);
    try {
      const today = new Date();
      const records = rainfall.map((mm, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        return {
          user_id: user.id,
          talhao_id: talhaoId,
          date: d.toISOString().split('T')[0],
          rainfall_mm: mm,
        };
      }).filter(r => r.rainfall_mm > 0);

      if (!navigator.onLine) {
        // Queue each rainfall record for offline sync
        for (const record of records) {
          const mutation: OfflineMutation = {
            id: `rainfall_${record.date}_${talhaoId}_${Date.now()}`,
            table: 'rainfall_history',
            operation: 'upsert',
            payload: record,
            conflictKey: 'user_id,talhao_id,date',
            createdAt: new Date().toISOString(),
            retries: 0,
          };
          await addOfflineMutation(mutation);
        }
        toast.info('Dados de chuva salvos offline', { duration: 2000 });
      } else {
        const dates = rainfall.map((_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() + i);
          return d.toISOString().split('T')[0];
        });

        await supabase
          .from('rainfall_history')
          .delete()
          .eq('user_id', user.id)
          .eq('talhao_id', talhaoId)
          .in('date', dates);

        if (records.length > 0) {
          await supabase.from('rainfall_history').insert(records);
        }
      }
    } catch (err) {
      console.error('Erro ao salvar chuva:', err);
    } finally {
      setSavingRainfall(false);
    }
  }, []);

  // Calculations
  const result = useMemo(
    () => calculateIrrigation(avgETc, soilInfo.cad, { system, turnoRega, doseAdubo }),
    [avgETc, soilInfo.cad, system, turnoRega, doseAdubo]
  );

  const systemInfo = IRRIGATION_SYSTEMS.find(s => s.id === system)!;
  const systemEfficiency = systemInfo.efficiency;
  const defaultFlowRateMmH = systemInfo.flowRateMmH;

  const realFlowRateMmH = useMemo(() => {
    if (!selectedTalhao) return 0;
    const dripFlow = Number(selectedTalhao.drip_flow_rate_lh) || 0;
    const dripSp = Number(selectedTalhao.drip_spacing_m) || 0;
    const rowSp = (Number(selectedTalhao.row_spacing_cm) || 0) / 100;
    if (dripFlow > 0 && dripSp > 0 && rowSp > 0) {
      return dripFlow / (dripSp * rowSp);
    }
    return 0;
  }, [selectedTalhao?.drip_flow_rate_lh, selectedTalhao?.drip_spacing_m, selectedTalhao?.row_spacing_cm]);

  const flowRateMmH = realFlowRateMmH > 0 ? realFlowRateMmH : defaultFlowRateMmH;
  const usingRealHardware = realFlowRateMmH > 0;

  // Adjust deficit with retroactive carryover
  const adjustedDeficitMm = Math.max(0, result.laminaLiquida + retroactiveDeficit);
  const adjustedLaminaBruta = adjustedDeficitMm / result.efficiency;

  const schedule = useMemo(
    () => generate7DaySchedule(
      dailyETcValues.length > 0 ? dailyETcValues : [avgETc],
      turnoRega,
      systemEfficiency,
      soilInfo.cad,
      doseAdubo,
      weather?.dailyForecasts.map(f => ({ tMax: f.tMax, tMin: f.tMin })),
      flowRateMmH,
      dailyRainfall,
      dailyKcValues.map(k => k.kc)
    ),
    [dailyETcValues, avgETc, turnoRega, systemEfficiency, soilInfo.cad, doseAdubo, weather, flowRateMmH, dailyRainfall, dailyKcValues]
  );

  const totalRainfall = dailyRainfall.reduce((a, b) => a + b, 0);

  const handleRainfallChange = (index: number, value: number) => {
    setDailyRainfall(prev => {
      const next = [...prev];
      next[index] = Math.max(0, value);
      if (rainfallSaveTimeout.current) clearTimeout(rainfallSaveTimeout.current);
      rainfallSaveTimeout.current = setTimeout(() => {
        saveRainfallToDb(next, selectedTalhaoId);
      }, 1500);
      return next;
    });
  };

  const costResult = useMemo(
    () => calculateIrrigationCost(adjustedLaminaBruta, system, areaTalhao, tarifaEnergia, evitarPonta, turnoRega),
    [adjustedLaminaBruta, system, areaTalhao, tarifaEnergia, evitarPonta, turnoRega]
  );

  return {
    // Data
    talhoes,
    talhoesLoading,
    selectedTalhaoId,
    setSelectedTalhaoId,
    selectedTalhao,
    areaTalhao,
    totalPlants,
    weather,
    isLoading,
    // Soil
    latestTalhaoSoilAnalysis,
    textureCascade,
    soilInfo,
    // ETo/ETc
    dailyEToValues,
    dailyETcValues,
    avgETo,
    avgETc,
    currentKc,
    // Inputs
    system,
    setSystem,
    turnoRega,
    setTurnoRega,
    doseAdubo,
    setDoseAdubo,
    doseFromWizard,
    wizardProducts,
    tarifaEnergia,
    setTarifaEnergia,
    evitarPonta,
    setEvitarPonta,
    dailyRainfall,
    savingRainfall,
    handleRainfallChange,
    totalRainfall,
    // Results
    result,
    adjustedDeficitMm,
    adjustedLaminaBruta,
    retroactiveDeficit,
    costResult,
    schedule,
    flowRateMmH,
    usingRealHardware,
    // Logs
    todayLog,
    recentLogs,
    isSavingIrrigation,
    handleConfirmIrrigationPersist,
    handleRainfallCorrectionPersist,
    // Report
    showReport,
    setShowReport,
  };
}
