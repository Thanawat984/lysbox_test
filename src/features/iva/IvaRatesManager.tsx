import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeleteIvaParameter, useIvaParameters, useUpsertIvaParameter } from "./hooks/useIva";
import { useToast } from "@/hooks/use-toast";

const IvaRatesManager: React.FC = () => {
  const { data: params = [] } = useIvaParameters();
  const upsert = useUpsertIvaParameter();
  const del = useDeleteIvaParameter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    id: "",
    cbs_rate: "0.0000",
    ibs_rate: "0.0000",
    sector: "geral",
    regime: "padrao",
    active_from: new Date().toISOString().slice(0, 10),
    active_to: "",
    description: "",
    enabled: true,
  });

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsert.mutateAsync({
        id: form.id || undefined,
        cbs_rate: parseFloat(form.cbs_rate),
        ibs_rate: parseFloat(form.ibs_rate),
        sector: form.sector as any,
        regime: form.regime as any,
        active_from: form.active_from,
        active_to: form.active_to || null,
        description: form.description || null,
        enabled: form.enabled,
      });
      toast({ title: "Parâmetros salvos" });
      setForm({ ...form, id: "", description: "" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const onEdit = (p: any) => {
    setForm({
      id: p.id,
      cbs_rate: String(p.cbs_rate),
      ibs_rate: String(p.ibs_rate),
      sector: p.sector,
      regime: p.regime,
      active_from: p.active_from,
      active_to: p.active_to || "",
      description: p.description || "",
      enabled: p.enabled,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parâmetros do IVA (CBS + IBS)</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid md:grid-cols-4 gap-3" onSubmit={onSave}>
          <div>
            <Label>CBS</Label>
            <Input value={form.cbs_rate} onChange={(e) => setForm({ ...form, cbs_rate: e.target.value })} />
          </div>
          <div>
            <Label>IBS</Label>
            <Input value={form.ibs_rate} onChange={(e) => setForm({ ...form, ibs_rate: e.target.value })} />
          </div>
          <div>
            <Label>Setor</Label>
            <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
              <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="geral">Geral</SelectItem>
                <SelectItem value="saude">Saúde</SelectItem>
                <SelectItem value="educacao">Educação</SelectItem>
                <SelectItem value="transporte_coletivo">Transporte coletivo</SelectItem>
                <SelectItem value="cesta_basica">Cesta básica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Regime</Label>
            <Select value={form.regime} onValueChange={(v) => setForm({ ...form, regime: v })}>
              <SelectTrigger><SelectValue placeholder="Regime" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="padrao">Padrão</SelectItem>
                <SelectItem value="combustiveis">Combustíveis</SelectItem>
                <SelectItem value="financeiros">Serviços financeiros</SelectItem>
                <SelectItem value="planos_saude">Planos de saúde</SelectItem>
                <SelectItem value="agropecuaria">Agropecuária</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vigência</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={form.active_from} onChange={(e) => setForm({ ...form, active_from: e.target.value })} />
              <Input type="date" value={form.active_to} onChange={(e) => setForm({ ...form, active_to: e.target.value })} />
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex items-end">
            <Button type="submit">Salvar</Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="text-sm text-muted-foreground mb-2">Registros</div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Setor</th>
                  <th className="p-2 text-left">Regime</th>
                  <th className="p-2">CBS</th>
                  <th className="p-2">IBS</th>
                  <th className="p-2">Vigência</th>
                  <th className="p-2 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {params.map((p: any) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-2">{p.sector}</td>
                    <td className="p-2">{p.regime}</td>
                    <td className="p-2">{p.cbs_rate}</td>
                    <td className="p-2">{p.ibs_rate}</td>
                    <td className="p-2">{p.active_from} → {p.active_to || "-"}</td>
                    <td className="p-2 text-right">
                      <Button variant="secondary" size="sm" onClick={() => onEdit(p)}>Editar</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await del.mutateAsync(p.id);
                          toast({ title: "Parâmetro removido" });
                        }}
                      >Remover</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IvaRatesManager;
