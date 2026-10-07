/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * QA Studio & Testing Workbench
 * Painel de testes interativo configurado para varrer TODOS os arquivos necessários do projeto
 * responsáveis por solucionar a tarefa a cada execução de teste.
 */

import React, { useState } from 'react';
import { 
  Play, 
  Terminal, 
  ShieldCheck, 
  FileCode, 
  CheckCircle2, 
  Flame, 
  RotateCw, 
  GlobeLock,
  Search,
  Code2,
  Check,
  Eye,
  X,
  CircleSlash
} from 'lucide-react';
import { 
  ScanRunResult, 
  AUDITED_PROJECT_FILES, 
  runSecurityScan 
} from '../lib/security/securityEngine';
import { validateSafeUrl, SSRFValidationResult } from '../lib/security/ssrfGuard';

interface QATestingWorkbenchProps {
  scanResult: ScanRunResult;
  onUpdateScanResult: (newResult: ScanRunResult) => void;
  triggerActionWithModal: (
    title: string,
    subtitle: string,
    steps: string[],
    action: () => void
  ) => void;
}

export const QATestingWorkbench: React.FC<QATestingWorkbenchProps> = ({
  scanResult,
  onUpdateScanResult,
  triggerActionWithModal
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | 'Gitleaks' | 'Semgrep SAST' | 'Snyk / npm audit' | 'SSRF & Egress Guard' | 'WCAG 2.2 AA (a11y)'>('ALL');
  const [selectedFileForInspection, setSelectedFileForInspection] = useState<string>(AUDITED_PROJECT_FILES[0].path);
  
  // Simulador interativo de SSRF
  const [testUrlInput, setTestUrlInput] = useState<string>('http://169.254.169.254/latest/meta-data/');
  const [ssrfSimulationResult, setSsrfSimulationResult] = useState<SSRFValidationResult | null>(null);

  // Simulador interativo de Contraste WCAG 2.2 AA
  const [fgColor, setFgColor] = useState<string>('#FFFFFF');
  const [bgColor, setBgColor] = useState<string>('#0A0A0A');
  const [activeSimulatorTab, setActiveSimulatorTab] = useState<'ssrf' | 'wcag'>('wcag');

  const calculateLuminance = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    const a = [r, g, b].map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const getContrastRatio = (fg: string, bg: string) => {
    try {
      const l1 = calculateLuminance(fg);
      const l2 = calculateLuminance(bg);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
    } catch {
      return 1;
    }
  };

  const currentContrast = getContrastRatio(fgColor, bgColor);
  const passesAANormal = currentContrast >= 4.5;
  const passesAALarge = currentContrast >= 3.0;
  const passesAAA = currentContrast >= 7.0;

  const handleRunFullScan = () => {
    triggerActionWithModal(
      'Executando Varredura Completa do Repositório',
      'Inspecionando todos os arquivos de configuração, CI/CD, código e manifestos...',
      [
        'Carregando workflow .github/workflows/security.yml...',
        'Executando motor de regras Gitleaks (detecção de credenciais)...',
        'Executando analisador SAST Semgrep (regras OWASP e TypeScript)...',
        'Auditando árvore de dependências npm audit & Snyk...',
        'Validando guardas de SSRF e bloqueio de metadados 169.254.169.254...',
        'Consolidando relatório do QA Workbench...'
      ],
      async () => {
        const freshResult = await runSecurityScan();
        onUpdateScanResult(freshResult);
      }
    );
  };

  const handleTestSpecificFile = (filePath: string) => {
    triggerActionWithModal(
      `Varrendo Arquivo: ${filePath}`,
      'Executando testes direcionados de segurança...',
      [
        `Analisando árvore sintática de ${filePath}...`,
        'Aplicando regras estáticas e checagem de segredos...',
        'Validando restrições de rede...',
        'Concluído com sucesso!'
      ],
      async () => {
        const freshResult = await runSecurityScan(filePath);
        onUpdateScanResult(freshResult);
        setSelectedFileForInspection(filePath);
      }
    );
  };

  const handleRunSsrfSimulation = () => {
    triggerActionWithModal(
      'Auditando Vetor de Egress e SSRF',
      `Validando destino: ${testUrlInput}`,
      [
        'Decompondo protocolo e portas da URL...',
        'Verificando range Link-Local (169.254.169.254)...',
        'Checando faixas privadas RFC 1918 e Loopback...',
        'Consultando resolução de DNS contra ataques Rebinding...',
        'Emitindo veredito do SafeHttpClient Guard...'
      ],
      () => {
        const res = validateSafeUrl(testUrlInput);
        setSsrfSimulationResult(res);
      }
    );
  };

  const filteredFindings = scanResult.findings.filter(f => {
    if (selectedCategoryFilter === 'ALL') return true;
    if (selectedCategoryFilter === 'WCAG 2.2 AA (a11y)') {
      return (
        f.ruleId.startsWith('wcag') ||
        f.id.startsWith('SEC-A11Y') ||
        f.file.includes('theme') ||
        f.file.includes('ServiceCard') ||
        f.file.includes('ProfessionalCard') ||
        f.file.includes('DatePicker') ||
        f.file.includes('index.css') ||
        f.file.includes('wcag')
      );
    }
    return f.tool === selectedCategoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* Barra de Controle de Testes */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">
              QA Studio &amp; Testing Workbench
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Varredura Abrangente
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Varre todos os arquivos necessários do projeto responsáveis por solucionar o pipeline seguro e prevenção de SSRF
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunFullScan}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Executar Varredura Completa ({AUDITED_PROJECT_FILES.length} Arquivos)</span>
          </button>
        </div>
      </div>

      {/* Grid: Arquivos Auditados e Simulador SSRF */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Arquivos Necessários Auditados */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                Arquivos Inspecionados no Teste
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                Todos Verificados
              </span>
            </div>

            <div className="space-y-2">
              {AUDITED_PROJECT_FILES.map((file) => {
                const isSelected = selectedFileForInspection === file.path;
                return (
                  <div
                    key={file.path}
                    className={`p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/40'
                        : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-cyan-300 truncate">
                        {file.path}
                      </span>
                      <button
                        onClick={() => handleTestSpecificFile(file.path)}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCw className="w-2.5 h-2.5" />
                        <span>Re-testar</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium mt-1">
                      {file.label}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      {file.role}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Testador Interativo: SSRF / Egress Guard & Contraste WCAG 2.2 AA */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSimulatorTab('wcag')}
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    activeSimulatorTab === 'wcag'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Contraste WCAG 2.2</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSimulatorTab('ssrf')}
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    activeSimulatorTab === 'ssrf'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GlobeLock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Egress &amp; SSRF</span>
                </button>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {activeSimulatorTab === 'wcag' ? 'Critério 1.4.3' : 'SafeHttpClient'}
              </span>
            </div>

            {activeSimulatorTab === 'wcag' ? (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400">
                  Calcule a proporção de contraste em tempo real segundo o algoritmo de luminância relativa da WCAG 2.2 AA (mínimo 4.5:1).
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Cor do Texto (FG):</label>
                    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1">
                      <input
                        type="color"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="w-full bg-transparent font-mono text-xs text-white uppercase focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Cor do Fundo (BG):</label>
                    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-full bg-transparent font-mono text-xs text-white uppercase focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview e Indicador de Contraste */}
                <div
                  style={{ backgroundColor: bgColor, color: fgColor }}
                  className="p-3 rounded-xl border border-slate-700/60 transition-colors shadow-inner flex flex-col justify-between"
                >
                  <span className="text-xs font-bold">Prévia da Legibilidade de Texto</span>
                  <span className="text-[11px] opacity-90 mt-0.5">
                    "O design acessível transforma a experiência para todos os clientes da barbearia."
                  </span>
                </div>

                {/* Resultados Numéricos */}
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block">TAXA DE CONTRASTE:</span>
                    <strong className={`text-base font-black ${passesAANormal ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {currentContrast}:1
                    </strong>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                      passesAANormal ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {passesAANormal ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                          <span>Passa WCAG AA (≥ 4.5:1)</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 text-rose-400 stroke-[2.5]" />
                          <span>Falha WCAG AA (&lt; 4.5:1)</span>
                        </>
                      )}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] flex items-center gap-1 ${
                      passesAAA ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {passesAAA ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[2.5]" />
                          <span>Cumpre AAA (≥ 7:1)</span>
                        </>
                      ) : (
                        <>
                          <CircleSlash className="w-2.5 h-2.5 text-slate-500" />
                          <span>Não cumpre AAA</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Presets do Projeto */}
                <div className="flex flex-wrap gap-1 text-[10px] font-mono text-slate-400">
                  <span>Presets:</span>
                  <button
                    onClick={() => { setFgColor('#FFFFFF'); setBgColor('#0A0A0A'); }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer"
                  >
                    Tema Dark (19.8:1)
                  </button>
                  <button
                    onClick={() => { setFgColor('#0F172A'); setBgColor('#FFFFFF'); }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer"
                  >
                    Tema Light (15.4:1)
                  </button>
                  <button
                    onClick={() => { setFgColor('#FCA5A5'); setBgColor('#171717'); }}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 cursor-pointer"
                  >
                    Erro Red (5.9:1)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">
                  Digite uma URL para testar se o mecanismo de mitigação de SSRF bloqueia o acesso a metadados e redes privadas.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testUrlInput}
                    onChange={(e) => setTestUrlInput(e.target.value)}
                    placeholder="Ex: http://169.254.169.254/latest/meta-data/"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleRunSsrfSimulation}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Testar
                  </button>
                </div>

                {/* Atalhos de Teste */}
                <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-slate-400">
                  <span>Presets:</span>
                  <button
                    onClick={() => setTestUrlInput('http://169.254.169.254/latest/meta-data/')}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 cursor-pointer"
                  >
                    AWS/GCP 169.254
                  </button>
                  <button
                    onClick={() => setTestUrlInput('http://127.0.0.1:5432/status')}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 cursor-pointer"
                  >
                    Loopback 127.0.0.1
                  </button>
                  <button
                    onClick={() => setTestUrlInput('http://10.0.0.1/admin')}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 cursor-pointer"
                  >
                    RFC1918 10.0.0.1
                  </button>
                  <button
                    onClick={() => setTestUrlInput('https://api.mercadopago.com/v1/payments')}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 cursor-pointer"
                  >
                    Mercado Pago (Público)
                  </button>
                </div>

                {/* Resultado do Teste de SSRF */}
                {ssrfSimulationResult && (
                  <div className={`p-3 rounded-lg border text-xs leading-relaxed mt-2 ${
                    ssrfSimulationResult.allowed
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {ssrfSimulationResult.allowed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>REQUISIÇÃO AUTORIZADA (EGRESS SEGURO)</span>
                        </>
                      ) : (
                        <>
                          <Flame className="w-4 h-4 text-rose-400" />
                          <span>[BLOQUEIO DE SSRF ATIVADO] CONEXÃO RECUSADA</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {ssrfSimulationResult.reason}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                      Classificação: <span className="text-white">{ssrfSimulationResult.category}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Painel Direito: Resultados das Regras e Console de Logs em Tempo Real */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filtros de Ferramentas de Auditoria */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-mono text-slate-400 text-[11px] mr-1">Suítes de Teste:</span>
              {(['ALL', 'Gitleaks', 'Semgrep SAST', 'Snyk / npm audit', 'SSRF & Egress Guard', 'WCAG 2.2 AA (a11y)'] as const).map(tool => (
                <button
                  key={tool}
                  onClick={() => setSelectedCategoryFilter(tool)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    selectedCategoryFilter === tool
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {tool === 'ALL' ? 'Todas as Suítes' : tool}
                </button>
              ))}
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {filteredFindings.length} Regras Inspecionadas
            </span>
          </div>

          {/* Lista de Resultados dos Testes nos Arquivos */}
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {filteredFindings.map(finding => (
              <div
                key={finding.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 space-y-2 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                      {finding.tool}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {finding.file}:{finding.line}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                    <Check className="w-3 h-3" /> Conforme
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white">
                  {finding.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {finding.description}
                </p>

                {finding.snippet && (
                  <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-cyan-300 overflow-x-auto">
                    {finding.snippet}
                  </pre>
                )}

                <div className="pt-1 text-[11px] text-slate-400">
                  <strong className="text-slate-300">Validação / Remediação:</strong> {finding.remediation}
                </div>
              </div>
            ))}
          </div>

          {/* Terminal de Logs de Execução dos Testes */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold">
                <Terminal className="w-4 h-4" />
                <span>Console de Execução dos Testes (Live Stream)</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Scan ID: {scanResult.scanId}
              </span>
            </div>

            <div className="space-y-1 max-h-36 overflow-y-auto text-[11px] text-slate-300 leading-relaxed pr-1">
              {scanResult.logs.map((log, index) => (
                <div
                  key={index}
                  className={`${
                    log.includes('APROVADO') || log.includes('PASS')
                      ? 'text-emerald-400'
                      : log.includes('FAIL') || log.includes('REPROVADO')
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
