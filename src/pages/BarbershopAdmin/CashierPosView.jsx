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
  Pencil,
  Plus,
  X,
  Scissors,
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
  targetComandaId = null,
  onClearTargetComanda,
  sharedComandas = [],
  onUpdateComandas,
  appointments = [],
  onUpdateAppointments,
  tenant,
  user,
  barbers = [],
  services = [],
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

  // Modal de Edição Completa de Dados da Comanda (Serviços e Produtos)
  const [editingComanda, setEditingComanda] = useState(null);
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState("");
  const [selectedProductToAdd, setSelectedProductToAdd] = useState("");

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

  // Destaque visual temporário da comanda selecionada na Agenda
  const [highlightedComandaId, setHighlightedComandaId] = useState(null);

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

  // Sincronização automática quando o usuário clica em "Ver comanda no caixa" ou "Abrir no Caixa" na Agenda
  useEffect(() => {
    if (!targetComandaId || !Array.isArray(comandas) || comandas.length === 0) return;

    const target = comandas.find(
      (c) => c.id === targetComandaId || c.appointmentId === targetComandaId
    );

    if (target) {
      // Ajusta para a data do agendamento alvo caso esteja em outro dia
      if (target.date && target.date !== selectedDate) {
        setSelectedDate(target.date);
        setViewAllDates(false);
      }

      // Se a comanda estiver cancelada e o filtro atual ocultar, ajusta filtro
      if (target.status === "cancelled") {
        setActiveFilter("cancelled");
      } else if (
        (activeFilter === "paid" && target.status !== "paid") ||
        (activeFilter === "open" && target.status !== "open") ||
        (activeFilter === "pending" && target.status !== "pending_payment")
      ) {
        setActiveFilter("all");
      }

      // Aplica destaque e rola suavemente até o card
      setHighlightedComandaId(target.id);

      setTimeout(() => {
        const el = document.getElementById(`comanda-card-${target.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);

      const timer = setTimeout(() => {
        setHighlightedComandaId(null);
        if (onClearTargetComanda) onClearTargetComanda();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [targetComandaId, comandas, selectedDate, activeFilter, onClearTargetComanda]);

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

  // Catálogo de Serviços para edição da comanda
  const availableServices = useMemo(() => {
    if (Array.isArray(services) && services.length > 0) {
      return services;
    }
    return [
      { id: "cat-s1", name: "Corte Degradê / Fade", price: 50 },
      { id: "cat-s2", name: "Barba Terapia com Toalha Quente", price: 40 },
      { id: "cat-s3", name: "Combo Cabelo + Barba VIP", price: 85 },
      { id: "cat-s4", name: "Pigmentação de Barba", price: 35 },
      { id: "cat-s5", name: "Sobrancelha na Navalha", price: 20 },
      { id: "cat-s6", name: "Acabamento / Pezinho", price: 25 },
      { id: "cat-s7", name: "Hidratação Capilar", price: 35 },
    ];
  }, [services]);

  // Salvar Alterações de Dados, Serviços e Produtos na Comanda
  const handleSaveEditedComanda = async (updatedComanda) => {
    if (!updatedComanda) return;

    const sList = Array.isArray(updatedComanda.services) ? updatedComanda.services : [];
    const pList = Array.isArray(updatedComanda.products) ? updatedComanda.products : [];
    const newPrice =
      sList.reduce((acc, s) => acc + Number(s.price || 0), 0) +
      pList.reduce(
        (acc, p) =>
          acc +
          Number(
            p.total ||
              Number(p.quantity || 1) * Number(p.unitPrice || p.price || 0)
          ),
        0
      );

    const nextComandas = comandas.map((c) =>
      c.id === updatedComanda.id ? updatedComanda : c
    );
    updateComandasState(nextComandas);

    // Se a comanda é oriunda de agendamento na agenda, atualiza o appointment correspondente
    if (updatedComanda.appointmentId || updatedComanda.source === "agenda") {
      const apptId = updatedComanda.appointmentId || updatedComanda.id;
      const primaryServiceName =
        sList.map((s) => s.name).join(" + ") || "Serviço de Barbearia";

      if (onUpdateAppointments) {
        onUpdateAppointments((prevAppts) =>
          prevAppts.map((a) =>
            a.id === apptId
              ? {
                  ...a,
                  clientName: updatedComanda.clientName,
                  clientPhone: updatedComanda.clientPhone,
                  barberName: updatedComanda.barberName,
                  serviceName: primaryServiceName,
                  price: newPrice,
                }
              : a
          )
        );
      }

      try {
        await supabase
          .from("appointments")
          .update({
            client_name: updatedComanda.clientName,
            client_phone: updatedComanda.clientPhone,
            barber_name: updatedComanda.barberName,
            service_name: primaryServiceName,
            price: newPrice,
          })
          .eq("id", apptId);
      } catch (err) {
        console.warn("Aviso ao sincronizar edição da comanda no Supabase:", err);
      }
    }

    setEditingComanda(null);
    setAlertSuccess(
      `Dados da Comanda #${updatedComanda.id} atualizados com sucesso! Serviços e produtos consolidados.`
    );
    setTimeout(() => setAlertSuccess(""), 4500);
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

          {/* Contêiner Geral Semelhante ao Painel da Barbearia (Envolve o Card de Títulos e os Cards dos Clientes) */}
          {filteredComandas.length > 0 ? (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-3 md:p-4 shadow-xl space-y-3">
              {/* Card de Título Separado com Colunas Perfeitamente Alinhadas aos Dados */}
              <div className="hidden xl:grid grid-cols-[1fr_210px_150px_180px_210px] gap-4 items-center px-4 md:px-5 py-3.5 bg-neutral-950 border border-neutral-800/80 rounded-2xl text-[11px] uppercase font-bold text-neutral-400 tracking-wider shadow-sm select-none">
                <div className="text-left">Nome do Cliente</div>
                <div className="text-left">Profissional Responsável</div>
                <div className="text-center">Total dos Serviços</div>
                <div className="text-center">Status</div>
                <div className="text-center">Ações</div>
              </div>

              {/* Cards dos Clientes dentro do Card Principal */}
              <div className="space-y-3">
                {filteredComandas.map((cmd) => (
                  <div
                    key={cmd.id}
                    id={`comanda-card-${cmd.id}`}
                    className={
                      highlightedComandaId === cmd.id
                        ? "ring-2 ring-amber-500 rounded-2xl transition-all duration-500 shadow-[0_0_20px_rgba(245,158,11,0.35)] animate-pulse"
                        : "transition-all duration-300"
                    }
                  >
                    <ComandaCard
                      comanda={cmd}
                      onAddItem={() => {
                        setSelectedComandaIdForAdd(cmd.id);
                        setProductToAdd(products[0]);
                        setIsAddItemModalOpen(true);
                      }}
                      onEditComanda={(targetCmd) => {
                        setEditingComanda(JSON.parse(JSON.stringify(targetCmd)));
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
                  </div>
                ))}
              </div>
            </div>
          ) : (
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

      {/* ======================================================== */}
      {/* MODAL 5: EDITAR DADOS DA COMANDA (SERVIÇOS E PRODUTOS)    */}
      {/* ======================================================== */}
      {editingComanda && (
        <Modal
          isOpen={!!editingComanda}
          size="lg"
          onClose={() => setEditingComanda(null)}
          title={`Editar Dados: Comanda #${editingComanda.id}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingComanda(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSaveEditedComanda(editingComanda)}
                className="bg-amber-600 hover:bg-amber-500 font-bold"
              >
                Salvar Alterações
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-left">
            {/* 1. DADOS DO CLIENTE E BARBEIRO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
              <Input
                label="Nome do Cliente"
                value={editingComanda.clientName || ""}
                onChange={(e) =>
                  setEditingComanda((prev) => ({
                    ...prev,
                    clientName: e.target.value,
                  }))
                }
                placeholder="Nome do cliente"
              />
              <Input
                label="Telefone / WhatsApp"
                value={editingComanda.clientPhone || ""}
                onChange={(e) =>
                  setEditingComanda((prev) => ({
                    ...prev,
                    clientPhone: e.target.value,
                  }))
                }
                placeholder="(11) 99999-9999"
              />
              <Select
                label="Barbeiro Responsável"
                value={editingComanda.barberName || (barbers[0]?.name || "Barbeiro")}
                onChange={(e) =>
                  setEditingComanda((prev) => ({
                    ...prev,
                    barberName: e.target.value,
                  }))
                }
                options={
                  barbers.length > 0
                    ? barbers.map((b) => ({ value: b.name, label: b.name }))
                    : [
                        {
                          value: editingComanda.barberName || "Barbeiro",
                          label: editingComanda.barberName || "Barbeiro",
                        },
                      ]
                }
              />
            </div>

            {/* 2. SERVIÇOS EXECUTADOS */}
            <div className="space-y-3 p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Serviços na Comanda ({(editingComanda.services || []).length})</span>
                </span>
                <span className="text-xs font-mono font-bold text-neutral-200">
                  Subtotal: R${" "}
                  {(editingComanda.services || [])
                    .reduce((a, s) => a + Number(s.price || 0), 0)
                    .toFixed(2)
                    .replace(".", ",")}
                </span>
              </div>

              {/* Lista de serviços atuais */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {(editingComanda.services || []).map((serv, idx) => (
                  <div
                    key={serv.id || idx}
                    className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="font-semibold text-neutral-200 flex-1 truncate">
                      {serv.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400 text-[10px]">R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={serv.price}
                        onChange={(e) => {
                          const newPrice = Number(e.target.value) || 0;
                          setEditingComanda((prev) => ({
                            ...prev,
                            services: prev.services.map((s, i) =>
                              i === idx
                                ? {
                                    ...s,
                                    price: newPrice,
                                    barberCommission: newPrice * 0.5,
                                  }
                                : s,
                            ),
                          }));
                        }}
                        className="w-20 px-2 py-1 bg-neutral-950 border border-neutral-700 rounded-lg text-xs font-mono text-emerald-400 text-right focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditingComanda((prev) => ({
                            ...prev,
                            services: prev.services.filter((_, i) => i !== idx),
                          }));
                        }}
                        className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Remover serviço"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {(!editingComanda.services || editingComanda.services.length === 0) && (
                  <p className="text-xs text-neutral-500 italic py-1 text-center">
                    Nenhum serviço nesta comanda.
                  </p>
                )}
              </div>

              {/* Adicionar novo serviço à comanda */}
              <div className="pt-2 border-t border-neutral-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedServiceToAdd}
                  onChange={(e) => setSelectedServiceToAdd(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-neutral-700 text-xs rounded-xl px-2.5 py-2 text-neutral-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Selecione um serviço do catálogo para adicionar...</option>
                  {availableServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - R$ {Number(s.price || 0).toFixed(2).replace(".", ",")}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!selectedServiceToAdd) return;
                    const found = availableServices.find(
                      (s) => s.id === selectedServiceToAdd,
                    );
                    if (found) {
                      const sPrice = Number(found.price || 0);
                      setEditingComanda((prev) => ({
                        ...prev,
                        services: [
                          ...(prev.services || []),
                          {
                            id: `s-${Date.now()}`,
                            name: found.name,
                            price: sPrice,
                            barberCommission: sPrice * 0.5,
                          },
                        ],
                      }));
                      setSelectedServiceToAdd("");
                    }
                  }}
                  className="text-xs py-2 px-3 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar Serviço
                </Button>
              </div>
            </div>

            {/* 3. PRODUTOS CONSUMIDOS (BAR & VITRINE) */}
            <div className="space-y-3 p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Beer className="w-3.5 h-3.5" />
                  <span>Produtos Consumidos ({(editingComanda.products || []).length})</span>
                </span>
                <span className="text-xs font-mono font-bold text-neutral-200">
                  Subtotal: R${" "}
                  {(editingComanda.products || [])
                    .reduce(
                      (a, p) =>
                        a +
                        Number(
                          p.total ||
                            Number(p.quantity || 1) *
                              Number(p.unitPrice || p.price || 0),
                        ),
                      0,
                    )
                    .toFixed(2)
                    .replace(".", ",")}
                </span>
              </div>

              {/* Lista de produtos atuais */}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {(editingComanda.products || []).map((prod, idx) => (
                  <div
                    key={prod.id || idx}
                    className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-200 truncate">{prod.name}</p>
                      <span className="text-[10px] text-neutral-400">
                        R${" "}
                        {Number(prod.unitPrice || prod.price || 0)
                          .toFixed(2)
                          .replace(".", ",")}{" "}
                        un.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-neutral-700 rounded-lg overflow-hidden bg-neutral-950">
                        <button
                          type="button"
                          onClick={() => {
                            const curQty = Number(prod.quantity || 1);
                            if (curQty > 1) {
                              const newQ = curQty - 1;
                              const uPrice = Number(prod.unitPrice || prod.price || 0);
                              setEditingComanda((prev) => ({
                                ...prev,
                                products: prev.products.map((p, i) =>
                                  i === idx
                                    ? {
                                        ...p,
                                        quantity: newQ,
                                        total: newQ * uPrice,
                                        sellerCommission: newQ * (uPrice * 0.1),
                                      }
                                    : p,
                                ),
                              }));
                            } else {
                              setEditingComanda((prev) => ({
                                ...prev,
                                products: prev.products.filter((_, i) => i !== idx),
                              }));
                            }
                          }}
                          className="px-2 py-0.5 text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono font-bold text-neutral-200">
                          {prod.quantity || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newQ = Number(prod.quantity || 1) + 1;
                            const uPrice = Number(prod.unitPrice || prod.price || 0);
                            setEditingComanda((prev) => ({
                              ...prev,
                              products: prev.products.map((p, i) =>
                                i === idx
                                ? {
                                    ...p,
                                    quantity: newQ,
                                    total: newQ * uPrice,
                                    sellerCommission: newQ * (uPrice * 0.1),
                                  }
                                : p,
                              ),
                            }));
                          }}
                          className="px-2 py-0.5 text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-mono font-bold text-neutral-200 w-16 text-right">
                        R${" "}
                        {Number(
                          prod.total ||
                            Number(prod.quantity || 1) *
                              Number(prod.unitPrice || prod.price || 0),
                        )
                          .toFixed(2)
                          .replace(".", ",")}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingComanda((prev) => ({
                            ...prev,
                            products: prev.products.filter((_, i) => i !== idx),
                          }));
                        }}
                        className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Remover produto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {(!editingComanda.products || editingComanda.products.length === 0) && (
                  <p className="text-xs text-neutral-500 italic py-1 text-center">
                    Nenhum produto consumido nesta comanda.
                  </p>
                )}
              </div>

              {/* Adicionar novo produto do estoque */}
              <div className="pt-2 border-t border-neutral-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedProductToAdd}
                  onChange={(e) => setSelectedProductToAdd(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-neutral-700 text-xs rounded-xl px-2.5 py-2 text-neutral-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Selecione um produto do estoque para adicionar...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - R$ {Number(p.price || 0).toFixed(2).replace(".", ",")} (Estoque:{" "}
                      {p.stock || 0})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!selectedProductToAdd) return;
                    const found = products.find((p) => p.id === selectedProductToAdd);
                    if (found) {
                      const uPrice = Number(found.price || 0);
                      setEditingComanda((prev) => {
                        const currentProds = prev.products || [];
                        const existIdx = currentProds.findIndex(
                          (p) => p.id === found.id,
                        );
                        if (existIdx >= 0) {
                          const updated = [...currentProds];
                          const nextQ = Number(updated[existIdx].quantity || 1) + 1;
                          updated[existIdx] = {
                            ...updated[existIdx],
                            quantity: nextQ,
                            total: nextQ * uPrice,
                            sellerCommission:
                              nextQ *
                              (uPrice * ((found.commissionPercent || 10) / 100)),
                          };
                          return { ...prev, products: updated };
                        }
                        return {
                          ...prev,
                          products: [
                            ...currentProds,
                            {
                              id: found.id,
                              name: found.name,
                              quantity: 1,
                              unitPrice: uPrice,
                              total: uPrice,
                              sellerCommission:
                                uPrice * ((found.commissionPercent || 10) / 100),
                            },
                          ],
                        };
                      });
                      setSelectedProductToAdd("");
                    }
                  }}
                  className="text-xs py-2 px-3 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar Produto
                </Button>
              </div>
            </div>

            {/* 4. TOTAL GERAL RECALCULADO */}
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-300 uppercase tracking-wider">
                Total Geral da Comanda
              </span>
              <span className="text-lg font-black font-mono text-emerald-400">
                R${" "}
                {(
                  (editingComanda.services || []).reduce(
                    (a, s) => a + Number(s.price || 0),
                    0,
                  ) +
                  (editingComanda.products || []).reduce(
                    (a, p) =>
                      a +
                      Number(
                        p.total ||
                          Number(p.quantity || 1) *
                            Number(p.unitPrice || p.price || 0),
                      ),
                    0,
                  )
                )
                  .toFixed(2)
                  .replace(".", ",")}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
