import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Talhao {
  id: string;
  user_id: string;
  name: string;
  area_ha: number;
  row_spacing_cm: number;
  plant_spacing_cm: number;
  variety: string;
  coffee_type: 'conilon' | 'arabica';
  total_plants: number;
  productivity_target: number;
  cost_per_ha: number;
  cost_per_saca: number;
  fertilization_data: Record<string, unknown>;
  pest_history: unknown[];
  irrigated: boolean;
  irrigation_system: 'gotejamento' | 'aspersao' | 'pivo';
  notes: string;
  geojson: any | null;
  center_lat: number | null;
  center_lng: number | null;
  planting_month: number;
  planting_year: number;
  agro_polygon_id: string | null;
  drip_flow_rate_lh: number;
  drip_spacing_m: number;
  is_autocompensating: boolean;
  created_at: string;
  updated_at: string;
}

export type TalhaoInsert = Omit<Talhao, 'id' | 'created_at' | 'updated_at' | 'agro_polygon_id' | 'drip_flow_rate_lh' | 'drip_spacing_m' | 'is_autocompensating'> & {
  drip_flow_rate_lh?: number;
  drip_spacing_m?: number;
  is_autocompensating?: boolean;
};

/** Calculate total plants from area and spacing */
export function calcTotalPlants(areaHa: number, rowSpacingCm: number, plantSpacingCm: number): number {
  if (rowSpacingCm <= 0 || plantSpacingCm <= 0 || areaHa <= 0) return 0;
  const rowSpacingM = rowSpacingCm / 100;
  const plantSpacingM = plantSpacingCm / 100;
  // plants per hectare = 10000 / (row × plant)
  const plantsPerHa = 10000 / (rowSpacingM * plantSpacingM);
  return Math.round(plantsPerHa * areaHa);
}

export function useTalhoes() {
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTalhoes = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('talhoes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching talhoes:', error);
      toast.error('Erro ao carregar talhões');
    } else {
      setTalhoes((data || []) as unknown as Talhao[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTalhoes(); }, [fetchTalhoes]);

  /** Bulk-geocode talhões missing coordinates using a given address */
  const geocodeMissingCoords = async (address: string) => {
    const missing = talhoes.filter(t => t.center_lat === null || t.center_lng === null);
    if (missing.length === 0 || !address || address.trim().length < 3) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=br`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const data = await res.json();
      if (!data || data.length === 0) return;

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      for (const t of missing) {
        await supabase.from('talhoes').update({ center_lat: lat, center_lng: lng } as never).eq('id', t.id);
      }
      toast.success(`📍 Coordenadas atualizadas em ${missing.length} talhão(ões)`);
      await fetchTalhoes();
    } catch (e) {
      console.error('Geocode error:', e);
    }
  };

  const createTalhao = async (input: Omit<TalhaoInsert, 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Faça login para continuar'); return null; }

    const totalPlants = calcTotalPlants(input.area_ha, input.row_spacing_cm, input.plant_spacing_cm);

    const { data, error } = await supabase
      .from('talhoes')
      .insert({
        ...input,
        user_id: user.id,
        total_plants: totalPlants,
      } as never)
      .select()
      .single();

    if (error) {
      console.error('Error creating talhao:', error);
      toast.error('Erro ao cadastrar talhão');
      return null;
    }

    toast.success('Talhão cadastrado!');
    await fetchTalhoes();
    return data as unknown as Talhao;
  };

  const updateTalhao = async (id: string, updates: Partial<TalhaoInsert>) => {
    // Recalculate plants if spacing changed
    const existing = talhoes.find(t => t.id === id);
    const area = updates.area_ha ?? existing?.area_ha ?? 1;
    const rowSp = updates.row_spacing_cm ?? existing?.row_spacing_cm ?? 350;
    const plantSp = updates.plant_spacing_cm ?? existing?.plant_spacing_cm ?? 70;
    const totalPlants = calcTotalPlants(area, rowSp, plantSp);

    const { error } = await supabase
      .from('talhoes')
      .update({ ...updates, total_plants: totalPlants } as never)
      .eq('id', id);

    if (error) {
      console.error('Error updating talhao:', error);
      toast.error('Erro ao atualizar talhão');
      return false;
    }

    toast.success('Talhão atualizado!');
    await fetchTalhoes();
    return true;
  };

  const deleteTalhao = async (id: string) => {
    const { error } = await supabase
      .from('talhoes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting talhao:', error);
      toast.error('Erro ao excluir talhão');
      return false;
    }

    toast.success('Talhão excluído!');
    await fetchTalhoes();
    return true;
  };

  return { talhoes, loading, fetchTalhoes, createTalhao, updateTalhao, deleteTalhao, geocodeMissingCoords };
}
