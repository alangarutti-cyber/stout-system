import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  LineChart,
  Wallet,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const Dashboard = () => {
  const { user, companies } = useUser();
  const [loading, setLoading] = useState(false);
  const [financeData, setFinanceData] = useState(null);

  const fetchFinanceSummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_dre_data", {
        date_filter: new Date().toISOString().slice(0, 10),
      });

      if (error) throw error;
      setFinanceData(data);
    } catch (error) {
      toast({
        title: "Erro ao carregar dados financeiros",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceSummary();
  }, []);

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Dashboard */}
      <div>
        <h1 className="text-3xl font-bold">
          Seu foco define o seu sucesso,{" "}
          <span className="text-primary">{user?.name?.split(" ")[0] || "usuário"}.</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Painel de indicadores financeiros e de desempenho geral.
        </p>
      </div>

      {/* Seleção de empresa */}
      <div className="flex flex-wrap gap-2">
        {companies?.map((company) => (
          <button
            key={company.id}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:opacity-90 transition-all"
          >
            {company.name}
          </button>
        ))}
      </div>

      {/* Seção de Saúde Financeira */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Saúde Financeira */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl shadow-sm border p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold">Saúde Financeira</h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchFinanceSummary}
              disabled={loading}
            >
              {loading ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-foreground">
              Carregando dados...
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Sem dados para hoje.
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Faturamento do Dia</p>
                  <p className="font-semibold text-green-600">R$ 0,00</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lucro/Prejuízo Diário</p>
                  <p className="font-semibold text-yellow-600">R$ 0,00</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Meta Diária</p>
                  <p className="font-semibold">R$ 0,00</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Projeção Semanal</p>
                  <p className="font-semibold">R$ 0,00</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Card Gráfico */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl shadow-sm border p-5 flex flex-col items-center justify-center text-center"
        >
          <h2 className="text-lg font-semibold mb-2">Gráfico de Vendas</h2>
          <p className="text-muted-foreground text-sm">
            Gráfico em desenvolvimento
          </p>
          <LineChart className="w-16 h-16 text-muted-foreground mt-3" />
        </motion.div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* A Receber */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="text-green-600 w-5 h-5" />
            <h3 className="font-semibold text-green-700">A Receber Hoje</h3>
          </div>
          <p className="text-2xl font-bold text-green-700">R$ 0,00</p>
        </motion.div>

        {/* A Pagar */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-red-600 w-5 h-5" />
            <h3 className="font-semibold text-red-700">A Pagar Hoje</h3>
          </div>
          <p className="text-2xl font-bold text-red-700">R$ 0,00</p>
        </motion.div>

        {/* Recebimentos */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="text-blue-600 w-5 h-5" />
            <h3 className="font-semibold text-blue-700">Recebimentos do Mês</h3>
          </div>
          <p className="text-2xl font-bold text-blue-700">R$ 0,00</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
