import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Loader2, CheckCircle, AlertTriangle, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const HistoricoFinanceiroAutomatico = () => {
    const { toast } = useToast();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [filters, setFilters] = useState({
        tipo: 'all',
        status: 'all',
        startDate: '',
        endDate: '',
    });

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('system_logs_view')
                .select('*')
                .order('data_execucao', { ascending: false });

            if (filters.tipo !== 'all') {
                query = query.eq('tipo', filters.tipo);
            }
            if (filters.status !== 'all') {
                query = query.ilike('status', `%${filters.status}%`);
            }
            if (filters.startDate) {
                query = query.gte('data_referencia', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('data_referencia', filters.endDate);
            }

            const { data, error } = await query;
            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            toast({
                title: "Erro ao buscar histórico",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [filters, toast]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);
    
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleViewDetails = async (logId) => {
        try {
            const { data, error } = await supabase
                .from('system_logs')
                .select('details')
                .eq('id', logId)
                .single();
            
            if(error) throw error;
            setSelectedLog(data.details);
            setIsModalOpen(true);
        } catch (error) {
            toast({
                title: "Erro ao buscar detalhes do log",
                description: error.message,
                variant: "destructive",
            });
        }
    };
    
    const StatusIcon = ({ status }) => {
        if (status?.includes('✅')) return <CheckCircle className="h-5 w-5 text-green-500" />;
        if (status?.includes('⚠️')) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
        if (status?.includes('❌')) return <XCircle className="h-5 w-5 text-red-500" />;
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Histórico Financeiro Automático</CardTitle>
                    <CardDescription>Logs de verificação e correção automática da integridade financeira.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium mb-1">Intervalo de Datas</label>
                             <div className="flex gap-2">
                                <Input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                                <Input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tipo</label>
                            <select name="tipo" value={filters.tipo} onChange={handleFilterChange} className="w-full p-2 h-10 border rounded-md bg-background">
                                <option value="all">Todos</option>
                                <option value="Verificação Financeira">Verificação</option>
                                <option value="Correção Financeira">Correção</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium mb-1">Status</label>
                             <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 h-10 border rounded-md bg-background">
                                <option value="all">Todos</option>
                                <option value="✅">Sucesso</option>
                                <option value="⚠️">Alerta</option>
                                <option value="❌">Erro</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button onClick={fetchLogs} disabled={loading} className="w-full h-10">
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                                Filtrar
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>Data Execução</TableHead>
                                    <TableHead>Data Referência</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Status Geral</TableHead>
                                    <TableHead>Vendas Corrigidas</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={7} className="text-center p-8"><Loader2 className="mx-auto animate-spin" /></TableCell></TableRow>
                                ) : logs.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="text-center p-8 text-muted-foreground">Nenhum log encontrado para os filtros selecionados.</TableCell></TableRow>
                                ) : (
                                    logs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell><StatusIcon status={log.status_geral || log.status} /></TableCell>
                                            <TableCell>{format(new Date(log.data_execucao), "dd/MM/yy HH:mm:ss", { locale: ptBR })}</TableCell>
                                            <TableCell>{log.data_referencia ? format(new Date(log.data_referencia), "dd/MM/yyyy", { locale: ptBR }) : '-'}</TableCell>
                                            <TableCell>{log.tipo}</TableCell>
                                            <TableCell className="font-medium">{log.status_geral || log.status}</TableCell>
                                            <TableCell className="text-center font-bold">{log.vendas_corrigidas || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(log.id)}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Ver Detalhes
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Log</DialogTitle>
                        <DialogDescription>Visualização completa do objeto JSON registrado no log do sistema.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto bg-muted p-4 rounded-md mt-4">
                        <pre className="text-sm whitespace-pre-wrap break-all">
                            {selectedLog ? JSON.stringify(selectedLog, null, 2) : 'Carregando...'}
                        </pre>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};

export default HistoricoFinanceiroAutomatico;