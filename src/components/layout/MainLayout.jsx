import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

const MainLayout = () => {
  return (
    <div className="flex h-screen bg-muted/30 text-foreground">
      {/* Sidebar lateral */}
      <Sidebar />

      {/* Conteúdo principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Cabeçalho fixo */}
        <Header />

        {/* Área de conteúdo com rolagem independente */}
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-background">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
