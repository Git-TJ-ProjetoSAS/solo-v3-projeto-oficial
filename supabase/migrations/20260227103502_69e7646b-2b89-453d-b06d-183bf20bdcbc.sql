
-- Tighten INSERT policy: only service_role should insert alerts (bypasses RLS anyway),
-- but prevent regular authenticated users from inserting arbitrary alerts
DROP POLICY "Service role can insert alerts" ON public.water_deficit_alerts;

-- No INSERT policy for regular users = they can't insert alerts
-- service_role bypasses RLS entirely so it doesn't need a policy
