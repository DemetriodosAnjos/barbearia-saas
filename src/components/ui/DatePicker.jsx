import { useState } from "react";
import { datePickerStyles } from "./DatePicker.styles";
import IconButton from "./IconButton";

export default function DatePicker({
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  availableTimes = [],
}) {
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const [viewMode, setViewMode] = useState("month"); // 'month' ou 'week'

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Lista dos 12 meses
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  // Gera os últimos 5 anos + o próximo ano (Ex: 2022 até 2027)
  const systemCurrentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => systemCurrentYear - 4 + i);

  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // --- LÓGICA DE VISÃO MENSAL ---
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // --- LÓGICA DE VISÃO SEMANAL (Calcula os 7 dias da semana atual) ---
  const getWeekDays = () => {
    const startOfWeek = new Date(viewDate);
    const dayIndex = startOfWeek.getDay(); // 0 = Domingo
    startOfWeek.setDate(startOfWeek.getDate() - dayIndex);

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  };

  const weekDaysList = getWeekDays();

  // Helpers de comparação de data
  const isSameDay = (d1, d2) =>
    d1 &&
    d2 &&
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const isToday = (date) => isSameDay(date, new Date());

  const isPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // --- NAVEGAÇÃO (< e >) ---
  const handlePrev = () => {
    const newDate = new Date(viewDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7); // Volta 7 dias
    }
    setViewDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(viewDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7); // Avança 7 dias
    }
    setViewDate(newDate);
  };

  // Mudança rápida via Select
  const handleMonthChange = (e) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(Number(e.target.value));
    setViewDate(newDate);
  };

  const handleYearChange = (e) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(Number(e.target.value));
    setViewDate(newDate);
  };

  return (
    <div className={datePickerStyles.container}>
      {/* 1. BARRA SUPERIOR: Seletores Rápidos de Mês/Ano + Alternador Mês/Semana */}
      <div className={datePickerStyles.topToolbar}>
        {/* Dropdowns de Mês e Ano */}
        <div className={datePickerStyles.selectorsWrapper}>
          <select
            value={currentMonth}
            onChange={handleMonthChange}
            className={datePickerStyles.inlineSelect}
            aria-label="Selecionar Mês"
          >
            {months.map((name, index) => (
              <option
                key={index}
                value={index}
                className="bg-neutral-900 text-white"
              >
                {name}
              </option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={handleYearChange}
            className={datePickerStyles.inlineSelect}
            aria-label="Selecionar Ano"
          >
            {years.map((year) => (
              <option
                key={year}
                value={year}
                className="bg-neutral-900 text-white"
              >
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Alternador de Visão: [ Mês | Semana ] */}
        <div className={datePickerStyles.viewToggleWrapper}>
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`
              ${datePickerStyles.viewToggleButton}
              ${viewMode === "month" ? datePickerStyles.viewToggleActive : datePickerStyles.viewToggleInactive}
            `}
          >
            Mês
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`
              ${datePickerStyles.viewToggleButton}
              ${viewMode === "week" ? datePickerStyles.viewToggleActive : datePickerStyles.viewToggleInactive}
            `}
          >
            Semana
          </button>
        </div>

        {/* Setas de navegação (< e >) */}
        <div className="flex items-center gap-1">
          <IconButton
            direction="prev"
            size="sm"
            variant="ghost"
            onClick={handlePrev}
            ariaLabel={
              viewMode === "month" ? "Mês anterior" : "Semana anterior"
            }
          />
          <IconButton
            direction="next"
            size="sm"
            variant="ghost"
            onClick={handleNext}
            ariaLabel={viewMode === "month" ? "Próximo mês" : "Próxima semana"}
          />
        </div>
      </div>

      {/* Rótulo descritivo na visão semanal (ex: Semana de 01/03 a 07/03) */}
      {viewMode === "week" && (
        <span className={datePickerStyles.periodLabel}>
          Semana:{" "}
          {weekDaysList[0].toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })}{" "}
          até{" "}
          {weekDaysList[6].toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })}
        </span>
      )}

      {/* 2. RÓTULOS DOS DIAS DA SEMANA (DOM, SEG, TER...) */}
      <div className={datePickerStyles.weekdaysGrid}>
        {weekdays.map((w, index) => (
          <div key={index} className={datePickerStyles.weekdayLabel}>
            {w}
          </div>
        ))}
      </div>

      {/* 3. GRADE DE DIAS (Visão MENSAL ou Visão SEMANAL) */}
      <div className={datePickerStyles.daysGrid}>
        {viewMode === "month" ? (
          <>
            {/* Espaços vazios do início do mês */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Dias do mês completo */}
            {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map(
              (day) => {
                const dayDate = new Date(currentYear, currentMonth, day);
                const past = isPast(dayDate);
                const active = isSameDay(selectedDate, dayDate);
                const today = isToday(dayDate);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => onSelectDate && onSelectDate(dayDate)}
                    className={`
                    ${datePickerStyles.dayButton}
                    ${active ? datePickerStyles.daySelected : today ? datePickerStyles.dayToday : past ? datePickerStyles.dayPast : datePickerStyles.dayDefault}
                  `}
                  >
                    {day}
                  </button>
                );
              },
            )}
          </>
        ) : (
          /* Visão SEMANAL: Exibe apenas os 7 dias da semana atual */
          weekDaysList.map((dayDate) => {
            const past = isPast(dayDate);
            const active = isSameDay(selectedDate, dayDate);
            const today = isToday(dayDate);

            return (
              <button
                key={dayDate.toISOString()}
                type="button"
                onClick={() => onSelectDate && onSelectDate(dayDate)}
                className={`
                  ${datePickerStyles.dayButton}
                  ${active ? datePickerStyles.daySelected : today ? datePickerStyles.dayToday : past ? datePickerStyles.dayPast : datePickerStyles.dayDefault}
                `}
              >
                <span>{dayDate.getDate()}</span>
              </button>
            );
          })
        )}
      </div>

      {/* 4. SEÇÃO DE HORÁRIOS DISPONÍVEIS */}
      {selectedDate && (
        <div className={datePickerStyles.timeSection}>
          <div className={datePickerStyles.timeTitle}>
            <span>
              {isPast(selectedDate)
                ? "Histórico do Dia (Apenas Consulta)"
                : "Horários Disponíveis"}
            </span>
            <span className="text-amber-500 font-bold">
              {selectedDate.toLocaleDateString("pt-BR")}
            </span>
          </div>

          {/* Se a data for passada, exibe aviso sutil de consulta histórica */}
          {isPast(selectedDate) ? (
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-400">
              📅 Esta data já passou. Modo de{" "}
              <strong>consulta de agendamentos passados</strong> ativado.
            </div>
          ) : (
            <div className={datePickerStyles.timeGrid}>
              {availableTimes.map((slot) => {
                const isTimeSelected = selectedTime === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => onSelectTime && onSelectTime(slot.time)}
                    className={`
                      ${datePickerStyles.timeButton}
                      ${isTimeSelected ? datePickerStyles.timeSelected : slot.available ? datePickerStyles.timeDefault : datePickerStyles.timeUnavailable}
                    `}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
