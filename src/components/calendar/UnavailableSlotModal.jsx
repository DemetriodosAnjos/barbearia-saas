import { useEffect } from "react";
import { AlertTriangle, Clock, X } from "lucide-react";
import Button from "../ui/Button";

/**
 * Modal de Bloqueio com Overlay para Slots Passados na Agenda
 * Exibido quando o usuário tenta agendar em dia ou horário anterior ao atual.
 */
export default function UnavailableSlotModal({
  isOpen = false,
  onClose,
  onViewAvailable,
  selectedTime = "",
  selectedDate = null,
}) {
  // Fecha com ESC e bloqueia o scroll do body enquanto aberto
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formattedDate = selectedDate
    ? typeof selectedDate === "string"
      ? selectedDate
      : selectedDate.toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        })
    : "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unavailable-slot-modal-title"
      aria-describedby="unavailable-slot-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-neutral-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-center transform transition-all shadow-[0_0_50px_-12px_rgba(245,158,11,0.25)] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão de Fechar rápido no canto superior */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ÍCONE: Alert */}
        <div className="w-16 h-16 rounded-full bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center mx-auto mb-4 text-amber-500 shadow-lg shadow-amber-500/10">
          <AlertTriangle className="w-8 h-8 text-amber-400 stroke-[2.2]" />
        </div>

        {/* TITULO */}
        <h2
          id="unavailable-slot-modal-title"
          className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-2"
        >
          OPS! Horário indisponível para agendamento
        </h2>

        {/* SUBTITULO */}
        <p
          id="unavailable-slot-modal-desc"
          className="text-sm sm:text-base text-neutral-300 leading-relaxed mb-5 px-1"
        >
          Não é possível agendar em dias e horários anteriores ao dia e horário atual.
        </p>

        {/* Tag informativa opcional do horário clicado */}
        {(selectedTime || formattedDate) && (
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs text-amber-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              {selectedTime && `Horário: ${selectedTime}`}
              {selectedTime && formattedDate && " • "}
              {formattedDate && `Data: ${formattedDate}`}
            </span>
          </div>
        )}

        {/* BOTÕES */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-center items-stretch sm:items-center">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto font-medium px-5 py-2.5 rounded-xl border-neutral-700 hover:bg-neutral-800 text-neutral-200 cursor-pointer"
          >
            Fechar
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onViewAvailable}
            className="w-full sm:w-auto font-bold px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
          >
            Ver horários disponíveis
          </Button>
        </div>
      </div>
    </div>
  );
}
