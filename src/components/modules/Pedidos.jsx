import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  List,
  Trash2,
  Send,
  PackageSearch,
  FileText,
  MessageSquare,
  CheckCircle2,
  Loader,
  Truck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import html2pdf from "html2pdf.js";
import PrintablePedidos from "@/components/modules/PrintablePedidos";
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

const statusConfig = {
  Pendente: { icon: Loader, color: "text-yellow-500", bg: "bg-yellow-100" },
  "Em Separação": { icon: Loader, color: "text-blue-500", bg: "bg-blue-100" },
  Entregue: { icon: Truck, color: "text-green-500", bg: "bg-green-100" },
  Recebido: { icon: CheckCircle2, color: "text-teal-500", bg: "bg-teal-100" },
  Cancelado: { icon: XCircle, color: "text-red-500", bg: "bg-red-100" },
};

const Pedidos = () => {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("criar");

  const [authEmail, setAuthEmail] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [userCompanyAccess, setUserCompanyAccess] = useState([]);
  const [allowedCompanies, setAllowedCompanies] = useState([]);

  const [selectedCompany, setSelectedCompany] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [sentOrders, setSentOrders] = useState([]);

  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);

  const pdfRefs = useRef({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  const loadSessionAndUser = useCallback(async () => {
    try {
      setBootLoading(true);

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      const email = authUser?.email || "";
      setAuthEmail(email);

      if (!email) {
        toast({
          title: "Sessão não encontrada",
          description: "Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { data: appUser, error: userError } = await supabase
        .from("app_users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError || !appUser) {
        toast({
          title: "Usuário não encontrado",
          description: userError?.message || "Não foi possível localizar o usuário.",
          variant: "destructive",
        });
        return;
      }

      setCurrentUser(appUser);

      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .order("name", { ascending: true });

      if (companiesError) {
        toast({
          title: "Erro ao buscar empresas",
          description: companiesError.message,
          variant: "destructive",
        });
        return;
      }

      setCompanies(companiesData || []);

      const userIdCandidates = [appUser.id, appUser.uuid]
        .filter(Boolean)
        .map(String);

      let accessRows = [];
      if (userIdCandidates.length > 0) {
        const { data: accessData, error: accessError } = await supabase
          .from("user_company_access")
          .select("*")
          .or(userIdCandidates.map((id) => `user_id.eq.${id}`).join(","));

        if (accessError) {
          toast({
            title: "Erro ao buscar acessos de empresa",
            description: accessError.message,
            variant: "destructive",
          });
        } else {
          accessRows = accessData || [];
        }
      }

      setUserCompanyAccess(accessRows);
    } catch (error) {
      toast({
        title: "Erro ao iniciar módulo de pedidos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBootLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSessionAndUser();
  }, [loadSessionAndUser]);

  useEffect(() => {
    if (!currentUser || companies.length === 0) return;

    if (currentUser.is_admin || currentUser.role === "Super Administrador") {
      setAllowedCompanies(companies);
      if (companies.length > 0 && !selectedCompany) {
        setSelectedCompany(String(companies[0].id));
      }
      return;
    }

    const allowedCompanyUuids = new Set(
      (userCompanyAccess || []).map((a) => String(a.company_id))
    );

    const filtered = companies.filter((company) =>
      allowedCompanyUuids.has(String(company.uuid))
    );

    setAllowedCompanies(filtered);

    if (filtered.length > 0 && !selectedCompany) {
      setSelectedCompany(String(filtered[0].id));
    }
  }, [currentUser, companies, userCompanyAccess, selectedCompany]);

  const fetchCategories = useCallback(async () => {
    if (!selectedCompany) return;

    const companyId = Number(selectedCompany);

    const { data, error } = await supabase.rpc("get_categories_for_company", {
      p_company_id: companyId,
    });

    if (error) {
      toast({
        title: "Erro ao buscar categorias",
        description: error.message,
        variant: "destructive",
      });
      setCategories([]);
    } else {
      setCategories(data || []);
    }
  }, [selectedCompany, toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const fetchProducts = useCallback(async () => {
    if (!selectedCompany || !selectedCategory) {
      setProducts([]);
      return;
    }

    setLoading(true);

    const companyId = Number(selectedCompany);
    const categoryId = Number(selectedCategory);

    const { data, error } = await supabase
      .from("products")
      .select("*, product_company_access!inner(*)")
      .eq("category_id", categoryId)
      .eq("product_company_access.company_id", companyId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao buscar produtos",
        description: error.message,
        variant: "destructive",
      });
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }, [selectedCompany, selectedCategory, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const fetchSentOrders = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);

    let query = supabase
      .from("supply_orders")
      .select(
        `
          *,
          company:company_id (id, name, cnpj, address, phone),
          user:user_id (id, name),
          supply_order_items (
            *,
            products (
              *,
              product_categories (name)
            )
          )
        `
      )
      .order("created_at", { ascending: false });

    if (!currentUser.is_admin && currentUser.role !== "Super Administrador") {
      const allowedIds = allowedCompanies.map((c) => c.id);
      if (allowedIds.length > 0) {
        query = query.in("company_id", allowedIds);
      } else {
        setSentOrders([]);
        setLoading(false);
        return;
      }
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Erro ao buscar pedidos enviados",
        description: error.message,
        variant: "destructive",
      });
      setSentOrders([]);
    } else {
      setSentOrders(data || []);
    }

    setLoading(false);
  }, [toast, currentUser, allowedCompanies]);

  useEffect(() => {
    if (activeTab === "enviados") {
      fetchSentOrders();
    }
  }, [activeTab, fetchSentOrders]);

  const handleQuantityChange = (product, qty) => {
    const quantity = parseFloat(qty) || 0;

    setCart((prev) => {
      const exists = prev.find((i) => i.id === product.id);

      if (exists) {
        if (quantity <= 0) {
          return prev.filter((i) => i.id !== product.id);
        }

        return prev.map((i) =>
          i.id === product.id
            ? {
                ...i,
                quantity,
                ordered_quantity: quantity,
                total_cost: quantity * (i.unit_cost || 0),
              }
            : i
        );
      }

      if (quantity <= 0) return prev;

      return [
        ...prev,
        {
          ...product,
          quantity,
          ordered_quantity: quantity,
          unit_cost: product.cost_price || 0,
          total_cost: quantity * (product.cost_price || 0),
          ordered_unit: product.unit,
        },
      ];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSendOrder = async () => {
    if (!currentUser) {
      toast({
        title: "Usuário não carregado",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0 || !selectedCompany) {
      toast({
        title: "Pedido vazio ou empresa não selecionada",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const companyId = Number(selectedCompany);

    const { data: orderData, error: orderError } = await supabase
      .from("supply_orders")
      .insert({
        company_id: companyId,
        user_id: currentUser.id,
        order_date: orderDate,
        status: "Pendente",
      })
      .select()
      .single();

    if (orderError) {
      toast({
        title: "Erro ao criar pedido",
        description: orderError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const orderItems = cart.map((item) => ({
      order_id: orderData.id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.unit_cost,
      total_price: item.total_cost,
      ordered_unit: item.ordered_unit,
      ordered_quantity: item.ordered_quantity,
    }));

    const { error: itemsError } = await supabase
      .from("supply_order_items")
      .insert(orderItems);

    if (itemsError) {
      toast({
        title: "Erro ao adicionar itens",
        description: itemsError.message,
        variant: "destructive",
      });

      await supabase.from("supply_orders").delete().eq("id", orderData.id);
      setLoading(false);
      return;
    }

    await supabase.from("supply_order_history").insert({
      order_id: orderData.id,
      user_id: currentUser.id,
      status: "Pendente",
    });

    toast({ title: "Pedido enviado com sucesso!" });
    setCart([]);
    setSelectedCategory("");
    setProducts([]);
    setLoading(false);
  };

  const generateAndUploadPDF = async (order) => {
    const element = pdfRefs.current[order.id];
    if (!element) return null;

    try {
      const opt = {
        margin: [10, 10, 15, 10],
        filename: `pedido_${order.id}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      const pdfBlob = await html2pdf().from(element).set(opt).output("blob");

      const filePath = `pedidos/pedido_${order.id}.pdf`;

      const { error } = await supabase.storage
        .from("documentos")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage.from("documentos").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      toast({
        title: "Erro ao enviar PDF",
        description: err.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const sendWhats = async (order) => {
    const phone = order.company?.phone?.replace(/\D/g, "");

    if (!phone) {
      toast({
        title: "Telefone não encontrado",
        variant: "destructive",
      });
      return;
    }

    const pdfUrl = await generateAndUploadPDF(order);
    if (!pdfUrl) return;

    const resumo = order.supply_order_items
      ?.slice(0, 5)
      .map(
        (i) =>
          `${i.products?.name} (${i.ordered_quantity || i.quantity} ${
            i.ordered_unit || i.products?.unit
          })`
      )
      .join(", ");

    const total = order.supply_order_items?.reduce(
      (sum, i) => sum + (i.total_price || 0),
      0
    );

    const msg = encodeURIComponent(
      `Olá! Segue o pedido de insumos #${order.id} da empresa ${order.company?.name}.\n\n🧾 Resumo do Pedido:\n${resumo}${
        order.supply_order_items.length > 5 ? ", ..." : ""
      }\n\n💰 Total: ${total?.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}\n📎 PDF: ${pdfUrl}`
    );

    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const viewPDF = (order) => {
    const element = pdfRefs.current[order.id];
    if (!element) return;

    html2pdf()
      .from(element)
      .set({
        margin: [10, 10, 15, 10],
        filename: `pedido_${order.id}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .toPdf()
      .get("pdf")
      .then((pdf) => {
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);

        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 8, {
            align: "center",
          });
        }

        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);

        const newWindow = window.open("", "_blank");
        newWindow.document.write(`
          <html>
            <head>
              <title>Pedido #${order.id}</title>
              <style>
                body {
                  margin: 0;
                  background: #f0f0f0;
                  font-family: Arial, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                }
                .toolbar {
                  display: flex;
                  gap: 10px;
                  justify-content: center;
                  margin: 10px;
                }
                button {
                  background-color: #C8102E;
                  color: white;
                  border: none;
                  padding: 8px 18px;
                  font-size: 13px;
                  border-radius: 6px;
                  cursor: pointer;
                }
                iframe {
                  width: 100%;
                  height: 94vh;
                  border: none;
                  background: white;
                }
              </style>
            </head>
            <body>
              <div class="toolbar">
                <button id="downloadBtn">💾 Baixar PDF</button>
                <button id="printBtn">🖨️ Imprimir</button>
              </div>
              <iframe src="${url}" id="pdfFrame"></iframe>
              <script>
                document.getElementById('downloadBtn').addEventListener('click', () => {
                  const a = document.createElement('a');
                  a.href = '${url}';
                  a.download = 'pedido_${order.id}.pdf';
                  a.click();
                });
                document.getElementById('printBtn').addEventListener('click', () => {
                  document.getElementById('pdfFrame').contentWindow.print();
                });
              </script>
            </body>
          </html>
        `);
        newWindow.document.close();
      })
      .catch((err) => {
        toast({
          title: "Erro ao gerar PDF",
          description: err.message,
          variant: "destructive",
        });
      });
  };

  const renderEnviados = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-bold mb-4">Pedidos Enviados</h2>

      {loading ? (
        <p>Carregando...</p>
      ) : sentOrders.length === 0 ? (
        <p className="text-gray-500">Nenhum pedido encontrado.</p>
      ) : (
        sentOrders.map((order) => {
          const config = statusConfig[order.status] || statusConfig.Pendente;
          const Icon = config.icon;
          const total = order.supply_order_items?.reduce(
            (sum, i) => sum + (i.total_price || 0),
            0
          );

          return (
            <div key={order.id} className="border p-4 rounded-lg mb-3">
              <div className="flex justify-between flex-wrap items-center mb-2 gap-3">
                <div>
                  <p className="font-bold">Pedido #{order.id}</p>
                  <p className="text-sm text-gray-500">
                    Empresa: {order.company?.name || "-"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Solicitante: {order.user?.name || authEmail || "-"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Data: {order.order_date
                      ? new Date(order.order_date).toLocaleDateString("pt-BR")
                      : "-"}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}
                >
                  <Icon className="inline w-3 h-3 mr-1" />
                  {order.status}
                </span>
              </div>

              <p className="text-right font-bold mt-2">
                Total:{" "}
                {total?.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => viewPDF(order)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Visualizar PDF
                </Button>

                <Button
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => sendWhats(order)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  WhatsApp (PDF)
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setOrderToDelete(order.id);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              </div>

              <div className="hidden">
                <PrintablePedidos
                  ref={(el) => (pdfRefs.current[order.id] = el)}
                  order={order}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderCriar = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold mb-4">1. Selecionar Produtos</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium">Empresa</label>
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setSelectedCategory("");
                setProducts([]);
                setCart([]);
              }}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="">Selecione uma empresa</option>
              {allowedCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Categoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="">Selecione uma</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p>Carregando...</p>}

        <div className="max-h-96 overflow-y-auto space-y-2">
          {products.map((p) => {
            const cartItem = cart.find((i) => i.id === p.id);

            return (
              <div
                key={p.id}
                className="flex justify-between items-center border-b py-2 gap-4"
              >
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {p.unit} —{" "}
                    {Number(p.cost_price || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    className="w-20 text-center"
                    placeholder="Qtd"
                    value={cartItem?.quantity || ""}
                    onChange={(e) => handleQuantityChange(p, e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col">
        <h2 className="text-xl font-bold mb-4">2. Resumo do Pedido</h2>

        <div className="flex-grow overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <PackageSearch className="w-12 h-12 mb-2" />
              <p>Seu pedido está vazio.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center border-b py-1 gap-3"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} {item.unit} ×{" "}
                    {Number(item.unit_cost || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <p className="font-semibold">
                    {Number(item.total_cost || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>

                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Input
          type="date"
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
          className="mt-4"
        />

        <Button
          onClick={handleSendOrder}
          className="mt-4"
          disabled={cart.length === 0 || loading || !selectedCompany}
        >
          <Send className="w-4 h-4 mr-2" />
          Enviar Pedido
        </Button>
      </div>
    </div>
  );

  if (bootLoading) {
    return (
      <div className="p-6">
        <p>Carregando módulo de pedidos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-gray-500">
            Criação e acompanhamento de pedidos de insumos
          </p>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("criar")}
            className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-t-lg ${
              activeTab === "criar"
                ? "text-orange-600 border-b-2 border-orange-500"
                : "text-gray-500"
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            Criar Pedido
          </button>

          <button
            onClick={() => setActiveTab("enviados")}
            className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-t-lg ${
              activeTab === "enviados"
                ? "text-orange-600 border-b-2 border-orange-500"
                : "text-gray-500"
            }`}
          >
            <List className="w-5 h-5" />
            Pedidos Enviados
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "criar" ? renderCriar() : renderEnviados()}
          </motion.div>
        </AnimatePresence>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é permanente. Deseja excluir o pedido #{orderToDelete}?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await supabase.from("supply_orders").delete().eq("id", orderToDelete);
                toast({ title: "Pedido removido com sucesso!" });
                setSentOrders((prev) => prev.filter((p) => p.id !== orderToDelete));
                setIsDeleteDialogOpen(false);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Pedidos;