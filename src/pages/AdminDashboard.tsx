import React, { useEffect, useMemo, useRef, useState } from "react";
// NOTE: Self-contained for sandboxes: no path aliases ("@/") required.
// In your real app, replace the inline UI with your design-system and import your Supabase client.

// ---- Minimal UI primitives (drop-in replacements) ---------------------------------------------
// Only what's used here. Swap them for your real components in-app.

type DivProps = React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean };
export const Card: React.FC<DivProps> = ({ className = "", children, ...p }) => (
  <div className={`rounded-2xl border p-0 ${className}`} {...p}>{children}</div>
);
export const CardHeader: React.FC<DivProps> = ({ className = "", children, ...p }) => (
  <div className={`p-4 border-b ${className}`} {...p}>{children}</div>
);
export const CardContent: React.FC<DivProps> = ({ className = "", children, ...p }) => (
  <div className={`p-4 ${className}`} {...p}>{children}</div>
);
export const CardTitle: React.FC<DivProps> = ({ className = "", children, ...p }) => (
  <h3 className={`text-base font-semibold ${className}`} {...p}>{children}</h3>
);
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" | "outline" | "destructive"; size?: "sm" | "md" | "lg" }> = ({ className = "", variant = "default", size = "md", children, ...p }) => {
  const v = { default: "bg-black text-white", secondary: "bg-gray-200 text-black", outline: "border", destructive: "bg-red-600 text-white" }[variant];
  const s = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2", lg: "px-5 py-3 text-lg" }[size];
  return <button className={`rounded-xl ${v} ${s} ${className}`} {...p}>{children}</button>;
};
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = "", ...p }) => (
  <input className={`rounded-xl border px-3 py-2 ${className}`} {...p} />
);
export const Badge: React.FC<DivProps & { variant?: "default" | "secondary" | "outline" | "destructive" | "success" }> = ({ className = "", variant = "default", children, ...p }) => {
  const v = { default: "bg-black text-white", secondary: "bg-gray-200", outline: "border", destructive: "bg-red-600 text-white",  success: "bg-green-600 text-white" }[variant];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs ${v} ${className}`} {...p}>{children}</span>;
};
export const Separator: React.FC = () => <hr className="border-gray-200" />;
export const ScrollArea: React.FC<DivProps & { height?: number | string }> = ({ className = "", height = 540, children, ...p }) => (
  <div className={`overflow-y-auto pr-2 ${className}`} style={{ maxHeight: typeof height === 'number' ? `${height}px` : height }} {...p}>{children}</div>
);
// Layout placeholders
const PlainLayout: React.FC<DivProps> = ({ children }) => <div className="max-w-7xl mx-auto p-4">{children}</div>;
const Seo: React.FC<{ title: string; description?: string }> = () => null;

// ---- Icons -------------------------------------------------------------------------------------
import { AlertTriangle, MessageSquare, Clock, Users, Search, Filter, Shield, RefreshCcw, Eye, Lock, LogOut, Bot, Mail, Phone, CheckCircle2, Hand } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ---- Supabase loader (falls back to MOCK when env not provided) --------------------------------
// Provide SUPABASE_URL and SUPABASE_ANON_KEY on window/globalThis to enable live mode in sandbox.
// In your app, delete this section and import your configured client instead.
// let __supabase: any = null;
// async function getSupabase() {
//   try {
//     if (__supabase) return __supabase;
//     const url = (globalThis as any).SUPABASE_URL;
//     const key = (globalThis as any).SUPABASE_ANON_KEY;
//     if (!url || !key) return null;
//     // IMPORTANT: avoid toolchain rewriting (jsdelivr +esm) by using a constant and vite-ignore
//     const SUPABASE_ESM = "https://esm.sh/@supabase/supabase-js@2";
//     // @ts-ignore
//     const mod = await import(/* @vite-ignore */ SUPABASE_ESM);
//     __supabase = mod.createClient(url, key);
//     return __supabase;
//   } catch (e) {
//     console.warn("Supabase client not available, using MOCK data.");
//     return null;
//   }
// }

// ---- Types -------------------------------------------------------------------------------------
export type Ticket = {
  id: string;
  subject: string;
  status: "pendente" | "aberto" | "fechado" | "aguardando" | "resolvido";
  priority: "baixa" | "normal" | "alta" | "crítica";
  user_id: string;
  created_at: string;
  // Optional fields that might not exist in the current table
  channel?: "painel" | "email" | "whatsapp" | "manual";
  company_id?: string | null;
  sla_due_at?: string | null;
  update_at?: string;
};
export type User360 = { id: string; email?: string; full_name?: string | null; plan?: string | null; };
export type CompanyLite = { id: string; name: string; plan?: string | null; };

const PAGE_SIZE = 30;
type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success";
const priorityColor: Record<Ticket["priority"], BadgeVariant> = {
  crítica: "destructive",
  alta: "success",
  normal: "secondary",
  baixa: "default"
};
const statusColor: Record<Ticket["status"], BadgeVariant> = {
  aberto: "default",
  pendente: "secondary",
  aguardando: "outline",
  resolvido: "outline",
  fechado: "success"
};
const channelIcon: Record<NonNullable<Ticket["channel"]>, React.ReactNode> = {
  painel: <MessageSquare className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  whatsapp: <Phone className="h-4 w-4" />,
  manual: <Hand className="h-4 w-4" />,
};

// ---- Utils -------------------------------------------------------------------------------------
export function fmtRel(d: string | null) {
  if (!d) return "—";
  const diffMs = Date.now() - new Date(d).getTime();
  const hoursFloat = diffMs / (1000 * 60 * 60);
  if (hoursFloat < 1) return "<1h"; // FIX: compare before rounding
  if (hoursFloat < 24) return `${Math.floor(hoursFloat)}h`;
  return `${Math.floor(hoursFloat / 24)}d`;
}
function SLA({ due }: { due: string | null }) {
  if (!due) return <span className="text-xs opacity-70">SLA —</span>;
  const ms = new Date(due).getTime() - Date.now();
  const late = ms < 0; const abs = Math.abs(ms); const h = Math.floor(abs / (1000 * 60 * 60));
  const label = h < 1 ? "<1h" : h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
  return <span className={`text-xs ${late ? "text-red-600" : "text-green-600"}`}>{late ? "Atrasado" : "SLA"}: {label}</span>;
}
const KPI: React.FC<{ title: string; value: string; hint?: string; icon?: React.ReactNode }> = ({ title, value, hint, icon }) => (
  <Card className="bg-white/10 border-gray-200">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm opacity-90">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-semibold leading-tight">{value}</div>
      {hint && <p className="text-xs opacity-70 mt-1">{hint}</p>}
    </CardContent>
  </Card>
);
const TicketRow: React.FC<{ t: Ticket; onSelect: (t: Ticket) => void }> = ({ t, onSelect }) => (
  <button onClick={() => onSelect(t)} className="w-full text-left rounded-xl border bg-white/40 hover:bg-white/70 p-3 transition flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <Badge variant={priorityColor[t.priority]} className="capitalize">{t.priority}</Badge>
      <Badge variant={statusColor[t.status]} className="capitalize">{t.status}</Badge>
      <span className="inline-flex items-center gap-1 text-xs opacity-80">{channelIcon[t.channel]} <span className="capitalize">{t.channel}</span></span>
      <span className="ml-auto text-xs opacity-70">Atualizado {fmtRel(t.update_at)}</span>
    </div>
    <div className="text-sm font-medium">{t.subject || "(Sem assunto)"}</div>
    <div className="flex items-center justify-between"><SLA due={t.sla_due_at} /><span className="text-xs opacity-70">#{t.id.slice(0, 6)}</span></div>
  </button>
);
const QuickAction: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void; variant?: "secondary" | "default" | "destructive" }> = ({ icon, label, onClick, variant = "secondary" }) => (
  <Button variant={variant as any} size="sm" className="justify-start gap-2 w-full" onClick={onClick}>{icon} {label}</Button>
);

// ---- Data access layer (live via Supabase OR mock) --------------------------------------------
async function dalFetchKpi(): Promise<string> {
  try {
    const { data, error } = await (supabase as any)
      .from("kpis")
      .select("value, created_at")
      .eq("label", "ocr_classification_accuracy")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return "—";
    const v = Number((data as any).value);
    return Number.isFinite(v) ? `${v.toFixed(1)}%` : "—";
  } catch (e) {
    console.error("KPI fetch failed", e);
    return "—";
  }
}

interface fetchOptions {
  search?: string;
  filter?: { column: string, value: string };
  page?: number;
  pageSize?: number
}
async function dalFetchTickets(page: number, filter: "todos" | "atrasados" | "alta" | "encerrados", q: string): Promise<Ticket[]> {
  try {
    // Fetch from Supabase tickets table
    let query = supabase
      .from("tickets")
      .select("*")
      .order("update_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    // Apply filters
    if (filter === "atrasados") {
      query = query.lt("sla_due_at", new Date().toISOString());
    }
    if (filter === "alta") {
      query = query.in("priority", ["alta", "crítica"]);
    }
    if (filter === "encerrados") {
      query = query.eq("status", "fechado");
    }
    if (q && q.trim().length > 1) {
      query = query.ilike("subject", `%${q.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching tickets:", error);
      return [];
    }
    // Normalize to our Ticket shape (ensure optional fields exist)
    return (data || []).map((t: any) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority === "urgent" ? "critical" : t.priority,
      user_id: t.user_id,
      created_at: t.created_at,
      channel: t.channel ?? "inapp",
      company_id: t.company_id ?? null,
      sla_due_at: t.sla_due_at ?? null,
      update_at: t.update_at ?? t.created_at,
    })) as Ticket[];
  } catch (error) {
    console.error("Error in dalFetchTickets:", error);
    return [];
  }
}

async function dalFetchUser(id: string): Promise<User360 | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching user:", error);
      return null;
    }
    const u = data as any;
    return {
      id: u.id,
      email: undefined,
      full_name: u.full_name ?? null,
      plan: undefined,
    } as User360;
  } catch (error) {
    console.error("Error in dalFetchUser:", error);
    return null;
  }
}

async function dalFetchCompany(id: string): Promise<CompanyLite | null> {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("id, nome_fantasia, razao_social, regime")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching company:", error);
      return null;
    }
    const c = data as any;
    return {
      id: c.id,
      name: c.nome_fantasia || c.razao_social || "—",
      plan: c.regime ?? null,
    } as CompanyLite;
  } catch (error) {
    console.error("Error in dalFetchCompany:", error);
    return null;
  }
}
async function dalRpc(name: string, args: any): Promise<{ data: any; error: any }> {
  try {
    const { data, error } = await (supabase as any).rpc(name, args);
    return { data, error };
  } catch (error) {
    console.error("RPC call failed", error);
    return { data: null, error };
  }
}

// ---- Component ---------------------------------------------------------------------------------
const AdminSupportDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<"todos" | "atrasados" | "alta" | "encerrados">("todos");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [user360, setUser360] = useState<User360 | null>(null);
  const [company, setCompany] = useState<CompanyLite | null>(null);
  const [kpiAcc, setKpiAcc] = useState<string>("—");

  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const queryFilter = useMemo(() => ({ filter, q }), [filter, q]);

  // Load KPI once
  useEffect(() => { (async () => { setKpiAcc(await dalFetchKpi()); })(); }, []);

  // Reset pagination on filter/search
  useEffect(() => {
    pageRef.current = 0; setTickets([]); setHasMore(true); void loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFilter]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting && hasMore && !loading) void loadMore();
    });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasMore, loading]);

  const loadMore = async (replace = false) => {
    setLoading(true);
    const page = pageRef.current;
    const rows = await dalFetchTickets(page, filter, q);

    setTickets((prev) => (replace ? rows : [...prev, ...rows]));
    if (rows.length < PAGE_SIZE) setHasMore(false);
    pageRef.current = page + 1; setLoading(false);
  };

  const fetch360 = async (t: Ticket) => {
    setSelected(t); setUser360(null); setCompany(null);
    if (t.user_id) setUser360(await dalFetchUser(t.user_id));
    if (t.company_id) setCompany(await dalFetchCompany(t.company_id));
  };

  // Quick actions (secure RPCs)
  const doReset2FA = async () => { if (!user360) return; await dalRpc("support_reset_2fa", { user_id: user360.id }); };
  const doForcePasswordReset = async () => { if (!user360) return; await dalRpc("support_force_password_reset", { user_id: user360.id }); };
  const doLogoutSessions = async () => { if (!user360) return; await dalRpc("support_logout_sessions", { user_id: user360.id }); };
  const doLockAccount = async () => { if (!user360) return; await dalRpc("support_lock_account", { user_id: user360.id }); };
  const doImpersonate = async () => { if (!user360) return; const { data, error } = await dalRpc("support_start_impersonation", { user_id: user360.id }); if (error) console.error(error); console.log("Impersonation token", data); };

  // Logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  };

  return (
    <PlainLayout>
      <Seo title="Suporte • Lysbox" description="Atendimento, SLA e visão 360º do usuário/empresa." />
      <main>
        <section className="relative rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 text-black p-4 md:p-6 lg:p-8 border">
          <Button variant="outline" size="sm" className="absolute right-4 top-4 gap-2" onClick={handleLogout}><LogOut className="h-4 w-4" /> Sair</Button>
          <section className="space-y-1 mb-6">
            <h1 className="text-3xl font-semibold tracking-tight">Admin – Suporte ao Usuário</h1>
            <p className="text-sm opacity-80">Inbox unificada, ações rápidas e contexto completo sem expor arquivos.</p>
          </section>

          {/* KPIs topo */}
          <section className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-3">
              <KPI title="Classificação automática" value={kpiAcc} hint="Precisão do OCR/IA (hoje)" icon={<Bot className="h-4 w-4" />} />
            </div>
            <div className="col-span-12 md:col-span-3">
              <KPI title="Tickets abertos" value={String(tickets.filter(t => t.status === "aberto" || t.status === "pendente").length)} hint="Página atual" icon={<MessageSquare className="h-4 w-4" />} />
            </div>
            <div className="col-span-12 md:col-span-3">
              <KPI title="Atrasados" value={String(tickets.filter(t => t.sla_due_at && new Date(t.sla_due_at).getTime() < Date.now()).length)} hint="SLA vencido" icon={<AlertTriangle className="h-4 w-4" />} />
            </div>
            <div className="col-span-12 md:col-span-3">
              <KPI title="Meta Lançamento" value="07/09" hint="Stabilize KPIs" icon={<Clock className="h-4 w-4" />} />
            </div>
          </section>

          <section className="grid grid-cols-12 gap-4">
            {/* Inbox / Lista de tickets */}
            <Card className="bg-white border-gray-200 col-span-12 md:col-span-8">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="leading-none">Inbox</CardTitle>
                  <Badge variant="secondary" className="rounded-full">{tickets.length}</Badge>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 opacity-70" />
                      <Input placeholder="Buscar por assunto…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-7 w-56" />
                    </div>
                    <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" /> Filtros</Button>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant={filter === "todos" ? "default" : "secondary"} onClick={() => setFilter("todos")}>Todos</Button>
                  <Button size="sm" variant={filter === "atrasados" ? "default" : "secondary"} onClick={() => setFilter("atrasados")} className="gap-2"><AlertTriangle className="h-4 w-4" /> Atrasados</Button>
                  <Button size="sm" variant={filter === "alta" ? "default" : "secondary"} onClick={() => setFilter("alta")} className="gap-2">Prioridade alta</Button>
                  <Button size="sm" variant={filter === "encerrados" ? "default" : "secondary"} onClick={() => setFilter("encerrados")} className="gap-2">Encerrados</Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea height={540}>
                  <div className="flex flex-col gap-2">
                    {tickets.map((t) => (
                      <TicketRow key={t.id} t={t} onSelect={fetch360} />
                    ))}
                    {loading && (<div className="text-xs opacity-70 text-center py-2">Carregando…</div>)}
                    {!loading && tickets.length === 0 && (<div className="text-xs opacity-70 text-center py-8">Nenhum ticket encontrado.</div>)}
                    <div ref={sentinelRef} className="h-6" />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Painel lateral – Visão 360 e Ações rápidas */}
            <Card className="bg-white border-gray-200 col-span-12 md:col-span-4">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4" />
                  <CardTitle>Visão 360º</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {!selected && (<p className="text-sm opacity-80">Selecione um ticket para ver detalhes do usuário/empresa, indicadores e ações rápidas.</p>)}
                {selected && (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs opacity-70 mb-1">Ticket</div>
                      <div className="text-sm font-medium">#{selected.id.slice(0, 8)} • {selected.subject || "(Sem assunto)"}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={priorityColor[selected.priority]} className="capitalize">{selected.priority}</Badge>
                        <Badge variant={statusColor[selected.status]} className="capitalize">{selected.status}</Badge>
                        <SLA due={selected.sla_due_at} />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs opacity-70 mb-1">Usuário</div>
                        {user360 ? (
                          <div>
                            <div className="text-sm font-medium">{user360.full_name || user360.email}</div>
                            <div className="text-xs opacity-70">Plano: {user360.plan || "—"}</div>
                          </div>
                        ) : (<div className="text-xs opacity-70">—</div>)}
                      </div>
                      <div>
                        <div className="text-xs opacity-70 mb-1">Empresa</div>
                        {company ? (
                          <div>
                            <div className="text-sm font-medium">{company.name}</div>
                            <div className="text-xs opacity-70">Plano: {company.plan || "—"}</div>
                          </div>
                        ) : (<div className="text-xs opacity-70">—</div>)}
                      </div>
                    </div>

                    <div className="rounded-xl border p-3 bg-gray-50">
                      <div className="text-xs opacity-70 mb-2">Ações rápidas</div>
                      <div className="grid grid-cols-1 gap-2">
                        <QuickAction icon={<RefreshCcw className="h-4 w-4" />} label="Reprocessar OCR / Reclassificar" onClick={() => console.log("trigger reclassify by ticket context")} />
                        <QuickAction icon={<Shield className="h-4 w-4" />} label="Resetar 2FA" onClick={doReset2FA} />
                        <QuickAction icon={<Mail className="h-4 w-4" />} label="Forçar redefinição de senha" onClick={doForcePasswordReset} />
                        <QuickAction icon={<LogOut className="h-4 w-4" />} label="Encerrar sessões ativas" onClick={doLogoutSessions} />
                        <QuickAction icon={<Lock className="h-4 w-4" />} label="Bloquear login (temporário)" onClick={doLockAccount} />
                        <QuickAction icon={<Eye className="h-4 w-4" />} label="Impersonar (restrito)" onClick={doImpersonate} />
                      </div>
                    </div>

                    <div className="rounded-xl border p-3 bg-gray-50">
                      <div className="text-xs opacity-70 mb-2">Assistente (IA)</div>
                      <div className="text-xs opacity-80 mb-2">Sugira respostas com base no plano e no contexto (ex.: prazos fiscais para Contábil + IA).</div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="secondary" className="justify-start gap-2"><Bot className="h-4 w-4" /> Explicar guia DAS</Button>
                        <Button size="sm" variant="secondary" className="justify-start gap-2"><Bot className="h-4 w-4" /> Passo a passo: compartilhar</Button>
                      </div>
                    </div>

                    <div className="rounded-xl border p-3 bg-gray-50">
                      <div className="flex items-center gap-2 text-xs opacity-70 mb-2"><Clock className="h-4 w-4" /> Linha do tempo (mock)</div>
                      <ul className="space-y-1 text-xs opacity-80">
                        <li>Login bem-sucedido — {fmtRel(new Date().toISOString())}</li>
                        <li>Upload de arquivo — {fmtRel(new Date(Date.now() - 1000 * 60 * 45).toISOString())}</li>
                        <li>Criação de link seguro — {fmtRel(new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString())}</li>
                      </ul>
                    </div>

                    <div className="flex items-center gap-2 text-xs opacity-70">
                      <CheckCircle2 className="h-4 w-4" /> Atendimento com segurança (sem acesso direto a arquivos do usuário)
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </section>
      </main>
    </PlainLayout>
  );
};

export default AdminSupportDashboard;

// ---- Lightweight & async test cases (run in dev/sandbox) --------------------------------------
function assertEqual(actual: any, expected: any, label: string) {
  if (actual !== expected) console.error(`❌ ${label}: expected ${expected}, got ${actual}`);
  else console.log(`✅ ${label}`);
}
function assert(cond: boolean, label: string) {
  if (!cond) console.error(`❌ ${label}`); else console.log(`✅ ${label}`);
}
function runTestsSync() {
  console.log("\nRunning AdminSupportDashboard sync tests…");
  // fmtRel tests (DO NOT CHANGE existing)
  assertEqual(fmtRel(new Date(Date.now() - 30 * 60 * 1000).toISOString()), "<1h", "fmtRel <1h");
  const twoH = fmtRel(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
  if (!/(1h|2h|<1h|\dd)/.test(twoH)) console.error("❌ fmtRel 2h pattern"); else console.log("✅ fmtRel 2h pattern");
  // Added cases (do not modify existing ones)
  assertEqual(fmtRel(new Date(Date.now() - 59 * 60 * 1000).toISOString()), "<1h", "fmtRel 59m -> <1h");
  assertEqual(fmtRel(new Date(Date.now() - 60 * 60 * 1000).toISOString()), "1h", "fmtRel 60m -> 1h");
  assertEqual(fmtRel(new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()), "23h", "fmtRel 23h -> 23h");
  assertEqual(fmtRel(new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()), "1d", "fmtRel 26h -> 1d");
}
async function runTestsAsync() {
  console.log("Running AdminSupportDashboard async tests…");
  // dalFetchTickets (MOCK mode expected in sandbox) – filter & search
  const page0 = await dalFetchTickets(0, "todos", "");
  assert(Array.isArray(page0) && page0.length > 0, "dalFetchTickets returns some rows (mock)");
  const searchUpload = await dalFetchTickets(0, "todos", "upload");
  assert(searchUpload.length > 0 && searchUpload.every(r => r.subject.toLowerCase().includes("upload")), "search filters by subject (mock)");
  const high = await dalFetchTickets(0, "alta", "");
  assert(high.every(r => r.priority === "alta" || r.priority === "crítica"), "filter by priority alta/crítica");
}
if (typeof window !== "undefined") {
  setTimeout(runTestsSync, 0);
  setTimeout(() => { runTestsAsync().catch(console.error); }, 0);
}
