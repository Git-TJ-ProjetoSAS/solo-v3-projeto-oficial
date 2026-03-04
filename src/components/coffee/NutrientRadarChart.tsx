import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import { getStageForMonth, type PhenologyStage } from '@/data/coffeePhenology';
import type { LeafAnalysisData } from '@/contexts/CoffeeContext';
import { Badge } from '@/components/ui/badge';
import { Radar as RadarIcon } from 'lucide-react';

// Nutrients to display on radar
const RADAR_NUTRIENTS = [
  { id: 'n',  symbol: 'N',  staticMin: 3.0,  staticMax: 3.5 },
  { id: 'p',  symbol: 'P',  staticMin: 0.12, staticMax: 0.15 },
  { id: 'k',  symbol: 'K',  staticMin: 1.8,  staticMax: 2.3 },
  { id: 'mg', symbol: 'Mg', staticMin: 0.35, staticMax: 0.5 },
  { id: 'ca', symbol: 'Ca', staticMin: 1.0,  staticMax: 1.5 },
  { id: 's',  symbol: 'S',  staticMin: 0.15, staticMax: 0.20 },
  { id: 'zn', symbol: 'Zn', staticMin: 10,   staticMax: 20 },
  { id: 'b',  symbol: 'B',  staticMin: 40,   staticMax: 80 },
  { id: 'cu', symbol: 'Cu', staticMin: 10,   staticMax: 20 },
  { id: 'mn', symbol: 'Mn', staticMin: 50,   staticMax: 150 },
  { id: 'fe', symbol: 'Fe', staticMin: 50,   staticMax: 200 },
  { id: 'mo', symbol: 'Mo', staticMin: 0.1,  staticMax: 1.0 },
];

interface Props {
  leafAnalysis: LeafAnalysisData | null;
  month: number;
}

export function NutrientRadarChart({ leafAnalysis, month }: Props) {
  const stage = getStageForMonth(month);

  const data = useMemo(() => {
    if (!leafAnalysis) return [];

    return RADAR_NUTRIENTS.map(nut => {
      const stageTarget = stage.targets[nut.id];
      const meta = stageTarget ? (stageTarget.min + stageTarget.max) / 2 : (nut.staticMin + nut.staticMax) / 2;
      const max = stageTarget ? stageTarget.max : nut.staticMax;

      const leafEntry = leafAnalysis[nut.id];
      const current = leafEntry?.value ?? 0;

      // Normalize both to percentage of the max ideal range (so radar axes are comparable)
      const normalizedMeta = max > 0 ? (meta / max) * 100 : 0;
      const normalizedCurrent = max > 0 ? Math.min((current / max) * 100, 150) : 0;

      return {
        nutrient: nut.symbol,
        meta: Math.round(normalizedMeta),
        atual: Math.round(normalizedCurrent),
        rawMeta: meta,
        rawCurrent: current,
        unit: nut.staticMax >= 1 && nut.staticMin >= 1 ? (nut.staticMax > 5 ? 'ppm' : '%') : '%',
      };
    });
  }, [leafAnalysis, stage]);

  const hasData = leafAnalysis && Object.values(leafAnalysis).some(e => e && e.value > 0);
  if (!hasData) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <RadarIcon className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Perfil Nutricional vs Meta Fenológica</span>
        <Badge variant="outline" className={cn('text-[10px] ml-auto', stage.color)}>
          {stage.name}
        </Badge>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="nutrient"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 150]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Meta da Fase"
            dataKey="meta"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.15}
            strokeWidth={2}
            strokeDasharray="6 3"
          />
          <Radar
            name="Teor Atual"
            dataKey="atual"
            stroke="hsl(142, 71%, 45%)"
            fill="hsl(142, 71%, 45%)"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.75rem',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string, entry: any) => {
              const raw = name === 'Meta da Fase' ? entry.payload.rawMeta : entry.payload.rawCurrent;
              return [`${raw} (${value}%)`, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          />
        </RadarChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-muted-foreground text-center">
        Valores normalizados como % do limite superior da faixa ideal. Área verde = perfil atual, área azul tracejada = meta da fase.
      </p>
    </div>
  );
}
