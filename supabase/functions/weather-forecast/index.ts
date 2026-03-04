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

  // --- Authentication check ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // --- End authentication check ---

  const AGRO_API_KEY = Deno.env.get('AGRO_API_KEY');
  const OWM_API_KEY = Deno.env.get('OWM_API_KEY');

  if (!AGRO_API_KEY && !OWM_API_KEY) {
    return new Response(JSON.stringify({ error: 'No API key configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { action, lat, lon, cityQuery, polygonId, polygonCoords } = body;

    // ---- Action: create polygon on Agromonitoring ----
    if (action === 'create_polygon' && AGRO_API_KEY) {
      const name = body.name || 'Talhão';
      const agroRes = await fetch(`${AGRO_BASE}/polygons?appid=${AGRO_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          geo_json: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: polygonCoords },
          },
        }),
      });
      const agroData = await agroRes.json();
      if (!agroRes.ok) throw new Error(`Agro polygon error: ${JSON.stringify(agroData)}`);
      return new Response(JSON.stringify({ polygon: agroData }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Action: list polygons ----
    if (action === 'list_polygons' && AGRO_API_KEY) {
      const res = await fetch(`${AGRO_BASE}/polygons?appid=${AGRO_API_KEY}`);
      return new Response(JSON.stringify({ polygons: await res.json() }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Action: polygon weather ----
    if (action === 'polygon_weather' && polygonId && AGRO_API_KEY) {
      const res = await fetch(`${AGRO_BASE}/weather?polyid=${polygonId}&appid=${AGRO_API_KEY}`);
      return new Response(JSON.stringify({ weather: await res.json() }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Action: polygon soil ----
    if (action === 'polygon_soil' && polygonId && AGRO_API_KEY) {
      const res = await fetch(`${AGRO_BASE}/soil?polyid=${polygonId}&appid=${AGRO_API_KEY}`);
      return new Response(JSON.stringify({ soil: await res.json() }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Action: satellite imagery ----
    if (action === 'satellite_imagery' && polygonId && AGRO_API_KEY) {
      const start = body.start || Math.floor(Date.now() / 1000) - 30 * 86400;
      const end = body.end || Math.floor(Date.now() / 1000);
      const res = await fetch(`${AGRO_BASE}/image/search?start=${start}&end=${end}&polyid=${polygonId}&appid=${AGRO_API_KEY}`);
      return new Response(JSON.stringify({ imagery: await res.json() }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Action: proxy weather tile ----
    if (action === 'proxy_tile') {
      const { layer, z, x, y } = body;
      const validLayers = ['precipitation_new', 'temp_new', 'clouds_new', 'wind_new'];
      if (!validLayers.includes(layer) || z == null || x == null || y == null) {
        return new Response(JSON.stringify({ error: 'Invalid tile params' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const tileKey = OWM_API_KEY || AGRO_API_KEY;
      if (!tileKey) {
        return new Response(JSON.stringify({ error: 'No tile key' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const tileUrl = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${tileKey}`;
      const tileRes = await fetch(tileUrl);
      if (!tileRes.ok) {
        return new Response(JSON.stringify({ error: 'Tile fetch failed' }), {
          status: tileRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const tileBody = await tileRes.arrayBuffer();
      return new Response(tileBody, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=600',
        },
      });
    }

    // ---- Action: fetch stats (proxy for NDVI/EVI stats) ----
    if (action === 'fetch_stats' && body.statsUrl) {
      const separator = body.statsUrl.includes('?') ? '&' : '?';
      const statsRes = await fetch(`${body.statsUrl}${separator}appid=${AGRO_API_KEY}`);
      const statsData = await statsRes.json();
      return new Response(JSON.stringify({ stats: statsData }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Weather by coords using Agromonitoring ----
    if ((typeof lat === 'number' && typeof lon === 'number') && AGRO_API_KEY) {
      const [currentRes, forecastRes] = await Promise.all([
        fetch(`${AGRO_BASE}/weather?lat=${lat}&lon=${lon}&appid=${AGRO_API_KEY}`),
        fetch(`${AGRO_BASE}/weather/forecast?lat=${lat}&lon=${lon}&appid=${AGRO_API_KEY}`),
      ]);

      let currentWeather = null;
      if (currentRes.ok) {
        const cData = await currentRes.json();
        const current = Array.isArray(cData) ? cData[0] : cData;
        if (current?.main) {
          currentWeather = {
            temp: current.main.temp - 273.15,
            feels_like: current.main.feels_like - 273.15,
            humidity: current.main.humidity,
            wind_speed: current.wind?.speed || 0,
            description: current.weather?.[0]?.description || '',
            icon: current.weather?.[0]?.icon || '01d',
          };
        }
      }

      let forecastList: any[] = [];
      if (forecastRes.ok) {
        const fData = await forecastRes.json();
          forecastList = (Array.isArray(fData) ? fData : fData?.list || []).map((item: any) => ({
            dt: item.dt,
            main: {
              temp_max: (item.main?.temp_max || item.main?.temp || 300) - 273.15,
              temp_min: (item.main?.temp_min || item.main?.temp || 290) - 273.15,
              humidity: item.main?.humidity || 60,
            },
            weather: item.weather || [{ description: '', icon: '01d' }],
            rain: item.rain?.['3h'] || item.rain?.['1h'] || item.rain || 0,
          }));
      }

      let cityName = '';
      let stateName = '';
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=pt`,
          { headers: { 'User-Agent': 'AgroVe/1.0' } }
        );
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          cityName = nomData.address?.city || nomData.address?.town || nomData.address?.municipality || '';
          stateName = nomData.address?.state || '';
        }
      } catch (_) { /* ignore */ }

      return new Response(JSON.stringify({
        city: cityName, state: stateName, lat, lon,
        current: currentWeather, forecast: forecastList,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Fallback: city query via Nominatim geocoding + Agromonitoring or OWM ----
    if (cityQuery) {
      const geoQuery = encodeURIComponent(`${cityQuery}, Brazil`);
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${geoQuery}&limit=1&accept-language=pt`,
        { headers: { 'User-Agent': 'AgroVe/1.0' } }
      );
      
      let rLat: number | null = null;
      let rLon: number | null = null;
      let cityName = cityQuery;
      let stateName = '';

      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (nomData.length > 0) {
          rLat = parseFloat(nomData[0].lat);
          rLon = parseFloat(nomData[0].lon);
          cityName = nomData[0].display_name?.split(',')[0] || cityQuery;
        }
      }

      if (rLat === null || rLon === null) {
        return new Response(JSON.stringify({ error: 'City not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (AGRO_API_KEY) {
        const [currentRes, forecastRes] = await Promise.all([
          fetch(`${AGRO_BASE}/weather?lat=${rLat}&lon=${rLon}&appid=${AGRO_API_KEY}`),
          fetch(`${AGRO_BASE}/weather/forecast?lat=${rLat}&lon=${rLon}&appid=${AGRO_API_KEY}`),
        ]);

        let currentWeather = null;
        if (currentRes.ok) {
          const cData = await currentRes.json();
          const current = Array.isArray(cData) ? cData[0] : cData;
          if (current?.main) {
            currentWeather = {
              temp: current.main.temp - 273.15,
              feels_like: current.main.feels_like - 273.15,
              humidity: current.main.humidity,
              wind_speed: current.wind?.speed || 0,
              description: current.weather?.[0]?.description || '',
              icon: current.weather?.[0]?.icon || '01d',
            };
          }
        }

        let forecastList: any[] = [];
        if (forecastRes.ok) {
          const fData = await forecastRes.json();
          forecastList = (Array.isArray(fData) ? fData : fData?.list || []).map((item: any) => ({
            dt: item.dt,
            main: {
              temp_max: (item.main?.temp_max || item.main?.temp || 300) - 273.15,
              temp_min: (item.main?.temp_min || item.main?.temp || 290) - 273.15,
              humidity: item.main?.humidity || 60,
            },
            weather: item.weather || [{ description: '', icon: '01d' }],
            rain: item.rain?.['3h'] || item.rain?.['1h'] || item.rain || 0,
          }));
        }

        return new Response(JSON.stringify({
          city: cityName, state: stateName,
          lat: rLat, lon: rLon, current: currentWeather, forecast: forecastList,
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (OWM_API_KEY) {
        const [cwRes, fcRes] = await Promise.all([
          fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${rLat}&lon=${rLon}&units=metric&lang=pt_br&appid=${OWM_API_KEY}`),
          fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${rLat}&lon=${rLon}&units=metric&lang=pt_br&appid=${OWM_API_KEY}`),
        ]);

        let currentWeather = null;
        if (cwRes.ok) {
          const c = await cwRes.json();
          currentWeather = {
            temp: c.main.temp, feels_like: c.main.feels_like,
            humidity: c.main.humidity, wind_speed: c.wind.speed,
            description: c.weather?.[0]?.description || '', icon: c.weather?.[0]?.icon || '01d',
          };
        }

        const forecastData = fcRes.ok ? await fcRes.json() : { list: [] };

        return new Response(JSON.stringify({
          city: cityName, state: stateName,
          lat: rLat, lon: rLon, current: currentWeather, forecast: forecastData.list,
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'No weather API key available' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Coords with Agromonitoring not available, try OWM ----
    if (typeof lat === 'number' && typeof lon === 'number' && OWM_API_KEY) {
      const [cwRes, fcRes] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${OWM_API_KEY}`),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${OWM_API_KEY}`),
      ]);

      let currentWeather = null;
      if (cwRes.ok) {
        const c = await cwRes.json();
        currentWeather = {
          temp: c.main.temp, feels_like: c.main.feels_like,
          humidity: c.main.humidity, wind_speed: c.wind.speed,
          description: c.weather?.[0]?.description || '', icon: c.weather?.[0]?.icon || '01d',
        };
      }

      const forecastData = fcRes.ok ? await fcRes.json() : { list: [] };

      return new Response(JSON.stringify({
        city: '', state: '', lat, lon, current: currentWeather, forecast: forecastData.list,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Provide lat/lon, cityQuery, or an action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Weather forecast error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
