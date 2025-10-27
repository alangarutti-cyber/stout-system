import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, Loader2, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const renderValue = (value) =>
    new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value || 0);

const DetailModal = ({ details, title }) => (
    <AlertDialog>
        <AlertDialogTrigger asChild>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-2 text-muted-foreground hover:text-foreground"
            >
                <Info className="h-4 w-4" />
            </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
                <AlertDialogTitle>Detalhes de {title}</AlertDialogTitle>
                <AlertDialogDescription>
                    Lista de todos os lançamentos que compõem este grupo.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {details && details.length > 0 ? (
                            details.map((item, index) => (
                                <TableRow key={item.id || index}>
                                    <TableCell>
                                        {new Date((item.date || item.confirmed_at) + 'T00:00:00Z').toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {renderValue(item.amount || item.valor)}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan="3" className="text-center">
                                    Nenhum lançamento detalhado encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <AlertDialogFooter>
                <AlertDialogAction>Fechar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);

const DreRow = ({
    label,
    value,
    percentage,
    valueClass,
    details = [],
    isHeader = false,
    isTotal = false,
    isSub = false,
}) => (
    <TableRow
        className={cn(
            'border-b',
            isHeader && 'bg-muted/50 font-semibold',
            isTotal && 'bg-muted/80 font-bold text-lg'
        )}
    >
        <TableCell
            className={cn(
                'px-2 py-3 sm:px-6 sm:py-4 text-sm sm:text-base flex items-center',
                isSub && 'pl-8'
            )}
        >
            {label}
            {details && details.length > 0 && <DetailModal details={details} title={label} />}
        </TableCell>
        <TableCell
            className={cn(
                'px-2 py-3 sm:px-6 sm:py-4 text-right text-sm sm:text-base font-mono',
                valueClass
            )}
        >
            {renderValue(value)}
        </TableCell>
        <TableCell className="px-2 py-3 sm:px-6 sm:py-4 text-right text-muted-foreground text-sm sm:text-base font-mono">
            {percentage}
        </TableCell>
    </TableRow>
);

const DRE = () => {
    const { user, companies, userCompanyAccess } = useUser();
    const [selectedCompany, setSelectedCompany] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState(
        new Date().toISOString().slice(0, 7)
    );
    const [dreData, setDreData] = useState(null);
    const [monthlyHistory, setMonthlyHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const allowedCompanies = useMemo(() => {
        if (!user || !companies || !userCompanyAccess) return [];
        if (user.is_admin) return companies;
        const companyIds = userCompanyAccess.map((access) => access.company_id);
        return companies.filter((c) => companyIds.includes(c.id));
    }, [user, companies, userCompanyAccess]);

    const allowedCompanyIds = useMemo(
        () => allowedCompanies.map((c) => c.id),
        [allowedCompanies]
    );

    useEffect(() => {
        if (allowedCompanies.length === 1) {
            setSelectedCompany(allowedCompanies[0].id.toString());
        }
    }, [allowedCompanies]);

    const fetchDreData = useCallback(async () => {
        setLoading(true);
        const [year, month] = selectedMonth.split('-');
        const startDate = `${year}-${month}-01`;

        const companyIdsToFilter =
            selectedCompany !== 'all'
                ? [parseInt(selectedCompany)]
                : allowedCompanyIds;

        if (companyIdsToFilter.length === 0) {
            setLoading(false);
            setDreData(null);
            setMonthlyHistory([]);
            return;
        }

        try {
            const { data: dre, error: dreError } = await supabase.rpc(
                'get_dre_data',
                {
                    p_company_ids: companyIdsToFilter,
                    p_month: startDate,
                }
            );

            if (dreError) throw dreError;
            setDreData(dre);

        } catch (error) {
            console.error("DRE Fetch Error: ", error)
            toast({
                title: 'Erro ao buscar dados do DRE',
                description: error.message,
                variant: 'destructive',
            });
            setDreData(null);
        } finally {
            setLoading(false);
        }
    }, [selectedCompany, selectedMonth, allowedCompanyIds, toast]);

    useEffect(() => {
        if (allowedCompanyIds.length > 0) {
            fetchDreData();
        }
    }, [fetchDreData, allowedCompanyIds]);

    const renderPercentage = (value) => {
        if (dreData && dreData.receita_bruta > 0) {
            return `${((value / dreData.receita_bruta) * 100).toFixed(2)}%`;
        }
        return '0.00%';
    }
    
    const renderMarginPercentage = (value) => {
        return `${((value || 0) * 100).toFixed(2)}%`;
    }

    return (
        <div className="space-y-6 p-0 md:p-4">
            <div className="bg-card/80 backdrop-blur-sm border rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Empresa
                        </label>
                        <select
                            value={selectedCompany}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">Consolidado</option>
                            {allowedCompanies.map((company) => (
                                <option key={company.id} value={company.id}>
                                    {company.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Período
                        </label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="flex items-end">
                        <Button onClick={fetchDreData} className="w-full" disabled={loading}>
                            {loading && <Loader2 className="animate-spin mr-2" />}
                            Analisar
                        </Button>
                    </div>
                    <div className="flex items-end">
                        <Button
                            onClick={() => toast({ title: 'Em breve!' })}
                            className="w-full"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Exportar DRE
                        </Button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-10 text-center text-muted-foreground">
                    <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                </div>
            ) : !dreData ? (
                <div className="p-10 text-center text-muted-foreground bg-card rounded-lg">
                    <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                    <h3 className="mt-4 text-lg font-medium">Erro ao carregar DRE</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Não foi possível buscar os dados. Verifique os filtros ou tente novamente.
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-card/80 backdrop-blur-sm border rounded-xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-2 py-3 sm:px-6 sm:py-4 text-left font-semibold text-muted-foreground text-sm sm:text-base">
                                        Conta
                                    </TableHead>
                                    <TableHead className="px-2 py-3 sm:px-6 sm:py-4 text-right font-semibold text-muted-foreground text-sm sm:text-base">
                                        Valor
                                    </TableHead>
                                    <TableHead className="px-2 py-3 sm:px-6 sm:py-4 text-right font-semibold text-muted-foreground text-sm sm:text-base">
                                        %
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-border">
                                <DreRow
                                    label="Receita Bruta"
                                    value={dreData.receita_bruta}
                                    percentage={renderPercentage(dreData.receita_bruta)}
                                    isHeader
                                    valueClass="text-emerald-600"
                                />

                                <DreRow
                                    label="(-) Deduções (Taxas)"
                                    value={-dreData.deducoes}
                                    percentage={renderPercentage(dreData.deducoes)}
                                    isSub
                                    valueClass="text-red-600"
                                />

                                <DreRow
                                    label="(=) Receita Líquida"
                                    value={dreData.receita_liquida}
                                    percentage={renderPercentage(dreData.receita_liquida)}
                                    isHeader
                                    valueClass={
                                        dreData.receita_liquida >= 0
                                            ? 'text-emerald-600'
                                            : 'text-red-600'
                                    }
                                />

                                <DreRow
                                    label="(-) CMV (Custo da Mercadoria Vendida)"
                                    value={-dreData.cmv}
                                    percentage={renderPercentage(dreData.cmv)}
                                    isSub
                                    valueClass="text-red-600"
                                    details={dreData.cmv_details}
                                />

                                <DreRow
                                    label="(=) Lucro Bruto"
                                    value={dreData.lucro_bruto}
                                    percentage={renderMarginPercentage(dreData.margem_bruta)}
                                    isHeader
                                    valueClass={
                                        dreData.lucro_bruto >= 0
                                            ? 'text-emerald-600'
                                            : 'text-red-600'
                                    }
                                />

                                <DreRow
                                    label="(-) Despesas Operacionais"
                                    value={-dreData.despesas_operacionais}
                                    percentage={renderPercentage(dreData.despesas_operacionais)}
                                    isSub
                                    valueClass="text-red-600"
                                    details={dreData.despesas_details}
                                />

                                <DreRow
                                    label="(=) Lucro/Prejuízo Líquido"
                                    value={dreData.lucro_liquido}
                                    percentage={renderMarginPercentage(dreData.margem_liquida)}
                                    isTotal
                                    valueClass={
                                        dreData.lucro_liquido >= 0
                                            ? 'text-emerald-600'
                                            : 'text-red-600'
                                    }
                                />
                            </TableBody>
                        </Table>
                    </div>

                </>
            )}
        </div>
    );
};

export default DRE;