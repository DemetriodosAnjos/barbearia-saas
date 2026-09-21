import { useState, useEffect } from "react";
import { sidebarStyles } from "./Sidebar.styles";

export default function Sidebar({
  tenantName = "Barbearia Dom Pedro",
  tenantPlan = "Plano Pro",
  items = [],
  activeItem,
  onSelect,
  isOpen = false,
  onClose,
  user = { name: "Pedro Silva", role: "Proprietário / Admin" },
  onLogout,
}) {
  // Estado para controlar quais submenus estão abertos (Acordeão)
  const [expandedMenus, setExpandedMenus] = useState({});

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
          ${isOpen ? sidebarStyles.drawerOpen : sidebarStyles.drawerClosed}
        `}
        role="navigation"
        aria-label="Menu principal"
      >
        {/* Cabeçalho */}
        <div className={sidebarStyles.header}>
          <div className={sidebarStyles.brandWrapper}>
            <div className={sidebarStyles.brandLogo}>💈</div>
            <div className={sidebarStyles.brandInfo}>
              <span className={sidebarStyles.brandTitle}>{tenantName}</span>
              <span className={sidebarStyles.brandPlan}>{tenantPlan}</span>
            </div>
          </div>

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

        {/* NAVEGAÇÃO COM SUPORTE A SUBMENUS */}
        <nav className={sidebarStyles.nav}>
          {items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isParentOfActive =
              hasChildren && item.children.some((c) => c.id === activeItem);
            const isExpanded = Boolean(expandedMenus[item.id]);
            const isDirectActive = activeItem === item.id;

            // ==========================================
            // CENÁRIO 1: ITEM COM SUBMENU (ACORDEÃO)
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
                      {item.icon}
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
                            <span className="text-sm">{child.icon}</span>
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
            // CENÁRIO 2: ITEM NORMAL DE CLIQUE ÚNICO
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
                <span className={sidebarStyles.navItemIcon}>{item.icon}</span>
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

        {/* Rodapé do Usuário */}
        <div className={sidebarStyles.footer}>
          <div className={sidebarStyles.userWrapper}>
            <div className={sidebarStyles.userAvatar}>
              {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
            </div>
            <div className={sidebarStyles.userInfo}>
              <span className={sidebarStyles.userName}>{user.name}</span>
              <span className={sidebarStyles.userRole}>{user.role}</span>
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
      </aside>
    </>
  );
}
