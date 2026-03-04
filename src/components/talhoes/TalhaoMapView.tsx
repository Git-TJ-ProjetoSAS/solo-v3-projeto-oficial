import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import area from '@turf/area';
import centroid from '@turf/centroid';
import { polygon as turfPolygon } from '@turf/helpers';
import { Talhao } from '@/hooks/useTalhoes';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MapPin, Plus, Satellite, Map as MapIcon, CloudRain } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type MapInteractionMode } from '@/types/mapInteraction';

// Extracted subcomponents
import { MapSearchControl } from './map/MapSearchControl';
import { DrawControl } from './map/DrawControl';
import { WeatherTileOverlay, type WeatherLayerType } from './map/WeatherOverlay';
import { RedrawConfirmDialog } from './map/RedrawConfirmDialog';
import { FlyToTalhao } from './map/FlyToTalhao';
import { TILE_URLS, type TileType } from './map/tileConfig';
import { MapToolbar } from './map/MapToolbar';
import { MeasureTool } from './map/MeasureTool';
import { ScoutingTool } from './map/ScoutingTool';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface TalhaoMapViewProps {
  talhoes: Talhao[];
  onSavePolygon: (name: string, geojson: any, areaHa: number, centerLat: number, centerLng: number) => Promise<void>;
  onUpdatePolygon: (id: string, geojson: any, areaHa: number, centerLat: number, centerLng: number) => Promise<void>;
  onPolygonDrawn?: (data: { geojson: any; areaHa: number; centerLat: number; centerLng: number }) => void;
  selectedTalhaoId?: string | null;
  onSelectTalhao?: (id: string) => void;
  redrawingTalhaoId?: string | null;
  onStartRedraw?: (id: string) => void;
  onCancelRedraw?: () => void;
}

export function TalhaoMapView({ talhoes, onSavePolygon, onUpdatePolygon, onPolygonDrawn, selectedTalhaoId, onSelectTalhao, redrawingTalhaoId, onStartRedraw, onCancelRedraw }: TalhaoMapViewProps) {
  const [mapReady, setMapReady] = useState(false);
  const [tileType, setTileType] = useState<TileType>('satellite');
  const [weatherLayer, setWeatherLayer] = useState<WeatherLayerType>('none');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newTalhaoName, setNewTalhaoName] = useState('');
  const [pendingGeojson, setPendingGeojson] = useState<any>(null);
  const [pendingArea, setPendingArea] = useState(0);
  const [pendingCenter, setPendingCenter] = useState<[number, number]>([0, 0]);
  const [saving, setSaving] = useState(false);
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>('idle');
  const [liveArea, setLiveArea] = useState<number | null>(null);
  const [redrawConfirmOpen, setRedrawConfirmOpen] = useState(false);
  const [pendingRedraw, setPendingRedraw] = useState<{ geojson: any; areaHa: number; centerLat: number; centerLng: number } | null>(null);

  useEffect(() => {
    if (redrawingTalhaoId) {
      setInteractionMode('drawing');
    }
  }, [redrawingTalhaoId]);

  const handleModeChange = useCallback((mode: MapInteractionMode) => {
    if (mode !== 'drawing' && redrawingTalhaoId) {
      onCancelRedraw?.();
    }
    setInteractionMode(mode);
    setLiveArea(null);
  }, [redrawingTalhaoId, onCancelRedraw]);

  const defaultCenter: [number, number] = [-19.9, -40.5];
  const defaultZoom = 13;

  const mapCenter = (() => {
    const withCoords = talhoes.filter(t => t.center_lat && t.center_lng);
    if (withCoords.length > 0) {
      const avgLat = withCoords.reduce((sum, t) => sum + (t.center_lat || 0), 0) / withCoords.length;
      const avgLng = withCoords.reduce((sum, t) => sum + (t.center_lng || 0), 0) / withCoords.length;
      return [avgLat, avgLng] as [number, number];
    }
    return defaultCenter;
  })();

  const selectedTalhao = talhoes.find(t => t.id === selectedTalhaoId) || null;

  const handlePolygonCreated = useCallback((_layer: L.Layer, geojson: any) => {
    try {
      const coords = geojson.geometry.coordinates;
      const turfPoly = turfPolygon(coords);
      const areaM2 = area(turfPoly);
      const areaHa = Math.round((areaM2 / 10000) * 100) / 100;
      const center = centroid(turfPoly);
      const [lng, lat] = center.geometry.coordinates;

      if (redrawingTalhaoId) {
        setPendingRedraw({ geojson: geojson.geometry, areaHa, centerLat: lat, centerLng: lng });
        setRedrawConfirmOpen(true);
        setInteractionMode('idle');
        return;
      }

      if (onPolygonDrawn) {
        onPolygonDrawn({ geojson: geojson.geometry, areaHa, centerLat: lat, centerLng: lng });
        setInteractionMode('idle');
        return;
      }

      setPendingGeojson(geojson.geometry);
      setPendingArea(areaHa);
      setPendingCenter([lat, lng]);
      setSaveDialogOpen(true);
    } catch (e) {
      console.error('Error calculating polygon area:', e);
    }
  }, [onPolygonDrawn, redrawingTalhaoId]);

  const handleSave = async () => {
    if (!newTalhaoName.trim() || !pendingGeojson) return;
    setSaving(true);
    await onSavePolygon(newTalhaoName.trim(), pendingGeojson, pendingArea, pendingCenter[0], pendingCenter[1]);
    setSaving(false);
    setSaveDialogOpen(false);
    setNewTalhaoName('');
    setPendingGeojson(null);
    setInteractionMode('idle');
  };

  const handleRedrawConfirm = async (geojson: any, areaHa: number, centerLat: number, centerLng: number) => {
    if (!redrawingTalhaoId) return;
    await onUpdatePolygon(redrawingTalhaoId, geojson, areaHa, centerLat, centerLng);
    setRedrawConfirmOpen(false);
    setPendingRedraw(null);
    onCancelRedraw?.();
  };

  const handleRedrawCancel = () => {
    setRedrawConfirmOpen(false);
    setPendingRedraw(null);
    onCancelRedraw?.();
  };

  const tileConfig = TILE_URLS[tileType];

  return (
    <div className="space-y-4">
      {/* Map controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant={tileType === 'satellite' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTileType('satellite')}
            className="gap-1.5"
          >
            <Satellite className="w-3.5 h-3.5" />
            Satélite
          </Button>
          <Button
            variant={tileType === 'osm' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTileType('osm')}
            className="gap-1.5"
          >
            <MapIcon className="w-3.5 h-3.5" />
            Mapa
          </Button>

          <Select value={weatherLayer} onValueChange={(v) => setWeatherLayer(v as WeatherLayerType)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <CloudRain className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="Camada Clima" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem camada</SelectItem>
              <SelectItem value="precipitation">🌧 Precipitação</SelectItem>
              <SelectItem value="temp">🌡 Temperatura</SelectItem>
              <SelectItem value="clouds">☁ Nuvens</SelectItem>
              <SelectItem value="wind">💨 Vento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <MapToolbar
          mode={interactionMode}
          onModeChange={handleModeChange}
          redrawingName={redrawingTalhaoId ? talhoes.find(t => t.id === redrawingTalhaoId)?.name : undefined}
        />
      </div>

      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg border border-border/50">
        {!mapReady && (
          <div className="absolute inset-0 z-10">
            <Skeleton className="w-full h-full rounded-2xl" />
          </div>
        )}

        <MapContainer
          center={mapCenter}
          zoom={defaultZoom}
          maxZoom={22}
          className="w-full z-0"
          style={{ height: '500px' }}
          whenReady={() => setMapReady(true)}
        >
          <TileLayer key={tileType} url={tileConfig.url} attribution={tileConfig.attribution} maxNativeZoom={tileConfig.maxNativeZoom} maxZoom={22} />
          <WeatherTileOverlay layerType={weatherLayer} />
          <MapSearchControl />
          {interactionMode === 'drawing' && <DrawControl onPolygonCreated={handlePolygonCreated} onLiveArea={setLiveArea} />}

          {talhoes.filter(t => t.geojson && t.id !== redrawingTalhaoId).map(talhao => (
            <GeoJSON
              key={talhao.id + tileType}
              data={{
                type: 'Feature',
                geometry: talhao.geojson as any,
                properties: { name: talhao.name, id: talhao.id },
              } as any}
              style={{
                color: talhao.coffee_type === 'conilon' ? '#0ea5e9' : '#22c55e',
                weight: 2,
                fillOpacity: selectedTalhaoId === talhao.id ? 0.5 : 0.3,
                fillColor: talhao.coffee_type === 'conilon' ? '#38bdf8' : '#4ade80',
              }}
              eventHandlers={{
                click: () => onSelectTalhao?.(talhao.id),
              }}
              onEachFeature={(_feature, layer) => {
                layer.bindTooltip(
                  `<strong>${talhao.name}</strong><br/>${talhao.area_ha} ha`,
                  { permanent: false, direction: 'center' }
                );
              }}
            />
          ))}

          <FlyToTalhao talhao={selectedTalhao} />

          {/* Measure tool overlay */}
          <MeasureTool active={interactionMode === 'measuring'} onDeactivate={() => setInteractionMode('idle')} />

          {/* Scouting tool overlay */}
          <ScoutingTool
            active={interactionMode === 'scouting'}
            talhoes={talhoes.filter(t => t.geojson).map(t => ({ id: t.id, name: t.name, geojson: t.geojson }))}
            onDeactivate={() => setInteractionMode('idle')}
          />
        </MapContainer>

        {/* Drawing overlay controls */}
        {interactionMode === 'drawing' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
            {liveArea !== null && (
              <div className="px-4 py-2.5 rounded-xl bg-background/95 backdrop-blur border border-primary/30 shadow-lg flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Área: <span className="text-primary font-bold text-base">{liveArea}</span> ha
                </span>
              </div>
            )}
            <Button
              variant="destructive"
              size="sm"
              className="shadow-lg"
              onClick={() => {
                if (redrawingTalhaoId) onCancelRedraw?.();
                setInteractionMode('idle');
              }}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Save dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={(open) => {
        setSaveDialogOpen(open);
        if (!open) setPendingGeojson(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Registrar Talhão
            </DialogTitle>
            <DialogDescription>
              Área calculada automaticamente a partir do polígono desenhado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Área Calculada</p>
              <p className="text-3xl font-bold text-foreground">{pendingArea}</p>
              <p className="text-sm text-muted-foreground">hectares</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-talhao-name">Nome do Talhão *</Label>
              <Input
                id="new-talhao-name"
                placeholder="Ex: Talhão Café Fundo"
                value={newTalhaoName}
                onChange={e => setNewTalhaoName(e.target.value)}
                autoFocus
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={!newTalhaoName.trim() || saving}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Talhão'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redraw confirmation dialog */}
      <RedrawConfirmDialog
        open={redrawConfirmOpen}
        onOpenChange={setRedrawConfirmOpen}
        talhao={talhoes.find(t => t.id === redrawingTalhaoId)}
        pendingRedraw={pendingRedraw}
        onConfirm={handleRedrawConfirm}
        onCancel={handleRedrawCancel}
      />
    </div>
  );
}
