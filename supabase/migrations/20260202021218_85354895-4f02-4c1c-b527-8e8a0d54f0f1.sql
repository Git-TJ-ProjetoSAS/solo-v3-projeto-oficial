-- Tabela para custos gerais de produção (irrigação e lona)
CREATE TABLE public.production_costs_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id TEXT NOT NULL,
  irrigation_cost_per_ha NUMERIC NOT NULL DEFAULT 0,
  tarpaulin_cost_per_m2 NUMERIC NOT NULL DEFAULT 0,
  tarpaulin_m2 NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(farm_id)
);

-- Tabela para configuração de mão de obra
CREATE TABLE public.labor_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id TEXT NOT NULL,
  labor_type TEXT NOT NULL DEFAULT 'daily',
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_costs_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_config ENABLE ROW LEVEL SECURITY;

-- Políticas para production_costs_config
CREATE POLICY "Permitir leitura de custos de produção" 
ON public.production_costs_config 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de custos de produção" 
ON public.production_costs_config 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de custos de produção" 
ON public.production_costs_config 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de custos de produção" 
ON public.production_costs_config 
FOR DELETE 
USING (true);

-- Políticas para labor_config
CREATE POLICY "Permitir leitura de mão de obra" 
ON public.labor_config 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de mão de obra" 
ON public.labor_config 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de mão de obra" 
ON public.labor_config 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de mão de obra" 
ON public.labor_config 
FOR DELETE 
USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_production_costs_config_updated_at
BEFORE UPDATE ON public.production_costs_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_labor_config_updated_at
BEFORE UPDATE ON public.labor_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();