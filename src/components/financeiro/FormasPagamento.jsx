import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, Link2, RefreshCw, Save, X, Percent, CalendarDays, Layers, CreditCard } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

/**
 * Props esperadas (mesmo padrão dos seus módulos):
 * - user: { id, is_admin, ... }
 * - companies: [{ id, name }]
 * - userCompanyAccess: [{ user_id, company_id }]
 */
const FormasPagamento = ({ user, companies, userCompanyAccess }) => {
  const { toast } = useToast();

  // --- state base
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [flags, setFlags] = useState([]);

  const [selectedForm, setSelectedForm] = useState(null);
  const [formLinks, setFormLinks] = useState([]); // vínculos da forma selecionada

  // dialogs
  const [isFormDialog, setIsFormDialog] = useState(false);
  const [isFlagDialog, setIsFlagDialog] = useState(false);
  const [isLinkDialog, setIsLinkDialog] = useState(false);
  const [isDeleteDialog, setIsDeleteDialog] = useState(false);

  // edições
  const [editingForm, setEditingForm] = useState(null);
  const [editingFlag, setEditingFlag] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null); // { type: 'form'|'flag'|'link', row }

  // payloads de edição
  const [formData, setFormData] = useState({
    company_id: "",
    name: "",
    type: "dinheiro",
    is_active: true,
  });

  const [flagData, setFlagData] = useState({
    company_id: "",
    name: "",
    is_active: true,
  });

  const [linkData, setLinkData] = useState({
    card_flag_id: "",
    days_to_receive: 0,
    fee_percent: 0,
  });

  const allowedCompanies = useMemo(() => {
    if (user?.is_admin) return companies || [];
    const ids = (userCompanyAccess || [])
      .filter((ua) => ua.user_id === user?.id)
      .map((ua) => ua.company_id);
    return (companies || []).filter((c) => ids.includes(c.id));
  }, [user?.is_admin, user?.id, companies, userCompanyAccess]);

  // ---------- Fetchers
  const fetchForms = useCallback(async () => {
    let q = supabase
      .from("payment_methods")
      .select("id, company_id, name, type, is_active, companies(name)")
      .order("name", { ascending: true });

    if (!user?.is_admin && allowedCompanies.length) {
      q = q.in("company_id", allowedCompanies.map((c) => c.id));
    }

    const { data, error } = await q;
    if (error) {
      toast({
        title: "Erro ao carregar formas de pagamento",
        description: error.message,
        variant: "destructive",
      });
      setForms([]);
    } else {
      setForms(data || []);
    }
  }, [allowedCompanies, user?.is_admin, toast]);

  const fetchFlags = useCallback(async () => {
    let q = supabase
      .from("card_flags")
      .select("id, company_id, name, is_active, companies(name)")
      .order("name", { ascending: true });

    if (!user?.is_admin && allowedCompanies.length) {
      q = q.in("company_id", allowedCompanies.map((c) => c.id));
    }

    const { data, error } = await q;
    if (error) {
      toast({
        title: "Erro ao carregar bandeiras",
        description: error.message,
        variant: "destructive",
      });
      setFlags([]);
    } else {
      setFlags(data || []);
    }
  }, [allowedCompanies, user?.is_admin, toast]);

  const fetchLinksForSelected = useCallback(async () => {
    if (!selectedForm) return;
    const { data, error } = await supabase
      .from("payment_method_flags")
      .select(
        `
        id,
        payment_method_id,
        card_flag_id,
        days_to_receive,
        fee_percent,
        card_flags(name),
        companies(name)
      `
      )
      .eq("payment_method_id", selectedForm.id)
      .order("id", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao buscar vínculos",
        description: error.message,
        variant: "destructive",
      });
      setFormLinks([]);
    } else {
      setFormLinks(data || []);
    }
  }, [selectedForm, toast]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchForms(), fetchFlags()]);
    setLoading(false);
  }, [fetchForms, fetchFlags]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    fetchLinksForSelected();
  }, [selectedForm, fetchLinksForSelected]);

  // ---------- Helpers UI
  const companyDefault = useMemo(() => {
    return allowedCompanies.length === 1 ? allowedCompanies[0].id : "";
  }, [allowedCompanies]);

  const openNewForm = () => {
    setEditingForm(null);
    setFormData({
      company_id: companyDefault,
      name: "",
      type: "dinheiro",
      is_active: true,
    });
    setIsFormDialog(true);
  };

  const openEditForm = (row) => {
    setEditingForm(row);
    setFormData({
      company_id: row.company_id || companyDefault,
      name: row.name || "",
      type: row.type || "dinheiro",
      is_active: !!row.is_active,
    });
    setIsFormDialog(true);
  };

  const openNewFlag = () => {
    setEditingFlag(null);
    setFlagData({
      company_id: companyDefault,
      name: "",
      is_active: true,
    });
    setIsFlagDialog(true);
  };

  const openEditFlag = (row) => {
    setEditingFlag(row);
    setFlagData({
      company_id: row.company_id || companyDefault,
      name: row.name || "",
      is_active: !!row.is_active,
    });
    setIsFlagDialog(true);
  };

  const openNewLink = () => {
    if (!selectedForm) {
      toast({
        title: "Selecione uma forma de pagamento",
        description: "Escolha uma forma para vincular as bandeiras.",
      });
      return;
    }
    setLinkData({
      card_flag_id: "",
      days_to_receive: 0,
      fee_percent: 0,
    });
    setIsLinkDialog(true);
  };

  const openEditLink = (row) => {
    setLinkData({
      card_flag_id: row.card_flag_id,
      days_to_receive: row.days_to_receive ?? 0,
      fee_percent: Number(row.fee_percent ?? 0),
    });
    setIsLinkDialog(true);
  };

  // ---------- Saves
  const saveForm = async () => {
    if (!formData.company_id || !formData.name) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione a empresa e informe o nome.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      company_id: Number(formData.company_id),
      name: formData.name.trim(),
      type: formData.type,
      is_active: !!formData.is_active,
    };

    let error;
    if (editingForm) {
      ({ error } = await supabase
        .from("payment_methods")
        .update(payload)
        .eq("id", editingForm.id));
    } else {
      ({ error } = await supabase.from("payment_methods").insert(payload));
    }

    if (error) {
      toast({
        title: "Erro ao salvar forma",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `Forma ${editingForm ? "atualizada" : "criada"}!` });
      setIsFormDialog(false);
      setEditingForm(null);
      await fetchForms();
    }
  };

  const saveFlag = async () => {
    if (!flagData.company_id || !flagData.name) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione a empresa e informe o nome.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      company_id: Number(flagData.company_id),
      name: flagData.name.trim(),
      is_active: !!flagData.is_active,
    };

    let error;
    if (editingFlag) {
      ({ error } = await supabase
        .from("card_flags")
        .update(payload)
        .eq("id", editingFlag.id));
    } else {
      ({ error } = await supabase.from("card_flags").insert(payload));
    }

    if (error) {
      toast({
        title: "Erro ao salvar bandeira",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `Bandeira ${editingFlag ? "atualizada" : "criada"}!` });
      setIsFlagDialog(false);
      setEditingFlag(null);
      await fetchFlags();
    }
  };

  const saveLink = async () => {
    if (!selectedForm) return;

    if (!linkData.card_flag_id) {
      toast({
        title: "Selecione uma bandeira",
        description: "Escolha a bandeira para vincular.",
        variant: "destructive",
      });
      return;
    }

    const exists = formLinks.find(
      (l) => l.card_flag_id === Number(linkData.card_flag_id)
    );

    const payload = {
      payment_method_id: selectedForm.id,
      card_flag_id: Number(linkData.card_flag_id),
      company_id: selectedForm.company_id,
      days_to_receive: Number(linkData.days_to_receive || 0),
      fee_percent: Number(linkData.fee_percent || 0),
    };

    let error;
    if (exists) {
      ({ error } = await supabase
        .from("payment_method_flags")
        .update({
          days_to_receive: payload.days_to_receive,
          fee_percent: payload.fee_percent,
        })
        .eq("id", exists.id));
    } else {
      ({ error } = await supabase
        .from("payment_method_flags")
        .insert(payload));
    }

    if (error) {
      toast({
        title: "Erro ao salvar vínculo",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `Vínculo ${exists ? "atualizado" : "criado"}!` });
      setIsLinkDialog(false);
      await fetchLinksForSelected();
    }
  };

  // ---------- Deletes
  const askDelete = (type, row) => {
    setDeletingItem({ type, row });
    setIsDeleteDialog(true);
  };

  const doDelete = async () => {
    if (!deletingItem) return;
    const { type, row } = deletingItem;

    let error;
    if (type === "form") {
      ({ error } = await supabase.from("payment_methods").delete().eq("id", row.id));
      if (!error && selectedForm?.id === row.id) {
        setSelectedForm(null);
        setFormLinks([]);
      }
      await fetchForms();
    } else if (type === "flag") {
      ({ error } = await supabase.from("card_flags").delete().eq("id", row.id));
      await fetchFlags();
      await fetchLinksForSelected();
    } else if (type === "link") {
      ({ error } = await supabase.from("payment_method_flags").delete().eq("id", row.id));
      await fetchLinksForSelected();
    }

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Excluído com sucesso!" });
    }

    setIsDeleteDialog(false);
    setDeletingItem(null);
  };

  // ---------- Renders
  const LeftColumn = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Formas de Pagamento</h2>
        <div className="flex gap-2">
          <Button onClick={() => refreshAll()} variant="secondary">
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button onClick={openNewForm} className="gradient-primary text-white">
            <Plus className="w-4 h-4 mr-2" /> Nova Forma
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        <AnimatePresence>
          {forms.map((f) => (
            <motion.div
              key={f.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-effect rounded-xl p-4 border ${selectedForm?.id === f.id ? "border-rose-500" : "border-transparent"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-rose-100">
                    <Layers className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-gray-500">
                      {f.type?.replace("_", " ")} • {f.companies?.name || "Empresa"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEditForm(f)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-red-500" onClick={() => askDelete("form", f)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <Button variant={selectedForm?.id === f.id ? "default" : "outline"} onClick={() => setSelectedForm(f)}>
                  <Link2 className="w-4 h-4 mr-2" />
                  {selectedForm?.id === f.id ? "Vínculos desta forma" : "Ver vínculos"}
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  const MiddleColumn = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Bandeiras</h2>
        <div className="flex gap-2">
          <Button onClick={openNewLink} disabled={!selectedForm}>
            <CreditCard className="w-4 h-4 mr-2" /> Vincular à forma
          </Button>
          <Button onClick={openNewFlag} className="gradient-primary text-white">
            <Plus className="w-4 h-4 mr-2" /> Nova Bandeira
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        <AnimatePresence>
          {flags.map((flag) => (
            <motion.div
              key={flag.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect rounded-xl p-4 border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">{flag.name}</div>
                    <div className="text-xs text-gray-500">
                      {flag.companies?.name || "Empresa"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEditFlag(flag)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-red-500" onClick={() => askDelete("flag", flag)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  const RightColumn = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">
          Vínculos {selectedForm ? `• ${selectedForm.name}` : ""}
        </h2>
        <Button onClick={openNewLink} disabled={!selectedForm}>
          <Link2 className="w-4 h-4 mr-2" /> Novo Vínculo
        </Button>
      </div>

      {!selectedForm ? (
        <div className="text-sm text-gray-500">Selecione uma forma para visualizar os vínculos.</div>
      ) : (
        <div className="grid gap-3">
          {formLinks.length === 0 && (
            <div className="text-sm text-gray-500">Nenhuma bandeira vinculada.</div>
          )}

          <AnimatePresence>
            {formLinks.map((l) => (
              <motion.div
                key={l.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-effect rounded-xl p-4 border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{l.card_flags?.name}</div>
                    <div className="text-xs text-gray-500">
                      {selectedForm?.companies?.name || "Empresa"}
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="inline-flex items-center mr-4">
                        <CalendarDays className="w-4 h-4 mr-1" /> {l.days_to_receive} dias
                      </span>
                      <span className="inline-flex items-center">
                        <Percent className="w-4 h-4 mr-1" /> {Number(l.fee_percent || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEditLink(l)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-500" onClick={() => askDelete("link", l)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Formas de Pagamento & Bandeiras</h1>
        <Button variant="secondary" onClick={refreshAll}>
          <RefreshCw className="w-4 h-4 mr-2" /> Sincronizar
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Carregando…</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <LeftColumn />
          <MiddleColumn />
          <RightColumn />
        </div>
      )}

      {/* ---- Dialog: Forma ---- */}
      <Dialog open={isFormDialog} onOpenChange={setIsFormDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingForm ? "Editar Forma" : "Nova Forma"}</DialogTitle>
            <DialogDescription>Configure a forma de pagamento.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="company_id">Empresa</Label>
              <select
                id="company_id"
                className="w-full px-3 py-2 rounded-md border border-gray-300"
                value={formData.company_id}
                onChange={(e) => setFormData((p) => ({ ...p, company_id: e.target.value }))}
              >
                <option value="">Selecione</option>
                {allowedCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome da forma</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex.: Dinheiro, Cartão de Crédito…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                className="w-full px-3 py-2 rounded-md border border-gray-300"
                value={formData.type}
                onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao_credito">Cartão de Crédito</option>
                <option value="cartao_debito">Cartão de Débito</option>
                <option value="pix">PIX</option>
                <option value="vale">Vale Alimentação</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormDialog(false)}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button onClick={saveForm}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Dialog: Bandeira ---- */}
      <Dialog open={isFlagDialog} onOpenChange={setIsFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFlag ? "Editar Bandeira" : "Nova Bandeira"}</DialogTitle>
            <DialogDescription>Cadastre a bandeira de cartão.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="flag_company_id">Empresa</Label>
              <select
                id="flag_company_id"
                className="w-full px-3 py-2 rounded-md border border-gray-300"
                value={flagData.company_id}
                onChange={(e) => setFlagData((p) => ({ ...p, company_id: e.target.value }))}
              >
                <option value="">Selecione</option>
                {allowedCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flag_name">Nome da bandeira</Label>
              <Input
                id="flag_name"
                value={flagData.name}
                onChange={(e) => setFlagData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex.: Visa, Mastercard, Elo…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFlagDialog(false)}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button onClick={saveFlag}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Dialog: Vínculo ---- */}
      <Dialog open={isLinkDialog} onOpenChange={setIsLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Bandeira à Forma</DialogTitle>
            <DialogDescription>
              Forma selecionada: <strong>{selectedForm?.name || "-"}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="link_flag">Bandeira</Label>
              <select
                id="link_flag"
                className="w-full px-3 py-2 rounded-md border border-gray-300"
                value={linkData.card_flag_id}
                onChange={(e) => setLinkData((p) => ({ ...p, card_flag_id: e.target.value }))}
              >
                <option value="">Selecione</option>
                {flags
                  .filter((f) => f.company_id === selectedForm?.company_id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="link_days">Dias p/ receber</Label>
                <Input
                  id="link_days"
                  type="number"
                  value={linkData.days_to_receive}
                  onChange={(e) =>
                    setLinkData((p) => ({ ...p, days_to_receive: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_fee">% Taxa</Label>
                <Input
                  id="link_fee"
                  type="number"
                  step="0.01"
                  value={linkData.fee_percent}
                  onChange={(e) =>
                    setLinkData((p) => ({ ...p, fee_percent: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialog(false)}>
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button onClick={saveLink}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Alert Delete ---- */}
      <AlertDialog open={isDeleteDialog} onOpenChange={setIsDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.type === "form" && <>Excluir a <b>forma</b> "{deletingItem?.row?.name}"?</>}
              {deletingItem?.type === "flag" && <>Excluir a <b>bandeira</b> "{deletingItem?.row?.name}"?</>}
              {deletingItem?.type === "link" && <>Remover o <b>vínculo</b> com "{deletingItem?.row?.card_flags?.name}"?</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FormasPagamento;
