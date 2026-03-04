import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WaterDeficitAlert {
  id: string;
  user_id: string;
  talhao_id: string;
  deficit_mm: number;
  threshold_mm: number;
  severity: 'warning' | 'critical';
  message: string;
  read: boolean;
  created_at: string;
}

export function useWaterAlerts() {
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['water-deficit-alerts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('water_deficit_alerts')
        .select('*')
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as unknown as WaterDeficitAlert[];
    },
    refetchInterval: 60_000, // check every minute
  });

  const markRead = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('water_deficit_alerts')
        .update({ read: true } as any)
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['water-deficit-alerts'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const ids = alerts.map(a => a.id);
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('water_deficit_alerts')
        .update({ read: true } as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['water-deficit-alerts'] }),
  });

  return {
    alerts,
    isLoading,
    unreadCount: alerts.length,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
  };
}
