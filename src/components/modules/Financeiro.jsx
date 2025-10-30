import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/contexts/UserContext";

const Financeiro = () => {
  const { toast } = useToast();
  const { user, companies, userCompanyAccess } = useUser();
  const [activeTab, setActiveTab] = useState("pagar");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [allowedCompanies, setAllowedCompanies] = useState([]);

  // === Empresas com acesso ===
  useEffect(() => {
    if (user && companies && userCompanyAccess) {
      if (user.is_admin || user.role === "Super Administrador") {
        setAllowedCompanies(companies);
        if (companies.length > 0) setSelectedCompany(companies[0].id);
      } else {
        const accessIds = userCompanyAccess
          .filter((a) => a.user_id === user.id)
          .map((a) => a.company_id);
        const allowed = companies.filter((c) => accessIds.includes(c.id));
        setAllowedCompanies(allowed);
        if (allowed.length > 0) setSelectedCompany(allowed[0].id);
      }
    }
  }, [user, companies, userCompanyAccess]);

  // === Buscar lançamentos ===
  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);

    const table = activeTab === "pagar" ? "contas_pagar" : "contas_receber";
    const campos =
      activeTab === "pagar"
        ? `id, description, value, due_date, status, payment_date, valor_pago, company_id, origem`
        : `id, description, value, due_date, status, payment_date, valor_recebido, company_id, origem`;

    const { data, error } = await supabase
      .from(table)
      .select(campos)
      .eq("company_id", selectedCompany)
      .order("due_date", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao buscar dados",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setData(data);
    }
    setLoading(false);
  }, [selectedCompany, activeTab, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // === Atualizar status ===
  const handleStatus = async (item) => {
    const table = activeTab === "pagar" ? "contas_pagar" : "contas_receber";
    const newStatus = activeTab === "pagar" ? "paid" : "received";
    const valorCampo = activeTab === "pagar" ? "valor_pago" : "valor_recebido";

    const { error } = await supabase
      .from(table)
      .update({
        status: newStatus,
        payment_date: new Date().toISOString().split("T")[0],
        [valorCampo]: item.value,
      })
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Lançamento atualizado com sucesso!" });
      fetchData();
    }
  };

  // === Editar lançamento ===
  const handleEdit = async (item) => {
    const novaDescricao = prompt("Nova descrição:", item.description);
    if (novaDescricao === null) return;

    const novoValor = parseFloat(prompt("Novo valor:", item.value));
    if (isNaN(novoValor)) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }

    const novaData = prompt(
      "Nova data de vencimento (AAAA-MM-DD):",
      item.due_date
    );

    const table = activeTab === "pagar" ? "contas_pagar" : "contas_receber";
    const { error } = await supabase
      .from(table)
      .update({
        description: novaDescricao,
        value: novoValor,
        due_date: novaData,
      })
      .eq("id", item.id);

    if (error) {
      toast({
        title: "Erro ao editar lançamento",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Lançamento atualizado com sucesso!" });
      fetchData();
    }
  };

  // === Excluir lançamento ===
  const handleDelete = async (item) => {
    if (!confirm(`Excluir "${item.description}"?`)) return;

    const table = activeTab === "pagar" ? "contas_pagar" : "contas_receber";
    const { error } = await supabase.from(table).delete().eq("id", item.id);

    if (error) {
      toast({
        title: "Erro ao excluir lançamento",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Lançamento excluído!" });
      fetchData();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-3 border-b">
        <button
          onClick={() => setActiveTab("pagar")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "pagar"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
        >
          Contas a Pagar
        </button>
        <button
          onClick={() => setActiveTab("receber")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "receber"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
        >
          Contas a Receber
        </button>
      </div>

      <div className="flex gap-3 items-center">
        <label>Empresa:</label>
        <select
          className="border p-2 rounded-md"
          value={selectedCompany || ""}
          onChange={(e) => setSelectedCompany(e.target.value)}
        >
          {allowedCompanies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin w-6 h-6" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">Nenhum lançamento encontrado.</p>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {data.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{item.description}</p>
                  <p className="text-sm text-muted-foreground">
                    Vencimento:{" "}
                    {item.due_date
                      ? new Date(item.due_date).toLocaleDateString("pt-BR")
                      : "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Valor:{" "}
                    {item.value?.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                  {item.payment_date && (
                    <p className="text-xs text-green-700 mt-1">
                      Pago em:{" "}
                      {new Date(item.payment_date).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 items-center">
                  {item.status === "paid" || item.status === "received" ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />{" "}
                      {activeTab === "pagar" ? "Pago" : "Recebido"}
                    </span>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className={
                          activeTab === "pagar"
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }
                        onClick={() => handleStatus(item)}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        {activeTab === "pagar" ? "Pagar" : "Receber"}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                      >
                        ✏️ Editar
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(item)}
                      >
                        🗑️ Excluir
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default Financeiro;
