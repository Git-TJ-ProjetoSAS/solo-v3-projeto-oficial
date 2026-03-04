import { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { CloudRain, Thermometer, Cloud, Layers } from 'lucide-react';

export type WeatherLayerType = 'none' | 'precipitation' | 'temp' | 'clouds' | 'wind';

export const OWM_LAYERS: Record<Exclude<WeatherLayerType, 'none'>, { label: string; path: string; icon: typeof CloudRain }> = {
  precipitation: { label: 'Precipitação', path: 'precipitation_new', icon: CloudRain },
  temp: { label: 'Temperatura', path: 'temp_new', icon: Thermometer },
  clouds: { label: 'Nuvens', path: 'clouds_new', icon: Cloud },
  wind: { label: 'Vento', path: 'wind_new', icon: Layers },
};

export function WeatherTileOverlay({ layerType }: { layerType: WeatherLayerType }) {
  const map = useMap();

  useEffect(() => {
    if (layerType === 'none') return;

    const owmConfig = OWM_LAYERS[layerType];
    if (!owmConfig) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const owmLayer = L.tileLayer(
      `${supabaseUrl}/functions/v1/weather-forecast?layer=${owmConfig.path}&z={z}&x={x}&y={y}`,
      {
        opacity: 0.6,
        maxZoom: 19,
        // Pass auth via custom headers isn't possible with L.tileLayer URL,
        // so we use a TileLayer subclass
      }
    );

    // Override createTile to fetch via POST with auth
    const ProxyTileLayer = L.TileLayer.extend({
      createTile(coords: any, done: any) {
        const tile = document.createElement('img');
        tile.alt = '';
        tile.setAttribute('role', 'presentation');

        const controller = new AbortController();

        import('@/integrations/supabase/client').then(({ supabase }) => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            const token = session?.access_token;
            if (!token) {
              done(new Error('No auth'), tile);
              return;
            }
            fetch(`${supabaseUrl}/functions/v1/weather-forecast`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey,
              },
              body: JSON.stringify({
                action: 'proxy_tile',
                layer: owmConfig.path,
                z: coords.z,
                x: coords.x,
                y: coords.y,
              }),
              signal: controller.signal,
            })
              .then(res => {
                if (!res.ok) throw new Error('Tile error');
                return res.blob();
              })
              .then(blob => {
                tile.src = URL.createObjectURL(blob);
                done(null, tile);
              })
              .catch(err => {
                if (err.name !== 'AbortError') done(err, tile);
              });
          });
        });

        tile.addEventListener('load', () => {
          // cleanup handled by leaflet
        });

        return tile;
      },
    });

    const proxyLayer = new (ProxyTileLayer as any)('', { opacity: 0.6, maxZoom: 19 });
    proxyLayer.addTo(map);

    return () => {
      map.removeLayer(proxyLayer);
    };
  }, [map, layerType]);

  return null;
}
