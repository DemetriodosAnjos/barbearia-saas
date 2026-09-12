import { useState, useRef, useEffect } from "react";
import { splitButtonStyles } from "./SplitButton.styles";

export default function SplitButton({
  children,
  onClick,
  options = [], // Array de objetos: [{ label, icon, onClick, disabled }]
  variant = "primary",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha o menu se o usuário clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentVariant =
    splitButtonStyles.variants[variant] || splitButtonStyles.variants.primary;

  return (
    <div className={splitButtonStyles.container} ref={dropdownRef}>
      {/* Botão Principal (Ação Padrão) */}
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`${splitButtonStyles.mainButton} ${currentVariant.main}`}
      >
        {children}
      </button>

      {/* Botão com Seta (Disparador do Dropdown) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`${splitButtonStyles.triggerButton} ${currentVariant.trigger}`}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
      </button>

      {/* Menu Suspenso de Ações */}
      {isOpen && (
        <div className={splitButtonStyles.menu} role="menu">
          {options.map((option, index) => (
            <button
              key={index}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                if (option.onClick) option.onClick();
                setIsOpen(false);
              }}
              className={`
                ${splitButtonStyles.menuItem}
                ${option.disabled ? splitButtonStyles.menuItemDisabled : ""}
              `}
              role="menuitem"
            >
              {option.icon && <span>{option.icon}</span>}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
