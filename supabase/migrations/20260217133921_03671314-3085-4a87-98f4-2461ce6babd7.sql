
CREATE TABLE public.ref_tarifas_energia (
  id SERIAL PRIMARY KEY,
  regiao TEXT NOT NULL,
  tarifa_media_kwh NUMERIC NOT NULL,
  distribuidoras TEXT NOT NULL,
  ano_referencia INTEGER NOT NULL DEFAULT 2025
);

ALTER TABLE public.ref_tarifas_energia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view energy tariffs"
  ON public.ref_tarifas_energia
  FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.ref_tarifas_energia (regiao, tarifa_media_kwh, distribuidoras) VALUES
  ('Norte', 1.00, 'Equatorial PA, Energisa TO, Amazonas Energia'),
  ('Nordeste', 0.95, 'Equatorial PI/MA, Neoenergia Coelba (BA)'),
  ('Centro-Oeste', 0.90, 'Equatorial GO, Energisa MS/MT'),
  ('Sudeste', 0.85, 'Enel RJ, Light, Cemig (MG), Enel SP'),
  ('Sul', 0.80, 'CEEE Equatorial (RS), RGE, Celesc (SC)');
