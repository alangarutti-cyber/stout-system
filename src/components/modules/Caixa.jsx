import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Check, Printer, ShoppingCart, UserMinus, PlusCircle,
  Building, Calendar, Utensils, Bike as Moped
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import AddMachineForm from '@/components/caixa/AddMachineForm';
import AddOtherPaymentForm from '@/components/caixa/AddOtherPaymentForm';
import AddExpenseForm from '@/components/caixa/AddExpenseForm';
import AddCourtesyForm from '@/components/caixa/AddCourtesyForm';
import AddWithdrawalForm from '@/components/caixa/AddWithdrawalForm';
import ConferidoSection from '@/components/caixa/ConferidoSection';
import SaidasSection from '@/components/caixa/SaidasSection';
import SistemaSection from '@/components/caixa/SistemaSection';
import TotaisSection from '@/components/caixa/TotaisSection';
import PrintableClosing from '@/components/caixa/PrintableClosing';
import { useReactToPrint } from 'react-to-print';

const CaixaV2 = () => {
  const { user, companies, userCompanyAccess } = useUser();
  const { toast } = useToast();
  const printableComponentRef = useRef();

  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedSector, setSelectedSector] = useState('salao');
  const [valorAbertura, setValorAbertura] = useState(0);
  const [suprimentos, setSuprimentos] = useState(0);
  const [addedMachines, setAddedMachines] = useState([]);
  const [addedOtherPayments, setAddedOtherPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [courtesies, setCourtesies] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [salesQuantities, setSalesQuantities] = useState({
    burgerDelivery: 0, burgerSalao: 0, rodizio: 0, rodizioMeia: 0, pizzas: 0
  });
  const [systemValues, setSystemValues] = useState({});
  const [observacoes, setObservacoes] = useState('');
  const [activeForm, setActiveForm] = useState(null);

  const allowedCompanies = useMemo(() =>
    user.is_admin
      ? companies
      : companies.filter(c =>
        userCompanyAccess.some(ua => ua.user_id === user.id && ua.company_id === c.id)
      ),
    [user, companies, userCompanyAccess]
  );

  const selectedCompanyName = useMemo(
    () => companies.find(c => c.id == selectedCompany)?.name,
    [companies, selectedCompany]
  );

  useEffect(() => {
    if (allowedCompanies.length > 0 && !selectedCompany) {
      setSelectedCompany(allowedCompanies[0].id);
    }
  }, [allowedCompanies, selectedCompany]);

  const handlePrint = useReactToPrint({ content: () => printableComponentRef.current });

  const resetState = () => {
    setValorAbertura(0);
    setSuprimentos(0);
    setAddedMachines([]);
    setAddedOtherPayments([]);
    setExpenses([]);
    setCourtesies([]);
    setWithdrawals([]);
    setSalesQuantities({ burgerDelivery: 0, burgerSalao: 0, rodizio: 0, rodizioMeia: 0, pizzas: 0 });
    setSystemValues({});
    setObservacoes('');
  };

  // ✅ Envia o fechamento e cria pendência na conferência
  const handleSave = async () => {
    const totalConferido =
      addedMachines.reduce((acc, am) => acc + am.payments.reduce((sum, p) => sum + p.value, 0), 0) +
      addedOtherPayments.reduce((acc, op) => acc + op.payments.reduce((sum, p) => sum + p.value, 0), 0);

    const totalSystem = Object.values(systemValues).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const totalTaxas =
      addedMachines.reduce((acc, am) => acc + am.payments.reduce((s, p) => s + ((p.value * (p.fee || 0) / 100) + (p.taxa_adicional || 0)), 0), 0) +
      addedOtherPayments.reduce((acc, op) => acc + op.payments.reduce((s, p) => s + ((p.value * (p.fee || 0) / 100) + (p.taxa_adicional || 0)), 0), 0);

    const totalLiquido = totalConferido - totalTaxas;

    const closingData = {
      company_id: selectedCompany,
      user_id: user.id,
      closing_date: selectedDate,
      status: 'pending_review', // ✅ Corrigido
      total_calculated: totalSystem,
      total_conferred: totalConferido,
      total_difference: totalConferido - totalSystem,
      previous_balance: valorAbertura,
      supplies: suprimentos,
      withdrawals: withdrawals.reduce((sum, w) => sum + w.value, 0),
      valor_cortesia: courtesies.reduce((sum, c) => sum + c.value, 0),
      total_taxas: totalTaxas,
      total_liquido: totalLiquido,
      setor: selectedSector,
      qtd_burger_delivery: salesQuantities.burgerDelivery,
      qtd_burger_salao: salesQuantities.burgerSalao,
      qtd_rodizio: salesQuantities.rodizio,
      qtd_rodizio_meia: salesQuantities.rodizioMeia,
      qtd_pizzas: salesQuantities.pizzas,
      observations: observacoes,
    };

    const { data: insertedClosing, error } = await supabase
      .from('cash_closings')
      .insert(closingData)
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao salvar fechamento', description: error.message, variant: 'destructive' });
      return;
    }

    const closingId = insertedClosing.id;

    // 💳 Inserir máquinas
    for (const { machine, payments } of addedMachines) {
      const { data: insertedMachine, error: machineError } = await supabase
        .from('cash_closing_machines')
        .insert({
          cash_closing_id: closingId,
          card_machine_id: machine.id,
          operator_id: machine.operator.id,
          total_conferred: payments.reduce((sum, p) => sum + p.value, 0),
        })
        .select()
        .single();

      if (machineError) continue;

      const paymentsToInsert = payments.map(p => ({
        cash_closing_machine_id: insertedMachine.id,
        payment_method_id: p.id,
        conferred_value: p.value,
        fee_applied: (p.value * (p.fee || 0) / 100),
        additional_fee_applied: (p.taxa_adicional || 0),
        net_value: p.value - ((p.value * (p.fee || 0) / 100) + (p.taxa_adicional || 0)),
      }));

      await supabase.from('cash_closing_payments').insert(paymentsToInsert);
    }

    // 🟣 Inserir outros pagamentos
    for (const { operator, payments } of addedOtherPayments) {
      const { data: insertedOther, error: otherError } = await supabase
        .from('cash_closing_other_payments')
        .insert({
          cash_closing_id: closingId,
          operator_id: operator.id,
          total_conferred: payments.reduce((sum, p) => sum + p.value, 0),
        })
        .select()
        .single();

      if (otherError) continue;

      const itemsToInsert = payments.map(p => ({
        cash_closing_other_payment_id: insertedOther.id,
        payment_method_id: p.id,
        conferred_value: p.value,
        fee_applied: (p.value * (p.fee || 0) / 100),
        additional_fee_applied: (p.taxa_adicional || 0),
        net_value: p.value - ((p.value * (p.fee || 0) / 100) + (p.taxa_adicional || 0)),
      }));

      await supabase.from('cash_closing_other_payment_items').insert(itemsToInsert);
    }

    // 💸 Despesas
    if (expenses.length > 0) {
      const expensesToInsert = expenses.map(e => ({
        company_id: selectedCompany,
        valor: e.value,
        data: selectedDate,
        descricao: e.description,
        tipo: 'Operacional'
      }));
      await supabase.from('expenses').insert(expensesToInsert);
    }

    // 👥 Retiradas
    if (withdrawals.length > 0) {
      const withdrawalsToInsert = withdrawals.map(w => ({
        company_id: selectedCompany,
        user_id: w.employee.id,
        value: w.value,
        date: selectedDate,
        cash_closing_id: closingId
      }));
      await supabase.from('employee_withdrawals').insert(withdrawalsToInsert);
    }

    // 🚀 Enviar automaticamente para Conferência
    await supabase.rpc('send_closing_to_review', {
      p_closing_id: closingId,
      p_user: user.id,
      p_note: 'Enviado automaticamente pelo Fechamento V2'
    });

    toast({
      title: 'Fechamento enviado!',
      description: 'O fechamento foi salvo e já aparece na Conferência.',
    });

    resetState();
  };

  // Botão reutilizável
  const ActionButton = ({ icon: Icon, label, onClick, color }) => (
    <Button
      variant="outline"
      className={`flex-col h-24 w-full justify-center gap-2 text-center border-2 ${color}`}
      onClick={onClick}
    >
      <Icon className="w-8 h-8" />
      <span className="text-xs font-semibold">{label}</span>
    </Button>
  );

  const renderForm = () => {
    switch (activeForm) {
      case 'addMachine':
        return (
          <AddMachineForm
            companyId={selectedCompany}
            onMachineAdd={(data) => { setAddedMachines([...addedMachines, data]); setActiveForm(null); }}
            existingMachineIds={addedMachines.map(am => am.machine.id)}
            onCancel={() => setActiveForm(null)}
          />
        );
      case 'addOther':
        return (
          <AddOtherPaymentForm
            companyId={selectedCompany}
            onPaymentAdd={(data) => { setAddedOtherPayments([...addedOtherPayments, data]); setActiveForm(null); }}
            existingOperatorIds={addedOtherPayments.map(aop => aop.operator.id)}
            onCancel={() => setActiveForm(null)}
          />
        );
      case 'addExpense':
        return (
          <AddExpenseForm onAdd={(data) => { setExpenses([...expenses, data]); setActiveForm(null); }} onCancel={() => setActiveForm(null)} />
        );
      case 'addCourtesy':
        return (
          <AddCourtesyForm onAdd={(data) => { setCourtesies([...courtesies, data]); setActiveForm(null); }} onCancel={() => setActiveForm(null)} />
        );
      case 'addWithdrawal':
        return (
          <AddWithdrawalForm companyId={selectedCompany} onAdd={(data) => { setWithdrawals([...withdrawals, data]); setActiveForm(null); }} onCancel={() => setActiveForm(null)} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">
          Fechamento de Caixa <span className="text-primary font-light">V2</span>
        </h1>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
            <Check className="mr-2 h-4 w-4" /> Adicionar aos Conferidos
          </Button>
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-effect p-4 rounded-xl flex items-center gap-3">
          <Building className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Empresa</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full bg-transparent font-semibold border-none focus:ring-0 p-0"
            >
              {allowedCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="glass-effect p-4 rounded-xl flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Data</label>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent font-semibold border-none focus:ring-0 p-0" />
          </div>
        </div>

        <div className="glass-effect p-4 rounded-xl flex items-center gap-3">
          <div className="flex-1 flex justify-around">
            <Button onClick={() => setSelectedSector('salao')} variant={selectedSector === 'salao' ? 'default' : 'ghost'} className="gap-2"><Utensils /> Salão</Button>
            <Button onClick={() => setSelectedSector('delivery')} variant={selectedSector === 'delivery' ? 'default' : 'ghost'} className="gap-2"><Moped /> Delivery</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Ações */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ActionButton icon={PlusCircle} label="Máquina" onClick={() => setActiveForm('addMachine')} color="border-blue-500 text-blue-700" />
            <ActionButton icon={PlusCircle} label="Outros" onClick={() => setActiveForm('addOther')} color="border-purple-500 text-purple-700" />
            <ActionButton icon={ShoppingCart} label="Despesa" onClick={() => setActiveForm('addExpense')} color="border-red-500 text-red-700" />
            <ActionButton icon={UserMinus} label="Retirada" onClick={() => setActiveForm('addWithdrawal')} color="border-yellow-500 text-yellow-700" />
          </div>

          <AnimatePresence>
            {activeForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                {renderForm()}
              </motion.div>
            )}
          </AnimatePresence>

          <ConferidoSection
            directPayments={[]} // ✅ compatibilidade
            addedMachines={addedMachines}
            addedOtherPayments={addedOtherPayments}
            onRemoveMachine={(id) => setAddedMachines(addedMachines.filter(m => m.machine.id !== id))}
            onRemoveOtherPayment={(id) => setAddedOtherPayments(addedOtherPayments.filter(op => op.operator.id !== id))}
          />

          <SaidasSection
            expenses={expenses}
            courtesies={courtesies}
            withdrawals={withdrawals}
            onRemoveExpense={(id) => setExpenses(expenses.filter(item => item.id !== id))}
            onRemoveCourtesy={(id) => setCourtesies(courtesies.filter(item => item.id !== id))}
            onRemoveWithdrawal={(id) => setWithdrawals(withdrawals.filter(item => item.id !== id))}
          />
        </div>

        {/* Lado direito */}
        <div className="space-y-6">
          <div className="glass-effect rounded-xl p-4 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">Valores de Caixa</h3>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="text-sm">Abertura de Caixa (Troco)</label>
                <Input type="number" value={valorAbertura} onChange={(e) => setValorAbertura(parseFloat(e.target.value) || 0)} placeholder="0,00" />
              </div>
              <div>
                <label className="text-sm">Suprimentos (Entradas)</label>
                <Input type="number" value={suprimentos} onChange={(e) => setSuprimentos(parseFloat(e.target.value) || 0)} placeholder="0,00" />
              </div>
            </div>
          </div>

          <SistemaSection
            directPayments={[]} // compatibilidade
            addedMachines={addedMachines}
            addedOtherPayments={addedOtherPayments}
            systemValues={systemValues}
            onSystemValueChange={(key, value) => setSystemValues({ ...systemValues, [key]: parseFloat(value) || 0 })}
          />
        </div>
      </div>

      <TotaisSection
        directPayments={[]}
        addedMachines={addedMachines}
        addedOtherPayments={addedOtherPayments}
        expenses={expenses}
        withdrawals={withdrawals}
        courtesies={courtesies}
        systemValues={systemValues}
        valorAbertura={valorAbertura}
        suprimentos={suprimentos}
      />

      <div className="glass-effect rounded-xl p-4 mt-6">
        <h3 className="font-bold text-lg mb-2">Observações</h3>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows="4"
          className="w-full p-2 border rounded-md"
          placeholder="Adicione qualquer observação relevante sobre o fechamento..."
        ></textarea>
      </div>

      <div style={{ display: 'none' }}>
        <PrintableClosing
          ref={printableComponentRef}
          companyName={selectedCompanyName}
          closingDate={selectedDate}
          user={user}
          data={{
            addedMachines,
            addedOtherPayments,
            expenses,
            withdrawals,
            systemValues,
            valorAbertura,
            suprimentos,
            observacoes,
          }}
        />
      </div>
    </div>
  );
};

export default CaixaV2;
