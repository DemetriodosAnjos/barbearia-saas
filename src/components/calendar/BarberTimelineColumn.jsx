import { timelineColumnStyles } from "./BarberTimelineColumn.styles";
import AppointmentCard from "./AppointmentCard";

export default function BarberTimelineColumn({
  barber = {
    id: "barber-1",
    name: "Carlos Silva",
    role: "Master Barber",
    avatar: "CS",
  },
  startHour = 8,
  endHour = 18,
  minuteHeight = 1.8,
  isPastDate = false, // Informa se o dia visualizado já passou
  breaks = [{ startTime: "12:00", endTime: "13:00", label: "Pausa de Almoço" }],
  appointments = [],
  onSlotClick,
  onAppointmentClick,
  onStatusChange,
  onOpenComanda,
  onCancel,
}) {
  const totalHours = endHour - startHour;
  const totalMinutes = totalHours * 60;
  const columnHeight = totalMinutes * minuteHeight;

  const timeToMinutesFromStart = (timeString) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const totalMins = hours * 60 + minutes;
    const startMins = startHour * 60;
    return totalMins - startMins;
  };

  const hoursList = Array.from({ length: totalHours }, (_, i) => startHour + i);

  // Trata o clique no slot vazio respeitando a trava do passado
  const handleSlotClickInternal = (time) => {
    if (isPastDate) {
      alert(
        `⚠️ AÇÃO BLOQUEADA:\n\nEsta data já passou. Não é permitido criar novos agendamentos no passado.`,
      );
      return;
    }
    if (onSlotClick) onSlotClick(barber.id, time);
  };

  return (
    <div className={timelineColumnStyles.column}>
      {/* 1. Cabeçalho do Barbeiro */}
      <div className={timelineColumnStyles.header}>
        <div className={timelineColumnStyles.barberInfo}>
          <div className={timelineColumnStyles.avatar}>
            {barber.avatar || barber.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="truncate">
            <h3 className={timelineColumnStyles.name}>{barber.name}</h3>
            <p className={timelineColumnStyles.role}>{barber.role}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          {appointments.length} cortes
        </span>
      </div>

      {/* 2. Grade de Horários */}
      <div
        className={timelineColumnStyles.timelineBody}
        style={{ height: `${columnHeight}px` }}
      >
        {hoursList.map((hour) => {
          const hourFormatted = `${String(hour).padStart(2, "0")}:00`;
          const halfHourFormatted = `${String(hour).padStart(2, "0")}:30`;
          const slotHeight = 60 * minuteHeight;

          return (
            <div
              key={hour}
              style={{ height: `${slotHeight}px` }}
              className="flex flex-col"
            >
              <div
                style={{ height: `${slotHeight / 2}px` }}
                onClick={() => handleSlotClickInternal(hourFormatted)}
                className={`${timelineColumnStyles.hourSlot} ${isPastDate ? "cursor-not-allowed opacity-60" : ""}`}
                title={
                  isPastDate
                    ? "Horário passado (bloqueado para novos agendamentos)"
                    : `Agendar às ${hourFormatted}`
                }
              >
                <span>{hourFormatted}</span>
              </div>

              <div
                style={{ height: `${slotHeight / 2}px` }}
                onClick={() => handleSlotClickInternal(halfHourFormatted)}
                className={`${timelineColumnStyles.halfHourSlot} ${isPastDate ? "cursor-not-allowed opacity-60" : ""}`}
              />
            </div>
          );
        })}

        {/* 3. Pausa de Almoço */}
        {breaks.map((pause, idx) => {
          const startMins = timeToMinutesFromStart(pause.startTime);
          const endMins = timeToMinutesFromStart(pause.endTime);
          const top = startMins * minuteHeight;
          const height = (endMins - startMins) * minuteHeight;

          return (
            <div
              key={`break-${idx}`}
              style={{ top: `${top}px`, height: `${height}px` }}
              className={timelineColumnStyles.breakBlock}
            >
              <div className={timelineColumnStyles.breakText}>
                <span>☕</span>
                <span>
                  {pause.label} ({pause.startTime} - {pause.endTime})
                </span>
              </div>
            </div>
          );
        })}

        {/* 4. Cards de Agendamento (Sempre clicáveis para ver detalhes!) */}
        <div className={timelineColumnStyles.cardsLayer}>
          {appointments.map((appt) => {
            const startMins = timeToMinutesFromStart(appt.startTime);
            const top = startMins * minuteHeight;

            return (
              <div
                key={appt.id}
                style={{ top: `${top}px` }}
                className={timelineColumnStyles.cardWrapper}
              >
                <AppointmentCard
                  appointment={appt}
                  minuteHeight={minuteHeight}
                  onClick={() => onAppointmentClick && onAppointmentClick(appt)}
                  onStatusChange={onStatusChange}
                  onOpenComanda={onOpenComanda}
                  onCancel={onCancel}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
