import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SitePalette = Partial<{
  background: string;
  foreground: string;
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  accent: string;
  "accent-foreground": string;
  muted: string;
  "muted-foreground": string;
  border: string;
  ring: string;
  card: string;
  "card-foreground": string;
  gradientPrimary: string; // optional custom gradient
}>;

export interface SiteContent {
  palette?: SitePalette;
  images?: {
    hero?: string; // public URL
    feature1?: string;
    feature2?: string;
    videoPoster?: string; // poster image for hero video
  };
  texts?: Record<string, string>;
}

export function applyPalette(palette?: SitePalette) {
  if (!palette) return;
  const root = document.documentElement as HTMLElement;
  const darkScope = document.querySelector('.dark') as HTMLElement | null;
  const targets: HTMLElement[] = [root, ...(darkScope ? [darkScope] : [])];
  const mapping: Record<string, string | undefined> = {
    "--background": palette.background,
    "--foreground": palette.foreground,
    "--primary": palette.primary,
    "--primary-foreground": palette["primary-foreground"],
    "--secondary": palette.secondary,
    "--secondary-foreground": palette["secondary-foreground"],
    "--accent": palette.accent,
    "--accent-foreground": palette["accent-foreground"],
    "--muted": palette.muted,
    "--muted-foreground": palette["muted-foreground"],
    "--border": palette.border,
    "--ring": palette.ring,
    "--card": palette.card,
    "--card-foreground": palette["card-foreground"],
  };
  targets.forEach(t => {
    Object.entries(mapping).forEach(([k, v]) => {
      if (v) t.style.setProperty(k, v);
    });
    if (palette.gradientPrimary) {
      t.style.setProperty("--gradient-primary", palette.gradientPrimary);
    }
  });
}

export function useSiteContent(key: string = "landing") {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("site_content")
        .select("content")
        .eq("key", key)
        .maybeSingle();
      if (!cancelled) {
        const c = (data?.content as SiteContent) || null;
        setContent(c);
        // Apply palette dynamically
        applyPalette(c?.palette);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [key]);

  return { content, loading };
}
