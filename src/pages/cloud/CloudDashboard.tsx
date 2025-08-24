// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import Seo from "@/components/Seo";
import CloudLayout from "@/features/cloud/CloudLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  Star,
  Trash2,
  Clock,
  File as FileIcon,
  Link2,
  Share2,
  Shield,
  Settings,
  Info,
  Image,
  Download,
  Eye,
  EyeOff,
  LockKeyhole,
  TimerReset,
  Plus,
  FolderPlus,
  Search,
  Loader2,
  Send,
} from "lucide-react";

/** UTIL **/
const formatBytes = (bytes?: number | null) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};
const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : "—");

/** TYPES **/
interface Profile { id: string; plan_code: string; ai_enabled: boolean }
interface QuotaRow { quota_bytes: number }
interface CloudFile { id: string; name: string; size_bytes: number | null; updated_at: string; mime_type: string | null; path: string; }
interface ShareRow { id: string; title: string | null; created_at: string; expires_at: string | null; status: "active" | "expired" | "revoked"; target_url: string; meta: any }

/** SHARE MODAL (config avançada) **/
const ShareLinkModal: React.FC<{
  fileId?: string;
  defaultTitle?: string;
  onCreated?: (s: ShareRow) => void;
}> = ({ fileId, defaultTitle, onCreated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // opções de segurança do link
  const [title, setTitle] = useState(defaultTitle || "Compartilhamento");
  const [password, setPassword] = useState("");
  const [downloadLimit, setDownloadLimit] = useState<number | undefined>(undefined);
  const [expiresAt, setExpiresAt] = useState<string | null>(null); // ISO string
  const [allowDownload, setAllowDownload] = useState(true);
  const [viewOnly, setViewOnly] = useState(true);
  const [antiPrint, setAntiPrint] = useState(true);

  // marca d'água
  const [wmEnabled, setWmEnabled] = useState(true);
  const [wmType, setWmType] = useState<'text'|'image'>("text");
  const [wmText, setWmText] = useState("Lysbox");
  const [wmOpacity, setWmOpacity] = useState(30);
  const [wmPosition, setWmPosition] = useState<'center'|'top-left'|'top-right'|'bottom-left'|'bottom-right'>("center");

  const reset = () => {
    setPassword(""); setDownloadLimit(undefined); setExpiresAt(null);
    setAllowDownload(true); setViewOnly(true); setAntiPrint(true);
    setWmEnabled(true); setWmType("text"); setWmText("Lysbox"); setWmOpacity(30); setWmPosition("center");
  };

  const createShare = async () => {
    if (!user || !fileId) return;
    setSaving(true);
    try {
      const payload = {
        owner_id: user.id,
        file_id: fileId,
        title,
        status: "active",
        target_url: "", // backend gera slug curto
        expires_at: expiresAt,
        meta: {
          security: {
            password: password || null,
            downloadLimit: downloadLimit ?? null,
            allowDownload,
            viewOnly,
            antiPrint,
          },
          watermark: wmEnabled ? { type: wmType, text: wmText, opacity: wmOpacity, position: wmPosition } : null,
        },
      };
      const { data, error } = await supabase.from("shares").insert(payload).select("id,title,created_at,expires_at,status,target_url,meta").single();
      if (error) throw error;
      toast({ title: "Link criado!", description: "As políticas de segurança foram aplicadas." });
      setOpen(false);
      reset();
      if (onCreated) onCreated(data as ShareRow);
    } catch (e: any) {
      toast({ title: "Falha ao criar link", description: e?.message ?? "Tente novamente", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary"><Share2 className="mr-2 h-4 w-4"/> Compartilhar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo link de compartilhamento</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Álbum de fotos do evento"/>
          </div>

          <div className="col-span-12 sm:col-span-6">
            <Label>Proteção por senha</Label>
            <Input type="text" placeholder="Opcional" value={password} onChange={(e)=>setPassword(e.target.value)} />
          </div>
          <div className="col-span-6 sm:col-span-3">
            <Label>Limite de downloads</Label>
            <Input type="number" placeholder="∞" value={downloadLimit ?? ''} onChange={(e)=>setDownloadLimit(e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div className="col-span-6 sm:col-span-3">
            <Label>Expira em (YYYY-MM-DD)</Label>
            <Input type="date" value={expiresAt ? expiresAt.substring(0,10) : ''} onChange={(e)=>setExpiresAt(e.target.value ? new Date(e.target.value).toISOString() : null)} />
          </div>

          <div className="col-span-12 grid grid-cols-12 gap-4">
            <div className="col-span-6">
              <Label className="flex items-center gap-2"><Download className="h-4 w-4"/> Permitir download</Label>
              <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
            </div>
            <div className="col-span-6">
              <Label className="flex items-center gap-2"><Eye className="h-4 w-4"/> Somente visualização</Label>
              <Switch checked={viewOnly} onCheckedChange={setViewOnly} />
            </div>
            <div className="col-span-6">
              <Label className="flex items-center gap-2"><Shield className="h-4 w-4"/> Anti‑print</Label>
              <Switch checked={antiPrint} onCheckedChange={setAntiPrint} />
            </div>
            <div className="col-span-6">
              <Label className="flex items-center gap-2"><Image className="h-4 w-4"/> Marca d'água</Label>
              <Switch checked={wmEnabled} onCheckedChange={setWmEnabled} />
            </div>
          </div>

          {wmEnabled && (
            <div className="col-span-12 grid grid-cols-12 gap-4">
              <div className="col-span-6">
                <Label>Tipo</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">{wmType === 'text' ? 'Texto' : 'Imagem'}<span>▼</span></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={()=>setWmType('text')}>Texto</DropdownMenuItem>
                    <DropdownMenuItem onClick={()=>setWmType('image')}>Imagem</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {wmType === 'text' && (
                <div className="col-span-6">
                  <Label>Texto</Label>
                  <Input value={wmText} onChange={(e)=>setWmText(e.target.value)} />
                </div>
              )}
              <div className="col-span-12">
                <Label>Opacidade ({wmOpacity}%)</Label>
                <Slider value={[wmOpacity]} min={0} max={100} step={1} onValueChange={(v)=>setWmOpacity(v[0])} />
              </div>
              <div className="col-span-12">
                <Label>Posição</Label>
                <div className="flex flex-wrap gap-2">
                  {(['center','top-left','top-right','bottom-left','bottom-right'] as const).map(pos => (
                    <Button key={pos} variant={wmPosition===pos? 'secondary':'outline'} size="sm" onClick={()=>setWmPosition(pos)}>{pos}</Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button>
          <Button onClick={createShare} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Criar link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** DASHBOARD **/
const CloudOnlyDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [quota, setQuota] = useState<number>(50 * 1024 * 1024 * 1024); // fallback 50GB
  const [used, setUsed] = useState<number>(0);
  const [filesCount, setFilesCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [recentFiles, setRecentFiles] = useState<CloudFile[]>([]);
  const [favoriteFiles, setFavoriteFiles] = useState<CloudFile[]>([]);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const percent = useMemo(() => Math.min(100, Math.round((used / quota) * 100)), [used, quota]);
  const lastActivity = useMemo(() => recentFiles[0]?.updated_at ?? null, [recentFiles]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [profRes, quotaRes] = await Promise.all([
          supabase.from("profiles").select("id,plan_code,ai_enabled").eq("id", user.id).single(),
          supabase.from("storage_quotas").select("quota_bytes").eq("user_id", user.id).single(),
        ]);
        if (profRes.data) setProfile(profRes.data as Profile);
        if (quotaRes.data?.quota_bytes) setQuota(Number((quotaRes.data as QuotaRow).quota_bytes));

        const [usedRes, activeCountRes, trashCountRes, favCountRes] = await Promise.all([
          supabase.from("cloud_files").select("size_bytes").eq("user_id", user.id).is("deleted_at", null),
          supabase.from("cloud_files").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
          supabase.from("cloud_files").select("id", { count: "exact", head: true }).eq("user_id", user.id).not("deleted_at", "is", null),
          supabase.from("cloud_favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);
        const usedTotal = (usedRes.data || []).reduce((acc: number, r: any) => acc + (Number(r.size_bytes) || 0), 0);
        setUsed(usedTotal);
        setFilesCount(activeCountRes.count || 0);
        setTrashCount(trashCountRes.count || 0);
        setFavoritesCount(favCountRes.count || 0);

        const [recentRes, favIdsRes, sharesRes] = await Promise.all([
          supabase.from("cloud_files").select("id,name,size_bytes,updated_at,mime_type,path").eq("user_id", user.id).is("deleted_at", null).order("updated_at", { ascending: false }).limit(10),
          supabase.from("cloud_favorites").select("file_id").eq("user_id", user.id),
          supabase.from("shares").select("id,title,created_at,expires_at,status,target_url,meta").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(10),
        ]);
        setRecentFiles((recentRes.data as CloudFile[]) || []);
        const favIds = (favIdsRes.data || []).map((r: any) => r.file_id);
        if (favIds.length) {
          const favFilesRes = await supabase.from("cloud_files").select("id,name,size_bytes,updated_at,mime_type,path").in("id", favIds).order("updated_at", { ascending: false }).limit(10);
          setFavoriteFiles((favFilesRes.data as CloudFile[]) || []);
        } else setFavoriteFiles([]);
        setShares((sharesRes.data as ShareRow[]) || []);
      } catch (e: any) {
        console.error(e);
        toast({ title: "Erro ao carregar painel", description: e?.message ?? "Tente novamente" });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, toast]);

  const filteredRecent = useMemo(() => {
    if (!query) return recentFiles;
    const q = query.toLowerCase();
    return recentFiles.filter(f => (f.name || "").toLowerCase().includes(q));
  }, [recentFiles, query]);

  return (
    <CloudLayout>
      <Seo title="Lysbox Cloud • Painel do Usuário" description="Armazenamento inteligente, compartilhamentos avançados e organização opcional por IA." />

      {/* Topbar – estilo pCloud: Upload, Nova Pasta, Busca */}
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate("/cloud/files/upload")}><UploadCloud className="mr-2 h-4 w-4"/> Upload</Button>
          <Button variant="outline" onClick={() => navigate("/cloud/files/new-folder")}><FolderPlus className="mr-2 h-4 w-4"/> Nova pasta</Button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-96">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60"/>
            <Input placeholder="Buscar arquivos" value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-8" />
          </div>
          <Button variant="outline" onClick={() => navigate("/cloud/settings")}><Settings className="mr-2 h-4 w-4"/> Configurações</Button>
        </div>
      </header>

      {/* Alerts – armazenamento quase cheio */}
      {percent >= 90 && (
        <Alert className="mb-4">
          <AlertTitle>Armazenamento quase cheio ({percent}%).</AlertTitle>
          <AlertDescription>
            Limpe a <button className="underline" onClick={()=>navigate("/cloud/trash")}>lixeira</button> ou faça <button className="underline" onClick={()=>navigate("/billing/plan")}>upgrade de plano</button>.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs – arquivos, favoritos, lixeira, última atividade */}
      <div className="grid grid-cols-12 gap-6">
        <Card className="rounded-2xl col-span-12 sm:col-span-6 lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Arquivos</CardTitle></CardHeader>
          <CardContent className="flex items-baseline justify-between">
            <div className="text-3xl font-semibold">{filesCount}</div>
            <Badge variant="secondary">Ativos</Badge>
          </CardContent>
        </Card>
        <Card className="rounded-2xl col-span-12 sm:col-span-6 lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Favoritos</CardTitle></CardHeader>
          <CardContent className="flex items-baseline justify-between">
            <div className="text-3xl font-semibold">{favoritesCount}</div>
            <Badge variant="outline">Marcados</Badge>
          </CardContent>
        </Card>
        <Card className="rounded-2xl col-span-12 sm:col-span-6 lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Lixeira</CardTitle></CardHeader>
          <CardContent className="flex items-baseline justify-between">
            <div className="text-3xl font-semibold">{trashCount}</div>
            <Badge variant="destructive">Itens</Badge>
          </CardContent>
        </Card>
        <Card className="rounded-2xl col-span-12 sm:col-span-6 lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Última atividade</CardTitle></CardHeader>
          <CardContent className="flex items-baseline justify-between">
            <div className="text-xl font-medium">{lastActivity ? formatDate(lastActivity) : "—"}</div>
            <Clock className="h-5 w-5 opacity-70" />
          </CardContent>
        </Card>

        {/* Uso de armazenamento */}
        <Card className="rounded-2xl col-span-12 lg:col-span-7">
          <CardHeader><CardTitle>Uso de Armazenamento</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>{formatBytes(used)} usados</span>
              <span>{formatBytes(quota)} disponíveis</span>
            </div>
            <Progress value={percent} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/cloud/trash")}><Trash2 className="mr-2 h-4 w-4"/> Lixeira</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate("/billing/plan")}>Aumentar espaço</Button>
            </div>
          </CardContent>
        </Card>

        {/* IA de Organização (opcional por plano) */}
        <Card className="rounded-2xl col-span-12 lg:col-span-5">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Assistente de Organização por IA</CardTitle>
            <Badge variant={profile?.ai_enabled ? "secondary" : "outline"}>{profile?.ai_enabled ? "Ativo" : "Inativo"}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Classifica arquivos automaticamente por tipo, data e contexto (ex.: fotos por evento, documentos por assunto). Controlado pelo plano e pelo Super Admin.</p>
            <div className="flex gap-2">
              <Button onClick={()=>navigate("/cloud/ai-organizer")}>Abrir painel da IA</Button>
              <Button variant="outline" onClick={()=>navigate("/billing/plan")}>Alterar plano</Button>
            </div>
          </CardContent>
        </Card>

        {/* Listas com Tabs – Recentes, Favoritos, Compartilhamentos */}
        <Card className="rounded-2xl col-span-12">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Arquivos e Compartilhamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="recent" className="w-full">
              <TabsList className="mb-3">
                <TabsTrigger value="recent">Arquivos recentes</TabsTrigger>
                <TabsTrigger value="favorites">Favoritos</TabsTrigger>
                <TabsTrigger value="shares">Links de compartilhamento</TabsTrigger>
              </TabsList>

              <TabsContent value="recent">
                {loading ? (
                  <div className="text-sm text-muted-foreground">Carregando…</div>
                ) : filteredRecent.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhum arquivo encontrado.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arquivo</TableHead>
                        <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                        <TableHead className="hidden sm:table-cell">Tamanho</TableHead>
                        <TableHead>Atualizado</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecent.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium flex items-center gap-2"><FileIcon className="h-4 w-4" /> {f.name}</TableCell>
                          <TableCell className="hidden sm:table-cell">{f.mime_type || "—"}</TableCell>
                          <TableCell className="hidden sm:table-cell">{formatBytes(f.size_bytes)}</TableCell>
                          <TableCell>{formatDate(f.updated_at)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={()=>navigate(`/cloud/files?path=${encodeURIComponent(f.path)}`)}>Abrir</Button>
                              <ShareLinkModal fileId={f.id} defaultTitle={f.name} onCreated={(s)=>setShares(prev=>[s,...prev])} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="favorites">
                {loading ? (
                  <div className="text-sm text-muted-foreground">Carregando…</div>
                ) : favoriteFiles.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Você ainda não favoritou arquivos.</div>
                ) : (
                  <ul className="space-y-3">
                    {favoriteFiles.map((f) => (
                      <li key={f.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><Star className="h-4 w-4 opacity-80" />
                          <button className="font-medium hover:underline" onClick={() => navigate(`/cloud/files?path=${encodeURIComponent(f.path)}`)}>{f.name}</button>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatBytes(f.size_bytes)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="shares">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Gerencie seus links com senha, expiração, limite de downloads, anti‑print e marca d'água.</div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline"><Plus className="mr-2 h-4 w-4"/> Novo link vazio</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Criar link sem arquivo vinculado</DialogTitle></DialogHeader>
                      <p className="text-sm text-muted-foreground">Opcional: você poderá anexar arquivos depois, pela tela do link.</p>
                      <DialogFooter>
                        <Button variant="outline">Cancelar</Button>
                        <Button disabled>Em breve</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {shares.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Você ainda não criou links de compartilhamento.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Criado</TableHead>
                        <TableHead>Expira</TableHead>
                        <TableHead>Políticas</TableHead>
                        <TableHead>Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shares.map((s) => (
                        <TableRow key={s.id} className="hover:cursor-pointer" onClick={()=>navigate(`/cloud/shares/${s.id}`)}>
                          <TableCell>
                            <Badge variant={s.status === 'active' ? 'secondary' : 'outline'}>{s.status}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{s.title || 'Link'}</TableCell>
                          <TableCell>{formatDate(s.created_at)}</TableCell>
                          <TableCell>{s.expires_at ? formatDate(s.expires_at) : '—'}</TableCell>
                          <TableCell className="text-xs">
                            {(s.meta?.security?.password) && <span className="inline-flex items-center gap-1 mr-2"><LockKeyhole className="h-3 w-3"/> senha</span>}
                            {(s.meta?.security?.downloadLimit) && <span className="inline-flex items-center gap-1 mr-2"><TimerReset className="h-3 w-3"/> limite</span>}
                            {(s.meta?.security?.antiPrint) && <span className="inline-flex items-center gap-1 mr-2"><EyeOff className="h-3 w-3"/> anti‑print</span>}
                            {(s.meta?.watermark) && <span className="inline-flex items-center gap-1 mr-2"><Image className="h-3 w-3"/> marca d'água</span>}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={(e)=>{e.stopPropagation(); navigator.clipboard.writeText(s.target_url || window.location.origin+`/s/${s.id}`);}}>Copiar</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </CloudLayout>
  );
};

export default CloudOnlyDashboard;
