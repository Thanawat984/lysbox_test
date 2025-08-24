-- Fix audit trigger function to not assume NEW.id exists
CREATE OR REPLACE FUNCTION public.trg_audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_entity_id uuid;
BEGIN
  -- Safely extract id if present
  BEGIN
    v_entity_id := (to_jsonb(NEW)->>'id')::uuid;
  EXCEPTION WHEN others THEN
    v_entity_id := NULL;
  END;
  PERFORM public.fn_audit_log(TG_TABLE_NAME, v_entity_id, TG_OP, to_jsonb(NEW));
  RETURN NEW;
END;
$$;