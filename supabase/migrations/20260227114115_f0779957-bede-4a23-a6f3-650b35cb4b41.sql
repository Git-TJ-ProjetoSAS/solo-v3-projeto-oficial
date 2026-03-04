
-- Table to store VAPID keys (generated once, accessed only by service_role)
CREATE TABLE public.push_config (
  id TEXT PRIMARY KEY DEFAULT 'vapid',
  public_key TEXT NOT NULL,
  private_key_jwk JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_config ENABLE ROW LEVEL SECURITY;

-- No direct access from client - only edge functions with service_role
CREATE POLICY "No direct access to push_config"
  ON public.push_config FOR SELECT
  USING (false);

-- Table to store user push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger function to call edge function on new water_deficit_alerts
CREATE OR REPLACE FUNCTION public.notify_water_deficit_push()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://ehoatokcodcbveovcvlm.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id::text,
      'alert_id', NEW.id::text,
      'message', NEW.message,
      'severity', NEW.severity,
      'deficit_mm', NEW.deficit_mm
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_water_deficit_alert_insert
  AFTER INSERT ON public.water_deficit_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_water_deficit_push();
