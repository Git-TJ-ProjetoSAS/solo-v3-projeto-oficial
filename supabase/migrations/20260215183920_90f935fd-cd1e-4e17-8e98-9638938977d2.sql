
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view insumos" ON public.insumos;
DROP POLICY IF EXISTS "Consultors can delete insumos" ON public.insumos;
DROP POLICY IF EXISTS "Consultors can insert insumos" ON public.insumos;
DROP POLICY IF EXISTS "Consultors can update insumos" ON public.insumos;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Authenticated users can view insumos"
  ON public.insumos FOR SELECT
  USING (true);

CREATE POLICY "Consultors can insert insumos"
  ON public.insumos FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Consultors can update insumos"
  ON public.insumos FOR UPDATE
  USING (has_role(auth.uid(), 'consultor'::app_role));

CREATE POLICY "Consultors can delete insumos"
  ON public.insumos FOR DELETE
  USING (has_role(auth.uid(), 'consultor'::app_role));
