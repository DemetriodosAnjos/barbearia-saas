import { useState, useEffect } from "react";
import { themeToggleStyles } from "./ThemeToggle.styles";

export default function ThemeToggle({ showLabel = false, className = "" }) {
  const [isDark, setIsDark] = useState(true);

  // Lê o estado real do HTML ao montar
  useEffect(() => {
    const saved = localStorage.getItem("barbersaas_theme_mode") || "dark";
    const active = saved === "dark";
    setIsDark(active);

    if (active) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextMode = !isDark;
    setIsDark(nextMode);

    if (nextMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("barbersaas_theme_mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("barbersaas_theme_mode", "light");
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${themeToggleStyles.button} ${className}`}
      aria-label={`Alternar para modo ${isDark ? "claro" : "escuro"}`}
      title={`Modo Atual: ${isDark ? "Escuro (Dark)" : "Claro (Light)"}`}
    >
      {/* Ícone da Lua (Modo Escuro) */}
      <span
        className={`
          ${themeToggleStyles.iconBox}
          ${isDark ? themeToggleStyles.iconActive : themeToggleStyles.iconInactive}
        `}
      >
        🌙
      </span>

      {/* Ícone do Sol (Modo Claro) */}
      <span
        className={`
          ${themeToggleStyles.iconBox}
          ${!isDark ? themeToggleStyles.iconActive : themeToggleStyles.iconInactive}
        `}
      >
        ☀️
      </span>

      {showLabel && (
        <span className={themeToggleStyles.label}>
          {isDark ? "Escuro" : "Claro"}
        </span>
      )}
    </button>
  );
}
