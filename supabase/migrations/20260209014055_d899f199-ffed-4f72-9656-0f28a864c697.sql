
-- Create talhoes table for plot/field management
CREATE TABLE public.talhoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  area_ha NUMERIC NOT NULL DEFAULT 1,
  row_spacing_cm NUMERIC NOT NULL DEFAULT 350,
  plant_spacing_cm NUMERIC NOT NULL DEFAULT 70,
  variety TEXT NOT NULL DEFAULT '',
  coffee_type TEXT NOT NULL DEFAULT 'conilon',
  total_plants INTEGER NOT NULL DEFAULT 0,
  productivity_target NUMERIC NOT NULL DEFAULT 0,
  cost_per_ha NUMERIC NOT NULL DEFAULT 0,
  cost_per_saca NUMERIC NOT NULL DEFAULT 0,
  fertilization_data JSONB DEFAULT '{}'::jsonb,
  pest_history JSONB DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.talhoes ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own talhoes
CREATE POLICY "Users can view their own talhoes"
ON public.talhoes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own talhoes"
ON public.talhoes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own talhoes"
ON public.talhoes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own talhoes"
ON public.talhoes FOR DELETE
USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE TRIGGER update_talhoes_updated_at
BEFORE UPDATE ON public.talhoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for user lookups
CREATE INDEX idx_talhoes_user_id ON public.talhoes(user_id);
