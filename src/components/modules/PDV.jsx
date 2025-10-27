import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Minus, X, DollarSign, Printer, Trash2, LogOut, UserPlus, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const PDV = ({ user, companies, userCompanyAccess }) => {
  const { toast } = useToast();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const allowedCompanies = user.is_admin ? companies : companies.filter(c => userCompanyAccess.some(ua => ua.user_id === user.id && ua.company_id === c.id));

  const fetchInitialData = useCallback(async (companyId) => {
    if (!companyId) return;
    setLoading(true);
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*, category:product_categories(name), product_company_access!inner(company_id)')
      .eq('is_active', true)
      .eq('product_company_access.company_id', companyId);

    const { data: categoriesData, error: categoriesError } = await supabase
      .from('product_categories')
      .select('*, companies:product_category_company_access!inner(company_id)')
      .eq('companies.company_id', companyId);

    if (productsError || categoriesError) {
      toast({ title: 'Erro ao carregar produtos/categorias', variant: 'destructive' });
    } else {
      setProducts(productsData || []);
      setCategories(categoriesData || []);
    }
    setLoading(false);
  }, [toast]);

  const checkActiveSession = useCallback(async () => {
    const { data, error } = await supabase
      .from('pdv_sessions')
      .select('*, company:companies(name)')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .single();
    
    if (data) {
      setSession(data);
      fetchInitialData(data.company_id);
    } else {
      setSession(null);
    }
    setLoading(false);
  }, [user.id, fetchInitialData]);

  useEffect(() => {
    checkActiveSession();
  }, [checkActiveSession]);
  
  const handlePaymentSuccess = () => {
      setCart([]);
      toast({
          title: (
              <div className="flex items-center">
                  <CheckCircle className="mr-2 text-green-500" />
                  <span>Venda finalizada com sucesso!</span>
              </div>
          ),
      });
  };

  const handleStartSession = async (companyId, initialCash) => {
    const { data, error } = await supabase
      .from('pdv_sessions')
      .insert({
        company_id: companyId,
        user_id: user.id,
        initial_cash: initialCash,
        status: 'open',
      })
      .select('*, company:companies(name)')
      .single();

    if (error) {
      toast({ title: 'Erro ao iniciar sessão', description: error.message, variant: 'destructive' });
    } else {
      setSession(data);
      fetchInitialData(data.company_id);
      toast({ title: 'Sessão iniciada com sucesso!' });
    }
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== productId));
    } else {
      setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item));
    }
  };

  const total = cart.reduce((acc, item) => acc + ((item.sale_price || 0) * item.quantity), 0);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.custom_code?.includes(searchTerm);
    const matchesCategory = !activeCategory || p.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p>Carregando PDV...</p></div>;
  }

  if (!session) {
    return <OpenSessionDialog onStart={handleStartSession} companies={allowedCompanies} />;
  }

  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col fixed inset-0">
      <header className="bg-gray-800 text-white p-3 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">PDV - Stout System</h1>
        <div className="text-center">
          <p className="font-semibold">{session.company.name}</p>
          <p className="text-xs">{user.name} - {new Date().toLocaleTimeString()}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => toast({ title: 'Funcionalidade em desenvolvimento' })}>
          <LogOut className="w-4 h-4 mr-2" /> Fechar Caixa
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Products */}
        <div className="w-3/5 flex flex-col p-4 overflow-hidden">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input placeholder="Buscar produto (F2)" className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant={!activeCategory ? 'default' : 'secondary'} onClick={() => setActiveCategory(null)}>Todos</Button>
            {categories.map(cat => (
              <Button key={cat.id} variant={activeCategory === cat.id ? 'default' : 'secondary'} onClick={() => setActiveCategory(cat.id)}>{cat.name}</Button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pr-2">
            {filteredProducts.map(p => (
              <motion.div
                key={p.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => addToCart(p)}
                className="bg-white rounded-lg shadow p-3 flex flex-col justify-between cursor-pointer hover:shadow-lg transition-shadow"
              >
                <p className="font-semibold text-sm leading-tight">{p.name}</p>
                <p className="text-right font-bold text-blue-600">R$ {(p.sale_price || 0).toFixed(2)}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Panel - Cart & Actions */}
        <div className="w-2/5 bg-white border-l flex flex-col p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Itens da Venda</h2>
            <Button variant="ghost" size="icon" onClick={() => setCart([])}><Trash2 className="w-5 h-5 text-red-500" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto -mr-4 pr-4">
            {cart.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">Nenhum item na venda.</p>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">R$ {(item.sale_price || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="w-4" /></Button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="w-4" /></Button>
                  </div>
                  <p className="w-20 text-right font-bold">R$ {((item.sale_price || 0) * item.quantity).toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
          <div className="border-t pt-4 mt-4 space-y-3">
            <div className="bg-blue-600 text-white rounded-lg p-4 text-center">
              <p className="text-sm uppercase">Total a Pagar</p>
              <p className="text-3xl font-bold">R$ {total.toFixed(2)}</p>
            </div>
            <Button className="w-full h-12 text-lg" onClick={() => setIsPaymentOpen(true)} disabled={cart.length === 0}>
              <DollarSign className="mr-2" /> Pagamento (F9)
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => toast({ title: 'Funcionalidade em desenvolvimento' })}>Sangria (F4)</Button>
              <Button variant="outline" onClick={() => toast({ title: 'Funcionalidade em desenvolvimento' })}>Suprimento</Button>
              <Button variant="outline" onClick={() => toast({ title: 'Funcionalidade em desenvolvimento' })}><Printer className="w-4 h-4 mr-2" /> Imprimir (F10)</Button>
              <Button variant="outline" onClick={() => toast({ title: 'Funcionalidade em desenvolvimento' })}><UserPlus className="w-4 h-4 mr-2" /> Cliente</Button>
            </div>
          </div>
        </div>
      </div>
      <PaymentDialog 
        isOpen={isPaymentOpen} 
        setIsOpen={setIsPaymentOpen} 
        total={total}
        cartItems={cart}
        session={session}
        onPaymentSuccess={handlePaymentSuccess} />
    </div>
  );
};

const OpenSessionDialog = ({ onStart, companies }) => {
  const [companyId, setCompanyId] = useState('');
  const [initialCash, setInitialCash] = useState('');

  useEffect(() => {
    if (companies.length > 0) {
      setCompanyId(companies[0].id);
    }
  }, [companies]);

  const handleStart = () => {
    if (companyId && initialCash) {
      onStart(companyId, parseFloat(initialCash));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md space-y-6">
        <h2 className="text-2xl font-bold text-center">Abrir Caixa</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="w-full p-2 border rounded-md">
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fundo de Troco (R$)</label>
            <Input type="number" placeholder="100.00" value={initialCash} onChange={e => setInitialCash(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleStart} className="w-full h-11" disabled={!companyId || !initialCash}>Iniciar Sessão</Button>
      </div>
    </div>
  );
};

const PaymentDialog = ({ isOpen, setIsOpen, total, cartItems, session, onPaymentSuccess }) => {
    const { toast } = useToast();
    const [payments, setPayments] = useState([{ method: null, value: '', feePercent: 0, feeFixed: 0 }]);
    const [paymentMethods, setPaymentMethods] = useState([]);

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            if (!session?.company_id) return;
            const { data, error } = await supabase
                .from('payment_methods')
                .select('*, companies:payment_method_company_access!inner(company_id)')
                .eq('companies.company_id', session.company_id);

            if (!error) setPaymentMethods(data || []);
        };
        if(isOpen) {
            fetchPaymentMethods();
        }
    }, [isOpen, session?.company_id]);

    const totalPaid = payments.reduce((acc, p) => acc + (parseFloat(p.value) || 0), 0);
    const remaining = total - totalPaid;
    const change = totalPaid - total;

    const addPayment = () => setPayments([...payments, { method: null, value: '', feePercent: 0, feeFixed: 0 }]);

    const updatePayment = (index, field, value) => {
        const newPayments = [...payments];
        newPayments[index][field] = value;
        if (field === 'method') {
            const selectedMethod = paymentMethods.find(m => m.id.toString() === value);
            newPayments[index].feePercent = selectedMethod?.fee || 0;
            newPayments[index].feeFixed = selectedMethod?.taxa_adicional || 0;
        }
        setPayments(newPayments);
    };

    const removePayment = (index) => {
        const newPayments = payments.filter((_, i) => i !== index);
        setPayments(newPayments);
    };

    const handleFinalize = async () => {
        if (remaining > 0.01) {
            toast({ title: 'Valor restante', description: 'O valor pago é menor que o total.', variant: 'destructive' });
            return;
        }

        const saleToInsert = {
            company_id: session.company_id,
            user_id: session.user_id,
            total_value: total,
            sale_date: new Date().toISOString(),
            status: 'completed',
        };

        const { data: saleData, error: saleError } = await supabase
            .from('sales')
            .insert(saleToInsert)
            .select()
            .single();

        if (saleError) {
            toast({ title: 'Erro ao salvar venda', description: saleError.message, variant: 'destructive' });
            return;
        }

        const paymentsToInsert = payments.filter(p => p.method && parseFloat(p.value) > 0).map(p => {
            const grossValue = parseFloat(p.value);
            const feeValue = (grossValue * (p.feePercent / 100)) + p.feeFixed;
            return {
                sale_id: saleData.id,
                payment_method_id: p.method,
                value: grossValue,
                valor_taxa: feeValue,
                fee_percent: p.feePercent,
                fee_fixed: p.feeFixed
            };
        });
        
        if (paymentsToInsert.length === 0) {
             toast({ title: 'Erro de Pagamento', description: 'Nenhuma forma de pagamento válida foi selecionada.', variant: 'destructive' });
             // Optionally, delete the created sale
             await supabase.from('sales').delete().eq('id', saleData.id);
             return;
        }

        const { error: paymentError } = await supabase
            .from('pdv_payments')
            .insert(paymentsToInsert);

        if (paymentError) {
            toast({ title: 'Erro ao salvar pagamentos', description: paymentError.message, variant: 'destructive' });
            // Optionally, delete the created sale
            await supabase.from('sales').delete().eq('id', saleData.id);
        } else {
            onPaymentSuccess();
            setIsOpen(false);
            setPayments([{ method: null, value: '', feePercent: 0, feeFixed: 0 }]);
        }
    };
    
    useEffect(() => {
        if(isOpen && payments.length === 1 && payments[0].value === '' && total > 0) {
            const newPayments = [...payments];
            newPayments[0].value = total.toFixed(2);
            setPayments(newPayments);
        } else if (!isOpen) {
            setPayments([{ method: null, value: '', feePercent: 0, feeFixed: 0 }]);
        }
    }, [isOpen, total]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl">Pagamento</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-6 py-6">
                    <div className="space-y-4">
                        <h3 className="font-bold">Formas de Pagamento</h3>
                        {payments.map((p, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                <select
                                    value={p.method || ''}
                                    onChange={e => updatePayment(index, 'method', e.target.value)}
                                    className="p-2 border rounded-md w-1/2 bg-background"
                                >
                                    <option value="" disabled>Selecione</option>
                                    {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={p.value}
                                    onChange={e => updatePayment(index, 'value', e.target.value)}
                                    className="text-right"
                                />
                                {payments.length > 1 && <Button variant="ghost" size="icon" onClick={() => removePayment(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>}
                            </div>
                        ))}
                        <Button variant="outline" onClick={addPayment} className="w-full">Adicionar Pagamento</Button>
                    </div>

                    <div className="space-y-4 text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">VALOR TOTAL</p>
                        <p className="text-5xl font-bold text-blue-600">R$ {total.toFixed(2)}</p>

                        <div className="grid grid-cols-2 gap-4 text-left pt-4">
                            <div><p className="text-sm text-gray-500">Total Pago</p><p className="font-bold text-lg">R$ {totalPaid.toFixed(2)}</p></div>
                            <div><p className="text-sm text-gray-500">Restante</p><p className={`font-bold text-lg ${remaining > 0.009 ? 'text-red-500' : 'text-gray-800'}`}>R$ {remaining > 0.009 ? remaining.toFixed(2) : '0.00'}</p></div>
                            <div className="col-span-2"><p className="text-sm text-gray-500">Troco</p><p className={`font-bold text-lg text-green-600`}>R$ {change > 0 ? change.toFixed(2) : '0.00'}</p></div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleFinalize} className="w-full h-12 text-lg" disabled={payments.some(p => !p.method)}>Finalizar Venda</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PDV;