import { useState, useMemo, useEffect } from "react";
import DOMPurify from "dompurify";
import { financialStyles } from "./FinancialDashboardView.styles";
import StatCard from "../../components/dashboard/StatCard";
import FinancialChart from "../../components/dashboard/FinancialChart";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import ProjectIcon from "../../components/ui/ProjectIcon";
import { SafeHtml } from "../../components/ui/SafeHtml";
import {
  generatePixBrCodePayload,
  generatePixQrCodeDataUrl,
  normalizePixKeyForBrCode,
} from "../../utils/pixQrCode";
import { supabase } from "../../lib/supabase";
import { safeStorage } from "../../utils/safeStorage";

const SETTLEMENTS_STORAGE_KEY = "barbearia_settlements_history";

export default function FinancialDashboardView({
  initialTab = "visao_geral", // 'visao_geral' | 'pagamentos'
  appointments = [],
  onUpdateAppointments,
  barbers = [],
  onUpdateBarbers,
  comandas = [],
  onUpdateComandas,
  tenant,
  user,
  onBack,
}) {
  const [activeTab, setActiveTab] = useState(initialTab || "visao_geral");
  const [selectedPeriod, setSelectedPeriod] = useState("month"); // 'today' | 'week' | 'month' | 'last_month' | 'all'
  const [isPrivacyActive, setIsPrivacyActive] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Estados para o fluxo de Pix, Extrato e Quitação
  const [selectedBarberForPix, setSelectedBarberForPix] = useState(null);
  const [pixModalData, setPixModalData] = useState(null); // { qrCodeUrl, brCodePayload, barber, amount }
  const [pixModalLoading, setPixModalLoading] = useState(false);
  const [copiedKeyBarberId, setCopiedKeyBarberId] = useState(null);
  const [copiedBrCode, setCopiedBrCode] = useState(false);

  // Estado para Modal de Extrato & Relatório Individual
  const [statementModalBarber, setStatementModalBarber] = useState(null);

  // Estado para Modal de Quitação ("Marcar como Pago" - Exclusivo Dono)
  const [settlementModalBarber, setSettlementModalBarber] = useState(null);
  const [settlementNotes, setSettlementNotes] = useState("");
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);
  const [settlementSuccessMessage, setSettlementSuccessMessage] = useState("");

  // Histórico de Quitações / Fechamentos
  const [settlementsHistory, setSettlementsHistory] = useState(() => {
    try {
      const stored = safeStorage.getItem(SETTLEMENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Carrega histórico de quitações do Supabase no mount
  useEffect(() => {
    let isMounted = true;
    async function loadSettlements() {
      try {
        const tenantId = tenant?.id || "788299e3-a26c-4a0b-bc71-c7ae81ed40d3";
        const { data, error } = await supabase
          .from("barber_settlements")
          .select("*")
          .eq("barbershop_id", tenantId)
          .order("paid_at", { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0 && isMounted) {
          setSettlementsHistory(data);
          safeStorage.setItem(SETTLEMENTS_STORAGE_KEY, JSON.stringify(data));
        }
      } catch {
        // Fallback para cache local em caso de rede offline
      }
    }
    loadSettlements();
    return () => {
      isMounted = false;
    };
  }, [tenant?.id]);

  // Sincroniza activeTab se initialTab mudar externamente
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // ========================================================
  // 1. RBAC: Identifica se o usuário é Dono/Administrador
  // ========================================================
  const isOwnerOrAdmin = useMemo(() => {
    const role = (user?.role || user?.user_metadata?.role || "").toLowerCase().trim();
    if (role === "admin" || role === "owner" || role === "superadmin") return true;

    const userEmail = (user?.email || user?.user_metadata?.email || "").toLowerCase().trim();
    const ownerEmail = (tenant?.owner_email || "").toLowerCase().trim();
    if (userEmail && ownerEmail && userEmail === ownerEmail) return true;

    // Se nenhum perfil restritivo foi definido explicitamente, assume visão de gestão no painel admin
    return role !== "barber" && role !== "employee";
  }, [user, tenant]);

  // Se for colaborador/barbeiro comum, filtra para ver estritamente apenas seu próprio registro
  const visibleBarbers = useMemo(() => {
    if (!Array.isArray(barbers)) return [];
    if (isOwnerOrAdmin) {
      return barbers.filter((b) => b.status !== "inactive");
    }

    const currentEmail = (user?.email || user?.user_metadata?.email || "").toLowerCase().trim();
    const currentId = user?.id;

    const matched = barbers.filter(
      (b) =>
        (b.id && currentId && String(b.id) === String(currentId)) ||
        (b.email && currentEmail && b.email.toLowerCase().trim() === currentEmail),
    );

    // Se encontrou o barbeiro logado, retorna apenas ele; se não, mostra o primeiro disponível como fallback
    return matched.length > 0 ? matched : barbers.slice(0, 1);
  }, [barbers, isOwnerOrAdmin, user]);

  // ========================================================
  // 2. FILTRAGEM POR PERÍODO DE TEMPO
  // ========================================================
  const filterByPeriod = (itemDateStr) => {
    if (!itemDateStr) return true;
    if (selectedPeriod === "all") return true;

    const targetDate = new Date(itemDateStr);
    if (isNaN(targetDate.getTime())) return true;

    const now = new Date();
    const targetY = targetDate.getFullYear();
    const targetM = targetDate.getMonth();
    const targetD = targetDate.getDate();

    const nowY = now.getFullYear();
    const nowM = now.getMonth();
    const nowD = now.getDate();

    if (selectedPeriod === "today") {
      return targetY === nowY && targetM === nowM && targetD === nowD;
    }

    if (selectedPeriod === "week") {
      // Últimos 7 dias
      const diffMs = now.getTime() - targetDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }

    if (selectedPeriod === "month") {
      return targetY === nowY && targetM === nowM;
    }

    if (selectedPeriod === "last_month") {
      const prevM = nowM === 0 ? 11 : nowM - 1;
      const prevY = nowM === 0 ? nowY - 1 : nowY;
      return targetY === prevY && targetM === prevM;
    }

    return true;
  };

  // ========================================================
  // 3. ATENDIMENTOS E COMANDAS PAGAS NO PERÍODO
  // ========================================================
  const paidAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    return appointments.filter((a) => {
      const isPaid = Boolean(a.isPaid || a.is_paid || a.status === "completed" || a.status === "confirmed" || a.status === "paid");
      const isCancelled = a.status === "cancelled" || a.status === "cancelado";
      if (!isPaid || isCancelled) return false;
      const dateStr = a.date || a.bookingDate || a.start_time || a.created_at;
      return filterByPeriod(dateStr);
    });
  }, [appointments, selectedPeriod]);

  const paidComandas = useMemo(() => {
    if (!Array.isArray(comandas)) return [];
    return comandas.filter((c) => {
      const isPaid = Boolean(c.status === "paid" || c.isPaid);
      if (!isPaid) return false;
      const dateStr = c.date || c.closed_at || c.created_at;
      return filterByPeriod(dateStr);
    });
  }, [comandas, selectedPeriod]);

  // ========================================================
  // 4. BIG NUMBERS GERAIS (VISÃO GERAL & DRE)
  // ========================================================
  const appointmentsRevenue = paidAppointments.reduce(
    (sum, a) => sum + Number(a.price || 0),
    0,
  );

  const comandasRevenue = paidComandas.reduce((sum, c) => {
    const serv = (c.services || []).reduce((s, item) => s + Number(item.price || 0), 0);
    const prod = (c.products || []).reduce((p, item) => p + Number(item.total || (item.price * (item.quantity || 1)) || 0), 0);
    return sum + serv + prod;
  }, 0);

  const grossRevenue = appointmentsRevenue + comandasRevenue;

  // ========================================================
  // 5. MOTOR DE CÁLCULO INDIVIDUAL DE REPASSES POR BARBEIRO
  // ========================================================
  const barbersCommissions = useMemo(() => {
    return visibleBarbers.map((barber) => {
      const barberId = String(barber.id);

      // Taxas contratuais individuais de comissão
      const serviceCommRate = Number(
        barber.service_commission ?? barber.serviceCommission ?? barber.commission_percentage ?? 50,
      );
      const productCommRate = Number(
        barber.product_commission ?? barber.productCommission ?? 10,
      );

      // Apenas itens onde settlement_id é NULO (saldo pendente em aberto)
      const unsettledAppointments = paidAppointments.filter((a) => {
        const matchesBarber = String(a.barberId || a.barber_id) === barberId;
        const isNotSettled = !a.settlement_id && !a.settlementId;
        return matchesBarber && isNotSettled;
      });

      const unsettledComandas = paidComandas.filter((c) => {
        const matchesBarber = String(c.barberId || c.barber_id) === barberId;
        const isNotSettled = !c.settlement_id && !c.settlementId;
        return matchesBarber && isNotSettled;
      });

      // Detalhamento dos serviços realizados
      const serviceItems = [];
      let servicesGrossTotal = 0;
      let servicesCommTotal = 0;

      unsettledAppointments.forEach((appt) => {
        const grossPrice = Number(appt.price || 0);
        const comm = (grossPrice * serviceCommRate) / 100;
        servicesGrossTotal += grossPrice;
        servicesCommTotal += comm;

        serviceItems.push({
          id: `appt-${appt.id}`,
          referenceId: appt.id,
          source: "appointment",
          type: "service",
          description: appt.serviceName || appt.service_name || "Serviço Agendado",
          clientName: appt.clientName || appt.client_name || "Cliente",
          date: appt.date || appt.created_at || "Hoje",
          grossPrice,
          commRate: serviceCommRate,
          commission: comm,
        });
      });

      // Detalhamento dos produtos e serviços de comanda avulsos (sem duplicar agendamentos)
      const productItems = [];
      let productsGrossTotal = 0;
      let productsCommTotal = 0;

      unsettledComandas.forEach((cmd) => {
        // Produtos da comanda
        if (Array.isArray(cmd.products)) {
          cmd.products.forEach((prod, pIdx) => {
            const itemGross = Number(prod.total || (Number(prod.price || 0) * Number(prod.quantity || 1)) || 0);
            const comm = (itemGross * productCommRate) / 100;
            productsGrossTotal += itemGross;
            productsCommTotal += comm;

            productItems.push({
              id: `cmd-prod-${cmd.id}-${pIdx}`,
              referenceId: cmd.id,
              source: "comanda_product",
              type: "product",
              description: prod.name || prod.productName || "Produto / Bar",
              clientName: cmd.clientName || cmd.client_name || "Cliente Balcão",
              date: cmd.date || cmd.closed_at || cmd.created_at || "Hoje",
              grossPrice: itemGross,
              commRate: productCommRate,
              commission: comm,
            });
          });
        }

        // Serviços extras de comanda não originados da agenda
        if (Array.isArray(cmd.services) && !cmd.appointmentId) {
          cmd.services.forEach((serv, sIdx) => {
            const itemGross = Number(serv.price || 0);
            const comm = (itemGross * serviceCommRate) / 100;
            servicesGrossTotal += itemGross;
            servicesCommTotal += comm;

            serviceItems.push({
              id: `cmd-serv-${cmd.id}-${sIdx}`,
              referenceId: cmd.id,
              source: "comanda_service",
              type: "service",
              description: serv.name || "Serviço Balcão",
              clientName: cmd.clientName || cmd.client_name || "Cliente Balcão",
              date: cmd.date || cmd.closed_at || cmd.created_at || "Hoje",
              grossPrice: itemGross,
              commRate: serviceCommRate,
              commission: comm,
            });
          });
        }
      });

      const totalToPay = servicesCommTotal + productsCommTotal;
      const totalGrossGenerated = servicesGrossTotal + productsGrossTotal;

      // Normaliza dados do Pix do barbeiro
      const pixType = barber.pix_type || barber.pixType || "cpf";
      const pixKey = barber.pix_key || barber.pixKey || "";

      return {
        id: barber.id,
        barberRaw: barber,
        name: barber.name,
        role: barber.role || "Barbeiro",
        avatar: barber.avatar,
        phone: barber.phone || "",
        email: barber.email || "",
        pixType,
        pixKey,
        serviceCommRate,
        productCommRate,
        servicesCount: serviceItems.length,
        productsCount: productItems.length,
        servicesGrossTotal,
        servicesCommTotal,
        productsGrossTotal,
        productsCommTotal,
        totalGrossGenerated,
        totalToPay,
        allItems: [...serviceItems, ...productItems],
        unsettledAppointments,
        unsettledComandas,
        status: totalToPay > 0 ? "pending" : "settled",
      };
    });
  }, [visibleBarbers, paidAppointments, paidComandas]);

  // Total acumulado de comissões pendentes na casa
  const totalCommissionsPayable = useMemo(() => {
    return barbersCommissions.reduce((sum, b) => sum + b.totalToPay, 0);
  }, [barbersCommissions]);

  const netProfit = Math.max(0, grossRevenue - totalCommissionsPayable);
  const totalCompletedServices = paidAppointments.length || (grossRevenue > 0 ? 1 : 0);
  const averageTicket = totalCompletedServices > 0 ? grossRevenue / totalCompletedServices : 0;
  const activeBarbersCount = visibleBarbers.length || 1;
  const occupancyRate = Math.min(100, Math.round((paidAppointments.length / (activeBarbersCount * 8 || 1)) * 100));

  // Dados para gráficos
  const weeklyData = useMemo(() => {
    const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    return labels.map((lbl, idx) => ({
      label: lbl,
      fullLabel: lbl,
      services: idx === 6 ? 0 : Math.round(appointmentsRevenue / 6),
      products: idx === 6 ? 0 : Math.round(comandasRevenue / 6),
    }));
  }, [appointmentsRevenue, comandasRevenue]);

  const monthlyData = useMemo(() => {
    return [
      { label: "Sem 1", fullLabel: "Semana 1", services: Math.round(appointmentsRevenue * 0.25), products: Math.round(comandasRevenue * 0.25) },
      { label: "Sem 2", fullLabel: "Semana 2", services: Math.round(appointmentsRevenue * 0.25), products: Math.round(comandasRevenue * 0.25) },
      { label: "Sem 3", fullLabel: "Semana 3", services: Math.round(appointmentsRevenue * 0.25), products: Math.round(comandasRevenue * 0.25) },
      { label: "Sem 4", fullLabel: "Semana 4", services: Math.round(appointmentsRevenue * 0.25), products: Math.round(comandasRevenue * 0.25) },
    ];
  }, [appointmentsRevenue, comandasRevenue]);

  // ========================================================
  // 6. AÇÕES: COPIAR CHAVE PIX E GERAR QR CODE PIX
  // ========================================================
  const handleCopyPixKey = async (barberId, rawKey) => {
    if (!rawKey) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(rawKey);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = rawKey;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedKeyBarberId(barberId);
      setTimeout(() => setCopiedKeyBarberId(null), 2500);
    } catch {
      // Ignora erro
    }
  };

  const handleOpenPixQrCodeModal = async (barberCommissionData) => {
    setSelectedBarberForPix(barberCommissionData);
    setPixModalLoading(true);
    setCopiedBrCode(false);

    try {
      const pixKey = barberCommissionData.pixKey;
      const amount = barberCommissionData.totalToPay;
      const cleanName = barberCommissionData.name || "BARBEIRO";

      const brCodePayload = generatePixBrCodePayload({
        pixKey: pixKey || "00000000000",
        merchantName: cleanName,
        merchantCity: "BARBEARIA",
        amount: Number(amount.toFixed(2)),
        txid: `REP${Date.now().toString().slice(-10)}`,
      });

      const qrCodeUrl = await generatePixQrCodeDataUrl(brCodePayload);

      setPixModalData({
        qrCodeUrl,
        brCodePayload,
        barber: barberCommissionData,
        amount,
      });
    } catch (err) {
      console.error("Erro ao gerar QR Code Pix:", err);
    } finally {
      setPixModalLoading(false);
    }
  };

  const handleCopyBrCode = async () => {
    if (!pixModalData?.brCodePayload) return;
    try {
      await navigator.clipboard.writeText(pixModalData.brCodePayload);
      setCopiedBrCode(true);
      setTimeout(() => setCopiedBrCode(false), 2500);
    } catch {
      // ignore
    }
  };

  // ========================================================
  // 7. AÇÃO EXCLUSIVA DO DONO: MARCAR COMO PAGO (QUITAÇÃO)
  // ========================================================
  const handleOpenSettlementModal = (barberCommissionData) => {
    setSettlementModalBarber(barberCommissionData);
    setSettlementNotes("");
    setSettlementSuccessMessage("");
  };

  const handleConfirmSettlement = async () => {
    if (!settlementModalBarber || isSubmittingSettlement) return;
    setIsSubmittingSettlement(true);

    try {
      const tenantId = tenant?.id || "788299e3-a26c-4a0b-bc71-c7ae81ed40d3";
      const settlementId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `settle-${Date.now()}`;

      const now = new Date();
      const paidAtStr = now.toISOString();
      const periodStartStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const periodEndStr = now.toISOString().slice(0, 10);

      const payload = {
        id: settlementId,
        barbershop_id: tenantId,
        barber_id: String(settlementModalBarber.id),
        barber_name: settlementModalBarber.name,
        period_start: periodStartStr,
        period_end: periodEndStr,
        services_amount: Number(settlementModalBarber.servicesCommTotal.toFixed(2)),
        products_amount: Number(settlementModalBarber.productsCommTotal.toFixed(2)),
        total_paid: Number(settlementModalBarber.totalToPay.toFixed(2)),
        services_count: settlementModalBarber.servicesCount,
        products_count: settlementModalBarber.productsCount,
        pix_key_used: settlementModalBarber.pixKey || "Não informada",
        paid_by: user?.id || null,
        paid_at: paidAtStr,
        notes: settlementNotes?.trim() ? DOMPurify.sanitize(settlementNotes.trim(), { ALLOWED_TAGS: [] }) : null,
      };

      // 1. Tenta salvar na tabela barber_settlements no Supabase
      try {
        await supabase.from("barber_settlements").insert([payload]);
      } catch (dbErr) {
        console.warn("Aviso ao salvar settlement no Supabase:", dbErr);
      }

      // 2. Atualiza settlement_id nos agendamentos da equipe
      const apptIdsToUpdate = settlementModalBarber.unsettledAppointments.map((a) => a.id);
      if (apptIdsToUpdate.length > 0) {
        try {
          await supabase
            .from("appointments")
            .update({ settlement_id: settlementId })
            .in("id", apptIdsToUpdate);
        } catch (appErr) {
          console.warn("Aviso ao vincular settlement_id em appointments:", appErr);
        }

        if (onUpdateAppointments && Array.isArray(appointments)) {
          const updated = appointments.map((a) =>
            apptIdsToUpdate.includes(a.id) ? { ...a, settlement_id: settlementId, settlementId } : a,
          );
          onUpdateAppointments(updated);
        }
      }

      // 3. Atualiza settlement_id nas comandas da equipe
      const cmdIdsToUpdate = settlementModalBarber.unsettledComandas.map((c) => c.id);
      if (cmdIdsToUpdate.length > 0) {
        try {
          await supabase
            .from("comandas")
            .update({ settlement_id: settlementId })
            .in("id", cmdIdsToUpdate);
        } catch (cmdErr) {
          console.warn("Aviso ao vincular settlement_id em comandas:", cmdErr);
        }

        if (onUpdateComandas && Array.isArray(comandas)) {
          const updated = comandas.map((c) =>
            cmdIdsToUpdate.includes(c.id) ? { ...c, settlement_id: settlementId, settlementId } : c,
          );
          onUpdateComandas(updated);
        }
      }

      // 4. Salva no histórico de quitações local
      const updatedHistory = [payload, ...settlementsHistory];
      setSettlementsHistory(updatedHistory);
      safeStorage.setItem(SETTLEMENTS_STORAGE_KEY, JSON.stringify(updatedHistory));

      setSettlementSuccessMessage(`Comissão de ${settlementModalBarber.name} no valor de R$ ${settlementModalBarber.totalToPay.toFixed(2)} liquidada com sucesso!`);
      setTimeout(() => {
        setSettlementModalBarber(null);
        setSettlementSuccessMessage("");
      }, 2000);
    } catch (err) {
      console.error("Falha ao quitar comissão:", err);
      alert("Não foi possível liquidar o lote de comissão. Tente novamente.");
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  // ========================================================
  // 8. RELATÓRIO E EXTRATO: IMPRESSÃO E WHATSAPP
  // ========================================================
  const handlePrintStatement = () => {
    window.print();
  };

  const handleSendStatementWhatsApp = (statementData) => {
    if (!statementData) return;

    const rawPhone = statementData.phone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");

    const periodLabel =
      selectedPeriod === "today"
        ? "Hoje"
        : selectedPeriod === "week"
        ? "Esta Semana"
        : selectedPeriod === "month"
        ? "Este Mês"
        : selectedPeriod === "last_month"
        ? "Mês Anterior"
        : "Acumulado";

    const textLines = [
      `💈 *EXTRATO DE COMISSÕES - ${tenant?.name || "BARBEARIA"}*`,
      `👤 *Profissional:* ${statementData.name}`,
      `📅 *Período:* ${periodLabel}`,
      `-----------------------------------------`,
      `✂️ *Serviços (${statementData.servicesCount}):* R$ ${statementData.servicesCommTotal.toFixed(2)}`,
      `🧴 *Produtos / Bar (${statementData.productsCount}):* R$ ${statementData.productsCommTotal.toFixed(2)}`,
      `💰 *TOTAL LÍQUIDO A RECEBER: R$ ${statementData.totalToPay.toFixed(2)}*`,
      `-----------------------------------------`,
      `🔑 *Chave Pix:* ${statementData.pixKey || "Não cadastrada"} (${statementData.pixType.toUpperCase()})`,
      `📊 *Faturamento Bruto Gerado:* R$ ${statementData.totalGrossGenerated.toFixed(2)}`,
      `-----------------------------------------`,
      `Agradecemos pela dedicação e excelente trabalho! 🚀`,
    ];

    const message = encodeURIComponent(textLines.join("\n"));
    const waUrl = cleanPhone.length >= 10
      ? `https://wa.me/55${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // Helper para rótulo do Pix Badge
  const getPixBadgeLabel = (type) => {
    switch (type) {
      case "cpf":
        return "CPF";
      case "phone":
        return "Celular";
      case "email":
        return "E-mail";
      case "random":
        return "Chave Aleatória (EVP)";
      default:
        return "PIX";
    }
  };

  return (
    <div className={financialStyles.container}>
      {/* 1. CABEÇALHO COM ABAS E CONTROLES */}
      <div className={financialStyles.headerCard}>
        <div className={financialStyles.titleWrapper}>
          <div className="flex items-center gap-2">
            <ProjectIcon name="DollarSign" size={26} className="text-amber-500" />
            <h1 className={financialStyles.title}>
              Financeiro & Repasses da Equipe
            </h1>
          </div>
          <p className={financialStyles.subtitle}>
            {activeTab === "visao_geral"
              ? "Visão executiva em tempo real: faturamento bruto, DRE, lucratividade e big numbers."
              : "Submenu oficial de pagamentos: repasse de comissões por profissional, chave Pix, QR Code BCB e quitação."}
          </p>

          {/* ABAS SUPERIORES */}
          <div className="flex items-center gap-2 pt-3">
            <button
              onClick={() => setActiveTab("visao_geral")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "visao_geral"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-900/30 ring-1 ring-amber-400"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              <ProjectIcon name="BarChart3" size={15} colorVariant="inherit" />
              <span>Visão Geral & DRE</span>
            </button>

            <button
              onClick={() => setActiveTab("pagamentos")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "pagamentos"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-900/30 ring-1 ring-amber-400"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              <ProjectIcon name="CreditCard" size={15} colorVariant="inherit" />
              <span>Pagamentos & Comissões</span>
              {totalCommissionsPayable > 0 && (
                <span className="bg-amber-400 text-neutral-950 font-mono text-[10px] px-1.5 py-0.5 rounded-full font-black">
                  {barbersCommissions.filter((b) => b.totalToPay > 0).length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className={financialStyles.controlsRow}>
          {/* Seletor de Período */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className={financialStyles.periodSelect}
            aria-label="Filtrar Período"
          >
            <option value="today">Hoje</option>
            <option value="week">Esta Semana (Últimos 7 dias)</option>
            <option value="month">Este Mês (Atual)</option>
            <option value="last_month">Mês Anterior</option>
            <option value="all">Todo o Histórico (Acumulado)</option>
          </select>

          {/* Botão Modo Privacidade (Ocultar Valores) */}
          <Button
            variant={isPrivacyActive ? "primary" : "secondary"}
            onClick={() => setIsPrivacyActive((prev) => !prev)}
            className="text-xs py-2 px-3"
            title="Ocultar valores monetários na tela"
          >
            {isPrivacyActive ? (
              <ProjectIcon name="EyeOff" size={15} colorVariant="inherit" />
            ) : (
              <ProjectIcon name="Eye" size={15} colorVariant="inherit" />
            )}
            <span className="hidden sm:inline">
              {isPrivacyActive ? "Revelar" : "Privacidade"}
            </span>
          </Button>

          {/* Botão Exportar DRE */}
          {activeTab === "visao_geral" && (
            <Button
              variant="outline"
              onClick={() => setIsExportModalOpen(true)}
              className="text-xs py-2 px-3"
            >
              <ProjectIcon name="FileText" size={15} colorVariant="inherit" />
              <span>Exportar DRE</span>
            </Button>
          )}

          {onBack && (
            <Button
              variant="secondary"
              onClick={onBack}
              className="text-xs py-2 px-3"
            >
              <span className="flex items-center gap-1.5">
                <ProjectIcon name="ArrowLeft" size={14} colorVariant="inherit" />
                Voltar
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: VISÃO GERAL & DRE                                 */}
      {/* ======================================================== */}
      {activeTab === "visao_geral" && (
        <div className="space-y-6">
          {/* 5 BIG NUMBERS EM DESTAQUE */}
          <div className={financialStyles.kpiGrid}>
            <StatCard
              title="Faturamento Bruto"
              value={`R$ ${grossRevenue.toFixed(2).replace(".", ",")}`}
              icon="DollarSign"
              theme="gold"
              isMasked={isPrivacyActive}
              delta={{
                value: "+14.2%",
                isPositive: true,
                comparisonText: "no período selecionado",
              }}
            />

            <StatCard
              title="Comissões da Equipe"
              value={`R$ ${totalCommissionsPayable.toFixed(2).replace(".", ",")}`}
              icon="Scissors"
              theme="purple"
              isMasked={isPrivacyActive}
              delta={{
                value: `${grossRevenue > 0 ? Math.round((totalCommissionsPayable / grossRevenue) * 100) : 0}%`,
                isPositive: null,
                comparisonText: "do faturamento apurado",
              }}
            />

            <StatCard
              title="Lucro Líquido (Casa)"
              value={`R$ ${netProfit.toFixed(2).replace(".", ",")}`}
              icon="Building2"
              theme="green"
              isMasked={isPrivacyActive}
              delta={{
                value: "+18.5%",
                isPositive: true,
                comparisonText: "margem real limpa",
              }}
            />

            <StatCard
              title="Ticket Médio"
              value={`R$ ${averageTicket.toFixed(2).replace(".", ",")}`}
              icon="TrendingUp"
              theme="blue"
              isMasked={isPrivacyActive}
              delta={{
                value: `${totalCompletedServices} cortes`,
                isPositive: true,
                comparisonText: "volume de clientes",
              }}
            />

            <StatCard
              title="Ocupação das Cadeiras"
              value={`${occupancyRate}%`}
              icon="Armchair"
              theme="gold"
              isMasked={isPrivacyActive}
              delta={{
                value: "Alta demanda",
                isPositive: true,
                comparisonText: "capacidade ativa",
              }}
            />
          </div>

          {/* GRÁFICO DE EVOLUÇÃO ALIMENTADO POR DADOS DINÂMICOS */}
          <FinancialChart
            weeklyData={weeklyData}
            monthlyData={monthlyData}
            yearlyData={[
              {
                label: "Ano",
                fullLabel: "Consolidado 2026",
                services: Math.round(appointmentsRevenue),
                products: Math.round(comandasRevenue),
              },
            ]}
          />

          {/* BANNER DE ACESSO RÁPIDO AO SUBMENU DE PAGAMENTOS */}
          <div className="p-6 bg-gradient-to-r from-neutral-900 to-amber-950/30 border border-amber-900/40 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ProjectIcon name="CreditCard" size={20} className="text-amber-500" />
                <span>Gestão Centralizada de Repasses & Chave Pix</span>
              </h3>
              <p className="text-xs text-neutral-300">
                Acesse o submenu de pagamentos para visualizar os cards individuais de cada barbeiro,
                copiar a chave Pix, gerar QR Code dinâmico do Banco Central e liquidar os lotes.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setActiveTab("pagamentos")}
              className="bg-amber-600 hover:bg-amber-500 font-bold text-xs py-2 px-5 whitespace-nowrap shadow-lg shadow-amber-900/40"
            >
              <span>Ver Cards de Pagamento ({barbersCommissions.length})</span>
              <ProjectIcon name="ArrowRight" size={15} colorVariant="inherit" />
            </Button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: SUBMENU PAGAMENTOS & REPASSES POR PROFISSIONAL    */}
      {/* ======================================================== */}
      {activeTab === "pagamentos" && (
        <div className="space-y-6">
          {/* HEADER DA SEÇÃO DE REPASSES */}
          <div className={financialStyles.commissionSection}>
            <div className={financialStyles.sectionHeader}>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={financialStyles.sectionTitle}>
                    <ProjectIcon name="Scissors" size={20} className="text-amber-500" />
                    <span>Cards de Repasses e Comissões da Equipe</span>
                  </h2>
                  {isOwnerOrAdmin ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Painel do Dono (Gestão Completa)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Seu Extrato Individual
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Valores apurados automaticamente a partir dos atendimentos da agenda e comandas pagas do caixa.
                </p>
              </div>

              <div className="text-left sm:text-right bg-neutral-950 p-3 rounded-2xl border border-neutral-800">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                  Total a Repassar no Período:
                </span>
                <span className="text-lg font-black font-mono text-emerald-400">
                  {isPrivacyActive
                    ? "••••••"
                    : `R$ ${totalCommissionsPayable.toFixed(2).replace(".", ",")}`}
                </span>
              </div>
            </div>

            {/* GRADE DE CARDS DOS PROFISSIONAIS */}
            <div className={financialStyles.barbersGrid}>
              {barbersCommissions.map((barber) => (
                <div
                  key={barber.id}
                  className="p-5 bg-neutral-950 border border-neutral-800 rounded-3xl flex flex-col justify-between space-y-4 shadow-xl hover:border-neutral-700 transition-all"
                >
                  {/* IDENTIFICAÇÃO DO PROFISSIONAL */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-base shrink-0 overflow-hidden">
                        {barber.avatar ? (
                          <img
                            src={barber.avatar}
                            alt={barber.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (barber.name || "B").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight">
                          <SafeHtml html={barber.name} />
                        </h4>
                        <p className="text-xs text-neutral-400">
                          <SafeHtml html={barber.role} />
                        </p>
                      </div>
                    </div>

                    <Badge
                      status={barber.totalToPay === 0 ? "completed" : "waiting"}
                      label={barber.totalToPay === 0 ? "Quitado" : "Pendente"}
                      size="sm"
                    />
                  </div>

                  {/* BLOCO DA CHAVE PIX */}
                  <div className="p-3 bg-neutral-900 border border-neutral-800/90 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1.5">
                        <ProjectIcon name="Key" size={12} className="text-amber-500" />
                        Chave Pix:
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {getPixBadgeLabel(barber.pixType)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-neutral-950 p-2 rounded-xl border border-neutral-800">
                      <span
                        className="font-mono text-xs text-neutral-200 truncate select-all"
                        title={barber.pixKey || "Chave Pix não cadastrada na Equipe"}
                      >
                        {barber.pixKey || "Não cadastrada"}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Botão Copiar Chave */}
                        <button
                          type="button"
                          onClick={() => handleCopyPixKey(barber.id, barber.pixKey)}
                          disabled={!barber.pixKey}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Copiar Chave Pix"
                        >
                          {copiedKeyBarberId === barber.id ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              <ProjectIcon name="Check" size={13} className="text-emerald-400" />
                              Copiado
                            </span>
                          ) : (
                            <ProjectIcon name="Copy" size={13} colorVariant="inherit" />
                          )}
                        </button>

                        {/* Botão Gerar QR Code Pix */}
                        <button
                          type="button"
                          onClick={() => handleOpenPixQrCodeModal(barber)}
                          disabled={!barber.pixKey || barber.totalToPay <= 0}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Gerar QR Code Pix com o valor da comissão"
                        >
                          <ProjectIcon name="QrCode" size={13} colorVariant="inherit" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* DISCRIMINAÇÃO DOS VALORES */}
                  <div className="p-3 bg-neutral-900 border border-neutral-800/80 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="flex items-center gap-1 text-[11px]">
                        <ProjectIcon name="Scissors" size={12} className="text-amber-500" />
                        Comissão Serviços ({barber.servicesCount}):
                      </span>
                      <strong className="font-mono text-white">
                        {isPrivacyActive
                          ? "••••••"
                          : `R$ ${barber.servicesCommTotal.toFixed(2)}`}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="flex items-center gap-1 text-[11px]">
                        <ProjectIcon name="Package" size={12} className="text-amber-500" />
                        Comissão Produtos ({barber.productsCount}):
                      </span>
                      <strong className="font-mono text-white">
                        {isPrivacyActive
                          ? "••••••"
                          : `R$ ${barber.productsCommTotal.toFixed(2)}`}
                      </strong>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/80 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-black block">
                          Total a Pagar:
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          Bruto gerado: R$ {barber.totalGrossGenerated.toFixed(2)}
                        </span>
                      </div>
                      <strong className="font-mono font-black text-amber-400 text-base">
                        {isPrivacyActive
                          ? "••••••"
                          : `R$ ${barber.totalToPay.toFixed(2)}`}
                      </strong>
                    </div>
                  </div>

                  {/* AÇÕES DO CARD */}
                  <div className="space-y-2 pt-1">
                    {/* Botão Marcar como Pago - ESTRITAMENTE EXCLUSIVO DO DONO/ADMIN */}
                    {isOwnerOrAdmin && (
                      <Button
                        variant={barber.totalToPay > 0 ? "primary" : "secondary"}
                        disabled={barber.totalToPay <= 0}
                        onClick={() => handleOpenSettlementModal(barber)}
                        className={`w-full text-xs py-2 font-bold flex items-center justify-center gap-1.5 ${
                          barber.totalToPay > 0
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
                            : "opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <ProjectIcon name="CheckCircle" size={14} colorVariant="inherit" />
                        <span>
                          {barber.totalToPay > 0
                            ? "Marcar como Pago (Liquidar)"
                            : "Sem Saldo Pendente"}
                        </span>
                      </Button>
                    )}

                    {/* Botão Extrato & Relatório (Para Dono e para o Profissional) */}
                    <Button
                      variant="outline"
                      onClick={() => setStatementModalBarber(barber)}
                      className="w-full text-xs py-2 text-neutral-300 hover:text-white border-neutral-800 hover:border-neutral-700 flex items-center justify-center gap-1.5"
                    >
                      <ProjectIcon name="FileText" size={14} colorVariant="inherit" />
                      <span>Extrato & Relatório</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. HISTÓRICO DE QUITAÇÕES ANTERIORES */}
          {settlementsHistory.length > 0 && (
            <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-4 shadow-xl text-left">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ProjectIcon name="History" size={16} className="text-amber-500" />
                    <span>Histórico de Quitações e Fechamentos Realizados</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Lotes arquivados após liquidação de comissões pelo administrador.
                  </p>
                </div>
                <span className="text-xs text-neutral-400 font-mono">
                  {settlementsHistory.length} fechamentos registrados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold">
                      <th className="py-2.5 px-3">Data / Hora</th>
                      <th className="py-2.5 px-3">Profissional</th>
                      <th className="py-2.5 px-3">Período</th>
                      <th className="py-2.5 px-3">Chave Pix Utilizada</th>
                      <th className="py-2.5 px-3 text-right">Serviços</th>
                      <th className="py-2.5 px-3 text-right">Produtos</th>
                      <th className="py-2.5 px-3 text-right">Total Pago</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {settlementsHistory.map((settle) => (
                      <tr key={settle.id} className="hover:bg-neutral-850/50 transition-colors">
                        <td className="py-3 px-3 text-neutral-300 font-mono">
                          {new Date(settle.paid_at || settle.created_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          <SafeHtml html={settle.barber_name} />
                        </td>
                        <td className="py-3 px-3 text-neutral-400">
                          {settle.period_start} até {settle.period_end}
                        </td>
                        <td className="py-3 px-3 text-neutral-300 font-mono truncate max-w-[150px]">
                          {settle.pix_key_used || "Não informada"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-neutral-300">
                          R$ {Number(settle.services_amount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-neutral-300">
                          R$ {Number(settle.products_amount || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                          R$ {Number(settle.total_paid || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Liquidado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: QR CODE PIX DINÂMICO BCB COM O VALOR EXATO     */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(pixModalData)}
        onClose={() => setPixModalData(null)}
        title="Transferência Pix - Quitação de Comissão"
        size="sm"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              onClick={() => setPixModalData(null)}
            >
              Fechar
            </Button>
            <Button
              variant="primary"
              onClick={handleCopyBrCode}
              className="bg-amber-600 hover:bg-amber-500 font-bold"
            >
              <ProjectIcon name={copiedBrCode ? "Check" : "Copy"} size={15} colorVariant="inherit" />
              <span>{copiedBrCode ? "Código Copiado!" : "Copiar Código Pix"}</span>
            </Button>
          </div>
        }
      >
        {pixModalData && (
          <div className="space-y-4 text-center">
            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 text-left space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Favorecido / Profissional:</span>
                <strong className="text-white font-bold">{pixModalData.barber.name}</strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Chave Pix:</span>
                <strong className="text-amber-400 font-mono">{pixModalData.barber.pixKey}</strong>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-neutral-850">
                <span className="text-neutral-400">Valor a Transferir:</span>
                <strong className="text-emerald-400 font-mono text-base font-black">
                  R$ {pixModalData.amount.toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Imagem do QR Code gerada dinamicamente */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-xl w-60 mx-auto border-4 border-amber-500/20">
              {pixModalLoading ? (
                <div className="h-48 flex items-center justify-center text-neutral-800 text-xs">
                  Gerando QR Code oficial...
                </div>
              ) : pixModalData.qrCodeUrl ? (
                <img
                  src={pixModalData.qrCodeUrl}
                  alt="QR Code Pix"
                  className="w-48 h-48 block"
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-rose-600 text-xs font-bold">
                  Não foi possível gerar a imagem.
                </div>
              )}
              <span className="text-[10px] text-neutral-500 uppercase font-black tracking-wider mt-1">
                Padrão EMV® Banco Central
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Abra o aplicativo do seu banco, escolha <strong>Pagar com Pix</strong> e aponte a câmera para o QR Code acima ou use o botão <strong>Copiar Código Pix</strong>.
            </p>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: CONFIRMAÇÃO DE QUITAÇÃO (MARCAR COMO PAGO)      */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(settlementModalBarber)}
        onClose={() => {
          if (!isSubmittingSettlement) setSettlementModalBarber(null);
        }}
        title="Confirmar Quitação de Comissão"
        size="sm"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              disabled={isSubmittingSettlement}
              onClick={() => setSettlementModalBarber(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={isSubmittingSettlement}
              onClick={handleConfirmSettlement}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {isSubmittingSettlement ? (
                <span>Gravando quitação...</span>
              ) : (
                <>
                  <ProjectIcon name="CheckCircle" size={15} colorVariant="inherit" />
                  <span>Confirmar & Liquidar Saldo</span>
                </>
              )}
            </Button>
          </div>
        }
      >
        {settlementModalBarber && (
          <div className="space-y-4 text-left">
            {settlementSuccessMessage ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold text-center">
                {settlementSuccessMessage}
              </div>
            ) : (
              <>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Você está prestes a liquidar as comissões apuradas deste profissional. Ao confirmar, o saldo pendente será zerado e os atendimentos serão arquivados na tabela de fechamentos:
                </p>

                <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Profissional:</span>
                    <strong className="text-white font-bold">{settlementModalBarber.name}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Chave Pix Cadastrada:</span>
                    <strong className="text-amber-400 font-mono">
                      {settlementModalBarber.pixKey || "Não cadastrada"}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Itens Apurados:</span>
                    <span className="text-neutral-200">
                      {settlementModalBarber.servicesCount} serviços + {settlementModalBarber.productsCount} produtos
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                    <span className="text-neutral-400 font-bold uppercase">Total a Liquidar:</span>
                    <strong className="text-emerald-400 font-mono text-base font-black">
                      R$ {settlementModalBarber.totalToPay.toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-300 block">
                    Observação Interna / Comprovante (Opcional):
                  </label>
                  <input
                    type="text"
                    value={settlementNotes}
                    onChange={(e) => setSettlementNotes(e.target.value)}
                    placeholder="Ex: Pago via Nubank / Lote quinzenal #01"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: EXTRATO DETALHADO DO PROFISSIONAL (PDF / WHATSAPP) */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(statementModalBarber)}
        onClose={() => setStatementModalBarber(null)}
        title="Extrato Detalhado de Comissões"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              onClick={() => setStatementModalBarber(null)}
            >
              Fechar
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePrintStatement}
                className="text-xs py-2 px-3 border-neutral-700 hover:border-neutral-500 text-neutral-200"
              >
                <ProjectIcon name="Printer" size={15} colorVariant="inherit" />
                <span>Imprimir / PDF</span>
              </Button>

              <Button
                variant="primary"
                onClick={() => handleSendStatementWhatsApp(statementModalBarber)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 shadow-lg shadow-emerald-950/40"
              >
                <ProjectIcon name="Share2" size={15} colorVariant="inherit" />
                <span>Enviar no WhatsApp</span>
              </Button>
            </div>
          </div>
        }
      >
        {statementModalBarber && (
          <div className="space-y-4 text-left print:text-black">
            {/* CABEÇALHO DO EXTRATO */}
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white">
                  <SafeHtml html={statementModalBarber.name} />
                </h3>
                <p className="text-xs text-neutral-400">
                  <SafeHtml html={statementModalBarber.role} /> • Chave Pix:{" "}
                  <strong className="text-amber-400 font-mono">
                    {statementModalBarber.pixKey || "Não cadastrada"}
                  </strong>{" "}
                  ({getPixBadgeLabel(statementModalBarber.pixType)})
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                  Líquido a Receber:
                </span>
                <span className="text-lg font-black font-mono text-emerald-400">
                  R$ {statementModalBarber.totalToPay.toFixed(2)}
                </span>
              </div>
            </div>

            {/* TABELA DISCRIMINADA DE ITENS */}
            <div className="overflow-x-auto max-h-80 border border-neutral-800 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-neutral-900 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3 text-right">Valor Bruto</th>
                    <th className="py-2.5 px-3 text-right">% Taxa</th>
                    <th className="py-2.5 px-3 text-right">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850 bg-neutral-950">
                  {statementModalBarber.allItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-500 text-xs">
                        Nenhum atendimento ou comanda pendente neste período.
                      </td>
                    </tr>
                  ) : (
                    statementModalBarber.allItems.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-900/50 transition-colors">
                        <td className="py-2.5 px-3 text-neutral-400 font-mono whitespace-nowrap">
                          {typeof item.date === "string" ? item.date.slice(0, 10) : "Hoje"}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.type === "service"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-purple-500/10 text-purple-400"
                            }`}
                          >
                            {item.type === "service" ? "Serviço" : "Produto"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <SafeHtml html={item.description} />
                        </td>
                        <td className="py-2.5 px-3 text-neutral-300">
                          <SafeHtml html={item.clientName} />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-neutral-300">
                          R$ {item.grossPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-neutral-400">
                          {item.commRate}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                          R$ {item.commission.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* RESUMO TOTALIZADOR NO RODAPÉ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                  Total Bruto Gerado:
                </span>
                <strong className="text-white font-mono text-xs">
                  R$ {statementModalBarber.totalGrossGenerated.toFixed(2)}
                </strong>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                  Comissão Serviços:
                </span>
                <strong className="text-amber-400 font-mono text-xs">
                  R$ {statementModalBarber.servicesCommTotal.toFixed(2)}
                </strong>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                  Comissão Produtos:
                </span>
                <strong className="text-purple-400 font-mono text-xs">
                  R$ {statementModalBarber.productsCommTotal.toFixed(2)}
                </strong>
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-xl">
                <span className="text-[10px] text-emerald-400 uppercase font-black block">
                  Total Líquido:
                </span>
                <strong className="text-emerald-400 font-mono text-sm font-black">
                  R$ {statementModalBarber.totalToPay.toFixed(2)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: EXPORTAÇÃO DE RELATÓRIO CONTÁBIL / DRE            */}
      {/* ======================================================== */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Exportar Relatório Financeiro & DRE"
        size="sm"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              onClick={() => setIsExportModalOpen(false)}
            >
              Fechar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsExportModalOpen(false);
                window.print();
              }}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold"
            >
              Imprimir / Baixar (PDF)
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-neutral-300 leading-relaxed">
            Selecione o formato para download da prestação de contas da barbearia:
          </p>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-950 cursor-pointer hover:border-neutral-700">
              <div className="flex items-center gap-2.5">
                <ProjectIcon name="FileText" size={20} className="text-amber-500" />
                <div>
                  <p className="text-xs font-bold text-white">
                    Demonstrativo DRE Completo (PDF)
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Ideal para contabilidade e sócios da barbearia.
                  </p>
                </div>
              </div>
              <input
                type="radio"
                name="exportFormat"
                defaultChecked
                className="accent-amber-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-950 cursor-pointer hover:border-neutral-700">
              <div className="flex items-center gap-2.5">
                <ProjectIcon name="BarChart3" size={20} className="text-amber-500" />
                <div>
                  <p className="text-xs font-bold text-white">
                    Planilha Detalhada de Vendas (Excel / CSV)
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Linha por linha de cada corte e cerveja vendida.
                  </p>
                </div>
              </div>
              <input
                type="radio"
                name="exportFormat"
                className="accent-amber-600"
              />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
