import { useState, useEffect, useMemo } from 'react';
import { CloudRain, TreePine, Calendar, TrendingUp, Droplets, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { useTalhoes } from '@/hooks/useTalhoes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RainfallRecord {
  id: string;
  date: string;
  rainfall_mm: number;
  notes: string | null;
  talhao_id: string | null;
}

export default function RainfallHistory() {
  const { talhoes } = useTalhoes();
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string>('all');
  const [records, setRecords] = useState<RainfallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(() => new Date());

  // Auto-select first talhão
  useEffect(() => {
    if (talhoes.length > 0 && selectedTalhaoId === 'all') {
      // keep 'all' as default
    }
  }, [talhoes]);

  // Fetch records
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      let query = supabase
        .from('rainfall_history')
        .select('id, date, rainfall_mm, notes, talhao_id')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (selectedTalhaoId !== 'all') {
        query = query.eq('talhao_id', selectedTalhaoId);
      }

      const { data, error } = await query;
      if (error) {
        toast.error('Erro ao carregar histórico de chuvas');
        console.error(error);
      }
      setRecords((data as RainfallRecord[]) || []);
      setLoading(false);
    };
    fetchRecords();
  }, [selectedTalhaoId]);

  // Delete record
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('rainfall_history').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir registro');
    } else {
      setRecords(prev => prev.filter(r => r.id !== id));
      toast.success('Registro excluído');
    }
  };

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    const months: { month: string; label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM', { locale: ptBR });
      months.push({ month: key, label: label.charAt(0).toUpperCase() + label.slice(1), total: 0 });
    }

    records.forEach(r => {
      const key = r.date.substring(0, 7);
      const found = months.find(m => m.month === key);
      if (found) found.total += Number(r.rainfall_mm);
    });

    return months;
  }, [records]);

  // Current month view data
  const currentMonthKey = format(viewMonth, 'yyyy-MM');
  const monthRecords = useMemo(() => {
    return records
      .filter(r => r.date.startsWith(currentMonthKey))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [records, currentMonthKey]);

  // Summary stats
  const totalAll = records.reduce((s, r) => s + Number(r.rainfall_mm), 0);
  const totalMonth = monthRecords.reduce((s, r) => s + Number(r.rainfall_mm), 0);
  const avgDaily = monthRecords.length > 0 ? totalMonth / monthRecords.length : 0;
  const maxDay = monthRecords.length > 0 ? Math.max(...monthRecords.map(r => Number(r.rainfall_mm))) : 0;

  const talhaoName = (id: string | null) => {
    if (!id) return 'Geral';
    const t = talhoes.find(t => t.id === id);
    return t?.name || 'Talhão';
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Histórico de Chuvas"
        description="Visualize e analise os registros de precipitação por talhão"
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <TreePine className="w-3.5 h-3.5" />
                Filtrar por Talhão
              </label>
              <Select value={selectedTalhaoId} onValueChange={setSelectedTalhaoId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Todos os talhões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os talhões</SelectItem>
                  {talhoes.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {t.area_ha} ha
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando histórico...</span>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <CloudRain className="w-6 h-6 mx-auto mb-2 text-sky-500" />
                <p className="text-xs text-muted-foreground mb-1">Total Geral</p>
                <p className="text-xl font-bold text-foreground">{totalAll.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">mm</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground mb-1">Total do Mês</p>
                <p className="text-xl font-bold text-primary">{totalMonth.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">mm</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <p className="text-xs text-muted-foreground mb-1">Média Diária</p>
                <p className="text-xl font-bold text-foreground">{avgDaily.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">mm/dia</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Droplets className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-xs text-muted-foreground mb-1">Máx. em 1 Dia</p>
                <p className="text-xl font-bold text-foreground">{maxDay.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">mm</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Bar Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-sky-500" />
                Precipitação Mensal (últimos 12 meses)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {records.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum registro de chuva encontrado. Registre na tela de Irrigação.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      unit=" mm"
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)} mm`, 'Precipitação']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {monthlyChartData.map((entry, i) => (
                        <Cell
                          key={i}
                          className={entry.month === currentMonthKey ? 'fill-primary' : 'fill-sky-400/70'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly Detail */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Detalhes — {format(viewMonth, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMonth(prev => subMonths(prev, 1))}
                    className="h-8 px-2 text-xs"
                  >
                    ◀
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMonth(new Date())}
                    className="h-8 px-3 text-xs"
                  >
                    Hoje
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMonth(prev => addMonths(prev, 1))}
                    className="h-8 px-2 text-xs"
                  >
                    ▶
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {monthRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum registro neste mês.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Talhão</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Chuva (mm)</th>
                        <th className="text-center p-3 font-medium text-muted-foreground">Notas</th>
                        <th className="text-center p-3 font-medium text-muted-foreground w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRecords.map(r => (
                        <tr key={r.id} className="border-b border-border/50">
                          <td className="p-3 font-medium text-foreground">
                            {format(parseISO(r.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-xs">
                              {talhaoName(r.talhao_id)}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <span className={cn(
                              'font-semibold',
                              Number(r.rainfall_mm) >= 20 ? 'text-sky-600 dark:text-sky-400' : 'text-foreground'
                            )}>
                              {Number(r.rainfall_mm).toFixed(1)}
                            </span>
                          </td>
                          <td className="p-3 text-center text-xs text-muted-foreground">
                            {r.notes || '—'}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(r.id)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total records count */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <CloudRain className="w-4 h-4 shrink-0" />
            <p>
              <strong>{records.length}</strong> registros encontrados
              {selectedTalhaoId !== 'all' && ` para ${talhaoName(selectedTalhaoId)}`}.
              Os registros são criados automaticamente na tela de Irrigação.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
