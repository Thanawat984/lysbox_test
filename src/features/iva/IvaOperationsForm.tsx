import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInsertIvaOperation } from "./hooks/useIva";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface Props {
  companyId?: string;
}

const IvaOperationsForm: React.FC<Props> = ({ companyId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const insert = useInsertIvaOperation();

  const [form, setForm] = useState({
    op_date: new Date().toISOString().slice(0, 10),
    op_type: "venda" as "compra" | "venda",
    party_name: "",
    party_cnpj: "",
    amount_without_tax: "",
    cbs_rate: "0.0000",
    ibs_rate: "0.0000",
    company_id: companyId || "",
    notes: "",
  });

  const totals = useMemo(() => {
    const base = parseFloat(form.amount_without_tax || "0");
    const cbs = parseFloat(form.cbs_rate || "0");
    const ibs = parseFloat(form.ibs_rate || "0");
    const iva = base * (cbs + ibs);
    const credit_debit = form.op_type === "venda" ? "debito" : "credito";
    return { iva_total: Number.isFinite(iva) ? iva : 0, credit_debit } as const;
  }, [form.amount_without_tax, form.cbs_rate, form.ibs_rate, form.op_type]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.company_id) {
      toast({ title: "Informe a empresa", description: "Defina o company_id." });
      return;
    }
    try {
      await insert.mutateAsync({
        company_id: form.company_id,
        user_id: user.id,
        op_date: form.op_date,
        op_type: form.op_type,
        party_name: form.party_name || undefined,
        party_cnpj: form.party_cnpj || undefined,
        amount_without_tax: parseFloat(form.amount_without_tax || "0"),
        cbs_rate: parseFloat(form.cbs_rate || "0"),
        ibs_rate: parseFloat(form.ibs_rate || "0"),
        iva_total: totals.iva_total,
        credit_debit: totals.credit_debit,
        source: "manual",
        notes: form.notes || undefined,
      } as any);
      toast({ title: "Operação registrada", description: "IVA calculado e armazenado." });
      setForm((f) => ({ ...f, amount_without_tax: "", notes: "" }));
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar operação IVA (CBS + IBS)</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid md:grid-cols-3 gap-3" onSubmit={onSubmit}>
          {!companyId && (
            <div className="md:col-span-3">
              <Label>Empresa (company_id)</Label>
              <Input
                placeholder="UUID da empresa"
                value={form.company_id}
                onChange={(e) => setForm({ ...form, company_id: e.target.value })}
              />
            </div>
          )}
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.op_date} onChange={(e) => setForm({ ...form, op_date: e.target.value })} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.op_type} onValueChange={(v) => setForm({ ...form, op_type: v as any })}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="venda">Venda (débito)</SelectItem>
                <SelectItem value="compra">Compra (crédito)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor sem imposto</Label>
            <Input type="number" step="0.01" min="0" value={form.amount_without_tax} onChange={(e) => setForm({ ...form, amount_without_tax: e.target.value })} />
          </div>
          <div>
            <Label>Alíquota CBS</Label>
            <Input type="number" step="0.0001" min="0" value={form.cbs_rate} onChange={(e) => setForm({ ...form, cbs_rate: e.target.value })} />
          </div>
          <div>
            <Label>Alíquota IBS</Label>
            <Input type="number" step="0.0001" min="0" value={form.ibs_rate} onChange={(e) => setForm({ ...form, ibs_rate: e.target.value })} />
          </div>
          <div className="md:col-span-3 grid md:grid-cols-3 gap-3">
            <div>
              <Label>Cliente/Fornecedor</Label>
              <Input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={form.party_cnpj} onChange={(e) => setForm({ ...form, party_cnpj: e.target.value })} />
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <div className="md:col-span-3 flex items-center justify-between border rounded-md p-3 bg-muted/40">
            <div className="text-sm">
              <div>IVA calculado: <strong>{totals.iva_total.toFixed(2)}</strong></div>
              <div>Naturaleza: <strong>{totals.credit_debit.toUpperCase()}</strong></div>
            </div>
            <Button type="submit" className="hover-scale">Salvar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default IvaOperationsForm;
