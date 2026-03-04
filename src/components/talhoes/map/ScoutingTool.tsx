import { useState, useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint } from '@turf/helpers';
import { useScoutingNotes, type ScoutingNote } from '@/hooks/useScoutingNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TalhaoLike {
  id: string;
  name: string;
  geojson: any;
}

interface ScoutingToolProps {
  active: boolean;
  talhoes: TalhaoLike[];
  onDeactivate: () => void;
}

const scoutIcon = L.divIcon({
  className: 'scouting-marker',
  html: `<div style="width:24px;height:24px;background:#ef4444;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export function ScoutingTool({ active, talhoes, onDeactivate }: ScoutingToolProps) {
  const map = useMap();
  const talhaoIds = talhoes.map(t => t.id);
  const { notes, createNote, deleteNote } = useScoutingNotes(talhaoIds);
  const [formPos, setFormPos] = useState<{ lat: number; lng: number; talhaoId: string; talhaoName: string } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const markersRef = useRef<L.Marker[]>([]);

  // Render existing notes as markers
  useEffect(() => {
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    notes.forEach(note => {
      const marker = L.marker([note.lat, note.lng], { icon: scoutIcon })
        .addTo(map)
        .bindPopup(`<strong>${note.title}</strong><br/>${note.description || '<em>sem descrição</em>'}`);
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
    };
  }, [notes, map]);

  // Handle map clicks when active
  useEffect(() => {
    if (!active) return;

    const onClick = (e: L.LeafletMouseEvent) => {
      const pt = turfPoint([e.latlng.lng, e.latlng.lat]);
      let foundTalhao: TalhaoLike | null = null;

      for (const t of talhoes) {
        if (!t.geojson) continue;
        try {
          const geom = t.geojson.type === 'Feature' ? t.geojson.geometry : t.geojson;
          if (booleanPointInPolygon(pt, geom)) {
            foundTalhao = t;
            break;
          }
        } catch { /* skip */ }
      }

      if (!foundTalhao) {
        toast.warning('Clique dentro de um talhão para adicionar uma nota');
        return;
      }

      setFormPos({ lat: e.latlng.lat, lng: e.latlng.lng, talhaoId: foundTalhao.id, talhaoName: foundTalhao.name });
      setTitle('');
      setDescription('');
    };

    map.on('click', onClick);
    map.getContainer().style.cursor = 'crosshair';

    return () => {
      map.off('click', onClick);
      map.getContainer().style.cursor = '';
    };
  }, [active, map, talhoes]);

  const handleSave = useCallback(async () => {
    if (!formPos || !title.trim()) return;
    try {
      await createNote.mutateAsync({
        talhao_id: formPos.talhaoId,
        title: title.trim(),
        description: description.trim(),
        lat: formPos.lat,
        lng: formPos.lng,
      });
      toast.success('Nota de campo salva!');
      setFormPos(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar nota');
    }
  }, [formPos, title, description, createNote]);

  if (!active) return null;

  return (
    <>
      {/* Floating form */}
      {formPos && (
        <div className="absolute top-4 right-4 z-[1000] w-72 bg-card/95 backdrop-blur border border-border rounded-xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Nova Nota de Campo</p>
            <button onClick={() => setFormPos(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Talhão: {formPos.talhaoName}</p>
          <Input
            placeholder="Título (ex: Foco de cigarrinha)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <Textarea
            placeholder="Descrição (opcional)"
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <Button
            onClick={handleSave}
            disabled={!title.trim() || createNote.isPending}
            className="w-full"
            size="sm"
          >
            {createNote.isPending ? 'Salvando...' : 'Salvar Nota'}
          </Button>
        </div>
      )}

      {/* Bottom indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
        <div className="px-4 py-2.5 rounded-xl bg-background/95 backdrop-blur border border-red-400/40 shadow-lg flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            📌 Clique dentro de um talhão para adicionar nota
          </span>
        </div>
        <button
          onClick={onDeactivate}
          className="p-2 rounded-lg bg-background/95 backdrop-blur border border-border shadow-lg hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
