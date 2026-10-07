/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pipeline de CI/CD Seguro (SAST e Secret Scanning)
 * DevSecOps QA Studio, Documentação Técnica SSRF & Console de Correções
 */

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { BigNumbers } from './components/BigNumbers';
import { QATestingWorkbench } from './components/QATestingWorkbench';
import { TechnicalDocumentation } from './components/TechnicalDocumentation';
import { LogsAndCorrections } from './components/LogsAndCorrections';
import { ActionLoadingModal, ActionModalConfig } from './components/ActionLoadingModal';
import { ExportModal } from './components/ExportModal';
import { 
  runSecurityScan, 
  ScanRunResult, 
  AUDITED_PROJECT_FILES 
} from './lib/security/securityEngine';

const initialScanState: ScanRunResult = {
  scanId: 'SCAN-INIT-001',
  timestamp: new Date().toISOString(),
  durationMs: 1420,
  totalFilesScanned: AUDITED_PROJECT_FILES.length,
  findings: [
    {
      id: 'SEC-GATE-INIT',
      tool: 'Semgrep SAST',
      ruleId: 'owasp-top10-audit-verified',
      severity: 'INFO',
      file: '.github/workflows/security.yml',
      title: 'Pipeline CI/CD Seguro Ativo',
      description: 'Gitleaks, Semgrep, Snyk e SSRF Guards configurados com bloqueio estrito em PRs.',
      remediation: 'Manter verificações em todos os branches protegidos.',
      status: 'COMPLIANT'
    }
  ],
  gateResult: 'PASSED',
  metrics: {
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    fixedCount: 6,
    ssrfCompliancePercent: 100
  },
  fileAudits: AUDITED_PROJECT_FILES.map(f => ({
    path: f.path,
    type: f.path.endsWith('.yml') ? 'workflow' : f.path.endsWith('.json') ? 'json' : 'typescript',
    status: 'passed',
    findingsCount: 1,
    checksApplied: [
      'Gitleaks Secret Scanning',
      'Semgrep SAST Rulesets',
      'Snyk & npm audit SCA',
      'SSRF Egress Guard'
    ],
    lastScanned: new Date().toLocaleTimeString('pt-BR')
  })),
  logs: [
    `[${new Date().toISOString().substring(11, 19)}] Inicializando SecPipeline DevSecOps Gate v2.4...`,
    `[${new Date().toISOString().substring(11, 19)}] Scanner carregado. Monitorando integridade dos arquivos essenciais.`
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'workbench' | 'documentation' | 'remediations'>('workbench');
  const [scanResult, setScanResult] = useState<ScanRunResult>(initialScanState);

  // Modal de Spinner & Overlay para TODOS os botões de ação (UX: mínimo 2s a 3s)
  const [modalConfig, setModalConfig] = useState<ActionModalConfig>({
    isOpen: false,
    title: '',
    subtitle: '',
    steps: [],
    durationMs: 2600
  });

  // Modal de Exportação & Visualização (PDF / JSON)
  const [exportModalState, setExportModalState] = useState<{
    isOpen: boolean;
    format: 'PDF' | 'JSON';
  }>({
    isOpen: false,
    format: 'PDF'
  });

  // Disparador padronizado de ações do projeto com Spinner Overlay de 2s a 3s
  const triggerActionWithModal = useCallback((
    title: string,
    subtitle: string,
    steps: string[],
    action: () => void,
    durationMs = 2600
  ) => {
    setModalConfig({
      isOpen: true,
      title,
      subtitle,
      steps,
      durationMs,
      onComplete: () => {
        action();
      }
    });
  }, []);

  // Executa escaneamento real ao montar
  useEffect(() => {
    runSecurityScan().then((res) => {
      setScanResult(res);
    });
  }, []);

  const handleRunFullScan = useCallback(() => {
    triggerActionWithModal(
      'Executando Auditoria DevSecOps do Repositório',
      'Varrendo todos os arquivos essenciais do projeto contra falhas, segredos e SSRF...',
      [
        'Iniciando engine de varredura estática...',
        'Gitleaks: Escaneando arquivos em busca de chaves privadas e tokens...',
        'Semgrep: Auditando regras OWASP Top 10 e CWE-918 (SSRF)...',
        'SCA: Verificando banco de vulnerabilidades em package.json...',
        'SSRF Guard: Testando validação de endereços IP RFC 1918 e metadados...',
        'Gerando sumário de telemetria e atualizando Big Numbers...'
      ],
      () => {
        runSecurityScan().then(freshResult => {
          setScanResult(freshResult);
        });
      },
      2800
    );
  }, [triggerActionWithModal]);

  const handleOpenExportModal = useCallback((format: 'PDF' | 'JSON') => {
    triggerActionWithModal(
      `Compilando Relatório DevSecOps (${format})`,
      'Preparando evidências técnicas de segurança e documentação de conformidade...',
      [
        'Coletando resultados do último scan...',
        'Compilando evidências de SAST e Secret Scanning...',
        'Montando matriz de conformidade SSRF e restrições de rede...',
        'Renderizando documento formatado...'
      ],
      () => {
        setExportModalState({ isOpen: true, format });
      },
      2400
    );
  }, [triggerActionWithModal]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header / Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        scanResult={scanResult}
        onOpenExportModal={handleOpenExportModal}
        onRunScan={handleRunFullScan}
        triggerActionWithModal={triggerActionWithModal}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Big Numbers & Link "Ver Mais" Modal */}
        <BigNumbers
          scanResult={scanResult}
          triggerActionWithModal={triggerActionWithModal}
          onOpenAuditFile={() => {
            setActiveTab('workbench');
          }}
        />

        {/* Aba 1: QA Studio & Testing Workbench */}
        {activeTab === 'workbench' && (
          <QATestingWorkbench
            scanResult={scanResult}
            onUpdateScanResult={setScanResult}
            triggerActionWithModal={triggerActionWithModal}
          />
        )}

        {/* Aba 2: Documentação Técnica SSRF & Network Egress */}
        {activeTab === 'documentation' && (
          <TechnicalDocumentation
            scanResult={scanResult}
            onOpenExportModal={handleOpenExportModal}
            triggerActionWithModal={triggerActionWithModal}
          />
        )}

        {/* Aba 3: Console de Logs & Correções Necessárias */}
        {activeTab === 'remediations' && (
          <LogsAndCorrections
            triggerActionWithModal={triggerActionWithModal}
            onNavigateToWorkbench={() => setActiveTab('workbench')}
          />
        )}
      </main>

      {/* Footer do DevSecOps */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 text-xs text-slate-500 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-semibold">SecPipeline Gate</span>
            <span>• SAST, Secret Scanning &amp; SSRF Egress Prevention</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              CI/CD Gate Ativo (.github/workflows/security.yml)
            </span>
            <span>Build &amp; Merge Protection Ativos</span>
          </div>
        </div>
      </footer>

      {/* Modal de Spinner UX para Ações com Overlay (Tempo mínimo 2s a 3s) */}
      <ActionLoadingModal
        config={modalConfig}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Modal de Exportação e Visualização (PDF / JSON) */}
      <ExportModal
        isOpen={exportModalState.isOpen}
        onClose={() => setExportModalState(prev => ({ ...prev, isOpen: false }))}
        scanResult={scanResult}
        initialFormat={exportModalState.format}
        triggerActionWithModal={triggerActionWithModal}
      />
    </div>
  );
}
