import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
// NOTE: Self-contained for sandboxes: no path aliases ("@/") required.
// This file turns the Support panel into a **full governance & configuration console** for Lysbox.
// In your real app, replace inline UI with your design-system and import your Supabase client.

// -----------------------------------------------------------------------------------------------
// Minimal UI primitives (drop-in replacements)
// -----------------------------------------------------------------------------------------------

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
export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = "", ...p }) => (
  <textarea className={`rounded-xl border px-3 py-2 ${className}`} {...p} />
);
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = "", children, ...p }) => (
  <select className={`rounded-xl border px-3 py-2 ${className}`} {...p}>{children}</select>
);
export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className = "", children, ...p }) => (
  <label className={`text-sm font-medium ${className}`} {...p}>{children}</label>
);
export const Badge: React.FC<DivProps & { variant?: "default" | "secondary" | "outline" | "destructive" | "success" }> = ({ className = "", variant = "default", children, ...p }) => {
  const v = { default: "bg-black text-white", secondary: "bg-gray-200", outline: "border", destructive: "bg-red-600 text-white", success: "bg-green-600 text-white" }[variant];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs ${v} ${className}`} {...p}>{children}</span>;
};
export const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <div className="flex items-center gap-2">
    <button onClick={() => onChange(!checked)} className={`w-10 h-6 rounded-full relative ${checked ? 'bg-black' : 'bg-gray-300'}`} aria-pressed={checked}>
      <span className={`absolute top-0.5 ${checked ? 'left-5' : 'left-1'} h-5 w-5 bg-white rounded-full transition-all`} />
    </button>
    {label && <span className="text-sm">{label}</span>}
  </div>
);
export const Separator: React.FC = () => <hr className="border-gray-200" />;
export const ScrollArea: React.FC<DivProps & { height?: number | string }> = ({ className = "", height = 540, children, ...p }) => (
  <div className={`overflow-y-auto pr-2 ${className}`} style={{ maxHeight: typeof height === 'number' ? `${height}px` : height }} {...p}>{children}</div>
);
const PlainLayout: React.FC<DivProps> = ({ children }) => <div className=" mx-auto p-4">{children}</div>;
const Seo: React.FC<{ title: string; description?: string }> = () => null;

// Icons
import { AlertTriangle, MessageSquare, Clock, Users, Search, Filter, Shield, RefreshCcw, Eye, Lock, LogOut, Bot, Mail, Phone, CheckCircle2, Settings, Building2, KeyRound, Link as LinkIcon, Share2, Wallet, Database, FileCog, Activity, Calendar, Drill, UserRoundSearch, BadgePercent, Folder, Hand, Save, TrashIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import SectionLandingCMS from "@/features/admin/SectionLandingCMS";
import AppLayout from "@/components/layout/AppLayout";

// -----------------------------------------------------------------------------------------------
// Supabase loader (falls back to MOCK when env not provided)
// -----------------------------------------------------------------------------------------------
// let __supabase: any = null;
// async function getSupabase() {
//   try {
//     if (__supabase) return __supabase;
//     const url = (globalThis as any).SUPABASE_URL;
//     const key = (globalThis as any).SUPABASE_ANON_KEY;
//     if (!url || !key) return null;
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

// -----------------------------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------------------------
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

export type Userprofile = {
  user_id: string,
  email: string,
  full_name?: string,
  role?: string,
  plan_name?: string,
}
export type CompanyLite = {
  id: string;
  name: string;
  plan?: string | null;
  storage_gb?: number
};

// Global admin settings (expandable)
export type GlobalSettings = {
  // Segurança
  require_2fa: boolean;
  password_min_length: number;
  session_max_age_hours: number;
  audit_log_retention_days: number;
  backup_retention_days: number;
  // Link seguro / compartilhamento
  link_expiration_days_default: number;
  download_limit_default: number;
  watermark_default: boolean;
  anti_print_default: boolean;
  // Integrações
  email_ingest_enabled: boolean;
  whatsapp_enabled: boolean;
  ocr_provider: 'native' | 'gcp' | 'aws' | 'tesseract';
  ai_model: string; // ex: gpt-4o-mini, gpt-4.1
  // Cofre Fiscal / IA Contábil
  auto_classify_on_upload: boolean;
  classification_threshold: number; // 0..1
  calendar_alert_days_before: number;
  calendar_channels: { panel: boolean; email: boolean; whatsapp: boolean };
  // Financeiro / Planos (defaults)
  default_plan: string;
  // IVA (simplificado)
  iva_rate_std: number; // % padrão
};

const DEFAULTS: GlobalSettings = {
  require_2fa: false,
  password_min_length: 0,
  session_max_age_hours: 0, // 30 dias
  audit_log_retention_days: 0,
  backup_retention_days: 0,
  link_expiration_days_default: 0,
  download_limit_default: 0,
  watermark_default: true,
  anti_print_default: true,
  email_ingest_enabled: true,
  whatsapp_enabled: false,
  ocr_provider: 'native',
  ai_model: '0',
  auto_classify_on_upload: true,
  classification_threshold: 0,
  calendar_alert_days_before: 0,
  calendar_channels: { panel: true, email: true, whatsapp: false },
  default_plan: 'Puro',
  iva_rate_std: 0,
};

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

const planTiers = [
  { value: "gratuito", label: "gratuito" },
  { value: "essencial", label: "essencial" },
  { value: "pro", label: "pro" },
  { value: "ultra", label: "ultra" },
  { value: "contador_prof", label: "contador_prof" },
  { value: "contador_avancado", label: "contador_avancado" }
];

// -----------------------------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------------------------
export function fmtRel(d: string | null) {
  if (!d) return "—";
  const diffMs = Date.now() - new Date(d).getTime();
  const hoursFloat = diffMs / (1000 * 60 * 60);
  if (hoursFloat < 1) return "<1h"; // fixed logic
  if (hoursFloat < 24) return `${Math.floor(hoursFloat)}h`;
  return `${Math.floor(hoursFloat / 24)}d`;
}
export function mergeDefaults<T extends Record<string, any>>(defaults: T, override: Partial<T> | null | undefined): T {
  return { ...defaults, ...(override || {}) };
}

// -----------------------------------------------------------------------------------------------
// DAL – settings + entities (Supabase or localStorage mock)
// -----------------------------------------------------------------------------------------------
const LS_PREFIX = 'lys_admin:';
async function dalGetSetting<T = any>(key: string): Promise<T | null> {
  // const sb = await getSupabase();
  // if (!sb) {
  //   const raw = localStorage.getItem(LS_PREFIX + key);
  //   return raw ? JSON.parse(raw) as T : null;
  // }

  const { data, error } = await supabase
    .from('site_settings')
    .select('value_json')
    .eq('key', key)
    .single();
  console.log(data);
  if (error) return null; return (data?.value_json ?? null) as T | null;
}
async function dalSetSetting<T = any>(key: string, value: T): Promise<boolean> {
  // const sb = await getSupabase();
  // if (!sb) { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); return true; }

  const { error } = await supabase.from('site_settings').upsert({
    key,
    value_json: JSON.parse(JSON.stringify(value))
  });
  if (error) { console.error(error); return false; } return true;
}

// async function dalFetchKpi(): Promise<string> {
//   const sb = await getSupabase();
//   if (!sb) return "91.8%"; // MOCK default
//   const { data, error } = await sb.from("metrics_daily").select("value, collected_at").eq("metric","ocr_classification_accuracy").order("collected_at",{ascending:false}).limit(1);
//   if (error || !data?.[0]) return "—";
//   const v = Number(data[0].value); return Number.isFinite(v) ? `${v.toFixed(1)}%` : "—";
// }

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

// async function dalFetchTickets(page: number, filter: "todos"|"atrasados"|"alta"|"encerrados", q: string): Promise<Ticket[]> {
//   const sb = await getSupabase();
//   if (!sb) {
//     const base: Ticket[] = Array.from({length: 24}).map((_,i) => ({
//       id: crypto.randomUUID(), subject: i%3===0?"Falha no upload":"Ajuda com link seguro", status: i%4===0?"pendente":"aberto",
//       priority: i%5===0?"alta": i%2===0?"media":"baixa", channel: i%3===0?"email": i%2===0?"inapp":"whatsapp",
//       user_id: null, company_id: null, sla_due_at: i%4===0? new Date(Date.now()-3600000).toISOString() : new Date(Date.now()+7200000).toISOString(),
//       updated_at: new Date(Date.now()-i*3600000).toISOString(), created_at: new Date().toISOString()
//     }));
//     let rows = base;
//     if (filter === "atrasados") rows = rows.filter(r => r.sla_due_at && new Date(r.sla_due_at).getTime() < Date.now());
//     if (filter === "alta") rows = rows.filter(r => r.priority === "alta");
//     if (filter === "encerrados") rows = rows.filter(r => r.status === "resolvido" || r.status === "fechado");
//     if (q.trim()) rows = rows.filter(r => r.subject.toLowerCase().includes(q.trim().toLowerCase()));
//     return rows.slice(page*PAGE_SIZE, page*PAGE_SIZE + PAGE_SIZE);
//   }
//   let qb = sb.from("support_tickets").select("id, subject, status, priority, channel, user_id, company_id, sla_due_at, updated_at, created_at").order("updated_at", { ascending: false }).range(page*PAGE_SIZE, page*PAGE_SIZE + PAGE_SIZE - 1);
//   if (filter === "atrasados") qb = qb.lt("sla_due_at", new Date().toISOString());
//   if (filter === "alta") qb = qb.eq("priority","alta");
//   if (filter === "encerrados") qb = qb.in("status", ["resolvido","fechado"]);
//   if (q && q.trim().length>1) qb = qb.ilike("subject", `%${q.trim()}%`);
//   const { data, error } = await qb; if (error) { console.error(error); return []; } return data ?? [];
// }

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


async function dalFetchUser(id: string): Promise<Userprofile | null> {
  const { data } = await supabase.from("users_with_profiles").select("*").eq("user_id", id).single();
  return (data as any) ?? null;
}
async function dalFetchCompany(id: string): Promise<CompanyLite | null> {
  const { data } = await supabase.from("companies").select("id, name, plan, storage_gb").eq("id", id).single();
  return (data as any) ?? null;
}
async function dalSearchUsers(q: string): Promise<Userprofile[]> {
  const { data } = await supabase.from('users_with_profiles')
    .select('*')
    .ilike('email', `%${q}%`)
    .limit(25);
  return (data as any) || [];
}
async function dalSearchCompanies(q: string): Promise<CompanyLite[]> {
  const { data } = await supabase.from('companies').select('id,name,plan,storage_gb').ilike('name', `%${q}%`).limit(25);
  return (data as any) || [];
}
async function dalAssignRole(userId: string, role: string) {
  // @ts-ignore
  console.log(userId)
  const { data, error } = await supabase
    .from('user_roles')
    .update({ role: role })
    .eq('user_id', userId)
    .select('user_id, role')
    .single();
  console.log(data);
  if (error) { return; }
  return data;
}
async function dalUpdateCompanyPlan(companyId: string, plan: string, storage_gb: number) {
  return await supabase.from('companies').update({ plan, storage_gb }).eq('id', companyId);
}
async function dalRpc(name: string, args: any) {
  // @ts-ignore
  return await supabase.rpc(name, args);
}

// -----------------------------------------------------------------------------------------------
// Support Inbox (existing) + New Admin Sections
// -----------------------------------------------------------------------------------------------
const KPI: React.FC<{ title: string; value: string; hint?: string; icon?: React.ReactNode }> = ({ title, value, hint, icon }) => (
  <Card className="bg-white/10 border-gray-200"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm opacity-90">{title}</CardTitle>{icon}</CardHeader><CardContent><div className="text-3xl font-semibold leading-tight">{value}</div>{hint && <p className="text-xs opacity-70 mt-1">{hint}</p>}</CardContent></Card>
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
function SLA({ due }: { due: string | null }) {
  if (!due) return <span className="text-xs opacity-70">SLA —</span>;
  const ms = new Date(due).getTime() - Date.now();
  const late = ms < 0; const abs = Math.abs(ms); const h = Math.floor(abs / (1000 * 60 * 60));
  const label = h < 1 ? "<1h" : h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
  return <span className={`text-xs ${late ? "text-red-600" : "text-green-600"}`}>{late ? "Atrasado" : "SLA"}: {label}</span>;
}
const QuickAction: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void; variant?: "secondary" | "default" | "destructive" }> = ({ icon, label, onClick, variant = "secondary" }) => (
  <Button variant={variant as any} size="sm" className="justify-start gap-2 w-full" onClick={onClick}>{icon} {label}</Button>
);

// Simple Tabs
const Tabs: React.FC<{ value: string; onChange: (v: string) => void; items: { id: string; label: string; icon?: React.ReactNode }[] }> = ({ value, onChange, items }) => (
  <div className="flex gap-2 flex-wrap">
    {items.map(it => (
      <Button key={it.id} variant={value === it.id ? 'default' : 'secondary'} size="sm" onClick={() => onChange(it.id)} className="flex items-center gap-2">
        {it.icon}{it.label}
      </Button>
    ))}
  </div>
);

// Sections – Configurações Globais
const SectionGlobalSettings: React.FC = () => {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    (
      async () => {
        const s = await dalGetSetting<GlobalSettings>('global_settings');
        setSettings(mergeDefaults(DEFAULTS, s || {}));
      })();
  }, []);


  const save = async () => {
    setSaving(true);
    await dalSetSetting('global_settings', settings);
    setSaving(false);
  };

  return (
    <div className="grid grid-cols-12 gap-4 mt-4">
      <Card className="col-span-12 lg:col-span-6"><CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-4 w-4" />Segurança</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex items-center justify-between"><Label>Exigir 2FA</Label><Switch checked={settings.require_2fa} onChange={v => setSettings({ ...settings, require_2fa: v })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Senha mínima</Label><Input type="number" value={settings.password_min_length} onChange={e => setSettings({ ...settings, password_min_length: Number(e.target.value) || 8 })} /></div>
          <div><Label>Expiração de sessão (h)</Label><Input type="number" value={settings.session_max_age_hours} onChange={e => setSettings({ ...settings, session_max_age_hours: Number(e.target.value) || 720 })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Retenção de auditoria (dias)</Label><Input type="number" value={settings.audit_log_retention_days} onChange={e => setSettings({ ...settings, audit_log_retention_days: Number(e.target.value) || 180 })} /></div>
          <div><Label>Retenção de backup (dias)</Label><Input type="number" value={settings.backup_retention_days} onChange={e => setSettings({ ...settings, backup_retention_days: Number(e.target.value) || 7 })} /></div>
        </div>
      </CardContent></Card>

      <Card className="col-span-12 lg:col-span-6"><CardHeader><CardTitle className="flex items-center gap-2"><LinkIcon className="h-4 w-4" />Link seguro & compartilhamento</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Expiração padrão (dias)</Label><Input type="number" value={settings.link_expiration_days_default} onChange={e => setSettings({ ...settings, link_expiration_days_default: Number(e.target.value) || 7 })} /></div>
          <div><Label>Limite padrão de downloads</Label><Input type="number" value={settings.download_limit_default} onChange={e => setSettings({ ...settings, download_limit_default: Number(e.target.value) || 1 })} /></div>
        </div>
        <div className="flex items-center justify-between"><Label>Marca d'água padrão</Label><Switch checked={settings.watermark_default} onChange={v => setSettings({ ...settings, watermark_default: v })} /></div>
        <div className="flex items-center justify-between"><Label>Anti-print padrão</Label><Switch checked={settings.anti_print_default} onChange={v => setSettings({ ...settings, anti_print_default: v })} /></div>
      </CardContent></Card>

      <Card className="col-span-12 lg:col-span-6"><CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-4 w-4" />Integrações & IA</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>OCR</Label><Select value={settings.ocr_provider} onChange={e => setSettings({ ...settings, ocr_provider: e.target.value as any })}><option value="native">Nativo</option><option value="gcp">Google Vision</option><option value="aws">AWS Textract</option><option value="tesseract">Tesseract</option></Select></div>
          <div><Label>Modelo IA</Label><Input value={settings.ai_model} onChange={e => setSettings({ ...settings, ai_model: e.target.value })} /></div>
        </div>
        <div className="flex items-center justify-between"><Label>Upload por e-mail</Label><Switch checked={settings.email_ingest_enabled} onChange={v => setSettings({ ...settings, email_ingest_enabled: v })} /></div>
        <div className="flex items-center justify-between"><Label>WhatsApp</Label><Switch checked={settings.whatsapp_enabled} onChange={v => setSettings({ ...settings, whatsapp_enabled: v })} /></div>
      </CardContent></Card>

      <Card className="col-span-12 lg:col-span-6"><CardHeader><CardTitle className="flex items-center gap-2"><FileCog className="h-4 w-4" />Cofre Fiscal & IA Contábil</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex items-center justify-between"><Label>Classificar ao enviar</Label><Switch checked={settings.auto_classify_on_upload} onChange={v => setSettings({ ...settings, auto_classify_on_upload: v })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Threshold de classificação</Label><Input type="number" step="0.01" min={0} max={1} value={settings.classification_threshold} onChange={e => setSettings({ ...settings, classification_threshold: Math.min(1, Math.max(0, Number(e.target.value))) })} /></div>
          <div><Label>IVA padrão (%)</Label><Input type="number" step="0.1" value={settings.iva_rate_std} onChange={e => setSettings({ ...settings, iva_rate_std: Number(e.target.value) })} /></div>
        </div>
      </CardContent></Card>

      <Card className="col-span-12"><CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" />Calendário Fiscal & Alertas</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Dias de antecedência</Label><Input type="number" value={settings.calendar_alert_days_before} onChange={e => setSettings({ ...settings, calendar_alert_days_before: Number(e.target.value) || 3 })} /></div>
          <div className="flex items-center gap-4"><Label>Canais</Label>
            <div className="flex items-center gap-2"><input type="checkbox" checked={settings.calendar_channels.panel} onChange={e => setSettings({ ...settings, calendar_channels: { ...settings.calendar_channels, panel: e.target.checked } })} /> <span className="text-sm">Painel</span></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={settings.calendar_channels.email} onChange={e => setSettings({ ...settings, calendar_channels: { ...settings.calendar_channels, email: e.target.checked } })} /> <span className="text-sm">E-mail</span></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={settings.calendar_channels.whatsapp} onChange={e => setSettings({ ...settings, calendar_channels: { ...settings.calendar_channels, whatsapp: e.target.checked } })} /> <span className="text-sm">WhatsApp</span></div>
          </div>
          <div><Label>Plano padrão</Label><Input value={settings.default_plan} onChange={e => setSettings({ ...settings, default_plan: e.target.value })} /></div>
        </div>
        <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar configurações'}</Button></div>
      </CardContent></Card>
    </div>
  );
};

// Sections – Usuários & Empresas
const SectionUsersCompanies: React.FC = () => {
  const [uq, setUq] = useState('');
  const [cq, setCq] = useState('');
  const [users, setUsers] = useState<Userprofile[]>([]);
  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [selectedUser, setSelectedUser] = useState<Userprofile | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyLite | null>(null);
  const [roleToAssign, setRoleToAssign] = useState('support_admin');
  const [newPlan, setNewPlan] = useState('Puro');
  const [newStorage, setNewStorage] = useState(50);

  const doUserSearch = async () => {
    const rawUsers = await dalSearchUsers(uq); // rawUsers: Userprofile[]
    // Map Userprofile to User360 (ensure all required fields are present)
    const userProfile: Userprofile[] = rawUsers.map(u => ({
      user_id: u.user_id ?? '', // Provide a default or handle missing id
      full_name: u.full_name ?? '',
      email: u.email ?? '',
      role: u.role ?? '',
      plan_name: u.plan_name ?? ''
      // ...add other User360 fields as needed
    }));
    setUsers(userProfile);
  };

  const doCompanySearch = async () => setCompanies(await dalSearchCompanies(cq));



  const assignRole = async () => {
    if (!selectedUser) return;
    const data = await dalAssignRole(selectedUser.user_id, roleToAssign);
    setUsers(users.map(u => u.user_id === selectedUser.user_id ? { ...u, role: data?.role || roleToAssign } : u));
    alert('Papel atribuído.');
  };
  const updateCompany = async () => { if (!selectedCompany) return; await dalUpdateCompanyPlan(selectedCompany.id, newPlan, newStorage); alert('Empresa atualizada.'); };

  return (
    <div className="grid grid-cols-12 gap-4 mt-4">
      <Card className="col-span-12 lg:col-span-6"><CardHeader><CardTitle className="flex items-center gap-2"><UserRoundSearch className="h-4 w-4" />Usuários</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex gap-2 items-center"><Input placeholder="Buscar por e-mail" value={uq} onChange={e => setUq(e.target.value)} /><Button onClick={doUserSearch}>Buscar</Button></div>
        <ScrollArea height={240}>
          <div className="space-y-2">
            {users.map(u => (
              <button key={u.user_id} onClick={() => setSelectedUser(u)} className={`w-full text-left p-2 border rounded-xl ${selectedUser?.user_id === u.user_id ? 'bg-gray-100' : ''}`}>
                <div className="text-sm font-medium">{u.full_name || u.email}</div>
                <div className="text-xs opacity-70">Plano: {u.plan_name || '—'} • Papéis: {u.role || '—'}</div>
              </button>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <Label>Atribuir papel</Label>
            <Select value={roleToAssign} onChange={e => setRoleToAssign(e.target.value)}>
              <option value="empresario">empresario</option>
              <option value="contador">contador</option>
              <option value="admin">admin</option>
              {/* <option value="support_admin">support_admin</option> */}
              <option value="super_admin">super_admin</option>
            </Select>
          </div>
          <div className="flex justify-end"><Button onClick={assignRole} disabled={!selectedUser}>Aplicar</Button></div>
        </div>
      </CardContent></Card>

      <Card className="col-span-12 lg:col-span-6"><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />Empresas</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex gap-2 items-center"><Input placeholder="Buscar por nome" value={cq} onChange={e => setCq(e.target.value)} /><Button onClick={doCompanySearch}>Buscar</Button></div>
        <ScrollArea height={240}>
          <div className="space-y-2">
            {companies.map(c => (
              <button key={c.id} onClick={() => setSelectedCompany(c)} className={`w-full text-left p-2 border rounded-xl ${selectedCompany?.id === c.id ? 'bg-gray-100' : ''}`}>
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs opacity-70">Plano: {c.plan || '—'} • Armazenamento: {c.storage_gb ?? '—'} GB</div>
              </button>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="grid grid-cols-3 gap-3 items-end">
          <div><Label>Novo plano</Label><Input value={newPlan} onChange={e => setNewPlan(e.target.value)} /></div>
          <div><Label>Armazenamento (GB)</Label><Input type="number" value={newStorage} onChange={e => setNewStorage(Number(e.target.value) || 0)} /></div>
          <div className="flex justify-end"><Button onClick={updateCompany} disabled={!selectedCompany}>Aplicar</Button></div>
        </div>
      </CardContent></Card>
    </div>
  );
};

// Sections – Financeiro & Planos
const SectionBillingPlans: React.FC = () => {
  type PlanRow = {
    id?: string;
    code: string;
    name: string;
    tier?: string | null;
    storage_gb: number | null;
    monthly_price_cents: number | null;
    yearly_price_cents: number | null;
    is_demo: boolean;
    demo_duration_days: number | null;
    features: string[] | null;
  };
  const emptyNew: PlanRow = { code: '', name: '', tier: null, storage_gb: 50, monthly_price_cents: 0, yearly_price_cents: null, is_demo: false, demo_duration_days: null, features: [] };
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [newPlan, setNewPlan] = useState<PlanRow>(emptyNew);
  const [loading, setLoading] = useState(false);
  const [inputFeatures, setInputFeatures] = useState<string>('');
  const [featuresInputs, setFeaturesInputs] = useState<Record<string, string>>({});

  useEffect(() => { (async () => { await load(); })(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('plans')
      .select('id,code,name,tier,storage_gb,monthly_price_cents,yearly_price_cents,is_demo,demo_duration_days,features')
      .order('monthly_price_cents', { ascending: true });
    const rows = (data as any) || [];
    setPlans(rows);
    // Initialize per-row features input with the joined features string so trailing commas can be typed and shown.
    const map: Record<string, string> = {};
    rows.forEach((r: any, idx: number) => {
      const key = String(r.id ?? idx);
      map[key] = toFeatureString(r.features);
    });
    setFeaturesInputs(map);
    setLoading(false);
  };

  const toFeatureString = (arr: string[] | null | undefined) => (arr || []).join(', ');
  const parseFeatures = (s: string) => s.split(',').map(f => f.trim()).filter(Boolean);

  const updateField = (i: number, field: keyof PlanRow, value: any) => {
    const v = [...plans];
    (v[i] as any)[field] = value;
    setPlans(v);
  };

  const savePlan = async (i: number) => {
    const p = plans[i];
    console.log("Saving plan", p);
    const payload = { ...p, features: p.features ?? [] } as any;
    if (p.id) {
      await supabase.from('plans').update(payload as any).eq('id', p.id);
    } else {
      const { data } = await supabase.from('plans').insert(payload as any).select().single();
      if (data?.id) {
        const v = [...plans]; v[i].id = (data as any).id; setPlans(v);
      }
    }
    await load();
  };

  const deletePlan = async (i: number) => {
    const id = plans[i].id;
    if (id) await supabase.from('plans').delete().eq('id', id);
    setPlans(plans.filter((_, idx) => idx !== i));
  };

  const add = async () => {
    if (!newPlan.name || !newPlan.code) return;
    const payload = { ...newPlan, features: newPlan.features ?? [] } as any;
    console.log(payload)
    const { data, error } = await supabase.from('plans').insert(payload).select().single();
    console.log("New plan data:", data, "Error:", error);
    if (error) {
      console.error("Error saving new plan:", error);
      return;
    }
    if (data) setPlans([...plans, data as any]);
    setNewPlan(emptyNew);
  };

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4" />Planos (Banco de Dados)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500 mb-2">Gerencie diretamente a tabela "plans" (inclui planos demo).</div>
          <div className="grid grid-cols-12 gap-2 items-center text-xs opacity-70 px-2">
            <div className="col-span-2 text-center">Nome</div>
            <div className="col-span-2 text-center">Código</div>
            <div className="col-span-2 text-center">Tier</div>
            <div className="col-span-1 text-center">GB</div>
            <div className="col-span-1 text-center">Mensal (R$)</div>
            <div className="col-span-2 text-center">Anual (R$)</div>
            <div className="col-span-1 text-center">Demo</div>
            <div className="col-span-1 text-center">Ações</div>
          </div>
          {plans.map((p, i) => (
            <div key={p.id || i} className="grid grid-cols-12 gap-2 items-center border rounded-xl p-2">
              <Input className="col-span-2 text-center" value={p.name} onChange={e => updateField(i, 'name', e.target.value)} />
              <Input className="col-span-2 text-center" value={p.code} onChange={e => updateField(i, 'code', e.target.value)} />
              <Select className="col-span-2" value={p.tier || ''} onChange={e => updateField( i, 'tier', e.target.value ) }>
              <option hidden key={0} value=''></option>
              {planTiers.map((item, index) => (
                <option key={index + 1} value={item.value}>{item.label}</option>
              ))}
            </Select>
              <Input className="col-span-1 text-center" type="number" value={p.storage_gb ?? 0} onChange={e => updateField(i, 'storage_gb', Number(e.target.value) || 0)} />
              <Input className="col-span-1 text-center" type="number" value={(p.monthly_price_cents ?? 0) / 100} onChange={e => updateField(i, 'monthly_price_cents', Math.round((Number(e.target.value) || 0) * 100))} />
              <Input className="col-span-2 text-center" type="number" value={(p.yearly_price_cents ?? 0) / 100} onChange={e => updateField(i, 'yearly_price_cents', Math.round((Number(e.target.value) || 0) * 100))} />
              <div className="col-span-1 flex justify-center"><Switch checked={!!p.is_demo} onChange={v => updateField(i, 'is_demo', v)} /></div>
              <div className="col-span-1 flex justify-end gap-1">
                <Button variant="secondary" onClick={() => savePlan(i)}><Save></Save></Button>
                <Button variant="destructive" onClick={() => deletePlan(i)}><TrashIcon></TrashIcon></Button>
              </div>
              <div className="col-span-12 grid grid-cols-12 gap-2 mt-2">
                <div className="col-span-3"><Label>Trial (dias)</Label><Input type="number" value={p.demo_duration_days ?? 0} onChange={e => updateField(i, 'demo_duration_days', Number(e.target.value) || 0)} /></div>
                <div className="col-span-9">
                  <Label>Recursos (separados por vírgula)</Label>
                  <Input type="text"
                    value={featuresInputs[p.id ?? String(i)] ?? toFeatureString(p.features)}
                    onChange={e => {
                      const key = (p.id ?? String(i)) as string;
                      setFeaturesInputs(prev => ({ ...prev, [key]: e.target.value }));
                      updateField(i, 'features', parseFeatures(e.target.value));
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          <Separator />
          <div className="grid grid-cols-12 gap-2 items-center text-xs opacity-70 px-2">
            <div className="col-span-2 text-center">Nome</div>
            <div className="col-span-2 text-center">Código</div>
            <div className="col-span-2 text-center">Tier</div>
            <div className="col-span-1 text-center">GB</div>
            <div className="col-span-1 text-center">Mensal (R$)</div>
            <div className="col-span-2 text-center">Anual (R$)</div>
            <div className="col-span-1 text-center">Demo</div>
            <div className="col-span-1 text-center" />
          </div>
          <div className="grid grid-cols-12 gap-2 items-center mt-2">
            <Input className="col-span-2" placeholder="Nome" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} />
            <Input className="col-span-2" placeholder="Código" value={newPlan.code} onChange={e => setNewPlan({ ...newPlan, code: e.target.value })} />
            {/* <Input className="col-span-1" placeholder="Tier" value={newPlan.tier || ''} onChange={e => setNewPlan({ ...newPlan, tier: e.target.value })} /> */}
            <Select className="col-span-2" value={newPlan.tier || ''} onChange={e => { setNewPlan({ ...newPlan, tier: e.target.value as any }) }}>
              <option hidden key={0} value=''></option>
              {planTiers.map((item, index) => (
                <option key={index + 1} value={item.value}>{item.label}</option>
              ))}
            </Select>
            <Input className="col-span-1" type="number" placeholder="GB" value={newPlan.storage_gb ?? 0} onChange={e => setNewPlan({ ...newPlan, storage_gb: Number(e.target.value) || 0 })} />
            <Input className="col-span-1" type="number" placeholder="Mensal (R$)" value={(newPlan.monthly_price_cents ?? 0) / 100} onChange={e => setNewPlan({ ...newPlan, monthly_price_cents: Math.round((Number(e.target.value) || 0) * 100) })} />
            <Input className="col-span-2" type="number" placeholder="Anual (R$)" value={(newPlan.yearly_price_cents ?? 0) / 100} onChange={e => setNewPlan({ ...newPlan, yearly_price_cents: Math.round((Number(e.target.value) || 0) * 100) })} />
            <div className="col-span-1 flex items-center"><Switch checked={!!newPlan.is_demo} onChange={v => setNewPlan({ ...newPlan, is_demo: v })} /></div>
            <div className="col-span-1"><Button onClick={add}>Adicionar</Button></div>
          </div>
          <div className="grid grid-cols-12 gap-2 mt-2">
            <div className="col-span-3"><Label>Trial (dias)</Label><Input type="number" value={newPlan.demo_duration_days ?? 0} onChange={e => setNewPlan({ ...newPlan, demo_duration_days: Number(e.target.value) || 0 })} /></div>
            <div className="col-span-9"><Label>Recursos (separados por vírgula)</Label>
              <Input type="text"
                value={inputFeatures}
                onChange={e => {
                  setInputFeatures(e.target.value);
                  setNewPlan({ ...newPlan, features: parseFeatures(e.target.value) });
                }}
              />
            </div>
          </div>
          <div className="flex justify-end mt-3"><Button onClick={load} disabled={loading}>{loading ? 'Carregando…' : 'Recarregar'}</Button></div>
        </CardContent>
      </Card>
    </div>
  );
};

// Sections – Auditoria & Logs
const SectionAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  useEffect(() => { setLogs(["login: admin@lysbox (OK)", "reset_2fa: user123", "impersonation_start: user456", "share_revoked: link789"]); }, []);
  return (
    <div className="mt-4">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" />Auditoria (últimos eventos)</CardTitle></CardHeader><CardContent>
        <ScrollArea height={260}><ul className="text-sm space-y-1">{logs.map((l, i) => (<li key={i} className="border rounded-xl px-2 py-1">{l}</li>))}</ul></ScrollArea>
      </CardContent></Card>
    </div>
  );
};

// Sections – Contas Demo
const SectionDemoAccounts: React.FC = () => {
  type DemoAccount = {
    user_id: string;
    full_name?: string | null;
    email?: string | null;
    plan_name?: string | null;
    status?: "ativa" | "expirada";
    created_at?: string | null
  };
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'todas' | 'ativas' | 'expiradas'>('todas');
  const [plans, setPlans] = useState<{ id: string; name: string }[]>([]);
  const [planId, setPlanId] = useState<string>('all');
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [files, setFiles] = useState<{ id: string; path: string; name: string; mime_type: string | null; size_bytes: number | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    (async () => {
      // const sb = await getSupabase();
      // if (!sb) {
      //   // MOCK
      //   const mock: DemoAccount[] = Array.from({ length: 6 }).map((_, i) => ({ user_id: crypto.randomUUID(), full_name: `Conta Demo ${i + 1}`, email: `demo${i + 1}@lysbox.dev`, plan_name: 'Demo Padrão', status: (i % 2 ? 'ativa' : 'expirada') as 'ativa' | 'expirada', created_at: new Date(Date.now() - i * 86400000).toISOString() }));
      //   setAccounts(mock);
      //   return;
      // }
      // Carrega planos demo
      const { data: planRows } = await supabase
        .from('plans')
        .select('id,name,is_demo')
        .eq('is_demo', true);
      const pl = (planRows || []).map((p: any) => ({ id: p.id, name: p.name }));
      setPlans(pl);
      // Se nenhum plano demo, nada a listar
      if (!pl.length) { setAccounts([]); return; }
      const planIds = pl.map(p => p.id);
      // Assinaturas de planos demo
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id,user_id,status,trial_until,current_period_end,created_at,plan_id')
        .in('plan_id', planIds)
        .limit(200)
        .order('created_at', { ascending: false });
      const userIds: string[] = Array.from(new Set((subs || []).map((s: any) => String(s.user_id))));
      // Perfis
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profMap: Map<string, { full_name?: string | null }> = new Map((profs || []).map((p: any) => [String(p.id), { full_name: (p.full_name as string | null) }]));
      // Emails via RPC (melhor esforço)
      const emails = new Map<string, string>();
      
      await Promise.all(userIds.slice(0, 100).map(async (uid) => { try { const { data } = await supabase.rpc('get_auth_user_email', { uid }); if (data?.email) emails.set(uid, data.email); } catch { /* ignore */ } }));
      
      const acc = (subs || []).map((s: any) => {
        const now = new Date();
        const active = (s.status && s.status !== 'canceled') && (
          (s.trial_until && new Date(s.trial_until) >= now) ||
          (s.current_period_end && new Date(s.current_period_end) >= now)
        );
        return {
          user_id: s.user_id,
          full_name: profMap.get(s.user_id)?.full_name ?? null,
          email: emails.get(s.user_id) ?? undefined,
          plan_name: pl.find(p => p.id === s.plan_id)?.name ?? undefined,
          status: active ? 'ativa' : 'expirada',
          created_at: s.created_at,
        } as DemoAccount;
      });
      setAccounts(acc);
    })();
  }, []);

  const filtered = accounts.filter(a => {
    const matchQ = !q.trim() || [a.full_name || '', a.email || '', a.plan_name || ''].some(v => v.toLowerCase().includes(q.toLowerCase()));
    const matchStatus = status === 'todas' || a.status === (status === 'ativas' ? 'ativa' : 'expirada');
    const matchPlan = planId === 'all' || a.plan_name === plans.find(p => p.id === planId)?.name;
    return matchQ && matchStatus && matchPlan;
  });

  const loadFiles = async (uid: string) => {
    setSelectedUser(uid); setFiles([]); setLoading(true);
    // const sb = await getSupabase();
    // if (!sb) {
    //   setFiles(Array.from({ length: 8 }).map((_, i) => ({ id: crypto.randomUUID(), path: `demo/${uid}/file${i}.pdf`, name: `Arquivo ${i}.pdf`, mime_type: 'application/pdf', size_bytes: 10000 + i * 1234, created_at: new Date(Date.now() - i * 3600000).toISOString() })));
    //   setLoading(false); return;
    // }
    const { data } = await supabase.from('cloud_files').select('id,path,name,mime_type,size_bytes,created_at').eq('user_id', uid).is('deleted_at', null).order('created_at', { ascending: false }).limit(100);
    setFiles((data as any) || []); setLoading(false);
  };

  const openFile = async (path: string) => {
    // const sb = await getSupabase();
    // if (!sb) return;
    try {
      const { data, error } = await supabase.storage.from('user-files').createSignedUrl(path, 600);
      if (!error && data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (e) { console.error(e); }
  };

  const demoSearch = async () => { console.log('') }

  return (
    <div className="grid grid-cols-12 gap-4 mt-4">
      <Card className="col-span-12 lg:col-span-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BadgePercent className="h-4 w-4" />Contas Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-2 items-end">
            <div className="col-span-3">
              <Label>Buscar</Label>
              <Input placeholder="Nome, e-mail ou plano" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="col-span-1">
              <Button onClick={demoSearch}>Buscar</Button>
            </div>
            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={status} onChange={e => setStatus(e.target.value as any)}>
                <option value="todas">Todas</option>
                <option value="ativas">Ativas</option>
                <option value="expiradas">Expiradas</option>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Plano demo</Label>
              <Select value={planId} onChange={e => setPlanId(e.target.value)}>
                <option value="all">Todos</option>
                {plans.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </Select>
            </div>

          </div>
          <Separator />
          <ScrollArea height={420}>
            <div className="space-y-2">
              {filtered.map(a => (
                <button key={a.user_id} onClick={() => { void loadFiles(a.user_id); setPreviewOpen(true); }} className={`w-full text-left p-2 border rounded-xl ${selectedUser === a.user_id ? 'bg-gray-100' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{a.full_name || a.email || a.user_id.slice(0, 8)}</span>
                    <Badge variant={a.status === 'ativa' ? 'default' : 'secondary'} className="capitalize">{a.status}</Badge>
                    <span className="text-xs opacity-70 ml-auto">{a.plan_name || '—'}</span>
                  </div>
                  <div className="text-xs opacity-70">{a.email || '—'}{a.created_at ? ` • criado ${fmtRel(a.created_at)}` : ''}</div>
                </button>
              ))}
              {filtered.length === 0 && (<div className="text-xs opacity-70 text-center py-8">Nenhuma conta encontrada.</div>)}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-7">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Folder className="h-4 w-4" />Arquivos da conta selecionada</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedUser && (<div className="text-sm opacity-80">Selecione uma conta demo à esquerda para visualizar os arquivos.</div>)}
          {selectedUser && (
            <ScrollArea height={460}>
              <div className="grid grid-cols-1 gap-2">
                {loading && <div className="text-xs opacity-70 text-center py-2">Carregando…</div>}
                {!loading && files.length === 0 && <div className="text-xs opacity-70 text-center py-8">Nenhum arquivo.</div>}
                {files.map(f => (
                  <div key={f.id} className="flex items-center justify-between border rounded-xl p-2">
                    <div>
                      <div className="text-sm font-medium">{f.name}</div>
                      <div className="text-xs opacity-70">{f.mime_type || '—'} • {new Date(f.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openFile(f.path)}>Abrir</Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pré-visualização da conta Demo */}
      {previewOpen && selectedUser && (() => {
        const acc = accounts.find(a => a.user_id === selectedUser);
        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setPreviewOpen(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2"><BadgePercent className="h-4 w-4" /><span className="font-medium">Pré-visualização da conta Demo</span></div>
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>Fechar</Button>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-sm">
                  <div className="opacity-70 text-xs mb-1">Usuário</div>
                  <div className="font-medium">{acc?.full_name || acc?.email || acc?.user_id?.slice(0, 8)}</div>
                  <div className="text-xs opacity-70">{acc?.email || '—'}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="opacity-70">Plano</div>
                    <div className="font-medium">{acc?.plan_name || '—'}</div>
                  </div>
                  <div>
                    <div className="opacity-70">Status</div>
                    <div><Badge variant={acc?.status === 'ativa' ? 'default' : 'secondary'} className="capitalize">{acc?.status}</Badge></div>
                  </div>
                  <div>
                    <div className="opacity-70">Criado</div>
                    <div className="font-medium">{acc?.created_at ? new Date(acc.created_at).toLocaleString() : '—'}</div>
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="text-xs opacity-70 mb-2">Arquivos recentes</div>
                  {loading && <div className="text-xs opacity-70">Carregando…</div>}
                  {!loading && files.slice(0, 5).map(f => (
                    <div key={f.id} className="flex items-center justify-between border rounded-xl p-2 mb-1">
                      <div>
                        <div className="text-sm font-medium">{f.name}</div>
                        <div className="text-xs opacity-70">{f.mime_type || '—'} • {new Date(f.created_at).toLocaleString()}</div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => openFile(f.path)}>Abrir</Button>
                    </div>
                  ))}
                  {!loading && files.length === 0 && (<div className="text-xs opacity-70">Nenhum arquivo.</div>)}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// -----------------------------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------------------------
const AdminSupportDashboard: React.FC = () => {
  const [tab, setTab] = useState<'suporte' | 'config' | 'users_companies' | 'demo' | 'plans' | 'landing' | 'logs'>('suporte');
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<"todos" | "atrasados" | "alta" | "encerrados">("todos");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [user360, setUser360] = useState<Userprofile | null>(null);
  const [company, setCompany] = useState<CompanyLite | null>(null);
  const [kpiAcc, setKpiAcc] = useState<string>("—");

  const pageRef = useRef(0); const sentinelRef = useRef<HTMLDivElement | null>(null);
  const queryFilter = useMemo(() => ({ filter, q }), [filter, q]);

  useEffect(() => { (async () => { setKpiAcc(await dalFetchKpi()); })(); }, []);
  useEffect(() => { pageRef.current = 0; setTickets([]); setHasMore(true); void loadMore(true); }, [queryFilter]);
  useEffect(() => { if (!sentinelRef.current) return; const io = new IntersectionObserver((entries) => { const e = entries[0]; if (e.isIntersecting && hasMore && !loading) void loadMore(); }); io.observe(sentinelRef.current); return () => io.disconnect(); }, [hasMore, loading]);

  const loadMore = async (replace = false) => {
    if (tab !== 'suporte') return; // load only in support tab
    setLoading(true); const page = pageRef.current; const rows = await dalFetchTickets(page, filter, q);
    setTickets((prev) => (replace ? rows : [...prev, ...rows])); if (rows.length < PAGE_SIZE) setHasMore(false);
    pageRef.current = page + 1; setLoading(false);
  };

  const fetch360 = async (t: Ticket) => { setSelected(t); setUser360(null); setCompany(null); if (t.user_id) setUser360(await dalFetchUser(t.user_id)); if (t.company_id) setCompany(await dalFetchCompany(t.company_id)); };

  // Quick actions
  const doReset2FA = async () => { if (!user360) return; await dalRpc("support_reset_2fa", { user_id: user360.user_id }); };
  const doForcePasswordReset = async () => { if (!user360) return; await dalRpc("support_force_password_reset", { user_id: user360.user_id }); };
  const doLogoutSessions = async () => { if (!user360) return; await dalRpc("support_logout_sessions", { user_id: user360.user_id }); };
  const doLockAccount = async () => { if (!user360) return; await dalRpc("support_lock_account", { user_id: user360.user_id }); };
  const doImpersonate = async () => { if (!user360) return; const { data, error } = await dalRpc("support_start_impersonation", { user_id: user360.user_id }); if (error) console.error(error); console.log("Impersonation token", data); };

  const tabs = [
    { id: 'suporte', label: 'Suporte', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'config', label: 'Configurações Globais', icon: <Settings className="h-4 w-4" /> },
    { id: 'users_companies', label: 'Usuários & Empresas', icon: <Users className="h-4 w-4" /> },
    { id: 'demo', label: 'Contas Demo', icon: <BadgePercent className="h-4 w-4" /> },
    { id: 'plans', label: 'Financeiro & Planos', icon: <Wallet className="h-4 w-4" /> },
    { id: 'landing', label: 'Página inicial', icon: <FileCog className="h-4 w-4" /> },
    { id: 'logs', label: 'Auditoria', icon: <Activity className="h-4 w-4" /> },
  ];

  return (
    <AppLayout>
      <Seo title="Admin • Lysbox" description="Suporte, configuração global, gestão de usuários/empresas, planos e auditoria." />
      <main>
        <section className="relative rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 text-black p-4 md:p-6 lg:p-8 border">
          <section className="space-y-2 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Admin – Console de Suporte & Governança</h1>
                <p className="text-sm opacity-80">Atenda usuários, configure políticas globais, gerencie contas e planos, e audite ações — tudo em um só lugar.</p>
              </div>
            </div>
            <Tabs value={tab} onChange={(v) => { setTab(v as any); if (v === 'suporte') void loadMore(true); }} items={tabs} />
          </section>

          {tab === 'suporte' && (
            <>
              {/* KPIs topo */}
              <section className="grid grid-cols-12 gap-4 mb-4">
                <div className="col-span-12 md:col-span-3"><KPI title="Classificação automática" value={kpiAcc} hint="Precisão do OCR/IA (hoje)" icon={<Bot className="h-4 w-4" />} /></div>
                <div className="col-span-12 md:col-span-3"><KPI title="Tickets abertos" value={String(tickets.filter(t => t.status === "aberto" || t.status === "pendente").length)} hint="Página atual" icon={<MessageSquare className="h-4 w-4" />} /></div>
                <div className="col-span-12 md:col-span-3"><KPI title="Atrasados" value={String(tickets.filter(t => t.sla_due_at && new Date(t.sla_due_at).getTime() < Date.now()).length)} hint="SLA vencido" icon={<AlertTriangle className="h-4 w-4" />} /></div>
                <div className="col-span-12 md:col-span-3"><KPI title="Meta Lançamento" value="07/09" hint="Stabilize KPIs" icon={<Clock className="h-4 w-4" />} /></div>
              </section>

              <section className="grid grid-cols-12 gap-4">
                {/* Inbox */}
                <Card className="bg-white border-gray-200 col-span-12 md:col-span-8">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <CardTitle className="leading-none">Inbox</CardTitle>
                      <Badge variant="secondary" className="rounded-full">{tickets.length}</Badge>
                      <div className="ml-auto flex items-center gap-2">
                        <div className="relative"><Input placeholder="Buscar por assunto…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-7 w-56" /><Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 opacity-70" /></div>
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
                        {tickets.map((t) => (<TicketRow key={t.id} t={t} onSelect={fetch360} />))}
                        {loading && (<div className="text-xs opacity-70 text-center py-2">Carregando…</div>)}
                        {!loading && tickets.length === 0 && (<div className="text-xs opacity-70 text-center py-8">Nenhum ticket encontrado.</div>)}
                        <div ref={sentinelRef} className="h-6" />
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Painel lateral – Visão 360 e Ações rápidas */}
                <Card className="bg-white border-gray-200 col-span-12 md:col-span-4">
                  <CardHeader className="pb-3"><div className="flex items-center gap-3"><Users className="h-4 w-4" /><CardTitle>Visão 360º</CardTitle></div></CardHeader>
                  <CardContent>
                    {!selected && (<p className="text-sm opacity-80">Selecione um ticket para ver detalhes do usuário/empresa, indicadores e ações rápidas.</p>)}
                    {selected && (
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs opacity-70 mb-1">Ticket</div>
                          <div className="text-sm font-medium">#{selected.id.slice(0, 8)} • {selected.subject || "(Sem assunto)"}</div>
                          <div className="flex items-center gap-2 mt-1"><Badge variant={priorityColor[selected.priority]} className="capitalize">{selected.priority}</Badge><Badge variant={statusColor[selected.status]} className="capitalize">{selected.status}</Badge><SLA due={selected.sla_due_at} /></div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs opacity-70 mb-1">Usuário</div>
                            {user360 ? (<div><div className="text-sm font-medium">{user360.full_name || user360.email}</div><div className="text-xs opacity-70">Plano: {user360.plan_name || "—"} • Papéis: {user360.role || '—'}</div></div>) : (<div className="text-xs opacity-70">—</div>)}
                          </div>
                          <div>
                            <div className="text-xs opacity-70 mb-1">Empresa</div>
                            {company ? (<div><div className="text-sm font-medium">{company.name}</div><div className="text-xs opacity-70">Plano: {company.plan || "—"} • {company.storage_gb ?? '—'} GB</div></div>) : (<div className="text-xs opacity-70">—</div>)}
                          </div>
                        </div>
                        <div className="rounded-xl border p-3 bg-gray-50"><div className="text-xs opacity-70 mb-2">Ações rápidas</div>
                          <div className="grid grid-cols-1 gap-2">
                            <QuickAction icon={<RefreshCcw className="h-4 w-4" />} label="Reprocessar OCR / Reclassificar" onClick={() => console.log("trigger reclassify by ticket context")} />
                            <QuickAction icon={<Shield className="h-4 w-4" />} label="Resetar 2FA" onClick={doReset2FA} />
                            <QuickAction icon={<Mail className="h-4 w-4" />} label="Forçar redefinição de senha" onClick={doForcePasswordReset} />
                            <QuickAction icon={<LogOut className="h-4 w-4" />} label="Encerrar sessões ativas" onClick={doLogoutSessions} />
                            <QuickAction icon={<Lock className="h-4 w-4" />} label="Bloquear login (temporário)" onClick={doLockAccount} />
                            <QuickAction icon={<Eye className="h-4 w-4" />} label="Impersonar (restrito)" onClick={doImpersonate} />
                          </div>
                        </div>
                        <div className="rounded-xl border p-3 bg-gray-50"><div className="text-xs opacity-70 mb-2">Assistente (IA)</div><div className="grid grid-cols-2 gap-2"><Button size="sm" variant="secondary" className="justify-start gap-2"><Bot className="h-4 w-4" /> Explicar guia DAS</Button><Button size="sm" variant="secondary" className="justify-start gap-2"><Bot className="h-4 w-4" /> Passo a passo: compartilhar</Button></div></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            </>
          )}

          {tab === 'config' && <SectionGlobalSettings />}
          {tab === 'users_companies' && <SectionUsersCompanies />}
          {tab === 'demo' && <SectionDemoAccounts />}
          {tab === 'plans' && <SectionBillingPlans />}
          {tab === 'landing' && (
            <div className="rounded-2xl bg-white text-black p-2 md:p-4">
              <SectionLandingCMS />
            </div>
          )}
          {tab === 'logs' && <SectionAuditLogs />}
        </section>
      </main>
    </AppLayout>
  );
};

export default AdminSupportDashboard;

// -----------------------------------------------------------------------------------------------
// Tests (keep existing; add more)
// -----------------------------------------------------------------------------------------------
function assertEqual(actual: any, expected: any, label: string) { if (actual !== expected) console.error(`❌ ${label}: expected ${expected}, got ${actual}`); else console.log(`✅ ${label}`); }
function assert(cond: boolean, label: string) { if (!cond) console.error(`❌ ${label}`); else console.log(`✅ ${label}`); }
function runTestsSync() {
  console.log("\nRunning AdminSupportDashboard sync tests…");
  // Existing tests (do not modify)
  assertEqual(fmtRel(new Date(Date.now() - 30 * 60 * 1000).toISOString()), "<1h", "fmtRel <1h");
  const twoH = fmtRel(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
  if (!/(1h|2h|<1h|\dd)/.test(twoH)) console.error("❌ fmtRel 2h pattern"); else console.log("✅ fmtRel 2h pattern");
  assertEqual(fmtRel(new Date(Date.now() - 59 * 60 * 1000).toISOString()), "<1h", "fmtRel 59m -> <1h");
  assertEqual(fmtRel(new Date(Date.now() - 60 * 60 * 1000).toISOString()), "1h", "fmtRel 60m -> 1h");
  assertEqual(fmtRel(new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()), "23h", "fmtRel 23h -> 23h");
  assertEqual(fmtRel(new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()), "1d", "fmtRel 26h -> 1d");
  // New tests
  const merged = mergeDefaults(DEFAULTS, { require_2fa: true, download_limit_default: 5 });
  assert(merged.require_2fa === true && merged.download_limit_default === 5 && merged.link_expiration_days_default === DEFAULTS.link_expiration_days_default, 'mergeDefaults keeps unspecified and overrides provided');
}
async function runTestsAsync() {
  console.log("Running AdminSupportDashboard async tests…");
  const page0 = await dalFetchTickets(0, "todos", "");
  assert(Array.isArray(page0) && page0.length > 0, "dalFetchTickets returns some rows (mock)");
  const searchUpload = await dalFetchTickets(0, "todos", "upload");
  assert(searchUpload.length > 0 && searchUpload.every(r => r.subject.toLowerCase().includes("upload")), "search filters by subject (mock)");
  const high = await dalFetchTickets(0, "alta", "");
  assert(high.every(r => r.priority === "alta"), "filter by priority 'alta' (mock)");
  // Settings persistence in MOCK (localStorage)
  // await dalSetSetting('unit_test_key', { a: 1 });
  // const v = await dalGetSetting<{ a: number }>('unit_test_key');
  // assert(v?.a === 1, 'dal get/set mock works');
}
if (typeof window !== "undefined") { setTimeout(runTestsSync, 0); setTimeout(() => { runTestsAsync().catch(console.error); }, 0); }
