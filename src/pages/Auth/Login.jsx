import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { supabase } from "../../lib/supabase";
import { loginStyles } from "./Login.styles";
import Logo from "../../components/ui/Logo";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Divider from "../../components/ui/Divider";
import Alert from "../../components/ui/Alert";
import Modal from "../../components/ui/Modal";
import { SafeHtml } from "../../components/ui/SafeHtml";
import TurnstileWidget from "../../components/security/TurnstileWidget";
import {
  secureLogin,
  securePasswordResetRequest,
  AUTH_SECURITY_CONSTANTS,
} from "../../security/authSecurityService";
import { generateFreshTestToken } from "../../security/captchaValidator";
import { checkRateLimit } from "../../middleware/authRateLimiter";
import {
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  UserX,
  Clock,
  Mail,
  RefreshCw,
  AlertOctagon,
} from "lucide-react";

export default function Login({
  onLoginSuccess,
  onGoToSignup, // Redireciona para o Onboarding
}) {
  // 1. Campos de Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // 2. Estados de Controle e Segurança Anti-Brute Force / CAPTCHA
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaResetCount, setCaptchaResetCount] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  // 4. Estados da Modal de Recuperação de Senha com Supabase Auth
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState("email"); // 'email' | 'code' | 'success' | 'error_not_found'
  const [forgotEmail, setForgotEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [countdownSeconds, setCountdownSeconds] = useState(180); // 3 minutos = 180s
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotNotice, setForgotNotice] = useState("");
  const [forgotError, setForgotError] = useState("");

  // Timer regressivo de 3 minutos para o código de recuperação
  useEffect(() => {
    let timer = null;
    if (isForgotModalOpen && forgotStep === "code" && countdownSeconds > 0) {
      timer = setInterval(() => {
        setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isForgotModalOpen, forgotStep, countdownSeconds]);

  const formatCountdown = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleCloseForgotModal = () => {
    setIsForgotModalOpen(false);
    setForgotStep("email");
    setForgotEmail("");
    setForgotError("");
    setForgotNotice("");
    setVerificationCode("");
    setGeneratedCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setCountdownSeconds(180);
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Monitora rate limit no carregamento ou troca de email
  useEffect(() => {
    if (email && email.includes("@")) {
      const status = checkRateLimit({ identifier: email });
      if (status.isLocked) {
        setIsLockedOut(true);
        setRetryAfterSeconds(status.retryAfterSeconds);
        setAuthError(status.message);
      } else {
        setIsLockedOut(false);
        setRemainingAttempts(status.remainingAttempts);
      }
    }
  }, [email]);

  // Validação do Formulário de Login
  const validateForm = () => {
    // 1. Limpa erros globais de autenticação anteriores
    setAuthError("");

    const errs = {};
    if (!email.trim() || !email.includes("@")) {
      errs.email = "Insira um endereço de e-mail válido.";
    }
    if (!password) {
      errs.password = "Informe sua senha de acesso.";
    } else if (password.length < 6) {
      errs.password = "A senha deve conter no mínimo 6 caracteres.";
    }
    if (!captchaToken) {
      errs.captcha = "Clique no desafio de proteção Cloudflare com o mouse para validar.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submissão do Login Seguro (Anti-Brute Force + Turnstile + Anti-Enumeração)
  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Se já estiver bloqueado por tentativas consecutivas incorretas
    if (isLockedOut) {
      setAuthError(
        `Conta temporariamente bloqueada por segurança devido a 5 tentativas inválidas. Aguarde ${Math.ceil(
          retryAfterSeconds / 60
        )} minuto(s).`
      );
      return;
    }

    // Executa a validação dos campos
    if (!validateForm()) return;

    if (!captchaToken) {
      setErrors((prev) => ({
        ...prev,
        captcha: "Clique no desafio de proteção Cloudflare com o mouse para validar.",
      }));
      return;
    }

    setIsLoading(true);
    setAuthError("");

    try {
      const resolvedCaptchaToken = captchaToken;
      const result = await secureLogin({
        email: email.trim(),
        password: password,
        captchaToken: resolvedCaptchaToken,
      });

      if (!result.success) {
        setCaptchaToken(null);
        setCaptchaResetCount((c) => c + 1);
        setAuthError(result.error || AUTH_SECURITY_CONSTANTS.GENERIC_ERROR_MESSAGE);
        if (result.isLocked) {
          setIsLockedOut(true);
          setRemainingAttempts(0);
          setRetryAfterSeconds(result.retryAfterSeconds || 900);
        } else if (result.remainingAttempts !== undefined) {
          setRemainingAttempts(result.remainingAttempts);
        }
        return;
      }

      // Sucesso!
      setIsLockedOut(false);
      setRemainingAttempts(5);
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
    } catch (err) {
      console.error("Erro inesperado no login:", err);
      setCaptchaToken(null);
      setCaptchaResetCount((c) => c + 1);
      // Sempre mensagem genérica para evitar enumeração
      setAuthError(AUTH_SECURITY_CONSTANTS.GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  // [Função assíncrona: verificação no Supabase SQL (tenants/barbers) e disparo de e-mail com código de 6 dígitos]
  const handleSendVerificationCode = async () => {
    setForgotError("");
    setForgotNotice("");

    const targetEmail = (forgotEmail || "").trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      setForgotError("Por favor, informe um e-mail válido para recuperação.");
      return;
    }

    setForgotLoading(true);

    try {
      // 1. Consulta Supabase SQL: Tabela 'tenants' (campo owner_email)
      let tenantMatch = null;
      try {
        const { data: tenants, error: tErr } = await supabase
          .from("tenants")
          .select("id, name, owner_name, owner_email")
          .ilike("owner_email", targetEmail);

        if (!tErr && tenants && tenants.length > 0) {
          tenantMatch = tenants[0];
        }
      } catch (err) {
        console.warn("Aviso ao consultar tenants:", err);
      }

      // 2. Consulta Supabase SQL: Tabela 'barbers' (campo email)
      let barberMatch = null;
      try {
        const { data: barbers, error: bErr } = await supabase
          .from("barbers")
          .select("id, name, email")
          .ilike("email", targetEmail);

        if (!bErr && barbers && barbers.length > 0) {
          barberMatch = barbers[0];
        }
      } catch (err) {
        console.warn("Aviso ao consultar barbers:", err);
      }

      const userFound = tenantMatch || barberMatch;

      // 1. SE O EMAIL NÃO EXISTIR NO SUPABASE SQL (tabela tenants / barbers)
      if (!userFound) {
        setForgotStep("error_not_found");
        setForgotLoading(false);
        return;
      }

      // 2. SE O E-MAIL EXISTIR NO SUPABASE SQL (tabela tenants / barbers)
      const recipientName =
        tenantMatch?.owner_name ||
        tenantMatch?.name ||
        barberMatch?.name ||
        "Profissional";

      // Gera código de 6 dígitos seguro
      const code6Digits = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code6Digits);
      setVerificationCode("");
      setCountdownSeconds(180); // Inicia timer regressivo de 3 minutos

      // 1. Disparo de e-mail via API backend / SMTP oficial (quando há backend Node.js ativo)
      const isStaticHost =
        typeof window !== "undefined" &&
        (window.location.hostname.endsWith("github.io") ||
          window.location.hostname.includes("github.io"));

      const backendUrl = (
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_APP_URL ||
        ""
      ).trim();

      // Em ambiente estático puro (GitHub Pages) sem servidor Node, evita POST para a mesma origem que geraria 405
      const emailEndpoint = !isStaticHost
        ? "/api/email/send"
        : backendUrl && !backendUrl.includes("github.io")
        ? `${backendUrl.replace(/\/$/, "")}/api/email/send`
        : null;

      let emailSentViaBackend = false;
      if (emailEndpoint) {
        try {
          const emailRes = await fetch(emailEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: targetEmail,
              subject: "Código de Recuperação de Senha - Barbearia SaaS",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #171717; color: #f5f5f5; border-radius: 12px; overflow: hidden; border: 1px solid #333;">
                  <div style="background: linear-gradient(135deg, #d97706, #b45309); padding: 24px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">Recuperação de Acesso 🔐</h1>
                    <p style="margin: 6px 0 0; color: #fef3c7; font-size: 13px;">Barbearia SaaS - Suporte de Segurança</p>
                  </div>
                  <div style="padding: 24px; text-align: center;">
                    <p style="font-size: 15px; color: #e5e5e5; margin-top: 0; text-align: left;">Olá, <strong>${recipientName}</strong>,</p>
                    <p style="font-size: 14px; color: #a3a3a3; line-height: 1.5; text-align: left;">Recebemos uma solicitação para redefinir sua senha de acesso. Use o código de 6 dígitos abaixo para confirmar sua identidade:</p>
                    <div style="margin: 24px 0; background-color: #262626; border: 2px dashed #f59e0b; border-radius: 8px; padding: 16px; display: inline-block;">
                      <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #fbbf24; font-family: monospace;">${code6Digits}</span>
                    </div>
                    <p style="font-size: 13px; color: #ef4444; margin-bottom: 20px;">⏱️ Este código expira em <strong>3 minutos</strong>. Se você não solicitou a alteração, ignore este e-mail.</p>
                    <div style="font-size: 12px; color: #737373; border-top: 1px solid #262626; padding-top: 14px;">
                      Suporte: <strong>atendmentor@gmail.com</strong>
                    </div>
                  </div>
                </div>
              `,
            }),
          });
          if (emailRes.ok) {
            emailSentViaBackend = true;
          }
        } catch (sendErr) {
          console.warn("Aviso ao disparar e-mail via endpoint:", sendErr);
        }
      }

      // 2. Disparo de recuperação nativo via Supabase Auth
      let supabaseAuthSent = false;
      let supabaseErrorMsg = "";
      try {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: typeof window !== "undefined" ? window.location.href : undefined,
        });
        if (resetErr) {
          supabaseErrorMsg = resetErr.message || "";
          console.warn("Aviso ao solicitar recuperação no Supabase Auth:", resetErr);
        } else {
          supabaseAuthSent = true;
        }
      } catch (authErr) {
        supabaseErrorMsg = authErr?.message || "";
        console.warn("Aviso ao solicitar reset no Supabase Auth:", authErr);
      }

      if (isStaticHost && !emailSentViaBackend && !supabaseAuthSent && supabaseErrorMsg) {
        setForgotNotice(
          `Código de verificação de 6 dígitos gerado para ${targetEmail}. Nota: Caso não receba o e-mail em instantes, ative o SMTP Personalizado (atendmentor@gmail.com) no painel do Supabase.`
        );
      } else {
        setForgotNotice(`Código de 6 dígitos gerado e enviado para ${targetEmail}.`);
      }

      setForgotStep("code");
    } catch (err) {
      console.error("Erro na verificação de recuperação:", err);
      setForgotError("Erro inesperado ao consultar banco de dados.");
    } finally {
      setForgotLoading(false);
    }
  };

  // [Função assíncrona: valida código de 6 dígitos e atualiza senha]
  const handleConfirmNewPassword = async () => {
    setForgotError("");

    if (countdownSeconds <= 0) {
      setForgotError(
        "O código de verificação expirou (limite de 3 minutos). Clique em 'Reenviar Código' para solicitar um novo código."
      );
      return;
    }

    if (!verificationCode || verificationCode.length < 6) {
      setForgotError(
        "Informe o código de verificação de 6 dígitos recebido por e-mail."
      );
      return;
    }

    if (generatedCode && verificationCode.trim() !== generatedCode.trim()) {
      setForgotError("Código de verificação incorreto. Digite ou copie o código de 6 dígitos enviado.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setForgotError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotError("A confirmação de senha não confere com a nova senha.");
      return;
    }

    setForgotLoading(true);

    try {
      // Método 1: Tenta atualizar via Supabase Auth se sessão OTP estiver ativa
      try {
        await supabase.auth.verifyOtp({
          email: forgotEmail.trim(),
          token: verificationCode.trim(),
          type: "recovery",
        });
        await supabase.auth.updateUser({
          password: newPassword,
        });
      } catch (authErr) {
        console.warn("Aviso ao atualizar via Supabase Auth:", authErr);
      }

      // Conclusão com sucesso
      setForgotStep("success");
      setVerificationCode("");
      setGeneratedCode("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error("Erro ao redefinir senha:", err);
      setForgotError("Erro inesperado ao salvar a nova senha.");
    } finally {
      setForgotLoading(false);
    }
  };

  // [Função assíncrona: aciona o provedor OAuth do Google oficial do Supabase]
  const handleGoogleLogin = async () => {
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) setAuthError(error.message);
    } catch (err) {
      console.error("Erro no login Google:", err);
      setAuthError("Não foi possível conectar com o Google no momento.");
    }
  };

  return (
    <div className={loginStyles.pageWrapper}>
      <div className={loginStyles.container}>
        {/* CARD PRINCIPAL DE LOGIN COM LOGO CENTRALIZADO */}
        <div className={loginStyles.cardForm}>
          {/* Cabeçalho Interno Centralizado */}
          <div className={loginStyles.cardHeaderCentered}>
            <Logo size="sm" symbolOnly={true} />
            <h2 className={loginStyles.formTitle}>
              Barbearia SaaS
            </h2>
            <p className={loginStyles.formSubtitle}>
              Entre com suas credenciais para acessar sua conta.
            </p>
          </div>

          {/* Alerta de Erro de Autenticação */}
          {authError && (
            <Alert variant="error" title="Falha no Login">
              <SafeHtml html={authError} />
            </Alert>
          )}

          {/* Formulário de Credenciais */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="E-mail de Acesso"
              type="email"
              autoComplete="email"
              placeholder="exemplo@barbearia.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors?.email)
                  setErrors((prev) => ({ ...prev, email: null }));
              }}
              error={errors?.email}
            />

            {/* Senha com Botão de Revelar */}
            <div className={loginStyles.passwordWrapper}>
              <Input
                label="Sua Senha"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors?.password)
                    setErrors((prev) => ({ ...prev, password: null }));
                }}
                error={errors?.password}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={loginStyles.togglePasswordBtn}
                aria-label={showPassword ? "Ocultar senha em texto claro" : "Exibir senha em texto claro"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Linha de Opções: Lembrar de mim e Esqueci a Senha */}
            <div className={loginStyles.optionsRow}>
              <label className={loginStyles.rememberMeLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                />
                <span>Lembrar de mim</span>
              </label>

              {/* [Disparo do Modal de Recuperação de Senha] */}
              <button
                type="button"
                onClick={() => {
                  setForgotError("");
                  setForgotNotice("");
                  setForgotStep("email");
                  setIsForgotModalOpen(true);
                }}
                className={loginStyles.forgotPasswordLink}
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Widget de Verificação CAPTCHA Anti-Robô */}
            <TurnstileWidget
              provider="turnstile"
              action="login"
              autoVerifyInDemo={false}
              resetSignal={captchaResetCount}
              onVerify={(token) => {
                setCaptchaToken(token);
                if (errors.captcha) {
                  setErrors((prev) => ({ ...prev, captcha: null }));
                }
              }}
              onError={(err) => {
                setCaptchaToken(null);
                setAuthError(`Desafio de segurança: ${err}`);
              }}
            />
            {errors.captcha && (
              <p className="text-[11px] text-rose-400 font-medium -mt-1 mb-2">
                {errors.captcha}
              </p>
            )}

            {/* Feedback Visual de Rate-Limiting & Anti-Brute Force */}
            {remainingAttempts < 5 && !isLockedOut && (
              <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded bg-amber-950/40 border border-amber-900/50 text-amber-300">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Proteção Anti-Força Bruta:</span>
                </span>
                <span className="font-mono font-bold">
                  {remainingAttempts} de 5 tentativas restantes
                </span>
              </div>
            )}

            {isLockedOut && (
              <div className="text-[11px] p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Bloqueio Temporário por Excesso de Tentativas</span>
                </div>
                <p className="text-rose-300 text-[10px]">
                  Por segurança, seu acesso foi suspenso temporariamente após 5 tentativas incorretas. Tente novamente em 15 minutos.
                </p>
              </div>
            )}

            {/* Botão Primário de Entrar Conectado ao isLoading */}
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={isLockedOut}
              className="w-full text-xs py-2.5 font-bold shadow-lg"
            >
              {isLockedOut ? (
                "Acesso Bloqueado Temporariamente"
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <span>Entrar na Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            <Divider label="ou continue com" />

            {/* Botão de Acesso com Google posicionado abaixo do botão primário */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className={loginStyles.googleButton}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Entrar com o Google</span>
            </button>
          </form>
        </div>

        {/* 3. RODAPÉ: Link para Criar Barbearia (Onboarding) */}
        <p className={loginStyles.footerLink}>
          Sua barbearia ainda não usa o sistema?{" "}
          <span
            onClick={() => onGoToSignup && onGoToSignup()}
            className={loginStyles.signupHighlight}
          >
            Criar conta grátis
          </span>
        </p>
      </div>

      {/* ======================================================== */}
      {/* MODAL DE RECUPERAÇÃO DE SENHA (FLUXO SUPABASE OTP)       */}
      {/* ======================================================== */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={handleCloseForgotModal}
        title={
          forgotStep === "error_not_found"
            ? null
            : forgotStep === "success"
            ? "Senha Atualizada"
            : "Recuperação de Senha"
        }
        showHeaderBorder={forgotStep !== "error_not_found"}
        footer={
          forgotStep === "email" ? (
            <>
              <Button
                variant="secondary"
                onClick={handleCloseForgotModal}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                isLoading={forgotLoading}
                onClick={handleSendVerificationCode}
              >
                Enviar Código de Verificação
              </Button>
            </>
          ) : forgotStep === "code" ? (
            <>
              <Button
                variant="secondary"
                disabled={forgotLoading}
                onClick={() => {
                  setForgotError("");
                  setForgotStep("email");
                }}
              >
                <span className="flex items-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </span>
              </Button>
              <Button
                variant="primary"
                isLoading={forgotLoading}
                onClick={handleConfirmNewPassword}
              >
                Redefinir Senha
              </Button>
            </>
          ) : null
        }
      >
        {/* [Feedback de erro nativo do Supabase Auth no topo do modal] */}
        {forgotError && (
          <div className="mb-4">
            <Alert variant="error" title="Atenção">
              <SafeHtml html={forgotError} />
            </Alert>
          </div>
        )}

        {/* ======================================================== */}
        {/* 1. MODAL ALERT ERROR (VERMELHO): E-MAIL NÃO CADASTRADO   */}
        {/* ======================================================== */}
        {forgotStep === "error_not_found" && (
          <div className="py-4 px-2 space-y-6 text-center">
            {/* Ícone Lucide padrão com destaque visual vermelho */}
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-500 flex items-center justify-center mx-auto shadow-xl shadow-rose-950/50">
              <AlertOctagon className="w-9 h-9 text-rose-500 stroke-[2.2]" />
            </div>

            {/* Título & Subtítulo (Exibição única sem redundância) */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white tracking-tight">
                OPS! E-mail não cadastrado
              </h3>
              <p className="text-sm text-neutral-300 max-w-sm mx-auto leading-relaxed">
                Desculpe! Esse e-mail não foi encontrado em nosso banco de dados
              </p>
            </div>

            {/* Botão Vermelho de Ação: OK, Entendi! */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCloseForgotModal}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-bold text-sm transition-all shadow-lg shadow-rose-950/50 cursor-pointer flex items-center justify-center"
              >
                <span>OK, Entendi!</span>
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 1: SOLICITAÇÃO DO E-MAIL */}
        {forgotStep === "email" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendVerificationCode();
            }}
            className="space-y-4 text-left"
          >
            <p className="text-xs text-neutral-400 leading-relaxed">
              Informe o e-mail cadastrado na sua barbearia. Enviaremos um{" "}
              <strong className="text-neutral-200">código de 6 dígitos</strong>{" "}
              para você redefinir sua senha com segurança.
            </p>
            <Input
              label="E-mail Cadastrado"
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="seuemail@barbearia.com"
              value={forgotEmail}
              onChange={(e) => {
                setForgotEmail(DOMPurify.sanitize(e.target.value.trim()));
                if (forgotError) setForgotError("");
              }}
            />
          </form>
        )}

        {/* ETAPA 2: DIGITAÇÃO DO CÓDIGO + NOVA SENHA */}
        {forgotStep === "code" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirmNewPassword();
            }}
            className="space-y-4 text-left"
          >
            {/* Aviso de envio de e-mail */}
            <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl flex items-start gap-3">
              <Mail className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-neutral-300 leading-relaxed">
                <span>Enviamos um código de verificação para</span>{" "}
                <strong className="text-amber-400 font-medium">{forgotEmail}</strong>.
                <span className="text-neutral-400 block mt-0.5">Consulte sua caixa de entrada e insira o código abaixo.</span>
              </div>
            </div>

            {/* Timer Regressivo de 3 minutos */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                countdownSeconds > 0
                  ? "bg-amber-950/20 border-amber-800/40 text-amber-300"
                  : "bg-rose-950/30 border-rose-800/40 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock
                  className={`w-4 h-4 ${
                    countdownSeconds > 0
                      ? "text-amber-400 animate-pulse"
                      : "text-rose-400"
                  }`}
                />
                <span className="font-semibold">
                  {countdownSeconds > 0
                    ? "Tempo Restante do Código:"
                    : "Tempo Esgotado:"}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono font-bold text-sm">
                <span
                  className={`px-2.5 py-0.5 rounded-md ${
                    countdownSeconds > 0
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {formatCountdown(countdownSeconds)}
                </span>
              </div>
            </div>

            {countdownSeconds === 0 && (
              <p className="text-[11px] text-rose-400 font-medium">
                O código de verificação expirou. Clique em &ldquo;Reenviar Código&rdquo; para solicitar um novo código de 3 minutos.
              </p>
            )}

            <Input
              label="Digite ou Cole o Código (6 dígitos)"
              placeholder="000000"
              maxLength={6}
              autoFocus
              className="font-mono text-center tracking-widest text-lg font-bold"
              value={verificationCode}
              onChange={(e) => {
                setVerificationCode(e.target.value.replace(/\D/g, ""));
                if (forgotError) setForgotError("");
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nova Senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (forgotError) setForgotError("");
                }}
              />
              <Input
                label="Confirmar Nova Senha"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmNewPassword}
                onChange={(e) => {
                  setConfirmNewPassword(e.target.value);
                  if (forgotError) setForgotError("");
                }}
              />
            </div>

            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-neutral-500">Não recebeu ou expirou?</span>
              <button
                type="button"
                disabled={forgotLoading}
                onClick={handleSendVerificationCode}
                className="text-amber-400 font-bold hover:underline cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reenviar Código</span>
              </button>
            </div>
          </form>
        )}

        {/* ETAPA 3: SUCESSO */}
        {forgotStep === "success" && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                Senha redefinida com sucesso!
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto">
                Sua credencial foi atualizada no Supabase. Você já pode fazer
                login com sua nova senha.
              </p>
            </div>
            <Button
              variant="primary"
              className="w-full mt-2 font-bold"
              onClick={handleCloseForgotModal}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span>Fazer Login Agora</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
