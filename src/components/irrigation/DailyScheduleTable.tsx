import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ScheduleDay } from '@/lib/irrigationEngine';

interface DailyScheduleTableProps {
  schedule: ScheduleDay[];
}

export function DailyScheduleTable({ schedule }: DailyScheduleTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span>📅</span> Cronograma de Execução (7 dias)
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          ETc calculada dia a dia via Hargreaves-Samani — chuva descontada automaticamente
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Temp.</th>
                <th className="text-center p-3 font-medium text-muted-foreground">ETo</th>
                <th className="text-center p-3 font-medium text-muted-foreground">🌧 Chuva</th>
                <th className="text-center p-3 font-medium text-muted-foreground">ETc Líq.</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Lâmina</th>
                <th className="text-center p-3 font-medium text-muted-foreground">⏱ Tempo</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Adubo</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((day, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'border-b border-border/50 transition-colors',
                    day.status === 'Irrigar' ? 'bg-blue-50/50 dark:bg-blue-950/10' : '',
                    day.status === 'Chuva suficiente' ? 'bg-sky-50/50 dark:bg-sky-950/10' : ''
                  )}
                >
                  <td className="p-3 font-medium text-foreground capitalize">{day.dayLabel}</td>
                  <td className="p-3 text-center text-xs text-muted-foreground">
                    {day.tMax !== undefined ? `${Math.round(day.tMax)}°/${Math.round(day.tMin!)}°` : '—'}
                  </td>
                  <td className="p-3 text-center text-xs text-muted-foreground">
                    {day.etoDay.toFixed(1)}
                  </td>
                  <td className="p-3 text-center text-xs">
                    {day.rainfallMm > 0 ? (
                      <span className="text-sky-600 dark:text-sky-400 font-medium">{day.rainfallMm}</span>
                    ) : '—'}
                  </td>
                  <td className="p-3 text-center text-muted-foreground">{day.etcNetDay.toFixed(1)}</td>
                  <td className="p-3 text-center font-semibold text-foreground">
                    {day.laminaAplicar > 0 ? `${day.laminaAplicar} mm` : '—'}
                  </td>
                  <td className="p-3 text-center font-semibold text-primary">
                    {day.tempoIrrigacaoH > 0
                      ? (() => {
                          const h = Math.floor(day.tempoIrrigacaoH);
                          const m = Math.round((day.tempoIrrigacaoH - h) * 60);
                          return h > 0 ? `${h}h${m > 0 ? `${String(m).padStart(2, '0')}min` : ''}` : `${m}min`;
                        })()
                      : '—'}
                  </td>
                  <td className="p-3 text-center text-foreground">
                    {day.aduboKgHa > 0 ? day.aduboKgHa : '—'}
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant={day.status === 'Irrigar' ? 'default' : 'secondary'}
                      className={cn(
                        'text-xs',
                        day.status === 'Irrigar' ? 'bg-blue-500 hover:bg-blue-600 text-white' : '',
                        day.status === 'Chuva suficiente' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border-sky-300' : ''
                      )}
                    >
                      {day.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
