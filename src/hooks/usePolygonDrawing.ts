import { useEffect, useRef } from 'react';
import L from 'leaflet';
import area from '@turf/area';
import { polygon as turfPolygon } from '@turf/helpers';

interface UsePolygonDrawingOptions {
  map: L.Map | null;
  active: boolean;
  onComplete: (layer: L.Layer, geojson: GeoJSON.Feature) => void;
  onLiveArea?: (areaHa: number | null) => void;
}

export function usePolygonDrawing({ map, active, onComplete, onLiveArea }: UsePolygonDrawingOptions) {
  const callbackRef = useRef(onComplete);
  callbackRef.current = onComplete;
  const liveAreaRef = useRef(onLiveArea);
  liveAreaRef.current = onLiveArea;

  useEffect(() => {
    if (!map || !active) return;

    const vertices: L.LatLng[] = [];
    const markers: L.CircleMarker[] = [];
    let polyline: L.Polyline | null = null;
    let guideLine: L.Polyline | null = null;
    let finished = false;

    map.doubleClickZoom.disable();

    const lineStyle = { color: '#16a34a', weight: 2, dashArray: '6 4' };
    const fillStyle = { color: '#22c55e', weight: 2, fillOpacity: 0.3, fillColor: '#22c55e' };
    const vertexStyle = { radius: 5, color: '#16a34a', fillColor: '#fff', fillOpacity: 1, weight: 2 };
    const firstVertexStyle = { ...vertexStyle, radius: 7, fillColor: '#22c55e', color: '#15803d' };

    const updatePolyline = () => {
      const latlngs = [...vertices];
      if (polyline) {
        polyline.setLatLngs(latlngs);
      } else if (latlngs.length >= 2) {
        polyline = L.polyline(latlngs, lineStyle).addTo(map);
      }
    };

    const calcLiveArea = () => {
      if (vertices.length >= 3) {
        try {
          const coords = vertices.map(v => [v.lng, v.lat]);
          coords.push(coords[0]);
          const turfPoly = turfPolygon([coords]);
          const areaM2 = area(turfPoly);
          const areaHa = Math.round((areaM2 / 10000) * 100) / 100;
          liveAreaRef.current?.(areaHa);
        } catch {
          liveAreaRef.current?.(null);
        }
      } else {
        liveAreaRef.current?.(null);
      }
    };

    const finishPolygon = () => {
      if (finished || vertices.length < 3) return;
      finished = true;

      const coords = vertices.map(v => [v.lng, v.lat]);
      coords.push(coords[0]);
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: {},
      };

      const polygonLayer = L.polygon(vertices, fillStyle).addTo(map);
      cleanup(false);
      liveAreaRef.current?.(null);
      callbackRef.current(polygonLayer, geojson);
    };

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (finished) return;

      if (vertices.length >= 3) {
        const firstPt = map.latLngToContainerPoint(vertices[0]);
        const clickPt = map.latLngToContainerPoint(e.latlng);
        if (firstPt.distanceTo(clickPt) < 15) {
          finishPolygon();
          return;
        }
      }

      vertices.push(e.latlng);

      const isFirst = vertices.length === 1;
      const marker = L.circleMarker(e.latlng, isFirst ? firstVertexStyle : vertexStyle).addTo(map);
      if (isFirst) {
        marker.bindTooltip('Clique aqui para fechar', { direction: 'top', offset: [0, -10] });
        marker.on('click', () => {
          if (vertices.length >= 3) finishPolygon();
        });
      }
      markers.push(marker);
      updatePolyline();
      calcLiveArea();
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (finished || vertices.length === 0) return;
      const pts = [vertices[vertices.length - 1], e.latlng];
      if (guideLine) {
        guideLine.setLatLngs(pts);
      } else {
        guideLine = L.polyline(pts, { ...lineStyle, opacity: 0.5 }).addTo(map);
      }
    };

    const onDblClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stop(e);
    };

    map.on('click', onMapClick);
    map.on('mousemove', onMouseMove);
    map.on('dblclick', onDblClick);

    const container = map.getContainer();
    container.style.cursor = 'crosshair';

    const cleanup = (removeAll = true) => {
      map.off('click', onMapClick);
      map.off('mousemove', onMouseMove);
      map.off('dblclick', onDblClick);
      markers.forEach(m => map.removeLayer(m));
      if (polyline) map.removeLayer(polyline);
      if (guideLine) map.removeLayer(guideLine);
      container.style.cursor = '';
      map.doubleClickZoom.enable();
      liveAreaRef.current?.(null);
    };

    return () => cleanup(true);
  }, [map, active]);
}
