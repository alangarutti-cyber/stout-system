import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlusCircle, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const frequencias = [
  "Diário",
  "Semanal",
  "Quinzenal",
  "Mensal",
  "Bimestral",
  "Trimestral",
  "Semestral",
  "Anual",
];

const DialogNovaContaPagar = ({
  open,
  setOpen,
  onSave,
  user,
  companies,
  userCompanyAccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  const [form, setForm] = useState({
    company_id: "",
    category_id: "",
    supplier_id: "",
    description: "",
    due_date: "",
    amount: "",
    repeat_frequency: "Mensal",
    repeat_count: 1,
  });

  useEffect(() => {
    fetchCategorias();
    fetchFornecedores();
  }, []);

  const fetchCategorias = async () => {
    const { data, error } = await supabase.from("categories").select("id, name");
    if (!error && data) setCategorias(data);
  };

  const fetchFornecedores = async () => {
    const { data, error } = await supabase.from("suppliers").select("id, name");
    if (!error && data) setFornecedores(data);
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    if (!form.category_id || !form.supplier_id || !form.amount || !form.due_date) {
      toast({
        title: "Campos obrigatórios faltando",
        description: "Preencha categoria, fornecedor, valor e vencimento.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("pay_accounts").insert([
      {
        company_id: form.company_id || companies[0]?.id,
        category_id: form.category_id,
        supplier_id: form.supplier_id,
        description: form.description,
        due_date: form.due_date,
        amount: parseFloat(form.amount),
        repeat_frequency: form.repeat_frequency,
        repeat_count: form.repeat_count,
        created_by: user.id,
      },
    ]);

    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao salvar conta",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Conta criada com sucesso!",
        variant: "success",
      });
      setOpen(false);
      onSave?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Conta a Pagar</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Categoria</Label>
            <select
              id="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="w-full border rounded-md px-2 py-1"
            >
              <option value="">Selecione...</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Fornecedor</Label>
            <select
              id="supplier_id"
              value={form.supplier_id}
              onChange={handleChange}
              className="w-full border rounded-md px-2 py-1"
            >
              <option value="">Selecione...</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Descrição</Label>
            <Input
              id="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Ex: Conta de energia, aluguel, etc"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vencimento</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label>Frequência</Label>
              <select
                id="repeat_frequency"
                value={form.repeat_frequency}
                onChange={handleChange}
                className="w-full border rounded-md px-2 py-1"
              >
                {frequencias.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Nº de repetições</Label>
              <Input
                id="repeat_count"
                type="number"
                min="1"
                value={form.repeat_count}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="w-4 h-4 mr-1" />
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DialogNovaContaPagar;
