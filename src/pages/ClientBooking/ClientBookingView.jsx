import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { supabase } from "../../lib/supabase";
import { clientBookingStyles } from "./ClientBookingView.styles";
import Navbar from "../../components/ui/Navbar";
import ServiceCard from "../../components/services/ServiceCard";
import ProfessionalCard from "../../components/services/ProfessionalCard";
import DatePicker from "../../components/ui/DatePicker";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import ProjectIcon from "../../components/ui/ProjectIcon";
import { SafeHtml } from "../../components/ui/SafeHtml";
import { validateSchema, SCHEMAS } from "../../utils/inputValidator";
import ResilientFormHandler from "../../components/resilience/ResilientFormHandler";
import SkeletonBookingView from "../../components/resilience/SkeletonBookingView";
import {
  buildWhatsAppBookingMessage,
  buildWhatsAppUrl,
} from "../../utils/publicBookingUrl";
import {
  generatePixBrCodePayload,
  generatePixQrCodeDataUrl,
  getRegisteredUserPixKey,
} from "../../utils/pixQrCode";

// Horários base do dia
const baseTimeSlots = [
  { time: "08:30", available: true },
  { time: "09:00", available: true },
  { time: "09:30", available: true },
  { time: "10:00", available: true },
  { time: "10:30", available: true },
  { time: "11:00", available: true },
  { time: "11:30", available: true },
  { time: "14:00", available: true },
  { time: "14:30", available: true },
  { time: "15:00", available: true },
  { time: "15:30", available: true },
  { time: "16:00", available: true },
  { time: "16:30", available: true },
  { time: "17:00", available: true },
  { time: "17:30", available: true },
  { time: "18:00", available: true },
];

// Catálogo padrão de contingência
const DEFAULT_CATALOG_SERVICES = [
  {
    id: "serv-corte-tradicional",
    name: "Corte Tradicional",
    category: "Cabelo",
    durationMinutes: 30,
    duration_minutes: 30,
    price: 40.0,
    active: true,
  },
  {
    id: "serv-barba-terapia",
    name: "Barba Terapia",
    category: "Barba",
    durationMinutes: 30,
    duration_minutes: 30,
    price: 35.0,
    active: true,
  },
  {
    id: "serv-corte-barba",
    name: "Corte + Barba Completo",
    category: "Combo",
    durationMinutes: 60,
    duration_minutes: 60,
    price: 70.0,
    active: true,
  },
];

export default function ClientBookingView({
  tenant,
  services = [],
  barbers = [],
  initialBarberId = "",
  initialClientName = "",
  initialClientPhone = "",
  onFinishBooking,
  onGoToLogin,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingErrorMessage, setBookingErrorMessage] = useState("");
  const [submissionFailureError, setSubmissionFailureError] = useState("");
  const [notificationNotice, setNotificationNotice] = useState("");
  const [calendarSavedNotice, setCalendarSavedNotice] = useState(false);
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(false);

  // Serviços ativos no catálogo
  const catalogServices =
    Array.isArray(services) && services.length > 0
      ? services
      : DEFAULT_CATALOG_SERVICES;

  const activeServicesList = catalogServices.filter((s) => s.active !== false);

  const [selectedServices, setSelectedServices] = useState(
    activeServicesList.length > 0 ? [activeServicesList[0]] : [DEFAULT_CATALOG_SERVICES[0]],
  );

  useEffect(() => {
    if (Array.isArray(services) && services.length > 0) {
      const active = services.filter((s) => s.active !== false);
      if (active.length > 0) {
        setSelectedServices((prev) => {
          const hasMatching = prev.some((p) => active.some((a) => a.id === p.id));
          return hasMatching && prev.length > 0 ? prev : [active[0]];
        });
      }
    }
  }, [services]);

  // Barbeiros ativos
  const activeBarbersList = barbers.filter((b) => b.status === "active");

  const anyBarberOption = {
    id: "any",
    name: "Qualquer Barbeiro Livre",
    role: "Encaixe mais rápido sem espera",
    isAnyProfessional: true,
    isAvailable: true,
    specialties: ["Maior Rapidez"],
  };

  const availableBarbersForClient = [...activeBarbersList, anyBarberOption];

  const [selectedBarberId, setSelectedBarberId] = useState(initialBarberId);
  const [bookingDate, setBookingDate] = useState(new Date());
  const [bookingTime, setBookingTime] = useState("");
  const [clientName, setClientName] = useState(initialClientName);
  const [clientPhone, setClientPhone] = useState(initialClientPhone);

  // Forma de pagamento flexível: "no_local" | "pix"
  const [paymentMethod, setPaymentMethod] = useState("no_local");
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Estados de cópia e feedback do Pix e WhatsApp
  const [copiedPixKey, setCopiedPixKey] = useState(false);
  const [copiedWhatsAppMsg, setCopiedWhatsAppMsg] = useState(false);

  useEffect(() => {
    if (initialClientName) setClientName(initialClientName);
  }, [initialClientName]);

  useEffect(() => {
    if (initialClientPhone) setClientPhone(initialClientPhone);
  }, [initialClientPhone]);

  useEffect(() => {
    if (initialBarberId && (!selectedBarberId || selectedBarberId === "any")) {
      setSelectedBarberId(initialBarberId);
    }
  }, [initialBarberId]);

  const [occupiedAppointments, setOccupiedAppointments] = useState([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);

  const formattedBookingDate = (() => {
    if (!bookingDate) return "";
    const d = bookingDate instanceof Date ? bookingDate : new Date(bookingDate);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  const targetTenantId = tenant?.id || "";

  // 1. Consulta em tempo real os agendamentos já cadastrados no Supabase para o dia selecionado
  const fetchOccupiedAppointments = async () => {
    if (!formattedBookingDate || !supabase) return;
    setIsFetchingSlots(true);
    try {
      let query = supabase
        .from("appointments")
        .select("id, barbershop_id, tenant_id, barber_id, barber_name, date, start_time, end_time, duration_minutes, status")
        .not("status", "in", '("cancelled","rejected")')
        .eq("date", formattedBookingDate);

      // Filtra por barbearia/tenant se informado (compatível tanto com barbershop_id quanto tenant_id)
      if (targetTenantId) {
        query = query.or(`barbershop_id.eq.${targetTenantId},tenant_id.eq.${targetTenantId}`);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        setOccupiedAppointments(data);
      } else if (error) {
        // Fallback defensivo: se falhar com filtro .or, busca por data e filtra em memória
        const fallbackQuery = await supabase
          .from("appointments")
          .select("id, barbershop_id, tenant_id, barber_id, barber_name, date, start_time, end_time, duration_minutes, status")
          .not("status", "in", '("cancelled","rejected")')
          .eq("date", formattedBookingDate);
        if (!fallbackQuery.error && Array.isArray(fallbackQuery.data)) {
          const filtered = targetTenantId
            ? fallbackQuery.data.filter((a) => a.barbershop_id === targetTenantId || a.tenant_id === targetTenantId || !a.barbershop_id)
            : fallbackQuery.data;
          setOccupiedAppointments(filtered);
        }
      }
    } catch (err) {
      console.warn("Aviso ao consultar slots ocupados no Supabase:", err);
    } finally {
      setIsFetchingSlots(false);
    }
  };

  useEffect(() => {
    fetchOccupiedAppointments();
  }, [formattedBookingDate, targetTenantId]);

  // 2. Supabase Realtime: Atualiza os slots instantaneamente caso outro cliente confirme um horário
  useEffect(() => {
    if (!formattedBookingDate || !supabase || typeof supabase.channel !== "function") return;

    let slotChannel;
    try {
      slotChannel = supabase
        .channel(`realtime-public-slots-${targetTenantId || "all"}-${formattedBookingDate}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "appointments" },
          () => {
            fetchOccupiedAppointments();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Aviso ao ativar Realtime de slots:", err);
    }

    return () => {
      if (slotChannel) {
        supabase.removeChannel(slotChannel);
      }
    };
  }, [formattedBookingDate, targetTenantId]);

  // Trava de horários passados no dia de hoje
  const isSelectedDateToday = () => {
    if (!bookingDate) return false;
    const today = new Date();
    return (
      today.getDate() === bookingDate.getDate() &&
      today.getMonth() === bookingDate.getMonth() &&
      today.getFullYear() === bookingDate.getFullYear()
    );
  };

  const isSlotInPast = (timeString) => {
    if (!isSelectedDateToday()) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [slotH, slotM] = timeString.split(":").map(Number);
    return slotH * 60 + slotM <= currentMinutes;
  };

  const parseTimeToMinutes = (t) => {
    if (!t) return 0;
    const str = String(t).trim();
    const clean = str.includes("T") ? str.split("T")[1] : str.includes(" ") ? str.split(" ")[1] : str;
    const [h, m] = clean.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const totalDuration = selectedServices.reduce((a, s) => {
    const mins = Number(s.durationMinutes ?? s.duration_minutes ?? s.duration ?? 30);
    return a + (isNaN(mins) || mins <= 0 ? 30 : mins);
  }, 0);

  // Verifica se o slot colide com algum agendamento existente para o barbeiro selecionado
  const isSlotOccupied = (slotTimeStr) => {
    const slotStart = parseTimeToMinutes(slotTimeStr);
    const slotEnd = slotStart + (totalDuration > 0 ? totalDuration : 30);

    const relevantAppts = occupiedAppointments.filter((a) => {
      const aStart = parseTimeToMinutes(a.start_time || a.startTime || a.appointment_time);
      const aEnd = (a.end_time || a.endTime)
        ? parseTimeToMinutes(a.end_time || a.endTime)
        : aStart + Number(a.duration_minutes || a.duration || 30);
      return slotStart < aEnd && slotEnd > aStart;
    });

    if (relevantAppts.length === 0) return false;

    // Se o cliente escolheu um barbeiro específico:
    if (selectedBarberId && selectedBarberId !== "any") {
      const selectedName = (selectedBarberObj?.name || "").toLowerCase().trim();
      const hasConflictForThisBarber = relevantAppts.some((a) => {
        const apptBarberId = a.barber_id || a.barberId;
        const apptBarberName = (a.barber_name || a.barberName || "").toLowerCase().trim();
        return (apptBarberId && apptBarberId === selectedBarberId) ||
               (selectedName && apptBarberName === selectedName);
      });

      // Se a barbearia tiver apenas 1 profissional (ou nenhum registrado formalmente além do próprio barbeiro),
      // qualquer agendamento nesse horário já ocupa a agenda
      if (activeBarbersList.length <= 1) {
        return relevantAppts.length > 0;
      }

      return hasConflictForThisBarber;
    }

    // Se escolheu "Qualquer Barbeiro Livre" (any) ou fluxo direto:
    // 1. Se a barbearia tem 1 ou nenhum barbeiro cadastrado: 1 agendamento esgota o horário
    const totalActiveBarbers = Math.max(activeBarbersList.length, 1);
    if (totalActiveBarbers <= 1) {
      return relevantAppts.length >= 1;
    }

    // 2. Se a barbearia possui múltiplos barbeiros (ex: 2, 3, etc):
    // Só é considerado ocupado se o número de agendamentos no horário atingir a quantidade total de barbeiros ativos
    return relevantAppts.length >= totalActiveBarbers;
  };

  const computedTimeSlots = baseTimeSlots.map((slot) => {
    const isPast = isSlotInPast(slot.time);
    const isOccupied = isSlotOccupied(slot.time);
    return {
      ...slot,
      isPast,
      isOccupied,
      available: !isPast && !isOccupied,
    };
  });

  useEffect(() => {
    const firstFreeSlot = computedTimeSlots.find((s) => s.available);
    if (firstFreeSlot) setBookingTime(firstFreeSlot.time);
    else setBookingTime("");
  }, [bookingDate, selectedBarberId, occupiedAppointments]);

  const isUuid = (val) =>
    typeof val === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

  const totalPrice = selectedServices.reduce((a, s) => {
    const val = Number(s.price ?? s.valor ?? 0);
    return a + (isNaN(val) || val < 0 ? 0 : val);
  }, 0);

  const selectedBarberObj =
    availableBarbersForClient.find((b) => b.id === selectedBarberId) ||
    availableBarbersForClient[0] ||
    anyBarberOption;

  const handleToggleService = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      if (exists) {
        if (prev.length === 1) {
          setBookingErrorMessage("Você precisa selecionar pelo menos 1 serviço.");
          return prev;
        }
        return prev.filter((s) => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  // Envio e persistência do agendamento
  const handleConfirmReservation = async (overrideData = null) => {
    setBookingErrorMessage("");
    setSubmissionFailureError("");

    const effectiveName = overrideData?.clientName || clientName;
    const effectivePhone = overrideData?.clientPhone || clientPhone;
    const effectiveTime = overrideData?.time || bookingTime;
    const effectivePayment = overrideData?.paymentMethod || paymentMethod;

    if (!effectiveName.trim() || !effectivePhone || effectivePhone.length < 14) {
      setBookingErrorMessage(
        "Por favor, preencha seu nome completo e WhatsApp com DDD.",
      );
      return;
    }

    if (!effectiveTime) {
      setBookingErrorMessage("Selecione um horário disponível na grade.");
      return;
    }

    const effectiveSelectedServices =
      selectedServices && selectedServices.length > 0
        ? selectedServices
        : activeServicesList.length > 0
          ? [activeServicesList[0]]
          : [DEFAULT_CATALOG_SERVICES[0]];

    const resolvedServiceName = effectiveSelectedServices
      .map((s) => (s.name || s.nome || s.service_name || "Serviço").trim())
      .filter(Boolean)
      .join(" + ") || "Corte Tradicional";

    const resolvedDuration = Math.max(
      totalDuration > 0 ? totalDuration : 30,
      15
    );

    setIsSubmittingBooking(true);

    const [startH, startM] = effectiveTime.split(":").map(Number);
    const totalMins = startH * 60 + startM + resolvedDuration;
    const endH = Math.floor(totalMins / 60);
    const endM = totalMins % 60;
    const computedEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const finalBarber = selectedBarberObj?.isAnyProfessional
      ? activeBarbersList[0] || selectedBarberObj
      : selectedBarberObj || availableBarbersForClient[0];

    const protocolId = `AG-${Math.floor(1000 + Math.random() * 9000)}`;

    // Validação estrita de schema
    const rawAppointment = {
      client_name: DOMPurify.sanitize(effectiveName.trim(), { ALLOWED_TAGS: [] }),
      client_phone: DOMPurify.sanitize(effectivePhone.trim(), { ALLOWED_TAGS: [] }),
      barber_id: finalBarber?.id && finalBarber.id !== "any" ? finalBarber.id : "any",
      barber_name: DOMPurify.sanitize(finalBarber?.name || "Barbeiro", { ALLOWED_TAGS: [] }),
      service_name: DOMPurify.sanitize(resolvedServiceName, { ALLOWED_TAGS: [] }),
      duration_minutes: resolvedDuration,
      price: totalPrice,
      start_time: effectiveTime,
      end_time: computedEndTime,
      payment_method: effectivePayment,
    };

    const validation = validateSchema(rawAppointment, SCHEMAS.appointmentBooking, {
      rejectUnknown: true,
      callerRole: "client",
    });

    if (!validation.isValid) {
      console.error("[Ingestion Guard] Falha na validação de schema:", validation.errors);
      setIsSubmittingBooking(false);
      setBookingErrorMessage("Dados de agendamento não atendem aos critérios de validação.");
      return;
    }

    try {
      const targetTenantId = (tenant?.id && isUuid(tenant.id)) ? tenant.id : (tenant?.id || "default");
      // Se o barbeiro possuir um UUID válido registrado no banco, vincula a FK; senão usa null para NUNCA travar a agenda do cliente por foreign key constraint
      const isRealBarberUuid = isUuid(finalBarber?.id) && finalBarber.id !== "any" && !String(finalBarber.id).startsWith("barber-mock");
      const targetBarberId = isRealBarberUuid ? finalBarber.id : null;
      const appointmentId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "10000000-1000-4000-8000-" + String(Date.now()).padStart(12, "0").slice(-12);

      const appointmentDateStr = bookingDate instanceof Date
        ? bookingDate.toISOString().slice(0, 10)
        : String(bookingDate).slice(0, 10);

      // Chave de idempotência estrita (impede duplicidades no mesmo segundo/horário)
      const idempotencyKey = `${targetTenantId}_${finalBarber.id}_${appointmentDateStr}_${effectiveTime}_${effectivePhone.replace(/\D/g, "")}`;

      // Se escolheu Pix, gera o payload BR Code e imagem QR Code real
      let generatedPixBrCode = "";
      let generatedPixQrDataUrl = "";

      if (effectivePayment === "pix") {
        try {
          const registeredPixKey =
            getRegisteredUserPixKey(null, tenant) ||
            tenant?.phone ||
            "contato@barbearia.com";

          generatedPixBrCode = generatePixBrCodePayload({
            pixKey: registeredPixKey,
            merchantName: (tenant?.name || "Barbearia").slice(0, 25),
            merchantCity: (tenant?.city || "Brasil").slice(0, 15),
            amount: totalPrice,
            txid: protocolId.replace(/[^a-zA-Z0-9]/g, ""),
          });

          generatedPixQrDataUrl = await generatePixQrCodeDataUrl(generatedPixBrCode);
        } catch (pixErr) {
          console.warn("Aviso na geração de QR Code Pix:", pixErr);
        }
      }

      // 1. Tenta a Invocação Atômica Transacional apenas se houver UUID real de tenant e barbeiro
      let atomicBooked = false;
      if (supabase && typeof supabase.rpc === "function" && isUuid(targetTenantId) && isUuid(targetBarberId)) {
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc("book_appointment_atomic", {
            p_tenant_id: targetTenantId,
            p_barber_id: targetBarberId,
            p_client_id: `guest-${effectivePhone.replace(/\D/g, "")}`,
            p_client_name: effectiveName.trim(),
            p_client_phone: effectivePhone.trim(),
            p_service_id: effectiveSelectedServices[0]?.id || "srv-default",
            p_service_name: resolvedServiceName,
            p_booking_date: appointmentDateStr,
            p_start_time: effectiveTime,
            p_end_time: computedEndTime,
            p_price: totalPrice,
          });

          if (rpcError) {
            const isConflict =
              rpcError.message?.includes("SLOT_OCCUPIED_CONCURRENCY_CONFLICT") ||
              rpcError.code === "P0001" ||
              rpcError.code === "23P01";

            if (isConflict) {
              setBookingErrorMessage(
                `⚠️ O horário das ${effectiveTime}h acabou de ser reservado por outro cliente no mesmo segundo. Por favor, escolha outro horário na grade.`
              );
              setIsSubmittingBooking(false);
              fetchOccupiedAppointments();
              return;
            }
          } else if (rpcData?.success) {
            atomicBooked = true;
          }
        } catch (rpcErr) {
          console.warn("RPC atômica não disponível ou com erro, usando inserção com idempotência:", rpcErr);
        }
      }

      // 1.5. Verificação de Concorrência e Idempotência direta no Supabase antes de inserir
      if (supabase) {
        try {
          const { data: existingAppts } = await supabase
            .from("appointments")
            .select("id, barber_id, barber_name, start_time, end_time, status")
            .not("status", "in", '("cancelled","rejected")')
            .eq("date", appointmentDateStr)
            .eq("start_time", effectiveTime);

          if (Array.isArray(existingAppts) && existingAppts.length > 0) {
            const totalBarbers = Math.max(activeBarbersList.length, 1);
            const isSingleBarber = totalBarbers <= 1;

            let conflict = false;
            if (isSingleBarber) {
              conflict = true;
            } else if (targetBarberId && isUuid(targetBarberId)) {
              conflict = existingAppts.some((a) => a.barber_id === targetBarberId);
            } else {
              conflict = existingAppts.length >= totalBarbers;
            }

            if (conflict) {
              setBookingErrorMessage(
                `⚠️ O horário das ${effectiveTime}h acabou de ser reservado por outro cliente. Por favor, selecione outro horário disponível.`
              );
              setIsSubmittingBooking(false);
              fetchOccupiedAppointments();
              return;
            }
          }
        } catch (checkErr) {
          console.warn("Aviso na checagem prévia de concorrência:", checkErr);
        }
      }

      // 2. Persistência direta no Supabase estritamente com colunas existentes na tabela appointments (zero erro 400)
      if (!atomicBooked && supabase) {
        const appointmentPayload = {
          id: appointmentId,
          ...(isUuid(targetTenantId) ? { tenant_id: targetTenantId, barbershop_id: targetTenantId } : {}),
          barber_id: targetBarberId,
          barber_name: DOMPurify.sanitize(finalBarber?.name || "Barbeiro", { ALLOWED_TAGS: [] }),
          client_name: DOMPurify.sanitize(effectiveName.trim(), { ALLOWED_TAGS: [] }),
          client_phone: DOMPurify.sanitize(effectivePhone.trim(), { ALLOWED_TAGS: [] }),
          service_name: DOMPurify.sanitize(resolvedServiceName, { ALLOWED_TAGS: [] }),
          date: appointmentDateStr,
          start_time: effectiveTime,
          end_time: computedEndTime,
          duration_minutes: Number(resolvedDuration) || 30,
          price: Number(totalPrice) || 0,
          status: "confirmed",
          is_paid: false,
          notes: DOMPurify.sanitize(`Agendamento online (No Local). Protocolo: ${protocolId}`, { ALLOWED_TAGS: [] }),
        };

        let { error: insertError } = await supabase.from("appointments").insert([appointmentPayload]);

        if (insertError && (insertError.code === "42P01" || insertError.message?.includes("does not exist"))) {
          const fallbackRes = await supabase.from("agendamentos").insert([appointmentPayload]);
          insertError = fallbackRes.error;
        }

        // Blindagem de Resiliência: se a foreign key do barbeiro violar no banco (código 23503), retenta imediatamente com barber_id = null
        if (insertError && (insertError.code === "23503" || insertError.message?.includes("foreign key") || insertError.message?.includes("appointments_barber_id_fkey"))) {
          console.warn("[Agendamento Resiliente] Chave estrangeira de barbeiro inexistente no banco. Desacoplando barber_id para garantir a confirmação do cliente.");
          const safeAppointmentPayload = { ...appointmentPayload, barber_id: null };
          const safeRes = await supabase.from("appointments").insert([safeAppointmentPayload]);
          insertError = safeRes.error;
        }

        if (insertError) {
          const isConflict =
            insertError.code === "23505" ||
            insertError.code === "23P01" ||
            insertError.message?.includes("duplicate") ||
            insertError.message?.includes("concurrency") ||
            insertError.message?.includes("conflict");

          if (isConflict) {
            setBookingErrorMessage(
              `⚠️ Este horário das ${effectiveTime}h já foi ocupado por outro agendamento. Por favor, escolha outro horário.`
            );
            setIsSubmittingBooking(false);
            fetchOccupiedAppointments();
            return;
          }
          console.warn("Aviso retornado pelo banco ao persistir agendamento:", insertError.message);
        }
      }

      const bookingPayload = {
        protocol: protocolId,
        clientName: effectiveName.trim(),
        clientPhone: effectivePhone,
        barberId: finalBarber.id,
        barberName: finalBarber.name,
        services: resolvedServiceName,
        totalPrice,
        totalDuration: resolvedDuration,
        dateFormatted: bookingDate.toLocaleDateString("pt-BR"),
        time: effectiveTime,
        endTime: computedEndTime,
        paymentMethod: effectivePayment,
        pixPayload: generatedPixBrCode,
        pixQrCodeUrl: generatedPixQrDataUrl,
        barbershopName: tenant?.name || "Barbearia",
        barbershopPhone: tenant?.phone || "",
      };

      setConfirmedBooking(bookingPayload);
      setCurrentStep(5);
      if (onFinishBooking) onFinishBooking(bookingPayload);
    } catch (err) {
      console.warn("Aviso de rede ao salvar agendamento:", err);
      setSubmissionFailureError(
        "Instabilidade temporária na conexão. Seus dados foram preservados para nova tentativa."
      );
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // URL e mensagem para confirmação no WhatsApp
  const whatsAppBookingMessage = confirmedBooking
    ? buildWhatsAppBookingMessage({
        barbershopName: confirmedBooking.barbershopName,
        clientName: confirmedBooking.clientName,
        serviceName: confirmedBooking.services,
        barberName: confirmedBooking.barberName,
        dateStr: confirmedBooking.dateFormatted,
        timeStr: confirmedBooking.time,
        price: confirmedBooking.totalPrice,
        paymentMethod: confirmedBooking.paymentMethod,
        protocol: confirmedBooking.protocol,
      })
    : "";

  const whatsAppBookingUrl = confirmedBooking
    ? buildWhatsAppUrl(
        confirmedBooking.barbershopPhone || tenant?.phone,
        whatsAppBookingMessage
      )
    : "";

  if (isLoadingSkeleton) {
    return (
      <div className={clientBookingStyles.pageWrapper}>
        <Navbar
          variant="client"
          tenant={tenant}
          user={{ name: clientName || "Cliente", avatar: "CL", loyaltyPoints: 120 }}
        />
        <div className={clientBookingStyles.appContainer}>
          <SkeletonBookingView latencyNotice={true} />
        </div>
      </div>
    );
  }

  return (
    <div className={clientBookingStyles.pageWrapper}>
      {/* Barra de identificação superior / Link de Login da Barbearia */}
      {onGoToLogin && (
        <div className="bg-neutral-950/95 border-b border-neutral-800 px-4 py-2 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 font-medium text-neutral-300 truncate">
            <ProjectIcon name="Scissors" size={14} colorVariant="amber" />
            <span className="font-bold text-white truncate">{tenant?.name || "Barbearia"}</span>
            <span className="text-neutral-500 hidden sm:inline">• Agendamento Online</span>
          </div>
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0 text-[11px]"
          >
            <span>Área da Barbearia / Login</span>
            <span>→</span>
          </button>
        </div>
      )}

      <Navbar
        variant="client"
        tenant={tenant}
        user={{
          name: clientName || "Cliente",
          avatar: clientName ? clientName.slice(0, 2).toUpperCase() : "CL",
          loyaltyPoints: 120,
        }}
        onNotificationsClick={() =>
          setNotificationNotice("Lembrete: Agendamento prático e sem filas na sua barbearia favorita!")
        }
        onQuickAction={() => setCurrentStep(1)}
      />

      {notificationNotice && (
        <div className="max-w-2xl mx-auto px-4 pt-2">
          <div
            role="status"
            aria-live="polite"
            className="p-3 bg-neutral-900 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2">
              <ProjectIcon name="Bell" size={14} className="text-amber-300" />
              <span>{notificationNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotificationNotice("")}
              aria-label="Fechar aviso de notificação"
              className="text-neutral-400 hover:text-white text-xs px-2 py-0.5 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none flex items-center cursor-pointer"
            >
              <ProjectIcon name="X" size={14} colorVariant="inherit" />
            </button>
          </div>
        </div>
      )}

      <main id="main-content" className={clientBookingStyles.appContainer}>
        {/* Banner da Barbearia Conectada (Identidade do Tenant na URL) */}
        <div className="p-4 bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl shadow-lg flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl shrink-0 shadow-inner">
            {tenant?.name ? tenant.name.slice(0, 2).toUpperCase() : "BB"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Barbearia Conectada
              </span>
              {tenant?.slug && (
                <span className="text-[10px] font-mono text-neutral-400 truncate hidden sm:inline">
                  @{tenant.slug}
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
              {tenant?.name || "Barbearia"}
            </h1>
            <p className="text-xs text-neutral-400 truncate flex items-center gap-1.5 mt-0.5">
              <ProjectIcon name="MapPin" size={12} className="text-neutral-500 shrink-0" />
              <span>
                {[tenant?.neighborhood, tenant?.city, tenant?.state].filter(Boolean).join(", ") ||
                  tenant?.street ||
                  "Atendimento presencial com hora marcada"}
              </span>
            </p>
          </div>
        </div>

        {/* Banner de Barbeiro Pré-selecionado por Link */}
        {initialBarberId &&
          currentStep < 5 &&
          selectedBarberObj &&
          !selectedBarberObj.isAnyProfessional && (
            <div className={clientBookingStyles.deepLinkBanner}>
              <div className="flex items-center gap-2">
                <ProjectIcon name="Scissors" size={16} className="text-amber-500" />
                <span>
                  Agendando com:{" "}
                  <strong className={clientBookingStyles.deepLinkBarber}>
                    {selectedBarberObj.name}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-amber-400 font-bold underline cursor-pointer text-[11px]"
              >
                Trocar Barbeiro
              </button>
            </div>
          )}

        {/* Stepper Superior */}
        {currentStep < 5 && (
          <div
            role="region"
            aria-label="Etapas do agendamento"
            aria-live="polite"
            className={clientBookingStyles.stepperBox}
          >
            <div className={clientBookingStyles.stepText}>
              <span className={clientBookingStyles.stepIndicator}>
                {currentStep}
              </span>
              <span>
                Passo {currentStep} de 4:{" "}
                <strong className={clientBookingStyles.stepTitle}>
                  {currentStep === 1
                    ? "Escolha os Serviços"
                    : currentStep === 2
                      ? "Escolha o Barbeiro"
                      : currentStep === 3
                        ? "Data & Horário"
                        : "Seus Dados & Pagamento"}
                </strong>
              </span>
            </div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="text-neutral-400 hover:text-white text-xs underline cursor-pointer"
              >
                Voltar
              </button>
            )}
          </div>
        )}

        {/* PASSO 1: SERVIÇOS */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className={clientBookingStyles.stepHeader}>
              <h2 className={clientBookingStyles.stepHeading}>
                <ProjectIcon name="Scissors" size={20} colorVariant="amber" />
                <span>Selecione seus Serviços</span>
              </h2>
              <p className={clientBookingStyles.stepDescription}>
                Você pode escolher um ou mais serviços para o mesmo atendimento.
              </p>
            </div>

            {bookingErrorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 font-medium flex items-center gap-2">
                <ProjectIcon name="AlertTriangle" size={14} colorVariant="danger" />
                <span>{bookingErrorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2.5">
              {activeServicesList.map((service) => {
                const isSelected = selectedServices.some((s) => s.id === service.id);
                return (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isSelected={isSelected}
                    onToggleSelect={() => handleToggleService(service)}
                    onToggle={() => handleToggleService(service)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* PASSO 2: BARBEIRO */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className={clientBookingStyles.stepHeader}>
              <h2 className={clientBookingStyles.stepHeading}>
                <ProjectIcon name="Users" size={20} colorVariant="amber" />
                <span>Com quem deseja cortar?</span>
              </h2>
              <p className={clientBookingStyles.stepDescription}>
                Escolha seu profissional favorito ou a opção de maior rapidez.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {availableBarbersForClient.map((barber) => {
                const isSelected =
                  selectedBarberId === barber.id ||
                  (!selectedBarberId && barber.id === "any");
                return (
                  <ProfessionalCard
                    key={barber.id}
                    barber={barber}
                    isSelected={isSelected}
                    onSelect={() => setSelectedBarberId(barber.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* PASSO 3: DATA E HORÁRIO */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className={clientBookingStyles.stepHeader}>
              <h2 className={clientBookingStyles.stepHeading}>
                <ProjectIcon name="Calendar" size={20} colorVariant="amber" />
                <span>Data & Horário do Atendimento</span>
              </h2>
              <p className={clientBookingStyles.stepDescription}>
                Selecione o dia e o horário mais conveniente para você.
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 space-y-4">
              <DatePicker
                selectedDate={bookingDate}
                onSelectDate={setBookingDate}
                minDate={new Date()}
              />

              <div className="pt-2 border-t border-neutral-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-neutral-300">
                    Horários Livres no Dia:
                  </span>
                  <span className="text-amber-400 font-mono text-[11px]">
                    {bookingTime ? `${bookingTime}h selecionado` : "Selecione um horário"}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {computedTimeSlots.map((slot) => {
                    const isSelected = bookingTime === slot.time;
                    const isDisabled = !slot.available;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setBookingTime(slot.time)}
                        title={
                          slot.isOccupied
                            ? `Horário das ${slot.time}h já está ocupado por outro agendamento`
                            : slot.isPast
                              ? `Horário das ${slot.time}h já passou`
                              : `Clique para selecionar ${slot.time}h`
                        }
                        className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all text-center flex flex-col items-center justify-center min-h-[46px] ${
                          isSelected
                            ? "bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20 scale-105"
                            : slot.isOccupied
                              ? "bg-rose-950/20 text-rose-400/70 border border-rose-900/30 cursor-not-allowed"
                              : slot.isPast
                                ? "bg-neutral-950 text-neutral-600 border border-neutral-800/40 line-through cursor-not-allowed opacity-40"
                                : "bg-neutral-950 text-neutral-300 border border-neutral-800 hover:border-amber-500/50 hover:text-white cursor-pointer"
                        }`}
                      >
                        <span>{slot.time}</span>
                        {slot.isOccupied && (
                          <span className="text-[9px] font-sans font-medium text-rose-400/90 leading-none mt-0.5">
                            Ocupado
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 4: IDENTIFICAÇÃO DO CLIENTE & FORMA DE PAGAMENTO */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className={clientBookingStyles.stepHeader}>
              <h2 className={clientBookingStyles.stepHeading}>
                <ProjectIcon name="User" size={20} colorVariant="amber" />
                <span>Seus Dados & Pagamento</span>
              </h2>
              <p className={clientBookingStyles.stepDescription}>
                Preencha seus dados para vincular o agendamento e escolha como pagar.
              </p>
            </div>

            {/* Resumo do Atendimento */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Serviços:</span>
                <strong className="text-white text-right">
                  {selectedServices.map((s) => s.name).join(" + ")}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Profissional:</span>
                <strong className="text-amber-400">
                  {selectedBarberObj.name}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Dia e Hora:</span>
                <strong className="text-white font-mono">
                  {bookingDate.toLocaleDateString("pt-BR")} às {bookingTime}h
                </strong>
              </div>
              <div className="flex justify-between border-t border-neutral-800 pt-2 text-sm font-black">
                <span className="text-neutral-300">Total:</span>
                <span className="text-emerald-400 font-mono">
                  R$ {totalPrice.toFixed(2).replace(".", ",")} ({totalDuration} min)
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {bookingErrorMessage && (
                <div
                  id="booking-validation-error"
                  role="alert"
                  aria-live="assertive"
                  className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 font-medium flex items-center gap-2"
                >
                  <ProjectIcon name="AlertTriangle" size={14} colorVariant="danger" />
                  <span>{bookingErrorMessage}</span>
                </div>
              )}

              {submissionFailureError && (
                <ResilientFormHandler
                  error={submissionFailureError}
                  formData={{
                    clientName,
                    clientPhone,
                    servicos: selectedServices.map((s) => s.name).join(" + "),
                    barbeiro: selectedBarberObj.name,
                    data: bookingDate.toLocaleDateString("pt-BR"),
                    horario: `${bookingTime}h`,
                  }}
                  fieldLabels={{
                    clientName: "Nome do Cliente",
                    clientPhone: "WhatsApp",
                    servicos: "Serviços Selecionados",
                    barbeiro: "Profissional",
                    data: "Data Marcada",
                    horario: "Horário",
                  }}
                  isSubmitting={isSubmittingBooking}
                  onRetry={() => handleConfirmReservation()}
                  onEdit={() => setSubmissionFailureError("")}
                />
              )}

              <Input
                id="client-name-input"
                label="Seu Nome Completo"
                placeholder="Ex: Carlos Oliveira"
                value={clientName}
                aria-required="true"
                onChange={(e) => setClientName(DOMPurify.sanitize(e.target.value.trimStart(), { ALLOWED_TAGS: [] }))}
              />

              <Input
                id="client-phone-input"
                label="Seu WhatsApp (com DDD)"
                mask="phone"
                placeholder="(11) 99999-9999"
                value={clientPhone}
                aria-required="true"
                onChange={(e) => setClientPhone(DOMPurify.sanitize(e.target.value.trim(), { ALLOWED_TAGS: [] }))}
              />

              {/* Informação Clara de Pagamento no Local (Sem atrito de Pix) */}
              <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-2xl flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                  <ProjectIcon name="Store" size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <span>Pagamento no Local</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Sem cobrança agora
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
                    Você só paga na recepção ao ser atendido (Dinheiro, Cartão ou Pix).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 5: COMPROVANTE, CONFIRMAÇÃO WHATSAPP & QR CODE PIX */}
        {currentStep === 5 && confirmedBooking && (
          <div className={clientBookingStyles.voucherCard}>
            <div className={clientBookingStyles.voucherHeader}>
              <div className={clientBookingStyles.successIconBox}>
                <ProjectIcon name="Check" size={24} className="text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider">
                  Agendamento Confirmado!
                </span>
                <h2 className="text-xl font-black text-white">
                  Te esperamos na cadeira!
                </h2>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  Protocolo: #{confirmedBooking.protocol}
                </p>
              </div>
            </div>

            {/* BOTÃO OFICIAL DE CONFIRMAÇÃO INSTANTÂNEA NO WHATSAPP */}
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-300">
                <ProjectIcon name="MessageSquare" size={18} className="text-emerald-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-xs text-white">
                    Confirmação Instantânea no WhatsApp
                  </h3>
                  <p className="text-[11px] text-emerald-300/80">
                    Clique abaixo para enviar a mensagem pronta para a barbearia confirmar seu horário.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={whatsAppBookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-xs text-white bg-[#25D366] hover:bg-[#20ba59] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  <ProjectIcon name="MessageSquare" size={16} colorVariant="inherit" />
                  <span>Confirmar no WhatsApp da Barbearia</span>
                  <ProjectIcon name="ExternalLink" size={12} colorVariant="inherit" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(whatsAppBookingMessage);
                    setCopiedWhatsAppMsg(true);
                    setTimeout(() => setCopiedWhatsAppMsg(false), 3000);
                  }}
                  className="py-2.5 px-3 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  <ProjectIcon
                    name={copiedWhatsAppMsg ? "Check" : "Copy"}
                    size={14}
                    className={copiedWhatsAppMsg ? "text-emerald-400" : "text-neutral-400"}
                  />
                  <span>{copiedWhatsAppMsg ? "Copiado!" : "Copiar Texto"}</span>
                </button>
              </div>
            </div>



            {/* RESUMO DOS DADOS */}
            <div className="space-y-2 p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
              <div className={clientBookingStyles.voucherItem}>
                <span>Barbearia:</span>
                <span className={clientBookingStyles.voucherItemValue}>
                  <SafeHtml html={confirmedBooking.barbershopName || tenant?.name || "Barbearia"} />
                </span>
              </div>
              <div className={clientBookingStyles.voucherItem}>
                <span>Barbeiro:</span>
                <span className="font-bold text-amber-400">
                  <SafeHtml html={confirmedBooking.barberName} />
                </span>
              </div>
              <div className={clientBookingStyles.voucherItem}>
                <span>Serviços:</span>
                <span className={clientBookingStyles.voucherItemValue}>
                  <SafeHtml html={confirmedBooking.services} />
                </span>
              </div>
              <div className={clientBookingStyles.voucherItem}>
                <span>Data & Horário:</span>
                <span className="font-black text-white font-mono text-sm">
                  {confirmedBooking.dateFormatted} às {confirmedBooking.time}h
                </span>
              </div>
              <div className={clientBookingStyles.voucherItem}>
                <span>Forma de Pagamento:</span>
                <span className="font-bold text-neutral-200">
                  {confirmedBooking.paymentMethod === "pix"
                    ? "Pix Antecipado"
                    : "No Local (Frente de Caixa)"}
                </span>
              </div>
              <div className={clientBookingStyles.voucherItem}>
                <span>Valor Total:</span>
                <span className="font-black text-emerald-400 font-mono text-sm">
                  R$ {confirmedBooking.totalPrice.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {calendarSavedNotice ? (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 text-center font-bold flex items-center justify-center gap-1.5 flex-1">
                  <ProjectIcon name="Check" size={14} colorVariant="inherit" />
                  <span>Salvo na agenda do dispositivo!</span>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => setCalendarSavedNotice(true)}
                  className="flex-1 text-xs py-2.5 font-bold cursor-pointer"
                >
                  <span className="flex items-center justify-center gap-2">
                    <ProjectIcon name="Calendar" size={15} colorVariant="inherit" />
                    Salvar na Agenda
                  </span>
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setConfirmedBooking(null);
                  setCurrentStep(1);
                }}
                className="flex-1 text-xs py-2.5 font-bold cursor-pointer border-neutral-700 hover:bg-neutral-800"
              >
                <span className="flex items-center justify-center gap-2">
                  <ProjectIcon name="Scissors" size={14} />
                  <span>Novo Agendamento</span>
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Espaçador de rolagem */}
        <div className="h-44 sm:h-52 w-full shrink-0 select-none pointer-events-none" aria-hidden="true" />
      </main>

      {/* BARRA FIXA INFERIOR COM TOTAL E BOTÃO DE AVANÇAR */}
      {currentStep < 5 && (
        <div className={clientBookingStyles.bottomDock}>
          <div className={clientBookingStyles.dockContent}>
            <div className={clientBookingStyles.dockTotalBox}>
              <span className={clientBookingStyles.dockMeta}>
                {selectedServices.length} serviço(s) • {totalDuration} min
              </span>
              <span className={clientBookingStyles.dockPrice}>
                R$ {totalPrice.toFixed(2).replace(".", ",")}
              </span>
            </div>

            <Button
              variant="primary"
              isLoading={isSubmittingBooking}
              onClick={() => {
                if (currentStep === 1) {
                  if (selectedServices.length === 0) {
                    setBookingErrorMessage("Você precisa selecionar pelo menos 1 serviço antes de avançar.");
                    return;
                  }
                  setBookingErrorMessage("");
                  setCurrentStep(2);
                } else if (currentStep === 4) {
                  handleConfirmReservation();
                } else {
                  setBookingErrorMessage("");
                  setCurrentStep((prev) => prev + 1);
                }
              }}
              className="text-xs py-2.5 px-6 font-extrabold shadow-lg bg-amber-600 hover:bg-amber-500 cursor-pointer"
            >
              {currentStep === 4 ? (
                <span className="flex items-center gap-1.5">
                  Confirmar Agendamento
                  <ProjectIcon name="Check" size={14} colorVariant="inherit" />
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Continuar
                  <ProjectIcon name="ArrowRight" size={14} colorVariant="inherit" />
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
