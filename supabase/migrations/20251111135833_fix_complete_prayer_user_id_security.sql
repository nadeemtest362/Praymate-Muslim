-- Fix security bug: complete_prayer_with_coalesce was not filtering by user_id argument
-- Bug: AND user_id = user_id (always true)
-- Fix: AND prayers.user_id = complete_prayer_with_coalesce.user_id

CREATE OR REPLACE FUNCTION public.complete_prayer_with_coalesce(prayer_id uuid, user_id uuid, completion_time timestamp with time zone)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.prayers
  SET completed_at = COALESCE(completed_at, completion_time)
  WHERE id = prayer_id
    AND prayers.user_id = complete_prayer_with_coalesce.user_id;
$function$;

COMMENT ON FUNCTION public.complete_prayer_with_coalesce(uuid, uuid, timestamptz) IS 
'Marks a prayer as completed, preserving any existing completion timestamp (for race conditions). SECURITY FIX: Now properly validates user_id.';
