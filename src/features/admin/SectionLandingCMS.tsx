import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { SiteContent, SitePalette } from "@/hooks/use-site-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const PALETTE_FIELDS: (keyof SitePalette)[] = [
  "background",
  "foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "accent",
  "accent-foreground",
  "muted",
  "muted-foreground",
  "border",
  "ring",
  "card",
  "card-foreground",
  "gradientPrimary",
];
function emptyContent(): SiteContent {
  return {
    palette: {},
    images: {},
    texts: {},
  };
}

// Defaults and helpers
const HERO_FALLBACK =
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1470&auto=format&fit=crop";

function getCssVar(name: string) {
  if (typeof window === "undefined") return "";
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v?.trim() || "";
}
function captureCurrentPalette(): Partial<SitePalette> {
  const pal: Partial<SitePalette> = {};
  PALETTE_FIELDS.forEach((k) => {
    if (k === "gradientPrimary") {
      const g = getCssVar("--gradient-primary");
      if (g) (pal as any)[k] = g;
    } else {
      const v = getCssVar(`--${k}`);
      if (v) (pal as any)[k] = v;
    }
  });
  return pal;
}
// Color helpers: HSL "h s% l%" <-> HEX "#rrggbb"
function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function parseHslTriplet(str?: string) {
  if (!str) return null;
  const m = str
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
}
function hslStringToHex(str?: string) {
  const p = parseHslTriplet(str);
  if (!p) return "#000000";
  return hslToHex(p.h, p.s, p.l);
}
function hexToHslString(hex: string) {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  const hh = m ? m[1] : "000000";
  const r = parseInt(hh.substring(0, 2), 16) / 255;
  const g = parseInt(hh.substring(2, 4), 16) / 255;
  const b = parseInt(hh.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Presets – quick selectable palettes (minimal set)
const PRESET_THEMES: { name: string; values: Partial<SitePalette> }[] = [
  {
    name: "Violeta (padrão)",
    values: {
      primary: "270 85% 60%",
      accent: "292 80% 60%",
      secondary: "230 35% 96%",
      "primary-foreground": "210 40% 98%",
      "accent-foreground": "210 40% 98%",
    },
  },
  {
    name: "Azul",
    values: {
      primary: "224 76% 48%",
      accent: "199 89% 48%",
      secondary: "210 20% 96%",
      "primary-foreground": "210 40% 98%",
      "accent-foreground": "210 40% 98%",
    },
  },
  {
    name: "Esmeralda",
    values: {
      primary: "152 76% 40%",
      accent: "160 84% 39%",
      secondary: "150 20% 96%",
      "primary-foreground": "210 40% 98%",
      "accent-foreground": "210 40% 98%",
    },
  },
  {
    name: "Âmbar",
    values: {
      primary: "38 92% 50%",
      accent: "25 95% 53%",
      secondary: "40 20% 96%",
      "primary-foreground": "232 60% 12%",
      "accent-foreground": "232 60% 12%",
    },
  },
  {
    name: "Rosa",
    values: {
      primary: "330 81% 60%",
      accent: "340 82% 52%",
      secondary: "330 20% 96%",
      "primary-foreground": "210 40% 98%",
      "accent-foreground": "210 40% 98%",
    },
  },
];
const FieldRow: React.FC<{
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div className="grid grid-cols-12 gap-2 items-center">
    <Label className="col-span-5 md:col-span-4 text-xs md:text-sm">
      {label}
    </Label>
    <Input
      className="col-span-7 md:col-span-8 bg-white text-black placeholder:text-muted-foreground"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);
const ImageField: React.FC<{
  label: string;
  url?: string;
  onUpload: (file: File) => Promise<void>;
  onClear: () => void;
}> = ({ label, url, onUpload, onClear }) => {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {url && (
          <Button type="button" variant="secondary" size="sm" onClick={onClear}>
            Limpar
          </Button>
        )}
      </div>
      {url ? (
        <div className="rounded-lg border p-2">
          <div className="text-xs text-muted-foreground break-all mb-2">
            {url}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`${label} prévia`}
            className="w-full max-h-48 object-cover rounded-md"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          Nenhuma imagem definida.
        </div>
      )}
      <div>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              await onUpload(f);
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
        />
      </div>
    </div>
  );
};
const SectionLandingCMS: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<SiteContent>(emptyContent());
  const key = "landing";

  // Derived helpers
  const images = content.images || {};
  const texts = content.texts || {};
  const palette = content.palette || {};
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("site_content")
        .select("content")
        .eq("key", key)
        .maybeSingle();

      if (!mounted) return;
      if (error) console.error(error);
      const dbContent = (data?.content as SiteContent) || emptyContent();
      const filled: SiteContent = {
        palette:
          dbContent.palette && Object.keys(dbContent.palette).length > 0
            ? dbContent.palette
            : (captureCurrentPalette() as any),
        images: {
          hero: dbContent.images?.hero ?? HERO_FALLBACK,
          feature1: dbContent.images?.feature1 ?? HERO_FALLBACK,
          feature2: dbContent.images?.feature2 ?? HERO_FALLBACK,
          videoPoster: dbContent.images?.videoPoster ?? HERO_FALLBACK,
        },
        texts: {
          heroType: dbContent.texts?.heroType ?? "image",
          headline:
            dbContent.texts?.headline ??
            "Caixa de Lys — a nuvem inteligente para negócios e contabilidade",
          subheadline:
            dbContent.texts?.subheadline ??
            "Cofre Fiscal com IA, OCR, calendário fiscal e compartilhamento seguro em um só lugar.",
          ctaLabel: dbContent.texts?.ctaLabel ?? "Testar grátis agora",
          videoUrl: (dbContent.texts as any)?.videoUrl,
        },
      };
      setContent(filled);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key, content: content as any } as any, { onConflict: "key" })
      .select()
      .single();
    setSaving(false);
    if (error) {
      console.error(error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
      });
    } else {
      toast({
        title: "Salvo",
        description: "Landing atualizada com sucesso.",
      });
    }
  };
  const uploadImage = async (
    imageKey: keyof NonNullable<SiteContent["images"]>,
    file: File
  ) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `landing/${imageKey}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("site-assets")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    setContent((prev) => ({
      ...prev,
      images: {
        ...(prev.images || {}),
        [imageKey]: data.publicUrl,
      },
    }));
  };
  return (
    <div className="grid grid-cols-12 gap-4 mt-4">
      <Card className="col-span-12 bg-white text-black">
        <CardHeader>
          <CardTitle>Página inicial • Conteúdo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-950">
            Edite cores, textos e imagens da página inicial. As mudanças são
            aplicadas no site público.
          </p>
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-6 bg-white text-black">
        <CardHeader>
          <CardTitle>Paleta (CSS Vars HSL)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          )}
          {!loading && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setContent((p) => ({
                      ...p,
                      palette: { ...(captureCurrentPalette() as any) },
                    }))
                  }
                >
                  Importar cores atuais do tema
                </Button>
                <span className="text-xs text-muted-foreground">
                  Ajuste cada cor via HSL ou use o seletor.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_THEMES.map((t) => {
                  console.log(t)
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() =>
                        setContent((p) => ({
                          ...p,
                          palette: {
                            ...(p.palette || {}),
                            ...(t.values as any),
                          },
                        }))
                      }
                      className="rounded-xl border p-2 flex items-center gap-2 hover:bg-gray-50"
                    >
                      <span
                        className="h-5 w-5 rounded-md border"
                        style={{
                          backgroundColor: hslStringToHex(
                              ((t.values as any).primary as string)
                          ),
                        }}
                      />
                      <span className="text-xs">{t.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                {PALETTE_FIELDS.map((k) => (
                  <div
                    key={k as string}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <Label className="col-span-5 md:col-span-4 text-xs md:text-sm">
                      {k as string}
                    </Label>
                    <Input
                      className="col-span-5 md:col-span-6 bg-white text-black placeholder:text-muted-foreground"
                      value={((palette as any)[k] as string | undefined) || ""}
                      onChange={(e) =>
                        setContent((prev) => ({
                          ...prev,
                          palette: {
                            ...(prev.palette || {}),
                            [k]: e.target.value,
                          },
                        }))
                      }
                      placeholder={
                        k === "gradientPrimary"
                          ? "ex: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))"
                          : "ex: 210 40% 98%"
                      }
                    />
                    <div className="col-span-2 md:col-span-2">
                      {k !== "gradientPrimary" && (
                        <input
                          aria-label={`Selecionar cor ${k as string}`}
                          type="color"
                          className="h-10 w-full rounded-md border"
                          value={hslStringToHex((palette as any)[k] as string)}
                          onChange={(e) => {
                            const hsl = hexToHslString(e.target.value);
                            setContent((prev) => ({
                              ...prev,
                              palette: {
                                ...(prev.palette || {}),
                                [k]: hsl,
                              },
                            }));
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-6 bg-white text-black">
        <CardHeader>
          <CardTitle>Imagens e Mídia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-12 gap-2 items-center">
            <Label className="col-span-12 md:col-span-4">Tipo do herói</Label>
            <div className="col-span-12 md:col-span-8">
              <Select
                value={texts.heroType || "image"}
                onValueChange={(v) =>
                  setContent((p) => ({
                    ...p,
                    texts: {
                      ...(p.texts || {}),
                      heroType: v,
                    },
                  }))
                }
              >
                <SelectTrigger className="bg-white text-black">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black shadow-md z-50">
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(texts.heroType || "image") === "video" ? (
            <>
              <FieldRow
                label="URL do vídeo"
                value={texts.videoUrl}
                onChange={(v) =>
                  setContent((p) => ({
                    ...p,
                    texts: {
                      ...(p.texts || {}),
                      videoUrl: v,
                    },
                  }))
                }
                placeholder="YouTube, Vimeo ou MP4 direto"
              />
              <Separator />
              <ImageField
                label="Pôster do vídeo"
                url={images.videoPoster}
                onUpload={(f) => uploadImage("videoPoster", f)}
                onClear={() =>
                  setContent((p) => ({
                    ...p,
                    images: {
                      ...(p.images || {}),
                      videoPoster: undefined,
                    },
                  }))
                }
              />
            </>
          ) : (
            <>
              <ImageField
                label="Capa"
                url={images.hero}
                onUpload={(f) => uploadImage("hero", f)}
                onClear={() =>
                  setContent((p) => ({
                    ...p,
                    images: {
                      ...(p.images || {}),
                      hero: undefined,
                    },
                  }))
                }
              />
            </>
          )}
          <Separator />
          <ImageField
            label="Destaque 1"
            url={images.feature1}
            onUpload={(f) => uploadImage("feature1", f)}
            onClear={() =>
              setContent((p) => ({
                ...p,
                images: {
                  ...(p.images || {}),
                  feature1: undefined,
                },
              }))
            }
          />
          <Separator />
          <ImageField
            label="Destaque 2"
            url={images.feature2}
            onUpload={(f) => uploadImage("feature2", f)}
            onClear={() =>
              setContent((p) => ({
                ...p,
                images: {
                  ...(p.images || {}),
                  feature2: undefined,
                },
              }))
            }
          />
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-6 bg-white text-black">
        <CardHeader>
          <CardTitle>Pré-visualização do herói</CardTitle>
        </CardHeader>
        <CardContent>
          {(texts.heroType || "image") === "video" && texts.videoUrl ? (
            texts.videoUrl.includes("youtube.com") ||
            texts.videoUrl.includes("youtu.be") ? (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                <iframe
                  src={texts.videoUrl
                    .replace("watch?v=", "embed/")
                    .replace("youtu.be/", "www.youtube.com/embed/")}
                  title="Pré-visualização do vídeo"
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <video
                className="w-full rounded-lg border"
                src={texts.videoUrl}
                poster={images.videoPoster}
                controls
                muted
                playsInline
              />
            )
          ) : images.hero ? (
            <img
              src={images.hero}
              alt="Pré-visualização da imagem de capa"
              className="w-full rounded-lg border"
              loading="lazy"
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              Defina uma imagem de capa ou um vídeo para visualizar aqui.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-12 bg-white text-black">
        <CardHeader>
          <CardTitle>Textos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 gap-2 items-center">
            <Label className="col-span-12 md:col-span-3">Título</Label>
            <Input
              className="col-span-12 md:col-span-9 bg-white text-black placeholder:text-muted-foreground"
              value={texts.headline || ""}
              onChange={(e) =>
                setContent((p) => ({
                  ...p,
                  texts: {
                    ...(p.texts || {}),
                    headline: e.target.value,
                  },
                }))
              }
            />
          </div>
          <div className="grid grid-cols-12 gap-2 items-center">
            <Label className="col-span-12 md:col-span-3">Subtítulo</Label>
            <Input
              className="col-span-12 md:col-span-9 bg-white text-black placeholder:text-muted-foreground"
              value={texts.subheadline || ""}
              onChange={(e) =>
                setContent((p) => ({
                  ...p,
                  texts: {
                    ...(p.texts || {}),
                    subheadline: e.target.value,
                  },
                }))
              }
            />
          </div>
          <div className="grid grid-cols-12 gap-2 items-center">
            <Label className="col-span-12 md:col-span-3">Texto do CTA</Label>
            <Input
              className="col-span-12 md:col-span-9 bg-white text-black placeholder:text-muted-foreground"
              value={texts.ctaLabel || ""}
              onChange={(e) =>
                setContent((p) => ({
                  ...p,
                  texts: {
                    ...(p.texts || {}),
                    ctaLabel: e.target.value,
                  },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="col-span-12 sticky bottom-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-t flex justify-end gap-2 p-3 z-40">
        <Button
          variant="secondary"
          type="button"
          onClick={() => {
            setContent(emptyContent());
          }}
        >
          Redefinir
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
};
export default SectionLandingCMS;
