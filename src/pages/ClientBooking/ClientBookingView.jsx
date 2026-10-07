import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
// [Import: cliente Supabase para persistir agendamentos feitos pelos clientes]
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

// Horários do dia
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

// [Função componente: recebe tenant real e zera os fallbacks estáticos de cliente/barbeiro]
export default function ClientBookingView({
  tenant,
  services = [],
  barbers = [],
  initialBarberId = "",
  initialClientName = "",
  initialClientPhone = "",
  onFinishBooking,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingErrorMessage, setBookingErrorMessage] = useState("");
  const [submissionFailureError, setSubmissionFailureError] = useState("");
  const [notificationNotice, setNotificationNotice] = useState("");
  const [calendarSavedNotice, setCalendarSavedNotice] = useState(false);
  const [simulateHighLatency, setSimulateHighLatency] = useState(false);
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(false);

  // Serviços ativos no catálogo
  const activeServicesList = services.filter((s) => s.active !== false);

  const [selectedServices, setSelectedServices] = useState(
    activeServicesList.length > 0 ? [activeServicesList[0]] : [],
  );

  // FILTRA APENAS OS BARBEIROS ATIVOS (Exclui quem está de férias ou inativo!)
  const activeBarbersList = barbers.filter((b) => b.status === "active");

  // Opção Coringa para quem tem pressa
  const anyBarberOption = {
    id: "any",
    name: "Qualquer Barbeiro Livre",
    role: "Encaixe mais rápido sem espera",
    isAnyProfessional: true,
    isAvailable: true,
    specialties: ["Maior Rapidez"],
  };

  // Lista final que o cliente vê na tela
  const availableBarbersForClient = [...activeBarbersList, anyBarberOption];

  const [selectedBarberId, setSelectedBarberId] = useState(initialBarberId);
  const [bookingDate, setBookingDate] = useState(new Date());
  const [bookingTime, setBookingTime] = useState("");
  const [clientName, setClientName] = useState(initialClientName);
  const [clientPhone, setClientPhone] = useState(initialClientPhone);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

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

  // Cálculos de Totais
  const totalDuration = selectedServices.reduce(
    (a, s) => a + (s.durationMinutes || 0),
    0,
  );
  const totalPrice = selectedServices.reduce(
    (a, s) => a + (Number(s.price) || 0),
    0,
  );

  // Identifica o barbeiro selecionado
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

  // [Função assíncrona: valida os dados e grava o agendamento na tabela appointments do Supabase com tratamento de resiliência]
  const handleConfirmReservation = async (overrideData = null) => {
    setBookingErrorMessage("");
    setSubmissionFailureError("");

    const effectiveName = overrideData?.clientName || clientName;
    const effectivePhone = overrideData?.clientPhone || clientPhone;
    const effectiveTime = overrideData?.time || bookingTime;

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

    setIsSubmittingBooking(true);

    const [startH, startM] = effectiveTime.split(":").map(Number);
    const totalMins = startH * 60 + startM + totalDuration;
    const endH = Math.floor(totalMins / 60);
    const endM = totalMins % 60;
    const computedEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    // Atribui ao primeiro barbeiro livre se escolheu a opção coringa
    const finalBarber = selectedBarberObj.isAnyProfessional
      ? activeBarbersList[0] || selectedBarberObj
      : selectedBarberObj;

    const protocolId = `AG-${Math.floor(1000 + Math.random() * 9000)}`;

    const bookingPayload = {
      protocol: protocolId,
      clientName: effectiveName.trim(),
      clientPhone: effectivePhone,
      barberId: finalBarber.id,
      barberName: finalBarber.name,
      services: selectedServices.map((s) => s.name).join(" + "),
      totalPrice,
      totalDuration,
      dateFormatted: bookingDate.toLocaleDateString("pt-BR"),
      time: effectiveTime,
      endTime: computedEndTime,
    };

    // Validação estrita de schema de ingestão (Defesa contra Mass Assignment e dados corrompidos)
    const rawAppointment = {
      client_name: DOMPurify.sanitize(effectiveName.trim(), { ALLOWED_TAGS: [] }),
      client_phone: DOMPurify.sanitize(effectivePhone.trim(), { ALLOWED_TAGS: [] }),
      barber_id: finalBarber.id !== "any" ? finalBarber.id : "any",
      barber_name: DOMPurify.sanitize(finalBarber.name, { ALLOWED_TAGS: [] }),
      service_name: selectedServices.map((s) => DOMPurify.sanitize(s.name, { ALLOWED_TAGS: [] })).join(" + "),
      duration_minutes: totalDuration,
      price: totalPrice,
      start_time: effectiveTime,
      end_time: computedEndTime,
    };

    const validation = validateSchema(rawAppointment, SCHEMAS.appointmentBooking, {
      rejectUnknown: true,
      callerRole: "client",
    });

    if (!validation.isValid) {
      console.error("[Ingestion Guard] Falha na validação de schema do agendamento:", validation.errors);
      setIsSubmittingBooking(false);
      setBookingErrorMessage("Dados de agendamento não atendem aos critérios de validação de segurança.");
      return;
    }

    try {
      // Método Supabase: insere apenas os campos sanitizados e validados
      const { error: insertError } = await supabase.from("appointments").insert([
        {
          tenant_id: tenant?.id || null,
          ...validation.sanitized,
          barber_id: validation.sanitized.barber_id !== "any" ? validation.sanitized.barber_id : null,
          status: "confirmed",
          is_paid: false, // is_paid fixado pelo servidor, nunca confiado do cliente
        },
      ]);

      if (insertError) {
        throw new Error(insertError.message || "Erro retornado pelo banco Supabase ao persistir agendamento");
      }

      setConfirmedBooking(bookingPayload);
      setCurrentStep(5);
      if (onFinishBooking) onFinishBooking(bookingPayload);
    } catch (err) {
      console.warn("Erro ao salvar agendamento no Supabase (acionando resiliência com retenção de dados):", err);
      setSubmissionFailureError(
        "Instabilidade na conexão com o banco de dados. Seus dados e seleções foram totalmente preservados em memória local para que você possa tentar novamente."
      );
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Simulação de alta latência com Skeleton Screen para testes de UX
  if (isLoadingSkeleton) {
    return (
      <div className={clientBookingStyles.pageWrapper}>
        <Navbar
          variant="client"
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
      <Navbar
        variant="client"
        user={{
          name: clientName || "Cliente",
          avatar: clientName ? clientName.slice(0, 2).toUpperCase() : "CL",
          loyaltyPoints: 120,
        }}
        onNotificationsClick={() =>
          setNotificationNotice("Lembrete: Seu último corte foi há 15 dias!")
        }
        onQuickAction={() => setCurrentStep(1)}
      />

      {/* Notificação toast amigável substitui window.alert */}
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
              className="text-neutral-400 hover:text-white text-xs px-2 py-0.5 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none flex items-center"
            >
              <ProjectIcon name="X" size={14} colorVariant="inherit" />
            </button>
          </div>
        </div>
      )}

      <main id="main-content" className={clientBookingStyles.appContainer}>
        {/* Banner Deep Link */}
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

        {/* Stepper */}
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
                        : "Confirmar Dados"}
                </strong>
              </span>
            </div>

            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                aria-label="Voltar para a etapa anterior"
                className="text-xs text-neutral-400 hover:text-white underline cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none inline-flex items-center gap-1.5"
              >
                <ProjectIcon name="ArrowLeft" size={13} colorVariant="inherit" />
                Voltar
              </button>
            )}
          </div>
        )}

        {/* PASSO 1: SERVIÇOS REAIS DO CATÁLOGO */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className={clientBookingStyles.stepHeader}>
              <h2 className={clientBookingStyles.stepHeading}>
                Quais serviços você deseja?
              </h2>
              <p className={clientBookingStyles.stepDescription}>
                Serviços oficiais de {tenant?.name || "nossa barbearia"}.
              </p>
            </div>

            {/* [Restauração: Lista de serviços com seleção interativa] */}
            <div className="space-y-3">
              {activeServicesList.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  isSelected={selectedServices.some((s) => s.id === service.id)}
                  onToggleSelect={handleToggleService}
                />
              ))}
            </div>
          </div>
        )}

        {/* PASSO 2: PROFISSIONAIS ATIVOS REAIS (EXCLUI QUEM ESTÁ DE FÉRIAS!) */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className={clientBookingStyles.stepHeader}>
              <h2 className={clientBookingStyles.stepHeading}>
                Quem vai te atender?
              </h2>
              <p className={clientBookingStyles.stepDescription}>
                Mostrando os barbeiros disponíveis hoje na equipe.
              </p>
            </div>

            <div className="space-y-3">
              {availableBarbersForClient.map((barber) => (
                <ProfessionalCard
                  key={barber.id}
                  professional={barber}
                  isSelected={selectedBarberId === barber.id}
                  onSelect={(b) => {
                    setSelectedBarberId(b.id);
                    setCurrentStep(3);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* PASSO 3: DATA E HORA */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className={clientBookingStyles.stepHeader}>
              <h2 className={clientBookingStyles.stepHeading}>
                Qual o melhor dia e horário?
              </h2>
              <p className={clientBookingStyles.stepDescription}>
                Grade de horários com {selectedBarberObj.name}.
              </p>
            </div>

            <div className="flex justify-center">
              <DatePicker
                selectedDate={bookingDate}
                onSelectDate={setBookingDate}
                selectedTime={bookingTime}
                onSelectTime={setBookingTime}
                availableTimes={computedTimeSlots}
              />
            </div>
          </div>
        )}

        {/* PASSO 4: CONFIRMAÇÃO */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className={clientBookingStyles.stepHeader}>
              <h2 className={clientBookingStyles.stepHeading}>
                Confirme seus dados
              </h2>
              <p className={clientBookingStyles.stepDescription}>
                Enviaremos a confirmação e lembretes por este WhatsApp.
              </p>
            </div>

            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Serviços:</span>
                <strong className="text-white">
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
                  R$ {totalPrice.toFixed(2).replace(".", ",")} ({totalDuration}{" "}
                  min)
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {/* [Aviso visual de validação] */}
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

              {/* Tratamento Resiliente com Retenção de Formulário e Tentar Novamente */}
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
                placeholder="Ex: Carlos Eduardo"
                value={clientName}
                aria-required="true"
                aria-describedby={bookingErrorMessage ? "booking-validation-error" : undefined}
                onChange={(e) => setClientName(DOMPurify.sanitize(e.target.value.trimStart(), { ALLOWED_TAGS: [] }))}
              />

              {/* [Restauração: Input do WhatsApp com máscara e validação DDD] */}
              <Input
                id="client-phone-input"
                label="Seu WhatsApp (com DDD)"
                mask="phone"
                placeholder="(11) 99999-9999"
                value={clientPhone}
                aria-required="true"
                aria-describedby={bookingErrorMessage ? "booking-validation-error" : undefined}
                onChange={(e) => setClientPhone(DOMPurify.sanitize(e.target.value.trim(), { ALLOWED_TAGS: [] }))}
              />

              {/* Resumo do Agendamento */}
              <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-neutral-300 font-semibold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Resumo do Agendamento:</span>
                </div>
                <SafeHtml
                  html={`<strong>${clientName || "Seu Nome"}</strong> • <em>${selectedBarberObj.name || "Barbeiro"}</em>`}
                />
              </div>
            </div>
          </div>
        )}

        {/* PASSO 5: COMPROVANTE */}
        {currentStep === 5 && confirmedBooking && (
          <div className={clientBookingStyles.voucherCard}>
            <div className={clientBookingStyles.voucherHeader}>
              <div className={clientBookingStyles.successIconBox}>
                <ProjectIcon name="Check" size={24} className="text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-emerald-400">
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

            <div className="space-y-2 p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
              <div className={clientBookingStyles.voucherItem}>
                <span>Barbearia:</span>
                {/* [Exibe o nome oficial do tenant no voucher de confirmação] */}
                <span className={clientBookingStyles.voucherItemValue}>
                  <SafeHtml html={tenant?.name || "Barbearia"} />
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
                <span>Valor Total:</span>
                <span className="font-black text-emerald-400 font-mono text-sm">
                  R$ {confirmedBooking.totalPrice.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            {calendarSavedNotice ? (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 text-center font-bold flex items-center justify-center gap-1.5">
                <ProjectIcon name="Check" size={14} colorVariant="inherit" />
                <span>Evento agendado salvo na memória do dispositivo!</span>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={() => setCalendarSavedNotice(true)}
                className="w-full text-xs py-2.5 font-bold cursor-pointer"
              >
                <span className="flex items-center justify-center gap-2">
                  <ProjectIcon name="Calendar" size={15} colorVariant="inherit" />
                  Salvar na Agenda do Celular
                </span>
              </Button>
            )}
          </div>
        )}
      </main>

      {/* BARRA FLUTUANTE */}
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

            {/* [Botão conectado ao estado assíncrono de salvamento no Supabase] */}
            <Button
              variant="primary"
              isLoading={isSubmittingBooking}
              onClick={() => {
                if (currentStep === 4) handleConfirmReservation();
                else setCurrentStep((prev) => prev + 1);
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
