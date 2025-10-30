import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/customSupabaseClient";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, PiggyBank, BarChart3 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/components/ui/use-toast";

const DRE = () => {
  const { user, companies, userCompanyAccess } = useUser();
  const { toast } = useToast();
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [allowedCompanies, setAllowedCompanies] = useState([]);

  // === Empresas permitidas ===
  useEffect(() => {
    if (user && companies && userCompanyAccess) {
      if (user.is_admin || user.role === "Super Administrador") {
        setAllowedCompanies(companies);
        if (companies.length > 0) setSelectedCompany(companies[0].id);
      } else {
        const accessIds = userCompanyAccess
          .filter((a) => a.user_id === user.id)
          .map((a) => a.company_id);
        const allowed = companies.filter((c) => accessIds.includes(c.id));
        setAllowedCompanies(allowed);
        if (allowed.length > 0) setSelectedCompany(allowed[0].id);
      }
    }
  }, [user, companies, userCompanyAccess]);

  // === Buscar dados da view v_dre_resumo ===
  useEffect(() => {
    const fetchDRE = async () => {
      if (!selectedCompany) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("v_dre_resumo")
        .select("*")
        .eq("company_id", selectedCompany)
        .order("mes_referencia", { ascending: true });

      if (error) {
        toast({
          title: "Erro ao buscar DRE",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setDados(data);
      }
      setLoading(false);
    };

    fetchDRE();
  }, [selectedCompany, toast]);

  // === Cálculos globais ===
  const totalReceita = dados.reduce((a, b) => a + (b.total_receita || 0), 0);
  const totalDespesa = dados.reduce((a, b) => a + (b.total_despesa || 0), 0);
  const totalCMV = dados.reduce((a, b) => a + (b.total_cmv || 0), 0);
  const lucroLiquido = dados.reduce((a, b) => a + (b.lucro_liquido || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center border-b pb-2">
        <h2 className="text-2xl font-bold">📘 DRE - Demonstrativo de Resultados</h2>

        <select
          className="border p-2 rounded-md"
          value={selectedCompany || ""}
          onChange={(e) => setSelectedCompany(e.target.value)}
        >
          {allowedCompanies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin w-6 h-6" />
        </div>
      ) : (
        <>
          {/* Resumo de indicadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-semibold text-green-700">Lucro Líquido</h3>
                  <PiggyBank className="text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {lucroLiquido.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-semibold text-blue-700">Receita Total</h3>
                  <TrendingUp className="text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {totalReceita.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-semibold text-red-700">Despesas</h3>
                  <TrendingDown className="text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-700">
                  {totalDespesa.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-semibold text-yellow-700">CMV</h3>
                  <BarChart3 className="text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-yellow-700">
                  {totalCMV.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de tendências mensais */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg border shadow-sm p-6 mt-6"
          >
            <h3 className="font-semibold text-lg mb-4 text-gray-700">
              Evolução Mensal do Resultado
            </h3>
            {dados.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={dados}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="mes_referencia"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("pt-BR", {
                        month: "short",
                        year: "2-digit",
                      })
                    }
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(v) =>
                      v.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_receita"
                    stroke="#3b82f6"
                    name="Receitas"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="total_despesa"
                    stroke="#ef4444"
                    name="Despesas"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="total_cmv"
                    stroke="#eab308"
                    name="CMV"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="lucro_liquido"
                    stroke="#16a34a"
                    name="Lucro Líquido"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground">
                Nenhum dado de DRE disponível.
              </p>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
};

export default DRE;
