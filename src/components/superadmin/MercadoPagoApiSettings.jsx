/**
 * src/components/superadmin/MercadoPagoApiSettings.jsx
 *
 * Menu Oficial "Mercado Pago API" do Painel Super Admin.
 * - Suporta as duas frentes: "Credenciais de Teste" e "Credenciais de Produção"
 * - Chave seletora para ativar e desativar credenciais (Teste vs Produção)
 * - Chave mestre de Ativação Geral do Gateway (Habilitado / Pausado)
 * - Painel de Log em Tempo Real (200, 201, 400, 401, 403, 500) sem terminal do IDE Cursor
 * - Disparadores de teste de requisições e simulações para ver retornos na hora
 * - Simulador de Pix com confirmação de pagamento
 * - Guia passo a passo integrado para obtenção de credenciais
 */

import { useState, useEffect, useMemo } from "react";
import ProjectIcon from "../ui/ProjectIcon";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Badge from "../ui/Badge";
import Modal from "../ui/Modal";
import { mercadoPagoConfigStore } from "../../services/mercadoPagoConfigStore";
import { mercadoPagoLogger } from "../../services/mercadoPagoLogger";
import { mercadoPago } from "../../services/mercadoPagoService";
import { apiKeysConfigStore } from "../../services/apiKeysConfigStore";

export default function MercadoPagoApiSettings({ onOpenPixCheckoutModal }) {
  // Configurações atuais
  const [config, setConfig] = useState(() => mercadoPagoConfigStore.getConfig());
  const [activeCredTab, setActiveCredTab] = useState(
    config.activeEnvironment === "production" ? "production" : "sandbox"
  );

  // Formulário de Credenciais Editáveis
  const [sandboxForm, setSandboxForm] = useState(config.sandbox);
  const [productionForm, setProductionForm] = useState(config.production);

  // Visibilidade de chaves secretas
  const [showSandboxToken, setShowSandboxToken] = useState(false);
  const [showSandboxSecret, setShowSandboxSecret] = useState(false);
  const [showTestPassword, setShowTestPassword] = useState(false);
  const [showProdToken, setShowProdToken] = useState(false);
  const [showProdSecret, setShowProdSecret] = useState(false);

  // Estado de salvamento com delay de 2s e spinner
  const [isSaving, setIsSaving] = useState(false);

  // Modo de URL do Webhook (Ambiente atual ou Produção customizada)
  const [webhookMode, setWebhookMode] = useState("current");

  // Feedback de gravação e ações
  const [feedbackMsg, setFeedbackMsg] = useState({ text: "", type: "success" });

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setFeedbackMsg({ text: `${label} copiado com sucesso!`, type: "success" });
    setTimeout(() => setFeedbackMsg({ text: "", type: "success" }), 3500);
  };

  // Logs em Tempo Real
  const [logs, setLogs] = useState(() => mercadoPagoLogger.getLogs());
  const [selectedLog, setSelectedLog] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchLogTerm, setSearchLogTerm] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  // Simulador de Pix Interativo
  const [pixModalData, setPixModalData] = useState(null);
  const [pixSimStatus, setPixSimStatus] = useState("pending");
  const [copiedPix, setCopiedPix] = useState(false);

  // Modal do Guia de Configuração
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Estados do Modal Spinner de Transição de Ambiente (Reset & Reload)
  const [isSwitchingEnv, setIsSwitchingEnv] = useState(false);
  const [switchingToEnv, setSwitchingToEnv] = useState(null); // 'sandbox' | 'production'
  const [switchProgressStep, setSwitchProgressStep] = useState(1);
  const [switchStatusMessage, setSwitchStatusMessage] = useState("");

  // Sincroniza estado com a store e o logger
  useEffect(() => {
    // Verifica se acabamos de recarregar após troca de ambiente
    try {
      const storedToast = sessionStorage.getItem("superadmin_mode_switched_toast");
      if (storedToast) {
        showFeedback(storedToast, "success");
        sessionStorage.removeItem("superadmin_mode_switched_toast");
      }
    } catch (_err) {
      /* ignore storage error */
    }

    const unsubConfig = mercadoPagoConfigStore.subscribe((newCfg) => {
      setConfig(newCfg);
      setSandboxForm(newCfg.sandbox);
      setProductionForm(newCfg.production);
    });

    const unsubLogger = mercadoPagoLogger.subscribe((_, allLogs) => {
      setLogs([...allLogs]);
    });

    return () => {
      unsubConfig();
      unsubLogger();
    };
  }, []);

  const showFeedback = (text, type = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg({ text: "", type: "success" }), 4500);
  };

  // Alterna o ambiente ativo com Modal Spinner, Reset de Telemetria e Recarga de Página
  const handleToggleEnvironment = async (targetEnv) => {
    // Se o gateway já estiver nesse ambiente e a aba for a mesma, apenas avisa
    if (config.activeEnvironment === targetEnv && activeCredTab === targetEnv) {
      showFeedback(
        `O Gateway já está ativo no Modo ${targetEnv === "production" ? "PRODUÇÃO (Transações Reais)" : "TESTE / SANDBOX (Transações Simuladas)"}.`,
        targetEnv === "production" ? "warning" : "success"
      );
      return;
    }

    // Inicia o Modal Spinner com status
    setSwitchingToEnv(targetEnv);
    setIsSwitchingEnv(true);
    setSwitchProgressStep(1);
    setSwitchStatusMessage(
      targetEnv === "production"
        ? "Alterando para Modo Produção (Live)..."
        : "Alterando para Modo Teste (Sandbox)..."
    );

    // Passo 1: Salvar configuração no Store Central e propagar para SSOT
    mercadoPagoConfigStore.setEnvironment(targetEnv);
    setActiveCredTab(targetEnv);
    apiKeysConfigStore.syncWithMercadoPagoStore();
    apiKeysConfigStore.saveConfig({}).catch(() => {});

    // Salva preferências no sessionStorage para manter o usuário exatamente nesta tela
    try {
      sessionStorage.setItem("superadmin_active_tab", "payments");
      sessionStorage.setItem("superadmin_apikeys_subtab", "mercadopago");
      sessionStorage.setItem(
        "superadmin_mode_switched_toast",
        `Ambiente alternado com sucesso para Modo ${
          targetEnv === "production" ? "PRODUÇÃO (Transações Reais)" : "TESTE (Transações Simuladas)"
        }! Dados, credenciais e telemetria foram reinicializados.`
      );
    } catch (_err) {
      /* ignore storage error */
    }

    // Passo 2: Purgar telemetria e logs residuais (garante isolamento estrito)
    await new Promise((resolve) => setTimeout(resolve, 450));
    setSwitchProgressStep(2);
    const newLog = mercadoPagoLogger.resetOnEnvironmentSwitch(targetEnv);
    setSelectedLog(newLog || null);
    setStatusFilter("all");
    setSearchLogTerm("");

    // Atualiza os formulários com as credenciais limpas do ambiente alvo
    const freshConfig = mercadoPagoConfigStore.getConfig();
    setConfig(freshConfig);
    setSandboxForm({ ...freshConfig.sandbox });
    setProductionForm({ ...freshConfig.production });

    // Passo 3: Recarregar página para receber dados limpos
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSwitchProgressStep(3);

    await new Promise((resolve) => setTimeout(resolve, 400));
    try {
      window.location.reload();
    } catch {
      setIsSwitchingEnv(false);
      showFeedback(
        `Ambiente alterado para Modo ${
          targetEnv === "production" ? "PRODUÇÃO" : "TESTE"
        } com sucesso!`,
        targetEnv === "production" ? "warning" : "success"
      );
    }
  };

  // Alterna o status do gateway (Ativar / Desativar)
  const handleToggleGatewayEnabled = () => {
    const nextState = !config.isEnabled;
    mercadoPagoConfigStore.setIsEnabled(nextState);
    showFeedback(
      nextState
        ? "Integração Mercado Pago HABILITADA em todo o SaaS."
        : "Integração Mercado Pago PAUSADA. Novas cobranças bloqueadas.",
      nextState ? "success" : "warning"
    );
  };

  // Validação em tempo real das chaves
  const sandboxValidation = useMemo(
    () => mercadoPagoConfigStore.validateCredentials("sandbox", sandboxForm),
    [sandboxForm]
  );
  const prodValidation = useMemo(
    () => mercadoPagoConfigStore.validateCredentials("production", productionForm),
    [productionForm]
  );

  // Salvar credenciais com delay de 2 segundos e spinner antes de exibir confirmação
  const handleSaveCredentials = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      mercadoPagoConfigStore.saveConfig({
        sandbox: sandboxForm,
        production: productionForm,
      });

      // Sincroniza e consolida no gerenciador global SSOT de chaves de API
      apiKeysConfigStore.syncWithMercadoPagoStore();
      apiKeysConfigStore.saveConfig({}).catch(() => {});

      // Resetar e atualizar o estado do componente "Console de Logs & Telemetria em Tempo Real"
      const newEntry = mercadoPagoLogger.resetOnCredentialsSaved(
        config.activeEnvironment,
        `Credenciais atualizadas com sucesso. O Console de Logs & Telemetria foi reinicializado para novos testes no ambiente ${
          config.activeEnvironment === "production" ? "PRODUÇÃO (LIVE)" : "TESTE (SANDBOX)"
        }.`
      );

      // Reseta filtros, termo de busca e seleciona o log de inicialização
      setStatusFilter("all");
      setSearchLogTerm("");
      setSelectedLog(newEntry || null);

      showFeedback("Credenciais salvas com sucesso e Console de Logs reinicializado!", "success");
    } finally {
      setIsSaving(false);
    }
  };

  // Ações de Disparo de Teste no Console de Logs com ISOLAMENTO ESTRITO
  const handleTriggerHealthCheck = async (targetMode) => {
    setIsSimulating(true);
    try {
      // Determina o ambiente a ser testado com isolamento estrito:
      // 1. Se targetMode for explicitamente passado ('production' ou 'sandbox'), usa-o sem exceção.
      // 2. Se não for passado, avalia a aba de credenciais aberta (activeCredTab), ou o ambiente configurado no gateway.
      const effectiveEnv =
        targetMode ||
        activeCredTab ||
        config.activeEnvironment ||
        "sandbox";

      const creds = effectiveEnv === "production" ? productionForm : sandboxForm;

      const res = await mercadoPago.triggerHealthCheck({
        publicKey: creds.publicKey,
        accessToken: creds.accessToken,
        environment: effectiveEnv,
      });

      // Feedback detalhado na tela com status HTTP, conta conectada e métodos de pagamento
      showFeedback(
        res.message,
        res.status === 200 ? "success" : res.status === 400 ? "warning" : "error"
      );

      // Auto-seleciona imediatamente o log gerado no console de telemetria
      const latestLogs = mercadoPagoLogger.getLogs();
      if (latestLogs && latestLogs.length > 0) {
        setSelectedLog(latestLogs[0]);
      }
    } catch (err) {
      showFeedback(`Erro ao testar conectividade: ${err.message}`, "error");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleTriggerPixCreation = async () => {
    setIsSimulating(true);
    try {
      const res = await mercadoPago.createPixPayment({
        planId: "pro",
        amount: 149.90,
        tenantId: "tenant_teste_superadmin",
        payerEmail: "superadmin_test@barbersaas.com",
        payerFirstName: "Carlos",
        description: "Teste de Emissão Pix - Super Admin Console",
      });
      setPixModalData(res);
      setPixSimStatus("pending");
      showFeedback(`Cobrança Pix gerada com sucesso: HTTP 201 Created (ID: ${res.id})`);
    } catch (err) {
      showFeedback(`Erro ao gerar Pix: ${err.message}`, "error");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulateWebhook = async () => {
    setIsSimulating(true);
    try {
      await mercadoPago.triggerSimulatedWebhookApproved();
      if (pixModalData) {
        setPixSimStatus("approved");
      }
      showFeedback("Notificação de Webhook enviada: HTTP 200 OK (Pagamento Aprovado)");
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtragem de Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      // Filtro de Status
      if (statusFilter === "2xx" && (item.statusCode < 200 || item.statusCode >= 300)) return false;
      if (statusFilter === "4xx" && (item.statusCode < 400 || item.statusCode >= 500)) return false;
      if (statusFilter === "5xx" && item.statusCode < 500) return false;
      if (statusFilter === "webhook" && item.method !== "WEBHOOK") return false;

      // Filtro Textual
      if (searchLogTerm.trim()) {
        const query = searchLogTerm.toLowerCase();
        const matchesEndpoint = item.endpoint.toLowerCase().includes(query);
        const matchesMethod = item.method.toLowerCase().includes(query);
        const matchesStatus = String(item.statusCode).includes(query);
        const matchesEnv = item.environment.toLowerCase().includes(query);
        const matchesId = item.id.toLowerCase().includes(query);
        return matchesEndpoint || matchesMethod || matchesStatus || matchesEnv || matchesId;
      }
      return true;
    });
  }, [logs, statusFilter, searchLogTerm]);

  // Estatísticas Rápidas dos Logs
  const logStats = useMemo(() => {
    const total = logs.length;
    const ok2xx = logs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length;
    const err4xx = logs.filter((l) => l.statusCode >= 400 && l.statusCode < 500).length;
    const err5xx = logs.filter((l) => l.statusCode >= 500).length;
    const avgLatency =
      total > 0 ? Math.round(logs.reduce((acc, l) => acc + (l.latencyMs || 0), 0) / total) : 0;
    return { total, ok2xx, err4xx, err5xx, avgLatency };
  }, [logs]);

  // Cor do badge de status HTTP
  const getStatusColor = (code) => {
    if (code >= 200 && code < 300) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    if (code >= 400 && code < 500) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    if (code >= 500) return "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse";
    return "bg-neutral-800 text-neutral-300 border-neutral-700";
  };

  const currentOrigin = typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "https://barbersaas.com.br";
  const webhookUrl = webhookMode === "current"
    ? `${currentOrigin}/api/mercadopago/webhook`
    : "https://barbersaas.com.br/api/mercadopago/webhook";

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-12">
      {/* 1. CABEÇALHO DO MÓDULO & CHAVES SELETORAS MASTER */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border border-sky-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <ProjectIcon name="Zap" size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Mercado Pago API</span>
                <span className="text-xs font-mono font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/40">
                  V06 Multi-Tenant
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Gerencie credenciais de <strong>Homologação (Teste)</strong> e <strong>Produção (Live)</strong>,
              monitore retornos HTTP (200, 400, 500) em tempo real e simule transações Pix sem necessidade do terminal.
            </p>
          </div>

          {/* CONTROLE 1 E CONTROLE 2: CHAVES SELETORAS */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Chave Seletora 1: Ativação Master do Gateway */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-2.5 flex items-center gap-3 backdrop-blur-xs">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Gateway Status</span>
                <span className={`text-xs font-bold ${config.isEnabled ? "text-emerald-400" : "text-neutral-400"}`}>
                  {config.isEnabled ? "● Habilitado" : "○ Em Pausa"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleGatewayEnabled}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.isEnabled ? "bg-emerald-600" : "bg-neutral-700"
                }`}
                title={config.isEnabled ? "Pausar Gateway" : "Ativar Gateway"}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    config.isEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Chave Seletora 2: Alternador de Ambiente (Teste vs Produção) */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-1.5 flex items-center gap-1 backdrop-blur-xs">
              <button
                type="button"
                onClick={() => handleToggleEnvironment("sandbox")}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  config.activeEnvironment === "sandbox"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <ProjectIcon name="FlaskConical" size={14} className="text-amber-400" />
                <span>Modo Teste (Sandbox)</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleEnvironment("production")}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  config.activeEnvironment === "production"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <ProjectIcon name="Rocket" size={14} className="text-amber-400" />
                <span>Modo Produção (Live)</span>
              </button>
            </div>

            {/* Botão Guia de Configuração */}
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Ver Guia Passo a Passo do Mercado Pago"
            >
              <ProjectIcon name="HelpCircle" size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Guia da API</span>
            </button>
          </div>
        </div>

        {/* BANNER INFORMATIVO DO AMBIENTE ATIVO */}
        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Ambiente em Execução:</span>
            {config.activeEnvironment === "sandbox" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold font-mono">
                <ProjectIcon name="FlaskConical" size={13} className="text-amber-400 shrink-0" />
                <span>SANDBOX ATIVO • Cartões Fictícios &amp; Pix sem débito real</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold font-mono">
                <ProjectIcon name="Rocket" size={13} className="text-amber-400 shrink-0" />
                <span>PRODUÇÃO ATIVA • Cobranças e Pix reais no banco</span>
              </span>
            )}
          </div>

          <div className="text-[11px] text-neutral-400 font-mono">
            {config.isEnabled ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Gateway pronto para emitir Pix
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Transações pausadas pelo Super Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* FEEDBACK DE AÇÃO */}
      {feedbackMsg.text && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between shadow-md transition-all ${
            feedbackMsg.type === "error"
              ? "bg-red-950/60 border-red-500/50 text-red-300"
              : feedbackMsg.type === "warning"
              ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
              : "bg-amber-950/40 border-amber-500/50 text-amber-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "error" ? (
              <ProjectIcon name="AlertCircle" size={15} className="text-red-400 shrink-0" />
            ) : feedbackMsg.type === "warning" ? (
              <ProjectIcon name="AlertTriangle" size={15} className="text-amber-400 shrink-0" />
            ) : (
              <ProjectIcon name="CheckCircle2" size={15} className="text-amber-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg({ text: "", type: "success" })}
            className="text-neutral-400 hover:text-white cursor-pointer ml-3"
            title="Fechar"
          >
            <ProjectIcon name="X" size={14} className="text-neutral-400 hover:text-amber-400" />
          </button>
        </div>
      )}

      {/* 2. ÁREA DE CREDENCIAIS (DUAS FRENTES ISOLADAS: TESTE vs PRODUÇÃO) */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ProjectIcon name="Key" size={17} className="text-amber-400" />
              <span>Configuração das Frentes de Credenciais</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Configure as chaves separadamente. Alterne o ambiente na chave seletora acima para testar ou publicar.
            </p>
          </div>

          {/* ABAS DAS DUAS FRENTES */}
          <div className="flex items-center gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveCredTab("sandbox")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeCredTab === "sandbox"
                  ? "bg-neutral-800 text-amber-300 shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <ProjectIcon name="FlaskConical" size={14} className="text-amber-400" />
              <span>Credenciais de Teste</span>
              {config.activeEnvironment === "sandbox" && (
                <span className="text-[9px] bg-amber-500/30 text-amber-200 px-1 rounded font-mono">
                  EM USO
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveCredTab("production")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeCredTab === "production"
                  ? "bg-neutral-800 text-emerald-300 shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <ProjectIcon name="Rocket" size={14} className="text-amber-400" />
              <span>Credenciais de Produção</span>
              {config.activeEnvironment === "production" && (
                <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-1 rounded font-mono">
                  EM USO
                </span>
              )}
            </button>
          </div>
        </div>

        {/* FRENTE 1: CREDENCIAIS DE TESTE (SANDBOX) */}
        {activeCredTab === "sandbox" && (
          <div className="space-y-5">
            <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-300/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <ProjectIcon name="FlaskConical" size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-200 block font-bold">Ambiente de Testes Oficial (Mercado Pago Developers):</strong>
                  Suporta credenciais que iniciam tanto com <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-300 font-mono">APP_USR-</code> quanto com <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-300 font-mono">TEST-</code>, vinculadas à sua aplicação e conta de teste. Nenhum valor real é cobrado.
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {config.activeEnvironment !== "sandbox" && (
                  <button
                    type="button"
                    onClick={() => handleToggleEnvironment("sandbox")}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-500/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Definir Modo Teste como ambiente ativo do Gateway no SaaS"
                  >
                    <ProjectIcon name="Zap" size={13} className="text-amber-400" />
                    <span>Ativar Modo Teste</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={() => handleTriggerHealthCheck("sandbox")}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-md font-black"
                  title="Testar Conectividade com a API do Mercado Pago usando as Credenciais de Teste (Sandbox)"
                >
                  <ProjectIcon name="Activity" size={14} className="text-neutral-950" />
                  <span>Testar Conectividade (Ping Teste)</span>
                </button>
              </div>
            </div>

            {/* CHAVES DE API DE TESTE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-300">Chave Pública de Teste (Public Key)</label>
                  {sandboxForm.publicKey && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sandboxForm.publicKey, "Public Key")}
                      className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer font-bold"
                    >
                      Copiar
                    </button>
                  )}
                </div>
                <Input
                  value={sandboxForm.publicKey}
                  onChange={(e) => setSandboxForm((prev) => ({ ...prev, publicKey: e.target.value }))}
                  placeholder="APP_USR-6829f043-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  helperText="Chave pública de teste recebida do painel Developers."
                />
                {sandboxForm.publicKey && (
                  <div className="mt-1">
                    {(sandboxForm.publicKey.startsWith("APP_USR-") || sandboxForm.publicKey.startsWith("TEST-")) ? (
                      <span className="text-[10px] text-amber-300 font-mono font-bold flex items-center gap-1.5">
                        <ProjectIcon name="CheckCircle2" size={13} className="text-amber-400" />
                        <span>Formato de chave verificado ({sandboxForm.publicKey.substring(0, 12)}...)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5">
                        <ProjectIcon name="Key" size={13} className="text-neutral-500" />
                        <span>Chave customizada inserida</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-300">Token de Acesso de Teste (Access Token)</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSandboxToken((p) => !p)}
                      className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                    >
                      {showSandboxToken ? "Ocultar" : "Exibir"}
                    </button>
                    {sandboxForm.accessToken && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(sandboxForm.accessToken, "Access Token")}
                        className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer font-bold"
                      >
                        Copiar
                      </button>
                    )}
                  </div>
                </div>
                <Input
                  type={showSandboxToken ? "text" : "password"}
                  value={sandboxForm.accessToken}
                  onChange={(e) => setSandboxForm((prev) => ({ ...prev, accessToken: e.target.value }))}
                  placeholder="APP_USR-678898107351752-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  helperText="Utilizado server-side para gerar cobranças Pix e Checkout Pro."
                />
                {sandboxForm.accessToken && (
                  <div className="mt-1">
                    {(sandboxForm.accessToken.startsWith("APP_USR-") || sandboxForm.accessToken.startsWith("TEST-")) ? (
                      <span className="text-[10px] text-amber-300 font-mono font-bold flex items-center gap-1.5">
                        <ProjectIcon name="CheckCircle2" size={13} className="text-amber-400" />
                        <span>Formato de Access Token verificado ({sandboxForm.accessToken.substring(0, 15)}...)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5">
                        <ProjectIcon name="Lock" size={13} className="text-neutral-500" />
                        <span>Token customizado inserido</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-300">Segredo HMAC do Webhook de Teste (Secret)</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSandboxForm((prev) => ({ ...prev, webhookSecret: "whsec_test_8f4a7c1b5e39d20a46f8271035cb" }));
                        showFeedback("Segredo de teste restaurado para o padrão!");
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer font-bold flex items-center gap-1"
                      title="Restaurar o segredo HMAC padrão de teste"
                    >
                      <ProjectIcon name="RotateCcw" size={11} className="text-amber-400" />
                      <span>Restaurar Padrão</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                          .map((b) => b.toString(16).padStart(2, "0"))
                          .join("");
                        setSandboxForm((prev) => ({ ...prev, webhookSecret: `whsec_test_${randomHex}` }));
                        showFeedback("Novo segredo HMAC de teste gerado!");
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1"
                      title="Gerar uma nova chave de teste aleatória"
                    >
                      <ProjectIcon name="Sparkles" size={11} className="text-emerald-400" />
                      <span>Gerar Novo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSandboxSecret((p) => !p)}
                      className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                    >
                      {showSandboxSecret ? "Ocultar" : "Exibir"}
                    </button>
                    {sandboxForm.webhookSecret && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(sandboxForm.webhookSecret, "Webhook Secret")}
                        className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer font-bold"
                      >
                        Copiar
                      </button>
                    )}
                  </div>
                </div>
                <Input
                  type={showSandboxSecret ? "text" : "password"}
                  value={sandboxForm.webhookSecret}
                  onChange={(e) => setSandboxForm((prev) => ({ ...prev, webhookSecret: e.target.value }))}
                  placeholder="whsec_test_xxxxxxxxxxxxxxxx"
                  helperText="Valida o cabeçalho criptográfico x-signature nas notificações recebidas do Mercado Pago."
                />
                {!sandboxForm.webhookSecret && (
                  <div className="mt-1.5 p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300 flex items-center justify-between">
                    <span>Campo vazio. Deseja restaurar o código padrão de teste?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSandboxForm((prev) => ({ ...prev, webhookSecret: "whsec_test_8f4a7c1b5e39d20a46f8271035cb" }));
                        showFeedback("Segredo restaurado: whsec_test_8f4a7c1b5e39d20a46f8271035cb");
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold border border-amber-500/40 cursor-pointer flex items-center gap-1"
                    >
                      <ProjectIcon name="RotateCcw" size={11} className="text-amber-400" />
                      <span>Preencher whsec_test...</span>
                    </button>
                  </div>
                )}
                <div className="mt-1.5 text-[10px] text-neutral-400 flex items-start gap-1">
                  <span className="text-sky-400 font-bold">Onde encontrar no Mercado Pago:</span>
                  <span>Developers &gt; Sua Aplicação ({sandboxForm.appId || "6788981073517529"}) &gt; <strong>Notificações / Webhooks</strong> &gt; Campo <strong>Chave Secreta</strong>. Para ambiente de teste, use a chave padrão ou gere uma nova.</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-300">Nº da Aplicação (Application ID)</label>
                  {sandboxForm.appId && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sandboxForm.appId, "Nº da Aplicação")}
                      className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer font-bold"
                    >
                      Copiar
                    </button>
                  )}
                </div>
                <Input
                  value={sandboxForm.appId || ""}
                  onChange={(e) => setSandboxForm((prev) => ({ ...prev, appId: e.target.value }))}
                  placeholder="Ex: 6788981073517529"
                  helperText="ID numérico da sua aplicação no painel Mercado Pago Developers."
                />
              </div>
            </div>

            {/* SEÇÃO ESPECÍFICA: DADOS DA CONTA E USUÁRIO DE TESTE */}
            <div className="bg-neutral-950/80 border border-amber-500/30 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <ProjectIcon name="UserCheck" size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Dados das Credenciais de Teste (Usuário de Teste &amp; Aplicação)</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">
                        Sandbox Data
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Utilize estas credenciais para autenticar pagamentos simulados no fluxo de checkout.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 font-mono">Pronto para testes</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* User ID */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-bold uppercase text-[10px]">User ID</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sandboxForm.userId, "User ID")}
                      className="text-sky-400 hover:text-sky-300 font-bold text-[10px] cursor-pointer"
                    >
                      Copiar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sandboxForm.userId || ""}
                    onChange={(e) => setSandboxForm((prev) => ({ ...prev, userId: e.target.value }))}
                    placeholder="3081058128"
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs font-mono p-1.5 rounded-lg outline-none"
                  />
                </div>

                {/* Usuário de Teste */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-bold uppercase text-[10px]">Usuário de Teste</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sandboxForm.testUser, "Usuário de Teste")}
                      className="text-sky-400 hover:text-sky-300 font-bold text-[10px] cursor-pointer"
                    >
                      Copiar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sandboxForm.testUser || ""}
                    onChange={(e) => setSandboxForm((prev) => ({ ...prev, testUser: e.target.value }))}
                    placeholder="TESTUSER4679213206535377554"
                    className="w-full bg-neutral-950 border border-neutral-800 text-amber-300 text-xs font-mono p-1.5 rounded-lg outline-none"
                  />
                </div>

                {/* Senha do Usuário de Teste */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-bold uppercase text-[10px]">Senha de Teste</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowTestPassword((p) => !p)}
                        className="text-neutral-400 hover:text-white text-[10px] cursor-pointer"
                      >
                        {showTestPassword ? "Ocultar" : "Ver"}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(sandboxForm.testPassword, "Senha de Teste")}
                        className="text-sky-400 hover:text-sky-300 font-bold text-[10px] cursor-pointer"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                  <input
                    type={showTestPassword ? "text" : "password"}
                    value={sandboxForm.testPassword || ""}
                    onChange={(e) => setSandboxForm((prev) => ({ ...prev, testPassword: e.target.value }))}
                    placeholder="77xOpUPGzn"
                    className="w-full bg-neutral-950 border border-neutral-800 text-sky-400 text-xs font-mono p-1.5 rounded-lg outline-none"
                  />
                </div>

                {/* Código de Verificação */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-bold uppercase text-[10px]">Código Verificação</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sandboxForm.verificationCode, "Código de Verificação")}
                      className="text-sky-400 hover:text-sky-300 font-bold text-[10px] cursor-pointer"
                    >
                      Copiar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sandboxForm.verificationCode || ""}
                    onChange={(e) => setSandboxForm((prev) => ({ ...prev, verificationCode: e.target.value }))}
                    placeholder="058128"
                    className="w-full bg-neutral-950 border border-neutral-800 text-emerald-400 text-xs font-mono p-1.5 rounded-lg outline-none font-bold tracking-widest text-center"
                  />
                </div>
              </div>

              {/* CARD DE COLA RÁPIDA PARA TESTE DE COMPRA NO CHECKOUT */}
              <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <ProjectIcon name="Zap" size={14} className="text-amber-400" />
                  <span className="text-neutral-300">
                    Acesso Rápido ao Test User para login no Mercado Pago durante checkout:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sandboxForm.testUser, "Usuário")}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 font-mono text-[11px] font-bold cursor-pointer transition-all"
                  >
                    Copiar Usuário: {sandboxForm.testUser ? `${sandboxForm.testUser.substring(0, 10)}...` : "TESTUSER"}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sandboxForm.testPassword, "Senha")}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-sky-300 border border-neutral-700 font-mono text-[11px] font-bold cursor-pointer transition-all"
                  >
                    Copiar Senha
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sandboxForm.verificationCode, "Código")}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border border-neutral-700 font-mono text-[11px] font-bold cursor-pointer transition-all"
                  >
                    Código: {sandboxForm.verificationCode || "058128"}
                  </button>
                </div>
              </div>
            </div>

            {sandboxValidation.warnings.length > 0 && (
              <div className="p-3 bg-amber-950/40 border border-amber-800 rounded-xl text-xs text-amber-300 space-y-1">
                {sandboxValidation.warnings.map((w, idx) => (
                  <p key={idx} className="flex items-center gap-1.5">
                    <ProjectIcon name="AlertTriangle" size={14} className="text-amber-400 shrink-0" />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FRENTE 2: CREDENCIAIS DE PRODUÇÃO (LIVE) */}
        {activeCredTab === "production" && (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-xs text-emerald-300/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <ProjectIcon name="ShieldAlert" size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-200 block font-bold">Ambiente Oficial de Produção (Live):</strong>
                  Use suas credenciais oficiais que iniciam com <code className="bg-emerald-950/60 px-1 py-0.5 rounded text-emerald-300 font-mono">APP_USR-</code>.
                  Quando ativadas, barbearias e clientes pagam via Pix e Cartão reais direto na sua conta Mercado Pago.
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {config.activeEnvironment !== "production" && (
                  <button
                    type="button"
                    onClick={() => handleToggleEnvironment("production")}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Definir Modo Produção como ambiente ativo do Gateway no SaaS"
                  >
                    <ProjectIcon name="Rocket" size={13} className="text-emerald-400" />
                    <span>Ativar Modo Produção</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={() => handleTriggerHealthCheck("production")}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-md font-black"
                  title="Testar Conectividade com a API do Mercado Pago usando as Credenciais de Produção"
                >
                  <ProjectIcon name="Activity" size={14} className="text-neutral-950" />
                  <span>Testar Conectividade (Ping Real)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Chave Pública de Produção (Public Key)"
                  value={productionForm.publicKey}
                  onChange={(e) => setProductionForm((prev) => ({ ...prev, publicKey: e.target.value }))}
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  helperText="Chave pública definitiva de produção para pagamentos reais."
                />
                {productionForm.publicKey && (
                  <div className="mt-1">
                    {productionForm.publicKey.startsWith("APP_USR-") ? (
                      <span className="text-[10px] text-amber-300 font-mono font-bold flex items-center gap-1.5">
                        <ProjectIcon name="CheckCircle2" size={13} className="text-amber-400" />
                        <span>Formato de produção verificado (APP_USR-...)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1.5">
                        <ProjectIcon name="AlertTriangle" size={13} className="text-amber-400" />
                        <span>Atenção: Chaves de produção do Mercado Pago iniciam com APP_USR-</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-300">Token de Acesso de Produção (Access Token)</label>
                  <button
                    type="button"
                    onClick={() => setShowProdToken((p) => !p)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                  >
                    {showProdToken ? "Ocultar" : "Exibir"}
                  </button>
                </div>
                <Input
                  type={showProdToken ? "text" : "password"}
                  value={productionForm.accessToken}
                  onChange={(e) => setProductionForm((prev) => ({ ...prev, accessToken: e.target.value }))}
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  helperText="Mantenha em sigilo estrito. Usado para criar pagamentos reais."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-300">Segredo HMAC do Webhook de Produção (Secret)</label>
                  <button
                    type="button"
                    onClick={() => setShowProdSecret((p) => !p)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                  >
                    {showProdSecret ? "Ocultar" : "Exibir"}
                  </button>
                </div>
                <Input
                  type={showProdSecret ? "text" : "password"}
                  value={productionForm.webhookSecret}
                  onChange={(e) => setProductionForm((prev) => ({ ...prev, webhookSecret: e.target.value }))}
                  placeholder="whsec_prod_xxxxxxxxxxxxxxxx"
                  helperText="Assinatura de segurança gerada no painel de Webhooks do Mercado Pago."
                />
              </div>

              <div>
                <Input
                  label="Application ID / Client ID de Produção (Opcional)"
                  value={productionForm.appId || ""}
                  onChange={(e) => setProductionForm((prev) => ({ ...prev, appId: e.target.value }))}
                  placeholder="Ex: 7050222041"
                  helperText="ID da sua aplicação oficial em produção."
                />
              </div>
            </div>

            {prodValidation.errors.length > 0 && (
              <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-300 space-y-1">
                {prodValidation.errors.map((e, idx) => (
                  <p key={idx} className="flex items-center gap-1.5">
                    <ProjectIcon name="AlertCircle" size={14} className="text-red-400 shrink-0" />
                    <span>{e}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* URL OFICIAL DE WEBHOOK COMPARTILHADA */}
        <div className="pt-2 border-t border-neutral-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <ProjectIcon name="Globe" size={14} className="text-sky-400" />
              <span>URL de Webhook para Notificação Instantânea de Pagamentos:</span>
            </label>
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-neutral-400">Modo de URL:</span>
              <button
                type="button"
                onClick={() => setWebhookMode("current")}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                  webhookMode === "current"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Ambiente Atual (Preview/Dev)
              </button>
              <button
                type="button"
                onClick={() => setWebhookMode("production")}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                  webhookMode === "production"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Domínio Produção (barbersaas.com.br)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="w-full bg-neutral-950 border border-neutral-800 text-sky-400 text-xs font-mono p-2.5 rounded-xl outline-none select-all"
            />
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                showFeedback("URL do Webhook copiada para a área de transferência!");
              }}
              className="text-xs py-2 px-3 shrink-0 font-bold"
            >
              Copiar URL
            </Button>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed">
            {webhookMode === "production" ? (
              <span className="flex items-center gap-1.5">
                <ProjectIcon name="Info" size={13} className="text-amber-400 shrink-0" />
                <span>
                  <strong className="text-neutral-300">Domínio Fictício de Exemplo:</strong> <code className="text-amber-300">barbersaas.com.br</code> representa o domínio customizado definitivo da sua barbearia quando o SaaS estiver publicado na nuvem com DNS próprio.
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <ProjectIcon name="Info" size={13} className="text-amber-400 shrink-0" />
                <span>
                  <strong className="text-neutral-300">URL Real Ativa do Ambiente:</strong> Esta é a URL em execução nesta instância de desenvolvimento. Cadastre no painel Mercado Pago Developers para receber notificações de <em>Pagamentos (payment)</em>.
                </span>
              </span>
            )}
          </p>
        </div>

        {/* BOTÃO SALVAR COM SPINNER DE 2 SEGUNDOS */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
          <div className="text-[11px] text-neutral-400">
            Status das Credenciais de {activeCredTab === "sandbox" ? "Teste" : "Produção"}:{" "}
            <span className="text-white font-bold">
              {activeCredTab === "sandbox"
                ? sandboxValidation.isValid ? "Formato Válido" : "Incompleto"
                : prodValidation.isValid ? "Formato Válido" : "Incompleto"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              disabled={isSaving}
              onClick={handleSaveCredentials}
              className="text-xs py-2 px-5 bg-sky-600 hover:bg-sky-500 font-extrabold cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-75 transition-all"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Salvando credenciais...</span>
                </>
              ) : (
                <>
                  <ProjectIcon name="Save" size={14} />
                  <span>Salvar Credenciais</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 3. PAINEL DE TELEMETRIA & LOGS EM TEMPO REAL (SEM TERMINAL DO CURSOR) */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ProjectIcon name="Terminal" size={18} className="text-emerald-400" />
                <span>Console de Logs &amp; Telemetria em Tempo Real (Retorno 200, 400, 500)</span>
              </h2>
            </div>
            <p className="text-xs text-neutral-400">
              Acompanhe respostas da API Mercado Pago ao vivo no painel sem necessidade de abrir o terminal do IDE Cursor.
            </p>
          </div>

          {/* CARDS DE ESTATÍSTICAS RÁPIDAS */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 flex items-center gap-2">
              <span className="text-neutral-400">Total:</span>
              <span className="font-bold text-white font-mono">{logStats.total}</span>
            </div>
            <div className="bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/50 flex items-center gap-2">
              <span className="text-emerald-400">2xx Sucesso:</span>
              <span className="font-bold text-emerald-300 font-mono">{logStats.ok2xx}</span>
            </div>
            <div className="bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-800/50 flex items-center gap-2">
              <span className="text-amber-400">4xx Erro:</span>
              <span className="font-bold text-amber-300 font-mono">{logStats.err4xx}</span>
            </div>
            <div className="bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-800/50 flex items-center gap-2">
              <span className="text-red-400">5xx Falha:</span>
              <span className="font-bold text-red-300 font-mono">{logStats.err5xx}</span>
            </div>
            <div className="bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 flex items-center gap-2">
              <span className="text-neutral-400">Latência Méd:</span>
              <span className="font-bold text-sky-400 font-mono">{logStats.avgLatency}ms</span>
            </div>
          </div>
        </div>

        {/* BARRA DE DISPARADORES DE TESTE RÁPIDO (EXECUTA SEM TERMINAL!) */}
        <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-neutral-300 flex items-center gap-1.5">
              <ProjectIcon name="Play" size={14} className="text-sky-400" />
              <span>Disparadores Interativos de Teste (Gere eventos imediatos para inspecionar):</span>
            </span>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-neutral-400">Gateway Ativo:</span>
              <strong
                className={
                  config.activeEnvironment === "production"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }
              >
                {config.activeEnvironment === "production"
                  ? "PRODUÇÃO (LIVE)"
                  : "TESTE (SANDBOX)"}
              </strong>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Botão de Ping no Modo Teste (Sandbox) com isolamento garantido */}
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => handleTriggerHealthCheck("sandbox")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm ${
                activeCredTab === "sandbox"
                  ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 shadow-amber-500/10"
                  : "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700"
              }`}
              title="Testar Conectividade com a API do Mercado Pago usando estritamente as Credenciais de Teste (Sandbox)"
            >
              <ProjectIcon name="FlaskConical" size={14} className="text-amber-400" />
              <span>Ping Modo Teste</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SANDBOX
              </span>
            </button>

            {/* Botão de Ping no Modo Produção (Live) com isolamento garantido */}
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => handleTriggerHealthCheck("production")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm ${
                activeCredTab === "production"
                  ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10"
                  : "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700"
              }`}
              title="Testar Conectividade com a API do Mercado Pago usando estritamente as Credenciais de Produção (Live)"
            >
              <ProjectIcon name="Rocket" size={14} className="text-emerald-400" />
              <span>Ping Modo Produção</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                LIVE
              </span>
            </button>

            <button
              type="button"
              disabled={isSimulating}
              onClick={handleTriggerPixCreation}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              title="Emite uma cobrança Pix de teste e abre o modal de checkout"
            >
              <ProjectIcon name="Zap" size={14} className="text-emerald-400" />
              <span>Emitir Pix de Teste (201 Created)</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">CHECKOUT</span>
            </button>

            <button
              type="button"
              disabled={isSimulating}
              onClick={handleSimulateWebhook}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              title="Simula a confirmação de pagamento do Pix como se o cliente tivesse pago no banco"
            >
              <ProjectIcon name="Bell" size={14} className="text-purple-400" />
              <span>Simular Confirmação Webhook</span>
              <span className="text-[9px] bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded font-mono font-bold">LOCAL TEST</span>
            </button>
          </div>

          <div className="pt-2 border-t border-neutral-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>
                <strong>Operações Reais:</strong> O botão <em>Ping Real</em> consulta diretamente os servidores do Mercado Pago via Server Proxy. Todas as requisições e webhooks disparados pelo sistema serão registrados abaixo em tempo real.
              </span>
            </span>
          </div>
        </div>

        {/* FILTROS E BUSCA DO LOG */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <span className="text-neutral-400 mr-1 font-bold">Filtrar:</span>
            {["all", "2xx", "4xx", "5xx", "webhook"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-2.5 py-1 rounded-md font-bold cursor-pointer transition-all ${
                  statusFilter === f
                    ? "bg-neutral-700 text-white"
                    : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
              >
                {f === "all"
                  ? "Todos"
                  : f === "2xx"
                  ? "2xx Sucesso"
                  : f === "4xx"
                  ? "4xx Erro"
                  : f === "5xx"
                  ? "5xx Falha"
                  : "Webhooks"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <input
              type="text"
              placeholder="Buscar por endpoint, ID..."
              value={searchLogTerm}
              onChange={(e) => setSearchLogTerm(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs px-3 py-1.5 rounded-lg outline-none w-full sm:w-48"
            />
            <button
              type="button"
              onClick={() => mercadoPagoLogger.clearLogs()}
              className="px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg border border-neutral-800 cursor-pointer font-bold shrink-0"
              title="Limpar todos os logs"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `mercadopago_logs_${Date.now()}.json`;
                a.click();
              }}
              className="px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg border border-neutral-800 cursor-pointer font-bold shrink-0"
              title="Exportar logs como JSON"
            >
              Exportar
            </button>
          </div>
        </div>

        {/* FEED DE LOGS (TABELA / TERMINAL VISUAL) */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden font-mono text-xs shadow-inner">
          <div className="bg-neutral-900/80 px-4 py-2 border-b border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 font-sans font-bold">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block"></span>
              <span className="ml-2 font-mono text-neutral-300">Live Telemetry Stream</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-500">Clique em qualquer linha para inspecionar Payload</span>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-neutral-900">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 font-sans">
                Nenhum log registrado para os filtros selecionados. Use os botões de teste acima para disparar requisições!
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(isSelected ? null : log)}
                    className={`p-3 transition-colors cursor-pointer hover:bg-neutral-900/60 ${
                      isSelected ? "bg-neutral-900 border-l-4 border-sky-400" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {/* Status Code */}
                        <span
                          className={`px-2 py-0.5 rounded font-black border text-[11px] ${getStatusColor(
                            log.statusCode
                          )}`}
                        >
                          {log.statusCode} {log.statusText}
                        </span>

                        {/* Método */}
                        <span className="text-sky-400 font-bold">{log.method}</span>

                        {/* Endpoint */}
                        <span className="text-neutral-200">{log.endpoint}</span>

                        {/* Ambiente */}
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            log.environment === "sandbox"
                              ? "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                              : "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                          }`}
                        >
                          {log.environment.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
                        <span className="text-neutral-400">{log.latencyMs}ms</span>
                        <span className="text-neutral-500">{log.formattedTime}</span>
                        <span className="text-neutral-600">{isSelected ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {/* Resumo de erro ou detalhe inline */}
                    {log.errorSummary && (
                      <div className="mt-1 text-[11px] text-red-400/90 pl-1 font-sans">
                        ↳ Motivo: {log.errorSummary}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* DETALHE DO LOG SELECIONADO (PAYLOAD INSPECTOR) */}
        {selectedLog && (
          <div className="bg-neutral-950 border border-sky-500/40 rounded-xl p-4 space-y-3 font-mono text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">Inspeção Detalhada da Requisição:</span>
                <span className="text-sky-400">{selectedLog.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-neutral-400 hover:text-amber-400 cursor-pointer flex items-center gap-1 text-xs"
              >
                <ProjectIcon name="X" size={13} className="text-amber-400" />
                <span>Fechar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase text-neutral-400 block mb-1">
                  Request Payload (Enviado):
                </span>
                <pre className="bg-neutral-900 p-3 rounded-lg overflow-x-auto text-[11px] text-emerald-300 max-h-52">
                  {selectedLog.requestPayload
                    ? JSON.stringify(selectedLog.requestPayload, null, 2)
                    : "// Sem corpo na requisição (GET / ping)"}
                </pre>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase text-neutral-400 block mb-1">
                  Response Payload (Recebido do Mercado Pago):
                </span>
                <pre className="bg-neutral-900 p-3 rounded-lg overflow-x-auto text-[11px] text-sky-300 max-h-52">
                  {selectedLog.responsePayload
                    ? JSON.stringify(selectedLog.responsePayload, null, 2)
                    : "// Nenhuma resposta"}
                </pre>
              </div>
            </div>

            {selectedLog.headers && (
              <div>
                <span className="text-[11px] font-bold uppercase text-neutral-400 block mb-1">
                  Headers da Transação:
                </span>
                <div className="bg-neutral-900 p-2.5 rounded-lg text-[11px] text-neutral-300 space-y-1">
                  {Object.entries(selectedLog.headers).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-neutral-500 font-bold">{k}:</span>
                      <span className="text-neutral-200">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL SPINNER: TRANSIÇÃO DE AMBIENTE (RESET & RELOAD COM ESTADO LIMPO) */}
      <Modal
        isOpen={isSwitchingEnv}
        onClose={() => {}}
        title=""
        size="md"
      >
        <div className="text-center p-3 sm:p-5 space-y-6">
          {/* Dual Glow Ring Spinner */}
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full animate-ping opacity-25 ${
                switchingToEnv === "production" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <div
              className={`w-16 h-16 rounded-full border-4 border-t-transparent animate-spin ${
                switchingToEnv === "production"
                  ? "border-emerald-500 border-r-emerald-300"
                  : "border-amber-500 border-r-amber-300"
              }`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <ProjectIcon
                name={switchingToEnv === "production" ? "Rocket" : "FlaskConical"}
                size={24}
                className={switchingToEnv === "production" ? "text-emerald-400" : "text-amber-400"}
              />
            </div>
          </div>

          <div>
            <span
              className={`inline-block text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase mb-2 ${
                switchingToEnv === "production"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              }`}
            >
              {switchingToEnv === "production" ? "Produção (Live)" : "Teste (Sandbox)"}
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {switchStatusMessage}
            </h3>
            <p className="text-xs text-neutral-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
              Resetando o estado da aplicação, isolando credenciais e recarregando o painel para receber os dados do novo ambiente.
            </p>
          </div>

          {/* Checklist de Progresso em Tempo Real */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 space-y-2.5 text-left text-xs font-mono">
            <div className="flex items-center gap-2.5">
              {switchProgressStep >= 1 ? (
                <ProjectIcon name="CheckCircle2" size={15} className="text-emerald-400 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-neutral-600 shrink-0" />
              )}
              <span className={switchProgressStep >= 1 ? "text-neutral-200" : "text-neutral-500"}>
                1. Sincronizando variáveis no SSOT ({switchingToEnv === "production" ? "Produção" : "Sandbox"})
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {switchProgressStep >= 2 ? (
                <ProjectIcon name="CheckCircle2" size={15} className="text-emerald-400 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-neutral-600 shrink-0" />
              )}
              <span className={switchProgressStep >= 2 ? "text-neutral-200" : "text-neutral-500"}>
                2. Purgando telemetria e limpando histórico do ambiente anterior
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {switchProgressStep >= 3 ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-neutral-600 shrink-0" />
              )}
              <span className={switchProgressStep >= 3 ? "text-amber-300 font-bold" : "text-neutral-500"}>
                3. Recarregando página e aplicando novas credenciais...
              </span>
            </div>
          </div>

          <div className="text-[11px] text-neutral-500 font-mono">
            Aguarde um instante enquanto a página é atualizada com os novos dados...
          </div>
        </div>
      </Modal>

      {/* 4. MODAL DO SIMULADOR DE PIX INTERATIVO COM QR CODE */}
      <Modal
        isOpen={!!pixModalData}
        onClose={() => setPixModalData(null)}
        title="Simulador de Pagamento Pix (Mercado Pago)"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-neutral-400 font-mono">
              Status: <strong className={pixSimStatus === "approved" ? "text-emerald-400" : "text-amber-400"}>{pixSimStatus.toUpperCase()}</strong>
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setPixModalData(null)}>
                Fechar
              </Button>
              {pixSimStatus === "pending" && (
                <Button
                  variant="primary"
                  onClick={async () => {
                    await handleSimulateWebhook();
                    setPixSimStatus("approved");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
                >
                  Simular Pagamento no App do Banco
                </Button>
              )}
            </div>
          </div>
        }
      >
        {pixModalData && (
          <div className="space-y-4 text-center">
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex justify-between items-center text-xs">
              <span className="text-neutral-400">Valor da Cobrança:</span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                R$ {Number(pixModalData.amount).toFixed(2).replace(".", ",")}
              </span>
            </div>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg border-4 border-sky-500/40 relative">
              <img
                src={pixModalData.qrCodeBase64}
                alt="QR Code Pix Mercado Pago"
                className="w-full h-full object-contain"
              />
              {pixSimStatus === "approved" && (
                <div className="absolute inset-0 bg-emerald-950/90 rounded-xl flex flex-col items-center justify-center text-emerald-300 p-2 backdrop-blur-xs">
                  <ProjectIcon name="CheckCircle" size={42} className="text-emerald-400 mb-1" />
                  <span className="font-bold text-xs">PAGO COM SUCESSO!</span>
                  <span className="text-[10px] text-emerald-400/80">Webhook processado</span>
                </div>
              )}
            </div>

            {/* Copia e Cola */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-neutral-300">Código Pix Copia-e-Cola:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixModalData.qrCode}
                  className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs font-mono p-2.5 rounded-xl outline-none select-all"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(pixModalData.qrCode);
                    setCopiedPix(true);
                    setTimeout(() => setCopiedPix(false), 2500);
                  }}
                  className="text-xs py-2 px-3 shrink-0"
                >
                  {copiedPix ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400">
              Clique em <strong>Simular Pagamento no App do Banco</strong> para testar a notificação oficial do Webhook em tempo real e ver a linha 200 OK entrar no console de logs!
            </p>
          </div>
        )}
      </Modal>

      {/* 5. MODAL GUIA PASSO A PASSO DO MERCADO PAGO */}
      <Modal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="Guia de Integração: Credenciais Mercado Pago"
        footer={
          <Button variant="secondary" onClick={() => setIsGuideOpen(false)}>
            Entendido
          </Button>
        }
      >
        <div className="space-y-4 text-xs text-neutral-300 leading-relaxed text-left">
          <div className="p-3 bg-sky-950/30 border border-sky-800/40 rounded-xl space-y-1">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <ProjectIcon name="ExternalLink" size={14} className="text-sky-400" />
              <span>1. Obter Credenciais de Teste e Produção:</span>
            </h4>
            <p>
              Acesse o portal oficial do desenvolvedor em{" "}
              <a
                href="https://www.mercadopago.com.br/developers/panel"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 underline font-bold"
              >
                mercadopago.com.br/developers/panel
              </a>
              , crie uma aplicação e vá na aba <strong>Credenciais de Teste</strong> e <strong>Credenciais de Produção</strong>.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-white">2. Como funciona a Chave Seletora:</h4>
            <p>
              - No <strong>Modo Teste (Sandbox)</strong>: você pode fazer quantos agendamentos e emissões Pix quiser. Nenhuma cobrança é enviada para os bancos reais.
            </p>
            <p>
              - Quando a barbearia for subir para publicação: basta colocar a chave seletora em <strong>Modo Produção (Live)</strong> e salvar as credenciais com prefixo <code>APP_USR-</code>.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-white">3. Configuração do Webhook:</h4>
            <p>
              No painel do Mercado Pago, adicione uma Notificação Webhook apontando para:
            </p>
            <code className="block p-2 bg-neutral-950 text-sky-400 font-mono text-[11px] rounded-lg break-all">
              {webhookUrl}
            </code>
            <p className="text-neutral-400 text-[11px]">
              Selecione o evento <strong>Pagamentos (payment)</strong>. O sistema validará a assinatura HMAC automaticamente.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
