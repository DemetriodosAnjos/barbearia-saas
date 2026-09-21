import { useState, useEffect } from "react";
import { themeToggleStyles } from "./ThemeToggle.styles";

export default function ThemeToggle({ showLabel = false, className = "" }) {
  // 1. Inicialização Preguiçosa (Lazy Initialization):
  // Executa apenas uma vez na montagem inicial, eliminando renderizações em cascata.
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("barbersaas_theme_mode");
    // Se houver preferência salva, respeita. Caso contrário, o padrão inicial é SEMPRE Dark (true).
    return saved ? saved === "dark" : true;
  });

  // 2. Efeito colateral puro: apenas sincroniza o DOM e o storage quando isDark mudar
  // (Sem nenhuma chamada a setState aqui dentro)
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("barbersaas_theme_mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("barbersaas_theme_mode", "light");
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
