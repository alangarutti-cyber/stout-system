import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  DollarSign,
  CreditCard,
  Banknote,
  CheckSquare,
  Settings,
  ClipboardList,
  Users,
  Truck,
  ShoppingBag,
  Package,
  LineChart, // ✅ substitui o antigo ChartLine
  Building2,
  Boxes,
  Calendar,
  Layers,
  Zap,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const Sidebar = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Recolhe automaticamente em telas pequenas
  const handleNavigate = (to) => {
    navigate(to);
    if (window.innerWidth <= 1024) setCollapsed(true);
  };

  const sections = [
    {
      title: "Principal",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
        { label: "Saúde Financeira", icon: BarChart3, to: "/saude-financeira" },
        { label: "DRE", icon: FileText, to: "/dre" },
      ],
    },
    {
      title: "Financeiro",
      items: [
        { label: "Lançamentos", icon: DollarSign, to: "/financeiro" },
        { label: "Fechamento de Caixa", icon: CreditCard, to: "/caixa" },
        { label: "Bancos", icon: Banknote, to: "/bancos" },
        { label: "Conferência", icon: CheckSquare, to: "/conferencia" },
        { label: "Cobranças", icon: ArrowLeftRight, to: "/cobrancas" },
      ],
    },
    {
      title: "Operações",
      items: [
        { label: "Produção", icon: Package, to: "/producao" },
        { label: "Pedidos", icon: ShoppingBag, to: "/pedidos" },
        { label: "Fornecedores", icon: Truck, to: "/fornecedores" },
        { label: "Funcionários", icon: Users, to: "/funcionarios" },
        { label: "Checklists", icon: ClipboardList, to: "/checklists" },
      ],
    },
    {
      title: "Gerencial",
      items: [
        { label: "Relatórios", icon: LineChart, to: "/relatorios" },
        { label: "Empresas", icon: Building2, to: "/empresas" },
        { label: "Configurações", icon: Settings, to: "/configuracoes" },
      ],
    },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? "4rem" : "16rem" }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="bg-white border-r shadow-sm flex flex-col h-screen fixed md:relative z-40"
    >
      {/* Cabeçalho da Sidebar */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-lg font-bold text-primary"
            >
              Stout System
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-muted-foreground hover:text-primary transition"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Menu Navegação */}
      <nav className="flex-1 overflow-y-auto py-3">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-4">
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="px-5 text-xs font-semibold text-muted-foreground uppercase mb-2"
                >
                  {section.title}
                </motion.p>
              )}
            </AnimatePresence>

            {section.items.map(({ label, icon: Icon, to }) => {
              const isActive = window.location.hash.includes(to);
              return (
                <motion.button
                  key={label}
                  onClick={() => handleNavigate(to)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 w-full px-5 py-2.5 text-sm font-medium rounded-r-full transition-all ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-primary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        ))}
      </nav>
    </motion.aside>
  );
};

export default Sidebar;
