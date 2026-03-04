
-- Add fornecedor column to transacoes_financeiras
ALTER TABLE public.transacoes_financeiras 
ADD COLUMN fornecedor text DEFAULT '';
