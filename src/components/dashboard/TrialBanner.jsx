import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Clock,
  Check,
  Star,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Lock,
  Sparkles,
} from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Alert from "../ui/Alert";
import Spinner from "../ui/Spinner";
import { supabase } from "../../lib/supabase";
import { INITIAL_PLANS } from "../../pages/SuperAdmin/SuperAdminMockNuank";
import {
  createPreferenceEndpoint,
  checkPaymentEndpoint,
} from "../../api/mercadoPagoEndpoints";

/**
 * Determina se o tenant está no plano Trial gratuito ou se já migrou para um plano pago.
 * Usuários em planos pagos (Starter, Pro, Enterprise) retornam false.
 */
export function isTenantTrial(tenant) {
  if (!tenant) return false;

  const planCandidate = String(tenant.plan || "").toLowerCase().trim();
  const subPlanCandidate = String(tenant.subscription_plan || "").toLowerCase().trim();
  const statusCandidate = String(tenant.status || "").toLowerCase().trim();
  const paymentStatusCandidate = String(tenant.payment_status || tenant.paymentStatus || "").toLowerCase().trim();

  // 1. Prioridade absoluta: Se for explicitamente trial ou plano de teste
  if (
    statusCandidate === "trial" ||
    planCandidate === "trial" ||
    planCandidate.includes("teste") ||
    subPlanCandidate === "trial" ||
    subPlanCandidate.includes("teste") ||
    paymentStatusCandidate === "trial"
  ) {
    return true;
  }

  // 2. Se o plano for starter, pro ou enterprise (ou solo, franquia) -> É PLANO PAGO ATIVO!
  if (
    planCandidate.includes("starter") ||
    planCandidate.includes("pro") ||
    planCandidate.includes("enterprise") ||
    planCandidate.includes("entreprise") ||
    planCandidate.includes("solo") ||
    planCandidate.includes("franquia") ||
    subPlanCandidate.includes("starter") ||
    subPlanCandidate.includes("pro") ||
    subPlanCandidate.includes("enterprise") ||
    subPlanCandidate.includes("entreprise") ||
    subPlanCandidate.includes("solo") ||
    subPlanCandidate.includes("franquia")
  ) {
    return false;
  }

  // 3. Se o status for ativo e não houver sinal de trial -> não é trial
  if (statusCandidate === "active") {
    return false;
  }

  return false;
}

export default function TrialBanner({
  trialDaysLeft,
  onSubscribePlan,
  isPlansModalOpen,
  setIsPlansModalOpen,
  plans: propPlans,
  tenant,
  user,
}) {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen =
    isPlansModalOpen !== undefined ? isPlansModalOpen : internalModalOpen;
  const setIsModalOpen = setIsPlansModalOpen || setInternalModalOpen;

  const [plans, setPlans] = useState(() =>
    Array.isArray(propPlans) && propPlans.length > 0 ? propPlans : INITIAL_PLANS
  );
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  // Links de pagamento gerados dinamicamente via API Mercado Pago (cache por id do plano)
  const [mpCheckoutUrls, setMpCheckoutUrls] = useState({});
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [isProceedingPayment, setIsProceedingPayment] = useState(false);

  // Estados do Modal de Redirecionamento e Confirmação de Pagamento
  const [isRedirectModalOpen, setIsRedirectModalOpen] = useState(false);
  const [redirectInfo, setRedirectInfo] = useState({
    planName: "",
    formattedPlanName: "",
    link: "",
    plan: null,
    externalReference: "",
  });
  const [paymentStatus, setPaymentStatus] = useState("waiting"); // "waiting" | "approved"
  const [isVerifying, setIsVerifying] = useState(false);
  const [approvedPlanTitle, setApprovedPlanTitle] = useState("");

  // Condição estrita de negócio: exibe a barra no topo apenas quando a barbearia estiver no modo TRIAL
  const isCurrentTrial = isTenantTrial(tenant);
  const showBanner = isCurrentTrial && trialDaysLeft !== undefined && trialDaysLeft !== null;
  const isExpired = isCurrentTrial && typeof trialDaysLeft === "number" ? trialDaysLeft <= 0 : false;

  // Busca dinâmica dos planos sincronizados com "Planos e Preços" do SuperAdmin
  useEffect(() => {
    let isMounted = true;

    async function fetchDynamicPlans() {
      if (Array.isArray(propPlans) && propPlans.length > 0) {
        setPlans(propPlans);
        return;
      }

      try {
        setIsLoadingPlans(true);
        const { data, error } = await supabase
          .from("plans")
          .select("*")
          .order("price", { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          if (isMounted) {
            const mapped = data.map((p) => {
              const rawName = String(p.name || "");
              let normalizedName = rawName;
              if (rawName.toLowerCase() === "enterprise") {
                normalizedName = "Entreprise";
              }

              return {
                id: p.id,
                name: normalizedName,
                price: Number(p.price || 0),
                maxBarbers: Number(p.max_barbers || 1),
                extraBarberPrice: Number(p.extra_barber_price || 0),
                tag: p.tag || "",
                active: p.active !== false,
                isTrial:
                  p.id === "trial" ||
                  p.id === "plano-de-teste" ||
                  rawName.toLowerCase().includes("teste"),
                checkoutUrl:
                  p.mercado_pago_checkout_url ||
                  p.nubank_payment_link ||
                  `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_${p.id}`,
                features: Array.isArray(p.features) ? p.features : [],
              };
            });
            // Garante que o Plano de Teste (Trial) esteja disponível na coleção de planos
            const hasTrialInDb = mapped.some(
              (p) =>
                p.isTrial ||
                p.id === "trial" ||
                String(p.name || "").toLowerCase().includes("teste")
            );
            const fullPlans = !hasTrialInDb ? [INITIAL_PLANS[0], ...mapped] : mapped;
            setPlans(fullPlans);
          }
        } else if (isMounted) {
          setPlans(INITIAL_PLANS);
        }
      } catch (err) {
        console.warn("Erro ao buscar planos dinâmicos no Supabase:", err);
        if (isMounted) {
          setPlans(INITIAL_PLANS);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPlans(false);
        }
      }
    }

    fetchDynamicPlans();

    return () => {
      isMounted = false;
    };
  }, [isModalOpen, propPlans]);

  // Ordena os planos:
  // Se a barbearia estiver no plano Trial (isCurrentTrial), retorna o card Trial ativado com a tag "Seu Plano Atual".
  // Se o usuário já possuir plano pago ativo (!isCurrentTrial), oculta o plano Trial da grade.
  const displayPlans = useMemo(() => {
    const active = plans.filter((p) => p.active !== false);
    const baseList = active.length > 0 ? active : plans;

    const getRank = (p) => {
      const id = String(p.id || "").toLowerCase();
      const name = String(p.name || "").toLowerCase();
      if (id.includes("teste") || id.includes("trial") || name.includes("teste")) return 1;
      if (id.includes("starter") || name.includes("starter") || name.includes("solo")) return 2;
      if (id.includes("pro") || name.includes("pro")) return 3;
      if (id.includes("enterprise") || id.includes("entreprise") || name.includes("enterprise") || name.includes("entreprise")) return 4;
      return 5;
    };

    const sorted = [...baseList].sort((a, b) => getRank(a) - getRank(b));

    // Apenas oculta o Trial se a barbearia já possuir um plano pago ativo (!isCurrentTrial).
    // Quando em período de testes (isCurrentTrial), o Plano de Teste é mantido na grade com status ativo.
    if (!isCurrentTrial) {
      return sorted.filter(
        (p) =>
          !p.isTrial &&
          p.id !== "trial" &&
          p.id !== "plano-de-teste" &&
          !String(p.name || "").toLowerCase().includes("teste")
      );
    }

    return sorted;
  }, [plans, isCurrentTrial]);

  // Seleciona automaticamente o plano em destaque ou o primeiro da lista
  useEffect(() => {
    if (displayPlans.length > 0) {
      const alreadySelected = displayPlans.some((p) => p.id === selectedPlan);
      if (!alreadySelected) {
        const preferred =
          displayPlans.find((p) =>
            (p.tag || "").toLowerCase().includes("popular") ||
            (p.tag || "").toLowerCase().includes("escolhido")
          ) || displayPlans[0];
        if (preferred) setSelectedPlan(preferred.id);
      }
    }
  }, [displayPlans, selectedPlan]);

  // Função centralizada para consultar a API oficial do Mercado Pago e gerar a preferência
  const generateMercadoPagoLink = async (plan) => {
    if (!plan) return null;

    // Se já tiver no cache, reutiliza imediatamente
    if (mpCheckoutUrls[plan.id]) {
      return mpCheckoutUrls[plan.id];
    }

    // Se for plano gratuito (R$ 0,00), ativação direta sem gateway
    if (Number(plan.price) <= 0) {
      return null;
    }

    setLoadingPlanId(plan.id);
    try {
      const res = await createPreferenceEndpoint({
        planId: String(plan.id),
        planName: String(plan.name),
        price: Number(plan.price),
        tenantId: tenant?.id || "a0000000-0000-0000-0000-000000000001",
        tenantName: tenant?.name || "Minha Barbearia",
        payerEmail: user?.email || tenant?.ownerEmail || "gestor@barbearia.com.br",
        payerName: tenant?.ownerName || user?.user_metadata?.full_name || "Gestor da Barbearia",
        payerPhone: tenant?.ownerPhone || tenant?.phone || "11999998888",
        billingPeriod: "monthly",
      });

      if (res.success && res.data?.initPoint) {
        const generatedLink = res.data.initPoint;
        const extRef =
          res.data.externalReference ||
          `${tenant?.id || "a0000000-0000-0000-0000-000000000001"}:${plan.id}:${Date.now()}`;
        const resultObj = { link: generatedLink, externalReference: extRef };
        setMpCheckoutUrls((prev) => ({
          ...prev,
          [plan.id]: resultObj,
        }));
        return resultObj;
      }
    } catch (err) {
      console.warn("[MercadoPago API] Falha na criação da preferência:", err);
    } finally {
      setLoadingPlanId(null);
    }

    // Fallback de contingência
    const fallback =
      plan.checkoutUrl ||
      plan.mercadoPagoCheckoutUrl ||
      plan.nubank_payment_link ||
      `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_${plan.id}`;

    const fallbackObj = {
      link: fallback,
      externalReference: `${tenant?.id || "a0000000-0000-0000-0000-000000000001"}:${plan.id}:${Date.now()}`,
    };

    setMpCheckoutUrls((prev) => ({
      ...prev,
      [plan.id]: fallbackObj,
    }));
    return fallbackObj;
  };

  // Pré-carrega o link da API do Mercado Pago para o plano selecionado assim que o modal abre
  useEffect(() => {
    if (isModalOpen && selectedPlan) {
      const target = displayPlans.find((p) => p.id === selectedPlan);
      if (target && Number(target.price) > 0 && !mpCheckoutUrls[target.id]) {
        generateMercadoPagoLink(target);
      }
    }
  }, [isModalOpen, selectedPlan, displayPlans]);
  // Se não houver banners nem modais ativos, os elementos renderizam fragmentos vazios no JSX final sem quebrar as regras de Hooks do React

  const handleSelectPlan = (planKey) => {
    const plan = displayPlans.find((p) => p.id === planKey);
    const isPlanTrial =
      plan?.isTrial ||
      plan?.id === "trial" ||
      plan?.id === "plano-de-teste" ||
      String(plan?.name || "").toLowerCase().includes("teste");

    if (isPlanTrial && !isCurrentTrial) {
      setErrorMessage(
        "Sua barbearia já possui um plano pago ativo (" +
          (tenant?.subscription_plan || tenant?.plan || "Starter") +
          "). O retorno ao Plano de Teste é restrito e só pode ser ativado pelo SuperAdmin oficial (atendmentor@gmail.com)."
      );
      return;
    }

    setSelectedPlan(planKey);
    setErrorMessage("");
    if (plan && Number(plan.price) > 0) {
      generateMercadoPagoLink(plan);
    }
  };

  // Ação ao clicar no botão individual de cada card de plano
  const handleCardButtonClick = async (plan, e) => {
    if (e) e.stopPropagation();
    const isPlanTrial =
      plan?.isTrial ||
      plan?.id === "trial" ||
      plan?.id === "plano-de-teste" ||
      String(plan?.name || "").toLowerCase().includes("teste");

    if (isPlanTrial && !isCurrentTrial) {
      setErrorMessage(
        "Sua barbearia já possui um plano pago ativo (" +
          (tenant?.subscription_plan || tenant?.plan || "Starter") +
          "). O retorno ao Plano de Teste é restrito e só pode ser ativado pelo SuperAdmin oficial (atendmentor@gmail.com)."
      );
      return;
    }

    handleSelectPlan(plan.id);

    // Se já estiver selecionado ou for clicado para pagar diretamente
    if (Number(plan.price) > 0) {
      await generateMercadoPagoLink(plan);
    }
  };

  // BOTÃO: Continuar para pagamento seguro
  const handleProceedToPayment = async () => {
    const chosenPlan = displayPlans.find((p) => p.id === selectedPlan) || displayPlans[0];

    if (!chosenPlan) {
      setErrorMessage(
        "Por favor, selecione um dos planos acima para prosseguir para o pagamento."
      );
      return;
    }

    // Caso o plano seja 100% gratuito (R$ 0,00)
    if (Number(chosenPlan.price) <= 0) {
      if (!isCurrentTrial) {
        setErrorMessage(
          "Sua barbearia já possui um plano contratado ativo. O retorno ao período de teste só pode ser autorizado pelo SuperAdmin oficial (atendmentor@gmail.com)."
        );
        return;
      }

      setSuccessNotice("Plano de Teste ativado com sucesso! Aproveite seus 7 dias de avaliação gratuita.");
      if (onSubscribePlan) {
        onSubscribePlan(chosenPlan.id, "", chosenPlan);
      }
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessNotice("");
      }, 1600);
      return;
    }

    setIsProceedingPayment(true);
    setErrorMessage("");

    // Abre uma janela antecipada no clique direto do usuário para evitar bloqueio de popups
    let paymentWindow = null;
    try {
      if (typeof window !== "undefined") {
        paymentWindow = window.open("about:blank", "_blank");
      }
    } catch {
      // Ignora se o navegador bloquear popups
    }

    try {
      const chosenRes = await generateMercadoPagoLink(chosenPlan);
      const chosenLink =
        typeof chosenRes === "string"
          ? chosenRes
          : chosenRes?.link || "";
      const extRef =
        typeof chosenRes === "object" && chosenRes?.externalReference
          ? chosenRes.externalReference
          : `${tenant?.id || "a0000000-0000-0000-0000-000000000001"}:${chosenPlan.id}:${Date.now()}`;

      const formattedPrice = Number(chosenPlan.price || 0)
        .toFixed(2)
        .replace(".", ",");
      const chosenPlanName = `${chosenPlan.name} (R$ ${formattedPrice}/mês)`;

      // Abre o checkout oficial do Mercado Pago na aba recém-criada
      if (paymentWindow && chosenLink) {
        paymentWindow.location.href = chosenLink;
      } else if (chosenLink && typeof window !== "undefined") {
        window.open(chosenLink, "_blank");
      }

      // Fecha o modal de seleção de planos
      setIsModalOpen(false);

      // Abre o modal no estado "Aguardando Pagamento"
      setRedirectInfo({
        planName: chosenPlan.name,
        formattedPlanName: chosenPlanName,
        link: chosenLink,
        plan: chosenPlan,
        externalReference: extRef,
        checkoutTimestamp: Date.now(),
      });
      setPaymentStatus("waiting");
      setApprovedPlanTitle("");
      setIsRedirectModalOpen(true);
    } catch (err) {
      if (paymentWindow) {
        try { paymentWindow.close(); } catch {}
      }
      console.error("[MercadoPago Checkout] Falha:", err);
      setErrorMessage("Erro ao conectar com a API do Mercado Pago. Tente novamente.");
    } finally {
      setIsProceedingPayment(false);
    }
  };

  // Monitoramento ativo e polling do status do pagamento enquanto o modal estiver aberto
  useEffect(() => {
    // Captura retorno automático do Checkout Pro (auto_return / back_urls)
    if (typeof window !== "undefined" && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const mpStatus = params.get("mp_status") || params.get("status") || params.get("collection_status");
      const extRef = params.get("external_reference") || "";
      const paymentId = params.get("payment_id") || params.get("collection_id") || "";

      if (mpStatus === "success" || mpStatus === "approved") {
        try {
          window.localStorage.setItem(
            "mp_payment_approved_signal",
            JSON.stringify({
              approved: true,
              externalReference: extRef,
              paymentId,
              timestamp: Date.now(),
            })
          );
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (!isRedirectModalOpen || paymentStatus === "approved") return;

    let isMounted = true;
    const targetTenantId = tenant?.id || "a0000000-0000-0000-0000-000000000001";
    const targetPlan = redirectInfo.plan;
    const targetExtRef = redirectInfo.externalReference || "";
    const checkoutTime = redirectInfo.checkoutTimestamp || Date.now();

    const confirmApprovedPlan = (activePlanName) => {
      if (!isMounted) return;
      const resolvedTitle = activePlanName || targetPlan?.name || "Plano Ativo";
      setPaymentStatus("approved");
      setApprovedPlanTitle(resolvedTitle);

      if (onSubscribePlan) {
        onSubscribePlan(targetPlan?.id, redirectInfo.link, {
          ...targetPlan,
          name: resolvedTitle,
        });
      }

      setTimeout(() => {
        if (isMounted) {
          setIsRedirectModalOpen(false);
        }
      }, 3000);
    };

    const handleStorageSignal = (event) => {
      if (event.key === "mp_payment_approved_signal" && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed?.approved) {
            confirmApprovedPlan(targetPlan?.name || redirectInfo.planName);
          }
        } catch {}
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageSignal);
    }

    async function checkApproval() {
      try {
        // Consulta diretamente a API oficial do Mercado Pago via service (sem erro 404 GET em hosts estáticos)
        const data = await checkPaymentEndpoint({
          tenantId: targetTenantId,
          planId: targetPlan?.id || "",
          planName: targetPlan?.name || redirectInfo.planName || "",
          externalReference: targetExtRef,
          checkoutTime,
        });

        if (data && data.approved) {
          confirmApprovedPlan(data.planName || targetPlan?.name || "Plano Ativo");
          return true;
        }
      } catch (err) {
        console.warn("Aviso na checagem de pagamento:", err);
      }
      return false;
    }

    // Executa primeira checagem imediata e mantém polling a cada 3 segundos
    checkApproval();
    const interval = setInterval(async () => {
      const isApproved = await checkApproval();
      if (isApproved) {
        clearInterval(interval);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageSignal);
      }
    };
  }, [isRedirectModalOpen, paymentStatus, redirectInfo, tenant?.id, onSubscribePlan]);

  // Checagem manual disparada pelo botão do usuário
  const handleManualCheckPayment = async () => {
    setIsVerifying(true);
    const targetTenantId = tenant?.id || "a0000000-0000-0000-0000-000000000001";
    const targetPlan = redirectInfo.plan;
    const targetExtRef = redirectInfo.externalReference || "";
    const checkoutTime = redirectInfo.checkoutTimestamp || Date.now();

    try {
      const data = await checkPaymentEndpoint({
        tenantId: targetTenantId,
        planId: targetPlan?.id || "",
        planName: targetPlan?.name || redirectInfo.planName || "",
        externalReference: targetExtRef,
        checkoutTime,
      });

      if (data && data.approved) {
        const activePlanName = data.planName || targetPlan?.name || "Plano Ativo";
        setPaymentStatus("approved");
        setApprovedPlanTitle(activePlanName);

        if (onSubscribePlan) {
          onSubscribePlan(targetPlan?.id, redirectInfo.link, {
            ...targetPlan,
            name: activePlanName,
          });
        }

        setTimeout(() => {
          setIsRedirectModalOpen(false);
        }, 2500);
        return;
      }

      // Consulta no Supabase de contingência: só aprova se o subscription_plan corresponder ao plano escolhido
      const { data: bData } = await supabase
        .from("barbershops")
        .select("subscription_plan")
        .eq("id", targetTenantId)
        .maybeSingle();

      const chosenPlanName = targetPlan?.name || "Starter";
      const isMatchingPlan =
        bData &&
        bData.subscription_plan &&
        bData.subscription_plan.toLowerCase() !== "trial" &&
        (bData.subscription_plan.toLowerCase().includes(chosenPlanName.toLowerCase()) ||
          chosenPlanName.toLowerCase().includes(bData.subscription_plan.toLowerCase()));

      if (isMatchingPlan) {
        setPaymentStatus("approved");
        setApprovedPlanTitle(bData.subscription_plan);

        if (onSubscribePlan) {
          onSubscribePlan(targetPlan?.id, redirectInfo.link, {
            ...targetPlan,
            name: bData.subscription_plan,
          });
        }

        setTimeout(() => {
          setIsRedirectModalOpen(false);
        }, 2500);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      {/* 1. FAIXA DE CONTAGEM REGRESSIVA NO TOPO */}
      {showBanner && (
        <div
          className={`
            w-full px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-md z-30 sticky top-0
            ${
              isExpired
                ? "bg-red-950 border-b border-red-800 text-red-200"
                : trialDaysLeft <= 2
                  ? "bg-amber-950/80 border-b border-amber-800/80 text-amber-200"
                  : "bg-neutral-900 border-b border-neutral-800 text-neutral-300"
            }
          `}
        >
          <div className="flex items-center gap-2">
            {isExpired ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>
              {isExpired ? (
                <strong className="text-white">
                  Seu período de teste de 7 dias expirou!
                </strong>
              ) : (
                <>
                  Período de Avaliação: Você tem{" "}
                  <strong className="text-amber-400 font-bold font-mono">
                    {trialDaysLeft}{" "}
                    {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}
                  </strong>{" "}
                  de Teste Grátis na sua barbearia.
                </>
              )}
            </span>
          </div>

          <Button
            variant="primary"
            onClick={() => {
              setIsModalOpen(true);
              setErrorMessage("");
              setSuccessNotice("");
            }}
            className="text-xs py-1 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
          >
            {isExpired
              ? "Escolher Plano para Liberar"
              : "Fazer Upgrade / Assinar"}
          </Button>
        </div>
      )}

      {/* 2. MODAL DE ESCOLHA DE PLANOS */}
      <Modal
        isOpen={isModalOpen}
        size="xl"
        onClose={() => {
          if (!isExpired) {
            setIsModalOpen(false);
            setErrorMessage("");
            setSuccessNotice("");
          } else {
            setErrorMessage(
              "Seu período de teste terminou. Selecione um plano para desbloquear o acesso."
            );
          }
        }}
        title="Escolha o plano ideal para sua barbearia"
        footer={
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Checkout oficial do Mercado Pago • PIX Instantâneo e Cartão em até 12x.
              </span>
            </div>
            <Button
              variant="primary"
              onClick={handleProceedToPayment}
              disabled={isProceedingPayment}
              className="w-full sm:w-auto text-xs py-3 px-7 font-black bg-emerald-600 hover:bg-emerald-500 shadow-xl cursor-pointer flex items-center justify-center gap-2 text-white transition-all transform active:scale-95"
            >
              {isProceedingPayment ? (
                <>
                  <Spinner size="xs" color="white" />
                  <span>Conectando Mercado Pago...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-white" />
                  <span>Continuar para pagamento seguro</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 text-left">
          <p className="text-xs text-neutral-400">
            Mantenha sua agenda online, cálculo de comissões e controle de caixa
            ativos sem interrupções com integração oficial da API do Mercado Pago.
          </p>

          {errorMessage && (
            <Alert variant="warning" title="Seleção Obrigatória">
              {errorMessage}
            </Alert>
          )}

          {successNotice && (
            <Alert variant="success" title="Plano Ativado">
              {successNotice}
            </Alert>
          )}

          {isLoadingPlans && displayPlans.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Spinner size="lg" color="primary" label="Carregando planos..." />
              <p className="text-xs text-neutral-400">
                Buscando planos atualizados da plataforma...
              </p>
            </div>
          ) : (
            /* GRADE DOS PLANOS CONTRATÁVEIS: Starter, Pro, Entreprise */
            <div
              className={`grid grid-cols-1 ${
                displayPlans.length === 3
                  ? "md:grid-cols-3"
                  : "md:grid-cols-2 lg:grid-cols-4"
              } gap-4 items-stretch`}
            >
              {displayPlans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isPlanTrial =
                  plan.isTrial ||
                  plan.id === "trial" ||
                  plan.id === "plano-de-teste" ||
                  plan.name.toLowerCase().includes("teste");
                const isTrialRestricted = isPlanTrial && !isCurrentTrial;

                const currentPlanNormalized = String(tenant?.subscription_plan || tenant?.plan || "").toLowerCase();
                const isThisCurrentActivePlan =
                  (isCurrentTrial && isPlanTrial) ||
                  (!isCurrentTrial &&
                    (plan.id.toLowerCase() === currentPlanNormalized ||
                      plan.name.toLowerCase() === currentPlanNormalized ||
                      (plan.id === "starter" && currentPlanNormalized.includes("starter")) ||
                      (plan.id === "pro" && currentPlanNormalized.includes("pro")) ||
                      (plan.id === "enterprise" && (currentPlanNormalized.includes("enterprise") || currentPlanNormalized.includes("entreprise")))));

                const isHighlighted =
                  (plan.tag || "").toLowerCase().includes("popular") ||
                  (plan.tag || "").toLowerCase().includes("escolhido") ||
                  (plan.tag || "").toLowerCase().includes("destaque");

                const formattedPrice = Number(plan.price || 0)
                  .toFixed(2)
                  .replace(".", ",");

                const hasMpLink = Boolean(mpCheckoutUrls[plan.id]);
                const isFetchingThisLink = loadingPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      if (!isTrialRestricted) {
                        handleSelectPlan(plan.id);
                      } else {
                        setErrorMessage(
                          "O retorno ao Plano de Teste é restrito. Somente o SuperAdmin oficial (atendmentor@gmail.com) pode reativar o modo de testes para contas pagantes."
                        );
                      }
                    }}
                    className={`
                      p-4.5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 text-left relative
                      ${
                        isTrialRestricted
                          ? "bg-neutral-950/40 border-neutral-800/60 opacity-75 cursor-not-allowed"
                          : isSelected
                            ? "bg-amber-950/25 border-amber-500 shadow-xl ring-2 ring-amber-500/50 scale-[1.01] cursor-pointer"
                            : isThisCurrentActivePlan
                              ? "bg-emerald-950/20 border-emerald-500/50 shadow-md cursor-pointer"
                              : "bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950 cursor-pointer"
                      }
                    `}
                  >
                    {/* Badge / Tag superior */}
                    {isThisCurrentActivePlan ? (
                      <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 w-fit bg-emerald-500 text-neutral-950 absolute -top-2.5 right-4 font-black">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>Seu Plano Atual</span>
                      </span>
                    ) : isTrialRestricted ? (
                      <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 w-fit bg-neutral-800 text-neutral-400 border border-neutral-700 absolute -top-2.5 right-4 font-black">
                        <Lock className="w-2.5 h-2.5 text-neutral-400" />
                        <span>Exclusivo SuperAdmin</span>
                      </span>
                    ) : plan.tag ? (
                      <span
                        className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 w-fit ${
                          isHighlighted
                            ? "bg-amber-500 text-neutral-950 absolute -top-2.5 right-4 font-black"
                            : isPlanTrial
                              ? "bg-blue-600 text-white absolute -top-2.5 right-4 font-black"
                              : "bg-neutral-800 text-neutral-300 font-bold"
                        }`}
                      >
                        <span>{plan.tag}</span>
                        {isHighlighted && (
                          <Star className="w-2.5 h-2.5 fill-neutral-950 text-neutral-950" />
                        )}
                        {isPlanTrial && (
                          <Sparkles className="w-2.5 h-2.5 fill-white text-white" />
                        )}
                      </span>
                    ) : null}

                    <div className="space-y-1.5 pt-1">
                      <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                        <span>{plan.name}</span>
                      </h4>

                      <div className="flex items-baseline gap-1">
                        {Number(plan.price) === 0 ? (
                          <p className="text-2xl font-black text-emerald-400 font-mono">
                            Grátis
                            <span className="text-xs text-neutral-400 font-normal pl-1">
                              / 7 dias
                            </span>
                          </p>
                        ) : (
                          <p className="text-2xl font-black text-amber-400 font-mono">
                            R$ {formattedPrice}
                            <span className="text-xs text-neutral-500 font-normal">
                              /mês
                            </span>
                          </p>
                        )}
                      </div>

                      <p className="text-[11px] text-neutral-400 leading-tight">
                        {isTrialRestricted
                          ? "Reativação exclusiva pelo SuperAdmin oficial (atendmentor@gmail.com)."
                          : isPlanTrial
                            ? "Período de avaliação para testar todas as funcionalidades do sistema."
                            : plan.maxBarbers >= 999
                              ? "Barbeiros ilimitados para grandes redes e franquias."
                              : plan.maxBarbers === 1
                                ? "Para barbeiros autônomos ou cadeira individual."
                                : `Para equipes de até ${plan.maxBarbers} profissionais.`}
                      </p>
                    </div>

                    {/* Bloco de capacidade */}
                    <div className="p-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-xs space-y-0.5">
                      <p className="text-neutral-300 text-[11px]">
                        Capacidade:{" "}
                        <strong className="text-white">
                          {plan.maxBarbers >= 999
                            ? "Barbeiros Ilimitados"
                            : plan.maxBarbers === 1
                              ? "1 Barbeiro / Cadeira"
                              : `Até ${plan.maxBarbers} Barbeiros`}
                        </strong>
                      </p>
                      {plan.extraBarberPrice > 0 && (
                        <p className="text-[10px] font-bold text-amber-400">
                          + R${" "}
                          {Number(plan.extraBarberPrice)
                            .toFixed(2)
                            .replace(".", ",")}/mês cadeira extra
                        </p>
                      )}
                    </div>

                    {/* Lista de features */}
                    <div className="space-y-1.5 pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-300 grow">
                      {Array.isArray(plan.features) && plan.features.length > 0 ? (
                        plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0 mt-0.5" />
                            <span className="leading-tight">{feat}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0" />
                            <span>Agenda Online 24/7</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0" />
                            <span>Controle de Comissões e Caixa</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Status da API Mercado Pago para o plano */}
                    {Number(plan.price) > 0 && (
                      <div className="pt-1">
                        {hasMpLink ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded-md w-full justify-center">
                            <Check className="w-3 h-3 text-emerald-400" />
                            Link Mercado Pago Pronto
                          </span>
                        ) : isFetchingThisLink ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 rounded-md w-full justify-center">
                            <Spinner size="xs" color="primary" />
                            Consultando API Mercado Pago...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 font-medium bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md w-full justify-center">
                            <ShieldCheck className="w-3 h-3 text-neutral-400" />
                            API Mercado Pago Pronta
                          </span>
                        )}
                      </div>
                    )}

                    {/* BOTÃO DO CARD: ajustado para receber o link da API do Mercado Pago */}
                    <button
                      type="button"
                      onClick={(e) => handleCardButtonClick(plan, e)}
                      disabled={isFetchingThisLink || isTrialRestricted}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isTrialRestricted
                          ? "bg-neutral-900/80 text-neutral-500 border border-neutral-800 cursor-not-allowed"
                          : isThisCurrentActivePlan
                            ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 cursor-default"
                            : isSelected
                              ? "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30 cursor-pointer"
                              : "bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800 cursor-pointer"
                      }`}
                    >
                      {isTrialRestricted ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Restrito ao SuperAdmin</span>
                        </>
                      ) : isThisCurrentActivePlan ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isPlanTrial ? "Seu Plano Atual" : "Plano Ativo"}</span>
                        </>
                      ) : isFetchingThisLink ? (
                        <>
                          <Spinner size="xs" color="white" />
                          <span>Obtendo link da API...</span>
                        </>
                      ) : isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {hasMpLink
                              ? "Selecionado (Link Pronto)"
                              : isPlanTrial
                                ? "Selecionado"
                                : "Selecionado"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>
                            {isPlanTrial
                              ? "Escolher Plano de Teste"
                              : `Escolher ${plan.name}`}
                          </span>
                          {Number(plan.price) > 0 && (
                            <ExternalLink className="w-3 h-3 text-neutral-400" />
                          )}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 3. MODAL COM SPINNER DE STATUS E CONFIRMAÇÃO DE PAGAMENTO */}
      {/* ======================================================== */}
      <Modal
        isOpen={isRedirectModalOpen}
        onClose={() => setIsRedirectModalOpen(false)}
        title={paymentStatus === "approved" ? "Pagamento Confirmado!" : "Aguardando Pagamento"}
        size="sm"
      >
        {paymentStatus === "approved" ? (
          <div className="py-6 px-3 flex flex-col items-center justify-center text-center space-y-4 select-none">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-lg font-bold text-white">
                Pagamento realizado com sucesso!
              </h4>
              <p className="text-xs text-neutral-300 max-w-xs mx-auto">
                O plano <strong className="text-amber-400 font-bold">{approvedPlanTitle || redirectInfo.planName}</strong> foi ativado com sucesso para sua barbearia.
              </p>
            </div>

            <p className="text-[11px] text-neutral-400">
              Retornando ao sistema em instantes...
            </p>

            <Button
              variant="primary"
              onClick={() => {
                setIsRedirectModalOpen(false);
                if (onSubscribePlan && redirectInfo.plan) {
                  onSubscribePlan(redirectInfo.plan.id, redirectInfo.link, {
                    ...redirectInfo.plan,
                    name: approvedPlanTitle || redirectInfo.planName,
                  });
                }
              }}
              className="text-xs py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer w-full"
            >
              Concluir e Acessar
            </Button>
          </div>
        ) : (
          <div className="py-6 px-3 flex flex-col items-center justify-center text-center space-y-4 select-none">
            {/* Ícone de Aguardando Pagamento: Relógio âmbar com anel pulsante */}
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-white">
                {isVerifying ? "Consultando Mercado Pago..." : "Aguardando Pagamento"}
              </h4>
              <p className="text-xs text-neutral-300 max-w-xs mx-auto leading-relaxed">
                Conclua o pagamento via Pix ou Cartão no Mercado Pago para o plano{" "}
                <strong className="text-amber-400">
                  {redirectInfo.planName}
                </strong>
                .
              </p>
              <p className="text-[11px] text-neutral-400 max-w-xs mx-auto leading-normal">
                Assim que o pagamento for concluído, o webhook do Mercado Pago avisa o banco de dados e esta tela é atualizada automaticamente com a confirmação.
              </p>
            </div>

            <div className="w-full flex flex-col gap-2.5 pt-2">
              {redirectInfo.link && (
                <a
                  href={redirectInfo.link}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <span>Abrir Página de Pagamento do Mercado Pago</span>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-950" />
                </a>
              )}

              <Button
                variant="secondary"
                onClick={handleManualCheckPayment}
                disabled={isVerifying}
                className="w-full text-xs py-2 font-bold cursor-pointer flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Spinner size="xs" color="primary" />
                    <span>Verificando com o Mercado Pago...</span>
                  </>
                ) : (
                  <span>Já realizei o pagamento, verificar agora</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
