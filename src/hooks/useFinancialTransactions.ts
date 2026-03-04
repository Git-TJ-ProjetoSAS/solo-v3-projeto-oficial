import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface FinancialTransaction {
  id: string;
  user_id: string;
  talhao_id: string | null;
  tipo: 'receita' | 'despesa';
  valor_unitario: number;
  quantidade: number;
  valor_total: number;
  data: string;
  descricao: string;
  categoria: string;
  status: 'planejado' | 'realizado';
  metodo_entrada: 'manual' | 'voz' | 'foto';
  insumo_id: string | null;
  safra: string | null;
  notas: string | null;
  fornecedor: string;
  created_at: string;
}

export interface SafraMeta {
  id: string;
  user_id: string;
  talhao_id: string | null;
  safra: string;
  expectativa_sacos: number;
  area_hectares: number;
  preco_saca_referencia: number;
}

// 7 Centros de Custo granulares + revisão manual
const CATEGORIES = [
  { value: 'adubos_corretivos', label: 'Adubos e Corretivos', color: 'hsl(142, 70%, 45%)' },
  { value: 'defensivos_agricolas', label: 'Defensivos Agrícolas', color: 'hsl(0, 72%, 51%)' },
  { value: 'combustivel_lubrificantes', label: 'Combustível e Lubrificantes', color: 'hsl(30, 80%, 50%)' },
  { value: 'manutencao_maquinario', label: 'Manutenção de Maquinário', color: 'hsl(270, 60%, 50%)' },
  { value: 'energia_eletrica', label: 'Energia Elétrica', color: 'hsl(50, 85%, 50%)' },
  { value: 'mao_de_obra_servicos', label: 'Mão de Obra e Serviços', color: 'hsl(204, 85%, 51%)' },
  { value: 'outros_administrativos', label: 'Outros Custos Administrativos', color: 'hsl(38, 92%, 50%)' },
  { value: 'revisao_manual', label: 'Revisão Manual', color: 'hsl(45, 80%, 50%)' },
];

// Revenue categories
const REVENUE_CATEGORIES = [
  { value: 'venda_cafe', label: 'Venda de Café', color: 'hsl(142, 70%, 45%)' },
  { value: 'venda_subproduto', label: 'Subprodutos', color: 'hsl(38, 92%, 50%)' },
  { value: 'outras_receitas', label: 'Outras Receitas', color: 'hsl(204, 85%, 51%)' },
];

// Coffee product classifications by type
export const COFFEE_PRODUCTS_CONILON = [
  { value: 'conilon_cereja', label: 'Café Conilon Cereja' },
  { value: 'conilon_boia', label: 'Café Conilon Boia' },
  { value: 'conilon_natural', label: 'Café Conilon Natural' },
  { value: 'conilon_lavado', label: 'Café Conilon Lavado' },
  { value: 'conilon_tipo6', label: 'Café Conilon Tipo 6' },
  { value: 'conilon_tipo7', label: 'Café Conilon Tipo 7' },
  { value: 'conilon_tipo8', label: 'Café Conilon Tipo 8' },
  { value: 'palha_melosa', label: 'Palha Melosa' },
  { value: 'palha', label: 'Palha' },
  { value: 'varredura', label: 'Varredura' },
];

export const COFFEE_PRODUCTS_ARABICA = [
  { value: 'arabica_cereja_descascado', label: 'Café Arábica Cereja Descascado' },
  { value: 'arabica_natural', label: 'Café Arábica Natural' },
  { value: 'arabica_desmucilado', label: 'Café Arábica Desmucilado' },
  { value: 'arabica_especial', label: 'Café Arábica Especial (80+)' },
  { value: 'arabica_fino', label: 'Café Arábica Fino' },
  { value: 'arabica_comercial', label: 'Café Arábica Comercial' },
  { value: 'palha_melosa', label: 'Palha Melosa' },
  { value: 'palha', label: 'Palha' },
  { value: 'varredura', label: 'Varredura' },
  { value: 'escolha', label: 'Escolha' },
];

// Legacy mapping for old categories
const LEGACY_MAP: Record<string, string> = {
  'fertilizantes': 'adubos_corretivos',
  'fertilizantes_corretivos': 'adubos_corretivos',
  'defensivos': 'defensivos_agricolas',
  'sementes': 'adubos_corretivos',
  'mao_de_obra': 'mao_de_obra_servicos',
  'colheita': 'mao_de_obra_servicos',
  'combustivel': 'combustivel_lubrificantes',
  'manutencao': 'manutencao_maquinario',
  'operacao_maquinario': 'manutencao_maquinario',
  'irrigacao': 'energia_eletrica',
  'custos_administrativos': 'outros_administrativos',
  'outros': 'revisao_manual',
  'adubacao_plantio': 'adubos_corretivos',
  'adubacao_cobertura': 'adubos_corretivos',
  'adubacao_foliar': 'adubos_corretivos',
  'calagem': 'adubos_corretivos',
  'defensivos_fungicidas': 'defensivos_agricolas',
  'defensivos_inseticidas': 'defensivos_agricolas',
  'defensivos_herbicidas': 'defensivos_agricolas',
  'operacoes_mecanizadas': 'manutencao_maquinario',
  'mao_de_obra_colheita': 'mao_de_obra_servicos',
  'mao_de_obra_manejo': 'mao_de_obra_servicos',
};

const normalizeCat = (cat: string) => LEGACY_MAP[cat] || cat;

export const getCategoryLabel = (value: string) => {
  const norm = normalizeCat(value);
  const allCats = [...CATEGORIES, ...REVENUE_CATEGORIES];
  return allCats.find(c => c.value === norm)?.label || value;
};
export const getCategoryColor = (value: string) => {
  const norm = normalizeCat(value);
  const allCats = [...CATEGORIES, ...REVENUE_CATEGORIES];
  return allCats.find(c => c.value === norm)?.color || 'hsl(0,0%,55%)';
};
export const CATEGORY_OPTIONS = CATEGORIES;
export const REVENUE_CATEGORY_OPTIONS = REVENUE_CATEGORIES;

export function useFinancialTransactions(safra?: string, talhaoFilter?: string | null, dateRange?: { start: string; end: string } | null) {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [safraMetas, setSafraMetas] = useState<SafraMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const currentSafra = safra || '2025/2026';

  const fetchTransactions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('transacoes_financeiras')
      .select('*')
      .eq('safra', currentSafra)
      .order('data', { ascending: false });

    if (talhaoFilter) {
      query = query.eq('talhao_id', talhaoFilter);
    }

    if (dateRange) {
      query = query.gte('data', dateRange.start).lte('data', dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }
    setTransactions((data as any[]) || []);
  }, [currentSafra, talhaoFilter, dateRange?.start, dateRange?.end]);

  const fetchSafraMetas = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('safra_metas')
      .select('*')
      .eq('safra', currentSafra);

    if (talhaoFilter) {
      query = query.eq('talhao_id', talhaoFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching safra metas:', error);
      return;
    }
    setSafraMetas((data as any[]) || []);
  }, [currentSafra, talhaoFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTransactions(), fetchSafraMetas()]).finally(() => setLoading(false));
  }, [fetchTransactions, fetchSafraMetas]);

  const addTransaction = async (tx: Omit<FinancialTransaction, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('transacoes_financeiras').insert({
      ...tx,
      user_id: user.id,
      safra: tx.safra || currentSafra,
    } as any);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '✅ Lançamento salvo!' });
    fetchTransactions();
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transacoes_financeiras').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Computed values
  const totalDespesas = transactions
    .filter(t => t.tipo === 'despesa' && t.status === 'realizado')
    .reduce((sum, t) => sum + t.valor_total, 0);

  const totalReceitas = transactions
    .filter(t => t.tipo === 'receita' && t.status === 'realizado')
    .reduce((sum, t) => sum + t.valor_total, 0);

  const totalPlanejado = transactions
    .filter(t => t.tipo === 'despesa' && t.status === 'planejado')
    .reduce((sum, t) => sum + t.valor_total, 0);

  const totalArea = safraMetas.reduce((sum, m) => sum + m.area_hectares, 0);
  const totalSacos = safraMetas.reduce((sum, m) => sum + m.expectativa_sacos, 0);

  const custoPorHectare = totalArea > 0 ? totalDespesas / totalArea : 0;
  const custoPorSaca = totalSacos > 0 ? totalDespesas / totalSacos : 0;

  const categorySummary = CATEGORIES.map(cat => {
    const total = transactions
      .filter(t => normalizeCat(t.categoria) === cat.value && t.tipo === 'despesa' && t.status === 'realizado')
      .reduce((sum, t) => sum + t.valor_total, 0);
    return { ...cat, total, percentage: totalDespesas > 0 ? (total / totalDespesas) * 100 : 0 };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  // Revenue summary by product
  const revenueSummary = (() => {
    const map = new Map<string, number>();
    transactions
      .filter(t => t.tipo === 'receita' && t.status === 'realizado')
      .forEach(t => map.set(t.descricao, (map.get(t.descricao) || 0) + t.valor_total));
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total, percentage: totalReceitas > 0 ? (total / totalReceitas) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  })();

  // Fornecedor summary
  const fornecedorSummary = (() => {
    const map = new Map<string, number>();
    transactions
      .filter(t => t.tipo === 'despesa' && t.status === 'realizado' && t.fornecedor)
      .forEach(t => map.set(t.fornecedor, (map.get(t.fornecedor) || 0) + t.valor_total));
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total, percentage: totalDespesas > 0 ? (total / totalDespesas) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  })();

  // Grouped transactions by category
  const transactionsByCategory = (() => {
    const map = new Map<string, FinancialTransaction[]>();
    transactions
      .filter(t => t.tipo === 'despesa' && t.status === 'realizado')
      .forEach(t => {
        const cat = normalizeCat(t.categoria);
        const list = map.get(cat) || [];
        list.push(t);
        map.set(cat, list);
      });
    return map;
  })();

  // Grouped transactions by fornecedor
  const transactionsByFornecedor = (() => {
    const map = new Map<string, FinancialTransaction[]>();
    transactions
      .filter(t => t.tipo === 'despesa' && t.status === 'realizado')
      .forEach(t => {
        const key = t.fornecedor || 'Sem fornecedor';
        const list = map.get(key) || [];
        list.push(t);
        map.set(key, list);
      });
    return map;
  })();

  // Revenue transactions
  const revenueTransactions = transactions
    .filter(t => t.tipo === 'receita' && t.status === 'realizado');

  return {
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
    revenueSummary,
    fornecedorSummary,
    transactionsByCategory,
    transactionsByFornecedor,
    revenueTransactions,
    refetch: fetchTransactions,
  };
}
