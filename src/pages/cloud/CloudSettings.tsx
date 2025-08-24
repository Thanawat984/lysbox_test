import React from "react";
import CloudLayout from "@/features/cloud/CloudLayout";
import Seo from "@/components/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const CloudSettings: React.FC = () => {
  const { toast } = useToast();
  return (
    <CloudLayout>
      <Seo title="Cloud • Configurações" description="Preferências da conta, compartilhamento e IA de organização." />
      <section className="grid grid-cols-12 gap-6">
        <Card className="rounded-2xl col-span-12 md:col-span-6">
          <CardHeader><CardTitle>Padrões de Compartilhamento</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <label className="flex items-center justify-between">
              <span>Permitir downloads por padrão</span>
              <Switch defaultChecked />
            </label>
            <div className="text-sm text-muted-foreground">Defina como os novos links serão criados por padrão. Você poderá alterar a cada link.</div>
            <Button size="sm" onClick={() => toast({ title: "Preferências salvas" })}>Salvar</Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl col-span-12 md:col-span-6" id="ai">
          <CardHeader><CardTitle>Assistência por IA (Organização)</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <label className="flex items-center justify-between">
              <span>Ativar sugestões inteligentes</span>
              <Switch disabled />
            </label>
            <div className="text-sm text-muted-foreground">Disponível em planos PRO+. Gerenciado pelo Super Admin.</div>
          </CardContent>
        </Card>
      </section>
    </CloudLayout>
  );
};

export default CloudSettings;
