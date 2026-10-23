import { searchInputStyles } from "./SearchInput.styles";

export default function SearchInput({
  value = "",
  onChange,
  onClear,
  placeholder = "Buscar cliente, telefone ou serviço...",
  isLoading = false,
  shortcut = "Ctrl K",
  disabled = false,
  className = "",
  ...props
}) {
  const hasValue = value && value.length > 0;

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      // Se não passar onClear customizado, envia evento com string vazia
      onChange({ target: { value: "" } });
    }
  };

  return (
    <div className={`${searchInputStyles.container} ${className}`}>
      {/* Ícone de Lupa */}
      <div className={searchInputStyles.searchIcon}>
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Input de Busca */}
      <input
        type="text"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={searchInputStyles.input}
        {...props}
      />

      {/* Ações no Canto Direito (Spinner, Limpar ou Atalho) */}
      <div className={searchInputStyles.actionsWrapper}>
        {isLoading && (
          <svg
            className={searchInputStyles.spinner}
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}

        {/* Botão de Limpar (só aparece se o usuário digitou algo) */}
        {!isLoading && hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className={searchInputStyles.clearButton}
            aria-label="Limpar busca"
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

        {/* Atalho de Teclado (some quando o usuário digita para não poluir) */}
        {!hasValue && shortcut && (
          <kbd className={searchInputStyles.shortcutBadge}>{shortcut}</kbd>
        )}
      </div>
    </div>
  );
}
