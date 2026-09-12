import { inputStyles } from "./Input.styles";
import { masks } from "../../utils/masks";

export default function Input({
  label,
  id,
  type = "text",
  error,
  helperText,
  disabled = false,
  className = "",
  mask, // 'phone' | 'cpf' | 'currency'
  value,
  onChange,
  ...props
}) {
  const inputId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const borderStatus = error
    ? inputStyles.status.error
    : inputStyles.status.default;

  // Intercepta a digitação e aplica a formatação da máscara em tempo real
  const handleChange = (e) => {
    if (!onChange) return;

    if (mask && masks[mask]) {
      const formatted = masks[mask](e.target.value);
      e.target.value = formatted;
      onChange(e);
    } else {
      onChange(e);
    }
  };

  return (
    <div className={inputStyles.container}>
      {label && (
        <label htmlFor={inputId} className={inputStyles.label}>
          {label}
        </label>
      )}

      <input
        id={inputId}
        type={type}
        disabled={disabled}
        value={value}
        onChange={handleChange}
        className={`${inputStyles.baseInput} ${borderStatus} ${className}`}
        {...props}
      />

      {error && (
        <p className={inputStyles.errorMessage}>
          <span>⚠️</span> {error}
        </p>
      )}

      {!error && helperText && (
        <p className={inputStyles.helperText}>{helperText}</p>
      )}
    </div>
  );
}
