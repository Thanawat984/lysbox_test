import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCompany() {
  const [companyId, setCompanyId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) { setCompanyId(undefined); setLoading(false); return; }
      const { data } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_user_id", uid)
        .limit(1)
        .maybeSingle();
      if (active) setCompanyId(data?.id);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return { companyId, loading };
}
