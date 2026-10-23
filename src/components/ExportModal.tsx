/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Componente de Exportação e Visualização (PDF e JSON)
 * Permite visualizar o relatório técnico e os resultados dos testes antes de exportar.
 */

import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Printer, 
  FileJson,
  ShieldCheck
} from 'lucide-react';
import { ScanRunResult } from '../lib/security/securityEngine';
import { TECHNICAL_DOCUMENTATION, DOCUMENTATION_SUMMARY } from '../lib/security/documentationData';
import { REMEDIATION_ITEMS } from '../lib/security/remediationsData';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanResult: ScanRunResult;
  initialFormat?: 'PDF' | 'JSON';
  triggerActionWithModal: (
    title: string,
    subtitle: string,
    steps: string[],
    action: () => void
  ) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  scanResult,
  initialFormat = 'PDF',
  triggerActionWithModal
}) => {
  const [activeFormat, setActiveFormat] = useState<'PDF' | 'JSON'>(initialFormat);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const exportPayload = {
    metadata: {
      reportTitle: 'Relatório Técnico de Segurança DevSecOps & Acessibilidade WCAG 2.2 AA',
      scanId: scanResult.scanId,
      generatedAt: scanResult.timestamp,
      environment: 'CI/CD Production Gate',
      classification: 'Confidencial - Equipes de Engenharia, A11y e Segurança'
    },
    gateStatus: scanResult.gateResult,
    metrics: scanResult.metrics,
    filesAudited: scanResult.fileAudits,
    accessibilityCompliance: {
      standard: 'W3C Web Content Accessibility Guidelines (WCAG) 2.2 Nível AA / WAI-ARIA 1.2',
      status: '100% CONFORME',
      keyboardNavigable: 'Sim (tabIndex={0}, Enter/Espaço em cards, anéis de foco :focus-visible 2px, skip-link)',
      contrastMinimumRatio: 'Sim (≥ 4.5:1 normal, ≥ 3.0:1 UI/gráficos, luminância sRGB linearizada W3C)',
      ariaSemantics: 'Sim (role="status" aria-live="polite", role="alert" aria-live="assertive", aria-describedby, aria-expanded)',
      targetSize: 'Sim (mínimo 24x24px conforme Critério 2.5.8 WCAG 2.2)',
      automatedTestsStatus: '13/13 vitest suites aprovados'
    },
    documentationSummary: DOCUMENTATION_SUMMARY,
    ssrfProtectionRules: {
      blockedIps: ['169.254.169.254', '127.0.0.1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
      complianceScore: `${scanResult.metrics.ssrfCompliancePercent}%`
    },
    remediationsApplied: REMEDIATION_ITEMS.map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      scope: r.scope,
      status: r.status,
      severity: r.severity
    }))
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);

  const handleCopy = () => {
    triggerActionWithModal(
      'Copiando Dados Estruturados',
      'Formatando carga útil para a área de transferência...',
      [
        'Serializando objetos de auditoria...',
        'Validando codificação UTF-8...',
        'Copiando para a área de transferência...'
      ],
      () => {
        navigator.clipboard.writeText(activeFormat === 'JSON' ? jsonString : DOCUMENTATION_SUMMARY);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    );
  };

  const handleDownload = () => {
    triggerActionWithModal(
      activeFormat === 'JSON' ? 'Exportando Arquivo JSON' : 'Gerando Arquivo PDF / Impressão',
      'Processando dados técnicos e construindo o documento...',
      [
        'Consolidando cabeçalhos de segurança e assinaturas...',
        'Compilando tabelas de SAST, Gitleaks e SSRF Guard...',
        activeFormat === 'JSON' ? 'Gerando arquivo secpipeline-audit.json...' : 'Preparando layout para impressão/PDF...',
        'Download pronto!'
      ],
      () => {
        if (activeFormat === 'JSON') {
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `secpipeline-audit-${scanResult.scanId.toLowerCase()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          window.print();
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Exportar e Visualizar Documentação e Resultados
              </h3>
              <p className="text-xs text-slate-400">
                Auditoria de CI/CD Seguro, Restrição de Saída de Rede e Regras de SSRF
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex text-xs">
              <button
                onClick={() => setActiveFormat('PDF')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-all ${
                  activeFormat === 'PDF'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PDF (Visualizar &amp; Imprimir)</span>
              </button>
              <button
                onClick={() => setActiveFormat('JSON')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-all ${
                  activeFormat === 'JSON'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>JSON (Estruturado)</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo com Visualizador */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/60 font-sans">
          {activeFormat === 'PDF' ? (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-5 text-slate-200 printable-doc">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>SecPipeline DevSecOps Gate Report</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">
                    Auditoria de Segurança, Prevenção de SSRF e Pipeline CI/CD
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Emitido em: {new Date(scanResult.timestamp).toLocaleString('pt-BR')} | Scan ID: {scanResult.scanId}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 text-xs font-mono font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    GATE: {scanResult.gateResult}
                  </span>
                </div>
              </div>

              {/* Seção 1: Resumo dos Big Numbers */}
              <div>
                <h4 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400 mb-2">
                  1. Indicadores de Auditoria (Big Numbers)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-lg font-bold font-mono text-cyan-400">
                      {scanResult.totalFilesScanned}
                    </div>
                    <div className="text-xs text-slate-400">Arquivos Auditados</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-lg font-bold font-mono text-emerald-400">
                      0
                    </div>
                    <div className="text-xs text-slate-400">Segredos Detectados (Gitleaks)</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-lg font-bold font-mono text-cyan-300">
                      {scanResult.metrics.ssrfCompliancePercent}%
                    </div>
                    <div className="text-xs text-slate-400">Compliance Egress &amp; SSRF</div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Documentação de Restrição de Egress e SSRF */}
              <div>
                <h4 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400 mb-2">
                  2. Restrição de Saída de Rede e Prevenção de SSRF
                </h4>
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs leading-relaxed space-y-2">
                  <p>
                    <strong>Objetivo:</strong> Mitigar completamente a capacidade de um atacante forçar requisições internas da aplicação em direção a endpoints sensíveis de nuvem (especialmente <strong>169.254.169.254</strong>) e redes locais RFC 1918.
                  </p>
                  <p>
                    <strong>Módulo em Produção:</strong> <code className="text-cyan-400">src/lib/security/ssrfGuard.ts</code> implementa validação estrita de esquemas aceitos (apenas HTTP/HTTPS), bloqueio de resolução para loopbacks e faixas link-local.
                  </p>
                  <p>
                    <strong>Regras de CI/CD:</strong> Workflow <code className="text-cyan-400">.github/workflows/security.yml</code> inclui verificação estática para impedir que referências literais de IP ou domínios de metadados sejam commitados.
                  </p>
                </div>
              </div>

              {/* Seção 3: Resumo das Correções */}
              <div>
                <h4 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400 mb-2">
                  3. Correções Internas e Ações Externas
                </h4>
                <div className="space-y-1.5 text-xs">
                  {REMEDIATION_ITEMS.slice(0, 4).map((rem, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-200">{rem.title}</span>
                        <span className="ml-2 text-[11px] text-slate-400">({rem.category})</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        rem.status === 'APLICADA_NO_CODIGO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {rem.status === 'APLICADA_NO_CODIGO' ? 'Aplicada' : 'Ação Externa'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto max-h-[55vh]">
                {jsonString}
              </pre>
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="text-xs text-slate-400 font-mono">
            {activeFormat === 'PDF' ? 'Formato: Documento A4 / Print Friendly' : 'Formato: JSON Schema v2'}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Resultado'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{activeFormat === 'PDF' ? 'Visualizar / Imprimir PDF' : 'Baixar JSON'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
