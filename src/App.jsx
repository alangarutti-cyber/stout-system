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
import CategoriasProdutos from "@/components/modules/cadastros/CategoriasProdutos";
import Certificados from "@/components/modules/cadastros/Certificados";
import Despesas from "@/components/modules/cadastros/Despesas";
import DreGroups from "@/components/modules/cadastros/DreGroups";
import DreMappings from "@/components/modules/cadastros/DreMappings";
import FormasPagamento from "@/components/modules/cadastros/FormasPagamento";
import GruposCustoDRE from "@/components/modules/cadastros/GruposCustoDRE";
import LocaisImpressao from "@/components/modules/cadastros/LocaisImpressao";
import ModulosSistema from "@/components/modules/cadastros/ModulosSistema";
import OperadorasCartao from "@/components/modules/cadastros/OperadorasCartao";
import PagamentoFreelance from "@/components/modules/cadastros/PagamentoFreelance";
import PagamentoMotoboy from "@/components/modules/cadastros/PagamentoMotoboy";
import Permissoes from "@/components/modules/cadastros/Permissoes";
import ProdutosV2 from "@/components/modules/cadastros/ProdutosV2";
import UnidadesMedida from "@/components/modules/cadastros/UnidadesMedida";
import Usuarios from "@/components/modules/cadastros/Usuarios";

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
          <Route path="cadastros/produtos-v2" element={<ProdutosV2 />} />
          <Route path="cadastros/empresas" element={<Empresas />} />
          <Route path="cadastros/categorias-produtos" element={<CategoriasProdutos />} />
          <Route path="cadastros/certificados" element={<Certificados />} />
          <Route path="cadastros/despesas" element={<Despesas />} />
          <Route path="cadastros/dre-groups" element={<DreGroups />} />
          <Route path="cadastros/dre-mappings" element={<DreMappings />} />
          <Route path="cadastros/formas-pagamento" element={<FormasPagamento />} />
          <Route path="cadastros/grupos-custo-dre" element={<GruposCustoDRE />} />
          <Route path="cadastros/locais-impressao" element={<LocaisImpressao />} />
          <Route path="cadastros/modulos-sistema" element={<ModulosSistema />} />
          <Route path="cadastros/operadoras-cartao" element={<OperadorasCartao />} />
          <Route path="cadastros/pagamento-freelance" element={<PagamentoFreelance />} />
          <Route path="cadastros/pagamento-motoboy" element={<PagamentoMotoboy />} />
          <Route path="cadastros/permissoes" element={<Permissoes />} />
          <Route path="cadastros/unidades-medida" element={<UnidadesMedida />} />
          <Route path="cadastros/usuarios" element={<Usuarios />} />

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