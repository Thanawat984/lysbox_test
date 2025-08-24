-- Fix INSERT policy: remove USING clause per Postgres RLS rules
DROP POLICY IF EXISTS w_shares_owner ON public.shares;
CREATE POLICY w_shares_owner ON public.shares
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());