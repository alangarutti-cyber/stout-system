import React, { useEffect, useMemo, useState } from "react";
import { DollarSign, Receipt, Building2, Trophy, Factory } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";

const moeda = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [allowedCompanies, setAllowedCompanies] = useState([]);
  const [dre, setDre] = useState(null);
  const [orders, setOrders] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const carregarDashboard = async () => {
      try {
        setLoading(true);
        setErro("");

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        const email = authUser?.email || "";
        setAuthEmail(email);

        if (!email) {
          setErro("Sessão não encontrada.");
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

        setCurrentUser(appUser);

        const { data: companiesData, error: companiesError } = await supabase
          .from("companies")
          .select("*")
          .order("name", { ascending: true });

        if (companiesError) {
          setErro(companiesError.message);
          return;
        }

        const companies = companiesData || [];

        let empresasPermitidas = companies;

        if (!appUser.is_admin && appUser.role !== "Super Administrador") {
          const idsUsuario = [appUser.id, appUser.uuid].filter(Boolean).map(String);

          const { data: accessRows, error: accessError } = await supabase
            .from("user_company_access")
            .select("*")
            .or(idsUsuario.map((id) => `user_id.eq.${id}`).join(","));

          if (accessError) {
            setErro(accessError.message);
            return;
          }

          const allowedCompanyUuids = new Set(
            (accessRows || []).map((a) => String(a.company_id))
          );

          empresasPermitidas = companies.filter((c) =>
            allowedCompanyUuids.has(String(c.uuid))
          );
        }

        setAllowedCompanies(empresasPermitidas);

        const companyIds = empresasPermitidas.map((c) => Number(c.id)).filter(Boolean);

        if (companyIds.length === 0) {
          setDre(null);
          setOrders([]);
          return;
        }

        const primeiroDiaMes = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        )
          .toISOString()
          .split("T")[0];

        const { data: dreData, error: dreError } = await supabase.rpc(
          "get_dre_data",
          {
            p_company_ids: companyIds,
            p_month: primeiroDiaMes,
          }
        );

        if (dreError) {
          setErro(dreError.message);
          return;
        }

        setDre(dreData || null);

        const { data: orderData, error: orderError } = await supabase
          .from("supply_orders")
          .select(
            `
            id,
            company_id,
            order_date,
            created_at,
            status,
            company:company_id (id, name),
            supply_order_items (
              id,
              total_price
            )
          `
          )
          .in("company_id", companyIds)
          .order("created_at", { ascending: false });

        if (orderError) {
          setErro(orderError.message);
          return;
        }

        setOrders(orderData || []);
      } catch (e) {
        setErro(e.message || "Erro ao carregar dashboard.");
      } finally {
        setLoading(false);
      }
    };

    carregarDashboard();
  }, []);

  const resumo = useMemo(() => {
    const porEmpresa = {};
    let totalVendido = 0;
    let totalPedidos = 0;

    for (const order of orders) {
      const itens = order.supply_order_items || [];
      const totalPedido = itens.reduce(
        (sum, item) => sum + Number(item.total_price || 0),
        0
      );

      totalVendido += totalPedido;
      totalPedidos += 1;

      const nomeEmpresa = order.company?.name || `Empresa ${order.company_id}`;

      if (!porEmpresa[nomeEmpresa]) {
        porEmpresa[nomeEmpresa] = {
          empresa: nomeEmpresa,
          titulos: 0,
          totalNumero: 0,
        };
      }

      porEmpresa[nomeEmpresa].titulos += 1;
      porEmpresa[nomeEmpresa].totalNumero += totalPedido;
    }

    const resumoEmpresas = Object.values(porEmpresa)
      .map((item) => ({
        ...item,
        total: moeda(item.totalNumero),
      }))
      .sort((a, b) => b.totalNumero - a.totalNumero);

    const maiorCompradora = resumoEmpresas[0] || null;
    const ticketMedio = totalPedidos > 0 ? totalVendido / totalPedidos : 0;

    return {
      totalVendido,
      totalPedidos,
      ticketMedio,
      resumoEmpresas,
      maiorCompradora,
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="p-6">
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {erro}
        </div>
      </div>
    );
  }

  const empresasComprando = resumo.resumoEmpresas.length;
  const maior = resumo.maiorCompradora;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] md:text-[32px] font-extrabold text-gray-900">
          Financeiro da Produção
        </h1>
        <p className="text-gray-700 mt-1 text-lg">
          Resumo financeiro das compras das empresas na produção
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Usuário: {currentUser?.name || authEmail || "—"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Total Vendido</span>
            <DollarSign className="text-[#ff6600]" size={20} />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {moeda(resumo.totalVendido)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">
              Empresas Comprando
            </span>
            <Building2 className="text-[#ff6600]" size={20} />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {empresasComprando}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">
              Pedidos/Títulos
            </span>
            <Receipt className="text-[#ff6600]" size={20} />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {resumo.totalPedidos}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Ticket Médio</span>
            <Factory className="text-[#ff6600]" size={20} />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {moeda(resumo.ticketMedio)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-[20px] font-bold text-gray-900 mb-4">
            Resumo por Empresa
          </h2>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Empresa
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">
                    Títulos
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumo.resumoEmpresas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-sm text-center text-gray-500"
                    >
                      Nenhum pedido encontrado para as empresas liberadas.
                    </td>
                  </tr>
                ) : (
                  resumo.resumoEmpresas.map((item) => (
                    <tr key={item.empresa} className="border-t border-gray-200">
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {item.empresa}
                      </td>
                      <td className="px-4 py-4 text-sm text-center text-gray-900">
                        {item.titulos}
                      </td>
                      <td className="px-4 py-4 text-sm text-right font-bold text-gray-900">
                        {item.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="text-[#ff6600]" size={24} />
              <h2 className="text-[20px] font-bold text-gray-900">
                Maior Compradora
              </h2>
            </div>

            <div className="rounded-2xl bg-orange-50 border border-orange-200 p-5">
              {maior ? (
                <>
                  <p className="text-sm text-gray-600 mb-2">
                    Empresa com maior volume acumulado
                  </p>
                  <h3 className="text-xl font-extrabold text-gray-900">
                    {maior.empresa}
                  </h3>
                  <p className="text-2xl font-extrabold text-[#ff6600] mt-3">
                    {maior.total}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    {maior.titulos} pedidos/títulos
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  Ainda não há dados suficientes.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-[20px] font-bold text-gray-900 mb-4">
              Indicadores DRE
            </h2>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
                <p className="text-sm text-gray-500">Receita Bruta</p>
                <p className="text-lg font-bold text-gray-900">
                  {moeda(dre?.receita_bruta)}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
                <p className="text-sm text-gray-500">Receita Líquida</p>
                <p className="text-lg font-bold text-gray-900">
                  {moeda(dre?.receita_liquida)}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
                <p className="text-sm text-gray-500">Lucro Líquido</p>
                <p className="text-lg font-bold text-gray-900">
                  {moeda(dre?.lucro_liquido)}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
                <p className="text-sm text-gray-500">Margem Líquida</p>
                <p className="text-lg font-bold text-gray-900">
                  {Number(dre?.margem_liquida || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;