import { useState } from "react";
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

// Mock inicial de Comandas Abertas na Barbearia
const initialComandas = [
  {
    id: "CMD-1041",
    clientName: "Rodrigo Faro",
    clientPhone: "(11) 98765-4321",
    barberName: "Carlos Silva",
    status: "open", // 'open' | 'pending_payment' | 'paid'
    openedAt: "14:15",
    services: [
      {
        id: "s1",
        name: "Corte Degradê Navalhado",
        price: 55,
        barberCommission: 27.5,
      },
      {
        id: "s2",
        name: "Barboterapia Tradicional",
        price: 45,
        barberCommission: 22.5,
      },
    ],
    products: [
      {
        id: "p1",
        name: "Cerveja IPA Artesanal (Lata)",
        quantity: 2,
        unitPrice: 16,
        total: 32,
        sellerCommission: 3.2,
      },
    ],
  },
  {
    id: "CMD-1042",
    clientName: "Guilherme Boulos",
    clientPhone: "(11) 97654-3210",
    barberName: "Marcos Vinicius",
    status: "pending_payment", // Aguardando acerto no balcão!
    openedAt: "15:00",
    services: [
      {
        id: "s3",
        name: "Corte na Tesoura Clássico",
        price: 50,
        barberCommission: 25.0,
      },
    ],
    products: [
      {
        id: "p2",
        name: "Pomada Matte (50g)",
        quantity: 1,
        unitPrice: 45,
        total: 45,
        sellerCommission: 4.5,
      },
    ],
  },
];

// Mock de Produtos Disponíveis no Bar/Vitrine do PDV
const posProductsList = [
  {
    id: "p1",
    name: "Cerveja IPA 350ml",
    category: "Bar",
    icon: "🍺",
    price: 16,
    stock: 14,
    commissionPercent: 10,
  },
  {
    id: "p2",
    name: "Pomada Matte 50g",
    category: "Vitrine",
    icon: "🧴",
    price: 45,
    stock: 5,
    commissionPercent: 15,
  },
  {
    id: "p3",
    name: "Café Expresso Grão",
    category: "Bar",
    icon: "☕",
    price: 6,
    stock: 35,
    commissionPercent: 0,
  },
];

// Mock de Clientes na Fila de Espera (Walk-ins)
const initialWaitlist = [
  {
    id: "q-101",
    position: 1,
    clientName: "Matheus Pereira",
    serviceName: "Corte Degradê Simples",
    entryTimeAgo: "10 min atrás",
    estimatedWaitMinutes: 15,
    priority: "vip",
    status: "waiting",
    phone: "(11) 91234-5678",
  },
];

export default function CashierPosView({ onBack }) {
  const [comandas, setComandas] = useState(initialComandas);
  const [waitlist, setWaitlist] = useState(initialWaitlist);
  const [products] = useState(posProductsList);

  // Estados de Liquidação / Pagamento da Comanda
  const [comandaToPay, setComandaToPay] = useState(null);

  // Estados para Adicionar Item Rápido a uma Comanda Aberta
  const [selectedComandaIdForAdd, setSelectedComandaIdForAdd] = useState(
    initialComandas[0]?.id || "",
  );
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [productToAdd, setProductToAdd] = useState(null);

  // Estados para Abrir Nova Comanda Balcão Avulsa
  const [isNewComandaModalOpen, setIsNewComandaModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newBarberName, setNewBarberName] = useState("Carlos Silva");

  // Feedback
  const [alertSuccess, setAlertSuccess] = useState("");

  // Cálculos de Caixa
  const openComandasCount = comandas.filter((c) => c.status !== "paid").length;
  const pendingPaymentCount = comandas.filter(
    (c) => c.status === "pending_payment",
  ).length;

  // Total acumulado em caixa no dia
  const totalReceivedToday = 480.0; // Valor consolidado já liquidado

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

  // 4. AÇÃO: Finalizar Pagamento no Seletor de Métodos (Liquidação)
  const handleFinishComandaPayment = (paymentsSummary) => {
    if (!comandaToPay) return;

    setComandas((prev) =>
      prev.map((c) =>
        c.id === comandaToPay.id ? { ...c, status: "paid" } : c,
      ),
    );

    const paidId = comandaToPay.id;
    const clientName = comandaToPay.clientName;
    setComandaToPay(null);

    setAlertSuccess(
      `🎉 Comanda #${paidId} (${clientName}) foi QUITADA E ARQUIVADA no caixa! Comissões e estoque atualizados.`,
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

          <Select
            label="Barbeiro Responsável"
            value={newBarberName}
            onChange={(e) => setNewBarberName(e.target.value)}
            options={[
              { value: "Carlos Silva", label: "Carlos Silva" },
              { value: "Marcos Vinicius", label: "Marcos Vinicius" },
              { value: "Tiago Santos", label: "Tiago Santos" },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
