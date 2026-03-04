
CREATE TABLE public.rainfall_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  talhao_id UUID REFERENCES public.talhoes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  rainfall_mm NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rainfall_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rainfall" ON public.rainfall_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rainfall" ON public.rainfall_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rainfall" ON public.rainfall_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rainfall" ON public.rainfall_history FOR DELETE USING (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_rainfall_user_talhao_date ON public.rainfall_history (user_id, talhao_id, date);
