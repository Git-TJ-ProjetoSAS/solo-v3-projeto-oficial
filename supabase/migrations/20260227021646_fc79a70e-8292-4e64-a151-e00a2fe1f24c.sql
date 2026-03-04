
-- Tabela de notas de scouting geolocalizadas
CREATE TABLE public.scouting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  talhao_id uuid NOT NULL REFERENCES public.talhoes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.scouting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scouting notes" ON public.scouting_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scouting notes" ON public.scouting_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scouting notes" ON public.scouting_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scouting notes" ON public.scouting_notes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_scouting_notes_updated_at
  BEFORE UPDATE ON public.scouting_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campo de status operacional nos talhões
ALTER TABLE public.talhoes ADD COLUMN operation_status text NOT NULL DEFAULT 'producao';
