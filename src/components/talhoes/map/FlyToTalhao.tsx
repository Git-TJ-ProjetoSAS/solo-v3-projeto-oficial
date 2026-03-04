import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Talhao } from '@/hooks/useTalhoes';

export function FlyToTalhao({ talhao }: { talhao: Talhao | null }) {
  const map = useMap();

  useEffect(() => {
    if (!talhao) return;

    if (talhao.geojson) {
      try {
        const geoLayer = L.geoJSON(talhao.geojson as any);
        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
        }
      } catch (e) {
        if (talhao.center_lat && talhao.center_lng) {
          map.flyTo([talhao.center_lat, talhao.center_lng], 16, { duration: 1.5 });
        }
      }
    } else if (talhao.center_lat && talhao.center_lng) {
      map.flyTo([talhao.center_lat, talhao.center_lng], 16, { duration: 1.5 });
    }
  }, [talhao, map]);

  return null;
}
