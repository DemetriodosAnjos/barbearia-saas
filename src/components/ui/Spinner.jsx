import { spinnerStyles } from "./Spinner.styles";

export default function Spinner({
  size = "md", // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color = "primary", // 'primary' | 'white' | 'neutral' | 'success'
  overlay = false, // Se 'true', cria uma camada escura que bloqueia o container pai
  label = "Processando requisição...",
  className = "",
}) {
  const sizeClass = spinnerStyles.sizes[size] || spinnerStyles.sizes.md;
  const colorClass =
    spinnerStyles.colors[color] || spinnerStyles.colors.primary;

  const spinnerSvg = (
    <svg
      role="status"
      aria-label={label}
      className={`animate-spin ${sizeClass} ${colorClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        className="opacity-80"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );

  // Se for overlay blocante
  if (overlay) {
    return (
      <div
        className={spinnerStyles.overlay}
        aria-busy="true"
        aria-live="polite"
      >
        {spinnerSvg}
        {label && <span className={spinnerStyles.overlayText}>{label}</span>}
      </div>
    );
  }

  // Spinner inline normal
  return (
    <div className="inline-flex items-center justify-center" aria-busy="true">
      {spinnerSvg}
      <span className="sr-only">{label}</span>
    </div>
  );
}
