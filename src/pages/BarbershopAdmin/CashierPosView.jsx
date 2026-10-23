import { useState, useEffect, useMemo, useCallback } from "react";
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
  Calendar,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

// Helper defensivo para formatar data em YYYY-MM-DD
const formatDateToYMD = (dateObj) => {
  if (!dateObj) return "";
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper para extrair YYYY-MM-DD de um agendamento
const getAppointmentDateYMD = (appt) => {
  if (!appt) return formatDateToYMD(new Date());
  const rawDate = appt.date || appt.bookingDate || "";
  if (typeof rawDate === "string" && rawDate.trim().length >= 10) {
    return rawDate.trim().slice(0, 10);
  }
  const rawStart = appt.startTime || appt.start_time || "";
  if (typeof rawStart === "string" && rawStart.includes("T")) {
    return rawStart.slice(0, 10);
  }
  const rawCreated = appt.created_at || appt.createdAt || "";
  if (typeof rawCreated === "string" && rawCreated.trim().length >= 10) {
    return rawCreated.trim().slice(0, 10);
  }
  return formatDateToYMD(new Date());
};

export default function CashierPosView({
  sharedComandas = [],
  onUpdateComandas,
  appointments = [],
  onUpdateAppointments,
  tenant,
  user,
  barbers = [],
  products: initialProducts = [],
  onUpdateProducts,
  onBack,
}) {
  // 1. Data Operacional do Caixa (Padrão: Hoje)
  const [selectedDate, setSelectedDate] = useState(() => formatDateToYMD(new Date()));
  const [viewAllDates, setViewAllDates] = useState(false);

  // Produtos e Fila
  const [products, setProducts] = useState(initialProducts);
  const [waitlist, setWaitlist] = useState([]);

  // Filtro de status das comandas (Todas, Pendentes, Na Cadeira, Pagas)
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'pending' | 'open' | 'paid'

  // Modais de Pagamento
  const [mercadoPagoTarget, setMercadoPagoTarget] = useState(null);
  const [comandaToPay, setComandaToPay] = useState(null);

  // Adicionar item em comanda
  const [selectedComandaIdForAdd, setSelectedComandaIdForAdd] = useState("");
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [productToAdd, setProductToAdd] = useState(null);

  // Nova comanda balcão
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

  // Carrega produtos reais se vazio
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

  // =========================================================================
  // 2. SINCRONIZAÇÃO UNIFICADA: MERGE ENTRE AGENDA E COMANDAS DE BALCÃO
  // =========================================================================
  // Estado local contendo comandas completas (balcão e comandas personalizadas)
  const [comandas, setComandas] = useState(() => {
    return Array.isArray(sharedComandas) ? [...sharedComandas] : [];
  });

  // Atualiza comandas mesclando appointments da agenda automaticamente
  useEffect(() => {
    setComandas((prevComandas) => {
      const mergedMap = new Map();

      // 1. Manter comandas manuais de balcão pré-existentes
      prevComandas.forEach((cmd) => {
        mergedMap.set(cmd.id, cmd);
      });

      // 2. Também incluir as sharedComandas
      if (Array.isArray(sharedComandas)) {
        sharedComandas.forEach((cmd) => {
          if (!mergedMap.has(cmd.id)) {
            mergedMap.set(cmd.id, cmd);
          }
        });
      }

      // 3. Converter e sincronizar TODOS os appointments registrados
      if (Array.isArray(appointments) && appointments.length > 0) {
        appointments.forEach((appt) => {
          const isPaid = Boolean(
            appt.isPaid || appt.is_paid || appt.status === "paid",
          );
          const isCancelled = appt.status === "cancelled";

          let derivedStatus = "open";
          if (isPaid) {
            derivedStatus = "paid";
          } else if (isCancelled) {
            derivedStatus = "cancelled";
          } else if (appt.status === "completed") {
            derivedStatus = "pending_payment";
          } else {
            derivedStatus = "open";
          }

          const apptPrice = Number(appt.price || 0);
          const existing = mergedMap.get(appt.id);

          if (existing) {
            // Se já existe no caixa, atualiza status e dados básicos sem perder produtos extras
            mergedMap.set(appt.id, {
              ...existing,
              clientName: appt.clientName || appt.client_name || existing.clientName,
              clientPhone: appt.clientPhone || appt.client_phone || existing.clientPhone,
              barberName: appt.barberName || appt.barber_name || existing.barberName,
              barberId: appt.barberId || appt.barber_id || existing.barberId,
              status: derivedStatus,
              isPaid: isPaid,
              date: getAppointmentDateYMD(appt),
              openedAt: appt.startTime || appt.start_time || existing.openedAt,
              services:
                existing.services && existing.services.length > 0
                  ? existing.services
                  : [
                      {
                        id: `serv-${appt.id}`,
                        name: appt.serviceName || appt.service_name || "Serviço Agendado",
                        price: apptPrice,
                        barberCommission: apptPrice * 0.5,
                      },
                    ],
            });
          } else {
            // Cria nova comanda automática oriunda da agenda
            mergedMap.set(appt.id, {
              id: appt.id,
              appointmentId: appt.id,
              source: "agenda",
              clientName: appt.clientName || appt.client_name || "Cliente Agendado",
              clientPhone: appt.clientPhone || appt.client_phone || "",
              barberName: appt.barberName || appt.barber_name || "Barbeiro",
              barberId: appt.barberId || appt.barber_id || "",
              openedAt: appt.startTime || appt.start_time || "Agendado",
              date: getAppointmentDateYMD(appt),
              status: derivedStatus,
              isPaid: isPaid,
              services: [
                {
                  id: `serv-${appt.id}`,
                  name: appt.serviceName || appt.service_name || "Serviço Agendado",
                  price: apptPrice,
                  barberCommission: apptPrice * 0.5,
                },
              ],
              products: [],
            });
          }
        });
      }

      const mergedList = Array.from(mergedMap.values());
      return mergedList;
    });
  }, [appointments, sharedComandas]);

  // Propaga comandas para o pai quando sofrem mutação interna
  const updateComandasState = useCallback(
    (newComandas) => {
      setComandas(newComandas);
      if (onUpdateComandas) {
        onUpdateComandas(newComandas);
      }
    },
    [onUpdateComandas],
  );

  // =========================================================================
  // 3. CÁLCULO DOS 3 INDICADORES FINANCEIROS NO TOPO (REGRAS DE NEGÓCIO)
  // =========================================================================
  // Comandas pertinentes à data selecionada (ou todas se viewAllDates = true)
  const dateScopedComandas = useMemo(() => {
    return comandas.filter((cmd) => {
      if (viewAllDates) return true;
      const cmdDate = cmd.date || selectedDate;
      return cmdDate === selectedDate;
    });
  }, [comandas, selectedDate, viewAllDates]);

  // Indicador 1: Previsão Total do Dia (Todos os atendimentos ativos não cancelados)
  const totalForecast = useMemo(() => {
    return dateScopedComandas
      .filter((c) => c.status !== "cancelled")
      .reduce((acc, cmd) => {
        const servicesSum = (cmd.services || []).reduce(
          (sum, s) => sum + Number(s.price || 0),
          0,
        );
        const productsSum = (cmd.products || []).reduce(
          (sum, p) =>
            sum +
            Number(
              p.total ||
                Number(p.quantity || 1) * Number(p.unitPrice || p.price || 0),
            ),
          0,
        );
        return acc + servicesSum + productsSum;
      }, 0);
  }, [dateScopedComandas]);

  // Indicador 2: Recebido Hoje (Valores efetivamente liquidados como pagos)
  const totalReceivedToday = useMemo(() => {
    return dateScopedComandas
      .filter((c) => c.status === "paid" || c.isPaid === true)
      .reduce((acc, cmd) => {
        const servicesSum = (cmd.services || []).reduce(
          (sum, s) => sum + Number(s.price || 0),
          0,
        );
        const productsSum = (cmd.products || []).reduce(
          (sum, p) =>
            sum +
            Number(
              p.total ||
                Number(p.quantity || 1) * Number(p.unitPrice || p.price || 0),
            ),
          0,
        );
        return acc + servicesSum + productsSum;
      }, 0);
  }, [dateScopedComandas]);

  // Indicador 3: Saldo Pendente (Previsão que ainda não foi liquidada)
  const pendingAmount = useMemo(() => {
    return Math.max(0, totalForecast - totalReceivedToday);
  }, [totalForecast, totalReceivedToday]);

  // Contadores analíticos
  const expectedCount = dateScopedComandas.filter((c) => c.status !== "cancelled").length;
  const paidCount = dateScopedComandas.filter((c) => c.status === "paid" || c.isPaid === true).length;
  const pendingCount = dateScopedComandas.filter(
    (c) => c.status !== "paid" && c.status !== "cancelled" && !c.isPaid,
  ).length;
  const openCount = dateScopedComandas.filter((c) => c.status === "open").length;

  // =========================================================================
  // 4. AÇÕES DE LIQUIDAÇÃO E ALTERAÇÃO DE STATUS COM SINCRONIZAÇÃO
  // =========================================================================
  const handleComandaStatusChange = async (comandaId, newStatus) => {
    const isPaid = newStatus === "paid";
    const updated = comandas.map((c) =>
      c.id === comandaId ? { ...c, status: newStatus, isPaid } : c,
    );
    updateComandasState(updated);

    // Sincroniza com a Agenda e Supabase se for um agendamento vinculado
    if (appointments && appointments.length > 0) {
      const matchingAppt = appointments.find((a) => a.id === comandaId);
      if (matchingAppt) {
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
      `Comanda #${comandaId} atualizada para "${labelMap[newStatus] || newStatus}"! Previsão financeira e status sincronizados.`,
    );
    setTimeout(() => setAlertSuccess(""), 4500);
  };

  // Liquidação pelo Modal Tradicional de Caixa
  const handleFinishComandaPayment = async (paymentsSummary) => {
    if (!comandaToPay) return;

    await handleComandaStatusChange(comandaToPay.id, "paid");
    const paidId = comandaToPay.id;
    const clientName = comandaToPay.clientName;
    setComandaToPay(null);

    setAlertSuccess(
      `Comanda #${paidId} (${clientName}) foi QUITADA com sucesso! Receita e comissão consolidadas.`,
    );
    setTimeout(() => setAlertSuccess(""), 5000);
  };

  // Lançar Produto na Comanda
  const handleQuickAddProduct = (product) => {
    setProductToAdd(product);
    setIsAddItemModalOpen(true);
  };

  const handleConfirmAddProductToComanda = () => {
    if (!productToAdd || !selectedComandaIdForAdd) return;

    const updated = comandas.map((cmd) => {
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
                  (p.unitPrice * ((productToAdd.commissionPercent || 0) / 100)),
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

    updateComandasState(updated);
    setIsAddItemModalOpen(false);
    setAlertSuccess(
      `Item "${productToAdd.name}" lançado na Comanda #${selectedComandaIdForAdd}!`,
    );
    setTimeout(() => setAlertSuccess(""), 4000);
  };

  // Criar Comanda Balcão Avulsa
  const handleCreateWalkinComanda = () => {
    const cleanClientName = DOMPurify.sanitize(newClientName.trim(), { ALLOWED_TAGS: [] });
    if (!cleanClientName) {
      alert("Informe o nome do cliente.");
      return;
    }

    const newCmdId = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
    const created = {
      id: newCmdId,
      source: "balcao",
      clientName: cleanClientName,
      clientPhone: "",
      barberName: DOMPurify.sanitize(newBarberName, { ALLOWED_TAGS: [] }),
      status: "open",
      openedAt: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: selectedDate,
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

    updateComandasState([created, ...comandas]);
    setIsNewComandaModalOpen(false);
    setNewClientName("");
    setAlertSuccess(
      `Comanda #${newCmdId} criada com sucesso para ${created.clientName}!`,
    );
    setTimeout(() => setAlertSuccess(""), 4000);
  };

  // Transformar Ticket da Fila em Comanda
  const handleStartQueueService = (ticket) => {
    const newCmdId = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newComanda = {
      id: newCmdId,
      source: "balcao",
      clientName: ticket.clientName,
      clientPhone: ticket.phone,
      barberName: barbers[0]?.name || "Barbeiro",
      status: "open",
      openedAt: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: selectedDate,
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

    updateComandasState([newComanda, ...comandas]);
    setWaitlist((prev) => prev.filter((t) => t.id !== ticket.id));
    setAlertSuccess(
      `Cliente ${ticket.clientName} sentado na cadeira! Comanda #${newCmdId} aberta.`,
    );
    setTimeout(() => setAlertSuccess(""), 4000);
  };

  // Navegação de Datas (< Hoje >)
  const handlePrevDay = () => {
    const current = new Date(selectedDate + "T12:00:00");
    current.setDate(current.getDate() - 1);
    setSelectedDate(formatDateToYMD(current));
    setViewAllDates(false);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate + "T12:00:00");
    current.setDate(current.getDate() + 1);
    setSelectedDate(formatDateToYMD(current));
    setViewAllDates(false);
  };

  const handleSetToday = () => {
    setSelectedDate(formatDateToYMD(new Date()));
    setViewAllDates(false);
  };

  // Filtragem final para a coluna de comandas
  const filteredComandas = useMemo(() => {
    let list = dateScopedComandas;
    if (activeFilter === "pending") {
      list = list.filter((c) => c.status === "pending_payment");
    } else if (activeFilter === "open") {
      list = list.filter((c) => c.status === "open");
    } else if (activeFilter === "paid") {
      list = list.filter((c) => c.status === "paid" || c.isPaid === true);
    } else if (activeFilter === "cancelled") {
      list = list.filter((c) => c.status === "cancelled" || c.status === "cancelado");
    } else {
      // Aba "Todas": exibe apenas comandas ativas operacionais (não canceladas)
      list = list.filter((c) => c.status !== "cancelled" && c.status !== "cancelado");
    }
    return list;
  }, [dateScopedComandas, activeFilter]);

  // Contagem específica para abas ativas e canceladas
  const activeComandasCount = useMemo(() => {
    return dateScopedComandas.filter((c) => c.status !== "cancelled" && c.status !== "cancelado").length;
  }, [dateScopedComandas]);

  const cancelledCount = useMemo(() => {
    return dateScopedComandas.filter((c) => c.status === "cancelled" || c.status === "cancelado").length;
  }, [dateScopedComandas]);

  // Formatação amigável da data selecionada
  const formattedSelectedDate = useMemo(() => {
    if (viewAllDates) return "Todos os agendamentos e comandas";
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate, viewAllDates]);

  return (
    <div className={posStyles.container}>
      {/* 1. CABEÇALHO DO CAIXA */}
      <div className={posStyles.headerCard}>
        <div className={posStyles.headerInfo}>
          <h1 className={posStyles.title}>
            <Receipt className="w-6 h-6 text-amber-500 inline-block mr-2" />
            <span>Frente de Caixa (PDV) & Comandas</span>
          </h1>
          <p className={posStyles.subtitle}>
            Sincronização automática entre a Agenda e o Caixa. Acompanhe a previsão diária,
            valores liquidados e saldo a receber em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
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
                <span>Voltar para Agenda</span>
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. BARRA DE CONTROLE E NAVEGAÇÃO DE DATA */}
      <div className={posStyles.dateControlBar}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={posStyles.dateNavGroup}>
            <button
              type="button"
              onClick={handlePrevDay}
              className={posStyles.dateButton}
              title="Dia Anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5 inline-block mr-0.5" />
              <span>Anterior</span>
            </button>

            <button
              type="button"
              onClick={handleSetToday}
              className={
                !viewAllDates && selectedDate === formatDateToYMD(new Date())
                  ? posStyles.dateActiveButton
                  : posStyles.dateButton
              }
            >
              Hoje
            </button>

            <button
              type="button"
              onClick={handleNextDay}
              className={posStyles.dateButton}
              title="Próximo Dia"
            >
              <span>Próximo</span>
              <ChevronRight className="w-3.5 h-3.5 inline-block ml-0.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500 hidden sm:inline-block" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  setViewAllDates(false);
                }
              }}
              className={posStyles.datePickerInput}
              aria-label="Selecionar data do caixa"
            />
          </div>

          <button
            type="button"
            onClick={() => setViewAllDates((prev) => !prev)}
            className={viewAllDates ? posStyles.dateActiveButton : posStyles.dateButton}
          >
            <Filter className="w-3 h-3 inline-block mr-1" />
            <span>{viewAllDates ? "Filtrando: Todas as Datas" : "Ver Todas as Datas"}</span>
          </button>
        </div>

        <div className="text-xs font-semibold text-neutral-300 capitalize">
          {formattedSelectedDate}
        </div>
      </div>

      {/* 3. OS 3 CARTÕES DE PREVISÃO FINANCEIRA (REGRAS DE NEGÓCIO) */}
      <div className={posStyles.kpiGrid}>
        {/* KPI 1: Previsão Total do Dia */}
        <div className={`${posStyles.kpiCard} ${posStyles.kpiCardForecast}`}>
          <div>
            <div className={posStyles.kpiCardHeader}>
              <span className={posStyles.kpiCardLabel}>Previsão Total do Dia</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`${posStyles.kpiCardValue} text-white`}>
              R$ {totalForecast.toFixed(2).replace(".", ",")}
            </div>
          </div>
          <div className={posStyles.kpiCardSubtext}>
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <span>
              {expectedCount} {expectedCount === 1 ? "atendimento previsto" : "atendimentos previstos"}
            </span>
          </div>
        </div>

        {/* KPI 2: Recebido Hoje (Realizado) */}
        <div className={`${posStyles.kpiCard} ${posStyles.kpiCardReceived}`}>
          <div>
            <div className={posStyles.kpiCardHeader}>
              <span className={posStyles.kpiCardLabel}>Recebido Hoje (Realizado)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className={`${posStyles.kpiCardValue} text-emerald-400`}>
              R$ {totalReceivedToday.toFixed(2).replace(".", ",")}
            </div>
          </div>
          <div className={posStyles.kpiCardSubtext}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>
              {paidCount} {paidCount === 1 ? "comanda quitada" : "comandas quitadas"}
            </span>
          </div>
        </div>

        {/* KPI 3: Saldo Pendente (A Receber) */}
        <div className={`${posStyles.kpiCard} ${posStyles.kpiCardPending}`}>
          <div>
            <div className={posStyles.kpiCardHeader}>
              <span className={posStyles.kpiCardLabel}>Saldo Pendente (A Receber)</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`${posStyles.kpiCardValue} text-amber-400`}>
              R$ {pendingAmount.toFixed(2).replace(".", ",")}
            </div>
          </div>
          <div className={posStyles.kpiCardSubtext}>
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>
              {pendingCount} {pendingCount === 1 ? "comanda em aberto" : "comandas em aberto"}
            </span>
          </div>
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

      {/* 4. GRADE CENTRAL DO PDV (2 COLUNAS) */}
      <div className={posStyles.gridContent}>
        {/* COLUNA ESQUERDA: LISTA DE COMANDAS E ATENDIMENTOS */}
        <div className={posStyles.comandasColumn}>
          <div className={posStyles.comandasHeader}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`${posStyles.sectionTitle} flex items-center gap-2`}>
                <ClipboardList className="w-4 h-4 text-amber-500" />
                <span>Comandas & Atendimentos ({filteredComandas.length})</span>
              </h2>

              {pendingCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {pendingCount} a receber
                </span>
              )}
            </div>

            {/* Filtros Rápidos */}
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[11px] overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                  activeFilter === "all"
                    ? "bg-amber-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Todas ({activeComandasCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("pending")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                  activeFilter === "pending"
                    ? "bg-amber-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Pendentes ({dateScopedComandas.filter((c) => c.status === "pending_payment").length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("open")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                  activeFilter === "open"
                    ? "bg-amber-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Na Cadeira ({openCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("paid")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                  activeFilter === "paid"
                    ? "bg-amber-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Pagas ({paidCount})
              </button>
              {cancelledCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter("cancelled")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                    activeFilter === "cancelled"
                      ? "bg-red-600 text-white"
                      : "text-neutral-400 hover:text-red-400"
                  }`}
                >
                  Canceladas ({cancelledCount})
                </button>
              )}
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
                  const updated = comandas.map((c) =>
                    c.id === cmd.id
                      ? {
                          ...c,
                          services: (c.services || []).filter((s) => s.id !== servId),
                        }
                      : c,
                  );
                  updateComandasState(updated);
                }}
                onRemoveProduct={(prodId) => {
                  const updated = comandas.map((c) =>
                    c.id === cmd.id
                      ? {
                          ...c,
                          products: (c.products || []).filter((p) => p.id !== prodId),
                        }
                      : c,
                  );
                  updateComandasState(updated);
                }}
                onStatusChange={(newStatus) => {
                  handleComandaStatusChange(cmd.id, newStatus);
                }}
                onPayMercadoPago={(targetComanda) => {
                  setMercadoPagoTarget(targetComanda);
                }}
                onProceedToPayment={(targetComanda) => {
                  setComandaToPay(targetComanda);
                }}
              />
            ))}

            {filteredComandas.length === 0 && (
              <div className="p-12 text-center text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-2">
                <Receipt className="w-8 h-8 text-neutral-600 mx-auto" />
                <p className="text-base font-bold text-white">
                  Nenhum agendamento ou comanda para esta data
                </p>
                <p className="text-neutral-400 max-w-sm mx-auto">
                  Agendamentos criados na Agenda aparecem aqui automaticamente. Você também pode clicar em "+ Nova Comanda Balcão" ou navegar pelas datas acima.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleSetToday}
                    className="text-xs"
                  >
                    Ver Hoje
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setViewAllDates(true)}
                    className="text-xs"
                  >
                    Ver Todas as Datas
                  </Button>
                </div>
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

              {products.length === 0 && (
                <p className="text-xs text-neutral-500 italic text-center py-2">
                  Nenhum produto cadastrado no catálogo.
                </p>
              )}
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
                  (a, s) => a + Number(s.price || 0),
                  0,
                ) +
                (comandaToPay.products || []).reduce(
                  (a, p) =>
                    a +
                    Number(
                      p.total ||
                        Number(p.quantity || 1) *
                          Number(p.unitPrice || p.price || 0),
                    ),
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
      {/* MODAL 2: PAGAMENTO VIA MERCADO PAGO API                  */}
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
                (sum, p) =>
                  sum +
                  Number(
                    p.total ||
                      Number(p.quantity || 1) *
                        Number(p.unitPrice || p.price || 0),
                  ),
                0,
              ),
          }}
          tenant={tenant}
          user={user}
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
              .filter((c) => c.status !== "paid" && c.status !== "cancelled")
              .map((c) => ({
                value: c.id,
                label: `#${c.id} - ${c.clientName} (${c.barberName})`,
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
