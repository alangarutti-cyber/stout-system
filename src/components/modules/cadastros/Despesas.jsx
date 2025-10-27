import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
};

const Despesas = () => {
    const { user, companies, userCompanyAccess } = useUser();
    const { toast } = useToast();
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentExpense, setCurrentExpense] = useState(null);

    const allowedCompanies = React.useMemo(() => {
        if (!user || !companies || !userCompanyAccess) return [];
        return user.is_admin ? companies : companies.filter(c => userCompanyAccess.some(ua => ua.company_id === c.id));
    }, [user, companies, userCompanyAccess]);

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('expenses').select('*, company:companies(name), category:product_categories(name)');
        if (error) {
            toast({ title: 'Erro ao buscar despesas', description: error.message, variant: 'destructive' });
        } else {
            setExpenses(data);
        }
        setLoading(false);
    }, [toast]);

    const fetchCategories = useCallback(async () => {
        const { data, error } = await supabase.from('product_categories').select('*');
        if (error) {
            toast({ title: 'Erro ao buscar categorias', description: error.message, variant: 'destructive' });
        } else {
            setCategories(data);
        }
    }, [toast]);

    useEffect(() => {
        fetchExpenses();
        fetchCategories();
    }, [fetchExpenses, fetchCategories]);

    const handleNewExpense = () => {
        setCurrentExpense({
            company_id: allowedCompanies.length > 0 ? allowedCompanies[0].id : '',
            entry_date: new Date().toISOString().split('T')[0],
            amount: '',
            category_id: '',
            description: '',
            is_cogs: false,
        });
        setIsEditing(false);
        setShowModal(true);
    };

    const handleEditExpense = (expense) => {
        setCurrentExpense({ ...expense, amount: expense.amount.toString() });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir esta despesa?')) return;
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) {
            toast({ title: 'Erro ao excluir despesa', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Despesa excluída com sucesso!', variant: 'success' });
            fetchExpenses();
        }
    };

    const handleSaveExpense = async () => {
        if (!currentExpense.company_id || !currentExpense.entry_date || !currentExpense.amount) {
            toast({ title: 'Campos obrigatórios', description: 'Empresa, data e valor são obrigatórios.', variant: 'destructive' });
            return;
        }

        const expenseToSave = {
            ...currentExpense,
            amount: parseFloat(currentExpense.amount),
            category_id: currentExpense.category_id || null,
        };

        let result;
        if (isEditing) {
            result = await supabase.from('expenses').update(expenseToSave).eq('id', expenseToSave.id);
        } else {
            const { id, ...insertData } = expenseToSave;
            result = await supabase.from('expenses').insert(insertData);
        }

        if (result.error) {
            toast({ title: 'Erro ao salvar despesa', description: result.error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Despesa salva com sucesso!', variant: 'success' });
            setShowModal(false);
            fetchExpenses();
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Gestão de Despesas</h1>
                <Button onClick={handleNewExpense}>
                    <Plus className="mr-2 h-4 w-4" /> Nova Despesa
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Despesas Lançadas</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Empresa</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>COGS/CMV</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{new Date(expense.entry_date + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                                        <TableCell>{expense.company?.name || 'N/A'}</TableCell>
                                        <TableCell>{expense.description}</TableCell>
                                        <TableCell>{expense.category?.name || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Checkbox checked={expense.is_cogs} disabled />
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(expense.amount)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditExpense(expense)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(expense.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
                    </DialogHeader>
                    {currentExpense && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="company_id">Empresa</Label>
                                    <select
                                        id="company_id"
                                        value={currentExpense.company_id}
                                        onChange={(e) => setCurrentExpense({ ...currentExpense, company_id: e.target.value })}
                                        className="w-full mt-1 p-2 border rounded-md bg-background"
                                    >
                                        {allowedCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="entry_date">Data</Label>
                                    <Input
                                        id="entry_date"
                                        type="date"
                                        value={currentExpense.entry_date}
                                        onChange={(e) => setCurrentExpense({ ...currentExpense, entry_date: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="amount">Valor</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0,00"
                                    value={currentExpense.amount}
                                    onChange={(e) => setCurrentExpense({ ...currentExpense, amount: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">Descrição</Label>
                                <Input
                                    id="description"
                                    value={currentExpense.description}
                                    onChange={(e) => setCurrentExpense({ ...currentExpense, description: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="category_id">Categoria</Label>
                                <select
                                    id="category_id"
                                    value={currentExpense.category_id || ''}
                                    onChange={(e) => setCurrentExpense({ ...currentExpense, category_id: e.target.value })}
                                    className="w-full mt-1 p-2 border rounded-md bg-background"
                                >
                                    <option value="">Nenhuma</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_cogs"
                                    checked={currentExpense.is_cogs}
                                    onCheckedChange={(checked) => setCurrentExpense({ ...currentExpense, is_cogs: checked })}
                                />
                                <label
                                    htmlFor="is_cogs"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Lançar como Custo de Mercadoria Vendida (CMV/COGS)
                                </label>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveExpense}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Despesas;