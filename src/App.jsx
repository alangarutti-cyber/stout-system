import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/contexts/SupabaseAuthContext";

import MainLayout from "@/components/layout/MainLayout";

import Dashboard from "@/components/modules/Dashboard";
import Caixa from "@/components/modules/Caixa";
import DRE from "@/components/modules/DRE";
import Configuracoes from "@/components/modules/Configuracoes";
import Relatorios from "@/components/modules/Relatorios";

import SaudeFinanceira from "@/components/modules/SaudeFinanceira";
import PainelExecutivo from "@/components/modules/PainelExecutivo";
import Pedidos from "@/components/modules/Pedidos";

import Clientes from "@/components/modules/cadastros/Clientes";
import Colaboradores from "@/components/modules/cadastros/Colaboradores";
import Produtos from "@/components/modules/cadastros/Produtos";
import Empresas from "@/components/modules/cadastros/Empresas";

import Financeiro from "@/components/financeiro/Financeiro";
import CashClosingModern from "@/components/modules/CashClosingModern";

import LoginScreen from "@/components/LoginScreen";

const ProtectedRoute = ({ children }) => {
  const { authUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
        <p className="animate-pulse">Inicializando autenticação...</p>
        <small className="text-muted-foreground mt-2">
          Verificando sessão do usuário...
        </small>
      </div>
    );
  }

  if (!authUser) return <Navigate to="/login" replace />;

  return children;
};

const App = () => {
  return (
    <>
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
          {/* REDIRECT */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* PRINCIPAL */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="saude-financeira" element={<SaudeFinanceira />} />
          <Route path="painel-executivo" element={<PainelExecutivo />} />

          {/* OPERACIONAL */}
          <Route path="caixa" element={<Caixa />} />
          <Route path="fechamento" element={<CashClosingModern />} />
          <Route path="pedidos" element={<Pedidos />} />

          {/* FINANCEIRO */}
          <Route path="financeiro/*" element={<Financeiro />} />
          <Route path="dre" element={<DRE />} />

          {/* CADASTROS */}
          <Route path="cadastros/clientes" element={<Clientes />} />
          <Route path="cadastros/colaboradores" element={<Colaboradores />} />
          <Route path="cadastros/produtos" element={<Produtos />} />
          <Route path="cadastros/empresas" element={<Empresas />} />

          {/* SISTEMA */}
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="relatorios" element={<Relatorios />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
};

export default App;