import { useMemo } from 'react';
import { Beaker, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  K_PHENOLOGY_DISTRIBUTION,
  K2O_TARGETS,
  calcAdultK2ODemand,
  getYear1K2O,
  getYear2K2O,
  getPotassiumMultiplier,
} from '@/lib/coffeeRecommendationEngine';

interface KPhenologyCardProps {
  /** Talhão age in months */
  ageMonths: number;
  /** Productivity target in sacas/ha (used for adult phase) */
  sacasPerHa: number;
  /** Soil K in mg/dm³ */
  kSoilMgDm3?: number;
  /** Total plants in the talhão */
  totalPlants: number;
  /** Area in hectares */
  areaHa: number;
}

/** Returns which phenological period we're currently in (0-indexed) based on month */
function getCurrentPeriodIndex(): number {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 9 && month <= 10) return 0; // Set/Out
  if (month >= 11 || month === 12) return 1; // Nov/Dez
  if (month >= 1 && month <= 2) return 2; // Jan/Fev
  if (month >= 3 && month <= 4) return 3; // Mar/Abr
  return -1; // May-Aug (repouso)
}

export function KPhenologyCard({
  ageMonths,
  sacasPerHa,
  kSoilMgDm3,
  totalPlants,
  areaHa,
}: KPhenologyCardProps) {
  const currentPeriod = getCurrentPeriodIndex();
  const { multiplier, level } = getPotassiumMultiplier(kSoilMgDm3);

  const { totalK2OKgHa, phase, gPerPlant } = useMemo(() => {
    if (ageMonths <= 12) {
      const gPlant = getYear1K2O(kSoilMgDm3);
      const kgHa = totalPlants > 0 ? (gPlant * totalPlants) / 1000 / areaHa : 0;
      return { totalK2OKgHa: kgHa, phase: 'Ano 1 (Formação)', gPerPlant: gPlant };
    }
    if (ageMonths <= 24) {
      const { k2o } = getYear2K2O(kSoilMgDm3);
      const kgHa = totalPlants > 0 ? (k2o * totalPlants) / 1000 / areaHa : 0;
      return { totalK2OKgHa: kgHa, phase: 'Ano 2 (Formação)', gPerPlant: k2o };
    }
    const kgHa = calcAdultK2ODemand(sacasPerHa, kSoilMgDm3);
    const gPlant = totalPlants > 0 ? (kgHa * 1000 * areaHa) / totalPlants : 0;
    return { totalK2OKgHa: kgHa, phase: 'Adulto (Produção)', gPerPlant: Math.round(gPlant) };
  }, [ageMonths, sacasPerHa, kSoilMgDm3, totalPlants, areaHa]);

  // Max bar width reference
  const maxPercent = Math.max(...K_PHENOLOGY_DISTRIBUTION.map(d => d.percent));

  const levelLabels: Record<string, string> = {
    baixo: 'Baixo (+20%)',
    medio: 'Médio (100%)',
    alto: 'Alto (-20%)',
    muito_alto: 'Muito Alto (-40%)',
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-sky-50/30 dark:from-blue-950/20 dark:to-sky-950/10">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Beaker className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Demanda de K₂O por Fenologia</h4>
              <p className="text-[11px] text-muted-foreground">{phase}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] h-5 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300">
            K solo: {levelLabels[level]}
          </Badge>
        </div>

        {/* Total demand summary */}
        <div className="flex items-center gap-4 p-3 rounded-xl bg-blue-100/50 dark:bg-blue-900/30">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalK2OKgHa.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground font-medium">kg K₂O/ha/ano</p>
          </div>
          <div className="w-px h-10 bg-blue-200 dark:bg-blue-700" />
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{gPerPlant}</p>
            <p className="text-[10px] text-muted-foreground font-medium">g/planta/ano</p>
          </div>
          <div className="w-px h-10 bg-blue-200 dark:bg-blue-700" />
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">×{multiplier.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Multiplicador</p>
          </div>
        </div>

        {/* Distribution bars */}
        <div className="space-y-2.5">
          {K_PHENOLOGY_DISTRIBUTION.map((item, i) => {
            const kgInPeriod = totalK2OKgHa * item.percent;
            const barWidth = (item.percent / maxPercent) * 100;
            const isCurrent = i === currentPeriod;

            return (
              <div key={i} className={cn(
                'rounded-lg p-2.5 transition-all',
                isCurrent ? 'bg-blue-200/60 dark:bg-blue-800/40 ring-1 ring-blue-400/50' : 'bg-muted/30'
              )}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{item.period}</span>
                    {isCurrent && (
                      <Badge className="text-[9px] h-4 bg-blue-600 text-white">Atual</Badge>
                    )}
                  </div>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    {kgInPeriod.toFixed(1)} kg/ha
                  </span>
                </div>

                {/* Bar */}
                <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isCurrent
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                        : 'bg-blue-400/50 dark:bg-blue-600/40'
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {item.action} — {(item.percent * 100).toFixed(0)}% do total
                </p>
              </div>
            );
          })}
        </div>

        {/* Repouso note */}
        {currentPeriod === -1 && (
          <p className="text-xs text-muted-foreground italic text-center py-2">
            ☕ Período de repouso (Mai–Ago) — sem aplicação de K programada.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
