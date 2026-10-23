import { useState, useRef } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ProjectIcon from "../../components/ui/ProjectIcon";
import {
  QA_CATEGORIES,
} from "./qaSuites";
import {
  runFullInspectionOnFile,
  runCyberSecurityFileScan,
  runArchitectureFileScan,
  runBackendFileScan,
  runFrontendFileScan,
  runDevOpsFileScan,
  runComplianceFileScan,
  runQAFileScan,
  detectFileType,
  SUPPORTED_EXTENSIONS,
  inspectAllProjectFiles,
} from "./fileInspectionEngine";

// Amostras embutidas para teste imediato com um clique
const SAMPLE_FILES = {
  vulnerable: {
    name: "vulnerableController.js",
    description: "Amostra sintética com vulnerabilidades múltiplas (BOLA, SQLi D'Angelo, hardcoded secret, XSS, PII em logs)",
    content: `// Controller de Agendamentos e Cobrança
const supabaseKey = "mock_service_role_sample_test_key_998124"; // CRÍTICO: Hardcoded Secret

export async function handleAppointment(req, res) {
  // BOLA: Lendo tenant da query do cliente em vez de validar JWT
  const tenantId = req.query.tenant_id;
  
  // SQLi: Concatenação de string sem parametrização (quebra com D'Angelo)
  const clientName = req.body.client_name;
  const sql = "SELECT * FROM clients WHERE name = '" + clientName + "' AND tenant_id = '" + tenantId + "'";

  // PII em logs: Violação de LGPD
  console.log("Processando agendamento para CPF: " + req.body.cpf);

  // Mass Assignment: Injeção direta de req.body sem schema validation
  const newAppointment = await db.insert(req.body);

  // XSS: Renderização sem escape
  const htmlNotification = "<div dangerouslySetInnerHTML={{ __html: '" + clientName + "' }}></div>";

  // Debugger esquecido
  debugger;

  // Comparação fraca
  if (req.body.price == 0) {
    return res.json({ success: true, free: true });
  }

  res.json({ success: true, sql });
}
`,
  },
  safeQueryBuilder: {
    name: "safeQueryBuilder.js",
    description: "Amostra de código defensivo com parametrização estrita de SQL e isolamento de tenant",
    content: `import { buildParametricQuery } from "./utils/safeQueryBuilder";

export function getClientAppointments(userJwt, clientName) {
  // Isolamento estrito ancorado ao token verificado
  const tenantId = userJwt.tenantId;

  // Parametrização segura contra SQLi (protege nomes como D'Angelo)
  const query = buildParametricQuery({
    table: "appointments",
    filters: {
      client_name: clientName,
      tenant_id: tenantId,
    },
    allowedColumns: ["client_name", "tenant_id", "status", "start_time"]
  });

  return query;
}
`,
  },
  reactComponent: {
    name: "BarberBadge.jsx",
    description: "Componente React com máquina de estados de agendamentos e classes Tailwind",
    content: `import React from 'react';

export default function BarberBadge({ status = 'waiting', onClick }) {
  const statusStyles = {
    waiting: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    cancelled: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };

  return (
    <button
      type="button"
      aria-label={"Status do atendimento: " + status}
      onClick={onClick}
      className={"px-3 py-1 text-xs font-bold rounded-lg border transition-all " + (statusStyles[status] || statusStyles.waiting)}
    >
      {status.toUpperCase()}
    </button>
  );
}
`,
  },
  webhookSample: {
    name: "webhookHandler.ts",
    description: "Endpoint seguro de Webhook com validação criptográfica HMAC-SHA256, idempotência e Fast ACK HTTP 200",
    content: `import { webhookHmacAndIdempotencyMiddleware } from "./src/middleware/webhookHmacMiddleware";

// Rota Express protegida com HMAC e Fast ACK imediato
app.post(
  "/api/webhooks/mercadopago",
  webhookHmacAndIdempotencyMiddleware({
    provider: "mercadopago",
    secret: process.env.MP_WEBHOOK_SECRET,
    toleranceSeconds: 300,
    onEventEnqueued: async (eventId, payload) => {
      // Processamento assíncrono em segundo plano (desacoplado da resposta HTTP 200)
      await processPaymentNotification(eventId, payload);
    },
  })
);
`,
  },
};

export default function FileTestingStudio({ onCopyText }) {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState(null);
  const [activeFilterCategory, setActiveFilterCategory] = useState("ALL");
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(true);

  const fileInputRef = useRef(null);

  // Processa a leitura de arquivos via FileReader
  const processFiles = (files) => {
    if (!files || files.length === 0) return;

    const newFiles = [];
    let filesRead = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        newFiles.push({
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          content: typeof content === "string" ? content : "",
          typeInfo: detectFileType(file.name),
        });

        filesRead += 1;
        if (filesRead === files.length) {
          setUploadedFiles((prev) => {
            const combined = [...prev, ...newFiles];
            return combined;
          });
          // Se for o primeiro arquivo, roda inspeção automática
          if (uploadedFiles.length === 0 && newFiles.length > 0) {
            handleRunFullInspection(newFiles[0]);
          }
        }
      };
      reader.readAsText(file);
    });
  };

  // Carrega amostra pronta
  const handleLoadSample = (sampleKey) => {
    const sample = SAMPLE_FILES[sampleKey];
    if (!sample) return;

    const fileObj = {
      name: sample.name,
      size: sample.content.length,
      lastModified: Date.now(),
      content: sample.content,
      typeInfo: detectFileType(sample.name),
      isSample: true,
      description: sample.description,
    };

    setUploadedFiles((prev) => [fileObj, ...prev]);
    setSelectedFileIndex(0);
    handleRunFullInspection(fileObj);
  };

  // Manipuladores de Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const activeFile = uploadedFiles[selectedFileIndex] || null;

  // Executa Bateria Completa Multi-Disciplinar no Arquivo (Varre todos os arquivos do projeto a cada execução)
  const handleRunFullInspection = (targetFile = activeFile) => {
    if (!targetFile) return;
    setIsInspecting(true);

    // Garante a varredura global do projeto a cada solicitação de teste
    try {
      inspectAllProjectFiles();
    } catch (err) {
      console.warn("Erro ao varrer arquivos do projeto:", err);
    }

    setTimeout(() => {
      const res = runFullInspectionOnFile(targetFile.content, targetFile.name, {
        size: targetFile.size,
      });
      setInspectionResult(res);
      setIsInspecting(false);
    }, 150);
  };

  // Executa Varredura Específica por Disciplina (Varre todos os arquivos do projeto a cada execução)
  const handleRunTargetScan = (categoryKey, scanFn) => {
    if (!activeFile) return;
    setIsInspecting(true);

    // Garante a varredura global do projeto a cada solicitação de teste
    try {
      inspectAllProjectFiles();
    } catch (err) {
      console.warn("Erro ao varrer arquivos do projeto:", err);
    }

    setTimeout(() => {
      const specificFindings = scanFn(activeFile.content, activeFile.name);
      
      // Mantém ou cria um resultado focado
      setInspectionResult((prev) => {
        const base = prev || runFullInspectionOnFile(activeFile.content, activeFile.name, { size: activeFile.size });
        const filteredFindings = base.findings.filter((f) => f.category !== categoryKey).concat(specificFindings);
        
        return {
          ...base,
          findings: filteredFindings,
          totalFindings: filteredFindings.length,
        };
      });
      setActiveFilterCategory(categoryKey);
      setIsInspecting(false);
    }, 120);
  };

  // Executa varredura profunda de todos os arquivos do projeto (/src)
  const handleScanAllProjectFiles = () => {
    setIsInspecting(true);
    setTimeout(() => {
      const scan = inspectAllProjectFiles();
      if (scan && scan.fileResults && scan.fileResults.length > 0) {
        // Encontra o primeiro arquivo com achados ou o primeiro arquivo
        const projectFiles = scan.fileResults.map((fr) => ({
          name: fr.filePath,
          size: fr.bytes,
          lastModified: Date.now(),
          content: `// Arquivo: ${fr.filePath}\n// Squad Alocada: ${fr.squad}\n// Linhas: ${fr.lines} | Bytes: ${fr.bytes}\n// Score: ${fr.score}/100 | Status: ${fr.status}\n// Vulnerabilidades: ${fr.findingsCount}`,
          typeInfo: detectFileType(fr.filePath),
          isProjectFile: true,
          findings: fr.findings,
          score: fr.score,
          squad: fr.squad,
          squadId: fr.squadId,
          squadIcon: fr.squadIcon,
          squadRole: fr.squadRole,
          externalRequirement: fr.externalRequirement,
        }));
        setUploadedFiles(projectFiles);
        setSelectedFileIndex(0);
        const first = projectFiles[0];
        setInspectionResult({
          fileName: first.name,
          fileMeta: {
            linesCount: first.lines,
            bytes: first.size,
            detectedType: first.typeInfo,
          },
          overallScore: scan.passRate,
          status: scan.status,
          totalFindings: scan.allFindings.length,
          metrics: {
            critical: scan.criticalCount,
            high: scan.highCount,
            medium: 0,
            low: 0,
          },
          findings: scan.allFindings,
          categorySummary: {},
        });
      }
      setIsInspecting(false);
    }, 150);
  };

  // Exporta relatório do arquivo em Markdown
  const handleExportMarkdown = () => {
    if (!inspectionResult || !activeFile) return;

    const md = [
      `# Laudo de Análise Estática & Segurança de Arquivo`,
      `**Arquivo:** \`${activeFile.name}\` | **Tipo:** ${activeFile.typeInfo.type}`,
      `**Data da Auditoria:** ${new Date().toLocaleString()}`,
      `**Score de Saúde:** ${inspectionResult.overallScore}/100 [Status: ${inspectionResult.status}]`,
      `**Total de Não-Conformidades:** ${inspectionResult.totalFindings}`,
      `- Críticas (P0): ${inspectionResult.metrics.critical}`,
      `- Altas (P1): ${inspectionResult.metrics.high}`,
      `- Médias (P2): ${inspectionResult.metrics.medium}`,
      `- Baixas (P3): ${inspectionResult.metrics.low}`,
      ``,
      `---`,
      `## Detalhamento das Não-Conformidades por Linha e Equipe Responsável:`,
      ``,
    ];

    inspectionResult.findings.forEach((f, idx) => {
      md.push(`### ${idx + 1}. [${f.severity}] ${f.title} (${f.ruleId})`);
      md.push(`- **Disciplina:** ${f.category} | **Equipe:** ${f.team}`);
      md.push(`- **SLA de Correção:** ${f.sla}`);
      md.push(`- **Localização:** Linha ${f.line}: \`${f.lineContent}\``);
      md.push(`- **Diagnóstico:** ${f.description}`);
      md.push(`- **Ação Recomendada:** ${f.recommendation}`);
      md.push(``);
    });

    if (onCopyText) {
      onCopyText(md.join("\n"), `Laudo do arquivo ${activeFile.name}`);
    }
  };

  // Exporta relatório em JSON
  const handleExportJson = () => {
    if (!inspectionResult) return;
    const jsonStr = JSON.stringify(inspectionResult, null, 2);
    if (onCopyText) {
      onCopyText(jsonStr, `Laudo JSON do arquivo ${activeFile.name}`);
    }
  };

  const filteredFindings =
    !inspectionResult
      ? []
      : activeFilterCategory === "ALL"
      ? inspectionResult.findings
      : inspectionResult.findings.filter((f) => f.category === activeFilterCategory);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO ESTÚDIO DE ARQUIVOS */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-amber-950/30 border border-neutral-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ProjectIcon name="Folder" size={28} className="text-amber-500" />
              <h2 className="text-2xl font-black text-white tracking-tight">
                File Testing Studio & Upload Workbench
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                Multi-Stack Scanner
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-3xl">
              Faça upload de arquivos de código (JS, TS, React, Node, HTML, CSS, SQL, JSON) para submetê-los à esteira automatizada de testes do painel. A ferramenta classifica vulnerabilidades por disciplina, aponta a equipe responsável e estabelece SLAs e ações para tomada de decisão.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="primary"
              onClick={handleScanAllProjectFiles}
              className="text-xs font-bold shadow-lg shadow-amber-600/20"
            >
              <span className="flex items-center gap-1.5">
                <ProjectIcon name="Zap" size={14} colorVariant="inherit" />
                Varrer Todo o Projeto (/src)
              </span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="text-xs font-bold bg-neutral-800 hover:bg-neutral-700"
            >
              <span className="flex items-center gap-1.5">
                <ProjectIcon name="Upload" size={14} colorVariant="inherit" />
                Selecionar Arquivos
              </span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(",")}
              className="hidden"
              onChange={(e) => processFiles(e.target.files)}
            />
          </div>
        </div>

        {/* Amostras Rápidas com 1-Clique */}
        <div className="mt-4 pt-4 border-t border-neutral-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-neutral-400 mr-1 flex items-center gap-1">
            <ProjectIcon name="Zap" size={13} className="text-amber-400" />
            Carregar Amostras Prontas:
          </span>
          <button
            type="button"
            onClick={() => handleLoadSample("vulnerable")}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            title="Carrega amostra contendo BOLA, SQLi, Hardcoded Secret, XSS e PII"
          >
            <ProjectIcon name="AlertTriangle" size={13} colorVariant="danger" />
            Amostra com Múltiplas Falhas (BOLA/SQLi/XSS)
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample("safeQueryBuilder")}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            title="Carrega código seguro de parametrização e isolamento de tenant"
          >
            <ProjectIcon name="ShieldCheck" size={13} className="text-emerald-400" />
            Amostra Blindada (SafeQueryBuilder & JWT)
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample("reactComponent")}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            title="Carrega componente React com máquina de estados de agendamentos"
          >
            <ProjectIcon name="Palette" size={13} className="text-blue-400" />
            Amostra React (BarberBadge.jsx)
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample("webhookSample")}
            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            title="Carrega endpoint seguro de webhook com validação HMAC e idempotência"
          >
            <ProjectIcon name="ExternalLink" size={13} className="text-amber-400" />
            Amostra Webhook (HMAC & Idempotência)
          </button>
        </div>
      </div>

      {/* ÁREA DE DRAG & DROP E SELEÇÃO */}
      {uploadedFiles.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
            isDragOver
              ? "border-amber-500 bg-amber-500/10 scale-[1.01]"
              : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/60"
          }`}
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex justify-center">
              <ProjectIcon name="FolderOpen" size={40} className="text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Arraste e solte arquivos de código aqui
            </h3>
            <p className="text-xs text-neutral-400">
              Extensões suportadas: .js, .jsx, .ts, .tsx, .html, .css, .sql, .json, .env, .md
            </p>
            <div className="pt-2">
              <span className="inline-block px-3 py-1 text-xs font-bold rounded-lg bg-amber-600 text-white shadow-lg shadow-amber-600/20">
                Ou clique para navegar no seu dispositivo
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* BARRA DE ARQUIVOS CARREGADOS */}
          <div className="flex items-center justify-between gap-3 overflow-x-auto pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-400">Arquivos:</span>
              {uploadedFiles.map((file, idx) => (
                <button
                  key={`${file.name}-${idx}`}
                  type="button"
                  onClick={() => {
                    setSelectedFileIndex(idx);
                    handleRunFullInspection(file);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                    selectedFileIndex === idx
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                      : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800"
                  }`}
                >
                  <ProjectIcon name="FileText" size={14} colorVariant="inherit" />
                  <span>{file.name}</span>
                  <span className="text-[10px] opacity-75">
                    ({Math.round(file.size / 1024)} KB)
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 cursor-pointer"
              >
                + Adicionar Outro Arquivo
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadedFiles([]);
                  setInspectionResult(null);
                }}
                className="text-xs text-neutral-400 hover:text-rose-400 px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* PAINEL DE AÇÕES DE TESTES NO ARQUIVO ATIVO */}
          {activeFile && (
            <Card className="border-neutral-800 bg-neutral-900/80 p-5 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-white">
                      Arquivo em Análise: <span className="text-amber-400 font-mono">{activeFile.name}</span>
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {activeFile.typeInfo.type}
                    </span>
                    {activeFile.squad && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                        <ProjectIcon name={activeFile.squadIcon || "Folder"} size={12} />
                        <span>Squad: {activeFile.squad}</span>
                      </span>
                    )}
                    <span className="text-xs text-neutral-400">
                      {activeFile.content.split("\n").length} linhas • {activeFile.size} bytes
                    </span>
                  </div>
                  {activeFile.externalRequirement && (
                    <div className="mt-2 p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs flex items-center justify-between gap-3 text-amber-200">
                      <div className="flex items-center gap-2">
                        <ProjectIcon name="ExternalLink" size={14} className="text-amber-400 shrink-0" />
                        <span>
                          <strong>Dependência Externa:</strong> {activeFile.externalRequirement.actionTitle} ({activeFile.externalRequirement.service})
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-amber-400">
                        {activeFile.externalRequirement.actionId}
                      </span>
                    </div>
                  )}
                  {activeFile.description && (
                    <p className="text-xs text-neutral-400 mt-1">
                      {activeFile.description}
                    </p>
                  )}
                </div>

                {/* BOTÕES DE DISPARO DE TESTES */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleRunFullInspection(activeFile)}
                    isLoading={isInspecting}
                    className="shadow-lg shadow-amber-600/20 text-xs font-bold"
                  >
                    <span className="flex items-center gap-1.5">
                      <ProjectIcon name="Zap" size={14} colorVariant="inherit" />
                      Executar Todos os Testes no Arquivo
                    </span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleExportMarkdown}
                    className="text-xs font-bold"
                  >
                    <span className="flex items-center gap-1.5">
                      <ProjectIcon name="ClipboardList" size={14} colorVariant="inherit" />
                      Copiar Laudo (MD)
                    </span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleExportJson}
                    className="text-xs font-bold"
                  >
                    <span className="flex items-center gap-1.5">
                      <ProjectIcon name="Download" size={14} colorVariant="inherit" />
                      Exportar JSON
                    </span>
                  </Button>
                </div>
              </div>

              {/* BOTÕES INDIVIDUAIS POR DISCIPLINA */}
              <div className="pt-3 border-t border-neutral-800/80">
                <span className="text-[11px] uppercase font-bold text-neutral-400 block mb-2">
                  Disparar Testes Especializados por Disciplina:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunTargetScan(QA_CATEGORIES.CYBERSECURITY, runCyberSecurityFileScan)}
                    className="p-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ProjectIcon name="Shield" size={14} className="text-amber-400" />
                    <span>CyberSec</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunTargetScan(QA_CATEGORIES.ARQUITETURA, runArchitectureFileScan)}
                    className="p-2 rounded-lg bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/60 text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ProjectIcon name="Landmark" size={14} className="text-purple-400" />
                    <span>Arquitetura</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunTargetScan(QA_CATEGORIES.BACKEND, runBackendFileScan)}
                    className="p-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ProjectIcon name="Network" size={14} className="text-cyan-400" />
                    <span>BackEnd</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunTargetScan(QA_CATEGORIES.FRONTEND, runFrontendFileScan)}
                    className="p-2 rounded-lg bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/60 text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ProjectIcon name="Palette" size={14} className="text-blue-400" />
                    <span>FrontEnd</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunTargetScan(QA_CATEGORIES.DEVOPS, runDevOpsFileScan)}
                    className="p-2 rounded-lg bg-teal-950/40 hover:bg-teal-900/50 border border-teal-800/60 text-teal-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ProjectIcon name="Rocket" size={14} className="text-teal-400" />
                    <span>DevOps</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunTargetScan(QA_CATEGORIES.COMPLIANCE, runComplianceFileScan)}
                    className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ProjectIcon name="Scale" size={14} className="text-rose-400" />
                    <span>LGPD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunTargetScan(QA_CATEGORIES.QA, runQAFileScan)}
                    className="p-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ProjectIcon name="FlaskConical" size={14} className="text-emerald-400" />
                    <span>QA Edge</span>
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* LAUDO DE INSPEÇÃO TÉCNICA DO ARQUIVO */}
          {inspectionResult && (
            <div className="space-y-6">
              {/* SCORECARD EXECUTIVO DO ARQUIVO */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                    Score de Saúde do Arquivo
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-2xl font-black ${
                        inspectionResult.overallScore >= 90
                          ? "text-emerald-400"
                          : inspectionResult.overallScore >= 70
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {inspectionResult.overallScore}/100
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {inspectionResult.status === "APPROVED"
                      ? "Aprovado para Produção"
                      : inspectionResult.status === "ATTENTION_REQUIRED"
                      ? "Requer Revisão Técnica"
                      : "Vulnerabilidades Bloqueantes"}
                  </span>
                </div>

                <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                    Total de Apontamentos
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-black text-white">
                      {inspectionResult.totalFindings}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    {inspectionResult.totalFindings === 0 ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ProjectIcon name="Check" size={11} colorVariant="inherit" />
                        Código Limpo
                      </span>
                    ) : (
                      "Não-conformidades"
                    )}
                  </span>
                </div>

                <div className="bg-rose-950/30 border border-rose-900/50 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-rose-400 block">
                    Críticas (P0 - SLA 2h-4h)
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-black text-rose-400">
                      {inspectionResult.metrics.critical}
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-300/80 mt-1 block">
                    Bloqueio imediato de PR
                  </span>
                </div>

                <div className="bg-amber-950/30 border border-amber-900/50 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">
                    Altas (P1 - SLA 24h)
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-black text-amber-400">
                      {inspectionResult.metrics.high}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-300/80 mt-1 block">
                    Correção no sprint
                  </span>
                </div>

                <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Médias (P2 - SLA 48h)
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-black text-neutral-300">
                      {inspectionResult.metrics.medium}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    Débito arquitetural
                  </span>
                </div>

                <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Baixas (P3 - SLA 7d)
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-black text-neutral-300">
                      {inspectionResult.metrics.low}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 block">
                    Higiene de código
                  </span>
                </div>
              </div>

              {/* FILTROS POR DISCIPLINA */}
              <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveFilterCategory("ALL")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                    activeFilterCategory === "ALL"
                      ? "bg-amber-600 text-white"
                      : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
                  }`}
                >
                  Todos ({inspectionResult.totalFindings})
                </button>
                {Object.values(QA_CATEGORIES).map((cat) => {
                  if (cat === QA_CATEGORIES.ALL) return null;
                  const count = inspectionResult.findings.filter((f) => f.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveFilterCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 ${
                        activeFilterCategory === cat
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 border border-neutral-800"
                      }`}
                    >
                      <span>{cat}</span>
                      <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px]">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* LISTA DE NÃO-CONFORMIDADES ENCONTRADAS */}
              {filteredFindings.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 space-y-2">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ProjectIcon name="ShieldCheck" size={32} className="text-emerald-400" />
                    <ProjectIcon name="Check" size={28} className="text-emerald-400" />
                  </div>
                  <h4 className="font-bold text-base">Nenhuma não-conformidade identificada para este filtro</h4>
                  <p className="text-xs text-neutral-400">
                    O código do arquivo atende a todos os critérios de qualidade e segurança estipulados para esta disciplina.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFindings.map((finding, idx) => (
                    <Card
                      key={`${finding.ruleId}-${idx}`}
                      className={`border p-4 transition-all ${
                        finding.severity === "CRITICAL"
                          ? "bg-rose-950/20 border-rose-800/60"
                          : finding.severity === "HIGH"
                          ? "bg-amber-950/20 border-amber-800/60"
                          : "bg-neutral-900/70 border-neutral-800"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${
                                finding.severity === "CRITICAL"
                                  ? "bg-rose-900/60 text-rose-200 border border-rose-700"
                                  : finding.severity === "HIGH"
                                  ? "bg-amber-900/60 text-amber-200 border border-amber-700"
                                  : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                              }`}
                            >
                              {finding.ruleId} • {finding.severity}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {finding.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-neutral-400">
                              Equipe: <strong className="text-amber-400">{finding.team}</strong>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                              {finding.sla}
                            </span>
                          </div>
                        </div>

                        {/* Linha de Código Evidenciada */}
                        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 font-mono text-xs flex items-start gap-3">
                          <span className="text-amber-500 select-none shrink-0">
                            Linha {finding.line}:
                          </span>
                          <code className="text-neutral-200 break-all">
                            {finding.lineContent}
                          </code>
                        </div>

                        {/* Diagnóstico & Recomendação para a Equipe */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                            <strong className="text-neutral-300 flex items-center gap-1.5 mb-1">
                              <ProjectIcon name="Search" size={13} className="text-amber-400" />
                              Diagnóstico do Risco:
                            </strong>
                            <p className="text-neutral-400 leading-relaxed">
                              {finding.description}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                            <strong className="text-emerald-400 flex items-center gap-1.5 mb-1">
                              <ProjectIcon name="Lightbulb" size={13} className="text-emerald-400" />
                              Ação Recomendada para a Equipe:
                            </strong>
                            <p className="text-neutral-300 leading-relaxed">
                              {finding.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* PRÉVIA DO CÓDIGO FONTE COM NÚMERO DE LINHAS */}
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
                <div className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-300">
                      Visualizador de Código: {activeFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCodePreview(!showCodePreview)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                  >
                    {showCodePreview ? "Recolher Código" : "Expandir Código"}
                  </button>
                </div>

                {showCodePreview && (
                  <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs text-neutral-300 space-y-1">
                    {activeFile.content.split("\n").map((line, lIdx) => {
                      const lineNum = lIdx + 1;
                      const hasFinding = inspectionResult.findings.some((f) => f.line === lineNum);
                      return (
                        <div
                          key={lineNum}
                          className={`flex items-start gap-3 py-0.5 px-2 rounded ${
                            hasFinding
                              ? "bg-rose-950/40 text-rose-200 border-l-2 border-rose-500"
                              : "hover:bg-neutral-900"
                          }`}
                        >
                          <span className="text-neutral-600 select-none w-8 text-right shrink-0">
                            {lineNum}
                          </span>
                          <span className="break-all whitespace-pre-wrap flex-1">
                            {line || " "}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
