import { useState, useEffect, useRef } from "react";
import Badge from "../ui/Badge";
import { appointmentCardStyles } from "./AppointmentCard.styles";

export default function AppointmentCard({
  appointment,
  minuteHeight = 2,
  onClick,
  onStatusChange,
  onOpenComanda,
  onCancel,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // 1. SEGURANÇA DEFENSIVA: Se não houver dados, não renderiza nada (evita tela branca)
  if (!appointment) return null;

  // 2. NORMALIZAÇÃO TOLERANTE: Aceita tanto camelCase quanto snake_case do Supabase
  const id = appointment.id;
  const clientName =
    appointment.clientName || appointment.client_name || "Cliente";
  const barberName = appointment.barberName || appointment.barber_name;
  const serviceName =
    appointment.serviceName || appointment.service_name || "Serviço";
  const startTime = appointment.startTime || appointment.start_time || "00:00";
  const endTime = appointment.endTime || appointment.end_time || "00:00";
  const durationMinutes = Number(
    appointment.durationMinutes || appointment.duration_minutes || 30,
  );
  const price = Number(appointment.price || 0);
  const status = appointment.status || "confirmed";
  const isPaid = Boolean(appointment.isPaid ?? appointment.is_paid);
  const isVip = Boolean(appointment.isVip ?? appointment.is_vip);
  const hasNotes = Boolean(appointment.hasNotes || appointment.notes?.trim());
  const isDelayed = Boolean(appointment.isDelayed);

  // 3. REGRAS VISUAIS E DE INTERAÇÃO
  const canDrag = status !== "completed" && status !== "cancelled";
  const cardHeight = Math.max(durationMinutes * minuteHeight, 65);

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
    appointmentCardStyles.variants[status] ||
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
        ${isDelayed ? appointmentCardStyles.delayedWarning : ""}
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
            {startTime} - {endTime}
          </span>
        </div>

        <Badge status={status} size="sm" showIcon={false} />
      </div>

      {/* CENTRO: Cliente + Barbeiro Responsável + Serviço */}
      <div className="flex-1 my-1">
        <h4 className={appointmentCardStyles.clientName}>
          {clientName}
          {isVip && (
            <span
              title="Cliente VIP Recorrente"
              className="text-amber-400 text-[10px]"
            >
              ★
            </span>
          )}
          {hasNotes && (
            <span
              title="Possui observações especiais"
              className="text-neutral-400 text-[10px]"
            >
              📝
            </span>
          )}
        </h4>

        {barberName && (
          <p className="text-[10px] text-amber-400 font-medium flex items-center gap-1 mt-0.5 truncate">
            <span>💈</span>
            <span>{barberName}</span>
          </p>
        )}

        <p className={appointmentCardStyles.serviceName}>{serviceName}</p>
      </div>

      {/* RODAPÉ: Preço/Pagamento e Ações */}
      <div
        className={appointmentCardStyles.footer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          {isPaid ? (
            <span className={appointmentCardStyles.paidBadge}>✓ PAGO</span>
          ) : (
            <span className={appointmentCardStyles.pendingBadge}>PENDENTE</span>
          )}
          <span className="text-[11px] font-bold font-mono text-neutral-200">
            R$ {price.toFixed(0)}
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
                  if (onOpenComanda) onOpenComanda(id);
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
                  if (onCancel) onCancel(id);
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
