-- Fix: qualify enum type with schema when using empty search_path in SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.fn_enforce_jit(_user uuid, _role_code text, _window_minutes int, _approval_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_status public.approval_status;
BEGIN
  SELECT status INTO v_status FROM public.approvals WHERE id = _approval_id AND requested_by = _user;
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'Approval not approved';
  END IF;
  INSERT INTO public.jit_tokens(id, user_id, role_code, expires_at, reason)
  VALUES (v_id, _user, _role_code, now() + (_window_minutes || ' minutes')::interval, 'JIT via approval ' || _approval_id::text);
  RETURN v_id;
END;
$$;