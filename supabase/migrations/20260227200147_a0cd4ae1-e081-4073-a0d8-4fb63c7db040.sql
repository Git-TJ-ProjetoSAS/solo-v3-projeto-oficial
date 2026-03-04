
-- Add created_by column to insumos for ownership tracking
ALTER TABLE public.insumos ADD COLUMN created_by uuid DEFAULT NULL;

-- Drop old INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert insumos" ON public.insumos;

-- New INSERT policy: track creator
CREATE POLICY "Authenticated users can insert insumos"
ON public.insumos
FOR INSERT
TO authenticated
WITH CHECK (
  created_by IS NULL OR created_by = auth.uid()
);

-- Drop old UPDATE/DELETE policies
DROP POLICY IF EXISTS "Consultors can update insumos" ON public.insumos;
DROP POLICY IF EXISTS "Consultors can delete insumos" ON public.insumos;

-- New UPDATE policy: owner OR consultor
CREATE POLICY "Owner or consultor can update insumos"
ON public.insumos
FOR UPDATE
TO authenticated
USING (
  (created_by = auth.uid()) OR has_role(auth.uid(), 'consultor'::app_role)
);

-- New DELETE policy: owner OR consultor
CREATE POLICY "Owner or consultor can delete insumos"
ON public.insumos
FOR DELETE
TO authenticated
USING (
  (created_by = auth.uid()) OR has_role(auth.uid(), 'consultor'::app_role)
);
