import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Check, X, Eye, AlertTriangle, RefreshCw, DollarSign, Zap, Users } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ✅ Caminho corrigido
import ConferenceSummarySection from '@/components/conferencia/ConferenceSummarySection';

const Conferencia = () => {
  const { user, userCompanyAccess, companies } = useUser();
  const { toast } = useToast();

  const [pendingClosings, setPendingClosings] = useState([]);
  const [pendingContas, setPendingContas] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allowedCompanies, setAllowedCompanies] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [refreshSummary, setRefreshSummary] = useState(0);

  useEffect(() => {
    if (user && userCompanyAccess && companies) {
      const userCompanyIds = userCompanyAccess
        .filter(a => a.user_id === user.id)
        .map(a => a.company_id);

      const accessibleCompanies = companies.filter(c => userCompanyIds.includes(c.id));
      setAllowedCompanies(accessibleCompanies);
      setSelectedCompanies(accessibleCompanies.map(c => c.id));
    }
  }, [user, userCompanyAccess, companies]);

  const fetchData = useCallback(async () => {
    if (selectedCompanies.length === 0) {
      setPendingClosings([]);
      setPendingContas([]);
      setPendingPayments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [closings, contasPagar, contasReceber, payments] = await Promise.all([
        supabase.from('cash_closings')
          .select('*, company:companies(name)')
          .eq('status', 'aguardando_conferencia')
          .in('company_id', selectedCompanies)
          .gte('closing_date', startDate)
          .lte('closing_date', endDate)
          .order('closing_date', { ascending: false }),

        supabase.from('contas_pagar')
          .select('*, company:companies(name)')
          .eq('status', 'Pendente')
          .in('company_id', selectedCompanies),

        supabase.from('contas_receber')
          .select('*, company:companies(name)')
          .eq('status', 'Pendente')
          .in('company_id', selectedCompanies),

        supabase.from('employee_payments')
          .select('*, company:companies(name)')
          .eq('status', 'Pendente')
          .in('company_id', selectedCompanies),
      ]);

      if (closings.error) throw closings.error;
      if (contasPagar.error) throw contasPagar.error;
      if (contasReceber.error) throw contasReceber.error;
      if (payments.error) throw payments.error;

      setPendingClosings(closings.data || []);
      const allContas = [
        ...(contasPagar.data || []).map(c => ({ ...c, type: 'despesa' })),
        ...(contasReceber.data || []).map(c => ({ ...c, type: 'receita' }))
      ];
      setPendingContas(allContas);
      setPendingPayments(payments.data || []);
    } catch (err) {
      setError(err.message);
      toast({
        title: "Erro ao buscar pendências",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setRefreshSummary(prev => prev + 1);
    }
  }, [selectedCompanies, startDate, endDate, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Conferências Pendentes</h1>
        <Button onClick={fetchData} disabled={isLoading}>
          {isLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Atualizar
        </Button>
      </div>

      <ConferenceSummarySection
        onRefresh={refreshSummary}
        selectedCompanies={selectedCompanies}
      />

      <div className="bg-card p-4 rounded-xl shadow-sm border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <Label>Empresas</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {allowedCompanies.map(company => (
                <button
                  key={company.id}
                  onClick={() =>
                    setSelectedCompanies(prev =>
                      prev.includes(company.id)
                        ? prev.filter(id => id !== company.id)
                        : [...prev, company.id]
                    )
                  }
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    selectedCompanies.includes(company.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {company.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="startDate">Data Inicial</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Data Final</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="closings" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="closings">
              <DollarSign className="w-4 h-4 mr-2" />
              Fechamentos ({pendingClosings.length})
            </TabsTrigger>
            <TabsTrigger value="contas">
              <Zap className="w-4 h-4 mr-2" />
              Lançamentos ({pendingContas.length})
            </TabsTrigger>
            <TabsTrigger value="payments">
              <Users className="w-4 h-4 mr-2" />
              Pagamentos ({pendingPayments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="closings" className="mt-6">
            {pendingClosings.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-lg shadow-sm">
                <Check className="mx-auto w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-semibold">Tudo certo!</h2>
                <p className="text-muted-foreground">
                  Nenhum fechamento pendente.
                </p>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                Fechamentos listados aqui...
              </div>
            )}
          </TabsContent>

          <TabsContent value="contas" className="mt-6">
            {pendingContas.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-lg shadow-sm">
                <Check className="mx-auto w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-semibold">Nenhum lançamento!</h2>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                Contas listadas aqui...
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            {pendingPayments.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-lg shadow-sm">
                <Check className="mx-auto w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-semibold">Nenhum pagamento!</h2>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                Pagamentos listados aqui...
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Conferencia;
