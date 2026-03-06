import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/contexts/SupabaseAuthContext";

// === Layout principal ===
import MainLayout from "@/components/layout/MainLayout";

// === Telas principais ===
import Dashboard from "@/components/modules/Dashboard";
import Caixa from "@/components/modules/Caixa";
import DRE from "@/components/modules/DRE";
import Configuracoes from "@/components/modules/Configuracoes";
import Relatorios from "@/components/modules/Relatorios";

// === Cadastros ===
import Clientes from "@/components/modules/cadastros/Clientes";
import Colaboradores from "@/components/modules/cadastros/Colaboradores";
import Produtos from "@/components/modules/cadastros/Produtos";
import Empresas from "@/components/modules/cadastros/Empresas";

// === Financeiro ===
import Financeiro from "@/components/financeiro/Financeiro";

// === Fechamento de Caixa Moderno ===
import CashClosingModern from "@/components/modules/CashClosingModern";

// === Login ===
import LoginScreen from "@/components/LoginScreen";

// 🔒 Rota protegida
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
        {/* LOGIN */}
        <Route path="/login" element={<LoginScreen />} />

        {/* ÁREA LOGADA */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirecionamento padrão */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* === PRINCIPAIS === */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="caixa" element={<Caixa />} />
          <Route path="dre" element={<DRE />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="relatorios" element={<Relatorios />} />

          {/* === CADASTROS === */}
          <Route path="cadastros/clientes" element={<Clientes />} />
          <Route path="cadastros/colaboradores" element={<Colaboradores />} />
          <Route path="cadastros/produtos" element={<Produtos />} />
          <Route path="cadastros/empresas" element={<Empresas />} />

          {/* === FINANCEIRO === */}
          <Route path="financeiro" element={<Financeiro />} />
          <Route
            path="financeiro/fechamento"
            element={<CashClosingModern pageTitle="Fechamento de Caixa" />}
          />
        </Route>

        {/* ROTA INVÁLIDA */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
