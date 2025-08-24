import React, { useEffect, useMemo, useState } from "react";
import CloudLayout from "@/features/cloud/CloudLayout";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Copy, Link2, Shield, Droplets, Eye, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ShareDialog from "@/features/cloud/ShareDialog";

interface ShareRow {
  id: string;
  status: "active" | "expired" | "revoked";
  created_at: string;
  expires_at: string | null;
  downloads_count: number;
  max_downloads: number | null;
  watermark: boolean;
  anti_print: boolean;
}

const CloudShared: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from("shares")
      .select("id,status,created_at,expires_at,downloads_count,max_downloads,watermark,anti_print")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) setRows(data as ShareRow[]);
  };

  useEffect(() => { load(); }, [user]);

  const baseUrl = useMemo(() => window.location.origin, []);
  const copy = (id: string) => {
    navigator.clipboard.writeText(`${baseUrl}/s/${id}`);
    toast({ title: "Link copiado" });
  };

  return (
    <CloudLayout>
      <Seo title="Cloud • Compartilhados" description="Gerencie seus links de compartilhamento com senha, limite e marca d'água." />
      <section className="grid grid-cols-12 gap-6">
        <Card className="rounded-2xl col-span-12">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Links de compartilhamento</CardTitle>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4"/> Novo link</Button>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">Você ainda não criou links. Clique em "Novo link" para começar.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Políticas</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.status}</TableCell>
                      <TableCell>{s.downloads_count}/{s.max_downloads ?? "∞"}</TableCell>
                      <TableCell className="flex gap-2 items-center">
                        {s.watermark && <Droplets className="h-4 w-4" aria-label="Marca d'água" />}
                        {s.anti_print && <Shield className="h-4 w-4" aria-label="Anti-print" />}
                      </TableCell>
                      <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => copy(s.id)}><Copy className="mr-2 h-4 w-4"/>Copiar</Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(`${baseUrl}/s/${s.id}`, "_blank")}> <Eye className="mr-2 h-4 w-4"/>Abrir</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <ShareDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </CloudLayout>
  );
};

export default CloudShared;
