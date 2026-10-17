import { useState, useRef, useEffect } from "react";
import { bottomNavStyles } from "./BottomNavigation.styles";
import ProjectIcon from "./ProjectIcon";
import ThemeToggle from "./ThemeToggle";

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
      return (
        <ProjectIcon
          name={icon}
          size={20}
          className="text-amber-500 dark:text-amber-400"
          colorVariant="amber"
        />
      );
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
                    <div className={`${bottomNavStyles.iconWrapper} text-amber-500 dark:text-amber-400`}>
                      <div className="flex items-center justify-center text-amber-500 dark:text-amber-400">
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

                  {/* Popover suspenso ancorado acima do botão Mais com padrão da Navbar */}
                  {isMoreMenuOpen && (
                    <div
                      ref={popoverRef}
                      role="menu"
                      aria-label="Menu Mais opções"
                      data-testid="bottom-nav-more-popover"
                      className={`${bottomNavStyles.morePopover} avatar-dropdown-menu`}
                    >
                      {/* Ponta sutil (triângulo) indicando o botão Mais */}
                      <div
                        className={bottomNavStyles.morePopoverArrow}
                        aria-hidden="true"
                      />

                      {/* 1. MODO DE EXIBIÇÃO (REUTILIZAÇÃO DO THEMETOGGLE DA NAVBAR) */}
                      <div
                        className={bottomNavStyles.moreHeader}
                        data-testid="bottom-nav-theme-row"
                      >
                        <span className="text-[#55555E] dark:text-[#969696] font-medium">Modo de Exibição</span>
                        <ThemeToggle />
                      </div>

                      {/* 2. MEU PERFIL */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleItemSelect("perfil")}
                        className={bottomNavStyles.moreItem}
                        data-testid="bottom-nav-item-perfil"
                      >
                        <ProjectIcon
                          name="User"
                          size={15}
                          className="mr-0 text-[#059669] dark:text-[#FFC21F] group-hover:text-white group-focus:text-white transition-colors shrink-0"
                          data-user-dropdown-icon="perfil"
                        />
                        <span
                          className="text-[#55555E] dark:text-[#969696] group-hover:text-white group-focus:text-white transition-colors"
                          data-user-dropdown-text="perfil"
                        >
                          Meu Perfil
                        </span>
                      </button>

                      {/* 3. CONFIGURAÇÕES DA BARBEARIA */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleItemSelect("configuracoes")}
                        className={bottomNavStyles.moreItem}
                        data-testid="bottom-nav-item-configuracoes"
                      >
                        <ProjectIcon
                          name="Settings"
                          size={15}
                          className="mr-0 text-[#059669] dark:text-[#FFC21F] group-hover:text-white group-focus:text-white transition-colors shrink-0"
                          data-user-dropdown-icon="configuracoes"
                        />
                        <span
                          className="text-[#55555E] dark:text-[#969696] group-hover:text-white group-focus:text-white transition-colors"
                          data-user-dropdown-text="configuracoes"
                        >
                          Configurações da Barbearia
                        </span>
                      </button>

                      {/* 4. SUPORTE & AJUDA */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleItemSelect("suporte")}
                        className={bottomNavStyles.moreItem}
                        data-testid="bottom-nav-item-suporte"
                      >
                        <ProjectIcon
                          name="MessageSquare"
                          size={15}
                          className="mr-0 text-[#059669] dark:text-[#FFC21F] group-hover:text-white group-focus:text-white transition-colors shrink-0"
                          data-user-dropdown-icon="suporte"
                        />
                        <span
                          className="text-[#55555E] dark:text-[#969696] group-hover:text-white group-focus:text-white transition-colors"
                          data-user-dropdown-text="suporte"
                        >
                          Suporte & Ajuda
                        </span>
                      </button>

                      {/* LINHA SEPARADORA */}
                      <div className={bottomNavStyles.moreDivider} data-user-dropdown-divider="true" />

                      {/* 5. SAIR DA PLATAFORMA */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogoutClick}
                        className={bottomNavStyles.moreItem}
                        data-testid="bottom-nav-item-logout"
                      >
                        <ProjectIcon
                          name="LogOut"
                          size={15}
                          colorVariant="danger"
                          className="mr-0 text-red-500 dark:text-red-400 group-hover:text-white group-focus:text-white transition-colors shrink-0"
                          data-user-dropdown-icon="sair"
                        />
                        <span
                          className="text-[#55555E] dark:text-[#969696] group-hover:text-white group-focus:text-white transition-colors"
                          data-user-dropdown-text="sair"
                        >
                          Sair da Plataforma
                        </span>
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
                  {/* Ícone com suporte a Badge de contador na cor Âmbar */}
                  <div className={`${bottomNavStyles.iconWrapper} text-amber-500 dark:text-amber-400`}>
                    <div className="flex items-center justify-center text-amber-500 dark:text-amber-400">
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
