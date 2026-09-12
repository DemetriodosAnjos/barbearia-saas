import { useState, useRef, useEffect } from "react";
import { badgeStyles } from "./Badge.styles";

// 1. Matriz de Transições Permitidas (Regra de Negócio)
export const STATUS_TRANSITIONS = {
  waiting: ["confirmed", "cancelled", "no_show"],
  confirmed: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  completed: [], // Estado Terminal
  cancelled: [], // Estado Terminal
  no_show: [], // Estado Terminal
};

// 2. Metadados de cada Status
export const STATUS_CONFIG = {
  waiting: { label: "Aguardando", icon: "⏰" },
  confirmed: { label: "Confirmado", icon: "✓" },
  in_progress: { label: "Em Atendimento", icon: "✂️" },
  completed: { label: "Concluído", icon: "✔" },
  cancelled: { label: "Cancelado", icon: "✕" },
  no_show: { label: "Falta (No-Show)", icon: "🚫" },
};

export default function Badge({
  status = "waiting", // 'waiting' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  label, // Sobrescrita de texto opcional
  variant = "subtle", // 'subtle' | 'solid' | 'outline'
  size = "md", // 'sm' | 'md' | 'lg'
  showIcon = true,
  isDelayed = false, // Exibe ponto vermelho pulsante de atraso
  isInteractive = false, // Permite clicar para alterar o status
  onStatusChange,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.waiting;
  const currentText = label || config.label;
  const allowedNextStatuses = STATUS_TRANSITIONS[status] || [];
  const canInteract = isInteractive && allowedNextStatuses.length > 0;

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const variantStyles = badgeStyles[variant] || badgeStyles.subtle;
  const colorStyle = variantStyles[status] || variantStyles.waiting;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        disabled={!canInteract}
        onClick={() => canInteract && setIsOpen((prev) => !prev)}
        aria-haspopup={canInteract ? "true" : undefined}
        aria-expanded={isOpen}
        className={`
          ${badgeStyles.base}
          ${badgeStyles.sizes[size] || badgeStyles.sizes.md}
          ${colorStyle}
          ${canInteract ? badgeStyles.interactive : "cursor-default"}
          ${className}
        `}
      >
        {/* Ponto pulsante de atraso */}
        {isDelayed && <span className={badgeStyles.delayDot} />}

        {/* Ícone */}
        {showIcon && (
          <span className="text-xs leading-none">{config.icon}</span>
        )}

        {/* Texto */}
        <span>{currentText}</span>

        {/* Setinha sutil indicando que pode clicar para mudar */}
        {canInteract && (
          <svg
            className="w-3 h-3 opacity-60 ml-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      {/* Dropdown de Transição Rápida de Status */}
      {isOpen && canInteract && (
        <div className={badgeStyles.dropdownMenu} role="menu">
          <div className="px-3 py-1.5 border-b border-neutral-800 text-[10px] uppercase font-bold text-neutral-500">
            Avançar Status Para:
          </div>

          {allowedNextStatuses.map((nextStatus) => {
            const nextConfig = STATUS_CONFIG[nextStatus];
            return (
              <button
                key={nextStatus}
                type="button"
                role="menuitem"
                onClick={() => {
                  if (onStatusChange) onStatusChange(nextStatus);
                  setIsOpen(false);
                }}
                className={badgeStyles.dropdownItem}
              >
                <span>{nextConfig.icon}</span>
                <span>{nextConfig.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
