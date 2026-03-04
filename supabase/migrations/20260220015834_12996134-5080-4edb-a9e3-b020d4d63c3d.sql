
-- 1. Janelas Fenológicas (Calendário Base)
CREATE TABLE public.janelas_fenologicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_fase TEXT NOT NULL,
  mes_inicio INT NOT NULL CHECK (mes_inicio BETWEEN 1 AND 12),
  mes_fim INT NOT NULL CHECK (mes_fim BETWEEN 1 AND 12),
  cultura TEXT NOT NULL DEFAULT 'cafe',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.janelas_fenologicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own janelas" ON public.janelas_fenologicas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own janelas" ON public.janelas_fenologicas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own janelas" ON public.janelas_fenologicas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own janelas" ON public.janelas_fenologicas FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_janelas_fenologicas_updated_at
  BEFORE UPDATE ON public.janelas_fenologicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Ordens de Serviço (Coração do Sistema)
CREATE TYPE public.os_tipo_operacao AS ENUM ('solo', 'foliar_casada', 'correcao');
CREATE TYPE public.os_status AS ENUM ('bloqueada_clima', 'liberada', 'em_execucao', 'concluida', 'cancelada');

CREATE TABLE public.ordens_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  talhao_id UUID NOT NULL REFERENCES public.talhoes(id) ON DELETE CASCADE,
  janela_id UUID REFERENCES public.janelas_fenologicas(id) ON DELETE SET NULL,
  tipo_operacao public.os_tipo_operacao NOT NULL DEFAULT 'solo',
  status public.os_status NOT NULL DEFAULT 'bloqueada_clima',
  volume_calda_hectare NUMERIC NOT NULL DEFAULT 0,
  area_aplicacao_ha NUMERIC NOT NULL DEFAULT 0,
  data_prevista DATE,
  data_liberacao TIMESTAMPTZ,
  data_inicio_execucao TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  tempo_execucao_min NUMERIC,
  checklist_seguranca JSONB DEFAULT '{}',
  clima_snapshot JSONB,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OS" ON public.ordens_servico FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own OS" ON public.ordens_servico FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own OS" ON public.ordens_servico FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own OS" ON public.ordens_servico FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_ordens_servico_updated_at
  BEFORE UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ordens_servico_status ON public.ordens_servico(status);
CREATE INDEX idx_ordens_servico_talhao ON public.ordens_servico(talhao_id);

-- 3. Receita de Tanque (Operação Casada - N produtos por OS)
CREATE TABLE public.os_receita_tanque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES public.insumos(id) ON DELETE SET NULL,
  insumo_nome TEXT NOT NULL,
  dose_hectare NUMERIC NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'L/ha',
  ordem_mistura INT NOT NULL DEFAULT 1,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.os_receita_tanque ENABLE ROW LEVEL SECURITY;

-- RLS via join com ordens_servico
CREATE POLICY "Users can view own receitas" ON public.os_receita_tanque
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.ordens_servico WHERE id = os_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own receitas" ON public.os_receita_tanque
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.ordens_servico WHERE id = os_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own receitas" ON public.os_receita_tanque
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.ordens_servico WHERE id = os_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own receitas" ON public.os_receita_tanque
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.ordens_servico WHERE id = os_id AND user_id = auth.uid()));

-- 4. Função para transição segura de status (máquina de estados)
CREATE OR REPLACE FUNCTION public.transition_os_status(
  _os_id UUID,
  _new_status public.os_status,
  _checklist JSONB DEFAULT NULL,
  _is_server BOOLEAN DEFAULT FALSE
)
RETURNS public.ordens_servico
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _os public.ordens_servico;
  _current public.os_status;
BEGIN
  SELECT * INTO _os FROM public.ordens_servico WHERE id = _os_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'OS não encontrada'; END IF;
  
  _current := _os.status;

  -- Validar transições permitidas
  IF _new_status = 'liberada' THEN
    IF _current != 'bloqueada_clima' THEN
      RAISE EXCEPTION 'Transição inválida: % -> liberada', _current;
    END IF;
    IF NOT _is_server THEN
      RAISE EXCEPTION 'Apenas o servidor pode liberar uma OS bloqueada por clima';
    END IF;
    UPDATE public.ordens_servico SET status = 'liberada', data_liberacao = now(), updated_at = now() WHERE id = _os_id RETURNING * INTO _os;

  ELSIF _new_status = 'em_execucao' THEN
    IF _current != 'liberada' THEN
      RAISE EXCEPTION 'Transição inválida: % -> em_execucao', _current;
    END IF;
    IF _checklist IS NULL OR _checklist = '{}' THEN
      RAISE EXCEPTION 'Checklist de segurança obrigatório para iniciar execução';
    END IF;
    UPDATE public.ordens_servico SET status = 'em_execucao', data_inicio_execucao = now(), checklist_seguranca = _checklist, updated_at = now() WHERE id = _os_id RETURNING * INTO _os;

  ELSIF _new_status = 'concluida' THEN
    IF _current != 'em_execucao' THEN
      RAISE EXCEPTION 'Transição inválida: % -> concluida', _current;
    END IF;
    UPDATE public.ordens_servico SET 
      status = 'concluida', 
      data_conclusao = now(), 
      tempo_execucao_min = EXTRACT(EPOCH FROM (now() - data_inicio_execucao)) / 60,
      updated_at = now() 
    WHERE id = _os_id RETURNING * INTO _os;

  ELSIF _new_status = 'cancelada' THEN
    IF _current IN ('concluida') THEN
      RAISE EXCEPTION 'Não é possível cancelar uma OS já concluída';
    END IF;
    UPDATE public.ordens_servico SET status = 'cancelada', updated_at = now() WHERE id = _os_id RETURNING * INTO _os;

  ELSE
    RAISE EXCEPTION 'Status inválido: %', _new_status;
  END IF;

  RETURN _os;
END;
$$;
