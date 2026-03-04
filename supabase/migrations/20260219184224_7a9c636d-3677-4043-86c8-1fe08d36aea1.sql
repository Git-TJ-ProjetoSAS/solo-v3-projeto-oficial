-- Fix: Remove trust in client-supplied role metadata during signup
-- All new users default to 'produtor'. Role elevation must be done by admin.
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'produtor'::app_role);
  RETURN NEW;
END;
$$;