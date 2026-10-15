import { useState, useEffect } from "react";
import { sidebarStyles } from "./Sidebar.styles";
import ProjectIcon from "./ProjectIcon";
import appMetadata from "../../../metadata.json";

export default function Sidebar({
  tenantName = "Barbearia Dom Pedro",
  tenantPlan = "TRIAL",
  items = [],
  activeItem,
  onSelect,
  isOpen = false,
  onClose,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  onOpenPlansModal,
  user = { name: "Pedro Silva" },
  onLogout,
  onNavigateSuperAdmin,
}) {
  const userEmail = (
    user?.email ||
    user?.user_metadata?.email ||
    (typeof window !== "undefined" && window.localStorage?.getItem("saas_auth_user")
      ? (() => {
          try {
            return JSON.parse(window.localStorage.getItem("saas_auth_user") || "{}")?.email;
          } catch {
            return "";
          }
        })()
      : "") ||
    ""
  ).toLowerCase().trim();

  const isSuperAdminAuthorized =
    userEmail === "atendmentor@gmail.com" ||
    (Boolean(import.meta.env?.VITE_SUPERADMIN_EMAIL) &&
      userEmail === String(import.meta.env.VITE_SUPERADMIN_EMAIL).toLowerCase().trim());

  // Estado para controlar quais submenus estão abertos (Acordeão)
  const [expandedMenus, setExpandedMenus] = useState({});

  // Estado interno de encolhimento do sidebar no desktop
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    try {
      return localStorage.getItem("barbearia_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const isCollapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    const nextVal = !isCollapsed;
    if (onToggleCollapse) {
      onToggleCollapse(nextVal);
    } else {
      setInternalCollapsed(nextVal);
      try {
        localStorage.setItem("barbearia_sidebar_collapsed", String(nextVal));
      } catch {
        // ignore
      }
    }
  };

  // 1. AUTO-EXPANSÃO INTELIGENTE: Se o activeItem for um filho, abre o pai sozinho!
  useEffect(() => {
    items.forEach((item) => {
      if (item.children && item.children.some((c) => c.id === activeItem)) {
        setExpandedMenus((prev) => ({ ...prev, [item.id]: true }));
      }
    });
  }, [activeItem, items]);

  const toggleSubmenu = (menuId) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  // Helper para renderizar ícone semântico via ProjectIcon SVG
  const renderItemIcon = (icon) => {
    if (!icon) return null;
    if (typeof icon === "string") {
      return (
        <ProjectIcon
          name={icon}
          size={18}
          colorVariant="inherit"
          className="transition-colors"
        />
      );
    }
    return icon;
  };

  return (
    <>
      {/* Backdrop no celular */}
      {isOpen && (
        <div
          className={sidebarStyles.backdrop}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          ${sidebarStyles.drawer}
          ${isCollapsed ? sidebarStyles.drawerCollapsed : sidebarStyles.drawerExpanded}
          ${isOpen ? sidebarStyles.drawerOpen : sidebarStyles.drawerClosed}
        `}
        role="navigation"
        aria-label="Menu principal"
      >
        {/* Cabeçalho */}
        {!isCollapsed ? (
          <div className={sidebarStyles.header}>
            <div className={sidebarStyles.brandWrapper}>
              <div
                className={sidebarStyles.brandLogo}
                data-sidebar-brand-logo="true"
                onClick={handleToggleCollapse}
                title="Recolher menu lateral"
              >
                <ProjectIcon name="Scissors" size={20} colorVariant="white" className="text-white" />
              </div>
              <div className={sidebarStyles.brandInfo}>
                <span className={sidebarStyles.brandTitle} data-sidebar-brand-title="true">
                  {tenantName}
                </span>
                {/* Link TRIAL para abrir modal de planos */}
                <button
                  type="button"
                  onClick={onOpenPlansModal}
                  data-sidebar-plan-link="true"
                  className="text-[11px] font-semibold text-[#059669] hover:text-[#047857] dark:text-amber-500 dark:hover:text-amber-400 uppercase tracking-wider mt-0.5 cursor-pointer text-left flex items-center gap-1 transition-colors group no-underline hover:no-underline sidebar-plan-link"
                  title="Abrir planos e fazer upgrade (Escolha o plano ideal para a sua barbearia)"
                >
                  <span className="truncate" data-sidebar-plan-text="true">{tenantPlan || "TRIAL"}</span>
                  <span
                    data-sidebar-plan-tag="true"
                    className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 group-hover:bg-[#d1fae5] dark:group-hover:bg-amber-500/30 transition-colors sidebar-plan-tag"
                  >
                    Planos
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Botão de Encolher Desktop */}
              <button
                type="button"
                onClick={handleToggleCollapse}
                className={sidebarStyles.collapseButton}
                title="Recolher menu lateral"
                aria-label="Recolher menu lateral"
              >
                <ProjectIcon name="ChevronLeft" size={18} />
              </button>

              {/* Botão de Fechar Mobile */}
              <button
                type="button"
                onClick={onClose}
                className={sidebarStyles.closeMobileButton}
                aria-label="Fechar menu"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          /* Cabeçalho Encolhido (Apenas Logo e Botão de Expandir) */
          <div className={sidebarStyles.headerCollapsed}>
            <div
              className={sidebarStyles.brandLogo}
              data-sidebar-brand-logo="true"
              onClick={handleToggleCollapse}
              title={`Expandir menu (${tenantName})`}
            >
              <ProjectIcon name="Scissors" size={20} colorVariant="white" className="text-white" />
            </div>

            <button
              type="button"
              onClick={handleToggleCollapse}
              className="text-neutral-400 hover:text-amber-400 p-1.5 rounded-lg hover:bg-neutral-800 cursor-pointer transition-colors"
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
            >
              <ProjectIcon name="ChevronRight" size={18} />
            </button>
          </div>
        )}

        {/* NAVEGAÇÃO COM SUPORTE A SUBMENUS OU COLUNA DE ÍCONES */}
        <nav className={isCollapsed ? sidebarStyles.navCollapsed : sidebarStyles.nav}>
          {items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isParentOfActive =
              hasChildren && item.children.some((c) => c.id === activeItem);
            const isExpanded = Boolean(expandedMenus[item.id]);
            const isDirectActive = activeItem === item.id;
            const isActive = isDirectActive || isParentOfActive;

            // ==========================================
            // MODO ENCOLHIDO: APENAS COLUNA DE ÍCONES
            // ==========================================
            if (isCollapsed) {
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    if (hasChildren) {
                      if (onSelect) onSelect(item.children[0].id);
                    } else {
                      if (onSelect) onSelect(item.id);
                    }
                    if (onClose) onClose();
                  }}
                  className={`
                    ${sidebarStyles.navItemCollapsed}
                    ${isActive ? sidebarStyles.navItemActive : sidebarStyles.navItemInactive}
                  `}
                >
                  <span className={sidebarStyles.navItemIcon}>
                    {renderItemIcon(item.icon)}
                  </span>
                  {item.badge && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-2 right-2 ring-2 ring-neutral-900" />
                  )}
                </button>
              );
            }

            // ==========================================
            // MODO EXPANDIDO - CENÁRIO 1: COM SUBMENU (ACORDEÃO)
            // ==========================================
            if (hasChildren) {
              return (
                <div key={item.id} className="space-y-1">
                  {/* Botão Pai que expande/recolhe */}
                  <button
                    type="button"
                    onClick={() => toggleSubmenu(item.id)}
                    className={`
                      ${sidebarStyles.navItem}
                      ${isParentOfActive ? "text-amber-400 font-semibold" : sidebarStyles.navItemInactive}
                    `}
                  >
                    <span className={sidebarStyles.navItemIcon}>
                      {renderItemIcon(item.icon)}
                    </span>
                    <span className={sidebarStyles.navItemLabel}>
                      {item.label}
                    </span>

                    {/* Seta Chevron que gira 180 graus */}
                    <svg
                      className={`
                        ${sidebarStyles.chevronIcon}
                        ${isExpanded ? sidebarStyles.chevronExpanded : ""}
                      `}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Lista de Filhos Recuada */}
                  {isExpanded && (
                    <div className={sidebarStyles.submenuList}>
                      {item.children.map((child) => {
                        const isChildActive = activeItem === child.id;

                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => {
                              if (onSelect) onSelect(child.id);
                              if (onClose) onClose();
                            }}
                            className={`
                              ${sidebarStyles.subItem}
                              ${isChildActive ? sidebarStyles.subItemActive : sidebarStyles.subItemInactive}
                            `}
                          >
                            <span className="text-sm shrink-0">
                              {renderItemIcon(child.icon)}
                            </span>
                            <span className="truncate">{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // ==========================================
            // MODO EXPANDIDO - CENÁRIO 2: ITEM NORMAL DE CLIQUE ÚNICO
            // ==========================================
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (onSelect) onSelect(item.id);
                  if (onClose) onClose();
                }}
                className={`
                  ${sidebarStyles.navItem}
                  ${isDirectActive ? sidebarStyles.navItemActive : sidebarStyles.navItemInactive}
                `}
              >
                <span className={sidebarStyles.navItemIcon}>
                  {renderItemIcon(item.icon)}
                </span>
                <span className={sidebarStyles.navItemLabel}>{item.label}</span>
                {item.badge && (
                  <span className={sidebarStyles.navItemBadge}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Rodapé: Versão do Sistema Centralizada (SaaS V1.5.1.9) & Logout */}
        {!isCollapsed ? (
          <div className="p-3 border-t border-neutral-800/80 mt-auto flex flex-col gap-2.5 bg-neutral-900/60 shrink-0">
            <div className="flex items-center justify-between">
              <div className={sidebarStyles.userWrapper}>
                <div className={sidebarStyles.userInfo}>
                  <span className={sidebarStyles.userName}>
                    {user?.name || "Administrador"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className={sidebarStyles.logoutButton}
                title="Sair do sistema"
                aria-label="Sair"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>

            {/* Link Especial Super Admin para o e-mail oficial (atendmentor@gmail.com) */}
            {isSuperAdminAuthorized && (
              <button
                type="button"
                onClick={() => {
                  if (onNavigateSuperAdmin) {
                    onNavigateSuperAdmin();
                  } else if (onSelect) {
                    onSelect("superadmin");
                  }
                  if (onClose) onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer shadow-sm group mb-1"
                title="Acessar Painel Super Admin"
                aria-label="Acessar Painel Super Admin"
              >
                <span className="w-5 h-5 flex items-center justify-center text-amber-400 shrink-0">
                  <ProjectIcon name="Crown" size={16} />
                </span>
                <span className="truncate">Painel Super Admin</span>
              </button>
            )}

            {/* Versão Centralizada */}
            <div className="w-full flex items-center justify-center pt-2 border-t border-neutral-800/60 text-center">
              <span className="text-[11px] font-mono font-bold text-amber-400 tracking-wider">
                {appMetadata?.name || "SaaS V1.5.2.0"}
              </span>
            </div>
          </div>
        ) : (
          <div className={sidebarStyles.footerCollapsed}>
            {isSuperAdminAuthorized && (
              <button
                type="button"
                onClick={() => {
                  if (onNavigateSuperAdmin) {
                    onNavigateSuperAdmin();
                  } else if (onSelect) {
                    onSelect("superadmin");
                  }
                }}
                className="w-8 h-8 mx-auto flex items-center justify-center rounded-lg text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer shadow-sm mb-1.5"
                title="Painel Super Admin"
                aria-label="Painel Super Admin"
              >
                <ProjectIcon name="Crown" size={16} />
              </button>
            )}
            <span
              className="text-[10px] font-mono font-bold text-amber-400 text-center"
              title={appMetadata?.name || "SaaS V1.5.2.0"}
            >
              V1.5.2.0
            </span>
            <button
              type="button"
              onClick={onLogout}
              className={sidebarStyles.logoutButton}
              title="Sair do sistema"
              aria-label="Sair"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

