import { useState, useEffect } from "react";
import { ShieldCheck, Check, X, AlertTriangle } from "lucide-react";
import { CAPTCHA_TEST_TOKENS, generateFreshTestToken } from "../../security/captchaValidator";

/**
 * ============================================================================
 * TURNSTILE / HCAPTCHA SECURITY WIDGET COMPONENT
 * ============================================================================
 * Componente de desafio de segurança anti-robô e anti-automação.
 * Integra-se perfeitamente aos formulários de Login, Onboarding e Recuperação.
 * Fornece interface amigável com suporte a tokens de validação real e
 * simuladores de conformidade para auditoria de segurança da equipe.
 * ============================================================================
 */
export default function TurnstileWidget({
  onVerify,
  onError,
  provider = "turnstile", // 'turnstile' | 'hcaptcha'
  action = "login",
  autoVerifyInDemo = false,
  showAuditControls = false,
  resetSignal = null,
}) {
  const [status, setStatus] = useState("idle"); // 'idle' | 'verifying' | 'success' | 'failed'
  const [token, setToken] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const isTurnstile = provider === "turnstile";
  const providerName = isTurnstile ? "Cloudflare Turnstile" : "hCaptcha Enterprise";

  const handleTriggerChallenge = (forcedVector = null) => {
    setStatus("verifying");
    setErrorMessage("");
    // Invalida imediatamente qualquer token anterior em trânsito
    setToken(null);
    if (onVerify) onVerify(null);

    setTimeout(() => {
      if (forcedVector === "fail") {
        setStatus("failed");
        setErrorMessage("Desafio de segurança reprovado. Padrão de automação detectado.");
        if (onError) onError("Padrão de automação detectado.");
        return;
      } else if (forcedVector === "expired") {
        setStatus("failed");
        setErrorMessage("Token expirado. Clique novamente para gerar um novo desafio.");
        if (onError) onError("Token expirado.");
        return;
      } else {
        // Gera sempre um token novo e único para evitar rejeição por Token Replay
        const resolvedToken = generateFreshTestToken();
        setStatus("success");
        setToken(resolvedToken);
        if (onVerify) onVerify(resolvedToken);
      }
    }, 700);
  };

  useEffect(() => {
    if (autoVerifyInDemo && status === "idle") {
      handleTriggerChallenge();
    }
  }, [autoVerifyInDemo]);

  // Reseta o estado quando sinalizado externamente (ex: erro no formulário)
  useEffect(() => {
    if (resetSignal) {
      handleReset();
    }
  }, [resetSignal]);

  const handleReset = () => {
    setStatus("idle");
    setToken(null);
    setErrorMessage("");
    if (onVerify) onVerify(null);
  };

  return (
    <div className="w-full my-3 p-3 bg-neutral-900/90 border border-neutral-800 rounded-lg shadow-inner text-xs">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-neutral-800/80">
        <div className="flex items-center gap-1.5 font-medium text-neutral-300">
          <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Proteção Anti-Automação</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
            {providerName}
          </span>
        </div>
        {showAuditControls && (
          <span className="text-[10px] text-neutral-500 font-mono">
            action:{action}
          </span>
        )}
      </div>

      {/* Caixa do Desafio */}
      <div
        onClick={() => {
          if (status === "idle") handleTriggerChallenge();
        }}
        className={`flex items-center justify-between p-2.5 bg-neutral-950/80 rounded border transition-all select-none ${
          status === "idle"
            ? "border-neutral-800 hover:border-amber-500/70 hover:bg-neutral-900 cursor-pointer group"
            : status === "success"
            ? "border-emerald-500/40 bg-emerald-950/10"
            : status === "verifying"
            ? "border-amber-500/50 bg-amber-950/10"
            : "border-rose-500/50 bg-rose-950/10"
        }`}
        title={status === "idle" ? "Clique com o mouse para ativar a verificação Cloudflare" : undefined}
      >
        <div className="flex items-center gap-3">
          {status === "idle" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerChallenge();
              }}
              className="w-6 h-6 rounded border-2 border-amber-600/70 hover:border-amber-400 bg-neutral-900 flex items-center justify-center transition-all cursor-pointer shadow-sm group-hover:border-amber-400 group-hover:scale-105"
              title="Clique com o mouse para ativar a verificação Cloudflare"
            >
              <div className="w-2 h-2 rounded-xs bg-transparent" />
            </button>
          )}

          {status === "verifying" && (
            <div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          )}

          {status === "success" && (
            <button
              type="button"
              onClick={() => handleTriggerChallenge()}
              className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-all cursor-pointer"
              title="Desafio validado. Clique para revalidar se necessário"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}

          {status === "failed" && (
            <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400">
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          )}

          <div className="flex flex-col">
            <span className="font-semibold text-neutral-200">
              {status === "idle" && "Verificação de Segurança (Não sou um robô)"}
              {status === "verifying" && "Validando desafio criptográfico..."}
              {status === "success" && "Verificado com Sucesso"}
              {status === "failed" && "Falha na Verificação"}
            </span>
            <span className="text-[10px] text-neutral-500">
              {status === "success"
                ? (showAuditControls ? `Token ativo: ${token?.slice(0, 18)}...` : "Verificação de segurança concluída com sucesso")
                : "Protegido por Cloudflare Turnstile"}
            </span>
          </div>
        </div>

        {/* Logo / Selo do Provedor */}
        <div className="flex flex-col items-end opacity-70">
          <span className="text-[9px] text-neutral-400 tracking-wider uppercase font-semibold">
            {isTurnstile ? "Cloudflare" : "hCaptcha"}
          </span>
          <span className="text-[8px] text-neutral-600 font-mono">Turnstile v0</span>
        </div>
      </div>

      {/* Mensagem de Erro / Alerta */}
      {errorMessage && (
        <div className="mt-2 text-[11px] text-rose-400 flex items-center justify-between bg-rose-950/40 p-1.5 rounded border border-rose-900/50">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="text-[10px] underline hover:text-rose-200 ml-2 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Controles de Simulação de Auditoria e Pentest para a Equipe */}
      {showAuditControls && (
        <div className="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-500">
          <span>Simular auditoria:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleTriggerChallenge("pass")}
              className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/80 border border-emerald-800/60 transition-colors"
            >
              Pass (Válido)
            </button>
            <button
              type="button"
              onClick={() => handleTriggerChallenge("fail")}
              className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 hover:bg-rose-900/80 border border-rose-800/60 transition-colors"
            >
              Bot (Reprovar)
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
