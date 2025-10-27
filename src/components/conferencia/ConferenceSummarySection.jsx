import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, AlertTriangle, DollarSign, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatItem = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-2">
    <Icon className={`w-4 h-4 ${color}`} />
    <span className="text-sm text-muted-foreground">{label}:</span>
    <span className="font-bold text-sm">{value}</span>
  </div>
);

const ConferenceSummarySection = ({ onRefresh, selectedCompanies }) => {
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSummaryData = async () => {
      setLoading(true);

      let query = supabase.from('cash_closings_dashboard').select('*');
      
      if (selectedCompanies && selectedCompanies.length > 0) {
        // A view não tem company_id, então filtramos pelo nome da empresa
        const { data: companiesData } = await supabase.from('companies').select('name').in('id', selectedCompanies);
        const companyNames = companiesData.map(c => c.name);
        query = query.in('empresa', companyNames);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching summary data:", error);
      } else {
        setSummaryData(data);
      }
      setLoading(false);
    };

    fetchSummaryData();
  }, [onRefresh, selectedCompanies]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="glass-effect p-4">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-4 w-4/6 mb-4" />
            <Skeleton className="h-8 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (summaryData.length === 0) {
    return (
        <div className="text-center py-8 bg-card rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold">Sem Resumo de Fechamentos</h3>
            <p className="text-muted-foreground text-sm">Nenhum dado encontrado para as empresas selecionadas.</p>
        </div>
    );
  }

  return (
    <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Resumo de Fechamentos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryData.map((item, index) => {
            const total = (item.aguardando || 0) + (item.conferidos || 0) + (item.pendentes || 0);
            const percentConferido = total > 0 ? Math.round(((item.conferidos || 0) / total) * 100) : 0;
            return (
            <motion.div
                key={item.empresa}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
            >
                <Card className="glass-effect overflow-hidden h-full flex flex-col justify-between">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg tracking-tight">{item.empresa}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                        <div className="space-y-1">
                            <StatItem icon={Clock} label="Aguardando" value={item.aguardando || 0} color="text-yellow-500" />
                            <StatItem icon={CheckCircle2} label="Conferidos" value={item.conferidos || 0} color="text-green-500" />
                            <StatItem icon={AlertTriangle} label="Pendentes" value={item.pendentes || 0} color="text-red-500" />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-semibold text-muted-foreground">CONFERIDOS</span>
                                <span className="text-xs font-bold text-primary">{percentConferido}%</span>
                            </div>
                            <Progress value={percentConferido} className="h-1.5" />
                        </div>
                         <div className="flex items-center gap-2 pt-2 border-t mt-2">
                            <DollarSign className="w-4 h-4 text-blue-500" />
                            <p className="text-sm text-muted-foreground">Total Líquido:</p>
                            <p className="font-bold text-sm">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.soma_total_liquido || 0)}
                            </p>
                        </div>
                    </CardContent>
                    <div className="p-4 pt-0">
                         <Button size="sm" className="w-full" variant="outline" onClick={() => navigate('/caixa')}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir Fechamentos
                        </Button>
                    </div>
                </Card>
            </motion.div>
            );
        })}
        </div>
    </div>
  );
};

export default ConferenceSummarySection;