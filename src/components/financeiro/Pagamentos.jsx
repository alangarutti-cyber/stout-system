import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Save, Printer, Trash2, CheckCircle2, Search, RefreshCw, FileDown } from "lucide-react";
import { utils as XLSXUtils, writeFile as XLSXWriteFile } from "xlsx";

/**
 * Pagamentos (Contas a Pagar)
 * Depende das tabelas/colunas:
 *  - pay_accounts: id, company_id, supplier_id, category_id, description, expected_value, paid_value, due_date, payment_date, status, created_at
 *  - suppliers: id, name
 *  - categories: id, name
 *
 * Props aceitas (opcional): user, companies, userCompanyAccess
 * Se não vier por props, você pode trocar pela sua useUser() se preferir.
 */
const Pagamentos = ({ user, companies = [], userCompanyAccess = [] }) => {
  const { toast } = useToast();

  // ----------------------------
  // STATE – filtros e lista
  // ----------------------------
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // filtros da barra lateral (mapeados na UI como no ERP)
  const [tipo, setTipo] = useState("todos"); // todos | a_pagar | pagas | vencidas
  const [periodoBase, setPeriodoBase] = useState("vencimento"); // vencimento | pagamento
  const [dtIniBase, setDtIniBase] = useState(""); // yyyy-mm-dd
  const [dtFimBase, setDtFimBase] = useState("");
  const [dtPagIni, setDtPagIni] = useState("");
  const [dtPagFim, setDtPagFim] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [busca, setBusca] = useState("");
  const [exibirJurosDescontos, setExibirJurosDescontos] = useState(false);
  const [empId, setEmpId] = useState("");

  // combos
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  // dialogo de exclusão
  const [deleteOpen, setDeleteOpen] = useState(false);

  // empresas permitidas (respeita acesso)
  const allowedCompanies = useMemo(() => {
    if (!user || user?.is_admin) return companies;
    return companies.filter((c) =>
      userCompanyAccess.some((ua) => ua.user_id === user.id && ua.company_id === c.id)
    );
  }, [companies, user, userCompanyAccess]);

  // ----------------------------
  // LOAD combos (categorias, fornecedores)
  // ----------------------------
  const loadCombos = useCallback(async () => {
    const [{ data: cat, error: e1 }, { data: forn, error: e2 }] = await Promise.all([
      supabase.from("categories").select("id,name").order("name"),
      supabase.from("suppliers").select("id,name").order("name"),
    ]);

    if (e1) {
      toast({ title: "Erro ao buscar categorias", description: e1.message, variant: "destructive" });
    } else {
      setCategorias(cat || []);
    }

    if (e2) {
      toast({ title: "Erro ao buscar fornecedores", description: e2.message, variant: "destructive" });
    } else {
      setFornecedores(forn || []);
    }
  }, [toast]);

  // ----------------------------
  // BUSCA principal
  // ----------------------------
  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("pay_accounts")
        .select(
          `
          id, company_id, supplier_id, category_id,
          description, expected_value, paid_value,
          due_date, payment_date, status, created_at,
          suppliers ( name ),
          categories ( name )
        `
        )
        .order("due_date", { ascending: true });

      // Empresa
      if (empId) query = query.eq("company_id", empId);
      else if (!user?.is_admin && allowedCompanies.length) {
        const ids = allowedCompanies.map((c) => c.id);
        query = query.in("company_id", ids);
      }

      // Tipo (status)
      if (tipo === "a_pagar") query = query.eq("status", "a_pagar");
      if (tipo === "pagas") query = query.eq("status", "paga");
      if (tipo === "vencidas") {
        // vencidas = a_pagar com due_date < hoje
        const hoje = new Date().toISOString().slice(0, 10);
        query = query.eq("status", "a_pagar").lt("due_date", hoje);
      }

      // Período base
      if (periodoBase === "vencimento") {
        if (dtIniBase) query = query.gte("due_date", dtIniBase);
        if (dtFimBase) query = query.lte("due_date", dtFimBase);
      } else {
        if (dtIniBase) query = query.gte("created_at", dtIniBase);
        if (dtFimBase) query = query.lte("created_at", dtFimBase + "T23:59:59");
      }

      // Período de pagamento
      if (dtPagIni) query = query.gte("payment_date", dtPagIni);
      if (dtPagFim) query = query.lte("payment_date", dtPagFim);

      // Categoria e Fornecedor
      if (categoria) query = query.eq("category_id", categoria);
      if (fornecedor) query = query.eq("supplier_id", fornecedor);

      // Busca em descrição
      if (busca) query = query.ilike("description", `%${busca}%`);

      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
      setSelectedIds([]);
    } catch (err) {
      toast({ title: "Erro ao pesquisar", description: String(err.message || err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [
    empId,
    allowedCompanies,
    user,
    tipo,
    periodoBase,
    dtIniBase,
    dtFimBase,
    dtPagIni,
    dtPagFim,
    categoria,
    fornecedor,
    busca,
    toast,
  ]);

  // init
  useEffect(() => {
    loadCombos();
  }, [loadCombos]);

  // ----------------------------
  // Helpers
  // ----------------------------
  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allSelected = selectedIds.length > 0 && selectedIds.length === rows.length;
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(rows.map((r) => r.id));
  };

  const totalPrevisto = useMemo(
    () => rows.reduce((acc, r) => acc + (Number(r.expected_value) || 0), 0),
    [rows]
  );
  const totalPago = useMemo(
    () => rows.reduce((acc, r) => acc + (Number(r.paid_value) || 0), 0),
    [rows]
  );

  const fmtMoney = (n) =>
    (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ----------------------------
  // Ações
  // ----------------------------
  const marcarComoPago = async () => {
    if (!selectedIds.length) {
      toast({ title: "Nada selecionado", description: "Selecione pelo menos uma conta.", variant: "destructive" });
      return;
    }
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("pay_accounts")
        .update({ status: "paga", payment_date: hoje, paid_value: supabase.rpc }) // paid_value mantido; ajuste se quiser
        .in("id", selectedIds);
      if (error) throw error;
      toast({ title: "Contas atualizadas", description: "Marcadas como pagas com sucesso." });
      fetchRows();
    } catch (err) {
      toast({ title: "Falha ao atualizar", description: String(err.message || err), variant: "destructive" });
    }
  };

  const excluirSelecao = async () => {
    if (!selectedIds.length) {
      toast({ title: "Nada selecionado", description: "Selecione pelo menos uma conta.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("pay_accounts").delete().in("id", selectedIds);
      if (error) throw error;
      toast({ title: "Contas excluídas", description: "Remoção concluída." });
      setDeleteOpen(false);
      fetchRows();
    } catch (err) {
      toast({ title: "Falha ao excluir", description: String(err.message || err), variant: "destructive" });
    }
  };

  const imprimir = () => {
    window.print();
  };

  const exportarExcel = () => {
    const data = rows.map((r) => ({
      "Data Lançamento": r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
      Vencimento: r.due_date ? new Date(r.due_date).toLocaleDateString() : "",
      Categoria: r.categories?.name || "",
      "Descrição / Fornecedor": `${r.description || ""} ${r.suppliers?.name ? `- ${r.suppliers.name}` : ""}`,
      "Valor Previsto": Number(r.expected_value) || 0,
      "Valor Pago": Number(r.paid_value) || 0,
      "Data Pagamento": r.payment_date ? new Date(r.payment_date).toLocaleDateString() : "",
      Status: r.status || "",
    }));
    const ws = XLSXUtils.json_to_sheet(data);
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, "Contas a Pagar");
    XLSXWriteFile(wb, "contas_a_pagar.xlsx");
  };

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <div className="flex gap-4 p-2 sm:p-4">
      {/* LATERAL DE FILTROS */}
      <div className="w-[300px] shrink-0 rounded-md border p-3 bg-white">
        <div className="mb-2 font-semibold">Pesquisar Contas a Pagar</div>

        {/* Tipo */}
        <div className="space-y-2 mb-3">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={tipo === "todos" ? "default" : "outline"} onClick={() => setTipo("todos")}>
              Todos
            </Button>
            <Button variant={tipo === "a_pagar" ? "default" : "outline"} onClick={() => setTipo("a_pagar")}>
              A Pagar
            </Button>
            <Button variant={tipo === "pagas" ? "default" : "outline"} onClick={() => setTipo("pagas")}>
              Pagas
            </Button>
            <Button variant={tipo === "vencidas" ? "default" : "outline"} onClick={() => setTipo("vencidas")}>
              Vencidas
            </Button>
          </div>
        </div>

        {/* Empresa */}
        <div className="space-y-1 mb-3">
          <Label>Empresa</Label>
          <select
            className="w-full border rounded-md h-9 px-2"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
          >
            <option value="">Todas</option>
            {allowedCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Período base */}
        <div className="space-y-2 mb-3">
          <Label>Período de {periodoBase === "vencimento" ? "Vencimento" : "Lançamento"}</Label>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex gap-2">
              <select
                className="border rounded-md h-9 px-2"
                value={periodoBase}
                onChange={(e) => setPeriodoBase(e.target.value)}
              >
                <option value="vencimento">Vencimento</option>
                <option value="lancamento">Lançamento</option>
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const hoje = new Date();
                  const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
                  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
                  setDtIniBase(ini);
                  setDtFimBase(fim);
                }}
              >
                Mês
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const hoje = new Date().toISOString().slice(0, 10);
                  setDtIniBase(hoje);
                  setDtFimBase(hoje);
                }}
              >
                Hoje
              </Button>
            </div>
            <div className="flex gap-2">
              <Input type="date" value={dtIniBase} onChange={(e) => setDtIniBase(e.target.value)} />
              <Input type="date" value={dtFimBase} onChange={(e) => setDtFimBase(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Período de pagamento */}
        <div className="space-y-2 mb-3">
          <Label>Período de pagamento</Label>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const hoje = new Date();
                  const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
                  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
                  setDtPagIni(ini);
                  setDtPagFim(fim);
                }}
              >
                Mês
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const hoje = new Date().toISOString().slice(0, 10);
                  setDtPagIni(hoje);
                  setDtPagFim(hoje);
                }}
              >
                Hoje
              </Button>
            </div>
            <div className="flex gap-2">
              <Input type="date" value={dtPagIni} onChange={(e) => setDtPagIni(e.target.value)} />
              <Input type="date" value={dtPagFim} onChange={(e) => setDtPagFim(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Categoria / Fornecedor */}
        <div className="space-y-2 mb-3">
          <Label>Categoria</Label>
          <select
            className="w-full border rounded-md h-9 px-2"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="">Todas as categorias…</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Label className="mt-2">Fornecedor</Label>
          <select
            className="w-full border rounded-md h-9 px-2"
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
          >
            <option value="">Todos os fornecedores…</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Busca + checkbox */}
        <div className="space-y-2 mb-3">
          <Input
            placeholder="Pesquisar por descrição…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={exibirJurosDescontos}
              onChange={(e) => setExibirJurosDescontos(e.target.checked)}
            />
            Exibir colunas “Descontos” e “Juros e Multas”
          </label>
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          <Button className="w-full" onClick={fetchRows} disabled={loading}>
            <Search className="w-4 h-4 mr-2" />
            {loading ? "Pesquisando..." : "Pesquisar"}
          </Button>
          <Button variant="outline" onClick={() => {
            setTipo("todos");
            setPeriodoBase("vencimento");
            setDtIniBase("");
            setDtFimBase("");
            setDtPagIni("");
            setDtPagFim("");
            setCategoria("");
            setFornecedor("");
            setBusca("");
            setEmpId("");
          }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* TABELA */}
      <div className="flex-1 rounded-md border bg-white">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-sm text-muted-foreground">Resultados</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={imprimir}>
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
            <Button variant="outline" onClick={exportarExcel}>
              <FileDown className="w-4 h-4 mr-2" /> Exportar Excel
            </Button>
          </div>
        </div>

        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Data Lançamento</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição / Fornecedor</TableHead>
                <TableHead className="text-right">Valor Previsto</TableHead>
                <TableHead className="text-right">Valor Pago</TableHead>
                <TableHead>Data Pagamento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length && !loading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Sem Resultados
                  </TableCell>
                </TableRow>
              )}

              {rows.map((r) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b"
                >
                  <TableCell className="w-10">
                    <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                  </TableCell>
                  <TableCell>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</TableCell>
                  <TableCell>{r.due_date ? new Date(r.due_date).toLocaleDateString() : ""}</TableCell>
                  <TableCell>{r.categories?.name || ""}</TableCell>
                  <TableCell>
                    {r.description}
                    {r.suppliers?.name ? ` / ${r.suppliers.name}` : ""}
                  </TableCell>
                  <TableCell className="text-right">{fmtMoney(r.expected_value)}</TableCell>
                  <TableCell className="text-right">{fmtMoney(r.paid_value)}</TableCell>
                  <TableCell>{r.payment_date ? new Date(r.payment_date).toLocaleDateString() : ""}</TableCell>
                  <TableCell className="capitalize">{r.status || ""}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* RODAPÉ com totais e ações */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-2 border-t">
          <div className="flex gap-2">
            <Button onClick={marcarComoPago}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar Como Pago ({selectedIds.length})
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Excluir ({selectedIds.length})
            </Button>
          </div>

          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground mr-1">Total Previsto:</span>
              <span className="font-semibold">{fmtMoney(totalPrevisto)}</span>
            </div>
            <div>
              <span className="text-muted-foreground mr-1">Total Pago:</span>
              <span className="font-semibold">{fmtMoney(totalPago)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMAÇÃO EXCLUSÃO */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.length} registro(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os registros selecionados serão removidos definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirSelecao} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Pagamentos;
