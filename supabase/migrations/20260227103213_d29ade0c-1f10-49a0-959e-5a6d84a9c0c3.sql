
-- Table to store water deficit alerts
CREATE TABLE public.water_deficit_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  talhao_id uuid NOT NULL REFERENCES public.talhoes(id) ON DELETE CASCADE,
  deficit_mm numeric NOT NULL DEFAULT 0,
  threshold_mm numeric NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'warning', -- 'warning' | 'critical'
  message text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.water_deficit_alerts ENABLE ROW LEVEL SECURITY;

-- Policies: users see/manage own alerts; service_role inserts via edge function
CREATE POLICY "Users can view own alerts"
  ON public.water_deficit_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.water_deficit_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON public.water_deficit_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Service role insert (edge function runs as service_role)
CREATE POLICY "Service role can insert alerts"
  ON public.water_deficit_alerts FOR INSERT
  WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX idx_water_deficit_alerts_user_unread
  ON public.water_deficit_alerts (user_id, read, created_at DESC);
