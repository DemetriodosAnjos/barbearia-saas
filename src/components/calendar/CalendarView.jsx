import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Plus,
  Calendar,
  Clock,
  Scissors,
  User,
  Phone,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { calendarViewStyles } from "./CalendarView.styles";
import BarberTimelineColumn from "./BarberTimelineColumn";
import UnavailableSlotModal from "./UnavailableSlotModal";
import Modal from "../ui/Modal";
import Badge from "../ui/Badge";
import IconButton from "../ui/IconButton";
import Button from "../ui/Button";

// Helper: formata Date em YYYY-MM-DD no fuso horário local (evita desvio UTC)
export const formatDateToYMD = (dateObj) => {
  if (!dateObj) return "";
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper: extrai YYYY-MM-DD real de um agendamento
export const getAppointmentDateYMD = (appt) => {
  if (!appt) return formatDateToYMD(new Date());
  const rawDate = appt.date || appt.bookingDate || "";
  if (typeof rawDate === "string" && rawDate.trim().length >= 10) {
    return rawDate.trim().slice(0, 10);
  }
  const rawCreated = appt.created_at || appt.createdAt || "";
  if (typeof rawCreated === "string" && rawCreated.trim().length >= 10) {
    return rawCreated.trim().slice(0, 10);
  }
  return formatDateToYMD(new Date());
};

// Helper: converte string YYYY-MM-DD em objeto Date local às 00:00:00
export const parseYMDToLocalDate = (ymdStr) => {
  if (!ymdStr || typeof ymdStr !== "string") return new Date();
  const parts = ymdStr.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
};

export default function CalendarView({
  barbers = [],
  appointments = [],
  startHour = 8,
  endHour = 21,
  minuteHeight = 1.8,
  onSlotClick,
  onNewAppointmentClick,
  onAppointmentClick,
  onOpenComanda,
  onStatusChange,
  onCancelAppointment,
  onDropAppointment,
  onDateChange,
}) {
  const [viewMode, setViewMode] = useState("day"); // 'day' | 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBarberFilter, setSelectedBarberFilter] = useState("all");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Estado do Modal de Horário Indisponível (Slots Passados)
  const [isUnavailableModalOpen, setIsUnavailableModalOpen] = useState(false);
  const [unavailableSlotData, setUnavailableSlotData] = useState({
    barberId: "",
    time: "",
    date: null,
  });

  // Estado do Modal / Subtela de Agendamentos do Barbeiro (ao clicar na tag "X cortes")
  const [selectedBarberForModal, setSelectedBarberForModal] = useState(null);
  const [barberModalFilter, setBarberModalFilter] = useState("all"); // 'all' | 'current_day' | 'other_days'
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (onDateChange) {
      onDateChange(currentDate);
    }
  }, [currentDate, onDateChange]);

  const activeDateYMD = formatDateToYMD(currentDate);

  // Abre o modal de agendamentos do barbeiro ao clicar na tag "X cortes"
  const handleOpenBarberAppointments = (barberObj) => {
    setSelectedBarberForModal(barberObj);
    setBarberModalFilter("all");
  };

  // Navega para o dia do agendamento ao clicar no card ou no indicador de Dia/Hora dentro do modal
  const handleJumpToAppointmentDate = (appt) => {
    const apptDateYMD = getAppointmentDateYMD(appt);
    const targetDate = parseYMDToLocalDate(apptDateYMD);

    setSelectedBarberForModal(null);
    setCurrentDate(targetDate);
    setViewMode("day");
    setHighlightedAppointmentId(appt.id);

    // Faz scroll suave até o slot do agendamento na timeline após renderizar o dia
    setTimeout(() => {
      if (typeof document !== "undefined") {
        const slotEl = document.getElementById(`appt-slot-${appt.id}`);
        if (slotEl && typeof slotEl.scrollIntoView === "function") {
          slotEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }, 120);

    setTimeout(() => {
      setHighlightedAppointmentId((prev) => (prev === appt.id ? null : prev));
    }, 3600);
  };

  // Lista reativa de agendamentos do barbeiro selecionado no modal, ordenada por data e hora
  const barberModalAppointments = useMemo(() => {
    if (!selectedBarberForModal) return [];
    const list = appointments.filter(
      (a) =>
        (a.barberId || a.barber_id) === selectedBarberForModal.id &&
        a.status !== "cancelled"
    );
    return [...list].sort((a, b) => {
      const dateA = getAppointmentDateYMD(a);
      const dateB = getAppointmentDateYMD(b);
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = a.startTime || a.start_time || "00:00";
      const timeB = b.startTime || b.start_time || "00:00";
      return timeA.localeCompare(timeB);
    });
  }, [selectedBarberForModal, appointments]);

  const filteredBarberModalAppointments = useMemo(() => {
    if (barberModalFilter === "current_day") {
      return barberModalAppointments.filter(
        (a) => getAppointmentDateYMD(a) === activeDateYMD
      );
    }
    if (barberModalFilter === "other_days") {
      return barberModalAppointments.filter(
        (a) => getAppointmentDateYMD(a) !== activeDateYMD
      );
    }
    return barberModalAppointments;
  }, [barberModalAppointments, barberModalFilter, activeDateYMD]);

  const totalHours = endHour - startHour;
  const hoursList = Array.from({ length: totalHours }, (_, i) => startHour + i);
  const hourSlotHeight = 60 * minuteHeight;

  // 1. Verificador de Data Passada
  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compare = new Date(date);
    compare.setHours(0, 0, 0, 0);
    return compare < today;
  };

  const isCurrentViewPast = isDateInPast(currentDate);

  // 2. Linha Vermelha do Horário Atual
  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const minutesSinceOpening =
    currentHour * 60 + currentMinutes - startHour * 60;
  const isToday = new Date().toDateString() === currentDate.toDateString();
  const isWithinWorkingHours =
    isToday && currentHour >= startHour && currentHour < endHour;
  const redLineTop = minutesSinceOpening * minuteHeight;

  // 3. Navegação Temporal (< Hoje >)
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === "day") next.setDate(next.getDate() - 1);
    if (viewMode === "week") next.setDate(next.getDate() - 7);
    if (viewMode === "month") next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === "day") next.setDate(next.getDate() + 1);
    if (viewMode === "week") next.setDate(next.getDate() + 7);
    if (viewMode === "month") next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => setCurrentDate(new Date());

  // 4. Validador de Slot Passado (Dia anterior OU horário anterior no mesmo dia)
  const isSlotInPast = (date, timeString) => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    // Se o dia for estritamente anterior a hoje
    if (compareDate < today) {
      return true;
    }

    // Se for o mesmo dia, valida se o horário em minutos já passou do relógio atual
    if (compareDate.getTime() === today.getTime()) {
      if (!timeString || typeof timeString !== "string") return false;
      const [h, m] = timeString.split(":").map(Number);
      const slotMinutes = (h || 0) * 60 + (m || 0);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return slotMinutes <= currentMinutes;
    }

    return false; // Dia futuro
  };

  // 5. Interceptador do clique em slot da timeline
  const handleTimelineSlotClick = (barberId, time) => {
    const inPast = isSlotInPast(currentDate, time);

    if (inPast) {
      setUnavailableSlotData({
        barberId,
        time,
        date: currentDate,
      });
      setIsUnavailableModalOpen(true);
      return;
    }

    // Se for horário futuro válido, prossegue com o fluxo normal
    if (onSlotClick) {
      onSlotClick(barberId, time, currentDate);
    }
  };

  // 6. Ação do Botão "Ver horários disponíveis" do Modal
  const handleViewAvailableSlots = () => {
    setIsUnavailableModalOpen(false);
    // Move para o dia de hoje na visão diária
    setCurrentDate(new Date());
    setViewMode("day");

    // Dispara criação com cálculo dinâmico para os horários disponíveis
    if (onNewAppointmentClick) {
      onNewAppointmentClick();
    }
  };

  // 7. Clique em qualquer Dia (Semana ou Mês) - Alterna para visão diária
  const handleDateClick = (targetDate) => {
    setCurrentDate(targetDate);
    setViewMode("day");
  };

  // 8. Clique no Card de Agendamento (Detalhes)
  const handleCardClick = (appt) => {
    if (onAppointmentClick) {
      onAppointmentClick(appt);
    }
  };

  // 6. Cálculo dos 7 Dias da Semana Atual (Domingo a Sábado)
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const dayIndex = startOfWeek.getDay(); // 0 = Domingo
    startOfWeek.setDate(startOfWeek.getDate() - dayIndex);

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  };

  const weekDaysList = getWeekDays();

  const formattedDateTitle = currentDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const filteredBarbers =
    selectedBarberFilter === "all"
      ? barbers
      : barbers.filter((b) => b.id === selectedBarberFilter);

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate();

  // =========================================================================
  // FUNÇÃO AUXILIAR: Cálculo de Métricas Reais por Data (Fonte: Supabase)
  // Recebe um objeto Date e calcula agendamentos e faturamento real daquele dia
  // =========================================================================
  const getDayMetrics = (targetDate) => {
    const targetDateStr = formatDateToYMD(targetDate);

    // Filtro: filtra o array 'appointments' pela data informada e pelo barbeiro ativo
    const dayAppts = appointments.filter((appt) => {
      if (appt.status === "cancelled") return false;
      const apptDate = getAppointmentDateYMD(appt);
      const matchesDate = apptDate === targetDateStr;

      const apptBarberId = appt.barberId || appt.barber_id;
      const matchesBarber =
        selectedBarberFilter === "all" || apptBarberId === selectedBarberFilter;

      return matchesDate && matchesBarber;
    });

    // Método reduce: soma o faturamento real dos agendamentos confirmados/pagos
    const count = dayAppts.length;
    const revenue = dayAppts.reduce(
      (sum, appt) => sum + Number(appt.price || 0),
      0,
    );

    return { count, revenue };
  };

  return (
    <div className={calendarViewStyles.container}>
      {/* 1. BARRA SUPERIOR DE CONTROLES */}
      <div className={calendarViewStyles.toolbar}>
        <div className={calendarViewStyles.navGroup}>
          <Button
            variant="secondary"
            onClick={handleToday}
            className="text-xs py-1.5 px-3"
          >
            Hoje
          </Button>

          <IconButton
            direction="prev"
            size="sm"
            variant="ghost"
            onClick={handlePrev}
            ariaLabel="Anterior"
          />
          <IconButton
            direction="next"
            size="sm"
            variant="ghost"
            onClick={handleNext}
            ariaLabel="Próximo"
          />

          <span className={calendarViewStyles.dateTitle}>
            {formattedDateTitle}
          </span>
        </div>

        {/* Alternador [ Dia | Semana | Mês ] */}
        <div className={calendarViewStyles.viewToggleWrapper}>
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`${calendarViewStyles.viewButton} ${viewMode === "day" ? calendarViewStyles.viewActive : calendarViewStyles.viewInactive}`}
          >
            Dia
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`${calendarViewStyles.viewButton} ${viewMode === "week" ? calendarViewStyles.viewActive : calendarViewStyles.viewInactive}`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`${calendarViewStyles.viewButton} ${viewMode === "month" ? calendarViewStyles.viewActive : calendarViewStyles.viewInactive}`}
          >
            Mês
          </button>
        </div>

        {/* Filtros e Botão Novo */}
        <div className={calendarViewStyles.actionsGroup}>
          <select
            value={selectedBarberFilter}
            onChange={(e) => setSelectedBarberFilter(e.target.value)}
            className="bg-neutral-800 text-neutral-200 text-xs py-2 px-3 rounded-lg border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            aria-label="Filtrar por Barbeiro"
          >
            <option value="all">Todos os Barbeiros</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <Button
            variant="primary"
            onClick={() =>
              onNewAppointmentClick && onNewAppointmentClick(currentDate)
            }
            disabled={isCurrentViewPast}
            className="text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-neutral-950" />
            <span>Novo Agendamento</span>
          </Button>
        </div>
      </div>

      {/* Faixa de Aviso se estiver em Data Passada */}
      {isCurrentViewPast && viewMode === "day" && (
        <div className="bg-amber-950/40 border-b border-amber-800/60 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 inline" />
            <span>
              <strong>Modo de Consulta Histórica:</strong> Visualizando dia
              passado ({currentDate.toLocaleDateString("pt-BR")}). Agendamentos
              desabilitados.
            </span>
          </span>
          <button
            type="button"
            onClick={handleToday}
            className="text-white underline font-bold hover:text-amber-400 cursor-pointer"
          >
            Voltar para Hoje
          </button>
        </div>
      )}

      {/* 2. ÁREA OPERACIONAL: DIA, SEMANA OU MÊS */}
      {viewMode === "day" ? (
        /* VISÃO DIÁRIA: Régua Horária + Colunas de Todos os Barbeiros */
        <div className={calendarViewStyles.gridWrapper}>
          <div className={calendarViewStyles.timeGutter}>
            <div className={calendarViewStyles.timeGutterHeader}>Horários</div>
            {hoursList.map((hour) => (
              <div
                key={hour}
                style={{ height: `${hourSlotHeight}px` }}
                className={calendarViewStyles.timeGutterSlot}
              >
                <span>{String(hour).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>

          <div className={calendarViewStyles.columnsContainer}>
            {isWithinWorkingHours && (
              <div
                style={{ top: `${redLineTop + 62}px` }}
                className={calendarViewStyles.currentTimeLine}
                title={`Horário Atual: ${currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
              >
                <div className={calendarViewStyles.currentTimeDot} />
                <div className={calendarViewStyles.currentTimeBar} />
              </div>
            )}

            {/* Renderização das colunas dos barbeiros com isolamento estrito pela data selecionada (activeDateYMD) */}
            {filteredBarbers.map((barber) => {
              // Todos os agendamentos ativos deste barbeiro (para o contador "X cortes" e modal de agendamentos)
              const barberAllAppts = appointments.filter(
                (a) =>
                  (a.barberId || a.barber_id) === barber.id &&
                  a.status !== "cancelled",
              );

              // APENAS os agendamentos cuja data corresponde ao dia aberto na grade (ex: 08/10 não exibe 09/10 ou 10/10)
              const barberDayAppts = barberAllAppts.filter(
                (a) => getAppointmentDateYMD(a) === activeDateYMD,
              );

              return (
                <BarberTimelineColumn
                  key={barber.id}
                  barber={barber}
                  startHour={startHour}
                  endHour={endHour}
                  minuteHeight={minuteHeight}
                  isPastDate={isCurrentViewPast}
                  isSlotPast={(time) => isSlotInPast(currentDate, time)}
                  breaks={Array.isArray(barber.breaks) ? barber.breaks : Array.isArray(barber.breaks?.intervals) ? barber.breaks.intervals : []}
                  appointments={barberDayAppts}
                  allBarberAppointments={barberAllAppts}
                  highlightedAppointmentId={highlightedAppointmentId}
                  onOpenBarberAppointments={handleOpenBarberAppointments}
                  onSlotClick={handleTimelineSlotClick}
                  onAppointmentClick={handleCardClick}
                  onOpenComanda={onOpenComanda}
                  onStatusChange={onStatusChange}
                  onCancel={onCancelAppointment}
                  onDropAppointment={onDropAppointment}
                />
              );
            })}
          </div>
        </div>
      ) : viewMode === "week" ? (
        /* VISÃO SEMANAL: GRADE DE 7 DIAS CLICÁVEIS */
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-bold uppercase tracking-wider text-amber-500">
              Grade Semanal • Clique em um dia para abrir na Visão Diária
            </span>
            <span className="text-[11px] text-neutral-500">
              Dias passados exibem aviso de consulta histórica
            </span>
          </div>

          <div className={calendarViewStyles.weekGrid}>
            {weekDaysList.map((dayDate) => {
              const past = isDateInPast(dayDate);
              const isTodayDate =
                dayDate.toDateString() === new Date().toDateString();
              const weekdayName = dayDate.toLocaleDateString("pt-BR", {
                weekday: "short",
              });
              const dateFormatted = dayDate.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              });

              return (
                <div
                  key={dayDate.toISOString()}
                  onClick={() => handleDateClick(dayDate)}
                  className={`
                    ${calendarViewStyles.weekDayCard}
                    ${past ? "opacity-60 bg-neutral-950/40 hover:border-red-500/50" : "hover:border-amber-500 hover:bg-neutral-900"}
                    ${isTodayDate ? "border-amber-500 ring-2 ring-amber-500/30 bg-amber-950/20" : ""}
                  `}
                >
                  {/* Cabeçalho do Card do Dia */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider">
                        {weekdayName}
                      </span>
                      {isTodayDate && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-black">
                          HOJE
                        </span>
                      )}
                      {past && (
                        <span className="text-[9px] font-medium text-neutral-500">
                          Passado
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-base font-extrabold ${isTodayDate ? "text-amber-400" : past ? "text-neutral-400" : "text-neutral-100"}`}
                    >
                      {dateFormatted}
                    </p>
                  </div>

                  {/* Resumo Real com Base no Supabase */}
                  {(() => {
                    const { count, revenue } = getDayMetrics(dayDate);

                    return (
                      <div className="pt-3 border-t border-neutral-800/80 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-neutral-400">
                            Atendimentos:
                          </span>
                          <strong className="text-amber-400 font-bold">
                            {count > 0
                              ? `${count} ${past ? "realizado(s)" : "agendado(s)"}`
                              : "Nenhum"}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-neutral-500">
                            {past ? "Faturado:" : "Previsto:"}
                          </span>
                          <span className="text-emerald-400 font-semibold font-mono">
                            R$ {revenue.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VISÃO MENSAL: GRADE DE 30 DIAS CLICÁVEIS */
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-bold uppercase tracking-wider text-amber-500">
              Grade Mensal • Clique em um dia para abrir na Visão Diária
            </span>
            <span className="text-[11px] text-neutral-500">
              Dias passados exibem aviso de consulta histórica
            </span>
          </div>

          <div className={calendarViewStyles.monthGrid}>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dayDate = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day,
              );
              const past = isDateInPast(dayDate);
              const isTodayDate =
                dayDate.toDateString() === new Date().toDateString();

              return (
                <div
                  key={day}
                  onClick={() => handleDateClick(dayDate)}
                  className={`
                    ${calendarViewStyles.monthDayCard}
                    ${past ? "opacity-50 hover:border-red-500/50 bg-neutral-950/40" : "hover:border-amber-500"}
                    ${isTodayDate ? "border-amber-500 ring-1 ring-amber-500/50 bg-amber-950/10" : ""}
                  `}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-bold ${isTodayDate ? "text-amber-400" : past ? "text-neutral-500" : "text-neutral-200"}`}
                    >
                      {day} {isTodayDate && "• Hoje"}
                    </span>
                    {past && (
                      <span className="text-[9px] text-neutral-500 uppercase">
                        Passado
                      </span>
                    )}
                  </div>

                  {/* Métricas Reais do Dia no Mês */}
                  {(() => {
                    const { count, revenue } = getDayMetrics(dayDate);

                    return (
                      <div className="space-y-0.5 mt-2">
                        <p className="text-[10px] text-amber-400/90 font-semibold">
                          {count > 0
                            ? `${count} ${past ? "realizado(s)" : "agendado(s)"}`
                            : "Livre"}
                        </p>
                        <p className="text-[9px] text-neutral-500 font-mono">
                          {revenue > 0
                            ? `R$ ${revenue.toFixed(0)} ${past ? "faturado" : "previsto"}`
                            : "Sem faturamento"}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE HORÁRIO INDISPONÍVEL COM OVERLAY (SLOTS PASSADOS) */}
      <UnavailableSlotModal
        isOpen={isUnavailableModalOpen}
        onClose={() => setIsUnavailableModalOpen(false)}
        onViewAvailable={handleViewAvailableSlots}
        selectedTime={unavailableSlotData.time}
        selectedDate={unavailableSlotData.date}
      />

      {/* MODAL / SUBTELA DE AGENDAMENTOS DO BARBEIRO (AO CLICAR NA TAG "X CORTES") */}
      <Modal
        isOpen={!!selectedBarberForModal}
        onClose={() => setSelectedBarberForModal(null)}
        title={
          selectedBarberForModal ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                {selectedBarberForModal.avatar ||
                  selectedBarberForModal.name?.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left">
                <span className="block text-sm font-extrabold text-white leading-tight">
                  {selectedBarberForModal.name} • {barberModalAppointments.length}{" "}
                  {barberModalAppointments.length === 1 ? "corte" : "cortes"}
                </span>
                <span className="block text-[11px] font-medium text-neutral-400">
                  {selectedBarberForModal.role || "Barbeiro"} — Clique no card ou no dia/hora para abrir a agenda na data do agendamento
                </span>
              </div>
            </div>
          ) : (
            "Agendamentos do Profissional"
          )
        }
        footer={
          <div className="w-full flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-400 font-mono">
              Total previsto:{" "}
              <strong className="text-emerald-400">
                R${" "}
                {barberModalAppointments
                  .reduce((acc, a) => acc + Number(a.price || 0), 0)
                  .toFixed(2)
                  .replace(".", ",")}
              </strong>
            </span>
            <Button
              variant="secondary"
              onClick={() => setSelectedBarberForModal(null)}
              className="text-xs"
            >
              Fechar
            </Button>
          </div>
        }
      >
        {selectedBarberForModal && (
          <div className="space-y-3 text-left">
            {/* Barra de Filtros Rápidos: Todos | Neste Dia | Outros Dias */}
            {(() => {
              const sameDayCount = barberModalAppointments.filter(
                (a) => getAppointmentDateYMD(a) === activeDateYMD
              ).length;
              const otherDaysCount =
                barberModalAppointments.length - sameDayCount;
              const currentDayLabel = currentDate.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              });

              return (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBarberModalFilter("all")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        barberModalFilter === "all"
                          ? "bg-amber-500 text-neutral-950"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Todos ({barberModalAppointments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarberModalFilter("current_day")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        barberModalFilter === "current_day"
                          ? "bg-amber-500 text-neutral-950"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Dia {currentDayLabel} ({sameDayCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarberModalFilter("other_days")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        barberModalFilter === "other_days"
                          ? "bg-amber-500 text-neutral-950"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      Outros Dias ({otherDaysCount})
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Lista de Cards dos Agendamentos */}
            {filteredBarberModalAppointments.length === 0 ? (
              <div className="p-6 bg-neutral-950/80 border border-neutral-800 rounded-2xl text-center space-y-2">
                <Scissors className="w-7 h-7 text-neutral-600 mx-auto" />
                <p className="text-xs font-bold text-neutral-300">
                  Nenhum agendamento encontrado neste filtro.
                </p>
                <p className="text-[11px] text-neutral-500">
                  Selecione &ldquo;Todos&rdquo; acima ou cadastre um novo horário na grade.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {filteredBarberModalAppointments.map((appt) => {
                  const clientName =
                    appt.clientName || appt.client_name || "Cliente";
                  const clientPhone =
                    appt.clientPhone || appt.client_phone || "";
                  const serviceName =
                    appt.serviceName || appt.service_name || "Corte Tradicional";
                  const startTime =
                    appt.startTime || appt.start_time || "09:00";
                  const endTime = appt.endTime || appt.end_time || "09:30";
                  const duration =
                    appt.durationMinutes || appt.duration_minutes || 30;
                  const price = Number(appt.price || 0);
                  const status = appt.status || "confirmed";
                  const isPaid = Boolean(appt.isPaid ?? appt.is_paid);

                  const apptDateYMD = getAppointmentDateYMD(appt);
                  const apptDateObj = parseYMDToLocalDate(apptDateYMD);
                  const isSameAsCurrentView = apptDateYMD === activeDateYMD;
                  const formattedBRDate = apptDateObj.toLocaleDateString(
                    "pt-BR",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }
                  );
                  const shortBRDate = apptDateObj.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  });
                  const weekdayShort = apptDateObj.toLocaleDateString("pt-BR", {
                    weekday: "short",
                  });

                  return (
                    <div
                      key={appt.id}
                      onClick={() => handleJumpToAppointmentDate(appt)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleJumpToAppointmentDate(appt);
                        }
                      }}
                      className={`group p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer text-left ${
                        isSameAsCurrentView
                          ? "bg-neutral-900/90 border-amber-500/40 hover:border-amber-400"
                          : "bg-neutral-950/90 border-neutral-800 hover:border-amber-500/70 hover:bg-neutral-900/80"
                      }`}
                    >
                      {/* Linha 1: Nome do Cliente + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                              {clientName}
                            </h4>
                          </div>
                          {clientPhone && (
                            <p className="text-[11px] text-neutral-400 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-neutral-500 shrink-0" />
                              <span>{clientPhone}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge status={status} size="sm" showIcon={false} />
                        </div>
                      </div>

                      {/* Linha 2: Serviço e Valor */}
                      <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                        <span className="text-neutral-300 font-medium flex items-center gap-1.5 truncate">
                          <Scissors className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{serviceName}</span>
                          <span className="text-neutral-500 font-mono">
                            ({duration} min)
                          </span>
                        </span>
                        <span className="font-mono font-bold text-emerald-400 shrink-0">
                          R$ {price.toFixed(2).replace(".", ",")}{" "}
                          <span className="text-[10px] text-neutral-400 font-normal">
                            ({isPaid ? "Pago" : "Pendente"})
                          </span>
                        </span>
                      </div>

                      {/* Linha 3: Botão/Indicador Clicável de Dia e Hora (Abre a agenda no dia do agendamento) */}
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJumpToAppointmentDate(appt);
                          }}
                          className="flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 border border-amber-500/30 group-hover:border-amber-400 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                          title={`Abrir agenda no dia ${formattedBRDate} às ${startTime}`}
                        >
                          <span className="flex items-center gap-1.5 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="uppercase">{weekdayShort}</span>
                            <span>{formattedBRDate}</span>
                            <span className="text-neutral-500">•</span>
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              {startTime} às {endTime}
                            </span>
                          </span>

                          <span className="flex items-center gap-1 text-[10px] font-extrabold text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0">
                            <span>
                              {isSameAsCurrentView
                                ? "Focar no slot"
                                : `Abrir dia ${shortBRDate}`}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </button>

                        {onAppointmentClick && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBarberForModal(null);
                              onAppointmentClick(appt);
                            }}
                            className="px-2.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                            title="Abrir ficha de detalhes / pagamento deste atendimento"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Ficha</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
