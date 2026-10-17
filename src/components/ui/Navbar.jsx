import { useState, useRef, useEffect } from "react";
import { navbarStyles } from "./Navbar.styles";
import Button from "./Button";
import IconButton from "./IconButton";
import ThemeToggle from "./ThemeToggle";
import Modal from "./Modal";
import ProjectIcon from "./ProjectIcon";
import Avatar from "./Avatar";
import { getBarbershopUnitName, formatUnitLocation } from "../../utils/unitLocation";

export default function Navbar({
  variant = "admin", // 'admin' ou 'client'
  tenant,
  breadcrumbs = ["Agenda", "Visão Geral"],
  branches,
  selectedBranch = "1",
  onSelectBranch,
  barberStatus = "available",
  onStatusChange,
  notificationsCount = 3,
  onNotificationsClick,
  onQuickAction,
  onMenuClick,
  onProfileClick,
  onSettingsClick,
  onSupportClick,
  user,
  onLogout,
  hasTrialBanner = false,
  className = "",
}) {
  const resolvedName =
    user?.name ||
    user?.fullName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0] : "Administrador");

  const rawRole = String(
    user?.user_metadata?.role ||
    user?.role ||
    "admin"
  ).toLowerCase().trim();

  // Normaliza 'authenticated', 'owner' e 'tenant' para o papel de negócio 'admin'
  const normalizedRole =
    rawRole === "authenticated" || rawRole === "owner" || rawRole === "tenant" || !rawRole
      ? "admin"
      : rawRole;

  const roleLabelMap = {
    admin: "Administrador",
    employee: "Barbeiro",
    barber: "Barbeiro",
    client: "Cliente",
    superadmin: "SuperAdmin",
  };

  const resolvedRoleLabel = roleLabelMap[normalizedRole] || "Administrador";

  const isGoogleAuth = Boolean(
    user?.authProvider === "google" ||
    user?.authProvider === "linked" ||
    user?.googleId ||
    user?.user_metadata?.googleId ||
    user?.app_metadata?.provider === "google"
  );

  const resolvedAvatarSrc =
    user?.avatarSrc ||
    user?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.avatarSrc ||
    (typeof user?.avatar === "string" &&
    (user.avatar.startsWith("http") ||
      user.avatar.startsWith("blob:") ||
      user.avatar.startsWith("data:"))
      ? user.avatar
      : null);

  const resolvedAvatar =
    user?.avatar ||
    (resolvedName && resolvedName.length >= 2
      ? resolvedName.slice(0, 2).toUpperCase()
      : "AD");

  const resolvedUser = {
    name: resolvedName,
    role: resolvedRoleLabel,
    rawRole: normalizedRole,
    isGoogleAuth,
    avatar: resolvedAvatar,
    avatarSrc: resolvedAvatarSrc,
    loyaltyPoints: user?.loyaltyPoints,
  };

  // Localização da unidade sincronizada com o cadastro em (Meu perfil / Aba- contato e endereço)
  const [currentUnitName, setCurrentUnitName] = useState(() =>
    getBarbershopUnitName(tenant, user)
  );

  useEffect(() => {
    setCurrentUnitName(getBarbershopUnitName(tenant, user));
  }, [tenant, user]);

  useEffect(() => {
    const handleAddressUpdated = (e) => {
      const detail = e?.detail;
      if (detail) {
        const { neighborhood, city, state } = detail;
        const formatted = formatUnitLocation(
          neighborhood,
          city,
          state,
          tenant?.name ? `${tenant.name} - SP` : "Jardim - SP"
        );
        setCurrentUnitName(formatted);
      } else {
        setCurrentUnitName(getBarbershopUnitName(tenant, user));
      }
    };

    window.addEventListener("saas:tenant-address-updated", handleAddressUpdated);
    return () => {
      window.removeEventListener("saas:tenant-address-updated", handleAddressUpdated);
    };
  }, [tenant, user]);

  // Lista de unidades / filiais dinâmicas refletindo o endereço exato da barbearia
  const resolvedBranches =
    branches && branches.length > 0
      ? branches.map((b, idx) => (idx === 0 ? { ...b, name: currentUnitName } : b))
      : [
          { id: "1", name: currentUnitName },
        ];

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isBranchSelectOpen, setIsBranchSelectOpen] = useState(false);

  // Estado para o Modal de Confirmação de Saída
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const userMenuRef = useRef(null);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ==========================================
  // 1. NAVBAR DO CLIENTE FINAL
  // ==========================================
  if (variant === "client") {
    return (
      <>
        <a href="#main-content" className="skip-to-content">
          Pular para o conteúdo principal
        </a>
        <header className={`${navbarStyles.container} ${hasTrialBanner ? "top-[41px]" : "top-0"} ${className}`}>
          <div className={navbarStyles.leftSection}>
            {/* Modo Claro: Preserva 100% o avatar original da navbar light */}
            <div className={`${navbarStyles.avatar} navbar-avatar dark:hidden`} data-navbar-avatar="true">
              {resolvedUser.avatar}
            </div>

            {/* Modo Escuro (Dark Theme): Miniatura do Avatar do Header de Meu Perfil */}
            <div className="hidden dark:flex relative shrink-0 items-center justify-center" data-navbar-avatar-dark="true">
              <Avatar
                src={resolvedUser.avatarSrc}
                name={resolvedUser.name}
                size="sm"
                status="available"
                showStatusRing={false}
                className="shrink-0"
              />
            </div>

            <div className="flex flex-col">
              <span className={navbarStyles.clientGreeting}>Olá, bem-vindo!</span>
              <span className={navbarStyles.clientName}>{resolvedUser.name}</span>
            </div>

            <div className={navbarStyles.clientBranchBadge}>
              <ProjectIcon name="MapPin" size={13} colorVariant="amber" className="mr-1" />
              <span>{currentUnitName} • 1.2 km</span>
            </div>
          </div>

          <div className={navbarStyles.rightSection}>
            {resolvedUser.loyaltyPoints !== undefined && (
              <div
                className={navbarStyles.loyaltyPointsBadge}
                title="Pontos acumulados"
              >
                <ProjectIcon name="Star" size={13} colorVariant="amber" className="mr-1" />
                <span>{resolvedUser.loyaltyPoints} pts</span>
              </div>
            )}

            <div className={navbarStyles.notificationWrapper}>
              <IconButton
                variant="ghost"
                size="sm"
                ariaLabel="Avisos e Lembretes"
                onClick={onNotificationsClick}
                className="navbar-bell-btn text-zinc-500 hover:text-zinc-700 dark:text-amber-500 dark:hover:text-amber-400"
                data-notification-button="true"
              >
                <ProjectIcon
                  name="Bell"
                  size={18}
                  className="text-zinc-500 dark:text-amber-500"
                  data-notification-bell="true"
                />
              </IconButton>
              <span className={navbarStyles.notificationDot} />
            </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onQuickAction}
            className="flex items-center gap-1.5"
          >
            <ProjectIcon name="Scissors" size={14} colorVariant="inherit" />
            <span>Novo Corte</span>
          </Button>
        </div>
      </header>
    </>
    );
  }

  // ==========================================
  // 2. NAVBAR DO GESTOR / BARBEIRO
  // ==========================================
  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Pular para o conteúdo principal
      </a>
      <header className={`${navbarStyles.container} ${hasTrialBanner ? "top-[41px]" : "top-0"} ${className}`}>
        {/* Lado Esquerdo: Hambúrguer Mobile + Breadcrumbs + Seletor de Filial */}
        <div className={navbarStyles.leftSection}>
          <button
            type="button"
            onClick={onMenuClick}
            className={`${navbarStyles.menuButton} navbar-menu-button`}
            aria-label="Abrir menu de navegação"
            data-menu-button="true"
          >
            <ProjectIcon
              name="Menu"
              size={22}
              className="text-[#059669] dark:text-amber-400"
              data-menu-icon="true"
            />
          </button>

          <div className={`${navbarStyles.breadcrumbWrapper} navbar-breadcrumbs`}>
            {breadcrumbs.map((crumb, idx) => {
              const isCurrent = idx === breadcrumbs.length - 1;
              return (
                <div key={idx} className="flex items-center gap-2">
                  {idx > 0 && (
                    <span className={navbarStyles.breadcrumbSeparator}>/</span>
                  )}
                  <span
                    className={
                      isCurrent
                        ? navbarStyles.breadcrumbCurrent
                        : "text-zinc-500 dark:text-neutral-400 font-medium navbar-breadcrumb-parent"
                    }
                    data-breadcrumb-current={isCurrent ? "true" : undefined}
                  >
                    {crumb}
                  </span>
                </div>
              );
            })}
          </div>

        </div>

        {/* Lado Direito: Unidade da Barbearia + Notificações (Sino) + Seletor Avatar */}
        <div className={navbarStyles.rightSection}>
          {/* Elemento Unidade da Barbearia (ao lado do alerta / sino) */}
          <div className="relative inline-flex items-center" data-unit-container="true">
            <select
              value={selectedBranch}
              onChange={(e) => {
                if (onSelectBranch) onSelectBranch(e.target.value);
                setIsBranchSelectOpen(false);
              }}
              onClick={() => setIsBranchSelectOpen((prev) => !prev)}
              onFocus={() => setIsBranchSelectOpen(true)}
              onBlur={() => setIsBranchSelectOpen(false)}
              className={`${navbarStyles.branchSelect} appearance-none pr-6 sm:pr-7 cursor-pointer`}
              aria-label="Selecionar Filial ou Unidade"
              title={`Unidade da Barbearia: ${currentUnitName}`}
              data-unit-select="true"
            >
              {resolvedBranches.map((b) => (
                <option
                  key={b.id}
                  value={b.id}
                  className="bg-[#F4F4F5] dark:bg-neutral-900 text-[#55555E] dark:text-[#969696]"
                >
                  {b.name}
                </option>
              ))}
            </select>
            <div
              className="pointer-events-none absolute right-2 flex items-center text-[#55555E] dark:text-[#969696]"
              data-unit-chevron="true"
            >
              <ProjectIcon
                name={isBranchSelectOpen ? "ChevronUp" : "ChevronDown"}
                size={13}
                className="text-[#55555E] dark:text-[#969696]"
              />
            </div>
          </div>

          {/* Notificações (Sino - Âmbar no Dark, Neutro no Light) */}
          <div className={navbarStyles.notificationWrapper}>
            <IconButton
              variant="ghost"
              size="sm"
              ariaLabel="Notificações do salão"
              onClick={onNotificationsClick}
              className="navbar-bell-btn text-zinc-500 hover:text-zinc-700 dark:text-amber-400 dark:hover:text-amber-300"
              data-notification-button="true"
            >
              <ProjectIcon
                name="Bell"
                size={18}
                className="text-zinc-500 dark:text-amber-400"
                data-notification-bell="true"
              />
            </IconButton>
            {notificationsCount > 0 && (
              <span
                className={`${navbarStyles.notificationBadge} notification-badge !text-white text-white`}
                data-notification-badge="true"
                style={{ color: "#ffffff" }}
              >
                {notificationsCount}
              </span>
            )}
          </div>

          {/* Menu do Usuário / Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className={`${navbarStyles.userButton} ${isUserMenuOpen ? navbarStyles.userButtonActive : ""}`}
              aria-expanded={isUserMenuOpen}
              data-avatar-button="true"
              data-active={isUserMenuOpen ? "true" : "false"}
            >
              {/* Modo Claro: Preserva 100% o avatar original da navbar light */}
              <div
                className={`${navbarStyles.avatar} navbar-avatar dark:hidden`}
                data-navbar-avatar="true"
              >
                {resolvedUser.avatar}
              </div>

              {/* Modo Escuro (Dark Theme - Mobile First): Miniatura do Avatar do Header de Meu Perfil */}
              <div
                className="hidden dark:flex relative shrink-0 items-center justify-center"
                data-navbar-avatar-dark="true"
              >
                <Avatar
                  src={resolvedUser.avatarSrc}
                  name={resolvedUser.name}
                  size="sm"
                  status={barberStatus === "busy" ? "in_service" : barberStatus === "break" ? "on_break" : "available"}
                  showStatusRing={false}
                  className="shrink-0"
                />
              </div>
              <div className={navbarStyles.userMeta}>
                <span className={navbarStyles.userName} data-user-name="true">{resolvedUser.name}</span>
                <span className={`${navbarStyles.userRole} flex items-center gap-1.5`}>
                  <span data-user-role="true">{resolvedUser.role}</span>
                  {resolvedUser.isGoogleAuth ? (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      title="Sessão autenticada via Google Identity Services"
                    >
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Google
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-medium bg-[#F4F4F5] dark:bg-neutral-800 text-[#55555E] dark:text-neutral-400 border border-[#D4D4D8] dark:border-neutral-700"
                      title="Sessão autenticada por E-mail e Senha"
                    >
                      Senha
                    </span>
                  )}
                </span>
              </div>
              <ProjectIcon
                name="ChevronDown"
                size={14}
                colorVariant="neutral"
                className="hidden lg:block ml-1"
              />
            </button>

            {/* Menu Suspenso */}
            {isUserMenuOpen && (
              <div
                className={`${navbarStyles.dropdownMenu} avatar-dropdown-menu`}
                role="menu"
                aria-label="Opções do usuário"
                data-user-dropdown-menu="true"
              >
                <div className={navbarStyles.dropdownHeader} data-user-dropdown-header="true">
                  <p className="text-xs font-semibold text-[#059669] dark:text-neutral-200" data-user-name="true">
                    {resolvedUser.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-[#55555E] dark:text-[#FFB900]" data-user-role="true">
                      {resolvedUser.role}
                    </span>
                    <span className="text-neutral-400 dark:text-neutral-600">•</span>
                    {resolvedUser.isGoogleAuth ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#55555E] dark:text-[#55555E]" data-user-dropdown-google="true">
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        Conta Google Vinculada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#55555E] dark:text-neutral-400" data-user-dropdown-auth="true">
                        <ProjectIcon name="Lock" size={10} className="text-[#059669] dark:text-[#FFC21F]" data-user-dropdown-icon="email-senha" />
                        <span data-user-dropdown-text="email-senha">E-mail & Senha</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-3.5 py-2 flex items-center justify-between text-xs text-[#55555E] dark:text-neutral-300 border-b border-[#E4E4E7] dark:border-neutral-800">
                  <span>Modo de Exibição</span>
                  <ThemeToggle />
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (onProfileClick) onProfileClick();
                    setIsUserMenuOpen(false);
                  }}
                  className={`${navbarStyles.dropdownItem} avatar-dropdown-item group`}
                >
                  <ProjectIcon name="User" size={15} className="mr-2 text-[#059669] dark:text-[#FFC21F] group-hover:text-white group-focus:text-white transition-colors" data-user-dropdown-icon="perfil" />
                  <span className="text-[#55555E] dark:text-neutral-300 group-hover:text-white group-focus:text-white transition-colors" data-user-dropdown-text="perfil">Meu Perfil</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (onSettingsClick) onSettingsClick();
                    setIsUserMenuOpen(false);
                  }}
                  className={`${navbarStyles.dropdownItem} avatar-dropdown-item group`}
                >
                  <ProjectIcon name="Settings" size={15} className="mr-2 text-[#059669] dark:text-[#FFC21F] group-hover:text-white group-focus:text-white transition-colors" data-user-dropdown-icon="configuracoes" />
                  <span className="text-[#55555E] dark:text-neutral-300 group-hover:text-white group-focus:text-white transition-colors" data-user-dropdown-text="configuracoes">Configurações da Barbearia</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (onSupportClick) onSupportClick();
                    setIsUserMenuOpen(false);
                  }}
                  className={`${navbarStyles.dropdownItem} avatar-dropdown-item group`}
                >
                  <ProjectIcon name="MessageSquare" size={15} className="mr-2 text-[#059669] dark:text-[#FFC21F] group-hover:text-white group-focus:text-white transition-colors" data-user-dropdown-icon="suporte" />
                  <span className="text-[#55555E] dark:text-neutral-300 group-hover:text-white group-focus:text-white transition-colors" data-user-dropdown-text="suporte">Suporte & Ajuda</span>
                </button>

                <div className={navbarStyles.dropdownDivider} data-user-dropdown-divider="true" />

                {/* CLIQUE ABRE O MODAL EM VEZ DE SAIR DIRETO */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsLogoutModalOpen(true);
                  }}
                  className={`${navbarStyles.dropdownItem} avatar-dropdown-item group text-[#55555E] dark:text-red-400 hover:text-white dark:hover:text-white`}
                >
                  <ProjectIcon name="LogOut" size={15} colorVariant="danger" className="mr-2 group-hover:text-white group-focus:text-white transition-colors" data-user-dropdown-icon="sair" />
                  <span className="text-[#55555E] dark:text-red-400 group-hover:text-white group-focus:text-white transition-colors" data-user-dropdown-text="sair">Sair da Plataforma</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 4. MODAL DE CONFIRMAÇÃO DE ENCERRAMENTO DE SESSÃO        */}
      {/* ======================================================== */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Encerrar Sessão"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsLogoutModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setIsLogoutModalOpen(false);
                if (typeof document !== "undefined" && document.body) {
                  document.body.style.overflow = "unset";
                }
                if (onLogout) onLogout();
              }}
            >
              Sim, pode sair!
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-left py-1 select-none">
          <p className="text-xs text-neutral-200 leading-relaxed font-semibold">
            Tem certeza de que deseja sair da plataforma?
          </p>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Sua sessão será finalizada com segurança e você precisará digitar
            suas credenciais novamente para acessar o painel.
          </p>
        </div>
      </Modal>
    </>
  );
}
