import { useMemo, useEffect, useState } from 'react';
import { Talhao } from '@/hooks/useTalhoes';
import { TalhaoHistoryEntry } from '@/hooks/useTalhaoHistory';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  BarChart3, DollarSign, Wheat, Beaker, ShieldAlert,
  Package, Loader2, Leaf, TrendingUp, ArrowUpDown,
  FlaskConical, Target,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Helpers ─────────────────────────────────────────────────
function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function shortName(name: string, max = 10) {
  return name.length > max ? name.slice(0, max) + '…' : name;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(262, 83%, 58%)',
  'hsl(0, 72%, 51%)',
  'hsl(199, 89%, 48%)',
];

const levelLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  muito_alta: 'Muito Alta',
};

// ─── Tooltip Style ───────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  fontSize: '12px',
};

// ─── Section wrapper ─────────────────────────────────────────
function Section({ icon, title, children }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
        {icon}
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
interface TalhaoComparativeProps {
  talhoes: Talhao[];
}

export function TalhaoComparative({ talhoes }: TalhaoComparativeProps) {
  const [latestHistory, setLatestHistory] = useState<Record<string, TalhaoHistoryEntry>>({});
  const [loading, setLoading] = useState(true);

  // Fetch latest history entry per talhao
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const ids = talhoes.map(t => t.id);
      if (ids.length === 0) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('talhao_history' as any)
        .select('*')
        .in('talhao_id', ids)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const map: Record<string, TalhaoHistoryEntry> = {};
        for (const row of (data as unknown as TalhaoHistoryEntry[])) {
          // Keep only the latest per talhao
          if (!map[row.talhao_id]) {
            map[row.talhao_id] = row;
          }
        }
        setLatestHistory(map);
      }
      setLoading(false);
    }
    fetchAll();
  }, [talhoes]);

  // ─── Derived data ──────────────────────────────────────────
  const talhoesWithData = useMemo(() => {
    return talhoes.filter(t => t.productivity_target > 0 || t.cost_per_ha > 0 || latestHistory[t.id]);
  }, [talhoes, latestHistory]);

  const costChartData = useMemo(() => {
    return talhoesWithData.map(t => {
      const h = latestHistory[t.id];
      return {
        name: shortName(t.name),
        fullName: t.name,
        custoHa: h?.cost_per_ha || t.cost_per_ha,
        calagem: h?.liming_cost_per_ha || 0,
        defensivos: h?.treatment_cost_per_ha || 0,
        custoSaca: h?.cost_per_saca || t.cost_per_saca,
        produtividade: h?.productivity_target || t.productivity_target,
      };
    });
  }, [talhoesWithData, latestHistory]);

  const soilRadarData = useMemo(() => {
    const nutrients = ['ca', 'mg', 'k', 'p', 'mo'];
    const labels: Record<string, string> = { ca: 'Ca', mg: 'Mg', k: 'K', p: 'P', mo: 'MO' };

    // Normalize to percentages relative to max across talhões
    const maxValues: Record<string, number> = {};
    for (const nutrient of nutrients) {
      let max = 0;
      for (const t of talhoesWithData) {
        const h = latestHistory[t.id];
        const soil = h?.soil_data as Record<string, number> | null;
        if (soil && typeof soil[nutrient] === 'number') {
          max = Math.max(max, soil[nutrient]);
        }
      }
      maxValues[nutrient] = max || 1;
    }

    return nutrients.map(nutrient => {
      const point: Record<string, any> = { nutrient: labels[nutrient] };
      for (const t of talhoesWithData) {
        const h = latestHistory[t.id];
        const soil = h?.soil_data as Record<string, number> | null;
        const val = soil?.[nutrient] ?? 0;
        point[t.id] = (val / maxValues[nutrient]) * 100;
        point[`${t.id}_raw`] = val;
      }
      return point;
    });
  }, [talhoesWithData, latestHistory]);

  // Insumos comparison: gather unique products across all talhões
  const insumosComparison = useMemo(() => {
    const productMap: Record<string, Record<string, boolean>> = {};

    for (const t of talhoesWithData) {
      const h = latestHistory[t.id];
      const insumos = (h?.insumos_data || []) as any[];
      for (const ins of insumos) {
        const name = ins.nome || ins.name || 'Produto';
        if (!productMap[name]) productMap[name] = {};
        productMap[name][t.id] = true;
      }
    }

    return Object.entries(productMap).map(([product, talhaoMap]) => ({
      product,
      talhaoMap,
    }));
  }, [talhoesWithData, latestHistory]);

  // V% comparison
  const vPercentData = useMemo(() => {
    return talhoesWithData
      .map(t => {
        const h = latestHistory[t.id];
        const soil = h?.soil_data as Record<string, number> | null;
        return {
          name: shortName(t.name),
          fullName: t.name,
          vPercent: soil?.vPercent ?? 0,
        };
      })
      .filter(d => d.vPercent > 0);
  }, [talhoesWithData, latestHistory]);

  // Summary stats
  const stats = useMemo(() => {
    if (costChartData.length === 0) return null;
    const avgCostHa = costChartData.reduce((s, d) => s + d.custoHa, 0) / costChartData.length;
    const avgProd = costChartData.reduce((s, d) => s + d.produtividade, 0) / costChartData.length;
    const withSaca = costChartData.filter(d => d.custoSaca > 0);
    const avgCostSaca = withSaca.length > 0
      ? withSaca.reduce((s, d) => s + d.custoSaca, 0) / withSaca.length
      : 0;

    const bestProd = costChartData.reduce((best, d) =>
      d.produtividade > best.produtividade ? d : best, costChartData[0]);
    const bestCost = costChartData.filter(d => d.custoSaca > 0).reduce((best, d) =>
      (best === null || d.custoSaca < best.custoSaca) ? d : best, null as typeof costChartData[0] | null);

    return { avgCostHa, avgProd, avgCostSaca, bestProd, bestCost };
  }, [costChartData]);

  // ─── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (talhoesWithData.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <BarChart3 className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground text-sm">
          Cadastre talhões e salve planejamentos para visualizar o comparativo completo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Summary Stats ─── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-secondary/50 text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Custo Médio/ha</p>
            <p className="text-lg font-bold text-foreground">{fmtCurrency(stats.avgCostHa)}</p>
          </div>
          <div className="p-4 rounded-xl bg-secondary/50 text-center">
            <Wheat className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prod. Média</p>
            <p className="text-lg font-bold text-foreground">{stats.avgProd.toFixed(0)} sc/ha</p>
          </div>
          <div className="p-4 rounded-xl bg-secondary/50 text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Custo Médio/Saca</p>
            <p className="text-lg font-bold text-foreground">
              {stats.avgCostSaca > 0 ? fmtCurrency(stats.avgCostSaca) : '—'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-secondary/50 text-center">
            <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Talhões</p>
            <p className="text-lg font-bold text-foreground">{talhoesWithData.length}</p>
          </div>
        </div>
      )}

      {/* ─── Highlights ─── */}
      {stats && (stats.bestProd || stats.bestCost) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stats.bestProd && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Maior Produtividade</p>
                <p className="text-sm font-bold text-foreground">{stats.bestProd.fullName}</p>
                <p className="text-xs text-emerald-500 font-medium">{stats.bestProd.produtividade} sc/ha</p>
              </div>
            </div>
          )}
          {stats.bestCost && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <DollarSign className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Menor Custo/Saca</p>
                <p className="text-sm font-bold text-foreground">{stats.bestCost.fullName}</p>
                <p className="text-xs text-primary font-medium">{fmtCurrency(stats.bestCost.custoSaca)}/sc</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tabs for charts ─── */}
      <Tabs defaultValue="costs" className="w-full">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="costs" className="gap-1.5 flex-1 text-xs">
            <DollarSign className="w-3.5 h-3.5" />
            Custos
          </TabsTrigger>
          <TabsTrigger value="productivity" className="gap-1.5 flex-1 text-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            Produtividade
          </TabsTrigger>
          <TabsTrigger value="soil" className="gap-1.5 flex-1 text-xs">
            <Beaker className="w-3.5 h-3.5" />
            Solo
          </TabsTrigger>
          <TabsTrigger value="insumos" className="gap-1.5 flex-1 text-xs">
            <Package className="w-3.5 h-3.5" />
            Insumos
          </TabsTrigger>
        </TabsList>

        {/* ─── CUSTOS TAB ─── */}
        <TabsContent value="costs" className="mt-6 space-y-6">
          {/* Stacked cost breakdown */}
          <Section
            icon={<DollarSign className="w-4 h-4 text-primary" />}
            title="Custos por Hectare — Detalhamento"
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [fmtCurrency(value), name]}
                    labelFormatter={(label: string) => costChartData.find(d => d.name === label)?.fullName || label}
                  />
                  <Bar dataKey="calagem" name="Calagem" stackId="a" radius={[0, 0, 0, 0]} fill="hsl(var(--primary))" />
                  <Bar dataKey="defensivos" name="Defensivos" stackId="a" radius={[6, 6, 0, 0]} fill="hsl(0, 72%, 51%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Cost per saca */}
          <Section
            icon={<ArrowUpDown className="w-4 h-4 text-primary" />}
            title="Custo por Saca Produzida"
          >
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(value: number) => [fmtCurrency(value), 'Custo/Saca']}
                    labelFormatter={(label: string) => costChartData.find(d => d.name === label)?.fullName || label}
                  />
                  <Bar dataKey="custoSaca" name="R$/Saca" radius={[6, 6, 0, 0]} fill="hsl(38, 92%, 50%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Cost table */}
          <Section
            icon={<BarChart3 className="w-4 h-4 text-primary" />}
            title="Tabela Comparativa de Custos"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase">Talhão</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase">Calagem</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase">Defensivos</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase">Total/ha</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase">R$/Saca</th>
                  </tr>
                </thead>
                <tbody>
                  {costChartData.map((d, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium">{d.fullName}</td>
                      <td className="py-2.5 px-3 text-right">{d.calagem > 0 ? fmtCurrency(d.calagem) : '—'}</td>
                      <td className="py-2.5 px-3 text-right">{d.defensivos > 0 ? fmtCurrency(d.defensivos) : '—'}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">{d.custoHa > 0 ? fmtCurrency(d.custoHa) : '—'}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">{d.custoSaca > 0 ? fmtCurrency(d.custoSaca) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </TabsContent>

        {/* ─── PRODUTIVIDADE TAB ─── */}
        <TabsContent value="productivity" className="mt-6 space-y-6">
          <Section
            icon={<Wheat className="w-4 h-4 text-primary" />}
            title="Produtividade por Talhão"
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(value: number) => [`${value} sc/ha`, 'Produtividade']}
                    labelFormatter={(label: string) => costChartData.find(d => d.name === label)?.fullName || label}
                  />
                  <Bar dataKey="produtividade" name="Sacas/ha" radius={[6, 6, 0, 0]} fill="hsl(142, 71%, 45%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Productivity table */}
          <Section
            icon={<Target className="w-4 h-4 text-primary" />}
            title="Detalhes de Produtividade"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase">Talhão</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase">Área (ha)</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase">Meta (sc/ha)</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase">Faixa</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase">Total (sacas)</th>
                  </tr>
                </thead>
                <tbody>
                  {talhoesWithData.map((t) => {
                    const h = latestHistory[t.id];
                    const prod = h?.productivity_target || t.productivity_target;
                    const level = h?.productivity_level || '';
                    return (
                      <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium">
                          <div className="flex items-center gap-2">
                            {t.name}
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                              t.coffee_type === 'conilon'
                                ? 'bg-sky-500/15 text-sky-600'
                                : 'bg-emerald-500/15 text-emerald-600'
                            )}>
                              {t.coffee_type === 'conilon' ? 'C' : 'A'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">{t.area_ha} ha</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{prod} sc/ha</td>
                        <td className="py-2.5 px-3 text-right">
                          {level ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              {levelLabels[level] || level}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {(prod * t.area_ha).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-secondary/20">
                    <td className="py-2.5 px-3 font-bold">Total</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {talhoesWithData.reduce((s, t) => s + t.area_ha, 0).toFixed(1)} ha
                    </td>
                    <td className="py-2.5 px-3 text-right">—</td>
                    <td className="py-2.5 px-3 text-right">—</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {talhoesWithData.reduce((s, t) => {
                        const h = latestHistory[t.id];
                        const prod = h?.productivity_target || t.productivity_target;
                        return s + prod * t.area_ha;
                      }, 0).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>
        </TabsContent>

        {/* ─── SOLO TAB ─── */}
        <TabsContent value="soil" className="mt-6 space-y-6">
          {soilRadarData.length > 0 && talhoesWithData.some(t => latestHistory[t.id]?.soil_data) ? (
            <>
              {/* Radar chart */}
              <Section
                icon={<FlaskConical className="w-4 h-4 text-primary" />}
                title="Perfil Nutricional do Solo (Normalizado)"
              >
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={soilRadarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="nutrient"
                        tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                      />
                      <PolarRadiusAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                      {talhoesWithData
                        .filter(t => latestHistory[t.id]?.soil_data)
                        .map((t, i) => (
                          <Radar
                            key={t.id}
                            name={t.name}
                            dataKey={t.id}
                            stroke={COLORS[i % COLORS.length]}
                            fill={COLORS[i % COLORS.length]}
                            fillOpacity={0.15}
                          />
                        ))}
                      <Tooltip contentStyle={tooltipStyle} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  {talhoesWithData
                    .filter(t => latestHistory[t.id]?.soil_data)
                    .map((t, i) => (
                      <div key={t.id} className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-xs text-muted-foreground">{t.name}</span>
                      </div>
                    ))}
                </div>
              </Section>

              {/* V% comparison */}
              {vPercentData.length > 0 && (
                <Section
                  icon={<Beaker className="w-4 h-4 text-primary" />}
                  title="Saturação por Bases (V%)"
                >
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vPercentData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={tooltipStyle}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'V%']}
                          labelFormatter={(label: string) => vPercentData.find(d => d.name === label)?.fullName || label}
                        />
                        {/* Reference line at 60% */}
                        <Bar dataKey="vPercent" name="V%" radius={[6, 6, 0, 0]}>
                          {vPercentData.map((entry, i) => (
                            <rect key={i} fill={entry.vPercent >= 60 ? 'hsl(142, 71%, 45%)' : 'hsl(38, 92%, 50%)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Alvo: V% ≥ 60% para café. Barras em amarelo indicam necessidade de calagem.
                  </p>
                </Section>
              )}

              {/* Soil values table */}
              <Section
                icon={<Beaker className="w-4 h-4 text-primary" />}
                title="Valores de Solo por Talhão"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase">Talhão</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground">Ca</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground">Mg</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground">K</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground">P</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground">MO</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground">H+Al</th>
                        <th className="text-right py-2 px-2 text-xs text-muted-foreground font-bold">V%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {talhoesWithData.map(t => {
                        const h = latestHistory[t.id];
                        const soil = h?.soil_data as Record<string, number> | null;
                        if (!soil) return null;
                        return (
                          <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="py-2.5 px-3 font-medium">{t.name}</td>
                            <td className="py-2.5 px-2 text-right">{soil.ca ?? '—'}</td>
                            <td className="py-2.5 px-2 text-right">{soil.mg ?? '—'}</td>
                            <td className="py-2.5 px-2 text-right">{soil.k ?? '—'}</td>
                            <td className="py-2.5 px-2 text-right">{soil.p ?? '—'}</td>
                            <td className="py-2.5 px-2 text-right">{soil.mo ?? '—'}</td>
                            <td className="py-2.5 px-2 text-right">{soil.hAl ?? '—'}</td>
                            <td className={cn(
                              'py-2.5 px-2 text-right font-bold',
                              (soil.vPercent ?? 0) >= 60 ? 'text-emerald-500' : 'text-amber-500'
                            )}>
                              {soil.vPercent != null ? `${Number(soil.vPercent).toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          ) : (
            <div className="text-center py-12">
              <Beaker className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                Salve planejamentos com análise de solo para visualizar a comparação.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ─── INSUMOS TAB ─── */}
        <TabsContent value="insumos" className="mt-6 space-y-6">
          {insumosComparison.length > 0 ? (
            <Section
              icon={<Package className="w-4 h-4 text-primary" />}
              title="Insumos Utilizados por Talhão"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase">Produto</th>
                      {talhoesWithData.map(t => (
                        <th key={t.id} className="text-center py-2 px-2 text-xs text-muted-foreground">
                          {shortName(t.name, 8)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {insumosComparison.map(({ product, talhaoMap }) => (
                      <tr key={product} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium">{product}</td>
                        {talhoesWithData.map(t => (
                          <td key={t.id} className="py-2.5 px-2 text-center">
                            {talhaoMap[t.id] ? (
                              <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                                ✓
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Baseado no último planejamento salvo de cada talhão
              </p>
            </Section>
          ) : (
            <div className="text-center py-12">
              <Package className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                Salve planejamentos com insumos selecionados para comparar.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
