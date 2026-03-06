import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/contexts/SupabaseAuthContext";

import MainLayout from "@/components/layout/MainLayout";

import Dashboard from "@/components/modules/Dashboard";
import DRE from "@/components/modules/DRE";
import Configuracoes from "@/components/modules/Configuracoes";
import Relatorios from "@/components/modules/Relatorios";
import FinanceiroProducao from "@/components/modules/FinanceiroProducao";

import Clientes from "@/components/modules/cadastros/Clientes";
import Colaboradores from "@/components/modules/cadastros/Colaboradores";
import Produtos from "@/components/modules/cadastros/Produtos";
import Empresas from "@/components/modules/cadastros/Empresas";

import Financeiro from "@/components/financeiro/Financeiro";
import CashClosingModern from "@/components/modules/CashClosingModern";
import LoginScreen from "@/components/LoginScreen";

const PlaceholderPage = ({ title }) => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Página em preparação no sistema.
        </p>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { authUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        Carregando...
      </div>
    );
  }

  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  return (
    <Router>
      <Toaster />

      <Routes>
        <Route path="/login" element={<LoginScreen />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />
          <Route path="saude-financeira" element={<PlaceholderPage title="Saúde Financeira" />} />
          <Route path="caixa" element={<PlaceholderPage title="Caixa" />} />
          <Route path="dre" element={<DRE />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="relatorios" element={<Relatorios />} />

          <Route path="cadastros/clientes" element={<Clientes />} />
          <Route path="cadastros/colaboradores" element={<Colaboradores />} />
          <Route path="cadastros/produtos" element={<Produtos />} />
          <Route path="cadastros/empresas" element={<Empresas />} />

          <Route path="empresas" element={<Empresas />} />
          <Route path="funcionarios" element={<Colaboradores />} />
          <Route path="fornecedores" element={<PlaceholderPage title="Fornecedores" />} />

          <Route path="financeiro" element={<Financeiro />} />
          <Route path="financeiro-producao" element={<FinanceiroProducao />} />
          <Route
            path="financeiro/fechamento"
            element={<CashClosingModern pageTitle="Fechamento de Caixa" />}
          />
          <Route path="bancos" element={<PlaceholderPage title="Bancos" />} />
          <Route path="conferencia" element={<PlaceholderPage title="Conferência" />} />
          <Route path="cobrancas" element={<PlaceholderPage title="Cobranças" />} />

          <Route path="producao" element={<PlaceholderPage title="Produção" />} />
          <Route path="pedidos" element={<PlaceholderPage title="Pedidos" />} />
          <Route path="checklists" element={<PlaceholderPage title="Checklists" />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default App;