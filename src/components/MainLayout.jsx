import React, { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  Building2,
  Users,
  Factory,
  BarChart3,
  Settings,
  FileText,
  Banknote,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";

const MainLayout = () => {
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // === lista de módulos fixos ===
  const hardcodedModules = [
    { id: 1, name: "Dashboard", path: "dashboard", icon: LayoutDashboard, group: "Principal" },
    { id: 2, name: "Financeiro", path: "financeiro", icon: Wallet, group: "Financeiro" },
    { id: 3, name: "Contas a Pagar", path: "pagamentos", icon: CreditCard, group: "Financeiro" }, // ✅ novo módulo
    { id: 4, name: "Bancos", path: "bancos", icon: Banknote, group: "Financeiro" },
    { id: 5, name: "DRE", path: "dre", icon: BarChart3, group: "Financeiro" },
    { id: 6, name: "Fornecedores", path: "fornecedores", icon: Factory, group: "Cadastros" },
    { id: 7, name: "Funcionários", path: "funcionarios", icon: Users, group: "Cadastros" },
    { id: 8, name: "Empresas", path: "empresas", icon: Building2, group: "Configurações" },
    { id: 9, name: "Configurações", path: "configuracoes", icon: Settings, group: "Configurações" },
    { id: 10, name: "Relatórios", path: "relatorios", icon: FileText, group: "Análises" },
    { id: 11, name: "Checklists", path: "checklists", icon: ClipboardList, group: "Operacional" },
  ];

  // === Agrupar por seções ===
  const groupedModules = hardcodedModules.reduce((acc, m) => {
    acc[m.group] = acc[m.group] || [];
    acc[m.group].push(m);
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* === Sidebar === */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } transition-all duration-300 border-r border-border bg-card flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h1 className="font-bold text-lg">{sidebarOpen ? "Stout System" : "SS"}</h1>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "«" : "»"}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-6">
          {Object.entries(groupedModules).map(([group, mods]) => (
            <div key={group}>
              <h2 className="text-xs uppercase tracking-wide text-muted-foreground px-2 mb-1">
                {group}
              </h2>
              <div className="space-y-1">
                {mods.map((m) => (
                  <NavLink
                    key={m.id}
                    to={`/${m.path}`}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      }`
                    }
                  >
                    <m.icon className="w-4 h-4 shrink-0" />
                    {sidebarOpen && <span>{m.name}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <footer className="border-t border-border p-3 text-xs text-muted-foreground text-center">
          {user?.name ? `Olá, ${user.name.split(" ")[0]}` : "Usuário"}
        </footer>
      </aside>

      {/* === Conteúdo principal === */}
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
