import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Edit,
  Trash2,
  ArrowRightLeft,
  ArrowUpCircle,
  ArrowDownCircle,
  MoreVertical,
  Calendar,
  Download,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/contexts/UserContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const formatCurrency = (value) =>
  `R$ ${parseFloat(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const Bancos = () => {
  const { user, companies, userCompanyAccess } = useUser();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [companyBalanceData, setCompanyBalanceData] = useState([]);

  // Modais
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [transferData, setTransferData] = useState({});

  const allowedCompanies = useMemo(() => {
    if (!user || !companies) return [];
    if (user.is_admin) return companies;
    const allowedIds = userCompanyAccess?.map((a) => a.company_id) || [];
    return companies.filter((c) => allowedIds.includes(c.id));
  }, [user, companies, userCompanyAccess]);

  const allowedCompanyIds = useMemo(
    () => allowedCompanies.map((c) => c.id),
    [allowedCompanies]
  );

  // === FETCH DE CONTAS ===
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("bank_accounts")
        .select("*, companies:bank_account_company_access(company_id, companies(name))");

      if (selectedCompany !== "all") {
        const { data: accessData } = await supabase
          .from("bank_account_company_access")
          .select("bank_account_id")
          .eq("company_id", selectedCompany);
        const accountIds = accessData?.map((a) => a.bank_account_id) || [];
        query = query.in("id", accountIds);
      } else {
        const { data: accessData } = await supabase
          .from("bank_account_company_access")
          .select("bank_account_id")
          .in("company_id", allowedCompanyIds);
        const accountIds = accessData?.map((a) => a.bank_account_id) || [];
        if (accountIds.length > 0) query = query.in("id", accountIds);
      }

      const { data, error } = await query.order("bank_name");
      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      toast({
        title: "Erro ao buscar contas",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, allowedCompanyIds, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // === FETCH TRANSAÇÕES ===
  const fetchTransactions = useCallback(async () => {
    if (!selectedAccount) {
      setTransactions([]);
      return;
    }
    const startOfMonth = `${selectedMonth}-01`;
    const endOfMonth = `${selectedMonth}-31`;

    const { data, error } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("account_id", selectedAccount.id)
      .gte("transaction_date", startOfMonth)
      .lte("transaction_date", endOfMonth)
      .order("transaction_date", { ascending: false });

    if (error)
      toast({ title: "Erro ao buscar transações", variant: "destructive" });
    else setTransactions(data);
  }, [selectedAccount, selectedMonth, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // === AGRUPA SALDOS POR EMPRESA ===
  useEffect(() => {
    if (accounts.length === 0) return;
    const grouped = {};
    accounts.forEach((acc) => {
      acc.companies?.forEach((c) => {
        const name = c.companies?.name || "Desconhecida";
        grouped[name] = (grouped[name] || 0) + (acc.current_balance || 0);
      });
    });
    const data = Object.keys(grouped).map((name, i) => ({
      name,
      saldo: grouped[name],
      color: i % 2 === 0 ? "#ff6600" : "#ff9900",
    }));
    setCompanyBalanceData(data);
  }, [accounts]);

  // === EXPORT PDF ===
  const exportPDF = () => {
    const doc = new jsPDF();
    const totalGeral = companyBalanceData.reduce((sum, c) => sum + c.saldo, 0);
    const logo = "https://stoutburger.com.br/assets/stout-logo-black.png";

    doc.addImage(logo, "PNG", 160, 10, 35, 15);
    doc.setFontSize(14);
    doc.text("Relatório de Saldos Bancários", 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${selectedMonth}`, 14, 27);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 32);

    const rows = companyBalanceData.map((c) => [c.name, formatCurrency(c.saldo)]);
    doc.autoTable({
      head: [["Empresa", "Saldo Total"]],
      body: rows,
      startY: 40,
      headStyles: { fillColor: [255, 102, 0], textColor: 255 },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Total Geral: ${formatCurrency(totalGeral)}`, 14, finalY);
    doc.setFontSize(8);
    doc.text("Gerado automaticamente pelo Stout System", 14, finalY + 6);
    doc.save(`Saldos_${selectedMonth}.pdf`);
  };

  // === EXPORT EXCEL ===
  const exportExcel = () => {
    const totalGeral = companyBalanceData.reduce((sum, c) => sum + c.saldo, 0);
    const dataToExport = [
      ...companyBalanceData.map((c) => ({
        Empresa: c.name,
        "Saldo Total": formatCurrency(c.saldo),
      })),
      {},
      { Empresa: "Total Geral", "Saldo Total": formatCurrency(totalGeral) },
    ];
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Saldos");
    XLSX.writeFile(workbook, `Saldos_${selectedMonth}.xlsx`);
  };

  // === SALVAR CONTA ===
  const handleSaveAccount = async () => {
    const acc = {
      ...editingAccount,
      initial_balance: parseFloat(editingAccount.initial_balance) || 0,
      current_balance: editingAccount.id
        ? editingAccount.current_balance
        : parseFloat(editingAccount.initial_balance) || 0,
    };
    const { error } = await supabase.from("bank_accounts").upsert(acc);
    if (error)
      toast({ title: "Erro ao salvar conta", variant: "destructive" });
    else {
      toast({ title: "Conta salva!" });
      setIsAccountDialogOpen(false);
      fetchData();
    }
  };

  // === TRANSFERÊNCIA ===
  const handleSaveTransfer = async () => {
    const { from_account_id, to_account_id, value } = transferData;
    const v = parseFloat(value);
    if (!from_account_id || !to_account_id || !v) {
      toast({ title: "Preencha os campos da transferência" });
      return;
    }

    await supabase.from("bank_transactions").insert([
      {
        account_id: from_account_id,
        type: "transfer_out",
        value: v,
        description: "Transferência saída",
        transaction_date: new Date().toISOString().slice(0, 10),
      },
      {
        account_id: to_account_id,
        type: "transfer_in",
        value: v,
        description: "Transferência entrada",
        transaction_date: new Date().toISOString().slice(0, 10),
      },
    ]);
    toast({ title: "Transferência registrada!" });
    setIsTransferDialogOpen(false);
    fetchData();
  };

  const openAccountDialog = (acc = null) => {
    setEditingAccount(
      acc || { bank_name: "", agency: "", account_number: "", initial_balance: 0 }
    );
    setIsAccountDialogOpen(true);
  };

  if (!user)
    return (
      <div className="flex justify-center items-center h-[70vh] text-gray-500">
        Carregando informações...
      </div>
    );

  return (
    <div className="space-y-6 p-4">
      {/* === CABEÇALHO + FILTROS === */}
      <div className="p-4 bg-white rounded-xl shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <Label>Período</Label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border px-2 py-1 rounded-lg"
              />
            </div>
            <div>
              <Label>Empresa</Label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="border px-2 py-1 rounded-lg"
              >
                <option value="all">Todas</option>
                {allowedCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => openAccountDialog()} className="bg-[#ff6600] text-white">
              <Plus className="mr-2" /> Nova Conta
            </Button>
            <Button
              onClick={() => setIsTransferDialogOpen(true)}
              className="bg-cyan-500 text-white"
            >
              <ArrowRightLeft className="mr-2" /> Transferir
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-gray-800 text-white">
                  <Download className="mr-2 h-4 w-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportPDF}>📄 PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={exportExcel}>📊 Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* === GRÁFICO === */}
      <div className="p-4 bg-white rounded-xl shadow-md">
        <h2 className="text-lg font-bold mb-2">Saldo Total por Empresa</h2>
        {companyBalanceData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companyBalanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="saldo" radius={[6, 6, 0, 0]} fill="#ff6600" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-6">Sem dados.</p>
        )}
      </div>

      {/* === LISTAGEM DE CONTAS === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          {loading ? (
            <p>Carregando...</p>
          ) : (
            accounts.map((acc) => (
              <motion.div
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${
                  selectedAccount?.id === acc.id
                    ? "border-[#ff6600] bg-orange-50"
                    : "border-transparent bg-white shadow-md hover:shadow-lg"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{acc.bank_name}</h3>
                    <p className="text-sm text-gray-500">
                      Ag: {acc.agency} / C: {acc.account_number}
                    </p>
                  </div>
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </div>
                <p className="text-2xl font-bold mt-2">
                  {formatCurrency(acc.current_balance)}
                </p>
              </motion.div>
            ))
          )}
        </div>

        {/* === EXTRATO === */}
        <div className="lg:col-span-2">
          {selectedAccount ? (
            <div className="glass-effect rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">
                Extrato: {selectedAccount.bank_name}
              </h2>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {transactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">
                        {t.description || "Transação"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(t.transaction_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <p
                      className={`font-bold ${
                        t.type.includes("in") ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {t.type.includes("in") ? "+" : "-"} {formatCurrency(t.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full glass-effect rounded-xl">
              <p className="text-gray-500">Selecione uma conta.</p>
            </div>
          )}
        </div>
      </div>

      {/* === MODAL NOVA CONTA === */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount?.id ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Nome do Banco"
              value={editingAccount?.bank_name || ""}
              onChange={(e) =>
                setEditingAccount((p) => ({ ...p, bank_name: e.target.value }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Agência"
                value={editingAccount?.agency || ""}
                onChange={(e) =>
                  setEditingAccount((p) => ({ ...p, agency: e.target.value }))
                }
              />
              <Input
                placeholder="Conta"
                value={editingAccount?.account_number || ""}
                onChange={(e) =>
                  setEditingAccount((p) => ({ ...p, account_number: e.target.value }))
                }
              />
            </div>
            <Input
              type="number"
              placeholder="Saldo Inicial"
              value={editingAccount?.initial_balance || ""}
              onChange={(e) =>
                setEditingAccount((p) => ({ ...p, initial_balance: e.target.value }))
              }
            />
            <Textarea
              placeholder="Observações"
              value={editingAccount?.observations || ""}
              onChange={(e) =>
                setEditingAccount((p) => ({ ...p, observations: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveAccount} className="bg-[#ff6600] text-white">
              <Save className="mr-2" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === MODAL TRANSFERÊNCIA === */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferência entre Contas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>De</Label>
            <select
              value={transferData.from_account_id || ""}
              onChange={(e) =>
                setTransferData((p) => ({ ...p, from_account_id: e.target.value }))
              }
              className="border px-2 py-1 rounded-lg w-full"
            >
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bank_name} - {a.account_number}
                </option>
              ))}
            </select>

            <Label>Para</Label>
            <select
              value={transferData.to_account_id || ""}
              onChange={(e) =>
                setTransferData((p) => ({ ...p, to_account_id: e.target.value }))
              }
              className="border px-2 py-1 rounded-lg w-full"
            >
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bank_name} - {a.account_number}
                </option>
              ))}
            </select>

            <Label>Valor</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={transferData.value || ""}
              onChange={(e) =>
                setTransferData((p) => ({ ...p, value: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveTransfer} className="bg-cyan-600 text-white">
              <ArrowRightLeft className="mr-2" /> Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Bancos;
