import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Save, Trash2, Upload, Search, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser } from "@/contexts/UserContext";
import { useOutletContext } from "react-router-dom";

const FornecedoresContent = ({ user, companies }) => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [xmlFile, setXmlFile] = useState(null);
  const [xmlData, setXmlData] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importOptions, setImportOptions] = useState({
    addSupplier: true,
    addProducts: true,
    updateStock: true,
    createPayable: true,
  });

  // 🧠 Sugestão automática de categoria
  const suggestCategory = (name) => {
    const n = name.toLowerCase();
    if (n.includes("carne") || n.includes("frango") || n.includes("bovino")) return "Carnes";
    if (n.includes("pao") || n.includes("pão") || n.includes("hamburguer")) return "Padaria";
    if (n.includes("molho") || n.includes("ketchup") || n.includes("maionese")) return "Molhos";
    if (n.includes("queijo") || n.includes("laticinio")) return "Laticínios";
    if (n.includes("embal") || n.includes("caixa") || n.includes("pote")) return "Embalagens";
    if (n.includes("bebida") || n.includes("refrigerante") || n.includes("suco") || n.includes("cerveja")) return "Bebidas";
    if (n.includes("batata") || n.includes("porcao") || n.includes("porção")) return "Insumos";
    return "Outros";
  };

  const allowedCompanies = React.useMemo(() => {
    if (!user || !companies) return [];
    if (user.is_admin) return companies;
    const userCompanyIds = user.company_ids?.map((uc) => uc.company_id) || [];
    return companies.filter((c) => userCompanyIds.includes(c.id));
  }, [user, companies]);

  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  useEffect(() => {
    if (allowedCompanies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(allowedCompanies[0].id);
    }
  }, [allowedCompanies, selectedCompanyId]);

  const fetchSuppliers = useCallback(async () => {
    if (!selectedCompanyId) {
      setSuppliers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("company_id", selectedCompanyId)
      .order("name", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao buscar fornecedores",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSuppliers(data);
    }
    setLoading(false);
  }, [toast, selectedCompanyId]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // 📦 Leitura XML
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "text/xml") {
      setXmlFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const xmlText = event.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");
        const nfeProc = xmlDoc.getElementsByTagName("nfeProc")[0];
        if (!nfeProc) {
          toast({
            title: "XML inválido",
            description: "O arquivo não parece ser uma NF-e processada.",
            variant: "destructive",
          });
          return;
        }
        const getTagValue = (tagName, parent = xmlDoc) => {
          const tag = parent.getElementsByTagName(tagName)[0];
          return tag ? tag.textContent : null;
        };
        const emit = xmlDoc.getElementsByTagName("emit")[0];
        const ide = xmlDoc.getElementsByTagName("ide")[0];
        const total = xmlDoc.getElementsByTagName("ICMSTot")[0];
        const supplierCNPJ = getTagValue("CNPJ", emit);
        const supplierName = getTagValue("xNome", emit);
        const invoiceNumber = getTagValue("nNF", ide);
        const totalValue = getTagValue("vNF", total);
        const items = Array.from(xmlDoc.getElementsByTagName("det")).map((item) => {
          const name = getTagValue("xProd", item) || "";
          return {
            code: getTagValue("cProd", item),
            name,
            quantity: parseFloat(getTagValue("qCom", item) || 0),
            unit: getTagValue("uCom", item),
            unitPrice: parseFloat(getTagValue("vUnCom", item) || 0),
            totalPrice: parseFloat(getTagValue("vProd", item) || 0),
            category: suggestCategory(name),
          };
        });
        setXmlData({
          supplier: { name: supplierName, cnpj: supplierCNPJ },
          invoice: { number: invoiceNumber, total: parseFloat(totalValue) },
          items,
          factor: 1,
        });
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo XML.",
        variant: "destructive",
      });
    }
  };

  // 🚀 Importar XML
  const handleImportXml = async () => {
    if (!xmlData) {
      toast({
        title: "Sem dados para importar",
        description: "Carregue um arquivo XML primeiro.",
        variant: "destructive",
      });
      return;
    }
    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-xml-nfe", {
        body: { companyId: selectedCompanyId, userId: user.id, xmlData, importOptions },
      });
      if (error || (data && !data.ok && data.message)) {
        throw new Error(data?.message || error?.message || "Erro desconhecido na importação.");
      }
      toast({
        title: "Importação concluída!",
        description: data.message || "Operação realizada com sucesso.",
        variant: "success",
      });
      fetchSuppliers();
      setXmlFile(null);
      setXmlData(null);
    } catch (error) {
      toast({
        title: "Erro na Importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // 🧾 CRUD Fornecedores
  const openModal = (supplier = null) => {
    if (supplier) setEditingSupplier({ ...supplier });
    else setEditingSupplier({ id: null, name: "", cnpj: "", category: "", contact: "" });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingSupplier.name) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    const supplierData = { ...editingSupplier, company_id: selectedCompanyId };
    let result;
    if (supplierData.id) {
      result = await supabase
        .from("suppliers")
        .update(supplierData)
        .eq("id", supplierData.id)
        .select();
    } else {
      const { id, ...insertData } = supplierData;
      result = await supabase.from("suppliers").insert(insertData).select();
    }
    const { data, error } = result;
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: `Fornecedor ${supplierData.id ? "atualizado" : "adicionado"} com sucesso!`,
        variant: "success",
      });
      setIsModalOpen(false);
      setEditingSupplier(null);
      fetchSuppliers();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fornecedor excluído com sucesso!", variant: "success" });
      setSuppliers(suppliers.filter((s) => s.id !== id));
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.cnpj && s.cnpj.includes(searchTerm))
  );

  // 🧱 INTERFACE
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Fornecedores</h1>
        <div className="flex gap-2">
          {/* MODAL IMPORTAÇÃO */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" /> Importar XML
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xl rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-primary text-xl font-semibold">
                  Importar Nota Fiscal (XML)
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
                  Revise, edite unidades e categorias antes de importar.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 flex-1 overflow-y-auto">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Label className="text-sm font-medium">Selecionar arquivo XML</Label>
                  <Input type="file" accept=".xml" onChange={handleFileChange} className="mt-2" />
                </div>

                {xmlData && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm space-y-4">
                    <div>
                      <p>
                        <strong>Fornecedor:</strong> {xmlData.supplier.name} ({xmlData.supplier.cnpj})
                      </p>
                      <p>
                        <strong>Nota Fiscal:</strong> Nº {xmlData.invoice.number} |{" "}
                        <strong>Total:</strong> R$ {xmlData.invoice.total.toFixed(2)}
                      </p>
                    </div>

                    {/* Fator */}
                    <div className="flex items-center gap-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                      <Label className="text-sm font-medium whitespace-nowrap">Fator:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Ex: 0.5 ou 12"
                        className="w-24 text-center"
                        onChange={(e) =>
                          setXmlData((prev) => ({ ...prev, factor: parseFloat(e.target.value || 1) }))
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!xmlData.factor || xmlData.factor === 1) return;
                          const factor = xmlData.factor;
                          setXmlData((prev) => {
                            const newItems = prev.items.map((item) => ({
                              ...item,
                              quantity: item.quantity * factor,
                              unitPrice: item.unitPrice / factor,
                              totalPrice: (item.quantity * factor) * (item.unitPrice / factor),
                            }));
                            return { ...prev, items: newItems };
                          });
                        }}
                      >
                        Aplicar
                      </Button>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        (Use 12 para converter fardos em unidades)
                      </span>
                    </div>

                    {/* Tabela */}
                    <div className="overflow-auto max-h-[360px] rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="w-full text-xs md:text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Produto</th>
                            <th className="px-3 py-2 text-left">Qtd</th>
                            <th className="px-3 py-2 text-left">Unid.</th>
                            <th className="px-3 py-2 text-left">V. Unit</th>
                            <th className="px-3 py-2 text-left">V. Total</th>
                            <th className="px-3 py-2 text-left">Categoria</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {xmlData.items.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/70 transition">
                              <td className="px-3 py-2">{item.name}</td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value || 0);
                                    setXmlData((prev) => {
                                      const items = [...prev.items];
                                      items[i].quantity = val;
                                      items[i].totalPrice = val * items[i].unitPrice;
                                      return { ...prev, items };
                                    });
                                  }}
                                  className="w-16 text-center"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setXmlData((prev) => {
                                      const items = [...prev.items];
                                      items[i].unit = val;
                                      return { ...prev, items };
                                    });
                                  }}
                                  className="w-16 text-center"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value || 0);
                                    setXmlData((prev) => {
                                      const items = [...prev.items];
                                      items[i].unitPrice = val;
                                      items[i].totalPrice = items[i].quantity * val;
                                      return { ...prev, items };
                                    });
                                  }}
                                  className="w-20 text-center"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                R$ {item.totalPrice.toFixed(2)}
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  placeholder="Categoria"
                                  value={item.category}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setXmlData((prev) => {
                                      const items = [...prev.items];
                                      items[i].category = val;
                                      return { ...prev, items };
                                    });
                                  }}
                                  className="w-32"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Opções */}
                    <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      {Object.keys(importOptions).map((key) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={key}
                            checked={importOptions[key]}
                            onCheckedChange={(checked) =>
                              setImportOptions((prev) => ({ ...prev, [key]: checked }))
                            }
                          />
                          <label htmlFor={key} className="text-sm">
                            {key === "addSupplier" && "Cadastrar/Atualizar Fornecedor"}
                            {key === "addProducts" && "Cadastrar/Atualizar Produtos"}
                            {key === "updateStock" && "Atualizar Estoque"}
                            {key === "createPayable" && "Lançar Contas a Pagar"}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer fixo */}
              <DialogFooter className="sticky bottom-0 left-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-3 mt-4">
                <Button onClick={handleImportXml} disabled={!xmlFile || isImporting}>
                  {isImporting ? "Importando..." : "Importar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
          </Button>
        </div>
      </div>

      {/* LISTA DE FORNECEDORES */}
      <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company-select">Empresa</Label>
            <select
              id="company-select"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md bg-gray-50"
            >
              {allowedCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="search-supplier">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="search-supplier"
                placeholder="Buscar por nome ou CNPJ"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABELA PRINCIPAL */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CNPJ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categoria
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-10">
                    Carregando...
                  </td>
                </tr>
              ) : filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((s) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.cnpj}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.category}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openModal(s)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIÇÃO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupplier?.id ? "Editar" : "Novo"} Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Nome do Fornecedor"
              value={editingSupplier?.name || ""}
              onChange={(e) =>
                setEditingSupplier({ ...editingSupplier, name: e.target.value })
              }
            />
            <Input
              placeholder="CNPJ"
              value={editingSupplier?.cnpj || ""}
              onChange={(e) =>
                setEditingSupplier({ ...editingSupplier, cnpj: e.target.value })
              }
            />
            <Input
              placeholder="Categoria"
              value={editingSupplier?.category || ""}
              onChange={(e) =>
                setEditingSupplier({ ...editingSupplier, category: e.target.value })
              }
            />
            <Input
              placeholder="Contato (Telefone/Email)"
              value={editingSupplier?.contact || ""}
              onChange={(e) =>
                setEditingSupplier({ ...editingSupplier, contact: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

const Fornecedores = () => {
  const outletContext = useOutletContext();
  const userContext = useUser();
  const { user, companies } = outletContext || userContext;

  if (!user || !companies) {
    return <div>Carregando dados do usuário...</div>;
  }

  return <FornecedoresContent user={user} companies={companies} />;
};

export default Fornecedores;
