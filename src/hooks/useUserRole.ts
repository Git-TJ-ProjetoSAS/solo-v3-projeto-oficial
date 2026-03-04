import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'produtor' | 'consultor';

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!cancelled) {
        setRole((data?.role as AppRole) ?? 'produtor');
        setLoading(false);
      }
    };

    fetchRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchRole();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { role, loading, isConsultor: role === 'consultor', isProdutor: role === 'produtor' };
}
