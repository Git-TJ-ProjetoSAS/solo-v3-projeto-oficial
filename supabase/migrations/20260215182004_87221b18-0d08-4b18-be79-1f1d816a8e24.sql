
ALTER TABLE public.insumos
  ADD COLUMN solubilidade numeric NOT NULL DEFAULT 0,
  ADD COLUMN indice_salino numeric NOT NULL DEFAULT 0,
  ADD COLUMN micro_mg numeric NOT NULL DEFAULT 0;
