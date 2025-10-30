import React, { useState, useEffect } from "react";
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
  Moon,
  Sun,
  PieChart, // ✅ substituto do ChartPie
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/customSupabaseClient";

const MainLayout = () => {
  const { user } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // === Alternar tema (dark/light) ===
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") setDarkMode(true);
  }, []);

  // === Módulos fixos do menu ===
  const hardcodedModules = [
    // PRINCIPAL
    { id: 1, name: "Dashboard", path: "dashboard", icon: LayoutDashboard, group: "Principal" },
    { id: 2, name: "Saúde Financeira", path: "saude-financeira", icon: CircleDollarSign, group: "Principal" },
    { id: 3, name: "Painel Executivo", path: "painel-executivo", icon: BarChart3, group: "Principal" },

    // FINANCEIRO
    { id: 4, name: "Financeiro", path: "financeiro", icon: Wallet, group: "Financeiro" },
    { id: 5, name: "Pagamentos", path: "pagamentos", icon: CreditCard, group: "Financeiro" },
    { id: 6, name: "DRE", path: "dre", icon: PieChart, group: "Financeiro" },
    { id: 7, name: "Bancos", path: "bancos", icon: Banknote, group: "Financeiro" },
    { id: 8, name: "Conferência", path: "conferencia", icon: ClipboardList, group: "Financeiro" },

    // CADASTROS
    { id: 9, name: "Fornecedores", path: "fornecedores", icon: Factory, group: "Cadastros" },
    { id: 10, name: "Funcionários", path: "funcionarios", icon: Users, group: "Cadastros" },
    { id: 11, name: "Empresas", path: "empresas", icon: Building2, group: "Cadastros" },

    // OPERACIONAL
    { id: 12, name: "Caixa", path: "caixa", icon: CircleDollarSign, group: "Operacional" },
    { id: 13, name: "Pedidos", path: "pedidos", icon: ShoppingCart, group: "Operacional" },

    // CONFIGURAÇÕES
    { id: 14, name: "Configurações", path: "configuracoes", icon: Settings, group: "Configurações" },
    { id: 15, name: "Relatórios", path: "relatorios", icon: FileText, group: "Análises" },
  ];

  const groupedModules = hardcodedModules.reduce((acc, m) => {
    acc[m.group] = acc[m.group] || [];
    acc[m.group].push(m);
    return acc;
  }, {});

  // === Logout ===
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-300">
      {/* === Sidebar === */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } transition-all duration-300 border-r border-border bg-card flex flex-col shadow-lg`}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h1 className="font-bold text-lg tracking-tight text-primary">
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
                      `flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
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
        <footer className="border-t border-border p-4 text-center text-sm space-y-3">
          <p className="text-muted-foreground">
            {user?.name ? `Olá, ${user.name.split(" ")[0]}` : "Usuário"}
          </p>

          {/* Alternar tema */}
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center gap-2 rounded-xl shadow-sm"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {sidebarOpen && (darkMode ? "Modo Claro" : "Modo Escuro")}
          </Button>

          {/* Logout */}
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl shadow-sm"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && "Sair"}
          </Button>
        </footer>
      </aside>

      {/* === Conteúdo principal === */}
      <main className="flex-1 overflow-y-auto p-6 bg-background transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
