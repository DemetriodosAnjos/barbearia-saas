import { alertStyles } from "./Alert.styles";

// Ícones SVG minimalistas para cada situação
const icons = {
  info: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  success: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  warning: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  error: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

export default function Alert({
  variant = "info", // info | success | warning | error
  title,
  children,
  onClose,
  className = "",
}) {
  const currentVariant =
    alertStyles.variants[variant] || alertStyles.variants.info;

  return (
    <div
      role="alert"
      className={`${alertStyles.container} ${currentVariant.wrapper} ${className}`}
    >
      {/* Ícone */}
      <div className={`${alertStyles.iconWrapper} ${currentVariant.icon}`}>
        {icons[variant]}
      </div>

      {/* Conteúdo */}
      <div className={alertStyles.content}>
        {title && (
          <h4 className={`${alertStyles.title} ${currentVariant.title}`}>
            {title}
          </h4>
        )}
        <div className={alertStyles.message}>{children}</div>
      </div>

      {/* Botão de Fechar opcional */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={alertStyles.closeButton}
          aria-label="Fechar aviso"
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
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
