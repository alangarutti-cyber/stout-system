import React, { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FormasPagamento from "@/components/financeiro/FormasPagamento";
import MaquinasCartao from "@/components/financeiro/MaquinasCartao";
import ContasPagar from "@/components/financeiro/ContasPagar";
import { supabase } from "@/lib/customSupabaseClient";

const Pagamentos = () => {
  const [tab, setTab] = useState("formas");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [userCompanyAccess, setUserCompanyAccess] = useState([]);

  const carregarContexto = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      const email = authUser?.email || "";
      if (!email) {
        setErro("Sessão não encontrada. Faça login novamente.");
        return;
      }

      const { data: appUser, error: userError } = await supabase
        .from("app_users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError || !appUser) {
        setErro(userError?.message || "Usuário não encontrado.");
        return;
      }

      setUser(appUser);

      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .order("name", { ascending: true });

      if (companiesError) {
        setErro(companiesError.message);
        return;
      }

      setCompanies(companiesData || []);

      const idsUsuario = [appUser.id, appUser.uuid].filter(Boolean).map(String);

      const { data: accessRows, error: accessError } = await supabase
        .from("user_company_access")
        .select("*")
        .or(idsUsuario.map((id) => `user_id.eq.${id}`).join(","));

      if (accessError) {
        setErro(accessError.message);
        return;
      }

      setUserCompanyAccess(accessRows || []);
    } catch (e) {
      setErro(e.message || "Erro ao carregar pagamentos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarContexto();
  }, [carregarContexto]);

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4">Pagamentos</h1>
        <p>Carregando módulo...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-2xl font-bold">Pagamentos</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {erro}
        </div>
      </div>
    );
  }

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