import { useState } from "react";
import { barbershopStyles } from "./BarbershopDashboard.styles";
import ServiceCard from "../../components/services/ServiceCard";
import PosProductItem from "../../components/pos/PosProductItem";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Alert from "../../components/ui/Alert"; // 👈 Importa o componente oficial de alerta

const initialProducts = [
  {
    id: "p-1",
    name: "Cerveja IPA Artesanal (Lata 350ml)",
    category: "Bar",
    icon: "🍺",
    costPrice: 8,
    price: 16,
    stock: 18,
    commissionPercent: 5,
    active: true,
  },
  {
    id: "p-2",
    name: "Pomada Modeladora Efeito Matte (50g)",
    category: "Vitrine",
    icon: "🧴",
    costPrice: 20,
    price: 45,
    stock: 6,
    commissionPercent: 15,
    active: true,
  },
  {
    id: "p-3",
    name: "Café Expresso Grão Especial",
    category: "Bar",
    icon: "☕",
    costPrice: 1.5,
    price: 6,
    stock: 40,
    commissionPercent: 0,
    active: true,
  },
];

export default function ServicesAndProductsView({
  services = [],
  onAddService,
  onUpdateService,
  onDeleteService,
}) {
  const [activeTab, setActiveTab] = useState("services");
  const [statusFilter, setStatusFilter] = useState("active");

  const [products, setProducts] = useState(initialProducts);

  // 👇 ESTADO UNIFICADO DE FEEDBACK (Substituindo todos os alerts nativos!)
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

  // 1. SALVAR NOVO SERVIÇO
  const handleSaveNewService = () => {
    if (!newServiceName || !newServicePrice) {
      setFeedbackAlert({
        variant: "warning",
        title: "Atenção",
        message: "Por favor, preencha o nome e o preço do serviço.",
      });
      return;
    }

    const created = {
      id: `s-${Date.now()}`,
      name: newServiceName,
      category: newServiceCategory,
      durationMinutes: Number(newServiceDuration),
      price: Number(newServicePrice),
      commissionPercent: Number(newServiceCommission),
      onlineBooking: true,
      active: true,
      tag: newServiceTag || undefined,
      description: "Serviço cadastrado pelo painel da barbearia.",
    };

    if (onAddService) onAddService(created);

    setIsServiceModalOpen(false);
    setNewServiceName("");
    setNewServicePrice("");
    setNewServiceTag("");

    setFeedbackAlert({
      variant: "success",
      title: "Serviço Cadastrado!",
      message: `O serviço "${created.name}" foi adicionado com sucesso ao catálogo.`,
    });
  };

  // 2. SALVAR EDIÇÃO DE SERVIÇO
  const handleSaveEditService = () => {
    if (!editingService.name || !editingService.price) {
      setFeedbackAlert({
        variant: "warning",
        title: "Atenção",
        message: "O nome e o preço do serviço são obrigatórios.",
      });
      return;
    }

    if (onUpdateService) {
      onUpdateService(editingService);
    }

    const savedName = editingService.name;
    setEditingService(null);

    setFeedbackAlert({
      variant: "success",
      title: "Serviço Atualizado!",
      message: `As alterações do serviço "${savedName}" foram salvas. O histórico passado permanece protegido.`,
    });
  };

  // 3. SALVAR NOVO PRODUTO
  const handleSaveNewProduct = () => {
    if (!newProductName || !newProductPrice) {
      setFeedbackAlert({
        variant: "warning",
        title: "Atenção",
        message: "Informe o nome e o preço de venda do produto.",
      });
      return;
    }

    const created = {
      id: `p-${Date.now()}`,
      name: newProductName,
      category: newProductCategory,
      icon: newProductCategory === "Bar" ? "🍺" : "🧴",
      costPrice: Number(newProductCost || 0),
      price: Number(newProductPrice),
      stock: Number(newProductStock || 10),
      commissionPercent: Number(newProductCommission || 0),
      active: true,
    };

    setProducts((prev) => [created, ...prev]);
    setIsProductModalOpen(false);
    setNewProductName("");
    setNewProductPrice("");
    setNewProductCost("");
    setNewProductStock("");

    setFeedbackAlert({
      variant: "success",
      title: "Produto Cadastrado!",
      message: `O produto "${created.name}" foi adicionado ao estoque do PDV.`,
    });
  };

  // 4. SALVAR EDIÇÃO DE PRODUTO
  const handleSaveEditProduct = () => {
    if (!editingProduct.name || !editingProduct.price) {
      setFeedbackAlert({
        variant: "warning",
        title: "Atenção",
        message: "O nome e o preço do produto são obrigatórios.",
      });
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === editingProduct.id ? editingProduct : p)),
    );

    const savedName = editingProduct.name;
    setEditingProduct(null);

    setFeedbackAlert({
      variant: "success",
      title: "Produto Atualizado!",
      message: `As alterações do produto "${savedName}" foram salvas com sucesso.`,
    });
  };

  // 5. CONFIRMAÇÃO DE DESATIVAÇÃO SEGURA (SOFT DELETE COM ALERTA)
  const handleConfirmDeactivate = () => {
    if (!itemToDeactivate) return;
    const itemName = itemToDeactivate.item.name;

    if (itemToDeactivate.type === "service") {
      if (onDeleteService) {
        onDeleteService(itemToDeactivate.item.id);
      }
    } else {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === itemToDeactivate.item.id ? { ...p, active: false } : p,
        ),
      );
    }

    setItemToDeactivate(null);

    // 👇 EXIBE O ALERTA SOLICITADO NO ITEM 3!
    setFeedbackAlert({
      variant: "info",
      title: "Item Desativado do Catálogo",
      message: `O item "${itemName}" foi movido para a aba "Desativados / Histórico". O histórico financeiro passado continua 100% preservado.`,
    });
  };

  // 6. REATIVAÇÃO COM FEEDBACK
  const handleRestoreItem = (item, type) => {
    if (type === "service") {
      if (onUpdateService) {
        onUpdateService({ ...item, active: true });
      }
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, active: true } : p)),
      );
    }

    setFeedbackAlert({
      variant: "success",
      title: "Item Reativado!",
      message: `"${item.name}" voltou a ficar ativo no catálogo de agendamentos e vendas.`,
    });
  };

  const filteredServices = services.filter((s) =>
    statusFilter === "active" ? s.active !== false : s.active === false,
  );

  const filteredProducts = products.filter((p) =>
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
            <span>✂️</span>
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

      {/* 👇 2. ALERTA DINÂMICO NATIVO (SUBSTITUINDO OS ALERTS DO NAVEGADOR) */}
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
            <span>✂️</span>
            <span>
              Serviços ({services.filter((s) => s.active !== false).length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`${barbershopStyles.tabBtn} ${activeTab === "products" ? barbershopStyles.tabActive : barbershopStyles.tabInactive}`}
          >
            <span>🍺</span>
            <span>
              Bar & Vitrine ({products.filter((p) => p.active !== false).length}
              )
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
            placeholder="Ex: Mais Pedido ⭐ ou 15% OFF"
            value={newServiceTag}
            onChange={(e) => setNewServiceTag(e.target.value)}
          />
        </div>
      </Modal>

      {/* MODAL 2: EDITAR SERVIÇO */}
      <Modal
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
        title={`✏️ Editar Serviço: ${editingService?.name}`}
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
              placeholder="Ex: Mais Pedido ⭐"
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
        title={`✏️ Editar Produto: ${editingProduct?.name}`}
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
                "{itemToDeactivate.item.name}"
              </strong>
              ?
            </p>

            <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl text-xs text-red-300 space-y-1.5">
              <p className="font-bold">🛡️ Histórico Contábil Protegido:</p>
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
