
-- Add organic matter specific columns to insumos table
ALTER TABLE public.insumos ADD COLUMN acido_humico numeric NOT NULL DEFAULT 0;
ALTER TABLE public.insumos ADD COLUMN acido_fulvico numeric NOT NULL DEFAULT 0;
ALTER TABLE public.insumos ADD COLUMN materia_organica_perc numeric NOT NULL DEFAULT 0;
ALTER TABLE public.insumos ADD COLUMN aminoacidos numeric NOT NULL DEFAULT 0;
