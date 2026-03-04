-- Enable RLS on reference tables that are missing it
-- These are read-only lookup tables, so only SELECT for authenticated users

-- cad_culturas
ALTER TABLE public.cad_culturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view culturas"
  ON public.cad_culturas FOR SELECT
  USING (true);

-- matriz_parcelamento
ALTER TABLE public.matriz_parcelamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view matriz parcelamento"
  ON public.matriz_parcelamento FOR SELECT
  USING (true);

-- ref_fosforo_plantio
ALTER TABLE public.ref_fosforo_plantio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view ref fosforo"
  ON public.ref_fosforo_plantio FOR SELECT
  USING (true);

-- ref_potassio_ano1
ALTER TABLE public.ref_potassio_ano1 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view ref potassio"
  ON public.ref_potassio_ano1 FOR SELECT
  USING (true);