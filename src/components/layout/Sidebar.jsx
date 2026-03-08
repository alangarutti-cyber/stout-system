import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  HeartPulse,
  BarChart3,
  Wallet,
  FileText,
  Landmark,
  ClipboardCheck,
  Truck,
  Users,
  Building2,
  Calculator,
  Package,
  Tags,
  Receipt,
  ShieldCheck,
  Boxes,
  Settings2,
  CreditCard,
  Bike,
  UserCog,
  Ruler,
  ScrollText,
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
      { label: "DRE", to: "/dre", icon: FileText },
      { label: "Bancos", to: "/bancos", icon: Landmark },
      { label: "Conferência", to: "/conferencia", icon: ClipboardCheck },
    ],
  },
  {
    title: "CADASTROS",
    items: [
      { label: "Clientes", to: "/cadastros/clientes", icon: Users },
      { label: "Colaboradores", to: "/cadastros/colaboradores", icon: Users },
      { label: "Produtos", to: "/cadastros/produtos", icon: Package },
      { label: "Produtos V2", to: "/cadastros/produtos-v2", icon: Package },
      { label: "Empresas", to: "/cadastros/empresas", icon: Building2 },
      { label: "Categorias", to: "/cadastros/categorias-produtos", icon: Tags },
      { label: "Certificados", to: "/cadastros/certificados", icon: ShieldCheck },
      { label: "Despesas", to: "/cadastros/despesas", icon: Receipt },
      { label: "DRE Groups", to: "/cadastros/dre-groups", icon: ScrollText },
      { label: "DRE Mappings", to: "/cadastros/dre-mappings", icon: ScrollText },
      { label: "Formas Pagamento", to: "/cadastros/formas-pagamento", icon: CreditCard },
      { label: "Grupos Custo DRE", to: "/cadastros/grupos-custo-dre", icon: Boxes },
      { label: "Locais Impressão", to: "/cadastros/locais-impressao", icon: Receipt },
      { label: "Módulos Sistema", to: "/cadastros/modulos-sistema", icon: Settings2 },
      { label: "Operadoras Cartão", to: "/cadastros/operadoras-cartao", icon: CreditCard },
      { label: "Pagamento Freelance", to: "/cadastros/pagamento-freelance", icon: Wallet },
      { label: "Pagamento Motoboy", to: "/cadastros/pagamento-motoboy", icon: Bike },
      { label: "Permissões", to: "/cadastros/permissoes", icon: ShieldCheck },
      { label: "Unidades Medida", to: "/cadastros/unidades-medida", icon: Ruler },
      { label: "Usuários", to: "/cadastros/usuarios", icon: UserCog },
    ],
  },
  {
    title: "OPERACIONAL",
    items: [
      { label: "Caixa", to: "/caixa", icon: Calculator },
      { label: "Pedidos", to: "/pedidos", icon: Package },
      { label: "Fornecedores", to: "/fornecedores", icon: Truck },
    ],
  },
];

const Sidebar = () => {
  return (
    <aside className="w-[260px] min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <span className="text-[18px] font-bold text-[#ff6600]">Stout System</span>
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
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all",
                        isActive
                          ? "bg-[#ff6600] text-white shadow-sm"
                          : "text-[#ff6600] hover:bg-orange-50",
                      ].join(" ")
                    }
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;