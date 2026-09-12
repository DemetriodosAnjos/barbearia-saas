import { iconButtonStyles } from "./IconButton.styles";

export default function IconButton({
  direction, // 'prev' (voltar) | 'next' (avançar)
  children,
  onClick,
  variant = "outline", // ghost | outline | solid
  size = "md", // sm | md | lg
  disabled = false,
  ariaLabel,
  className = "",
  ...props
}) {
  // Define o rótulo acessível automático caso não seja fornecido
  const label =
    ariaLabel ||
    (direction === "prev"
      ? "Voltar"
      : direction === "next"
        ? "Avançar"
        : "Ação");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`
        ${iconButtonStyles.base}
        ${iconButtonStyles.variants[variant] || iconButtonStyles.variants.outline}
        ${iconButtonStyles.sizes[size] || iconButtonStyles.sizes.md}
        ${className}
      `}
      {...props}
    >
      {/* Seta para a Esquerda (Voltar) */}
      {direction === "prev" && (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      )}

      {/* Seta para a Direita (Avançar) */}
      {direction === "next" && (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}

      {/* Permite renderizar outro ícone personalizado caso não use direction */}
      {!direction && children}
    </button>
  );
}
