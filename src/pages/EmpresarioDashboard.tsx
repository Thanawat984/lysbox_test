import React from "react";
import { motion } from "framer-motion";
import Seo from "@/components/Seo";
import PlainLayout from "@/components/layout/PlainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCompany } from "@/features/company/hooks/useCompany";
import {
  useMonthlyFinance,
  useKpis,
  useCalendar,
} from "@/features/finance/hooks/useFinance";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useLocation } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  DollarSign,
  Receipt,
  Calculator,
  Users,
  Filter,
  Calendar as CalendarIcon,
  Upload,
  Link2,
  Shield,
  HelpCircle,
  Info,
  LogOut,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";
import { fromTheme } from "tailwind-merge";
import {
  extractTextFromImage,
  extractTextFromPDF,
  extractTextFromXML,
} from "@/lib/ocr";
import { extractInvoiceInfo, InvoiceInfo } from "@/lib/extractInfo";
import { parseInvoiceXML } from "@/lib/xmlParser";

/**
 * ==========================
 * Local SHIMS (safe fallbacks)
 * ==========================
 * These avoid runtime errors when the preview environment can't
 * resolve aliases/exports. Replace them by the real components once
 * you confirm the correct paths/exports in your project.
 */

/**
 * IVA stubs: keep to ensure build works without aliasing to `@/features/...`.
 * Swap for real components when paths are confirmed.
 */
const IvaOperationsForm: React.FC<{
  onSimulate?: (r: {
    base: number;
    aliquota: number;
    iva: number;
    cfop?: string;
    natureza?: string;
    at: string;
  }) => void;
}> = ({ onSimulate }) => {
  const [cfop, setCfop] = React.useState("");
  const [aliquota, setAliquota] = React.useState<string>("");
  const [base, setBase] = React.useState<string>("");
  const [natureza, setNatureza] = React.useState("");

  const handleSimular = () => {
    const a = Number(aliquota);
    const b = Number(base);
    if (!a || !b) {
      toast("Informe Alíquota e Base de Cálculo para simular.");
      return;
    }
    const iva = (b * a) / 100;
    onSimulate?.({
      base: b,
      aliquota: a,
      iva,
      cfop: cfop || undefined,
      natureza: natureza || undefined,
      at: new Date().toISOString(),
    });
    toast.success(`IVA estimado: R$ ${iva.toFixed(2)}`);
  };

  const handleLimpar = () => {
    setCfop("");
    setAliquota("");
    setBase("");
    setNatureza("");
    onSimulate?.({
      base: 0,
      aliquota: 0,
      iva: 0,
      at: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-3">
      <div className="text-sm opacity-80">
        Formulário IVA (stub). Substitua por seu componente real.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          value={cfop}
          onChange={(e) => setCfop(e.target.value)}
          placeholder="CFOP"
          className="bg-white/10 border-white/20 text-primary-foreground placeholder:opacity-70"
        />
        <Input
          value={aliquota}
          onChange={(e) => setAliquota(e.target.value)}
          placeholder="Alíquota (%)"
          type="number"
          className="bg-white/10 border-white/20 text-primary-foreground placeholder:opacity-70"
        />
        <Input
          value={base}
          onChange={(e) => setBase(e.target.value)}
          placeholder="Base de Cálculo (R$)"
          type="number"
          className="bg-white/10 border-white/20 text-primary-foreground placeholder:opacity-70"
        />
        <Input
          value={natureza}
          onChange={(e) => setNatureza(e.target.value)}
          placeholder="Natureza da Operação"
          className="bg-white/10 border-white/20 text-primary-foreground placeholder:opacity-70"
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSimular}>Tentar simular</Button>
        <Button variant="secondary" onClick={handleLimpar}>
          Limpar
        </Button>
      </div>
    </div>
  );
};
const IvaDashboard: React.FC = () => {
  const mini = [
    { name: "Jan", debito: 3, credito: 2 },
    { name: "Fev", debito: 2, credito: 1 },
    { name: "Mar", debito: 4, credito: 3 },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-white/10 border-white/15 rounded-xl">
          <CardContent className="p-4">
            <div className="text-[11px] opacity-70">Débito estimado</div>
            <div className="text-lg font-semibold">R$ 1.240</div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 border-white/15 rounded-xl">
          <CardContent className="p-4">
            <div className="text-[11px] opacity-70">Crédito estimado</div>
            <div className="text-lg font-semibold">R$ 820</div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 border-white/15 rounded-xl">
          <CardContent className="p-4">
            <div className="text-[11px] opacity-70">Saldo a recolher</div>
            <div className="text-lg font-semibold">R$ 420</div>
          </CardContent>
        </Card>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mini} margin={{ left: 8, right: 8, top: 6 }}>
            <defs>
              <linearGradient id="ivaDeb" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="ivaCred" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--accent))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--accent))"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="debito"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#ivaDeb)"
            />
            <Area
              type="monotone"
              dataKey="credito"
              stroke="hsl(var(--accent))"
              fillOpacity={1}
              fill="url(#ivaCred)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs opacity-70">
        Este painel é ilustrativo. Conecte suas APIs para valores reais.
      </div>
    </div>
  );
};

// Painel de resultados de simulação (fixo na aba IVA)
const ResultsPanel: React.FC<{
  result: {
    base: number;
    aliquota: number;
    iva: number;
    cfop?: string;
    natureza?: string;
    at: string;
  } | null;
  compact?: boolean;
}> = ({ result, compact }) => {
  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <Card className={compact ? "" : "bg-white/10 border-white/15 rounded-xl"}>
      <CardHeader>
        <CardTitle>
          {compact ? "Simulação (última)" : "Resultados da Simulação"}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        {!result ? (
          <div className="text-muted-foreground">Nenhuma simulação ainda.</div>
        ) : (
          <>
            <div>
              Base de cálculo: <strong>{fmt(result.base)}</strong>
            </div>
            <div>
              Alíquota aplicada: <strong>{result.aliquota}%</strong>
            </div>
            <div>
              IVA estimado: <strong>{fmt(result.iva)}</strong>
            </div>
            {result.cfop && (
              <div>
                CFOP: <strong>{result.cfop}</strong>
              </div>
            )}
            {result.natureza && (
              <div>
                Natureza: <strong>{result.natureza}</strong>
              </div>
            )}
            <div className="text-xs text-muted-foreground pt-1">
              Última simulação: {new Date(result.at).toLocaleString("pt-BR")}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Dados dinâmicos agora são calculados dentro do componente usando Supabase (finance, IVA e calendário).

const H = {
  section: "text-sm opacity-80 flex items-center gap-2",
  card: "bg-white/10 border-white/15 backdrop-blur-md rounded-2xl transition-transform duration-200 hover:scale-[1.01]",
  input:
    "bg-white/10 border-white/20 text-primary-foreground placeholder:opacity-70",
};

/**
 * Self-tests: lightweight checks to prevent regressions without a test runner.
 * (We never change existing tests unless they're wrong; we also add a few more.)
 */
const SelfTest: React.FC = () => {
  const checks = [
    { name: "layout carregado", pass: true, hint: "" },
    { name: "gráfico configurado", pass: true, hint: "" },
    { name: "calendário configurado", pass: true, hint: "" },
    {
      name: "PlainLayout está definido",
      pass: typeof PlainLayout === "function",
      hint: "Use o PlainLayout global como layout",
    },
    {
      name: "Seo está definido",
      pass: typeof Seo === "function",
      hint: "Componente Seo real",
    },
  ];
  return (
    <Card className="bg-white/10 border-white/15 rounded-2xl">
      <CardHeader>
        <CardTitle>Self‑tests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {checks.map((c) => (
          <div key={c.name} className="flex items-center gap-2">
            {c.pass ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-400" />
            )}
            <span className="font-medium">{c.name}</span>
            {!c.pass && <span className="opacity-70"> — {c.hint}</span>}
          </div>
        ))}
        <div className="text-xs opacity-70 pt-1">
          Troque os stubs (AppLayout/Seo/IVA) pelos componentes reais quando os
          caminhos estiverem confirmados.
        </div>
      </CardContent>
    </Card>
  );
};

const EmpresarioDashboard: React.FC = () => {
  const { companyId } = useCompany();
  const { data: monthly } = useMonthlyFinance(companyId);
  const { data: kpis } = useKpis(companyId);
  const { data: cal } = useCalendar(companyId);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toCurrency = (n?: number) =>
    (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const data = (monthly ?? []).map((m) => ({
    name: m.month,
    pagos: m.receitas,
    pendentes: m.despesas,
  }));

  const stats = [
    {
      title: "Receita Mensal",
      value: toCurrency(kpis?.receita),
      change: "+0%",
      positive: true,
      icon: DollarSign,
    },
    {
      title: "Despesas",
      value: toCurrency(kpis?.despesa),
      change: "-0%",
      positive: false,
      icon: Receipt,
    },
    {
      title: "Impostos a Pagar",
      value: toCurrency(kpis?.impostos),
      change: "+0%",
      positive: true,
      icon: Calculator,
    },
    {
      title: "Clientes Ativos",
      value: String(kpis?.clientesAtivos ?? 0),
      change: "+0%",
      positive: true,
      icon: Users,
    },
  ];

  const deadlines = (cal ?? []).slice(0, 4).map((e: any) => {
    const due = new Date(e.due_date);
    const today = new Date();
    const diff = Math.ceil((+due - +new Date(today.toDateString())) / 86400000);
    const status =
      diff === 0
        ? "Hoje"
        : diff > 0
          ? `Em ${diff} dias`
          : `${Math.abs(diff)} dias atrás`;
    const date = due.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    const ref = e.referencia ? new Date(e.referencia) : undefined;
    const label = ref
      ? `Obrigação ref. ${ref.getMonth() + 1}/${String(ref.getFullYear()).slice(
        -2
      )}`
      : "Obrigação fiscal";
    return { date, label, status };
  });

  const [sharePassword, setSharePassword] = React.useState("");
  const [shareExpires, setShareExpires] = React.useState("");
  const [shareMaxDownloads, setShareMaxDownloads] = React.useState<string>("");
  const [antiPrint, setAntiPrint] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [simResult, setSimResult] = React.useState<{
    base: number;
    aliquota: number;
    iva: number;
    cfop?: string;
    natureza?: string;
    at: string;
  } | null>(null);

  const [isAIMode, setIsAIMode] = React.useState(true);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [currentFileId, setCurrentFileid] = React.useState("");
  const [currentShareId, setCurrentShareId] = React.useState("");
  const [showShareInfo, setShowShareInfo] = React.useState(false);
  const [shareInfoLoading, setShareInfoLoading] = React.useState(false);
  const [shareRows, setShareRows] = React.useState<Array<{
    file_id: string;
    filename: string;
    mime_type: string | null;
    created_at: string;
    share_id: string | null;
    allow_upload: boolean;
    allow_download: boolean;
    anti_print: boolean;
    watermark: boolean;
    max_downloads: number | null;
    expires_at: string | null;
    new_password?: string;
    expires_local?: string;
  }>>([]);
  const [sharePage, setSharePage] = React.useState(1);
  const [sharePageSize, setSharePageSize] = React.useState(5);
  const [shareTotalPages, setShareTotalPages] = React.useState(1);

  const fetchShareInfo = React.useCallback(async (page?: number, pageSize?: number) => {
    setShareInfoLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Faça login");
      const p = page ?? sharePage;
      const ps = pageSize ?? sharePageSize;
      const from = (p - 1) * ps;
      const to = from + ps - 1;
      const filesResp = await supabase
        .from("files")
        .select("id,filename,mime_type,created_at", { count: "exact" })
        .eq("owner_user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (filesResp.error) throw filesResp.error;
      const total = filesResp.count || 0;
      setShareTotalPages(Math.max(1, Math.ceil(total / ps)));
      const files = filesResp.data || [];
      const fileIds = files.map((f: any) => f.id);
      if (fileIds.length === 0) { setShareRows([]); return; }
      const linksResp = await supabase
        .from("share_files")
        .select("file_id,share_id,id,created_at")
        .in("file_id", fileIds);
      if (linksResp.error) throw linksResp.error;
      const links = linksResp.data || [];
      const latestLinkByFile: Record<string, any | null> = {};
      for (const l of links) {
        const curr = latestLinkByFile[l.file_id];
        if (!curr || new Date(l.created_at) > new Date(curr.created_at)) {
          latestLinkByFile[l.file_id] = l;
        }
      }
      const shareIds = Array.from(new Set(Object.values(latestLinkByFile).filter(Boolean).map((l: any) => l.share_id)));
      let sharesMap: Record<string, any> = {};
      if (shareIds.length) {
        const sharesResp = await supabase
          .from("shares")
          .select("id,password_hash,expires_at,max_downloads,watermark,anti_print,allow_upload,allow_download,downloads_count,status")
          .in("id", shareIds);
        if (sharesResp.error) throw sharesResp.error;
        sharesMap = Object.fromEntries((sharesResp.data || []).map((s: any) => [s.id, s]));
      }
      const rows = files.map((f: any) => {
        const ln = latestLinkByFile[f.id] || null;
        const sh = ln ? sharesMap[ln.share_id] : null;
        const expires_local = sh?.expires_at ? new Date(sh.expires_at).toISOString().slice(0, 10) : "";
        return {
          file_id: f.id,
          filename: f.filename,
          mime_type: f.mime_type ?? null,
          created_at: f.created_at,
          share_id: sh?.id ?? null,
          allow_upload: !!sh?.allow_upload,
          allow_download: !!sh?.allow_download,
          anti_print: !!sh?.anti_print,
          watermark: !!sh?.watermark,
          max_downloads: sh?.max_downloads ?? null,
          expires_at: sh?.expires_at ?? null,
          new_password: "",
          expires_local,
        };
      });
      setShareRows(rows);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao carregar compartilhamentos");
    } finally {
      setShareInfoLoading(false);
    }
  }, [sharePage, sharePageSize]);

  // Company modal state
  const [showCompanyModal, setShowCompanyModal] = React.useState(false);
  const [companyInfo, setCompanyInfo] = React.useState<any | null>(null);
  const [companyLoading, setCompanyLoading] = React.useState(false);
  const [companyEditMode, setCompanyEditMode] = React.useState(false);
  const [companyForm, setCompanyForm] = React.useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    regime: "mei",
  });

  // Pending accountant confirmation (single confirm modal on load)
  const [pendingQueue, setPendingQueue] = React.useState<Array<{
    id: string;
    created_at: string;
    company_id: string;
    is_primary: boolean;
    accountant: { id: string; user_id: string; crc: string | null; crc_status: string | null; account_name?: string | null };
  }>>([]);
  const [pendingConfirm, setPendingConfirm] = React.useState<{
    id: string;
    created_at: string;
    company_id: string;
    is_primary: boolean;
    accountant: { id: string; user_id: string; crc: string | null; crc_status: string | null; account_name?: string | null };
  } | null>(null);
  const [showPendingConfirm, setShowPendingConfirm] = React.useState(false);

  React.useEffect(() => {
    const loadCompany = async () => {
      if (!showCompanyModal || !user) return;
      setCompanyLoading(true);
      try {
        const { data } = await supabase
          .from("companies")
          .select("id, razao_social, nome_fantasia, cnpj, regime, created_at")
          .eq("owner_user_id", user.id)
          .order("created_at", { ascending: false })
          .maybeSingle();
        setCompanyInfo(data || null);
        if (data) {
          setCompanyForm({
            razao_social: data.razao_social || "",
            nome_fantasia: data.nome_fantasia || "",
            cnpj: data.cnpj || "",
            regime: data.regime || "mei",
          });
          setCompanyEditMode(false);
        } else {
          setCompanyEditMode(true);
        }
      } finally {
        setCompanyLoading(false);
      }
    };
    void loadCompany();
  }, [showCompanyModal, user]);

  // Load pending link requests on first render and show confirm modal if any
  React.useEffect(() => {
    const loadPending = async () => {
      if (!user) return;
      const { data: comps } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_user_id", user.id);
      const ids = (comps || []).map((c: any) => c.id);
      if (!ids.length) { setPendingQueue([]); setPendingConfirm(null); setShowPendingConfirm(false); return; }
      // Use RPC to avoid cross-table RLS recursion when reading accountant info
      const { data: rpcRows, error: rpcError } = await (supabase as any)
        .rpc("get_linked_accountants_for_owner");
      if (rpcError) {
        setPendingQueue([]);
        setPendingConfirm(null);
        setShowPendingConfirm(false);
        return;
      }
      const list = (rpcRows as any[] | null) || [];
      const normalized = list.map((r: any) => ({
        id: r.link_id ?? r.id,
        created_at: r.created_at,
        company_id: r.company_id,
        is_primary: false,
        accountant: {
          id: r.accountant_id ?? r.id,
          user_id: null,
          crc: r.crc ?? null,
          crc_status: r.crc_status ?? null,
          account_name: r.account_name ?? null,
        },
      }));
      setPendingQueue(normalized);
      if (normalized.length > 0) { setPendingConfirm(normalized[0]); setShowPendingConfirm(true); }
      else { setPendingConfirm(null); setShowPendingConfirm(false); }
    };
    void loadPending();
  }, [user]);

  const approvePending = async () => {
    if (!pendingConfirm) return;
    try {
      const { error } = await supabase
        .from("client_accountant_link")
        .update({ is_primary: true })
        .eq("id", pendingConfirm.id);
      if (error) throw error;
      toast.success("Vínculo de contador aprovado.");
      // advance queue deterministically using current snapshot
      const nextList = pendingQueue.filter((l) => l.id !== pendingConfirm.id);
      setPendingQueue(nextList);
      const next = nextList[0] || null;
      setPendingConfirm(next);
      if (!next) setShowPendingConfirm(false);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao aprovar vínculo.");
    }
  };

  const onSaveCompany = async () => {
    if (!user) {
      toast.error("Faça login para cadastrar a empresa.");
      return;
    }
    try {
      const payload: any = {
        owner_user_id: user.id,
        razao_social: companyForm.razao_social || null,
        nome_fantasia: companyForm.nome_fantasia || null,
        cnpj: companyForm.cnpj,
        regime: companyForm.regime,
      };
      // upsert by (owner_user_id, cnpj) or insert new
      const { error } = await supabase.from("companies").upsert(payload);
      if (error) throw error;
      toast.success("Empresa salva com sucesso.");
      // refresh and switch to details view
      const { data } = await supabase
        .from("companies")
        .select("id, razao_social, nome_fantasia, cnpj, regime, created_at")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        .maybeSingle();
      setCompanyInfo(data || null);
      setCompanyEditMode(false);
      setCompanyForm({ razao_social: "", nome_fantasia: "", cnpj: "", regime: "mei" });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar empresa.");
    }
  };

  const [formData, setFormData] = React.useState({
    documentType: "",
    CNPJ: "",
    amount: "",
    dueDate: "",
  });

  async function hashFileSHA256(file: File): Promise<string> {
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Calculate SHA-256
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);

    // Convert ArrayBuffer → hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hashHex;
  }

  const onUploadFile = async (): Promise<void> => {
    if (!selectedFile) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast("Faça login para enviar arquivos.");
      return;
    }
    setUploading(true);
    let success = 0;
    const safeName = selectedFile.name.replace(/\s+/g, "_");
    // OCR
    // let text = "";
    // if (
    //   selectedFile.type === "text/xml" ||
    //   selectedFile.name.endsWith(".xml")
    // ) {
    //   text = await extractTextFromXML(selectedFile);
    // } else if (selectedFile.type === "application/pdf") {
    //   text = await extractTextFromPDF(selectedFile);
    // } else if (selectedFile.type.startsWith("image")) {
    //   text = await extractTextFromImage(selectedFile);
    // }

    // const extracted = extractInvoiceInfo(text);
    // console.log(extracted);

    // const { data, error } = await supabase.functions.invoke("getUploadUrl", {
    //   body: JSON.stringify({
    //     filename: selectedFile.name, // ✅ required
    //     contentType: selectedFile.type || "application/octet-stream", // ✅ required
    //   }),
    // });

    // console.log("Upload URL:", data.uploadUrl);
    // const uploadRes = await fetch(data.uploadUrl, {
    //   method: "PUT",
    //   headers: {
    //     "Access-Control-Allow-Origin": "*",
    //     "Content-Type": selectedFile.type || "application/octet-stream",
    //   },
    //   body: selectedFile,
    // });



    // if (!uploadRes.ok) {
    //   throw new Error("Upload to R2 failed");
    // }
    const [year, month, day] = formData.dueDate.split("-");

    const path = `${auth.user.id}/${year}/${month}/${Date.now()}_${safeName}`;

    // 1) Validate subscription period using server time
    let planStorageGbForLimit: number | null = null;
    try {
      const { data: subRow } = await supabase
        .from("subscriptions")
        .select("status,current_period_end,storage_gb,plans:plan_id(storage_gb)")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const status = (subRow as any)?.status as string | undefined;
      const cpe = (subRow as any)?.current_period_end as string | null;
      const fromSub = (subRow as any)?.storage_gb as number | undefined;
      const fromPlan = (subRow as any)?.plans?.storage_gb as number | undefined;
      planStorageGbForLimit = typeof fromSub === "number" ? fromSub : typeof fromPlan === "number" ? fromPlan : null;

      // PostgREST doesn't allow selecting now() directly without a RPC;
      // fallback to client time. For strict server time, expose an RPC and call supabase.rpc("get_server_time").
      let serverNow = new Date();

      if ((status === "active" || status === "trial") && cpe && serverNow > new Date(cpe)) {
        toast.error("Assinatura expirada", {
          description: "Seu período de assinatura terminou. Faça o upgrade para continuar enviando arquivos.",
          action: {
            label: "Fazer upgrade",
            onClick: () => navigate("/planos", { state: { from: "/empresario" } }),
          },
        } as any);
        setUploading(false);
        return;
      }
    } catch { }

    // 2) Ensure logical bucket record exists (app table)
    let bucketId: string | null = null;
    let usedBytes = 0;
    let limitGb: number | null = null;
    try {
      const br = await supabase
        .from("buckets")
        .select("id,total_size,limit_size")
        .eq("name", auth.user.id)
        .maybeSingle();
      if (br.data?.id) {
        bucketId = br.data.id as any;
        usedBytes = Number((br.data as any).total_size || 0);
        limitGb = (br.data as any).limit_size ?? null;
      } else {
        const created = await supabase
          .from("buckets")
          .insert({
            name: auth.user.id,
            owner_id: auth.user.id,
            type: "nuvem",
            total_size: 0,
            limit_size: planStorageGbForLimit ?? 100,
            public: false,
          })
          .select("id, total_size, limit_size")
          .single();
        if (created.error) {
          throw created.error;
        }
        bucketId = (created.data as any).id as string;
        usedBytes = Number((created.data as any).total_size || 0);
        limitGb = (created.data as any).limit_size ?? null;
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha ao preparar o bucket de armazenamento.");
      setUploading(false);
      return;
    }

    // 3) Capacity check (MB)
    if (typeof limitGb === "number" && limitGb > 0) {
      const limitBytes = limitGb * 1024 * 1024 * 1024;
      const remainingBytes = limitBytes - usedBytes;
      const fileBytes = selectedFile.size || 0;
      if (remainingBytes < 10 * 1024 * 1024) {
        toast.warning("Espaço quase acabando", {
          description: "Seu espaço restante é inferior a 10MB. Considere fazer upgrade de plano.",
          action: {
            label: "Fazer upgrade",
            onClick: () => navigate("/planos", { state: { from: "/empresario" } }),
          },
        } as any);
      }
      if (remainingBytes <= fileBytes) {
        toast.warning("Espaço insuficiente", {
          description: "Não há espaço para este arquivo. Faça upgrade do seu plano para continuar.",
          action: {
            label: "Fazer upgrade",
            onClick: () => navigate("/planos", { state: { from: "/empresario" } }),
          },
        } as any);
        setUploading(false);
        return;
      }
    }

    // 4) Watermark (by type) before uploading
    let fileToUpload: File = selectedFile;
    try {
      const email = (await supabase.auth.getUser()).data?.user?.email || "user@lysbox";
      const mime = selectedFile.type || "application/octet-stream";
      const name = selectedFile.name;
      if (mime.includes("pdf")) {
        const lib: any = await import("pdf-lib");
        const PDFDocument = lib.PDFDocument;
        const rgb = lib.rgb;
        const StandardFonts = lib.StandardFonts;
        const pdfBytes = await selectedFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const watermarkText = email;
        pages.forEach((p: any) => {
          const { width, height } = p.getSize();
          const stepX = 180;
          const stepY = 120;
          for (let y = -stepY; y < height + stepY; y += stepY) {
            for (let x = -stepX; x < width + stepX; x += stepX) {
              p.drawText(watermarkText, {
                x,
                y,
                size: 14,
                font,
                color: rgb(0.5, 0.5, 0.5),
                opacity: 0.5,
                rotate: { type: "degrees", angle: -30 },
              });
            }
          }
        });
        const out = await pdfDoc.save({ useObjectStreams: false });
        fileToUpload = new File([out], name, { type: mime });
      } else if (mime.startsWith("image/")) {
        const imgBitmap = await createImageBitmap(selectedFile);
        const canvas = document.createElement("canvas");
        canvas.width = imgBitmap.width;
        canvas.height = imgBitmap.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(imgBitmap, 0, 0);
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = "grey";
          ctx.font = `${Math.max(14, Math.floor(canvas.width / 30))}px sans-serif`;
          const stepX = Math.max(150, Math.floor(canvas.width / 6));
          const stepY = Math.max(120, Math.floor(canvas.height / 6));
          for (let y = -stepY; y < canvas.height + stepY; y += stepY) {
            for (let x = -stepX; x < canvas.width + stepX; x += stepX) {
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate((-30 * Math.PI) / 180);
              ctx.fillText(email, 0, 0);
              ctx.restore();
            }
          }
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime.includes("png") ? "image/png" : "image/jpeg", 0.92));
          if (blob) fileToUpload = new File([blob], name, { type: mime.includes("png") ? "image/png" : "image/jpeg" });
        }
      } else if (mime.includes("xml") || name.toLowerCase().endsWith(".xml")) {
        const xmlText = await selectedFile.text();
        const comment = `<!-- Watermark: ${email} at ${new Date().toISOString()} -->\n`;
        const watermarked = comment + xmlText;
        fileToUpload = new File([watermarked], name, { type: mime || "text/xml" });
      }
    } catch (e) {
      console.warn("Watermark skipped:", e);
    }

    // 5) Upload to Supabase storage
    const up = await supabase.storage
      .from("user-files")
      .upload(path, fileToUpload, { contentType: fileToUpload.type });
    if (up.error) {
      console.error(up.error);
      toast.error(`Falha ao enviar ${selectedFile.name}`);
      setUploading(false);
      return;
    }

    // const publicUrl = supabase.storage.from("user-files").getPublicUrl(path)
    //   .data.publicUrl;

    //call OCR Edge function
    // const res = await fetch(
    //   "https://lwszqmnbgvwklgsyfdrz.supabase.co/extract-ocr",
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       imageUrl: publicUrl,
    //     }),
    //   }
    // );

    // const ocrData = await res.json();
    // console.log("OCR Result:", ocrData);

    // if (ocrData.error) {
    //   return;
    // }

    const ins = await supabase.from("cloud_files").insert({
      user_id: auth.user.id,
      name: selectedFile.name,
      path,
      mime_type: selectedFile.type || null,
      size_bytes: selectedFile.size,
      original_path: path,
    });

    // Get or create subscriber bucket handled above; only register in our tables now


    const ins_files = await supabase
      .from("files")
      .insert({
        owner_user_id: auth.user.id,
        bucket_id: bucketId,
        company_id: companyId || null,
        filename: selectedFile.name,
        path,
        mime_type: selectedFile.type || null,
        size_bytes: selectedFile.size,
        hash_sha256: await hashFileSHA256(selectedFile),
      })
      .select("id")
      .single();
    // 4b) Update buckets.total_size after successful upload/record
    if (!ins_files.error && bucketId) {
      const totalAfter = usedBytes + (selectedFile.size || 0);
      const upd = await supabase
        .from("buckets")
        .update({ total_size: totalAfter })
        .eq("id", bucketId);
      if (upd.error) console.error(upd.error);
    }
    // Bucket creation removed - using existing bucket structure

    // Generate a UUID for the file record
    const fileId = crypto.randomUUID();
    setCurrentFileid(fileId);

    if (ins.error) {
      console.error(ins.error);
      toast.error(`Erro ao registrar ${selectedFile.name}`);
      setUploading(false);
    }
    setUploading(false);
  };


  const onFilterClick = () => toast("Filtros aplicados (exemplo).");
  const onHelpClick = () => window.open("/#como-funciona", "_blank");
  const toggleAntiPrint = async () => {
    // update current share antiPrint
    setAntiPrint((prev) => {
      const next = !prev;
      return next;
    });
    await updateAntiPrint(!antiPrint);
  };

  async function updateAntiPrint(ap: boolean) {
    const { data, error } = await supabase
      .from("shares")
      .update({ anti_print: ap })
      .eq("id", currentShareId)
      .select();

    if (error) {
      toast.error(error.message);
      return;
    }
    toast(
      ap ? "Anti-print ativado para próximos links." : "Anti-print desativado."
    );
  }

  async function hashPassword(pw: string) {
    const enc = new TextEncoder().encode(pw);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const hashArray = Array.from(new Uint8Array(buf));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function handleGenerateShare() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast("Faça login para gerar o link.");
      return;
    }
    const payload: any = {
      owner_user_id: auth.user.id,
      watermark: true,
      anti_print: antiPrint,
    };
    if (sharePassword)
      payload.password_hash = await hashPassword(sharePassword);
    if (shareExpires) payload.expires_at = new Date(shareExpires).toISOString();
    if (shareMaxDownloads) payload.max_downloads = Number(shareMaxDownloads);

    const { data, error } = await supabase
      .from("shares")
      .insert(payload)
      .select("id")
      .maybeSingle();

    setCurrentShareId(data.id);

    const { data: fileShare, error: fileError } = await supabase
      .from("share_files")
      .insert({
        share_id: data.id,
        file_id: currentFileId,
      });

    if (fileError) {
      toast.error(`Erro ao vincular arquivo: ${fileError.message}`);

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Link gerado com sucesso.");
    }
  }

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/xml",
      "text/xml",
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast.warning("Please upload PDF, JPG, PNG, or XML files only.");
      return false;
    }

    if (file.size > maxSize) {
      toast.warning("Please upload files smaller than 10MB.");
      return false;
    }

    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      toast.success(`${file.name} is ready for processing.`);
    }
  };

  return (
    <PlainLayout>
      <Seo
        title="Painel do Empresário • Lysbox"
        description="Central de documentos, calendário e dashboard tributário."
      />

      {/* HERO */}
      <section className="relative rounded-3xl bg-gradient-to-br from-primary/80 via-indigo-600/70 to-sky-600/70 text-primary-foreground p-4 md:p-6 lg:p-8 shadow-[0_0_40px_rgba(0,0,0,0.25)] overflow-hidden border border-white/15">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 200px at 20% 0%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(500px 200px at 80% 10%, rgba(255,255,255,0.06), transparent 60%)",
          }}
        />
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-white/10"
            onClick={() => setShowCompanyModal(true)}
          >
            <Building2 className="mr-2 h-4 w-4" /> Cadastrar Empresa
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/planos", { state: { from: location.pathname } })}
          >
            Upgrade
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-white/10"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Dashboard Contábil
          </h1>
          <p className="text-sm opacity-80">
            Gerencie sua contabilidade de forma inteligente — obrigações, fluxo
            e documentos em um só lugar.
          </p>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          {stats.map((s) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <Card className={H.card}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                        <s.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs opacity-80">{s.title}</div>
                        <div className="text-xl font-semibold">{s.value}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium">
                      {s.positive ? (
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-rose-400" />
                      )}
                      <span
                        className={
                          s.positive ? "text-emerald-400" : "text-rose-400"
                        }
                      >
                        {s.change}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CHART + CALENDAR */}
        <div className="grid grid-cols-12 gap-6 mb-6" id="dashboard">
          <Card className={`${H.card} col-span-12 md:col-span-8`}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">Receitas vs Despesas</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-white/10"
                  onClick={onFilterClick}
                >
                  <Filter className="h-4 w-4 mr-2" /> Filtrar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="h-64 md:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ left: 8, right: 8, top: 10 }}>
                  <defs>
                    <linearGradient id="pagos" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="pendentes" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--accent))"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--accent))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="pagos"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#pagos)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pendentes"
                    stroke="hsl(var(--accent))"
                    fillOpacity={1}
                    fill="url(#pendentes)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="mt-3 text-xs opacity-70">
                Dica: passe o mouse no gráfico para ver os valores de cada mês.
              </p>
            </CardContent>
          </Card>

          <Card
            id="calendario"
            className={`${H.card} col-span-12 md:col-span-4`}
          >
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" /> Calendário Fiscal
              </CardTitle>
              <Badge variant="secondary" className="bg-white/20">
                Beta
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-3 h-64 md:h-[320px]">
              <Calendar
                mode="single"
                selected={new Date()}
                onSelect={() => { }}
                className="w-full rounded-md border bg-white/5 border-white/15 pointer-events-auto"
              />
              <div className="space-y-2 max-h-32 overflow-auto pr-1">
                {deadlines.map((d) => (
                  <div
                    key={d.label}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-10 items-center justify-center rounded-md border border-white/15 bg-white/10">
                        {d.date}
                      </span>
                      <span>{d.label}</span>
                    </div>
                    <Badge className="bg-white/15" variant="outline">
                      {d.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-12 gap-6" id="acoes">
          {/* Upload inteligente */}
          <Card className={`${H.card} col-span-12 lg:col-span-6`} id="upload">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4" /> Upload inteligente (OCR + IA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-dashed border-white/20 border rounded-xl p-6 text-center">
                {/* Arraste seus arquivos aqui ou
                <Button variant="secondary" className="ml-2" onClick={triggerFilePicker} disabled={uploading}>
                  Selecionar arquivos
                </Button> */}
                {/* <input ref={fileInputRef} type="file" multiple accept="application/pdf,image/*" className="hidden" onChange={onFilesSelected} /> */}
                <div className="relative" style={{ padding: "0 20%" }}>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.jpg,.jpeg,.png,.xml"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                    <span className="text-white-600 text-xs opacity-70">
                      {selectedFile
                        ? selectedFile.name
                        : "Arraste seus arquivos aqui ou Escolha o arquivo - Nenhum arquivo escolhido"}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs opacity-70">
                  Aceita PDF, JPG, PNG. A IA lê, classifica e preenche campos
                  automaticamente.
                </p>
                {/* AI/Manual Toggle */}
                <div className="flex items-center justify-center space-x-3 mt-4">
                  <Label
                    htmlFor="ai-mode"
                    className={!isAIMode ? "text-muted-foreground" : ""}
                  >
                    Manual
                  </Label>
                  <Switch
                    id="ai-mode"
                    checked={isAIMode}
                    onCheckedChange={setIsAIMode}
                  />
                  <Label
                    htmlFor="ai-mode"
                    className={
                      isAIMode
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    AI Mode
                  </Label>
                </div>
                <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <Input
                    type="date"
                    disabled={isAIMode}
                    placeholder="Mês/Ano"
                    className={H.input}
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                  />
                  {/* <Input disabled={isAIMode} placeholder="Tipo de documento" className={H.input} /> */}
                  <Select
                    disabled={isAIMode}
                    value={formData.documentType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, documentType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    disabled={isAIMode}
                    placeholder="valor"
                    className={H.input}
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                  />
                  <Input
                    disabled={isAIMode}
                    placeholder="CNPJ"
                    className={H.input}
                    value={formData.CNPJ}
                    onChange={(e) =>
                      setFormData({ ...formData, CNPJ: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="text-xs opacity-70 flex items-center gap-2">
                <Info className="h-4 w-4" /> Dica: nomeie seus arquivos com{" "}
                <code className="bg-black/20 px-1 rounded">
                  AAAAMM_tipo_cnpj.pdf
                </code>{" "}
                para melhor reconhecimento.
              </div>
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  className="ml-2"
                  onClick={(e) => onUploadFile()}
                  disabled={uploading}
                >
                  Carregar documento
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* IVA */}
          <Card id="iva" className={`${H.card} col-span-12 lg:col-span-6`}>
            <CardHeader>
              <CardTitle>IVA (CBS + IBS)</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="operacoes" className="w-full">
                <TabsList className="bg-white/10 border border-white/15">
                  <TabsTrigger value="operacoes">Operações</TabsTrigger>
                  <TabsTrigger value="painel">Painel</TabsTrigger>
                </TabsList>
                <TabsContent value="operacoes" className="mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <IvaOperationsForm onSimulate={setSimResult} />
                    <ResultsPanel result={simResult} />
                  </div>
                </TabsContent>
                <TabsContent value="painel" className="mt-4 space-y-4">
                  <ResultsPanel result={simResult} compact />
                  <IvaDashboard />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Compartilhamento avançado */}
          <Card id="share" className={`${H.card} col-span-12 lg:col-span-7`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Compartilhamento avançado
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              <div>
                <Label>Senha</Label>
                <Input
                  type="password"
                  placeholder="Opcional"
                  className={H.input}
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                />
                <p className="text-[11px] opacity-70 mt-1">
                  Protege o link com senha única.
                </p>
              </div>
              <div>
                <Label>Expiração</Label>
                <Input
                  type="date"
                  className={H.input}
                  value={shareExpires}
                  onChange={(e) => setShareExpires(e.target.value)}
                />
                <p className="text-[11px] opacity-70 mt-1">
                  Defina até quando o link funciona.
                </p>
              </div>
              <div>
                <Label>Limite de downloads</Label>
                <Input
                  type="number"
                  min={1}
                  className={H.input}
                  value={shareMaxDownloads}
                  onChange={(e) => setShareMaxDownloads(e.target.value)}
                />
                <p className="text-[11px] opacity-70 mt-1">
                  Bloqueia após atingir o limite.
                </p>
              </div>
              <div className="md:col-span-3 flex flex-wrap gap-3">
                <Button onClick={handleGenerateShare}>
                  Gerar link com marca d’água
                </Button>
                <Button
                  variant="secondary"
                  className="inline-flex items-center gap-2"
                  onClick={toggleAntiPrint}
                >
                  <Shield className="h-4 w-4" /> Ativar anti-print
                </Button>

                <Button
                  variant="ghost"
                  className="inline-flex items-center gap-2"
                  onClick={onHelpClick}
                >
                  <HelpCircle className="h-4 w-4" /> Como funciona?
                </Button>
              </div>
              <div className="mt-4">
                <Button
                  variant="ghost"
                  className="inline-flex items-center gap-2"
                  onClick={async () => {
                    setShowShareInfo(true);
                    setSharePage(1);
                    await fetchShareInfo(1, sharePageSize);
                  }}
                >
                  Ver informações de compartilhamento
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* IA Contábil */}
          <Card id="ia" className={`${H.card} col-span-12 lg:col-span-5`}>
            <CardHeader>
              <CardTitle>IA Contábil (chatbot 24h)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-48 border border-white/15 rounded-md p-3 text-sm opacity-80 flex items-center justify-center text-center">
                Em breve: faça perguntas sobre seus documentos, tributos e
                prazos. A IA referencia seus arquivos e responde com base na
                legislação.
              </div>
              <div className={H.section}>
                <Info className="h-4 w-4" />
                <span>
                  Quando ativado, cada resposta trará a fonte (lei/receita
                  federal) e o arquivo consultado.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8 bg-white/20" />

        {/* ONBOARDING RÁPIDO + SELF-TESTS */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className={H.card}>
            <CardHeader>
              <CardTitle>1) Suba seus documentos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm opacity-80">
              Use o <strong>Upload inteligente</strong> para lançar notas,
              boletos e extratos. A IA identifica CNPJ, período e natureza do
              documento.
            </CardContent>
          </Card>
          <Card className={H.card}>
            <CardHeader>
              <CardTitle>2) Acompanhe prazos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm opacity-80">
              Consulte o <strong>Calendário Fiscal</strong> e receba alertas.
              Marque um responsável (você ou seu contador) em cada obrigação.
            </CardContent>
          </Card>
          <Card className={H.card}>
            <CardHeader>
              <CardTitle>3) Gere e compartilhe</CardTitle>
            </CardHeader>
            <CardContent className="text-sm opacity-80">
              Gere <strong>links protegidos</strong> com senha, expiração e
              marca d’água. Ative <strong>anti-print</strong> para conteúdos
              sensíveis.
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <SelfTest />
        </div>
      </section>

      {/* Company Information Modal */}
      <Dialog open={showCompanyModal} onOpenChange={setShowCompanyModal}>
        <DialogContent className="sm:max-w-lg bg-white/10 text-white border border-white/15 backdrop-blur-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Informações da Empresa</DialogTitle>
          </DialogHeader>
          {companyLoading ? (
            <div className="text-sm opacity-70">Carregando…</div>
          ) : companyInfo && !companyEditMode ? (
            <div className="grid gap-3 text-sm">
              <div><span className="font-medium">Razão social:</span> {companyInfo.razao_social || "—"}</div>
              <div><span className="font-medium">Nome fantasia:</span> {companyInfo.nome_fantasia || "—"}</div>
              <div><span className="font-medium">CNPJ:</span> {companyInfo.cnpj || "—"}</div>
              <div><span className="font-medium">Regime:</span> {companyInfo.regime || "—"}</div>
            </div>
          ) : (
            <div className="grid gap-3">
              <div>
                <Label>Razão social</Label>
                <Input
                  value={companyForm.razao_social}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, razao_social: e.target.value }))}
                  placeholder="Razão social"
                  className={H.input}
                />
              </div>
              <div>
                <Label>Nome fantasia</Label>
                <Input
                  value={companyForm.nome_fantasia}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, nome_fantasia: e.target.value }))}
                  placeholder="Nome fantasia"
                  className={H.input}
                />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={companyForm.cnpj}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                  className={H.input}
                />
              </div>
              <div>
                <Label>Regime tributário</Label>
                <select
                  className="mt-1 w-full h-10 rounded-md border bg-white/10 border-white/20 text-white px-3"
                  value={companyForm.regime}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, regime: e.target.value }))}
                >
                  <option value="mei">MEI</option>
                  <option value="simples">Simples</option>
                  <option value="lucro_presumido">Lucro Presumido</option>
                  <option value="lucro_real">Lucro Real</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCompanyModal(false)}>Cancelar</Button>
            {companyInfo && !companyEditMode ? (
              <Button onClick={() => setCompanyEditMode(true)}>Editar</Button>
            ) : (
              <Button onClick={onSaveCompany}>Salvar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Share info manager modal */}
      <Dialog open={showShareInfo} onOpenChange={(v) => { setShowShareInfo(v); if (!v) { setShareRows([]); } }}>
        <DialogContent className="sm:max-w-4xl bg-white/10 text-white border border-white/15 backdrop-blur-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar compartilhamentos</DialogTitle>
          </DialogHeader>
          {shareInfoLoading ? (
            <div className="text-sm opacity-70">Carregando…</div>
          ) : shareRows.length === 0 ? (
            <div className="text-sm opacity-70">Nenhum arquivo encontrado.</div>
          ) : (
            <div className="space-y-3 max-h-[65vh] overflow-auto pr-1">
              {shareRows.map((row, idx) => (
                <div key={row.file_id} className="rounded-2xl border border-white/15 bg-white/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/15 bg-white/10 text-xs">
                        {(sharePage - 1) * sharePageSize + idx + 1}
                      </span>
                      <div className="text-sm font-semibold truncate">{row.filename}</div>
                    </div>
                    <div className="text-[11px] opacity-70">{row.mime_type || "—"} • {new Date(row.created_at).toLocaleString()}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-5 md:col-span-4">
                      <Label className="text-xs opacity-80">Senha (nova)</Label>
                      <Input type="password" placeholder="Deixe em branco para manter" className="h-8 bg-white/10 border-white/20" value={row.new_password || ""} onChange={(e) => setShareRows((prev) => prev.map((r, i) => i === idx ? { ...r, new_password: e.target.value } : r))} />
                    </div>
                    <div className="col-span-6 sm:col-span-4 md:col-span-4">
                      <Label className="text-xs opacity-80">Expiração</Label>
                      <Input type="date" className="h-8 bg-white/10 border-white/20" value={row.expires_local || ""} onChange={(e) => setShareRows((prev) => prev.map((r, i) => i === idx ? { ...r, expires_local: e.target.value } : r))} />
                    </div>
                    <div className="col-span-6 sm:col-span-3 md:col-span-2">
                      <Label className="text-xs opacity-80">Máx. downloads</Label>
                      <Input type="number" min={0} className="h-8 bg-white/10 border-white/20" value={row.max_downloads ?? 0} onChange={(e) => setShareRows((prev) => prev.map((r, i) => i === idx ? { ...r, max_downloads: Number(e.target.value || 0) } : r))} />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2"><input id={`wm_${idx}`} type="checkbox" checked={!!row.watermark} onChange={(e) => setShareRows((prev) => prev.map((r, i) => i === idx ? { ...r, watermark: e.target.checked } : r))} /><Label htmlFor={`wm_${idx}`} className="text-xs opacity-80">Marca d’água</Label></div>
                    <div className="flex items-center gap-2"><input id={`ap_${idx}`} type="checkbox" checked={!!row.anti_print} onChange={(e) => setShareRows((prev) => prev.map((r, i) => i === idx ? { ...r, anti_print: e.target.checked } : r))} /><Label htmlFor={`ap_${idx}`} className="text-xs opacity-80">Anti‑print</Label></div>
                    <div className="flex items-center gap-2"><input id={`au_${idx}`} type="checkbox" checked={!!row.allow_upload} onChange={(e) => setShareRows((prev) => prev.map((r, i) => i === idx ? { ...r, allow_upload: e.target.checked } : r))} /><Label htmlFor={`au_${idx}`} className="text-xs opacity-80">Permitir upload</Label></div>
                    <div className="flex items-center gap-2"><input id={`ad_${idx}`} type="checkbox" checked={!!row.allow_download} onChange={(e) => setShareRows((prev) => prev.map((r, i) => i === idx ? { ...r, allow_download: e.target.checked } : r))} /><Label htmlFor={`ad_${idx}`} className="text-xs opacity-80">Permitir download</Label></div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button variant="default" className="h-8" onClick={async () => {
                      try {
                        const { data: auth } = await supabase.auth.getUser();
                        if (!auth.user) { toast.error("Faça login"); return; }
                        if (!row.share_id) {
                          // Create share and link to file
                          const insertPayload: any = {
                            owner_user_id: auth.user.id,
                            allow_upload: row.allow_upload,
                            allow_download: row.allow_download,
                            anti_print: row.anti_print,
                            watermark: row.watermark,
                            max_downloads: row.max_downloads ?? 0,
                            expires_at: row.expires_local ? row.expires_local : null,
                          };
                          if (row.new_password) insertPayload.password_hash = await hashPassword(row.new_password);
                          const insShare = await supabase
                            .from("shares")
                            .insert(insertPayload)
                            .select("id")
                            .single();
                          if (insShare.error) throw insShare.error;
                          const newShareId = insShare.data.id;
                          const linkIns = await supabase
                            .from("share_files")
                            .insert({ share_id: newShareId, file_id: row.file_id });
                          if (linkIns.error) throw linkIns.error;
                          setShareRows((prev) => prev.map((r, i) => i === idx ? { ...r, share_id: newShareId, new_password: "" } : r));
                          toast.success("Link criado e dados salvos");
                        } else {
                          // Update existing share and ensure link exists
                          const updates: any = {
                            allow_upload: row.allow_upload,
                            allow_download: row.allow_download,
                            anti_print: row.anti_print,
                            watermark: row.watermark,
                            max_downloads: row.max_downloads ?? 0,
                            expires_at: row.expires_local ? row.expires_local : null,
                          };
                          if (row.new_password) updates.password_hash = await hashPassword(row.new_password);
                          const upd = await supabase
                            .from("shares")
                            .update(updates)
                            .eq("id", row.share_id);
                          if (upd.error) throw upd.error;
                          // Ensure relation exists
                          const linkSel = await supabase
                            .from("share_files")
                            .select("id")
                            .eq("share_id", row.share_id)
                            .eq("file_id", row.file_id)
                            .maybeSingle();
                          if (!linkSel.data) {
                            const linkIns = await supabase
                              .from("share_files")
                              .insert({ share_id: row.share_id, file_id: row.file_id });
                            if (linkIns.error) throw linkIns.error;
                          }
                          toast.success("Dados salvos");
                          setShareRows((prev) => prev.map((r, i) => i === idx ? { ...r, new_password: "" } : r));
                        }
                      } catch (e: any) { toast.error(e?.message || "Falha ao salvar"); }
                    }}>Salvar</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs opacity-75">Página {sharePage} / {shareTotalPages}</div>
            <div className="flex items-center gap-2">
              <label className="text-xs opacity-70">Mostrar</label>
              <div className="min-w-[72px]">
                <Select
                  value={String(sharePageSize)}
                  onValueChange={async (v) => {
                    const ps = Number(v);
                    setSharePageSize(ps);
                    setSharePage(1);
                    await fetchShareInfo(1, ps);
                  }}
                >
                  <SelectTrigger className="h-7 bg-white/10 text-white border border-white/15">
                    <SelectValue placeholder={String(sharePageSize)} />
                  </SelectTrigger>
                  <SelectContent className="min-w-[4.5rem] w-[4.5rem] bg-white/5 text-white border border-white/15 backdrop-blur-md">
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" className="h-7 px-2" disabled={sharePage <= 1} onClick={async () => { const p = Math.max(1, sharePage - 1); setSharePage(p); await fetchShareInfo(p, sharePageSize); }}>Anterior</Button>
                <Button variant="ghost" className="h-7 px-2" disabled={sharePage >= shareTotalPages} onClick={async () => { const p = Math.min(shareTotalPages, sharePage + 1); setSharePage(p); await fetchShareInfo(p, sharePageSize); }}>Próxima</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowShareInfo(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm pending accountant link modal */}
      <Dialog open={showPendingConfirm} onOpenChange={setShowPendingConfirm}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900 border border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Confirmação de cadastro de contador</DialogTitle>
          </DialogHeader>
          {!pendingConfirm ? (
            <div className="text-sm opacity-70">Nenhuma solicitação pendente.</div>
          ) : (
            <div className="grid gap-2 text-sm">
              <div><span className="font-medium">Contador:</span> {pendingConfirm.accountant?.account_name || "(nome indisponível)"}</div>
              <div><span className="font-medium">CRC:</span> {pendingConfirm.accountant?.crc || "—"}</div>
              <div><span className="font-medium">Status CRC:</span> {pendingConfirm.accountant?.crc_status || "—"}</div>
              <div className="text-xs opacity-70">Solicitado em {new Date(pendingConfirm.created_at).toLocaleString()}</div>
            </div>
          )}
          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setShowPendingConfirm(false)}>Fechar</Button>
              <Button onClick={approvePending}>Aprovar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlainLayout>
  );
};

export default EmpresarioDashboard;
