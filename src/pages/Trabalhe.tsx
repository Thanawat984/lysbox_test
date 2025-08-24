import React from "react";
import Seo from "@/components/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell } from "lucide-react";
const Trabalhe: React.FC = () => {
  return (
    <>
      <Seo title="Trabalhe Conosco • Lysbox" description="Junte-se ao time Lysbox." />
      <header className="h-16 flex items-center border-b px-3 md:px-4 bg-gradient-primary text-primary-foreground sticky top-0 z-40">
        <div className="container flex items-center justify-between">
          <div className="font-semibold">Lysbox</div>
          <div className="flex items-center gap-2">
            <div className="hidden md:block w-64">
              <Input placeholder="Buscar..." className="h-9 bg-white/10 border-white/20 text-primary-foreground placeholder:opacity-70" />
            </div>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => (location.href = "/auth?tab=login")} className="text-primary-foreground hover:bg-white/10">Entrar</Button>
          </div>
        </div>
      </header>
      <main className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Trabalhe Conosco</h1>
        <Card>
          <CardHeader><CardTitle>Vagas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Nenhuma vaga aberta no momento.</p>
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default Trabalhe;
