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
  return (
    <>
      {/* Backdrop para fechar ao tocar fora no mobile */}
      {isOpen && (
        <div
          className={sidebarStyles.backdrop}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Gaveta da Sidebar */}
      <aside
        className={`
          ${sidebarStyles.drawer}
          ${isOpen ? sidebarStyles.drawerOpen : sidebarStyles.drawerClosed}
        `}
        role="navigation"
        aria-label="Menu principal"
      >
        {/* Cabeçalho da Marca / Barbearia */}
        <div className={sidebarStyles.header}>
          <div className={sidebarStyles.brandWrapper}>
            <div className={sidebarStyles.brandLogo}>💈</div>
            <div className={sidebarStyles.brandInfo}>
              <span className={sidebarStyles.brandTitle}>{tenantName}</span>
              <span className={sidebarStyles.brandPlan}>{tenantPlan}</span>
            </div>
          </div>

          {/* Botão de Fechar no Celular */}
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

        {/* Links de Navegação */}
        <nav className={sidebarStyles.nav}>
          {items.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (onSelect) onSelect(item.id);
                  if (onClose) onClose(); // Fecha a gaveta no celular ao selecionar
                }}
                className={`
                  ${sidebarStyles.navItem}
                  ${isActive ? sidebarStyles.navItemActive : sidebarStyles.navItemInactive}
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

        {/* Rodapé: Barbeiro / Dono Conectado */}
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

          {/* Botão de Sair (Logout) */}
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
