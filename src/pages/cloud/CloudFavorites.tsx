import React, { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import CloudLayout from "@/features/cloud/CloudLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Download, StarOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Row { id: string; path: string; name: string; created_at: string; }

const CloudFavorites: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("cloud_favorites")
        .select("file:cloud_files(id,path,name,created_at)")
        .eq("user_id", user.id);
      if (error) return;
      setRows((data || []).map((r: any) => r.file));
    };
    load();
  }, [user]);

  const signed = async (path: string) => {
    const { data, error } = await supabase.storage.from("user-files").createSignedUrl(path, 60);
    if (error) throw error;
    return data.signedUrl;
  };

  const removeFavorite = async (fileId: string) => {
    if (!user) return;
    const { error } = await supabase.from("cloud_favorites").delete().eq("user_id", user.id).eq("file_id", fileId);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setRows((prev) => prev.filter((r) => r.id !== fileId));
  };

  return (
    <CloudLayout>
      <section className="grid grid-cols-12 gap-6">
        <Card className="rounded-2xl bg-white/10 border-white/15 backdrop-blur-sm col-span-12">
          <CardHeader><CardTitle>Favoritos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rows.map((f) => (
                <article key={f.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium line-clamp-1" title={f.name}>{f.name}</h3>
                      <div className="text-xs text-muted-foreground mt-1">{new Date(f.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={async () => { const url = await signed(f.path); window.open(url, "_blank"); }} title="Visualizar"><Eye /></Button>
                      <Button variant="ghost" size="sm" onClick={async () => { const url = await signed(f.path); window.open(url, "_blank"); }} title="Download"><Download /></Button>
                      <Button variant="ghost" size="sm" onClick={() => removeFavorite(f.id)} title="Remover favorito"><StarOff /></Button>
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

export default CloudFavorites;
