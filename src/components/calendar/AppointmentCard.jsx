import { useState, useEffect, useRef } from "react";
import { Scissors, Receipt, FileText, Star, X, Sparkles, CreditCard, Check, MoreVertical } from "lucide-react";
import Badge from "../ui/Badge";
import { appointmentCardStyles } from "./AppointmentCard.styles";

export default function AppointmentCard({
  appointment,
  minuteHeight = 2,
  isCompact = false,
  startMins = 0,
  onClick,
  onStatusChange,
  onOpenComanda,
  onPayMercadoPago,
  onCancel,
  onMenuToggle,
  isMenuOpenExternal,
}) {
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const isMenuOpen = isMenuOpenExternal !== undefined ? isMenuOpenExternal : internalMenuOpen;

  const menuRef = useRef(null);

  const toggleMenu = (open) => {
    setInternalMenuOpen(open);
    if (onMenuToggle) {
      onMenuToggle(open);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        toggleMenu(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // 1. SEGURANÇA DEFENSIVA: Se não houver dados, não renderiza nada
  if (!appointment) return null;

  // 2. NORMALIZAÇÃO TOLERANTE
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

  // Determina se o menu abre para baixo (se topo da agenda) ou para cima
  const openDownwards = startMins < 140;

  // Status dot micro-indicador para modo compacto
  const statusConfig = {
    waiting: { dot: "bg-amber-400", label: "Aguardando" },
    confirmed: { dot: "bg-sky-400", label: "Confirmado" },
    in_progress: { dot: "bg-purple-400 animate-pulse", label: "Em Cadeira" },
    completed: { dot: "bg-emerald-400", label: "Concluído" },
    cancelled: { dot: "bg-neutral-500", label: "Cancelado" },
    no_show: { dot: "bg-rose-500", label: "Faltou" },
  };
  const activeStatusMeta = statusConfig[status] || statusConfig.confirmed;

  // 3. REGRAS VISUAIS E DE INTERAÇÃO
  const canDrag = status !== "completed" && status !== "cancelled";
  const cardHeight = Math.max(durationMinutes * minuteHeight, 68);

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
        ${isCompact ? "!p-2 text-[11px] hover:z-40 hover:scale-[1.02]" : ""}
        ${isMenuOpen ? "!overflow-visible !z-[100] ring-2 ring-amber-500/80 shadow-2xl" : "overflow-hidden hover:z-30"}
      `}
      title={`${clientName} (${startTime} - ${endTime}) - ${serviceName} - R$ ${price.toFixed(2)} [${isPaid ? "PAGO" : "PENDENTE"}]`}
    >
      {/* TOPO: Horário + Indicador de Status */}
      <div className={appointmentCardStyles.header}>
        <div className="flex items-center gap-1 min-w-0">
          {canDrag && !isCompact && (
            <span
              className="text-neutral-500 hover:text-neutral-300 select-none text-xs shrink-0"
              title="Arrastar para reagendar"
            >
              ⠿
            </span>
          )}
          <span className={appointmentCardStyles.timeText}>
            {isCompact ? startTime : `${startTime} - ${endTime}`}
          </span>
        </div>

        {isCompact ? (
          <span
            className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-900/90 border border-neutral-700/80 text-neutral-300 shrink-0"
            title={`Status: ${activeStatusMeta.label}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeStatusMeta.dot}`} />
            <span className="hidden sm:inline">{activeStatusMeta.label}</span>
          </span>
        ) : (
          <Badge status={status} size="sm" showIcon={false} />
        )}
      </div>

      {/* CENTRO: Cliente + Barbeiro Responsável + Serviço */}
      <div className="flex-1 my-0.5 min-w-0">
        <h4 className={appointmentCardStyles.clientName}>
          <span className="truncate">{clientName}</span>
          {isVip && (
            <span
              title="Cliente VIP Recorrente"
              className="text-amber-400 inline-flex items-center ml-0.5 shrink-0"
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </span>
          )}
          {hasNotes && !isCompact && (
            <span
              title="Possui observações especiais"
              className="text-amber-400/80 inline-flex items-center ml-0.5 shrink-0"
            >
              <FileText className="w-3 h-3 text-amber-400" />
            </span>
          )}
        </h4>

        {barberName && !isCompact && (
          <p className="text-[10px] text-amber-400 font-medium flex items-center gap-1 mt-0.5 truncate">
            <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
            <span className="truncate">{barberName}</span>
          </p>
        )}

        <p className={appointmentCardStyles.serviceName}>{serviceName}</p>
      </div>

      {/* RODAPÉ: Preço/Pagamento e Menu de 3 Pontos (Dots) com Z-Index Garantido */}
      <div
        className={appointmentCardStyles.footer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 min-w-0">
          {isPaid ? (
            <span className={appointmentCardStyles.paidBadge}>✓ PAGO</span>
          ) : (
            <span className={appointmentCardStyles.pendingBadge}>PENDENTE</span>
          )}
          <span className="text-[11px] font-bold font-mono text-neutral-200 shrink-0">
            R$ {price.toFixed(0)}
          </span>
        </div>

        {/* CONTÊINER DO MENU DE 3 PONTOS (DOTS) */}
        <div className="relative shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMenu(!isMenuOpen);
            }}
            className={`${appointmentCardStyles.moreButton} ${isMenuOpen ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500" : ""}`}
            aria-label="Ações e opções do agendamento"
            title="Mais opções do atendimento"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {/* DROPDOWN FLUTUANTE COM Z-INDEX 100 E POSICIONAMENTO INTELIGENTE */}
          {isMenuOpen && (
            <div
              className={`
                ${appointmentCardStyles.menuDropdown}
                ${openDownwards ? appointmentCardStyles.menuDropdownBottom : appointmentCardStyles.menuDropdownTop}
              `}
              role="menu"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1 border-b border-neutral-800 text-[10px] text-neutral-400 font-mono truncate">
                #{id} • {clientName}
              </div>

              {(status === "waiting" || status === "confirmed") && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onStatusChange) onStatusChange("in_progress");
                    toggleMenu(false);
                  }}
                  className={appointmentCardStyles.menuItem}
                >
                  <Scissors className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Iniciar Atendimento</span>
                </button>
              )}

              {status === "in_progress" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onStatusChange) onStatusChange("completed");
                    toggleMenu(false);
                  }}
                  className={appointmentCardStyles.menuItem}
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Concluir Atendimento</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenComanda) onOpenComanda(id);
                  toggleMenu(false);
                }}
                className={appointmentCardStyles.menuItem}
              >
                <Receipt className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Abrir Comanda / Caixa</span>
              </button>

              {!isPaid && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onPayMercadoPago) {
                      onPayMercadoPago(appointment);
                    } else if (onClick) {
                      onClick();
                    }
                    toggleMenu(false);
                  }}
                  className={`${appointmentCardStyles.menuItem} text-sky-400 hover:text-sky-300`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Pagar via Mercado Pago</span>
                </button>
              )}

              <div className="my-1 border-t border-neutral-800" />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onCancel) onCancel(id);
                  toggleMenu(false);
                }}
                className={`${appointmentCardStyles.menuItem} text-rose-400 hover:text-rose-300`}
              >
                <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Cancelar Horário</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
