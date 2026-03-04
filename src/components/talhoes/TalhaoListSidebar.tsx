import { Talhao } from '@/hooks/useTalhoes';
import { cn } from '@/lib/utils';
import { MapPin, Coffee, Droplets, ChevronRight, TreePine, Pencil } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface TalhaoListSidebarProps {
  talhoes: Talhao[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRedraw?: (id: string) => void;
  redrawingId?: string | null;
}

export function TalhaoListSidebar({ talhoes, selectedId, onSelect, onRedraw, redrawingId }: TalhaoListSidebarProps) {
  if (talhoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <TreePine className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhum talhão cadastrado. Use o mapa para desenhar seus talhões.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2 p-1">
        {talhoes.map(talhao => {
          const isConilon = talhao.coffee_type === 'conilon';
          const isSelected = selectedId === talhao.id;
          const hasGeo = !!talhao.geojson;

          return (
            <button
              key={talhao.id}
              onClick={() => onSelect(talhao.id)}
              className={cn(
                'w-full text-left p-3 rounded-xl border transition-all',
                isSelected
                  ? isConilon
                    ? 'border-sky-500 bg-sky-500/10 shadow-sm'
                    : 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                  : 'border-border/50 bg-card hover:border-primary/30 hover:shadow-sm'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      hasGeo ? (isConilon ? 'bg-sky-500' : 'bg-emerald-500') : 'bg-muted-foreground/30'
                    )} />
                    <p className="text-sm font-semibold text-foreground truncate">{talhao.name}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-4">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {talhao.area_ha} ha
                    </span>
                    <span className={cn(
                      'text-xs font-medium',
                      isConilon ? 'text-sky-600' : 'text-emerald-600'
                    )}>
                      {isConilon ? 'Conilon' : 'Arábica'}
                    </span>
                    {talhao.irrigated && (
                      <Droplets className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                </div>
                {hasGeo && (
                  <ChevronRight className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isSelected ? 'text-primary' : 'text-muted-foreground/50'
                  )} />
                )}
              </div>
              {isSelected && onRedraw && (
                <div className="mt-2 ml-4">
                  <Button
                    variant={redrawingId === talhao.id ? 'destructive' : 'outline'}
                    size="sm"
                    className="gap-1.5 h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRedraw(talhao.id);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                    {redrawingId === talhao.id ? 'Redesenhando...' : 'Redesenhar Polígono'}
                  </Button>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
