import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  HeartPulse,
  BarChart3,
  Wallet,
  CreditCard,
  FileText,
  Landmark,
  ClipboardCheck,
  Truck,
  Users,
  Building2,
  Calculator,
  Moon,
  LogOut,
} from "lucide-react";

const menuSections = [
  {
    title: "PRINCIPAL",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
      { label: "Saúde Financeira", to: "/saude-financeira", icon: HeartPulse },
      { label: "Painel Executivo", to: "/painel-executivo", icon: BarChart3 },
    ],
  },
  {
    title: "FINANCEIRO",
    items: [
      { label: "Financeiro", to: "/financeiro", icon: Wallet },
      { label: "Financeiro Produção", to: "/financeiro-producao", icon: CreditCard },
      { label: "DRE", to: "/dre", icon: FileText },
      { label: "Bancos", to: "/bancos", icon: Landmark },
      { label: "Conferência", to: "/conferencia", icon: ClipboardCheck },
    ],
  },
  {
    title: "CADASTROS",
    items: [
      { label: "Fornecedores", to: "/fornecedores", icon: Truck },
      { label: "Funcionários", to: "/funcionarios", icon: Users },
      { label: "Empresas", to: "/empresas", icon: Building2 },
    ],
  },
  {
    title: "OPERACIONAL",
    items: [{ label: "Caixa", to: "/caixa", icon: Calculator }],
  },
];

const Sidebar = () => {
  return (
    <aside className="w-[248px] min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <span className="text-[16px] font-bold text-[#ff6600]">Stout System</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {menuSections.map((section) => (
          <div key={section.title} className="mb-6">
            <p className="text-[12px] font-semibold text-gray-700 uppercase mb-3 px-2">
              {section.title}
            </p>

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-all",
                        isActive
                          ? "bg-[#ff6600] text-white shadow-sm"
                          : "text-[#ff6600] hover:bg-orange-50",
                      ].join(" ")
                    }
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 p-4 space-y-3">
        <p className="text-sm text-gray-700">Olá, usuário</p>

        <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition">
          <Moon size={16} />
          Modo Escuro
        </button>

        <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition">
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;