import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import Pagamentos from "@/components/financeiro/Pagamentos";
import Lancamentos from "@/components/modules/Lancamentos";
import ContasReceber from "@/components/modules/ContasReceber";
import DRE from "@/components/modules/DRE";
import Bancos from "@/components/modules/Bancos";

const Financeiro = () => {
  const [tab, setTab] = useState("lancamentos");

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <p className="text-gray-500">
          Gestão financeira central do sistema
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex flex-wrap gap-2 mb-6 bg-muted p-2 rounded-lg">
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="bancos">Bancos</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos">
          <Lancamentos />
        </TabsContent>

        <TabsContent value="receber">
          <ContasReceber />
        </TabsContent>

        <TabsContent value="pagamentos">
          <Pagamentos />
        </TabsContent>

        <TabsContent value="dre">
          <DRE />
        </TabsContent>

        <TabsContent value="bancos">
          <Bancos />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Financeiro;