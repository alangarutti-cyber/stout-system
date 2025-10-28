import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Check, Printer, ShoppingCart, UserMinus, PlusCircle,
  Building, Calendar, Utensils, Bike as Moped, Pizza
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import AddMachineForm from '@/components/caixa/AddMachineForm';
import AddExpenseForm from '@/components/caixa/AddExpenseForm';
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
  const [valorDinheiroCaixa, setValorDinheiroCaixa] = useState(0);
  const [valorIfoodBruto, setValorIfoodBruto] = useState(0);
  const [valorPixCnpj, setValorPixCnpj] = useState(0);
  const [addedMachines, setAddedMachines] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [systemValues, setSystemValues] = useState({});
  const [observacoes, setObservacoes] = useState('');
  const [activeForm, setActiveForm] = useState(null);

  // Empresas acessíveis
  const allowedCompanies = useMemo(() =>
    user?.is_admin
      ? companies
      : companies?.filter(c =>
        userCompanyAccess?.some(ua => ua.user_id === user.id && ua.company_id === c.id)
      ),
    [user, companies, userCompanyAccess]
  );

  const selectedCompanyName = useMemo(
    () => companies?.find(c => c.id == selectedCompany)?.name,
    [companies, selectedCompany]
  );

  useEffect(() => {
    if (allowedCompanies?.length > 0 && !selectedCompany) {
      setSelectedCompany(allowedCompanies[0].id);
    }
  }, [allowedCompanies, selectedCompany]);

  const handlePrint = useReactToPrint({ content: () => printableComponentRef.current });

  const resetState = () => {
    setValorAbertura(0);
    setSuprimentos(0);
    setValorDinheiroCaixa(0);
    setValorIfoodBruto(0);
    setValorPixCnpj(0);
    setAddedMachines([]);
    setExpenses([]);
    setWithdrawals([]);
    setSystemValues({});
    setObservacoes('');
  };

  const totalConferido =
    (addedMachines || []).reduce((acc, am) =>
      acc + (am.payments || []).reduce((s, p) => s + p.value, 0), 0
    ) +
    parseFloat(valorIfoodBruto || 0) +
    parseFloat(valorPixCnpj || 0) +
    parseFloat(valorDinheiroCaixa || 0);

  const totalTaxas = (addedMachines || []).reduce((acc, am) =>
    acc + (am.payments || []).reduce((s, p) =>
      s + ((p.value * (p.fee || 0) / 100) + (p.taxa_adicional || 0)), 0), 0
  );

  const totalLiquido = totalConferido - totalTaxas;

  const handleSave = async () => {
    const closingData = {
      company_id: selectedCompany,
      user_id: user?.id,
      closing_date: selectedDate,
      status: 'pending_review',
      previous_balance: valorAbertura,
      supplies: suprimentos,
      valor_dinheiro_caixa: valorDinheiroCaixa,
      valor_ifood_bruto: valorIfoodBruto,
      valor_pix_cnpj: valorPixCnpj,
      withdrawals: (withdrawals || []).reduce((sum, w) => sum + w.value, 0),
      total_taxas: totalTaxas,
      total_liquido: totalLiquido,
      total_conferred: totalConferido,
      setor: selectedSector,
      observations: observacoes
    };

    const { error } = await supabase.from('cash_closings').insert(closingData);

    if (error) {
      toast({
        title: 'Erro ao salvar fechamento',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Fechamento enviado!',
      description: 'O fechamento foi salvo com sucesso.',
    });

    resetState();
  };

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

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">
          Fechamento de Caixa <span className="text-primary font-light">V2</span>
        </h1>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
            <Check className="mr-2 h-4 w-4" /> Enviar p/ Conferência
          </Button>
        </div>
      </div>

      {/* Empresa, Data e Setor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-gray-50 flex items-center gap-3">
          <Building className="w-6 h-6 text-primary" />
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full bg-transparent font-semibold border-none focus:ring-0 p-0"
          >
            {(allowedCompanies || []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary" />
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>

        <div className="p-4 rounded-xl bg-gray-50 flex justify-around">
          <Button onClick={() => setSelectedSector('salao')} variant={selectedSector === 'salao' ? 'default' : 'ghost'}>
            <Utensils /> Salão
          </Button>
          <Button onClick={() => setSelectedSector('delivery')} variant={selectedSector === 'delivery' ? 'default' : 'ghost'}>
            <Moped /> Delivery
          </Button>
        </div>
      </div>

      {/* Ações */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        <ActionButton icon={PlusCircle} label="Máquina" onClick={() => setActiveForm('addMachine')} color="border-blue-500 text-blue-700" />
        <ActionButton icon={ShoppingCart} label="Despesa" onClick={() => setActiveForm('addExpense')} color="border-red-500 text-red-700" />
        <ActionButton icon={UserMinus} label="Retirada" onClick={() => setActiveForm('addWithdrawal')} color="border-yellow-500 text-yellow-700" />
      </div>

      {/* Formulários dinâmicos */}
      <AnimatePresence>
        {activeForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            {activeForm === 'addMachine' && (
              <AddMachineForm
                companyId={selectedCompany}
                onMachineAdd={(data) => {
                  setAddedMachines([...addedMachines, data]);
                  setActiveForm(null);
                }}
                existingMachineIds={(addedMachines || []).map(am => am.machine.id)}
                onCancel={() => setActiveForm(null)}
              />
            )}

            {activeForm === 'addExpense' && (
              <AddExpenseForm
                onAdd={(data) => {
                  setExpenses([...expenses, data]);
                  setActiveForm(null);
                }}
                onCancel={() => setActiveForm(null)}
              />
            )}

            {activeForm === 'addWithdrawal' && (
              <AddWithdrawalForm
                companyId={selectedCompany}
                onAdd={(data) => {
                  setWithdrawals([...withdrawals, data]);
                  setActiveForm(null);
                }}
                onCancel={() => setActiveForm(null)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Valores de Caixa */}
      <div className="rounded-xl bg-gray-50 p-4 space-y-3 mt-6">
        <h3 className="text-xl font-bold text-gray-800">Valores de Caixa</h3>
        <label>Abertura de Caixa (Troco)</label>
        <Input type="number" value={valorAbertura} onChange={(e) => setValorAbertura(parseFloat(e.target.value) || 0)} />

        <label>Suprimentos (Entradas)</label>
        <Input type="number" value={suprimentos} onChange={(e) => setSuprimentos(parseFloat(e.target.value) || 0)} />

        <label>💵 Dinheiro em Caixa</label>
        <Input type="number" value={valorDinheiroCaixa} onChange={(e) => setValorDinheiroCaixa(parseFloat(e.target.value) || 0)} />

        <label>🧾 iFood Online</label>
        <Input type="number" value={valorIfoodBruto} onChange={(e) => setValorIfoodBruto(parseFloat(e.target.value) || 0)} />

        <label>💳 Pix CNPJ</label>
        <Input type="number" value={valorPixCnpj} onChange={(e) => setValorPixCnpj(parseFloat(e.target.value) || 0)} />
      </div>

      {/* Totais */}
      <TotaisSection
        addedMachines={addedMachines}
        expenses={expenses}
        withdrawals={withdrawals}
        systemValues={{
          ...systemValues,
          'payment-ifood_bruto': valorIfoodBruto,
          'payment-pix_cnpj': valorPixCnpj,
          'payment-dinheiro_caixa': valorDinheiroCaixa
        }}
        valorAbertura={valorAbertura}
        suprimentos={suprimentos}
      />

      {/* Impressão */}
      <div style={{ display: 'none' }}>
        <PrintableClosing
          ref={printableComponentRef}
          companyName={selectedCompanyName}
          closingDate={selectedDate}
          user={user}
          data={{
            addedMachines,
            expenses,
            withdrawals,
            systemValues,
            valorAbertura,
            suprimentos,
            valorIfoodBruto,
            valorPixCnpj,
            valorDinheiroCaixa,
            observacoes,
          }}
        />
      </div>
    </div>
  );
};

export default CaixaV2;
