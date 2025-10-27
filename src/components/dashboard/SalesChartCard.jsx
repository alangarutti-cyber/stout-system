
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { BarChart, Loader2 } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'R$ 0,00';
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/80 backdrop-blur-sm border p-2 rounded-lg shadow-lg">
        <p className="font-bold text-foreground">{label}</p>
        <p className="text-primary">{`Faturamento: ${formatCurrency(payload[0].value)}`}</p>
      </div>
    );
  }
  return null;
};

const SalesChartCard = ({ selectedCompanyIds }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!selectedCompanyIds || selectedCompanyIds.length === 0) {
      setLoading(false);
      setData([]);
      return;
    }
    setLoading(true);

    try {
      const today = new Date();
      const startDate = format(subDays(today, 6), 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('raiox_financeiro_2_view')
        .select('data_prevista, valor_bruto')
        .in('company_id', selectedCompanyIds)
        .gte('data_prevista', startDate)
        .lte('data_prevista', endDate);

      if (error) throw error;

      const dailyTotals = data.reduce((acc, curr) => {
        const date = curr.data_prevista;
        acc[date] = (acc[date] || 0) + curr.valor_bruto;
        return acc;
      }, {});

      const chartData = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(today, i);
        const formattedDate = format(date, 'yyyy-MM-dd');
        return {
          name: format(date, 'dd/MM'),
          Faturamento: dailyTotals[formattedDate] || 0,
        };
      }).reverse();

      setData(chartData);

    } catch (err) {
      console.error("Erro ao buscar dados para o gráfico:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-6 shadow-sm h-full"
    >
      <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
        <BarChart className="w-5 h-5 text-primary" />
        Faturamento Últimos 7 Dias
      </h3>
      <div className="h-64">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.2)" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.1)' }} />
              <Bar dataKey="Faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Sem dados de faturamento para o período.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SalesChartCard;
