import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import { usePolygonDrawing } from '@/hooks/usePolygonDrawing';

interface DrawControlProps {
  onPolygonCreated: (layer: L.Layer, geojson: any) => void;
  onLiveArea?: (areaHa: number | null) => void;
}

export function DrawControl({ onPolygonCreated, onLiveArea }: DrawControlProps) {
  const map = useMap();
  usePolygonDrawing({ map, active: true, onComplete: onPolygonCreated, onLiveArea });
  return null;
}
