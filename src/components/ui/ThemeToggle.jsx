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
        <ProjectIcon
          name="Moon"
          size={14}
          colorVariant={isDark ? "amber" : "neutral"}
        />
      </span>

      {/* Ícone do Sol (Modo Claro) */}
      <span
        className={`
          ${themeToggleStyles.iconBox}
          ${!isDark ? themeToggleStyles.iconActive : themeToggleStyles.iconInactive}
        `}
      >
        <ProjectIcon
          name="Sun"
          size={14}
          colorVariant={!isDark ? "amber" : "neutral"}
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
