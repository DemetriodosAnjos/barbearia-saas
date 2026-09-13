import { useState, useEffect } from "react";
import { calendarViewStyles } from "./CalendarView.styles";
import BarberTimelineColumn from "./BarberTimelineColumn";
import IconButton from "../ui/IconButton";
import Button from "../ui/Button";

export default function CalendarView({
  barbers = [],
  appointments = [],
  startHour = 8,
  endHour = 19,
  minuteHeight = 1.8,
  onSlotClick,
  onNewAppointmentClick,
  onAppointmentClick,
  onOpenComanda,
  onStatusChange,
  onDropAppointment,
}) {
  const [viewMode, setViewMode] = useState("day"); // 'day' | 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBarberFilter, setSelectedBarberFilter] = useState("all");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  // 4. REGRA DE NEGÓCIO UNIFICADA: Clique em qualquer Dia (Semana ou Mês)
  const handleDateClick = (targetDate) => {
    const isPast = isDateInPast(targetDate);

    if (isPast) {
      // SE FOR PASSADA: Exibe alerta de bloqueio e avança em modo consulta
      alert(
        `⚠️ ATENÇÃO: DATA RETROATIVA (${targetDate.toLocaleDateString("pt-BR")})\n\n` +
          `Não é possível realizar novos agendamentos em datas passadas.\n\n` +
          `Clique em "Entendi!" para abrir a data em MODO DE CONSULTA HISTÓRICA (apenas para ver detalhes de agendamentos realizados).`,
      );
      setCurrentDate(targetDate);
      setViewMode("day");
    } else {
      // SE FOR HOJE OU FUTURA: Abre direto na visão diária liberada
      alert(
        `📅 ABRINDO DIA NA VISÃO DIÁRIA:\n\n` +
          `• Data Selecionada: ${targetDate.toLocaleDateString("pt-BR")}\n` +
          `• Status: Horários livres liberados para agendamento!`,
      );
      setCurrentDate(targetDate);
      setViewMode("day");
    }
  };

  // 5. Clique no Card de Agendamento (Detalhes)
  const handleCardClick = (appt) => {
    if (onAppointmentClick) {
      onAppointmentClick(appt);
    } else {
      alert(
        `📄 MODAL: DETALHES DO AGENDAMENTO nº ${appt.id}\n\n` +
          `• Cliente: ${appt.clientName} ${appt.isVip ? "(VIP ★)" : ""}\n` +
          `• Serviço: ${appt.serviceName}\n` +
          `• Horário: ${appt.startTime} às ${appt.endTime} (${appt.durationMinutes} min)\n` +
          `• Status: ${appt.status.toUpperCase()}\n` +
          `• Pagamento: ${appt.isPaid ? "Quitado (Pago)" : "Pendente no Caixa"}`,
      );
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
            onClick={onNewAppointmentClick}
            disabled={isCurrentViewPast}
            className="text-xs py-2 px-3.5"
          >
            <span>+</span> Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Faixa de Aviso se estiver em Data Passada */}
      {isCurrentViewPast && viewMode === "day" && (
        <div className="bg-amber-950/40 border-b border-amber-800/60 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
          <span>
            ⚠️ <strong>Modo de Consulta Histórica:</strong> Visualizando dia
            passado ({currentDate.toLocaleDateString("pt-BR")}). Agendamentos
            desabilitados.
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

            {filteredBarbers.map((barber) => {
              const barberAppts = appointments.filter(
                (a) => a.barberId === barber.id,
              );

              return (
                <BarberTimelineColumn
                  key={barber.id}
                  barber={barber}
                  startHour={startHour}
                  endHour={endHour}
                  minuteHeight={minuteHeight}
                  isPastDate={isCurrentViewPast}
                  breaks={
                    barber.breaks || [
                      { startTime: "12:00", endTime: "13:00", label: "Almoço" },
                    ]
                  }
                  appointments={barberAppts}
                  onSlotClick={onSlotClick}
                  onAppointmentClick={handleCardClick}
                  onOpenComanda={onOpenComanda}
                  onStatusChange={onStatusChange}
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

                  {/* Resumo de Agendamentos e Faturamento */}
                  <div className="pt-3 border-t border-neutral-800/80 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400">Atendimentos:</span>
                      <strong className="text-amber-400 font-bold">
                        {past ? "6 feitos" : "8 livres"}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-neutral-500">Estimativa:</span>
                      <span className="text-emerald-400 font-semibold">
                        {past ? "R$ 480" : "R$ 640"}
                      </span>
                    </div>
                  </div>
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

                  <div className="space-y-0.5 mt-2">
                    <p className="text-[10px] text-amber-400/90 font-semibold">
                      {past ? "4 realizados" : "6 agendados"}
                    </p>
                    <p className="text-[9px] text-neutral-500">
                      {past ? "R$ 320 faturado" : "R$ 480 previsto"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
