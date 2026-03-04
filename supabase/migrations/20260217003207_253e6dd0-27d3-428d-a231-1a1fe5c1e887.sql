
-- Add user_id column as nullable first
ALTER TABLE public.tractor_operations_config ADD COLUMN user_id UUID;
ALTER TABLE public.production_costs_config ADD COLUMN user_id UUID;
ALTER TABLE public.labor_config ADD COLUMN user_id UUID;

-- Backfill existing rows with the existing user
UPDATE public.tractor_operations_config SET user_id = '82d195be-0a25-4973-b1f2-d461fcfde57f' WHERE user_id IS NULL;
UPDATE public.production_costs_config SET user_id = '82d195be-0a25-4973-b1f2-d461fcfde57f' WHERE user_id IS NULL;
UPDATE public.labor_config SET user_id = '82d195be-0a25-4973-b1f2-d461fcfde57f' WHERE user_id IS NULL;

-- Set NOT NULL constraint
ALTER TABLE public.tractor_operations_config ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.production_costs_config ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.labor_config ALTER COLUMN user_id SET NOT NULL;

-- Drop old permissive policies on tractor_operations_config
DROP POLICY IF EXISTS "Permitir leitura de configurações de trator" ON public.tractor_operations_config;
DROP POLICY IF EXISTS "Permitir inserção de configurações de trator" ON public.tractor_operations_config;
DROP POLICY IF EXISTS "Permitir atualização de configurações de trator" ON public.tractor_operations_config;
DROP POLICY IF EXISTS "Permitir exclusão de configurações de trator" ON public.tractor_operations_config;

-- Create owner-scoped policies on tractor_operations_config
CREATE POLICY "Users can view own tractor config" ON public.tractor_operations_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tractor config" ON public.tractor_operations_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tractor config" ON public.tractor_operations_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tractor config" ON public.tractor_operations_config FOR DELETE USING (auth.uid() = user_id);

-- Drop old permissive policies on production_costs_config
DROP POLICY IF EXISTS "Permitir leitura de custos de produção" ON public.production_costs_config;
DROP POLICY IF EXISTS "Permitir inserção de custos de produção" ON public.production_costs_config;
DROP POLICY IF EXISTS "Permitir atualização de custos de produção" ON public.production_costs_config;
DROP POLICY IF EXISTS "Permitir exclusão de custos de produção" ON public.production_costs_config;

-- Create owner-scoped policies on production_costs_config
CREATE POLICY "Users can view own production costs" ON public.production_costs_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own production costs" ON public.production_costs_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own production costs" ON public.production_costs_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own production costs" ON public.production_costs_config FOR DELETE USING (auth.uid() = user_id);

-- Drop old permissive policies on labor_config
DROP POLICY IF EXISTS "Permitir leitura de mão de obra" ON public.labor_config;
DROP POLICY IF EXISTS "Permitir inserção de mão de obra" ON public.labor_config;
DROP POLICY IF EXISTS "Permitir atualização de mão de obra" ON public.labor_config;
DROP POLICY IF EXISTS "Permitir exclusão de mão de obra" ON public.labor_config;

-- Create owner-scoped policies on labor_config
CREATE POLICY "Users can view own labor config" ON public.labor_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own labor config" ON public.labor_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own labor config" ON public.labor_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own labor config" ON public.labor_config FOR DELETE USING (auth.uid() = user_id);
