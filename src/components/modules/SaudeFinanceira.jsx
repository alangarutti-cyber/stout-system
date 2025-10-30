import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/customSupabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowUpCircle, ArrowDownCircle, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const SaudeFinanceira = () => {
  const { toast } = useToast();
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);

  // === Buscar dados da view ===
  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("v_financeiro_dashboard")
      .select("*")
      .order("empresa", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar dados financeiros",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDados(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-6 h-6" />
      </div>
    );
  }

  if (!dados || dados.length === 0) {
    return <p className="text-center text-muted-foreground">Nenhum dado encontrado.</p>;
  }

  const totalGeral = dados.reduce((acc, item) => acc + (item.saldo_liquido || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">📊 Saúde Financeira</h2>

      {/* Cards Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-green-700">Saldo Líquido</h3>
              <DollarSign className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700 mt-2">
              {totalGeral.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-red-700">Total a Pagar</h3>
              <ArrowDownCircle className="text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700 mt-2">
              {dados
                .reduce((a, b) => a + (b.total_pagar_aberto || 0), 0)
                .toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-blue-700">Total a Receber</h3>
              <ArrowUpCircle className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-2">
              {dados
                .reduce((a, b) => a + (b.total_receber_aberto || 0), 0)
                .toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico comparativo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white border rounded-xl p-6 shadow-sm"
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-700">
          Comparativo por Empresa
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="empresa" />
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
            <Bar dataKey="total_pagar_aberto" fill="#ef4444" name="A Pagar" />
            <Bar dataKey="total_receber_aberto" fill="#3b82f6" name="A Receber" />
            <Bar dataKey="saldo_liquido" fill="#22c55e" name="Saldo Líquido" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Lista Detalhada */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <h3 className="font-semibold mb-4 text-gray-700">Detalhes por Empresa</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left py-2 px-3">Empresa</th>
                <th className="text-right py-2 px-3">A Pagar</th>
                <th className="text-right py-2 px-3">A Receber</th>
                <th className="text-right py-2 px-3">Saldo Líquido</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((item) => (
                <tr
                  key={item.company_id}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  <td className="py-2 px-3 font-medium">{item.empresa}</td>
                  <td className="text-right text-red-600 py-2 px-3">
                    {item.total_pagar_aberto?.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="text-right text-blue-600 py-2 px-3">
                    {item.total_receber_aberto?.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td
                    className={`text-right font-semibold py-2 px-3 ${
                      item.saldo_liquido >= 0
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {item.saldo_liquido?.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SaudeFinanceira;
