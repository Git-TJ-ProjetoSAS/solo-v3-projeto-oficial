
-- Drop existing insert policy
DROP POLICY IF EXISTS "Consultors can insert insumos" ON public.insumos;

-- Recreate allowing all authenticated users to insert
CREATE POLICY "Authenticated users can insert insumos"
  ON public.insumos FOR INSERT
  WITH CHECK (true);
