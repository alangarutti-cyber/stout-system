// src/App.jsx
import React, { useState, useEffect, useCallback } from "react";
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { AuthProvider, useAuth } from "@/contexts/SupabaseAuthContext";
import { UserProvider, useUser } from "@/contexts/UserContext";

// === Telas principais ===
import LoginScreen from "@/components/LoginScreen";
import MainLayout from "@/components/layout/MainLayout";
import InitialSetup from "@/components/InitialSetup";
import AdminCreation from "@/components/AdminCreation";

// === Módulos ===
import Dashboard from "@/components/modules/Dashboard";
import DRE from "@/components/modules/DRE";
import Estoque from "@/components/modules/Estoque";
import Caixa from "@/components/modules/Caixa";
import Financeiro from "@/components/modules/Financeiro";
import Pagamentos from "@/components/modules/Pagamentos"; // ✅ corrigido
import Fornecedores from "@/components/modules/Fornecedores";
import Funcionarios from "@/components/modules/Funcionarios";
import Empresas from "@/components/modules/Empresas";
import Conferencia from "@/components/modules/Conferencia";
import Bancos from "@/components/modules/Bancos";
import SaudeFinanceira from "@/components/modules/SaudeFinanceira";
import PainelExecutivo from "@/components/modules/PainelExecutivo";
import CashClosingDashboard from "@/components/modules/CashClosingDashboard"; // ✅ ajustado
import Relatorios from "@/components/modules/Relatorios";
import Configuracoes from "@/components/modules/Configuracoes";
import Pedidos from "@/components/modules/Pedidos"; // ✅ módulo integrado

// === Controle de Setup Inicial ===
const AppContent = () => {
  const { session, loading: authLoading } = useAuth();
  const [initialState, setInitialState] = useState({
    isSetupComplete: null,
    hasAdmin: null,
    loading: true,
  });

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    const checkInitialState = async () => {
      try {
        console.log("🔍 Checando configuração inicial...");

        const { count: companiesCount, error: companyError } = await supabase
          .from("companies")
          .select("id", { count: "exact", head: true });
        if (companyError) throw companyError;

        const { count: adminCount, error: adminError } = await supabase
          .from("app_users")
          .select("id", { count: "exact", head: true })
          .eq("is_admin", true);
        if (adminError) throw adminError;

        console.log(`🏢 Empresas: ${companiesCount} | 👤 Admins: ${adminCount}`);

        if ((companiesCount ?? 0) > 0 && (adminCount ?? 0) > 0) {
          setInitialState({ isSetupComplete: true, hasAdmin: true, loading: false });
        } else if ((companiesCount ?? 0) > 0) {
          setInitialState({ isSetupComplete: true, hasAdmin: false, loading: false });
        } else {
          setInitialState({ isSetupComplete: false, hasAdmin: false, loading: false });
        }
      } catch (error) {
        console.error("⚠️ Erro ao verificar estado inicial:", error);
        toast({
          title: "Aviso",
          description: "Falha ao verificar setup. Entrando normalmente...",
          variant: "default",
        });
        setInitialState({ isSetupComplete: true, hasAdmin: true, loading: false });
      }
    };

    checkInitialState();
  }, []);

  if (authLoading || initialState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl font-semibold text-foreground">Carregando Sistema...</div>
      </div>
    );
  }

  if (session) return <Outlet />;

  if (!initialState.isSetupComplete) {
    return (
      <>
        <Helmet>
          <title>Stout System | Configuração Inicial</title>
        </Helmet>
        <InitialSetup />
      </>
    );
  }

  if (initialState.isSetupComplete && !initialState.hasAdmin) {
    return (
      <>
        <Helmet>
          <title>Stout System | Criar Administrador</title>
        </Helmet>
        <AdminCreation />
      </>
    );
  }

  return <Navigate to="/login" replace />;
};

// === Loader de Dados do Usuário ===
const UserDataLoader = ({ children }) => {
  const { authUser } = useAuth();
  const [userData, setUserData] = useState({
    user: null,
    companies: [],
    userCompanyAccess: [],
    loading: true,
  });

  const fetchData = useCallback(async (currentAuthUser) => {
    try {
      const { data: appUser } = await supabase
        .from("app_users")
        .select("*") // ✅ Simplificado para evitar erro de relação
        .eq("uuid", currentAuthUser.id)
        .single();

      const { data: companies } = await supabase.from("companies").select("*");
      const { data: access } = await supabase.from("user_company_access").select("*");

      setUserData({
        user: appUser,
        companies,
        userCompanyAccess: access,
        loading: false,
      });
    } catch (err) {
      toast({
        title: "Erro ao carregar dados",
        description: err.message,
        variant: "destructive",
      });
      setUserData({ user: null, companies: [], userCompanyAccess: [], loading: false });
    }
  }, []);

  useEffect(() => {
    if (authUser) fetchData(authUser);
  }, [authUser, fetchData]);

  if (userData.loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Carregando Dados...</div>
      </div>
    );

  return <UserProvider value={{ ...userData }}>{children}</UserProvider>;
};

// === Wrapper dos Módulos ===
const ModuleWrapper = ({ component: Component, ...props }) => {
  const userContext = useUser();
  if (!userContext.user) return null;
  return <Component {...userContext} {...props} />;
};

// === App Principal ===
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />

          <Route element={<AppContent />}>
            <Route
              path="/"
              element={
                <UserDataLoader>
                  <MainLayout />
                </UserDataLoader>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<ModuleWrapper component={Dashboard} />} />

              {/* === Financeiro === */}
              <Route path="dre" element={<ModuleWrapper component={DRE} />} />
              <Route path="caixa" element={<ModuleWrapper component={Caixa} />} />
              <Route path="financeiro" element={<ModuleWrapper component={Financeiro} />} />
              <Route path="bancos" element={<ModuleWrapper component={Bancos} />} />
              <Route path="pagamentos" element={<ModuleWrapper component={Pagamentos} />} />
              <Route path="conferencia" element={<ModuleWrapper component={Conferencia} />} />

              {/* === Operacional === */}
              <Route path="pedidos" element={<ModuleWrapper component={Pedidos} />} /> {/* ✅ Novo módulo Pedidos */}

              {/* === Cadastros / Configurações === */}
              <Route path="fornecedores" element={<ModuleWrapper component={Fornecedores} />} />
              <Route path="funcionarios" element={<ModuleWrapper component={Funcionarios} />} />
              <Route path="empresas" element={<ModuleWrapper component={Empresas} />} />
              <Route path="configuracoes" element={<ModuleWrapper component={Configuracoes} />} />
              <Route path="relatorios" element={<ModuleWrapper component={Relatorios} />} />
              <Route path="saude-financeira" element={<ModuleWrapper component={SaudeFinanceira} />} />
              <Route path="painel-executivo" element={<ModuleWrapper component={PainelExecutivo} />} />
              <Route path="financeiro/fechamentos-dashboard" element={<ModuleWrapper component={CashClosingDashboard} />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
