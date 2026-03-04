
-- Add new column culturas as text array
ALTER TABLE public.insumos ADD COLUMN culturas text[] DEFAULT '{}';

-- Migrate existing data from cultura to culturas
UPDATE public.insumos SET culturas = ARRAY[cultura] WHERE cultura IS NOT NULL AND cultura != '';

-- Drop old column
ALTER TABLE public.insumos DROP COLUMN cultura;
