import { useState } from "react";
import { workShiftStyles } from "./WorkShiftSelector.styles";
import Button from "../ui/Button";

export default function WorkShiftSelector({
  schedule = [],
  onChange,
  className = "",
}) {
  // Estados para o Preenchimento Rápido em Lote
  const [applyWeekdays, setApplyWeekdays] = useState(true); // Seg a Sex
  const [applySaturday, setApplySaturday] = useState(true); // Sábado
  const [applySunday, setApplySunday] = useState(false); // Domingo

  // Horários do modelo padrão do lote
  const [batchStart, setBatchStart] = useState("09:00");
  const [batchEnd, setBatchEnd] = useState("19:00");
  const [batchBreakStart, setBatchBreakStart] = useState("12:00");
  const [batchBreakEnd, setBatchBreakEnd] = useState("13:00");

  // 1. Alterna o estado de um dia individual (Trabalha / Folga)
  const handleToggleDay = (dayIndex) => {
    const updated = [...schedule];
    updated[dayIndex].active = !updated[dayIndex].active;
    if (onChange) onChange(updated);
  };

  // 2. Atualiza um campo de horário de um dia individual
  const handleTimeChange = (dayIndex, field, value) => {
    const updated = [...schedule];
    updated[dayIndex][field] = value;
    if (onChange) onChange(updated);
  };

  // 3. REGRA DE NEGÓCIO: Aplica os horários em lote nos grupos marcados
  const handleApplyBatchSchedule = () => {
    const weekdayIds = ["seg", "ter", "qua", "qui", "sex"];

    const updated = schedule.map((item) => {
      const isWeekday = weekdayIds.includes(item.dayId);
      const isSat = item.dayId === "sab";
      const isSun = item.dayId === "dom";

      // Verifica se este dia deve receber o horário configurado
      const shouldApply =
        (isWeekday && applyWeekdays) ||
        (isSat && applySaturday) ||
        (isSun && applySunday);

      if (shouldApply) {
        return {
          ...item,
          active: true, // Ativa o dia automaticamente
          start: batchStart,
          end: batchEnd,
          breakStart: batchBreakStart,
          breakEnd: batchBreakEnd,
        };
      }

      return item;
    });

    if (onChange) onChange(updated);

    alert(
      `✅ HORÁRIOS APLICADOS COM SUCESSO!\n\n` +
        `• Expediente: ${batchStart} às ${batchEnd}\n` +
        `• Almoço: ${batchBreakStart} às ${batchBreakEnd}\n\n` +
        `Aplicado para: ${applyWeekdays ? "Dias Úteis (Seg-Sex) " : ""}${applySaturday ? "Sábado " : ""}${applySunday ? "Domingo" : ""}`,
    );
  };

  // 4. Cálculo da Carga Horária Líquida Semanal
  const calculateTotalWeeklyHours = () => {
    let totalMinutes = 0;

    schedule.forEach((day) => {
      if (!day.active || !day.start || !day.end) return;

      const [startH, startM] = day.start.split(":").map(Number);
      const [endH, endM] = day.end.split(":").map(Number);
      let dayMins = endH * 60 + endM - (startH * 60 + startM);

      if (day.breakStart && day.breakEnd) {
        const [bStartH, bStartM] = day.breakStart.split(":").map(Number);
        const [bEndH, bEndM] = day.breakEnd.split(":").map(Number);
        const breakMins = bEndH * 60 + bEndM - (bStartH * 60 + bStartM);
        if (breakMins > 0) dayMins -= breakMins;
      }

      if (dayMins > 0) totalMinutes += dayMins;
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  };

  return (
    <div className={`${workShiftStyles.container} ${className}`}>
      {/* 1. CABEÇALHO DA ESCALA */}
      <div className={workShiftStyles.header}>
        <div className={workShiftStyles.titleWrapper}>
          <h3 className={workShiftStyles.title}>
            <span>⏰</span>
            <span>Escala Semanal & Horários de Atendimento</span>
          </h3>
          <p className={workShiftStyles.subtitle}>
            Defina o expediente, dias de folga e intervalos de almoço da equipe.
          </p>
        </div>

        <div className={workShiftStyles.weeklyHoursBadge}>
          <span>💼</span>
          <span>Carga Total: {calculateTotalWeeklyHours()} semanais</span>
        </div>
      </div>

      {/* 2. CARD DE PREENCHIMENTO RÁPIDO EM LOTE (NOVO!) */}
      <div className={workShiftStyles.bulkCard}>
        <div className={workShiftStyles.bulkHeader}>
          <div>
            <h4 className={workShiftStyles.bulkTitle}>
              <span>⚡</span> Preencher Horários em Lote (1 Clique)
            </h4>
            <p className={workShiftStyles.bulkSubtitle}>
              Configure uma única vez e replique para os grupos selecionados
              abaixo:
            </p>
          </div>

          {/* Checkboxes de Seleção dos Grupos de Dias */}
          <div className={workShiftStyles.targetCheckboxGroup}>
            <label className={workShiftStyles.checkboxItem}>
              <input
                type="checkbox"
                checked={applyWeekdays}
                onChange={(e) => setApplyWeekdays(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
              />
              <span>Dias Úteis (Seg a Sex)</span>
            </label>

            <label className={workShiftStyles.checkboxItem}>
              <input
                type="checkbox"
                checked={applySaturday}
                onChange={(e) => setApplySaturday(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
              />
              <span>Sábado</span>
            </label>

            <label className={workShiftStyles.checkboxItem}>
              <input
                type="checkbox"
                checked={applySunday}
                onChange={(e) => setApplySunday(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
              />
              <span>Domingo</span>
            </label>
          </div>
        </div>

        {/* Inputs de Horário do Lote + Botão Aplicar */}
        <div className={workShiftStyles.bulkInputsRow}>
          <div className={workShiftStyles.bulkInputsGroup}>
            {/* Expediente do Lote */}
            <div className={workShiftStyles.timeField}>
              <span className={workShiftStyles.fieldLabel}>Expediente:</span>
              <input
                type="time"
                value={batchStart}
                onChange={(e) => setBatchStart(e.target.value)}
                className={workShiftStyles.timeInput}
              />
              <span>às</span>
              <input
                type="time"
                value={batchEnd}
                onChange={(e) => setBatchEnd(e.target.value)}
                className={workShiftStyles.timeInput}
              />
            </div>

            <div className={workShiftStyles.breakDivider} />

            {/* Intervalo do Lote */}
            <div className={workShiftStyles.timeField}>
              <span className={workShiftStyles.fieldLabel}>☕ Almoço:</span>
              <input
                type="time"
                value={batchBreakStart}
                onChange={(e) => setBatchBreakStart(e.target.value)}
                className={workShiftStyles.timeInput}
              />
              <span>às</span>
              <input
                type="time"
                value={batchBreakEnd}
                onChange={(e) => setBatchBreakEnd(e.target.value)}
                className={workShiftStyles.timeInput}
              />
            </div>
          </div>

          {/* Botão de Disparo */}
          <Button
            variant="primary"
            onClick={handleApplyBatchSchedule}
            disabled={!applyWeekdays && !applySaturday && !applySunday}
            className="w-full sm:w-auto text-xs py-2 px-4 shadow-md"
          >
            Aplicar aos Dias Marcados
          </Button>
        </div>
      </div>

      {/* 3. LISTA INDIVIDUAL DOS 7 DIAS (COM AJUSTES FINOS) */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
          Ajustes Individuais por Dia da Semana:
        </span>

        <div className={workShiftStyles.daysList}>
          {schedule.map((day, idx) => (
            <div
              key={day.dayId}
              className={`
                ${workShiftStyles.dayRow}
                ${day.active ? workShiftStyles.dayRowActive : workShiftStyles.dayRowOff}
              `}
            >
              {/* Coluna do Dia + Checkbox de Ativação */}
              <div className={workShiftStyles.dayIdentity}>
                <input
                  type="checkbox"
                  id={`day-toggle-${day.dayId}`}
                  checked={day.active}
                  onChange={() => handleToggleDay(idx)}
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                />
                <label
                  htmlFor={`day-toggle-${day.dayId}`}
                  className={`${workShiftStyles.dayName} cursor-pointer`}
                >
                  {day.label}
                </label>

                {!day.active && (
                  <span className={workShiftStyles.dayOffBadge}>Folga</span>
                )}
              </div>

              {/* Inputs de Horário Individuais */}
              {day.active ? (
                <div className={workShiftStyles.timeInputsGroup}>
                  {/* Expediente */}
                  <div className={workShiftStyles.timeField}>
                    <span className={workShiftStyles.fieldLabel}>
                      Expediente:
                    </span>
                    <input
                      type="time"
                      value={day.start}
                      onChange={(e) =>
                        handleTimeChange(idx, "start", e.target.value)
                      }
                      className={workShiftStyles.timeInput}
                    />
                    <span>às</span>
                    <input
                      type="time"
                      value={day.end}
                      onChange={(e) =>
                        handleTimeChange(idx, "end", e.target.value)
                      }
                      className={workShiftStyles.timeInput}
                    />
                  </div>

                  <div className={workShiftStyles.breakDivider} />

                  {/* Almoço */}
                  <div className={workShiftStyles.timeField}>
                    <span className={workShiftStyles.fieldLabel}>
                      ☕ Almoço:
                    </span>
                    <input
                      type="time"
                      value={day.breakStart}
                      onChange={(e) =>
                        handleTimeChange(idx, "breakStart", e.target.value)
                      }
                      className={workShiftStyles.timeInput}
                    />
                    <span>às</span>
                    <input
                      type="time"
                      value={day.breakEnd}
                      onChange={(e) =>
                        handleTimeChange(idx, "breakEnd", e.target.value)
                      }
                      className={workShiftStyles.timeInput}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-neutral-500 italic">
                  Dia de folga (nenhum agendamento permitido).
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
