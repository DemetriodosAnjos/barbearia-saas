import { radioStyles } from "./RadioButton.styles";

export default function RadioButton({
  id,
  name,
  value,
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
}) {
  const radioId = id || `radio-${name}-${value}`;

  return (
    <label
      htmlFor={radioId}
      className={`
        ${radioStyles.container}
        ${checked ? radioStyles.containerSelected : radioStyles.containerDefault}
        ${disabled ? radioStyles.containerDisabled : ""}
      `}
    >
      {/* Input nativo acessível escondido visualmente */}
      <input
        type="radio"
        id={radioId}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="sr-only"
      />

      {/* Círculo visual estilizado */}
      <div
        className={`
          ${radioStyles.circleOuter}
          ${checked ? radioStyles.circleOuterSelected : radioStyles.circleOuterDefault}
        `}
      >
        {checked && <span className={radioStyles.circleInner} />}
      </div>

      {/* Conteúdo textual */}
      <div className={radioStyles.textWrapper}>
        <span
          className={`
            ${radioStyles.label}
            ${checked ? radioStyles.labelSelected : ""}
          `}
        >
          {label}
        </span>
        {description && (
          <p className={radioStyles.description}>{description}</p>
        )}
      </div>
    </label>
  );
}
