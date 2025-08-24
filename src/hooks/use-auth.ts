import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "empresario" | "contador" | "admin" | "super_admin";
export type CloudAccountType = AppRole | "nuvem_lysbox";

export function getDashboardRouteForRole(role?: AppRole) {
  switch (role) {
    case "contador":
      return "/contador";
    case "admin":
      return "/admin";
    case "super_admin":
      return "/super";
    case "empresario":
    default:
      return "/empresario";
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
    }).finally(() => setLoading(false));

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setRoles([]); return; }
    // Defer to avoid deadlocks as per best practices
    const t = setTimeout(async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const r = (data?.map((d: any) => d.role) ?? []) as AppRole[];
      setRoles(r);
    }, 0);
    return () => clearTimeout(t);
  }, [user?.id]);

  const primaryRole = useMemo<AppRole | undefined>(() => roles[0], [roles]);

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string, role: AppRole, fullName?: string, companyName?: string, cloudAccountType?: CloudAccountType) => {
    const redirectUrl = `${window.location.origin}/auth`;
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { role, full_name: fullName, company_name: companyName, cloud_account_type: cloudAccountType }
      }
    });
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // noop - even if Supabase throws, we still clear client state and redirect
    } finally {
      // Proactively clear local state and force navigation to ensure logout
      setUser(null);
      setSession(null);
      window.location.replace("/");
    }
  };
  return { user, session, roles, primaryRole, loading, signIn, signUp, resetPassword, signOut };
}
