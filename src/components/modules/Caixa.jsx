import React, { useState, useEffect, useRef, forwardRef } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  Printer,
  ShoppingCart,
  UserMinus,
  PlusCircle,
  Building,
  Calendar,
  Utensils,
  Bike as Moped,
  Trash2,
  CreditCard,
  Wallet,
  Percent,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useReactToPrint } from "react-to-print";

const currency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const numberValue = (value) => parseFloat(value || 0) || 0;

const AddMachineForm = ({ onMachineAdd, onCancel, existingMachineIds = [] }) => {
  const [machineName, setMachineName] = useState("");
  const [payments, setPayments] = useState([
    { id: 1, method: "Crédito", value: "", fee: "", taxa_adicional: "" },
  ]);

  const addPayment = () => {
    setPayments((prev) => [
      ...prev,
      {
        id: Date.now(),
        method: "Crédito",
        value: "",
        fee: "",
        taxa_adicional: "",
      },
    ]);
  };

  const updatePayment = (id, field, value) => {
    setPayments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removePayment = (id) => {
    setPayments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = () => {
    const normalizedName = machineName.trim();
    if (!normalizedName) return;

    const fakeMachineId = normalizedName.toLowerCase().replace(/\s+/g, "-");
    if (existingMachineIds.includes(fakeMachineId)) return;

    const normalizedPayments = payments
      .map((p) => ({
        method: p.method,
        value: numberValue(p.value),
        fee: numberValue(p.fee),
        taxa_adicional: numberValue(p.taxa_adicional),
      }))
      .filter((p) => p.value > 0);

    onMachineAdd({
      machine: {
        id: fakeMachineId,
        name: normalizedName,
      },
      payments: normalizedPayments,
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Adicionar Máquina</h3>

      <div className="space-y-2">
        <label className="text-sm font-medium">Nome da Máquina</label>
        <Input
          value={machineName}
          onChange={(e) => setMachineName(e.target.value)}
          placeholder="Ex.: Stone, Ton, Mercado Pago"
        />
      </div>

      <div className="space-y-3">
        {payments.map((payment, index) => (
          <div key={payment.id} className="border rounded-xl p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Pagamento #{index + 1}</span>
              {payments.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removePayment(payment.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium">Método</label>
                <select
                  value={payment.method}
                  onChange={(e) => updatePayment(payment.id, "method", e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3"
                >
                  <option>Crédito</option>
                  <option>Débito</option>
                  <option>Voucher</option>
                  <option>Pix Máquina</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Valor</label>
                <Input
                  type="number"
                  step="0.01"
                  value={payment.value}
                  onChange={(e) => updatePayment(payment.id, "value", e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Taxa %</label>
                <Input
                  type="number"
                  step="0.01"
                  value={payment.fee}
                  onChange={(e) => updatePayment(payment.id, "fee", e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Taxa adicional</label>
                <Input
                  type="number"
                  step="0.01"
                  value={payment.taxa_adicional}
                  onChange={(e) => updatePayment(payment.id, "taxa_adicional", e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={addPayment}>
          + Adicionar pagamento
        </Button>
        <Button type="button" onClick={handleSubmit}>
          Salvar máquina
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

const AddExpenseForm = ({ onAdd, onCancel }) => {
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (!description.trim() || numberValue(value) <= 0) return;
    onAdd({
      id: Date.now(),
      description: description.trim(),
      value: numberValue(value),
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Adicionar Despesa</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Descrição</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Compra emergencial"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Valor</label>
          <Input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit}>Salvar despesa</Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

const AddWithdrawalForm = ({ onAdd, onCancel }) => {
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (!description.trim() || numberValue(value) <= 0) return;
    onAdd({
      id: Date.now(),
      description: description.trim(),
      value: numberValue(value),
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Adicionar Retirada</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Descrição</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Sangria"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Valor</label>
          <Input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit}>Salvar retirada</Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

const TotaisSection = ({
  addedMachines,
  expenses,
  withdrawals,
  valorAbertura,
  suprimentos,
  valorDinheiroCaixa,
  valorIfoodBruto,
  valorPixCnpj,
}) => {
  const totalMaquinas = (addedMachines || []).reduce(
    (acc, am) =>
      acc +
      (am.payments || []).reduce((s, p) => s + numberValue(p.value), 0),
    0
  );

  const totalTaxas = (addedMachines || []).reduce(
    (acc, am) =>
      acc +
      (am.payments || []).reduce(
        (s, p) =>
          s +
          ((numberValue(p.value) * numberValue(p.fee)) / 100 +
            numberValue(p.taxa_adicional)),
        0
      ),
    0
  );

  const totalExpenses = (expenses || []).reduce((sum, item) => sum + numberValue(item.value), 0);
  const totalWithdrawals = (withdrawals || []).reduce((sum, item) => sum + numberValue(item.value), 0);

  const totalConferido =
    totalMaquinas +
    numberValue(valorDinheiroCaixa) +
    numberValue(valorIfoodBruto) +
    numberValue(valorPixCnpj);

  const totalLiquido =
    totalConferido -
    totalTaxas -
    totalExpenses -
    totalWithdrawals +
    numberValue(valorAbertura) +
    numberValue(suprimentos);

  const cards = [
    {
      label: "Total Máquinas",
      value: totalMaquinas,
      icon: CreditCard,
      color: "text-blue-600 border-blue-200 bg-blue-50",
    },
    {
      label: "Total Taxas",
      value: totalTaxas,
      icon: Percent,
      color: "text-amber-600 border-amber-200 bg-amber-50",
    },
    {
      label: "Total Conferido",
      value: totalConferido,
      icon: Wallet,
      color: "text-green-600 border-green-200 bg-green-50",
    },
    {
      label: "Resultado Líquido",
      value: totalLiquido,
      icon: Check,
      color: "text-emerald-700 border-emerald-200 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Resumo do Fechamento</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{card.label}</span>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold mt-3">{currency(card.value)}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="border rounded-xl p-4">
          <h4 className="font-semibold mb-3">Máquinas</h4>
          <div className="space-y-2 text-sm">
            {addedMachines.length ? (
              addedMachines.map((machine, index) => (
                <div key={`${machine.machine?.id}-${index}`} className="flex justify-between">
                  <span>{machine.machine?.name}</span>
                  <span>
                    {currency(
                      (machine.payments || []).reduce(
                        (sum, p) => sum + numberValue(p.value),
                        0
                      )
                    )}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Nenhuma máquina adicionada.</p>
            )}
          </div>
        </div>

        <div className="border rounded-xl p-4">
          <h4 className="font-semibold mb-3">Despesas</h4>
          <div className="space-y-2 text-sm">
            {expenses.length ? (
              expenses.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.description}</span>
                  <span>{currency(item.value)}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Nenhuma despesa lançada.</p>
            )}
          </div>
        </div>

        <div className="border rounded-xl p-4">
          <h4 className="font-semibold mb-3">Retiradas</h4>
          <div className="space-y-2 text-sm">
            {withdrawals.length ? (
              withdrawals.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.description}</span>
                  <span>{currency(item.value)}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Nenhuma retirada lançada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PrintableClosing = forwardRef(({ companyName, closingDate, user, data }, ref) => {
  const totalMachines = (data.addedMachines || []).reduce(
    (acc, am) =>
      acc + (am.payments || []).reduce((s, p) => s + numberValue(p.value), 0),
    0
  );

  return (
    <div ref={ref} className="p-8 text-black bg-white">
      <h1 className="text-2xl font-bold mb-4">Fechamento de Caixa</h1>
      <p><strong>Empresa:</strong> {companyName || "-"}</p>
      <p><strong>Data:</strong> {closingDate}</p>
      <p><strong>Usuário:</strong> {user?.email || "-"}</p>

      <div className="mt-6 space-y-2">
        <p><strong>Abertura:</strong> {currency(data.valorAbertura)}</p>
        <p><strong>Suprimentos:</strong> {currency(data.suprimentos)}</p>
        <p><strong>Dinheiro em Caixa:</strong> {currency(data.valorDinheiroCaixa)}</p>
        <p><strong>iFood Bruto:</strong> {currency(data.valorIfoodBruto)}</p>
        <p><strong>Pix CNPJ:</strong> {currency(data.valorPixCnpj)}</p>
        <p><strong>Total Máquinas:</strong> {currency(totalMachines)}</p>
      </div>

      <div className="mt-6">
        <h2 className="font-bold mb-2">Observações</h2>
        <p>{data.observacoes || "-"}</p>
      </div>
    </div>
  );
});

PrintableClosing.displayName = "PrintableClosing";

const Caixa = () => {
  const { authUser } = useAuth();
  const { toast } = useToast();
  const printableRef = useRef(null);

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedSector, setSelectedSector] = useState("salao");
  const [valorAbertura, setValorAbertura] = useState(0);
  const [suprimentos, setSuprimentos] = useState(0);
  const [valorDinheiroCaixa, setValorDinheiroCaixa] = useState(0);
  const [valorIfoodBruto, setValorIfoodBruto] = useState(0);
  const [valorPixCnpj, setValorPixCnpj] = useState(0);
  const [addedMachines, setAddedMachines] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [observacoes, setObservacoes] = useState("");
  const [activeForm, setActiveForm] = useState(null);

  useEffect(() => {
    const loadCompanies = async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");

      if (!error && data) {
        setCompanies(data);
        if (!selectedCompany && data.length > 0) {
          setSelectedCompany(String(data[0].id));
        }
      }
    };

    loadCompanies();
  }, [selectedCompany]);

  const handlePrint = useReactToPrint({
    content: () => printableRef.current,
  });

  const totalConferido =
    (addedMachines || []).reduce(
      (acc, am) =>
        acc +
        (am.payments || []).reduce((s, p) => s + numberValue(p.value), 0),
      0
    ) +
    numberValue(valorIfoodBruto) +
    numberValue(valorPixCnpj) +
    numberValue(valorDinheiroCaixa);

  const totalTaxas = (addedMachines || []).reduce(
    (acc, am) =>
      acc +
      (am.payments || []).reduce(
        (s, p) =>
          s +
          ((numberValue(p.value) * numberValue(p.fee)) / 100 +
            numberValue(p.taxa_adicional)),
        0
      ),
    0
  );

  const totalLiquido =
    totalConferido -
    totalTaxas -
    expenses.reduce((sum, item) => sum + numberValue(item.value), 0) -
    withdrawals.reduce((sum, item) => sum + numberValue(item.value), 0) +
    numberValue(valorAbertura) +
    numberValue(suprimentos);

  const handleSave = async () => {
    if (!authUser) return;

    const closingData = {
      company_id: Number(selectedCompany),
      user_id: authUser.id,
      closing_date: selectedDate,
      status: "pending_review",
      previous_balance: numberValue(valorAbertura),
      supplies: numberValue(suprimentos),
      valor_dinheiro_caixa: numberValue(valorDinheiroCaixa),
      valor_ifood_bruto: numberValue(valorIfoodBruto),
      valor_pix_cnpj: numberValue(valorPixCnpj),
      withdrawals: withdrawals.reduce((sum, w) => sum + numberValue(w.value), 0),
      total_taxas: totalTaxas,
      total_liquido: totalLiquido,
      total_conferred: totalConferido,
      setor: selectedSector,
      observations: observacoes,
    };

    const { error } = await supabase.from("cash_closings").insert(closingData);

    if (error) {
      toast({
        title: "Erro ao salvar!",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Fechamento enviado!",
      description: "Aguardando conferência.",
    });

    setAddedMachines([]);
    setExpenses([]);
    setWithdrawals([]);
    setValorDinheiroCaixa(0);
    setValorPixCnpj(0);
    setValorIfoodBruto(0);
    setValorAbertura(0);
    setSuprimentos(0);
    setObservacoes("");
    setActiveForm(null);
  };

  const ActionButton = ({ icon: Icon, label, onClick, color }) => (
    <Button
      variant="outline"
      className={`flex-col h-24 w-full justify-center gap-2 border-2 ${color}`}
      onClick={onClick}
    >
      <Icon className="w-8 h-8" />
      <span className="text-xs font-semibold">{label}</span>
    </Button>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Fechamento de Caixa</h1>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>

          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
            <Check className="mr-2 h-4 w-4" /> Enviar p/ Conferência
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gray-50 p-3 rounded-md flex items-center gap-2">
          <Building className="w-4 h-4" />
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full bg-transparent focus:outline-none"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-gray-50 p-3 rounded-md flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>

        <div className="bg-gray-50 p-3 rounded-md flex items-center justify-around gap-2">
          <Button
            variant={selectedSector === "salao" ? "default" : "ghost"}
            onClick={() => setSelectedSector("salao")}
          >
            <Utensils className="mr-2 h-4 w-4" /> Salão
          </Button>
          <Button
            variant={selectedSector === "delivery" ? "default" : "ghost"}
            onClick={() => setSelectedSector("delivery")}
          >
            <Moped className="mr-2 h-4 w-4" /> Delivery
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ActionButton
          icon={PlusCircle}
          label="Máquina"
          onClick={() => setActiveForm("addMachine")}
          color="border-blue-600"
        />
        <ActionButton
          icon={ShoppingCart}
          label="Despesa"
          onClick={() => setActiveForm("addExpense")}
          color="border-red-600"
        />
        <ActionButton
          icon={UserMinus}
          label="Retirada"
          onClick={() => setActiveForm("addWithdrawal")}
          color="border-yellow-600"
        />
      </div>

      <AnimatePresence>
        {activeForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-md bg-white border"
          >
            {activeForm === "addMachine" && (
              <AddMachineForm
                onMachineAdd={(data) => {
                  setAddedMachines((prev) => [...prev, data]);
                  setActiveForm(null);
                }}
                existingMachineIds={addedMachines.map((m) => m.machine?.id)}
                onCancel={() => setActiveForm(null)}
              />
            )}

            {activeForm === "addExpense" && (
              <AddExpenseForm
                onAdd={(data) => {
                  setExpenses((prev) => [...prev, data]);
                  setActiveForm(null);
                }}
                onCancel={() => setActiveForm(null)}
              />
            )}

            {activeForm === "addWithdrawal" && (
              <AddWithdrawalForm
                onAdd={(data) => {
                  setWithdrawals((prev) => [...prev, data]);
                  setActiveForm(null);
                }}
                onCancel={() => setActiveForm(null)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-gray-50 p-5 rounded-lg space-y-3">
        <div>
          <label className="text-sm font-medium">Abertura de Caixa (Troco)</label>
          <Input
            type="number"
            step="0.01"
            value={valorAbertura}
            onChange={(e) => setValorAbertura(numberValue(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Suprimentos</label>
          <Input
            type="number"
            step="0.01"
            value={suprimentos}
            onChange={(e) => setSuprimentos(numberValue(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Dinheiro em Caixa</label>
          <Input
            type="number"
            step="0.01"
            value={valorDinheiroCaixa}
            onChange={(e) => setValorDinheiroCaixa(numberValue(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">iFood (Bruto)</label>
          <Input
            type="number"
            step="0.01"
            value={valorIfoodBruto}
            onChange={(e) => setValorIfoodBruto(numberValue(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Pix CNPJ</label>
          <Input
            type="number"
            step="0.01"
            value={valorPixCnpj}
            onChange={(e) => setValorPixCnpj(numberValue(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Observações</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Observações do fechamento..."
          />
        </div>
      </div>

      <TotaisSection
        addedMachines={addedMachines}
        expenses={expenses}
        withdrawals={withdrawals}
        valorAbertura={valorAbertura}
        suprimentos={suprimentos}
        valorDinheiroCaixa={valorDinheiroCaixa}
        valorIfoodBruto={valorIfoodBruto}
        valorPixCnpj={valorPixCnpj}
      />

      <div style={{ display: "none" }}>
        <PrintableClosing
          ref={printableRef}
          companyName={companies.find((c) => String(c.id) === String(selectedCompany))?.name}
          closingDate={selectedDate}
          user={authUser}
          data={{
            addedMachines,
            expenses,
            withdrawals,
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

export default Caixa;