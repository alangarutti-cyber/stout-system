import React, { useEffect, useMemo, useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Undo2,
  Search,
  Plus,
  FileText,
  Filter,
  Paperclip,
  Save,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/customSupabaseClient";

/**
 * /pagamentos
 * UX focada para pagar "contas_pagar"
 * - Filtros: empresa, fornecedor, período, status
 * - Pagamento parcial com comprovante (storage)
 * - Aprovação (approved_by/approved_at)
 * - Pagamento em lote (client-side, depois migramos p/ RPC)
 */

const Pagamentos = () => {
  const { user, companies, userCompanyAccess } = useUser();
  const { toast } = useToast();

  // ---------- filtros ----------
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [statusFilter, setStatusFilter] = useState("abertas"); // abertas | pagas | vencidas | todas
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // ---------- dados ----------
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState([]); // contas_pagar
  const [suppliers, setSuppliers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);

  // ---------- seleção / ações ----------
  const [selectedIds, setSelectedIds] = useState([]);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [isUndoDialogOpen, setIsUndoDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [contaTarget, setContaTarget] = useState(null);
  const [payForm, setPayForm] = useState({
    valor_pago: "",
    data_pagamento: "",
    bank_account_id: "",
    observacoes: "",
    aprovar_agora: false,
    comprovante_file: null,
  });

  // ---------- allowed companies ----------
  const allowedCompanies = useMemo(() => {
    if (!user || !companies || !userCompanyAccess) return [];
    if (user.is_admin) return companies;
    const allowedCompanyIds = userCompanyAccess
      .filter((r) => r.user_id === user.id)
      .map((r) => r.company_id);
    return companies.filter((c) => allowedCompanyIds.includes(c.id));
  }, [user, companies, userCompanyAccess]);

  const allowedCompanyIds = useMemo(
    () => allowedCompanies.map((c) => c.id),
    [allowedCompanies]
  );

  // ---------- helpers ----------
  const fetchSuppliers = useCallback(async () => {
    const { data, error } = await supabase.from("suppliers").select("*").order("name");
    if (error) {
      toast({ title: "Erro ao buscar fornecedores", description: error.message, variant: "destructive" });
      return [];
    }
    return data ?? [];
  }, [toast]);

  const fetchBankAccounts = useCallback(async () => {
    let query = supabase
      .from("bank_accounts")
      .select("*, companies:bank_account_company_access!inner(company_id)");

    if (selectedCompany !== "all") query = query.eq("companies.company_id", selectedCompany);
    else query = query.in("companies.company_id", allowedCompanyIds);

    const { data, error } = await query;
    if (error) {
      toast({ title: "Erro ao buscar contas bancárias", description: error.message, variant: "destructive" });
      return [];
    }
    // dedup
    return (data ?? []).reduce((acc, cur) => {
      if (!acc.find((r) => r.id === cur.id)) acc.push(cur);
      return acc;
    }, []);
  }, [toast, selectedCompany, allowedCompanyIds]);

  const fetchContasPagar = useCallback(async () => {
    let selectStr =
      "*, companies(name), supplier:suppliers(name, id), bank_account:bank_accounts(bank_name, account_number)";
    let q = supabase.from("contas_pagar").select(selectStr);

    if (selectedCompany !== "all") q = q.eq("company_id", selectedCompany);
    else q = q.in("company_id", allowedCompanyIds);

    if (selectedSupplier !== "all") q = q.eq("supplier_id", selectedSupplier);

    if (startDate) q = q.gte("due_date", startDate);
    if (endDate) q = q.lte("due_date", endDate);
    if (searchTerm) q = q.ilike("description", `%${searchTerm}%`);

    // status
    if (statusFilter !== "todas") {
      if (statusFilter === "pagas") q = q.in("status", ["Paga", "paid"]);
      else if (statusFilter === "vencidas") q = q.in("status", ["Vencida", "overdue"]);
      else q = q.in("status", ["Pendente", "pending", "Vencida", "overdue"]); // abertas
    }

    const { data, error } = await q.order("due_date", { ascending: true });
    if (error) {
      toast({ title: "Erro ao buscar Contas a Pagar", description: error.message, variant: "destructive" });
      return [];
    }

    // carregar somatório de parciais
    const ids = (data ?? []).map((d) => d.id);
    let partialMap = {};
    if (ids.length) {
      const { data: parts, error: e2 } = await supabase
        .from("pagamento_lancamentos")
        .select("conta_pagar_id, amount")
        .in("conta_pagar_id", ids);

      if (!e2 && parts) {
        parts.forEach((p) => {
          partialMap[p.conta_pagar_id] = (partialMap[p.conta_pagar_id] || 0) + Number(p.amount || 0);
        });
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const out = (data ?? []).map((c) => {
      const pagos = partialMap[c.id] || 0;
      const restante = Math.max(0, Number(c.value) - pagos);
      const adjustedStatus =
        (c.status === "Pendente" || c.status === "pending") && c.due_date < today
          ? "Vencida"
          : c.status;

      return { ...c, pagos, restante, status_calc: adjustedStatus };
    });

    return out;
  }, [
    selectedCompany,
    selectedSupplier,
    startDate,
    endDate,
    searchTerm,
    statusFilter,
    allowedCompanyIds,
    toast,
  ]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]);
    const [sup, banks, cps] = await Promise.all([
      fetchSuppliers(),
      fetchBankAccounts(),
      fetchContasPagar(),
    ]);
    setSuppliers(sup);
    setBankAccounts(banks);
    setContas(cps);
    setLoading(false);
  }, [fetchSuppliers, fetchBankAccounts, fetchContasPagar]);

  useEffect(() => {
    if (allowedCompanyIds.length) refresh();
  }, [refresh, allowedCompanyIds.length]);

  // ---------- seleção ----------
  const toggleSelect = (id, checked) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  // ---------- upload comprovante ----------
  const uploadComprovante = async (file, contaId) => {
    if (!file) return null;
    const bucket = "comprovantes_pagamento";
    const filename = `${contaId}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const { data, error } = await supabase.storage.from(bucket).upload(filename, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast({ title: "Falha ao enviar comprovante", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return pub?.publicUrl || null;
    // (Se quiser privado, trocamos para signed URL em breve)
  };

  // ---------- pagar (single ou lote) ----------
  const openPayDialog = (conta) => {
    setContaTarget(conta);
    setPayForm({
      valor_pago: conta ? String(conta.restante || conta.value) : "",
      data_pagamento: new Date().toISOString().split("T")[0],
      bank_account_id: "",
      observacoes: "",
      aprovar_agora: false,
      comprovante_file: null,
    });
    setIsPayDialogOpen(true);
  };

  const doClientPayment = async (ids) => {
    // Client-side “transação” (temporária). Em breve troca por RPC.
    // Regras:
    // - insere em pagamento_lancamentos (parcial)
    // - se valor total quitado, marca conta como Paga + atualiza bank_accounts e bank_transactions
    // - se aprovar, seta approved_by/approved_at
    // - anexo: comprovante_url

    const isBatch = ids.length > 1;
    try {
      const bankId = payForm.bank_account_id || null;
      const dataPg = payForm.data_pagamento || new Date().toISOString().split("T")[0];
      const aprovar = !!payForm.aprovar_agora;
      const obs = payForm.observacoes?.trim() || "";

      // upload comprovante se tiver (no single; para lote, reaproveitamos o mesmo arquivo p/ cada)
      let comprovanteUrl = null;
      if (payForm.comprovante_file) {
        comprovanteUrl = await uploadComprovante(payForm.comprovante_file, isBatch ? `lote` : ids[0]);
      }

      const contasMap = {};
      contas.forEach((c) => (contasMap[c.id] = c));

      // se single, usa valor do form; se lote, usa restante de cada
      const rowsLanc = [];
      let totalBatch = 0;

      for (const id of ids) {
        const c = contasMap[id];
        if (!c) continue;
        const restante = Number(c.restante ?? c.value) || 0;
        const valor =
          ids.length === 1 ? Math.max(0, Number(payForm.valor_pago || 0)) : restante;

        if (!valor || valor <= 0) continue;

        rowsLanc.push({
          conta_pagar_id: id,
          amount: valor,
          bank_account_id: bankId,
          transaction_date: dataPg,
          user_id: user?.id || null,
          attachment_url: comprovanteUrl,
          notes: obs,
        });
        totalBatch += valor;
      }

      if (!rowsLanc.length) {
        toast({ title: "Nada a pagar", description: "Informe um valor válido.", variant: "destructive" });
        return;
      }

      // 1) inserir pagamentos parciais
      const { error: eIns } = await supabase.from("pagamento_lancamentos").insert(rowsLanc);
      if (eIns) throw eIns;

      // 2) atualizar status/contas bancárias/transactions
      // (client-side, simples: se somatório >= value -> Paga)
      for (const id of ids) {
        const c = contasMap[id];
        // recompute pagos
        const { data: parts } = await supabase
          .from("pagamento_lancamentos")
          .select("amount")
          .eq("conta_pagar_id", id);

        const soma = (parts ?? []).reduce((acc, r) => acc + Number(r.amount || 0), 0);
        const quitada = soma >= Number(c.value);

        // atualiza conta_pagar
        const updateData = {
          status: quitada ? "Paga" : "Pendente",
          payment_date: quitada ? dataPg : c.payment_date || null,
          bank_account_id: bankId,
          observacoes: obs || c.observacoes,
        };

        if (aprovar) {
          updateData.approved_by = user?.id || null;
          updateData.approved_at = new Date().toISOString();
        }

        const { error: eUp } = await supabase
          .from("contas_pagar")
          .update(updateData)
          .eq("id", id);
        if (eUp) throw eUp;

        // bank entry (bem simples por enquanto)
        if (bankId) {
          await supabase.from("bank_transactions").insert({
            account_id: bankId,
            type: "outflow",
            value: Math.min(Number(c.value), soma), // registro de saída (poderia ser por parcela também)
            description: `Pagamento: ${c.description}`,
            transaction_date: dataPg,
            user_id: user?.id || null,
            conta_pagar_id: id,
          });
        }
      }

      toast({
        title: isBatch ? "Lote processado!" : "Pagamento registrado!",
        description: isBatch
          ? `Total pago no lote: R$ ${totalBatch.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
          : undefined,
      });

      setIsPayDialogOpen(false);
      setContaTarget(null);
      setSelectedIds([]);
      refresh();
    } catch (err) {
      toast({ title: "Erro ao processar pagamento", description: String(err.message || err), variant: "destructive" });
    }
  };

  const onConfirmPay = async () => {
    const ids = contaTarget ? [contaTarget.id] : [...selectedIds];
    await doClientPayment(ids);
  };

  // -------- desfazer (zera status e apaga lançamentos) --------
  const openUndoDialog = (conta) => {
    setContaTarget(conta);
    setIsUndoDialogOpen(true);
  };

  const doUndo = async () => {
    if (!contaTarget) return;
    try {
      await supabase.from("pagamento_lancamentos").delete().eq("conta_pagar_id", contaTarget.id);
      await supabase
        .from("contas_pagar")
        .update({
          status: "Pendente",
          payment_date: null,
          bank_account_id: null,
          approved_by: null,
          approved_at: null,
        })
        .eq("id", contaTarget.id);

      // remover bank_transactions ligadas a esta conta
      await supabase.from("bank_transactions").delete().eq("conta_pagar_id", contaTarget.id);

      toast({ title: "Pagamento desfeito!" });
      setIsUndoDialogOpen(false);
      setContaTarget(null);
      refresh();
    } catch (err) {
      toast({ title: "Erro ao desfazer", description: String(err.message || err), variant: "destructive" });
    }
  };

  // -------- excluir conta --------
  const openDeleteDialog = (conta) => {
    setContaTarget(conta);
    setIsDeleteDialogOpen(true);
  };

  const doDelete = async () => {
    if (!contaTarget) return;
    try {
      await supabase.from("pagamento_lancamentos").delete().eq("conta_pagar_id", contaTarget.id);
      await supabase.from("contas_pagar").delete().eq("id", contaTarget.id);
      toast({ title: "Conta removida!" });
      setIsDeleteDialogOpen(false);
      setContaTarget(null);
      refresh();
    } catch (err) {
      toast({ title: "Erro ao excluir", description: String(err.message || err), variant: "destructive" });
    }
  };

  const filteredStatusBadge = (s) => {
    const st = (s || "").toLowerCase();
    if (st.includes("paga") || st === "paid")
      return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Paga</span>;
    if (st.includes("vencida") || st === "overdue")
      return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">Vencida</span>;
    return <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">Pendente</span>;
  };

  const renderRow = (c) => {
    const isPaid = (c.status_calc || c.status) === "Paga" || (c.status || "").toLowerCase() === "paid";
    const isOverdue =
      (c.status_calc || c.status) === "Vencida" || (c.status || "").toLowerCase() === "overdue";
    return (
      <tr
        key={c.id}
        className={`${selectedIds.includes(c.id) ? "bg-blue-50" : isPaid ? "bg-green-50" : isOverdue ? "bg-red-50" : ""} border-b`}
      >
        <td className="p-2 w-10">
          <Checkbox
            checked={selectedIds.includes(c.id)}
            onCheckedChange={(ck) => toggleSelect(c.id, ck)}
            disabled={isPaid}
          />
        </td>
        <td className="p-2">
          <div className="font-semibold">{c.description}</div>
          <div className="text-xs text-muted-foreground">{c.companies?.name || "Empresa"}</div>
        </td>
        <td className="p-2">{c.supplier?.name || "—"}</td>
        <td className="p-2 text-right font-mono">
          R$ {Number(c.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          {c.pagos > 0 && (
            <div className="text-xs text-muted-foreground">
              Pago: R$ {Number(c.pagos).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} • Restante:{" "}
              R$ {Number(c.restante).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          )}
        </td>
        <td className="p-2 text-center">
          {new Date(`${c.due_date}T00:00:00`).toLocaleDateString("pt-BR")}
        </td>
        <td className="p-2 text-center">{filteredStatusBadge(c.status_calc || c.status)}</td>
        <td className="p-2 text-center">
          {c.payment_date ? new Date(`${c.payment_date}T00:00:00`).toLocaleDateString("pt-BR") : "—"}
        </td>
        <td className="p-2">
          <div className="flex gap-2 justify-center">
            {isPaid ? (
              <Button variant="outline" size="sm" onClick={() => openUndoDialog(c)}>
                <Undo2 className="w-4 h-4 mr-1" />
                Desfazer
              </Button>
            ) : (
              <Button size="sm" onClick={() => openPayDialog(c)}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Pagar
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => openDeleteDialog(c)}>
              <X className="w-4 h-4 mr-1" />
              Excluir
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-card p-4 rounded-xl shadow border">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Pagamentos (Contas a Pagar)</h1>
          <div className="flex items-center gap-2">
            <Button
              disabled={!selectedIds.length}
              onClick={() => openPayDialog(null)}
              className="flex"
            >
              <FileText className="w-4 h-4 mr-2" />
              Pagar em Lote ({selectedIds.length})
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mt-4">
          <div>
            <Label>Empresa</Label>
            <select
              className="w-full px-3 py-2 rounded border bg-background h-10"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              disabled={loading}
            >
              <option value="all">Todas</option>
              {allowedCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Fornecedor</Label>
            <select
              className="w-full px-3 py-2 rounded border bg-background h-10"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              disabled={loading}
            >
              <option value="all">Todos</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Status</Label>
            <select
              className="w-full px-3 py-2 rounded border bg-background h-10"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={loading}
            >
              <option value="abertas">Abertas</option>
              <option value="vencidas">Vencidas</option>
              <option value="pagas">Pagas</option>
              <option value="todas">Todas</option>
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

          <div>
            <Label>Buscar</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button onClick={refresh}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow border overflow-hidden">
        <div className="p-2 bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            {loading ? "Carregando..." : `${contas.length} contas`}
          </div>
          <div className="pr-2 text-sm text-muted-foreground">
            Selecione linhas para pagamento em lote
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 w-10"></th>
                <th className="p-2 text-left">Descrição</th>
                <th className="p-2 text-left">Fornecedor</th>
                <th className="p-2 text-right">Valor</th>
                <th className="p-2 text-center">Vencimento</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2 text-center">Data Pgto</th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center">
                    Carregando...
                  </td>
                </tr>
              ) : contas.length ? (
                contas.map((c) => renderRow(c))
              ) : (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground">
                    Nenhuma conta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagar dialog (single/lote) */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {contaTarget ? "Pagar Conta" : `Pagar em Lote (${selectedIds.length})`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {contaTarget && (
              <div className="p-3 rounded border bg-muted/30">
                <div className="font-semibold">{contaTarget.description}</div>
                <div className="text-xs text-muted-foreground">
                  Valor: R${" "}
                  {Number(contaTarget.value).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  • Restante: R{"$ "}
                  {Number(contaTarget.restante ?? contaTarget.value).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            )}

            {/* valor parcial (para single) */}
            {contaTarget ? (
              <div>
                <Label>Valor pago (parcial permitido)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payForm.valor_pago}
                  onChange={(e) =>
                    setPayForm((p) => ({ ...p, valor_pago: e.target.value }))
                  }
                />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Lote: será utilizado o <b>restante</b> de cada conta selecionada.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data do pagamento</Label>
                <Input
                  type="date"
                  value={payForm.data_pagamento}
                  onChange={(e) =>
                    setPayForm((p) => ({ ...p, data_pagamento: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Conta bancária</Label>
                <select
                  className="w-full px-3 py-2 rounded border bg-background h-10"
                  value={payForm.bank_account_id}
                  onChange={(e) =>
                    setPayForm((p) => ({ ...p, bank_account_id: e.target.value }))
                  }
                >
                  <option value="">—</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} / {b.account_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Input
                value={payForm.observacoes}
                onChange={(e) =>
                  setPayForm((p) => ({ ...p, observacoes: e.target.value }))
                }
                placeholder="Ex: repasse semanal..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="aprovar_agora"
                checked={payForm.aprovar_agora}
                onCheckedChange={(ck) =>
                  setPayForm((p) => ({ ...p, aprovar_agora: !!ck }))
                }
              />
              <Label htmlFor="aprovar_agora">Aprovar este pagamento agora</Label>
            </div>

            <div>
              <Label>Anexo (comprovante)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setPayForm((p) => ({ ...p, comprovante_file: e.target.files?.[0] || null }))
                  }
                />
                <Paperclip className="w-4 h-4" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Salvo em: <code>storage://comprovantes_pagamento/&lt;contaId|lote&gt;/arquivo</code>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPayDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onConfirmPay}>
              <Check className="w-4 h-4 mr-2" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Desfazer pagamento */}
      <AlertDialog open={isUndoDialogOpen} onOpenChange={setIsUndoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer pagamento?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm">
            Isso removerá lançamentos parciais, transações bancárias e voltará a conta para <b>Pendente</b>.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doUndo}>Desfazer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excluir conta */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta definitivamente?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm">Essa ação não pode ser desfeita.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Pagamentos;
