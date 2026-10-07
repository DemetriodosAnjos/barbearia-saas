import React, { useState } from 'react';
import { DocSection } from '../../types/qa';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  BookOpen,
  Copy,
  Check,
  Download,
  Printer,
  ChevronRight,
  Code,
  FileText,
  Search,
  ExternalLink,
  Layers,
} from 'lucide-react';

export interface TechnicalDocumentationProps {
  sections: DocSection[];
}

export const TechnicalDocumentation: React.FC<TechnicalDocumentationProps> = ({ sections }) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(sections[0]?.id || 'visao-geral');
  const [selectedSubId, setSelectedSubId] = useState<string>(sections[0]?.subsections[0]?.id || 'vg-objetivos');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentSection = sections.find((s) => s.id === selectedSectionId) || sections[0];
  const currentSub = currentSection?.subsections.find((sub) => sub.id === selectedSubId) || currentSection?.subsections[0];

  // Gera o resumo de documentação para cópia
  const fullSummaryMarkdown = sections
    .map(
      (sec) =>
        `# ${sec.title}\n\n` +
        sec.subsections
          .map(
            (sub) =>
              `## ${sub.title}\n**Resumo:** ${sub.summary}\n\n` +
              sub.content.map((c) => `- ${c}`).join('\n') +
              (sub.codeSnippets
                ? '\n\n```' + (sub.codeSnippets[0]?.language || 'ts') + '\n' + sub.codeSnippets[0]?.code + '\n```'
                : '')
          )
          .join('\n\n')
    )
    .join('\n\n---\n\n');

  const handleCopySummary = () => {
    navigator.clipboard.writeText(fullSummaryMarkdown);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sections, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'relatorio-tecnico-regressao-visual.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Action Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-400 font-mono uppercase tracking-wider">
              Documentação de Engenharia
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">Padrões de QA & Design System</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 mt-1">
            Manual Técnico de Regressão Visual e Storybook
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Processos detalhados, diretrizes de tolerância, pipelines de CI e prevenção de falhas em cascata.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Copiar */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySummary}
            leftIcon={isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {isCopied ? 'Resumo Copiado!' : 'Copiar Resumo da Doc'}
          </Button>

          {/* Botão Exportar JSON */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportJSON}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Exportar JSON
          </Button>

          {/* Botão Visualizar / PDF */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowPdfModal(true)}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Visualizar / PDF
          </Button>
        </div>
      </div>

      {/* Main Grid: Left = Menus & Submenus Navigation | Right = Technical Article View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Menus & Submenus (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wide">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Índice Estruturado</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">{sections.length} Capítulos</span>
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar em menus e tópicos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Navigation Accordion */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {sections
              .filter(
                (sec) =>
                  sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  sec.subsections.some((sub) => sub.title.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((section) => {
                const isSelectedSec = section.id === selectedSectionId;

                return (
                  <div key={section.id} className="space-y-1">
                    <button
                      onClick={() => {
                        setSelectedSectionId(section.id);
                        if (section.subsections[0]) {
                          setSelectedSubId(section.subsections[0].id);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                        isSelectedSec
                          ? 'bg-slate-800 text-indigo-300 border-l-2 border-indigo-500'
                          : 'text-slate-300 hover:bg-slate-850 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{section.title}</span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                          isSelectedSec ? 'rotate-90 text-indigo-400' : 'text-slate-600'
                        }`}
                      />
                    </button>

                    {/* Submenus */}
                    {isSelectedSec && (
                      <div className="pl-3 space-y-1 border-l border-slate-800 ml-3 py-1">
                        {section.subsections.map((sub) => {
                          const isSelectedSub = sub.id === selectedSubId;

                          return (
                            <button
                              key={sub.id}
                              onClick={() => setSelectedSubId(sub.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer block ${
                                isSelectedSub
                                  ? 'bg-indigo-950/60 text-indigo-200 font-medium'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                              }`}
                            >
                              <div className="truncate">{sub.title}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Content Viewer (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xs">
          {currentSub ? (
            <div className="space-y-6">
              {/* Header do Tópico */}
              <div className="pb-4 border-b border-slate-800">
                <div className="text-xs font-mono text-indigo-400 font-medium mb-1">
                  {currentSection.title}
                </div>
                <h3 className="text-xl font-bold text-slate-100">{currentSub.title}</h3>
                <div className="mt-2 p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/40 text-xs text-indigo-200 leading-relaxed font-medium">
                  {currentSub.summary}
                </div>
              </div>

              {/* Lista Detalhada de Itens Técnicos */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Especificações & Procedimentos
                </h4>
                <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                  {currentSub.content.map((item, index) => (
                    <li key={index} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Snippet de Código Se Houver */}
              {currentSub.codeSnippets && currentSub.codeSnippets.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Referência de Implementação</span>
                  </div>
                  {currentSub.codeSnippets.map((snippet, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950">
                      <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                        <span>{snippet.language}</span>
                        <span>Configuração Pronta</span>
                      </div>
                      <pre className="p-4 text-xs font-mono text-indigo-200/90 overflow-x-auto leading-relaxed">
                        <code>{snippet.code}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {/* Resumo Rápido da Documentação */}
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Precisa deste conteúdo no clipboard?</div>
                  <div className="text-[11px] text-slate-400">Copie o resumo formatado em Markdown com 1 clique.</div>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopySummary}>
                  {isCopied ? 'Copiado!' : 'Copiar Subtópico'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-12 text-center">
              Selecione um tópico no menu à esquerda para visualizar a documentação técnica.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Pré-Visualização / Impressão PDF */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Pré-visualização para Exportação em PDF
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.print()}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                >
                  Imprimir / Salvar como PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowPdfModal(false)}>
                  Fechar
                </Button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 text-slate-200 text-xs bg-slate-950 font-sans leading-relaxed">
              <div className="border-b border-slate-800 pb-4">
                <h1 className="text-xl font-bold text-slate-100">
                  Relatório Técnico: Regressão Visual e Design System no Storybook
                </h1>
                <p className="text-slate-400 text-xs mt-1">
                  Gerado em {new Date().toLocaleDateString('pt-BR')} · UI Engineer / QA Engineering Studio
                </p>
              </div>

              {sections.map((sec) => (
                <div key={sec.id} className="space-y-4 pt-2">
                  <h2 className="text-base font-bold text-indigo-300 border-b border-slate-800 pb-1">
                    {sec.title}
                  </h2>
                  {sec.subsections.map((sub) => (
                    <div key={sub.id} className="space-y-2 pl-2">
                      <h3 className="text-sm font-semibold text-slate-200">{sub.title}</h3>
                      <p className="text-indigo-200/90 font-medium italic">{sub.summary}</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {sub.content.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
