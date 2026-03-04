
-- Tabela de análises de solo vinculadas a talhões
CREATE TABLE public.soil_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  talhao_id UUID REFERENCES public.talhoes(id) ON DELETE CASCADE,
  -- Macronutrientes
  ca NUMERIC NOT NULL DEFAULT 0,
  mg NUMERIC NOT NULL DEFAULT 0,
  k NUMERIC NOT NULL DEFAULT 0,
  h_al NUMERIC NOT NULL DEFAULT 0,
  p NUMERIC NOT NULL DEFAULT 0,
  mo NUMERIC NOT NULL DEFAULT 0,
  -- Micronutrientes
  zn NUMERIC NOT NULL DEFAULT 0,
  b NUMERIC NOT NULL DEFAULT 0,
  mn NUMERIC NOT NULL DEFAULT 0,
  fe NUMERIC NOT NULL DEFAULT 0,
  cu NUMERIC NOT NULL DEFAULT 0,
  s NUMERIC NOT NULL DEFAULT 0,
  -- Calculados / Derivados
  v_percent NUMERIC NOT NULL DEFAULT 0,
  textura TEXT NOT NULL DEFAULT 'media', -- 'arenosa', 'media', 'argilosa'
  textura_fonte TEXT NOT NULL DEFAULT 'estimada', -- 'estimada' (via MO) ou 'informada' (pelo laudo)
  -- Dados extras do laudo
  argila NUMERIC, -- % argila se informado pelo laudo
  silte NUMERIC,  -- % silte se informado
  areia NUMERIC,  -- % areia se informado
  -- Metadados
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.soil_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own soil analyses"
  ON public.soil_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own soil analyses"
  ON public.soil_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own soil analyses"
  ON public.soil_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own soil analyses"
  ON public.soil_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger de updated_at
CREATE TRIGGER update_soil_analyses_updated_at
  BEFORE UPDATE ON public.soil_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
