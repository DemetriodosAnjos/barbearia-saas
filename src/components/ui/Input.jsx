import { useRef } from "react";
import { inputStyles } from "./Input.styles";
import { masks } from "../../utils/masks";
import ProjectIcon from "./ProjectIcon";

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
  rightIcon,
  ...props
}) {
  const internalInputRef = useRef(null);
  const inputId =
    id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

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

  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;
  const ariaDescribedBy = [error ? errorId : null, helperText ? helperId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={inputStyles.container}>
      {label && (
        <label htmlFor={inputId} className={inputStyles.label}>
          {label}
        </label>
      )}

      <div className="relative w-full flex items-center">
        <input
          ref={internalInputRef}
          id={inputId}
          type={type}
          disabled={disabled}
          value={value}
          onChange={handleChange}
          onClick={(e) => {
            if (type === "date" && typeof e.currentTarget.showPicker === "function") {
              try {
                e.currentTarget.showPicker();
              } catch {
                // ignore
              }
            }
            if (props.onClick) props.onClick(e);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={ariaDescribedBy}
          className={`${inputStyles.baseInput} ${borderStatus} ${rightIcon ? "pr-10" : ""} ${className}`}
          {...props}
        />

        {rightIcon && (
          <div
            onClick={() => {
              if (internalInputRef.current) {
                if (typeof internalInputRef.current.showPicker === "function") {
                  try {
                    internalInputRef.current.showPicker();
                  } catch {
                    internalInputRef.current.focus();
                  }
                } else {
                  internalInputRef.current.focus();
                }
              }
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer text-white z-10"
          >
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className={inputStyles.errorMessage}
        >
          <ProjectIcon name="AlertTriangle" size={13} colorVariant="danger" />
          <span>{error}</span>
        </p>
      )}

      {!error && helperText && (
        <p id={helperId} className={inputStyles.helperText}>
          {helperText}
        </p>
      )}
    </div>
  );
}
