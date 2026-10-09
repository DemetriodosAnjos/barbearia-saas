import { useState, useMemo } from "react";
import { Coffee, Calendar } from "lucide-react";
import { timelineColumnStyles } from "./BarberTimelineColumn.styles";
import AppointmentCard from "./AppointmentCard";

export default function BarberTimelineColumn({
  barber,
  startHour = 8,
  endHour = 21,
  minuteHeight = 1.8,
  isPastDate = false,
  isSlotPast,
  breaks,
  appointments = [],
  allBarberAppointments,
  highlightedAppointmentId = null,
  onOpenBarberAppointments,
  onSlotClick,
  onAppointmentClick,
  onStatusChange,
  onOpenComanda,
  onCancel,
  onDropAppointment,
}) {
  // Estado para destacar o slot onde o mouse está passando por cima no arraste
  const [activeDropTime, setActiveDropTime] = useState(null);
  // Estado para rastrear qual card está com o menu de 3 pontos aberto e elevar o z-index
  const [openMenuApptId, setOpenMenuApptId] = useState(null);

  // 2. Extrai e normaliza as pausas de forma defensiva para garantir que seja sempre um Array
  const rawBreaks = Array.isArray(breaks)
    ? breaks
    : Array.isArray(barber.breaks)
    ? barber.breaks
    : Array.isArray(barber.breaks?.intervals)
    ? barber.breaks.intervals
    : [];

  // Se não houver breaks no formato de array, tenta extrair da escala semanal do barbeiro
  const extractedScheduleBreaks = [];
  if (rawBreaks.length === 0 && Array.isArray(barber.schedule)) {
    barber.schedule.forEach((daySchedule) => {
      if (daySchedule?.breakStart && daySchedule?.breakEnd && daySchedule?.active !== false) {
        extractedScheduleBreaks.push({
          startTime: daySchedule.breakStart,
          endTime: daySchedule.breakEnd,
          label: "Intervalo de Almoço",
        });
      }
    });
  }

  const finalBreaksList = rawBreaks.length > 0 ? rawBreaks : extractedScheduleBreaks;

  const actualBreaks = (Array.isArray(finalBreaksList) ? finalBreaksList : []).filter(
    (b) =>
      b &&
      typeof b === "object" &&
      (b.startTime || b.start_time || b.breakStart) &&
      (b.endTime || b.end_time || b.breakEnd)
  );

  const totalHours = endHour - startHour;
  const totalMinutes = totalHours * 60;
  const columnHeight = totalMinutes * minuteHeight;

  // FUNCAO CORRIGIDA COM SUPORTE A 24H E VALIDACAO:
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

  // 3. Algoritmo Inteligente de Detecção de Colisão e Distribuição Lado a Lado
  // Impede que cards no mesmo horário ou próximos fiquem apinhados/sobrepostos
  const cardLayouts = useMemo(() => {
    if (!Array.isArray(appointments) || appointments.length === 0) return [];

    const items = appointments.map((appt) => {
      const startTime = appt.startTime || appt.start_time;
      const startMins = timeToMinutesFromStart(startTime);
      const duration = Math.max(25, Number(appt.durationMinutes || appt.duration_minutes || 30));
      const endMins = startMins + duration;
      return {
        appt,
        startMins,
        endMins,
        duration,
      };
    });

    // Ordena cronologicamente
    items.sort((a, b) => a.startMins - b.startMins || b.duration - a.duration);

    // Agrupa em clusters de colisão mútua
    const clusters = [];
    let currentCluster = [];
    let clusterEnd = -1;

    for (const item of items) {
      if (currentCluster.length === 0) {
        currentCluster.push(item);
        clusterEnd = item.endMins;
      } else {
        if (item.startMins < clusterEnd) {
          currentCluster.push(item);
          clusterEnd = Math.max(clusterEnd, item.endMins);
        } else {
          clusters.push(currentCluster);
          currentCluster = [item];
          clusterEnd = item.endMins;
        }
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    const results = [];

    for (const cluster of clusters) {
      if (cluster.length === 1) {
        const item = cluster[0];
        results.push({
          appt: item.appt,
          startMins: item.startMins,
          duration: item.duration,
          widthPercent: 100,
          leftPercent: 0,
          colIndex: 0,
          totalCols: 1,
        });
        continue;
      }

      // Distribui colunas paralelas no cluster
      const columns = [];
      const assignments = [];

      for (const item of cluster) {
        let placedCol = -1;
        for (let i = 0; i < columns.length; i++) {
          if (columns[i] <= item.startMins) {
            placedCol = i;
            columns[i] = item.endMins;
            break;
          }
        }
        if (placedCol === -1) {
          placedCol = columns.length;
          columns.push(item.endMins);
        }
        assignments.push({ item, colIndex: placedCol });
      }

      const totalCols = columns.length;
      for (const assign of assignments) {
        const colWidth = 100 / totalCols;
        results.push({
          appt: assign.item.appt,
          startMins: assign.item.startMins,
          duration: assign.item.duration,
          widthPercent: colWidth,
          leftPercent: assign.colIndex * colWidth,
          colIndex: assign.colIndex,
          totalCols,
        });
      }
    }

    return results;
  }, [appointments, minuteHeight, startHour]);

  // Manipulação de Drop (Soltar Card)
  const handleDragOver = (e, time) => {
    if (isPastDate || (isSlotPast && isSlotPast(time))) return;
    e.preventDefault(); // Permite o drop no navegador
    e.dataTransfer.dropEffect = "move";
    if (activeDropTime !== time) {
      setActiveDropTime(time);
    }
  };

  const handleDrop = (e, targetTime) => {
    e.preventDefault();
    setActiveDropTime(null);
    if (isPastDate || (isSlotPast && isSlotPast(targetTime))) {
      if (onSlotClick) {
        onSlotClick(barber.id, targetTime);
      }
      return;
    }

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

  if (!barber) return null;

  const fullAppointmentsList = Array.isArray(allBarberAppointments)
    ? allBarberAppointments
    : appointments;
  const totalBarberCuts = fullAppointmentsList.length;

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
        <button
          type="button"
          onClick={() =>
            onOpenBarberAppointments &&
            onOpenBarberAppointments(barber, fullAppointmentsList)
          }
          title={`Ver os ${totalBarberCuts} agendamento(s) de ${barber.name} e ir para a data`}
          aria-label={`Ver ${totalBarberCuts} cortes agendados de ${barber.name}`}
          className="group text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 hover:text-amber-300 border border-amber-500/25 hover:border-amber-400/70 transition-all duration-150 cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 shadow-xs"
        >
          <Calendar className="w-3 h-3 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
          <span>{totalBarberCuts} cortes</span>
        </button>
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

          const isFirstHalfPast = isPastDate || (isSlotPast ? isSlotPast(hourFormatted) : false);
          const isSecondHalfPast = isPastDate || (isSlotPast ? isSlotPast(halfHourFormatted) : false);

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
                title={isFirstHalfPast ? `Horário anterior ao atual (${hourFormatted})` : `Disponível (${hourFormatted})`}
                className={`
                  ${timelineColumnStyles.hourSlot}
                  ${isFirstHalfPast ? "opacity-60 bg-neutral-950/50 hover:bg-neutral-900/60" : ""}
                  ${isFirstHalfActive ? "bg-amber-500/25 border-dashed border-amber-500 ring-1 ring-amber-500/50" : ""}
                `}
              >
                <span className={isFirstHalfPast ? "text-neutral-600 line-through-subtle" : ""}>{hourFormatted}</span>
              </div>

              {/* Slot :30 */}
              <div
                style={{ height: `${slotHeight / 2}px` }}
                onClick={() =>
                  onSlotClick && onSlotClick(barber.id, halfHourFormatted)
                }
                onDragOver={(e) => handleDragOver(e, halfHourFormatted)}
                onDrop={(e) => handleDrop(e, halfHourFormatted)}
                title={isSecondHalfPast ? `Horário anterior ao atual (${halfHourFormatted})` : `Disponível (${halfHourFormatted})`}
                className={`
                  ${timelineColumnStyles.halfHourSlot}
                  ${isSecondHalfPast ? "opacity-60 bg-neutral-950/50 hover:bg-neutral-900/60" : ""}
                  ${isSecondHalfActive ? "bg-amber-500/25 border-dashed border-amber-500 ring-1 ring-amber-500/50" : ""}
                `}
              />
            </div>
          );
        })}

        {/* 3. Pausas e Intervalos Reais daquele Barbeiro */}
        {actualBreaks.map((pause, idx) => {
          const startTime = pause.startTime || pause.start_time || pause.breakStart;
          const endTime = pause.endTime || pause.end_time || pause.breakEnd;
          const label = pause.label || "Intervalo";

          const startMins = timeToMinutesFromStart(startTime);
          const endMins = timeToMinutesFromStart(endTime);
          const top = startMins * minuteHeight;
          const height = Math.max(12, (endMins - startMins) * minuteHeight);

          return (
            <div
              key={`break-${idx}`}
              style={{ top: `${top}px`, height: `${height}px` }}
              className={timelineColumnStyles.breakBlock}
            >
              <div className={timelineColumnStyles.breakText}>
                <Coffee className="w-3.5 h-3.5 text-amber-400 shrink-0 inline mr-1" />
                <span>
                  {label} ({startTime} - {endTime})
                </span>
              </div>
            </div>
          );
        })}

        {/* 4. Cards de Agendamento com Distribuição Anti-Colisão e Z-Index Isolado */}
        <div className={timelineColumnStyles.cardsLayer}>
          {cardLayouts.map((layout) => {
            const { appt, startMins, widthPercent, leftPercent, totalCols } = layout;
            const top = startMins * minuteHeight;
            const isMenuOpenThisCard = openMenuApptId === appt.id;

            // Se for card único, ocupa a largura padrão com folga
            // Se houver mais de um card sobreposto, divide a largura proporcionalmente lado a lado com respiro de 6px
            const cardPositionStyle =
              totalCols === 1
                ? {
                    top: `${top}px`,
                    left: "6px",
                    right: "6px",
                    width: "calc(100% - 12px)",
                    zIndex: isMenuOpenThisCard ? 100 : undefined,
                  }
                : {
                    top: `${top}px`,
                    left: `calc(${leftPercent}% + 3px)`,
                    width: `calc(${widthPercent}% - 6px)`,
                    zIndex: isMenuOpenThisCard ? 100 : undefined,
                  };

            return (
              <div
                key={appt.id}
                id={`appt-slot-${appt.id}`}
                style={cardPositionStyle}
                className={`
                  ${timelineColumnStyles.cardWrapper}
                  ${isMenuOpenThisCard ? "!z-[100] !overflow-visible ring-2 ring-amber-500/80 shadow-2xl" : ""}
                  ${highlightedAppointmentId === appt.id ? "!z-[90] ring-2 ring-amber-400 shadow-2xl shadow-amber-500/40 rounded-xl animate-pulse" : ""}
                `}
              >
                <AppointmentCard
                  appointment={appt}
                  minuteHeight={minuteHeight}
                  isCompact={totalCols > 1}
                  startMins={startMins}
                  isMenuOpenExternal={isMenuOpenThisCard}
                  onMenuToggle={(open) =>
                    setOpenMenuApptId(open ? appt.id : null)
                  }
                  onClick={() => onAppointmentClick && onAppointmentClick(appt)}
                  onStatusChange={(newStatus) =>
                    onStatusChange && onStatusChange(appt.id, newStatus)
                  }
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
