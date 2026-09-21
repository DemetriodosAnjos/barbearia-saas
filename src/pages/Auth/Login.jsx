import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { loginStyles } from "./Login.styles";
import Logo from "../../components/ui/Logo";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Divider from "../../components/ui/Divider";
import Alert from "../../components/ui/Alert";
import Modal from "../../components/ui/Modal";

export default function Login({
  onLoginSuccess,
  onGoToSignup, // Redireciona para o Onboarding
}) {
  // 1. Tipo de Usuário (Dono da Barbearia vs Barbeiro da Equipe)
  const [userRole, setUserRole] = useState("owner"); // 'owner' | 'barber'

  // 2. Campos de Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // 3. Estados de Controle
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // 4. Estados da Modal de Recuperação de Senha com Supabase Auth
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState("email"); // 'email' | 'code' | 'success'
  const [forgotEmail, setForgotEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // [Novo estado para exibir erros nativos dentro do modal sem usar alert do navegador]
  const [forgotError, setForgotError] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

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

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submissão do Login
  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Executa a validação dos campos
    if (!validateForm()) return;

    setIsLoading(true);
    setAuthError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        // Mensagens amigáveis em português para erros comuns
        if (error.message.includes("Invalid login credentials")) {
          setAuthError("E-mail ou senha incorretos.");
        } else if (error.message.includes("Email not confirmed")) {
          setAuthError("Por favor, confirme seu e-mail antes de acessar.");
        } else {
          setAuthError(error.message);
        }
        return;
      }

      // Sucesso!
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      console.error("Erro inesperado no login:", err);
      setAuthError("Falha na conexão com o servidor. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // [Função assíncrona: envia código OTP real via Supabase Auth com tratamento try/catch completo]
  const handleSendVerificationCode = async () => {
    setForgotError("");

    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      setForgotError("Por favor, informe um e-mail válido para recuperação.");
      return;
    }

    setForgotLoading(true);

    try {
      // Método Supabase: dispara o envio do código de 6 dígitos para o e-mail do usuário
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotEmail.trim(),
        {
          redirectTo: window.location.origin,
        },
      );

      if (error) {
        setForgotError(
          error.message || "Erro ao enviar código de recuperação.",
        );
        return;
      }

      // Avança para a etapa de inserção do código e nova senha
      setForgotStep("code");
    } catch (err) {
      console.error("Erro no envio do código:", err);
      setForgotError("Falha na comunicação com o servidor de autenticação.");
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
        {/* 1. SELETOR INTELIGENTE DE PERFIL: DONO vs BARBEIRO */}
        <div className={loginStyles.roleToggleWrapper}>
          <button
            type="button"
            onClick={() => setUserRole("owner")}
            className={`
              ${loginStyles.roleButton}
              ${userRole === "owner" ? loginStyles.roleActive : loginStyles.roleInactive}
            `}
          >
            <span>🏢</span>
            <span>Dono / Gestor</span>
          </button>

          <button
            type="button"
            onClick={() => setUserRole("barber")}
            className={`
              ${loginStyles.roleButton}
              ${userRole === "barber" ? loginStyles.roleActive : loginStyles.roleInactive}
            `}
          >
            <span>💈</span>
            <span>Barbeiro / Equipe</span>
          </button>
        </div>

        {/* 2. CARD PRINCIPAL DE LOGIN COM LOGO CENTRALIZADO */}
        <div className={loginStyles.cardForm}>
          {/* Cabeçalho Interno Centralizado */}
          <div className={loginStyles.cardHeaderCentered}>
            <Logo size="sm" symbolOnly={true} />
            <h2 className={loginStyles.formTitle}>
              {userRole === "owner"
                ? "Painel de Gestão da Barbearia"
                : "Acesso do Profissional"}
            </h2>
            <p className={loginStyles.formSubtitle}>
              {userRole === "owner"
                ? "Entre para gerenciar faturamento, equipe e clientes."
                : "Acesse sua agenda de hoje, clientes marcados e comissões."}
            </p>
          </div>

          {/* Alerta de Erro de Autenticação */}
          {authError && (
            <Alert variant="error" title="Falha no Login">
              {authError}
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
                title={showPassword ? "Ocultar senha" : "Ver senha"}
                tabIndex={-1}
              >
                {showPassword ? "👁️🗨️" : "👁️"}
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
                  setForgotStep("email");
                  setIsForgotModalOpen(true);
                }}
                className={loginStyles.forgotPasswordLink}
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Botão de Entrar Conectado ao isLoading */}
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full text-xs py-2.5 font-bold shadow-lg"
            >
              Entrar na Plataforma →
            </Button>
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
                ← Voltar
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
              {forgotError}
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
                setForgotEmail(e.target.value);
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
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
              Código de verificação enviado para{" "}
              <strong className="text-white">{forgotEmail}</strong>. Verifique
              sua caixa de entrada e spam.
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
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mx-auto">
              ✓
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
              Fazer Login Agora →
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
