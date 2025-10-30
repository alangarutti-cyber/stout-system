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
  ShoppingCart,
  CircleDollarSign,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";

const MainLayout = () => {
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  // alternar tema
  const toggleDarkMode = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  const hardcodedModules = [
    { id: 1, name: "Dashboard", path: "dashboard", icon: LayoutDashboard, group: "Principal" },
    { id: 2, name: "Saúde Financeira", path: "saude-financeira", icon: CircleDollarSign, group: "Principal" },
    { id: 3, name: "Painel Executivo", path: "painel-executivo", icon: BarChart3, group: "Principal" },
    { id: 4, name: "Financeiro", path: "financeiro", icon: Wallet, group: "Financeiro" },
    { id: 5, name: "Pagamentos", path: "pagamentos", icon: CreditCard, group: "Financeiro" },
    { id: 6, name: "DRE", path: "dre", icon: BarChart3, group: "Financeiro" },
    { id: 7, name: "Bancos", path: "bancos", icon: Banknote, group: "Financeiro" },
    { id: 8, name: "Conferência", path: "conferencia", icon: ClipboardList, group: "Financeiro" },
    { id: 9, name: "Fornecedores", path: "fornecedores", icon: Factory, group: "Cadastros" },
    { id: 10, name: "Funcionários", path: "funcionarios", icon: Users, group: "Cadastros" },
    { id: 11, name: "Empresas", path: "empresas", icon: Building2, group: "Cadastros" },
    { id: 12, name: "Caixa", path: "caixa", icon: CircleDollarSign, group: "Operacional" },
    { id: 13, name: "Pedidos", path: "pedidos", icon: ShoppingCart, group: "Operacional" },
    { id: 14, name: "Configurações", path: "configuracoes", icon: Settings, group: "Configurações" },
    { id: 15, name: "Relatórios", path: "relatorios", icon: FileText, group: "Análises" },
  ];

  const groupedModules = hardcodedModules.reduce((acc, m) => {
    acc[m.group] = acc[m.group] || [];
    acc[m.group].push(m);
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-500">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } transition-all duration-300 border-r border-[var(--border)] bg-[var(--card)] flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h1 className="font-bold text-lg">{sidebarOpen ? "Stout System" : "SS"}</h1>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "«" : "»"}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-6">
          {Object.entries(groupedModules).map(([group, mods]) => (
            <div key={group}>
              <h2 className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] px-2 mb-1">
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
                          : "hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
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

        {/* Rodapé da sidebar */}
        <footer className="border-t border-[var(--border)] p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{user?.name ? `Olá, ${user.name.split(" ")[0]}` : "Usuário"}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleDarkMode}
              title={darkMode ? "Modo Claro" : "Modo Escuro"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </Button>
          </div>

          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => window.location.replace("/")}
          >
            <LogOut className="w-4 h-4" /> {sidebarOpen && "Sair"}
          </Button>
        </footer>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-y-auto p-4 bg-[var(--background)] text-[var(--foreground)] transition-colors duration-500">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
