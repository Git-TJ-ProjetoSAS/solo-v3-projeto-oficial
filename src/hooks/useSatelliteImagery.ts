import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Talhao } from '@/hooks/useTalhoes';
import { toast } from 'sonner';

export interface SatelliteImage {
  dt: number;
  type: string;
  dc: number;
  cl: number;
  sun: { elevation: number; azimuth: number };
  image: {
    truecolor: string;
    falsecolor: string;
    ndvi: string;
    evi: string;
  };
  tile: {
    truecolor: string;
    falsecolor: string;
    ndvi: string;
    evi: string;
  };
  stats: {
    ndvi: string;
    evi: string;
  };
  data: {
    truecolor: string;
    falsecolor: string;
    ndvi: string;
    evi: string;
  };
}

export interface NdviStats {
  std: number;
  p25: number;
  num: number;
  min: number;
  max: number;
  median: number;
  p75: number;
  mean: number;
}

export function useSatelliteImagery(talhao: Talhao | null) {
  const [images, setImages] = useState<SatelliteImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [ndviStats, setNdviStats] = useState<NdviStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Register polygon on Agromonitoring if not already registered
  const registerPolygon = useCallback(async (t: Talhao) => {
    if (!t.geojson || t.agro_polygon_id) return t.agro_polygon_id;

    setRegistering(true);
    try {
      const coords = t.geojson.coordinates || (t.geojson.geometry?.coordinates);
      if (!coords) throw new Error('No coordinates in geojson');

      const { data, error } = await supabase.functions.invoke('weather-forecast', {
        body: {
          action: 'create_polygon',
          name: t.name,
          polygonCoords: coords,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const polyId = data?.polygon?.id;
      if (polyId) {
        // Save polygon ID to talhão
        await supabase
          .from('talhoes')
          .update({ agro_polygon_id: polyId } as never)
          .eq('id', t.id);

        return polyId;
      }
      return null;
    } catch (e) {
      console.error('Error registering polygon:', e);
      toast.error('Erro ao registrar polígono no serviço de satélite');
      return null;
    } finally {
      setRegistering(false);
    }
  }, []);

  // Fetch satellite imagery
  const fetchImagery = useCallback(async (polyId: string) => {
    setLoading(true);
    try {
      const end = Math.floor(Date.now() / 1000);
      const start = end - 90 * 86400; // Last 90 days

      const { data, error } = await supabase.functions.invoke('weather-forecast', {
        body: {
          action: 'satellite_imagery',
          polygonId: polyId,
          start,
          end,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const imgs = (data?.imagery || []).sort((a: any, b: any) => b.dt - a.dt);
      setImages(imgs);
    } catch (e) {
      console.error('Error fetching satellite imagery:', e);
      toast.error('Erro ao buscar imagens de satélite');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch NDVI stats for a specific image
  const fetchNdviStats = useCallback(async (statsUrl: string) => {
    setStatsLoading(true);
    try {
      // Stats URL needs appid, proxy through edge function
      const { data, error } = await supabase.functions.invoke('weather-forecast', {
        body: {
          action: 'fetch_stats',
          statsUrl,
        },
      });

      if (error) throw error;
      setNdviStats(data?.stats || null);
    } catch (e) {
      console.error('Error fetching NDVI stats:', e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Main effect: register polygon + fetch imagery
  useEffect(() => {
    if (!talhao || !talhao.geojson) {
      setImages([]);
      return;
    }

    let cancelled = false;

    (async () => {
      let polyId = talhao.agro_polygon_id;

      if (!polyId) {
        polyId = await registerPolygon(talhao);
      }

      if (polyId && !cancelled) {
        await fetchImagery(polyId);
      }
    })();

    return () => { cancelled = true; };
  }, [talhao?.id, talhao?.agro_polygon_id, talhao?.geojson]);

  return { images, loading, registering, ndviStats, statsLoading, fetchNdviStats };
}
