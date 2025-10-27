import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle2, AlertTriangle, DollarSign, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3">
    <Icon className={`w-5 h-5 ${color}`} />
    <div className="flex-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-bold text-lg">{value}</p>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-effect p-3 rounded-lg shadow-lg">
          <p className="font-bold mb-2">{`Data: ${label}`}</p>
          {payload.map((p, i) => (
              <p key={i} style={{ color: p.color }}>{`${p.name}: ${p.value}`}</p>
          ))}
        </div>
      );
    }
    return null;
  };

const CashClosingDashboard = () => {
  const [dashboardData, setDashboardData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      const [dashboardResult, chartResult] = await Promise.all([
        supabase.from('cash_closings_dashboard').select('*'),
        supabase.from('cash_closings').select('closing_date, status').gte('closing_date', sevenDaysAgo)
      ]);

      // Process Dashboard Data
      if (dashboardResult.error) {
        toast({ title: 'Erro ao carregar o painel', description: dashboardResult.error.message, variant: 'destructive' });
        console.error("Error fetching dashboard data:", dashboardResult.error);
      } else {
        setDashboardData(dashboardResult.data);
      }

      // Process Chart Data
      if (chartResult.error) {
        toast({ title: 'Erro ao carregar dados do gráfico', description: chartResult.error.message, variant: 'destructive' });
        console.error("Error fetching chart data:", chartResult.error);
      } else {
        const groupedData = chartResult.data.reduce((acc, { closing_date, status }) => {
          const date = format(new Date(closing_date), 'dd/MM', { locale: ptBR });
          if (!acc[date]) {
            acc[date] = { date, conferido: 0, aguardando_conferencia: 0, pendente: 0 };
          }
          if (status === 'conferido') acc[date].conferido++;
          else if (status === 'aguardando_conferencia') acc[date].aguardando_conferencia++;
          else if (status === 'pending') acc[date].pendente++; // 'pending' é o nome antigo
          return acc;
        }, {});
        
        // Fill missing days
        for (let i = 0; i < 7; i++) {
            const dateKey = format(subDays(new Date(), i), 'dd/MM', { locale: ptBR });
            if (!groupedData[dateKey]) {
                groupedData[dateKey] = { date: dateKey, conferido: 0, aguardando_conferencia: 0, pendente: 0 };
            }
        }

        const processedChartData = Object.values(groupedData).sort((a, b) => new Date(b.date.split('/').reverse().join('-')) - new Date(a.date.split('/').reverse().join('-')));
        setChartData(processedChartData);
      }

      setLoading(false);
    };

    fetchData();
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="glass-effect"><CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-4 w-full" /></CardContent></Card>
            ))}
        </div>
        <Card className="glass-effect"><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardData.length === 0 && !loading ? (
             <div className="col-span-full text-center py-12">
                <h2 className="text-xl font-semibold">Nenhum dado de fechamento encontrado.</h2>
                <p className="text-muted-foreground mt-2">Comece a fazer fechamentos de caixa para ver os dados aqui.</p>
             </div>
          ) : (
            dashboardData.map((item, index) => {
              const total = (item.aguardando || 0) + (item.conferidos || 0) + (item.pendentes || 0);
              const percentConferido = total > 0 ? Math.round(((item.conferidos || 0) / total) * 100) : 0;
              return (
                <motion.div key={item.empresa} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }}>
                  <Card className="glass-effect overflow-hidden h-full flex flex-col">
                    <CardHeader><CardTitle className="text-xl tracking-tight">{item.empresa}</CardTitle></CardHeader>
                    <CardContent className="space-y-6 flex-grow flex flex-col justify-between">
                      <div className="space-y-4">
                        <StatCard icon={Clock} label="Aguardando" value={item.aguardando || 0} color="text-yellow-500" />
                        <StatCard icon={CheckCircle2} label="Conferidos" value={item.conferidos || 0} color="text-green-500" />
                        <StatCard icon={AlertTriangle} label="Pendentes" value={item.pendentes || 0} color="text-red-500" />
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 pt-4 border-t"><DollarSign className="w-5 h-5 text-blue-500" /><div><p className="text-sm text-muted-foreground">Total Líquido</p><p className="font-bold text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.soma_total_liquido || 0)}</p></div></div>
                        <div><div className="flex justify-between items-center mb-1"><span className="text-xs font-semibold text-muted-foreground">CONFERIDOS</span><span className="text-xs font-bold text-primary">{percentConferido}%</span></div><Progress value={percentConferido} className="h-2" /></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <Card className="glass-effect">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-gray-800"><BarChart3 className="w-6 h-6"/>Evolução dos Fechamentos (últimos 7 dias)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }} />
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Bar dataKey="conferido" name="Conferido" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="aguardando_conferencia" name="Aguardando" fill="#facc15" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="pendente" name="Pendente" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    </div>
  );
};

export default CashClosingDashboard;