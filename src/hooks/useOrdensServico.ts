import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type OrdemServico = Tables<'ordens_servico'>;
export type ReceitaTanque = Tables<'os_receita_tanque'>;

export interface OSWithReceitas extends OrdemServico {
  receitas: ReceitaTanque[];
  talhao_name?: string;
  janela_name?: string;
}

export interface ReceitaInput {
  insumo_nome: string;
  insumo_id?: string | null;
  dose_hectare: number;
  unidade?: string;
  ordem_mistura?: number;
  notas?: string | null;
}

export function useOrdensServico() {
  const [ordens, setOrdens] = useState<OSWithReceitas[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrdens = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: osData, error: osError } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (osError) {
      console.error('Error fetching OS:', osError);
      toast.error('Erro ao carregar ordens de serviço');
      setLoading(false);
      return;
    }

    if (!osData || osData.length === 0) {
      setOrdens([]);
      setLoading(false);
      return;
    }

    // Fetch receitas for all OS
    const osIds = osData.map(o => o.id);
    const { data: receitas } = await supabase
      .from('os_receita_tanque')
      .select('*')
      .in('os_id', osIds)
      .order('ordem_mistura', { ascending: true });

    // Fetch talhão names
    const talhaoIds = [...new Set(osData.map(o => o.talhao_id))];
    const { data: talhoes } = await supabase
      .from('talhoes')
      .select('id, name')
      .in('id', talhaoIds);

    // Fetch janela names
    const janelaIds = [...new Set(osData.filter(o => o.janela_id).map(o => o.janela_id!))];
    let janelas: any[] = [];
    if (janelaIds.length > 0) {
      const { data } = await supabase
        .from('janelas_fenologicas')
        .select('id, nome_fase')
        .in('id', janelaIds);
      janelas = data || [];
    }

    const talhaoMap = new Map((talhoes || []).map(t => [t.id, t.name]));
    const janelaMap = new Map(janelas.map((j: any) => [j.id, j.nome_fase]));
    const receitaMap = new Map<string, ReceitaTanque[]>();
    for (const r of (receitas || [])) {
      const list = receitaMap.get(r.os_id) || [];
      list.push(r);
      receitaMap.set(r.os_id, list);
    }

    const merged: OSWithReceitas[] = osData.map(os => ({
      ...os,
      receitas: receitaMap.get(os.id) || [],
      talhao_name: talhaoMap.get(os.talhao_id) || 'Desconhecido',
      janela_name: os.janela_id ? janelaMap.get(os.janela_id) || '' : '',
    }));

    setOrdens(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrdens(); }, [fetchOrdens]);

  const createOS = async (
    input: {
      talhao_id: string;
      janela_id?: string | null;
      tipo_operacao: 'solo' | 'foliar_casada' | 'correcao';
      volume_calda_hectare: number;
      area_aplicacao_ha: number;
      data_prevista?: string | null;
      notas?: string | null;
    },
    receitas: ReceitaInput[]
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Faça login para continuar'); return null; }

    const { data: os, error } = await supabase
      .from('ordens_servico')
      .insert({
        ...input,
        user_id: user.id,
        status: 'bloqueada_clima',
      } as any)
      .select()
      .single();

    if (error || !os) {
      console.error('Error creating OS:', error);
      toast.error('Erro ao criar ordem de serviço');
      return null;
    }

    // Insert receitas
    if (receitas.length > 0) {
      const receitaRows = receitas.map((r, i) => ({
        os_id: os.id,
        insumo_nome: r.insumo_nome,
        insumo_id: r.insumo_id || null,
        dose_hectare: r.dose_hectare,
        unidade: r.unidade || 'L/ha',
        ordem_mistura: r.ordem_mistura || i + 1,
        notas: r.notas || null,
      }));

      const { error: rError } = await supabase
        .from('os_receita_tanque')
        .insert(receitaRows as any);

      if (rError) {
        console.error('Error creating receitas:', rError);
        toast.error('OS criada, mas erro ao salvar receita do tanque');
      }
    }

    toast.success('Ordem de serviço criada!');
    await fetchOrdens();
    return os;
  };

  const transitionStatus = async (
    osId: string,
    newStatus: 'em_execucao' | 'concluida' | 'cancelada',
    checklist?: Record<string, boolean>
  ) => {
    const { error } = await supabase.rpc('transition_os_status', {
      _os_id: osId,
      _new_status: newStatus,
      _checklist: checklist ? checklist : undefined,
    } as any);

    if (error) {
      console.error('Error transitioning OS:', error);
      toast.error(error.message || 'Erro ao atualizar status');
      return false;
    }

    const statusLabels: Record<string, string> = {
      em_execucao: 'Execução iniciada!',
      concluida: 'OS concluída!',
      cancelada: 'OS cancelada',
    };
    toast.success(statusLabels[newStatus] || 'Status atualizado!');
    await fetchOrdens();
    return true;
  };

  const deleteOS = async (osId: string) => {
    // Delete receitas first
    await supabase.from('os_receita_tanque').delete().eq('os_id', osId);
    const { error } = await supabase.from('ordens_servico').delete().eq('id', osId);
    if (error) {
      console.error('Error deleting OS:', error);
      toast.error('Erro ao excluir ordem de serviço');
      return false;
    }
    toast.success('Ordem de serviço excluída');
    await fetchOrdens();
    return true;
  };

  return { ordens, loading, fetchOrdens, createOS, transitionStatus, deleteOS };
}
