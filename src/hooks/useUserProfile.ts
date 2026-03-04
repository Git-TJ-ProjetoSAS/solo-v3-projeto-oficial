import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  crea_art: string | null;
  telefone: string | null;
  endereco_propriedade: string | null;
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          setProfile({
            id: user.id,
            full_name: profileData?.full_name || null,
            avatar_url: profileData?.avatar_url || null,
            email: user.email || null,
            crea_art: (profileData as any)?.crea_art || null,
            telefone: (profileData as any)?.telefone || null,
            endereco_propriedade: (profileData as any)?.endereco_propriedade || null,
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { profile, loading, signOut };
}
