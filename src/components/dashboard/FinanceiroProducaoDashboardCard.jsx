import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import {
  DollarSign,
  Building2,
  Receipt,
  Trophy,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const formatCurrency = (value) => {
  const numericValue = Number(value || 0);
  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const formatMonthLabel = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('pt-BR', {
    month: '2-digit',
    year: '2-digit',
  });
};

const MetricCard = ({ icon: Icon, label, value, loading }) => (
  <div className="bg-background/60 border rounded-xl p-4">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>

    {loading ? (
      <div className="h-7 w-28 bg-muted animate-pulse rounded" />
    ) : (
      <div className="text-xl font-bold text-foreground">{value}</div>
    )}
  </div>
);

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background/95 border rounded-lg shadow-lg p-3">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry, index) => (
        <p key={`${entry.dataKey}-${index}`} className="text-sm text-muted-foreground">
          {entry.name}: <span className="font-semibold text-foreground">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
};

const CustomLineTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background/95 border rounded-lg shadow-lg p-3">
      <p className="font-semibold text-foreground mb-2">{formatMonthLabel(label)}</p>
      {payload.map((entry, index) => (
        <p key={`${entry.dataKey}-${index}`} className="text-sm text-muted-foreground">
          {entry.name}: <span className="font-semibold text-foreground">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
};

const FinanceiroProducaoDashboardCard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState({
    cards: null,
    ranking_empresas: [],
    grafico_mensal: [],
    grafico_mensal_empresa: [],
    resumo_empresas: [],
  });

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.rpc('get_dashboard_financeiro_producao');

      if (error) throw error;

      setDashboardData({
        cards: data?.cards || null,
        ranking_empresas: data?.ranking_empresas || [],
        grafico_mensal: data?.grafico_mensal || [],
        grafico_mensal_empresa: data?.grafico_mensal_empresa || [],
        resumo_empresas: data?.resumo_empresas || [],
      });
    } catch (err) {
      console.error('Erro ao carregar dashboard financeiro da produção:', err);
      setError(err?.message || 'Não foi possível carregar o dashboard.');
      setDashboardData({
        cards: null,
        ranking_empresas: [],
        grafico_mensal: [],
        grafico_mensal_empresa: [],
        resumo_empresas: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const rankingChartData = useMemo(() => {
    return (dashboardData.ranking_empresas || []).map((item) => ({
      empresa: item.empresa,
      total_compras: Number(item.total_compras || 0),
    }));
  }, [dashboardData.ranking_empresas]);

  const monthlyChartData = useMemo(() => {
    return (dashboardData.grafico_mensal || []).map((item) => ({
      mes: item.mes,
      total_compras: Number(item.total_compras || 0),
    }));
  }, [dashboardData.grafico_mensal]);

  const topCompany = dashboardData?.ranking_empresas?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-6 shadow-sm space-y-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">
            Financeiro da Produção
          </h3>
          <p className="text-sm text-muted-foreground">
            Resumo das compras das empresas na Stout Produção
          </p>
        </div>
      </div>

      {error ? (
        <div className="border border-destructive/20 bg-destructive/5 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Erro ao carregar</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Total Vendido"
          value={formatCurrency(dashboardData.cards?.total_vendas)}
          loading={loading}
        />
        <MetricCard
          icon={Building2}
          label="Empresas Comprando"
          value={String(dashboardData.cards?.total_empresas || 0)}
          loading={loading}
        />
        <MetricCard
          icon={Receipt}
          label="Pedidos/Títulos"
          value={String(dashboardData.cards?.total_titulos || 0)}
          loading={loading}
        />
        <MetricCard
          icon={Trophy}
          label="Ticket Médio"
          value={formatCurrency(dashboardData.cards?.ticket_medio)}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-background/40 border rounded-xl p-4">
          <div className="mb-4">
            <h4 className="font-semibold text-foreground">Evolução Mensal</h4>
            <p className="text-sm text-muted-foreground">
              Total consolidado comprado por mês
            </p>
          </div>

          <div className="h-72">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.15)" />
                  <XAxis
                    dataKey="mes"
                    tickFormatter={formatMonthLabel}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${(Number(value) / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_compras"
                    name="Compras"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem dados mensais.
              </div>
            )}
          </div>
        </div>

        <div className="bg-background/40 border rounded-xl p-4">
          <div className="mb-4">
            <h4 className="font-semibold text-foreground">Maior Compradora</h4>
            <p className="text-sm text-muted-foreground">
              Empresa com maior volume acumulado
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-6 w-40 bg-muted animate-pulse rounded" />
              <div className="h-8 w-28 bg-muted animate-pulse rounded" />
              <div className="h-5 w-24 bg-muted animate-pulse rounded" />
            </div>
          ) : topCompany ? (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div className="text-lg font-bold text-foreground">{topCompany.empresa}</div>
              <div className="text-2xl font-extrabold text-primary">
                {formatCurrency(topCompany.total_compras)}
              </div>
              <div className="text-sm text-muted-foreground">
                {topCompany.qtd_titulos} pedidos/títulos
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Sem dados disponíveis.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-background/40 border rounded-xl p-4">
          <div className="mb-4">
            <h4 className="font-semibold text-foreground">Ranking das Empresas</h4>
            <p className="text-sm text-muted-foreground">
              Total comprado por empresa
            </p>
          </div>

          <div className="h-80">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : rankingChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={rankingChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted-foreground) / 0.15)" />
                  <XAxis
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${(Number(value) / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    dataKey="empresa"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={130}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="total_compras"
                    name="Compras"
                    fill="hsl(var(--primary))"
                    radius={[0, 8, 8, 0]}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem ranking disponível.
              </div>
            )}
          </div>
        </div>

        <div className="bg-background/40 border rounded-xl p-4">
          <div className="mb-4">
            <h4 className="font-semibold text-foreground">Resumo por Empresa</h4>
            <p className="text-sm text-muted-foreground">
              Situação consolidada no financeiro
            </p>
          </div>

          <div className="overflow-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left py-3 pr-3 font-medium text-muted-foreground">Empresa</th>
                  <th className="text-center py-3 px-3 font-medium text-muted-foreground">Títulos</th>
                  <th className="text-right py-3 pl-3 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                ) : dashboardData.resumo_empresas.length > 0 ? (
                  dashboardData.resumo_empresas.map((item) => (
                    <tr key={item.company_id} className="border-b last:border-0">
                      <td className="py-3 pr-3 text-foreground">{item.empresa}</td>
                      <td className="py-3 px-3 text-center text-foreground">{item.qtd_titulos}</td>
                      <td className="py-3 pl-3 text-right font-semibold text-foreground">
                        {formatCurrency(item.total_em_aberto)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="py-8 text-center text-muted-foreground">
                      Sem dados para exibir.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FinanceiroProducaoDashboardCard;