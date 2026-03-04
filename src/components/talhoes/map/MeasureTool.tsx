import { useMap } from 'react-leaflet';
import { useMeasureLine } from '@/hooks/useMeasureLine';
import { Ruler, X } from 'lucide-react';

interface MeasureToolProps {
  active: boolean;
  onDeactivate: () => void;
}

export function MeasureTool({ active, onDeactivate }: MeasureToolProps) {
  const map = useMap();
  const { distance } = useMeasureLine({ map, active });

  if (!active) return null;

  const formatted = distance !== null
    ? distance >= 1
      ? `${distance.toFixed(2)} km`
      : `${Math.round(distance * 1000)} m`
    : null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
      <div className="px-4 py-2.5 rounded-xl bg-background/95 backdrop-blur border border-orange-400/40 shadow-lg flex items-center gap-2">
        <Ruler className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-medium text-foreground">
          {formatted
            ? <>Distância: <span className="text-orange-500 font-bold text-base">{formatted}</span></>
            : 'Clique no mapa para medir'}
        </span>
      </div>
      <button
        onClick={onDeactivate}
        className="p-2 rounded-lg bg-background/95 backdrop-blur border border-border shadow-lg hover:bg-destructive hover:text-destructive-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
