import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, AppRole, getDashboardRouteForRole } from "@/hooks/use-auth";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import Seo from "@/components/Seo";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const roles = [
  { label: "Empresário (Nuvem)", value: "empresario" },
  { label: "Contador (Nuvem Multiempresa)", value: "contador" },
] as const;

const cloudAccountTypes = [
  { label: "Empresário", value: "empresario" },
  { label: "Contador", value: "contador" },
  { label: "Admin", value: "admin" },
  { label: "Super Admin", value: "super_admin" },
  { label: "Nuvem Lysbox", value: "nuvem_lysbox" },
] as const;
const schemaLogin = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});

const schemaSignup = z.object({
  fullName: z.string().optional(),
  companyName: z.string().optional(),
  accountName: z.string().optional(),
  crc: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["empresario","contador","admin","super_admin"]) as z.ZodType<AppRole>,
  cloudAccountType: z.enum(["empresario","contador","admin","super_admin","nuvem_lysbox"]),
});

const schemaReset = z.object({ email: z.string().email() });

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const initialTab = params.get("tab") || "login";
  const nextPath = React.useMemo(() => {
    const n = params.get("next");
    return n && n.startsWith("/") ? n : null;
  }, [params]);

  const { signIn, signUp, primaryRole, user, resetPassword } = useAuth();

  const formLogin = useForm({ resolver: zodResolver(schemaLogin), defaultValues: { email: "", password: "" } });
  const formSignup = useForm<z.infer<typeof schemaSignup>>({ resolver: zodResolver(schemaSignup), defaultValues: { fullName: "", companyName: "", accountName: "", crc: "", email: "", password: "", role: "empresario" as AppRole, cloudAccountType: "nuvem_lysbox" } });
  const formReset = useForm({ resolver: zodResolver(schemaReset), defaultValues: { email: "" } });

  React.useEffect(() => {
    if (user) {
      const isCloud = (user as any)?.user_metadata?.cloud_account_type === "nuvem_lysbox";
      const defaultDest = isCloud ? "/cloud" : (primaryRole ? getDashboardRouteForRole(primaryRole) : "/empresario");
      const dest = nextPath || defaultDest;
      if (location.pathname !== dest) {
        navigate(dest, { replace: true });
      }
    }
  }, [user, primaryRole, navigate, location.pathname, nextPath]);

  const onLogin = async (v: z.infer<typeof schemaLogin>) => {
    const { error } = await signIn(v.email, v.password);
    if (error) toast({ title: "Erro ao entrar", description: error.message });
  };

  const onSignup = async (v: z.infer<typeof schemaSignup>) => {
    if (v.cloudAccountType === "contador") {
      // Direct sign-up to include accountant-specific metadata
      const redirectUrl = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.signUp({
        email: v.email,
        password: v.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: "contador",
            account_name: v.accountName,
            crc: v.crc,
            cloud_account_type: "contador",
          },
        },
      });
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message });
      } else {
        toast({ title: "Verifique seu e-mail", description: "Confirme o cadastro para continuar." });
      }
    } else {
      const { error } = await signUp(v.email, v.password, v.role, v.fullName, v.companyName, v.cloudAccountType);
      if (error) toast({ title: "Erro ao cadastrar", description: error.message });
      else toast({ title: "Verifique seu e-mail", description: "Confirme o cadastro para continuar." });
    }
  };

  // After login, if user is contador and has not an accountants row, create it (RLS-safe)
  React.useEffect(() => {
    const createAccountantIfNeeded = async () => {
      if (!user) return;
      const meta: any = (user as any).user_metadata || {};
      if (meta?.cloud_account_type !== "contador") return;
      const { data: existing } = await supabase
        .from("accountants")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        const { error: accErr } = await supabase
          .from("accountants")
          .insert({
            user_id: user.id,
            crc: meta?.crc ?? null,
            account_name: meta?.account_name ?? null,
            crc_status: "pendente" as any,
          } as any);
        if (accErr) {
          console.error("Failed to create accountant profile due to RLS or schema:", accErr);
        }
      }
    };
    void createAccountantIfNeeded();
  }, [user]);

  const onReset = async (v: z.infer<typeof schemaReset>) => {
    const { error } = await resetPassword(v.email);
    if (error) toast({ title: "Erro ao enviar", description: error.message });
    else toast({ title: "Verifique seu e-mail", description: "Enviamos um link para redefinir sua senha." });
  };

  return (
    <>
      <Seo title="Entrar • Lysbox" description="Acesse sua conta Lysbox" />
      <div className="min-h-screen grid place-items-center bg-gradient-subtle relative overflow-hidden">
        <div className="interactive-spotlight" />
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg backdrop-blur">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-semibold">Bem-vindo ao Lysbox</h1>
            <p className="text-muted-foreground text-sm">Autenticação e cadastro</p>
          </div>
          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              <TabsTrigger value="reset">Recuperar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form className="mt-4 space-y-4" onSubmit={formLogin.handleSubmit(onLogin)}>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" {...formLogin.register("email")} />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" {...formLogin.register("password")} />
                </div>
                <Button type="submit" className="w-full">Entrar</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form className="mt-4 space-y-4" onSubmit={formSignup.handleSubmit(onSignup)}>
                {formSignup.watch("cloudAccountType") === "contador" ? (
                  <>
                    <div>
                      <Label htmlFor="accountName">Account name</Label>
                      <Input id="accountName" placeholder="Nome do escritório" {...formSignup.register("accountName")} />
                    </div>
                    <div>
                      <Label htmlFor="crc">CRC</Label>
                      <Input id="crc" placeholder="CRC do contador" {...formSignup.register("crc")} />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="fullName">Nome completo</Label>
                      <Input id="fullName" {...formSignup.register("fullName")} />
                    </div>
                    <div>
                      <Label htmlFor="companyName">Empresa (opcional)</Label>
                      <Input id="companyName" {...formSignup.register("companyName")} />
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="email2">E-mail</Label>
                  <Input id="email2" type="email" {...formSignup.register("email")} />
                </div>
                <div>
                  <Label htmlFor="password2">Senha</Label>
                  <Input id="password2" type="password" {...formSignup.register("password")} />
                </div>
                <div>
                  <Label>Tipo de conta para a nuvem</Label>
                  <select className="mt-1 w-full h-10 rounded-md border bg-background px-3" {...formSignup.register("cloudAccountType")}>
                    {cloudAccountTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <Button type="submit" className="w-full">Criar conta</Button>
              </form>
            </TabsContent>
            <TabsContent value="reset">
              <form className="mt-4 space-y-4" onSubmit={formReset.handleSubmit(onReset)}>
                <div>
                  <Label htmlFor="email3">E-mail</Label>
                  <Input id="email3" type="email" {...formReset.register("email")} />
                </div>
                <Button type="submit" className="w-full" variant="secondary">Enviar link de redefinição</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Auth;
