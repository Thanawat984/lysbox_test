import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MonthlyPoint = { month: string; receitas: number; despesas: number };

function cents(n?: number | null) { return (n ?? 0) / 100; }

export function useMonthlyFinance(companyId?: string) {
  return useQuery({
    queryKey: ["monthly-finance", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_monthly_financial_summary")
        .select("month, receitas_cents, despesas_cents")
        .eq("company_id", companyId)
        .order("month", { ascending: true });
      if (error) throw error;
      const fmt = new Intl.DateTimeFormat("pt-BR", { month: "short" });
      return (data ?? []).map((r: any) => ({
        month: fmt.format(new Date(r.month)),
        receitas: cents(r.receitas_cents),
        despesas: cents(r.despesas_cents),
      })) as MonthlyPoint[];
    }
  });
}

export function useKpis(companyId?: string) {
  return useQuery({
    queryKey: ["kpis", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const from = first.toISOString().slice(0, 10);
      const to = last.toISOString().slice(0, 10);

      const [{ data: tx }, { data: iva }, { data: parties }] = await Promise.all([
        supabase.from("accounting_transactions").select("type, amount_cents").eq("company_id", companyId).gte("date", from).lte("date", to),
        supabase.from("iva_operations").select("iva_total").eq("company_id", companyId).gte("op_date", from).lte("op_date", to),
        supabase.from("iva_operations").select("party_name").eq("company_id", companyId).not("party_name", "is", null)
      ]);

      const receita = cents((tx ?? []).filter(t => t.type === "receita").reduce((s, t:any) => s + (t.amount_cents||0), 0));
      const despesa = cents((tx ?? []).filter(t => t.type === "despesa").reduce((s, t:any) => s + (t.amount_cents||0), 0));
      const impostos = Number(((iva ?? []).reduce((s, r:any) => s + Number(r.iva_total||0), 0)).toFixed(2));
      const clientesAtivos = new Set((parties ?? []).map((p:any) => p.party_name)).size;

      return { receita, despesa, impostos, clientesAtivos };
    }
  });
}

export function useCalendar(companyId?: string) {
  return useQuery({
    queryKey: ["calendar-events", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
      const to = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
      const { data, error } = await supabase
        .from("calendar_events")
        .select("due_date, referencia, status")
        .eq("company_id", companyId)
        .gte("due_date", from).lte("due_date", to)
        .order("due_date");
      if (error) throw error;
      return data ?? [];
    }
  });
}
