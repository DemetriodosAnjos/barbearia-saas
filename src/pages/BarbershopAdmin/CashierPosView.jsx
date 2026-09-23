import { useState, useEffect } from "react";
// [Import: cliente Supabase para buscar produtos reais e sincronizar comandas]
import { supabase } from "../../lib/supabase";
import { posStyles } from "./CashierPosView.styles";
import ComandaCard from "../../components/pos/ComandaCard";
import PosProductItem from "../../components/pos/PosProductItem";
import QueueTicket from "../../components/pos/QueueTicket";
import PaymentMethodSelector from "../../components/pos/PaymentMethodSelector";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Alert from "../../components/ui/Alert";

// [Função componente: consome comandas e barbeiros reais da barbearia]
export default function CashierPosView({
  sharedComandas = [],
  onUpdateComandas,
  barbers = [],
  onBack,
}) {
  // [Estados reais: comandas compartilhadas e lista de produtos obtida do Supabase]
  const [comandas, setComandas] = useState(sharedComandas);
  const [waitlist, setWaitlist] = useState([]);
  const [products, setProducts] = useState([]);

  // Sincroniza com as comandas do dashboard global
  useEffect(() => {
    if (sharedComandas && sharedComandas.length > 0) {
      setComandas(sharedComandas);
    }
  }, [sharedComandas]);

  // [Efeito de ciclo de vida: busca catálogo real de produtos no Supabase]
  useEffect(() => {
    let isMounted = true;
    async function loadPosProducts() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("name");

        if (!error && data && isMounted) {
          setProducts(
            data.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category || "Bar",
              icon: p.category === "Bar" ? "🍺" : "🧴",
              price: Number(p.price || 0),
              stock: p.stock || 0,
              commissionPercent: p.commission_percent || 10,
            })),
          );
        }
      } catch (err) {
        console.error("Erro ao carregar produtos do PDV:", err);
      }
    }
    loadPosProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Estados de Liquidação / Pagamento da Comanda
  const [comandaToPay, setComandaToPay] = useState(null);

  // Estados para Adicionar Item Rápido a uma Comanda Aberta
  const [selectedComandaIdForAdd, setSelectedComandaIdForAdd] = useState("");

  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [productToAdd, setProductToAdd] = useState(null);

  // Estados para Abrir Nova Comanda Balcão Avulsa
  const [isNewComandaModalOpen, setIsNewComandaModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  // [Variável: utiliza o primeiro barbeiro cadastrado real da barbearia]
  const [newBarberName, setNewBarberName] = useState(
    barbers[0]?.name || "Barbeiro Geral",
  );

  // Feedback
  const [alertSuccess, setAlertSuccess] = useState("");

  // Cálculos de Caixa
  const openComandasCount = comandas.filter((c) => c.status !== "paid").length;
  const pendingPaymentCount = comandas.filter(
    (c) => c.status === "pending_payment",
  ).length;

  // [Cálculo dinâmico com método reduce: soma o valor real de comandas já liquidadas]
  const totalReceivedToday = comandas
    .filter((c) => c.status === "paid")
    .reduce((acc, cmd) => {
      const servicesTotal = (cmd.services || []).reduce(
        (sum, s) => sum + Number(s.price || 0),
        0,
      );
      const productsTotal = (cmd.products || []).reduce(
        (sum, p) => sum + Number(p.total || 0),
        0,
      );
      return acc + servicesTotal + productsTotal;
    }, 0);

  // 1. AÇÃO: Lançar Produto do Bar em uma Comanda Ativa
  const handleQuickAddProduct = (product) => {
    setProductToAdd(product);
    setIsAddItemModalOpen(true);
  };

  const handleConfirmAddProductToComanda = () => {
    if (!productToAdd || !selectedComandaIdForAdd) return;

    setComandas((prev) =>
      prev.map((cmd) => {
        if (cmd.id !== selectedComandaIdForAdd) return cmd;

        const existingProdIndex = (cmd.products || []).findIndex(
          (p) => p.id === productToAdd.id,
        );
        let updatedProducts;

        if (existingProdIndex >= 0) {
          // Aumenta quantidade
          updatedProducts = cmd.products.map((p, idx) =>
            idx === existingProdIndex
              ? {
                  ...p,
                  quantity: p.quantity + 1,
                  total: (p.quantity + 1) * p.unitPrice,
                  sellerCommission:
                    (p.quantity + 1) *
                    (p.unitPrice *
                      ((productToAdd.commissionPercent || 0) / 100)),
                }
              : p,
          );
        } else {
          // Adiciona novo item
          updatedProducts = [
            ...(cmd.products || []),
            {
              id: productToAdd.id,
              name: productToAdd.name,
              quantity: 1,
              unitPrice: productToAdd.price,
              total: productToAdd.price,
              sellerCommission:
                productToAdd.price *
                ((productToAdd.commissionPercent || 0) / 100),
            },
          ];
        }

        return { ...cmd, products: updatedProducts };
      }),
    );

    setIsAddItemModalOpen(false);
    setAlertSuccess(
      `Item "${productToAdd.name}" lançado na Comanda #${selectedComandaIdForAdd}!`,
    );
    setTimeout(() => setAlertSuccess(""), 4000);
  };

  // 2. AÇÃO: Transformar Ticket da Fila em Comanda Aberta (Iniciar Atendimento)
  const handleStartQueueService = (ticket) => {
    const newCmdId = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newComanda = {
      id: newCmdId,
      clientName: ticket.clientName,
      clientPhone: ticket.phone,
      barberName: "Carlos Silva",
      status: "open",
      openedAt: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      services: [
        {
          id: `s-${Date.now()}`,
          name: ticket.serviceName,
          price: 55,
          barberCommission: 27.5,
        },
      ],
      products: [],
    };

    setComandas((prev) => [newComanda, ...prev]);
    setWaitlist((prev) => prev.filter((t) => t.id !== ticket.id));
    setAlertSuccess(
      `Cliente ${ticket.clientName} sentado na cadeira! Comanda #${newCmdId} aberta.`,
    );
    setTimeout(() => setAlertSuccess(""), 4000);
  };

  // 3. AÇÃO: Abrir Comanda Avulsa
  const handleCreateWalkinComanda = () => {
    if (!newClientName.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    const newCmdId = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
    const created = {
      id: newCmdId,
      clientName: newClientName.trim(),
      clientPhone: "",
      barberName: newBarberName,
      status: "open",
      openedAt: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      services: [
        {
          id: `s-${Date.now()}`,
          name: "Corte Avulso Balcão",
          price: 50,
          barberCommission: 25,
        },
      ],
      products: [],
    };

    setComandas((prev) => [created, ...prev]);
    setIsNewComandaModalOpen(false);
    setNewClientName("");
    setAlertSuccess(
      `Comanda #${newCmdId} criada com sucesso para ${created.clientName}!`,
    );
    setTimeout(() => setAlertSuccess(""), 4000);
  };

  // [Função: liquida a comanda e sincroniza com o dashboard global e Supabase]
  const handleFinishComandaPayment = (paymentsSummary) => {
    if (!comandaToPay) return;

    const updated = comandas.map((c) =>
      c.id === comandaToPay.id ? { ...c, status: "paid" } : c,
    );

    setComandas(updated);
    if (onUpdateComandas) {
      onUpdateComandas(updated);
    }

    const paidId = comandaToPay.id;
    const clientName = comandaToPay.clientName;
    setComandaToPay(null);

    setAlertSuccess(
      `🎉 Comanda #${paidId} (${clientName}) foi QUITADA E ARQUIVADA no caixa!`,
    );
    setTimeout(() => setAlertSuccess(""), 5000);
  };

  return (
    <div className={posStyles.container}>
      {/* 1. CABEÇALHO DO CAIXA COM KPIS */}
      <div className={posStyles.headerCard}>
        <div className={posStyles.headerInfo}>
          <h1 className={posStyles.title}>
            <span>🧾</span>
            <span>Frente de Caixa (PDV) & Comandas</span>
          </h1>
          <p className={posStyles.subtitle}>
            Gestão de comandas em atendimento, lançamento rápido de bar/vitrine
            e quitação de pagamentos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className={posStyles.kpiGroup}>
            <div className={`${posStyles.kpiBadge} ${posStyles.kpiRevenue}`}>
              <span>💰</span>
              <span>
                Recebido Hoje: R${" "}
                {totalReceivedToday.toFixed(2).replace(".", ",")}
              </span>
            </div>

            <div className={`${posStyles.kpiBadge} ${posStyles.kpiOpen}`}>
              <span>⏳</span>
              <span>{openComandasCount} comandas abertas</span>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsNewComandaModalOpen(true)}
            className="text-xs py-2 px-3.5 bg-amber-600 hover:bg-amber-500 font-bold shrink-0"
          >
            <span>+</span> Nova Comanda Balcão
          </Button>

          {onBack && (
            <Button
              variant="secondary"
              onClick={onBack}
              className="text-xs py-2 px-3"
            >
              ← Voltar
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de Sucesso */}
      {alertSuccess && (
        <Alert
          variant="success"
          title="Operação do Caixa Concluída!"
          onClose={() => setAlertSuccess("")}
        >
          {alertSuccess}
        </Alert>
      )}

      {/* 2. GRADE CENTRAL DO PDV (2 COLUNAS) */}
      <div className={posStyles.gridContent}>
        {/* COLUNA ESQUERDA: LISTA DE COMANDAS ABERTAS */}
        <div className={posStyles.comandasColumn}>
          <div className={posStyles.comandasHeader}>
            <h2 className={posStyles.sectionTitle}>
              <span>📋</span> Comandas Ativas (
              {comandas.filter((c) => c.status !== "paid").length})
            </h2>

            {pendingPaymentCount > 0 && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                {pendingPaymentCount} aguardando no caixa
              </span>
            )}
          </div>

          {/* Listagem das Comandas */}
          <div className="space-y-4">
            {comandas
              .filter((c) => c.status !== "paid")
              .map((cmd) => (
                <ComandaCard
                  key={cmd.id}
                  comanda={cmd}
                  onAddItem={() => {
                    setSelectedComandaIdForAdd(cmd.id);
                    setProductToAdd(products[0]);
                    setIsAddItemModalOpen(true);
                  }}
                  onRemoveService={(servId) => {
                    setComandas((prev) =>
                      prev.map((c) =>
                        c.id === cmd.id
                          ? {
                              ...c,
                              services: c.services.filter(
                                (s) => s.id !== servId,
                              ),
                            }
                          : c,
                      ),
                    );
                  }}
                  onRemoveProduct={(prodId) => {
                    setComandas((prev) =>
                      prev.map((c) =>
                        c.id === cmd.id
                          ? {
                              ...c,
                              products: c.products.filter(
                                (p) => p.id !== prodId,
                              ),
                            }
                          : c,
                      ),
                    );
                  }}
                  onStatusChange={(newStatus) => {
                    setComandas((prev) =>
                      prev.map((c) =>
                        c.id === cmd.id ? { ...c, status: newStatus } : c,
                      ),
                    );
                  }}
                  onProceedToPayment={(comanda) => {
                    setComandaToPay(comanda);
                  }}
                />
              ))}

            {openComandasCount === 0 && (
              <div className="p-12 text-center text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-2">
                <p className="text-xl font-bold text-white">
                  Nenhuma comanda aberta no momento
                </p>
                <p>Todas as contas foram liquidadas e o caixa está em dia!</p>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: LANÇAMENTO RÁPIDO DE PRODUTOS + FILA */}
        <div className={posStyles.sidebarColumn}>
          {/* Card 1: Produtos do Bar & Vitrine (1 Clique) */}
          <div className={posStyles.quickBox}>
            <div className={posStyles.quickHeader}>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>🍺</span> Bar & Vitrine Rápido
              </h3>
              <span className="text-[10px] text-neutral-400">
                Clique para lançar na comanda
              </span>
            </div>

            <div className="space-y-3">
              {products.map((prod) => (
                <PosProductItem
                  key={prod.id}
                  product={prod}
                  onAddToCart={handleQuickAddProduct}
                />
              ))}
            </div>
          </div>

          {/* Card 2: Fila de Espera (Walk-ins) */}
          <div className={posStyles.quickBox}>
            <div className={posStyles.quickHeader}>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>🎟️</span> Fila de Espera (Walk-ins)
              </h3>
              <span className="text-[10px] font-bold text-amber-500 font-mono">
                {waitlist.length} aguardando
              </span>
            </div>

            <div className="space-y-3">
              {waitlist.map((ticket) => (
                <QueueTicket
                  key={ticket.id}
                  ticket={ticket}
                  onCall={(t) =>
                    alert(
                      `📢 Chamando senha #${t.position} no painel da barbearia!`,
                    )
                  }
                  onStartService={handleStartQueueService}
                  onNotifyWhatsapp={(t) =>
                    alert(`💬 WhatsApp enviado para ${t.clientName}!`)
                  }
                  onMarkAbsent={(t) =>
                    setWaitlist((prev) =>
                      prev.filter((item) => item.id !== t.id),
                    )
                  }
                />
              ))}

              {waitlist.length === 0 && (
                <p className="text-xs text-neutral-500 italic text-center py-2">
                  Fila vazia. Nenhum cliente aguardando na recepção.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: LIQUIDAÇÃO / PAGAMENTO (PAYMENT METHOD SELECTOR) */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!comandaToPay}
        size="lg"
        onClose={() => setComandaToPay(null)}
        title={`💳 Quitação de Caixa: Comanda #${comandaToPay?.id}`}
      >
        {comandaToPay && (
          <div className="space-y-4">
            <PaymentMethodSelector
              totalAmount={
                (comandaToPay.services || []).reduce(
                  (a, s) => a + Number(s.price),
                  0,
                ) +
                (comandaToPay.products || []).reduce(
                  (a, p) => a + Number(p.total),
                  0,
                )
              }
              client={{
                name: comandaToPay.clientName,
                cpf: "123.456.789-00",
                hasSubscription: false,
              }}
              onFinishPayment={handleFinishComandaPayment}
              onCancel={() => setComandaToPay(null)}
            />
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: ESCOLHER EM QUAL COMANDA LANÇAR O PRODUTO       */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddItemModalOpen}
        size="sm"
        onClose={() => setIsAddItemModalOpen(false)}
        title={`Lançar Item: ${productToAdd?.name}`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsAddItemModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmAddProductToComanda}
            >
              Confirmar Lançamento (R${" "}
              {Number(productToAdd?.price || 0).toFixed(2)})
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-neutral-400">
            Selecione em qual comanda aberta o item{" "}
            <strong>{productToAdd?.name}</strong> será incluído:
          </p>

          <Select
            label="Comanda de Destino"
            value={selectedComandaIdForAdd}
            onChange={(e) => setSelectedComandaIdForAdd(e.target.value)}
            options={comandas
              .filter((c) => c.status !== "paid")
              .map((c) => ({
                value: c.id,
                label: `#${c.id} - ${c.clientName} (Barbeiro: ${c.barberName})`,
              }))}
          />
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: ABRIR NOVA COMANDA BALCÃO AVULSA               */}
      {/* ======================================================== */}
      <Modal
        isOpen={isNewComandaModalOpen}
        size="sm"
        onClose={() => setIsNewComandaModalOpen(false)}
        title="🧾 Nova Comanda Avulsa (Balcão)"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsNewComandaModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreateWalkinComanda}>
              Abrir Comanda
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <Input
            label="Nome do Cliente (ou Consumidor Balcão)"
            placeholder="Ex: João Paulo"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
          />

          {/* [Select dinâmico: consome a lista real de barbeiros do Supabase] */}
          <Select
            label="Barbeiro Responsável"
            value={newBarberName}
            onChange={(e) => setNewBarberName(e.target.value)}
            options={
              barbers.length > 0
                ? barbers.map((b) => ({ value: b.name, label: b.name }))
                : [{ value: "Geral", label: "Atendente Geral" }]
            }
          />
        </div>
      </Modal>
    </div>
  );
}
