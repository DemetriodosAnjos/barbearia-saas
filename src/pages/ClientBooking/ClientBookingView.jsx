import { useState, useEffect } from "react";
// [Import: cliente Supabase para persistir agendamentos feitos pelos clientes]
import { supabase } from "../../lib/supabase";
import { clientBookingStyles } from "./ClientBookingView.styles";
import Navbar from "../../components/ui/Navbar";
import ServiceCard from "../../components/services/ServiceCard";
import ProfessionalCard from "../../components/services/ProfessionalCard";
import DatePicker from "../../components/ui/DatePicker";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

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

  // Serviços ativos no catálogo
  const activeServicesList = services.filter((s) => s.active !== false);

  const [selectedServices, setSelectedServices] = useState(
    activeServicesList.length > 0 ? [activeServicesList[0]] : [],
  );

  // 👇 FILTRA APENAS OS BARBEIROS ATIVOS (Exclui quem está de férias ou inativo!)
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
          alert("Você precisa selecionar pelo menos 1 serviço.");
          return prev;
        }
        return prev.filter((s) => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  // [Função assíncrona: valida os dados e grava o agendamento na tabela appointments do Supabase]
  const handleConfirmReservation = async () => {
    setBookingErrorMessage("");

    if (!clientName.trim() || !clientPhone || clientPhone.length < 14) {
      setBookingErrorMessage(
        "Por favor, preencha seu nome completo e WhatsApp com DDD.",
      );
      return;
    }

    if (!bookingTime) {
      setBookingErrorMessage("Selecione um horário disponível na grade.");
      return;
    }

    setIsSubmittingBooking(true);

    const [startH, startM] = bookingTime.split(":").map(Number);
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
      clientName: clientName.trim(),
      clientPhone,
      barberId: finalBarber.id,
      barberName: finalBarber.name,
      services: selectedServices.map((s) => s.name).join(" + "),
      totalPrice,
      totalDuration,
      dateFormatted: bookingDate.toLocaleDateString("pt-BR"),
      time: bookingTime,
      endTime: computedEndTime,
    };

    try {
      // Método Supabase: insere o agendamento real na tabela appointments
      await supabase.from("appointments").insert([
        {
          tenant_id: tenant?.id || null,
          client_name: clientName.trim(),
          client_phone: clientPhone,
          barber_id: finalBarber.id !== "any" ? finalBarber.id : null,
          barber_name: finalBarber.name,
          service_name: selectedServices.map((s) => s.name).join(" + "),
          duration_minutes: totalDuration,
          price: totalPrice,
          start_time: bookingTime,
          end_time: computedEndTime,
          status: "confirmed",
          is_paid: false,
        },
      ]);
    } catch (err) {
      console.error("Erro ao salvar agendamento no Supabase:", err);
    } finally {
      setIsSubmittingBooking(false);
    }

    setConfirmedBooking(bookingPayload);
    setCurrentStep(5);

    if (onFinishBooking) onFinishBooking(bookingPayload);
  };

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
          alert("Lembrete: Seu último corte foi há 15 dias!")
        }
        onQuickAction={() => setCurrentStep(1)}
      />

      <div className={clientBookingStyles.appContainer}>
        {/* Banner Deep Link */}
        {initialBarberId &&
          currentStep < 5 &&
          selectedBarberObj &&
          !selectedBarberObj.isAnyProfessional && (
            <div className={clientBookingStyles.deepLinkBanner}>
              <div className="flex items-center gap-2">
                <span>💈</span>
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
          <div className={clientBookingStyles.stepperBox}>
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
                className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
              >
                ← Voltar
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
              {/* [Aviso visual sem alert nativo] */}
              {bookingErrorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300">
                  ⚠️ {bookingErrorMessage}
                </div>
              )}

              <Input
                label="Seu Nome Completo"
                placeholder="Ex: Carlos Eduardo"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />

              {/* [Restauração: Input do WhatsApp com máscara e validação DDD] */}
              <Input
                label="Seu WhatsApp (com DDD)"
                mask="phone"
                placeholder="(11) 99999-9999"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* PASSO 5: COMPROVANTE */}
        {currentStep === 5 && confirmedBooking && (
          <div className={clientBookingStyles.voucherCard}>
            <div className={clientBookingStyles.voucherHeader}>
              <div className={clientBookingStyles.successIconBox}>✓</div>
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
                  {tenant?.name || "Barbearia"}
                </span>
              </div>
              <div className={clientBookingStyles.voucherItem}>
                <span>Barbeiro:</span>
                <span className="font-bold text-amber-400">
                  {confirmedBooking.barberName}
                </span>
              </div>
              <div className={clientBookingStyles.voucherItem}>
                <span>Serviços:</span>
                <span className={clientBookingStyles.voucherItemValue}>
                  {confirmedBooking.services}
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

            <Button
              variant="primary"
              onClick={() => alert("Adicionando à sua agenda do celular...")}
              className="w-full text-xs py-2.5 font-bold"
            >
              📅 Salvar na Agenda do Celular
            </Button>
          </div>
        )}
      </div>

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
              {currentStep === 4 ? "Confirmar Agendamento ✓" : "Continuar ➔"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
