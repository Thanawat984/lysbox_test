import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Cloud, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import CloudSidebar from "./CloudSidebar";

const CloudLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <header className="h-16 flex items-center border-b px-3 md:px-4 justify-between bg-gradient-primary text-primary-foreground sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          <span className="font-semibold">Lysbox Puro • Cloud</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:block w-64">
            <Input placeholder="Buscar..." className="h-9 bg-white/10 border-white/20 text-primary-foreground placeholder:opacity-70" />
          </div>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
            <Bell className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="text-primary-foreground hover:bg-white/10"
          >
            Sair
          </Button>
        </div>
      </header>
      <div className="flex w-full min-h-[calc(100vh-56px)]">
        <CloudSidebar />
        <main className="flex-1 relative p-4 md:p-6">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[hsl(var(--primary)/0.12)] via-[hsl(var(--primary-glow)/0.16)] to-[hsl(var(--primary)/0.22)]" aria-hidden />
          <div className="interactive-spotlight" aria-hidden />
          <div className="container">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default CloudLayout;
