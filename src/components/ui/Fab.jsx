import { fabStyles } from "./Fab.styles";

export default function Fab({
  label, // Se passar texto, vira um FAB Estendido (ícone + texto)
  icon,
  onClick,
  variant = "primary",
  ariaLabel,
  className = "",
}) {
  const type = label ? "extended" : "circular";
  const currentVariant =
    fabStyles.variants[variant] || fabStyles.variants.primary;
  const currentType = fabStyles.types[type];

  // Ícone padrão de "Mais (+)" caso nenhum outro seja passado
  const defaultIcon = (
    <svg
      className={fabStyles.icon}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || label || "Ação rápida flutuante"}
      className={`
        ${fabStyles.base}
        ${currentVariant}
        ${currentType}
        ${className}
      `}
    >
      {icon || defaultIcon}
      {label && <span>{label}</span>}
    </button>
  );
}
