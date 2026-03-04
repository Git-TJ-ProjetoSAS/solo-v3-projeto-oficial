import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AGRO_BASE = 'http://api.agromonitoring.com/agro/1.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: Only allow calls with a valid Bearer token matching the anon key (cron job)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token = authHeader.replace('Bearer ', '');

  // Allow service_role key (cron) OR authenticated user tokens
  const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;

  if (!isServiceRole) {
    // Validate user JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const AGRO_API_KEY = Deno.env.get('AGRO_API_KEY');
  const OWM_API_KEY = Deno.env.get('OWM_API_KEY');

  if (!AGRO_API_KEY && !OWM_API_KEY) {
    return new Response(JSON.stringify({ error: 'No weather API key configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. Fetch all OS with status 'bloqueada_clima'
    const { data: ordensBlock, error: osError } = await supabase
      .from('ordens_servico')
      .select('id, talhao_id, tipo_operacao')
      .eq('status', 'bloqueada_clima');

    if (osError) throw osError;
    if (!ordensBlock || ordensBlock.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhuma OS bloqueada por clima', updated: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Collect unique talhao_ids and fetch their coordinates
    const talhaoIds = [...new Set(ordensBlock.map((o: any) => o.talhao_id))];
    const { data: talhoes, error: tError } = await supabase
      .from('talhoes')
      .select('id, center_lat, center_lng, name')
      .in('id', talhaoIds);

    if (tError) throw tError;

    const talhaoMap = new Map<string, { lat: number; lon: number; name: string }>();
    for (const t of (talhoes || [])) {
      if (t.center_lat && t.center_lng) {
        talhaoMap.set(t.id, { lat: t.center_lat, lon: t.center_lng, name: t.name });
      }
    }

    // 3. For each talhão, fetch weather forecast
    const weatherCache = new Map<string, any>();
    let updatedCount = 0;
    const results: any[] = [];

    for (const os of ordensBlock) {
      const coords = talhaoMap.get(os.talhao_id);
      if (!coords) {
        results.push({ os_id: os.id, status: 'skipped', reason: 'Sem coordenadas GPS' });
        continue;
      }

      const cacheKey = `${coords.lat.toFixed(2)}_${coords.lon.toFixed(2)}`;
      let forecastData = weatherCache.get(cacheKey);

      if (!forecastData) {
        if (AGRO_API_KEY) {
          const res = await fetch(
            `${AGRO_BASE}/weather/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${AGRO_API_KEY}`
          );
          if (res.ok) {
            const raw = await res.json();
            forecastData = (Array.isArray(raw) ? raw : raw?.list || []).map((item: any) => ({
              dt: item.dt,
              rain: item.rain?.['3h'] || item.rain?.['1h'] || (typeof item.rain === 'number' ? item.rain : 0),
              pop: item.pop || 0,
              wind_speed: item.wind?.speed || 0,
              humidity: item.main?.humidity || 60,
            }));
          }
        }

        if (!forecastData && OWM_API_KEY) {
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${OWM_API_KEY}`
          );
          if (res.ok) {
            const raw = await res.json();
            forecastData = (raw.list || []).map((item: any) => ({
              dt: item.dt,
              rain: item.rain?.['3h'] || item.rain?.['1h'] || 0,
              pop: item.pop || 0,
              wind_speed: item.wind?.speed || 0,
              humidity: item.main?.humidity || 60,
            }));
          }
        }

        if (forecastData) {
          weatherCache.set(cacheKey, forecastData);
        }
      }

      if (!forecastData || forecastData.length === 0) {
        results.push({ os_id: os.id, status: 'skipped', reason: 'Sem dados climáticos' });
        continue;
      }

      // 4. Apply climate rules based on operation type
      let shouldRelease = false;
      const now = Math.floor(Date.now() / 1000);

      if (os.tipo_operacao === 'solo') {
        const fiveDaysAhead = now + 5 * 86400;
        const next5Days = forecastData.filter((f: any) => f.dt >= now && f.dt <= fiveDaysAhead);
        const totalRain = next5Days.reduce((sum: number, f: any) => sum + (f.rain || 0), 0);
        shouldRelease = totalRain > 20;
        results.push({
          os_id: os.id, tipo: 'solo', totalRain: Math.round(totalRain * 10) / 10,
          threshold: 20, released: shouldRelease,
        });
      } else {
        const twelveHoursAhead = now + 12 * 3600;
        const next12h = forecastData.filter((f: any) => f.dt >= now && f.dt <= twelveHoursAhead);
        const maxWindSpeed = Math.max(...next12h.map((f: any) => f.wind_speed || 0), 0);
        const maxPop = Math.max(...next12h.map((f: any) => f.pop || 0), 0);
        shouldRelease = maxWindSpeed < 2.7 && maxPop < 0.5;
        results.push({
          os_id: os.id, tipo: os.tipo_operacao,
          maxWindSpeed: Math.round(maxWindSpeed * 10) / 10,
          maxPop: Math.round(maxPop * 100), released: shouldRelease,
        });
      }

      if (shouldRelease) {
        // RPC called with service_role context — function detects _is_server internally
        const { error: transError } = await supabase.rpc('transition_os_status', {
          _os_id: os.id,
          _new_status: 'liberada',
        });

        if (transError) {
          console.error(`Error transitioning OS ${os.id}:`, transError);
          results[results.length - 1].error = transError.message;
        } else {
          updatedCount++;
          const snapshot = {
            checked_at: new Date().toISOString(),
            forecast_summary: results[results.length - 1],
          };
          await supabase
            .from('ordens_servico')
            .update({ clima_snapshot: snapshot })
            .eq('id', os.id);
        }
      }
    }

    return new Response(JSON.stringify({
      message: `Verificação climática concluída. ${updatedCount} OS liberada(s).`,
      updated: updatedCount,
      total_checked: ordensBlock.length,
      details: results,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Climate check error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
