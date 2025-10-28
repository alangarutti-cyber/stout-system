import React, { useState, useEffect, useCallback } from "react";
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import LoginScreen from "@/components/LoginScreen";
import MainLayout from "@/components/layout/MainLayout";
import InitialSetup from "@/components/InitialSetup";
import { supabase } from "@/lib/customSupabaseClient";
import { AuthProvider, useAuth } from "@/contexts/SupabaseAuthContext";
import AdminCreation from "@/components/AdminCreation";
import { Button } from "@/components/ui/button";
import { UserProvider, useUser } from "@/contexts/UserContext";

// === Importação dos módulos ===
import Dashboard from "@/components/modules/Dashboard";
import DRE from "@/components/modules/DRE";
import Estoque from "@/components/modules/Estoque";
import Caixa from "@/components/modules/Caixa";
import Financeiro from "@/components/modules/Financeiro";
import Fornecedores from "@/components/modules/Fornecedores";
import Funcionarios from "@/components/modules/Funcionarios";
import Empresas from "@/components/modules/Empresas";
import Conferencia from "@/components/modules/Conferencia";
import MaquinasCartao from "@/components/modules/MaquinasCartao";
import Lancamentos from "@/components/modules/Lancamentos";
import Bancos from "@/components/modules/Bancos";
import SaudeFinanceira from "@/components/modules/SaudeFinanceira";
import SaudeFinanceiraAvancada from "@/components/modules/SaudeFinanceiraAvancada";
import SaudeFinanceiraRapida from "@/components/modules/SaudeFinanceiraRapida";
import Cobrancas from "@/components/modules/Cobrancas";
import PDV from "@/components/modules/PDV";
import NotasFiscais from "@/components/modules/NotasFiscais";
import Checklists from "@/components/modules/Checklists";
import Relatorios from "@/components/modules/Relatorios";
import PagamentoSemanal from "@/components/modules/PagamentoSemanal";
import Configuracoes from "@/components/modules/Configuracoes";
import DesempenhoDiario from "@/components/modules/DesempenhoDiario";
import PainelExecutivo from "@/components/modules/PainelExecutivo";
import ProjecaoSemanal from "@/components/modules/ProjecaoSemanal";
import RelatorioBotWhatsapp from "@/components/modules/RelatorioBotWhatsapp";
import RelatorioConsolidado from "@/components/modules/RelatorioConsolidado";
import RelatorioMensal from "@/components/modules/RelatorioMensal";
import Cadastros from "@/components/modules/Cadastros";
import MetasProjecoe from "@/components/modules/MetasProjecoe";
import SuperNota from "@/components/modules/SuperNota";
import SystemLogs from "@/components/modules/SystemLogs";
import Etiquetas from "@/components/modules/Etiquetas";
import EtiquetasCozinha from "@/components/modules/EtiquetasCozinha";
import RaioXFinanceiro from "@/components/modules/RaioXFinanceiro";
import RaioXFinanceiro2 from "@/components/modules/RaioXFinanceiro2";
import FormasPagamento from "@/components/modules/cadastros/FormasPagamento";
import HistoricoFinanceiroAutomatico from "@/components/modules/HistoricoFinanceiroAutomatico";
import Despesas from "@/components/modules/cadastros/Despesas";
import CashClosingDashboard from "@/components/caixa/CashClosingDashboard";

// === Controle de setup inicial ===
const AppContent = () => {
  const { session, loading: authLoading, isSupabaseConnected } = useAuth();
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
      if (!isSupabaseConnected) {
        setInitialState({ isSetupComplete: false, hasAdmin: false, loading: false });
        return;
      }

      try {
        const { count: companiesCount } = await supabase
          .from("companies")
          .select("*", { count: "exact", head: true });

        if (!companiesCount) {
          setInitialState({ isSetupComplete: false, hasAdmin: false, loading: false });
          return;
        }

        const { count: adminCount } = await supabase
          .from("app_users")
          .select("*", { count: "exact", head: true })
          .eq("is_admin", true);

        setInitialState({
          isSetupComplete: true,
          hasAdmin: adminCount > 0,
          loading: false,
        });
      } catch (error) {
        toast({
          title: "Erro de inicialização",
          description: error.message,
          variant: "destructive",
        });
        setInitialState({ isSetupComplete: false, hasAdmin: false, loading: false });
      }
    };

    if (isSupabaseConnected !== null) checkInitialState();
  }, [isSupabaseConnected]);

  if (authLoading || initialState.loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl font-semibold text-foreground">Carregando Sistema...</div>
      </div>
    );

  if (session) return <Outlet />;

  if (!initialState.isSetupComplete)
    return (
      <>
        <Helmet>
          <title>Stout System | Configuração Inicial</title>
        </Helmet>
        <InitialSetup />
      </>
    );

  if (initialState.isSetupComplete && !initialState.hasAdmin)
    return (
      <>
        <Helmet>
          <title>Stout System | Criar Administrador</title>
        </Helmet>
        <AdminCreation />
      </>
    );

  return <Navigate to="/login" replace />;
};

// === Loader de dados do usuário ===
const UserDataLoader = ({ children }) => {
  const { authUser, session, signOut } = useAuth();
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
        .select("*, company_ids:user_company_access(company_id)")
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

// === Wrapper dos módulos ===
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
          {/* === Login === */}
          <Route path="/login" element={<LoginScreen />} />

          {/* === App === */}
          <Route element={<AppContent />}>
            <Route
              path="/"
              element={
                <UserDataLoader>
                  <MainLayout />
                </UserDataLoader>
              }
            >
              {/* === Início === */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<ModuleWrapper component={Dashboard} />} />

              {/* === Financeiro === */}
              <Route path="dre" element={<ModuleWrapper component={DRE} />} />
              <Route path="caixa" element={<ModuleWrapper component={Caixa} />} />
              <Route path="financeiro" element={<ModuleWrapper component={Financeiro} />} />
              <Route path="bancos" element={<ModuleWrapper component={Bancos} />} />
              <Route path="conferencia" element={<ModuleWrapper component={Conferencia} />} />

              {/* === Páginas que redirecionam para Dashboard === */}
              <Route path="cobrancas" element={<Navigate to="/dashboard" replace />} />
              <Route path="pedidos" element={<Navigate to="/dashboard" replace />} />
              <Route path="producao" element={<Navigate to="/dashboard" replace />} />

              {/* === Outros módulos === */}
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

          {/* === Fallback === */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
