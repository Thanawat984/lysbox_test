import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIvaOperations, groupMonthly } from "./hooks/useIva";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from "recharts";
import * as XLSX from "xlsx";

interface Props {
  companyId?: string;
  from?: string;
  to?: string;
}

const IvaDashboard: React.FC<Props> = ({ companyId, from, to }) => {
  const { data: ops = [], isLoading } = useIvaOperations(companyId, from, to);
  const monthly = useMemo(() => groupMonthly(ops), [ops]);
  const totals = useMemo(() => {
    return ops.reduce(
      (acc, o) => {
        if (o.credit_debit === "credito") acc.credito += Number(o.iva_total);
        else acc.debito += Number(o.iva_total);
        acc.liquido = acc.debito - acc.credito;
        return acc;
      },
      { credito: 0, debito: 0, liquido: 0 }
    );
  }, [ops]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(ops);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "IVA");
    XLSX.writeFile(wb, "iva_operacoes.xlsx");
  };

  const exportCsv = () => {
    const rows = [
      ["op_date","op_type","party_name","party_cnpj","amount_without_tax","cbs_rate","ibs_rate","iva_total","credit_debit"],
      ...ops.map(o => [o.op_date, o.op_type, o.party_name || "", o.party_cnpj || "", o.amount_without_tax, o.cbs_rate, o.ibs_rate, o.iva_total, o.credit_debit])
    ];
    const csv = rows.map(r => r.map(String).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iva_operacoes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Compras x Vendas (IVA)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                <Bar dataKey="credito" name="Crédito (compras)" fill="hsl(var(--accent))" />
                <Bar dataKey="debito" name="Débito (vendas)" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolução do IVA (líquido)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <XAxis dataKey="month" /><YAxis /><Tooltip />
              <Line dataKey="liquido" name="Líquido" stroke="hsl(var(--primary))" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Indicadores e Exportação</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm">
            <div>Crédito acumulado: <strong>{totals.credito.toFixed(2)}</strong></div>
            <div>Débito acumulado: <strong>{totals.debito.toFixed(2)}</strong></div>
            <div>Saldo líquido (devido): <strong>{totals.liquido.toFixed(2)}</strong></div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportCsv}>Exportar CSV</Button>
            <Button onClick={exportExcel}>Exportar Excel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IvaDashboard;
