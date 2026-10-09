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
import { createPreferenceEndpoint } from "../../api/mercadoPagoEndpoints";

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

  // Estados do Modal de Redirecionamento com Spinner
  const [isRedirectModalOpen, setIsRedirectModalOpen] = useState(false);
  const [redirectInfo, setRedirectInfo] = useState({ planName: "", link: "" });

  const showBanner = trialDaysLeft !== undefined && trialDaysLeft !== null;
  const isExpired = typeof trialDaysLeft === "number" ? trialDaysLeft <= 0 : false;

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
            setPlans(mapped);
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

  // Ordena os 4 planos requisitados: Plano de Teste -> Starter -> Pro -> Entreprise
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

    return [...baseList].sort((a, b) => getRank(a) - getRank(b));
  }, [plans]);

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
        tenantId: tenant?.id || "tenant_default",
        tenantName: tenant?.name || "Minha Barbearia",
        payerEmail: user?.email || tenant?.ownerEmail || "gestor@barbearia.com.br",
        payerName: tenant?.ownerName || user?.user_metadata?.full_name || "Gestor da Barbearia",
        payerPhone: tenant?.ownerPhone || tenant?.phone || "11999998888",
        billingPeriod: "monthly",
      });

      if (res.success && res.data?.initPoint) {
        const generatedLink = res.data.initPoint;
        setMpCheckoutUrls((prev) => ({
          ...prev,
          [plan.id]: generatedLink,
        }));
        return generatedLink;
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

    setMpCheckoutUrls((prev) => ({
      ...prev,
      [plan.id]: fallback,
    }));
    return fallback;
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

  // Defesa: se trialDaysLeft for null/undefined e o modal não estiver aberto, não renderiza
  if (!showBanner && !isModalOpen && !isRedirectModalOpen) return null;

  const handleSelectPlan = (planKey) => {
    setSelectedPlan(planKey);
    setErrorMessage("");
    const plan = displayPlans.find((p) => p.id === planKey);
    if (plan && Number(plan.price) > 0) {
      generateMercadoPagoLink(plan);
    }
  };

  // Ação ao clicar no botão individual de cada card de plano
  const handleCardButtonClick = async (plan, e) => {
    if (e) e.stopPropagation();
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

    try {
      const chosenLink = await generateMercadoPagoLink(chosenPlan);

      const formattedPrice = Number(chosenPlan.price || 0)
        .toFixed(2)
        .replace(".", ",");
      const chosenPlanName = `${chosenPlan.name} (R$ ${formattedPrice}/mês)`;

      // Fecha o modal de planos
      setIsModalOpen(false);

      // Abre o modal de redirecionamento seguro com Spinner
      setRedirectInfo({ planName: chosenPlanName, link: chosenLink });
      setIsRedirectModalOpen(true);

      // Abre o checkout oficial do Mercado Pago em nova aba
      if (chosenLink && typeof window !== "undefined") {
        window.open(chosenLink, "_blank");
      }

      if (onSubscribePlan) {
        onSubscribePlan(chosenPlan.id, chosenLink, chosenPlan);
      }
    } catch (err) {
      console.error("[MercadoPago Checkout] Falha:", err);
      setErrorMessage("Erro ao conectar com a API do Mercado Pago. Tente novamente.");
    } finally {
      setIsProceedingPayment(false);
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
            /* GRADE DOS 4 PLANOS: Plano de Teste, Starter, Pro, Entreprise */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              {displayPlans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isTrial =
                  plan.isTrial ||
                  plan.id === "trial" ||
                  plan.id === "plano-de-teste" ||
                  plan.name.toLowerCase().includes("teste");
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
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`
                      p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 text-left relative
                      ${
                        isSelected
                          ? "bg-amber-950/25 border-amber-500 shadow-xl ring-2 ring-amber-500/50 scale-[1.01]"
                          : "bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950"
                      }
                    `}
                  >
                    {/* Badge / Tag superior */}
                    {plan.tag && (
                      <span
                        className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 w-fit ${
                          isHighlighted
                            ? "bg-amber-500 text-neutral-950 absolute -top-2.5 right-4 font-black"
                            : isTrial
                              ? "bg-blue-600 text-white absolute -top-2.5 right-4 font-black"
                              : "bg-neutral-800 text-neutral-300 font-bold"
                        }`}
                      >
                        <span>{plan.tag}</span>
                        {isHighlighted && (
                          <Star className="w-2.5 h-2.5 fill-neutral-950 text-neutral-950" />
                        )}
                        {isTrial && (
                          <Sparkles className="w-2.5 h-2.5 fill-white text-white" />
                        )}
                      </span>
                    )}

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
                        {isTrial
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
                      disabled={isFetchingThisLink}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30"
                          : "bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800"
                      }`}
                    >
                      {isFetchingThisLink ? (
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
                              : isTrial
                                ? "Selecionado"
                                : "Selecionado"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>
                            {isTrial
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
      {/* 3. MODAL COM SPINNER DE REDIRECIONAMENTO DE CHECKOUT    */}
      {/* ======================================================== */}
      <Modal
        isOpen={isRedirectModalOpen}
        onClose={() => setIsRedirectModalOpen(false)}
        title="Redirecionando para Pagamento"
        size="sm"
      >
        <div className="py-6 px-2 flex flex-col items-center justify-center text-center space-y-4 select-none">
          <Spinner
            size="xl"
            color="primary"
            label="Conectando com o Mercado Pago..."
          />

          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">
              Preparando ambiente seguro
            </h4>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              Gerando preferência oficial na API Mercado Pago para o plano{" "}
              <strong className="text-amber-400">
                {redirectInfo.planName}
              </strong>
              ...
            </p>
          </div>

          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl text-[11px] text-neutral-400 max-w-xs w-full space-y-1">
            <p className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              API Mercado Pago Integrada (Checkout Pro)
            </p>
            <p className="text-neutral-500 text-[10px]">
              Uma nova aba foi aberta para conclusão com PIX ou Cartão em até 12x.
            </p>
          </div>

          <a
            href={redirectInfo.link}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-amber-500 hover:underline pt-2 inline-flex items-center gap-1 cursor-pointer font-semibold"
          >
            <span>Clique aqui para abrir o link do Mercado Pago</span>
            <ExternalLink className="w-3 h-3 text-amber-500" />
          </a>
        </div>
      </Modal>
    </>
  );
}
