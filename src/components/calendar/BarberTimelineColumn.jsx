import { useState } from "react";
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
  isPastDate = false,
  breaks = [{ startTime: "12:00", endTime: "13:00", label: "Pausa de Almoço" }],
  appointments = [],
  onSlotClick,
  onAppointmentClick,
  onStatusChange,
  onOpenComanda,
  onCancel,
  onDropAppointment, // 👈 Recebe a ação de soltar card
}) {
  // Estado para destacar o slot onde o mouse está passando por cima no arraste
  const [activeDropTime, setActiveDropTime] = useState(null);

  const totalHours = endHour - startHour;
  const totalMinutes = totalHours * 60;
  const columnHeight = totalMinutes * minuteHeight;

  // ✅ FUNÇÃO CORRIGIDA COM SUPORTE A 24H E VALIDAÇÃO:
  const timeToMinutesFromStart = (timeString) => {
    if (!timeString || typeof timeString !== "string") return 0;

    let [hours, minutes] = timeString.split(":").map(Number);

    // Se vier no formato 12h após o meio-dia (ex: 01:00 até 06:00 correspondendo a 13h-18h)
    if (hours >= 1 && hours <= 6) {
      hours += 12;
    }

    const totalMins = hours * 60 + (minutes || 0);
    const startMins = startHour * 60;
    return Math.max(0, totalMins - startMins);
  };

  const hoursList = Array.from({ length: totalHours }, (_, i) => startHour + i);

  // Manipulação de Drop (Soltar Card)
  const handleDragOver = (e, time) => {
    if (isPastDate) return;
    e.preventDefault(); // Permite o drop no navegador
    e.dataTransfer.dropEffect = "move";
    if (activeDropTime !== time) {
      setActiveDropTime(time);
    }
  };

  const handleDrop = (e, targetTime) => {
    e.preventDefault();
    setActiveDropTime(null);
    if (isPastDate) return;

    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (dataStr && onDropAppointment) {
        const draggedAppointment = JSON.parse(dataStr);
        onDropAppointment(draggedAppointment, barber.id, targetTime);
      }
    } catch (err) {
      console.error("Erro ao processar reagendamento:", err);
    }
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

      {/* 2. Grade de Horários com Suporte a Drag & Drop */}
      <div
        className={timelineColumnStyles.timelineBody}
        style={{ height: `${columnHeight}px` }}
        onDragLeave={() => setActiveDropTime(null)}
      >
        {hoursList.map((hour) => {
          const hourFormatted = `${String(hour).padStart(2, "0")}:00`;
          const halfHourFormatted = `${String(hour).padStart(2, "0")}:30`;
          const slotHeight = 60 * minuteHeight;

          const isFirstHalfActive = activeDropTime === hourFormatted;
          const isSecondHalfActive = activeDropTime === halfHourFormatted;

          return (
            <div
              key={hour}
              style={{ height: `${slotHeight}px` }}
              className="flex flex-col"
            >
              {/* Slot :00 */}
              <div
                style={{ height: `${slotHeight / 2}px` }}
                onClick={() =>
                  onSlotClick && onSlotClick(barber.id, hourFormatted)
                }
                onDragOver={(e) => handleDragOver(e, hourFormatted)}
                onDrop={(e) => handleDrop(e, hourFormatted)}
                className={`
                  ${timelineColumnStyles.hourSlot}
                  ${isFirstHalfActive ? "bg-amber-500/25 border-dashed border-amber-500 ring-1 ring-amber-500/50" : ""}
                `}
              >
                <span>{hourFormatted}</span>
              </div>

              {/* Slot :30 */}
              <div
                style={{ height: `${slotHeight / 2}px` }}
                onClick={() =>
                  onSlotClick && onSlotClick(barber.id, halfHourFormatted)
                }
                onDragOver={(e) => handleDragOver(e, halfHourFormatted)}
                onDrop={(e) => handleDrop(e, halfHourFormatted)}
                className={`
                  ${timelineColumnStyles.halfHourSlot}
                  ${isSecondHalfActive ? "bg-amber-500/25 border-dashed border-amber-500 ring-1 ring-amber-500/50" : ""}
                `}
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

        {/* 4. Cards de Agendamento */}
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
