-- Adicionar campos para princípios ativos e recomendação de dose
-- Estes campos são específicos para produtos de pulverização: Foliar, Fungicida, Inseticida, Herbicida, Adjuvantes

-- Campo JSONB para armazenar array de princípios ativos com nome e concentração
-- Estrutura: [{"nome": "Glifosato", "concentracao": 480, "unidade": "g/L"}, ...]
ALTER TABLE public.insumos 
ADD COLUMN principios_ativos jsonb DEFAULT '[]'::jsonb;

-- Campo para armazenar a dose recomendada por hectare
ALTER TABLE public.insumos 
ADD COLUMN recomendacao_dose_ha numeric DEFAULT 0;

-- Campo para unidade da dose recomendada (L/ha, mL/ha, kg/ha, g/ha)
ALTER TABLE public.insumos 
ADD COLUMN recomendacao_dose_unidade text DEFAULT 'L/ha';

-- Comentários para documentação
COMMENT ON COLUMN public.insumos.principios_ativos IS 'Array de princípios ativos com nome, concentração e unidade. Ex: [{"nome": "Glifosato", "concentracao": 480, "unidade": "g/L"}]';
COMMENT ON COLUMN public.insumos.recomendacao_dose_ha IS 'Dose recomendada por hectare para aplicação';
COMMENT ON COLUMN public.insumos.recomendacao_dose_unidade IS 'Unidade da dose recomendada (L/ha, mL/ha, kg/ha, g/ha)';