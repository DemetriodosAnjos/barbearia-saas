import { useState } from "react";
import { workShiftStyles } from "./WorkShiftSelector.styles";
import Button from "../ui/Button";

// [Estrutura padrão dos 7 dias da semana caso a barbearia/barbeiro ainda não tenha escala no banco]
const DEFAULT_WEEKLY_SCHEDULE = [
  {
    dayId: "seg",
    label: "Segunda-feira",
    active: true,
    start: "09:00",
    end: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    dayId: "ter",
    label: "Terça-feira",
    active: true,
    start: "09:00",
    end: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    dayId: "qua",
    label: "Quarta-feira",
    active: true,
    start: "09:00",
    end: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    dayId: "qui",
    label: "Quinta-feira",
    active: true,
    start: "09:00",
    end: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    dayId: "sex",
    label: "Sexta-feira",
    active: true,
    start: "09:00",
    end: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    dayId: "sab",
    label: "Sábado",
    active: true,
    start: "09:00",
    end: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    dayId: "dom",
    label: "Domingo",
    active: false,
    start: "09:00",
    end: "14:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  },
];

export default function WorkShiftSelector({
  schedule = [],
  onChange,
  className = "",
}) {
  // [Garante que a lista sempre possua os 7 dias disponíveis para configuração]
  const currentSchedule =
    schedule && schedule.length === 7 ? schedule : DEFAULT_WEEKLY_SCHEDULE;

  // Estados para o Preenchimento Rápido em Lote
  const [applyWeekdays, setApplyWeekdays] = useState(true); // Seg a Sex
  const [applySaturday, setApplySaturday] = useState(true); // Sábado
  const [applySunday, setApplySunday] = useState(false); // Domingo
  const [batchFeedbackMessage, setBatchFeedbackMessage] = useState("");

  // Horários do modelo padrão do lote
  const [batchStart, setBatchStart] = useState("09:00");
  const [batchEnd, setBatchEnd] = useState("19:00");
  const [batchBreakStart, setBatchBreakStart] = useState("12:00");
  const [batchBreakEnd, setBatchBreakEnd] = useState("13:00");

  // [Função: atualiza o estado de folga/trabalho com clonagem imutável do objeto]
  const handleToggleDay = (dayIndex) => {
    const updated = currentSchedule.map((day, idx) =>
      idx === dayIndex ? { ...day, active: !day.active } : day,
    );
    if (onChange) onChange(updated);
  };

  // [Função: atualiza campos de horário de forma imutável]
  const handleTimeChange = (dayIndex, field, value) => {
    const updated = currentSchedule.map((day, idx) =>
      idx === dayIndex ? { ...day, [field]: value } : day,
    );
    if (onChange) onChange(updated);
  };

  // [Função: aplica horários em lote sem alert() invasivo e com feedback visual nativo]
  const handleApplyBatchSchedule = () => {
    const weekdayIds = ["seg", "ter", "qua", "qui", "sex"];

    const updated = currentSchedule.map((item) => {
      const dayKey = item.dayId || item.day_id;
      const isWeekday = weekdayIds.includes(dayKey);
      const isSat = dayKey === "sab";
      const isSun = dayKey === "dom";

      const shouldApply =
        (isWeekday && applyWeekdays) ||
        (isSat && applySaturday) ||
        (isSun && applySunday);

      if (shouldApply) {
        return {
          ...item,
          active: true,
          start: batchStart,
          end: batchEnd,
          breakStart: batchBreakStart,
          breakEnd: batchBreakEnd,
        };
      }

      return item;
    });

    if (onChange) onChange(updated);

    // [Feedback amigável temporário na própria tela em vez de alert do navegador]
    setBatchFeedbackMessage("Horários replicados com sucesso!");
    setTimeout(() => setBatchFeedbackMessage(""), 4000);
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
          {/* [Aviso visual sutil de sucesso ao aplicar lote] */}
          {batchFeedbackMessage && (
            <div className="mx-4 mt-2 p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs font-bold text-center animate-fade-in">
              ✓ {batchFeedbackMessage}
            </div>
          )}

          {/* Inputs de Horário do Lote + Botão Aplicar */}
          <div className={workShiftStyles.bulkInputsRow}></div>
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
          {/* [Iteração sobre a escala semanal garantida de 7 dias] */}
          {currentSchedule.map((day, idx) => (
            <div
              key={day.dayId || day.day_id || idx}
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
