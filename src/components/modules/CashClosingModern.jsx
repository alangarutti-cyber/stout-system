// src/components/modules/CashClosingModern.jsx
import React, { useState, useMemo, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useData } from '@/contexts/DataContext';
// ✅ Corrigido: useAuth do SupabaseAuthContext e pegando authUser
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  PlusCircle, Send, Trash2, Laptop, AlertTriangle,
  CheckCircle2, TrendingDown, TrendingUp, HelpCircle,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';

const initialSectionState = {
  openingBalance: 0,
  supply: 0,
  sales: {},           // { paymentMethodId: value }
  purchases: [],       // [{ description: '', amount: 0 }]
  withdrawals: [],     // [{ description: '', amount: 0 }]
};

const CashClosingModern = ({ pageTitle = 'Fechamento de Caixa' }) => {
  const { toast } = useToast();
  const { data, addItem } = useData();
  const { authUser } = useAuth(); // ✅ usa authUser.id (uuid)

  // ✅ Agora sempre trabalhamos com UUID de empresa (string)
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedSector, setSelectedSector] = useState(''); // 'lounge' | 'delivery'
  const [selectedMachineToAdd, setSelectedMachineToAdd] = useState('');
  const [addedMachineIds, setAddedMachineIds] = useState([]);

  const [closing, setClosing] = useState({
    sectorData: JSON.parse(JSON.stringify(initialSectionState)),
    cardSales: {},      // { machineId: { paymentMethodId: value } }
    conference: {},     // { paymentMethodId: value }
    occurrences: '',
  });

  // Seleciona a primeira empresa por padrão (UUID, com fallback pra id se vier legado)
  useEffect(() => {
    if (data?.companies?.length && !selectedCompanyId) {
      const first = data.companies[0];
      setSelectedCompanyId(String(first.uuid ?? first.id)); // ✅ UUID preferencial
    }
  }, [data.companies, selectedCompanyId]);

  const resetState = () => {
    setAddedMachineIds([]);
    setClosing({
      sectorData: JSON.parse(JSON.stringify(initialSectionState)),
      cardSales: {},
      conference: {},
      occurrences: '',
    });
  };

  useEffect(() => {
    resetState();
    setSelectedSector('');
  }, [selectedCompanyId]);

  useEffect(() => {
    resetState();
  }, [selectedSector]);

  // Métodos de pagamento
  const nonCardPaymentMethods = useMemo(
    () => (data.paymentMethods || []).filter(
      pm => pm.type !== 'cartao_credito' && pm.type !== 'cartao_debito'
    ),
    [data.paymentMethods]
  );
  const cashPaymentMethod = useMemo(
    () => (data.paymentMethods || []).find(pm => pm.type === 'dinheiro'),
    [data.paymentMethods]
  );
  const otherNonCardPaymentMethods = useMemo(
    () => nonCardPaymentMethods.filter(pm => pm.type !== 'dinheiro'),
    [nonCardPaymentMethods]
  );

  const formatCurrency = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

  // Handlers (setters)
  const handleDynamicChange = (type, index, field, value) => {
    setClosing(prev => {
      const newSectorData = { ...prev.sectorData };
      const newItems = [...(newSectorData[type] || [])];
      const numValue = field === 'amount' ? parseFloat(value || '0') || 0 : value;
      newItems[index] = { ...newItems[index], [field]: numValue };
      return { ...prev, sectorData: { ...newSectorData, [type]: newItems } };
    });
  };

  const addDynamicItem = (type) => {
    setClosing(prev => {
      const newSectorData = { ...prev.sectorData };
      const base = Array.isArray(newSectorData[type]) ? newSectorData[type] : [];
      const newItems = [...base, { description: '', amount: 0 }];
      return { ...prev, sectorData: { ...newSectorData, [type]: newItems } };
    });
  };

  const removeDynamicItem = (type, index) => {
    setClosing(prev => {
      const newSectorData = { ...prev.sectorData };
      const base = Array.isArray(newSectorData[type]) ? newSectorData[type] : [];
      const newItems = base.filter((_, i) => i !== index);
      return { ...prev, sectorData: { ...newSectorData, [type]: newItems } };
    });
  };

  const handleSectorDataChange = (field, value) => {
    const numValue = parseFloat(value || '0') || 0;
    setClosing(prev => ({
      ...prev,
      sectorData: { ...prev.sectorData, [field]: numValue },
    }));
  };

  const handleSaleChange = (pmId, value) => {
    const numValue = parseFloat(value || '0') || 0;
    setClosing(prev => ({
      ...prev,
      sectorData: {
        ...prev.sectorData,
        sales: { ...prev.sectorData.sales, [pmId]: numValue },
      },
    }));
  };

  const handleCardMachineChange = (machineId, paymentMethodId, value) => {
    const numValue = parseFloat(value || '0') || 0;
    setClosing(prev => ({
      ...prev,
      cardSales: {
        ...prev.cardSales,
        [machineId]: {
          ...(prev.cardSales[machineId] || {}),
          [paymentMethodId]: numValue,
        },
      },
    }));
  };

  const handleConferenceChange = (paymentMethodId, value) => {
    const numValue = parseFloat(value || '0') || 0;
    setClosing(prev => ({
      ...prev,
      conference: { ...prev.conference, [paymentMethodId]: numValue },
    }));
  };

  // Máquinas de cartão — filtra por empresa **UUID**
  const availableMachines = useMemo(() => {
    const list = data.cardMachines || [];
    const wanted = String(selectedCompanyId || '');
    return list.filter(m => {
      const machineCompany =
        String(m.companyId ?? m.company_id ?? m.companyUUID ?? ''); // aceita vários esquemas
      return machineCompany === wanted && m.active && !addedMachineIds.includes(m.id);
    });
  }, [data.cardMachines, selectedCompanyId, addedMachineIds]);

  const addedMachines = useMemo(
    () => (data.cardMachines || []).filter(m => addedMachineIds.includes(m.id)),
    [data.cardMachines, addedMachineIds]
  );

  const handleAddMachine = () => {
    if (selectedMachineToAdd && !addedMachineIds.includes(selectedMachineToAdd)) {
      setAddedMachineIds(prev => [...prev, selectedMachineToAdd]);
      setSelectedMachineToAdd('');
    }
  };

  const cardPaymentMethods = useMemo(
    () =>
      (data.paymentMethods || []).filter(
        pm => pm.type === 'cartao_credito' || pm.type === 'cartao_debito' || pm.type === 'pix'
      ),
    [data.paymentMethods]
  );

  const conferencePaymentMethods = useMemo(() => {
    const cardPMs = (data.paymentMethods || []).filter(
      pm => (pm.type || '').includes('cartao') || pm.type === 'pix' || pm.type === 'online'
    );
    return [cashPaymentMethod, ...cardPMs].filter(Boolean);
  }, [data.paymentMethods, cashPaymentMethod]);

  // --- SUMÁRIO (mesma lógica do seu componente) ---
  const summary = useMemo(() => {
    const { sectorData, cardSales, conference } = closing;

    const systemTotals = {};
    let totalRevenue = 0;

    // Cartões
    for (const machineId in cardSales) {
      for (const pmId in cardSales[machineId]) {
        if (!systemTotals[pmId]) systemTotals[pmId] = 0;
        systemTotals[pmId] += Number(cardSales[machineId][pmId] || 0);
      }
    }
    // Demais vendas
    for (const pmId in sectorData.sales) {
      if (!systemTotals[pmId]) systemTotals[pmId] = 0;
      systemTotals[pmId] += Number(sectorData.sales[pmId] || 0);
    }

    for (const pmId in systemTotals) totalRevenue += Number(systemTotals[pmId] || 0);

    const totalPurchases = (sectorData.purchases || []).reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalWithdrawals = (sectorData.withdrawals || []).reduce((s, i) => s + Number(i.amount || 0), 0);

    const cashSales = Number(sectorData.sales[cashPaymentMethod?.id] || 0);

    // Saldo de dinheiro esperado no caixa
    const expectedFinalCash =
      Number(sectorData.openingBalance || 0) +
      cashSales +
      Number(sectorData.supply || 0) -
      totalPurchases -
      totalWithdrawals;

    if (cashPaymentMethod) {
      // Para conferência, tratamos o "Sistema (Dinheiro)" como o saldo final esperado
      systemTotals[cashPaymentMethod.id] = expectedFinalCash;
    }

    // Prova real (a partir do contado)
    const countedCash = Number(conference[cashPaymentMethod?.id] || 0);
    const expectedCashSales =
      countedCash +
      totalPurchases +
      totalWithdrawals -
      Number(sectorData.openingBalance || 0) -
      Number(sectorData.supply || 0);

    // Taxas de cartão (operadora x associação)
    let cardFees = 0;
    for (const machineId in cardSales) {
      const machine = (data.cardMachines || []).find(m => String(m.id) === String(machineId));
      const operator = (data.cardOperators || []).find(o => String(o.id) === String(machine?.operatorId ?? machine?.operator_id));
      if (!operator) continue;

      for (const pmId in cardSales[machineId]) {
        const grossAmount = Number(cardSales[machineId][pmId] || 0);
        const association = (operator.associations || []).find(a => String(a.paymentMethodId ?? a.payment_method_id) === String(pmId));
        const fee = parseFloat(association?.fee) || 0;
        const additionalFee = parseFloat(association?.additionalFee ?? association?.additional_fee) || 0;
        cardFees += grossAmount * (fee / 100) + (grossAmount > 0 ? additionalFee : 0);
      }
    }

    const netCashResult =
      cashSales + Number(sectorData.supply || 0) - totalPurchases - totalWithdrawals;

    return {
      systemTotals,
      totalRevenue,
      totalPurchases,
      totalWithdrawals,
      netCashResult,
      finalCashBalance: expectedFinalCash,
      totalCardFees: cardFees,
      expectedCashSales,
      cashSales,
    };
  }, [closing, data.paymentMethods, data.cardMachines, data.cardOperators, cashPaymentMethod]);

  const conferenceSummary = useMemo(() => {
    const results = [];
    let hasDifferences = false;

    conferencePaymentMethods.forEach(pm => {
      const systemTotal = Number(summary.systemTotals[pm.id] || 0);
      const conferenceTotal = Number(closing.conference[pm.id] || 0);

      const isCash = pm.type === 'dinheiro';
      const openingBalance = Number(closing.sectorData.openingBalance || 0);

      if (systemTotal === 0 && conferenceTotal === 0 && (!isCash || openingBalance === 0)) {
        return;
      }

      const difference = conferenceTotal - systemTotal;
      if (difference !== 0) hasDifferences = true;

      let message = '✅ Valor conferido corretamente.';
      let color = 'text-green-600';
      let Icon = CheckCircle2;

      if (difference < 0) {
        message = `⚠️ Falta em ${pm.name}`;
        color = 'text-red-600';
        Icon = TrendingDown;
      } else if (difference > 0) {
        message = `💳 Sobra em ${pm.name}`;
        color = 'text-yellow-600';
        Icon = TrendingUp;
      }

      results.push({ pm, systemTotal, conferenceTotal, difference, message, color, Icon });
    });

    return { results, hasDifferences };
  }, [summary.systemTotals, closing.conference, conferencePaymentMethods, closing.sectorData.openingBalance]);

  // Enviar p/ conferência (salva com companyId = UUID e userId = authUser.id)
  const handleSendToConference = () => {
    if (!selectedCompanyId || !selectedSector) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, selecione uma empresa e um setor.',
      });
      return;
    }

    if (!authUser?.id) {
      toast({
        variant: 'destructive',
        title: 'Sessão inválida',
        description: 'Refaça o login para enviar o fechamento.',
      });
      return;
    }

    const closingData = {
      companyId: String(selectedCompanyId), // ✅ UUID
      sector: selectedSector,
      closingDate: new Date().toISOString(),
      userId: String(authUser.id),          // ✅ UUID do Supabase Auth
      status: 'pending_conference',
      summary,
      details: closing,
    };

    addItem('cashClosings', closingData);
    toast({
      title: 'Enviado para conferência!',
      description: `Fechamento do setor '${selectedSector}' aguarda aprovação.`,
    });

    resetState();
    setSelectedSector('');
  };

  const cashSaleDifference = Number(summary.cashSales || 0) - Number(summary.expectedCashSales || 0);

  // ---------- UI ----------
  const renderClosingForm = () => (
    <Tabs defaultValue="sector">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="sector">
          Setor ({selectedSector === 'lounge' ? 'Salão' : 'Delivery'})
        </TabsTrigger>
        <TabsTrigger value="cardMachines">Máquinas de Cartão</TabsTrigger>
        <TabsTrigger value="summary">Resumo do Dia</TabsTrigger>
      </TabsList>

      {/* SETOR */}
      <TabsContent value="sector" className="mt-4 p-6 bg-white rounded-lg border space-y-8">
        {/* Movimentações */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800 border-b pb-3">
            Movimentações do Caixa
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label htmlFor="opening-balance">Abertura de Caixa</Label>
              <Input
                type="number"
                id="opening-balance"
                value={closing.sectorData.openingBalance ?? ''}
                onChange={(e) => handleSectorDataChange('openingBalance', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="supply">Suprimento</Label>
              <Input
                type="number"
                id="supply"
                value={closing.sectorData.supply ?? ''}
                onChange={(e) => handleSectorDataChange('supply', e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
        </div>

        {/* Vendas */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800 border-b pb-3">Vendas do Dia</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              {cashPaymentMethod && (
                <div>
                  <Label
                    htmlFor={`sale-${cashPaymentMethod.id}`}
                    className="text-lg font-semibold text-gray-800 mb-3 block"
                  >
                    Venda Dinheiro
                  </Label>
                  <Input
                    type="number"
                    id={`sale-${cashPaymentMethod.id}`}
                    value={closing.sectorData.sales[cashPaymentMethod.id] ?? ''}
                    onChange={(e) => handleSaleChange(cashPaymentMethod.id, e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              )}
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Outras Vendas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherNonCardPaymentMethods.map((pm) => (
                  <div key={pm.id}>
                    <Label htmlFor={`sale-${pm.id}`}>{pm.name}</Label>
                    <Input
                      type="number"
                      id={`sale-${pm.id}`}
                      value={closing.sectorData.sales[pm.id] ?? ''}
                      onChange={(e) => handleSaleChange(pm.id, e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Saídas */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800 border-b pb-3">Saídas de Caixa</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Compras</h4>
              <div className="space-y-3">
                {(closing.sectorData.purchases || []).map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Descrição (ex: Gelo)"
                      value={item.description}
                      onChange={(e) =>
                        handleDynamicChange('purchases', index, 'description', e.target.value)
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Valor"
                      className="w-32"
                      value={item.amount ?? ''}
                      onChange={(e) =>
                        handleDynamicChange('purchases', index, 'amount', e.target.value)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDynamicItem('purchases', index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => addDynamicItem('purchases')}
                >
                  Adicionar Compra
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Retiradas</h4>
              <div className="space-y-3">
                {(closing.sectorData.withdrawals || []).map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Descrição (ex: Adiant. Free-lancer)"
                      value={item.description}
                      onChange={(e) =>
                        handleDynamicChange('withdrawals', index, 'description', e.target.value)
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Valor"
                      className="w-32"
                      value={item.amount ?? ''}
                      onChange={(e) =>
                        handleDynamicChange('withdrawals', index, 'amount', e.target.value)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDynamicItem('withdrawals', index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => addDynamicItem('withdrawals')}
                >
                  Adicionar Retirada
                </Button>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* MÁQUINAS */}
      <TabsContent value="cardMachines" className="mt-4 p-6 bg-white rounded-lg border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Lançamentos por Máquina</h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={!selectedCompanyId}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Adicionar Máquina
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Adicionar Máquina</h4>
                  <p className="text-sm text-muted-foreground">
                    Selecione uma máquina para adicionar aos lançamentos.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Select
                    value={selectedMachineToAdd}
                    onValueChange={setSelectedMachineToAdd}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma máquina..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMachines.map(machine => (
                        <SelectItem key={machine.id} value={String(machine.id)}>
                          {machine.name}
                        </SelectItem>
                      ))}
                      {availableMachines.length === 0 && (
                        <p className="p-4 text-sm text-gray-500">
                          Nenhuma máquina disponível.
                        </p>
                      )}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddMachine} disabled={!selectedMachineToAdd}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-6">
          {addedMachines.map(machine => (
            <div key={machine.id} className="p-4 border rounded-lg">
              <h4 className="font-semibold text-primary mb-2">{machine.name}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {cardPaymentMethods.map(pm => (
                  <div key={pm.id}>
                    <Label htmlFor={`val-${machine.id}-${pm.id}`} className="text-sm">
                      {pm.name}
                    </Label>
                    <Input
                      type="number"
                      id={`val-${machine.id}-${pm.id}`}
                      placeholder="0,00"
                      value={closing.cardSales[machine.id]?.[pm.id] ?? ''}
                      onChange={(e) =>
                        handleCardMachineChange(machine.id, pm.id, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {addedMachines.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <Laptop className="w-12 h-12 mx-auto text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Nenhuma máquina adicionada
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Use o botão &quot;Adicionar Máquina&quot; para começar.
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      {/* RESUMO */}
      <TabsContent value="summary" className="mt-4 p-6 bg-white rounded-lg border">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Resumo do Dia</h3>

        <div className="p-4 mb-6 rounded-lg bg-indigo-50 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-indigo-800">
                Prova Real de Vendas em Dinheiro
              </h4>
              <Popover>
                <PopoverTrigger>
                  <HelpCircle className="w-4 h-4 text-indigo-500 cursor-pointer" />
                </PopoverTrigger>
                <PopoverContent className="text-sm">
                  Este valor é calculado a partir do dinheiro contado no caixa e das
                  movimentações (compras, retiradas, etc). Ele mostra quanto você
                  <em> deveria </em> ter vendido em dinheiro.
                </PopoverContent>
              </Popover>
            </div>
            <span className="text-lg font-bold text-indigo-800">
              {formatCurrency(summary.expectedCashSales)}
            </span>
          </div>

          <div className="mt-2 text-sm flex justify-between items-center">
            <span>Vendas em Dinheiro Lançadas:</span>
            <span
              className={`font-semibold ${
                cashSaleDifference === 0 ? 'text-gray-700' : 'text-red-600'
              }`}
            >
              {formatCurrency(summary.cashSales)}
            </span>
          </div>

          {cashSaleDifference !== 0 && (
            <div
              className={`mt-2 text-xs p-2 rounded flex items-center gap-2 ${
                cashSaleDifference > 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>
                Diferença de {formatCurrency(cashSaleDifference)}.{' '}
                {cashSaleDifference > 0
                  ? 'Você lançou a mais.'
                  : 'Você lançou a menos ou esqueceu de registrar uma venda.'}
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold mb-2">Valores Esperados do Sistema</h4>
            <div className="border rounded-lg p-4 space-y-2">
              {conferenceSummary.results.map(({ pm, systemTotal }) => (
                <div key={`sys-${pm.id}`} className="flex justify-between text-sm">
                  <span>{pm.name}:</span>
                  <span className="font-medium">{formatCurrency(systemTotal)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                <span>Total Geral (Receita Bruta):</span>
                <span>{formatCurrency(summary.totalRevenue)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Conferência de Caixa (Valores Contados)</h4>
            <div className="border rounded-lg p-4 space-y-4">
              {conferenceSummary.results.map(
                ({ pm, conferenceTotal, difference, color, Icon, message }) => (
                  <div key={`conf-${pm.id}`}>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label htmlFor={`conf-val-${pm.id}`} className="col-span-1 text-sm">
                        {pm.name}
                      </Label>
                      <Input
                        type="number"
                        id={`conf-val-${pm.id}`}
                        placeholder="0,00"
                        className="col-span-1 h-9"
                        value={conferenceTotal ?? ''}
                        onChange={(e) => handleConferenceChange(pm.id, e.target.value)}
                      />
                      <span
                        className={`col-span-1 text-sm font-medium text-right ${
                          difference !== 0 ? color : 'text-gray-500'
                        }`}
                      >
                        {formatCurrency(difference)}
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-2 mt-1 text-xs ${
                        difference !== 0 ? color : 'text-gray-500'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{difference !== 0 ? message : '✅ Valor conferido corretamente.'}</span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          {conferenceSummary.hasDifferences ? (
            <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-md flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-800 font-medium">
                Caixa com diferença — revisar lançamentos antes de enviar para conferência.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-green-100 border border-green-300 rounded-md flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">
                🟢 Caixa conferido e pronto para envio.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <Label htmlFor="occurrences">Ocorrências (opcional)</Label>
            <Textarea
              id="occurrences"
              placeholder="Descreva aqui qualquer diferença, quebra de caixa ou observação relevante."
              value={closing.occurrences}
              onChange={(e) =>
                setClosing(prev => ({ ...prev, occurrences: e.target.value }))
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-green-50 rounded-md">
              <span>Total de Receitas (Bruto):</span>
              <span className="font-bold text-green-700">
                {formatCurrency(summary.totalRevenue)}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-red-50 rounded-md">
              <span>(-) Taxas de Cartão/Online:</span>
              <span className="font-bold text-red-700">
                {formatCurrency(summary.totalCardFees)}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-orange-50 rounded-md">
              <span>(-) Compras:</span>
              <span className="font-bold text-orange-700">
                {formatCurrency(summary.totalPurchases)}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-orange-50 rounded-md">
              <span>(-) Retiradas:</span>
              <span className="font-bold text-orange-700">
                {formatCurrency(summary.totalWithdrawals)}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-cyan-50 rounded-md text-cyan-800 font-bold">
              <span>(=) Resultado Líquido (Dinheiro):</span>
              <span>{formatCurrency(summary.netCashResult)}</span>
            </div>
            <div className="flex justify-between p-4 bg-blue-100 rounded-md text-blue-800 font-bold text-lg">
              <span>(=) Saldo Final em Caixa (Dinheiro):</span>
              <span>{formatCurrency(summary.finalCashBalance)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSendToConference}
            size="lg"
            disabled={conferenceSummary.hasDifferences}
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar para Conferência
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Cabeçalho simples (sem Layout) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>

        <div className="flex items-center gap-4">
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione a Empresa" />
            </SelectTrigger>
            <SelectContent>
              {(data.companies || []).map(company => {
                const value = String(company.uuid ?? company.id); // ✅ UUID preferencial
                return (
                  <SelectItem key={value} value={value}>
                    {company.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select
            value={selectedSector}
            onValueChange={setSelectedSector}
            disabled={!selectedCompanyId}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione o Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lounge">Salão</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCompanyId && selectedSector ? (
        renderClosingForm()
      ) : (
        <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed">
          <h3 className="text-lg font-medium text-gray-700">Pronto para começar?</h3>
          <p className="mt-1 text-sm text-gray-500">
            Selecione uma empresa e um setor para iniciar o fechamento de caixa.
          </p>
        </div>
      )}
    </div>
  );
};

export default CashClosingModern;
