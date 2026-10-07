import { useState, useRef, useEffect } from "react";
import { navbarStyles } from "./Navbar.styles";
import Button from "./Button";
import IconButton from "./IconButton";
import ThemeToggle from "./ThemeToggle";
import Modal from "./Modal";
import ProjectIcon from "./ProjectIcon";

export default function Navbar({
  variant = "admin", // 'admin' ou 'client'
  breadcrumbs = ["Agenda", "Visão Geral"],
  branches = [
    { id: "1", name: "Unidade Jardins - SP" },
    { id: "2", name: "Unidade Centro - SP" },
  ],
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
}) {
  const resolvedName =
    user?.name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0] : "Administrador");

  const resolvedRole =
    user?.role ||
    user?.user_metadata?.role ||
    "Gestor";

  const resolvedAvatar =
    user?.avatar ||
    (resolvedName && resolvedName.length >= 2
      ? resolvedName.slice(0, 2).toUpperCase()
      : "AD");

  const resolvedUser = {
    name: resolvedName,
    role: resolvedRole,
    avatar: resolvedAvatar,
    loyaltyPoints: user?.loyaltyPoints,
  };

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);

  // Estado para o Modal de Confirmação de Saída
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const userMenuRef = useRef(null);
  const statusMenuRef = useRef(null);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
        setIsStatusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const statusLabels = {
    available: "Disponível",
    busy: "Em Atendimento",
    break: "Em Pausa",
  };

  // ==========================================
  // 1. NAVBAR DO CLIENTE FINAL
  // ==========================================
  if (variant === "client") {
    return (
      <>
        <a href="#main-content" className="skip-to-content">
          Pular para o conteúdo principal
        </a>
        <header className={navbarStyles.container}>
        <div className={navbarStyles.leftSection}>
          <div className={navbarStyles.avatar}>
            {resolvedUser.avatar}
          </div>
          <div className="flex flex-col">
            <span className={navbarStyles.clientGreeting}>Olá, bem-vindo!</span>
            <span className={navbarStyles.clientName}>{resolvedUser.name}</span>
          </div>

          <div className={navbarStyles.clientBranchBadge}>
            <ProjectIcon name="MapPin" size={13} colorVariant="amber" className="mr-1" />
            <span>Unidade Jardins • 1.2 km</span>
          </div>
        </div>

        <div className={navbarStyles.rightSection}>
          <ThemeToggle className="hidden sm:inline-flex" />

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
            >
              <ProjectIcon name="Bell" size={18} colorVariant="neutral" />
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
      <header className={navbarStyles.container}>
        {/* Lado Esquerdo: Hambúrguer Mobile + Breadcrumbs + Seletor de Filial */}
        <div className={navbarStyles.leftSection}>
          <button
            type="button"
            onClick={onMenuClick}
            className={navbarStyles.menuButton}
            aria-label="Abrir menu de navegação"
          >
            <ProjectIcon name="Menu" size={22} colorVariant="neutral" />
          </button>

          <div className={navbarStyles.breadcrumbWrapper}>
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {idx > 0 && (
                  <span className={navbarStyles.breadcrumbSeparator}>/</span>
                )}
                <span
                  className={
                    idx === breadcrumbs.length - 1
                      ? navbarStyles.breadcrumbCurrent
                      : ""
                  }
                >
                  {crumb}
                </span>
              </div>
            ))}
          </div>

          <select
            value={selectedBranch}
            onChange={(e) => onSelectBranch && onSelectBranch(e.target.value)}
            className={navbarStyles.branchSelect}
            aria-label="Selecionar Filial"
          >
            {branches.map((b) => (
              <option
                key={b.id}
                value={b.id}
                className="bg-neutral-900 text-white"
              >
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lado Direito: Status + Atalho + Tema + Notificações + Perfil */}
        <div className={navbarStyles.rightSection}>
          {/* Status de Atendimento */}
          <div className="relative" ref={statusMenuRef}>
            <button
              type="button"
              onClick={() => setIsStatusMenuOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={isStatusMenuOpen}
              aria-label={`Status de atendimento: ${statusLabels[barberStatus]}. Clique para alterar.`}
              className={`${navbarStyles.statusBadge} ${navbarStyles.statusStates[barberStatus]} focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none`}
            >
              <span
                className={`${navbarStyles.statusDot} ${navbarStyles.statusDots[barberStatus]}`}
              />
              <span className="hidden sm:inline">
                {statusLabels[barberStatus]}
              </span>
            </button>

            {isStatusMenuOpen && (
              <div className={navbarStyles.dropdownMenu} role="menu" aria-label="Opções de status de atendimento">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onStatusChange("available");
                    setIsStatusMenuOpen(false);
                  }}
                  className={navbarStyles.dropdownItem}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Disponível para Atender</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onStatusChange("busy");
                    setIsStatusMenuOpen(false);
                  }}
                  className={navbarStyles.dropdownItem}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Em Atendimento</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onStatusChange("break");
                    setIsStatusMenuOpen(false);
                  }}
                  className={navbarStyles.dropdownItem}
                >
                  <span className="w-2 h-2 rounded-full bg-neutral-500" />
                  <span>Em Pausa / Almoço</span>
                </button>
              </div>
            )}
          </div>

          <ThemeToggle className="hidden sm:inline-flex" />

          {/* Notificações */}
          <div className={navbarStyles.notificationWrapper}>
            <IconButton
              variant="ghost"
              size="sm"
              ariaLabel="Notificações do salão"
              onClick={onNotificationsClick}
            >
              <ProjectIcon name="Bell" size={18} colorVariant="neutral" />
            </IconButton>
            {notificationsCount > 0 && (
              <span className={navbarStyles.notificationBadge}>
                {notificationsCount}
              </span>
            )}
          </div>

          {/* Menu do Usuário / Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className={navbarStyles.userButton}
              aria-expanded={isUserMenuOpen}
            >
              <div className={navbarStyles.avatar}>
                {resolvedUser.avatar}
              </div>
              <div className={navbarStyles.userMeta}>
                <span className={navbarStyles.userName}>{resolvedUser.name}</span>
                <span className={navbarStyles.userRole}>{resolvedUser.role}</span>
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
              <div className={navbarStyles.dropdownMenu} role="menu" aria-label="Opções do usuário">
                <div className="px-3.5 py-2 border-b border-neutral-800">
                  <p className="text-xs font-semibold text-neutral-200">
                    {resolvedUser.name}
                  </p>
                  <p className="text-[10px] text-neutral-400">{resolvedUser.role}</p>
                </div>

                <div className="px-3.5 py-2 flex sm:hidden items-center justify-between text-xs text-neutral-300 border-b border-neutral-800">
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
                  className={navbarStyles.dropdownItem}
                >
                  <ProjectIcon name="User" size={15} colorVariant="amber" className="mr-2" />
                  <span>Meu Perfil</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (onSettingsClick) onSettingsClick();
                    setIsUserMenuOpen(false);
                  }}
                  className={navbarStyles.dropdownItem}
                >
                  <ProjectIcon name="Settings" size={15} colorVariant="amber" className="mr-2" />
                  <span>Configurações da Barbearia</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (onSupportClick) onSupportClick();
                    setIsUserMenuOpen(false);
                  }}
                  className={navbarStyles.dropdownItem}
                >
                  <ProjectIcon name="MessageSquare" size={15} colorVariant="amber" className="mr-2" />
                  <span>Suporte & Ajuda</span>
                </button>

                <div className={navbarStyles.dropdownDivider} />

                {/* CLIQUE ABRE O MODAL EM VEZ DE SAIR DIRETO */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsLogoutModalOpen(true);
                  }}
                  className={`${navbarStyles.dropdownItem} text-red-400 hover:text-red-300 hover:bg-red-950/30`}
                >
                  <ProjectIcon name="LogOut" size={15} colorVariant="danger" className="mr-2" />
                  <span>Sair da Plataforma</span>
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
