import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  Search,
  Edit,
  Package,
  DollarSign,
  Image as ImageIcon,
  Info,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EMPTY_FORM = {
  name: "",
  is_active: true,
  category_id: null,
  unit: "UN",
  cost_price: "",
  sale_price: "",
  sale_price_1: "",
  sale_price_2: "",
  sale_price_3: "",
  active_price: 1,
  custom_code: "",
  description: "",
  image_url: "",
  min_stock: "",
  current_stock: "",
  storage_location: "",
  recipe_cost: 0,
  show_in_pdv: true,
  input_unit: "",
  conversion_factor: "",
  company_id: null,
};

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
};

const parseNumeric = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = parseFloat(String(value).replace(",", "."));
  return Number.isNaN(num) ? null : num;
};

const buildFormDataFromProduct = (product) => {
  const primarySalePrice =
    product?.sale_price_1 ?? product?.sale_price ?? "";

  return {
    ...EMPTY_FORM,
    ...product,
    sale_price: normalizeNumber(primarySalePrice),
    sale_price_1: normalizeNumber(primarySalePrice),
    sale_price_2: normalizeNumber(product?.sale_price_2),
    sale_price_3: normalizeNumber(product?.sale_price_3),
    cost_price: normalizeNumber(product?.cost_price),
    min_stock: normalizeNumber(product?.min_stock),
    current_stock: normalizeNumber(product?.current_stock),
    recipe_cost: normalizeNumber(product?.recipe_cost ?? 0),
    conversion_factor: normalizeNumber(product?.conversion_factor),
  };
};

const ProductForm = ({
  product,
  onSaveSuccess,
  onCancel,
  companies = [],
  categories = [],
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("geral");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedCompanies, setSelectedCompanies] = useState(new Set());

  useEffect(() => {
    if (product) {
      setFormData(buildFormDataFromProduct(product));
      setSelectedCompanies(new Set(product.company_access || []));
      return;
    }

    setFormData({
      ...EMPTY_FORM,
      company_id: companies?.[0]?.id ?? null,
    });
    setSelectedCompanies(new Set((companies || []).map((c) => c.id)));
  }, [product, companies]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCompanySelection = (companyId) => {
    setSelectedCompanies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!formData.name?.trim() || selectedCompanies.size === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e ao menos uma empresa são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const selectedCompanyIds = Array.from(selectedCompanies);
      const ownerCompanyId =
        formData.company_id || selectedCompanyIds[0] || null;

      const primarySalePrice = parseNumeric(formData.sale_price);

      const dataToSave = {
        name: formData.name?.trim(),
        is_active: !!formData.is_active,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        unit: formData.unit || "UN",
        cost_price: parseNumeric(formData.cost_price),
        sale_price: primarySalePrice,
        sale_price_1: primarySalePrice,
        sale_price_2: parseNumeric(formData.sale_price_2),
        sale_price_3: parseNumeric(formData.sale_price_3),
        active_price: formData.active_price ? Number(formData.active_price) : 1,
        custom_code: formData.custom_code || "",
        description: formData.description || "",
        image_url: formData.image_url || "",
        min_stock: parseNumeric(formData.min_stock),
        current_stock: parseNumeric(formData.current_stock),
        storage_location: formData.storage_location || "",
        recipe_cost: parseNumeric(formData.recipe_cost) ?? 0,
        show_in_pdv: !!formData.show_in_pdv,
        input_unit: formData.input_unit || null,
        conversion_factor: parseNumeric(formData.conversion_factor),
        company_id: ownerCompanyId,
      };

      let savedProduct;
      let saveError;

      if (product?.id) {
        const response = await supabase
          .from("products")
          .update(dataToSave)
          .eq("id", product.id)
          .select("*")
          .single();

        savedProduct = response.data;
        saveError = response.error;
      } else {
        const response = await supabase
          .from("products")
          .insert(dataToSave)
          .select("*")
          .single();

        savedProduct = response.data;
        saveError = response.error;
      }

      if (saveError) {
        throw saveError;
      }

      const { error: deleteAccessError } = await supabase
        .from("product_company_access")
        .delete()
        .eq("product_id", savedProduct.id);

      if (deleteAccessError) {
        throw deleteAccessError;
      }

      const accessData = selectedCompanyIds.map((company_id) => ({
        product_id: savedProduct.id,
        company_id,
      }));

      if (accessData.length > 0) {
        const { error: accessError } = await supabase
          .from("product_company_access")
          .insert(accessData);

        if (accessError) {
          throw accessError;
        }
      }

      toast({
        title: `Produto ${product ? "atualizado" : "criado"} com sucesso!`,
      });

      onSaveSuccess();
    } catch (error) {
      toast({
        title: "Erro ao salvar produto",
        description: error?.message || "Erro desconhecido ao salvar produto.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-4xl h-full sm:h-auto sm:max-h-[90vh]">
      <DialogHeader>
        <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col h-full overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-grow flex flex-col overflow-hidden"
        >
          <TabsList className="shrink-0">
            <TabsTrigger value="geral">
              <Info className="w-4 h-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="preco">
              <DollarSign className="w-4 h-4 mr-2" />
              Preços
            </TabsTrigger>
            <TabsTrigger value="estoque">
              <Package className="w-4 h-4 mr-2" />
              Estoque
            </TabsTrigger>
            <TabsTrigger value="visual">
              <ImageIcon className="w-4 h-4 mr-2" />
              Visual
            </TabsTrigger>
          </TabsList>

          <div className="flex-grow overflow-y-auto p-1 pr-4 mt-2">
            <TabsContent value="geral" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Categoria</Label>
                <select
                  id="category_id"
                  value={formData.category_id || ""}
                  onChange={(e) =>
                    handleInputChange("category_id", e.target.value || null)
                  }
                  className="w-full p-2 border rounded bg-background"
                >
                  <option value="">Sem Categoria</option>
                  {(categories || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Empresas</Label>
                <div className="p-3 border rounded-md max-h-40 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(companies || []).map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`comp-${c.id}`}
                        checked={selectedCompanies.has(c.id)}
                        onCheckedChange={() => handleCompanySelection(c.id)}
                      />
                      <Label htmlFor={`comp-${c.id}`}>{c.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active"
                    checked={!!formData.is_active}
                    onCheckedChange={(checked) =>
                      handleInputChange("is_active", !!checked)
                    }
                  />
                  <Label htmlFor="is_active">Ativo</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show_in_pdv"
                    checked={!!formData.show_in_pdv}
                    onCheckedChange={(checked) =>
                      handleInputChange("show_in_pdv", !!checked)
                    }
                  />
                  <Label htmlFor="show_in_pdv">Visível no PDV</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preco" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Preço de Custo</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => handleInputChange("cost_price", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sale_price">Preço de Venda 1</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    value={formData.sale_price}
                    onChange={(e) => handleInputChange("sale_price", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sale_price_2">Preço de Venda 2</Label>
                  <Input
                    id="sale_price_2"
                    type="number"
                    step="0.01"
                    value={formData.sale_price_2}
                    onChange={(e) => handleInputChange("sale_price_2", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sale_price_3">Preço de Venda 3</Label>
                  <Input
                    id="sale_price_3"
                    type="number"
                    step="0.01"
                    value={formData.sale_price_3}
                    onChange={(e) => handleInputChange("sale_price_3", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="estoque" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade de Estoque</Label>
                  <Input
                    id="unit"
                    value={formData.unit || ""}
                    onChange={(e) => handleInputChange("unit", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom_code">Código/SKU</Label>
                  <Input
                    id="custom_code"
                    value={formData.custom_code || ""}
                    onChange={(e) =>
                      handleInputChange("custom_code", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_stock">Estoque Mínimo</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    step="0.01"
                    value={formData.min_stock}
                    onChange={(e) => handleInputChange("min_stock", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_stock">Estoque Atual</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    step="0.01"
                    value={formData.current_stock}
                    onChange={(e) =>
                      handleInputChange("current_stock", e.target.value)
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="visual" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <DialogFooter className="mt-4 shrink-0">
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        </DialogClose>

        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

const ProductCard = ({ product, onEdit }) => {
  const primarySalePrice =
    product.sale_price_1 ?? product.sale_price ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="rounded-xl overflow-hidden shadow-lg bg-card border border-border group relative"
    >
      <div className="h-40 bg-muted flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="w-12 h-12 text-muted-foreground" />
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg truncate" title={product.name}>
          {product.name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {product.category_name || "Sem Categoria"}
        </p>

        <div className="flex justify-between items-center mt-3">
          <div className="text-sm">
            <p className="text-red-500">
              C: R$ {parseFloat(product.cost_price || 0).toFixed(2)}
            </p>
            <p className="text-green-500 font-semibold">
              V1: R$ {parseFloat(primarySalePrice || 0).toFixed(2)}
            </p>
            {!!product.sale_price_2 && (
              <p className="text-blue-500 font-semibold">
                V2: R$ {parseFloat(product.sale_price_2).toFixed(2)}
              </p>
            )}
            {!!product.sale_price_3 && (
              <p className="text-purple-500 font-semibold">
                V3: R$ {parseFloat(product.sale_price_3).toFixed(2)}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-sm text-muted-foreground">Estoque</p>
            <p className="font-bold text-lg">
              {parseFloat(product.current_stock || 0)}
              <span className="text-xs ml-1">{product.unit}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="secondary"
          className="h-8 w-8"
          onClick={() => onEdit(product)}
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>

      <div
        className={`absolute top-2 left-2 px-2 py-1 text-xs rounded-full ${
          product.is_active
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {product.is_active ? "Ativo" : "Inativo"}
      </div>
    </motion.div>
  );
};

const ProdutosV2Tab = () => {
  const { toast } = useToast();
  useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [
        productsResponse,
        categoriesResponse,
        companiesResponse,
        accessResponse,
      ] = await Promise.all([
        supabase.from("products").select("*").order("name", { ascending: true }),
        supabase
          .from("product_categories")
          .select("id, name, show_in_pdv, created_at")
          .order("name", { ascending: true }),
        supabase.from("companies").select("id, name").order("name", { ascending: true }),
        supabase.from("product_company_access").select("product_id, company_id"),
      ]);

      if (productsResponse.error) throw productsResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;
      if (companiesResponse.error) throw companiesResponse.error;
      if (accessResponse.error) throw accessResponse.error;

      const categoriesMap = new Map(
        (categoriesResponse.data || []).map((category) => [category.id, category.name])
      );

      const accessMap = new Map();
      (accessResponse.data || []).forEach((row) => {
        if (!accessMap.has(row.product_id)) {
          accessMap.set(row.product_id, []);
        }
        accessMap.get(row.product_id).push(row.company_id);
      });

      const mergedProducts = (productsResponse.data || []).map((product) => ({
        ...product,
        category_name: categoriesMap.get(product.category_id) || null,
        company_access: accessMap.get(product.id) || [],
      }));

      setProducts(mergedProducts);
      setCategories(categoriesResponse.data || []);
      setCompanies(companiesResponse.data || []);
    } catch (error) {
      toast({
        title: "Erro ao buscar dados",
        description: error?.message || "Erro desconhecido ao carregar produtos.",
        variant: "destructive",
      });
      setProducts([]);
      setCategories([]);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        searchTerm === "" ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "" || String(p.category_id) === String(categoryFilter);

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  const handleOpenForm = (product = null) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingProduct(null);
    setIsFormOpen(false);
  };

  const handleDialogChange = (open) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingProduct(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Cadastro de Produtos V2</h1>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 border rounded-md bg-background w-full sm:w-auto"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={() => handleOpenForm()} className="w-full md:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-muted-foreground">
          Carregando produtos...
        </p>
      ) : (
        <AnimatePresence>
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
          >
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={handleOpenForm}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl border-dashed border-2">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-semibold">Nenhum produto encontrado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente ajustar seus filtros ou cadastre um novo produto.
          </p>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={handleDialogChange}>
        {isFormOpen && (
          <ProductForm
            product={editingProduct}
            onSaveSuccess={() => {
              handleCloseForm();
              fetchData();
            }}
            onCancel={handleCloseForm}
            companies={companies}
            categories={categories}
          />
        )}
      </Dialog>
    </div>
  );
};

export default ProdutosV2Tab;