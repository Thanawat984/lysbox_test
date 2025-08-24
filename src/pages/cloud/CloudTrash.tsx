import React, { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import CloudLayout from "@/features/cloud/CloudLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Row { id: string; path: string; name: string; original_path: string | null; }

const CloudTrash: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("cloud_files")
        .select("id,path,name,original_path")
        .eq("user_id", user.id)
        .not("deleted_at", "is", null)
        .order("updated_at", { ascending: false });
      setRows(data || []);
    };
    load();
  }, [user]);

  const restore = async (r: Row) => {
    if (!user) return;
    const target = r.original_path || `${user.id}/${r.name}`;
    try {
      const { error: mvErr } = await supabase.storage.from("user-files").move(r.path, target);
      if (mvErr) throw mvErr;
      const { error: upErr } = await supabase
        .from("cloud_files")
        .update({ path: target, deleted_at: null, original_path: null })
        .eq("id", r.id)
        .eq("user_id", user.id);
      if (upErr) throw upErr;
      setRows((prev) => prev.filter((x) => x.id !== r.id));
      toast({ title: "Restaurado", description: r.name });
    } catch (e: any) {
      toast({ title: "Erro ao restaurar", description: e.message, variant: "destructive" });
    }
  };

  const purge = async (r: Row) => {
    if (!user) return;
    try {
      const { error: delErr } = await supabase.storage.from("user-files").remove([r.path]);
      if (delErr) throw delErr;
      const { error: dbErr } = await supabase.from("cloud_files").delete().eq("id", r.id).eq("user_id", user.id);
      if (dbErr) throw dbErr;
      setRows((prev) => prev.filter((x) => x.id !== r.id));
      toast({ title: "Excluído permanentemente", description: r.name });
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  return (
    <CloudLayout>
      <Seo title="Cloud • Lixeira" description="Arquivos excluídos (restaurar ou excluir permanentemente)." />
      <section className="grid grid-cols-12 gap-6">
        <Card className="rounded-2xl bg-white/10 border-white/15 backdrop-blur-sm col-span-12">
          <CardHeader><CardTitle>Lixeira</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rows.map((r) => (
                <article key={r.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium line-clamp-1" title={r.name}>{r.name}</h3>
                      <div className="text-xs text-muted-foreground mt-1">{r.path}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => restore(r)} title="Restaurar"><RotateCcw /></Button>
                      <Button variant="destructive" size="sm" onClick={() => purge(r)} title="Excluir permanentemente"><Trash2 /></Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </CloudLayout>
  );
};

export default CloudTrash;
