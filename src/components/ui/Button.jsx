import { buttonStyles } from "./Button.styles";

export default function Button({
  children,
  type = "button",
  variant = "primary",
  isLoading = false,
  disabled = false,
  className = "",
  onClick,
  ...props
}) {
  const currentVariant =
    buttonStyles.variants[variant] || buttonStyles.variants.primary;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${buttonStyles.base} ${currentVariant} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className={buttonStyles.spinner}
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
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          <span>Carregando...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
