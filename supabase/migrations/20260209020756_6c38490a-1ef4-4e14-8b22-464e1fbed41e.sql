
-- Tabela para histórico de planejamentos por talhão
CREATE TABLE public.talhao_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  talhao_id UUID NOT NULL REFERENCES public.talhoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Snapshot key metrics
  coffee_type TEXT NOT NULL DEFAULT 'conilon',
  productivity_target NUMERIC NOT NULL DEFAULT 0,
  productivity_level TEXT NOT NULL DEFAULT 'baixa',
  area_ha NUMERIC NOT NULL DEFAULT 0,
  
  -- Costs summary
  cost_per_ha NUMERIC NOT NULL DEFAULT 0,
  cost_per_saca NUMERIC NOT NULL DEFAULT 0,
  liming_cost_per_ha NUMERIC NOT NULL DEFAULT 0,
  treatment_cost_per_ha NUMERIC NOT NULL DEFAULT 0,
  
  -- Full data snapshots (JSONB)
  soil_data JSONB DEFAULT NULL,
  productivity_data JSONB DEFAULT NULL,
  insumos_data JSONB DEFAULT '[]'::jsonb,
  fertigation_data JSONB DEFAULT NULL,
  spraying_data JSONB DEFAULT NULL,
  treatment_plan_data JSONB DEFAULT NULL,
  liming_data JSONB DEFAULT NULL,
  leaf_analysis_data JSONB DEFAULT NULL,
  
  -- Metadata
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.talhao_history ENABLE ROW LEVEL SECURITY;

-- Policies: only own data
CREATE POLICY "Users can view their own history"
ON public.talhao_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own history"
ON public.talhao_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own history"
ON public.talhao_history FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookup by talhao
CREATE INDEX idx_talhao_history_talhao_id ON public.talhao_history(talhao_id);
CREATE INDEX idx_talhao_history_user_id ON public.talhao_history(user_id);
