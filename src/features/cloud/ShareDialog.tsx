import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; onCreated?: () => void }
interface CloudFile { id: string; name: string; path: string; size_bytes: number | null }

const sha256 = async (text: string) => {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
};

const ShareDialog: React.FC<Props> = ({ open, onOpenChange, onCreated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [password, setPassword] = useState("");
  const [maxDownloads, setMaxDownloads] = useState<string>("");
  const [expiresDays, setExpiresDays] = useState<string>("");
  const [watermark, setWatermark] = useState(false);
  const [antiPrint, setAntiPrint] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    supabase
      .from("cloud_files")
      .select("id,name,path,size_bytes")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setFiles((data as CloudFile[]) || []));
  }, [user, open]);

  const toggle = (id: string) => setSelected((p) => ({ ...p, [id]: !p[id] }));

  const onSubmit = async () => {
    if (!user) return;
    const fileIds = Object.keys(selected).filter((k) => selected[k]);
    if (fileIds.length === 0) return toast({ title: "Selecione ao menos um arquivo", variant: "destructive" });

    let password_hash: string | null = null;
    if (password.trim()) password_hash = await sha256(password.trim());

    const expires_at = expiresDays ? new Date(Date.now() + Number(expiresDays) * 24 * 3600 * 1000).toISOString() : null;
    const max_downloads = maxDownloads ? Number(maxDownloads) : null;

    const { data, error } = await supabase
      .from("shares")
      .insert({ owner_user_id: user.id, status: "active", password_hash, expires_at, max_downloads, watermark, anti_print: antiPrint, allow_download: true })
      .select("id")
      .single();

    if (error) return toast({ title: "Erro ao criar link", description: error.message, variant: "destructive" });

    const shareId = data!.id as string;
    const toInsert = fileIds.map((file_id) => ({ share_id: shareId, file_id }));
    const { error: sfErr } = await supabase.from("share_files").insert(toInsert);
    if (sfErr) return toast({ title: "Erro ao vincular arquivos", description: sfErr.message, variant: "destructive" });

    toast({ title: "Link criado com sucesso" });
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo link de compartilhamento</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Arquivos</Label>
            <div className="mt-2 grid gap-2 max-h-64 overflow-auto pr-2">
              {files.map((f) => (
                <label key={f.id} className="flex items-center justify-between gap-3 border rounded-md p-2">
                  <div className="truncate">
                    <input type="checkbox" className="mr-2" checked={!!selected[f.id]} onChange={() => toggle(f.id)} />
                    {f.name}
                  </div>
                  <span className="text-xs text-muted-foreground">{(f.size_bytes ?? 0) / 1024 ** 2 < 0.01 ? "" : `${((f.size_bytes ?? 0)/1024/1024).toFixed(2)} MB`}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Senha (opcional)</Label>
              <Input type="password" placeholder="Defina uma senha" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label>Limite de downloads</Label>
              <Input type="number" min={0} placeholder="Sem limite" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} />
            </div>
            <div>
              <Label>Expira em (dias)</Label>
              <Input type="number" min={0} placeholder="Nunca expira" value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)} />
            </div>
          </div>

          <Card>
            <CardContent className="p-3 grid grid-cols-2 gap-3">
              <label className="flex items-center justify-between">
                <span>Marca d'água</span>
                <Switch checked={watermark} onCheckedChange={setWatermark} />
              </label>
              <label className="flex items-center justify-between">
                <span>Anti-print</span>
                <Switch checked={antiPrint} onCheckedChange={setAntiPrint} />
              </label>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={onSubmit}>Criar link</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
