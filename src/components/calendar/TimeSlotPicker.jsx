import { timeSlotPickerStyles } from "./TimeSlotPicker.styles";

export default function TimeSlotPicker({
  slots = [],
  selectedTime,
  onSelectTime,
  onAvailableClick, // Disparado ao clicar em horário livre
  onOccupiedClick, // Disparado ao clicar em horário ocupado/reservado
  totalDurationMinutes = 45,
  bufferMinutes = 10,
  className = "",
}) {
  const periods = {
    morning: { label: "Manhã", icon: "🌅", slots: [] },
    afternoon: { label: "Tarde", icon: "☀️", slots: [] },
    evening: { label: "Noite", icon: "🌙", slots: [] },
  };

  slots.forEach((slot) => {
    const hour = parseInt(slot.time.split(":")[0], 10);
    if (hour < 12) {
      periods.morning.slots.push(slot);
    } else if (hour < 18) {
      periods.afternoon.slots.push(slot);
    } else {
      periods.evening.slots.push(slot);
    }
  });

  const calculateEndTime = (startTime) => {
    if (!startTime) return null;
    const [h, m] = startTime.split(":").map(Number);
    const totalMins = h * 60 + m + totalDurationMinutes;
    const endH = Math.floor(totalMins / 60);
    const endM = totalMins % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const estimatedEndTime = calculateEndTime(selectedTime);

  // Inteligência de Roteamento de Clique
  const handleSlotClick = (slot) => {
    if (slot.status === "available") {
      if (onSelectTime) onSelectTime(slot.time);
      if (onAvailableClick) onAvailableClick(slot);
    } else {
      // Horário Ocupado ou Reservado
      if (onOccupiedClick) onOccupiedClick(slot);
    }
  };

  return (
    <div className={`${timeSlotPickerStyles.container} ${className}`}>
      {/* Barra de Resumo */}
      <div className={timeSlotPickerStyles.summaryBar}>
        <div className={timeSlotPickerStyles.durationTag}>
          <span>⏱️</span>
          <span>
            Duração total dos serviços:{" "}
            <strong className="text-white font-bold">
              {totalDurationMinutes} min
            </strong>
          </span>
        </div>

        {bufferMinutes > 0 && (
          <div className={timeSlotPickerStyles.bufferTag}>
            + {bufferMinutes} min de higienização
          </div>
        )}

        {selectedTime && (
          <div className="w-full sm:w-auto text-amber-400 font-bold border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-800">
            Horário Selecionado: {selectedTime} às {estimatedEndTime}h
          </div>
        )}
      </div>

      {/* Grade por Turnos */}
      {Object.entries(periods).map(([key, period]) => {
        if (period.slots.length === 0) return null;

        return (
          <div key={key} className={timeSlotPickerStyles.periodSection}>
            <div className={timeSlotPickerStyles.periodHeader}>
              <span>{period.icon}</span>
              <span>{period.label}</span>
              <span className="text-[10px] text-neutral-500 font-normal lowercase">
                ({period.slots.filter((s) => s.status === "available").length}{" "}
                livres)
              </span>
            </div>

            <div className={timeSlotPickerStyles.slotsGrid}>
              {period.slots.map((slot) => {
                const isSelected =
                  selectedTime === slot.time && slot.status === "available";
                const stateStyle = isSelected
                  ? timeSlotPickerStyles.states.selected
                  : timeSlotPickerStyles.states[slot.status] ||
                    timeSlotPickerStyles.states.available;

                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => handleSlotClick(slot)}
                    className={`${timeSlotPickerStyles.slotButton} ${stateStyle}`}
                    title={
                      slot.status === "available"
                        ? `Clique para agendar às ${slot.time}`
                        : `Clique para ver os dados do agendamento das ${slot.time}`
                    }
                  >
                    <span>{slot.time}</span>

                    {slot.status === "held" && (
                      <span className={timeSlotPickerStyles.subLabel}>
                        Reservado
                      </span>
                    )}
                    {slot.status === "occupied" && (
                      <span className={timeSlotPickerStyles.subLabel}>
                        Ocupado 👤
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
