import React from "react";
import Seo from "@/components/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import PlainLayout from "@/components/layout/PlainLayout";
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

  return (
    <PlainLayout>
      <div
        style={{
          minHeight: "100dvh",
          background: "linear-gradient(135deg, #0b1220 0%, #111827 50%, #0b1220 100%)",
          color: "#E5E7EB",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Seo title="Planos • Lysbox" description="Conheça os planos e limites do Lysbox." />
          <section
            className="rounded-3xl shadow-glow overflow-hidden border border-white/15"
            style={{ padding: 24, background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))" }}
          >
            <div className="mb-6">
              <h1 className="text-3xl font-semibold tracking-tight">Escolha seu plano</h1>
              <p className="text-sm opacity-80">Teste gratuito por 7 dias nos planos elegíveis.</p>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {(plans.filter((p) => !p.is_demo) || []).map((p, idx) => (
                <Card key={p.id} className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{p.name}</CardTitle>
                      {idx === 1 && (
                        <span className="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/15">Mais popular</span>
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
        </div>
      </div>
    </PlainLayout>
  );
};

export default Planos;
