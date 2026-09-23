import { useState, useEffect } from "react";
import { QA_TEST_SUITES, QA_CATEGORIES } from "./qaSuites";
import { securityAuditor } from "./securityAuditor";
import { chaosEngine } from "./chaosEngine";
import { CHECKLIST_ANALYSIS } from "./checklistMatrix";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge, { STATUS_TRANSITIONS } from "../../components/ui/Badge";
import Input from "../../components/ui/Input";

export default function QAPanel() {
  const [activeTab, setActiveTab] = useState("test-runner"); // 'test-runner' | 'appsec' | 'chaos' | 'sandbox' | 'checklist'
  const [selectedCategory, setSelectedCategory] = useState(QA_CATEGORIES.ALL);

  // Estados dos testes
  const [testResults, setTestResults] = useState({});
  const [runningTests, setRunningTests] = useState({});
  const [expandedLogs, setExpandedLogs] = useState({});
  const [isRunningAll, setIsRunningAll] = useState(false);

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

  // Estados de Cópia e Clipboard
  const [copiedNotification, setCopiedNotification] = useState(null);
  const [copyModalData, setCopyModalData] = useState(null);

  // Função utilitária com fallback resiliente para copiar texto
  const copyToClipboard = async (text, label = "Logs") => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedNotification(`✓ ${label} copiado(s) para a área de transferência!`);
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
        "Nenhum teste foi executado ainda. Clique em '▶️ Executar Todas as Suítes' primeiro.",
        "Relatório Vazio"
      );
      return;
    }

    const reportLines = [
      "# 🧪 Relatório Oficial de Testes - QA Studio",
      `*Gerado em:* ${new Date().toLocaleString()}`,
      `*Total de Testes Executados:* ${executed.length}`,
      `*Aprovados:* ${passedCount} | *Falhas:* ${failedCount}`,
      "",
      "---",
      "## 📋 Detalhamento por Caso de Teste:",
      "",
    ];

    QA_TEST_SUITES.forEach((test) => {
      const res = testResults[test.id];
      if (!res) return;
      reportLines.push(`### [${res.passed ? "PASSOU ✓" : "FALHOU ✕"}] ${test.id} - ${test.title}`);
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

  // Sincroniza listener de Caos
  useEffect(() => {
    return chaosEngine.subscribe((newCfg) => setChaosConfig(newCfg));
  }, []);

  // Executa um teste individual
  const runSingleTest = async (test) => {
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

  // Executa todos os testes sequencialmente
  const runAllTests = async () => {
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
    setIsRunningAll(false);
  };

  // Toggle visualização de logs
  const toggleLogs = (testId) => {
    setExpandedLogs((prev) => ({ ...prev, [testId]: !prev[testId] }));
  };

  // Testa fuzzer ao vivo
  const handleRunFuzzer = () => {
    const res = securityAuditor.testInputSanitization(customFuzzInput);
    setFuzzResult(res);
  };

  // Testa simulação multi-tenant
  const handleRunTenantProbe = () => {
    const res = securityAuditor.simulateTenantIsolationCheck(
      tenantSource,
      tenantTarget,
      tenantRole
    );
    setTenantProbeResult(res);
  };

  // Testa requisição sob caos
  const handleTestChaosCall = async () => {
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

  // Cálculos de métricas
  const totalCount = QA_TEST_SUITES.length;
  const executedTests = Object.values(testResults);
  const passedCount = executedTests.filter((r) => r.passed).length;
  const failedCount = executedTests.filter((r) => !r.passed).length;

  const filteredSuites =
    selectedCategory === QA_CATEGORIES.ALL
      ? QA_TEST_SUITES
      : QA_TEST_SUITES.filter((s) => s.category === selectedCategory);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pt-16 pb-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ======================================================== */}
        {/* CABEÇALHO DO WORKBENCH DE QA */}
        {/* ======================================================== */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-amber-950/40 border border-neutral-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🧪</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-white">
                      QA Studio & Testing Workbench
                    </h1>
                    <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full">
                      v1.0 Pro
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400 mt-1">
                    Painel do Engenheiro de Qualidade para validação contínua de AppSec, Contratos de Dados, Resiliência de Rede e UI.
                  </p>
                </div>
              </div>

              {/* Status e Indicadores Rápidos */}
              <div className="flex flex-wrap items-center gap-2.5 mt-4 text-xs font-medium">
                <div className="px-3 py-1.5 bg-neutral-800/80 rounded-lg border border-neutral-700/60 flex items-center gap-2">
                  <span className="text-neutral-400">Total de Casos:</span>
                  <span className="text-white font-bold">{totalCount}</span>
                </div>
                <div className="px-3 py-1.5 bg-emerald-950/50 text-emerald-400 rounded-lg border border-emerald-800/50 flex items-center gap-2">
                  <span>Passaram:</span>
                  <span className="font-bold">{passedCount}</span>
                </div>
                {failedCount > 0 && (
                  <div className="px-3 py-1.5 bg-rose-950/50 text-rose-400 rounded-lg border border-rose-800/50 flex items-center gap-2">
                    <span>Falhas:</span>
                    <span className="font-bold">{failedCount}</span>
                  </div>
                )}
                <div className="px-3 py-1.5 bg-neutral-800/80 rounded-lg border border-neutral-700/60 flex items-center gap-2">
                  <span className="text-neutral-400">Caos Injetado:</span>
                  <span
                    className={`font-bold ${
                      chaosConfig.latencyMs > 0 ||
                      chaosConfig.isSimulatedOffline ||
                      chaosConfig.forceErrorMode
                        ? "text-amber-400"
                        : "text-neutral-400"
                    }`}
                  >
                    {chaosConfig.isSimulatedOffline
                      ? "Offline"
                      : chaosConfig.forceErrorMode
                        ? chaosConfig.forceErrorMode
                        : chaosConfig.latencyMs > 0
                          ? `+${chaosConfig.latencyMs}ms`
                          : "Normal"}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações Globais */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                onClick={runAllTests}
                isLoading={isRunningAll}
                className="shadow-lg shadow-amber-600/20"
              >
                ▶️ Executar Todas as Suítes
              </Button>
              <Button
                variant="secondary"
                onClick={exportFullQAReport}
                className="text-xs"
              >
                📋 Copiar Relatório Geral
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setTestResults({});
                  chaosEngine.reset();
                }}
              >
                🔄 Resetar Estados
              </Button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* NAVEGAÇÃO POR ABAS DO PAINEL */}
        {/* ======================================================== */}
        <div className="flex overflow-x-auto gap-2 border-b border-neutral-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("test-runner")}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === "test-runner"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <span>🧪</span>
            <span>Central de Testes</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-black/30">
              {QA_TEST_SUITES.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("appsec")}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === "appsec"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <span>🛡️</span>
            <span>AppSec & Pentest</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
              Itens 9, 10, 12
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chaos")}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === "chaos"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <span>⚡</span>
            <span>Simulador de Caos</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
              Itens 14, 17
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sandbox")}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === "sandbox"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <span>🎨</span>
            <span>Component Sandbox</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300">
              Itens 3, 4, 15
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("checklist")}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === "checklist"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <span>📋</span>
            <span>Matriz QA (18 Itens)</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300">
              Análise Sênior
            </span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* ABA 1: CENTRAL DE TESTES AUTOMATIZADOS */}
        {/* ======================================================== */}
        {activeTab === "test-runner" && (
          <div className="space-y-6">
            {/* Filtros de Categoria */}
            <div className="flex flex-wrap gap-2">
              {Object.values(QA_CATEGORIES).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-neutral-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Lista de Testes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSuites.map((test) => {
                const isRunning = runningTests[test.id];
                const result = testResults[test.id];
                const showLogs = expandedLogs[test.id];

                return (
                  <Card
                    key={test.id}
                    className="border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                              {test.id}
                            </span>
                            <span className="text-[11px] font-semibold text-amber-400/90">
                              Item #{test.itemNumber} do Checklist
                            </span>
                          </div>
                          <h3 className="font-bold text-base text-white mt-1.5">
                            {test.title}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {result ? (
                            <span
                              className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                                result.passed
                                  ? "bg-emerald-950/70 text-emerald-400 border-emerald-800/80"
                                  : "bg-rose-950/70 text-rose-400 border-rose-800/80"
                              }`}
                            >
                              {result.passed ? "✓ PASSOU" : "✕ FALHOU"} (
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
                              className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
                            >
                              <span>{showLogs ? "▼ Ocultar" : "▶ Ver"} Logs & Asserções ({result.logs.length})</span>
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
                                📋 Copiar Logs
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setCopyModalData({
                                    title: `Diagnóstico: [${test.id}] ${test.title}`,
                                    text: `TESTE: [${test.id}] ${test.title}\nSTATUS: ${result.passed ? "PASSOU ✓" : "FALHOU ✕"}\nMENSAGEM: ${result.message}\nTEMPO: ${result.durationMs}ms\nCATEGORIA: ${test.category}\n\nLOGS E ASSERÇÕES:\n${result.logs.map((l) => `› ${l}`).join("\n")}`,
                                  })
                                }
                                className="px-2 py-0.5 text-[10px] font-bold rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 cursor-pointer flex items-center gap-1"
                                title="Abrir caixa de texto selecionável"
                              >
                                🗖 Ver Texto
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
              <span className="text-xl">💡</span>
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
        {activeTab === "appsec" && (
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
                      🔍 Analisar Sanitização
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
                          : `⚠️ ${fuzzResult.threatsDetected.length} Ameaça(s) Detectada(s)`}
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
                      <option value="superadmin">👑 SuperAdmin Plataforma</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="primary" onClick={handleRunTenantProbe}>
                    🛡️ Disparar Probe de RLS
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
                        {tenantProbeResult.allowed ? "🔓" : "🛡️"}
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
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 3: SIMULADOR DE CAOS & RESILIÊNCIA (Itens 14 e 17) */}
        {/* ======================================================== */}
        {activeTab === "chaos" && (
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
                        <span>{chaosConfig.isSimulatedOffline ? "🔴 ATIVO" : "⚪ DESLIGADO"}</span>
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
                            ? "🔴 ATIVO"
                            : "⚪ DESLIGADO"}
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
                            ? "🔴 ATIVO"
                            : "⚪ DESLIGADO"}
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
                        ⚡ Disparar Chamada com Caos
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
        {activeTab === "sandbox" && (
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
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 5: MATRIZ QA E ANÁLISE DOS 18 ITENS */}
        {/* ======================================================== */}
        {activeTab === "checklist" && (
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
        {/* TOAST FLUTUANTE DE SUCESSO DE CÓPIA */}
        {/* ======================================================== */}
        {copiedNotification && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 border border-emerald-500 text-emerald-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
            <span className="text-xl">📋</span>
            <span className="text-sm font-bold">{copiedNotification}</span>
            <button
              type="button"
              onClick={() => setCopiedNotification(null)}
              className="text-xs text-emerald-300 hover:text-white ml-2 cursor-pointer font-bold"
            >
              ✕
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
                  <span className="text-lg">📋</span>
                  <h3 className="font-bold text-sm text-white">
                    {copyModalData.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCopyModalData(null)}
                  className="text-neutral-400 hover:text-white text-sm cursor-pointer p-1"
                >
                  ✕
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
                          "✓ Texto copiado para a área de transferência!"
                        );
                        setTimeout(() => setCopiedNotification(null), 3000);
                      } catch {
                        // caso clipboard falhe, o texto já está selecionado
                      }
                    }}
                    className="text-xs"
                  >
                    📋 Copiar Tudo
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
      </div>
    </div>
  );
}
