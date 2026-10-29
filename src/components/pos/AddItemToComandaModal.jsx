import React, { useState, useMemo } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import {
  Scissors,
  Package,
  Search,
  Plus,
  Minus,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  Beer,
  X,
  Tag,
  Receipt,
  User,
} from "lucide-react";

export default function AddItemToComandaModal({
  isOpen,
  onClose,
  targetComanda,
  allComandas = [],
  onChangeTargetComanda,
  services = [],
  products = [],
  onAddService,
  onAddProduct,
}) {
  const [activeTab, setActiveTab] = useState("servicos"); // 'servicos' | 'produtos'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [productQuantities, setProductQuantities] = useState({});
  const [lastAddedItem, setLastAddedItem] = useState(null);

  // Comanda selecionada defensiva
  const comanda = targetComanda || allComandas[0] || null;

  // Itens atualmente na comanda para indicar quantidade já lançada
  const comandaServices = Array.isArray(comanda?.services) ? comanda.services : [];
  const comandaProducts = Array.isArray(comanda?.products) ? comanda.products : [];

  // Categorias de Serviços
  const serviceCategories = useMemo(() => {
    const cats = new Set(["all"]);
    services.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats);
  }, [services]);

  // Categorias de Produtos
  const productCategories = useMemo(() => {
    const cats = new Set(["all"]);
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Filtragem de Serviços
  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return services.filter((s) => {
      if (s.active === false) return false;
      const matchesSearch =
        !query ||
        s.name?.toLowerCase().includes(query) ||
        s.category?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query);
      const matchesCategory =
        selectedCategory === "all" || s.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, selectedCategory]);

  // Filtragem de Produtos
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (p.active === false) return false;
      const matchesSearch =
        !query ||
        p.name?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query);
      const matchesCategory =
        selectedCategory === "all" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Quantidade para produto
  const getQuantity = (prodId) => productQuantities[prodId] || 1;
  const setQuantity = (prodId, val) => {
    setProductQuantities((prev) => ({
      ...prev,
      [prodId]: Math.max(1, Math.min(99, val)),
    }));
  };

  // Contagem de quantas vezes um serviço está na comanda
  const getServiceCountInComanda = (serviceName) => {
    return comandaServices.filter(
      (s) => s.name?.toLowerCase() === serviceName?.toLowerCase(),
    ).length;
  };

  // Contagem de quantas unidades de um produto estão na comanda
  const getProductCountInComanda = (prodId, prodName) => {
    const found = comandaProducts.find(
      (p) => p.id === prodId || p.name?.toLowerCase() === prodName?.toLowerCase(),
    );
    return found ? found.quantity || 1 : 0;
  };

  // Subtotal consolidado da comanda
  const currentTotal = useMemo(() => {
    if (!comanda) return 0;
    const servTotal = comandaServices.reduce(
      (acc, s) => acc + Number(s.price || 0),
      0,
    );
    const prodTotal = comandaProducts.reduce(
      (acc, p) =>
        acc +
        Number(
          p.total ||
            Number(p.quantity || 1) * Number(p.unitPrice || p.price || 0),
        ),
      0,
    );
    return servTotal + prodTotal;
  }, [comanda, comandaServices, comandaProducts]);

  const handleIncludeService = (service) => {
    if (!comanda || !onAddService) return;
    onAddService(service, comanda.id);
    setLastAddedItem({
      type: "service",
      name: service.name,
      price: Number(service.price || 0),
    });
    setTimeout(() => setLastAddedItem(null), 3000);
  };

  const handleIncludeProduct = (product) => {
    if (!comanda || !onAddProduct) return;
    const qty = getQuantity(product.id);
    onAddProduct(product, qty, comanda.id);
    setLastAddedItem({
      type: "product",
      name: product.name,
      quantity: qty,
      price: Number(product.price || 0) * qty,
    });
    setTimeout(() => setLastAddedItem(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      size="xl"
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Adicionar Item na Comanda
            </h3>
            <p className="text-xs text-neutral-400">
              Menu Serviços & Produtos do Catálogo
            </p>
          </div>
        </div>
      }
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Resumo da Comanda */}
          <div className="flex items-center gap-3 text-xs w-full sm:w-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl">
              <span className="text-neutral-400">Total na comanda:</span>
              <span className="font-mono font-extrabold text-emerald-400 text-sm">
                R$ {currentTotal.toFixed(2).replace(".", ",")}
              </span>
            </div>
            <span className="text-neutral-500 text-[11px] hidden sm:inline">
              ({comandaServices.length} serviços • {comandaProducts.length} produtos)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="primary"
              onClick={onClose}
              className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-5 text-xs h-9 cursor-pointer"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Concluir Lançamentos
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        {/* BARRA SUPERIOR: IDENTIFICAÇÃO DA COMANDA SELECIONADA */}
        <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-neutral-400">Comanda de:</span>
                <span className="text-sm font-bold text-white truncate">
                  {comanda?.clientName || "Cliente"}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300">
                  #{comanda?.id}
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                Barbeiro responsável:{" "}
                <span className="text-amber-300 font-medium">
                  {comanda?.barberName || "Barbeiro Geral"}
                </span>
              </p>
            </div>
          </div>

          {/* Seletor alternativo se houver outras comandas abertas */}
          {allComandas.length > 1 && onChangeTargetComanda && (
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <span className="text-[11px] text-neutral-400">Trocar comanda:</span>
              <select
                value={comanda?.id || ""}
                onChange={(e) => onChangeTargetComanda(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 text-xs rounded-xl px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {allComandas
                  .filter((c) => c.status !== "paid" && c.status !== "cancelled")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} (#{c.id})
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* FEEDBACK DE ÚLTIMO ITEM ADICIONADO */}
        {lastAddedItem && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-400 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                {lastAddedItem.quantity ? `${lastAddedItem.quantity}x ` : ""}
                <strong>{lastAddedItem.name}</strong> adicionado com sucesso à comanda!
              </span>
            </div>
            <span className="font-mono font-bold">
              + R$ {lastAddedItem.price.toFixed(2).replace(".", ",")}
            </span>
          </div>
        )}

        {/* ABAS: SERVIÇOS E PRODUTOS */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("servicos");
              setSelectedCategory("all");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "servicos"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                : "bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800"
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Serviços</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === "servicos"
                  ? "bg-amber-500/30 text-amber-300"
                  : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {services.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("produtos");
              setSelectedCategory("all");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "produtos"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                : "bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Produtos</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === "produtos"
                  ? "bg-amber-500/30 text-amber-300"
                  : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {products.length}
            </span>
          </button>
        </div>

        {/* BUSCA E FILTROS DE CATEGORIA */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === "servicos"
                  ? "Buscar serviço por nome ou categoria..."
                  : "Buscar produto por nome ou categoria..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-8 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros de Categoria (Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(activeTab === "servicos" ? serviceCategories : productCategories).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-amber-500 text-neutral-950 font-bold"
                      : "bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800"
                  }`}
                >
                  {cat === "all" ? "Todas as Categorias" : cat}
                </button>
              ),
            )}
          </div>
        </div>

        {/* LISTA DE ITENS */}
        <div className="max-h-[360px] overflow-y-auto pr-1 space-y-2">
          {/* TAB 1: SERVIÇOS */}
          {activeTab === "servicos" && (
            <>
              {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredServices.map((service) => {
                    const countInComanda = getServiceCountInComanda(service.name);
                    const sPrice = Number(service.price || 0);

                    return (
                      <div
                        key={service.id}
                        className="p-3 bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 rounded-2xl transition-all duration-200 flex flex-col justify-between gap-2.5 group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-neutral-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                              {service.name}
                            </h4>
                            {countInComanda > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium shrink-0">
                                {countInComanda}x na comanda
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                            {service.category && (
                              <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                                {service.category}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-neutral-500" />
                              {service.durationMinutes || service.duration_minutes || 30} min
                            </span>
                          </div>

                          {service.description && (
                            <p className="text-[11px] text-neutral-500 line-clamp-1">
                              {service.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                          <div>
                            <span className="text-[10px] text-neutral-500 block">
                              Valor
                            </span>
                            <span className="text-xs font-bold font-mono text-emerald-400">
                              R$ {sPrice.toFixed(2).replace(".", ",")}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleIncludeService(service)}
                            className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Incluir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-900/50 border border-neutral-800 rounded-2xl">
                  <Scissors className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
                  <p className="font-semibold text-neutral-300">
                    Nenhum serviço encontrado
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Tente buscar por outro termo ou selecione outra categoria.
                  </p>
                </div>
              )}
            </>
          )}

          {/* TAB 2: PRODUTOS */}
          {activeTab === "produtos" && (
            <>
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredProducts.map((product) => {
                    const countInComanda = getProductCountInComanda(
                      product.id,
                      product.name,
                    );
                    const pPrice = Number(product.price || 0);
                    const stock = product.stock ?? 0;
                    const isOutOfStock = stock <= 0;
                    const qty = getQuantity(product.id);

                    return (
                      <div
                        key={product.id}
                        className="p-3 bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 rounded-2xl transition-all duration-200 flex flex-col justify-between gap-2.5 group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-neutral-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                              {product.name}
                            </h4>
                            {countInComanda > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium shrink-0">
                                {countInComanda}x na comanda
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                            {product.category && (
                              <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 flex items-center gap-1">
                                {product.category === "Bar" ? (
                                  <Beer className="w-2.5 h-2.5 text-amber-400" />
                                ) : (
                                  <Package className="w-2.5 h-2.5 text-blue-400" />
                                )}
                                {product.category}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-medium ${
                                isOutOfStock ? "text-rose-400" : "text-emerald-400/90"
                              }`}
                            >
                              {isOutOfStock ? "Esgotado" : `Estoque: ${stock} un`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 gap-2">
                          <div>
                            <span className="text-[10px] text-neutral-500 block">
                              Unitário
                            </span>
                            <span className="text-xs font-bold font-mono text-emerald-400">
                              R$ {pPrice.toFixed(2).replace(".", ",")}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Controle de quantidade */}
                            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => setQuantity(product.id, qty - 1)}
                                className="w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                                title="Diminuir"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-mono font-bold text-neutral-200">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQuantity(product.id, qty + 1)}
                                className="w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                                title="Aumentar"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => handleIncludeProduct(product)}
                              className={`font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-sm transition-all active:scale-95 ${
                                isOutOfStock
                                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                  : "bg-amber-500 hover:bg-amber-400 text-neutral-950"
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Lançar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-900/50 border border-neutral-800 rounded-2xl">
                  <Package className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
                  <p className="font-semibold text-neutral-300">
                    Nenhum produto encontrado
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Tente buscar por outro termo ou cadastre produtos no menu Serviços & Produtos.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
