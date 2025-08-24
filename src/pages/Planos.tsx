import React from "react";
import Seo from "@/components/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useLocation } from "react-router-dom";
const Planos: React.FC = () => {
  type PlanRow = {
    id: string;
    name: string;
    monthly_price_cents: number | null;
    features: string[] | null;
    storage_gb: number | null;
    is_demo: boolean;
  };
  const [plans, setPlans] = React.useState<PlanRow[]>([]);
  const [payingPlanId, setPayingPlanId] = React.useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  React.useEffect(() => {
    supabase
      .from("plans")
      .select("id,name,monthly_price_cents,features,storage_gb,is_demo")
      .order("monthly_price_cents", { ascending: true })
      .then(({ data }) => setPlans((data as any) || []));
  }, []);
  const toBRL = (cents?: number | null) =>
    cents == null
      ? "Sob consulta"
      : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

  const addDays = (d: Date, days: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x.toISOString();
  };
  const addOneMonthPlusOneDay = (d: Date) => {
    const x = new Date(d);
    x.setMonth(x.getMonth() + 1);
    x.setDate(x.getDate() + 1);
    return x.toISOString();
  };

  const processPayment = async (p: PlanRow) => {
    if (!user) {
      navigate("/auth?tab=login&next=/planos");
      return;
    }
    try {
      setPayingPlanId(p.id);
      const priceCents = p.monthly_price_cents ?? 0;
      const now = new Date();
      const status = priceCents === 0 ? "trial" : "active";
      const trial_until = priceCents === 0 ? addDays(now, 7) : null;
      const current_period_end = priceCents === 0 ? addDays(now, 8) : addOneMonthPlusOneDay(now);

      const { error } = await supabase.from("subscriptions").insert({
        user_id: user.id,
        plan_id: p.id,
        status,
        trial_until,
        current_period_end,
        storage_gb: p.storage_gb ?? null,
      } as any);
      if (error) throw error;

      // Return to previous page
      if ((window.history?.length || 0) > 1) navigate(-1);
      else navigate("/empresario", { replace: true });
    } catch (e) {
      console.error(e);
    } finally {
      setPayingPlanId(null);
    }
  };

  return (
    <>
      <Seo title="Planos • Lysbox" description="Conheça os planos e limites do Lysbox." />
      <section className="relative rounded-3xl bg-gradient-to-br from-primary/80 via-indigo-600/70 to-sky-600/70 text-primary-foreground p-4 md:p-6 lg:p-8 shadow-[0_0_40px_rgba(0,0,0,0.25)] overflow-hidden border border-white/15">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 200px at 20% 0%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(500px 200px at 80% 10%, rgba(255,255,255,0.06), transparent 60%)",
          }}
        />
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Escolha seu plano</h1>
          <p className="text-sm opacity-80">Teste gratuito por 7 dias nos planos elegíveis.</p>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {(plans.filter((p) => !p.is_demo) || []).map((p, idx) => (
            <Card key={p.id} className="bg-white/10 border-white/15 backdrop-blur-md rounded-2xl relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{p.name}</CardTitle>
                  {idx === 1 && (
                    <span className="px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground border border-white/15">Mais popular</span>
                  )}
                </div>
                <div className="text-xs opacity-80 mt-1">
                  {p.storage_gb ? `${p.storage_gb} GB de armazenamento` : "Plano"}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">{toBRL(p.monthly_price_cents)}</span>
                  <span className="opacity-80">/mês</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {((p.features as any) || []).map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={idx === 1 ? "secondary" : "default"}
                  onClick={() => navigate(`/pay/${p.id}`, { state: { from: (location.state as any)?.from || "/planos" } })}
                >
                  Começar agora
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-xs opacity-80">
          7 dias grátis quando aplicável. Sem cartão na criação. Cancelamento em 1 clique.
        </p>
      </section>
    </>
  );
};

export default Planos;
