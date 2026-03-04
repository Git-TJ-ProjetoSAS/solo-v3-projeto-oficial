
CREATE TABLE public.daily_weather_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    talhao_id UUID REFERENCES public.talhoes(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    t_max NUMERIC(5,2),
    t_min NUMERIC(5,2),
    eto NUMERIC(5,2) NOT NULL,
    rainfall_api NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(talhao_id, date)
);

CREATE INDEX idx_weather_history_talhao_date ON public.daily_weather_history(talhao_id, date);

ALTER TABLE public.daily_weather_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weather history"
ON public.daily_weather_history FOR SELECT
USING (
    talhao_id IN (SELECT id FROM public.talhoes WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert own weather history"
ON public.daily_weather_history FOR INSERT
WITH CHECK (
    talhao_id IN (SELECT id FROM public.talhoes WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update own weather history"
ON public.daily_weather_history FOR UPDATE
USING (
    talhao_id IN (SELECT id FROM public.talhoes WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete own weather history"
ON public.daily_weather_history FOR DELETE
USING (
    talhao_id IN (SELECT id FROM public.talhoes WHERE user_id = auth.uid())
);
