import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import length from '@turf/length';
import { lineString } from '@turf/helpers';

interface UseMeasureLineOptions {
  map: L.Map | null;
  active: boolean;
}

export function useMeasureLine({ map, active }: UseMeasureLineOptions) {
  const [distance, setDistance] = useState<number | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map || !active) {
      // Cleanup on deactivate
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
        map?.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
      setDistance(null);
      return;
    }

    const vertices: L.LatLng[] = [];
    const lg = L.layerGroup().addTo(map);
    layerGroupRef.current = lg;
    let polyline: L.Polyline | null = null;
    let guideLine: L.Polyline | null = null;

    const lineStyle = { color: '#f97316', weight: 3, dashArray: '8 6' };
    const vertexStyle = { radius: 4, color: '#f97316', fillColor: '#fff', fillOpacity: 1, weight: 2 };

    const calcDistance = () => {
      if (vertices.length < 2) { setDistance(null); return; }
      try {
        const coords = vertices.map(v => [v.lng, v.lat]);
        const line = lineString(coords);
        const km = length(line, { units: 'kilometers' });
        setDistance(km);
      } catch {
        setDistance(null);
      }
    };

    const onClick = (e: L.LeafletMouseEvent) => {
      vertices.push(e.latlng);
      L.circleMarker(e.latlng, vertexStyle).addTo(lg);

      if (polyline) {
        polyline.addLatLng(e.latlng);
      } else if (vertices.length >= 2) {
        polyline = L.polyline(vertices, lineStyle).addTo(lg);
      }
      calcDistance();
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (vertices.length === 0) return;
      const pts = [vertices[vertices.length - 1], e.latlng];
      if (guideLine) {
        guideLine.setLatLngs(pts);
      } else {
        guideLine = L.polyline(pts, { ...lineStyle, opacity: 0.4 }).addTo(lg);
      }
    };

    const onDblClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stop(e);
    };

    map.on('click', onClick);
    map.on('mousemove', onMouseMove);
    map.on('dblclick', onDblClick);
    map.doubleClickZoom.disable();
    map.getContainer().style.cursor = 'crosshair';

    return () => {
      map.off('click', onClick);
      map.off('mousemove', onMouseMove);
      map.off('dblclick', onDblClick);
      map.doubleClickZoom.enable();
      map.getContainer().style.cursor = '';
      lg.clearLayers();
      map.removeLayer(lg);
      layerGroupRef.current = null;
      setDistance(null);
    };
  }, [map, active]);

  return { distance };
}
