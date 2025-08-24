import React from "react";
import { NavLink } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Home, Files, Folder, Star, Trash2, Share2, Settings, Crown, LifeBuoy } from "lucide-react";

const items = [
  { title: "Dashboard", url: "/cloud", icon: Home },
  { title: "Meus Arquivos", url: "/cloud/files", icon: Files },
  { title: "Pastas", url: "/cloud/files#pastas", icon: Folder },
  { title: "Favoritos", url: "/cloud/favorites", icon: Star },
  { title: "Lixeira", url: "/cloud/trash", icon: Trash2 },
  { title: "Compartilhados", url: "/cloud/shared", icon: Share2 },
  { title: "Configurações", url: "/cloud/settings", icon: Settings },
  { title: "Meu Plano", url: "/cloud/plan", icon: Crown },
  { title: "Suporte", url: "/cloud/support", icon: LifeBuoy },
];

const getNavCls = ({ isActive }: { isActive: boolean }) =>
  isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

const CloudSidebar: React.FC = () => {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-1 text-sm font-semibold">Navegação</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Cloud</SidebarGroupLabel>
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

export default CloudSidebar;
