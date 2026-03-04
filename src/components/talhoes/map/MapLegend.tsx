import { useState } from 'react';

type ColorMode = 'cultura' | 'status';

interface MapLegendProps {
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
}

const CULTURA_COLORS = [
  { label: 'Conilon', color: '#22c55e' },
  { label: 'Arábica', color: '#f59e0b' },
];

const STATUS_COLORS = [
  { label: 'Produção', color: '#22c55e' },
  { label: 'Plantio', color: '#3b82f6' },
  { label: 'Colheita', color: '#f97316' },
  { label: 'Pousio', color: '#9ca3af' },
];

export type { ColorMode };

export function getPolygonColors(talhao: { coffee_type: string; operation_status?: string }, colorMode: ColorMode) {
  if (colorMode === 'status') {
    const status = (talhao as any).operation_status || 'producao';
    const map: Record<string, { fill: string; border: string }> = {
      producao: { fill: '#22c55e', border: '#15803d' },
      plantio: { fill: '#3b82f6', border: '#1d4ed8' },
      colheita: { fill: '#f97316', border: '#c2410c' },
      pousio: { fill: '#9ca3af', border: '#6b7280' },
    };
    return map[status] ?? map.producao;
  }
  // cultura mode
  const map: Record<string, { fill: string; border: string }> = {
    conilon: { fill: '#22c55e', border: '#15803d' },
    arabica: { fill: '#f59e0b', border: '#b45309' },
  };
  return map[talhao.coffee_type] ?? { fill: '#3b82f6', border: '#1d4ed8' };
}

export function MapLegend({ colorMode, onColorModeChange }: MapLegendProps) {
  const items = colorMode === 'cultura' ? CULTURA_COLORS : STATUS_COLORS;

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl p-3 space-y-2">
      {/* Mode toggle */}
      <div className="flex gap-1">
        {(['cultura', 'status'] as const).map(m => (
          <button
            key={m}
            onClick={() => onColorModeChange(m)}
            className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
              colorMode === m
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            {m === 'cultura' ? 'Cultura' : 'Status'}
          </button>
        ))}
      </div>
      {/* Items */}
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
          <span className="text-foreground">{item.label}</span>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground pt-0.5">Clique para localizar</p>
    </div>
  );
}
