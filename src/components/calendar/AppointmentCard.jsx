import { useState, useRef, useEffect } from "react";
import { appointmentCardStyles } from "./AppointmentCard.styles";
import Badge from "../ui/Badge";

export default function AppointmentCard({
  appointment = {
    id: "1",
    clientName: "Carlos Eduardo",
    barberName: "Carlos Silva",
    serviceName: "Corte Degradê + Barboterapia",
    startTime: "14:00",
    endTime: "15:00",
    durationMinutes: 60,
    status: "confirmed",
    isPaid: false,
    isDelayed: false,
    isVip: true,
    hasNotes: true,
  },
  minuteHeight = 2,
  onClick,
  onStatusChange,
  onOpenComanda,
  onCancel,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const canDrag =
    appointment.status !== "completed" && appointment.status !== "cancelled";
  const cardHeight = Math.max(appointment.durationMinutes * minuteHeight, 65);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const variantStyle =
    appointmentCardStyles.variants[appointment.status] ||
    appointmentCardStyles.variants.confirmed;

  const handleDragStart = (e) => {
    if (!canDrag) return;
    e.dataTransfer.setData("application/json", JSON.stringify(appointment));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      onClick={onClick}
      draggable={canDrag}
      onDragStart={handleDragStart}
      style={{ minHeight: `${cardHeight}px` }}
      className={`
        ${appointmentCardStyles.container}
        ${variantStyle}
        ${appointment.isDelayed ? appointmentCardStyles.delayedWarning : ""}
        ${canDrag ? "cursor-grab active:cursor-grabbing hover:scale-[1.01]" : "cursor-default"}
      `}
      title={
        canDrag
          ? "Clique para ver detalhes/editar ou arraste para reagendar"
          : undefined
      }
    >
      {/* TOPO: Horário + Ícone de Arraste + Badge */}
      <div className={appointmentCardStyles.header}>
        <div className="flex items-center gap-1.5">
          {canDrag && (
            <span
              className="text-neutral-500 hover:text-neutral-300 select-none text-xs"
              title="Arrastar para reagendar"
            >
              ⠿
            </span>
          )}
          <span className={appointmentCardStyles.timeText}>
            {appointment.startTime} - {appointment.endTime}
          </span>
        </div>

        <Badge status={appointment.status} size="sm" showIcon={false} />
      </div>

      {/* CENTRO: Cliente + Barbeiro Responsável + Serviço */}
      <div className="flex-1 my-1">
        <h4 className={appointmentCardStyles.clientName}>
          {appointment.clientName}
          {appointment.isVip && (
            <span
              title="Cliente VIP Recorrente"
              className="text-amber-400 text-[10px]"
            >
              ★
            </span>
          )}
          {appointment.hasNotes && (
            <span
              title="Possui observações especiais"
              className="text-neutral-400 text-[10px]"
            >
              📝
            </span>
          )}
        </h4>

        {/* 👇 NOVO: EXIBIÇÃO DO PROFISSIONAL RESPONSÁVEL NO PRÓPRIO CARD */}
        {appointment.barberName && (
          <p className="text-[10px] text-amber-400 font-medium flex items-center gap-1 mt-0.5 truncate">
            <span>💈</span>
            <span>{appointment.barberName}</span>
          </p>
        )}

        <p className={appointmentCardStyles.serviceName}>
          {appointment.serviceName}
        </p>
      </div>

      {/* RODAPÉ: Preço/Pagamento e Ações */}
      <div
        className={appointmentCardStyles.footer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          {appointment.isPaid ? (
            <span className={appointmentCardStyles.paidBadge}>✓ PAGO</span>
          ) : (
            <span className={appointmentCardStyles.pendingBadge}>PENDENTE</span>
          )}
          <span className="text-[11px] font-bold font-mono text-neutral-200">
            R$ {Number(appointment.price || 0).toFixed(0)}
          </span>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={appointmentCardStyles.moreButton}
            aria-label="Ações do agendamento"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 5v.01M12 12v.01M12 19v.01"
              />
            </svg>
          </button>

          {isMenuOpen && (
            <div className={appointmentCardStyles.menuDropdown} role="menu">
              <button
                type="button"
                onClick={() => {
                  if (onStatusChange) onStatusChange("in_progress");
                  setIsMenuOpen(false);
                }}
                className={appointmentCardStyles.menuItem}
              >
                <span>✂️</span>
                <span>Iniciar Atendimento</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenComanda) onOpenComanda(appointment.id);
                  setIsMenuOpen(false);
                }}
                className={appointmentCardStyles.menuItem}
              >
                <span>🧾</span>
                <span>Abrir Comanda / Caixa</span>
              </button>

              <div className="my-1 border-t border-neutral-800" />

              <button
                type="button"
                onClick={() => {
                  if (onCancel) onCancel(appointment.id);
                  setIsMenuOpen(false);
                }}
                className={`${appointmentCardStyles.menuItem} text-red-400 hover:text-red-300`}
              >
                <span>✕</span>
                <span>Cancelar Agendamento</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
