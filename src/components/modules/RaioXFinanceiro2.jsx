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
import { Radar, Search, Loader2, Calendar, FileText, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RaioXFinanceiro2 = () => {
    const { user, companies, userCompanyAccess } = useUser();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);

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
        let query = supabase.from('raiox_financeiro_2_view').select('*');

        if (filters.company !== 'all') {
            query = query.eq('company_id', parseInt(filters.company));
        } else {
            query = query.in('company_id', allowedCompanyIds);
        }

        if (filters.startDate) {
            query = query.gte('data_prevista', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('data_prevista', filters.endDate);
        }

        try {
            const { data, error } = await query;
            if (error) throw error;
            setData(data || []);
        } catch (error) {
            toast({ title: "Erro ao buscar dados do Raio-X 2.0", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [filters, allowedCompanyIds, toast]);

    useEffect(() => {
        if (allowedCompanyIds.length > 0) {
            fetchData();
        }
    }, [fetchData, allowedCompanyIds]);

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    const formatDate = (dateStr) => dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR') : '-';

    const StatusBadge = ({ status }) => {
        if (!status) return null;
        const s = status.toLowerCase();
        let Icon, colorClass, text;

        if (s.includes('pago')) { Icon = CheckCircle2; colorClass = 'text-green-600 bg-green-100'; text = 'Pago'; }
        else if (s.includes('pendente')) { Icon = Clock; colorClass = 'text-blue-600 bg-blue-100'; text = 'Pendente'; }
        else if (s.includes('atrasado')) { Icon = AlertTriangle; colorClass = 'text-yellow-600 bg-yellow-100'; text = 'Atrasado'; }
        else { Icon = XCircle; colorClass = 'text-red-600 bg-red-100'; text = 'Cancelado'; }

        return <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${colorClass}`}><Icon className="w-3 h-3" />{text}</div>;
    };
    
    const consolidatedSummary = useMemo(() => {
        return data.reduce((acc, item) => {
            acc.totalBruto += item.valor_bruto || 0;
            acc.totalTaxas += item.valor_taxas || 0;
            acc.totalLiquidoPrevisto += item.valor_liquido_previsto || 0;
            acc.totalLiquidoRegistrado += item.valor_liquido_registrado || 0;
            acc.totalDiferenca += item.diferenca || 0;
            return acc;
        }, { totalBruto: 0, totalTaxas: 0, totalLiquidoPrevisto: 0, totalLiquidoRegistrado: 0, totalDiferenca: 0 });
    }, [data]);
    
    const dailyChartData = useMemo(() => {
        const dailyData = data.reduce((acc, item) => {
            const date = item.data_prevista;
            if (!acc[date]) {
                acc[date] = { name: formatDate(date), 'Líquido Previsto': 0, 'Líquido Registrado': 0 };
            }
            acc[date]['Líquido Previsto'] += item.valor_liquido_previsto || 0;
            acc[date]['Líquido Registrado'] += item.valor_liquido_registrado || 0;
            return acc;
        }, {});
        return Object.values(dailyData).sort((a,b) => new Date(a.name.split('/').reverse().join('-')) - new Date(b.name.split('/').reverse().join('-')));
    }, [data]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3"><Radar className="w-8 h-8 text-primary" />Raio-X Financeiro 2.0</h1>
                <p className="text-muted-foreground mt-1">A nova geração de análise financeira: consolidada, precisa e em tempo real.</p>
            </header>

            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div><Label>Empresa</Label>
                            <select value={filters.company} onChange={e => setFilters(f => ({ ...f, company: e.target.value }))} className="w-full p-2 mt-1 border rounded-md bg-background h-10">
                                <option value="all">Consolidado</option>
                                {allowedCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div><Label>Data Início</Label><Input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="mt-1" /></div>
                        <div><Label>Data Fim</Label><Input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="mt-1" /></div>
                        <Button onClick={fetchData} disabled={loading} className="h-10">{loading ? <Loader2 className="animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}Analisar</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card><CardHeader><CardTitle>{formatCurrency(consolidatedSummary.totalBruto)}</CardTitle><CardDescription>Total Bruto</CardDescription></CardHeader></Card>
                <Card><CardHeader><CardTitle className="text-destructive">{formatCurrency(consolidatedSummary.totalTaxas)}</CardTitle><CardDescription>Total Taxas</CardDescription></CardHeader></Card>
                <Card><CardHeader><CardTitle className="text-blue-500">{formatCurrency(consolidatedSummary.totalLiquidoPrevisto)}</CardTitle><CardDescription>Líquido Previsto</CardDescription></CardHeader></Card>
                <Card><CardHeader><CardTitle className="text-primary">{formatCurrency(consolidatedSummary.totalLiquidoRegistrado)}</CardTitle><CardDescription>Líquido Registrado</CardDescription></CardHeader></Card>
                <Card><CardHeader><CardTitle className={consolidatedSummary.totalDiferenca === 0 ? '' : 'text-yellow-500'}>{formatCurrency(consolidatedSummary.totalDiferenca)}</CardTitle><CardDescription>Diferença Total</CardDescription></CardHeader></Card>
            </div>

             <Card>
                <CardHeader><CardTitle>Evolução Diária (Líquido Previsto vs. Registrado)</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(val) => formatCurrency(val).replace('R$', '')} />
                            <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="bg-background border p-2 rounded shadow-lg"> <p className="font-bold">{label}</p> {payload.map(p => <p key={p.name} style={{ color: p.color }}>{`${p.name}: ${formatCurrency(p.value)}`}</p>)}</div> : null} />
                            <Legend />
                            <Line type="monotone" dataKey="Líquido Previsto" stroke="#3b82f6" strokeWidth={2} />
                            <Line type="monotone" dataKey="Líquido Registrado" stroke="#10b981" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Lançamentos Detalhados</CardTitle></CardHeader>
                <CardContent>
                   <div className="overflow-x-auto"><table className="w-full text-sm">
                        <thead className="bg-muted/50"><tr>
                            {['Data Prev.', 'Empresa', 'Origem', 'Forma Pgto', 'Bruto', 'Taxas', 'Líq. Previsto', 'Líq. Registrado', 'Diferença', 'Status'].map(h => <th key={h} className="p-3 text-left font-semibold">{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan="10" className="text-center p-8"><Loader2 className="mx-auto animate-spin" /></td></tr> :
                             data.map((item) => <tr key={item.financial_entry_id} className="border-b">
                                <td className="p-3 font-medium">{formatDate(item.data_prevista)}</td>
                                <td className="p-3">{item.empresa}</td>
                                <td className="p-3 capitalize">{item.origem.replace('_', ' ')}</td>
                                <td className="p-3">{item.forma_pagamento}</td>
                                <td className="p-3 font-mono">{formatCurrency(item.valor_bruto)}</td>
                                <td className="p-3 font-mono text-destructive">{formatCurrency(item.valor_taxas)}</td>
                                <td className="p-3 font-mono text-blue-500">{formatCurrency(item.valor_liquido_previsto)}</td>
                                <td className="p-3 font-mono font-bold text-primary">{formatCurrency(item.valor_liquido_registrado)}</td>
                                <td className={`p-3 font-mono ${item.diferenca !== 0 ? 'text-yellow-500 font-bold' : ''}`}>{formatCurrency(item.diferenca)}</td>
                                <td className="p-3"><StatusBadge status={item.status} /></td>
                            </tr>)}
                        </tbody>
                   </table></div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default RaioXFinanceiro2;