
-- Tabela de transações financeiras
CREATE TABLE public.transacoes_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  talhao_id UUID REFERENCES public.talhoes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'despesa' CHECK (tipo IN ('receita', 'despesa')),
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT 'outros',
  status TEXT NOT NULL DEFAULT 'realizado' CHECK (status IN ('planejado', 'realizado')),
  metodo_entrada TEXT NOT NULL DEFAULT 'manual' CHECK (metodo_entrada IN ('manual', 'voz', 'foto')),
  insumo_id UUID REFERENCES public.insumos(id) ON DELETE SET NULL,
  safra TEXT DEFAULT '2025/2026',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transacoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transacoes_financeiras FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transacoes_financeiras FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.transacoes_financeiras FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.transacoes_financeiras FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_transacoes_updated_at
  BEFORE UPDATE ON public.transacoes_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de metas por safra/talhão
CREATE TABLE public.safra_metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  talhao_id UUID REFERENCES public.talhoes(id) ON DELETE CASCADE,
  safra TEXT NOT NULL DEFAULT '2025/2026',
  expectativa_sacos NUMERIC NOT NULL DEFAULT 0,
  area_hectares NUMERIC NOT NULL DEFAULT 0,
  preco_saca_referencia NUMERIC NOT NULL DEFAULT 450,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, talhao_id, safra)
);

ALTER TABLE public.safra_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own safra metas"
  ON public.safra_metas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own safra metas"
  ON public.safra_metas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own safra metas"
  ON public.safra_metas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own safra metas"
  ON public.safra_metas FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_safra_metas_updated_at
  BEFORE UPDATE ON public.safra_metas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
