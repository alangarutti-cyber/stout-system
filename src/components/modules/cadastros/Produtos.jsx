import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Save, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const moedaInputToNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isNaN(n) ? null : n;
};

const formatMoney = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const Produtos = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [erro, setErro] = useState("");

  const [authEmail, setAuthEmail] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [allowedCompanies, setAllowedCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [editedRows, setEditedRows] = useState({});

  const carregarTudo = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      const email = authUser?.email || "";
      setAuthEmail(email);

      if (!email) {
        setErro("Sessão não encontrada. Faça login novamente.");
        return;
      }

      const { data: appUser, error: userError } = await supabase
        .from("app_users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError || !appUser) {
        setErro(userError?.message || "Usuário não encontrado.");
        return;
      }

      setCurrentUser(appUser);

      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .order("name", { ascending: true });

      if (companiesError) {
        setErro(companiesError.message);
        return;
      }

      const allCompanies = companiesData || [];
      setCompanies(allCompanies);

      let empresasPermitidas = allCompanies;

      if (!appUser.is_admin && appUser.role !== "Super Administrador") {
        const idsUsuario = [appUser.id, appUser.uuid].filter(Boolean).map(String);

        const { data: accessRows, error: accessError } = await supabase
          .from("user_company_access")
          .select("*")
          .or(idsUsuario.map((id) => `user_id.eq.${id}`).join(","));

        if (accessError) {
          setErro(accessError.message);
          return;
        }

        const allowedCompanyUuids = new Set(
          (accessRows || []).map((a) => String(a.company_id))
        );

        empresasPermitidas = allCompanies.filter((c) =>
          allowedCompanyUuids.has(String(c.uuid))
        );
      }

      setAllowedCompanies(empresasPermitidas);

      const allowedCompanyIds = empresasPermitidas.map((c) => c.id);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("product_categories")
        .select("*")
        .order("name", { ascending: true });

      if (categoriesError) {
        setErro(categoriesError.message);
        return;
      }

      setCategories(categoriesData || []);

      let productQuery = supabase
        .from("products")
        .select(`
          *,
          product_categories(name),
          product_company_access(company_id)
        `)
        .order("name", { ascending: true });

      const { data: productsData, error: productsError } = await productQuery;

      if (productsError) {
        setErro(productsError.message);
        return;
      }

      const normalizedProducts = (productsData || [])
        .map((p) => ({
          ...p,
          company_access: (p.product_company_access || []).map((x) => x.company_id),
        }))
        .filter((p) => {
          if (appUser.is_admin || appUser.role === "Super Administrador") return true;
          return p.company_access.some((companyId) => allowedCompanyIds.includes(companyId));
        });

      setProducts(normalizedProducts);

      const initialEdited = {};
      normalizedProducts.forEach((p) => {
        initialEdited[p.id] = {
          cost_price: p.cost_price ?? "",
          sale_price: p.sale_price ?? "",
          sale_price_2: p.sale_price_2 ?? "",
          sale_price_3: p.sale_price_3 ?? "",
          is_active: !!p.is_active,
        };
      });
      setEditedRows(initialEdited);
    } catch (e) {
      setErro(e.message || "Erro ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !searchTerm ||
        String(p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.custom_code || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory =
        !categoryFilter || String(p.category_id || "") === String(categoryFilter);

      const matchCompany =
        !companyFilter ||
        (p.company_access || []).includes(Number(companyFilter));

      return matchSearch && matchCategory && matchCompany;
    });
  }, [products, searchTerm, categoryFilter, companyFilter]);

  const handleFieldChange = (productId, field, value) => {
    setEditedRows((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  const handleSaveRow = async (productId) => {
    const row = editedRows[productId];
    if (!row) return;

    try {
      setSavingId(productId);

      const payload = {
        cost_price: moedaInputToNumber(row.cost_price),
        sale_price: moedaInputToNumber(row.sale_price),
        sale_price_2: moedaInputToNumber(row.sale_price_2),
        sale_price_3: moedaInputToNumber(row.sale_price_3),
        is_active: !!row.is_active,
      };

      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", productId);

      if (error) {
        toast({
          title: "Erro ao salvar produto",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                ...payload,
              }
            : p
        )
      );

      toast({
        title: "Produto atualizado",
        description: `Preços salvos com sucesso.`,
      });
    } catch (e) {
      toast({
        title: "Erro ao salvar",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4">Produtos</h1>
        <p>Carregando produtos...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {erro}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-gray-500">
            Ajuste rápido de preços e status dos produtos
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Usuário: {currentUser?.name || authEmail || "-"}
          </p>
        </div>

        <Button variant="outline" onClick={carregarTudo}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-full h-10 px-3 border rounded-md bg-white"
        >
          <option value="">Todas as empresas</option>
          {allowedCompanies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full h-10 px-3 border rounded-md bg-white"
        >
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-auto">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left text-sm font-semibold text-gray-600">Produto</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-600">Categoria</th>
              <th className="p-4 text-left text-sm font-semibold text-gray-600">Empresas</th>
              <th className="p-4 text-right text-sm font-semibold text-gray-600">Custo</th>
              <th className="p-4 text-right text-sm font-semibold text-gray-600">Venda 1</th>
              <th className="p-4 text-right text-sm font-semibold text-gray-600">Venda 2</th>
              <th className="p-4 text-right text-sm font-semibold text-gray-600">Venda 3</th>
              <th className="p-4 text-center text-sm font-semibold text-gray-600">Status</th>
              <th className="p-4 text-center text-sm font-semibold text-gray-600">Salvar</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const row = editedRows[product.id] || {};

                const nomesEmpresas = companies
                  .filter((c) => (product.company_access || []).includes(c.id))
                  .map((c) => c.name)
                  .join(", ");

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500">
                        Código: {product.custom_code || "-"}
                      </div>
                    </td>

                    <td className="p-4 text-sm">
                      {product.product_categories?.name || "Sem categoria"}
                    </td>

                    <td className="p-4 text-sm max-w-[260px]">
                      <div className="truncate" title={nomesEmpresas || "-"}>
                        {nomesEmpresas || "-"}
                      </div>
                    </td>

                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={row.cost_price ?? ""}
                        onChange={(e) =>
                          handleFieldChange(product.id, "cost_price", e.target.value)
                        }
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        Atual: {formatMoney(product.cost_price)}
                      </div>
                    </td>

                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={row.sale_price ?? ""}
                        onChange={(e) =>
                          handleFieldChange(product.id, "sale_price", e.target.value)
                        }
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        Atual: {formatMoney(product.sale_price)}
                      </div>
                    </td>

                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={row.sale_price_2 ?? ""}
                        onChange={(e) =>
                          handleFieldChange(product.id, "sale_price_2", e.target.value)
                        }
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        Atual: {formatMoney(product.sale_price_2)}
                      </div>
                    </td>

                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={row.sale_price_3 ?? ""}
                        onChange={(e) =>
                          handleFieldChange(product.id, "sale_price_3", e.target.value)
                        }
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        Atual: {formatMoney(product.sale_price_3)}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!row.is_active}
                          onChange={(e) =>
                            handleFieldChange(product.id, "is_active", e.target.checked)
                          }
                        />
                        <span
                          className={`text-xs font-semibold ${
                            row.is_active ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {row.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </label>
                    </td>

                    <td className="p-4 text-center">
                      <Button
                        size="sm"
                        onClick={() => handleSaveRow(product.id)}
                        disabled={savingId === product.id}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {savingId === product.id ? "Salvando..." : "Salvar"}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Produtos;