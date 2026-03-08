import React from "react";
import { createBrowserRouter } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";

// === módulos existentes ===
import Dashboard from "@/components/modules/Dashboard";
import Caixa from "@/components/modules/Caixa";
import Financeiro from "@/components/modules/Financeiro";
import Fornecedores from "@/components/modules/Fornecedores";
import Funcionarios from "@/components/modules/Funcionarios";
import DRE from "@/components/modules/DRE";
import Pagamentos from "@/components/modules/Pagamentos";
import Pedidos from "@/components/modules/Pedidos";
import Bancos from "@/components/modules/Bancos";
import Configuracoes from "@/components/modules/Configuracoes";
import Conferencia from "@/components/modules/Conferencia";

// === placeholders para novos módulos ===
const ContasPagar = () => <div className="p-6"><h2 className="text-xl font-bold mb-4">Contas a Pagar</h2></div>;
const ContasReceber = () => <div className="p-6"><h2 className="text-xl font-bold mb-4">Contas a Receber</h2></div>;
const ContaCorrenteFiado = () => <div className="p-6"><h2 className="text-xl font-bold mb-4">Conta Corrente (Fiado)</h2></div>;
const Recebimentos = () => <div className="p-6"><h2 className="text-xl font-bold mb-4">Recebimentos</h2></div>;
const ResumoFinanceiro = () => <div className="p-6"><h2 className="text-xl font-bold mb-4">Resumo Financeiro</h2></div>;
const DRESimplificado = () => <div className="p-6"><h2 className="text-xl font-bold mb-4">DRE Simplificado</h2></div>;
const Categorias = () => <div className="p-6"><h2 className="text-xl font-bold mb-4">Categorias de Contas</h2></div>;
const FormasPagamento = () => <div className="p-6"><h2 className="text-xl font-bold mb-4">Formas de Pagamento</h2></div>;
const MeuNegocio = () => <div className="p-6"><h2 className="text-xl font-bold mb-4">Meu Negócio</h2></div>;

// === criação das rotas ===
export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      // PRINCIPAL
      { path: "dashboard", element: <Dashboard /> },
      { path: "saude-financeira", element: <ResumoFinanceiro /> },
      { path: "painel-executivo", element: <MeuNegocio /> },

      // FINANCEIRO
      { path: "financeiro/pagar", element: <ContasPagar /> },
      { path: "financeiro/receber", element: <ContasReceber /> },
      { path: "financeiro/fiado", element: <ContaCorrenteFiado /> },
      { path: "financeiro/recebimentos", element: <Recebimentos /> },
      { path: "financeiro/resumo", element: <ResumoFinanceiro /> },
      { path: "financeiro/dre-simplificado", element: <DRESimplificado /> },
      { path: "financeiro", element: <Financeiro /> },
      { path: "pagamentos", element: <Pagamentos /> },
      { path: "bancos", element: <Bancos /> },
      { path: "conferencia", element: <Conferencia /> },

      // CADASTROS FINANCEIROS
      { path: "cadastros/fornecedores", element: <Fornecedores /> },
      { path: "cadastros/categorias", element: <Categorias /> },
      { path: "cadastros/formas-pagamento", element: <FormasPagamento /> },

      // CADASTROS GERAIS
      { path: "funcionarios", element: <Funcionarios /> },
      { path: "empresas", element: <Configuracoes /> },

      // OPERACIONAL
      { path: "caixa", element: <Caixa /> },
      { path: "pedidos", element: <Pedidos /> },

      // ANÁLISES E CONFIGURAÇÕES
      { path: "analises/meu-negocio", element: <MeuNegocio /> },
      { path: "relatorios", element: <ResumoFinanceiro /> },
      { path: "configuracoes", element: <Configuracoes /> },
    ],
  },
]);
