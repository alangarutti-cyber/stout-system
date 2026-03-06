import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Trash2, RefreshCw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import DialogNovaContaPagar from "./DialogNovaContaPagar";

const ContasPagar = ({ user, companies, userCompanyAccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  const [filters, setFilters] = useState({
    category_id: "",
    supplier_id: "",
    date_from: "",
    date_to: "",
  });

  // modal criar/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // objeto da conta em edição ou null

  // --------- loads ----------
  const fetchCategorias = useCallback(async () => {
    const { data, error } = await supabase.from("categories").select("id,name").order("name");
    if (error) return;
    setCategorias(data || []);
  }, []);

  const fetchFornecedores = useCallback(async () => {
    const { data, error } = await supabase.from("suppliers").select("id,name").order("name");
    if (error) return;
    setFornecedores(data || []);
  }, []);

  const fetchContas = useCallback(async () => {
    setLoading(true);

    // NÃO referencie colunas que possam não existir (ex.: amount).
    // Buscamos tudo (*) e resolvemos o "valor" no front com fallback.
    let query = supabase
      .from("pay_accounts")
      .select(`*, suppliers(name), categories(name), companies(name)`)
      .order("due_date", { ascending: true });

    if (filters.category_id) query = query.eq("category_id", filters.category_id);
    if (filters.supplier_id) query = query.eq("supplier_id", filters.supplier_id);
    if (filters.date_from) query = query.gte("due_date", filters.date_from);
    if (filters.date_to) query = query.lte("due_date", filters.date_to);

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Erro ao buscar contas",
        description: error.message,
        variant: "destructive",
      });
      setContas([]);
    } else {
      setContas(data || []);
    }
    setLoading(false);
  }, [filters, toast]);

  useEffect(() => {
    fetchCategorias();
    fetchFornecedores();
    fetchContas();
  }, [fetchCategorias, fetchFornecedores, fetchContas]);

  // --------- handlers ----------
  const handleDelete = async (id) => {
    const { error } = await supabase.from("pay_accounts").delete().eq("id", id);
    if (error) {
      toast({
        title: "Erro ao excluir conta",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Conta excluída!" });
      fetchContas();
    }
  };

  const handleFilterChange = (e) => {
    const { id, value } = e.target;
    setFilters((prev) => ({ ...prev, [id]: value }));
  };

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (conta) => {
    setEditing(conta);
    setModalOpen(true);
  };

  const valorFormatado = (row) => {
    const v =
      row.amount ??
      row.value ??
      row.total_value ??
      row.expected_value ??
      row.valor ??
      0;
    return Number(v || 0);
  };

  // --------- UI ----------
  return (
    <motion.div
      className="space-y-6 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-700">Contas a Pagar</h2>
        <div className="flex gap-2">
          <Button onClick={fetchContas} variant="outline">
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
          <Button onClick={openNew} className="bg-blue-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nova Conta
          </Button>
        </div>
      </div>

      {/* === FILTROS === */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-gray-50 p-4 rounded-md border">
        <div>
          <Label>Categoria</Label>
          <select
            id="category_id"
            value={filters.category_id}
            onChange={handleFilterChange}
            className="w-full border rounded-md p-2"
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Fornecedor</Label>
          <select
            id="supplier_id"
            value={filters.supplier_id}
            onChange={handleFilterChange}
            className="w-full border rounded-md p-2"
          >
            <option value="">Todos</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>De</Label>
          <Input id="date_from" type="date" value={filters.date_from} onChange={handleFilterChange} />
        </div>

        <div>
          <Label>Até</Label>
          <Input id="date_to" type="date" value={filters.date_to} onChange={handleFilterChange} />
        </div>

        {/* Busca rápida por fornecedor (no lugar do campo de texto) */}
        <div>
          <Label>Fornecedor (busca rápida)</Label>
          <div className="flex gap-2">
            <select
              id="supplier_id"
              value={filters.supplier_id}
              onChange={handleFilterChange}
              className="w-full border rounded-md p-2"
            >
              <option value="">Todos</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <Button onClick={fetchContas}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* === TABELA === */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-2 text-left">Descrição</th>
              <th className="px-4 py-2 text-left">Categoria</th>
              <th className="px-4 py-2 text-left">Fornecedor</th>
              <th className="px-4 py-2 text-left">Empresa</th>
              <th className="px-4 py-2 text-center">Vencimento</th>
              <th className="px-4 py-2 text-right">Valor</th>
              <th className="px-4 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : contas.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-400">
                  Nenhuma conta encontrada.
                </td>
              </tr>
            ) : (
              contas.map((conta) => (
                <tr key={conta.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2">{conta.description || "-"}</td>
                  <td className="px-4 py-2">{conta.categories?.name || "-"}</td>
                  <td className="px-4 py-2">{conta.suppliers?.name || "-"}</td>
                  <td className="px-4 py-2">{conta.companies?.name || "-"}</td>
                  <td className="px-4 py-2 text-center">
                    {conta.due_date ? new Date(conta.due_date).toLocaleDateString("pt-BR") : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">R$ {valorFormatado(conta).toFixed(2)}</td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(conta)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(conta.id)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CRIAR/EDITAR */}
      <DialogNovaContaPagar
        open={modalOpen}
        setOpen={setModalOpen}
        user={user}
        companies={companies}
        userCompanyAccess={userCompanyAccess}
        onSave={fetchContas}
        // passa os dados quando for edição
        editing={editing}
      />
    </motion.div>
  );
};

export default ContasPagar;
