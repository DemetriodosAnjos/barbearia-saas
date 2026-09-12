import { useState } from "react";
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

  // 4. Estados da Modal de Recuperação de Senha
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Validação do Formulário de Login
  const validateForm = () => {
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
  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError("");

    if (!validateForm()) return;

    setIsLoading(true);

    // Simulação de autenticação segura
    setTimeout(() => {
      setIsLoading(false);

      // Simulação de erro caso digite uma senha errada específica para teste
      if (password === "123456") {
        setAuthError("E-mail ou senha incorretos. Verifique suas credenciais.");
        return;
      }

      // Sucesso na autenticação
      const sessionData = {
        email,
        role: userRole,
        name: userRole === "owner" ? "Carlos Silva (Dono)" : "Marcos Barbeiro",
        token: "jwt-token-simulado-xyz-123",
        rememberMe,
      };

      alert(
        `🔐 LOGIN REALIZADO COM SUCESSO!\n\n` +
          `• Usuário: ${sessionData.name}\n` +
          `• Perfil: ${userRole === "owner" ? "Proprietário / Administrador" : "Barbeiro / Colaborador"}\n` +
          `• Redirecionando para o Painel Operacional correspondente...`,
      );

      if (onLoginSuccess) {
        onLoginSuccess(sessionData);
      }
    }, 1500);
  };

  // Envio da Recuperação de Senha
  const handleSendPasswordReset = () => {
    if (!forgotEmail.includes("@")) {
      alert("Por favor, informe um e-mail válido para recuperação.");
      return;
    }

    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSuccess(true);
    }, 1500);
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

        {/* 2. CARD PRINCIPAL DE LOGIN COM LOGO 32x32px CENTRALIZADO */}
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

          {/* Botão de Acesso Rápido com Google */}
          <button
            type="button"
            onClick={() => alert("Simulação de Login Rápido com Google!")}
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
                if (errors.email)
                  setErrors((prev) => ({ ...prev, email: null }));
              }}
              error={errors.email}
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
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: null }));
                }}
                error={errors.password}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={loginStyles.togglePasswordBtn}
                title={showPassword ? "Ocultar senha" : "Ver senha"}
                tabIndex={-1}
              >
                {showPassword ? "👁️‍🗨️" : "👁️"}
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

              <button
                type="button"
                onClick={() => {
                  setIsForgotModalOpen(true);
                  setForgotSuccess(false);
                }}
                className={loginStyles.forgotPasswordLink}
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Botão de Entrar */}
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
          Sua barbearia ainda não usa o sistema?
          <span onClick={onGoToSignup} className={loginStyles.signupHighlight}>
            Criar conta grátis
          </span>
        </p>
      </div>

      {/* ======================================================== */}
      {/* MODAL DE RECUPERAÇÃO DE SENHA */}
      {/* ======================================================== */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Recuperação de Senha"
        footer={
          !forgotSuccess && (
            <>
              <Button
                variant="secondary"
                onClick={() => setIsForgotModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                isLoading={forgotLoading}
                onClick={handleSendPasswordReset}
              >
                Enviar Link de Redefinição
              </Button>
            </>
          )
        }
      >
        {forgotSuccess ? (
          <div className="space-y-4 text-center py-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mx-auto">
              ✓
            </div>
            <h4 className="text-sm font-bold text-white">
              E-mail de recuperação enviado!
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Enviamos as instruções e o link seguro para redefinir sua senha
              para <strong className="text-white">{forgotEmail}</strong>.
              Verifique sua caixa de entrada e a pasta de spam.
            </p>
            <Button
              variant="primary"
              className="w-full mt-2"
              onClick={() => setIsForgotModalOpen(false)}
            >
              Voltar ao Login
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-left">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Informe o e-mail cadastrado na sua barbearia. Enviaremos um link
              temporário para você criar uma nova senha.
            </p>
            <Input
              label="E-mail Cadastrado"
              type="email"
              placeholder="seuemail@barbearia.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
