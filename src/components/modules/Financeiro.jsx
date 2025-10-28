// src/components/financeiro/Financeiro.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Plus, Download, Upload, Save, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser } from "@/contexts/UserContext";

/** Helpers */
const toBRL = (v) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const dateBR = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

/** Exibir fornecedor no padrão pedido */
const formatSupplierDisplay = (s) => {
  if (!s) return "N/A";
  const tipo = (s.tipo || (s.cnpj ? "PJ" : "PF")).toUpperCase();
  if (tipo === "PJ") {
    const nome = s.razao_social || s.nome_fantasia || "";
    const id = s.cnpj ? ` (${s.cnpj})` : "";
    return `${nome}${id}`.trim() || "N/A";
  }
  const nome = s.nome_fantasia || "";
  const id = s.cpf ? ` (${s.cpf})` : "";
  return `${nome}${id}`.trim() || "N/A";
};

const Financeiro = () => {
  const { user, companies, userCompanyAccess } = useUser();
  const { toast } = useToast();

  /** filtros e estados */
  const [activeTab, setActiveTab] = useState("pagar");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedCliente, setSelectedCliente] = useState("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  /** dados */
  const [suppliers, setSuppliers] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [dreGroups, setDreGroups] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [loading, setLoading] = useState(true);

  /** modal nova conta */
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newConta, setNewConta] = useState({
    description: "",
    value: "",
    due_date: "",
    company_id: "",
    installments: 1,
    interval_days: 30,
    is_recurring: false,
    dre_group_id: "",
    cliente_id: "",
    supplier_id: "",
    payment_method_id: "",
    observacoes: "",
  });

  /** modal preview import */
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]);

  /** empresas permitidas */
  const allowedCompanies = React.useMemo(() => {
    if (!user || !companies || !userCompanyAccess) return [];
    if (user.is_admin) return companies;
    const ids = userCompanyAccess
      .filter((a) => a.user_id === user.id)
      .map((a) => a.company_id);
    return companies.filter((c) => ids.includes(c.id));
  }, [user, companies, userCompanyAccess]);
  const allowedCompanyIds = allowedCompanies.map((c) => c.id);

  /** carregar dados */
  const fetchInitialData = useCallback(async () => {
    setLoading(true);

    // relacionamentos já trazem todos os campos do fornecedor/cliente para formatação
    const [
      suppliersRes,
      clientesRes,
      payMethodsRes,
      dreRes,
      pagarRes,
      receberRes,
    ] = await Promise.all([
      supabase.from("suppliers").select("*").order("codigo", { ascending: true }),
      supabase.from("clientes").select("*"),
      supabase.from("payment_methods").select("*"),
      supabase.from("dre_groups").select("*"),
      supabase
        .from("contas_pagar")
        .select("*, supplier:suppliers(*), companies(name)")
        .order("due_date", { ascending: true }),
      supabase
        .from("contas_receber")
        .select("*, cliente:clientes(*), companies(name)")
        .order("due_date", { ascending: true }),
    ]);

    setSuppliers(suppliersRes.data || []);
    setClientes(clientesRes.data || []);
    setPaymentMethods(payMethodsRes.data || []);
    setDreGroups((dreRes.data || []).filter((d) => !d.is_calculated));
    setContasPagar(pagarRes.data || []);
    setContasReceber(receberRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  /** EXPORTAR — Fornecedores no padrão Excel */
  const handleExportSuppliers = async () => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("codigo", { ascending: true });

    if (error) {
      toast({ title: "Erro ao exportar", description: error.message, variant: "destructive" });
      return;
    }

    const rows = (data || []).map((s) => ({
      "Código": s.codigo ?? "",
      "Tipo": (s.tipo || (s.cnpj ? "PJ" : "PF"))?.toUpperCase(),
      "Nome/Nome fantasia": s.nome_fantasia ?? "",
      "CPF": s.cpf ?? "",
      "RG": s.rg ?? "",
      "Data de nascimento": s.data_nascimento ? new Date(s.data_nascimento) : "",
      "Razão social": s.razao_social ?? "",
      "CNPJ": s.cnpj ?? "",
      "I.E.": s.ie ?? "",
      "I.M.": s.im ?? "",
      "Ativo": (s.ativo ?? true) ? "Sim" : "Não",
      "Telefone": s.telefone ?? "",
      "Celular": s.celular ?? "",
      "E-mail": s.email ?? "",
      "Cadastrado em": s.cadastrado_em ? new Date(s.cadastrado_em) : "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: [
        "Código","Tipo","Nome/Nome fantasia","CPF","RG","Data de nascimento",
        "Razão social","CNPJ","I.E.","I.M.","Ativo","Telefone","Celular","E-mail","Cadastrado em",
      ],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fornecedores");
    XLSX.writeFile(wb, "fornecedores.xlsx");
    toast({ title: "Exportação concluída", description: "fornecedores.xlsx gerado no padrão." });
  };

  /** IMPORTAR — Fornecedores no padrão + preview */
  const handleImportSuppliers = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const preview = rows.map((r) => ({
      codigo: r["Código"] || null,
      tipo: (r["Tipo"] || "").toString().trim().toUpperCase(), // PF/PJ
      nome_fantasia: (r["Nome/Nome fantasia"] || "").toString().trim(),
      cpf: (r["CPF"] || "").toString().trim(),
      rg: (r["RG"] || "").toString().trim(),
      data_nascimento: r["Data de nascimento"] ? new Date(r["Data de nascimento"]) : null,
      razao_social: (r["Razão social"] || "").toString().trim(),
      cnpj: (r["CNPJ"] || "").toString().trim(),
      ie: (r["I.E."] || "").toString().trim(),
      im: (r["I.M."] || "").toString().trim(),
      ativo: String(r["Ativo"] || "Sim").toLowerCase().startsWith("s"),
      telefone: (r["Telefone"] || "").toString().trim(),
      celular: (r["Celular"] || "").toString().trim(),
      email: (r["E-mail"] || "").toString().trim(),
      cadastrado_em: r["Cadastrado em"] ? new Date(r["Cadastrado em"]) : null,
    }));

    setImportPreview(preview);
    setIsPreviewDialogOpen(true);
  };

  const confirmImport = async () => {
    if (!importPreview.length) {
      toast({ title: "Nada para importar", variant: "destructive" });
      return;
    }
    // defina a coluna de conflito de acordo com sua unique no banco
    const onConflict = "codigo"; // troque para "cnpj" se preferir
    const { error } = await supabase.from("suppliers").upsert(importPreview, { onConflict });
    if (error) {
      toast({ title: "Erro ao importar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Importação concluída", description: `${importPreview.length} fornecedores processados.` });
      setIsPreviewDialogOpen(false);
      setImportPreview([]);
      fetchInitialData();
    }
  };

  /** EXPORTAR — Contas a Pagar (separado) */
  const handleExportContasPagar = () => {
    if (!contasPagar.length) {
      toast({ title: "Nenhuma conta a pagar encontrada", variant: "destructive" });
      return;
    }
    const companyName =
      selectedCompany === "all"
        ? "TodasEmpresas"
        : allowedCompanies.find((c) => c.id === selectedCompany)?.name || "Empresa";
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();

    const filtered = contasPagar
      .filter((c) => selectedCompany === "all" || c.company_id === selectedCompany)
      .filter((c) => selectedSupplier === "all" || c.supplier_id === selectedSupplier)
      .filter((c) => selectedPaymentMethod === "all" || c.payment_method_id === selectedPaymentMethod)
      .filter((c) => (startDate ? c.due_date >= startDate : true))
      .filter((c) => (endDate ? c.due_date <= endDate : true))
      .filter((c) => (searchTerm ? (c.description || "").toLowerCase().includes(searchTerm.toLowerCase()) : true))
      .map((c) => ({
        "Descrição": c.description,
        "Fornecedor": formatSupplierDisplay(c.supplier),
        "Empresa": c.companies?.name || "",
        "Valor (R$)": Number(c.value || 0),
        "Vencimento": dateBR(c.due_date),
        "Status": c.status,
        "Data Pagamento": dateBR(c.payment_date),
      }));

    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas a Pagar");
    XLSX.writeFile(wb, `contas_a_pagar_${companyName}_${month}_${year}.xlsx`);
    toast({ title: "Exportação concluída", description: "Planilha de Contas a Pagar gerada." });
  };

  /** EXPORTAR — Contas a Receber (separado) */
  const handleExportContasReceber = () => {
    if (!contasReceber.length) {
      toast({ title: "Nenhuma conta a receber encontrada", variant: "destructive" });
      return;
    }
    const companyName =
      selectedCompany === "all"
        ? "TodasEmpresas"
        : allowedCompanies.find((c) => c.id === selectedCompany)?.name || "Empresa";
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();

    const filtered = contasReceber
      .filter((c) => selectedCompany === "all" || c.company_id === selectedCompany)
      .filter((c) => selectedCliente === "all" || c.cliente_id === selectedCliente)
      .filter((c) => selectedPaymentMethod === "all" || c.payment_method_id === selectedPaymentMethod)
      .filter((c) => (startDate ? c.due_date >= startDate : true))
      .filter((c) => (endDate ? c.due_date <= endDate : true))
      .filter((c) => (searchTerm ? (c.description || "").toLowerCase().includes(searchTerm.toLowerCase()) : true))
      .map((c) => ({
        "Descrição": c.description,
        "Cliente": c.cliente?.name || "N/A",
        "Empresa": c.companies?.name || "",
        "Valor (R$)": Number(c.value || 0),
        "Vencimento": dateBR(c.due_date),
        "Status": c.status,
        "Data Recebimento": dateBR(c.data_recebimento),
      }));

    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas a Receber");
    XLSX.writeFile(wb, `contas_a_receber_${companyName}_${month}_${year}.xlsx`);
    toast({ title: "Exportação concluída", description: "Planilha de Contas a Receber gerada." });
  };

  /** SALVAR Nova Conta (parcelas + intervalo em dias) */
  const handleSaveConta = async () => {
    if (!newConta.description || !newConta.value || !newConta.due_date || !newConta.company_id) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    const tableName = activeTab === "pagar" ? "contas_pagar" : "contas_receber";
    const installments = parseInt(newConta.installments, 10) || 1;
    const intervalDays = parseInt(newConta.interval_days || 30, 10);
    const totalValue = parseFloat(newConta.value);
    const valuePerInstallment = totalValue / installments;
    const initialDate = new Date(newConta.due_date + "T00:00:00");

    const contasToInsert = Array.from({ length: installments }, (_, i) => {
      const dueDate = new Date(initialDate);
      dueDate.setDate(dueDate.getDate() + intervalDays * i);
      return {
        ...newConta,
        value: valuePerInstallment,
        due_date: dueDate.toISOString().split("T")[0],
        status: "Pendente",
        origem: "Manual",
      };
    });

    const { error } = await supabase.from(tableName).insert(contasToInsert);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conta(s) adicionada(s)!", variant: "success" });
      setIsDialogOpen(false);
      setNewConta((p) => ({ ...p, description: "", value: "", due_date: "" }));
      fetchInitialData();
    }
  };

  /** filtros locais (apenas para a tabela — export usa arrays + filtros novamente) */
  const filteredPagar = contasPagar
    .filter((c) => selectedCompany === "all" || c.company_id === selectedCompany)
    .filter((c) => selectedSupplier === "all" || c.supplier_id === selectedSupplier)
    .filter((c) => selectedPaymentMethod === "all" || c.payment_method_id === selectedPaymentMethod)
    .filter((c) => (startDate ? c.due_date >= startDate : true))
    .filter((c) => (endDate ? c.due_date <= endDate : true))
    .filter((c) => (searchTerm ? (c.description || "").toLowerCase().includes(searchTerm.toLowerCase()) : true));

  const filteredReceber = contasReceber
    .filter((c) => selectedCompany === "all" || c.company_id === selectedCompany)
    .filter((c) => selectedCliente === "all" || c.cliente_id === selectedCliente)
    .filter((c) => selectedPaymentMethod === "all" || c.payment_method_id === selectedPaymentMethod)
    .filter((c) => (startDate ? c.due_date >= startDate : true))
    .filter((c) => (endDate ? c.due_date <= endDate : true))
    .filter((c) => (searchTerm ? (c.description || "").toLowerCase().includes(searchTerm.toLowerCase()) : true));

  return (
    <div className="space-y-6">
      {/* CABEÇALHO + AÇÕES */}
      <div className="bg-card p-4 rounded-xl shadow-md border">
        <h1 className="text-2xl font-bold mb-4">Gestão Financeira</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div>
            <Label>Empresa</Label>
            <select
              className="w-full p-2 border rounded"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              <option value="all">Todas</option>
              {allowedCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {activeTab === "pagar" && (
            <div>
              <Label>Fornecedor</Label>
              <select
                className="w-full p-2 border rounded"
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="all">Todos</option>
                {suppliers.map((s) => (
                  <option key={s.id || s.codigo} value={s.id || s.codigo}>
                    {formatSupplierDisplay(s)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === "receber" && (
            <div>
              <Label>Cliente</Label>
              <select
                className="w-full p-2 border rounded"
                value={selectedCliente}
                onChange={(e) => setSelectedCliente(e.target.value)}
              >
                <option value="all">Todos</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>Forma de Pagamento</Label>
            <select
              className="w-full p-2 border rounded"
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            >
              <option value="all">Todas</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>{pm.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Venc. (Início)</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>Venc. (Fim)</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 mt-4">
          <Button onClick={fetchInitialData}><Search className="w-4 h-4" /></Button>

          <Button onClick={handleExportSuppliers} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Exportar Fornecedores
          </Button>

          <label className="cursor-pointer">
            <input type="file" accept=".xlsx" onChange={handleImportSuppliers} className="hidden" />
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" /> Importar Fornecedores
            </Button>
          </label>

          <Button onClick={handleExportContasPagar} variant="outline" className="bg-green-50 hover:bg-green-100">
            <Download className="mr-2 h-4 w-4 text-green-700" /> Exportar Contas a Pagar
          </Button>

          <Button onClick={handleExportContasReceber} variant="outline" className="bg-blue-50 hover:bg-blue-100">
            <Download className="mr-2 h-4 w-4 text-blue-700" /> Exportar Contas a Receber
          </Button>

          <Button onClick={() => setIsDialogOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Nova Conta
          </Button>
        </div>
      </div>

      {/* TABS + TABELA */}
      <div className="bg-card rounded-xl shadow-md border overflow-hidden">
        <div className="p-2 bg-muted/50 flex gap-2">
          <button
            onClick={() => setActiveTab("pagar")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm ${
              activeTab === "pagar" ? "bg-white shadow" : "text-muted-foreground hover:bg-white/50"
            }`}
          >
            Contas a Pagar
          </button>
        <button
            onClick={() => setActiveTab("receber")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm ${
              activeTab === "receber" ? "bg-white shadow" : "text-muted-foreground hover:bg-white/50"
            }`}
          >
            Contas a Receber
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Descrição</th>
                <th className="p-3 text-left">Cliente/Fornecedor</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3 text-center">Vencimento</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Data Pgto/Rec.</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center p-6">Carregando...</td></tr>
              ) : activeTab === "pagar" ? (
                filteredPagar.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="p-3 font-semibold">{c.description}</td>
                    <td className="p-3">{formatSupplierDisplay(c.supplier)}</td>
                    <td className="p-3 text-right">{toBRL(c.value)}</td>
                    <td className="p-3 text-center">{dateBR(c.due_date)}</td>
                    <td className="p-3 text-center">{c.status}</td>
                    <td className="p-3 text-center">{dateBR(c.payment_date)}</td>
                  </tr>
                ))
              ) : (
                filteredReceber.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="p-3 font-semibold">{c.description}</td>
                    <td className="p-3">{c.cliente?.name || "N/A"}</td>
                    <td className="p-3 text-right">{toBRL(c.value)}</td>
                    <td className="p-3 text-center">{dateBR(c.due_date)}</td>
                    <td className="p-3 text-center">{c.status}</td>
                    <td className="p-3 text-center">{dateBR(c.data_recebimento)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVA CONTA */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Conta</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto">
            <Input
              id="description"
              placeholder="Descrição"
              value={newConta.description}
              onChange={(e) => setNewConta((p) => ({ ...p, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="value"
                type="number"
                placeholder="Valor Total (R$)"
                value={newConta.value}
                onChange={(e) => setNewConta((p) => ({ ...p, value: e.target.value }))}
              />
              <Input
                id="due_date"
                type="date"
                value={newConta.due_date}
                onChange={(e) => setNewConta((p) => ({ ...p, due_date: e.target.value }))}
              />
            </div>

            <select
              id="company_id"
              className="w-full p-2 border rounded"
              value={newConta.company_id}
              onChange={(e) => setNewConta((p) => ({ ...p, company_id: e.target.value }))}
            >
              <option value="">Selecione uma empresa</option>
              {allowedCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {activeTab === "receber" ? (
              <select
                id="cliente_id"
                className="w-full p-2 border rounded"
                value={newConta.cliente_id || ""}
                onChange={(e) => setNewConta((p) => ({ ...p, cliente_id: e.target.value }))}
              >
                <option value="">Nenhum Cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <select
                id="supplier_id"
                className="w-full p-2 border rounded"
                value={newConta.supplier_id || ""}
                onChange={(e) => setNewConta((p) => ({ ...p, supplier_id: e.target.value }))}
              >
                <option value="">Nenhum Fornecedor</option>
                {suppliers.map((s) => (
                  <option key={s.id || s.codigo} value={s.id || s.codigo}>
                    {formatSupplierDisplay(s)}
                  </option>
                ))}
              </select>
            )}

            <select
              id="payment_method_id"
              className="w-full p-2 border rounded"
              value={newConta.payment_method_id || ""}
              onChange={(e) => setNewConta((p) => ({ ...p, payment_method_id: e.target.value }))}
            >
              <option value="">Forma de Pagamento</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>{pm.name}</option>
              ))}
            </select>

            <div className="grid grid-cols-3 gap-4">
              <Input
                id="installments"
                type="number"
                min="1"
                placeholder="Nº Parcelas"
                value={newConta.installments}
                onChange={(e) => setNewConta((p) => ({ ...p, installments: e.target.value }))}
              />
              <select
                id="interval_days"
                className="w-full p-2 border rounded"
                value={newConta.interval_days}
                onChange={(e) => setNewConta((p) => ({ ...p, interval_days: e.target.value }))}
              >
                <option value="7">A cada 7 dias</option>
                <option value="14">A cada 14 dias</option>
                <option value="21">A cada 21 dias</option>
                <option value="30">A cada 30 dias</option>
                <option value="custom">Personalizado</option>
              </select>
              {String(newConta.interval_days) === "custom" && (
                <Input
                  type="number"
                  min="1"
                  placeholder="Dias personalizados"
                  onChange={(e) => setNewConta((p) => ({ ...p, interval_days: e.target.value }))}
                />
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={!!newConta.is_recurring}
                onCheckedChange={(c) => setNewConta((p) => ({ ...p, is_recurring: c }))}
              />
              <Label htmlFor="is_recurring">É recorrente?</Label>
            </div>

            <Input
              id="observacoes"
              placeholder="Observações"
              value={newConta.observacoes || ""}
              onChange={(e) => setNewConta((p) => ({ ...p, observacoes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button onClick={handleSaveConta}>
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: PRÉ-VISUALIZAÇÃO IMPORT */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Pré-visualização de Fornecedores</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Código</th>
                  <th className="p-2 text-left">Tipo</th>
                  <th className="p-2 text-left">Nome/Nome fantasia</th>
                  <th className="p-2 text-left">Razão social</th>
                  <th className="p-2 text-left">CNPJ</th>
                  <th className="p-2 text-left">CPF</th>
                  <th className="p-2 text-left">Ativo</th>
                  <th className="p-2 text-left">Telefone</th>
                  <th className="p-2 text-left">E-mail</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.map((s, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{s.codigo ?? ""}</td>
                    <td className="p-2">{s.tipo}</td>
                    <td className="p-2">{s.nome_fantasia}</td>
                    <td className="p-2">{s.razao_social}</td>
                    <td className="p-2">{s.cnpj}</td>
                    <td className="p-2">{s.cpf}</td>
                    <td className="p-2">{s.ativo ? "Sim" : "Não"}</td>
                    <td className="p-2">{s.telefone}</td>
                    <td className="p-2">{s.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmImport}><Upload className="mr-2 h-4 w-4" /> Confirmar Importação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Financeiro;
