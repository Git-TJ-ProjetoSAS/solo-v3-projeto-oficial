-- Criar tabela de insumos
CREATE TABLE public.insumos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cultura TEXT NOT NULL,
  tipo_produto TEXT NOT NULL,
  nome TEXT NOT NULL,
  marca TEXT NOT NULL,
  fornecedor TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  tamanho_unidade INTEGER NOT NULL,
  medida TEXT NOT NULL CHECK (medida IN ('kg', 'litro', 'tonelada')),
  preco DECIMAL(12, 2) NOT NULL,
  
  -- Macronutrientes
  macro_n DECIMAL(5, 2) NOT NULL DEFAULT 0,
  macro_p2o5 DECIMAL(5, 2) NOT NULL DEFAULT 0,
  macro_k2o DECIMAL(5, 2) NOT NULL DEFAULT 0,
  macro_s DECIMAL(5, 2) NOT NULL DEFAULT 0,
  
  -- Micronutrientes
  micro_b DECIMAL(5, 2) NOT NULL DEFAULT 0,
  micro_zn DECIMAL(5, 2) NOT NULL DEFAULT 0,
  micro_cu DECIMAL(5, 2) NOT NULL DEFAULT 0,
  micro_mn DECIMAL(5, 2) NOT NULL DEFAULT 0,
  micro_fe DECIMAL(5, 2) NOT NULL DEFAULT 0,
  micro_mo DECIMAL(5, 2) NOT NULL DEFAULT 0,
  micro_co DECIMAL(5, 2) NOT NULL DEFAULT 0,
  micro_se DECIMAL(5, 2) NOT NULL DEFAULT 0,
  
  -- Correção
  correcao_caco3 DECIMAL(5, 2) NOT NULL DEFAULT 0,
  correcao_camg DECIMAL(5, 2) NOT NULL DEFAULT 0,
  correcao_prnt DECIMAL(5, 2) NOT NULL DEFAULT 0,
  
  observacoes TEXT DEFAULT '',
  foto_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (todos podem ver insumos)
CREATE POLICY "Insumos são visíveis para todos" 
ON public.insumos 
FOR SELECT 
USING (true);

-- Política para inserção pública (permitir cadastro sem autenticação por enquanto)
CREATE POLICY "Permitir inserção de insumos" 
ON public.insumos 
FOR INSERT 
WITH CHECK (true);

-- Política para atualização pública
CREATE POLICY "Permitir atualização de insumos" 
ON public.insumos 
FOR UPDATE 
USING (true);

-- Política para exclusão pública
CREATE POLICY "Permitir exclusão de insumos" 
ON public.insumos 
FOR DELETE 
USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_insumos_updated_at
BEFORE UPDATE ON public.insumos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para busca por tipo de produto
CREATE INDEX idx_insumos_tipo_produto ON public.insumos(tipo_produto);
CREATE INDEX idx_insumos_cultura ON public.insumos(cultura);