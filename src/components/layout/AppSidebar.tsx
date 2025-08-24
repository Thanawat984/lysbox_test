import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Upload, CalendarDays, LineChart, Share2, Building2, Users, ShieldCheck, Settings, Bot, Bell, Calculator } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { AppRole } from "@/hooks/use-auth";

export type SidebarItem = { title: string; url: string; icon: React.ComponentType<any> };

const itemsByRole: Record<AppRole, SidebarItem[]> = {
  empresario: [
    { title: "Início", url: "/empresario", icon: Home },
    { title: "Upload", url: "/empresario#upload", icon: Upload },
    { title: "Compartilhar", url: "/empresario#share", icon: Share2 },
    { title: "IA Contábil", url: "/empresario#ia", icon: Bot },
    { title: "Calendário Fiscal", url: "/empresario#calendario", icon: CalendarDays },
    { title: "Dashboard", url: "/empresario#dashboard", icon: LineChart },
    { title: "IVA (CBS+IBS)", url: "/empresario#iva", icon: Calculator },
    { title: "Alertas", url: "/empresario#alertas", icon: Bell },
  ],
  contador: [
    { title: "Início", url: "/contador", icon: Home },
    { title: "Empresas", url: "/contador#empresas", icon: Building2 },
    { title: "Uploads", url: "/contador#upload", icon: Upload },
    { title: "IVA (CBS+IBS)", url: "/contador#iva", icon: Calculator },
    { title: "Alertas", url: "/contador#alertas", icon: Bell },
    { title: "Auditoria", url: "/contador#auditoria", icon: ShieldCheck },
  ],
  admin: [
    { title: "Painel", url: "/admin", icon: Home },
    { title: "Cadastros", url: "/admin#cadastros", icon: Users },
    { title: "Planos", url: "/admin#planos", icon: Settings },
    { title: "Relatórios", url: "/admin#relatorios", icon: LineChart },
  ],
  super_admin: [
    { title: "Painel", url: "/super", icon: Home },
    { title: "Usuários", url: "/super#usuarios", icon: Users },
    { title: "Empresas", url: "/super#empresas", icon: Building2 },
    { title: "Permissões", url: "/super#permissoes", icon: ShieldCheck },
    { title: "Integrações & IA", url: "/super#integracoes", icon: Bot },
    { title: "Financeiro & Planos", url: "/super#financeiro", icon: Settings },
    { title: "IVA (CBS+IBS)", url: "/super#iva", icon: Calculator },
  ],
};

const getNavCls = ({ isActive }: { isActive: boolean }) =>
  isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

const AppSidebar: React.FC<{ role: AppRole }> = ({ role }) => {
  const items = itemsByRole[role];
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-1 text-sm font-semibold">Lysbox • {role}</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
