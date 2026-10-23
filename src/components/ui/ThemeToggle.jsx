import { useState, useEffect } from "react";
import { themeToggleStyles } from "./ThemeToggle.styles";
import ProjectIcon from "./ProjectIcon";
import { safeStorage } from "../../utils/safeStorage";

export default function ThemeToggle({ showLabel = false, className = "" }) {
  // 1. Inicialização Preguiçosa (Lazy Initialization):
  // Executa apenas uma vez na montagem inicial com proteção de safeStorage e fallback padrão Dark (true).
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = safeStorage.getItem("barbersaas_theme_mode");
      return saved ? saved === "dark" : true;
    } catch {
      return true;
    }
  });

  // 2. Efeito colateral puro: apenas sincroniza o DOM e o storage seguro quando isDark mudar
  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.add("dark");
        safeStorage.setItem("barbersaas_theme_mode", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        safeStorage.setItem("barbersaas_theme_mode", "light");
      }
    } catch {
      // Ignora erro silenciosamente
    }
  }, [isDark]);

  // 3. Atualização funcional do estado
  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      data-theme-toggle="true"
      className={`${themeToggleStyles.button} theme-toggle-btn ${className}`}
      aria-label={`Alternar para modo ${isDark ? "claro" : "escuro"}`}
      title={`Modo Atual: ${isDark ? "Escuro (Dark)" : "Claro (Light)"}`}
    >
      {/* Ícone da Lua (Modo Escuro) */}
      <span
        className={`
          ${themeToggleStyles.iconBox}
          ${isDark ? "theme-toggle-active theme-toggle-moon-active bg-amber-600 dark:bg-amber-600 !bg-amber-600 text-white shadow-xs font-bold scale-105" : themeToggleStyles.iconInactive}
        `}
        data-theme-active={isDark ? "true" : undefined}
        data-theme-moon="true"
      >
        <ProjectIcon
          name="Moon"
          size={14}
          colorVariant={isDark ? "white" : "neutral"}
          className={`icon-moon ${isDark ? "!text-white text-white" : ""}`}
        />
      </span>

      {/* Ícone do Sol (Modo Claro) */}
      <span
        className={`
          ${themeToggleStyles.iconBox}
          ${!isDark ? "theme-toggle-active theme-toggle-sun-active bg-[#059669] text-white shadow-xs font-bold scale-105" : themeToggleStyles.iconInactive}
        `}
        data-theme-active={!isDark ? "true" : undefined}
        data-theme-sun="true"
      >
        <ProjectIcon
          name="Sun"
          size={14}
          colorVariant={!isDark ? "white" : "neutral"}
          className={`icon-sun ${!isDark ? "!text-white text-white" : ""}`}
        />
      </span>

      {showLabel && (
        <span className={themeToggleStyles.label}>
          {isDark ? "Escuro" : "Claro"}
        </span>
      )}
    </button>
  );
}
