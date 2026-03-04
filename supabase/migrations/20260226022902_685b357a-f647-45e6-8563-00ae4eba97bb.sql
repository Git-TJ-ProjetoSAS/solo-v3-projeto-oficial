
-- Table to store daily water balance records and confirmed irrigations
CREATE TABLE public.irrigation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  talhao_id UUID NOT NULL REFERENCES public.talhoes(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  etc_mm NUMERIC NOT NULL DEFAULT 0,
  rain_mm NUMERIC NOT NULL DEFAULT 0,
  rain_manual_mm NUMERIC NOT NULL DEFAULT 0,
  irrigation_mm NUMERIC NOT NULL DEFAULT 0,
  deficit_mm NUMERIC NOT NULL DEFAULT 0,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  weather_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, talhao_id, date)
);

ALTER TABLE public.irrigation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own irrigation logs" ON public.irrigation_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own irrigation logs" ON public.irrigation_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own irrigation logs" ON public.irrigation_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own irrigation logs" ON public.irrigation_logs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_irrigation_logs_updated_at
  BEFORE UPDATE ON public.irrigation_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
