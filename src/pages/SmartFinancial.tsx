import { useState, useMemo } from 'react';
import { DollarSign, Plus, TrendingDown, TrendingUp, BarChart3, Trash2, Sparkles, ArrowLeft, TreePine, Coffee, FileText, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinancialTransactions, getCategoryLabel, getCategoryColor } from '@/hooks/useFinancialTransactions';
import { TransactionEntrySheet } from '@/components/financial/TransactionEntrySheet';
import { FinancialReport } from '@/components/financial/FinancialReport';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useRoutePrefix } from '@/hooks/useRoutePrefix';
import { useTalhoes } from '@/hooks/useTalhoes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SmartFinancial() {
  const [entryOpen, setEntryOpen] = useState(false);
  const [talhaoFilter, setTalhaoFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'setor' | 'fornecedor'>('setor');
  const [showReport, setShowReport] = useState(false);
  const [txTab, setTxTab] = useState<'saidas' | 'entradas'>('saidas');
  const [groupBy, setGroupBy] = useState<'categoria' | 'fornecedor'>('categoria');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const navigate = useNavigate();
  const { prefixRoute } = useRoutePrefix();
  const { talhoes } = useTalhoes();

  const dateRange = useMemo(() => {
    if (periodFilter === 'all') return null;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed
    let start: Date;
    let end: Date = new Date(y, m + 1, 0); // last day of current month

    if (periodFilter === 'month') {
      start = new Date(y, m, 1);
    } else if (periodFilter === 'quarter') {
      const qStart = Math.floor(m / 3) * 3;
      start = new Date(y, qStart, 1);
      end = new Date(y, qStart + 3, 0);
    } else if (periodFilter === 'semester') {
      const sStart = m < 6 ? 0 : 6;
      start = new Date(y, sStart, 1);
      end = new Date(y, sStart + 6, 0);
    } else {
      return null;
    }

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return { start: fmt(start), end: fmt(end) };
  }, [periodFilter]);

  const {
    transactions,
    safraMetas,
    loading,
    addTransaction,
    deleteTransaction,
    totalDespesas,
    totalReceitas,
    totalPlanejado,
    custoPorHectare,
    custoPorSaca,
    totalArea,
    totalSacos,
    categorySummary,
    fornecedorSummary,
    transactionsByCategory,
    transactionsByFornecedor,
    revenueTransactions,
  } = useFinancialTransactions(undefined, talhaoFilter, dateRange);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const selectedTalhao = talhoes.find(t => t.id === talhaoFilter);
  const coffeeTypeLabel = selectedTalhao
    ? selectedTalhao.coffee_type === 'conilon' ? 'Conilon' : 'Arábica'
    : 'Todos';

  const donutData = categorySummary.map(s => ({
    name: s.label,
    value: s.total,
    color: s.color,
    percentage: s.percentage,
  }));

  const FORNECEDOR_COLORS = [
    'hsl(142, 70%, 45%)', 'hsl(204, 85%, 51%)', 'hsl(270, 60%, 50%)',
    'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(190, 70%, 50%)',
    'hsl(60, 70%, 45%)', 'hsl(30, 80%, 50%)',
  ];

  const fornecedorDonut = fornecedorSummary.map((f, i) => ({
    name: f.name,
    value: f.total,
    color: FORNECEDOR_COLORS[i % FORNECEDOR_COLORS.length],
    percentage: f.percentage,
  }));

  const activeDonut = viewMode === 'setor' ? donutData : fornecedorDonut;

  // Monthly Receitas vs Despesas data
  const monthlyData = (() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const map = new Map<number, { receitas: number; despesas: number }>();
    
    transactions.filter(t => t.status === 'realizado').forEach(t => {
      const d = new Date(t.data);
      const monthIdx = d.getMonth();
      const entry = map.get(monthIdx) || { receitas: 0, despesas: 0 };
      if (t.tipo === 'receita') {
        entry.receitas += t.valor_total;
      } else {
        entry.despesas += t.valor_total;
      }
      map.set(monthIdx, entry);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([monthIdx, vals]) => ({
        mes: months[monthIdx],
        Receitas: vals.receitas,
        Despesas: vals.despesas,
        saldo: vals.receitas - vals.despesas,
      }));
  })();

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (showReport) {
    return (
      <FinancialReport
        transactions={transactions}
        safraMetas={safraMetas}
        totalReceitas={totalReceitas}
        totalDespesas={totalDespesas}
        totalSacos={totalSacos}
        categorySummary={categorySummary}
        fornecedorSummary={fornecedorSummary}
        revenueTransactions={revenueTransactions}
        safra="2025/2026"
        onClose={() => setShowReport(false)}
      />
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(prefixRoute('/'))} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Central de Custos</h1>
          <p className="text-sm text-muted-foreground">Safra 2025/2026 · {coffeeTypeLabel}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowReport(true)} className="gap-1.5">
          <FileText className="w-4 h-4" />
          DRE
        </Button>
      </div>

      {/* Filters: Talhão + Período */}
      <div className="flex gap-2">
        <Select
          value={talhaoFilter || 'all'}
          onValueChange={(v) => setTalhaoFilter(v === 'all' ? null : v)}
        >
          <SelectTrigger className="flex-1 h-11 rounded-xl">
            <div className="flex items-center gap-2">
              <TreePine className="w-4 h-4 text-muted-foreground" />
              <SelectValue placeholder="Filtrar por talhão" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os talhões</SelectItem>
            {talhoes.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} ({t.coffee_type === 'conilon' ? 'Conilon' : 'Arábica'} · {t.area_ha} ha)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[150px] h-11 rounded-xl">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda safra</SelectItem>
            <SelectItem value="month">Mês atual</SelectItem>
            <SelectItem value="quarter">Trimestre</SelectItem>
            <SelectItem value="semester">Semestre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-premium p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">Despesas</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalDespesas)}</p>
          {totalPlanejado > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Planejado: {formatCurrency(totalPlanejado)}
            </p>
          )}
        </div>

        <div className="card-premium p-4 border-success/30">
          <div className="flex items-center gap-2 text-success mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Receitas</span>
          </div>
          <p className="text-xl font-bold text-success">{formatCurrency(totalReceitas)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Saldo: <span className={totalReceitas - totalDespesas >= 0 ? 'text-success' : 'text-destructive'}>
              {formatCurrency(totalReceitas - totalDespesas)}
            </span>
          </p>
        </div>

        <div className="card-premium p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium">R$/Hectare</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(custoPorHectare)}</p>
          {totalArea > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{totalArea.toFixed(1)} ha</p>
          )}
        </div>

        <div className="card-premium p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Coffee className="w-4 h-4" />
            <span className="text-xs font-medium">Custo por Saca</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatCurrency(custoPorSaca)}</p>
          <p className="text-xs text-muted-foreground mt-1">Base produção</p>
        </div>
      </div>

      {/* Donut Chart with view toggle */}
      {(donutData.length > 0 || fornecedorDonut.length > 0) && (
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Distribuição de Custos</h3>
            <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('setor')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'setor' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Setor
              </button>
              <button
                onClick={() => setViewMode('fornecedor')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'fornecedor' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Fornecedor
              </button>
            </div>
          </div>

          {activeDonut.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeDonut}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {activeDonut.map((entry, index) => (
                        <Cell key={index} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {activeDonut.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground flex-1 truncate">{item.name}</span>
                    <span className="text-xs font-medium text-foreground">{item.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              {viewMode === 'fornecedor' ? 'Nenhum fornecedor registrado' : 'Nenhum lançamento'}
            </p>
          )}
        </div>
      )}

      {/* Monthly Receitas vs Despesas Chart */}
      {monthlyData.length > 0 && (
        <div className="card-premium p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">Receitas vs Despesas por Mês</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    color: 'hsl(var(--foreground))',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Receitas" fill="hsl(142, 70%, 45%)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Despesas" fill="hsl(0, 72%, 51%)" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {monthlyData.map((m, i) => (
              <div key={i} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${m.saldo >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                {m.mes}: {m.saldo >= 0 ? '+' : ''}{formatCurrency(m.saldo)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grouped Transactions Accordion */}
      <div className="card-premium p-5">
        {/* Tab header: ENTRADAS vs SAÍDAS */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1 bg-secondary rounded-lg p-0.5 flex-1">
            <button
              onClick={() => setTxTab('saidas')}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                txTab === 'saidas' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              💸 Saídas ({formatCurrency(totalDespesas)})
            </button>
            <button
              onClick={() => setTxTab('entradas')}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                txTab === 'entradas' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              ☕ Entradas ({formatCurrency(totalReceitas)})
            </button>
          </div>
        </div>

        {/* SAÍDAS tab */}
        {txTab === 'saidas' && (
          <>
            {/* Group by toggle */}
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => { setGroupBy('categoria'); setExpandedGroups(new Set()); }}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  groupBy === 'categoria' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                }`}
              >
                Por Categoria
              </button>
              <button
                onClick={() => { setGroupBy('fornecedor'); setExpandedGroups(new Set()); }}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  groupBy === 'fornecedor' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                }`}
              >
                Por Fornecedor
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : (
              <div className="space-y-1">
                {groupBy === 'categoria' ? (
                  categorySummary.length === 0 ? (
                    <EmptyState />
                  ) : (
                    categorySummary.map(cat => {
                      const txs = transactionsByCategory.get(cat.value) || [];
                      const isOpen = expandedGroups.has(cat.value);
                      return (
                        <div key={cat.value}>
                          <button
                            onClick={() => toggleGroup(cat.value)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                              <DollarSign className="w-4 h-4" style={{ color: cat.color }} />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-foreground">{cat.label}</p>
                              <p className="text-[11px] text-muted-foreground">{txs.length} lançamento{txs.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="text-right mr-1">
                              <p className="text-sm font-bold text-foreground">{formatCurrency(cat.total)}</p>
                              <p className="text-[11px] text-muted-foreground">{cat.percentage.toFixed(0)}%</p>
                            </div>
                            {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          {isOpen && (
                            <div className="ml-4 border-l-2 border-border pl-3 space-y-1 mb-2">
                              {txs.map(tx => (
                                <TransactionRow key={tx.id} tx={tx} talhoes={talhoes} onDelete={deleteTransaction} formatCurrency={formatCurrency} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )
                ) : (
                  fornecedorSummary.length === 0 ? (
                    <EmptyState />
                  ) : (
                    fornecedorSummary.map((forn, fi) => {
                      const txs = transactionsByFornecedor.get(forn.name) || [];
                      const isOpen = expandedGroups.has(forn.name);
                      return (
                        <div key={forn.name}>
                          <button
                            onClick={() => toggleGroup(forn.name)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
                              <span className="text-xs font-bold text-primary">{forn.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-foreground">{forn.name}</p>
                              <p className="text-[11px] text-muted-foreground">{txs.length} compra{txs.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="text-right mr-1">
                              <p className="text-sm font-bold text-foreground">{formatCurrency(forn.total)}</p>
                              <p className="text-[11px] text-muted-foreground">{forn.percentage.toFixed(0)}%</p>
                            </div>
                            {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          {isOpen && (
                            <div className="ml-4 border-l-2 border-border pl-3 space-y-1 mb-2">
                              {txs.map(tx => (
                                <TransactionRow key={tx.id} tx={tx} talhoes={talhoes} onDelete={deleteTransaction} formatCurrency={formatCurrency} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )
                )}
              </div>
            )}
          </>
        )}

        {/* ENTRADAS tab */}
        {txTab === 'entradas' && (
          <div className="space-y-2">
            {revenueTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Coffee className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground mb-1">Nenhuma receita registrada</p>
                <p className="text-xs text-muted-foreground">Use o botão + para registrar vendas de café</p>
              </div>
            ) : (
              revenueTransactions.map(tx => (
                <TransactionRow key={tx.id} tx={tx} talhoes={talhoes} onDelete={deleteTransaction} formatCurrency={formatCurrency} isRevenue />
              ))
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setEntryOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-7 h-7" />
      </button>

      <TransactionEntrySheet
        open={entryOpen}
        onOpenChange={setEntryOpen}
        onSave={addTransaction}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <DollarSign className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
      <p className="text-muted-foreground mb-1">Nenhum lançamento ainda</p>
      <p className="text-xs text-muted-foreground">Use o botão + para registrar seu primeiro gasto</p>
    </div>
  );
}

interface TransactionRowProps {
  tx: any;
  talhoes: any[];
  onDelete: (id: string) => void;
  formatCurrency: (v: number) => string;
  isRevenue?: boolean;
}

function TransactionRow({ tx, talhoes, onDelete, formatCurrency, isRevenue }: TransactionRowProps) {
  const talhao = talhoes.find((t: any) => t.id === tx.talhao_id);
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors ${isRevenue ? 'bg-success/5 border border-success/10' : 'bg-secondary/30'}`}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: isRevenue ? 'hsl(142, 70%, 45%, 0.15)' : getCategoryColor(tx.categoria) + '20' }}>
        {isRevenue ? (
          <Coffee className="w-4 h-4 text-success" />
        ) : (
          <DollarSign className="w-4 h-4" style={{ color: getCategoryColor(tx.categoria) }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-foreground truncate">{tx.descricao}</p>
          {(tx.metodo_entrada === 'voz' || tx.metodo_entrada === 'foto') && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-medium bg-success/20 text-success">
              <Sparkles className="w-2.5 h-2.5" />IA
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {format(new Date(tx.data), "dd MMM", { locale: ptBR })}
          {tx.fornecedor ? ` · ${tx.fornecedor}` : ''}
          {talhao ? ` · ${talhao.name}` : ''}
        </p>
      </div>
      <div className="text-right flex items-center gap-1.5">
        <p className={`text-xs font-bold ${isRevenue ? 'text-success' : 'text-foreground'}`}>
          {isRevenue ? '+' : ''}{formatCurrency(tx.valor_total)}
        </p>
        <button
          onClick={() => onDelete(tx.id)}
          className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
