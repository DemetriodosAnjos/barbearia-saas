import { useState, useRef, useEffect } from "react";
import { bottomNavStyles } from "./BottomNavigation.styles";
import ProjectIcon from "./ProjectIcon";
import {
  Moon,
  Sun,
  User,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { applyThemeMode } from "../../utils/theme";
import { safeStorage } from "../../utils/safeStorage";

export default function BottomNavigation({
  items = [],
  activeItem,
  onChange,
  onNavigate,
  onLogout,
  fixed = true, // 'true' para fixar no rodapé da janela, 'false' para preview embutido
  className = "",
  style = {},
}) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = safeStorage.getItem("barbersaas_theme_mode");
      if (saved) return saved === "dark";
      if (typeof document !== "undefined") {
        return document.documentElement.classList.contains("dark");
      }
      return true;
    } catch {
      return true;
    }
  });

  const popoverRef = useRef(null);
  const moreButtonRef = useRef(null);

  // Fecha o popover ao clicar fora ou pressionar ESC
  useEffect(() => {
    if (!isMoreMenuOpen) return;

    const handleClickOutside = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(event.target)
      ) {
        setIsMoreMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreMenuOpen]);

  // Sincroniza o estado do tema com mudanças externas no DOM/storage
  useEffect(() => {
    const handleThemeChange = () => {
      const mode = safeStorage.getItem("barbersaas_theme_mode") || "dark";
      setIsDark(mode === "dark");
    };

    window.addEventListener("storage", handleThemeChange);
    return () => window.removeEventListener("storage", handleThemeChange);
  }, []);

  const toggleTheme = (e) => {
    if (e) e.stopPropagation();
    const nextDark = !isDark;
    setIsDark(nextDark);
    applyThemeMode(nextDark ? "dark" : "light");
    // Notifica outros ouvintes locais de troca de tema
    window.dispatchEvent(new Event("storage"));
  };

  const handleItemSelect = (screenId) => {
    setIsMoreMenuOpen(false);
    if (onNavigate) {
      onNavigate(screenId);
    } else if (onChange) {
      onChange(screenId);
    }
  };

  const handleLogoutClick = () => {
    setIsMoreMenuOpen(false);
    if (onLogout) {
      onLogout();
    } else if (onChange) {
      onChange("logout");
    }
  };

  const containerClass = fixed
    ? bottomNavStyles.containerFixed
    : bottomNavStyles.containerStatic;

  const renderIcon = (icon) => {
    if (!icon) return null;
    if (typeof icon === "string") {
      return <ProjectIcon name={icon} size={20} />;
    }
    return icon;
  };

  return (
    <>
      {/* Backdrop transparente para toque externo em mobile */}
      {isMoreMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[0.5px] md:hidden"
          onClick={() => setIsMoreMenuOpen(false)}
          aria-hidden="true"
          data-testid="bottom-nav-more-backdrop"
        />
      )}

      <nav
        className={`${containerClass} ${className} bottom-nav-dark-surface`}
        role="navigation"
        aria-label="Navegação inferior mobile"
        data-testid="bottom-navigation-bar"
        style={{
          backgroundColor: "#171717",
          borderTopLeftRadius: "1rem",
          borderTopRightRadius: "1rem",
          ...style,
        }}
      >
        <div className={bottomNavStyles.navGrid}>
          {items.map((item, idx) => {
            const isMoreTab =
              item.id === "mais" ||
              item.id === "perfil" ||
              item.label?.toLowerCase() === "mais";

            const isActive =
              item.isActive !== undefined ? item.isActive : activeItem === item.id;

            // Se for o botão central em destaque (ex: Novo Atendimento - coluna 3)
            if (item.isCenterAction) {
              return (
                <div
                  key={item.id || idx}
                  className="flex justify-center items-center w-full"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      if (item.onClick) item.onClick();
                      else if (onChange) onChange(item.id);
                    }}
                    className={bottomNavStyles.centerButtonWrapper}
                    aria-label={item.ariaLabel || item.title || item.label}
                    title={item.title || item.label}
                    data-nav-center="true"
                    data-testid="bottom-nav-cta-center"
                  >
                    <div className={bottomNavStyles.centerButton}>
                      {renderIcon(item.icon)}
                    </div>
                    <span className={bottomNavStyles.centerLabel}>
                      {item.label}
                    </span>
                  </button>
                </div>
              );
            }

            // Se for a aba "Mais", conecta ao menu Popover suspenso
            if (isMoreTab) {
              return (
                <div
                  key={item.id || idx}
                  className="flex justify-center items-center w-full relative"
                >
                  <button
                    ref={moreButtonRef}
                    type="button"
                    onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                    className={`
                      ${bottomNavStyles.tabButton}
                      ${isActive || isMoreMenuOpen ? bottomNavStyles.tabActive : bottomNavStyles.tabInactive}
                    `}
                    aria-expanded={isMoreMenuOpen}
                    aria-haspopup="true"
                    aria-current={isActive ? "page" : undefined}
                    aria-label={item.ariaLabel || item.title || item.label}
                    title={item.title || item.label}
                    data-nav-item={item.id}
                    data-testid={`bottom-nav-${item.id}`}
                  >
                    <div className={bottomNavStyles.iconWrapper}>
                      <div className="flex items-center justify-center">
                        {renderIcon(item.icon)}
                      </div>
                      {item.badge && (
                        <span className={bottomNavStyles.badge}>{item.badge}</span>
                      )}
                    </div>

                    <span
                      className={`
                        ${bottomNavStyles.label}
                        ${isActive || isMoreMenuOpen ? bottomNavStyles.labelActive : ""}
                      `}
                    >
                      {item.label}
                    </span>

                    {(isActive || isMoreMenuOpen) && (
                      <span className={bottomNavStyles.activeIndicator} />
                    )}
                  </button>

                  {/* Popover suspenso ancorado acima do botão Mais */}
                  {isMoreMenuOpen && (
                    <div
                      ref={popoverRef}
                      role="menu"
                      aria-label="Menu Mais opções"
                      data-testid="bottom-nav-more-popover"
                      className={bottomNavStyles.morePopover}
                      style={{ backgroundColor: "#171717" }}
                    >
                      {/* Ponta sutil (triângulo) indicando o botão Mais */}
                      <div
                        className={bottomNavStyles.morePopoverArrow}
                        style={{ backgroundColor: "#171717" }}
                        aria-hidden="true"
                      />

                      {/* 1. MODO DE EXIBIÇÃO (THEME TOGGLE SWITCH) */}
                      <div
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-neutral-800/60 transition-colors select-none"
                        data-testid="bottom-nav-theme-row"
                      >
                        <div className="flex items-center gap-2.5 text-xs font-semibold text-neutral-200">
                          {isDark ? (
                            <Moon className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Sun className="w-4 h-4 text-amber-500" />
                          )}
                          <span>Modo de Exibição</span>
                        </div>

                        {/* Chave seletora (toggle switch) com ícones de Lua e Sol */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isDark}
                          onClick={toggleTheme}
                          aria-label={`Alternar para modo ${isDark ? "claro" : "escuro"}`}
                          title={`Modo Atual: ${isDark ? "Escuro (Dark)" : "Claro (Light)"}`}
                          data-testid="bottom-nav-theme-toggle"
                          className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                            isDark ? "bg-amber-600" : "bg-neutral-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                              isDark
                                ? "translate-x-6 text-amber-600"
                                : "translate-x-0 text-neutral-800"
                            }`}
                          >
                            {isDark ? (
                              <Moon className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Sun className="w-3.5 h-3.5 fill-current" />
                            )}
                          </span>
                        </button>
                      </div>

                      {/* 2. MEU PERFIL */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleItemSelect("perfil")}
                        className={bottomNavStyles.moreItem}
                        data-testid="bottom-nav-item-perfil"
                      >
                        <User className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Meu Perfil</span>
                      </button>

                      {/* 3. CONFIGURAÇÕES DA BARBEARIA */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleItemSelect("configuracoes")}
                        className={bottomNavStyles.moreItem}
                        data-testid="bottom-nav-item-configuracoes"
                      >
                        <Settings className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Configurações da Barbearia</span>
                      </button>

                      {/* 4. SUPORTE & AJUDA */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleItemSelect("suporte")}
                        className={bottomNavStyles.moreItem}
                        data-testid="bottom-nav-item-suporte"
                      >
                        <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Suporte & Ajuda</span>
                      </button>

                      {/* LINHA SEPARADORA */}
                      <div className={bottomNavStyles.moreDivider} />

                      {/* 5. SAIR DA PLATAFORMA */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogoutClick}
                        className={bottomNavStyles.moreItemDanger}
                        data-testid="bottom-nav-item-logout"
                      >
                        <LogOut className="w-4 h-4 text-red-400 shrink-0" />
                        <span>Sair da Plataforma</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // Abas normais (2 à esquerda e 1 à direita no layout 2+1+2)
            return (
              <div
                key={item.id || idx}
                className="flex justify-center items-center w-full"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    if (item.onClick) item.onClick();
                    else if (onChange) onChange(item.id);
                  }}
                  className={`
                    ${bottomNavStyles.tabButton}
                    ${isActive ? bottomNavStyles.tabActive : bottomNavStyles.tabInactive}
                  `}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.ariaLabel || item.title || item.label}
                  title={item.title || item.label}
                  data-nav-item={item.id}
                  data-testid={`bottom-nav-${item.id}`}
                >
                  {/* Ícone com suporte a Badge de contador */}
                  <div className={bottomNavStyles.iconWrapper}>
                    <div className="flex items-center justify-center">
                      {renderIcon(item.icon)}
                    </div>
                    {item.badge && (
                      <span className={bottomNavStyles.badge}>{item.badge}</span>
                    )}
                  </div>

                  {/* Texto da Aba */}
                  <span
                    className={`
                      ${bottomNavStyles.label}
                      ${isActive ? bottomNavStyles.labelActive : ""}
                    `}
                  >
                    {item.label}
                  </span>

                  {/* Pontinho sutil indicando seleção ativa */}
                  {isActive && <span className={bottomNavStyles.activeIndicator} />}
                </button>
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
}
