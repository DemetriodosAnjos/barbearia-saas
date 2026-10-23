import { toggleStyles } from "./Toggle.styles";

export default function Toggle({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  id,
}) {
  const toggleId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`${toggleStyles.container} ${disabled ? toggleStyles.containerDisabled : ""}`}
    >
      {/* Textos: Rótulo e Descrição */}
      {(label || description) && (
        <div className={toggleStyles.textWrapper}>
          {label && (
            <label htmlFor={toggleId} className={toggleStyles.label}>
              {label}
            </label>
          )}
          {description && (
            <p className={toggleStyles.description}>{description}</p>
          )}
        </div>
      )}

      {/* Botão de Chave Acessível */}
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`
          ${toggleStyles.track}
          ${checked ? toggleStyles.trackChecked : toggleStyles.trackUnchecked}
        `}
      >
        <span
          className={`
            ${toggleStyles.thumb}
            ${checked ? toggleStyles.thumbChecked : toggleStyles.thumbUnchecked}
          `}
        />
      </button>
    </div>
  );
}
