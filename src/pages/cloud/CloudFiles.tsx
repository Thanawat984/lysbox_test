import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Seo from "@/components/Seo";
import CloudLayout from "@/features/cloud/CloudLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Eye, Download, Share2, MoveRight, Star, StarOff, Trash2, UploadCloud, Loader2 } from "lucide-react";

interface CloudFileRow {
  id: string;
  user_id: string;
  bucket: string;
  path: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  deleted_at: string | null;
}

const ACCEPT = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "video/mp4",
  "application/zip",
];

const fmtSize = (n?: number | null) => {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB"]; const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
};

const FileCard: React.FC<{
  file: CloudFileRow;
  favorited: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onFavorite: () => void;
  onDelete: () => void;
}> = ({ file, favorited, onPreview, onDownload, onFavorite, onDelete }) => {
  return (
    <article className="rounded-lg border bg-card p-3 hover-scale animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium line-clamp-1" title={file.name}>{file.name}</h3>
          <div className="text-xs text-muted-foreground mt-1">
            {fmtSize(file.size_bytes)} • {new Date(file.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onPreview} title="Visualizar"><Eye /></Button>
          <Button variant="ghost" size="sm" onClick={onDownload} title="Download"><Download /></Button>
          <Button variant="ghost" size="sm" onClick={() => {}} title="Compartilhar" disabled><Share2 /></Button>
          <Button variant="ghost" size="sm" onClick={() => {}} title="Mover" disabled><MoveRight /></Button>
          <Button variant="ghost" size="sm" onClick={onFavorite} title={favorited ? "Remover dos favoritos" : "Favoritar"}>
            {favorited ? <StarOff /> : <Star />}
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} title="Enviar para a Lixeira"><Trash2 /></Button>
        </div>
      </div>
    </article>
  );
};

const CloudFiles: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<CloudFileRow[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: rows }, { data: favs }] = await Promise.all([
      supabase
        .from("cloud_files")
        .select("id,user_id,bucket,path,name,mime_type,size_bytes,created_at,deleted_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("cloud_favorites")
        .select("file_id")
        .eq("user_id", user.id),
    ]);
    setFiles(rows || []);
    setFavorites((favs || []).reduce((acc, r) => ({ ...acc, [r.file_id]: true }), {} as Record<string, boolean>));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onUpload = async (fileList: FileList | null) => {
    if (!user || !fileList?.length) return;
    setUploading(true);
    const total = fileList.length;
    let done = 0;

    for (const file of Array.from(fileList)) {
      try {
        const currentYear = new Date().getFullYear();
        const fileName = `${Date.now()}-${file.name}`;
        const path = `u/${user.id}/${currentYear}/${fileName}`;
        
        // 1) Pede URL presignada
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) throw new Error("Não autenticado");
        
        const r = await fetch(`https://lwszqmnbgvwklgsyfdrz.supabase.co/functions/v1/s3-presign`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            mode: 'put', 
            path: path, 
            contentType: file.type 
          })
        });
        
        if (!r.ok) {
          const errorData = await r.text();
          throw new Error(`Falha ao obter URL: ${errorData}`);
        }
        
        const { url } = await r.json();

        // 2) Envia direto pro R2
        const uploadResponse = await fetch(url, { 
          method: 'PUT', 
          body: file, 
          headers: { 'Content-Type': file.type } 
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`Falha no upload para R2: ${uploadResponse.statusText}`);
        }

        // 3) Registra no banco
        const { error: insErr } = await supabase.from("cloud_files").upsert({
          user_id: user.id,
          bucket: "user-files",
          path,
          name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          deleted_at: null,
          original_path: null,
        }, { onConflict: "user_id,path" });
        if (insErr) throw insErr;
        
      } catch (e: any) {
        console.error(e);
        toast({ title: "Falha no upload", description: e.message, variant: "destructive" });
      } finally {
        done += 1;
        setProgress(Math.round((done / total) * 100));
      }
    }

    setUploading(false);
    setProgress(0);
    toast({ title: "Upload concluído", description: `${total} arquivo(s) enviado(s).` });
    load();
  };

  const requestSignedUrl = async (path: string) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) throw new Error("Não autenticado");
    
    const r = await fetch(`https://lwszqmnbgvwklgsyfdrz.supabase.co/functions/v1/s3-presign`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session.session.access_token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ mode: 'get', path })
    });
    
    if (!r.ok) {
      throw new Error(`Falha ao obter URL: ${await r.text()}`);
    }
    
    const { url } = await r.json();
    return url;
  };

  const handlePreview = async (f: CloudFileRow) => {
    try {
      const url = await requestSignedUrl(f.path);
      window.open(url, "_blank");
    } catch (e: any) {
      toast({ title: "Erro ao visualizar", description: e.message, variant: "destructive" });
    }
  };

  const handleDownload = async (f: CloudFileRow) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error("Não autenticado");
      
      const r = await fetch(`https://lwszqmnbgvwklgsyfdrz.supabase.co/functions/v1/s3-presign`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.session.access_token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ mode: 'get', path: f.path })
      });
      
      if (!r.ok) {
        throw new Error(`Falha ao obter URL: ${await r.text()}`);
      }
      
      const { url } = await r.json();
      window.location.href = url; // ou abrir no viewer/download local
    } catch (e: any) {
      toast({ title: "Erro ao baixar", description: e.message, variant: "destructive" });
    }
  };

  const toggleFavorite = async (f: CloudFileRow) => {
    if (!user) return;
    try {
      if (favorites[f.id]) {
        const { error } = await supabase
          .from("cloud_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("file_id", f.id);
        if (error) throw error;
        setFavorites((prev) => ({ ...prev, [f.id]: false }));
      } else {
        const { error } = await supabase
          .from("cloud_favorites")
          .insert({ user_id: user.id, file_id: f.id });
        if (error) throw error;
        setFavorites((prev) => ({ ...prev, [f.id]: true }));
      }
    } catch (e: any) {
      toast({ title: "Erro nos favoritos", description: e.message, variant: "destructive" });
    }
  };

  const sendToTrash = async (f: CloudFileRow) => {
    if (!user) return;
    try {
      const trashPath = `${user.id}/.trash/${Date.now()}-${f.name}`;
      const { error: mvErr } = await supabase.storage.from("user-files").move(f.path, trashPath);
      if (mvErr) throw mvErr;
      const { error: upErr } = await supabase
        .from("cloud_files")
        .update({ path: trashPath, deleted_at: new Date().toISOString(), original_path: f.path })
        .eq("id", f.id)
        .eq("user_id", user.id);
      if (upErr) throw upErr;
      toast({ title: "Movido para a Lixeira", description: f.name });
      setFiles((prev) => prev.filter((x) => x.id !== f.id));
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onUpload(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const uploadingLabel = useMemo(() => (uploading ? `Enviando… ${progress}%` : "Enviar Arquivos"), [uploading, progress]);

  return (
    <CloudLayout>
      <Seo title="Cloud • Meus Arquivos" description="Envie e gerencie seus arquivos na nuvem." />
      <div className="grid grid-cols-12 gap-6">
        <Card className="rounded-2xl bg-white/10 border-white/15 backdrop-blur-sm col-span-12 lg:col-span-5">
          <CardHeader>
            <CardTitle>Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border border-dashed rounded-lg p-6 text-center"
              onDrop={onDrop}
              onDragOver={onDragOver}
            >
              Arraste seus arquivos aqui ou
              <Button
                variant="secondary"
                className="ml-2"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <UploadCloud className="mr-2 h-4 w-4" /> {uploadingLabel}
              </Button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPT.join(",")}
                className="hidden"
                onChange={(e) => onUpload(e.target.files)}
              />
              {uploading && (
                <div className="mt-4">
                  <Progress value={progress} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-white/10 border-white/15 backdrop-blur-sm col-span-12 lg:col-span-7">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Arquivos recentes</CardTitle>
            <div className="text-sm text-muted-foreground">{files.length} itens</div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Carregando…</div>
            ) : files.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum arquivo ainda. Faça upload para começar.</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {files.map((f) => (
                  <FileCard
                    key={f.id}
                    file={f}
                    favorited={!!favorites[f.id]}
                    onPreview={() => handlePreview(f)}
                    onDownload={() => handleDownload(f)}
                    onFavorite={() => toggleFavorite(f)}
                    onDelete={() => sendToTrash(f)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CloudLayout>
  );
};

export default CloudFiles;
