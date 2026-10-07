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
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  // 4. Estados da Modal de Recuperação de Senha com Supabase Auth
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState("email"); // 'email' | 'code' | 'success'
  const [forgotEmail, setForgotEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotNotice, setForgotNotice] = useState("");

  // [Novo estado para exibir erros nativos dentro do modal sem usar alert do navegador]
  const [forgotError, setForgotError] = useState("");

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
      errs.captcha = "Conclua a verificação de segurança (CAPTCHA) antes de continuar.";
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

    setIsLoading(true);
    setAuthError("");

    try {
      const result = await secureLogin({
        email: email.trim(),
        password: password,
        captchaToken: captchaToken,
      });

      if (!result.success) {
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
      // Sempre mensagem genérica para evitar enumeração
      setAuthError(AUTH_SECURITY_CONSTANTS.GENERIC_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  // [Função assíncrona: recuperação de senha protegida contra enumeração de usuários]
  const handleSendVerificationCode = async () => {
    setForgotError("");
    setForgotNotice("");

    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      setForgotError("Por favor, informe um e-mail válido para recuperação.");
      return;
    }

    setForgotLoading(true);

    try {
      const resetResult = await securePasswordResetRequest({
        email: forgotEmail.trim(),
        captchaToken: captchaToken,
        skipCaptchaForTest: true,
      });

      setForgotNotice(resetResult.message);
      // Avança para a etapa de inserção do código e nova senha
      setForgotStep("code");
    } catch (err) {
      console.error("Erro no envio do código:", err);
      // Resposta uniforme contra enumeração
      setForgotNotice(
        AUTH_SECURITY_CONSTANTS.PASSWORD_RECOVERY_GENERIC_MESSAGE
      );
      setForgotStep("code");
    } finally {
      setForgotLoading(false);
    }
  };

  // [Função assíncrona: valida OTP no Supabase e atualiza a senha de forma definitiva]
  const handleConfirmNewPassword = async () => {
    setForgotError("");

    if (!verificationCode || verificationCode.length < 6) {
      setForgotError(
        "Informe o código de verificação de 6 dígitos recebido por e-mail.",
      );
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
      // Método 1: validação do OTP de recuperação no Supabase
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: forgotEmail.trim(),
        token: verificationCode.trim(),
        type: "recovery",
      });

      if (verifyError) {
        setForgotError("Código de verificação inválido ou expirado.");
        return;
      }

      // Método 2: atualização imediata da nova senha no usuário autenticado
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setForgotError(
          updateError.message || "Erro ao redefinir a nova senha.",
        );
        return;
      }

      // Conclusão com sucesso
      setForgotStep("success");
      setVerificationCode("");
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
              Acesso ao Sistema
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

          {/* Botão de Acesso Rápido com Google (Supabase OAuth) */}
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

          <Divider label="ou com credenciais" />

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

            {/* Botão de Entrar Conectado ao isLoading */}
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

            {/* Acesso de Teste Rápido como Dono da Barbearia */}
            <div className="pt-2 border-t border-neutral-800/80">
              <button
                type="button"
                onClick={() => {
                  const ownerTestUser = {
                    id: "owner-usr-01",
                    email: email.trim() || "dono@barbearia.com",
                    user_metadata: {
                      role: "admin",
                      name: "Carlos Silva (Dono da Barbearia)",
                      barbershop_name: "Vintage Club Barber Shop",
                    },
                  };
                  if (onLoginSuccess) {
                    onLoginSuccess(ownerTestUser);
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-amber-600/40 bg-amber-950/20 hover:bg-amber-900/30 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                title="Acesse instantaneamente o painel como dono da barbearia para testes"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Testar como Dono da Barbearia</span>
              </button>
            </div>
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
        onClose={() => {
          setIsForgotModalOpen(false);
          setForgotStep("email");
          setForgotError("");
          setVerificationCode("");
          setNewPassword("");
          setConfirmNewPassword("");
        }}
        title={
          forgotStep === "success" ? "Senha Atualizada" : "Recuperação de Senha"
        }
        footer={
          forgotStep === "email" ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsForgotModalOpen(false);
                  setForgotError("");
                }}
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
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
              <span className="font-semibold flex items-center gap-1.5 mb-1 text-emerald-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Solicitação Processada:</span>
              </span>
              <SafeHtml html={forgotNotice || "Se o e-mail informado estiver cadastrado na plataforma, o código de 6 dígitos foi despachado para a caixa de entrada."} />
            </div>

            <Input
              label="Código de Verificação (6 dígitos)"
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
              <span className="text-neutral-500">Não recebeu o e-mail?</span>
              <button
                type="button"
                disabled={forgotLoading}
                onClick={handleSendVerificationCode}
                className="text-amber-400 font-bold hover:underline cursor-pointer disabled:opacity-50"
              >
                Reenviar Código
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
              onClick={() => {
                setIsForgotModalOpen(false);
                setForgotStep("email");
                setForgotError("");
              }}
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
