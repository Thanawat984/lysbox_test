import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type IvaOperation = {
  id?: string;
  company_id: string;
  user_id: string;
  op_date: string; // ISO date
  op_type: "compra" | "venda";
  party_name?: string;
  party_cnpj?: string;
  amount_without_tax: number;
  cbs_rate: number;
  ibs_rate: number;
  iva_total: number;
  credit_debit: "credito" | "debito";
  source?: "manual" | "ocr";
  notes?: string;
};

export type IvaParameter = {
  id?: string;
  cbs_rate: number;
  ibs_rate: number;
  sector: "geral" | "saude" | "educacao" | "transporte_coletivo" | "cesta_basica";
  regime: "padrao" | "combustiveis" | "financeiros" | "planos_saude" | "agropecuaria";
  active_from: string; // date
  active_to?: string | null;
  description?: string | null;
  enabled: boolean;
};

export function useIvaParameters() {
  return useQuery({
    queryKey: ["iva_parameters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iva_parameters" as any)
        .select("*")
        .order("active_from", { ascending: false });
      if (error) throw error;
      return data as unknown as IvaParameter[];
    },
  });
}

export function useUpsertIvaParameter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<IvaParameter>) => {
      const { data, error } = await supabase
        .from("iva_parameters" as any)
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as IvaParameter;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["iva_parameters"] }),
  });
}

export function useDeleteIvaParameter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("iva_parameters" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["iva_parameters"] }),
  });
}

export function useIvaOperations(companyId?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ["iva_operations", companyId, from, to],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("iva_operations" as any).select("*").order("op_date", { ascending: false });
      if (companyId) q = q.eq("company_id", companyId);
      if (from) q = q.gte("op_date", from);
      if (to) q = q.lte("op_date", to);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as IvaOperation[];
    },
  });
}

export function useInsertIvaOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (op: IvaOperation) => {
      const { data, error } = await supabase
        .from("iva_operations" as any)
        .insert(op)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as IvaOperation;
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["iva_operations", vars.company_id] }),
  });
}

export function groupMonthly(ops: IvaOperation[]) {
  const map: Record<string, { month: string; credito: number; debito: number; liquido: number }> = {};
  for (const op of ops) {
    const d = new Date(op.op_date + "T00:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) map[key] = { month: key, credito: 0, debito: 0, liquido: 0 };
    if (op.credit_debit === "credito") map[key].credito += Number(op.iva_total);
    else map[key].debito += Number(op.iva_total);
    map[key].liquido = map[key].debito - map[key].credito;
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}
