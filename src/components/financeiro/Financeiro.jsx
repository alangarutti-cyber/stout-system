import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormasPagamento from "@/components/financeiro/FormasPagamento";
import MaquinasCartao from "@/components/financeiro/MaquinasCartao";
import ContasPagar from "@/components/financeiro/ContasPagar"; // ✅ Caminho corrigido
import { useUser } from "@/contexts/UserContext";

const Pagamentos = () => {
  const { user, companies, userCompanyAccess } = useUser();
  const [tab, setTab] = useState("formas");

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Pagamentos</h1>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex flex-wrap gap-2 mb-6 bg-muted p-2 rounded-lg">
          <TabsTrigger value="formas">Formas de Pagamento</TabsTrigger>
          <TabsTrigger value="maquinas">Máquinas de Cartão</TabsTrigger>
          <TabsTrigger value="contas">Contas a Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="formas">
          <FormasPagamento
            user={user}
            companies={companies}
            userCompanyAccess={userCompanyAccess}
          />
        </TabsContent>

        <TabsContent value="maquinas">
          <MaquinasCartao
            user={user}
            companies={companies}
            userCompanyAccess={userCompanyAccess}
          />
        </TabsContent>

        <TabsContent value="contas">
          <ContasPagar
            user={user}
            companies={companies}
            userCompanyAccess={userCompanyAccess}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Pagamentos;
