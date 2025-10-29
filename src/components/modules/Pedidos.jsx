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
  ArrowRight,
  CheckCircle2,
  Loader,
  Truck,
  XCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import html2pdf from "html2pdf.js";
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

const Pedidos = ({ user, companies, userCompanyAccess }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("criar");
  const [allowedCompanies, setAllowedCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [sentOrders, setSentOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const pdfRefs = useRef({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  // ===== Empresas acessíveis =====
  useEffect(() => {
    if (user && companies && userCompanyAccess) {
      if (user.is_admin || user.role === "Super Administrador") {
        setAllowedCompanies(companies);
        if (companies.length > 0) setSelectedCompany(companies[0].id);
      } else {
        const userCompanyIds = userCompanyAccess
          .filter((a) => a.user_id === user.id)
          .map((a) => a.company_id);
        const accessible = companies.filter((c) => userCompanyIds.includes(c.id));
        setAllowedCompanies(accessible);
        if (accessible.length > 0) setSelectedCompany(accessible[0].id);
      }
    }
  }, [user, companies, userCompanyAccess]);

  // ===== Buscar categorias =====
  const fetchCategories = useCallback(async () => {
    if (!selectedCompany) return;
    const { data, error } = await supabase.rpc("get_categories_for_company", {
      p_company_id: selectedCompany,
    });
    if (error)
      toast({ title: "Erro ao buscar categorias", variant: "destructive" });
    else setCategories(data);
  }, [selectedCompany, toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ===== Buscar produtos =====
  const fetchProducts = useCallback(async () => {
    if (!selectedCompany || !selectedCategory) {
      setProducts([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*, product_company_access!inner(*)")
      .eq("category_id", selectedCategory)
      .eq("product_company_access.company_id", selectedCompany)
      .eq("is_active", true);
    if (error)
      toast({ title: "Erro ao buscar produtos", variant: "destructive" });
    else setProducts(data);
    setLoading(false);
  }, [selectedCompany, selectedCategory, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ===== Buscar pedidos enviados =====
  const fetchSentOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("supply_orders")
      .select(
        `*, company:company_id (name, phone),
         user:user_id (name),
         supply_order_items (*, products (*, product_categories (name)))`
      )
      .order("created_at", { ascending: false });

    if (!user.is_admin && user.role !== "Super Administrador") {
      const userCompanyIds = userCompanyAccess
        .filter((a) => a.user_id === user.id)
        .map((a) => a.company_id);
      query = query.in("company_id", userCompanyIds);
    }

    const { data, error } = await query;
    if (error) {
      toast({
        title: "Erro ao buscar pedidos enviados",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSentOrders(data);
    }
    setLoading(false);
  }, [toast, user, userCompanyAccess]);

  useEffect(() => {
    if (activeTab === "enviados") fetchSentOrders();
  }, [activeTab, fetchSentOrders]);

  // ===== Criar pedido =====
  const handleSendOrder = async () => {
    if (cart.length === 0 || !selectedCompany) {
      toast({
        title: "Pedido vazio ou empresa não selecionada",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { data: orderData, error: orderError } = await supabase
      .from("supply_orders")
      .insert({
        company_id: selectedCompany,
        user_id: user.id,
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
    } else {
      await supabase
        .from("supply_order_history")
        .insert({ order_id: orderData.id, user_id: user.id, status: "Pendente" });
      toast({ title: "Pedido enviado com sucesso!" });
      setCart([]);
    }
    setLoading(false);
  };

  // ===== Manipular carrinho =====
  const handleQuantityChange = (product, qty) => {
    const quantity = parseFloat(qty) || 0;
    setCart((prev) => {
      const exists = prev.find((i) => i.id === product.id);
      if (exists) {
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
      } else {
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
      }
    });
  };

  const removeFromCart = (id) => setCart(cart.filter((p) => p.id !== id));

  // ===== Agrupar itens =====
  const groupedItems = (items) => {
    if (!items) return {};
    return items.reduce((acc, item) => {
      const cat = item.products?.product_categories?.name || "Sem Categoria";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
  };

  // ===== Tela de criar pedido =====
  const renderCriar = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-card p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold mb-4">1. Selecionar Produtos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium">Empresa</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            >
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
          {products.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center border-b py-2"
            >
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.unit} —{" "}
                  {p.cost_price?.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }) || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  className="w-20 text-center"
                  placeholder="Qtd"
                  onChange={(e) => handleQuantityChange(p, e.target.value)}
                />
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => toast({ title: "Produto adicionado!" })}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl shadow-sm flex flex-col">
        <h2 className="text-xl font-bold mb-4">2. Resumo do Pedido</h2>
        <div className="flex-grow overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <PackageSearch className="w-12 h-12 mb-2" />
              <p>Seu pedido está vazio.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center border-b py-1"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} {item.unit} ×{" "}
                    {(item.unit_cost || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">
                    {(item.total_cost || 0).toLocaleString("pt-BR", {
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
          disabled={cart.length === 0 || loading}
        >
          <Send className="w-4 h-4 mr-2" />
          Enviar Pedido
        </Button>
      </div>
    </div>
  );

  // ===== Pedidos enviados =====
  const renderEnviados = () => (
    <div className="bg-card p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-bold mb-4">Pedidos Enviados</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : sentOrders.length === 0 ? (
        <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
      ) : (
        sentOrders.map((order) => {
          const config = statusConfig[order.status] || statusConfig.Pendente;
          const Icon = config.icon;
          const grouped = groupedItems(order.supply_order_items);
          const total = order.supply_order_items?.reduce(
            (sum, i) => sum + (i.total_price || 0),
            0
          );

          const generatePDF = () => {
            const element = pdfRefs.current[order.id];
            if (!element) return;
            html2pdf()
              .from(element)
              .set({
                margin: [10, 10, 10, 10],
                filename: `pedido_${order.id}.pdf`,
                html2canvas: { scale: 2 },
                jsPDF: { unit: "mm", format: "a4" },
              })
              .save();
          };

          const openPDF = () => {
            const element = pdfRefs.current[order.id];
            if (!element) return;
            const win = window.open("");
            win.document.write(element.outerHTML);
            win.document.close();
          };

          const sendWhats = () => {
            const phone = order.company?.phone?.replace(/\D/g, "");
            if (!phone) {
              toast({ title: "Telefone não encontrado", variant: "destructive" });
              return;
            }
            const msg = encodeURIComponent(
              `Olá! Segue o pedido de insumos #${order.id} da empresa ${order.company?.name}.`
            );
            window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
          };

          return (
            <div key={order.id} className="border p-4 rounded-lg mb-3">
              <div className="flex justify-between flex-wrap items-center mb-2">
                <div>
                  <p className="font-bold">Pedido #{order.id}</p>
                  <p className="text-sm text-muted-foreground">
                    Empresa: {order.company?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Solicitante: {order.user?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Data: {new Date(order.order_date).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}
                >
                  <Icon className="inline w-3 h-3 mr-1" /> {order.status}
                </span>
              </div>

              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <p className="font-semibold">{cat}</p>
                  <ul className="pl-4 list-disc text-sm text-muted-foreground">
                    {items.map((i) => (
                      <li key={i.id}>
                        {i.products?.name} —{" "}
                        {i.ordered_quantity || i.quantity}{" "}
                        {i.ordered_unit || i.products?.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <p className="text-right font-bold mt-2">
                Total:{" "}
                {total?.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={generatePDF}>
                  <FileText className="w-4 h-4 mr-2" /> PDF
                </Button>
                <Button size="sm" variant="outline" onClick={openPDF}>
                  <Eye className="w-4 h-4 mr-2" /> Abrir
                </Button>
                <Button
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={sendWhats}
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setOrderToDelete(order.id);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remover
                </Button>
              </div>

              {/* PDF oculto */}
              <div ref={(el) => (pdfRefs.current[order.id] = el)} className="hidden">
                <h2>Pedido #{order.id}</h2>
                <p>Empresa: {order.company?.name}</p>
                <p>Solicitante: {order.user?.name}</p>
                <hr />
                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <h3>{cat}</h3>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th align="left">Produto</th>
                          <th align="right">Qtd</th>
                          <th align="right">Vl. Unit.</th>
                          <th align="right">Vl. Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((i) => (
                          <tr key={i.id}>
                            <td>{i.products?.name}</td>
                            <td align="right">{i.ordered_quantity || i.quantity}</td>
                            <td align="right">
                              {(i.unit_price || 0).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                            <td align="right">
                              {(i.total_price || 0).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                <hr />
                <p className="font-bold text-right mt-2">
                  Valor Total:{" "}
                  {total?.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("criar")}
            className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-t-lg ${
              activeTab === "criar"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            <ShoppingCart className="w-5 h-5" /> Criar Pedido
          </button>
          <button
            onClick={() => setActiveTab("enviados")}
            className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-t-lg ${
              activeTab === "enviados"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            <List className="w-5 h-5" /> Pedidos Enviados
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
