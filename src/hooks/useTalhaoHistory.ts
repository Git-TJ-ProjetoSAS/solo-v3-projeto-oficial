import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CoffeeData } from '@/contexts/CoffeeContext';
import type { WizardDrenchData } from '@/contexts/WizardContext';

export interface TalhaoHistoryEntry {
  id: string;
  talhao_id: string;
  user_id: string;
  coffee_type: string;
  productivity_target: number;
  productivity_level: string;
  area_ha: number;
  cost_per_ha: number;
  cost_per_saca: number;
  liming_cost_per_ha: number;
  treatment_cost_per_ha: number;
  soil_data: Record<string, unknown> | null;
  productivity_data: Record<string, unknown> | null;
  insumos_data: unknown[];
  fertigation_data: Record<string, unknown> | null;
  spraying_data: Record<string, unknown> | null;
  drench_data: Record<string, unknown> | null;
  treatment_plan_data: Record<string, unknown> | null;
  liming_data: Record<string, unknown> | null;
  leaf_analysis_data: Record<string, unknown> | null;
  notes: string;
  created_at: string;
}

export function useTalhaoHistory(talhaoId?: string) {
  const [history, setHistory] = useState<TalhaoHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!talhaoId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('talhao_history' as any)
      .select('*')
      .eq('talhao_id', talhaoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setHistory((data || []) as unknown as TalhaoHistoryEntry[]);
    }
    setLoading(false);
  }, [talhaoId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const saveToHistory = async (
    talhaoId: string,
    coffeeData: CoffeeData,
  ): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Faça login para salvar o histórico');
      return false;
    }

    const hectares = coffeeData.productivity?.hectares || coffeeData.hectares || 0;
    const sacas = coffeeData.productivity?.sacasPerHectare || 0;
    const limingCost = coffeeData.limingData?.costPerHa || 0;
    const treatmentCost = coffeeData.treatmentPlan?.totalCostPerHa || 0;
    const totalPerHa = limingCost + treatmentCost;
    const costPerSaca = sacas > 0 ? totalPerHa / sacas : 0;

    const { error } = await supabase
      .from('talhao_history' as any)
      .insert({
        talhao_id: talhaoId,
        user_id: user.id,
        coffee_type: coffeeData.coffeeType || 'conilon',
        productivity_target: sacas,
        productivity_level: coffeeData.productivity?.level || 'baixa',
        area_ha: hectares,
        cost_per_ha: totalPerHa,
        cost_per_saca: costPerSaca,
        liming_cost_per_ha: limingCost,
        treatment_cost_per_ha: treatmentCost,
        soil_data: coffeeData.soil ? JSON.parse(JSON.stringify(coffeeData.soil)) : null,
        productivity_data: coffeeData.productivity ? JSON.parse(JSON.stringify(coffeeData.productivity)) : null,
        insumos_data: coffeeData.insumos.length > 0 ? JSON.parse(JSON.stringify(coffeeData.insumos)) : [],
        fertigation_data: coffeeData.fertigation ? JSON.parse(JSON.stringify(coffeeData.fertigation)) : null,
        spraying_data: coffeeData.coffeeSpraying ? JSON.parse(JSON.stringify(coffeeData.coffeeSpraying)) : null,
        treatment_plan_data: coffeeData.treatmentPlan ? JSON.parse(JSON.stringify(coffeeData.treatmentPlan)) : null,
        liming_data: coffeeData.limingData ? JSON.parse(JSON.stringify(coffeeData.limingData)) : null,
        leaf_analysis_data: coffeeData.leafAnalysis ? JSON.parse(JSON.stringify(coffeeData.leafAnalysis)) : null,
      } as any);

    if (error) {
      console.error('Error saving history:', error);
      toast.error('Erro ao salvar histórico');
      return false;
    }

    toast.success('Planejamento salvo no histórico do talhão!');

    // Also update the talhao's cost fields
    await supabase
      .from('talhoes')
      .update({
        cost_per_ha: totalPerHa,
        cost_per_saca: costPerSaca,
        productivity_target: sacas,
      } as any)
      .eq('id', talhaoId);

    await fetchHistory();
    return true;
  };

  const saveFoliarToHistory = async (
    targetTalhaoId: string,
    foliarData: {
      coffeeType?: string;
      hectares: number;
      sacas: number;
      leafAnalysis?: Record<string, unknown> | null;
      fertigation?: Record<string, unknown> | null;
      spraying?: Record<string, unknown> | null;
      drench?: WizardDrenchData | null;
      totalCostPerHa: number;
      costPerSaca: number;
    },
  ): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Faça login para salvar o histórico');
      return false;
    }

    const { error } = await supabase
      .from('talhao_history' as any)
      .insert({
        talhao_id: targetTalhaoId,
        user_id: user.id,
        coffee_type: foliarData.coffeeType || 'conilon',
        productivity_target: foliarData.sacas,
        productivity_level: 'foliar',
        area_ha: foliarData.hectares,
        cost_per_ha: foliarData.totalCostPerHa,
        cost_per_saca: foliarData.costPerSaca,
        liming_cost_per_ha: 0,
        treatment_cost_per_ha: 0,
        leaf_analysis_data: foliarData.leafAnalysis ? JSON.parse(JSON.stringify(foliarData.leafAnalysis)) : null,
        fertigation_data: foliarData.fertigation ? JSON.parse(JSON.stringify(foliarData.fertigation)) : null,
        spraying_data: foliarData.spraying ? JSON.parse(JSON.stringify(foliarData.spraying)) : null,
        drench_data: foliarData.drench ? JSON.parse(JSON.stringify(foliarData.drench)) : null,
        notes: 'Planejamento Foliar',
      } as any);

    if (error) {
      console.error('Error saving foliar history:', error);
      toast.error('Erro ao salvar histórico foliar');
      return false;
    }

    toast.success('Planejamento foliar salvo no histórico do talhão!');

    // Update talhao costs
    await supabase
      .from('talhoes')
      .update({
        cost_per_ha: foliarData.totalCostPerHa,
        cost_per_saca: foliarData.costPerSaca,
        productivity_target: foliarData.sacas,
      } as any)
      .eq('id', targetTalhaoId);

    await fetchHistory();
    return true;
  };

  const saveWizardToHistory = async (
    targetTalhaoId: string,
    wizardData: {
      spraying?: Record<string, unknown> | null;
      drench?: WizardDrenchData | null;
      hectares: number;
      totalCost: number;
      notes?: string;
    },
  ): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Faça login para salvar o histórico');
      return false;
    }

    const costPerHa = wizardData.hectares > 0 ? wizardData.totalCost / wizardData.hectares : 0;

    const { error } = await supabase
      .from('talhao_history' as any)
      .insert({
        talhao_id: targetTalhaoId,
        user_id: user.id,
        coffee_type: 'milho',
        productivity_target: 0,
        productivity_level: 'pulverizacao',
        area_ha: wizardData.hectares,
        cost_per_ha: costPerHa,
        cost_per_saca: 0,
        liming_cost_per_ha: 0,
        treatment_cost_per_ha: 0,
        spraying_data: wizardData.spraying ? JSON.parse(JSON.stringify(wizardData.spraying)) : null,
        drench_data: wizardData.drench ? JSON.parse(JSON.stringify(wizardData.drench)) : null,
        notes: wizardData.notes || 'Pulverização + Drench',
      } as any);

    if (error) {
      console.error('Error saving wizard history:', error);
      toast.error('Erro ao salvar histórico de pulverização');
      return false;
    }

    toast.success('Pulverização salva no histórico do talhão!');
    await fetchHistory();
    return true;
  };

  const deleteHistoryEntry = async (entryId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('talhao_history' as any)
      .delete()
      .eq('id', entryId);

    if (error) {
      console.error('Error deleting history:', error);
      toast.error('Erro ao excluir registro');
      return false;
    }

    toast.success('Registro excluído');
    await fetchHistory();
    return true;
  };

  return { history, loading, fetchHistory, saveToHistory, saveFoliarToHistory, saveWizardToHistory, deleteHistoryEntry };
}
