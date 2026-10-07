import React from "react";
import ProjectIcon from "../../components/ui/ProjectIcon";

/**
 * QASidebar.jsx
 *
 * Menu lateral estruturado para o QA Studio & Testing Workbench.
 * Paleta Oficial: Âmbar Nobre.
 * Biblioteca de Ícones: Lucide-React (^1.48.0) através do ProjectIcon.
 * Suporte completo a Dark / Light Mode e responsividade Desktop, Tablet e Mobile Drawer.
 */
export default function QASidebar({
  currentView = "dashboard",
  onSelectView,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  metrics = null,
  themeMode = "dark",
  onToggleTheme,
}) {
  const isDark = themeMode === "dark";

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard (Home)",
      icon: "Layers",
      badge: "Home",
      badgeVariant: "amber",
      description: "Visão executiva, Big Numbers e atalhos rápidos",
    },
    {
      id: "squads-hub",
      label: "Hub Unificado por Squads (SSOT)",
      icon: "Users",
      badge: "6 Squads",
      badgeVariant: "green",
      description: "Docs, Logs, Correções e Testes centralizados por time",
    },
    {
      id: "squads-explorer",
      label: "Explorador de Testes (6 Squads)",
      icon: "FlaskConical",
      badge: metrics?.totalIndividualTests ? `${metrics.totalIndividualTests}` : "380",
      badgeVariant: "amber",
      description: "Explorador de testes paginados dos 6 Squads",
    },
    {
      id: "tech-docs",
      label: "Documentação Técnica (29 Módulos)",
      icon: "Scroll",
      badge: "29 Mód.",
      badgeVariant: "green",
      description: "Documentação técnica e laudos periciais",
    },
    {
      id: "qa-logs",
      label: "Logs, Diagnósticos & Playbooks",
      icon: "Terminal",
      badge: "SSOT",
      badgeVariant: "amber",
      description: "Fonte Única da Verdade para infraestrutura e playbooks",
    },
    {
      id: "file-studio",
      label: "File Testing Studio",
      icon: "FolderKanban",
      badge: "SAST",
      badgeVariant: "amber",
      description: "Varredura e inspeção de código estático",
    },
    {
      id: "simulations",
      label: "Simulação de Ataques (Chaos/RBAC)",
      icon: "ShieldAlert",
      badge: "Chaos",
      badgeVariant: "amber",
      description: "Testes de estresse de segurança, BOLA e RBAC",
    },
    {
      id: "storybook",
      label: "Storybook Visual",
      icon: "Palette",
      badge: "UI/UX",
      badgeVariant: "amber",
      description: "Auditoria visual, tokens e design system",
    },
    {
      id: "decision-matrix",
      label: "Matriz de Decisão",
      icon: "Users",
      badge: "6 Squads",
      badgeVariant: "amber",
      description: "Governança e papéis por Squad técnico",
    },
  ];

  const sidebarContent = (
    <div
      className={`flex flex-col h-full border-r select-none transition-colors duration-200 ${
        isDark
          ? "bg-neutral-950 border-neutral-800 text-neutral-200"
          : "bg-white border-slate-200 text-slate-700 shadow-sm"
      }`}
    >
      {/* Top Brand Header */}
      <div
        className={`p-4 border-b flex items-center justify-between gap-3 ${
          isDark ? "border-neutral-800/80" : "border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs border ${
              isDark
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-amber-50 border-amber-300 text-amber-600"
            }`}
          >
            <ProjectIcon name="Crown" size={18} />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <div
                className={`text-xs font-black tracking-wide flex items-center gap-1.5 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                <span>QA STUDIO</span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold border ${
                    isDark
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-amber-100 text-amber-800 border-amber-300"
                  }`}
                >
                  PRO
                </span>
              </div>
              <p
                className={`text-[10px] truncate ${
                  isDark ? "text-neutral-400" : "text-slate-500"
                }`}
              >
                Testing Workbench • v1.0
              </p>
            </div>
          )}
        </div>

        {/* Botão de colapso no desktop */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`hidden md:flex p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isDark
              ? "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800"
              : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
          }`}
          title={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          <ProjectIcon
            name={isCollapsed ? "ChevronRight" : "ChevronLeft"}
            size={14}
            className={isDark ? "text-amber-400" : "text-amber-600"}
          />
        </button>

        {/* Botão de fechar no mobile drawer */}
        <button
          type="button"
          onClick={onCloseMobile}
          className={`md:hidden p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isDark
              ? "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
              : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
          title="Fechar menu"
        >
          <ProjectIcon name="X" size={14} />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-2.5 space-y-1 custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView && onSelectView(item.id)}
              title={isCollapsed ? `${item.label} • ${item.description}` : item.description}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium transition-all duration-150 cursor-pointer group border ${
                isActive
                  ? isDark
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-xs shadow-amber-500/10 font-bold"
                    : "bg-amber-50 text-amber-900 border-amber-300 font-bold shadow-xs"
                  : isDark
                  ? "text-neutral-400 hover:text-white hover:bg-neutral-900/90 border-transparent hover:border-neutral-800"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent hover:border-slate-200"
              }`}
            >
              <div
                className={`shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                  isActive
                    ? isDark
                      ? "text-amber-400"
                      : "text-amber-600"
                    : isDark
                    ? "text-neutral-400 group-hover:text-amber-400"
                    : "text-slate-500 group-hover:text-amber-600"
                }`}
              >
                <ProjectIcon
                  name={item.icon}
                  size={18}
                  className={isActive ? (isDark ? "text-amber-400" : "text-amber-600") : undefined}
                />
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
                  <span className="text-xs truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 font-bold ${
                        item.badgeVariant === "amber"
                          ? isDark
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                          : item.badgeVariant === "green"
                          ? isDark
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : item.badgeVariant === "danger"
                          ? isDark
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                            : "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                          : isDark
                          ? "bg-neutral-800 text-neutral-400 border border-neutral-700/60"
                          : "bg-slate-200 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Switcher de Cores: Dark / Light Mode */}
      <div
        className={`p-3 border-t transition-colors ${
          isDark
            ? "border-neutral-800/80 bg-neutral-900/60"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        {isCollapsed ? (
          <button
            type="button"
            onClick={onToggleTheme}
            className={`w-full p-2 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
              isDark
                ? "bg-neutral-800 hover:bg-neutral-700 text-amber-400 border-neutral-700"
                : "bg-white hover:bg-slate-100 text-amber-600 border-slate-300 shadow-xs"
            }`}
            title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          >
            <ProjectIcon name={isDark ? "Sun" : "Moon"} size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleTheme}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isDark
                ? "bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
                : "bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center gap-2">
              <ProjectIcon
                name={isDark ? "Sun" : "Moon"}
                size={14}
                className={isDark ? "text-amber-400" : "text-amber-600"}
              />
              <span>{isDark ? "Tema: Modo Escuro" : "Tema: Modo Claro"}</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                isDark
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              {isDark ? "DARK" : "LIGHT"}
            </span>
          </button>
        )}
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div
          className={`p-3 border-t text-[11px] space-y-1 ${
            isDark
              ? "border-neutral-800/80 bg-neutral-950/70 text-neutral-500"
              : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`font-semibold ${
                isDark ? "text-neutral-400" : "text-slate-600"
              }`}
            >
              Status do Motor
            </span>
            <span className="font-mono text-emerald-500 font-bold flex items-center gap-1">
              <ProjectIcon name="CheckCircle2" size={11} className="text-emerald-500" />
              <span>ONLINE</span>
            </span>
          </div>
          <p className="text-[10px] leading-tight">
            Validação contínua com isolamento multi-tenant ativo.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Sidebar (Sticky) */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-200 sticky top-0 h-screen z-20 ${
          isCollapsed ? "w-18" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 md:hidden flex"
        >
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
