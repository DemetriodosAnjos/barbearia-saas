/**
 * @file TechnicalDocs.tsx
 * @description Aba de Documentação Técnica com Menus e Submenus navegáveis,
 * resumo detalhado dos processos e testes de Validação HMAC e Idempotência de Webhooks,
 * opção de copiar/colar resultado e exportar para JSON e PDF.
 */

import React, { useState } from 'react';
import { 
  HMAC_WEBHOOK_DOCS, 
  getFullMarkdownDocumentation, 
  DocSection 
} from '../docs/hmcAndWebhookDoc';
import { 
  BookOpen, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  ChevronRight, 
  ShieldCheck, 
  Repeat, 
  TestTube2, 
  FileJson, 
  Printer, 
  Share2,
  Terminal,
  ExternalLink,
  X
} from 'lucide-react';

export const TechnicalDocs: React.FC = () => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(HMAC_WEBHOOK_DOCS[0].id);
  const [selectedSubId, setSelectedSubId] = useState<string>(HMAC_WEBHOOK_DOCS[0].subsections[0].id);
  const [copiedDoc, setCopiedDoc] = useState<boolean>(false);
  const [copiedSubDoc, setCopiedSubDoc] = useState<boolean>(false);
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [showJsonPreviewModal, setShowJsonPreviewModal] = useState<boolean>(false);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState<boolean>(false);
  const [copiedJsonText, setCopiedJsonText] = useState<boolean>(false);

  const activeSection = HMAC_WEBHOOK_DOCS.find((s) => s.id === selectedSectionId) || HMAC_WEBHOOK_DOCS[0];
  const activeSub = activeSection.subsections.find((sub) => sub.id === selectedSubId) || activeSection.subsections[0];

  // Copiar documentação completa em Markdown
  const handleCopyFullDoc = () => {
    const markdown = getFullMarkdownDocumentation();
    navigator.clipboard.writeText(markdown);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2500);
  };

  // Copiar resumo e conteúdo da subseção ativa
  const handleCopySubDoc = () => {
    const subMarkdown = `## ${activeSub.subtitle}\n**Resumo:** ${activeSub.summary}\n\n${activeSub.content}\n\n${
      activeSub.checkpoints ? activeSub.checkpoints.map((c) => `- ${c}`).join('\n') : ''
    }\n\n${activeSub.codeSnippet ? `\`\`\`${activeSub.codeSnippet.language}\n${activeSub.codeSnippet.code}\n\`\`\`` : ''}`;
    navigator.clipboard.writeText(subMarkdown);
    setCopiedSubDoc(true);
    setTimeout(() => setCopiedSubDoc(false), 2500);
  };

  // Copiar snippet de código específico
  const handleCopySnippet = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeKey(key);
    setTimeout(() => setCopiedCodeKey(null), 2000);
  };

  // Exportar como JSON estruturado
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(HMAC_WEBHOOK_DOCS, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `documentacao_tecnica_hmac_idempotencia_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportNotice('Arquivo JSON exportado com sucesso!');
    setTimeout(() => setExportNotice(null), 3000);
  };

  // Exportar como PDF / Impressão sem popups
  const handleExportPDF = () => {
    try {
      let iframe = document.getElementById('print-iframe') as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }

      const fullDoc = getFullMarkdownDocumentation();
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Documentação Técnica - Validação HMAC e Idempotência</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { color: #1e1b4b; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; font-size: 22px; margin-top: 32px; }
    h2 { color: #312e81; font-size: 16px; margin-top: 24px; }
    pre { background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 11px; overflow-x: auto; border: 1px solid #e5e7eb; white-space: pre-wrap; }
    .badge { display: inline-block; padding: 2px 8px; background: #e0e7ff; color: #4338ca; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="badge">DOCUMENTO DE ENGENHARIA DE SOFTWARE & ARQUITETURA</div>
  <pre>${fullDoc.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setExportNotice('Diálogo de impressão / PDF acionado com sucesso!');
        setTimeout(() => setExportNotice(null), 3000);
      }
    } catch {
      setExportNotice('Gerando arquivo formatado para download...');
      const fullDoc = getFullMarkdownDocumentation();
      const blob = new Blob([fullDoc], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentacao_tecnica_hmac_idempotencia_${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner and Export Actions */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PROMPT 13: ESPECIFICAÇÃO DE ARQUITETURA
              </span>
              <span className="text-xs text-zinc-400 font-mono">Revisão v3.4.1</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              Documentação Técnica: HMAC & Idempotência de Webhooks
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Processos detalhados de validação criptográfica, proteção contra replay attacks, esquemas DDL e algoritmos de idempotência.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCopyFullDoc}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedDoc ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copiado na Área de Transferência!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Documentação</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowJsonPreviewModal(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Visualizar / Exportar JSON</span>
            </button>

            <button
              onClick={() => setShowPdfPreviewModal(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Visualizar / Exportar PDF</span>
            </button>
          </div>
        </div>

        {exportNotice && (
          <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-mono">
            {exportNotice}
          </div>
        )}
      </div>

      {/* Main Two-Column Navigation & Reader Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Menu and Submenu Navigation */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-3">
              Índice da Documentação
            </h3>

            <div className="space-y-4">
              {HMAC_WEBHOOK_DOCS.map((section) => {
                const isCurrentSec = section.id === selectedSectionId;
                return (
                  <div key={section.id} className="space-y-1.5">
                    <button
                      onClick={() => {
                        setSelectedSectionId(section.id);
                        setSelectedSubId(section.subsections[0].id);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                        isCurrentSec
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {section.id === 'hmac-validation' ? (
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                        ) : section.id === 'webhook-idempotency' ? (
                          <Repeat className="w-4 h-4 shrink-0" />
                        ) : (
                          <TestTube2 className="w-4 h-4 shrink-0" />
                        )}
                        <span className="line-clamp-1">{section.title}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isCurrentSec ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Submenus */}
                    <div className="pl-4 space-y-1">
                      {section.subsections.map((sub) => {
                        const isCurrentSub = sub.id === selectedSubId && isCurrentSec;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => {
                              setSelectedSectionId(section.id);
                              setSelectedSubId(sub.id);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                              isCurrentSub
                                ? 'bg-zinc-800 text-indigo-400 font-semibold border-l-2 border-indigo-500'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                            }`}
                          >
                            <span className="line-clamp-1">{sub.subtitle}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Architecture Summary Box */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-2">
            <span className="text-[11px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Garantias Arquiteturais:
            </span>
            <ul className="text-zinc-400 text-[11px] space-y-1.5 pl-3 list-disc">
              <li>Assinatura calculada sobre Buffer bruto original.</li>
              <li>Prevenção contra Timing Attacks (timingSafeEqual).</li>
              <li>Janela de tolerância de 300s contra Replay.</li>
              <li>Bloqueio atômico de concorrência com idempotency_key.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Documentation Reader */}
        <div className="lg:col-span-8 bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
          {/* Header */}
          <div className="border-b border-zinc-800 pb-4">
            <div className="text-xs font-mono text-indigo-400 mb-1">
              {activeSection.title}
            </div>
            <h2 className="text-xl font-bold text-white">{activeSub.subtitle}</h2>
            <div className="mt-2 p-3 rounded-lg bg-indigo-950/20 border border-indigo-800/30 text-xs text-indigo-300 leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-white">Resumo Executivo: </span>
                <span>{activeSub.summary}</span>
              </div>
              <button
                onClick={handleCopySubDoc}
                className="shrink-0 px-2.5 py-1 rounded-md bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 text-[11px] font-mono transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedSubDoc ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300">Resumo Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar Seção</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="space-y-4">
            <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line font-sans">
              {activeSub.content}
            </div>

            {/* Checkpoints */}
            {activeSub.checkpoints && activeSub.checkpoints.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800/80">
                <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Checklist de Verificação Crítica:
                </h4>
                <ul className="space-y-2">
                  {activeSub.checkpoints.map((chk, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      </span>
                      <span>{chk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Code Snippet with Copy Option */}
            {activeSub.codeSnippet && (
              <div className="mt-6 pt-4 border-t border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-zinc-300">
                      {activeSub.codeSnippet.filename}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                      {activeSub.codeSnippet.language}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopySnippet(activeSub.codeSnippet!.code, activeSub.id)}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCodeKey === activeSub.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                  <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                    <code>{activeSub.codeSnippet.code}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal 1: Visualizador e Exportador JSON */}
      {showJsonPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Visualizador JSON da Documentação Técnica</h3>
                  <p className="text-[11px] text-zinc-400">Dados estruturados em JSON contendo todas as 5 seções, códigos e checklists.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(HMAC_WEBHOOK_DOCS, null, 2));
                    setCopiedJsonText(true);
                    setTimeout(() => setCopiedJsonText(false), 2000);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 flex items-center gap-1.5 cursor-pointer font-mono"
                >
                  {copiedJsonText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJsonText ? "Copiado!" : "Copiar JSON"}</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white flex items-center gap-1.5 cursor-pointer font-mono"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arquivo .json</span>
                </button>
                <button
                  onClick={() => setShowJsonPreviewModal(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-xs text-emerald-300 bg-zinc-950 flex-1">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(HMAC_WEBHOOK_DOCS, null, 2)}
              </pre>
            </div>
            <div className="p-3 border-t border-zinc-800 flex justify-between items-center text-[11px] text-zinc-400 bg-zinc-950/60 font-mono">
              <span>Tamanho estruturado: {JSON.stringify(HMAC_WEBHOOK_DOCS).length} bytes</span>
              <button
                onClick={() => setShowJsonPreviewModal(false)}
                className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Visualizador e Exportador PDF / Documento Imprimível */}
      {showPdfPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Visualização de Documento Oficial / PDF</h3>
                  <p className="text-[11px] text-zinc-400">Formatação pronta para impressão ou exportação em PDF corporativo.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyFullDoc}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 flex items-center gap-1.5 cursor-pointer font-mono"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedDoc ? "Copiado!" : "Copiar Texto"}</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white flex items-center gap-1.5 cursor-pointer font-mono font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  onClick={() => setShowPdfPreviewModal(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto bg-zinc-950 text-zinc-200 text-xs leading-relaxed space-y-6 flex-1 max-w-none">
              <div className="border-b border-zinc-800 pb-4 text-center">
                <span className="px-3 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-mono text-[10px] font-bold">
                  RELATÓRIO OFICIAL DE ENGENHARIA & COMPLIANCE
                </span>
                <h1 className="text-lg font-bold text-white mt-2">
                  Validação Criptográfica HMAC, Idempotência de Webhooks & Concorrência Atômica
                </h1>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Barbearia SaaS - Arquitetura de Resiliência e Segurança da Informação
                </p>
              </div>

              {HMAC_WEBHOOK_DOCS.map((section) => (
                <div key={section.id} className="space-y-4 pt-2">
                  <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider border-b border-zinc-800 pb-1.5">
                    {section.title}
                  </h2>
                  {section.subsections.map((sub) => (
                    <div key={sub.id} className="space-y-2 bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4">
                      <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        {sub.subtitle}
                      </h3>
                      <p className="text-zinc-400 text-[11px] italic bg-zinc-950/50 p-2 rounded border border-zinc-800/40">
                        {sub.summary}
                      </p>
                      <div className="text-[11px] text-zinc-300 whitespace-pre-line leading-relaxed font-sans">
                        {sub.content}
                      </div>
                      {sub.checkpoints && (
                        <div className="pt-2">
                          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Checklist:</span>
                          <ul className="mt-1 space-y-1">
                            {sub.checkpoints.map((chk, idx) => (
                              <li key={idx} className="text-[11px] text-emerald-400/90 flex items-center gap-1.5">
                                <span>✓</span>
                                <span>{chk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {sub.codeSnippet && (
                        <div className="pt-2">
                          <span className="text-[10px] font-mono text-zinc-400">Arquivo: {sub.codeSnippet.filename}</span>
                          <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-mono text-emerald-300 overflow-x-auto mt-1">
                            {sub.codeSnippet.code}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-zinc-800 flex justify-between items-center text-[11px] text-zinc-400 bg-zinc-950/60 font-mono">
              <span>Conformidade: OWASP Top 10, RFC 7231 & PCI DSS</span>
              <button
                onClick={() => setShowPdfPreviewModal(false)}
                className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalDocs;
