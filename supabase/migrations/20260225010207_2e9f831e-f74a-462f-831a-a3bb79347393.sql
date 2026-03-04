
-- Add drench_data JSONB column to talhao_history
ALTER TABLE public.talhao_history
ADD COLUMN drench_data jsonb DEFAULT NULL;
