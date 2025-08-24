import React from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { primaryRole, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <SidebarProvider>
      <header className="h-16 flex items-center border-b px-3 md:px-4 justify-between bg-gradient-primary text-primary-foreground sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="ml-1" />
          <span className="font-semibold">Lysbox</span>
        </div>
        <div className="flex items-center gap-2">
          {/* <div className="hidden md:block w-64">
            <Input
              placeholder="Buscar..."
              className="h-9 bg-white/10 border-white/20 text-primary-foreground placeholder:opacity-70"
            />
          </div> */}
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }} className="text-primary-foreground hover:bg-white/10">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>
      <div className="flex w-full min-h-[calc(100vh-56px)]">
        {primaryRole && <AppSidebar role={primaryRole} />}
        <SidebarInset>
          <div className="relative p-4 md:p-6">
            <div
              className="absolute inset-0 -z-10 bg-gradient-to-br from-[hsl(var(--primary)/0.12)] via-[hsl(var(--primary-glow)/0.16)] to-[hsl(var(--primary)/0.22)]"
              aria-hidden
            />
            <div className="interactive-spotlight" aria-hidden />
            <div className="container max-w-8xl mx-auto space-y-6">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
