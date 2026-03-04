import { Pencil, Ruler, MapPinPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type MapInteractionMode } from '@/types/mapInteraction';
import { cn } from '@/lib/utils';

interface MapToolbarProps {
  mode: MapInteractionMode;
  onModeChange: (mode: MapInteractionMode) => void;
  redrawingName?: string;
}

const tools = [
  { id: 'drawing' as const, label: 'Desenhar', icon: Pencil },
  { id: 'measuring' as const, label: 'Régua', icon: Ruler },
  { id: 'scouting' as const, label: 'Nota', icon: MapPinPlus },
] as const;

export function MapToolbar({ mode, onModeChange, redrawingName }: MapToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {redrawingName && (
        <span className="text-xs text-amber-500 font-medium mr-1">
          Redesenhando: {redrawingName}
        </span>
      )}
      {tools.map(tool => {
        const isActive = mode === tool.id;
        return (
          <Button
            key={tool.id}
            variant={isActive ? 'destructive' : 'outline'}
            size="sm"
            className={cn('gap-1.5', isActive && 'ring-2 ring-offset-1 ring-destructive/50')}
            onClick={() => onModeChange(isActive ? 'idle' : tool.id)}
          >
            <tool.icon className="w-3.5 h-3.5" />
            {isActive ? 'Cancelar' : tool.label}
          </Button>
        );
      })}
    </div>
  );
}
