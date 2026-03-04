import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/helpers';
import turfCentroid from '@turf/centroid';
import { AlertTriangle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MapLegend, getPolygonColors, type ColorMode } from './map/MapLegend';

interface TalhaoLike {
  id: string;
  name: string;
  area_ha: number;
  coffee_type: string;
  variety: string;
  geojson: any;
  operation_status?: string;
}

interface FarmOverviewMapProps {
  talhoes: TalhaoLike[];
  onSelectTalhao: (talhao: TalhaoLike) => void;
}

/** Fits the map to all polygon bounds */
function FitAllBounds({ talhoes }: { talhoes: TalhaoLike[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    const coords: [number, number][] = [];
    talhoes.forEach((t) => {
      if (!t.geojson) return;
      try {
        const geo = t.geojson as any;
        const geom = geo.type === 'Feature' ? geo.geometry : geo;
        if (geom?.coordinates) {
          (geom.coordinates[0] as number[][]).forEach((c: number[]) => {
            coords.push([c[1], c[0]]);
          });
        }
      } catch { /* skip */ }
    });

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      fitted.current = true;
    }
  }, [talhoes, map]);

  return null;
}

function getCentroid(geojson: any): [number, number] | null {
  try {
    const geo = geojson.type === 'Feature' ? geojson : turf.feature(geojson);
    const c = turfCentroid(geo as any);
    const [lng, lat] = c.geometry.coordinates;
    return [lat, lng];
  } catch {
    return null;
  }
}

/** Flies to a specific talhão polygon */
function FlyToSelected({ talhaoId, talhoes }: { talhaoId: string | null; talhoes: TalhaoLike[] }) {
  const map = useMap();
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (!talhaoId || talhaoId === prevId.current) return;
    prevId.current = talhaoId;

    const talhao = talhoes.find(t => t.id === talhaoId);
    if (!talhao?.geojson) return;

    try {
      const centroid = getCentroid(talhao.geojson);
      if (centroid) {
        map.setView(centroid, 16, { animate: true, duration: 0.8 });
        setTimeout(() => map.invalidateSize(), 100);
      }
    } catch { /* skip */ }
  }, [talhaoId, talhoes, map]);

  return null;
}

export function FarmOverviewMap({ talhoes, onSelectTalhao }: FarmOverviewMapProps) {
  const talhoesWithGeo = useMemo(() => talhoes.filter((t) => t.geojson), [talhoes]);
  const talhoesWithoutGeo = useMemo(() => talhoes.filter((t) => !t.geojson), [talhoes]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('cultura');

  const selectedTalhao = useMemo(() => talhoes.find(t => t.id === selectedId) || null, [talhoes, selectedId]);

  const defaultCenter: [number, number] = [-15.78, -47.93];

  const handleClickPolygon = (talhao: TalhaoLike) => {
    setSelectedId(talhao.id);
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-sm">
        <MapContainer
          center={defaultCenter}
          zoom={5}
          style={{ height: '600px', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
            maxZoom={19}
          />
          <FitAllBounds talhoes={talhoesWithGeo} />
          <FlyToSelected talhaoId={selectedId} talhoes={talhoesWithGeo} />

          {talhoesWithGeo.map((talhao) => {
            const geo = talhao.geojson as any;
            const colors = getPolygonColors(talhao, colorMode);
            const isSelected = selectedId === talhao.id;
            const centroid = getCentroid(geo);

            return (
              <GeoJSON
                key={talhao.id + colorMode}
                data={geo}
                style={() => ({
                  fillColor: colors.fill,
                  fillOpacity: isSelected ? 0.55 : 0.35,
                  color: isSelected ? '#ffffff' : colors.border,
                  weight: isSelected ? 4 : 2.5,
                })}
                eventHandlers={{
                  click: () => handleClickPolygon(talhao),
                  mouseover: (e) => {
                    if (!isSelected) {
                      const layer = e.target;
                      layer.setStyle({ weight: 4, fillOpacity: 0.55 });
                      layer.bringToFront();
                    }
                  },
                  mouseout: (e) => {
                    if (!isSelected) {
                      const layer = e.target;
                      layer.setStyle({ weight: 2.5, fillOpacity: 0.35 });
                    }
                  },
                }}
                onEachFeature={(_feature, layer) => {
                  const statusLabel = {
                    producao: 'Em Produção',
                    plantio: 'Plantio',
                    colheita: 'Colheita',
                    pousio: 'Pousio',
                  }[(talhao as any).operation_status || 'producao'] || 'Em Produção';

                  layer.bindTooltip(
                    `<div class="farm-tooltip-content">
                      <strong>${talhao.name}</strong><br/>
                      <span>${talhao.area_ha.toFixed(1)} ha • ${talhao.coffee_type === 'conilon' ? 'Conilon' : 'Arábica'}</span>
                      <br/><span style="opacity:0.7">${statusLabel}</span>
                      ${talhao.variety ? `<br/><span style="opacity:0.7">${talhao.variety}</span>` : ''}
                    </div>`,
                    { sticky: true, className: 'farm-tooltip' }
                  );

                  if (centroid) {
                    const marker = L.marker(centroid, {
                      icon: L.divIcon({
                        className: 'farm-label',
                        html: `<span>${talhao.name}<br/><small>${talhao.area_ha.toFixed(1)} ha</small></span>`,
                        iconSize: [100, 40],
                        iconAnchor: [50, 20],
                      }),
                      interactive: true,
                    });
                    marker.on('click', () => handleClickPolygon(talhao));
                    const parentMap = (layer as any)._map;
                    if (parentMap) {
                      marker.addTo(parentMap);
                    } else {
                      layer.on('add', (ev: any) => {
                        marker.addTo(ev.target._map);
                      });
                    }
                  }
                }}
              />
            );
          })}
        </MapContainer>

        {/* Interactive Legend */}
        <MapLegend colorMode={colorMode} onColorModeChange={setColorMode} />

        {/* Selected talhão action bar */}
        {selectedTalhao && (
          <div className="absolute top-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 shadow-lg max-w-[220px]">
            <p className="text-sm font-semibold text-foreground truncate">{selectedTalhao.name}</p>
            <p className="text-xs text-muted-foreground">
              {selectedTalhao.area_ha.toFixed(1)} ha • {selectedTalhao.coffee_type === 'conilon' ? 'Conilon' : 'Arábica'}
            </p>
            <Button
              size="sm"
              className="w-full mt-2 gap-1.5"
              onClick={() => onSelectTalhao(selectedTalhao)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar Talhão
            </Button>
          </div>
        )}
      </div>

      {/* Talhões without polygon */}
      {talhoesWithoutGeo.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Talhões sem polígono ({talhoesWithoutGeo.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {talhoesWithoutGeo.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectTalhao(t)}
                className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
              >
                {t.name} — {t.area_ha.toFixed(1)} ha
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
