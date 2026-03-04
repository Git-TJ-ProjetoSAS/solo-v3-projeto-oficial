import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScoutingNote {
  id: string;
  user_id: string;
  talhao_id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
}

interface CreateNoteInput {
  talhao_id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
}

export function useScoutingNotes(talhaoIds: string[]) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['scouting_notes', talhaoIds],
    queryFn: async () => {
      if (talhaoIds.length === 0) return [];
      const { data, error } = await supabase
        .from('scouting_notes')
        .select('*')
        .in('talhao_id', talhaoIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ScoutingNote[];
    },
    enabled: talhaoIds.length > 0,
  });

  const createNote = useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('scouting_notes')
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting_notes'] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scouting_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scouting_notes'] });
    },
  });

  return {
    notes: query.data ?? [],
    isLoading: query.isLoading,
    createNote,
    deleteNote,
  };
}
