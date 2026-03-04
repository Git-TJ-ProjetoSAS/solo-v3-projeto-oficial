
-- Fix: Remove _is_server parameter from transition_os_status
-- Instead, detect service_role context from JWT claims internally
CREATE OR REPLACE FUNCTION public.transition_os_status(
  _os_id UUID,
  _new_status public.os_status,
  _checklist JSONB DEFAULT NULL
)
RETURNS public.ordens_servico
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _os public.ordens_servico;
  _current public.os_status;
  _is_server BOOLEAN;
BEGIN
  -- Detect if called from service_role context (server-side only)
  _is_server := coalesce(
    current_setting('request.jwt.claims', true)::json->>'role', ''
  ) = 'service_role';

  SELECT * INTO _os FROM public.ordens_servico WHERE id = _os_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'OS não encontrada'; END IF;

  _current := _os.status;

  -- Validate allowed transitions
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
