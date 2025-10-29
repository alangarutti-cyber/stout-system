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
  ShoppingCart, // ✅ ícone Pedidos
  CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";

const MainLayout = () => {
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // === Módulos fixos do menu ===
  const hardcodedModules = [
    // PRINCIPAL
    { id: 1, name: "Dashboard", path: "dashboard", icon: LayoutDashboard, group: "Principal" },
    { id: 2, name: "Saúde Financeira", path: "saude-financeira", icon: CircleDollarSign, group: "Principal" },
    { id: 3, name: "Painel Executivo", path: "painel-executivo", icon: BarChart3, group: "Principal" },

    // FINANCEIRO
    { id: 4, name: "Financeiro", path: "financeiro", icon: Wallet, group: "Financeiro" },
    { id: 5, name: "Pagamentos", path: "pagamentos", icon: CreditCard, group: "Financeiro" },
    { id: 6, name: "DRE", path: "dre", icon: BarChart3, group: "Financeiro" },
    { id: 7, name: "Bancos", path: "bancos", icon: Banknote, group: "Financeiro" },
    { id: 8, name: "Conferência", path: "conferencia", icon: ClipboardList, group: "Financeiro" },

    // CADASTROS
    { id: 9, name: "Fornecedores", path: "fornecedores", icon: Factory, group: "Cadastros" },
    { id: 10, name: "Funcionários", path: "funcionarios", icon: Users, group: "Cadastros" },
    { id: 11, name: "Empresas", path: "empresas", icon: Building2, group: "Cadastros" },

    // OPERACIONAL
    { id: 12, name: "Caixa", path: "caixa", icon: CircleDollarSign, group: "Operacional" },
    { id: 13, name: "Pedidos", path: "pedidos", icon: ShoppingCart, group: "Operacional" }, // ✅ novo módulo

    // CONFIGURAÇÕES
    { id: 14, name: "Configurações", path: "configuracoes", icon: Settings, group: "Configurações" },
    { id: 15, name: "Relatórios", path: "relatorios", icon: FileText, group: "Análises" },
  ];

  // === Agrupar módulos por seções ===
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
        {/* Cabeçalho da sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h1 className="font-bold text-lg tracking-tight">
            {sidebarOpen ? "Stout System" : "SS"}
          </h1>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "«" : "»"}
          </Button>
        </div>

        {/* Navegação */}
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
                          ? "bg-primary text-primary-foreground shadow-sm"
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

        {/* Rodapé */}
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
