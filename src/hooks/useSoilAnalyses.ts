import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { estimarTextura, type SoilTexture, type TexturaFonte } from '@/types/farm';

export interface DbSoilAnalysis {
  id: string;
  user_id: string;
  talhao_id: string | null;
  ca: number;
  mg: number;
  k: number;
  h_al: number;
  p: number;
  mo: number;
  zn: number;
  b: number;
  mn: number;
  fe: number;
  cu: number;
  s: number;
  v_percent: number;
  textura: SoilTexture;
  textura_fonte: TexturaFonte;
  argila: number | null;
  silte: number | null;
  areia: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type SoilAnalysisInsert = Omit<DbSoilAnalysis, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export function useSoilAnalyses(talhaoId?: string) {
  const [analyses, setAnalyses] = useState<DbSoilAnalysis[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let query = supabase
      .from('soil_analyses' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (talhaoId) {
      query = query.eq('talhao_id', talhaoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching soil analyses:', error);
    } else {
      setAnalyses((data || []) as unknown as DbSoilAnalysis[]);
    }
    setLoading(false);
  }, [talhaoId]);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const createAnalysis = async (input: SoilAnalysisInsert): Promise<DbSoilAnalysis | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Faça login para continuar'); return null; }

    // Auto-estimate texture if source is 'estimada'
    const textura = input.textura_fonte === 'estimada'
      ? estimarTextura(input.mo)
      : input.textura;

    const { data, error } = await supabase
      .from('soil_analyses' as any)
      .insert({
        ...input,
        textura,
        user_id: user.id,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating soil analysis:', error);
      toast.error('Erro ao salvar análise de solo');
      return null;
    }

    toast.success('Análise de solo salva!');
    await fetchAnalyses();
    return data as unknown as DbSoilAnalysis;
  };

  const updateAnalysis = async (id: string, updates: Partial<SoilAnalysisInsert>): Promise<boolean> => {
    const textura = updates.textura_fonte === 'estimada' && updates.mo !== undefined
      ? estimarTextura(updates.mo)
      : updates.textura;

    const { error } = await supabase
      .from('soil_analyses' as any)
      .update({ ...updates, textura } as any)
      .eq('id', id);

    if (error) {
      console.error('Error updating soil analysis:', error);
      toast.error('Erro ao atualizar análise');
      return false;
    }

    toast.success('Análise atualizada!');
    await fetchAnalyses();
    return true;
  };

  const deleteAnalysis = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('soil_analyses' as any)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting soil analysis:', error);
      toast.error('Erro ao excluir análise');
      return false;
    }

    toast.success('Análise excluída!');
    await fetchAnalyses();
    return true;
  };

  return { analyses, loading, fetchAnalyses, createAnalysis, updateAnalysis, deleteAnalysis };
}
