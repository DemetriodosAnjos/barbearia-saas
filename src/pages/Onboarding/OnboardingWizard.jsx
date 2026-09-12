import { useState } from "react";
import { onboardingStyles } from "./Onboarding.styles";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Divider from "../../components/ui/Divider";
import Alert from "../../components/ui/Alert";

export default function OnboardingWizard({
  onCompleteOnboarding,
  onGoToLogin,
}) {
  const [currentStep, setCurrentStep] = useState(1); // 1 = Dono, 2 = Barbearia

  const [formData, setFormData] = useState({
    // Etapa 1: Dono
    ownerName: "",
    email: "",
    password: "",
    confirmPassword: "",

    // Etapa 2: Barbearia (Tenant)
    barbershopName: "",
    phone: "",
    slug: "",
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "barbershopName") {
        updated.slug = value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
      }

      return updated;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const getPasswordStrength = (pass) => {
    if (!pass)
      return {
        score: 0,
        label: "Vazia",
        color: "bg-neutral-800",
        text: "text-neutral-500",
      };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 1:
        return {
          score: 1,
          label: "Fraca",
          color: "bg-red-500",
          text: "text-red-400",
        };
      case 2:
        return {
          score: 2,
          label: "Média",
          color: "bg-amber-500",
          text: "text-amber-400",
        };
      case 3:
        return {
          score: 3,
          label: "Boa",
          color: "bg-emerald-400",
          text: "text-emerald-400",
        };
      case 4:
        return {
          score: 4,
          label: "Excelente e Segura",
          color: "bg-emerald-500",
          text: "text-emerald-400",
        };
      default:
        return {
          score: 0,
          label: "Muito Curta",
          color: "bg-neutral-800",
          text: "text-neutral-500",
        };
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const validateStep1 = () => {
    const errs = {};
    if (!formData.ownerName.trim())
      errs.ownerName = "Informe seu nome completo.";
    if (!formData.email.includes("@"))
      errs.email = "Insira um e-mail comercial válido.";
    if (formData.password.length < 8)
      errs.password = "A senha deve conter no mínimo 8 caracteres.";
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = "As senhas não coincidem.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.barbershopName.trim())
      errs.barbershopName = "Informe o nome da sua barbearia.";
    if (!formData.phone || formData.phone.length < 14) {
      errs.phone = "Informe um número de WhatsApp válido com DDD.";
    }
    if (!formData.slug) errs.slug = "O link da barbearia é obrigatório.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Finalização direto no Passo 2!
  const handleFinish = () => {
    if (!validateStep2()) return;

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      alert(
        `🎉 BEM-VINDO AO BARBERSAAS!\n\n` +
          `• Estabelecimento: ${formData.barbershopName}\n` +
          `• Link da Barbearia: app.barbersaas.com/${formData.slug}\n` +
          `• Período de Testes: 7 DIAS GRÁTIS ATIVADOS!\n\n` +
          `Acessando o painel de controle da sua barbearia agora...`,
      );

      if (onCompleteOnboarding) {
        onCompleteOnboarding({
          ...formData,
          trialDaysLeft: 7, // Inicia com 7 dias de teste!
        });
      }
    }, 1500);
  };

  return (
    <div className={onboardingStyles.pageWrapper}>
      <div className={onboardingStyles.container}>
        {/* Cabeçalho da Marca */}
        <div className={onboardingStyles.brandHeader}>
          <div className={onboardingStyles.brandLogo}>💈</div>
          <div>
            <h1 className={onboardingStyles.brandTitle}>BarberSaaS</h1>
            <p className="text-xs text-neutral-400">
              Comece seus 7 dias de teste grátis
            </p>
          </div>
        </div>

        {/* Barra de Passos (Agora com apenas 2 Etapas) */}
        <div className={onboardingStyles.stepperWrapper}>
          <div className={onboardingStyles.stepperLineBg} />
          <div
            className={onboardingStyles.stepperLineProgress}
            style={{ width: currentStep === 1 ? "0%" : "88%" }}
          />

          {/* Passo 1: Dono */}
          <div className={onboardingStyles.stepNode}>
            <div
              className={`
                ${onboardingStyles.stepCircle}
                ${currentStep === 1 ? onboardingStyles.stepActive : onboardingStyles.stepCompleted}
              `}
            >
              {currentStep > 1 ? "✓" : "1"}
            </div>
            <span className={onboardingStyles.stepLabel}>Seu Acesso</span>
          </div>

          {/* Passo 2: Barbearia */}
          <div className={onboardingStyles.stepNode}>
            <div
              className={`
                ${onboardingStyles.stepCircle}
                ${currentStep === 2 ? onboardingStyles.stepActive : onboardingStyles.stepPending}
              `}
            >
              2
            </div>
            <span className={onboardingStyles.stepLabel}>Sua Barbearia</span>
          </div>
        </div>

        {/* CARD DO FORMULÁRIO */}
        <div className={onboardingStyles.cardForm}>
          {/* ETAPA 1: ACESSO DO DONO */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className={onboardingStyles.formHeader}>
                <h2 className={onboardingStyles.formTitle}>
                  Crie sua conta de administrador
                </h2>
                <p className={onboardingStyles.formSubtitle}>
                  Sem compromisso. Você terá 7 dias para testar todas as
                  funcionalidades.
                </p>
              </div>

              {/* Botão Google */}
              <button
                type="button"
                onClick={() => alert("Simulação de Cadastro com Google OAuth!")}
                className={onboardingStyles.googleButton}
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
                <span>Cadastrar com o Google</span>
              </button>

              <Divider label="ou com seu e-mail" />

              <Input
                label="Seu Nome Completo"
                placeholder="Ex: Carlos Eduardo Santos"
                value={formData.ownerName}
                onChange={(e) => updateField("ownerName", e.target.value)}
                error={errors.ownerName}
              />

              <Input
                label="E-mail de Acesso (Login)"
                type="email"
                placeholder="carlos@suabarbearia.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                error={errors.email}
              />

              <div className="space-y-1.5">
                <Input
                  label="Senha de Acesso"
                  type="password"
                  placeholder="Mínimo de 8 caracteres"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  error={errors.password}
                />

                {formData.password && (
                  <div className={onboardingStyles.passwordStrengthWrapper}>
                    <div className={onboardingStyles.strengthBars}>
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`
                            ${onboardingStyles.strengthBar}
                            ${step <= passwordStrength.score ? passwordStrength.color : "bg-neutral-800"}
                          `}
                        />
                      ))}
                    </div>
                    <p
                      className={`${onboardingStyles.strengthText} ${passwordStrength.text}`}
                    >
                      Força: {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>

              <Input
                label="Confirmar Senha"
                type="password"
                placeholder="Digite a senha novamente"
                value={formData.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                error={errors.confirmPassword}
              />
            </div>
          )}

          {/* ETAPA 2: DADOS DA BARBEARIA (TENANT) */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className={onboardingStyles.formHeader}>
                <h2 className={onboardingStyles.formTitle}>
                  Identidade da sua Barbearia
                </h2>
                <p className={onboardingStyles.formSubtitle}>
                  Pronto! Falta apenas o nome do seu espaço para liberar o seu
                  acesso.
                </p>
              </div>

              <Input
                label="Nome Fantasia da Barbearia"
                placeholder="Ex: Barbearia Vintage Club"
                value={formData.barbershopName}
                onChange={(e) => updateField("barbershopName", e.target.value)}
                error={errors.barbershopName}
              />

              <Input
                label="WhatsApp Oficial da Barbearia"
                mask="phone"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                error={errors.phone}
                helperText="Usado para enviar lembretes automáticos aos clientes."
              />

              <div className="space-y-1.5 text-left">
                <label className="text-sm font-medium text-neutral-300">
                  Link Exclusivo de Agendamento (Slug Público)
                </label>
                <div className="flex items-center rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-xs text-neutral-400 font-mono">
                  <span className="text-neutral-500 shrink-0">
                    app.barbersaas.com/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                    className="bg-transparent text-amber-400 font-bold outline-none flex-1 ml-1"
                    placeholder="sua-barbearia"
                  />
                </div>
                {errors.slug && (
                  <p className="text-xs text-red-500 mt-1">⚠️ {errors.slug}</p>
                )}
              </div>

              <Alert variant="info" title="7 Dias Grátis Garantidos!">
                Nenhum cartão de crédito é exigido agora. Ao avançar, sua conta
                será criada imediatamente.
              </Alert>
            </div>
          )}

          {/* RODAPÉ: AÇÕES */}
          <div className={onboardingStyles.footerActions}>
            {currentStep === 2 ? (
              <Button
                variant="secondary"
                onClick={() => setCurrentStep(1)}
                className="text-xs py-2 px-4"
              >
                ← Voltar
              </Button>
            ) : (
              <button
                type="button"
                onClick={onGoToLogin}
                className="text-xs text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
              >
                Já tem conta? <strong>Fazer Login</strong>
              </button>
            )}

            {currentStep === 1 ? (
              <Button
                variant="primary"
                onClick={() => {
                  if (validateStep1()) setCurrentStep(2);
                }}
                className="text-xs py-2.5 px-5"
              >
                Continuar para Barbearia →
              </Button>
            ) : (
              <Button
                variant="primary"
                isLoading={isLoading}
                onClick={handleFinish}
                className="text-xs py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 font-extrabold shadow-lg"
              >
                Finalizar e Começar 7 Dias Grátis 🚀
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
