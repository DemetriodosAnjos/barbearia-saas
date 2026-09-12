import { selectStyles } from "./Select.styles";

export default function Select({
  label,
  id,
  options = [], // Array de objetos: [{ value, label, disabled }]
  children, // Permite passar tags <option> manuais se preferir
  error,
  helperText,
  disabled = false,
  className = "",
  placeholder = "Selecione uma opção...",
  value,
  onChange,
  ...props
}) {
  const selectId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const borderStatus = error
    ? selectStyles.status.error
    : selectStyles.status.default;

  return (
    <div className={selectStyles.container}>
      {/* Label Acessível */}
      {label && (
        <label htmlFor={selectId} className={selectStyles.label}>
          {label}
        </label>
      )}

      {/* Caixa de Seleção com Seta Embutida */}
      <div className={selectStyles.wrapper}>
        <select
          id={selectId}
          disabled={disabled}
          value={value}
          onChange={onChange}
          className={`${selectStyles.baseSelect} ${borderStatus} ${className}`}
          {...props}
        >
          {/* Opção placeholder padrão desabilitada */}
          {placeholder && (
            <option
              value=""
              disabled
              className="bg-neutral-900 text-neutral-500"
            >
              {placeholder}
            </option>
          )}

          {/* Renderiza as opções passadas via prop 'options' */}
          {options.length > 0
            ? options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className="bg-neutral-900 text-neutral-100 py-1"
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        {/* Ícone de Seta (Chevron Down) */}
        <div className={selectStyles.arrowIcon}>
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
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <p className={selectStyles.errorMessage}>
          <span>⚠️</span> {error}
        </p>
      )}

      {/* Texto de Apoio */}
      {!error && helperText && (
        <p className={selectStyles.helperText}>{helperText}</p>
      )}
    </div>
  );
}
