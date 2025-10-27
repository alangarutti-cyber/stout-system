import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Radar, Search, Loader2, Calendar, LineChart, BarChart, FileText, Check, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, Line, LineChart as RechartsLineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RaioXFinanceiro = () => {
    const { user, companies, userCompanyAccess, onDataUpdate } = useUser();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('resumo');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState(null);

    const [dailySummary, setDailySummary] = useState([]);
    const [monthlySummary, setMonthlySummary] = useState([]);
    const [detailedData, setDetailedData] = useState([]);

    const [filters, setFilters] = useState({
        company: 'all',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });

    const allowedCompanies = useMemo(() => {
        if (!user || !companies) return [];
        if (user.is_admin) return companies;
        const allowedCompanyIds = userCompanyAccess?.map(access => access.company_id) || [];
        return companies.filter(c => allowedCompanyIds.includes(c.id));
    }, [user, companies, userCompanyAccess]);

    const allowedCompanyIds = useMemo(() => allowedCompanies.map(c => c.id), [allowedCompanies]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const companyNamesToFilter = filters.company === 'all' 
            ? allowedCompanies.map(c => c.name)
            : [allowedCompanies.find(c => c.id === parseInt(filters.company))?.name].filter(Boolean);

        if (companyNamesToFilter.length === 0) {
            setLoading(false);
            return;
        }

        try {
            const [dailyRes, monthlyRes, detailedRes] = await Promise.all([
                supabase.from('raiox_financeiro_resumo_diario_view').select('*').in('empresa', companyNamesToFilter).gte('data_prevista', filters.startDate).lte('data_prevista', filters.endDate),
                supabase.from('raiox_financeiro_resumo_mensal_view').select('*').in('empresa', companyNamesToFilter),
                supabase.from('raiox_financeiro_view').select('*').in('empresa', companyNamesToFilter).gte('data_prevista', filters.startDate).lte('data_prevista', filters.endDate),
            ]);

            if (dailyRes.error) throw dailyRes.error;
            if (monthlyRes.error) throw monthlyRes.error;
            if (detailedRes.error) throw detailedRes.error;

            setDailySummary(dailyRes.data || []);
            setMonthlySummary(monthlyRes.data || []);
            setDetailedData(detailedRes.data || []);

        } catch (error) {
            toast({ title: "Erro ao buscar dados do Raio-X", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [filters, allowedCompanies, toast]);

    useEffect(() => {
        if(allowedCompanies.length > 0) fetchData();
    }, [fetchData, allowedCompanies]);

    const handleVerification = async () => {
        setVerifying(true);
        try {
            const { data, error } = await supabase.rpc('verificar_raiox_dados');
            if (error) throw error;

            setVerificationResult(data);

            let toastVariant = 'default';
            if (data.status.includes('✅')) toastVariant = 'default';
            if (data.status.includes('⚠️')) toastVariant = 'destructive';
            if (data.status.includes('⚙️')) toastVariant = 'default';

            toast({
                title: "Verificação Concluída",
                description: data.status,
                variant: toastVariant,
            });
            
            // Atualiza os dados da tela e do histórico
            fetchData();
            if(onDataUpdate) onDataUpdate();

        } catch (error) {
            toast({ title: "Erro na verificação", description: error.message, variant: 'destructive' });
        } finally {
            setVerifying(false);
        }
    };

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    const formatDate = (dateStr) => dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
    
    const StatusBadge = ({ status }) => {
        if (!status) return null;
        const s = status.toLowerCase();
        let Icon, colorClass, text;

        if (s.includes('ok')) {
            Icon = Check; colorClass = 'text-green-600 bg-green-100'; text = 'OK';
        } else if (s.includes('diverg')) {
            Icon = AlertTriangle; colorClass = 'text-yellow-600 bg-yellow-100'; text = 'Divergência';
        } else {
            Icon = Clock; colorClass = 'text-gray-600 bg-gray-100'; text = status;
        }

        return <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${colorClass}`}><Icon className="w-3 h-3" />{text}</div>;
    };
    
    const dailyChartData = useMemo(() => {
        return dailySummary.map(item => ({
            name: formatDate(item.data_prevista),
            'Valor Líquido': item.total_liquido,
            'Valor Registrado': item.total_registrado_financeiro
        })).reverse();
    }, [dailySummary]);

    const monthlyChartData = useMemo(() => {
        return monthlySummary.map(item => ({
            name: item.mes_referencia,
            'Valor Líquido': item.total_liquido,
            'Taxas': item.total_taxas,
        }));
    }, [monthlySummary]);

    const consolidatedSummary = useMemo(() => {
        return dailySummary.reduce((acc, item) => {
            acc.total_bruto += item.total_bruto || 0;
            acc.total_taxas += item.total_taxas || 0;
            acc.total_liquido += item.total_liquido || 0;
            acc.total_registrado_financeiro += item.total_registrado_financeiro || 0;
            return acc;
        }, { total_bruto: 0, total_taxas: 0, total_liquido: 0, total_registrado_financeiro: 0 });
    }, [dailySummary]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"><Radar className="w-8 h-8 text-primary" />Raio-X Financeiro</h1>
                <p className="text-muted-foreground mt-1">Análise e conciliação de vendas, taxas e recebimentos.</p>
            </header>

            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div><Label>Empresa</Label>
                            <select value={filters.company} onChange={e => setFilters(f => ({ ...f, company: e.target.value }))} className="w-full p-2 mt-1 border rounded-md bg-background h-10">
                                <option value="all">Consolidado</option>
                                {allowedCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div><Label>Data Início</Label><Input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="mt-1" /></div>
                        <div><Label>Data Fim</Label><Input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="mt-1" /></div>
                        <Button onClick={fetchData} disabled={loading} className="h-10">{loading ? <Loader2 className="animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}Analisar</Button>
                        <Button onClick={handleVerification} disabled={verifying} variant="outline" className="h-10 border-primary text-primary hover:bg-primary/10">
                            {verifying ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                            Verificar Raio-X
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="resumo"><BarChart className="w-4 h-4 mr-2" />Resumo</TabsTrigger>
                    <TabsTrigger value="diario"><Calendar className="w-4 h-4 mr-2" />Diário</TabsTrigger>
                    <TabsTrigger value="detalhado"><FileText className="w-4 h-4 mr-2" />Detalhado</TabsTrigger>
                </TabsList>

                <TabsContent value="resumo" className="mt-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card><CardHeader><CardTitle>{formatCurrency(consolidatedSummary.total_bruto)}</CardTitle><CardDescription>Total Bruto</CardDescription></CardHeader></Card>
                        <Card><CardHeader><CardTitle className="text-destructive">{formatCurrency(consolidatedSummary.total_taxas)}</CardTitle><CardDescription>Total Taxas</CardDescription></CardHeader></Card>
                        <Card><CardHeader><CardTitle className="text-primary">{formatCurrency(consolidatedSummary.total_liquido)}</CardTitle><CardDescription>Total Líquido Previsto</CardDescription></CardHeader></Card>
                        <Card><CardHeader><CardTitle>{formatCurrency(consolidatedSummary.total_registrado_financeiro)}</CardTitle><CardDescription>Total Registrado</CardDescription></CardHeader></Card>
                    </div>
                    <Card>
                        <CardHeader><CardTitle>Evolução Diária (Líquido vs. Registrado)</CardTitle></CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsLineChart data={dailyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(val) => formatCurrency(val).replace('R$', '')} />
                                    <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="bg-background border p-2 rounded shadow-lg"> <p className="font-bold">{label}</p> {payload.map(p => <p key={p.name} style={{ color: p.color }}>{`${p.name}: ${formatCurrency(p.value)}`}</p>)}</div> : null} />
                                    <Legend />
                                    <Line type="monotone" dataKey="Valor Líquido" stroke="#10b981" strokeWidth={2} />
                                    <Line type="monotone" dataKey="Valor Registrado" stroke="#8884d8" />
                                </RechartsLineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Resumo Mensal</CardTitle></CardHeader>
                        <CardContent className="h-[300px]">
                           <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart data={monthlyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(val) => formatCurrency(val).replace('R$', '')} />
                                    <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="bg-background border p-2 rounded shadow-lg"> <p className="font-bold">{label}</p> {payload.map(p => <p key={p.name} style={{ color: p.color }}>{`${p.name}: ${formatCurrency(p.value)}`}</p>)}</div> : null} />
                                    <Legend />
                                    <Bar dataKey="Valor Líquido" fill="#10b981" />
                                    <Bar dataKey="Taxas" fill="#ef4444" />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="diario" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Resumo Diário</CardTitle></CardHeader>
                        <CardContent>
                           <div className="overflow-x-auto"><table className="w-full text-sm">
                                <thead className="bg-muted/50"><tr>
                                    {['Data', 'Empresa', 'Vendas', 'Bruto', 'Taxas', 'Líquido', 'Registrado', 'Diferença', 'Status'].map(h => <th key={h} className="p-3 text-left font-semibold">{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {loading ? <tr><td colSpan="9" className="text-center p-8"><Loader2 className="mx-auto animate-spin" /></td></tr> :
                                     dailySummary.map((item, idx) => <tr key={idx} className="border-b">
                                        <td className="p-3 font-medium">{formatDate(item.data_prevista)}</td>
                                        <td className="p-3">{item.empresa}</td>
                                        <td className="p-3">{item.total_vendas}</td>
                                        <td className="p-3 font-mono">{formatCurrency(item.total_bruto)}</td>
                                        <td className="p-3 font-mono text-destructive">{formatCurrency(item.total_taxas)}</td>
                                        <td className="p-3 font-mono font-bold text-primary">{formatCurrency(item.total_liquido)}</td>
                                        <td className="p-3 font-mono">{formatCurrency(item.total_registrado_financeiro)}</td>
                                        <td className={`p-3 font-mono ${item.diferenca_total !== 0 ? 'text-destructive font-bold' : ''}`}>{formatCurrency(item.diferenca_total)}</td>
                                        <td className="p-3"><StatusBadge status={item.status_geral} /></td>
                                    </tr>)}
                                </tbody>
                           </table></div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="detalhado" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Lançamentos Detalhados</CardTitle></CardHeader>
                        <CardContent>
                           <div className="overflow-x-auto"><table className="w-full text-sm">
                                <thead className="bg-muted/50"><tr>
                                    {['Data', 'Empresa', 'Forma Pgto', 'Bruto', 'Taxas', 'Líquido', 'Registrado', 'Diferença', 'Status'].map(h => <th key={h} className="p-3 text-left font-semibold">{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {loading ? <tr><td colSpan="9" className="text-center p-8"><Loader2 className="mx-auto animate-spin" /></td></tr> :
                                     detailedData.map((item, idx) => <tr key={idx} className="border-b">
                                        <td className="p-3 font-medium">{formatDate(item.data_prevista)}</td>
                                        <td className="p-3">{item.empresa}</td>
                                        <td className="p-3">{item.forma_pagamento}</td>
                                        <td className="p-3 font-mono">{formatCurrency(item.valor_bruto)}</td>
                                        <td className="p-3 font-mono text-destructive">{formatCurrency(item.valor_taxas)}</td>
                                        <td className="p-3 font-mono font-bold text-primary">{formatCurrency(item.valor_liquido)}</td>
                                        <td className="p-3 font-mono">{formatCurrency(item.valor_registrado_financeiro)}</td>
                                        <td className={`p-3 font-mono ${item.diferenca !== 0 ? 'text-destructive font-bold' : ''}`}>{formatCurrency(item.diferenca)}</td>
                                        <td className="p-3"><StatusBadge status={item.status_conciliacao} /></td>
                                    </tr>)}
                                </tbody>
                           </table></div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AlertDialog open={!!verificationResult} onOpenChange={() => setVerificationResult(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Resultado da Verificação</AlertDialogTitle>
                        <AlertDialogDescription>
                            {verificationResult?.status}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="text-sm space-y-2">
                        <p><strong>Total de Vendas Verificadas:</strong> {verificationResult?.total_vendas}</p>
                        <p><strong>Vendas com Pendências:</strong> {verificationResult?.vendas_pendentes}</p>
                        <p><strong>Vendas Corrigidas Automaticamente:</strong> {verificationResult?.vendas_corrigidas}</p>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setVerificationResult(null)}>Fechar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </motion.div>
    );
};

export default RaioXFinanceiro;