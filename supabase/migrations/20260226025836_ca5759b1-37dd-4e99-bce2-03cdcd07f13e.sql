-- Add drip irrigation hardware columns to talhoes
ALTER TABLE public.talhoes
  ADD COLUMN IF NOT EXISTS drip_flow_rate_lh numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drip_spacing_m numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_autocompensating boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.talhoes.drip_flow_rate_lh IS 'Vazão do gotejador em L/h';
COMMENT ON COLUMN public.talhoes.drip_spacing_m IS 'Espaçamento entre gotejadores em metros';
COMMENT ON COLUMN public.talhoes.is_autocompensating IS 'Se a mangueira é autocompensante (PC)';