
-- Drop existing overly permissive policies on insumos
DROP POLICY IF EXISTS "Insumos são visíveis para todos" ON public.insumos;
DROP POLICY IF EXISTS "Permitir inserção de insumos" ON public.insumos;
DROP POLICY IF EXISTS "Permitir atualização de insumos" ON public.insumos;
DROP POLICY IF EXISTS "Permitir exclusão de insumos" ON public.insumos;

-- Authenticated users can read insumos
CREATE POLICY "Authenticated users can view insumos"
ON public.insumos FOR SELECT TO authenticated USING (true);

-- Only consultors can insert insumos
CREATE POLICY "Consultors can insert insumos"
ON public.insumos FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'consultor'));

-- Only consultors can update insumos
CREATE POLICY "Consultors can update insumos"
ON public.insumos FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'consultor'));

-- Only consultors can delete insumos
CREATE POLICY "Consultors can delete insumos"
ON public.insumos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'consultor'));
