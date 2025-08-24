import React, { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent, SitePalette } from "@/hooks/use-site-content";

const SiteSettings: React.FC = () => {
  const { content } = useSiteContent();
  const { toast } = useToast();

  const [palette, setPalette] = useState<SitePalette>({});
  const [heroUrl, setHeroUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (content) {
      setPalette(content.palette || {});
      setHeroUrl(content.images?.hero);
    }
  }, [content]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `hero-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) return toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    setHeroUrl(data.publicUrl);
    toast({ title: "Imagem atualizada" });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        palette,
        images: { hero: heroUrl },
        texts: content?.texts || {}
      };
      const { error } = await supabase.from("site_content").upsert({ key: "landing", content: payload }, { onConflict: "key" });
      if (error) throw error;
      toast({ title: "Configurações salvas" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message ?? "Tente novamente", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const setVar = (k: keyof SitePalette, v: string) => setPalette((p) => ({ ...p, [k]: v }));

  return (
    <div className="container py-8">
      <Seo title="Aparência do Site • Admin" description="Gerencie paleta de cores, imagens e textos da landing." />
      <h1 className="text-2xl font-bold mb-6">Aparência do Site</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hero • Imagem principal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {heroUrl && (
              <img src={heroUrl} alt="Hero" className="w-full rounded-md border" />
            )}
            <Input type="file" accept="image/*" onChange={handleUpload} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paleta (HSL)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div>
              <Label>Primary</Label>
              <Input placeholder="210 90% 50%" value={palette.primary || ""} onChange={(e) => setVar("primary", e.target.value)} />
            </div>
            <div>
              <Label>Primary Foreground</Label>
              <Input placeholder="0 0% 100%" value={palette["primary-foreground"] || ""} onChange={(e) => setVar("primary-foreground", e.target.value)} />
            </div>
            <div>
              <Label>Secondary</Label>
              <Input placeholder="222 84% 56%" value={palette.secondary || ""} onChange={(e) => setVar("secondary", e.target.value)} />
            </div>
            <div>
              <Label>Accent</Label>
              <Input placeholder="280 80% 60%" value={palette.accent || ""} onChange={(e) => setVar("accent", e.target.value)} />
            </div>
            <div>
              <Label>Background</Label>
              <Input placeholder="0 0% 100%" value={palette.background || ""} onChange={(e) => setVar("background", e.target.value)} />
            </div>
            <div>
              <Label>Foreground</Label>
              <Input placeholder="222 84% 4%" value={palette.foreground || ""} onChange={(e) => setVar("foreground", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Gradiente Primário (CSS)</Label>
              <Input placeholder="linear-gradient(135deg, hsl(var(--primary)), hsl(280 80% 60%))" value={palette.gradientPrimary || ""} onChange={(e) => setVar("gradientPrimary", e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
      </div>
    </div>
  );
};

export default SiteSettings;
