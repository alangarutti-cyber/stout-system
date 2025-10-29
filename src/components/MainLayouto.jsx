import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// === Layout principal ===
import MainLayout from "@/components/layout/MainLayout";

// === Módulos principais ===
import Dashboard from "@/components/modules/Dashboard";
import Financeiro from "@/components/modules/Financeiro";
import DRE from "@/components/modules/DRE";
import Caixa from "@/components/modules/Caixa";
import Fornecedores from "@/components/modules/Fornecedores";
import Funcionarios from "@/components/modules/Funcionarios";
import Configuracoes from "@/components/modules/Configuracoes";
import Bancos from "@/components/modules/Bancos";
import Pagamentos from "@/components/modules/Pagamentos";
import Produção from "@/components/modules/Producao";
import Pedidos from "@/components/modules/Pedidos"; // ✅ novo módulo

// === Contextos e autenticação (caso tenha login futuro) ===
import { UserProvider } from "@/contexts/UserContext";

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          {/* Rota raiz redireciona para dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* Rotas internas do sistema com o layout padrão */}
          <Route path="/" element={<MainLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="pagamentos" element={<Pagamentos />} />
            <Route path="dre" element={<DRE />} />
            <Route path="caixa" element={<Caixa />} />
            <Route path="fornecedores" element={<Fornecedores />} />
            <Route path="funcionarios" element={<Funcionarios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="bancos" element={<Bancos />} />
            <Route path="producao" element={<Produção />} />
            <Route path="pedidos" element={<Pedidos />} /> {/* ✅ módulo pedidos */}
          </Route>

          {/* Se a rota não existir */}
          <Route path="*" element={<h1 style={{ textAlign: 'center', marginTop: '4rem' }}>Página não encontrada</h1>} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
