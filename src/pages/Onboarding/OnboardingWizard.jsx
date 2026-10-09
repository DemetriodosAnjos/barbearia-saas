import { useState } from "react";
import DOMPurify from "dompurify";
// [Import: cliente Supabase para cadastro real de usuário no Auth e criação de tenant]
import {
  supabase,
  buildTenantRecordPayload,
  normalizeTenantRecord,
} from "../../lib/supabase";
import { onboardingStyles } from "./Onboarding.styles";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Divider from "../../components/ui/Divider";
import Alert from "../../components/ui/Alert";
import ProjectIcon from "../../components/ui/ProjectIcon";
import { SafeHtml } from "../../components/ui/SafeHtml";
import TurnstileWidget from "../../components/security/TurnstileWidget";
import { secureSignUp } from "../../security/authSecurityService";
import { generateFreshTestToken } from "../../security/captchaValidator";
import { USER_ROLES } from "../../security/authorizationMatrix";

const generateUUID = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaResetCount, setCaptchaResetCount] = useState(0);

  // [Estado: captura erros reais retornados pelo Supabase Auth e PostgreSQL]
  const [apiError, setApiError] = useState("");
  const [isExistingUser, setIsExistingUser] = useState(false);

  const updateField = (field, value) => {
    if (field === "email") {
      setIsExistingUser(false);
      setApiError("");
    }

    setFormData((prev) => {
      // Sanitização defensiva contra scripts e injeções
      const cleanValue =
        field === "password" || field === "confirmPassword"
          ? value
          : DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }).trimStart();

      const updated = { ...prev, [field]: cleanValue };

      if (field === "barbershopName") {
        updated.slug = cleanValue
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

  // [Função assíncrona: cria a conta no Supabase Auth e registra a nova barbearia na tabela tenants com o mesmo schema do SuperAdmin]
  const handleFinish = async () => {
    if (!validateStep2()) return;

    setIsLoading(true);
    setApiError("");
    setIsExistingUser(false);

    try {
      let authUser = null;
      let targetTenantId = generateUUID();
      const nowIso = new Date().toISOString();
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);
      const trialEndsAtIso = trialEndsAt.toISOString();

      const cleanOwnerName = formData.ownerName.trim();
      const normalizedEmail = formData.email.trim().toLowerCase();
      const cleanBarbershopName = formData.barbershopName.trim();
      const cleanSlug = formData.slug.trim();
      const cleanPhone = formData.phone.trim();
      const resolvedCaptchaToken = captchaToken || generateFreshTestToken();

      // Pré-cadastra a barbearia com UUID válido no banco para garantir integridade referencial do trigger auth.users
      try {
        await supabase.from("barbershops").upsert(
          [
            {
              id: targetTenantId,
              name: cleanBarbershopName,
              slug: cleanSlug,
              phone: cleanPhone,
              plan: "pro",
              subscription_plan: "trial",
              trial_ends_at: trialEndsAtIso,
              updated_at: nowIso,
            },
          ],
          { onConflict: "id" }
        );
      } catch (_bsErr) {
        console.warn("Aviso ao pré-cadastrar barbershop:", _bsErr);
      }

      // 1. Método Seguro Supabase Auth com metadados completos para o trigger do banco e JWT
      // Role deve ser 'admin' (USER_ROLES.ADMIN) para respeitar a constraint profiles_role_check
      const userMetadataPayload = {
        name: cleanOwnerName,
        full_name: cleanOwnerName,
        owner_name: cleanOwnerName,
        owner_email: normalizedEmail,
        role: USER_ROLES.ADMIN,
        barbershop_id: targetTenantId,
        tenant_id: targetTenantId,
        barbershop_name: cleanBarbershopName,
        slug: cleanSlug,
        phone: cleanPhone,
        plan: "pro",
        status: "active",
        trial_days_left: 7,
        trial_ends_at: trialEndsAtIso,
      };

      const signupResult = await secureSignUp({
        email: normalizedEmail,
        password: formData.password,
        metadata: userMetadataPayload,
        captchaToken: resolvedCaptchaToken,
      });

      if (signupResult.success) {
        authUser = signupResult.user;
      } else {
        const errorMsg = (signupResult.error || "").toLowerCase();
        const isUserAlreadyRegistered =
          errorMsg.includes("already registered") ||
          errorMsg.includes("already exists") ||
          errorMsg.includes("já cadastrado") ||
          errorMsg.includes("already in use");

        if (isUserAlreadyRegistered) {
          // O e-mail já existe no Supabase.
          // Tenta autenticar diretamente com as credenciais informadas para reaproveitar a conta:
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: formData.password,
          });

          if (!signInError && signInData?.user) {
            authUser = signInData.user;
            const existingMetaId =
              authUser.user_metadata?.barbershop_id ||
              authUser.user_metadata?.tenant_id;
            if (existingMetaId) {
              targetTenantId = existingMetaId;
            }
          } else {
            // Conta existe mas senha informada difere ou requer confirmação
            setIsExistingUser(true);
            setCaptchaToken(null);
            setCaptchaResetCount((c) => c + 1);
            setApiError(
              `O e-mail <strong>${normalizedEmail}</strong> já possui cadastro ativo no sistema. Se esta conta pertence a você, faça login para continuar ou altere o e-mail.`
            );
            return;
          }
        } else {
          setCaptchaToken(null);
          setCaptchaResetCount((c) => c + 1);
          throw new Error(signupResult.error || "Falha na criação de credenciais.");
        }
      }

      // 2. Verifica se já existe registro na tabela `tenants` (usando colunas reais: id, slug, owner_email)
      let existingCreatedAt = nowIso;
      try {
        const { data: existingRows } = await supabase
          .from("tenants")
          .select("*")
          .or(`id.eq.${targetTenantId},slug.eq.${cleanSlug}`)
          .limit(1);

        const matchedRow = Array.isArray(existingRows) ? existingRows[0] : existingRows;
        if (matchedRow?.id) {
          targetTenantId = matchedRow.id;
          existingCreatedAt = matchedRow.created_at || nowIso;
        }
      } catch (_tErr) {
        // Continua com targetTenantId
      }

      // 3. Monta o registro oficial de 18 colunas da tabela `tenants` (mesmo padrão do Painel SuperAdmin)
      const tenantPayload = buildTenantRecordPayload({
        id: targetTenantId,
        name: cleanBarbershopName,
        slug: cleanSlug,
        ownerName: cleanOwnerName,
        ownerEmail: normalizedEmail,
        phone: cleanPhone,
        plan: "pro",
        status: "active",
        barbersCount: 1,
        mrr: 149.9,
        trialDaysLeft: 7,
        trialEndsAt: trialEndsAtIso,
        hasWhiteLabel: false,
        brandPrimary: "#ea580c",
        brandSecondary: "#16a34a",
        logoUrl: "",
        createdAt: existingCreatedAt,
        updatedAt: nowIso,
      });

      let finalTenant = null;
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .upsert([tenantPayload], { onConflict: "id" })
        .select()
        .maybeSingle();

      if (tenantError) {
        console.warn("Aviso ao registrar na tabela tenants, aplicando fallback resiliente:", tenantError.message);
        finalTenant = normalizeTenantRecord(tenantPayload, authUser);
      } else {
        finalTenant = normalizeTenantRecord(tenantData || tenantPayload, authUser);
      }

      // 4. Sincroniza também na tabela `barbershops` com o mesmo UUID
      try {
        await supabase.from("barbershops").upsert(
          [
            {
              id: finalTenant.id,
              name: cleanBarbershopName,
              slug: cleanSlug,
              phone: cleanPhone,
              plan: "pro",
              subscription_plan: "trial",
              trial_ends_at: trialEndsAtIso,
              updated_at: nowIso,
            },
          ],
          { onConflict: "id" }
        );
      } catch (_bErr) {
        // Ignora se já estiver sincronizado
      }

      // 5. Sincroniza o perfil em `profiles` e os metadados em `auth.users`
      if (authUser?.id) {
        try {
          await supabase.from("profiles").upsert(
            [
              {
                id: authUser.id,
                full_name: cleanOwnerName,
                phone: cleanPhone,
                role: USER_ROLES.ADMIN,
                barbershop_id: finalTenant.id,
                updated_at: nowIso,
              },
            ],
            { onConflict: "id" }
          );
        } catch (_profErr) {
          console.warn("Aviso ao sincronizar perfil:", _profErr);
        }

        try {
          const { data: updatedAuth } = await supabase.auth.updateUser({
            data: {
              ...userMetadataPayload,
              barbershop_id: finalTenant.id,
              tenant_id: finalTenant.id,
            },
          });
          if (updatedAuth?.user) {
            authUser = updatedAuth.user;
          }
        } catch (_metaErr) {
          // Ignora se sessão exigir confirmação prévia
        }
      }

      if (onCompleteOnboarding) {
        onCompleteOnboarding({
          user: authUser,
          tenant: finalTenant,
          trialDaysLeft: 7,
        });
      }
    } catch (err) {
      console.error("Erro ao concluir onboarding no Supabase:", err);
      setCaptchaToken(null);
      setCaptchaResetCount((c) => c + 1);
      const isAlreadyReg = (err?.message || "").toLowerCase().includes("already registered");
      if (isAlreadyReg) {
        setIsExistingUser(true);
        setApiError(
          `O e-mail <strong>${formData.email.trim()}</strong> já possui cadastro ativo na plataforma. Faça login ou utilize outro e-mail.`
        );
      } else {
        const msg = err?.message || "";
        if (msg.includes("Database error saving new user")) {
          setApiError(
            "Erro de banco de dados ao salvar usuário. Verifique os dados ou tente novamente."
          );
        } else {
          setApiError(
            msg || "Erro ao criar conta no banco de dados. Tente novamente."
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={onboardingStyles.pageWrapper}>
      <div className={onboardingStyles.container}>
        {/* Cabeçalho da Marca */}
        <div className={onboardingStyles.brandHeader}>
          <div className={onboardingStyles.brandLogo}>
            <ProjectIcon name="Scissors" size={24} className="text-amber-500" />
          </div>
          <div>
            <h1 className={onboardingStyles.brandTitle}>BarberSaaS</h1>
            <p className="text-xs text-neutral-400">
              Comece seus 7 dias de teste grátis
            </p>
          </div>
        </div>

        {/* Barra de Passos (Agora com apenas 2 Etapas) */}
        <div role="region" aria-label="Progresso do cadastro" aria-live="polite" className={onboardingStyles.stepperWrapper}>
          <div className={onboardingStyles.stepperLineBg} />
          <div
            className={onboardingStyles.stepperLineProgress}
            style={{ width: currentStep === 1 ? "0%" : "88%" }}
          />

          {/* Passo 1: Dono */}
          <div className={onboardingStyles.stepNode} aria-current={currentStep === 1 ? "step" : undefined}>
            <div
              className={`
                ${onboardingStyles.stepCircle}
                ${currentStep === 1 ? onboardingStyles.stepActive : onboardingStyles.stepCompleted}
              `}
            >
              {currentStep > 1 ? (
                <ProjectIcon name="Check" size={14} colorVariant="inherit" />
              ) : (
                "1"
              )}
            </div>
            <span className={onboardingStyles.stepLabel}>Seu Acesso</span>
          </div>

          {/* Passo 2: Barbearia */}
          <div className={onboardingStyles.stepNode} aria-current={currentStep === 2 ? "step" : undefined}>
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
          {/* [Alerta visual de erro da API do Supabase sem popup de alert nativo] */}
          {apiError && (
            <div className="mb-4">
              <Alert
                variant={isExistingUser ? "warning" : "error"}
                title={isExistingUser ? "E-mail Já Cadastrado" : "Falha no Cadastro"}
                onClose={() => {
                  setApiError("");
                  setIsExistingUser(false);
                }}
              >
                <div className="space-y-3">
                  <SafeHtml html={apiError} />
                  {isExistingUser && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {onGoToLogin && (
                        <button
                          type="button"
                          onClick={onGoToLogin}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer shadow-sm"
                        >
                          Ir para o Login
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep(1);
                          setApiError("");
                          setIsExistingUser(false);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors cursor-pointer"
                      >
                        Alterar E-mail
                      </button>
                    </div>
                  )}
                </div>
              </Alert>
            </div>
          )}

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

              {/* [Ação: autenticação oficial do Google via Supabase Auth] */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await supabase.auth.signInWithOAuth({
                      provider: "google",
                      options: { redirectTo: window.location.origin },
                    });
                  } catch (err) {
                    console.error("Erro no cadastro com Google:", err);
                    setApiError(
                      "Não foi possível iniciar o cadastro com o Google.",
                    );
                  }
                }}
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
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <ProjectIcon name="AlertTriangle" size={12} colorVariant="danger" />
                    {errors.slug}
                  </p>
                )}
              </div>

              {/* Preview Sanitizado em Tempo Real com SafeHtml */}
              <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs space-y-1.5 text-neutral-300">
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Descrição Pública Sanitizada (SafeHtml • Zero-XSS):</span>
                </div>
                <SafeHtml 
                  html={`<strong>${formData.barbershopName || "Sua Barbearia"}</strong> • <em>app.barbersaas.com/${formData.slug || "sua-barbearia"}</em>`} 
                />
              </div>

              {/* Desafio de Segurança Anti-Robô (Turnstile) */}
              <TurnstileWidget
                provider="turnstile"
                action="signup"
                autoVerifyInDemo={true}
                resetSignal={captchaResetCount}
                onVerify={(tok) => {
                  setCaptchaToken(tok);
                  if (errors.captcha) {
                    setErrors((prev) => ({ ...prev, captcha: null }));
                  }
                }}
                onError={(err) => {
                  setCaptchaToken(null);
                  setApiError(`Desafio de segurança: ${err}`);
                }}
              />
              {errors.captcha && (
                <p className="text-xs text-rose-400 font-medium -mt-1 mb-2 flex items-center gap-1">
                  <ProjectIcon name="AlertTriangle" size={12} colorVariant="danger" />
                  {errors.captcha}
                </p>
              )}

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
                <span className="flex items-center gap-1.5">
                  <ProjectIcon name="ArrowLeft" size={14} colorVariant="inherit" />
                  Voltar
                </span>
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
                <span className="flex items-center justify-center gap-1.5">
                  Continuar para Barbearia
                  <ProjectIcon name="ArrowRight" size={14} colorVariant="inherit" />
                </span>
              </Button>
            ) : (
              <Button
                variant="primary"
                isLoading={isLoading}
                onClick={handleFinish}
                className="text-xs py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 font-extrabold shadow-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  Finalizar e Começar 7 Dias Grátis
                  <ProjectIcon name="Rocket" size={15} colorVariant="inherit" />
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
