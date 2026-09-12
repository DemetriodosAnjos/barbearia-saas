import { useState, useRef, useEffect } from "react";
import { appointmentCardStyles } from "./AppointmentCard.styles";
import Badge from "../ui/Badge";

export default function AppointmentCard({
  appointment = {
    id: "1",
    clientName: "Carlos Eduardo",
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
  minuteHeight = 2, // 1 minuto = 2px (logo 30 min = 60px, 60 min = 120px)
  onClick,
  onStatusChange,
  onOpenComanda,
  onCancel,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Calcula a altura física em pixels proporcional à duração em minutos
  const cardHeight = Math.max(appointment.durationMinutes * minuteHeight, 60);

  // Fecha menu de ações ao clicar fora
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

  return (
    <div
      onClick={onClick}
      style={{ minHeight: `${cardHeight}px` }}
      className={`
        ${appointmentCardStyles.container}
        ${variantStyle}
        ${appointment.isDelayed ? appointmentCardStyles.delayedWarning : ""}
      `}
    >
      {/* 1. TOPO: Horário de início/fim e Selo de Status */}
      <div className={appointmentCardStyles.header}>
        <span className={appointmentCardStyles.timeText}>
          {appointment.startTime} - {appointment.endTime}
        </span>
        <Badge status={appointment.status} size="sm" showIcon={false} />
      </div>

      {/* 2. CENTRO: Nome do Cliente e Serviço Solicitado */}
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
        <p className={appointmentCardStyles.serviceName}>
          {appointment.serviceName}
        </p>
      </div>

      {/* 3. RODAPÉ: Indicador de Pagamento e Menu de Ações Rápidas */}
      <div
        className={appointmentCardStyles.footer}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status financeiro da comanda */}
        {appointment.isPaid ? (
          <span className={appointmentCardStyles.paidBadge}>✓ PAGO</span>
        ) : (
          <span className={appointmentCardStyles.pendingBadge}>PENDENTE</span>
        )}

        {/* Botão de 3 Pontinhos para Ações Rápidas */}
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

          {/* Menu Contextual Flutuante */}
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
