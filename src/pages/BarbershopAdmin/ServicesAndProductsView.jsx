import { useState, useEffect } from "react";
// [Import: cliente Supabase para sincronização real de serviços e produtos no banco]
import { supabase } from "../../lib/supabase";
import { barbershopStyles } from "./BarbershopDashboard.styles";
import ServiceCard from "../../components/services/ServiceCard";
import PosProductItem from "../../components/pos/PosProductItem";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Alert from "../../components/ui/Alert";
import ProjectIcon from "../../components/ui/ProjectIcon";
import { sanitizeClientHtml } from "../../security/sanitizerConfig";

/**
 * Sanitiza e normaliza entradas de texto para evitar Stored & Reflected XSS
 */
function sanitizeTextInput(input, maxLength = 120) {
  if (typeof input !== "string") return "";
  const cleaned = sanitizeClientHtml(input)
    .replace(/[<>'"`;\\]/g, (char) => {
      switch (char) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "'": return "&#39;";
        case '"': return "&quot;";
        case "`": return "&#96;";
        case ";": return "";
        case "\\": return "";
        default: return char;
      }
    })
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Sanitiza e valida números para evitar injeções numéricas, NaN ou valores negativos
 */
function sanitizeNumber(value, min = 0, max = 999999, defaultValue = 0) {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return defaultValue;
  if (num < min) return min;
  if (num > max) return max;
  return Number(num.toFixed(2));
}

export default function ServicesAndProductsView({
  services: initialServices = [],
  onAddService,
  onUpdateService,
  onUpdateServices,
  onDeleteService,
  products: initialProducts = [],
  onAddProduct,
  onUpdateProduct,
  onUpdateProducts,
  onDeleteProduct,
  tenant,
}) {
  const [activeTab, setActiveTab] = useState("services");
  const [statusFilter, setStatusFilter] = useState("active");

  // Estados locais reativos sincronizados com as props e com o Supabase
  const [localServices, setLocalServices] = useState(initialServices);
  const [localProducts, setLocalProducts] = useState(initialProducts);

  useEffect(() => {
    if (initialServices && initialServices.length > 0) {
      setLocalServices(initialServices);
    }
  }, [initialServices]);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setLocalProducts(initialProducts);
    }
  }, [initialProducts]);

  // [Efeito de ciclo de vida: busca o catálogo real de serviços do Supabase]
  useEffect(() => {
    let isMounted = true;
    async function loadServices() {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .order("name");

        if (!error && data && data.length > 0 && isMounted) {
          const mapped = data.map((s) => ({
            id: s.id,
            barbershop_id: s.barbershop_id,
            name: sanitizeTextInput(s.name || "", 80),
            category: s.category || "Cabelo",
            durationMinutes: Number(s.duration_minutes || s.durationMinutes || 30),
            duration_minutes: Number(s.duration_minutes || s.durationMinutes || 30),
            price: sanitizeNumber(s.price, 0.01, 10000, 45),
            commissionPercent: sanitizeNumber(
              s.commission_percent || s.commissionPercent,
              0,
              100,
              50,
            ),
            active: s.active !== false,
            description: s.description || "",
            tag: s.tag || undefined,
          }));
          setLocalServices(mapped);
          if (onUpdateServices) {
            onUpdateServices(mapped);
          }
        }
      } catch (err) {
        console.warn("[ServicesAndProductsView] Aviso ao carregar serviços do Supabase:", err);
      }
    }
    loadServices();
    return () => {
      isMounted = false;
    };
  }, [onUpdateServices]);

  // [Efeito de ciclo de vida: busca o estoque real de produtos no Supabase com tolerância defensiva]
  useEffect(() => {
    let isMounted = true;
    async function loadProducts() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("name");

        if (!error && data && data.length > 0 && isMounted) {
          const mapped = data.map((p) => ({
            id: p.id,
            barbershop_id: p.barbershop_id,
            name: sanitizeTextInput(p.name || "", 80),
            category: p.category === "Vitrine" ? "Vitrine" : "Bar",
            icon: p.category === "Bar" ? "beer" : "product",
            costPrice: sanitizeNumber(p.cost_price, 0, 10000, 0),
            price: sanitizeNumber(p.price, 0, 10000, 0),
            stock: Math.floor(sanitizeNumber(p.stock, 0, 9999, 0)),
            commissionPercent: sanitizeNumber(p.commission_percent, 0, 100, 10),
            active: p.active !== false,
          }));
          setLocalProducts(mapped);
          if (onUpdateProducts) {
            onUpdateProducts(mapped);
          }
        } else if (isMounted && (!initialProducts || initialProducts.length === 0)) {
          // Fallback resiliente com produtos essenciais se o banco estiver vazio
          const fallback = [
            { id: "prod-1", barbershop_id: tenant?.id || "a0000000-0000-0000-0000-000000000001", name: "Pomada Modeladora Efeito Matte 150g", category: "Vitrine", icon: "product", costPrice: 22, price: 45, stock: 24, commissionPercent: 10, active: true },
            { id: "prod-2", barbershop_id: tenant?.id || "a0000000-0000-0000-0000-000000000001", name: "Óleo Hidratante para Barba 30ml", category: "Vitrine", icon: "product", costPrice: 18, price: 38, stock: 15, commissionPercent: 10, active: true },
            { id: "prod-3", barbershop_id: tenant?.id || "a0000000-0000-0000-0000-000000000001", name: "Cerveja Heineken Long Neck 330ml", category: "Bar", icon: "beer", costPrice: 6, price: 12, stock: 48, commissionPercent: 5, active: true },
            { id: "prod-4", barbershop_id: tenant?.id || "a0000000-0000-0000-0000-000000000001", name: "Água Mineral com Gás 500ml", category: "Bar", icon: "beer", costPrice: 2, price: 5, stock: 60, commissionPercent: 5, active: true },
            { id: "prod-5", barbershop_id: tenant?.id || "a0000000-0000-0000-0000-000000000001", name: "Refrigerante Coca-Cola Lata 350ml", category: "Bar", icon: "beer", costPrice: 3.5, price: 7, stock: 36, commissionPercent: 5, active: true },
          ];
          setLocalProducts(fallback);
          if (onUpdateProducts) {
            onUpdateProducts(fallback);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
      }
    }
    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [onUpdateProducts, initialProducts, tenant?.id]);

  // ESTADO UNIFICADO DE FEEDBACK (Substituindo todos os alerts nativos!)
  const [feedbackAlert, setFeedbackAlert] = useState(null); // { variant, title, message }

  // Modais de Criação e Edição
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("Cabelo");
  const [newServiceDuration, setNewServiceDuration] = useState("30");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceCommission, setNewServiceCommission] = useState("50");
  const [newServiceTag, setNewServiceTag] = useState("");

  const [editingService, setEditingService] = useState(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Bar");
  const [newProductCost, setNewProductCost] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductStock, setNewProductStock] = useState("");
  const [newProductCommission, setNewProductCommission] = useState("10");

  const [editingProduct, setEditingProduct] = useState(null);

  // Modal de Desativação Segura
  const [itemToDeactivate, setItemToDeactivate] = useState(null);

  // 1. SALVAR NOVO SERVIÇO COM SANITIZAÇÃO RIGOROSA
  const handleSaveNewService = () => {
    const sanitizedName = sanitizeTextInput(newServiceName, 80);
    const sanitizedTag = newServiceTag ? sanitizeTextInput(newServiceTag, 40) : undefined;
    const allowedCategories = ["Cabelo", "Barba", "Combos", "Tratamentos", "Acabamento"];
    const sanitizedCategory = allowedCategories.includes(newServiceCategory)
      ? newServiceCategory
      : "Cabelo";
    const duration = sanitizeNumber(newServiceDuration, 5, 480, 30);
    const price = sanitizeNumber(newServicePrice, 0.01, 10000, 0);
    const commission = sanitizeNumber(newServiceCommission, 0, 100, 50);

    if (!sanitizedName || price <= 0) {
      setFeedbackAlert({
        variant: "warning",
        title: "Atenção",
        message: "Por favor, preencha um nome válido e o preço positivo do serviço.",
      });
      return;
    }

    const created = {
      id: `s-${Date.now()}`,
      barbershop_id: tenant?.id || "a0000000-0000-0000-0000-000000000001",
      name: sanitizedName,
      category: sanitizedCategory,
      durationMinutes: duration,
      duration_minutes: duration,
      price: price,
      commissionPercent: commission,
      onlineBooking: true,
      active: true,
      tag: sanitizedTag,
      description: "Serviço cadastrado e sanitizado pelo painel da barbearia.",
    };

    setLocalServices((prev) => [created, ...prev]);
    if (onAddService) onAddService(created);

    // [Persistência real no Supabase na tabela services]
    (async () => {
      try {
        await supabase.from("services").insert([
          {
            id: created.id,
            barbershop_id: created.barbershop_id,
            name: created.name,
            category: created.category,
            duration_minutes: created.durationMinutes,
            price: created.price,
            commission_percent: created.commissionPercent,
            active: true,
          },
        ]);
      } catch (err) {
        console.warn("[ServicesAndProductsView] Aviso ao persistir serviço no Supabase:", err);
      }
    })();

    setIsServiceModalOpen(false);
    setNewServiceName("");
    setNewServicePrice("");
    setNewServiceTag("");

    setFeedbackAlert({
      variant: "success",
      title: "Serviço Cadastrado com Segurança!",
      message: `O serviço "${created.name}" foi sanitizado e adicionado com sucesso ao catálogo.`,
    });
  };

  // 2. SALVAR EDIÇÃO DE SERVIÇO COM SANITIZAÇÃO RIGOROSA
  const handleSaveEditService = () => {
    if (!editingService) return;
    const sanitizedName = sanitizeTextInput(editingService.name, 80);
    const sanitizedTag = editingService.tag ? sanitizeTextInput(editingService.tag, 40) : undefined;
    const allowedCategories = ["Cabelo", "Barba", "Combos", "Tratamentos", "Acabamento"];
    const sanitizedCategory = allowedCategories.includes(editingService.category)
      ? editingService.category
      : "Cabelo";
    const duration = sanitizeNumber(editingService.durationMinutes, 5, 480, 30);
    const price = sanitizeNumber(editingService.price, 0.01, 10000, 0);
    const commission = sanitizeNumber(editingService.commissionPercent, 0, 100, 50);

    if (!sanitizedName || price <= 0) {
      setFeedbackAlert({
        variant: "warning",
        title: "Atenção",
        message: "O nome e o preço do serviço são obrigatórios e devem ser válidos.",
      });
      return;
    }

    const updatedService = {
      ...editingService,
      name: sanitizedName,
      category: sanitizedCategory,
      durationMinutes: duration,
      duration_minutes: duration,
      price: price,
      commissionPercent: commission,
      tag: sanitizedTag,
    };

    setLocalServices((prev) =>
      prev.map((s) => (s.id === updatedService.id ? updatedService : s))
    );
    if (onUpdateService) {
      onUpdateService(updatedService);
    }

    // [Persistência real no Supabase na tabela services]
    (async () => {
      try {
        await supabase
          .from("services")
          .update({
            name: updatedService.name,
            category: updatedService.category,
            duration_minutes: updatedService.durationMinutes,
            price: updatedService.price,
            commission_percent: updatedService.commissionPercent,
          })
          .eq("id", updatedService.id);
      } catch (err) {
        console.warn("[ServicesAndProductsView] Aviso ao atualizar serviço no Supabase:", err);
      }
    })();

    setEditingService(null);

    setFeedbackAlert({
      variant: "success",
      title: "Serviço Atualizado com Segurança!",
      message: `As alterações do serviço "${sanitizedName}" foram sanitizadas e salvas.`,
    });
  };

  // [Função assíncrona: persiste o novo produto na tabela products do Supabase com sanitização]
  const handleSaveNewProduct = async () => {
    const sanitizedName = sanitizeTextInput(newProductName, 80);
    const sanitizedCategory = ["Bar", "Vitrine"].includes(newProductCategory)
      ? newProductCategory
      : "Bar";
    const costPrice = sanitizeNumber(newProductCost, 0, 10000, 0);
    const price = sanitizeNumber(newProductPrice, 0.01, 10000, 0);
    const stock = Math.floor(sanitizeNumber(newProductStock, 0, 9999, 10));
    const commission = sanitizeNumber(newProductCommission, 0, 100, 10);

    if (!sanitizedName || price <= 0) {
      setFeedbackAlert({
        variant: "warning",
        title: "Atenção",
        message: "Informe um nome válido e o preço de venda positivo do produto.",
      });
      return;
    }

    const tempId = `prod-${Date.now()}`;
    const productPayload = {
      id: tempId,
      barbershop_id: tenant?.id || "a0000000-0000-0000-0000-000000000001",
      name: sanitizedName,
      category: sanitizedCategory,
      cost_price: costPrice,
      price: price,
      stock: stock,
      commission_percent: commission,
      active: true,
    };

    const created = {
      id: tempId,
      barbershop_id: productPayload.barbershop_id,
      name: sanitizedName,
      category: sanitizedCategory,
      icon: sanitizedCategory === "Bar" ? "beer" : "product",
      costPrice: costPrice,
      price: price,
      stock: stock,
      commissionPercent: commission,
      active: true,
    };

    setLocalProducts((prev) => [created, ...prev]);
    if (onAddProduct) onAddProduct(created);
    if (onUpdateProducts) onUpdateProducts([created, ...localProducts]);

    setIsProductModalOpen(false);
    setNewProductName("");
    setNewProductPrice("");
    setNewProductCost("");
    setNewProductStock("");

    try {
      const { data, error } = await supabase
        .from("products")
        .insert([productPayload])
        .select()
        .single();

      if (!error && data) {
        const official = {
          ...created,
          id: data.id || tempId,
        };
        setLocalProducts((prev) =>
          prev.map((p) => (p.id === tempId ? official : p))
        );
        if (onUpdateProduct) onUpdateProduct(official);
      }
    } catch (err) {
      console.warn("Aviso ao salvar produto no Supabase (mantido em contingência):", err);
    }

    setFeedbackAlert({
      variant: "success",
      title: "Produto Cadastrado com Segurança!",
      message: `O produto "${created.name}" foi sanitizado e adicionado ao estoque do PDV.`,
    });
  };

  // [Função assíncrona: atualiza os dados e estoque do produto com sanitização defensiva]
  const handleSaveEditProduct = async () => {
    if (!editingProduct) return;
    const sanitizedName = sanitizeTextInput(editingProduct.name, 80);
    const sanitizedCategory = ["Bar", "Vitrine"].includes(editingProduct.category)
      ? editingProduct.category
      : "Bar";
    const costPrice = sanitizeNumber(editingProduct.costPrice, 0, 10000, 0);
    const price = sanitizeNumber(editingProduct.price, 0.01, 10000, 0);
    const stock = Math.floor(sanitizeNumber(editingProduct.stock, 0, 9999, 0));
    const commission = sanitizeNumber(editingProduct.commissionPercent, 0, 100, 0);

    if (!sanitizedName || price <= 0) {
      setFeedbackAlert({
        variant: "warning",
        title: "Atenção",
        message: "O nome e o preço do produto são obrigatórios e devem ser válidos.",
      });
      return;
    }

    const updatedProduct = {
      ...editingProduct,
      name: sanitizedName,
      category: sanitizedCategory,
      costPrice: costPrice,
      price: price,
      stock: stock,
      commissionPercent: commission,
    };

    setLocalProducts((prev) =>
      prev.map((p) => (p.id === editingProduct.id ? updatedProduct : p))
    );
    if (onUpdateProduct) onUpdateProduct(updatedProduct);

    setEditingProduct(null);

    try {
      await supabase
        .from("products")
        .update({
          name: sanitizedName,
          category: sanitizedCategory,
          cost_price: costPrice,
          price: price,
          stock: stock,
          commission_percent: commission,
        })
        .eq("id", editingProduct.id);
    } catch (err) {
      console.warn("Aviso ao atualizar produto no Supabase:", err);
    }

    setFeedbackAlert({
      variant: "success",
      title: "Produto Atualizado com Segurança!",
      message: `As alterações do produto "${sanitizedName}" foram sanitizadas e salvas com sucesso.`,
    });
  };

  // [Função assíncrona: soft delete persistido no Supabase mantendo o histórico de vendas intacto]
  const handleConfirmDeactivate = async () => {
    if (!itemToDeactivate) return;
    const targetItem = itemToDeactivate.item;
    const itemName = targetItem.name;

    try {
      if (itemToDeactivate.type === "service") {
        setLocalServices((prev) =>
          prev.map((s) => (s.id === targetItem.id ? { ...s, active: false } : s))
        );
        if (onDeleteService) onDeleteService(targetItem.id);
        if (onUpdateService) onUpdateService({ ...targetItem, active: false });

        await supabase
          .from("services")
          .update({ active: false })
          .eq("id", targetItem.id);
      } else {
        setLocalProducts((prev) =>
          prev.map((p) => (p.id === targetItem.id ? { ...p, active: false } : p))
        );
        if (onDeleteProduct) onDeleteProduct(targetItem.id);
        if (onUpdateProduct) onUpdateProduct({ ...targetItem, active: false });

        await supabase
          .from("products")
          .update({ active: false })
          .eq("id", targetItem.id);
      }

      setItemToDeactivate(null);

      setFeedbackAlert({
        variant: "info",
        title: "Item Desativado do Catálogo",
        message: `O item "${itemName}" foi movido para a aba "Desativados / Histórico". O histórico financeiro passado continua 100% preservado.`,
      });
    } catch (err) {
      console.error("Erro ao desativar item no Supabase:", err);
    }
  };

  // [Função assíncrona: reativa serviço ou produto diretamente no Supabase]
  const handleRestoreItem = async (item, type) => {
    try {
      if (type === "service") {
        setLocalServices((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, active: true } : s))
        );
        if (onUpdateService) onUpdateService({ ...item, active: true });

        await supabase
          .from("services")
          .update({ active: true })
          .eq("id", item.id);
      } else {
        setLocalProducts((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, active: true } : p))
        );
        if (onUpdateProduct) onUpdateProduct({ ...item, active: true });

        await supabase
          .from("products")
          .update({ active: true })
          .eq("id", item.id);
      }

      setFeedbackAlert({
        variant: "success",
        title: "Item Reativado!",
        message: `"${item.name}" voltou a ficar ativo no catálogo de agendamentos e vendas.`,
      });
    } catch (err) {
      console.error("Erro ao reativar item no Supabase:", err);
    }
  };

  const filteredServices = localServices.filter((s) =>
    statusFilter === "active" ? s.active !== false : s.active === false,
  );

  const filteredProducts = localProducts.filter((p) =>
    statusFilter === "active" ? p.active !== false : p.active === false,
  );

  const editCost = Number(editingProduct?.costPrice || 0);
  const editPrice = Number(editingProduct?.price || 0);
  const editProfit = editPrice - editCost;
  const editMarginPercent =
    editCost > 0 ? ((editProfit / editCost) * 100).toFixed(0) : 100;

  return (
    <div className="space-y-6 text-left">
      {/* 1. CABEÇALHO */}
      <div className={barbershopStyles.viewHeader}>
        <div className={barbershopStyles.titleWrapper}>
          <h1 className={barbershopStyles.viewTitle}>
            <ProjectIcon name="Scissors" size={24} colorVariant="amber" />
            <span>Catálogo de Serviços & Estoque do PDV</span>
          </h1>
          <p className={barbershopStyles.viewSubtitle}>
            Configure preços, tempos de cadeira, comissões individuais e
            desative itens com histórico financeiro protegido.
          </p>
        </div>

        {activeTab === "services" ? (
          <Button
            variant="primary"
            onClick={() => setIsServiceModalOpen(true)}
            className="text-xs py-2.5 px-4 font-bold shadow-md self-start sm:self-auto"
          >
            <span>+</span> Novo Serviço
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => setIsProductModalOpen(true)}
            className="text-xs py-2.5 px-4 font-bold shadow-md self-start sm:self-auto bg-emerald-600 hover:bg-emerald-500"
          >
            <span>+</span> Novo Produto
          </Button>
        )}
      </div>

      {/* 2. ALERTA DINÂMICO NATIVO (SUBSTITUINDO OS ALERTS DO NAVEGADOR) */}
      {feedbackAlert && (
        <Alert
          variant={feedbackAlert.variant}
          title={feedbackAlert.title}
          onClose={() => setFeedbackAlert(null)}
        >
          {feedbackAlert.message}
        </Alert>
      )}

      {/* 3. BARRA DE FERRAMENTAS */}
      <div className={barbershopStyles.toolbar}>
        <div className={barbershopStyles.tabsWrapper}>
          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={`${barbershopStyles.tabBtn} ${activeTab === "services" ? barbershopStyles.tabActive : barbershopStyles.tabInactive}`}
          >
            <ProjectIcon name="Scissors" size={15} colorVariant="inherit" className="mr-1.5 inline" />
            <span>
              Serviços ({localServices.filter((s) => s.active !== false).length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`${barbershopStyles.tabBtn} ${activeTab === "products" ? barbershopStyles.tabActive : barbershopStyles.tabInactive}`}
          >
            <ProjectIcon name="Beer" size={15} colorVariant="inherit" className="mr-1.5 inline" />
            <span>
              Bar & Vitrine ({localProducts.filter((p) => p.active !== false).length})
            </span>
          </button>
        </div>

        {/* Filtro de Ativos vs Desativados */}
        <div className="flex items-center gap-2 text-xs bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "active"
                ? "bg-amber-600 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Ativos no Catálogo
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === "inactive"
                ? "bg-red-950 text-red-300 border border-red-800"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Desativados / Histórico
          </button>
        </div>
      </div>

      {/* 4. LISTAGEM DE SERVIÇOS */}
      {activeTab === "services" && (
        <div className={barbershopStyles.gridList}>
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={(s) => setEditingService({ ...s })}
                onDelete={(s) =>
                  setItemToDeactivate({ item: s, type: "service" })
                }
                onRestore={(s) => handleRestoreItem(s, "service")}
              />
            ))
          ) : (
            <div className="col-span-full p-12 text-center text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-3xl">
              Nenhum serviço{" "}
              {statusFilter === "active" ? "ativo" : "desativado"} encontrado.
            </div>
          )}
        </div>
      )}

      {/* 5. LISTAGEM DE PRODUTOS */}
      {activeTab === "products" && (
        <div className={barbershopStyles.gridList}>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((prod) => (
              <PosProductItem
                key={prod.id}
                product={prod}
                onEdit={(p) => setEditingProduct({ ...p })}
                onDelete={(p) =>
                  setItemToDeactivate({ item: p, type: "product" })
                }
                onRestore={(p) => handleRestoreItem(p, "product")}
              />
            ))
          ) : (
            <div className="col-span-full p-12 text-center text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-3xl">
              Nenhum produto{" "}
              {statusFilter === "active" ? "ativo" : "desativado"} encontrado.
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CADASTRAR NOVO SERVIÇO */}
      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title="Cadastrar Novo Serviço de Cadeira"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsServiceModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveNewService}>
              Salvar e Publicar Serviço
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <Input
            label="Nome do Serviço"
            placeholder="Ex: Corte Degradê + Barboterapia"
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Categoria"
              value={newServiceCategory}
              onChange={(e) => setNewServiceCategory(e.target.value)}
              options={[
                { value: "Cabelo", label: "Cabelo" },
                { value: "Barba", label: "Barba" },
                { value: "Combos", label: "Combos" },
                { value: "Tratamentos", label: "Tratamentos" },
                { value: "Acabamento", label: "Acabamento / Sobrancelha" },
              ]}
            />

            <Select
              label="Tempo de Cadeira"
              value={newServiceDuration}
              onChange={(e) => setNewServiceDuration(e.target.value)}
              options={[
                { value: "15", label: "15 minutos" },
                { value: "30", label: "30 minutos" },
                { value: "40", label: "40 minutos" },
                { value: "45", label: "45 minutos" },
                { value: "60", label: "1 hora (60 min)" },
                { value: "90", label: "1h 30min" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço de Venda (R$)"
              type="number"
              placeholder="55.00"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
            />

            <Input
              label="Comissão do Barbeiro (%)"
              type="number"
              placeholder="50"
              value={newServiceCommission}
              onChange={(e) => setNewServiceCommission(e.target.value)}
              helperText="Porcentagem padrão para repasse."
            />
          </div>

          <Input
            label="Tag de Destaque (Opcional)"
            placeholder="Ex: Mais Pedido ou 15% OFF"
            value={newServiceTag}
            onChange={(e) => setNewServiceTag(e.target.value)}
          />
        </div>
      </Modal>

      {/* MODAL 2: EDITAR SERVIÇO */}
      <Modal
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
        title={`Editar Serviço: ${editingService?.name ? sanitizeTextInput(editingService.name, 40) : ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingService(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveEditService}>
              Salvar Alterações
            </Button>
          </>
        }
      >
        {editingService && (
          <div className="space-y-4 text-left">
            <Input
              label="Nome do Serviço"
              value={editingService.name}
              onChange={(e) =>
                setEditingService({ ...editingService, name: e.target.value })
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Categoria"
                value={editingService.category}
                onChange={(e) =>
                  setEditingService({
                    ...editingService,
                    category: e.target.value,
                  })
                }
                options={[
                  { value: "Cabelo", label: "Cabelo" },
                  { value: "Barba", label: "Barba" },
                  { value: "Combos", label: "Combos" },
                  { value: "Tratamentos", label: "Tratamentos" },
                ]}
              />

              <Select
                label="Tempo de Cadeira"
                value={String(editingService.durationMinutes)}
                onChange={(e) =>
                  setEditingService({
                    ...editingService,
                    durationMinutes: Number(e.target.value),
                  })
                }
                options={[
                  { value: "15", label: "15 minutos" },
                  { value: "30", label: "30 minutos" },
                  { value: "40", label: "40 minutos" },
                  { value: "45", label: "45 minutos" },
                  { value: "60", label: "1 hora" },
                  { value: "90", label: "1h 30min" },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Preço de Venda (R$)"
                type="number"
                value={String(editingService.price)}
                onChange={(e) =>
                  setEditingService({
                    ...editingService,
                    price: Number(e.target.value),
                  })
                }
              />

              <Input
                label="Comissão do Barbeiro (%)"
                type="number"
                value={String(editingService.commissionPercent || 50)}
                onChange={(e) =>
                  setEditingService({
                    ...editingService,
                    commissionPercent: Number(e.target.value),
                  })
                }
              />
            </div>

            <Input
              label="Tag de Destaque"
              placeholder="Ex: Mais Pedido"
              value={editingService.tag || ""}
              onChange={(e) =>
                setEditingService({ ...editingService, tag: e.target.value })
              }
            />
          </div>
        )}
      </Modal>

      {/* MODAL 3: CADASTRAR PRODUTO */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Cadastrar Novo Produto de Bar / Vitrine"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsProductModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveNewProduct}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Cadastrar Produto
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <Input
            label="Nome do Produto"
            placeholder="Ex: Cerveja IPA 350ml ou Pomada Efeito Seco"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Destino / Categoria"
              value={newProductCategory}
              onChange={(e) => setNewProductCategory(e.target.value)}
              options={[
                { value: "Bar", label: "Bar / Bebidas & Snacks" },
                { value: "Vitrine", label: "Vitrine / Cosméticos" },
              ]}
            />

            <Input
              label="Quantidade em Estoque"
              type="number"
              placeholder="24"
              value={newProductStock}
              onChange={(e) => setNewProductStock(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço de Custo (R$)"
              type="number"
              placeholder="8.00"
              value={newProductCost}
              onChange={(e) => setNewProductCost(e.target.value)}
            />

            <Input
              label="Preço de Venda (R$)"
              type="number"
              placeholder="16.00"
              value={newProductPrice}
              onChange={(e) => setNewProductPrice(e.target.value)}
            />
          </div>

          <Input
            label="Comissão do Barbeiro na Venda (%)"
            type="number"
            placeholder="10"
            value={newProductCommission}
            onChange={(e) => setNewProductCommission(e.target.value)}
          />
        </div>
      </Modal>

      {/* MODAL 4: EDITAR PRODUTO */}
      <Modal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title={`Editar Produto: ${editingProduct?.name ? sanitizeTextInput(editingProduct.name, 40) : ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingProduct(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveEditProduct}>
              Salvar Alterações
            </Button>
          </>
        }
      >
        {editingProduct && (
          <div className="space-y-4 text-left">
            <Input
              label="Nome do Produto"
              value={editingProduct.name}
              onChange={(e) =>
                setEditingProduct({ ...editingProduct, name: e.target.value })
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Categoria"
                value={editingProduct.category}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    category: e.target.value,
                  })
                }
                options={[
                  { value: "Bar", label: "Bar / Bebidas & Snacks" },
                  { value: "Vitrine", label: "Vitrine / Cosméticos" },
                ]}
              />

              <Input
                label="Quantidade em Estoque"
                type="number"
                value={String(editingProduct.stock)}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    stock: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Preço de Custo (R$)"
                type="number"
                value={String(editingProduct.costPrice || 0)}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    costPrice: Number(e.target.value),
                  })
                }
              />

              <Input
                label="Preço de Venda (R$)"
                type="number"
                value={String(editingProduct.price || 0)}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    price: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-neutral-300">Lucro Bruto por Unidade:</span>
              <div className="text-right">
                <span className="font-mono font-black text-emerald-400 text-sm">
                  R$ {editProfit.toFixed(2)}
                </span>
                <span className="text-[10px] text-neutral-400 block font-semibold">
                  ({editMarginPercent}% de margem)
                </span>
              </div>
            </div>

            <Input
              label="Comissão do Barbeiro (%)"
              type="number"
              value={String(editingProduct.commissionPercent || 0)}
              onChange={(e) =>
                setEditingProduct({
                  ...editingProduct,
                  commissionPercent: Number(e.target.value),
                })
              }
            />
          </div>
        )}
      </Modal>

      {/* MODAL 5: DESATIVAÇÃO SEGURA */}
      <Modal
        isOpen={!!itemToDeactivate}
        size="sm"
        onClose={() => setItemToDeactivate(null)}
        title={
          itemToDeactivate?.type === "service"
            ? "Desativar Serviço"
            : "Desativar Produto"
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setItemToDeactivate(null)}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirmDeactivate}>
              Sim, Desativar do Catálogo
            </Button>
          </>
        }
      >
        {itemToDeactivate && (
          <div className="space-y-3 text-left">
            <p className="text-xs text-neutral-200 leading-relaxed">
              Deseja desativar{" "}
              <strong className="text-white">
                "{sanitizeTextInput(itemToDeactivate.item.name, 50)}"
              </strong>
              ?
            </p>

            <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl text-xs text-red-300 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5"><ProjectIcon name="ShieldCheck" size={14} colorVariant="amber" /><span>Histórico Contábil Protegido:</span></p>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Este item deixará de aparecer para novas vendas e agendamentos,
                mas{" "}
                <strong>
                  todo o histórico financeiro de comandas passadas continuará
                  100% preservado
                </strong>
                .
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
