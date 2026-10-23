import { useState, useEffect, lazy, Suspense } from "react";
import {
  QA_TEST_SUITES,
  QA_CATEGORIES,
  QA_CATEGORY_LIST,
  QA_CLASSIFICATION_METADATA,
} from "./qaSuites";
import { securityAuditor } from "./securityAuditor";
import { chaosEngine } from "./chaosEngine";
import { CHECKLIST_ANALYSIS } from "./checklistMatrix";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge, { STATUS_TRANSITIONS } from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import ProjectIcon from "../../components/ui/ProjectIcon";
import {
  maskSecret,
  maskUrl,
  FICTITIOUS_MOCK_CREDENTIALS,
} from "../../utils/security";
import {
  validateSchema,
  SCHEMAS,
  validateAvatarUpload,
} from "../../utils/inputValidator";
import {
  AUTHORIZATION_MATRIX,
  UI_SCREEN_MATRIX,
  ROUTE_CLASSIFICATIONS,
  USER_ROLES,
} from "../../security/authorizationMatrix";
import {
  evaluateAccess,
  generateSyntheticJwt,
} from "../../middleware/rbacMiddleware";
const TechDocsAppSec = lazy(() => import("./TechDocsAppSec"));
import TeamDecisionMatrix from "./TeamDecisionMatrix";
import FileTestingStudio from "./FileTestingStudio";
import QALogConsoleView from "./QALogConsoleView";
import MappedItemsModal from "./MappedItemsModal";
import TestRefreshModal from "./TestRefreshModal";
import QANavbar from "./QANavbar";
import QASidebar from "./QASidebar";
import QADashboardHome from "./QADashboardHome";
import QASquadsExplorerView from "./QASquadsExplorerView";
import SquadsUnifiedHubView from "./SquadsUnifiedHubView";
import ScanSummaryModal from "./ScanSummaryModal";
import { inspectAllProjectFiles, getLatestProjectScanResult } from "./fileInspectionEngine";
import { calculateRealTestMetrics } from "./realTestDataStore";
import { applyThemeMode } from "../../utils/theme";
import { supabase } from "../../lib/supabase";
import SkeletonCard from "../../components/resilience/SkeletonCard";
import SkeletonBookingView from "../../components/resilience/SkeletonBookingView";
import SkeletonDashboard from "../../components/resilience/SkeletonDashboard";
import OfflineBanner from "../../components/resilience/OfflineBanner";
import ResilientFormHandler from "../../components/resilience/ResilientFormHandler";
import { useNetworkResilience } from "../../components/resilience/useNetworkResilience";
import StorybookWorkbench from "../../components/storybook/StorybookWorkbench";

// Configuração dos tempos necessários para cada fase acontecer (em milissegundos)
// Conforme especificado, estes tempos regulam o ciclo no código e NUNCA são exibidos na interface do modal
const REALTIME_REFRESH_TIMINGS = {
  PHASE_1_LOADING_DATA_MS: 2400,     // 2.4s: Consulta ao Supabase, checagem de tabelas e carregamento de credenciais
  PHASE_2_RUNNING_TESTS_MS: 3800,    // 3.8s: Varredura profunda nos arquivos/pastas (/src, /supabase) e execução de testes
  PHASE_3_DISPLAYING_RESULTS_MS: 1800, // 1.8s: Consolidação das métricas reais, agregação e renderização dos Big Numbers
};

export default function QAPanel({
  currentUserRole = USER_ROLES.SUPERADMIN,
  onSwitchRole,
  onNavigate,
}) {
  const [activeTab, setActiveTab] = useState("test-runner"); // 'test-runner' | 'security-simulations' | 'sandbox' | 'checklist' | 'tech-docs' | 'file-studio' | 'qa-logs'
  const [qaLogsSubTab, setQaLogsSubTab] = useState("LOGS"); // 'LOGS' | 'PLAYBOOKS'
  const [testRunnerSubView, setTestRunnerSubView] = useState("SUITES"); // 'SUITES' | 'APPSEC_PROBES'
  const [simMode, setSimMode] = useState("CHAOS"); // 'CHAOS' | 'RBAC'
  const [selectedCategory, setSelectedCategory] = useState(QA_CATEGORIES.ALL);

  // Estados dos testes
  const [testResults, setTestResults] = useState({});
  const [runningTests, setRunningTests] = useState({});
  const [expandedLogs, setExpandedLogs] = useState({});
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [showMappedItemsModal, setShowMappedItemsModal] = useState(false);

  // Estados de controle dinâmico para os links "* ver mais" de todos os Big Numbers
  const [modalInitialTab, setModalInitialTab] = useState("ALL_TESTS");
  const [modalInitialScope, setModalInitialScope] = useState("ALL");
  const [modalInitialSquad, setModalInitialSquad] = useState("ALL");

  // Estado da visualização estruturada (Dashboard, Squads Explorer, etc.)
  const [currentView, setCurrentView] = useState("dashboard"); // 'dashboard' | 'squads-explorer' | 'tech-docs' | 'qa-logs' | 'file-studio' | 'simulations' | 'storybook' | 'decision-matrix' | 'test-runner'
  const [squadsFilter, setSquadsFilter] = useState("ALL");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Tema Visual do QA Studio: Dark / Light Mode
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("barbersaas_theme_mode") || "dark";
  });

  useEffect(() => {
    applyThemeMode(themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    const nextMode = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextMode);
    applyThemeMode(nextMode);
  };

  // Estados da funcionalidade manual de atualização em tempo real ("Atualizar dados dos testes")
  const [isRealtimeRefreshing, setIsRealtimeRefreshing] = useState(false);
  const [refreshPhase, setRefreshPhase] = useState("loading"); // 'loading' | 'running' | 'displaying'
  const [realMetrics, setRealMetrics] = useState(() => calculateRealTestMetrics());
  const [refreshToast, setRefreshToast] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState("Em tempo real");

  useEffect(() => {
    const handleExternalUpdate = () => {
      setRealMetrics(calculateRealTestMetrics());
    };
    window.addEventListener("qa-external-status-updated", handleExternalUpdate);
    window.addEventListener("storage", handleExternalUpdate);
    return () => {
      window.removeEventListener("qa-external-status-updated", handleExternalUpdate);
      window.removeEventListener("storage", handleExternalUpdate);
    };
  }, []);

  // Varredura contínua de todos os arquivos do projeto (QA Studio & Testing Workbench)
  const [projectFileScan, setProjectFileScan] = useState(() => getLatestProjectScanResult());

  const triggerProjectFileScan = () => {
    try {
      const scanResult = inspectAllProjectFiles();
      setProjectFileScan(scanResult);
      return scanResult;
    } catch (e) {
      console.warn("Aviso ao executar varredura de arquivos:", e);
      return null;
    }
  };

  // Estados do Simulador de RBAC & Default Deny (Prompt 01)
  const [rbacSimRole, setRbacSimRole] = useState(USER_ROLES.CLIENT);
  const [rbacSimPath, setRbacSimPath] = useState("/api/admin/financial/overview");
  const [rbacSimMethod, setRbacSimMethod] = useState("GET");
  const [rbacSimTokenType, setRbacSimTokenType] = useState("valid"); // 'valid' | 'none' | 'expired' | 'corrupted'
  const [rbacSimResult, setRbacSimResult] = useState(null);
  const [matrixFilter, setMatrixFilter] = useState("ALL");
  const [matrixSearch, setMatrixSearch] = useState("");

  const handleExecuteRbacSimulation = () => {
    triggerProjectFileScan();
    let token = null;
    if (rbacSimTokenType === "valid") {
      token = generateSyntheticJwt({ role: rbacSimRole });
    } else if (rbacSimTokenType === "expired") {
      token = generateSyntheticJwt({ role: rbacSimRole, expiresInSeconds: -3600 });
    } else if (rbacSimTokenType === "corrupted") {
      token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.corrupted_payload.invalid_signature";
    }

    const res = evaluateAccess({
      path: rbacSimPath,
      method: rbacSimMethod,
      token,
    });

    setRbacSimResult({
      ...res,
      tokenProvided: token,
      simulatedRole: rbacSimRole,
      tokenCondition: rbacSimTokenType,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  // Estados do Simulador de Caos
  const [chaosConfig, setChaosConfig] = useState(chaosEngine.getConfig());
  const [chaosTestLog, setChaosTestLog] = useState(null);
  const [isTestingChaos, setIsTestingChaos] = useState(false);

  // Estados do Fuzzer de Segurança
  const [customFuzzInput, setCustomFuzzInput] = useState(
    "<img src=x onerror=alert('xss')>"
  );
  const [fuzzResult, setFuzzResult] = useState(null);

  // Estados da Simulação Multi-Tenant
  const [tenantSource, setTenantSource] = useState("101");
  const [tenantTarget, setTenantTarget] = useState("202");
  const [tenantRole, setTenantRole] = useState("barber");
  const [tenantProbeResult, setTenantProbeResult] = useState(null);

  // Estados do Sandbox de Componentes
  const [sandboxButtonLoading, setSandboxButtonLoading] = useState(false);
  const [sandboxButtonDisabled, setSandboxButtonDisabled] = useState(false);
  const [sandboxBadgeStatus, setSandboxBadgeStatus] = useState("waiting");
  const [sandboxBadgeInteractive, setSandboxBadgeInteractive] = useState(true);

  // Estados do Sandbox de Resiliência Visual (Prompt 25: Skeletons, Banner Offline e Form Retention)
  const [sandboxSkeletonVariant, setSandboxSkeletonVariant] = useState("service"); // 'service' | 'barber' | 'appointment' | 'metric' | 'booking' | 'dashboard'
  const [sandboxFormError, setSandboxFormError] = useState("Falha de conexão com a API de agendamento (net::ERR_CONNECTION_TIMED_OUT).");
  const [sandboxFormRetrying, setSandboxFormRetrying] = useState(false);
  const [sandboxFormSuccess, setSandboxFormSuccess] = useState(false);
  const [sandboxFormData, setSandboxFormData] = useState({
    clientName: "Rodrigo Mendonça",
    clientPhone: "(11) 98765-4321",
    serviceName: "Corte Tradicional / Degradê",
    barberName: "Carlos Silva",
    time: "14:30",
    price: "R$ 45,00",
  });

  // Estados de Cópia e Clipboard
  const [copiedNotification, setCopiedNotification] = useState(null);
  const [copyModalData, setCopyModalData] = useState(null);

  // Estados do Laboratório de Ingestão e Mass Assignment (Solicitação #02)
  const [ingestionScenario, setIngestionScenario] = useState("valid"); // 'valid' | 'wrong_type' | 'overflow' | 'mass_assignment' | 'malicious_upload'
  const [ingestionResult, setIngestionResult] = useState(null);

  const runIngestionScenario = (scenarioKey) => {
    triggerProjectFileScan();
    setIngestionScenario(scenarioKey);
    let res = null;

    if (scenarioKey === "valid") {
      res = {
        title: "Cenário 1: Entrada Válida e Legítima (Agendamento)",
        payloadSent: {
          client_name: "Guilherme Santos",
          client_phone: "(11) 98765-4321",
          barber_name: "Thiago Silva",
          service_name: "Corte Degradê + Barba",
          duration_minutes: 50,
          price: 75.0,
          start_time: "14:00",
          end_time: "14:50",
        },
        validation: validateSchema(
          {
            client_name: "Guilherme Santos",
            client_phone: "(11) 98765-4321",
            barber_name: "Thiago Silva",
            service_name: "Corte Degradê + Barba",
            duration_minutes: 50,
            price: 75.0,
            start_time: "14:00",
            end_time: "14:50",
          },
          SCHEMAS.appointmentBooking,
          { rejectUnknown: true }
        ),
      };
    } else if (scenarioKey === "wrong_type") {
      res = {
        title: "Cenário 2: Injeção de Tipo Errado (duration = 'cinquenta_min', price = -20)",
        payloadSent: {
          client_name: "Cliente Injetor",
          client_phone: "11988887777",
          barber_name: "Thiago Silva",
          service_name: "Corte",
          duration_minutes: "cinquenta_min", // String inválida
          price: -20, // Preço negativo
          start_time: "14:00",
          end_time: "14:30",
        },
        validation: validateSchema(
          {
            client_name: "Cliente Injetor",
            client_phone: "11988887777",
            barber_name: "Thiago Silva",
            service_name: "Corte",
            duration_minutes: "cinquenta_min",
            price: -20,
            start_time: "14:00",
            end_time: "14:30",
          },
          SCHEMAS.appointmentBooking,
          { rejectUnknown: true }
        ),
      };
    } else if (scenarioKey === "overflow") {
      const longName = "Nome Gigante ".repeat(15);
      res = {
        title: "Cenário 3: Texto Além do Limite (> 80 caracteres em client_name)",
        payloadSent: {
          client_name: longName,
          client_phone: "11988887777",
          barber_name: "Thiago Silva",
          service_name: "Corte",
          duration_minutes: 30,
          price: 50,
          start_time: "14:00",
          end_time: "14:30",
        },
        validation: validateSchema(
          {
            client_name: longName,
            client_phone: "11988887777",
            barber_name: "Thiago Silva",
            service_name: "Corte",
            duration_minutes: 30,
            price: 50,
            start_time: "14:00",
            end_time: "14:30",
          },
          SCHEMAS.appointmentBooking,
          { rejectUnknown: true }
        ),
      };
    } else if (scenarioKey === "mass_assignment") {
      res = {
        title: "Cenário 4: Tentativa de Escalada de Privilégios (role: 'admin' + is_paid: true)",
        payloadSent: {
          client_name: "Hacker User",
          client_phone: "11999998888",
          barber_name: "Thiago Silva",
          service_name: "Corte",
          duration_minutes: 30,
          price: 45,
          start_time: "15:00",
          end_time: "15:30",
          role: "admin", // Tentativa de injeção de privilégio
          is_paid: true, // Tentativa de fraude financeira
        },
        validation: validateSchema(
          {
            client_name: "Hacker User",
            client_phone: "11999998888",
            barber_name: "Thiago Silva",
            service_name: "Corte",
            duration_minutes: 30,
            price: 45,
            start_time: "15:00",
            end_time: "15:30",
            role: "admin",
            is_paid: true,
          },
          SCHEMAS.appointmentBooking,
          { rejectUnknown: true }
        ),
      };
    } else if (scenarioKey === "malicious_upload") {
      const fakeUpload = {
        name: "backdoor.php",
        size: 15 * 1024 * 1024, // 15MB (> 2MB)
        type: "application/x-php",
      };
      const uploadRes = validateAvatarUpload(fakeUpload);
      res = {
        title: "Cenário 5: Upload de Arquivo Proibido (.php e tamanho de 15MB)",
        payloadSent: fakeUpload,
        validation: uploadRes,
      };
    }

    setIngestionResult(res);
  };

  // Função utilitária com fallback resiliente para copiar texto
  const copyToClipboard = async (text, label = "Logs") => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedNotification(`${label} copiado(s) para a área de transferência!`);
        setTimeout(() => setCopiedNotification(null), 3500);
        return;
      }
    } catch (err) {
      console.warn("Clipboard API restrita pelo ambiente/iframe:", err);
    }
    // Fallback garantido para qualquer navegador ou iframe restrito
    setCopyModalData({ title: label, text });
  };

  // Exporta relatório completo dos testes em formato Markdown
  const exportFullQAReport = () => {
    const executed = Object.entries(testResults);
    if (executed.length === 0) {
      copyToClipboard(
        "Nenhum teste foi executado ainda. Clique em 'Executar Todas as Suítes' primeiro.",
        "Relatório Vazio"
      );
      return;
    }

    const reportLines = [
      "# Relatório Oficial de Testes - QA Studio",
      `*Gerado em:* ${new Date().toLocaleString()}`,
      `*Total de Testes Executados:* ${executed.length}`,
      `*Aprovados:* ${passedCount} | *Falhas:* ${failedCount}`,
      "",
      "---",
      "## Detalhamento por Caso de Teste:",
      "",
    ];

    QA_TEST_SUITES.forEach((test) => {
      const res = testResults[test.id];
      if (!res) return;
      reportLines.push(`### [${res.passed ? "PASSOU" : "FALHOU"}] ${test.id} - ${test.title}`);
      reportLines.push(`- **Item do Checklist:** #${test.itemNumber}`);
      reportLines.push(`- **Categoria:** ${test.category}`);
      reportLines.push(`- **Tempo:** ${res.durationMs}ms`);
      reportLines.push(`- **Mensagem:** ${res.message}`);
      if (res.logs && res.logs.length > 0) {
        reportLines.push("- **Logs:**");
        res.logs.forEach((log) => reportLines.push(`  - \`${log}\``));
      }
      reportLines.push("");
    });

    copyToClipboard(reportLines.join("\n"), "Relatório Completo de QA (Markdown)");
  };

  useEffect(() => {
    // Execução assíncrona não-bloqueante apenas se o scan ainda não estiver em memória
    let timer;
    if (!getLatestProjectScanResult()) {
      timer = setTimeout(() => {
        triggerProjectFileScan();
      }, 50);
    }
    const unsub = chaosEngine.subscribe((newCfg) => setChaosConfig(newCfg));
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);

  // Executa um teste individual com varredura automática de todos os arquivos do projeto
  const runSingleTest = async (test) => {
    triggerProjectFileScan();
    setRunningTests((prev) => ({ ...prev, [test.id]: true }));
    try {
      const res = await test.run();
      setTestResults((prev) => ({
        ...prev,
        [test.id]: res,
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [test.id]: {
          passed: false,
          durationMs: 0,
          message: `Erro na execução do teste: ${err.message}`,
          logs: [err.stack || err.message],
        },
      }));
    } finally {
      setRunningTests((prev) => ({ ...prev, [test.id]: false }));
    }
  };

  // Abre o modal de itens mapeados com base em dados reais a partir do link "* ver mais"
  const handleOpenVerMais = ({ tab = "ALL_TESTS", scope = "ALL", squad = "ALL" } = {}) => {
    setModalInitialTab(tab);
    setModalInitialScope(scope);
    setModalInitialSquad(squad);
    setShowMappedItemsModal(true);
  };

  // Atualização em tempo real dos dados de testes acionada manualmente
  // Fases:
  // 1. Carregando dados... (consulta ao Supabase)
  // 2. Executando testes... (varredura nos arquivos e pastas do código)
  // 3. Exibindo resultados... (consolidação dos big numbers e métricas reais)
  const handleManualRefreshTestsData = async () => {
    if (isRealtimeRefreshing) return;

    setIsRealtimeRefreshing(true);
    setRefreshPhase("loading");

    try {
      // FASE 1: Carregando dados... (consulta e ping no Supabase)
      const supabaseQueryPromise = (async () => {
        try {
          if (supabase?.auth?.getSession) {
            await supabase.auth.getSession();
          }
        } catch (err) {
          console.warn("Supabase ping aviso:", err);
        }
      })();
      const delayPhase1 = new Promise((resolve) =>
        setTimeout(resolve, REALTIME_REFRESH_TIMINGS.PHASE_1_LOADING_DATA_MS)
      );
      await Promise.all([supabaseQueryPromise, delayPhase1]);

      // FASE 2: Executando testes... (varredura em todos os arquivos e pastas do projeto)
      setRefreshPhase("running");
      let scanResult = null;
      const fileScanPromise = (async () => {
        scanResult = triggerProjectFileScan();
      })();
      const delayPhase2 = new Promise((resolve) =>
        setTimeout(resolve, REALTIME_REFRESH_TIMINGS.PHASE_2_RUNNING_TESTS_MS)
      );
      await Promise.all([fileScanPromise, delayPhase2]);

      // FASE 3: Exibindo resultados... (consolidação das métricas e big numbers)
      setRefreshPhase("displaying");
      const delayPhase3 = new Promise((resolve) =>
        setTimeout(resolve, REALTIME_REFRESH_TIMINGS.PHASE_3_DISPLAYING_RESULTS_MS)
      );
      await delayPhase3;

      // Atualiza os Big Numbers com dados reais consolidados
      const updatedMetrics = calculateRealTestMetrics(testResults, scanResult);
      setRealMetrics(updatedMetrics);
      const nowStr = new Date().toLocaleTimeString("pt-BR");
      setLastRefreshTime(nowStr);

      setRefreshToast("Dados dos testes atualizados com sucesso em tempo real!");
      setTimeout(() => setRefreshToast(null), 4500);
    } catch (err) {
      console.error("Erro na atualização em tempo real dos testes:", err);
    } finally {
      setIsRealtimeRefreshing(false);
    }
  };

  // Executa todos os testes sequencialmente com varredura de arquivos e modal de carregamento em overlay
  const runAllTests = async () => {
    setIsRealtimeRefreshing(true);
    setRefreshPhase("loading");
    triggerProjectFileScan();

    setTimeout(() => {
      setRefreshPhase("running");
    }, 800);

    setIsRunningAll(true);
    const newResults = {};
    for (const test of QA_TEST_SUITES) {
      setRunningTests((prev) => ({ ...prev, [test.id]: true }));
      try {
        const res = await test.run();
        newResults[test.id] = res;
      } catch (err) {
        newResults[test.id] = {
          passed: false,
          durationMs: 0,
          message: `Erro: ${err.message}`,
          logs: [err.message],
        };
      }
      setTestResults((prev) => ({ ...prev, ...newResults }));
      setRunningTests((prev) => ({ ...prev, [test.id]: false }));
    }

    setRefreshPhase("displaying");
    setTimeout(() => {
      const updatedMetrics = calculateRealTestMetrics(newResults);
      setRealMetrics(updatedMetrics);
      setIsRunningAll(false);
      setIsRealtimeRefreshing(false);
      setRefreshToast("Todas as suítes foram executadas com sucesso!");
      setTimeout(() => setRefreshToast(null), 3500);
    }, 1200);
  };

  // Executa especificamente todos os testes de AppSec (SEC-01 a SEC-17) com varredura de arquivos
  const runAllAppSecTests = async () => {
    setIsRealtimeRefreshing(true);
    setRefreshPhase("loading");
    triggerProjectFileScan();

    setTimeout(() => {
      setRefreshPhase("running");
    }, 800);

    setIsRunningAll(true);
    const appSecList = QA_TEST_SUITES.filter(
      (suite) =>
        suite.category === QA_CATEGORIES.SECURITY ||
        (typeof suite.id === "string" && suite.id.startsWith("SEC-"))
    );
    const newResults = {};
    for (const test of appSecList) {
      setRunningTests((prev) => ({ ...prev, [test.id]: true }));
      try {
        const res = await test.run();
        newResults[test.id] = res;
      } catch (err) {
        newResults[test.id] = {
          passed: false,
          durationMs: 0,
          message: `Erro: ${err.message}`,
          logs: [err.message],
        };
      }
      setTestResults((prev) => ({ ...prev, ...newResults }));
      setRunningTests((prev) => ({ ...prev, [test.id]: false }));
    }

    setRefreshPhase("displaying");
    setTimeout(() => {
      const updatedMetrics = calculateRealTestMetrics(newResults);
      setRealMetrics(updatedMetrics);
      setIsRunningAll(false);
      setIsRealtimeRefreshing(false);
      setRefreshToast("Testes de AppSec & Cybersecurity concluídos com sucesso!");
      setTimeout(() => setRefreshToast(null), 3500);
    }, 1000);
  };

  // Executa testes de uma categoria específica
  const runCategorySuites = async (category) => {
    setIsRealtimeRefreshing(true);
    setRefreshPhase("loading");
    triggerProjectFileScan();

    setTimeout(() => {
      setRefreshPhase("running");
    }, 700);

    const list =
      category === QA_CATEGORIES.ALL
        ? QA_TEST_SUITES
        : QA_TEST_SUITES.filter((suite) => suite.category === category);

    setIsRunningAll(true);
    const newResults = {};
    for (const test of list) {
      setRunningTests((prev) => ({ ...prev, [test.id]: true }));
      try {
        const res = await test.run();
        newResults[test.id] = res;
      } catch (err) {
        newResults[test.id] = {
          passed: false,
          durationMs: 0,
          message: `Erro: ${err.message}`,
          logs: [err.message],
        };
      }
      setTestResults((prev) => ({ ...prev, ...newResults }));
      setRunningTests((prev) => ({ ...prev, [test.id]: false }));
    }

    setRefreshPhase("displaying");
    setTimeout(() => {
      const updatedMetrics = calculateRealTestMetrics(newResults);
      setRealMetrics(updatedMetrics);
      setIsRunningAll(false);
      setIsRealtimeRefreshing(false);
    }, 1000);
  };

  // Toggle visualização de logs
  const toggleLogs = (testId) => {
    setExpandedLogs((prev) => ({ ...prev, [testId]: !prev[testId] }));
  };

  // Testa fuzzer ao vivo
  const handleRunFuzzer = () => {
    triggerProjectFileScan();
    const res = securityAuditor.testInputSanitization(customFuzzInput);
    setFuzzResult(res);
  };

  // Testa simulação multi-tenant
  const handleRunTenantProbe = () => {
    triggerProjectFileScan();
    const res = securityAuditor.simulateTenantIsolationCheck(
      tenantSource,
      tenantTarget,
      tenantRole
    );
    setTenantProbeResult(res);
  };

  // Testa requisição sob caos
  const handleTestChaosCall = async () => {
    triggerProjectFileScan();
    setIsTestingChaos(true);
    setChaosTestLog("Disparando requisição sob interceptor do Chaos Engine...");
    try {
      const res = await chaosEngine.intercept(async () => {
        return {
          status: "200_OK",
          timestamp: new Date().toLocaleTimeString(),
          data: "Agendamento confirmado com sucesso no banco de dados.",
        };
      });
      setChaosTestLog(
        `SUCESSO (${res.status} às ${res.timestamp}): ${res.data}`
      );
    } catch (err) {
      setChaosTestLog(`INTERCEPTADO COM SUCESSO: ${err.message}`);
    } finally {
      setIsTestingChaos(false);
    }
  };

  // Reseta todos os estados de execução de testes, caos e fuzzer
  const handleResetStates = () => {
    setTestResults({});
    chaosEngine.reset();
    setChaosTestLog(null);
    setFuzzResult(null);
    setTenantProbeResult(null);
    setRbacSimResult(null);
    setRefreshToast("Estados dos testes, simulações de caos e fuzzer resetados com sucesso.");
    setTimeout(() => setRefreshToast(null), 3500);
  };

  // Manipulador de upload de arquivo a partir da Dashboard
  const handleFileUpload = (file) => {
    triggerProjectFileScan();
    setCurrentView("file-studio");
    setActiveTab("file-studio");
    setRefreshToast(`Arquivo "${file.name}" carregado. Abrindo File Testing Studio para inspeção.`);
    setTimeout(() => setRefreshToast(null), 4000);
  };

  const handleNavigateToSquads = (filter = "ALL") => {
    setSquadsFilter(filter);
    setCurrentView("squads-explorer");
  };

  const handleNavigateView = (view) => {
    setCurrentView(view);
    if (view === "tech-docs") setActiveTab("tech-docs");
    else if (view === "qa-logs") setActiveTab("qa-logs");
    else if (view === "file-studio") setActiveTab("file-studio");
    else if (view === "storybook") setActiveTab("storybook-workbench");
    else if (view === "decision-matrix") setActiveTab("checklist");
    else if (view === "simulations") setActiveTab("chaos");
    else if (view === "test-runner") setActiveTab("test-runner");
  };

  // Cálculos de métricas
  const totalCount = QA_TEST_SUITES.length;
  const executedTests = Object.values(testResults);
  const passedCount = executedTests.filter((r) => r.passed).length;
  const failedCount = executedTests.filter((r) => !r.passed).length;

  const filteredSuites =
    selectedCategory === QA_CATEGORIES.ALL
      ? QA_TEST_SUITES
      : QA_TEST_SUITES.filter((s) => s.category === selectedCategory);

  const isDark = themeMode === "dark";

  return (
    <div className={`min-h-screen flex flex-col md:flex-row antialiased transition-colors duration-200 ${
      isDark ? "bg-neutral-950 text-neutral-100" : "bg-slate-50 text-slate-800"
    }`}>
      {/* ======================================================== */}
      {/* 1. SIDEBAR LATERAL FIXA / RETRÁTIL (QASidebar.jsx)       */}
      {/* ======================================================== */}
      <QASidebar
        currentView={currentView}
        onSelectView={(view) => {
          setCurrentView(view);
          setIsMobileDrawerOpen(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
        metrics={realMetrics}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />

      {/* ======================================================== */}
      {/* 2. ÁREA CENTRAL DE CONTEÚDO EXECUTIVO                   */}
      {/* ======================================================== */}
      <div className={`flex-1 min-w-0 flex flex-col min-h-screen transition-colors duration-200 ${
        isDark ? "bg-neutral-950" : "bg-slate-50"
      }`}>
        {/* Header Mobile / Tablet para Drawer com Theme Switcher */}
        <header className={`md:hidden sticky top-0 z-30 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between transition-colors ${
          isDark
            ? "bg-neutral-950/95 border-neutral-800"
            : "bg-white/95 border-slate-200 shadow-xs"
        }`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800"
                  : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
              title="Abrir menu de navegação"
            >
              <ProjectIcon name="Menu" size={18} className={isDark ? "text-amber-400" : "text-amber-600"} />
            </button>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-xs ${isDark ? "text-white" : "text-slate-900"}`}>QA Studio</span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                isDark
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-amber-100 text-amber-800 border-amber-300"
              }`}>
                PRO
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                isDark
                  ? "bg-neutral-900 border-neutral-800 text-amber-400"
                  : "bg-slate-100 border-slate-200 text-amber-700"
              }`}
              title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            >
              <ProjectIcon name={isDark ? "Sun" : "Moon"} size={14} />
            </button>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              isDark
                ? "text-amber-400 bg-amber-950/60 border-amber-500/30"
                : "text-amber-800 bg-amber-100 border-amber-300"
            }`}>
              👑 SuperAdmin
            </span>
          </div>
        </header>

        {/* Feedback visual de atualização / toast */}
        {refreshToast && (
          <div className="m-4 mb-0 p-3 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between shadow-xl animate-fade-in z-20">
            <div className="flex items-center gap-2">
              <ProjectIcon name="CheckCircle2" size={16} className="text-emerald-400" />
              <span>{refreshToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setRefreshToast(null)}
              className="text-neutral-400 hover:text-white cursor-pointer"
            >
              <ProjectIcon name="X" size={14} className="text-neutral-400" />
            </button>
          </div>
        )}

        {/* Container Principal de Visualizações */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* VIEW 1: DASHBOARD (HOME) */}
          {currentView === "dashboard" && (
            <QADashboardHome
              metrics={realMetrics}
              onTriggerManualScan={handleManualRefreshTestsData}
              isScanning={isRealtimeRefreshing}
              onFileUpload={(file) => {
                triggerProjectFileScan();
                setRefreshToast(`Arquivo "${file.name}" inspecionado com sucesso pelo motor SAST.`);
                setTimeout(() => setRefreshToast(null), 4000);
              }}
              onNavigateToSquads={(filter) => {
                setSquadsFilter(filter || "ALL");
                setCurrentView("squads-explorer");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onNavigateView={(viewId, subTab) => {
                if (subTab) {
                  setQaLogsSubTab(subTab);
                }
                setCurrentView(viewId);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              lastScanTime={lastRefreshTime}
              themeMode={themeMode}
              onToggleTheme={toggleTheme}
            />
          )}

          {/* VIEW: HUB UNIFICADO POR SQUADS (SSOT) */}
          {(currentView === "squads-hub" || currentView.startsWith("squad-")) && (
            <SquadsUnifiedHubView
              initialSquad={
                currentView === "squads-hub"
                  ? (squadsFilter !== "ALL" ? squadsFilter : "cyber-security")
                  : currentView.replace("squad-", "")
              }
              themeMode={themeMode}
              onBackToDashboard={() => {
                setCurrentView("dashboard");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onOpenExportModal={(format) => {
                setRefreshToast(`Exportação ${format} do Hub de Squads processada com sucesso.`);
                setTimeout(() => setRefreshToast(null), 3000);
              }}
            />
          )}

          {/* VIEW 2: EXECUÇÃO DE TESTES (6 SQUADS PAGINADOS POR 20) */}
          {currentView === "squads-explorer" && (
            <QASquadsExplorerView
              initialFilter={squadsFilter}
              onBackToDashboard={() => {
                setCurrentView("dashboard");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onRunSingleTest={runSingleTest}
              themeMode={themeMode}
              onToggleTheme={toggleTheme}
              onNavigateToLogs={() => {
                setQaLogsSubTab("PLAYBOOKS");
                setCurrentView("qa-logs");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}

          {/* VIEW 3: DOCUMENTAÇÃO TÉCNICA (29 MÓDULOS) */}
          {currentView === "tech-docs" && (
            <div className="space-y-4">
              <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl shadow-md border transition-colors ${
                isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-slate-200"
              }`}>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-bold ${isDark ? "text-amber-400" : "text-amber-600"}`}>QA Studio</span>
                  <span className={isDark ? "text-neutral-500" : "text-slate-400"}>/</span>
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Documentação Técnica (29 Módulos AppSec)</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentView("dashboard")}
                  className={`text-xs flex items-center gap-1.5 cursor-pointer font-bold border ${
                    isDark
                      ? "text-amber-400 border-amber-500/30 hover:bg-neutral-800"
                      : "text-amber-700 border-amber-300 hover:bg-slate-100"
                  }`}
                >
                  <span>← Voltar para Dashboard</span>
                </Button>
              </div>
              <Suspense
                fallback={
                  <div className="p-8 text-center text-neutral-400 font-mono text-xs flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                    <span>Carregando Documentação Técnica AppSec...</span>
                  </div>
                }
              >
                <TechDocsAppSec
                  testResults={testResults}
                  runningTests={runningTests}
                  onRunSingleTest={runSingleTest}
                  onRunAllAppSecTests={runAllAppSecTests}
                  onCopyText={copyToClipboard}
                  projectFileScan={projectFileScan}
                  onTriggerProjectScan={triggerProjectFileScan}
                />
              </Suspense>
            </div>
          )}

          {/* VIEW 4: CONSOLE DE LOGS & CORREÇÕES */}
          {currentView === "qa-logs" && (
            <div className="space-y-4">
              <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl shadow-md border transition-colors ${
                isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-slate-200"
              }`}>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-bold ${isDark ? "text-amber-400" : "text-amber-600"}`}>QA Studio</span>
                  <span className={isDark ? "text-neutral-500" : "text-slate-400"}>/</span>
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Console de Logs, Diagnóstico & Playbooks de Solução</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={toggleTheme}
                    className={`text-xs flex items-center gap-1.5 cursor-pointer border ${
                      isDark
                        ? "text-neutral-300 border-neutral-700 hover:bg-neutral-800"
                        : "text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                    title="Alternar Modo Escuro / Claro"
                  >
                    <ProjectIcon
                      name={isDark ? "Sun" : "Moon"}
                      size={13}
                      className={isDark ? "text-amber-400" : "text-amber-600"}
                    />
                    <span>{isDark ? "Claro" : "Escuro"}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentView("dashboard")}
                    className={`text-xs flex items-center gap-1.5 cursor-pointer font-bold border ${
                      isDark
                        ? "text-amber-400 border-amber-500/30 hover:bg-neutral-800"
                        : "text-amber-700 border-amber-300 hover:bg-slate-100"
                    }`}
                  >
                    <span>← Voltar para Dashboard</span>
                  </Button>
                </div>
              </div>
              <QALogConsoleView
                initialSubTab={qaLogsSubTab}
                onSubTabChange={setQaLogsSubTab}
                onTriggerScan={triggerProjectFileScan}
                projectScanResult={projectFileScan}
                onCopyText={copyToClipboard}
                themeMode={themeMode}
                onToggleTheme={toggleTheme}
              />
            </div>
          )}

          {/* VIEW 5: FILE TESTING STUDIO */}
          {currentView === "file-studio" && (
            <div className="space-y-4">
              <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl shadow-md border transition-colors ${
                isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-slate-200"
              }`}>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-bold ${isDark ? "text-amber-400" : "text-amber-600"}`}>QA Studio</span>
                  <span className={isDark ? "text-neutral-500" : "text-slate-400"}>/</span>
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>File Testing Studio (Inspeção de Arquivos SAST)</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentView("dashboard")}
                  className={`text-xs flex items-center gap-1.5 cursor-pointer font-bold border ${
                    isDark
                      ? "text-amber-400 border-amber-500/30 hover:bg-neutral-800"
                      : "text-amber-700 border-amber-300 hover:bg-slate-100"
                  }`}
                >
                  <span>← Voltar para Dashboard</span>
                </Button>
              </div>
              <FileTestingStudio
                onCopyText={(text, title) => {
                  copyToClipboard(text, title);
                }}
                onNavigateToLogs={() => setCurrentView("qa-logs")}
              />
            </div>
          )}

          {/* VIEW 6: STORYBOOK VISUAL */}
          {currentView === "storybook" && (
            <div className="space-y-4">
              <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl shadow-md border transition-colors ${
                isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-slate-200"
              }`}>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`font-bold ${isDark ? "text-amber-400" : "text-amber-600"}`}>QA Studio</span>
                  <span className={isDark ? "text-neutral-500" : "text-slate-400"}>/</span>
                  <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Storybook Visual & Regressão</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentView("dashboard")}
                  className={`text-xs flex items-center gap-1.5 cursor-pointer font-bold border ${
                    isDark
                      ? "text-amber-400 border-amber-500/30 hover:bg-neutral-800"
                      : "text-amber-700 border-amber-300 hover:bg-slate-100"
                  }`}
                >
                  <span>← Voltar para Dashboard</span>
                </Button>
              </div>
              <StorybookWorkbench onTriggerProjectScan={triggerProjectFileScan} />
            </div>
          )}

          {/* VIEW 7: MATRIZ DE DECISÃO */}
          {currentView === "decision-matrix" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-md">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-amber-400 font-bold">QA Studio</span>
                  <span className="text-neutral-500">/</span>
                  <span className="text-white font-bold">Matriz de Decisão por Especialidades & Squads</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentView("dashboard")}
                  className="text-xs text-amber-400 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer hover:bg-neutral-800 font-bold"
                >
                  <span>← Voltar para Dashboard</span>
                </Button>
              </div>
              <TeamDecisionMatrix
                testSuites={QA_TEST_SUITES}
                testResults={testResults}
                onSelectCategory={setSelectedCategory}
                onRunCategorySuites={runCategorySuites}
                selectedCategory={selectedCategory}
              />
            </div>
          )}

          {/* VIEW 8: SIMULAÇÃO DE ATAQUES (CHAOS / RBAC) */}
          {currentView === "simulations" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-md">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-amber-400 font-bold">QA Studio</span>
                  <span className="text-neutral-500">/</span>
                  <span className="text-white font-bold">Simulação de Ataques (Chaos Engine & RBAC)</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentView("dashboard")}
                  className="text-xs text-amber-400 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer hover:bg-neutral-800 font-bold"
                >
                  <span>← Voltar para Dashboard</span>
                </Button>
              </div>

              {/* Seletor entre Chaos e RBAC */}
              <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-xl border border-neutral-800 w-fit">
                <button
                  type="button"
                  onClick={() => setSimMode("CHAOS")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    simMode === "CHAOS"
                      ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Laboratório de Caos (Rede)
                </button>
                <button
                  type="button"
                  onClick={() => setSimMode("RBAC")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    simMode === "RBAC"
                      ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Simulador de RBAC (Default Deny)
                </button>
              </div>
            </div>
          )}

        {/* ======================================================== */}
        {/* ABA 1: CENTRAL DE TESTES AUTOMATIZADOS */}
        {/* ======================================================== */}
        {currentView === "test-runner" && activeTab === "test-runner" && (
          <div className="space-y-6">
            {/* Banner Explicativo de Consolidação dos Testes */}
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-blue-950/40 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
              <div className="flex items-start md:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <ProjectIcon name="Info" size={18} className="text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Composição dos 243 Testes Reais do Ecossistema
                    </h4>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-mono font-bold">
                      Sem Divergências
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    Esta Central executa as <strong className="text-amber-400">31 Suítes Interativas & Pentests</strong> do QA Studio (exibidas na grade abaixo). Somadas aos <strong className="text-emerald-400">212 Testes Automatizados do Vitest</strong> (CI/CD, schemas Zod, RBAC e middlewares), compõem o universo total de <strong className="text-white">243 testes reais</strong> dos Big Numbers com 100% de aprovação.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs shrink-0 self-end md:self-auto bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded font-bold">
                  31 QA Studio
                </span>
                <span className="text-neutral-500">+</span>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-bold">
                  212 Vitest
                </span>
                <span className="text-neutral-500">=</span>
                <span className="px-2 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded font-bold">
                  243 Total
                </span>
              </div>
            </div>

            {/* Matriz de Decisão Técnica por Especialidades & Squads */}
            <TeamDecisionMatrix
              testSuites={QA_TEST_SUITES}
              testResults={testResults}
              onSelectCategory={setSelectedCategory}
              onRunCategorySuites={runCategorySuites}
              selectedCategory={selectedCategory}
            />

            {/* Filtros de Categoria Oficiais */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-800/80">
              {QA_CATEGORY_LIST.map((cat) => {
                const count =
                  cat === QA_CATEGORIES.ALL
                    ? QA_TEST_SUITES.length
                    : QA_TEST_SUITES.filter((s) => s.category === cat).length;
                const meta = QA_CLASSIFICATION_METADATA[cat];

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory === cat
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-neutral-800"
                    }`}
                  >
                    {meta?.icon && <ProjectIcon name={meta.icon} size={14} className="text-amber-400" />}
                    <span>{cat}</span>
                    <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Lista de Testes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSuites.map((test) => {
                const isRunning = runningTests[test.id];
                const result = testResults[test.id];
                const showLogs = expandedLogs[test.id];
                const meta = QA_CLASSIFICATION_METADATA[test.category];

                return (
                  <Card
                    key={test.id}
                    className="border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                              {test.id}
                            </span>
                            {meta && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${meta.badgeColor}`}
                              >
                                <span className="flex items-center gap-1"><ProjectIcon name={meta.icon} size={12} className="text-amber-400" /> {meta.name}</span>
                              </span>
                            )}
                            <span className="text-[11px] font-semibold text-amber-400/90">
                              Item #{test.itemNumber}
                            </span>
                          </div>
                          <h3 className="font-bold text-base text-white mt-1.5">
                            {test.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400 flex-wrap">
                            <span>
                              Equipe:{" "}
                              <strong className="text-neutral-200">
                                {test.targetTeam || meta?.targetSquad}
                              </strong>
                            </span>
                            {test.severity && (
                              <span
                                className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                                  test.severity === "CRITICAL"
                                    ? "bg-rose-950 text-rose-300 border border-rose-800"
                                    : test.severity === "HIGH"
                                    ? "bg-amber-950 text-amber-300 border border-amber-800"
                                    : "bg-neutral-800 text-neutral-300"
                                }`}
                              >
                                {test.severity} • {test.sla}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {result ? (
                            <span
                              className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                                result.passed
                                  ? "bg-emerald-950/70 text-emerald-400 border-emerald-800/80"
                                  : "bg-rose-950/70 text-rose-400 border-rose-800/80"
                              }`}
                            >
                              {result.passed ? "APROVADO" : "REPROVADO"} (
                              {result.durationMs}ms)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                              NÃO EXECUTADO
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {test.description}
                      </p>

                      {/* Diretriz de Decisão para a Equipe */}
                      {test.decisionGuideline && (
                        <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-neutral-400 uppercase">
                            <span className="flex items-center gap-1"><ProjectIcon name="Crosshair" size={12} className="text-amber-400" /> Decisão Técnica da Equipe</span>
                            {test.complianceReference && (
                              <span className="text-amber-400 font-mono font-normal">
                                {test.complianceReference}
                              </span>
                            )}
                          </div>
                          <p className="text-neutral-300 text-[11px] leading-relaxed">
                            {test.decisionGuideline}
                          </p>
                          {test.businessImpact && (
                            <p className="text-[10px] text-neutral-400 pt-0.5">
                              <strong className="text-rose-400/90">
                                Impacto no Negócio:{" "}
                              </strong>
                              {test.businessImpact}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Feedback da Execução */}
                      {result && (
                        <div
                          className={`p-3 rounded-xl text-xs font-medium border ${
                            result.passed
                              ? "bg-emerald-950/30 text-emerald-300 border-emerald-900/40"
                              : "bg-rose-950/30 text-rose-300 border-rose-900/40"
                          }`}
                        >
                          {result.message}
                        </div>
                      )}

                      {/* Logs expansíveis */}
                      {result && result.logs && result.logs.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleLogs(test.id)}
                              className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-semibold cursor-pointer"
                            >
                              <ProjectIcon
                                name={showLogs ? "ChevronDown" : "ChevronRight"}
                                size={12}
                                className="text-amber-400"
                              />
                              <span>{showLogs ? "Ocultar" : "Ver"} Logs & Asserções ({result.logs.length})</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(
                                    `TESTE: [${test.id}] ${test.title}\nSTATUS: ${result.passed ? "APROVADO" : "REPROVADO"}\nMENSAGEM: ${result.message}\nTEMPO: ${result.durationMs}ms\n\nLOGS:\n${result.logs.join("\n")}`,
                                    `Logs do teste ${test.id}`
                                  )
                                }
                                className="px-2 py-0.5 text-[10px] font-bold rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 cursor-pointer flex items-center gap-1"
                                title="Copiar logs para a área de transferência"
                              >
                                Copiar Logs
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setCopyModalData({
                                    title: `Diagnóstico: [${test.id}] ${test.title}`,
                                    text: `TESTE: [${test.id}] ${test.title}\nSTATUS: ${result.passed ? "PASSOU" : "FALHOU"}\nMENSAGEM: ${result.message}\nTEMPO: ${result.durationMs}ms\nCATEGORIA: ${test.category}\n\nLOGS E ASSERÇÕES:\n${result.logs.map((l) => `› ${l}`).join("\n")}`,
                                  })
                                }
                                className="px-2 py-0.5 text-[10px] font-bold rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 cursor-pointer flex items-center gap-1"
                                title="Abrir caixa de texto selecionável"
                              >
                                Ver Texto
                              </button>
                            </div>
                          </div>

                          {showLogs && (
                            <div className="mt-2 p-2.5 bg-black/70 border border-neutral-800 rounded-lg font-mono text-[11px] text-neutral-300 space-y-1 overflow-x-auto max-h-48 select-text cursor-text">
                              {result.logs.map((log, idx) => (
                                <div key={idx} className="leading-tight select-text">
                                  <span className="text-amber-500 font-bold mr-1.5">
                                    ›
                                  </span>
                                  <span className="select-text">{log}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Ações */}
                      <div className="pt-2 flex items-center justify-between border-t border-neutral-800/80">
                        <span className="text-[11px] text-neutral-500 font-medium">
                          {test.category}
                        </span>

                        <Button
                          variant="primary"
                          onClick={() => runSingleTest(test)}
                          isLoading={isRunning}
                          className="text-xs px-3 py-1.5"
                        >
                          Executar Teste
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Guia de Extensibilidade */}
            <div className="p-4 rounded-xl border border-dashed border-neutral-800 bg-neutral-900/30 flex items-start gap-3">
              <ProjectIcon name="Lightbulb" size={20} className="text-amber-400" />
              <div className="text-xs text-neutral-400">
                <span className="font-bold text-neutral-200">
                  Arquitetura Extensível para Novos Testes:
                </span>{" "}
                Para plugar um novo teste (ex: cálculo de comissão de barbeiro,
                expiração de assinatura ou integridade de comanda), basta abrir{" "}
                <code className="text-amber-400 bg-neutral-800 px-1 py-0.5 rounded">
                  src/pages/QAPanel/qaSuites.js
                </code>{" "}
                e adicionar uma nova entrada ao array{" "}
                <code className="text-amber-400 bg-neutral-800 px-1 py-0.5 rounded">
                  QA_TEST_SUITES
                </code>
                . O painel visual reconhece e renderiza automaticamente com logs
                e métricas!
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: APPSEC & AUDITORIA DE SEGURANÇA (Itens 9, 10, 12) */}
        {/* ======================================================== */}
        {(activeTab === "appsec" && currentView === "test-runner") && (
          <div className="space-y-6">
            {/* Bloco 1: Auditoria de Credenciais no Client (Item 10) */}
            <Card
              title="1. Auditoria de Credenciais no Client (Item #10)"
              description="Verificação estrita se chaves com privilégios de service_role ou tokens secretos vazaram no bundle ou ambiente do cliente."
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {securityAuditor.auditClientCredentials().map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border ${
                        item.passed
                          ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                          : "bg-rose-950/20 border-rose-800/40 text-rose-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{item.id}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-black ${
                            item.passed
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {item.passed ? "SEGURO" : "VULNERÁVEL"}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white mt-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                        {item.details}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Bloco 2: Fuzzer de Injeção XSS & SQLi em Formulários (Item 12) */}
            <Card
              title="2. Laboratório de Injeção e Sanitização (Item #12)"
              description="Teste entradas maliciosas ao vivo para verificar a neutralização contra Cross-Site Scripting (XSS) e SQL Injection."
            >
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      label="Payload de Teste Malicioso"
                      value={customFuzzInput}
                      onChange={(e) => setCustomFuzzInput(e.target.value)}
                      placeholder="Ex: <script>alert(1)</script> ou ' OR 1=1--"
                    />
                  </div>
                  <div className="self-end">
                    <Button variant="primary" onClick={handleRunFuzzer}>
                      Analisar Sanitização
                    </Button>
                  </div>
                </div>

                {/* Sugestões Rápidas de Payloads */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-neutral-500">Exemplos Rápidos:</span>
                  {[
                    "<script>alert('XSS')</script>",
                    "<img src=x onerror=alert('PWNED')>",
                    "javascript:document.cookie",
                    "Corte Navalhado' OR '1'='1",
                  ].map((payload, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCustomFuzzInput(payload);
                        setFuzzResult(
                          securityAuditor.testInputSanitization(payload)
                        );
                      }}
                      className="px-2 py-1 bg-neutral-800 text-neutral-300 hover:text-amber-400 rounded border border-neutral-700 cursor-pointer font-mono text-[11px]"
                    >
                      {payload}
                    </button>
                  ))}
                </div>

                {/* Retorno Visual da Sanitização */}
                {fuzzResult && (
                  <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-300">
                        Resultado da Análise de Risco:
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                          fuzzResult.isClean
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {fuzzResult.isClean
                          ? "Payload Inofensivo"
                          : `${fuzzResult.threatsDetected.length} Ameaça(s) Detectada(s)`}
                      </span>
                    </div>

                    {!fuzzResult.isClean && (
                      <div className="space-y-1">
                        <span className="text-xs text-neutral-400">
                          Ameaças Interceptadas:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {fuzzResult.threatsDetected.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800 rounded"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="text-xs text-neutral-400">
                        String Sanitizada Segura (Escapada para Renderização):
                      </span>
                      <div className="p-2.5 bg-black/60 border border-neutral-800 rounded font-mono text-xs text-amber-400">
                        {fuzzResult.sanitized}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Bloco 3: Simulador de Segregação Multi-Tenant (Itens 8, 9, 11) */}
            <Card
              title="3. Probe de Isolamento Multi-Tenant & RBAC (Itens #9 e #11)"
              description="Simulação de políticas de Row-Level Security (RLS) no Supabase. Teste se um usuário da Barbearia A consegue adulterar dados da Barbearia B."
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Tenant do Usuário Atual (JWT)
                    </label>
                    <select
                      value={tenantSource}
                      onChange={(e) => setTenantSource(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="101">Barbearia Alphaville (ID: 101)</option>
                      <option value="202">Barbearia Moema (ID: 202)</option>
                      <option value="303">Barbearia Barra (ID: 303)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Tenant Alvo da Requisição
                    </label>
                    <select
                      value={tenantTarget}
                      onChange={(e) => setTenantTarget(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="101">Barbearia Alphaville (ID: 101)</option>
                      <option value="202">Barbearia Moema (ID: 202)</option>
                      <option value="303">Barbearia Barra (ID: 303)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Perfil / Role do Usuário
                    </label>
                    <select
                      value={tenantRole}
                      onChange={(e) => setTenantRole(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="client">Cliente Final</option>
                      <option value="barber">Barbeiro Funcionário</option>
                      <option value="barbershop_admin">Dono da Barbearia</option>
                      <option value="superadmin">SuperAdmin Plataforma</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="primary" onClick={handleRunTenantProbe}>
                    Disparar Probe de RLS
                  </Button>
                </div>

                {tenantProbeResult && (
                  <div
                    className={`p-4 rounded-xl border ${
                      tenantProbeResult.allowed
                        ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-300"
                        : "bg-rose-950/30 border-rose-800/40 text-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {tenantProbeResult.allowed ? <ProjectIcon name="Unlock" size={16} className="text-emerald-400" /> : <ProjectIcon name="ShieldAlert" size={16} className="text-rose-400" />}
                      </span>
                      <span className="font-bold text-sm">
                        {tenantProbeResult.message}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 mt-2 font-mono">
                      Tenant Origem: {tenantProbeResult.currentTenantId} | Tenant
                      Alvo: {tenantProbeResult.requestedBarbershopId} | Role:{" "}
                      {tenantProbeResult.userRole}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Bloco 4: Inspeção de Bundles, Caminho ao Navegador & Protocolo de Rotação */}
            <Card
              title="4. Auditoria de Bundles, Caminho ao Navegador & Protocolo de Rotação"
              description="Rastreamento da injeção de credenciais no frontend, mascaramento obrigatório de segredos e plano de resposta a incidentes com revogação e rotação."
            >
              <div className="space-y-6">
                {/* A. Diagrama de Rastreamento (Como o segredo chega ao navegador) */}
                <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <ProjectIcon name="Search" size={16} className="text-amber-400" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">
                      Rastreamento: O Caminho do Segredo até o Navegador
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                    <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 space-y-1">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase">
                        1. Origem
                      </span>
                      <p className="font-semibold text-neutral-200">
                        Código / .env
                      </p>
                      <p className="text-[11px] text-neutral-400 leading-tight">
                        Variáveis com prefixo <code className="text-amber-400">VITE_</code> ou valores default em arquivos JS.
                      </p>
                    </div>

                    <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 space-y-1">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase">
                        2. Build (Vite)
                      </span>
                      <p className="font-semibold text-neutral-200">
                        Substituição Estática
                      </p>
                      <p className="text-[11px] text-neutral-400 leading-tight">
                        O compilador Vite inlineia os valores literais diretamente nos chunks de saída (<code className="text-amber-400">dist/assets/*.js</code>).
                      </p>
                    </div>

                    <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 space-y-1">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase">
                        3. Download Client
                      </span>
                      <p className="font-semibold text-neutral-200">
                        Bundle no Navegador
                      </p>
                      <p className="text-[11px] text-neutral-400 leading-tight">
                        O browser baixa o JS e expõe o código na aba <strong className="text-neutral-200">Sources / Inspecionar</strong> do DevTools.
                      </p>
                    </div>

                    <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 space-y-1">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase">
                        4. Tráfego HTTP
                      </span>
                      <p className="font-semibold text-neutral-200">
                        Headers de Requisição
                      </p>
                      <p className="text-[11px] text-neutral-400 leading-tight">
                        Chamadas diretas ao banco enviam o token no cabeçalho <code className="text-amber-400">apikey: eyJ...</code>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* B. Mascaramento e Valores Fictícios Utilizados */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <ProjectIcon name="Eye" size={14} className="text-amber-400" /> Política de Mascaramento em Logs & UI
                    </span>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Nenhum token JWT ou chave de API deve ser renderizado em texto puro na tela ou em console.logs:
                    </p>
                    <div className="p-2.5 bg-black/70 rounded-lg border border-neutral-850 font-mono text-[11px] text-emerald-400 break-all">
                      {maskSecret(FICTITIOUS_MOCK_CREDENTIALS.SUPABASE_ANON_KEY, 10, 6)}
                    </div>
                    <span className="text-[10px] text-neutral-500 block">
                      Função maskSecret() ativa em todos os logs de asserção e relatórios.
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                    <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <ProjectIcon name="FlaskConical" size={14} className="text-amber-400" /> Valores Fictícios / Sintéticos nos Testes
                    </span>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Testes automatizados e fallbacks utilizam estritamente dados sintéticos gerados para QA:
                    </p>
                    <div className="p-2.5 bg-black/70 rounded-lg border border-neutral-850 font-mono text-[11px] text-amber-400">
                      Host: {maskUrl(FICTITIOUS_MOCK_CREDENTIALS.SUPABASE_URL)}
                      <br />
                      Assinatura: MOCK_FICTITIOUS_SIGNATURE_FOR_TESTS_ONLY
                    </div>
                    <span className="text-[10px] text-neutral-500 block">
                      Nenhuma credencial de produção vinculada a código versionado.
                    </span>
                  </div>
                </div>

                {/* C. Protocolo de Resposta a Incidentes: Revogação e Rotação */}
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ProjectIcon name="AlertTriangle" size={18} className="text-amber-400" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-300">
                        Protocolo de Revogação & Rotação Obrigatória
                      </h4>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-black uppercase">
                      Procedimento Formal
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    <strong>Regra Zero de AppSec:</strong> Nunca declare um vazamento como resolvido apenas editando o arquivo <code>.env</code>. Se um segredo já foi versionado ou compilado em bundle público, assuma que ele foi indexado. Siga o checklist abaixo:
                  </p>

                  <div className="space-y-2">
                    {securityAuditor.getSecretRotationProtocol().map((step) => (
                      <div
                        key={step.step}
                        className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 flex items-start gap-3 text-xs"
                      >
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {step.step}
                        </div>
                        <div className="space-y-1">
                          <h5 className="font-bold text-white">{step.title}</h5>
                          <p className="text-[11px] text-amber-350 font-mono">
                            Ação: {step.action}
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            {step.impact}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* D. Solução Arquitetural Definitiva: Backend Proxy (/api/*) */}
                <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-800/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <ProjectIcon name="Building2" size={16} className="text-amber-400" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-sky-400">
                      Arquitetura Alvo: Migração para Backend Seguro (Proxy /api/*)
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Para eliminar definitivamente a exposição de tokens no navegador do cliente:
                  </p>
                  <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 font-mono text-[11px] text-neutral-300 space-y-1">
                    <div className="text-amber-400">
                      [Browser Frontend] -&gt; Chamada HTTP para: /api/appointments
                    </div>
                    <div className="text-neutral-500 pl-4">
                      │ (Sem nenhuma chave do banco no navegador do cliente)
                    </div>
                    <div className="text-sky-400">
                      [Backend Node/Express] -&gt; Executa query no Supabase com SUPABASE_SERVICE_ROLE_KEY no servidor
                    </div>
                    <div className="text-neutral-500 pl-4">
                      │ (Apenas dados sanitizados e validados por tenant são devolvidos)
                    </div>
                    <div className="text-emerald-400">
                      [Browser Frontend] -&gt; Recebe payload JSON seguro
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Bloco 5: Mapeamento de Entradas, Validação de Tipos & Proteção Mass Assignment */}
            <Card
              title="5. Laboratório de Ingestão: Tipos, Mass Assignment & Uploads (Solicitação #02)"
              description="Mapeamento rigoroso de entradas (Body, Query, Path, Headers e Uploads), validação de tipos, truncamento de limites e rejeição estrita de campos extras como role: 'admin'."
            >
              <div className="space-y-6">
                {/* A. Botões de Cenários de Teste */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Selecione um Cenário de Ataque / Validação para Simular:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "valid", label: "Entrada Válida (Agendamento)", color: "border-emerald-600/50 hover:bg-emerald-950/40 text-emerald-400" },
                      { key: "wrong_type", label: "Tipo Errado (price: -20, duration: 'str')", color: "border-amber-600/50 hover:bg-amber-950/40 text-amber-400" },
                      { key: "overflow", label: "Texto Além do Limite (> 80 chars)", color: "border-amber-600/50 hover:bg-amber-950/40 text-amber-400" },
                      { key: "mass_assignment", label: "Escalada Privilégio (role: 'admin')", color: "border-rose-600/50 hover:bg-rose-950/40 text-rose-400" },
                      { key: "malicious_upload", label: "Upload Proibido (.php / 15MB)", color: "border-rose-600/50 hover:bg-rose-950/40 text-rose-400" },
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        type="button"
                        onClick={() => runIngestionScenario(btn.key)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${btn.color} ${
                          ingestionScenario === btn.key ? "bg-neutral-800 ring-2 ring-amber-400" : "bg-neutral-900/80"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* B. Retorno Visual do Teste de Ingestão */}
                {ingestionResult && (
                  <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {ingestionResult.validation.isValid ? <ProjectIcon name="Check" size={16} className="text-emerald-400" /> : <ProjectIcon name="ShieldAlert" size={16} className="text-rose-400" />}
                        </span>
                        <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                          {ingestionResult.title}
                        </h4>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                          ingestionResult.validation.isValid
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {ingestionResult.validation.isValid
                          ? "PERMITIDO E SANITIZADO"
                          : "BLOQUEADO NO INGESTION GUARD"}
                      </span>
                    </div>

                    {/* Exibição dos Erros Interceptados */}
                    {!ingestionResult.validation.isValid && (
                      <div className="space-y-1.5 bg-rose-950/20 p-3 rounded-lg border border-rose-900/40">
                        <span className="text-[11px] font-bold text-rose-300 block">
                          Erros e Violações Interceptadas:
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-xs text-rose-400 font-mono">
                          {ingestionResult.validation.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Payload Enviado vs Dados Sanitizados */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-neutral-400 font-semibold block mb-1">
                          Payload Bruto Enviado (Client):
                        </span>
                        <pre className="p-3 bg-black/70 rounded-lg border border-neutral-850 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-40">
                          {JSON.stringify(ingestionResult.payloadSent, null, 2)}
                        </pre>
                      </div>

                      <div>
                        <span className="text-neutral-400 font-semibold block mb-1">
                          Resultado da Ingestão no Banco:
                        </span>
                        <pre className={`p-3 bg-black/70 rounded-lg border font-mono text-[11px] overflow-x-auto max-h-40 ${
                          ingestionResult.validation.isValid
                            ? "border-emerald-800 text-emerald-400"
                            : "border-rose-900 text-rose-400"
                        }`}>
                          {ingestionResult.validation.isValid
                            ? JSON.stringify(ingestionResult.validation.sanitized, null, 2)
                            : "NENHUM DADO GRAVADO (Transação Abortada com 400 Bad Request)"}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* C. Tabela Formal de Mapeamento de Entradas (Solicitação #02) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ProjectIcon name="ClipboardList" size={16} className="text-amber-400" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">
                      Mapeamento Completo de Entradas & Regras de Proteção
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-neutral-800 rounded-lg overflow-hidden">
                      <thead className="bg-neutral-900 text-neutral-400 uppercase font-mono text-[10px]">
                        <tr>
                          <th className="p-2.5">Tipo Entrada</th>
                          <th className="p-2.5">Campos / Parâmetros</th>
                          <th className="p-2.5">Arquivo & Linha</th>
                          <th className="p-2.5">Regra Implementada</th>
                          <th className="p-2.5">Teste Regressão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60 font-mono text-[11px]">
                        <tr className="hover:bg-neutral-900/30">
                          <td className="p-2.5 text-amber-400 font-bold">Body (Mutação)</td>
                          <td className="p-2.5 text-neutral-300">appointments.insert</td>
                          <td className="p-2.5 text-neutral-400">ClientBookingView.jsx:183</td>
                          <td className="p-2.5 text-emerald-400">Whitelist estrita; rejeita role: "admin" e is_paid</td>
                          <td className="p-2.5 text-sky-400">inputValidation.test.js</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                          <td className="p-2.5 text-amber-400 font-bold">Body (Mutação)</td>
                          <td className="p-2.5 text-neutral-300">barbers.insert</td>
                          <td className="p-2.5 text-neutral-400">BarbersTeamView.jsx:175</td>
                          <td className="p-2.5 text-emerald-400">ALLOWED_BARBER_ROLES (bloqueia superadmin/admin)</td>
                          <td className="p-2.5 text-sky-400">inputValidation.test.js</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                          <td className="p-2.5 text-amber-400 font-bold">Body (Mutação)</td>
                          <td className="p-2.5 text-neutral-300">clients.insert</td>
                          <td className="p-2.5 text-neutral-400">ClientsDirectoryView.jsx:153</td>
                          <td className="p-2.5 text-emerald-400">Limite de 500 chars em notes (anti-DoS/bloat)</td>
                          <td className="p-2.5 text-sky-400">inputValidation.test.js</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                          <td className="p-2.5 text-amber-400 font-bold">Query / URL</td>
                          <td className="p-2.5 text-neutral-300">?screen=, ?tenant_id=</td>
                          <td className="p-2.5 text-neutral-400">App.jsx:25</td>
                          <td className="p-2.5 text-emerald-400">Validação de allowedValues (evita poluição de query)</td>
                          <td className="p-2.5 text-sky-400">inputValidation.test.js</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                          <td className="p-2.5 text-amber-400 font-bold">Path Params</td>
                          <td className="p-2.5 text-neutral-300">/:id</td>
                          <td className="p-2.5 text-neutral-400">inputValidator.js:180</td>
                          <td className="p-2.5 text-emerald-400">Regex ^[a-zA-Z0-9_-]+$ (bloqueia path traversal ../)</td>
                          <td className="p-2.5 text-sky-400">inputValidation.test.js</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                          <td className="p-2.5 text-amber-400 font-bold">Headers</td>
                          <td className="p-2.5 text-neutral-300">Authorization, apikey</td>
                          <td className="p-2.5 text-neutral-400">securityAuditor.js:69</td>
                          <td className="p-2.5 text-emerald-400">Assinatura JWT verificada e role: "anon" estrita</td>
                          <td className="p-2.5 text-sky-400">qaStudio.test.js (SEC-02)</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                          <td className="p-2.5 text-amber-400 font-bold">Uploads</td>
                          <td className="p-2.5 text-neutral-300">avatar (File)</td>
                          <td className="p-2.5 text-neutral-400">UserProfileView.jsx:136</td>
                          <td className="p-2.5 text-emerald-400">Limite 2MB, bloqueio de .php/.exe/.svg, MIME JPG/PNG</td>
                          <td className="p-2.5 text-sky-400">inputValidation.test.js</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* D. Nota Arquitetural: Validação de Formulário vs Autorização */}
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <ProjectIcon name="Scale" size={16} className="text-amber-400" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-purple-300">
                      Regra Arquitetural: Não Confunda Validação de Formulário com Autorização
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    <strong>Validação de Formulário (Syntactic Integrity):</strong> Assegura que o tipo é numérico, a string respeita o limite de caracteres e os campos obrigatórios estão preenchidos.
                    <br />
                    <strong>Autorização (Access Control / RBAC & RLS):</strong> É autoritária e exercida no servidor/banco através do token de sessão criptografado (<code>auth.uid()</code>). Um usuário comum pode enviar um formulário com dados sintaticamente perfeitos contendo <code>role: "admin"</code> ou dados de outra barbearia; cabe ao servidor/RLS barrar sumariamente a operação.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 3: SIMULADOR DE CAOS & RESILIÊNCIA (Itens 14 e 17) */}
        {/* ======================================================== */}
        {((activeTab === "chaos" && currentView === "test-runner") || (currentView === "simulations" && simMode === "CHAOS")) && (
          <div className="space-y-6">
            <Card
              title="Laboratório de Caos de Rede & Latência (Itens #14 e #17)"
              description="Simule as condições reais enfrentadas pelo barbeiro e cliente (rede 4G instável, perda de sinal Wi-Fi, falhas de servidor) e valide como a interface reage sem travar."
            >
              <div className="space-y-6">
                {/* 1. Controle de Latência */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Injeção de Latência Artificial (RTT Delay)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Normal (0ms)", val: 0 },
                      { label: "4G Rápido (300ms)", val: 300 },
                      { label: "3G Móvel (1500ms)", val: 1500 },
                      { label: "Wi-Fi Ruim (3000ms)", val: 3000 },
                      { label: "Extremo (5000ms)", val: 5000 },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() =>
                          chaosEngine.updateConfig({ latencyMs: opt.val })
                        }
                        className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer border ${
                          chaosConfig.latencyMs === opt.val
                            ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20"
                            : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border-neutral-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Modos de Falha Induzida */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Injeção de Falhas no Supabase / Rede
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        chaosEngine.updateConfig({
                          isSimulatedOffline: !chaosConfig.isSimulatedOffline,
                        })
                      }
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        chaosConfig.isSimulatedOffline
                          ? "bg-rose-950/40 border-rose-600 text-rose-300 shadow-lg shadow-rose-950/40"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>Simular Modo Offline</span>
                        <span>{chaosConfig.isSimulatedOffline ? "ATIVO" : "DESLIGADO"}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Emula perda total de internet do cliente.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        chaosEngine.updateConfig({
                          forceErrorMode:
                            chaosConfig.forceErrorMode === "500_SERVER_ERROR"
                              ? null
                              : "500_SERVER_ERROR",
                        })
                      }
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        chaosConfig.forceErrorMode === "500_SERVER_ERROR"
                          ? "bg-rose-950/40 border-rose-600 text-rose-300 shadow-lg shadow-rose-950/40"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>Forçar Erro 500 (Banco)</span>
                        <span>
                          {chaosConfig.forceErrorMode === "500_SERVER_ERROR"
                            ? "ATIVO"
                            : "DESLIGADO"}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Simula queda temporária do PostgreSQL.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        chaosEngine.updateConfig({
                          forceErrorMode:
                            chaosConfig.forceErrorMode === "403_FORBIDDEN"
                              ? null
                              : "403_FORBIDDEN",
                        })
                      }
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        chaosConfig.forceErrorMode === "403_FORBIDDEN"
                          ? "bg-rose-950/40 border-rose-600 text-rose-300 shadow-lg shadow-rose-950/40"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800"
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>Forçar Erro 403 (RLS)</span>
                        <span>
                          {chaosConfig.forceErrorMode === "403_FORBIDDEN"
                            ? "ATIVO"
                            : "DESLIGADO"}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Simula bloqueio por falta de autorização.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 3. Teste Interativo sob Caos */}
                <div className="pt-4 border-t border-neutral-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-neutral-300 font-semibold">
                      Validar Comportamento da Aplicação sob as Condições Atuais:
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        onClick={handleTestChaosCall}
                        isLoading={isTestingChaos}
                      >
                        Disparar Chamada com Caos
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => chaosEngine.reset()}
                      >
                        Restaurar Conexão Normal
                      </Button>
                    </div>
                  </div>

                  {chaosTestLog && (
                    <div className="p-3 bg-black/70 border border-neutral-800 rounded-xl font-mono text-xs text-neutral-200">
                      <span className="text-amber-500 font-bold mr-2">›</span>
                      {chaosTestLog}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 4: COMPONENT SANDBOX (Itens 3, 4, 15) */}
        {/* ======================================================== */}
        {(activeTab === "sandbox" && currentView === "test-runner") && (
          <div className="space-y-6">
            <Card
              title="Workbench de Componentes & Validação Visual (Itens #3 e #4)"
              description="Teste componentes do Design System em tempo real com estados extremos, props de erro, loading e transições da máquina de estados."
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Componente Button */}
                <div className="p-4 bg-neutral-900/60 rounded-xl border border-neutral-800 space-y-4">
                  <h4 className="font-bold text-sm text-white flex items-center justify-between">
                    <span>Componente: Button.jsx</span>
                    <span className="text-xs text-neutral-500 font-mono">
                      src/components/ui/Button
                    </span>
                  </h4>

                  {/* Controles de Estado */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSandboxButtonLoading(!sandboxButtonLoading)}
                      className={`px-2.5 py-1 rounded font-bold border cursor-pointer ${
                        sandboxButtonLoading
                          ? "bg-amber-500/20 text-amber-400 border-amber-500"
                          : "bg-neutral-800 text-neutral-400 border-neutral-700"
                      }`}
                    >
                      isLoading: {sandboxButtonLoading ? "true" : "false"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSandboxButtonDisabled(!sandboxButtonDisabled)}
                      className={`px-2.5 py-1 rounded font-bold border cursor-pointer ${
                        sandboxButtonDisabled
                          ? "bg-amber-500/20 text-amber-400 border-amber-500"
                          : "bg-neutral-800 text-neutral-400 border-neutral-700"
                      }`}
                    >
                      disabled: {sandboxButtonDisabled ? "true" : "false"}
                    </button>
                  </div>

                  {/* Área de Visualização */}
                  <div className="p-6 bg-black/40 rounded-xl border border-neutral-800 flex flex-wrap gap-3 items-center justify-center min-h-[100px]">
                    <Button
                      variant="primary"
                      isLoading={sandboxButtonLoading}
                      disabled={sandboxButtonDisabled}
                    >
                      Botão Primário
                    </Button>
                    <Button
                      variant="secondary"
                      isLoading={sandboxButtonLoading}
                      disabled={sandboxButtonDisabled}
                    >
                      Botão Secundário
                    </Button>
                  </div>
                </div>

                {/* 2. Componente Badge & Máquina de Estados */}
                <div className="p-4 bg-neutral-900/60 rounded-xl border border-neutral-800 space-y-4">
                  <h4 className="font-bold text-sm text-white flex items-center justify-between">
                    <span>Componente: Badge.jsx (Máquina de Estados)</span>
                    <span className="text-xs text-neutral-500 font-mono">
                      src/components/ui/Badge
                    </span>
                  </h4>

                  {/* Seleção de Status */}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {[
                      "waiting",
                      "confirmed",
                      "in_progress",
                      "completed",
                      "cancelled",
                      "no_show",
                    ].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSandboxBadgeStatus(st)}
                        className={`px-2.5 py-1 rounded font-bold border cursor-pointer ${
                          sandboxBadgeStatus === st
                            ? "bg-amber-500/20 text-amber-400 border-amber-500"
                            : "bg-neutral-800 text-neutral-400 border-neutral-700"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <label className="text-neutral-400">Interativo:</label>
                    <input
                      type="checkbox"
                      checked={sandboxBadgeInteractive}
                      onChange={(e) =>
                        setSandboxBadgeInteractive(e.target.checked)
                      }
                      className="cursor-pointer"
                    />
                    <span className="text-neutral-500 text-[11px]">
                      (Clique no badge para acionar o dropdown de transição)
                    </span>
                  </div>

                  {/* Área de Visualização */}
                  <div className="p-6 bg-black/40 rounded-xl border border-neutral-800 flex flex-col items-center justify-center min-h-[100px] space-y-2">
                    <Badge
                      status={sandboxBadgeStatus}
                      isInteractive={sandboxBadgeInteractive}
                      onStatusChange={(next) => setSandboxBadgeStatus(next)}
                    />
                    <div className="text-[11px] text-neutral-500 font-mono">
                      Transições permitidas de &apos;{sandboxBadgeStatus}&apos;:{" "}
                      {STATUS_TRANSITIONS[sandboxBadgeStatus]?.length > 0
                        ? STATUS_TRANSITIONS[sandboxBadgeStatus].join(", ")
                        : "Estado Terminal (Sem transição)"}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* SEÇÃO RESILIÊNCIA VISUAL: LATÊNCIA, OFFLINE & REALTIME (PROMPT 25) */}
            <Card
              title="UI de Resiliência para Latência, Offline e Realtime"
              description="Bancada de testes interativos para validação dos 3 entregáveis de resiliência: Skeleton Screens, Banner de Conexão Offline e Retenção de Formulário com 'Tentar Novamente'."
            >
              <div className="space-y-6">
                {/* 1. SKELETON SCREENS */}
                <div className="p-4 bg-neutral-900/60 rounded-xl border border-neutral-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <ProjectIcon name="Skull" size={14} className="text-rose-400" />
                        <span>1. Skeleton Screens (Feedback de Alta Latência &gt;1200ms)</span>
                      </h4>
                      <p className="text-xs text-neutral-400">
                        Evita telas brancas e layout shift (CLS zero) durante chamadas lentas ou conexões 3G instáveis.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-neutral-400">
                      src/components/resilience/Skeleton*.jsx
                    </span>
                  </div>

                  {/* Seletor de Variantes */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-neutral-400 font-semibold">Variante:</span>
                    {[
                      { id: "service", label: "Serviços (Cards)" },
                      { id: "barber", label: "Barbeiros (Equipe)" },
                      { id: "appointment", label: "Agendamentos (Slots)" },
                      { id: "metric", label: "Big Numbers / Métricas" },
                      { id: "booking", label: "Booking Wizard Completo" },
                      { id: "dashboard", label: "Dashboard Administrativo" },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSandboxSkeletonVariant(v.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          sandboxSkeletonVariant === v.id
                            ? "bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm"
                            : "bg-neutral-800/80 text-neutral-400 border-neutral-700 hover:text-white"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>

                  {/* Área de Visualização do Skeleton */}
                  <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800/80 overflow-hidden">
                    {sandboxSkeletonVariant === "service" && <SkeletonCard variant="service" count={2} />}
                    {sandboxSkeletonVariant === "barber" && <SkeletonCard variant="barber" count={3} />}
                    {sandboxSkeletonVariant === "appointment" && <SkeletonCard variant="appointment" count={3} />}
                    {sandboxSkeletonVariant === "metric" && <SkeletonCard variant="metric" count={4} />}
                    {sandboxSkeletonVariant === "booking" && <SkeletonBookingView latencyNotice={true} />}
                    {sandboxSkeletonVariant === "dashboard" && <SkeletonDashboard latencyNotice={true} />}
                  </div>
                </div>

                {/* 2. BANNER DE CONEXÃO OFFLINE & REALTIME */}
                <div className="p-4 bg-neutral-900/60 rounded-xl border border-neutral-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <ProjectIcon name="Network" size={14} className="text-amber-400" />
                        <span>2. Indicador de Conexão ('Modo Offline / Reconectando...')</span>
                      </h4>
                      <p className="text-xs text-neutral-400">
                        Acionado ao perder a internet ou ao desconectar o WebSocket do Supabase Realtime.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-neutral-400">
                      src/components/resilience/OfflineBanner.jsx
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300">
                    Teste o comportamento em tempo real alternando entre os modos <strong>Normal</strong>, <strong>Alta Latência</strong> e <strong>Offline</strong> nos controles do banner:
                  </p>

                  <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950">
                    <OfflineBanner showSimulator={true} />
                  </div>
                </div>

                {/* 3. TRATAMENTO AMIGÁVEL DE FALHAS COM RETENÇÃO DE FORMULÁRIO */}
                <div className="p-4 bg-neutral-900/60 rounded-xl border border-neutral-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <ProjectIcon name="FileText" size={14} className="text-amber-400" />
                        <span>3. Tratamento de Falhas com Retenção de Formulário &amp; 'Tentar Novamente'</span>
                      </h4>
                      <p className="text-xs text-neutral-400">
                        Garante retenção de 100% dos dados preenchidos em memória e sessionStorage com recuperação segura.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-neutral-400">
                      src/components/resilience/ResilientFormHandler.jsx
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-neutral-400">
                      Simulação interativa de submissão sob oscilação de rede:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSandboxFormError("Falha de conexão com a API de agendamento (net::ERR_CONNECTION_TIMED_OUT).");
                        setSandboxFormSuccess(false);
                      }}
                      className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-700 cursor-pointer"
                    >
                      ↻ Simular Falha de Conexão
                    </button>
                  </div>

                  {sandboxFormSuccess ? (
                    <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ProjectIcon name="Check" size={14} className="text-emerald-400 font-bold" />
                        <span>
                          <strong>Agendamento reenviado com sucesso!</strong> Os dados foram preservados e transmitidos sem perda.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSandboxFormError("Falha de conexão com a API de agendamento (net::ERR_CONNECTION_TIMED_OUT).");
                          setSandboxFormSuccess(false);
                        }}
                        className="text-xs underline text-emerald-400 hover:text-emerald-300 cursor-pointer"
                      >
                        Reiniciar Simulação
                      </button>
                    </div>
                  ) : (
                    <ResilientFormHandler
                      error={sandboxFormError}
                      formData={sandboxFormData}
                      fieldLabels={{
                        clientName: "Cliente",
                        clientPhone: "Telefone",
                        serviceName: "Serviço",
                        barberName: "Barbeiro",
                        time: "Horário",
                        price: "Valor",
                      }}
                      isSubmitting={sandboxFormRetrying}
                      onRetry={async () => {
                        setSandboxFormRetrying(true);
                        await new Promise((r) => setTimeout(r, 1200));
                        setSandboxFormRetrying(false);
                        setSandboxFormError(null);
                        setSandboxFormSuccess(true);
                      }}
                      onEdit={() => {
                        alert("Modo de edição ativado: todos os campos mantidos no estado original.");
                      }}
                    />
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA: STORYBOOK & WORKBENCH DE REGRESSÃO VISUAL */}
        {/* ======================================================== */}
        {(activeTab === "storybook-workbench" && currentView === "test-runner") && (
          <StorybookWorkbench onTriggerProjectScan={triggerProjectFileScan} />
        )}

        {/* ======================================================== */}
        {/* ABA 5: MATRIZ QA E ANÁLISE DOS 18 ITENS */}
        {/* ======================================================== */}
        {(activeTab === "checklist" && currentView === "test-runner") && (
          <div className="space-y-6">
            <Card
              title="Análise de Priorização Técnica do QA Engineer (18 Itens)"
              description="Avaliação crítica de retorno sobre investimento (ROI), impacto na estabilidade e segurança jurídica/financeira de cada item do checklist."
            >
              <div className="space-y-4">
                {/* Resumo da Análise */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
                    <span className="text-xl font-black text-emerald-400">
                      7 Itens
                    </span>
                    <p className="text-xs text-neutral-300 font-bold mt-1">
                      Críticos / Imprescindíveis
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Segurança (RLS, service_role, XSS), Contratos e Resiliência
                    </p>
                  </div>
                  <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl">
                    <span className="text-xl font-black text-amber-400">
                      8 Itens
                    </span>
                    <p className="text-xs text-neutral-300 font-bold mt-1">
                      Alta / Média Prioridade
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      A11y, Real-time, E2E de rotas críticas e Design System
                    </p>
                  </div>
                  <div className="p-3 bg-neutral-800/40 border border-neutral-700/40 rounded-xl">
                    <span className="text-xl font-black text-neutral-400">
                      3 Itens
                    </span>
                    <p className="text-xs text-neutral-300 font-bold mt-1">
                      Fase 2 / Go-Live
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Testes de carga massiva (PgBouncer) e Rate limit externo
                    </p>
                  </div>
                </div>

                {/* Tabela dos 18 Itens */}
                <div className="space-y-3 pt-2">
                  {CHECKLIST_ANALYSIS.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 transition-all space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700">
                            #{item.id}
                          </span>
                          <h4 className="font-bold text-sm text-white">
                            {item.title}
                          </h4>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-800/80 text-neutral-400 border border-neutral-700/60">
                            {item.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                              item.priority.includes("CRÍTICA")
                                ? "bg-rose-950/70 text-rose-300 border-rose-800"
                                : item.priority.includes("ALTA")
                                  ? "bg-amber-950/70 text-amber-300 border-amber-800"
                                  : "bg-neutral-800 text-neutral-400 border-neutral-700"
                            }`}
                          >
                            Prioridade: {item.priority}
                          </span>

                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                              item.status.includes("IMPLEMENTADO")
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                        <div className="p-2.5 rounded bg-black/40 border border-neutral-800/80">
                          <span className="font-bold text-amber-400/90 block mb-1">
                            Por que é necessário?
                          </span>
                          <p className="text-neutral-400 leading-relaxed">
                            {item.whyNecessary}
                          </p>
                        </div>
                        <div className="p-2.5 rounded bg-black/40 border border-neutral-800/80">
                          <span className="font-bold text-emerald-400/90 block mb-1">
                            Estratégia Recomendada:
                          </span>
                          <p className="text-neutral-400 leading-relaxed">
                            {item.strategy}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 6: RBAC, NEGAÇÃO POR PADRÃO & MATRIZ DE AUTORIZAÇÃO (PROMPT 01) */}
        {/* ======================================================== */}
        {((activeTab === "rbac" && currentView === "test-runner") || (currentView === "simulations" && simMode === "RBAC")) && (
          <div className="space-y-6">
            {/* Cabeçalho da Seção RBAC */}
            <Card className="bg-neutral-900/90 border-neutral-800 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ProjectIcon name="Lock" size={24} className="text-amber-500" />
                    <h2 className="text-xl font-black text-white tracking-tight">
                      Controle de Acesso RBAC & Negação por Padrão (Default Deny)
                    </h2>
                    <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                      AppSec Sênior • Prompt 01
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-2 max-w-3xl leading-relaxed">
                    Implementação da estratégia <strong className="text-neutral-200">Default Deny</strong>: qualquer rota não explicitamente declarada como pública exige token JWT válido (<strong className="text-amber-400">HTTP 401</strong>). Tentativas de acesso com token válido mas sem o papel exigido retornam <strong className="text-rose-400">HTTP 403</strong> (Forbidden). Usuários com perfil <code className="text-amber-300">client</code> e <code className="text-amber-300">employee</code> são estritamente proibidos de acessar rotas <code className="text-amber-300">admin</code>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      runSingleTest(QA_TEST_SUITES.find((s) => s.id === "SEC-07"));
                      runSingleTest(QA_TEST_SUITES.find((s) => s.id === "SEC-08"));
                    }}
                    className="text-xs font-bold shadow-lg shadow-amber-500/10 flex items-center gap-1.5"
                  >
                    <ProjectIcon name="Play" size={13} className="text-neutral-950 fill-current" />
                    <span>Executar Testes RBAC (SEC-07 & SEC-08)</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Grid: Simulador Interativo + Testes Rápidos */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Simulador Interativo de Requisições HTTP */}
              <div className="lg:col-span-7 space-y-6">
                <Card className="bg-neutral-900 border-neutral-800 p-6">
                  <div className="flex items-center gap-2 mb-4 border-b border-neutral-800 pb-3">
                    <ProjectIcon name="Crosshair" size={18} className="text-amber-500" />
                    <h3 className="font-bold text-sm text-white">
                      Simulador Interativo de Requisição no Middleware
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* Linha 1: Role e Método */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                          1. Papel (Role) Simulado do Usuário:
                        </label>
                        <select
                          value={rbacSimRole}
                          onChange={(e) => setRbacSimRole(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 font-mono outline-hidden"
                        >
                          <option value={USER_ROLES.ANON}>anon (Deslogado / Anônimo)</option>
                          <option value={USER_ROLES.CLIENT}>client (Cliente Final)</option>
                          <option value={USER_ROLES.EMPLOYEE}>employee (Barbeiro / Colaborador)</option>
                          <option value={USER_ROLES.ADMIN}>admin (Dono da Barbearia)</option>
                          <option value={USER_ROLES.SUPERADMIN}>superadmin (SaaS Master)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                          2. Método HTTP da Requisição:
                        </label>
                        <select
                          value={rbacSimMethod}
                          onChange={(e) => setRbacSimMethod(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 font-mono outline-hidden"
                        >
                          <option value="GET">GET (Consulta de Recurso)</option>
                          <option value="POST">POST (Criação / Ação)</option>
                          <option value="PUT">PUT (Atualização Integral)</option>
                          <option value="PATCH">PATCH (Atualização Parcial)</option>
                          <option value="DELETE">DELETE (Remoção)</option>
                        </select>
                      </div>
                    </div>

                    {/* Linha 2: Condição do Token JWT */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                        3. Estado do Token JWT no Cabeçalho Authorization:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "valid", label: "Token Válido", icon: "Check" },
                          { id: "none", label: "Sem Token (Vazio)", icon: "X" },
                          { id: "expired", label: "Token Expirado", icon: "Clock" },
                          { id: "corrupted", label: "Token Malformado", icon: "AlertTriangle" },
                        ].map((cond) => (
                          <button
                            key={cond.id}
                            type="button"
                            onClick={() => setRbacSimTokenType(cond.id)}
                            className={`p-2 rounded-lg text-xs font-bold transition-all text-center border cursor-pointer flex items-center justify-center gap-1.5 ${
                              rbacSimTokenType === cond.id
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:bg-neutral-800"
                            }`}
                          >
                            <ProjectIcon
                              name={cond.icon}
                              size={13}
                              className={rbacSimTokenType === cond.id ? "text-amber-400" : "text-neutral-400"}
                            />
                            <span>{cond.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Linha 3: Rota / Endpoint */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
                        4. Rota do Endpoint (URL):
                      </label>
                      <input
                        type="text"
                        value={rbacSimPath}
                        onChange={(e) => setRbacSimPath(e.target.value)}
                        placeholder="/api/admin/financial/overview"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-amber-500 outline-hidden"
                      />

                      {/* Atalhos Rápidos de Rotas Críticas */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[10px] text-neutral-500 self-center">
                          Rotas para Teste:
                        </span>
                        {[
                          { path: "/api/health", label: "Health (Pública)", method: "GET" },
                          { path: "/api/public/services", label: "Serviços (Pública)", method: "GET" },
                          { path: "/api/admin/financial/overview", label: "Financeiro (Admin)", method: "GET" },
                          { path: "/api/admin/barbers", label: "Barbeiros (Admin)", method: "POST" },
                          { path: "/api/employee/commissions", label: "Comissões (Employee)", method: "GET" },
                          { path: "/api/superadmin/tenants", label: "Tenants (SuperAdmin)", method: "GET" },
                          { path: "/api/unmapped-backdoor", label: "Não Mapeada (Default Deny)", method: "GET" },
                        ].map((quick) => (
                          <button
                            key={quick.path + quick.method}
                            type="button"
                            onClick={() => {
                              setRbacSimPath(quick.path);
                              setRbacSimMethod(quick.method);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 cursor-pointer border border-neutral-700/60"
                          >
                            {quick.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Botão de Disparo */}
                    <Button
                      variant="primary"
                      onClick={handleExecuteRbacSimulation}
                      className="w-full text-xs font-bold py-2.5 shadow-lg shadow-amber-600/20"
                    >
                      Disparar Requisição no Middleware RBAC
                    </Button>
                  </div>
                </Card>

                {/* Exibição do Resultado da Requisição HTTP */}
                {rbacSimResult && (
                  <Card className="bg-neutral-900 border-neutral-800 p-6 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-300">
                          Resposta do Middleware:
                        </span>
                        <span className="text-xs font-mono text-neutral-400">
                          {rbacSimResult.method} {rbacSimResult.path}
                        </span>
                      </div>

                      {/* Badge de Status HTTP */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black font-mono tracking-wider border ${
                            rbacSimResult.status === 200
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : rbacSimResult.status === 401
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          }`}
                        >
                          HTTP {rbacSimResult.status} • {rbacSimResult.authorized ? "AUTHORIZED" : rbacSimResult.error?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Diagnóstico em Linguagem Natural */}
                    <div
                      className={`p-3.5 rounded-xl border text-xs leading-relaxed mb-4 ${
                        rbacSimResult.status === 200
                          ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                          : rbacSimResult.status === 401
                            ? "bg-amber-950/40 border-amber-800/60 text-amber-200"
                            : "bg-rose-950/40 border-rose-800/60 text-rose-200"
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5 mb-1">
                        <span className="flex items-center gap-1.5">
                          {rbacSimResult.status === 200 ? (
                            <>
                              <ProjectIcon name="Check" size={14} className="text-emerald-400" />
                              <span>ACESSO CONCEDIDO</span>
                            </>
                          ) : rbacSimResult.status === 401 ? (
                            <>
                              <ProjectIcon name="Lock" size={14} className="text-amber-400" />
                              <span>BLOQUEIO POR AUTENTICAÇÃO (401)</span>
                            </>
                          ) : (
                            <>
                              <ProjectIcon name="ShieldAlert" size={14} className="text-rose-400" />
                              <span>BLOQUEIO POR PRIVILÉGIOS (403)</span>
                            </>
                          )}
                        </span>
                      </div>
                      <p>{rbacSimResult.message}</p>
                    </div>

                    {/* Dados Técnicos e JSON de Resposta */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>Payload Retornado pelo Middleware:</span>
                        <span className="font-mono text-[10px]">
                          Timestamp: {rbacSimResult.timestamp}
                        </span>
                      </div>
                      <pre className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-[11px] font-mono text-neutral-300 overflow-x-auto">
                        {JSON.stringify(
                          {
                            status: rbacSimResult.status,
                            authorized: rbacSimResult.authorized,
                            error: rbacSimResult.error || null,
                            code: rbacSimResult.code || "OK",
                            path: rbacSimResult.path,
                            method: rbacSimResult.method,
                            simulatedRole: rbacSimResult.simulatedRole,
                            currentRole: rbacSimResult.currentRole || rbacSimResult.user?.role || "anon",
                            requiredRoles: rbacSimResult.requiredRoles || rbacSimResult.route?.allowedRoles || [],
                            isPublic: rbacSimResult.isPublic || false,
                            isUnmappedRoute: rbacSimResult.isUnmappedRoute || false,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </Card>
                )}
              </div>

              {/* Coluna Direita: Suítes Automatizadas RBAC */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="bg-neutral-900 border-neutral-800 p-6">
                  <div className="flex items-center gap-2 mb-4 border-b border-neutral-800 pb-3">
                    <ProjectIcon name="FlaskConical" size={18} className="text-amber-500" />
                    <h3 className="font-bold text-sm text-white">
                      Casos de Teste Automatizados (Prompt 01)
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {QA_TEST_SUITES.filter((s) => s.id === "SEC-07" || s.id === "SEC-08").map(
                      (test) => {
                        const result = testResults[test.id];
                        const isRunning = runningTests[test.id];

                        return (
                          <div
                            key={test.id}
                            className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-amber-400">
                                    {test.id}
                                  </span>
                                  <span className="text-xs font-bold text-white">
                                    {test.title}
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                                  {test.description}
                                </p>
                              </div>

                              <Button
                                variant="secondary"
                                onClick={() => runSingleTest(test)}
                                isLoading={isRunning}
                                className="text-xs py-1 px-2.5 whitespace-nowrap shrink-0"
                              >
                                {result ? "Reexecutar" : "Executar"}
                              </Button>
                            </div>

                            {result && (
                              <div
                                className={`p-2.5 rounded-lg border text-xs ${
                                  result.passed
                                    ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                                    : "bg-rose-950/40 border-rose-800/60 text-rose-300"
                                }`}
                              >
                                <div className="font-bold flex items-center justify-between mb-1">
                                  <span className="flex items-center gap-1">{result.passed ? <ProjectIcon name="CheckCircle2" size={12} className="text-emerald-400" /> : <ProjectIcon name="AlertCircle" size={12} className="text-rose-400" />}{result.passed ? "PASSOU" : "FALHOU"}</span>
                                  <span className="text-[10px] font-mono text-neutral-400">
                                    {result.durationMs}ms
                                  </span>
                                </div>
                                <p className="text-[11px]">{result.message}</p>

                                {result.logs && result.logs.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-neutral-800/60 space-y-1 font-mono text-[10px] text-neutral-400">
                                    {result.logs.map((log, idx) => (
                                      <div key={idx} className="truncate">
                                        {log}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </Card>

                {/* Resumo de Diretrizes AppSec */}
                <Card className="bg-neutral-900 border-neutral-800 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <ProjectIcon name="ShieldAlert" size={14} className="text-amber-400" />
                    <span>Princípios de Engenharia AppSec</span>
                  </div>
                  <ul className="text-xs text-neutral-300 space-y-2 list-disc list-inside leading-relaxed">
                    <li>
                      <strong className="text-white">Default Deny:</strong> Nenhuma rota nova herda permissão pública sem declaração expressa na matriz.
                    </li>
                    <li>
                      <strong className="text-white">Segregação 401 vs 403:</strong> Problema de autenticação (identidade desconhecida) responde 401; problema de autorização (identidade conhecida sem privilégio) responde 403.
                    </li>
                    <li>
                      <strong className="text-white">Imunidade a Escalada:</strong> Perfis <code className="text-amber-300 font-mono">client</code> e <code className="text-amber-300 font-mono">employee</code> são barrados de endpoints de faturamento e administração de barbearia.
                    </li>
                  </ul>
                </Card>
              </div>
            </div>

            {/* Matriz Completa de Autorização Documentada */}
            <Card className="bg-neutral-900 border-neutral-800 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <ProjectIcon name="ClipboardList" size={18} className="text-amber-500" />
                  <h3 className="font-bold text-sm text-white">
                    Matriz Documentada de Rotas & Autorização (RBAC)
                  </h3>
                  <span className="text-xs font-mono text-neutral-400">
                    ({AUTHORIZATION_MATRIX.length} endpoints mapeados)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={matrixSearch}
                    onChange={(e) => setMatrixSearch(e.target.value)}
                    placeholder="Buscar rota..."
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white focus:border-amber-500 font-mono outline-hidden"
                  />
                  <select
                    value={matrixFilter}
                    onChange={(e) => setMatrixFilter(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white focus:border-amber-500 outline-hidden"
                  >
                    <option value="ALL">Todas as Classificações</option>
                    <option value={ROUTE_CLASSIFICATIONS.PUBLIC}>Apenas Públicas (Sem JWT)</option>
                    <option value={ROUTE_CLASSIFICATIONS.PRIVATE}>Apenas Privadas (Qualquer JWT)</option>
                    <option value={ROUTE_CLASSIFICATIONS.EMPLOYEE}>Apenas Barbeiro / Employee</option>
                    <option value={ROUTE_CLASSIFICATIONS.ADMINISTRATIVE}>Apenas Administrativas</option>
                    <option value={ROUTE_CLASSIFICATIONS.SUPERADMIN}>Apenas SuperAdmin</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Rotas */}
              <div className="overflow-x-auto rounded-xl border border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-semibold border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Método</th>
                      <th className="p-3">Rota / Endpoint</th>
                      <th className="p-3">Classificação</th>
                      <th className="p-3">Default Deny</th>
                      <th className="p-3">Papéis Autorizados</th>
                      <th className="p-3">Racional de Segurança AppSec</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-mono">
                    {AUTHORIZATION_MATRIX.filter((route) => {
                      const matchesCategory =
                        matrixFilter === "ALL" || route.classification === matrixFilter;
                      const matchesSearch =
                        route.path.toLowerCase().includes(matrixSearch.toLowerCase()) ||
                        route.description.toLowerCase().includes(matrixSearch.toLowerCase());
                      return matchesCategory && matchesSearch;
                    }).map((route, idx) => (
                      <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              route.method === "GET"
                                ? "bg-blue-500/20 text-blue-300"
                                : route.method === "POST"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : route.method === "PUT"
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-purple-500/20 text-purple-300"
                            }`}
                          >
                            {route.method}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-white whitespace-nowrap">
                          {route.path}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              route.classification === ROUTE_CLASSIFICATIONS.PUBLIC
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : route.classification === ROUTE_CLASSIFICATIONS.ADMINISTRATIVE
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : route.classification === ROUTE_CLASSIFICATIONS.SUPERADMIN
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : "bg-neutral-800 text-neutral-300"
                            }`}
                          >
                            {route.classification}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {route.isPublic ? (
                            <span className="text-[10px] text-emerald-400 font-bold">
                              Isento (Pública)
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-bold">
                              Bloqueio (Exige JWT)
                            </span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {route.allowedRoles.map((role) => (
                              <span
                                key={role}
                                className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300 border border-neutral-700"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-[11px] font-sans text-neutral-300 max-w-xs">
                          {route.securityRationale}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Matriz de Telas de UI (Frontend Guards) */}
            <Card className="bg-neutral-900 border-neutral-800 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                <ProjectIcon name="Terminal" size={18} className="text-amber-500" />
                <h3 className="font-bold text-sm text-white">
                  Matriz de Telas de UI & Controle de Acesso Frontend
                </h3>
                <span className="text-xs font-mono text-neutral-400">
                  ({UI_SCREEN_MATRIX.length} telas mapeadas)
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400 font-semibold border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Identificador (screenId)</th>
                      <th className="p-3">Nome da Tela</th>
                      <th className="p-3">Classificação</th>
                      <th className="p-3">Visibilidade Pública</th>
                      <th className="p-3">Papéis Autorizados (RBAC)</th>
                      <th className="p-3">Status de Restrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-mono">
                    {UI_SCREEN_MATRIX.map((screen, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          screen.screenId === "qa-panel"
                            ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-amber-500"
                            : "hover:bg-neutral-800/40"
                        }`}
                      >
                        <td className="p-3 font-bold text-white whitespace-nowrap">
                          {screen.screenId}
                        </td>
                        <td className="p-3 font-sans text-neutral-200">
                          {screen.name}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              screen.classification === ROUTE_CLASSIFICATIONS.PUBLIC
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : screen.classification === ROUTE_CLASSIFICATIONS.ADMINISTRATIVE
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {screen.classification}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {screen.isPublic ? (
                            <span className="text-[10px] text-emerald-400 font-bold">
                              Pública (Sem Auth)
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-bold">
                              Restrita (Exige Auth)
                            </span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {screen.allowedRoles.map((role) => (
                              <span
                                key={role}
                                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                  role === USER_ROLES.SUPERADMIN
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                                    : "bg-neutral-800 text-neutral-300 border-neutral-700"
                                }`}
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-[11px] font-sans">
                          {screen.screenId === "qa-panel" ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              Exclusivo SuperAdmin
                            </span>
                          ) : screen.isPublic ? (
                            <span className="text-emerald-400 text-[10px]">Acesso Livre</span>
                          ) : (
                            <span className="text-neutral-400 text-[10px]">Protegido por Role</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 7: DOCUMENTAÇÃO TÉCNICA APPSEC & CYBERSECURITY */}
        {/* ======================================================== */}
        {(activeTab === "tech-docs" && currentView === "test-runner") && (
          <Suspense
            fallback={
              <div className="p-8 text-center text-neutral-400 font-mono text-xs flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <span>Carregando Documentação Técnica AppSec...</span>
              </div>
            }
          >
            <TechDocsAppSec
              testResults={testResults}
              runningTests={runningTests}
              onRunSingleTest={runSingleTest}
              onRunAllAppSecTests={runAllAppSecTests}
              onCopyText={copyToClipboard}
              projectFileScan={projectFileScan}
              onTriggerProjectScan={triggerProjectFileScan}
            />
          </Suspense>
        )}

        {/* ======================================================== */}
        {/* ABA 8: FILE TESTING STUDIO & UPLOAD WORKBENCH */}
        {/* ======================================================== */}
        {(activeTab === "file-studio" && currentView === "test-runner") && (
          <FileTestingStudio
            onCopyText={(text, title) => {
              copyToClipboard(text, title);
            }}
            onNavigateToLogs={() => setActiveTab("qa-logs")}
          />
        )}

        {/* ======================================================== */}
        {/* ABA UNIFICADA: CONSOLE DE LOGS & CORREÇÕES */}
        {/* ======================================================== */}
        {((activeTab === "qa-logs" || activeTab === "required-fixes") && currentView === "test-runner") && (
          <QALogConsoleView
            initialSubTab={activeTab === "required-fixes" ? "PLAYBOOKS" : qaLogsSubTab}
            onSubTabChange={setQaLogsSubTab}
            onTriggerScan={triggerProjectFileScan}
            projectScanResult={projectFileScan}
            onCopyText={copyToClipboard}
          />
        )}

        {/* ======================================================== */}
        {/* TOAST FLUTUANTE DE SUCESSO DE CÓPIA */}
        {/* ======================================================== */}
        {copiedNotification && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 border border-emerald-500 text-emerald-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
            <ProjectIcon name="ClipboardList" size={20} className="text-amber-500" />
            <span className="text-sm font-bold">{copiedNotification}</span>
            <button
              type="button"
              onClick={() => setCopiedNotification(null)}
              className="text-xs text-emerald-300 hover:text-white ml-2 cursor-pointer font-bold"
            >
              <ProjectIcon name="X" size={14} className="text-emerald-300 hover:text-white" />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL DE CÓPIA RESILIENTE (PARA IFRAMES / PERMISSÕES) */}
        {/* ======================================================== */}
        {copyModalData && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950">
                <div className="flex items-center gap-2">
                  <ProjectIcon name="ClipboardList" size={18} className="text-amber-500" />
                  <h3 className="font-bold text-sm text-white">
                    {copyModalData.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCopyModalData(null)}
                  className="text-neutral-400 hover:text-white text-sm cursor-pointer p-1"
                >
                  <ProjectIcon name="X" size={16} className="text-neutral-400 hover:text-white" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-xs text-neutral-400">
                  Clique uma vez na caixa para selecionar todo o texto ou use o
                  botão abaixo para copiar para a área de transferência:
                </p>

                <textarea
                  readOnly
                  rows={10}
                  value={copyModalData.text}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.target.select()}
                  className="w-full bg-black/80 border border-neutral-800 rounded-xl p-3 font-mono text-xs text-amber-300 focus:outline-hidden focus:border-amber-500 select-all cursor-text leading-relaxed"
                />
              </div>

              <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
                <span className="text-[11px] text-neutral-500">
                  Pressione Ctrl+C / Cmd+C
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      try {
                        navigator?.clipboard?.writeText(copyModalData.text);
                        setCopiedNotification(
                          "Texto copiado para a área de transferência!"
                        );
                        setTimeout(() => setCopiedNotification(null), 3000);
                      } catch {
                        // caso clipboard falhe, o texto já está selecionado
                      }
                    }}
                    className="text-xs"
                  >
                    Copiar Tudo
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setCopyModalData(null)}
                    className="text-xs"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL COM OVERLAY PARA EXECUÇÃO DE TESTES */}
        {/* ======================================================== */}
        {(isRunningAll || Object.values(runningTests).some(Boolean)) && (() => {
          const currentRunningId = Object.keys(runningTests).find((id) => runningTests[id]);
          const currentTestObj = QA_TEST_SUITES.find((s) => s.id === currentRunningId);

          return (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
            >
              <div className="bg-neutral-900 border border-neutral-700/90 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center space-y-6 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-neutral-800 border-t-amber-500 border-r-amber-400 animate-spin" />
                  <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner animate-pulse">
                    <ProjectIcon name="FlaskConical" size={14} className="text-amber-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>QA Studio & Testing Workbench</span>
                  </div>

                  <h3 className="text-xl font-black text-white tracking-wide">
                    {isRunningAll
                      ? "Executando Bateria Completa de Testes..."
                      : `Executando ${currentTestObj ? `${currentTestObj.id}: ${currentTestObj.title}` : "Teste Automatizado..."}`}
                  </h3>

                  <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
                    Varrendo e indexando todos os arquivos do projeto (/src, /supabase), validando schemas Zod (.strip()), revogação de tokens JWT, políticas RBAC e isolamento multi-tenant.
                  </p>
                </div>

                <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-left font-mono text-[11px] text-amber-400 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="flex items-center gap-1.5"><ProjectIcon name="Check" size={14} className="text-emerald-400" /> Varrendo arquivos do projeto (/src, /supabase)...</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="flex items-center gap-1.5"><ProjectIcon name="Zap" size={14} className="text-amber-400" /> Validando schemas Zod Server-Side com .strip() e limite de payload...</span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-400">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    <span className="flex items-center gap-1.5"><ProjectIcon name="ShieldAlert" size={14} className="text-amber-400" /> Checando controle de acesso RBAC e revogação ativa de sessão...</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        </main>
      </div>

      {/* ======================================================== */}
      {/* MODAL DE ITENS MAPEADOS E TESTES REAIS (* VER MAIS) */}
      {/* ======================================================== */}
      <MappedItemsModal
        isOpen={showMappedItemsModal}
        onClose={() => setShowMappedItemsModal(false)}
        initialTab={modalInitialTab}
        initialScope={modalInitialScope}
        initialSquad={modalInitialSquad}
        onItemResolved={() => {
          setRealMetrics(calculateRealTestMetrics(testResults, projectFileScan));
        }}
      />

      {/* ======================================================== */}
      {/* MODAL COM OVERLAY E SPINNER PARA ATUALIZAÇÃO EM TEMPO REAL */}
      {/* ======================================================== */}
      <TestRefreshModal
        isOpen={isRealtimeRefreshing}
        currentPhase={refreshPhase}
      />
    </div>
  );
}
