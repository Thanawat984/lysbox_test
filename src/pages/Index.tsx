import React, { useEffect, useMemo, useState } from "react";
// NOTE: Canvas-preview safe version with Super Admin control via Supabase-backed
// content (with graceful shims/fallbacks). In your app, swap shims by your
// real design-system imports (button/input/toast/seo/hooks) and Supabase client.

// --------------------------- UI SHIMS (Tailwind-based) ---------------------------
const cn = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "secondary" | "hero" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
};
export const Button: React.FC<BtnProps> = ({
  variant = "default",
  size = "md",
  className,
  children,
  ...p
}) => (
  <button
    className={cn(
      "inline-flex items-center justify-center rounded-2xl border transition focus:outline-none focus:ring disabled:opacity-60",
      variant === "default" &&
        "bg-primary text-primary-foreground border-transparent hover:opacity-90",
      variant === "outline" &&
        "bg-transparent text-foreground border-foreground/20 hover:bg-foreground/5",
      variant === "secondary" &&
        "bg-secondary text-foreground border-transparent hover:opacity-90",
      variant === "hero" &&
        "bg-white text-black border-transparent hover:opacity-90",
      variant === "ghost" &&
        "bg-transparent border-transparent hover:bg-foreground/5",
      size === "sm" && "h-9 px-3 text-sm",
      size === "md" && "h-10 px-4 text-sm",
      size === "lg" && "h-11 px-5 text-base",
      size === "icon" && "h-9 w-9 p-0",
      className
    )}
    {...p}
  >
    {children}
  </button>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className,
  ...p
}) => (
  <input
    className={cn(
      "h-10 w-full rounded-xl border bg-background px-3 text-sm",
      "border-foreground/15 focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10",
      className
    )}
    {...p}
  />
);

export const Textarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
> = ({ className, ...p }) => (
  <textarea
    className={cn(
      "min-h-[120px] w-full rounded-xl border bg-background px-3 py-2 text-sm",
      "border-foreground/15 focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10",
      className
    )}
    {...p}
  />
);

// Simple SEO component shim
const Seo: React.FC<{ title?: string; description?: string }> = ({
  title,
  description,
}) => {
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
};

// Toast shim
const useToast = () => ({
  toast: ({ title, description }: { title?: string; description?: string }) => {
    if (title || description)
      alert([title, description].filter(Boolean).join("\n"));
  },
});

// --------------------------- Icons (lucide) ---------------------------
import {
  Lock,
  ShieldCheck,
  BadgeCheck,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Share2,
  Search,
  FileText,
  Building2,
  Users,
  Camera,
  Download,
  Calculator,
  Bell,
  Star,
  TrendingUp,
  Clock,
  Zap,
  Shield,
  Award,
} from "lucide-react";
// Removed inline payment modal; using dedicated payment page

// --------------------------- Data & Service Shims ---------------------------
const HERO_FALLBACK =
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1470&auto=format&fit=crop";

import { useSiteContent } from "@/hooks/use-site-content";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

// --------------------------- Utilities ---------------------------
const toBRL = (cents?: number | null) =>
  cents == null
    ? "Sob consulta"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format((cents || 0) / 100);

const navigate = (to: string) => {
  if (typeof window !== "undefined") window.location.href = to;
};

// --------------------------- Types ---------------------------
type PlanRow = {
  id: string;
  name: string;
  monthly_price_cents: number | null;
  features: string[] | null;
  storage_gb: number | null;
  tier?: string | null;
  is_demo: boolean;
};
type FaqRow = {
  id: number | string;
  question: string;
  answer: string;
  order?: number;
  approved?: boolean;
};
type TestimonialRow = {
  id: number | string;
  quote: string;
  author: string;
  role: string;
  rating?: number;
  approved?: boolean;
};
type LogoRow = {
  id: number | string;
  url: string;
  alt?: string;
  order?: number;
  approved?: boolean;
};
type KpiRow = { id: number | string; label: string; value: string };
type PromotionRow = {
  id: number | string;
  active: boolean;
  text: string;
  button_label?: string;
  url?: string;
};
type SiteSettingRow = { key: string; value_json: any };

// --------------------------- Landing Page ---------------------------
const Index: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  // ---------- JSON-LD SEO ----------
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Lysbox — Armazenamento em Nuvem + Automação Contábil com IA",
    description:
      "Solução de nuvem segura com IA para empresários, contadores, criadores e profissionais liberais. Cofre fiscal, OCR, compartilhamento seguro e mais.",
    brand: { "@type": "Brand", name: "Lysbox" },
    offers: {
      "@type": "AggregateOffer",
      offerCount: 5,
      lowPrice: "0",
      priceCurrency: "BRL",
    },
  } as const;
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lysbox",
    url:
      typeof window !== "undefined"
        ? window.location.origin
        : "https://lysbox.com.br",
    logo:
      typeof window !== "undefined"
        ? `${window.location.origin}/logo.svg`
        : undefined,
  } as const;

  // ---------- CMS (cores/imagens/textos) ----------
  const { content } = useSiteContent();
  const heroImg = content?.images?.hero ?? HERO_FALLBACK;
  const texts = content?.texts || {};
  const heroType = texts.heroType as string | undefined;
  const videoUrl = texts.videoUrl as string | undefined;
  const videoPoster = content?.images?.videoPoster as string | undefined;

  // ---------- Super Admin controlled data ----------
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialRow[]>([]);
  const [logos, setLogos] = useState<LogoRow[]>([]);
  const [kpis, setKpis] = useState<KpiRow[]>([]);
  const [promo, setPromo] = useState<PromotionRow | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    // plans
    supabase
      .from("plans")
      .select("id,name,monthly_price_cents,features,storage_gb,tier,is_demo")
      .order("monthly_price_cents", { ascending: true })
      .then(({ data }: any) => setPlans(data || []));
    // faqs
    supabase
      .from("faqs")
      .select("*")
      .order("order", { ascending: true })
      .then(({ data }: any) =>
        setFaqs((data || []).filter((x: FaqRow) => x.approved ?? true))
      );
    // testimonials
    supabase
      .from("testimonials")
      .select("*")
      .order("id", { ascending: true })
      .then(({ data }: any) =>
        setTestimonials(
          (data || []).filter((x: TestimonialRow) => x.approved ?? true)
        )
      );
    // logos
    supabase
      .from("logos")
      .select("*")
      .order("order", { ascending: true })
      .then(({ data }: any) =>
        setLogos((data || []).filter((x: LogoRow) => x.approved ?? true))
      );
    // kpis
    supabase
      .from("kpis")
      .select("*")
      .order("id", { ascending: true })
      .then(({ data }: any) => setKpis(data || []));
    // promotions
    supabase
      .from("promotions")
      .select("*")
      .order("id", { ascending: true })
      .then(({ data }: any) => {
        const active = (data || []).find((p: PromotionRow) => p.active);
        setPromo(active || null);
      });
    // site_settings
    supabase
      .from("site_settings")
      .select("*")
      .order("key", { ascending: true })
      .then(({ data }: any) => {
        const map: Record<string, any> = {};
        (data || []).forEach((row: SiteSettingRow) => {
          map[row.key] = row.value_json;
        });
        setSettings(map);
      });
  }, []);

  // ---------- Util: UTM + tracking ----------
  const utmParams = useMemo(() => {
    if (typeof window === "undefined") return {} as Record<string, string>;
    const s = new URLSearchParams(window.location.search);
    const obj: Record<string, string> = {};
    s.forEach((v, k) => (obj[k] = v));
    return obj;
  }, []);

  const track = async (event: string, payload?: Record<string, any>) => {
    try {
      await (supabase as any)
        .from("events")
        .insert([
          {
            event,
            payload: payload || {},
            path:
              typeof window !== "undefined" ? window.location.pathname : "/",
            utm: utmParams,
            at: new Date().toISOString(),
          } as any,
        ]);
    } catch (_) {
      /* silent */
    }
  };

  // ---------- Forms ----------
  const handleLead = async (e: React.FormEvent) => {
    e.preventDefault();
    await track("lead_pre_signup", { position: "hero_form" });
    navigate("/auth?tab=signup");
  };
  const handleWorkWithUs = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({
      title: "Recebido!",
      description: "Obrigado pelo interesse. Em breve entraremos em contato.",
    });
    await track("work_with_us_submit");
    navigate("/trabalhe");
  };

  // ---------- UI helpers ----------
  const Section: React.FC<{
    id?: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }> = ({ id, title, subtitle, children }) => (
    <section id={id} className="py-20">
      <div className="container">
        <header className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            {title}
          </h2>
          {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
        </header>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );

  const AudienceCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    desc: string;
    bullets: { icon: React.ReactNode; text: string }[];
  }> = ({ icon, title, desc, bullets }) => (
    <article className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow hover-scale animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <p className="mt-3 text-muted-foreground">{desc}</p>
      <ul className="mt-4 space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 shrink-0" />
            <span>{b.text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Button
          size="lg"
          onClick={() => {
            track("cta_click", { position: "audience_card" });
            navigate("/auth?tab=signup");
          }}
        >
          Testar grátis agora
        </Button>
      </div>
    </article>
  );

  const PricingCard: React.FC<{
    name: string;
    price: string;
    desc: string;
    features: string[];
    highlight?: boolean;
    ribbon?: string;
    isFree?: boolean;
    planId: string;
    monthlyCents: number;
  }> = ({ name, price, desc, features, highlight, ribbon, isFree, planId, monthlyCents }) => (
    <article
      className={`relative rounded-2xl border p-6 bg-card ${
        highlight ? "shadow-glow ring-1 ring-primary/30" : "shadow-sm"
      }`}
    >
      {ribbon && (
        <div className="absolute -top-3 left-4 px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground shadow">
          {ribbon}
        </div>
      )}
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="text-muted-foreground mt-1">{desc}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-gradient">{price}</span>
        <span className="text-muted-foreground">/mês</span>
      </div>
      <ul className="mt-4 space-y-2">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-6 w-full"
        variant={highlight ? "hero" : "default"}
        onClick={() => {
          track("cta_click", { position: "pricing" });
          if (!user) navigate("/auth?tab=login&next=/planos"); else navigate("/planos");
        }}
        aria-label={`Começar agora plano ${name}`}
      >
        Começar agora
      </Button>
      {isFree && (
        <p className="mt-3 text-xs text-muted-foreground">
          Teste 7 dias grátis • Cancelamento em 1 clique • Sem cartão no teste
        </p>
      )}
    </article>
  );

  const TestimonialCard: React.FC<{
    quote: string;
    author: string;
    role: string;
    rating?: number;
  }> = ({ quote, author, role, rating = 5 }) => (
    <figure className="rounded-2xl border bg-card p-6 shadow-sm animate-fade-in">
      <div
        className="flex items-center gap-1"
        aria-label={`${rating} de 5 estrelas`}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? "fill-current" : "opacity-30"}`}
          />
        ))}
      </div>
      <blockquote className="text-lg mt-2">“{quote}”</blockquote>
      <figcaption className="mt-4 text-sm text-muted-foreground">
        {author} • {role}
      </figcaption>
    </figure>
  );

  // ---------- Feature flags ----------
  const showExitIntent = (settings.show_exit_intent ?? true) as boolean;
  const showStickyCta = (settings.show_sticky_cta ?? true) as boolean;

  // ---------- Exit-intent modal ----------
  const [showExit, setShowExit] = useState(false);
  useEffect(() => {
    if (!showExitIntent) return;
    const seen =
      typeof window !== "undefined"
        ? sessionStorage.getItem("lx_exit_shown")
        : "1";
    if (seen) return;
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) {
        setShowExit(true);
        sessionStorage.setItem("lx_exit_shown", "1");
        track("exit_intent_shown");
      }
    };
    window.addEventListener("mouseout", onLeave);
    return () => window.removeEventListener("mouseout", onLeave);
  }, [showExitIntent]);

  // ---------- Sticky CTA (mobile) ----------
  const [sticky, setSticky] = useState(false);
  useEffect(() => {
    if (!showStickyCta) return;
    const onScroll = () => setSticky(window.scrollY > 500);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [showStickyCta]);

  // ---------- Self-tests (expanded) ----------
  const [tests, setTests] = useState<
    { name: string; ok: boolean; details?: string }[]
  >([]);
  useEffect(() => {
    const t: { name: string; ok: boolean; details?: string }[] = [];
    t.push({
      name: "toBRL(3990) => R$ 39,90",
      ok: toBRL(3990).includes("39,90"),
      details: toBRL(3990),
    });
    t.push({
      name: "Carrega planos",
      ok: Array.isArray(plans) && plans.length > 0,
      details: `${plans.length}`,
    });
    t.push({
      name: "JSON-LD possui @type Product",
      ok: (productLd as any)["@type"] === "Product",
    });
    t.push({
      name: "Carrega FAQs aprovadas",
      ok: faqs.filter((f) => f.approved ?? true).length >= 1,
      details: `${faqs.length}`,
    });
    t.push({
      name: "Carrega depoimentos aprovados",
      ok: testimonials.filter((ti) => ti.approved ?? true).length >= 1,
      details: `${testimonials.length}`,
    });
    t.push({
      name: "Carrega logos",
      ok: logos.length >= 1,
      details: `${logos.length}`,
    });
    t.push({
      name: "Carrega KPIs",
      ok: kpis.length >= 1,
      details: `${kpis.length}`,
    });
    t.push({
      name: "Promo ativa detectada",
      ok: !!promo,
      details: promo ? promo.text : "nenhuma",
    });
    setTests(t);
  }, [plans, faqs, testimonials, logos, kpis, promo]);

  const showDebug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "1";

  return (
    <div className="dark">
      <Seo
        title="Lysbox • Nuvem segura + Automação Contábil com IA"
        description="Armazene, compartilhe e automatize sua contabilidade com IA. Teste grátis por 7 dias."
      />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />

      {/* PROMO RIBBON (dinâmico) */}
      {promo && promo.active && (
        <div className="bg-primary/10 border-b border-primary/20 text-sm">
          <div className="container flex flex-col sm:flex-row items-center justify-center gap-2 py-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>{promo.text}</span>
            </div>
            <Button
              size="sm"
              className="ml-0 sm:ml-3"
              onClick={() => {
                track("cta_click", { position: "promo_ribbon" });
                navigate(promo.url || "/auth?tab=signup");
              }}
            >
              {promo.button_label || "Começar agora"}
            </Button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="h-16 flex items-center border-b px-3 md:px-4 bg-gradient-primary text-primary-foreground sticky top-0 z-40">
        <div className="container flex items-center justify-between">
          <div className="font-semibold tracking-tight">Lysbox</div>
          <div className="flex items-center gap-2">
            <div className="hidden md:block w-64">
              <Input
                placeholder="Buscar..."
                className="h-9 bg-white/10 border-white/20 text-primary-foreground placeholder:opacity-70"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-white/10"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth?tab=login")}
              className="text-primary-foreground hover:bg-white/10"
            >
              Entrar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                track("cta_click", { position: "header" });
                navigate("/auth?tab=signup");
              }}
            >
              Criar conta
            </Button>
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-gradient-subtle">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="interactive-spotlight" />
          <div className="container py-20 grid lg:grid-cols-2 gap-10 items-center">
            <div className="animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                {texts.headline ||
                  "Caixa de Lys — a nuvem inteligente para negócios e contabilidade"}
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                {texts.subheadline ||
                  "Cofre Fiscal com IA, organização automática via OCR, calendário de obrigações e compartilhamento seguro em um só lugar."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => {
                    track("cta_click", { position: "hero_primary" });
                    navigate("/auth?tab=signup");
                  }}
                >
                  {texts.ctaLabel || "Testar grátis agora"}{" "}
                  <ArrowRight className="ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/auth?tab=login")}
                >
                  Entrar
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate("/trabalhe")}
                >
                  Falar com especialista
                </Button>
              </div>

              {/* Mini lead form */}
              <form
                className="mt-8 grid sm:grid-cols-3 gap-3"
                onSubmit={handleLead}
              >
                <Input placeholder="Seu nome" aria-label="Nome" required />
                <Input
                  placeholder="E-mail corporativo"
                  type="email"
                  aria-label="E-mail"
                  required
                />
                <Button type="submit">Pré-cadastrar</Button>
              </form>

              {/* Trust badges */}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {[
                  { Icon: ShieldCheck, label: "Criptografia de ponta a ponta" },
                  { Icon: Lock, label: "2FA + Compliance LGPD" },
                  { Icon: BadgeCheck, label: "Backups e auditoria" },
                ].map(({ Icon, label }, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              {/* Social proof logos (dinâmico) */}
              {logos.length > 0 && (
                <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-4 opacity-80">
                  {logos.map((l) => (
                    <img
                      key={String(l.id)}
                      src={l.url}
                      alt={l.alt || "Logo de cliente"}
                      className="h-6 object-contain"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="relative animate-fade-in">
              {heroType === "video" && videoUrl ? (
                videoUrl.includes("youtube.com") ||
                videoUrl.includes("youtu.be") ? (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-xl">
                    <iframe
                      src={videoUrl
                        .replace("watch?v=", "embed/")
                        .replace("youtu.be/", "www.youtube.com/embed/")}
                      title="Vídeo de apresentação Lysbox"
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <video
                    className="w-full rounded-2xl shadow-xl"
                    src={videoUrl}
                    poster={videoPoster}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                )
              ) : (
                <img
                  src={heroImg}
                  alt="Dashboard do Lysbox com cofre fiscal e compartilhamento seguro"
                  className="w-full rounded-2xl shadow-xl"
                  loading="lazy"
                />
              )}

              {/* KPIs (dinâmico) */}
              {kpis.length > 0 && (
                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  {kpis.slice(0, 3).map((k) => (
                    <div key={String(k.id)} className="rounded-xl border p-3">
                      <div className="text-2xl font-bold">{k.value}</div>
                      <div className="text-xs text-muted-foreground">
                        {k.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <Section
          id="como-funciona"
          title="Como o Lysbox funciona"
          subtitle="Fluxo simples e poderoso para seu dia a dia."
        >
          <div className="grid md:grid-cols-3 gap-6">
            <article className="rounded-2xl border bg-card p-6 relative">
              <div className="absolute top-4 right-4 text-3xl font-extrabold text-gradient">
                01
              </div>
              <FileText className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">Envie seus arquivos</h3>
              <p className="text-muted-foreground">
                Upload rápido com OCR e leitura inteligente de campos fiscais.
              </p>
            </article>
            <article className="rounded-2xl border bg-card p-6 relative">
              <div className="absolute top-4 right-4 text-3xl font-extrabold text-gradient">
                02
              </div>
              <Search className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">Organização automática</h3>
              <p className="text-muted-foreground">
                Tags, pastas e cofre fiscal com classificação por IA.
              </p>
            </article>
            <article className="rounded-2xl border bg-card p-6 relative">
              <div className="absolute top-4 right-4 text-3xl font-extrabold text-gradient">
                03
              </div>
              <Share2 className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">Compartilhe com controle</h3>
              <p className="text-muted-foreground">
                Links com expiração, limite de downloads e bloqueios.
              </p>
            </article>
          </div>
          <div className="mt-10 grid lg:grid-cols-2 gap-6 items-center">
            <img
              src={content?.images?.feature1 ?? heroImg}
              alt="Print do painel do Lysbox com calendário e cofre fiscal"
              className="w-full rounded-2xl shadow-xl"
              loading="lazy"
            />
            <div>
              <h3 className="text-2xl font-semibold">
                IA contábil + segurança avançada
              </h3>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-2">
                  <Shield className="mt-0.5" />
                  <span>Camadas de proteção: 2FA, criptografia, auditoria</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="mt-0.5" />
                  <span>Produtividade com automações e OCR</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="mt-0.5" />
                  <span>Alertas de prazos no calendário fiscal</span>
                </li>
              </ul>
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => {
                    track("cta_click", { position: "como_funciona" });
                    navigate("/auth?tab=signup");
                  }}
                >
                  Começar o teste
                </Button>
                <Button variant="outline" onClick={() => navigate("/planos")}>
                  Conhecer planos
                </Button>
              </div>
            </div>
          </div>
        </Section>

        {/* IVA SECTION */}
        <Section
          id="iva"
          title="IVA (CBS + IBS) conforme Reforma Tributária"
          subtitle="Cálculo, apuração e relatórios automáticos — EC 132/2023."
        >
          <div className="grid lg:grid-cols-2 gap-6 items-center">
            <div>
              <div className="flex items-center gap-2 text-sm">
                <Calculator className="text-primary" />
                <span className="text-muted-foreground">
                  Módulo integrado aos painéis do Empresário e do Contador
                </span>
              </div>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 text-primary" />
                  <span>
                    Cadastro de alíquotas CBS + IBS, setores especiais e regimes
                    específicos
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 text-primary" />
                  <span>
                    Registro de operações (manual e via OCR) com identificação
                    automática do tipo
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 text-primary" />
                  <span>
                    Apuração automática: Débito − Crédito e controle de saldo
                    credor
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 text-primary" />
                  <span>
                    Relatórios por competência/CNPJ, gráficos e exportação
                    CSV/Excel
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 text-primary" />
                  <span>
                    Alertas e integração ao calendário fiscal (e-mail/WhatsApp)
                  </span>
                </li>
              </ul>
              <div className="mt-6 flex gap-3">
                <Button
                  size="lg"
                  onClick={() => {
                    track("cta_click", { position: "iva" });
                    navigate("/auth?tab=signup");
                  }}
                >
                  Ver IVA em ação
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/planos")}
                >
                  Planos com IVA
                </Button>
              </div>
            </div>
            <div className="relative">
              <img
                src={content?.images?.feature2 ?? HERO_FALLBACK}
                alt="Módulo IVA do Lysbox com apuração e gráficos"
                className="w-full rounded-2xl shadow-xl"
                loading="lazy"
              />
            </div>
          </div>
        </Section>

        {/* PÚBLICOS-ALVO */}
        <Section
          id="publicos"
          title="Feito para cada perfil"
          subtitle="Benefícios claros para cada necessidade."
        >
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            <AudienceCard
              icon={<Building2 className="text-primary" />}
              title="Empresário"
              desc="Controle total do fiscal e documentos críticos."
              bullets={[
                {
                  icon: <Calendar />,
                  text: "Cofre Fiscal + calendário com alertas",
                },
                { icon: <Search />, text: "OCR e organização automática" },
                {
                  icon: <Share2 />,
                  text: "Compartilhamento com expiração/limites",
                },
              ]}
            />
            <AudienceCard
              icon={<Users className="text-primary" />}
              title="Contador"
              desc="Performance em multiempresas e prazos."
              bullets={[
                { icon: <Calendar />, text: "Painel multiempresa + alertas" },
                { icon: <Search />, text: "Busca e filtros avançados" },
                {
                  icon: <Share2 />,
                  text: "Recebimento automático de documentos",
                },
              ]}
            />
            <AudienceCard
              icon={<Camera className="text-primary" />}
              title="Fotógrafo/Criador"
              desc="Controle sobre uso do seu conteúdo."
              bullets={[
                { icon: <Download />, text: "Limite de downloads e expiração" },
                { icon: <Lock />, text: "Bloqueio de prints e marca d’água" },
                { icon: <Share2 />, text: "Compartilhamento seguro" },
              ]}
            />
            <AudienceCard
              icon={<FileText className="text-primary" />}
              title="Autônomo"
              desc="Organize contratos e propostas com segurança."
              bullets={[
                {
                  icon: <Search />,
                  text: "Busca rápida por cliente e projeto",
                },
                { icon: <Share2 />, text: "Links protegidos e auditáveis" },
                { icon: <Calendar />, text: "Lembretes e rotinas" },
              ]}
            />
          </div>
        </Section>

        {/* DIFERENCIAIS DE SEGURANÇA */}
        <Section
          id="seguranca"
          title="Segurança de nível empresarial"
          subtitle="Construído para proteger seus dados e os de seus clientes."
        >
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-primary" />
                <h3 className="text-xl font-semibold">
                  Proteção e conformidade
                </h3>
              </div>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5" />
                  Criptografia em repouso e em trânsito
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5" />
                  2FA, controle de sessão e auditoria
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5" />
                  LGPD by design
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border p-6">
              <div className="flex items-center gap-2">
                <Award className="text-primary" />
                <h3 className="text-xl font-semibold">
                  Compartilhamento com controle
                </h3>
              </div>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5" />
                  Senha, expiração, limite de downloads
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5" />
                  Anti-print e marca d’água
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5" />
                  Logs e trilhas de auditoria
                </li>
              </ul>
            </div>
          </div>
        </Section>

        {/* PLANOS */}
        <Section
          id="planos"
          title="Planos e preços"
          subtitle="Teste gratuito por 7 dias em todos os planos."
        >
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {plans.map((p, idx) => (
              <PricingCard
                key={p.id}
                name={p.name}
                price={toBRL(p.monthly_price_cents)}
                desc={
                  p.storage_gb ? `${p.storage_gb} GB de armazenamento` : "Plano"
                }
                features={(p.features as any) || []}
                highlight={idx === 1}
                ribbon={idx === 1 ? "Mais popular" : undefined}
                isFree={p.monthly_price_cents === 0}
                planId={p.id}
                monthlyCents={p.monthly_price_cents ?? 0}
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Todos com 7 dias grátis. Sem cartão na criação. Cancelamento em 1
            clique.
          </p>
        </Section>

        {/* PROVAS SOCIAIS (dinâmico) */}
        {testimonials.length > 0 && (
          <Section
            id="depoimentos"
            title="Quem usa, aprova"
            subtitle="Depoimentos de clientes satisfeitos."
          >
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <TestimonialCard
                  key={String(t.id)}
                  quote={t.quote}
                  author={t.author}
                  role={t.role}
                  rating={t.rating ?? 5}
                />
              ))}
            </div>
          </Section>
        )}

        {/* FAQ (dinâmico) */}
        {faqs.length > 0 && (
          <Section
            id="faq"
            title="Dúvidas frequentes"
            subtitle="Tudo que você precisa saber para começar."
          >
            <div className="grid md:grid-cols-2 gap-6">
              {faqs.map((item) => (
                <details
                  key={String(item.id)}
                  className="rounded-2xl border p-4"
                >
                  <summary className="cursor-pointer font-semibold">
                    {item.question}
                  </summary>
                  <p className="mt-2 text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </Section>
        )}

        {/* SELF-TESTS SECTION (visible only in ?debug=1) */}
        {showDebug && (
          <Section
            id="tests"
            title="Auto‑testes"
            subtitle="Validações rápidas de execução"
          >
            <ul className="grid md:grid-cols-2 gap-3">
              {tests.map((t, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded-xl border p-3",
                    t.ok ? "border-emerald-400" : "border-red-400"
                  )}
                >
                  • {t.name} — <strong>{t.ok ? "OK" : "FALHOU"}</strong>
                  {t.details ? ` (${t.details})` : ""}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* CTA FINAL */}
        <section className="py-20 bg-gradient-primary">
          <div className="container text-center text-primary-foreground">
            <h2 className="text-3xl md:text-4xl font-bold">
              Pronto para começar?
            </h2>
            <p className="mt-3 opacity-90">
              Crie sua conta em segundos e teste grátis por 7 dias.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Button
                size="lg"
                variant="hero"
                onClick={() => {
                  track("cta_click", { position: "cta_final" });
                  navigate("/auth?tab=signup");
                }}
              >
                Testar grátis agora
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth?tab=login")}
              >
                Entrar
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/support")}
              >
                Falar com suporte
              </Button>
            </div>
          </div>
        </section>

        {/* RODAPÉ */}
        <footer className="py-16">
          <div className="container grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <h3 className="text-2xl font-semibold">Trabalhe Conosco</h3>
              <p className="mt-2 text-muted-foreground">
                Envie seus dados e vamos conversar.
              </p>
              <form
                className="mt-6 grid sm:grid-cols-2 gap-3"
                onSubmit={handleWorkWithUs}
              >
                <Input placeholder="Nome" required />
                <Input placeholder="E-mail" type="email" required />
                <Input
                  placeholder="Área de interesse"
                  className="sm:col-span-2"
                />
                <Textarea placeholder="Mensagem" className="sm:col-span-2" />
                <Button type="submit" className="sm:col-span-2">
                  Enviar
                </Button>
              </form>
            </div>
            <div>
              <h3 className="text-2xl font-semibold">Lysbox</h3>
              <p className="mt-2 text-muted-foreground">
                Armazenamento em nuvem seguro + automação contábil com IA.
              </p>
              <nav className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <a className="story-link" href="#planos">
                  Planos
                </a>
                <a className="story-link" href="#como-funciona">
                  Como funciona
                </a>
                <a className="story-link" href="#depoimentos">
                  Depoimentos
                </a>
                <a className="story-link" href="/support">
                  Suporte
                </a>
                <a className="story-link" href="/terms">
                  Termos
                </a>
                <a className="story-link" href="/privacy">
                  LGPD/Privacidade
                </a>
              </nav>
              <p className="mt-6 text-xs text-muted-foreground">
                © {new Date().getFullYear()} Lysbox. Todos os direitos
                reservados.
              </p>
            </div>
          </div>
        </footer>

        {/* Sticky CTA (mobile) */}
        {showStickyCta && sticky && (
          <div className="fixed bottom-4 left-0 right-0 px-4 z-50 md:hidden">
            <div className="container">
              <div className="rounded-2xl border shadow-lg bg-card p-3 flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-semibold">Teste grátis por 7 dias</div>
                  <div className="text-muted-foreground">
                    Sem cartão • Cancelamento fácil
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    track("cta_click", { position: "sticky_mobile" });
                    navigate("/auth?tab=signup");
                  }}
                >
                  Criar conta
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Exit-intent modal */}
        {showExitIntent && showExit && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowExit(false)}
            />
            <div className="relative max-w-md w-full rounded-2xl border bg-background p-6 shadow-xl">
              <div className="flex items-center gap-2">
                <TrendingUp />
                <h3 className="text-xl font-semibold">
                  Leve 7 dias grátis agora
                </h3>
              </div>
              <p className="mt-2 text-muted-foreground">
                Crie sua conta sem cartão e comece a organizar seus documentos
                ainda hoje.
              </p>
              <div className="mt-4 flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowExit(false);
                    track("cta_click", { position: "exit_modal" });
                    navigate("/auth?tab=signup");
                  }}
                >
                  Criar conta
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => setShowExit(false)}
                >
                  Agora não
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Payment handled by /pay/:planId */}
      </main>
    </div>
  );
};

export default Index;
