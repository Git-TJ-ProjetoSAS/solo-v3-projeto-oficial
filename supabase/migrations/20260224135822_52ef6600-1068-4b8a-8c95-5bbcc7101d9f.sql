
-- Drop the old 4-parameter version that accepts _is_server parameter
DROP FUNCTION IF EXISTS public.transition_os_status(uuid, os_status, jsonb, boolean);
