import { checkboxStyles } from "./CheckBox.styles";

export default function CheckBox({
  id,
  name,
  value,
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
}) {
  const checkboxId =
    id ||
    (name && value
      ? `chk-${name}-${value}`
      : `chk-${label?.toLowerCase().replace(/\s+/g, "-")}`);

  const handleChange = (e) => {
    if (!disabled && onChange) {
      onChange(e.target.checked);
    }
  };

  return (
    <label
      htmlFor={checkboxId}
      className={`
        ${checkboxStyles.container}
        ${checked ? checkboxStyles.containerChecked : checkboxStyles.containerDefault}
        ${disabled ? checkboxStyles.containerDisabled : ""}
      `}
    >
      {/* Input nativo acessível escondido visualmente */}
      <input
        type="checkbox"
        id={checkboxId}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
      />

      {/* Caixa quadrada personalizada */}
      <div
        className={`
          ${checkboxStyles.box}
          ${checked ? checkboxStyles.boxChecked : checkboxStyles.boxDefault}
        `}
      >
        {checked && (
          <svg className={checkboxStyles.icon} fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      {/* Rótulo e Descrição */}
      <div className={checkboxStyles.textWrapper}>
        <span
          className={`
            ${checkboxStyles.label}
            ${checked ? checkboxStyles.labelChecked : ""}
          `}
        >
          {label}
        </span>
        {description && (
          <p className={checkboxStyles.description}>{description}</p>
        )}
      </div>
    </label>
  );
}
