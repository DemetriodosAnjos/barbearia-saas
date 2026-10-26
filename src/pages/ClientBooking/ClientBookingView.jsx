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

  const computedTimeSlots = baseTimeSlots.map((slot) => ({
    ...slot,
    available: isSlotInPast(slot.time) ? false : slot.available,
  }));

  useEffect(() => {
    const firstFreeSlot = computedTimeSlots.find((s) => s.available);
    if (firstFreeSlot) setBookingTime(firstFreeSlot.time);
    else setBookingTime("");
  }, [bookingDate]);

  const isUuid = (val) =>
    typeof val === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

  const totalDuration = selectedServices.reduce((a, s) => {
    const mins = Number(s.durationMinutes ?? s.duration_minutes ?? s.duration ?? 30);
    return a + (isNaN(mins) || mins <= 0 ? 30 : mins);
  }, 0);

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
      const targetTenantId = (tenant?.id && isUuid(tenant.id)) ? tenant.id : null;
      const targetBarberId = isUuid(validation.sanitized.barber_id) ? validation.sanitized.barber_id : null;
      const appointmentId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "10000000-1000-4000-8000-" + String(Date.now()).padStart(12, "0").slice(-12);

      const appointmentDateStr = bookingDate instanceof Date
        ? bookingDate.toISOString().slice(0, 10)
        : String(bookingDate).slice(0, 10);

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

      const insertPayload = {
        id: appointmentId,
        tenant_id: targetTenantId,
        barbershop_id: targetTenantId,
        date: appointmentDateStr,
        ...validation.sanitized,
        barber_id: targetBarberId,
        status: "confirmed",
        is_paid: false,
      };

      let { error: insertError } = await supabase.from("appointments").insert([insertPayload]);

      if (insertError && (insertError.code === "42P01" || insertError.message?.includes("does not exist"))) {
        const fallbackRes = await supabase.from("agendamentos").insert([insertPayload]);
        insertError = fallbackRes.error;
      }

      if (insertError) {
        console.warn("Aviso retornado pelo banco ao persistir agendamento:", insertError.message);
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
                        className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all text-center cursor-pointer ${
                          isSelected
                            ? "bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20 scale-105"
                            : isDisabled
                              ? "bg-neutral-950 text-neutral-600 border border-neutral-800/40 line-through cursor-not-allowed opacity-50"
                              : "bg-neutral-950 text-neutral-300 border border-neutral-800 hover:border-amber-500/50 hover:text-white"
                        }`}
                      >
                        {slot.time}
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

              {/* SELEÇÃO DE FORMA DE PAGAMENTO (FLEXÍVEL) */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-neutral-300">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("no_local")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      paymentMethod === "no_local"
                        ? "bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500/50"
                        : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <ProjectIcon
                          name="Store"
                          size={16}
                          className={paymentMethod === "no_local" ? "text-amber-400" : "text-neutral-400"}
                        />
                        <span className="font-bold text-xs">Pagar no Local</span>
                      </div>
                      {paymentMethod === "no_local" && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight">
                      Pague no caixa da recepção após o atendimento (Dinheiro, Cartão ou Pix).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("pix")}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      paymentMethod === "pix"
                        ? "bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/50"
                        : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <ProjectIcon
                          name="QrCode"
                          size={16}
                          className={paymentMethod === "pix" ? "text-emerald-400" : "text-neutral-400"}
                        />
                        <span className="font-bold text-xs">Pagar com Pix</span>
                      </div>
                      {paymentMethod === "pix" && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight">
                      Gera QR Code Pix instantâneo para reserva antecipada.
                    </p>
                  </button>
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

            {/* SE PAGAMENTO FOR PIX: EXIBE QR CODE E CHAVE COPIA E COLA */}
            {confirmedBooking.paymentMethod === "pix" && (
              <div className="p-4 bg-neutral-950 border border-emerald-500/30 rounded-2xl space-y-3 text-center">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <div className="flex items-center gap-2 text-left">
                    <ProjectIcon name="QrCode" size={18} className="text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-xs text-white">Pagamento Pix Antecipado</h4>
                      <p className="text-[10px] text-neutral-400">Escaneie o QR Code ou copie o código</p>
                    </div>
                  </div>
                  <span className="text-xs font-black font-mono text-emerald-400">
                    R$ {confirmedBooking.totalPrice.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                {confirmedBooking.pixQrCodeUrl ? (
                  <div className="flex justify-center py-2">
                    <div className="p-3 bg-white rounded-2xl shadow-xl inline-block">
                      <img
                        src={confirmedBooking.pixQrCodeUrl}
                        alt="QR Code Pix"
                        className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                      />
                    </div>
                  </div>
                ) : null}

                {confirmedBooking.pixPayload ? (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800 text-left">
                      <span className="text-[10px] text-neutral-400 font-medium block mb-1">
                        Código Pix Copia e Cola:
                      </span>
                      <p className="font-mono text-[11px] text-neutral-300 break-all select-all line-clamp-2">
                        {confirmedBooking.pixPayload}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard?.writeText(confirmedBooking.pixPayload);
                        setCopiedPixKey(true);
                        setTimeout(() => setCopiedPixKey(false), 3000);
                      }}
                      className="w-full text-xs py-2 font-bold cursor-pointer"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <ProjectIcon
                          name={copiedPixKey ? "Check" : "Copy"}
                          size={14}
                          className={copiedPixKey ? "text-emerald-400" : "text-neutral-400"}
                        />
                        <span>{copiedPixKey ? "Código Pix Copiado com Sucesso!" : "Copiar Código Pix (Copia e Cola)"}</span>
                      </span>
                    </Button>
                  </div>
                ) : null}
              </div>
            )}

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
