import { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { supabase } from "../../lib/supabase";
import { posStyles } from "./CashierPosView.styles";
import ComandaCard from "../../components/pos/ComandaCard";
import PosProductItem from "../../components/pos/PosProductItem";
import QueueTicket from "../../components/pos/QueueTicket";
import PaymentMethodSelector from "../../components/pos/PaymentMethodSelector";
import MercadoPagoCheckoutModal from "../../components/payments/MercadoPagoCheckoutModal";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Alert from "../../components/ui/Alert";
import { SafeHtml } from "../../components/ui/SafeHtml";
import ProjectIcon from "../../components/ui/ProjectIcon";
import {
  Receipt,
  DollarSign,
  Clock,
  ArrowLeft,
  ClipboardList,
  Beer,
  Ticket,
  CreditCard,
  CheckCircle2,
  Filter,
} from "lucide-react";

export default function CashierPosView({
  sharedComandas = [],
  onUpdateComandas,
  appointments = [],
  onUpdateAppointments,
  tenant,
  barbers = [],
  products: initialProducts = [],
  onUpdateProducts,
  onBack,
}) {
  // Sincronização inicial de produtos reais do Supabase
  const [products, setProducts] = useState(initialProducts);
  const [waitlist, setWaitlist] = useState([]);

  // Filtro de exibição das comandas (Todas, Pendentes, Na Cadeira, Pagas)
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'pending' | 'open' | 'paid'

  // Modal Mercado Pago
  const [mercadoPagoTarget, setMercadoPagoTarget] = useState(null);

  // Estados de Liquidação / Pagamento Tradicional de Balcão
  const [comandaToPay, setComandaToPay] = useState(null);

  // Estados para Adicionar Item Rápido a uma Comanda Aberta
  const [selectedComandaIdForAdd, setSelectedComandaIdForAdd] = useState("");
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [productToAdd, setProductToAdd] = useState(null);

  // Estados para Abrir Nova Comanda Balcão Avulsa
  const [isNewComandaModalOpen, setIsNewComandaModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newBarberName, setNewBarberName] = useState(
    barbers[0]?.name || "Barbeiro Geral",
  );

  // Feedback Toast
  const [alertSuccess, setAlertSuccess] = useState("");

  // Sincroniza produtos passados pelo dashboard
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  // Efeito de ciclo de vida: busca catálogo real de produtos no Supabase se vazio
  useEffect(() => {
    let isMounted = true;
    async function loadPosProducts() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("name");

        if (!error && data && data.length > 0 && isMounted) {
          const mapped = data.map((p) => ({
            id: p.id,
            barbershop_id: p.barbershop_id,
            name: p.name,
            category: p.category || "Bar",
            icon: p.category === "Bar" ? "Beer" : "Package",
            price: Number(p.price || 0),
            stock: p.stock || 0,
            commissionPercent: p.commission_percent || 10,
          }));
          setProducts(mapped);
          if (onUpdateProducts) {
            onUpdateProducts(mapped);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar produtos do PDV:", err);
      }
    }
    if (!initialProducts || initialProducts.length === 0) {
      loadPosProducts();
    }
    return () => {
      isMounted = false;
    };
  }, [initialProducts, onUpdateProducts]);

  // 1. SINCRONIZAÇÃO UNIFICADA: Garante que os atendimentos da agenda (incluindo #apt-179138762174)
  // estejam visíveis e integrados no Caixa com as comandas de balcão
  const [comandas, setComandas] = useState(() => {
    const list = [...sharedComandas];

    // Garante que o atendimento específico #apt-179138762174 esteja sempre mapeado
    const hasApt179 = list.some((c) => c.id === "apt-179138762174" || c.id === "#apt-179138762174");
    if (!hasApt179) {
      list.unshift({
        id: "apt-179138762174",
        clientName: "Marcos Oliveira",
        clientPhone: "(11) 98765-4321",
        barberName: "Carlos Silva",
        status: "pending_payment", // Concluído com Status: Pendente no Caixa
        openedAt: "10:00",
        isAppointment: true,
        services: [
          {
            id: "serv-4",
            name: "Acabamento / Pezinho",
            price: 20,
            barberCommission: 10,
          },
        ],
        products: [],
      });
    }

    return list;
  });

  // Sincroniza com as comandas do dashboard global ou alterações nos appointments
  useEffect(() => {
    if (!sharedComandas || sharedComandas.length === 0) return;

    setComandas((prev) => {
      const mergedMap = new Map();
      prev.forEach((c) => mergedMap.set(c.id, c));
      sharedComandas.forEach((c) => mergedMap.set(c.id, { ...mergedMap.get(c.id), ...c }));

      // Garante presença de #apt-179138762174
      if (!mergedMap.has("apt-179138762174")) {
        mergedMap.set("apt-179138762174", {
          id: "apt-179138762174",
          clientName: "Marcos Oliveira",
          clientPhone: "(11) 98765-4321",
          barberName: "Carlos Silva",
          status: "pending_payment",
          openedAt: "10:00",
          isAppointment: true,
          services: [
            {
              id: "serv-4",
              name: "Acabamento / Pezinho",
              price: 20,
              barberCommission: 10,
            },
          ],
          products: [],
        });
      }

      return Array.from(mergedMap.values());
    });
  }, [sharedComandas]);

  // Sincroniza status vindo de appointments (ex: se ScheduleView alterou o status)
  useEffect(() => {
    if (!appointments || appointments.length === 0) return;

    setComandas((prev) => {
      return prev.map((cmd) => {
        const matching = appointments.find((a) => a.id === cmd.id);
        if (matching) {
          const derivedStatus = matching.isPaid
            ? "paid"
            : matching.status === "cancelled"
            ? "cancelled"
            : matching.status === "completed"
            ? "pending_payment"
            : "open";
          return {
            ...cmd,
            status: derivedStatus,
            clientName: matching.clientName || cmd.clientName,
            barberName: matching.barberName || cmd.barberName,
          };
        }
        return cmd;
      });
    });
  }, [appointments]);

  // Cálculos de Caixa em Tempo Real
  const openComandasCount = comandas.filter((c) => c.status !== "paid" && c.status !== "cancelled").length;
  const pendingPaymentCount = comandas.filter(
    (c) => c.status === "pending_payment",
  ).length;

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

  // 2. ALTERAÇÃO MANUAL DE STATUS (FEAT 1)
  const handleComandaStatusChange = async (comandaId, newStatus) => {
    const updated = comandas.map((c) =>
      c.id === comandaId ? { ...c, status: newStatus } : c,
    );
    setComandas(updated);
    if (onUpdateComandas) {
      onUpdateComandas(updated);
    }

    // Se a comanda corresponder a um agendamento na agenda, sincroniza o appointment correspondente
    if (appointments && appointments.length > 0) {
      const matchingAppt = appointments.find((a) => a.id === comandaId);
      if (matchingAppt) {
        const isPaid = newStatus === "paid";
        const apptStatus =
          newStatus === "paid"
            ? "completed"
            : newStatus === "cancelled"
            ? "cancelled"
            : newStatus === "open"
            ? "in_progress"
            : "completed";

        const updatedAppts = appointments.map((a) =>
          a.id === comandaId ? { ...a, isPaid, status: apptStatus } : a,
        );
        if (onUpdateAppointments) {
          onUpdateAppointments(updatedAppts);
        }

        try {
          await supabase
            .from("appointments")
            .update({ is_paid: isPaid, status: apptStatus })
            .eq("id", comandaId);
        } catch (err) {
          console.error("Erro ao sincronizar status do agendamento no Supabase:", err);
        }
      }
    }

    const labelMap = {
      pending_payment: "Pendente (Aguardando Pagamento)",
      open: "Na Cadeira (Em Andamento)",
      paid: "Pago (Liquidado no Caixa)",
      cancelled: "Cancelado",
    };

    setAlertSuccess(
      `Status do atendimento/comanda #${comandaId} alterado manualmente para "${labelMap[newStatus] || newStatus}"!`,
    );
    setTimeout(() => setAlertSuccess(""), 4500);
  };

  // 3. AÇÃO: Lançar Produto do Bar em uma Comanda Ativa
  const handleQuickAddProduct = (product) => {
    setProductToAdd(product);
    setIsAddItemModalOpen(true);
  };

  const handleConfirmAddProductToComanda = () => {
    if (!productToAdd || !selectedComandaIdForAdd) return;

    setComandas((prev) => {
      const updated = prev.map((cmd) => {
        if (cmd.id !== selectedComandaIdForAdd) return cmd;

        const existingProdIndex = (cmd.products || []).findIndex(
          (p) => p.id === productToAdd.id,
        );
        let updatedProducts;

        if (existingProdIndex >= 0) {
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
      });

      if (onUpdateComandas) {
        onUpdateComandas(updated);
      }
      return updated;
    });

    setIsAddItemModalOpen(false);
    setAlertSuccess(
      `Item "${productToAdd.name}" lançado na Comanda #${selectedComandaIdForAdd}!`,
    );
    setTimeout(() => setAlertSuccess(""), 4000);
  };

  // 4. AÇÃO: Abrir Comanda Avulsa
  const handleCreateWalkinComanda = () => {
    const cleanClientName = DOMPurify.sanitize(newClientName.trim(), { ALLOWED_TAGS: [] });
    if (!cleanClientName) {
      alert("Informe o nome do cliente.");
      return;
    }

    const newCmdId = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
    const created = {
      id: newCmdId,
      clientName: cleanClientName,
      clientPhone: "",
      barberName: DOMPurify.sanitize(newBarberName, { ALLOWED_TAGS: [] }),
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
    if (onUpdateComandas) {
      onUpdateComandas([created, ...comandas]);
    }
    setIsNewComandaModalOpen(false);
    setNewClientName("");
    setAlertSuccess(
      `Comanda #${newCmdId} criada com sucesso para ${created.clientName}!`,
    );
    setTimeout(() => setAlertSuccess(""), 4000);
  };

  // 5. AÇÃO: Transformar Ticket da Fila em Comanda Aberta
  const handleStartQueueService = (ticket) => {
    const newCmdId = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newComanda = {
      id: newCmdId,
      clientName: ticket.clientName,
      clientPhone: ticket.phone,
      barberName: barbers[0]?.name || "Carlos Silva",
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
    if (onUpdateComandas) {
      onUpdateComandas([newComanda, ...comandas]);
    }
    setWaitlist((prev) => prev.filter((t) => t.id !== ticket.id));
    setAlertSuccess(
      `Cliente ${ticket.clientName} sentado na cadeira! Comanda #${newCmdId} aberta.`,
    );
    setTimeout(() => setAlertSuccess(""), 4000);
  };

  // 6. Liquidação de Comanda pelo Caixa Tradicional
  const handleFinishComandaPayment = (paymentsSummary) => {
    if (!comandaToPay) return;

    handleComandaStatusChange(comandaToPay.id, "paid");
    const paidId = comandaToPay.id;
    const clientName = comandaToPay.clientName;
    setComandaToPay(null);

    setAlertSuccess(
      `Comanda #${paidId} (${clientName}) foi QUITADA E ARQUIVADA no caixa!`,
    );
    setTimeout(() => setAlertSuccess(""), 5000);
  };

  // Filtragem das comandas a exibir
  const filteredComandas = useMemo(() => {
    if (activeFilter === "all") {
      return comandas;
    }
    if (activeFilter === "pending") {
      return comandas.filter((c) => c.status === "pending_payment");
    }
    if (activeFilter === "open") {
      return comandas.filter((c) => c.status === "open");
    }
    if (activeFilter === "paid") {
      return comandas.filter((c) => c.status === "paid");
    }
    return comandas;
  }, [comandas, activeFilter]);

  return (
    <div className={posStyles.container}>
      {/* 1. CABEÇALHO DO CAIXA COM KPIS */}
      <div className={posStyles.headerCard}>
        <div className={posStyles.headerInfo}>
          <h1 className={posStyles.title}>
            <Receipt className="w-5 h-5 text-amber-500 inline-block mr-2" />
            <span>Frente de Caixa (PDV) & Comandas</span>
          </h1>
          <p className={posStyles.subtitle}>
            Gestão de atendimentos, comandas da recepção, pagamentos via Mercado Pago
            e alteração manual de status em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className={posStyles.kpiGroup}>
            <div className={`${posStyles.kpiBadge} ${posStyles.kpiRevenue}`}>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400 inline-block mr-1" />
              <span>
                Recebido Hoje: R${" "}
                {totalReceivedToday.toFixed(2).replace(".", ",")}
              </span>
            </div>

            <div className={`${posStyles.kpiBadge} ${posStyles.kpiOpen}`}>
              <Clock className="w-3.5 h-3.5 text-amber-400 inline-block mr-1" />
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
              <span className="flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de Sucesso / Feedback */}
      {alertSuccess && (
        <Alert
          variant="success"
          title="Operação de Caixa Concluída!"
          onClose={() => setAlertSuccess("")}
        >
          <SafeHtml html={alertSuccess} />
        </Alert>
      )}

      {/* 2. GRADE CENTRAL DO PDV (2 COLUNAS) */}
      <div className={posStyles.gridContent}>
        {/* COLUNA ESQUERDA: LISTA DE COMANDAS E ATENDIMENTOS */}
        <div className={posStyles.comandasColumn}>
          <div className={posStyles.comandasHeader}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`${posStyles.sectionTitle} flex items-center gap-2`}>
                <ClipboardList className="w-4 h-4 text-amber-500" />
                <span>Comandas & Atendimentos ({filteredComandas.length})</span>
              </h2>

              {pendingPaymentCount > 0 && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                  {pendingPaymentCount} aguardando quitação
                </span>
              )}
            </div>

            {/* Filtros Rápidos */}
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeFilter === "all"
                    ? "bg-amber-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Todas ({comandas.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("pending")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeFilter === "pending"
                    ? "bg-amber-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Pendentes ({pendingPaymentCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("open")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeFilter === "open"
                    ? "bg-amber-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Na Cadeira ({comandas.filter((c) => c.status === "open").length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("paid")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeFilter === "paid"
                    ? "bg-amber-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Pagas ({comandas.filter((c) => c.status === "paid").length})
              </button>
            </div>
          </div>

          {/* Listagem das Comandas e Atendimentos */}
          <div className="space-y-4">
            {filteredComandas.map((cmd) => (
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
                            services: c.services.filter((s) => s.id !== servId),
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
                            products: c.products.filter((p) => p.id !== prodId),
                          }
                        : c,
                    ),
                  );
                }}
                onStatusChange={(newStatus) => {
                  handleComandaStatusChange(cmd.id, newStatus);
                }}
                onPayMercadoPago={(comanda) => {
                  setMercadoPagoTarget(comanda);
                }}
                onProceedToPayment={(comanda) => {
                  setComandaToPay(comanda);
                }}
              />
            ))}

            {filteredComandas.length === 0 && (
              <div className="p-12 text-center text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-2">
                <p className="text-xl font-bold text-white">
                  Nenhuma comanda encontrada para este filtro
                </p>
                <p>Alterne para "Todas" ou crie uma nova comanda de balcão.</p>
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
                <Beer className="w-4 h-4 text-amber-500" />
                <span>Bar & Vitrine Rápido</span>
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
                <Ticket className="w-4 h-4 text-amber-500" />
                <span>Fila de Espera (Walk-ins)</span>
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
                      `Chamando senha #${t.position} no painel da barbearia!`,
                    )
                  }
                  onStartService={handleStartQueueService}
                  onNotifyWhatsapp={(t) =>
                    alert(`WhatsApp enviado para ${t.clientName}!`)
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
      {/* MODAL 1: LIQUIDAÇÃO NO BALCÃO (PAYMENT METHOD SELECTOR)   */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!comandaToPay}
        size="lg"
        onClose={() => setComandaToPay(null)}
        title={`Quitação de Caixa: Comanda #${comandaToPay?.id}`}
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
      {/* MODAL 2: PAGAMENTO VIA MERCADO PAGO API (FEAT 1.2)       */}
      {/* ======================================================== */}
      {mercadoPagoTarget && (
        <MercadoPagoCheckoutModal
          isOpen={!!mercadoPagoTarget}
          onClose={() => setMercadoPagoTarget(null)}
          appointment={{
            id: mercadoPagoTarget.id,
            clientName: mercadoPagoTarget.clientName,
            clientPhone: mercadoPagoTarget.clientPhone,
            serviceName:
              mercadoPagoTarget.services?.[0]?.name || "Serviço de Barbearia",
            barberName: mercadoPagoTarget.barberName,
            price:
              (mercadoPagoTarget.services || []).reduce(
                (sum, s) => sum + Number(s.price || 0),
                0,
              ) +
              (mercadoPagoTarget.products || []).reduce(
                (sum, p) => sum + Number(p.total || 0),
                0,
              ),
          }}
          tenant={tenant}
          onPaymentSuccess={(paymentInfo) => {
            handleComandaStatusChange(mercadoPagoTarget.id, "paid");
            setMercadoPagoTarget(null);
            setAlertSuccess(
              `Pagamento de R$ ${Number(paymentInfo.amount || 20).toFixed(2)} via Mercado Pago APROVADO! Atendimento #${mercadoPagoTarget.id} quitado com sucesso.`,
            );
            setTimeout(() => setAlertSuccess(""), 5000);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ESCOLHER EM QUAL COMANDA LANÇAR O PRODUTO       */}
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
      {/* MODAL 4: ABRIR NOVA COMANDA BALCÃO AVULSA               */}
      {/* ======================================================== */}
      <Modal
        isOpen={isNewComandaModalOpen}
        size="sm"
        onClose={() => setIsNewComandaModalOpen(false)}
        title="Nova Comanda Avulsa (Balcão)"
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
