import { useState, useEffect, useRef } from "react";
import ProjectIcon from "../../components/ui/ProjectIcon";

/**
 * QANavbar - Barra de Navegação e Centro de Ações Unificado do QA Studio
 * 
 * Concentra os 13 botões e links solicitados em categorias intuitivas:
 * 1. Bancadas de Teste: Central de testes, Simulações, Componentes Sandbox
 * 2. Auditoria & Docs: Matriz QA, Doc Técnica AppSec, Upload & Análise
 * 3. Logs & Squads: Console de Logs & Correções, Logs SuperAdmin, Correções / Squads
 * 4. Ações de Execução: Atualizar dados dos testes, Executar todas as suítes, Resetar estados
 * 5. Relatórios: Copiar relatório geral
 */
export default function QANavbar({
  activeTab,
  setActiveTab,
  qaLogsSubTab,
  setQaLogsSubTab,
  handleManualRefreshTestsData,
  isRealtimeRefreshing,
  runAllTests,
  isRunningAll,
  exportFullQAReport,
  onResetStates,
  lastRefreshTime,
  totalSuitesCount = 31,
  totalIndividualTests = 243,
}) {
  // Estado para controlar qual dropdown/submenu está aberto
  const [openDropdown, setOpenDropdown] = useState(null); // 'TESTS' | 'AUDIT' | 'LOGS' | 'ACTIONS' | null
  const navRef = useRef(null);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (name) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  const handleSelectTab = (tabKey, subTab = null) => {
    setActiveTab(tabKey);
    if (subTab && setQaLogsSubTab) {
      setQaLogsSubTab(subTab);
    }
    setOpenDropdown(null);
  };

  // Helper para identificar a categoria ativa no menu
  const isTestsCategoryActive =
    activeTab === "test-runner" ||
    activeTab === "security-simulations" ||
    activeTab === "sandbox" ||
    activeTab === "storybook-workbench";

  const isAuditCategoryActive =
    activeTab === "checklist" ||
    activeTab === "tech-docs" ||
    activeTab === "file-studio";

  const isLogsCategoryActive =
    activeTab === "qa-logs" || activeTab === "required-fixes";

  // Identifica o nome legível da visão ativa
  const getActiveViewLabel = () => {
    switch (activeTab) {
      case "test-runner":
        return "Central de testes";
      case "security-simulations":
        return "Simulações";
      case "sandbox":
        return "Componentes Sandbox";
      case "storybook-workbench":
        return "Storybook & Regressão Visual";
      case "checklist":
        return "Matriz QA";
      case "tech-docs":
        return "Doc Técnica AppSec";
      case "file-studio":
        return "Upload & Análise";
      case "qa-logs":
        return qaLogsSubTab === "PLAYBOOKS"
          ? "Correções / Squads"
          : qaLogsSubTab === "LOGS"
          ? "Logs SuperAdmin"
          : "Console de Logs & Correções";
      default:
        return "Central de testes";
    }
  };

  return (
    <nav
      ref={navRef}
      aria-label="Navegação e Ações Rápidas do QA Studio"
      className="bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl p-2.5 sm:p-3 relative z-30 transition-all"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* ======================================================== */}
        {/* ZONA 1: MENUS E SUBMENUS DE NAVEGAÇÃO CLASSIFICADOS */}
        {/* ======================================================== */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          {/* Tag de Contexto / Status */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold">
              Visão:
            </span>
            <span className="text-white font-bold max-w-[130px] truncate">
              {getActiveViewLabel()}
            </span>
            {lastRefreshTime && (
              <span className="text-[10px] text-neutral-500 border-l border-neutral-800 pl-1.5 font-mono" title={`${totalIndividualTests} testes reais monitorados`}>
                {lastRefreshTime}
              </span>
            )}
          </div>

          {/* -------------------------------------------------------- */}
          {/* CATEGORIA 1: BANCADAS DE TESTE (Menu com Submenus) */}
          {/* -------------------------------------------------------- */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("TESTS")}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                isTestsCategoryActive
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm"
                  : "bg-neutral-800/80 text-neutral-300 border-neutral-700/60 hover:text-white hover:bg-neutral-800"
              }`}
              title="Abrir menu de Bancadas de Teste e Simulações"
            >
              <ProjectIcon name="FlaskConical" size={16} className="text-amber-400" />
              <span className="whitespace-nowrap">Bancadas de Teste</span>
              <ProjectIcon name={openDropdown === "TESTS" ? "ChevronUp" : "ChevronDown"} size={12} className="text-neutral-400" />
            </button>

            {/* Submenu Suspenso */}
            {openDropdown === "TESTS" && (
              <div className="absolute left-0 mt-2 w-72 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border-b border-neutral-800 flex items-center justify-between">
                  <span>Módulos de Execução</span>
                  <span className="text-amber-400 font-bold">4 Telas</span>
                </div>

                <div className="mt-1 space-y-1">
                  {/* Submenu 1: Central de testes */}
                  <button
                    type="button"
                    onClick={() => handleSelectTab("test-runner")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer ${
                      activeTab === "test-runner"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <ProjectIcon name="FlaskConical" size={16} className="mt-0.5 text-amber-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Central de testes</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 rounded">
                          {totalSuitesCount} suítes
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 font-normal truncate mt-0.5">
                        Testes automatizados e varredura de arquivos
                      </p>
                    </div>
                  </button>

                  {/* Submenu 2: Simulações */}
                  <button
                    type="button"
                    onClick={() => handleSelectTab("security-simulations")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer ${
                      activeTab === "security-simulations"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <ProjectIcon name="Zap" size={16} className="mt-0.5 text-amber-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Simulações</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 rounded">
                          5 Labs
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 font-normal truncate mt-0.5">
                        Caos de rede, injeção de latência e RBAC
                      </p>
                    </div>
                  </button>

                  {/* Submenu 3: Componentes Sandbox */}
                  <button
                    type="button"
                    onClick={() => handleSelectTab("sandbox")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer ${
                      activeTab === "sandbox"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <ProjectIcon name="Palette" size={16} className="mt-0.5 text-amber-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Componentes Sandbox</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 rounded">
                          Itens 3, 4, 15
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 font-normal truncate mt-0.5">
                        Playground isolado de componentes UI e estados
                      </p>
                    </div>
                  </button>

                  {/* Submenu 4: Storybook & Regressão Visual */}
                  <button
                    type="button"
                    onClick={() => handleSelectTab("storybook-workbench")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer ${
                      activeTab === "storybook-workbench"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <ProjectIcon name="AppWindow" size={16} className="mt-0.5 text-pink-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Storybook & Regressão</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 rounded text-pink-300">
                          Visual Gate
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 font-normal truncate mt-0.5">
                        Storybook 8, estados UI e testes de regressão
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* -------------------------------------------------------- */}
          {/* CATEGORIA 2: AUDITORIA & CONFORMIDADE (Menu com Submenus) */}
          {/* -------------------------------------------------------- */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("AUDIT")}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                isAuditCategoryActive
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm"
                  : "bg-neutral-800/80 text-neutral-300 border-neutral-700/60 hover:text-white hover:bg-neutral-800"
              }`}
              title="Abrir menu de Auditoria, Documentação e Código"
            >
              <ProjectIcon name="ClipboardList" size={16} className="text-amber-400" />
              <span className="whitespace-nowrap">Auditoria & Código</span>
              <ProjectIcon name={openDropdown === "AUDIT" ? "ChevronUp" : "ChevronDown"} size={12} className="text-neutral-400" />
            </button>

            {/* Submenu Suspenso */}
            {openDropdown === "AUDIT" && (
              <div className="absolute left-0 mt-2 w-72 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border-b border-neutral-800 flex items-center justify-between">
                  <span>Conformidade & Análise</span>
                  <span className="text-amber-400 font-bold">3 Telas</span>
                </div>

                <div className="mt-1 space-y-1">
                  {/* Submenu 4: Matriz QA */}
                  <button
                    type="button"
                    onClick={() => handleSelectTab("checklist")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer ${
                      activeTab === "checklist"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <ProjectIcon name="ClipboardList" size={16} className="mt-0.5 text-amber-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Matriz QA</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 rounded">
                          18 Itens
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 font-normal truncate mt-0.5">
                        Checklist e matriz de requisitos de segurança
                      </p>
                    </div>
                  </button>

                  {/* Submenu 5: Doc Técnica AppSec */}
                  <button
                    type="button"
                    onClick={() => handleSelectTab("tech-docs")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer ${
                      activeTab === "tech-docs"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <ProjectIcon name="BookOpen" size={16} className="mt-0.5 text-amber-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Doc Técnica AppSec</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 rounded">
                          11 Módulos
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 font-normal truncate mt-0.5">
                        Arquitetura RPC, atomicidade e concorrência
                      </p>
                    </div>
                  </button>

                  {/* Submenu 6: Upload & Análise */}
                  <button
                    type="button"
                    onClick={() => handleSelectTab("file-studio")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer ${
                      activeTab === "file-studio"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <ProjectIcon name="Folder" size={16} className="mt-0.5 text-amber-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Upload & Análise</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 rounded">
                          Multi-Stack
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 font-normal truncate mt-0.5">
                        Inspeção de código estático (AST) e varredura
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* -------------------------------------------------------- */}
          {/* CATEGORIA 3: LOGS & SQUADS (Menu com Submenus) */}
          {/* -------------------------------------------------------- */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("LOGS")}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                isLogsCategoryActive
                  ? "bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-sm"
                  : "bg-neutral-800/80 text-neutral-300 border-neutral-700/60 hover:text-white hover:bg-neutral-800"
              }`}
              title="Abrir menu de Console de Logs, Prompts e Playbooks por Squad"
            >
              <ProjectIcon name="Scroll" size={16} className="text-purple-400" />
              <span className="whitespace-nowrap">Logs & Squads</span>
              <ProjectIcon name={openDropdown === "LOGS" ? "ChevronUp" : "ChevronDown"} size={12} className="text-neutral-400" />
            </button>

            {/* Submenu Suspenso */}
            {openDropdown === "LOGS" && (
              <div className="absolute left-0 mt-2 w-72 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border-b border-neutral-800 flex items-center justify-between">
                  <span>Diagnóstico & Playbooks</span>
                  <span className="text-purple-400 font-bold">3 Telas</span>
                </div>

                <div className="mt-1 space-y-1">
                  {/* Submenu 7: Console de Logs & Correções (Visão Geral) */}
                  <button
                    type="button"
                    onClick={() => handleSelectTab("qa-logs")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer ${
                      activeTab === "qa-logs"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <ProjectIcon name="Scroll" size={16} className="mt-0.5 text-purple-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Console de Logs & Correções</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 rounded">
                          Geral
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 font-normal truncate mt-0.5">
                        Terminal unificado de logs, telemetria e tarefas
                      </p>
                    </div>
                  </button>

                  {/* Submenu 8: Logs SuperAdmin */}
                  <button
                    type="button"
                    onClick={() => handleSelectTab("qa-logs", "LOGS")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer ${
                      activeTab === "qa-logs" && qaLogsSubTab === "LOGS"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <ProjectIcon name="Crown" size={16} className="mt-0.5 text-purple-300" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Logs SuperAdmin</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-purple-500/30 text-purple-200 rounded">
                          Prompts IA
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 font-normal truncate mt-0.5">
                        Console de telemetria e prompts prontos para copiar
                      </p>
                    </div>
                  </button>

                  {/* Submenu 9: Correções / Squads */}
                  <button
                    type="button"
                    onClick={() => handleSelectTab("qa-logs", "PLAYBOOKS")}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-start gap-2.5 transition-colors cursor-pointer ${
                      activeTab === "qa-logs" && qaLogsSubTab === "PLAYBOOKS"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-neutral-200 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    <ProjectIcon name="Wrench" size={16} className="mt-0.5 text-amber-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">Correções / Squads</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/30 text-amber-200 rounded">
                          5 Squads
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 font-normal truncate mt-0.5">
                        Playbooks categorizados: Back, Sec, Front, DevOps, DPO
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* ZONA 2: AÇÕES GLOBAIS DE EXECUÇÃO, ATUALIZAÇÃO E RELATÓRIO */}
        {/* ======================================================== */}
        <div className="flex items-center flex-wrap gap-2 border-t lg:border-t-0 border-neutral-800 pt-2 lg:pt-0">
          {/* Botão 1: Atualizar dados dos testes */}
          <button
            type="button"
            onClick={handleManualRefreshTestsData}
            disabled={isRealtimeRefreshing}
            className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border transition-all cursor-pointer shadow-md ${
              isRealtimeRefreshing
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30 cursor-wait"
                : "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-neutral-950 font-black border-amber-400/50 hover:brightness-110 active:scale-95 shadow-amber-500/20"
            }`}
            title="Executar varredura em tempo real no projeto, Supabase e atualizar os Big Numbers"
          >
            <ProjectIcon
              name="RefreshCw"
              size={14}
              className={isRealtimeRefreshing ? "animate-spin text-neutral-950" : "text-neutral-950"}
            />
            <span className="whitespace-nowrap">
              {isRealtimeRefreshing ? "Atualizando Dados..." : "Atualizar dados dos testes"}
            </span>
          </button>

          {/* Botão 2: Executar todas as suítes */}
          <button
            type="button"
            onClick={runAllTests}
            disabled={isRunningAll || isRealtimeRefreshing}
            className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border transition-all cursor-pointer shadow-md ${
              isRunningAll
                ? "bg-neutral-800 text-neutral-400 border-neutral-700 cursor-wait"
                : "bg-amber-600 hover:bg-amber-500 text-white border-amber-500/50 active:scale-95 shadow-amber-600/25"
            }`}
            title="Executar todas as 31 suítes e varredura de arquivos sequencialmente"
          >
            <ProjectIcon
              name="Play"
              size={14}
              className={isRunningAll ? "animate-pulse text-white fill-white" : "text-white fill-white"}
            />
            <span className="whitespace-nowrap">
              {isRunningAll ? "Executando Suítes..." : "Executar todas as suítes"}
            </span>
          </button>

          {/* Botão 3: Copiar relatório geral */}
          <button
            type="button"
            onClick={exportFullQAReport}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700/80 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Copiar relatório completo executivo em Markdown para a área de transferência"
          >
            <ProjectIcon name="Copy" size={14} className="text-neutral-300" />
            <span className="whitespace-nowrap">Copiar relatório geral</span>
          </button>

          {/* Botão 4: Resetar estados */}
          <button
            type="button"
            onClick={onResetStates}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-neutral-800/80 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-300 border border-neutral-700/60 hover:border-rose-800/50 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Limpar resultados de testes executados e resetar parâmetros de injeção de caos"
          >
            <ProjectIcon name="RotateCcw" size={14} className="text-neutral-300" />
            <span className="whitespace-nowrap">Resetar estados</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SELETOR DE ATALHO RÁPIDO: ABAS DIRETAS (Acesso Rápido) */}
      {/* ======================================================== */}
      <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center overflow-x-auto gap-1 text-xs no-scrollbar">
        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider px-1.5 py-0.5 mr-1 shrink-0">
          Acesso Direto:
        </span>

        {/* Central de testes */}
        <button
          type="button"
          onClick={() => handleSelectTab("test-runner")}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "test-runner"
              ? "bg-amber-600 text-white font-bold"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          <ProjectIcon name="FlaskConical" size={13} className={activeTab === "test-runner" ? "text-white" : "text-amber-400"} />
          <span>Central de testes</span>
        </button>

        {/* Simulações */}
        <button
          type="button"
          onClick={() => handleSelectTab("security-simulations")}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "security-simulations"
              ? "bg-amber-600 text-white font-bold"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          <ProjectIcon name="Zap" size={13} className={activeTab === "security-simulations" ? "text-white" : "text-amber-400"} />
          <span>Simulações</span>
        </button>

        {/* Componentes Sandbox */}
        <button
          type="button"
          onClick={() => handleSelectTab("sandbox")}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "sandbox"
              ? "bg-amber-600 text-white font-bold"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          <ProjectIcon name="Palette" size={13} className={activeTab === "sandbox" ? "text-white" : "text-amber-400"} />
          <span>Componentes Sandbox</span>
        </button>

        {/* Matriz QA */}
        <button
          type="button"
          onClick={() => handleSelectTab("checklist")}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "checklist"
              ? "bg-amber-600 text-white font-bold"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          <ProjectIcon name="ClipboardList" size={13} className={activeTab === "checklist" ? "text-white" : "text-amber-400"} />
          <span>Matriz QA</span>
        </button>

        {/* Doc Técnica AppSec */}
        <button
          type="button"
          onClick={() => handleSelectTab("tech-docs")}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "tech-docs"
              ? "bg-amber-600 text-white font-bold"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          <ProjectIcon name="BookOpen" size={13} className={activeTab === "tech-docs" ? "text-white" : "text-amber-400"} />
          <span>Doc Técnica AppSec</span>
        </button>

        {/* Upload & Análise */}
        <button
          type="button"
          onClick={() => handleSelectTab("file-studio")}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "file-studio"
              ? "bg-amber-600 text-white font-bold"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          <ProjectIcon name="Folder" size={13} className={activeTab === "file-studio" ? "text-white" : "text-amber-400"} />
          <span>Upload & Análise</span>
        </button>

        {/* Console de Logs & Correções */}
        <button
          type="button"
          onClick={() => handleSelectTab("qa-logs")}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "qa-logs"
              ? "bg-purple-600 text-white font-bold"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
          }`}
        >
          <ProjectIcon name="Scroll" size={13} className={activeTab === "qa-logs" ? "text-white" : "text-purple-400"} />
          <span>Console de Logs & Correções</span>
        </button>
      </div>
    </nav>
  );
}
