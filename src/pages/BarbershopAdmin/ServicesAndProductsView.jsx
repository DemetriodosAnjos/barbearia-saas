import { useState } from "react";
import { barbershopStyles } from "./BarbershopDashboard.styles";
import ServiceCard from "../../components/services/ServiceCard";
import PosProductItem from "../../components/pos/PosProductItem";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";

// Mock inicial de Serviços da Barbearia
const initialServices = [
  {
    id: "s-1",
    name: "Corte Degradê Navalhado",
    description:
      "Acabamento de precisão na navalha, lavagem refrescante e pomada matte inclusa.",
    category: "Cabelo",
    durationMinutes: 40,
    price: 55,
    commissionPercent: 50,
    onlineBooking: true,
    tag: "Mais Pedido ⭐",
  },
  {
    id: "s-2",
    name: "Barboterapia Tradicional",
    description:
      "Toalha quente com óleos essenciais, massagem facial e alinhamento na lâmina.",
    category: "Barba",
    durationMinutes: 30,
    price: 45,
    commissionPercent: 50,
    onlineBooking: true,
  },
  {
    id: "s-3",
    name: "Combo VIP: Cabelo + Barba",
    description:
      "Experiência completa com direito a cerveja artesanal ou café cortesia.",
    category: "Combos",
    durationMinutes: 70,
    price: 90,
    commissionPercent: 45,
    onlineBooking: true,
    tag: "15% OFF",
  },
];

// Mock inicial de Produtos do Bar & Vitrine
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
  },
];

export default function ServicesAndProductsView() {
  const [activeTab, setActiveTab] = useState("services"); // 'services' | 'products'

  const [services, setServices] = useState(initialServices);
  const [products, setProducts] = useState(initialProducts);

  // Estados da Modal de Novo Serviço
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("Cabelo");
  const [newServiceDuration, setNewServiceDuration] = useState("30");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceCommission, setNewServiceCommission] = useState("50");
  const [newServiceTag, setNewServiceTag] = useState("");

  // Estados da Modal de Novo Produto
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Bar");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCost, setNewProductCost] = useState("");
  const [newProductStock, setNewProductStock] = useState("");
  const [newProductCommission, setNewProductCommission] = useState("10");

  // 1. AÇÃO: Cadastrar Novo Serviço
  const handleSaveService = () => {
    if (!newServiceName || !newServicePrice) {
      alert("Informe pelo menos o nome e o preço do serviço.");
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
      tag: newServiceTag || undefined,
      description: "Serviço cadastrado pela gestão da barbearia.",
    };

    setServices((prev) => [created, ...prev]);
    setIsServiceModalOpen(false);
    setNewServiceName("");
    setNewServicePrice("");
    setNewServiceTag("");
    alert(`✂️ Serviço "${created.name}" cadastrado e liberado na agenda!`);
  };

  // 2. AÇÃO: Cadastrar Novo Produto
  const handleSaveProduct = () => {
    if (!newProductName || !newProductPrice) {
      alert("Informe pelo menos o nome e o preço de venda do produto.");
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
    };

    setProducts((prev) => [created, ...prev]);
    setIsProductModalOpen(false);
    setNewProductName("");
    setNewProductPrice("");
    setNewProductStock("");
    alert(`📦 Produto "${created.name}" adicionado ao estoque do PDV!`);
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. CABEÇALHO DA SEÇÃO */}
      <div className={barbershopStyles.viewHeader}>
        <div className={barbershopStyles.titleWrapper}>
          <h1 className={barbershopStyles.viewTitle}>
            <span>✂️</span>
            <span>Catálogo de Serviços & Estoque do PDV</span>
          </h1>
          <p className={barbershopStyles.viewSubtitle}>
            Configure os tempos de cadeira, preços de venda, itens de bar e
            porcentagens de comissão dos barbeiros.
          </p>
        </div>

        {/* Botão de Criação Dinâmico */}
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

      {/* 2. BARRA DE FERRAMENTAS E ABAS */}
      <div className={barbershopStyles.toolbar}>
        {/* Alternador de Abas */}
        <div className={barbershopStyles.tabsWrapper}>
          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={`${barbershopStyles.tabBtn} ${activeTab === "services" ? barbershopStyles.tabActive : barbershopStyles.tabInactive}`}
          >
            <span>✂️</span>
            <span>Serviços de Cadeira ({services.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`${barbershopStyles.tabBtn} ${activeTab === "products" ? barbershopStyles.tabActive : barbershopStyles.tabInactive}`}
          >
            <span>🍺</span>
            <span>Bar & Vitrine ({products.length})</span>
          </button>
        </div>

        <span className="text-xs text-neutral-400">
          {activeTab === "services"
            ? "Serviços ativos na agenda online e no aplicativo do cliente."
            : "Produtos disponíveis para inclusão imediata nas comandas do PDV."}
        </span>
      </div>

      {/* 3. CONTEÚDO DA ABA: SERVIÇOS */}
      {activeTab === "services" && (
        <div className={barbershopStyles.gridList}>
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onToggleSelect={() =>
                alert(`Visualizando ficha de: ${service.name}`)
              }
            />
          ))}
        </div>
      )}

      {/* 4. CONTEÚDO DA ABA: PRODUTOS (BAR & VITRINE) */}
      {activeTab === "products" && (
        <div className={barbershopStyles.gridList}>
          {products.map((prod) => (
            <PosProductItem
              key={prod.id}
              product={prod}
              onAddToCart={() =>
                alert(`Lançar "${prod.name}" em uma comanda aberta.`)
              }
            />
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CADASTRAR NOVO SERVIÇO                         */}
      {/* ======================================================== */}
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
            <Button variant="primary" onClick={handleSaveService}>
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
              helperText="Ex: 50 para rateio de 50%"
            />
          </div>

          <Input
            label="Tag / Selo de Destaque (Opcional)"
            placeholder="Ex: Mais Pedido ⭐ ou 10% OFF"
            value={newServiceTag}
            onChange={(e) => setNewServiceTag(e.target.value)}
          />
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: CADASTRAR NOVO PRODUTO (BAR & VITRINE)         */}
      {/* ======================================================== */}
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
              onClick={handleSaveProduct}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Cadastrar Produto no Estoque
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
            helperText="Ex: 10% para o profissional que oferecer na cadeira."
          />
        </div>
      </Modal>
    </div>
  );
}
