import React, { useEffect, useMemo, useState } from "react";
import Seo from "@/components/Seo";
import PlainLayout from "@/components/layout/PlainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type PlanRow = {
  id: string;
  name: string;
  monthly_price_cents: number | null;
  storage_gb: number | null;
};

const toBRL = (cents?: number | null) =>
  cents == null
    ? "Sob consulta"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format((cents || 0) / 100);

const addDaysISO = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x.toISOString();
};
const addOneMonthPlusOneDayISO = (d: Date) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + 1);
  x.setDate(x.getDate() + 1);
  return x.toISOString();
};

const Payment: React.FC = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("plans")
        .select("id,name,monthly_price_cents,storage_gb")
        .eq("id", planId)
        .maybeSingle();
      setPlan((data as any) || null);
    };
    if (planId) void load();
  }, [planId]);

  const priceLabel = useMemo(() => toBRL(plan?.monthly_price_cents ?? 0), [plan?.monthly_price_cents]);

  const processPayment = async () => {
    if (!user || !plan) return;
    try {
      setPaying(true);
      const priceCents = plan.monthly_price_cents ?? 0;

      // Determine status and current_period_end based on price
      const now = new Date();
      const status = priceCents === 0 ? "trial" : "active";
      const trial_until = priceCents === 0 ? addDaysISO(now, 7) : null;
      const current_period_end = priceCents === 0 ? addDaysISO(now, 8) : addOneMonthPlusOneDayISO(now);

      // Insert subscription record
      const { error } = await supabase.from("subscriptions").insert({
        user_id: user.id,
        plan_id: plan.id,
        status,
        trial_until,
        current_period_end,
        storage_gb: plan.storage_gb ?? null,
      } as any);
      if (error) throw error;

      // Simulate external payment for paid plans (integration could be added here)
      // After completion, return to previous page
      const back = (location.state as any)?.from || "/planos";
      navigate(back, { replace: true });
    } catch (e) {
      console.error(e);
    } finally {
      setPaying(false);
    }
  };

  return (
    <PlainLayout>
      <Seo title="Pagamento • Lysbox" description="Finalize sua assinatura com segurança" />
      <div className="max-w-2xl mx-auto">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Pagamento do plano</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!plan ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : (
              <>
                <div>
                  <div className="text-sm text-muted-foreground">Plano</div>
                  <div className="text-lg font-semibold">{plan.name}</div>
                  <div className="text-sm">{priceLabel} / mês</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Armazenamento</Label>
                    <Input readOnly value={`${plan.storage_gb ?? 0} GB`} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Input readOnly value={(plan.monthly_price_cents ?? 0) === 0 ? "trial" : "active"} />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Ao clicar em Pagar, a assinatura será registrada. Para planos pagos, o processamento real deve ocorrer (Mercado Pago).
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
                  <Button onClick={processPayment} disabled={paying || !user}>{paying ? "Processando…" : "Pagar"}</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PlainLayout>
  );
};

export default Payment;


