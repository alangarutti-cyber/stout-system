import React, { useState, useEffect, useCallback } from "react";
import { Plus, Download, Upload, Save, Search, DollarSign, Edit, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser } from "@/contexts/UserContext";

/* Helpers */
const toBRL = (v) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const dateBR = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
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

  /* Estados principais */
  const [activeTab, setActiveTab] = useState("pagar");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [suppliers, setSuppliers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Modal Nova Conta */
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editandoConta, setEditandoConta] = useState(false);
  const [newConta, setNewConta] = useState({
    id: null,
    description: "",
    value: "",
    due_date: "",
    company_id: "",
    supplier_id: "",
    payment_method_id: "",
    observacoes: "",
  });

  /* Modal Pagamento */
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState(null);
  const [bancoSelecionado, setBancoSelecionado] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");

  /* Empresas permitidas */
  const allowedCompanies = React.useMemo(() => {
    if (!user || !companies || !userCompanyAccess) return [];
    if (user.is_admin) return companies;
    const ids = userCompanyAccess
      .filter((a) => a.user_id === user.id)
      .map((a) => a.company_id);
    return companies.filter((c) => ids.includes(c.id));
  }, [user, companies, userCompanyAccess]);

  /* Buscar dados iniciais */
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    const [suppliersRes, payMethodsRes, pagarRes, bancosRes] = await Promise.all([
      supabase.from("suppliers").select("*").order("codigo", { ascending: true }),
      supabase.from("payment_methods").select("*"),
      supabase
        .from("contas_pagar")
        .select("*, supplier:suppliers(*), companies(name)")
        .order("due_date", { ascending: true }),
      supabase.from("bancos").select("id, nome"),
    ]);

    setSuppliers(suppliersRes.data || []);
    setPaymentMethods(payMethodsRes.data || []);
    setContasPagar(pagarRes.data || []);
    setBancos(bancosRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  /* Abrir modal de pagamento */
  const abrirModalPagamento = (conta) => {
    setContaSelecionada(conta);
    setValorPago(conta.value);
    setDataPagamento(new Date().toISOString().split("T")[0]);
    setShowPagamentoModal(true);
  };

  /* Confirmar pagamento */
  const confirmarPagamento = async () => {
    if (!bancoSelecionado) {
      toast({ title: "Selecione um banco antes de confirmar.", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("contas_pagar")
      .update({
        status: "Paga",
        payment_date: dataPagamento,
        valor_pago: valorPago,
        bank_id: bancoSelecionado,
      })
      .eq("id", contaSelecionada.id);

    if (error) {
      toast({ title: "Erro ao registrar pagamento", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pagamento registrado com sucesso!" });
      setShowPagamentoModal(false);
      fetchInitialData();
    }
  };

  /* Abrir modal para editar conta */
  const editarConta = (conta) => {
    setEditandoConta(true);
    setNewConta({
      ...conta,
      description: conta.description || "",
      value: conta.value || "",
      due_date: conta.due_date || "",
      company_id: conta.company_id || "",
      supplier_id: conta.supplier_id || "",
      payment_method_id: conta.payment_method_id || "",
      observacoes: conta.observacoes || "",
    });
    setIsDialogOpen(true);
  };

  /* Excluir conta */
  const excluirConta = async (conta) => {
    if (conta.status === "Paga") {
      toast({ title: "Não é possível excluir contas já pagas.", variant: "destructive" });
      return;
    }

    const confirmar = window.confirm(`Deseja realmente excluir "${conta.description}"?`);
    if (!confirmar) return;

    const { error } = await supabase.from("contas_pagar").delete().eq("id", conta.id);
    if (error) {
      toast({ title: "Erro ao excluir conta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conta excluída com sucesso!" });
      fetchInitialData();
    }
  };

  /* Salvar nova conta ou editar */
  const handleSaveConta = async () => {
    if (!newConta.description || !newConta.value || !newConta.due_date || !newConta.company_id) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    const tableName = "contas_pagar";

    if (editandoConta && newConta.id) {
      const { error } = await supabase.from(tableName).update({
        description: newConta.description,
        value: newConta.value,
        due_date: newConta.due_date,
        supplier_id: newConta.supplier_id || null,
        payment_method_id: newConta.payment_method_id || null,
        observacoes: newConta.observacoes || "",
      }).eq("id", newConta.id);

      if (error) {
        toast({ title: "Erro ao atualizar conta", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Conta atualizada com sucesso!" });
        setIsDialogOpen(false);
        setEditandoConta(false);
        fetchInitialData();
      }
    } else {
      const { error } = await supabase.from(tableName).insert([{
        description: newConta.description,
        value: newConta.value,
        due_date: newConta.due_date,
        company_id: newConta.company_id,
        supplier_id: newConta.supplier_id || null,
        payment_method_id: newConta.payment_method_id || null,
        status: "Pendente",
        origem: "Manual",
      }]);

      if (error) {
        toast({ title: "Erro ao adicionar conta", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Conta adicionada com sucesso!" });
        setIsDialogOpen(false);
        fetchInitialData();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card p-4 rounded-xl shadow-md border">
        <h1 className="text-2xl font-bold mb-4">Gestão Financeira</h1>

        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              setNewConta({ description: "", value: "", due_date: "", company_id: "" });
              setEditandoConta(false);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Conta
          </Button>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-card rounded-xl shadow-md border overflow-hidden">
        <div className="p-2 bg-muted/50 flex gap-2">
          <button
            onClick={() => setActiveTab("pagar")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm ${activeTab === "pagar" ? "bg-white shadow" : "text-muted-foreground hover:bg-white/50"}`}
          >
            Contas a Pagar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Descrição</th>
                <th className="p-3 text-left">Fornecedor</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3 text-center">Vencimento</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center p-6">Carregando...</td></tr>
              ) : contasPagar.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="p-3 font-semibold">{c.description}</td>
                  <td className="p-3">{formatSupplierDisplay(c.supplier)}</td>
                  <td className="p-3 text-right">{toBRL(c.value)}</td>
                  <td className="p-3 text-center">{dateBR(c.due_date)}</td>
                  <td className="p-3 text-center">{c.status}</td>
                  <td className="p-3 text-center space-x-2">
                    <Button size="sm" variant="outline" onClick={() => editarConta(c)}>
                      <Edit className="w-4 h-4" /> Editar
                    </Button>
                    {c.status !== "Paga" && (
                      <Button size="sm" variant="outline" onClick={() => abrirModalPagamento(c)}>
                        <DollarSign className="w-4 h-4" /> Pagar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => excluirConta(c)}
                    >
                      <Trash2 className="w-4 h-4" /> Excluir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVA/EDITAR */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoConta ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input placeholder="Descrição" value={newConta.description} onChange={(e) => setNewConta((p) => ({ ...p, description: e.target.value }))} />
            <Input type="number" placeholder="Valor" value={newConta.value} onChange={(e) => setNewConta((p) => ({ ...p, value: e.target.value }))} />
            <Input type="date" value={newConta.due_date} onChange={(e) => setNewConta((p) => ({ ...p, due_date: e.target.value }))} />

            <select className="w-full p-2 border rounded" value={newConta.company_id} onChange={(e) => setNewConta((p) => ({ ...p, company_id: e.target.value }))}>
              <option value="">Selecione a empresa</option>
              {allowedCompanies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select className="w-full p-2 border rounded" value={newConta.supplier_id || ""} onChange={(e) => setNewConta((p) => ({ ...p, supplier_id: e.target.value }))}>
              <option value="">Fornecedor</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{formatSupplierDisplay(s)}</option>)}
            </select>

            <Input placeholder="Observações" value={newConta.observacoes || ""} onChange={(e) => setNewConta((p) => ({ ...p, observacoes: e.target.value }))} />
          </div>

          <DialogFooter>
            <Button onClick={handleSaveConta}>
              <Save className="mr-2 h-4 w-4" /> {editandoConta ? "Salvar Alterações" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL PAGAMENTO */}
      <Dialog open={showPagamentoModal} onOpenChange={setShowPagamentoModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Banco</Label>
              <select className="w-full p-2 border rounded" value={bancoSelecionado} onChange={(e) => setBancoSelecionado(e.target.value)}>
                <option value="">Selecione o banco</option>
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>{b.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Data do Pagamento</Label>
              <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
            </div>
            <div>
              <Label>Valor Pago</Label>
              <Input type="number" value={valorPago} onChange={(e) => setValorPago(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmarPagamento}>Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Financeiro;
