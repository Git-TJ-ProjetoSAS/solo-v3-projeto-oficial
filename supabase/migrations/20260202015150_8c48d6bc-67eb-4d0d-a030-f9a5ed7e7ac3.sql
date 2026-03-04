-- Create table for tractor operations configuration
CREATE TABLE public.tractor_operations_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  hours_per_ha NUMERIC NOT NULL DEFAULT 0,
  tractor_type TEXT NOT NULL DEFAULT 'proprio',
  cost_per_hour_own NUMERIC NOT NULL DEFAULT 150,
  cost_per_hour_rent NUMERIC NOT NULL DEFAULT 200,
  hectares NUMERIC NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(farm_id, operation_name)
);

-- Enable Row Level Security
ALTER TABLE public.tractor_operations_config ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since there's no auth in this app)
CREATE POLICY "Permitir leitura de configurações de trator"
ON public.tractor_operations_config
FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de configurações de trator"
ON public.tractor_operations_config
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização de configurações de trator"
ON public.tractor_operations_config
FOR UPDATE
USING (true);

CREATE POLICY "Permitir exclusão de configurações de trator"
ON public.tractor_operations_config
FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tractor_operations_config_updated_at
BEFORE UPDATE ON public.tractor_operations_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();