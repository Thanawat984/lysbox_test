import React, { useEffect, useMemo, useRef, useState } from "react";
import FiscalCalendar from "@/features/finance/FiscalCalendar";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

declare global {
  interface Window {
    LYSBOX_API_BASE?: string;
    LYSBOX_API_TOKEN?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  }
}

/**
 * Lysbox – Painel do Contador (multiempresa)
 *
 * Objetivo atendido:
 * - Exibir até **30 empresas por padrão** (prioridade por alertas) e, opcionalmente, permitir ver mais com scroll infinito.
 * - Ordenação por **situação/alerta**, priorizando: atraso de impostos > sem informes > CRITICO > PENDENTE > demais.
 * - Destaque visual para alertas e contadores rápidos (quantos em atraso / sem informes).
 * - Mantém filtros, densidade, colunas, modo expandido; inclui stubs de IVA, **testes de runtime** e **integração de dados** (API/Supabase) com fallback para mock.
 *
 * Como integrar com dados reais (sem libs externas):
 *   1) Via API própria (recomendado):
 *      window.LYSBOX_API_BASE = "https://app.lysbox.com/api";
 *      window.LYSBOX_API_TOKEN = "Bearer <token>"; // opcional
 *      Endpoint esperado: GET /contador/empresas → Array de objetos
 *      Campos aceitos (flexível): id, nome, fantasia, cnpj, regime, status,
 *        ultimoEnvioISO | ultimo_envio_iso,
 *        arquivosNoMes | arquivos_no_mes,
 *        atrasoImpostos | atraso_impostos | pendencia_pagamento_impostos,
 *        semLancamentos | sem_lancamentos | sem_informes.
 *
 *   2) Via Supabase PostgREST:
 *      window.SUPABASE_URL = "https://<project>.supabase.co";
 *      window.SUPABASE_ANON_KEY = "<key>";
 *      Tabela sugerida: empresas_status (ou view) com colunas equivalentes.
 *      Ex.: GET {SUPABASE_URL}/rest/v1/empresas_status?select=*
 *      Headers: apikey, Authorization: Bearer {key}
 *
 * Observação: arquivo autossuficiente (sem imports externos). Ícones via emojis.
 */

// =========================================================
// Utilidades
// =========================================================

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

function timeAgo(iso) {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "—";
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "agora";
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

// SEO mínimo
function Seo({ title = "", description = "" }: { title?: string; description?: string }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }
  }, [title, description]);
  return null;
}

// Layout simples
function PlainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(135deg, #0b1220 0%, #111827 50%, #0b1220 100%)",
      color: "#E5E7EB",
      padding: 24,
      boxSizing: "border-box"
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

// Componentes visuais básicos
interface ViewProps { children: React.ReactNode; className?: string; style?: React.CSSProperties }
function Card({ children, className, style }: ViewProps) {
  return (
    <div className={classNames("rounded-2xl border border-white/15 bg-white/5 backdrop-blur relative", className)} style={{ padding: 16, ...style }}>
      {children}
    </div>
  );
}
function CardHeader({ children, className, style }: ViewProps) { return <div className={classNames("mb-2", className)} style={style}>{children}</div>; }
function CardTitle({ children, className, style }: ViewProps) { return <h3 className={classNames("text-base font-semibold", className)} style={style}>{children}</h3>; }
function CardContent({ children, className, style }: ViewProps) { return <div className={classNames("text-sm", className)} style={style}>{children}</div>; }

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string; style?: React.CSSProperties };
const Button: React.FC<BtnProps> = ({ children, className, style, disabled, ...props }) => (
  <button {...props} disabled={disabled} className={classNames("inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm", "bg-white/10 hover:bg-white/15 border border-white/20", disabled && "opacity-50 cursor-not-allowed", className)} style={style}>
    {children}
  </button>
);

type BadgeTone = "default" | "amber" | "rose" | "slate" | "emerald" | "sky";
const Badge: React.FC<{ children: React.ReactNode; tone?: BadgeTone }> = ({ children, tone = "default" }) => {
  const tones = {
    default: { bg: "#11182780", fg: "#E5E7EB" },
    amber: { bg: "#f59e0b33", fg: "#fbbf24" },
    rose: { bg: "#f43f5e33", fg: "#fb7185" },
    slate: { bg: "#94a3b833", fg: "#cbd5e1" },
    emerald: { bg: "#10b98133", fg: "#6ee7b7" },
    sky: { bg: "#38bdf833", fg: "#7dd3fc" },
  } as const;
  const t = (tones as Record<BadgeTone, { bg: string; fg: string }>)[tone] || tones.default;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, lineHeight: "18px", padding: "2px 8px", borderRadius: 999, background: t.bg, color: t.fg, border: "1px solid rgba(255,255,255,0.1)" }}>{children}</span>
  );
};

// Ícones leves
const I = {
  money: () => <span aria-hidden>💵</span>,
  receipt: () => <span aria-hidden>🧾</span>,
  calc: () => <span aria-hidden>🧮</span>,
  users: () => <span aria-hidden>👥</span>,
  storage: () => <span aria-hidden>💾</span>,
  plan: () => <span aria-hidden>🏷️</span>,
  pie: () => <span aria-hidden>📊</span>,
  calendar: () => <span aria-hidden>📅</span>,
  building: () => <span aria-hidden>🏢</span>,
  chevronR: () => <span aria-hidden>▶️</span>,
  chevronL: () => <span aria-hidden>◀️</span>,
  plus: () => <span aria-hidden>➕</span>,
  trash: () => <span aria-hidden>🗑️</span>,
  search: () => <span aria-hidden>🔎</span>,
  grid: () => <span aria-hidden>🔳</span>,
  compact: () => <span aria-hidden>📏</span>,
  expand: () => <span aria-hidden>⛶</span>,
  collapse: () => <span aria-hidden>🗗</span>,
  alert: () => <span aria-hidden>⚠️</span>,
  overdue: () => <span aria-hidden>⏰</span>,
  noinfo: () => <span aria-hidden>📭</span>,
  sync: () => <span aria-hidden>🔄</span>,
  error: () => <span aria-hidden>🧯</span>,
  download: () => <span aria-hidden>⬇️</span>,
  upload: () => <span aria-hidden>⬆️</span>,
  view: () => <span aria-hidden>👁️</span>,
};

// =========================================================
// Dados mockados – com flags de alerta específicas (fallback)
// =========================================================

const EMPRESAS = [
  { id: "e1", nome: "Padaria Bela Massa Ltda", fantasia: "Bela Massa", cnpj: "12.345.678/0001-90", regime: "Simples", status: "PENDENTE", ultimoEnvioISO: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), arquivosNoMes: 8, emailIngest: "padariabela@lysbox.com.br", atrasoImpostos: false, semLancamentos: false },
  { id: "e2", nome: "Estúdio Aurora Fotografia ME", fantasia: "Aurora Studio", cnpj: "23.555.111/0001-22", regime: "Simples", status: "OK", ultimoEnvioISO: new Date(Date.now() - 30 * 60 * 1000).toISOString(), arquivosNoMes: 42, emailIngest: "aurora@lysbox.com.br", atrasoImpostos: false, semLancamentos: false },
  { id: "e3", nome: "Tech House Ltda", fantasia: null, cnpj: "10.200.333/0001-77", regime: "Lucro Presumido", status: "CRITICO", ultimoEnvioISO: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), arquivosNoMes: 5, emailIngest: "techhouse@lysbox.com.br", atrasoImpostos: true, semLancamentos: true },
  { id: "e4", nome: "Clínica Vida + Saúde", fantasia: "Vida+", cnpj: "77.888.999/0001-33", regime: "Lucro Real", status: "SEM_ENVIO", ultimoEnvioISO: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(), arquivosNoMes: 0, emailIngest: "clinicavida@lysbox.com.br", atrasoImpostos: false, semLancamentos: true },
  { id: "e5", nome: "Mercado do Bairro ME", fantasia: "Mercadão", cnpj: "01.222.333/0001-44", regime: "Simples", status: "OK", ultimoEnvioISO: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), arquivosNoMes: 19, emailIngest: "mercadao@lysbox.com.br", atrasoImpostos: false, semLancamentos: false },
  { id: "e6", nome: "Oficina Rápida Ltda", fantasia: "RápidaCar", cnpj: "55.666.777/0001-88", regime: "MEI", status: "PENDENTE", ultimoEnvioISO: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), arquivosNoMes: 3, emailIngest: "oficina@lysbox.com.br", atrasoImpostos: true, semLancamentos: false },
  { id: "e7", nome: "Pousada Mar Azul", fantasia: "Mar Azul", cnpj: "91.222.333/0001-12", regime: "Lucro Presumido", status: "OK", ultimoEnvioISO: new Date(Date.now() - 3 * 60 * 1000).toISOString(), arquivosNoMes: 27, emailIngest: "pousada@lysbox.com.br", atrasoImpostos: false, semLancamentos: false },
  { id: "e8", nome: "Restaurante Sabor Caseiro", fantasia: "Sabor", cnpj: "77.111.222/0001-55", regime: "Simples", status: "PENDENTE", ultimoEnvioISO: new Date(Date.now() - 50 * 60 * 1000).toISOString(), arquivosNoMes: 11, emailIngest: "sabor@lysbox.com.br", atrasoImpostos: false, semLancamentos: true },
  { id: "e9", nome: "Tech Plus Serviços", fantasia: "Tech+", cnpj: "66.777.888/0001-99", regime: "Lucro Real", status: "OK", ultimoEnvioISO: new Date(Date.now() - 8 * 60 * 1000).toISOString(), arquivosNoMes: 35, emailIngest: "techplus@lysbox.com.br", atrasoImpostos: false, semLancamentos: false },
  { id: "e10", nome: "Studio Arte & Luz", fantasia: "ArteLuz", cnpj: "33.222.111/0001-08", regime: "Simples", status: "OK", ultimoEnvioISO: new Date(Date.now() - 14 * 60 * 1000).toISOString(), arquivosNoMes: 14, emailIngest: "arteluz@lysbox.com.br", atrasoImpostos: false, semLancamentos: false },
];

// =========================================================
// IVA – motor + stubs
// =========================================================

function computeIva(ops) {
  const debitos = ops.filter(o => o.tipo === "debito").reduce((acc, o) => acc + o.valor, 0);
  const creditos = ops.filter(o => o.tipo === "credito").reduce((acc, o) => acc + o.valor, 0);
  const saldo = Math.max(debitos - creditos, 0);
  return { debitos, creditos, saldo };
}

function IvaOperationsForm({ onChange }) {
  const [ops, setOps] = useState([
    { id: "1", tipo: "debito", valor: 1000, descricao: "Vendas (CBS+IBS)" },
    { id: "2", tipo: "credito", valor: 150, descricao: "Crédito sobre insumos" },
  ]);
  const [tipo, setTipo] = useState("debito");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => { onChange && onChange(ops); }, [ops, onChange]);

  function addOp() {
    const v = Number(String(valor).replace(",", "."));
    if (!isFinite(v) || v <= 0) return;
    setOps(curr => [...curr, { id: Math.random().toString(36).slice(2), tipo, valor: v, descricao }]);
    setValor("");
    setDescricao("");
  }
  function removeOp(id) { setOps(curr => curr.filter(o => o.id !== id)); }

  return (
    <div className="space-y-3">
      <div className="grid" style={{ gridTemplateColumns: "120px 1fr auto", gap: 8 }}>
        <select className="rounded-md bg-black/20 border border-white/20 p-2" value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
        </select>
        <input className="rounded-md bg-black/20 border border-white/20 p-2" placeholder="Valor" value={valor} onChange={e => setValor(e.target.value)} />
        <Button onClick={addOp}><I.plus /> Adicionar</Button>
      </div>
      <input className="w-full rounded-md bg-black/20 border border-white/20 p-2" placeholder="Descrição (opcional)" value={descricao} onChange={e => setDescricao(e.target.value)} />

      <div className="rounded-xl border border-white/15 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left">
            <tr>
              <th className="p-2">Tipo</th>
              <th className="p-2">Valor</th>
              <th className="p-2">Descrição</th>
              <th className="p-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {ops.map(op => (
              <tr key={op.id} className="border-t border-white/10">
                <td className="p-2 capitalize">{op.tipo}</td>
                <td className="p-2">R$ {op.valor.toFixed(2)}</td>
                <td className="p-2">{op.descricao || "—"}</td>
                <td className="p-2 text-right">
                  <Button onClick={() => removeOp(op.id)}><I.trash /> Remover</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IvaDashboard({ ops = [] }) {
  const { debitos, creditos, saldo } = computeIva(ops);
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      <Card>
        <CardHeader>
          <CardTitle><I.money /> Débitos</CardTitle>
        </CardHeader>
        <CardContent style={{ fontSize: 20, fontWeight: 700 }}>R$ {debitos.toFixed(2)}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle><I.receipt /> Créditos</CardTitle>
        </CardHeader>
        <CardContent style={{ fontSize: 20, fontWeight: 700 }}>R$ {creditos.toFixed(2)}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle><I.calc /> Saldo a recolher</CardTitle>
        </CardHeader>
        <CardContent style={{ fontSize: 20, fontWeight: 700, color: saldo > 0 ? "#86efac" : "#cbd5e1" }}>R$ {saldo.toFixed(2)}</CardContent>
      </Card>
    </div>
  );
}

// =========================================================
// Testes de runtime
// =========================================================

function runIvaTests() {
  const t1 = computeIva([{ id: "a", tipo: "debito", valor: 1000 }, { id: "b", tipo: "credito", valor: 150 }]);
  console.assert(t1.saldo === 850, "[IVA TEST] saldo esperado 850, obtido:", t1.saldo);
  const t2 = computeIva([]);
  console.assert(t2.debitos === 0 && t2.creditos === 0 && t2.saldo === 0, "[IVA TEST] vazio deve ser 0/0/0");
  const t3 = computeIva([{ id: "c", tipo: "debito", valor: 100 }, { id: "d", tipo: "credito", valor: 300 }]);
  console.assert(t3.saldo === 0, "[IVA TEST] saldo não pode ser negativo; esperado 0, obtido:", t3.saldo);
  const t4 = computeIva([{ id: "e", tipo: "debito", valor: 199.99 }, { id: "f", tipo: "credito", valor: 99.49 }]);
  console.assert(Math.abs(t4.saldo - 100.5) < 1e-2, "[IVA TEST] esperado ~100.50, obtido:", t4.saldo);
}

// Ordenação por prioridade (testes)
function alertScore(e) {
  // quanto maior, mais prioritário
  if (e.atrasoImpostos) return 4;
  if (e.semLancamentos || e.status === "SEM_ENVIO") return 3;
  if (e.status === "CRITICO") return 2;
  if (e.status === "PENDENTE") return 1;
  return 0;
}
function compareEmpresas(a, b) {
  const sa = alertScore(a);
  const sb = alertScore(b);
  if (sb !== sa) return sb - sa; // maior score primeiro
  // desempate: mais tempo sem envio vem primeiro (sem data vai para o fim)
  const ta = Number.isFinite(Date.parse(a.ultimoEnvioISO)) ? Date.parse(a.ultimoEnvioISO) : Infinity;
  const tb = Number.isFinite(Date.parse(b.ultimoEnvioISO)) ? Date.parse(b.ultimoEnvioISO) : Infinity;
  return ta - tb;
}
function runSortTests() {
  const arr = [
    { id: "x1", status: "OK", ultimoEnvioISO: new Date().toISOString(), atrasoImpostos: false, semLancamentos: false },
    { id: "x2", status: "PENDENTE", ultimoEnvioISO: new Date().toISOString(), atrasoImpostos: false, semLancamentos: false },
    { id: "x3", status: "CRITICO", ultimoEnvioISO: new Date().toISOString(), atrasoImpostos: false, semLancamentos: false },
    { id: "x4", status: "OK", ultimoEnvioISO: new Date().toISOString(), atrasoImpostos: true, semLancamentos: false },
    { id: "x5", status: "OK", ultimoEnvioISO: new Date().toISOString(), atrasoImpostos: false, semLancamentos: true },
    { id: "x6", status: "OK", ultimoEnvioISO: null, atrasoImpostos: false, semLancamentos: false },
  ];
  const sorted = arr.slice().sort(compareEmpresas).map(i => i.id);
  console.assert(sorted[0] === "x4" && sorted[1] === "x5" && sorted[2] === "x3" && sorted[3] === "x2" && sorted.includes("x6"), "[SORT TEST] ordem de prioridade incorreta:", sorted);
}

// Helpers de status/alertas
function isCompanyInAlert(e) {
  return e.atrasoImpostos || e.semLancamentos || e.status === "CRITICO" || e.status === "PENDENTE" || e.status === "SEM_ENVIO";
}
function statusTone(e): { tone: BadgeTone; label: string } {
  if (e.atrasoImpostos) return { tone: "rose", label: "Atraso impostos" } as const;
  if (e.semLancamentos || e.status === "SEM_ENVIO") return { tone: "amber", label: "Sem informes" } as const;
  if (e.status === "CRITICO") return { tone: "rose", label: "Crítico" } as const;
  if (e.status === "PENDENTE") return { tone: "amber", label: "Pendência" } as const;
  return { tone: "emerald", label: "OK" } as const;
}

// =========================================================
// Normalização de dados vindos de API/Supabase
// =========================================================

function normalizeEmpresa(row) {
  // aceita snake_case ou camelCase
  const get = (keys, def = undefined) => keys.find(k => k in row) ? row[keys.find(k => k in row)] : def;
  const id = row.id ?? row.uuid ?? row.cnpj ?? Math.random().toString(36).slice(2);
  const nome = get(["nome", "razao", "razao_social", "razaoSocial"], "—");
  const fantasia = get(["fantasia", "nome_fantasia", "apelido"], null);
  const cnpj = get(["cnpj"], "—");
  const regime = get(["regime", "regime_tributario", "tributacao"], "—");
  const status = (get(["status"], "OK") || "OK").toUpperCase();
  const ultimoEnvioISO = get(["ultimoEnvioISO", "ultimo_envio_iso", "ultimo_envio"], null);
  const arquivosNoMes = Number(get(["arquivosNoMes", "arquivos_no_mes"], 0)) || 0;

  const atrasoImpostos = Boolean(get(["atrasoImpostos", "atraso_impostos", "pendencia_pagamento_impostos", "em_atraso_pagamento"], false));
  const semLancamentos = Boolean(get(["semLancamentos", "sem_lancamentos", "sem_informes"], false)) || (arquivosNoMes === 0 && (status === "SEM_ENVIO"));
  const emailIngest = get(["emailIngest", "email_ingest", "email_envio"], "—");

  return { id, nome, fantasia, cnpj, regime, status, ultimoEnvioISO, arquivosNoMes, emailIngest, atrasoImpostos, semLancamentos };
}

function runNormalizeTests() {
  const apiRow = { id: "1", razao_social: "Empresa A", nome_fantasia: "A SA", cnpj: "00.000.000/0001-00", regime_tributario: "Simples", status: "pendente", ultimo_envio_iso: new Date().toISOString(), arquivos_no_mes: 0, pendencia_pagamento_impostos: true };
  const supaRow = { uuid: "2", nome: "Empresa B LTDA", fantasia: null, cnpj: "11.111.111/0001-11", regime: "Lucro Real", status: "OK", ultimo_envio: null, sem_informes: true };
  const n1 = normalizeEmpresa(apiRow);
  const n2 = normalizeEmpresa(supaRow);
  console.assert(n1.atrasoImpostos === true && n1.status === "PENDENTE", "[NORMALIZE TEST] atraso/status API falhou");
  console.assert(n2.semLancamentos === true && n2.status === "OK", "[NORMALIZE TEST] sem informes Supabase falhou");
}

// =========================================================
// Data source (API/Supabase) com fallback
// =========================================================

async function fetchFromApiBase(signal) {
  const base = window.LYSBOX_API_BASE;
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}/contador/empresas`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (window.LYSBOX_API_TOKEN) headers["Authorization"] = window.LYSBOX_API_TOKEN as string;
  const res = await fetch(url, { headers, signal });
  if (!res.ok) throw new Error(`API base falhou: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Formato inválido na API base");
  return data.map(normalizeEmpresa);
}

async function fetchFromSupabase(signal) {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/empresas_status?select=*`;
  const headers: Record<string, string> = { apikey: key as string, Authorization: `Bearer ${key}` };
  const res = await fetch(endpoint, { headers, signal });
  if (!res.ok) throw new Error(`Supabase falhou: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Formato inválido no Supabase");
  return data.map(normalizeEmpresa);
}

async function loadCompanies({ setEmpresas, setLoading, setError, setLastSync }, accountantId?: string | null) {
  const ctrl = new AbortController();
  const { signal } = ctrl;
  setLoading(true);
  setError(null);
  try {
    // Preferência: Supabase (vinculadas ao contador) → API própria → Supabase REST → fallback vazio
    let arr: any[] | null = null;
    try { arr = await fetchFromSupabaseClient(accountantId); } catch (e) { /* tenta próxima fonte */ }
    if (!arr) {
      try { arr = await fetchFromApiBase(signal); } catch (e) { /* tenta próxima */ }
    }
    if (!arr) {
      try { arr = await fetchFromSupabase(signal); } catch (e) { /* fallback */ }
    }
    if (!arr) arr = [];
    setEmpresas(arr);
    setLastSync(new Date());
  } catch (err) {
    setError(err.message || String(err));
    setEmpresas([]);
  } finally {
    setLoading(false);
  }
  return () => ctrl.abort();
}

// Busca via Supabase JS client: empresas vinculadas ao contador autenticado
async function fetchFromSupabaseClient(accountantId?: string | null) {
  try {
    const aid = accountantId;
    if (!aid) return [];
    const { data: rows } = await supabase
      .from("client_accountant_link")
      .select("id, created_at, is_primary, company:companies(id, owner_user_id, razao_social, nome_fantasia, cnpj, regime)")
      .eq("accountant_id", aid)
      .eq("is_primary", true)
      .order("created_at", { ascending: false });

    const mapped = (rows || []).map((r: any) => ({
      id: r.company?.id ?? r.id,
      owner_user_id: r.company?.owner_user_id ?? null,
      nome: r.company?.razao_social ?? "—",
      fantasia: r.company?.nome_fantasia ?? null,
      cnpj: r.company?.cnpj ?? "—",
      regime: r.company?.regime ?? "—",
      status: "OK",
      ultimoEnvioISO: null,
      arquivosNoMes: 0,
      emailIngest: "—",
      atrasoImpostos: false,
      semLancamentos: false,
    }));
    return mapped;
  } catch {
    return null;
  }
}

// =========================================================
// Componente principal
// =========================================================

// Recent documents row type
type RecentDoc = {
  id: string;
  filename: string;
  path: string | null;
  mime_type?: string | null;
  size_bytes: number | null;
  created_at: string;
  share_id?: string | null;
  share_expires_at?: string | null;
  share_max_downloads?: number | null;
  share_downloads_count?: number | null;
  share_status?: string | null;
  share_allow_upload?: boolean | null;
  share_allow_download?: boolean | null;
  share_anti_print?: boolean | null;
};

export default function ContadorDashboard() {
  const [selecionada, setSelecionada] = useState<any>(null);
  const [ivaOps, setIvaOps] = useState([]);

  // Estado de dados (empresas)
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [filesThisMonth, setFilesThisMonth] = useState<number | null>(null);

  // Estado de dados (documentos)
  const [docs, setDocs] = useState<RecentDoc[]>([]);
  const [docsPage, setDocsPage] = useState(1);
  const [docsPageSize, setDocsPageSize] = useState(10);
  const [docsTotal, setDocsTotal] = useState(0);
  const docsTotalPages = Math.max(1, Math.ceil(docsTotal / docsPageSize));
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; mime: string | null; filename: string; anti: boolean } | null>(null);
  const [viewerXml, setViewerXml] = useState<string | null>(null);

  useEffect(() => {
    if (docsPage > docsTotalPages) setDocsPage(docsTotalPages || 1);
  }, [docsTotalPages]);

  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const handleLogout = async () => { await signOut(); navigate("/"); };

  // ==============================
  // Vínculo contador x empresas
  // ==============================
  const [accountantId, setAccountantId] = useState<string | null>(null);
  const [linked, setLinked] = useState<Array<{ id: string; created_at: string; is_primary: boolean; company: any }>>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [detail, setDetail] = useState<{ linkId: string; company: any; created_at: string; is_primary: boolean } | null>(null);
  // Confirm primary flow removed; we'll navigate back to the list instead
  const [showLinkedModal, setShowLinkedModal] = useState(false);

  // Load accountant and then linked companies + initial companies list (guarded against StrictMode double-run)
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      try {
        const { data: acc } = await supabase
          .from("accountants")
          .select("id")
          .maybeSingle();
        const aid = acc?.id ?? null;
        setAccountantId(aid);
        if (aid) {
          await loadLinked(aid);
          await loadCompanies({ setEmpresas, setLoading, setError, setLastSync }, aid);
        } else {
          await loadCompanies({ setEmpresas, setLoading, setError, setLastSync }, null);
        }
      } catch { }
    })();
  }, []);

  async function loadLinked(aid: string) {
    const { data } = await supabase
      .from("client_accountant_link")
      .select("id, created_at, is_primary, company:companies(id, razao_social, nome_fantasia, cnpj, regime)")
      .eq("accountant_id", aid)
      .eq("is_primary", false)
      .order("created_at", { ascending: false });
    setLinked((data as any) || []);
  }

  async function openAddModal() {
    // List companies that are not registered with ANY accountant
    const { data: allLinked } = await supabase
      .from("client_accountant_link")
      .select("company_id");
    const exclude = new Set((allLinked || []).map((r: any) => r.company_id));
    const { data: all } = await supabase
      .from("companies")
      .select("id, razao_social, nome_fantasia, cnpj, regime")
      .order("razao_social", { ascending: true });
    setAvailableCompanies((all || []).filter((c: any) => !exclude.has(c.id)));
    setShowAddModal(true);
  }

  async function addCompany(companyId: string) {
    if (!accountantId) return;
    const { error } = await supabase
      .from("client_accountant_link")
      .insert({ accountant_id: accountantId, company_id: companyId, is_primary: false });
    if (!error) {
      await loadLinked(accountantId);
      setShowAddModal(false);
    }
  }

  async function cancelLink(linkId: string) {
    if (!accountantId) return;
    await supabase.from("client_accountant_link").delete().eq("id", linkId);
    setDetail(null);
    await loadLinked(accountantId);
  }

  // setPrimary removed; use list navigation instead

  // Controles da lista
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [regimeFilter, setRegimeFilter] = useState("todos");
  const [columns, setColumns] = useState(4);
  const [dense, setDense] = useState(false);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [limitTop30, setLimitTop30] = useState(true); // por padrão, exibe apenas TOP 30 por prioridade

  // Plano atual do usuário (armazenamento, usuários)
  const [planInfo, setPlanInfo] = useState<{ planName?: string; storageGb?: number | null; usersAllowed?: number | string | null } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const { data } = await supabase
          .from("subscriptions")
          .select("plan_id, storage_gb, plans:plan_id(name,features,storage_gb)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!data) { setPlanInfo(null); return; }
        const planRow: any = (data as any).plans || {};
        const storageGb = (data as any).storage_gb ?? planRow.storage_gb ?? null;
        const planName = planRow.name || undefined;
        const features = planRow.features;
        const usersAllowed = (() => {
          if (!features) return null;
          // Object style: { limits: { users: N } }
          if (typeof features === "object" && !Array.isArray(features)) {
            const lim = (features as any).limits;
            if (lim && (typeof lim.users === "number" || typeof lim.users === "string")) return lim.users;
          }
          // Array of strings style: ["X usuários", "... "]
          if (Array.isArray(features)) {
            const hit = (features as any[]).find((s) => /usu[aá]rios?/i.test(String(s)) || /users?/i.test(String(s)));
            if (hit) {
              const m = String(hit).match(/(\d+)/);
              if (m) return Number(m[1]);
              if (/ilimitad/i.test(String(hit)) || /unlim/i.test(String(hit))) return "Ilimitado";
              return String(hit);
            }
          }
          return null;
        })();
        setPlanInfo({ planName, storageGb, usersAllowed });
      } catch {
        setPlanInfo(null);
      }
    })();
  }, [user]);

  // Scroll infinito (usado quando limitTop30 = false e lista > 30)
  const CHUNK = 20;
  const [visibleCount, setVisibleCount] = useState(30);
  const containerRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => { runIvaTests(); runSortTests(); runNormalizeTests(); }, []);
  // removed auto-load here; handled after accountant id is loaded

  // Recompute monthly files when a company is selected
  useEffect(() => {
    (async () => {
      if (!selecionada?.owner_user_id) { setFilesThisMonth(null); return; }
      try {
        const start = new Date();
        start.setDate(1); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setMonth(end.getMonth() + 1);
        // Prefer the canonical files table (company-aware) if accessible, fall back to cloud_files otherwise
        let countVal: number | null = null;
        try {
          const { count } = await supabase
            .from('files')
            .select('id', { count: 'exact', head: true })
            .eq('owner_user_id', selecionada.owner_user_id)
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString());
          countVal = count ?? 0;
        } catch {
          const { count } = await supabase
            .from('cloud_files')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', selecionada.owner_user_id)
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString());
          countVal = count ?? 0;
        }
        setFilesThisMonth(countVal);
      } catch {
        setFilesThisMonth(null);
      }
    })();
  }, [selecionada]);

  // Load recent documents for selected company with pagination
  useEffect(() => {
    (async () => {
      if (!selecionada?.owner_user_id) { setDocs([]); setDocsTotal(0); return; }
      try {
        const from = (docsPage - 1) * docsPageSize;
        const to = from + docsPageSize - 1;
        // Primary files only
        const { data, count, error } = await supabase
          .from('files')
          .select('id, filename, path, size_bytes, created_at, mime_type', { count: 'exact' })
          .eq('owner_user_id', selecionada.owner_user_id)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (error) throw error;
        const rows = data || [];
        const total = count ?? 0;
        // Join latest share info via share_files → shares
        const fileIds = rows.map((r: any) => r.id);
        let latestLinkByFile: Record<string, any> = {};
        let sharesMap: Record<string, any> = {};
        if (fileIds.length) {
          const { data: links } = await supabase
            .from('share_files')
            .select('file_id, share_id,id')
            .in('file_id', fileIds);
          (links || []).forEach((l: any) => {
            const curr = latestLinkByFile[l.file_id];
            if (!curr || new Date(l.created_at) > new Date(curr.created_at)) latestLinkByFile[l.file_id] = l;
          });
          const shareIds = Array.from(new Set(Object.values(latestLinkByFile).map((l: any) => l.share_id)));
          if (shareIds.length) {
            const { data: shares } = await supabase
              .from('shares')
              .select('id, expires_at, max_downloads, downloads_count, status, allow_upload, allow_download, anti_print')
              .in('id', shareIds);
            sharesMap = Object.fromEntries((shares || []).map((s: any) => [s.id, s]));
          }
        }
        setDocs(rows.map((r: any) => {
          const link = latestLinkByFile[r.id];
          const sh = link ? sharesMap[link.share_id] : null;
          return {
            id: String(r.id),
            filename: String(r.filename || '—'),
            path: r.path ?? null,
            mime_type: r.mime_type ?? null,
            size_bytes: typeof r.size_bytes === 'number' ? r.size_bytes : null,
            created_at: String(r.created_at || ''),
            share_id: sh?.id ?? null,
            share_expires_at: sh?.expires_at ?? null,
            share_max_downloads: (typeof sh?.max_downloads === 'number') ? sh.max_downloads : null,
            share_downloads_count: (typeof sh?.downloads_count === 'number') ? sh.downloads_count : null,
            share_status: sh?.status ?? null,
            share_allow_upload: typeof sh?.allow_upload === 'boolean' ? sh.allow_upload : null,
            share_allow_download: typeof sh?.allow_download === 'boolean' ? sh.allow_download : null,
            share_anti_print: typeof sh?.anti_print === 'boolean' ? sh.anti_print : null,
          } as RecentDoc;
        }));
        setDocsTotal(total);
      } catch {
        setDocs([]); setDocsTotal(0);
      }
    })();
  }, [selecionada, docsPage, docsPageSize]);

  // Load XML text for overlay when viewing XML to allow white font rendering
  useEffect(() => {
    (async () => {
      try {
        if (!viewerOpen || !viewer) { setViewerXml(null); return; }
        const name = String(viewer.filename || '').toLowerCase();
        const mime = String(viewer.mime || '').toLowerCase();
        const isXml = mime.includes('xml') || /\.xml$/.test(name);
        if (!isXml) { setViewerXml(null); return; }
        if (!viewer.url) { setViewerXml(null); return; }
        const res = await fetch(viewer.url);
        const text = await res.text();
        setViewerXml(text);
      } catch {
        setViewerXml(null);
      }
    })();
  }, [viewerOpen, viewer]);

  function formatBytes(n?: number | null): string {
    if (!n || n <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0; let val = n;
    while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
    return `${val.toFixed(val >= 10 ? 0 : 1)} ${units[i]}`;
  }

  function pageWindow(current: number, total: number, maxBtns = 5): number[] {
    const len = Math.min(total, maxBtns);
    if (total <= maxBtns) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, current - Math.floor(maxBtns / 2));
    let end = start + len - 1;
    if (end > total) { end = total; start = end - len + 1; }
    return Array.from({ length: len }, (_, i) => start + i);
  }

  // Filtro + busca + (opcional) somente alertas
  const filteredBase = useMemo(() => {
    const q = query.trim().toLowerCase();
    return empresas.filter((e) => {
      const matchesQ = !q || `${e.nome} ${e.fantasia || ""} ${e.cnpj}`.toLowerCase().includes(q);
      const matchesS = statusFilter === "todos" || e.status === statusFilter;
      const matchesR = regimeFilter === "todos" || e.regime === regimeFilter;
      const matchesAlert = !showAlertsOnly || isCompanyInAlert(e);
      return matchesQ && matchesS && matchesR && matchesAlert;
    });
  }, [empresas, query, statusFilter, regimeFilter, showAlertsOnly]);

  // Ordenação por prioridade de alerta
  const filteredSorted = useMemo(() => filteredBase.slice().sort(compareEmpresas), [filteredBase]);

  // Contadores
  const totalAlerts = useMemo(() => filteredBase.filter(isCompanyInAlert).length, [filteredBase]);
  const totalAtraso = useMemo(() => filteredBase.filter(e => e.atrasoImpostos).length, [filteredBase]);
  const totalSemInfo = useMemo(() => filteredBase.filter(e => e.semLancamentos || e.status === "SEM_ENVIO").length, [filteredBase]);

  // Visibilidade: top 30 por padrão; senão, scroll infinito
  useEffect(() => {
    setVisibleCount(30);
  }, [filteredSorted.length, limitTop30]);

  // IntersectionObserver (apenas quando não limitado a 30)
  useEffect(() => {
    if (limitTop30) return; // sem scroll infinito no modo TOP 30
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const rootEl = expanded ? containerRef.current : null; // null = viewport
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleCount((curr) => {
            if (filteredSorted.length <= 30) return filteredSorted.length;
            return Math.min(filteredSorted.length, curr + CHUNK);
          });
        }
      });
    }, { root: rootEl, rootMargin: "200px", threshold: 0 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [expanded, filteredSorted.length, limitTop30]);

  const visibleItems = useMemo(() => {
    if (limitTop30) return filteredSorted.slice(0, 30);
    return filteredSorted.slice(0, visibleCount);
  }, [filteredSorted, visibleCount, limitTop30]);

  const pendentesCount = useMemo(() => empresas.filter(e => e.status === "PENDENTE" || e.status === "CRITICO").length, [empresas]);

  return (
    <PlainLayout>
      <Seo title="Painel do Contador • Lysbox" description="Gerencie clientes, uploads e alertas." />

      <section className="rounded-3xl shadow-glow overflow-hidden border border-white/15" style={{ padding: 24, background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))" }}>
        <header className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard Contábil</h1>
            <p className="text-sm opacity-80">Gerencie múltiplas empresas, documentos e alertas fiscais</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            {planInfo && (
              <div className="hidden md:flex" style={{ alignItems: "stretch" }}>
                <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs" style={{ display: "grid", gap: 4 }}>
                  {planInfo.planName && (
                    <div className="inline-flex items-center gap-2"><I.plan /> <span>{String(planInfo.planName)}</span></div>
                  )}
                  {typeof planInfo.storageGb !== "undefined" && planInfo.storageGb !== null && (
                    <div className="inline-flex items-center gap-2"><I.storage /> <span>{planInfo.storageGb} GB</span></div>
                  )}
                  {planInfo.usersAllowed != null && (
                    <div className="inline-flex items-center gap-2"><I.users /> <span>{String(planInfo.usersAllowed)} usuários</span></div>
                  )}
                </div>
              </div>
            )}
            <Button className="h-9 px-3" onClick={() => navigate("/planos", { state: { from: location.pathname } })}>Upgrade</Button>
            <Button className="h-9 px-3" onClick={handleLogout}>Sair</Button>
          </div>
        </header>

        {/* Barra de status da sincronização */}
        {!selecionada && (
          <div className="mb-3" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Badge tone={totalAlerts > 0 ? "rose" : "emerald"}><I.alert /> {totalAlerts} em alerta</Badge>
            <Badge tone={totalAtraso > 0 ? "rose" : "emerald"}><I.overdue /> {totalAtraso} em atraso de impostos</Badge>
            <Badge tone={totalSemInfo > 0 ? "amber" : "emerald"}><I.noinfo /> {totalSemInfo} sem informes</Badge>
            {/* planInfo moved next to Upgrade button for better visibility */}
            <span className="text-xs opacity-60">{lastSync ? `Atualizado ${timeAgo(lastSync)} atrás` : "—"}</span>
            <Button onClick={() => loadCompanies({ setEmpresas, setLoading, setError, setLastSync }, accountantId)} disabled={loading}><I.sync /> {loading ? "Sincronizando…" : "Sincronizar"}</Button>
            <Button onClick={openAddModal}><I.plus /> Adicionar empresa</Button>
            <Button onClick={() => setShowLinkedModal(true)}><I.users /> Empresas vinculadas ({linked.length})</Button>
          </div>
        )}

        {/* Erro de carga */}
        {error && (
          <Card className="mb-4" style={{ borderColor: "rgba(244,63,94,0.5)", boxShadow: "0 0 0 2px rgba(244,63,94,0.35)" }}>
            <CardHeader className="flex items-center gap-2"><I.error /> <CardTitle>Falha ao carregar dados</CardTitle></CardHeader>
            <CardContent className="text-xs opacity-80">{String(error)}</CardContent>
          </Card>
        )}

        {/* Controles da lista */}
        {!selecionada && (
          <Card className="mb-4" style={{ position: "sticky", top: 0, zIndex: 5 }}>
            <CardContent>
              <div className="grid" style={{ gridTemplateColumns: "1fr repeat(7, max-content)", gap: 8, alignItems: "center" }}>
                <div>
                  <label className="text-xs opacity-80">Busca</label>
                  <div className="flex items-center gap-2">
                    <span><I.search /></span>
                    <input value={query} onChange={(e) => { setQuery(e.target.value); }} placeholder="Nome, fantasia ou CNPJ" className="w-full rounded-md bg-black/20 border border-white/20 p-2" />
                  </div>
                </div>
                <div>
                  <label className="text-xs opacity-80">Status</label>
                  <select className="rounded-md bg-black/20 border border-white/20 p-2" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); }}>
                    <option value="todos">Todos</option>
                    <option value="OK">OK</option>
                    <option value="PENDENTE">Pendência</option>
                    <option value="CRITICO">Crítico</option>
                    <option value="SEM_ENVIO">Sem envio</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs opacity-80">Regime</label>
                  <select className="rounded-md bg-black/20 border border-white/20 p-2" value={regimeFilter} onChange={e => { setRegimeFilter(e.target.value); }}>
                    <option value="todos">Todos</option>
                    <option value="MEI">MEI</option>
                    <option value="Simples">Simples</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs opacity-80">Colunas</label>
                  <select className="rounded-md bg-black/20 border border-white/20 p-2" value={columns} onChange={e => setColumns(Number(e.target.value))}>
                    {[3, 4, 5, 6].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs opacity-80">Densidade</label>
                  <Button onClick={() => setDense(v => !v)}>{dense ? <><I.compact /> Compacta</> : <><I.grid /> Normal</>}</Button>
                </div>
                <div>
                  <label className="text-xs opacity-80">Apenas alertas</label>
                  <Button onClick={() => setShowAlertsOnly(v => !v)}>{showAlertsOnly ? "Sim" : "Não"}</Button>
                </div>
                <div>
                  <label className="text-xs opacity-80">Limitar a 30</label>
                  <Button onClick={() => setLimitTop30(v => !v)}>{limitTop30 ? "Sim" : "Não"}</Button>
                </div>
                <div>
                  <label className="text-xs opacity-80">Visão</label>
                  <Button onClick={() => setExpanded(v => !v)}>{expanded ? <><I.collapse /> Reduzir</> : <><I.expand /> Expandir</>}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Métricas (escondidas quando expandido) */}
        {!selecionada && !expanded && (
          <section className="grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
            <Card><CardHeader><CardTitle><I.money /> Receita Mensal (estimada)</CardTitle></CardHeader><CardContent style={{ fontSize: 20, fontWeight: 700 }}>R$ 45.230</CardContent></Card>
            <Card><CardHeader><CardTitle><I.receipt /> Despesas</CardTitle></CardHeader><CardContent style={{ fontSize: 20, fontWeight: 700 }}>R$ 18.450</CardContent></Card>
            <Card><CardHeader><CardTitle><I.calc /> Impostos a Pagar (simulação)</CardTitle></CardHeader><CardContent style={{ fontSize: 20, fontWeight: 700 }}>R$ {computeIva(ivaOps).saldo.toFixed(2)}</CardContent></Card>
            <Card><CardHeader><CardTitle><I.users /> Clientes com pendência</CardTitle></CardHeader><CardContent style={{ fontSize: 20, fontWeight: 700 }}>{pendentesCount}</CardContent></Card>
          </section>
        )}

        {/* Lista multiempresa */}
        {!selecionada && (
          <section
            ref={containerRef}
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: 12,
              marginBottom: 12,
              maxHeight: expanded ? "calc(100dvh - 220px)" : "",
              overflowY: expanded ? "auto" : "visible",
              paddingRight: expanded ? 6 : 0,
            }}
          >
            {visibleItems.map((empresa) => {
              const st = statusTone(empresa);
              const alert = isCompanyInAlert(empresa);
              return (
                <Card
                  key={empresa.id}
                  className={classNames(dense && "p-3")}
                  style={{
                    boxShadow: alert ? "0 0 0 2px rgba(244,63,94,0.45)" : undefined,
                    borderColor: alert ? "rgba(244,63,94,0.5)" : undefined,
                  }}
                >
                  <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <CardTitle><I.building /> {empresa.fantasia || empresa.nome}</CardTitle>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {empresa.atrasoImpostos && <Badge tone="rose"><I.overdue /> Atraso impostos</Badge>}
                      {(empresa.semLancamentos || empresa.status === "SEM_ENVIO") && <Badge tone="amber"><I.noinfo /> Sem informes</Badge>}
                      {!empresa.atrasoImpostos && !(empresa.semLancamentos || empresa.status === "SEM_ENVIO") && <Badge tone={st.tone}>{st.label}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs opacity-80">CNPJ: {empresa.cnpj}</div>
                    <div className="text-xs opacity-80">Regime: {empresa.regime}</div>
                    <div className="text-xs opacity-80" style={{ marginBottom: 8 }}>Último envio: {timeAgo(empresa.ultimoEnvioISO)}</div>
                    <Button onClick={() => setSelecionada(empresa)}><I.chevronR /> Acessar</Button>
                  </CardContent>
                </Card>
              );
            })}

            {/* Sentinel para scroll infinito (só quando permitido) */}
            {!limitTop30 && <div ref={sentinelRef} style={{ height: 1 }} />}
          </section>
        )}

        {/* Loader / fim da lista (apenas quando scroll infinito está ativo) */}
        {!selecionada && !limitTop30 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, margin: "6px 0 12px" }}>
            {filteredSorted.length > visibleCount ? (
              <span className="text-xs opacity-70">Carregando mais…</span>
            ) : (
              <span className="text-xs opacity-50">{filteredSorted.length === 0 ? "Nenhuma empresa encontrada" : "Fim da lista"}</span>
            )}
          </div>
        )}

        {/* Módulo IVA (escondido quando expandido para priorizar empresas) */}
        {!selecionada && !expanded && (
          <section className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card><CardHeader><CardTitle>Operações IVA (stub)</CardTitle></CardHeader><CardContent><IvaOperationsForm onChange={setIvaOps} /></CardContent></Card>
            <Card><CardHeader><CardTitle>Painel IVA (stub)</CardTitle></CardHeader><CardContent><IvaDashboard ops={ivaOps} /></CardContent></Card>
          </section>
        )}

        {/* Detalhe da empresa */}
        {selecionada && (
          <section className="space-y-4">
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <Button onClick={() => setSelecionada(null)}><I.chevronL /> Voltar</Button>
              <h2 className="text-lg font-semibold">{selecionada.fantasia || selecionada.nome}</h2>
              <Badge tone={statusTone(selecionada).tone}>{statusTone(selecionada).label}</Badge>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <Card><CardHeader className="pb-1"><CardTitle>Dados</CardTitle></CardHeader><CardContent className="text-sm opacity-80" style={{ display: "grid", gap: 4 }}><div>CNPJ: {selecionada.cnpj}</div><div>Regime: {selecionada.regime}</div><div>Último envio: {timeAgo(selecionada.ultimoEnvioISO)}</div></CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle>Arquivos no mês</CardTitle></CardHeader><CardContent style={{ fontSize: 20, fontWeight: 700 }}>{filesThisMonth ?? 0}</CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle>Status</CardTitle></CardHeader><CardContent className="text-sm font-medium">{selecionada.status}</CardContent></Card>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Card>
                <CardHeader><CardTitle><I.calendar /> Calendário Fiscal</CardTitle></CardHeader>
                <CardContent>
                  {!selecionada ? (
                    <div className="h-40 rounded-xl border border-dashed flex items-center justify-center opacity-70">Selecione uma empresa</div>
                  ) : (
                    <FiscalCalendar companyId={selecionada.id} ownerUserId={selecionada.owner_user_id} regime={selecionada.regime || ''} />
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle><I.pie /> Documentos recentes</CardTitle></CardHeader>
                <CardContent>
                  {!selecionada ? (
                    <div className="h-40 rounded-xl border border-dashed flex items-center justify-center opacity-70">Selecione uma empresa</div>
                  ) : (
                    <div className="rounded-xl border border-white/15 bg-white/5 overflow-hidden" style={{ width: '70%' }}>
                      <div className="max-h-[360px] overflow-auto">
                        <table className="w-full text-xs min-w-[900px]">
                          <thead className="sticky top-0 bg-white/10">
                            <tr>
                              <th className="text-center px-1 py-4 sticky left-0 z-20 bg-[#0b1220] border-r border-white/10 w-[120px]">Arquivo</th>
                              <th className="text-center px-2 py-4 w-0">Tipo</th>
                              <th className="text-center px-2 py-4 w-0">Enviado</th>
                              <th className="text-center px-2 py-4 w-0">Expira</th>
                              <th className="text-center px-2 py-4 w-0">Máx</th>
                              <th className="text-center px-2 py-4 w-0">Downloads</th>
                              <th className="text-center px-2 py-4 w-0">Status</th>
                              <th className="text-center px-1 py-4 sticky right-0 z-20 bg-[#0b1220] border-l border-white/10 w-[52px]">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {docs.map((d) => {
                              const fileType = d.mime_type || (d.filename.includes('.') ? d.filename.split('.').pop() : '—');
                              const sent = d.created_at ? new Date(d.created_at).toLocaleDateString() : '—';
                              const exp = d.share_expires_at ? new Date(d.share_expires_at).toLocaleDateString() : '—';
                              const cnt = d.share_downloads_count ?? 0;
                              const maxNum = (typeof d.share_max_downloads === 'number') ? d.share_max_downloads : null;
                              const status = d.share_status || '—';
                              const disableDownload = (d.share_allow_download !== true) || !maxNum || maxNum <= 0 || cnt >= maxNum || !d.path;
                              return (
                                <tr key={d.id} className="border-t border-white/10 hover:bg-white/5">
                                  <td className="px-1 py-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px] w-[140px] sticky left-0 z-10 bg-[#0b1220] border-r border-white/10 text-center">{d.filename}</td>
                                  <td className="px-2 py-1 text-center">{String(fileType)}</td>
                                  <td className="px-2 py-1 text-center">{sent}</td>
                                  <td className="px-2 py-1 text-center">{exp}</td>
                                  <td className="px-2 py-1 text-center">{maxNum ?? '—'}</td>
                                  <td className="px-2 py-1 text-center">{cnt}</td>
                                  <td className="px-2 py-1 text-center">{status}</td>
                                  <td className="px-1 py-1 text-center sticky right-0 z-10 bg-[#0b1220] border-l border-white/10 w-[52px] max-w-[100px]">
                                    <div className="inline-flex items-center gap-0.5">
                                      <Button disabled={disableDownload} onClick={async () => {
                                        if (disableDownload) return;
                                        try {
                                          const dl = await supabase.storage.from('user-files').download(d.path);
                                          if (dl.error || !dl.data) throw dl.error || new Error('download failed');
                                          const blobUrl = URL.createObjectURL(dl.data);
                                          const a = document.createElement('a');
                                          a.href = blobUrl; a.download = d.filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(blobUrl);
                                          if (d.share_id) {
                                            const nextCount = (d.share_downloads_count ?? 0) + 1;
                                            await supabase.from('shares').update({ downloads_count: nextCount }).eq('id', d.share_id);
                                            setDocs(curr => curr.map(x => x.id === d.id ? { ...x, share_downloads_count: nextCount } : x));
                                          }
                                        } catch (e) {
                                          alert('Falha ao baixar o arquivo. Tente novamente.');
                                        }
                                      }} className="h-6 px-1 text-xs"><I.download /></Button>
                                      <Button disabled={!d.path} onClick={async () => {
                                        if (!d.path) return;
                                        try {
                                          // Fetch blob and open inside internal overlay (anti-print/copy lock supported)
                                          const dl = await supabase.storage.from('user-files').download(d.path);
                                          if (dl.error || !dl.data) throw dl.error || new Error('open failed');
                                          const blobUrl = URL.createObjectURL(dl.data);
                                          setViewer({ url: blobUrl, mime: d.mime_type || null, filename: d.filename, anti: d.share_anti_print === true });
                                          setViewerOpen(true);
                                        } catch (e) {
                                          alert('Falha ao abrir o arquivo.');
                                        }
                                      }} className="h-6 px-1 text-xs"><I.view /></Button>
                                      <Button disabled={d.share_allow_upload !== true} onClick={() => { /* future upload flow */ }} className="h-6 px-1 text-xs"><I.upload /></Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {docs.length === 0 && (
                              <tr><td colSpan={8} className="px-3 py-6 text-center opacity-70">Nenhum documento encontrado.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {/* Pagination */}
                      <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 bg-white/5 gap-3">
                        <span className="text-xs opacity-70">Página {docsPage} / {docsTotalPages}</span>
                        <div className="flex items-center gap-1">
                          {docsTotalPages > 5 && docsPage > 3 && (
                            <Button onClick={() => setDocsPage(1)}>1</Button>
                          )}
                          {docsTotalPages > 5 && docsPage > 4 && (
                            <span className="px-1 opacity-60">…</span>
                          )}
                          {pageWindow(docsPage, docsTotalPages, 5).map(n => (
                            <Button key={n} onClick={() => setDocsPage(n)} className={n === docsPage ? "bg-white/20" : undefined}>{n}</Button>
                          ))}
                          {docsTotalPages > 5 && docsPage < docsTotalPages - 3 && (
                            <span className="px-1 opacity-60">…</span>
                          )}
                          {docsTotalPages > 5 && docsPage < docsTotalPages - 2 && (
                            <Button onClick={() => setDocsPage(docsTotalPages)}>{docsTotalPages}</Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs opacity-70">Mostrar</label>
                          <div className="min-w-[72px]">
                            <Select value={String(docsPageSize)} onValueChange={(v) => { setDocsPageSize(Number(v)); setDocsPage(1); }}>
                              <SelectTrigger className="h-7 bg-white/10 text-white border border-white/15">
                                <SelectValue placeholder={String(docsPageSize)} />
                              </SelectTrigger>
                              <SelectContent className="min-w-[4.5rem] w-[4.5rem] bg-white/5 text-white border border-white/15 backdrop-blur-md">
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="15">15</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </section>

      {/* Add company modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur" style={{ width: 540, maxWidth: "90vw", padding: 16 }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Adicionar empresa</h3>
              <Button onClick={() => setShowAddModal(false)}>Fechar</Button>
            </div>
            <div className="text-xs opacity-80 mb-2">Empresas não vinculadas a este contador</div>
            <div className="space-y-2" style={{ maxHeight: 360, overflowY: "auto" }}>
              {availableCompanies.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 p-2">
                  <div>
                    <div className="text-sm font-medium">{c.nome_fantasia || c.razao_social}</div>
                    <div className="text-xs opacity-70">CNPJ: {c.cnpj} • Regime: {c.regime}</div>
                  </div>
                  <Button onClick={() => addCompany(c.id)}>Adicionar</Button>
                </div>
              ))}
              {availableCompanies.length === 0 && (
                <div className="text-xs opacity-70">Nenhuma empresa disponível.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Linked companies modal */}
      {showLinkedModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur" style={{ width: 560, maxWidth: "90vw", padding: 16 }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Empresas vinculadas</h3>
              <Button onClick={() => setShowLinkedModal(false)}>Fechar</Button>
            </div>
            <div className="space-y-2" style={{ maxHeight: 420, overflowY: "auto" }}>
              {linked.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 p-2">
                  <div>
                    <div className="text-sm font-medium">{l.company?.nome_fantasia || l.company?.razao_social || "—"}</div>
                    <div className="text-xs opacity-70">CNPJ: {l.company?.cnpj || "—"} • Regime: {l.company?.regime || "—"} • Desde: {new Date(l.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.is_primary && <Badge tone="emerald">Principal</Badge>}
                    <Button onClick={() => { setDetail({ linkId: l.id, company: l.company, created_at: l.created_at, is_primary: l.is_primary }); setShowLinkedModal(false); }}><I.chevronR /> Detalhes</Button>
                  </div>
                </div>
              ))}
              {linked.length === 0 && (
                <div className="text-xs opacity-70">Nenhuma empresa vinculada.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Linked companies grid */}
      {/* {!selecionada && (
        <section className="mt-4">
          <h3 className="text-sm opacity-80 mb-2">Empresas vinculadas</h3>
          <div className="grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
            {linked.map((l) => (
              <Card key={l.id}>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle><I.building/> {l.company?.nome_fantasia || l.company?.razao_social || "—"}</CardTitle>
                  {l.is_primary && <Badge tone="emerald">Principal</Badge>}
                </CardHeader>
                <CardContent>
                  <div className="text-xs opacity-80">CNPJ: {l.company?.cnpj || "—"}</div>
                  <div className="text-xs opacity-80">Regime: {l.company?.regime || "—"}</div>
                  <div className="text-xs opacity-80 mb-2">Vinculado: {new Date(l.created_at).toLocaleDateString()}</div>
                  <Button onClick={() => setDetail({ linkId: l.id, company: l.company, created_at: l.created_at, is_primary: l.is_primary })}><I.chevronR/> Detalhes</Button>
                </CardContent>
              </Card>
            ))}
            {linked.length === 0 && <div className="text-xs opacity-70">Nenhuma empresa vinculada.</div>}
          </div>
        </section>
      )} */}

      {/* Secure viewer overlay (anti-print / copy lock) */}
      {viewerOpen && viewer && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "grid", placeItems: "center", zIndex: 60 }}
          onContextMenu={(e) => {
            const name = (viewer?.filename || '').toLowerCase();
            const mime = (viewer?.mime || '').toLowerCase();
            const isPdfXml = mime.includes('pdf') || mime.includes('xml') || /\.(pdf|xml)$/.test(name);
            if (isPdfXml) e.preventDefault();
          }}
          onCopy={(e) => {
            const name = (viewer?.filename || '').toLowerCase();
            const mime = (viewer?.mime || '').toLowerCase();
            const isPdf = mime.includes('pdf') || /\.pdf$/.test(name);
            if (isPdf) e.preventDefault();
          }}
          onCut={(e) => {
            const name = (viewer?.filename || '').toLowerCase();
            const mime = (viewer?.mime || '').toLowerCase();
            const isPdf = mime.includes('pdf') || /\.pdf$/.test(name);
            if (isPdf) e.preventDefault();
          }}
          onPaste={(e) => {
            const name = (viewer?.filename || '').toLowerCase();
            const mime = (viewer?.mime || '').toLowerCase();
            const isPdf = mime.includes('pdf') || /\.pdf$/.test(name);
            if (isPdf) e.preventDefault();
          }}
          onKeyDown={(e) => {
            const name = (viewer?.filename || '').toLowerCase();
            const mime = (viewer?.mime || '').toLowerCase();
            const isPdf = mime.includes('pdf') || /\.pdf$/.test(name);
            const k = e.key.toLowerCase();
            // Always block save (download) from overlay
            if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); e.stopPropagation(); return; }
            // Block copy on PDF
            if ((e.ctrlKey || e.metaKey) && k === 'c' && isPdf) { e.preventDefault(); e.stopPropagation(); return; }
            // Block print on PDF regardless of anti_print (keyboard only)
            if ((e.ctrlKey || e.metaKey) && k === 'p' && isPdf) { e.preventDefault(); e.stopPropagation(); return; }
          }}
        >
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur relative" style={{ width: "90vw", height: "85vh", padding: 8, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div className="text-sm">Visualizando: {viewer.filename}</div>
              <div className="inline-flex items-center gap-2">
                <Button disabled onClick={(e) => e.preventDefault()}>Baixar (bloqueado)</Button>
                <Button onClick={() => { if (viewer.url) URL.revokeObjectURL(viewer.url); setViewerOpen(false); setViewer(null); }}>Fechar</Button>
              </div>
            </div>
            <div style={{ position: "relative", width: "100%", height: "calc(100% - 28px)", overflow: "auto" }}>
              {viewer.anti && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(-30deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 2px, transparent 2px, transparent 120px)", zIndex: 2 }} />
              )}
              {viewer.mime?.startsWith('image/') ? (
                <img src={viewer.url} alt="preview" style={{ maxWidth: "100%", height: "auto", position: "relative", zIndex: 1 }} />
              ) : viewer.mime?.includes('pdf') ? (
                <iframe
                  src={`${viewer.url}#toolbar=0&navpanes=0&scrollbar=0`}
                  title="pdf"
                  style={{ width: "100%", height: "100%", border: 0, position: "relative", zIndex: 1 }}
                />
              ) : (
                (() => {
                  const name = String(viewer.filename || '').toLowerCase();
                  const mime = String(viewer.mime || '').toLowerCase();
                  const isXml = mime.includes('xml') || /\.xml$/.test(name);
                  if (isXml) {
                    return (
                      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", overflow: "auto" }}>
                        <pre style={{ color: "#fff", background: "transparent", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, userSelect: "none", WebkitUserSelect: "none" }}>
                          {viewerXml ?? "Carregando…"}
                        </pre>
                      </div>
                    );
                  }
                  return (
                    <iframe src={viewer.url} title="doc" style={{ width: "100%", height: "100%", border: 0, position: "relative", zIndex: 1 }} />
                  );
                })()
              )}
            </div>
            {viewer.anti && (
              <style>{`@media print { body * { display: none !important; } }`}</style>
            )}
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"grid", placeItems:"center", zIndex:50 }}>
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur" style={{ width:520, maxWidth:"90vw", padding:16 }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Detalhes da empresa</h3>
              <Button onClick={() => setDetail(null)}>Fechar</Button>
            </div>
            <div className="space-y-1 text-sm opacity-80">
              <div><strong>Empresa:</strong> {detail.company?.nome_fantasia || detail.company?.razao_social || "—"}</div>
              <div><strong>CNPJ:</strong> {detail.company?.cnpj || "—"}</div>
              <div><strong>Regime:</strong> {detail.company?.regime || "—"}</div>
              <div><strong>Data do vínculo:</strong> {new Date(detail.created_at).toLocaleString()}</div>
              <div><strong>Principal:</strong> {detail.is_primary ? "Sim" : "Não"}</div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button onClick={() => { setDetail(null); setShowLinkedModal(true); }}><I.chevronL/> Voltar para lista</Button>
              <Button onClick={() => cancelLink(detail.linkId)}><I.trash/> Cancelar cadastro</Button>
            </div>
          </div>
        </div>
      )}
    </PlainLayout>
  );
}
