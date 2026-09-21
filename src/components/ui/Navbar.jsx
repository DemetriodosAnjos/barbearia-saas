import { useState, useRef, useEffect } from "react";
import { navbarStyles } from "./Navbar.styles";
import Button from "./Button";
import IconButton from "./IconButton";
import ThemeToggle from "./ThemeToggle";
import Modal from "./Modal"; // 👈 1. Importa o Modal

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
  user = {
    name: "Carlos Barbeiro",
    role: "Administrador",
    avatar: "CB",
    loyaltyPoints: 140,
  },
  onLogout,
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);

  // 👇 2. Estado para o Modal de Confirmação de Saída
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
      <header className={navbarStyles.container}>
        <div className={navbarStyles.leftSection}>
          <div className={navbarStyles.avatar}>
            {user.avatar || user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className={navbarStyles.clientGreeting}>Olá, bem-vindo!</span>
            <span className={navbarStyles.clientName}>{user.name}</span>
          </div>

          <div className={navbarStyles.clientBranchBadge}>
            <span>📍</span>
            <span>Unidade Jardins • 1.2 km</span>
          </div>
        </div>

        <div className={navbarStyles.rightSection}>
          <ThemeToggle className="hidden sm:inline-flex" />

          {user.loyaltyPoints !== undefined && (
            <div
              className={navbarStyles.loyaltyPointsBadge}
              title="Pontos acumulados"
            >
              <span>⭐</span>
              <span>{user.loyaltyPoints} pts</span>
            </div>
          )}

          <div className={navbarStyles.notificationWrapper}>
            <IconButton
              variant="ghost"
              size="sm"
              ariaLabel="Avisos e Lembretes"
              onClick={onNotificationsClick}
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
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </IconButton>
            <span className={navbarStyles.notificationDot} />
          </div>

          <Button variant="primary" size="sm" onClick={onQuickAction}>
            Novo Corte
          </Button>
        </div>
      </header>
    );
  }

  // ==========================================
  // 2. NAVBAR DO GESTOR / BARBEIRO
  // ==========================================
  return (
    <>
      <header className={navbarStyles.container}>
        {/* Lado Esquerdo: Hambúrguer Mobile + Breadcrumbs + Seletor de Filial */}
        <div className={navbarStyles.leftSection}>
          <button
            type="button"
            onClick={onMenuClick}
            className={navbarStyles.menuButton}
            aria-label="Abrir menu de navegação"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
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
              className={`${navbarStyles.statusBadge} ${navbarStyles.statusStates[barberStatus]}`}
            >
              <span
                className={`${navbarStyles.statusDot} ${navbarStyles.statusDots[barberStatus]}`}
              />
              <span className="hidden sm:inline">
                {statusLabels[barberStatus]}
              </span>
            </button>

            {isStatusMenuOpen && (
              <div className={navbarStyles.dropdownMenu}>
                <button
                  type="button"
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
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
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
                {user.avatar || user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className={navbarStyles.userMeta}>
                <span className={navbarStyles.userName}>{user.name}</span>
                <span className={navbarStyles.userRole}>{user.role}</span>
              </div>
              <svg
                className="w-3.5 h-3.5 text-neutral-400 hidden lg:block"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Menu Suspenso */}
            {isUserMenuOpen && (
              <div className={navbarStyles.dropdownMenu}>
                <div className="px-3.5 py-2 border-b border-neutral-800">
                  <p className="text-xs font-semibold text-neutral-200">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-neutral-400">{user.role}</p>
                </div>

                <div className="px-3.5 py-2 flex sm:hidden items-center justify-between text-xs text-neutral-300 border-b border-neutral-800">
                  <span>Modo de Exibição</span>
                  <ThemeToggle />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onProfileClick) onProfileClick();
                    setIsUserMenuOpen(false);
                  }}
                  className={navbarStyles.dropdownItem}
                >
                  <span>👤</span> Meu Perfil
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onSettingsClick) onSettingsClick();
                    setIsUserMenuOpen(false);
                  }}
                  className={navbarStyles.dropdownItem}
                >
                  <span>⚙️</span> Configurações da Barbearia
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onSupportClick) onSupportClick();
                    setIsUserMenuOpen(false);
                  }}
                  className={navbarStyles.dropdownItem}
                >
                  <span>💬</span> Suporte & Ajuda
                </button>

                <div className={navbarStyles.dropdownDivider} />

                {/* 👇 3. CLIQUE ABRE O MODAL EM VEZ DE SAIR DIRETO */}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsLogoutModalOpen(true);
                  }}
                  className={`${navbarStyles.dropdownItem} text-red-400 hover:text-red-300 hover:bg-red-950/30`}
                >
                  <span>🚪</span> Sair da Plataforma
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
