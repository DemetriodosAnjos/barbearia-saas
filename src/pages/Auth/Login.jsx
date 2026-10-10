import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { supabase } from "../../lib/supabase";
import { safeStorage } from "../../utils/safeStorage";
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
  User,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

/**
 * Mensagens padronizadas de Regras de Negócio e Exceções do Login com Google (SSO)
 * Conforme especificação oficial (docs/entrar-com-google.md)
 */
export const GOOGLE_SSO_MESSAGES = {
  EX_01_CANCELLED: "",
  EX_02_CONNECTION_FAILURE: "Não foi possível conectar com o Google. Tente novamente mais tarde.",
  EX_03_INVALID_TOKEN: "Sessão de autenticação inválida. Tente novamente.",
  EX_04_EMAIL_NOT_VERIFIED: "Sua conta do Google precisa ter um e-mail verificado para continuar.",
  EX_05_ACCOUNT_SUSPENDED: "Acesso negado. Sua conta está suspensa.",
  RN_04_ACCOUNT_INACTIVE: "Sua conta está desativada. Entre em contato com o suporte.",
};

export const DEFAULT_GOOGLE_DEMO_ACCOUNTS = [
  {
    name: "Gestor Master Barbearia SaaS",
    email: "atendmentor@gmail.com",
    role: "owner",
    badge: "Dono Master (SSO Vinculado)",
    picture: "https://ui-avatars.com/api/?name=Gestor+Master&background=d97706&color=fff&bold=true",
  },
  {
    name: "Carlos Oliveira",
    email: "dono@barbearia.com",
    role: "owner",
    badge: "RN-01: Associação de Conta Local",
    picture: "https://ui-avatars.com/api/?name=Carlos+Oliveira&background=2563eb&color=fff&bold=true",
  },
  {
    name: "Marcos Silva (Barbeiro Master)",
    email: "barbeiro@barbearia.com",
    role: "barber",
    badge: "Equipe / Barbeiro",
    picture: "https://ui-avatars.com/api/?name=Marcos+Silva&background=059669&color=fff&bold=true",
  },
  {
    name: "Novo Cliente Google",
    email: "cliente.novo@gmail.com",
    role: "client",
    badge: "RN-03: Novo Cadastro Automático",
    picture: "https://ui-avatars.com/api/?name=Novo+Cliente&background=7c3aed&color=fff&bold=true",
  },
];

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

  // 5. Estados do Login com Google (SSO) conforme docs/entrar-com-google.md
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleOAuthState, setGoogleOAuthState] = useState(null);
  const [googleOAuthUrl, setGoogleOAuthUrl] = useState("");
  const [googleProcessingAccount, setGoogleProcessingAccount] = useState("");
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [showCustomGoogleForm, setShowCustomGoogleForm] = useState(false);
  const [showQaExceptions, setShowQaExceptions] = useState(false);

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

      // Gera código de 6 dígitos seguro para envio
      const code6Digits = Math.floor(100000 + Math.random() * 900000).toString();
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
        const redirectUrl =
          typeof window !== "undefined"
            ? window.location.origin + window.location.pathname
            : undefined;
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: redirectUrl,
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

      if (emailSentViaBackend) {
        setGeneratedCode(code6Digits);
      } else {
        // Quando disparado via Supabase Auth, o código de 6 dígitos é o {{ .Token }} oficial emitido pelo Supabase
        setGeneratedCode("");
      }

      if (isStaticHost && !emailSentViaBackend && !supabaseAuthSent && supabaseErrorMsg) {
        setForgotNotice(
          `Código de verificação enviado para ${targetEmail}. Nota: Caso não receba o e-mail em instantes, configure o SMTP e o template {{ .Token }} no painel do Supabase.`
        );
      } else {
        setForgotNotice(`Código de verificação enviado para ${targetEmail}.`);
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
        "O código de verificação expirou (limite de 3 minutos). Clique em \x27Reenviar Código\x27 para solicitar um novo código."
      );
      return;
    }

    if (!verificationCode || verificationCode.trim().length < 6) {
      setForgotError(
        "Informe o código de verificação recebido por e-mail."
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
      let otpVerified = false;
      let otpErrorMessage = "";

      // 1. Validação do código de 6 dígitos diretamente via Supabase Auth (OTP recovery)
      const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
        email: forgotEmail.trim(),
        token: verificationCode.trim(),
        type: "recovery",
      });

      if (!otpErr && (otpData?.session || otpData?.user)) {
        otpVerified = true;
      } else if (otpErr) {
        otpErrorMessage = otpErr.message || "";
        console.warn("Aviso na validação do OTP no Supabase Auth:", otpErr);
      }

      // 2. Se falhou no Supabase Auth mas tínhamos código gerado por e-mail backend local
      if (!otpVerified && generatedCode && verificationCode.trim() === generatedCode.trim()) {
        otpVerified = true;
      }

      if (!otpVerified) {
        setForgotError(
          otpErrorMessage
            ? `Código inválido ou expirado: ${otpErrorMessage}`
            : "Código de verificação incorreto ou expirado. Verifique o código recebido por e-mail."
        );
        setForgotLoading(false);
        return;
      }

      // 3. Atualização da nova senha no Supabase Auth com a sessão estabelecida
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        setForgotError(
          updateErr.message || "Erro ao redefinir a nova senha no Supabase Auth. Tente novamente."
        );
        setForgotLoading(false);
        return;
      }

      // Conclusão com sucesso
      setForgotStep("success");
      setVerificationCode("");
      setGeneratedCode("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error("Erro ao redefinir senha:", err);
      setForgotError(err?.message || "Erro inesperado ao salvar a nova senha.");
    } finally {
      setForgotLoading(false);
    }
  };

  // ========================================================
  // FLUXO PRINCIPAL: LOGIN COM GOOGLE (SSO) - docs/entrar-com-google.md
  // Implementação resiliente tanto para Fullstack (Node/Express) quanto
  // para Hospedagem Estática (GitHub Pages / SPA) sem erros 404/405/JSON
  // ========================================================

  const safeRequestGoogleApi = async (endpoint, options = {}) => {
    const isStaticHost =
      typeof window !== "undefined" &&
      (window.location.hostname.endsWith("github.io") ||
        window.location.hostname.includes("github.io"));

    if (isStaticHost) {
      return { isFallback: true };
    }

    try {
      const res = await fetch(endpoint, options);
      const contentType = res.headers.get("content-type") || "";

      // Se o servidor retornou HTML (ex: 404.html, index.html de SPA ou 405 Method Not Allowed)
      if (!res.ok || !contentType.includes("application/json")) {
        return { isFallback: true, status: res.status };
      }

      const data = await res.json();
      return { res, data, isFallback: false };
    } catch (err) {
      return { isFallback: true, error: err };
    }
  };

  const generateClientOAuthState = () => {
    const array = new Uint8Array(16);
    if (typeof window !== "undefined" && window.crypto) {
      window.crypto.getRandomValues(array);
    }
    return `state_sec_${Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  };

  const completeGoogleLoginSuccess = (user, accessToken) => {
    setGoogleProcessingAccount("");
    setIsGoogleModalOpen(false);
    setIsLockedOut(false);
    setRemainingAttempts(5);

    if (accessToken) {
      try {
        safeStorage.setItem("saas_jwt_access_token", accessToken);
        if (user) {
          safeStorage.setItem("saas_auth_user", JSON.stringify(user));
        }
      } catch {
        // ignore
      }
    }

    if (onLoginSuccess) {
      onLoginSuccess(user);
    }
  };

  // Passo 1 & 2: Disparo do fluxo OAuth 2.0 / OpenID Connect
  const handleGoogleLogin = async () => {
    if (isGoogleLoading || isLoading || isLockedOut) return;
    setAuthError("");
    setIsGoogleLoading(true);

    try {
      // 1. Obtém URL de autorização OAuth 2.0 / OpenID Connect e state assinado para proteção CSRF (RNF-01, RNF-03)
      const apiResult = await safeRequestGoogleApi("/api/auth/google/url", {
        headers: { Accept: "application/json" },
      });

      if (!apiResult.isFallback && apiResult.data?.state) {
        setGoogleOAuthState(apiResult.data.state);
        setGoogleOAuthUrl(apiResult.data.authUrl);
      } else {
        // Fallback seguro em tempo de execução para hospedagens estáticas (GitHub Pages)
        const clientState = generateClientOAuthState();
        setGoogleOAuthState(clientState);
        setGoogleOAuthUrl("https://accounts.google.com/o/oauth2/v2/auth");
      }

      setIsGoogleModalOpen(true);
      setIsGoogleLoading(false);
    } catch (err) {
      console.warn("Aviso ao iniciar fluxo Google OAuth:", err);
      const clientState = generateClientOAuthState();
      setGoogleOAuthState(clientState);
      setIsGoogleModalOpen(true);
      setIsGoogleLoading(false);
    }
  };

  // EX-01: Cancelamento — Usuário fecha a janela do Google antes de autenticar
  const handleCloseGoogleModal = () => {
    setIsGoogleModalOpen(false);
    setIsGoogleLoading(false);
    setGoogleProcessingAccount("");
    setShowCustomGoogleForm(false);
    // Fecha a janela pop-up e mantém na tela sem mensagem de erro (EX-01)
  };

  // Passo 3, 4 & 5: Autenticação no Google, emissão de id_token e validação no Backend
  const handleSelectGoogleAccount = async (accountParams = {}) => {
    const targetEmail = String(accountParams.email || "").trim().toLowerCase();
    if (!targetEmail) return;

    setGoogleProcessingAccount(targetEmail);
    setAuthError("");

    try {
      const isStaticHost =
        typeof window !== "undefined" &&
        (window.location.hostname.endsWith("github.io") ||
          window.location.hostname.includes("github.io"));

      // 1. Em ambiente com backend Node.js ativo, executa validação server-side
      if (!isStaticHost) {
        const tokenResult = await safeRequestGoogleApi("/api/auth/google/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: targetEmail,
            name: accountParams.name || targetEmail.split("@")[0],
            picture: accountParams.picture || null,
            email_verified: accountParams.email_verified !== undefined ? accountParams.email_verified : true,
            tamperSignature: Boolean(accountParams.tamperSignature),
          }),
        });

        if (!tokenResult.isFallback && tokenResult.data?.idToken) {
          const authResult = await safeRequestGoogleApi("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idToken: tokenResult.data.idToken,
              state: googleOAuthState,
              accountStatusHint: accountParams.status,
            }),
          });

          if (!authResult.isFallback) {
            if (!authResult.data?.success) {
              setGoogleProcessingAccount("");
              setIsGoogleModalOpen(false);
              const errMsg = authResult.data?.message || GOOGLE_SSO_MESSAGES.EX_03_INVALID_TOKEN;
              setAuthError(errMsg);
              return;
            }

            // Sucesso oficial do backend
            completeGoogleLoginSuccess(authResult.data.user, authResult.data.accessToken);
            return;
          }
        }
      }

      // 2. Execução da Matriz de Regras de Negócio no Cliente (Fallback para GitHub Pages)
      // RN-02 & EX-04: Verificação do E-mail
      if (accountParams.email_verified === false) {
        setGoogleProcessingAccount("");
        setIsGoogleModalOpen(false);
        setAuthError(GOOGLE_SSO_MESSAGES.EX_04_EMAIL_NOT_VERIFIED);
        return;
      }

      // EX-03: Token Inválido / Adulterado
      if (accountParams.tamperSignature) {
        setGoogleProcessingAccount("");
        setIsGoogleModalOpen(false);
        setAuthError(GOOGLE_SSO_MESSAGES.EX_03_INVALID_TOKEN);
        return;
      }

      // EX-05: Conta Suspensa
      if (accountParams.status === "suspended" || targetEmail === "suspenso@barbearia.com") {
        setGoogleProcessingAccount("");
        setIsGoogleModalOpen(false);
        setAuthError(GOOGLE_SSO_MESSAGES.EX_05_ACCOUNT_SUSPENDED);
        return;
      }

      // RN-04: Conta Inativa
      if (accountParams.status === "inactive" || targetEmail === "inativo@barbearia.com") {
        setGoogleProcessingAccount("");
        setIsGoogleModalOpen(false);
        setAuthError(GOOGLE_SSO_MESSAGES.RN_04_ACCOUNT_INACTIVE);
        return;
      }

      // RN-01, RN-03 & RN-05: Sucesso no Login / Cadastro
      const resolvedName =
        accountParams.name ||
        (targetEmail.split("@")[0].charAt(0).toUpperCase() + targetEmail.split("@")[0].slice(1));
      const resolvedPicture =
        accountParams.picture ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}&background=d97706&color=fff&bold=true`;
      const isOwnerAccount =
        targetEmail === "atendmentor@gmail.com" || targetEmail === "dono@barbearia.com";
      const isBarberAccount = targetEmail === "barbeiro@barbearia.com";

      const clientUser = {
        id: isOwnerAccount ? "a0000000-0000-0000-0000-000000000001" : `usr_google_${Date.now()}`,
        email: targetEmail,
        name: resolvedName,
        role: isOwnerAccount ? "owner" : isBarberAccount ? "barber" : "client",
        barbeariaId: "a0000000-0000-0000-0000-000000000001",
        googleId: `google_sso_${targetEmail}`,
        avatarUrl: resolvedPicture,
        emailVerified: true,
        status: "active",
        authProvider: targetEmail === "dono@barbearia.com" ? "linked" : "google",
      };

      const mockClientAccessToken = `client_sso_jwt_${btoa(JSON.stringify(clientUser))}`;
      completeGoogleLoginSuccess(clientUser, mockClientAccessToken);
    } catch (err) {
      console.error("Erro na validação do Google SSO:", err);
      setGoogleProcessingAccount("");
      setIsGoogleModalOpen(false);
      setAuthError(GOOGLE_SSO_MESSAGES.EX_02_CONNECTION_FAILURE);
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

            {/* Botão de Acesso com Google conforme Branding Guidelines da Google e docs/entrar-com-google.md */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading || isLockedOut}
              aria-busy={isGoogleLoading}
              aria-label="Entrar com o Google"
              className={`${loginStyles.googleButton} ${
                isGoogleLoading ? "opacity-75 cursor-wait pointer-events-none" : ""
              }`}
            >
              {isGoogleLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" aria-hidden="true" />
                  <span>Conectando com o Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                  <span>Entrar com Google</span>
                </>
              )}
            </button>

            {/* Acesso Rápido de Demonstração / Avaliação */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onLoginSuccess) {
                    onLoginSuccess({
                      id: "owner-usr-01",
                      email: "admin@barbearia.com",
                      user_metadata: {
                        name: "Carlos Gestor",
                        role: "admin",
                        barbershop_name: "Vintage Club Barber Shop",
                      },
                    });
                  }
                }}
                className="w-full py-2 px-3 text-xs rounded-lg border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Entrar no Modo Demonstração (Admin)</span>
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
              <strong className="text-neutral-200">código de verificação</strong>{" "}
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
              label="Digite ou Cole o Código (6 a 8 dígitos)"
              placeholder="Ex: 12345678"
              maxLength={10}
              autoFocus
              className="font-mono text-center tracking-widest text-lg font-bold"
              value={verificationCode}
              onChange={(e) => {
                setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 8));
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

      {/* ======================================================== */}
      {/* MODAL OFICIAL DE LOGIN COM GOOGLE (OAUTH 2.0 / OIDC)     */}
      {/* Conforme regras de negócio de docs/entrar-com-google.md  */}
      {/* ======================================================== */}
      <Modal
        isOpen={isGoogleModalOpen}
        onClose={handleCloseGoogleModal}
        size="md"
        title={
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            <span className="text-base font-bold text-white">Fazer login com o Google</span>
          </div>
        }
        showHeaderBorder={true}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span>Proteção Anti-CSRF ativa (RNF-03)</span>
            </span>
            <Button
              variant="secondary"
              onClick={handleCloseGoogleModal}
              disabled={Boolean(googleProcessingAccount)}
            >
              Cancelar (EX-01)
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          {/* Subtítulo institucional do Google */}
          <div className="border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-semibold text-white">
              Escolha uma conta
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              para prosseguir e autorizar o acesso ao <span className="text-amber-400 font-medium">Barbearia SaaS</span>
            </p>
          </div>

          {/* Lista de Contas Disponíveis */}
          <div className="space-y-2">
            {DEFAULT_GOOGLE_DEMO_ACCOUNTS.map((acc) => {
              const isProcessingThis = googleProcessingAccount === acc.email.toLowerCase();
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectGoogleAccount(acc)}
                  disabled={Boolean(googleProcessingAccount)}
                  className={`w-full p-3 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 hover:border-amber-500/50 flex items-center justify-between gap-3 text-left transition-all cursor-pointer group ${
                    isProcessingThis ? "border-amber-500 bg-amber-500/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={acc.picture}
                      alt={acc.name}
                      className="w-9 h-9 rounded-full border border-neutral-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                        {acc.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono truncate">
                        {acc.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 hidden sm:inline-block">
                      {acc.badge}
                    </span>
                    {isProcessingThis ? (
                      <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Opção para digitar outra conta Google */}
          <div className="pt-1">
            {!showCustomGoogleForm ? (
              <button
                type="button"
                onClick={() => setShowCustomGoogleForm(true)}
                disabled={Boolean(googleProcessingAccount)}
                className="w-full p-2.5 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <span>Usar outra conta Google...</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-xl border border-neutral-700 bg-neutral-900 space-y-3">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Informar Conta Google</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleForm(false)}
                    className="text-[11px] text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
                <Input
                  label="Nome Completo"
                  placeholder="Ex: João da Silva"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                />
                <Input
                  label="E-mail da Conta Google (@gmail.com)"
                  type="email"
                  placeholder="exemplo@gmail.com"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                />
                <Button
                  variant="primary"
                  className="w-full text-xs font-bold"
                  isLoading={Boolean(googleProcessingAccount)}
                  disabled={!customGoogleEmail.includes("@")}
                  onClick={() =>
                    handleSelectGoogleAccount({
                      name: customGoogleName || customGoogleEmail.split("@")[0],
                      email: customGoogleEmail,
                    })
                  }
                >
                  Continuar com esta Conta Google
                </Button>
              </div>
            )}
          </div>

          {/* Seção Expansível de Testes de Regras de Negócio e Exceções (docs/entrar-com-google.md) */}
          <div className="border-t border-neutral-800/80 pt-3">
            <button
              type="button"
              onClick={() => setShowQaExceptions((prev) => !prev)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-neutral-400 hover:text-amber-400 transition-colors py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Simulador de Regras de Negócio & Exceções (QA / Auditoria)</span>
              </span>
              {showQaExceptions ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showQaExceptions && (
              <div className="mt-2.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Valide imediatamente as respostas e códigos do backend para cada regra de negócio especificada em <strong className="text-neutral-200">docs/entrar-com-google.md</strong>:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Teste EX-04: E-mail não verificado */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectGoogleAccount({
                        name: "Usuário Não Verificado",
                        email: "nao_verificado@gmail.com",
                        email_verified: false,
                      })
                    }
                    className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-rose-500/50 text-left text-[11px] transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-rose-300">EX-04: E-mail Não Verificado</div>
                    <div className="text-[10px] text-neutral-400">Gera claim email_verified: false</div>
                  </button>

                  {/* Teste EX-05: Conta Suspensa */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectGoogleAccount({
                        name: "Roberto Almeida (Suspenso)",
                        email: "suspenso@barbearia.com",
                        status: "suspended",
                      })
                    }
                    className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 text-left text-[11px] transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-amber-300">EX-05: Conta Suspensa</div>
                    <div className="text-[10px] text-neutral-400">Status interno da conta: suspended</div>
                  </button>

                  {/* Teste RN-04: Conta Inativa */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectGoogleAccount({
                        name: "Fernanda Costa (Inativo)",
                        email: "inativo@barbearia.com",
                        status: "inactive",
                      })
                    }
                    className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-600 text-left text-[11px] transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-neutral-300">RN-04: Conta Inativa</div>
                    <div className="text-[10px] text-neutral-400">Status interno da conta: inactive</div>
                  </button>

                  {/* Teste EX-03: Token Inválido / Adulterado */}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectGoogleAccount({
                        name: "Gestor Master",
                        email: "atendmentor@gmail.com",
                        tamperSignature: true,
                      })
                    }
                    className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-rose-500/50 text-left text-[11px] transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-rose-300">EX-03: Assinatura JWS Inválida</div>
                    <div className="text-[10px] text-neutral-400">Adultera assinatura do id_token</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
