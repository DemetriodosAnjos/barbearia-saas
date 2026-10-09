import { useState, useEffect } from "react";
import { AlertTriangle, Clock, Check, Star, ArrowRight, ExternalLink } from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Alert from "../ui/Alert";
import Spinner from "../ui/Spinner";
import { supabase } from "../../lib/supabase";
import { INITIAL_PLANS } from "../../pages/SuperAdmin/SuperAdminMockNuank";

export default function TrialBanner({
  trialDaysLeft,
  onSubscribePlan,
  isPlansModalOpen,
  setIsPlansModalOpen,
  plans: propPlans,
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
            const mapped = data.map((p) => ({
              id: p.id,
              name: p.name,
              price: Number(p.price || 0),
              maxBarbers: Number(p.max_barbers || 1),
              extraBarberPrice: Number(p.extra_barber_price || 0),
              tag: p.tag || "",
              active: p.active !== false,
              checkoutUrl:
                p.mercado_pago_checkout_url ||
                p.nubank_payment_link ||
                `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_${p.id}`,
              features: Array.isArray(p.features) ? p.features : [],
            }));
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

  // Filtra apenas planos ativos criados pelo SuperAdmin
  const activePlans = plans.filter((p) => p.active !== false);
  const displayPlans = activePlans.length > 0 ? activePlans : plans;

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

  // Defesa: se trialDaysLeft for null/undefined e o modal não estiver aberto, não renderiza
  if (!showBanner && !isModalOpen && !isRedirectModalOpen) return null;

  // Função disparada ao clicar no botão de pagamento
  const handleProceedToPayment = () => {
    const chosenPlan = displayPlans.find((p) => p.id === selectedPlan) || displayPlans[0];

    if (!chosenPlan) {
      setErrorMessage(
        "Por favor, selecione um dos planos acima para prosseguir para o pagamento.",
      );
      return;
    }

    const chosenLink =
      chosenPlan.checkoutUrl ||
      chosenPlan.mercadoPagoCheckoutUrl ||
      chosenPlan.nubank_payment_link ||
      "https://www.mercadopago.com.br";

    const formattedPrice = Number(chosenPlan.price || 0)
      .toFixed(2)
      .replace(".", ",");
    const chosenPlanName = `${chosenPlan.name} (R$ ${formattedPrice}/mês)`;

    // Fecha o modal de planos
    setIsModalOpen(false);

    // Abre o modal com Spinner e tela bloqueada (Overlay)
    setRedirectInfo({ planName: chosenPlanName, link: chosenLink });
    setIsRedirectModalOpen(true);

    // Simula a preparação do ambiente seguro e abre o checkout oficial
    setTimeout(() => {
      if (chosenLink && typeof window !== "undefined") {
        window.open(chosenLink, "_blank");
      }
      setIsRedirectModalOpen(false);
      setErrorMessage("");

      if (onSubscribePlan) {
        onSubscribePlan(chosenPlan.id, chosenLink, chosenPlan);
      }
    }, 1800);
  };

  const handleSelectPlan = (planKey) => {
    setSelectedPlan(planKey);
    setErrorMessage("");
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
          } else {
            setErrorMessage(
              "Seu período de teste terminou. Selecione um plano para desbloquear o acesso.",
            );
          }
        }}
        title="Escolha o plano ideal para sua barbearia"
        footer={
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-neutral-400">
              Pagamento 100% seguro com ativação imediata (PIX ou Cartão em até 12x).
            </span>
            <Button
              variant="primary"
              onClick={handleProceedToPayment}
              className="w-full sm:w-auto text-xs py-2.5 px-6 font-extrabold bg-emerald-600 hover:bg-emerald-500 shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Continuar para Pagamento Seguro</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        }
      >
        <div className="space-y-5 text-left">
          <p className="text-xs text-neutral-400">
            Mantenha sua agenda online, cálculo de comissões e controle de caixa
            ativos sem interrupções com os planos oficiais da plataforma.
          </p>

          {errorMessage && (
            <Alert variant="warning" title="Seleção Obrigatória">
              {errorMessage}
            </Alert>
          )}

          {isLoadingPlans && displayPlans.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Spinner size="lg" color="primary" label="Carregando planos..." />
              <p className="text-xs text-neutral-400">Buscando planos atualizados da plataforma...</p>
            </div>
          ) : (
            /* GRADE DINÂMICA DE CARDS DE PLANOS */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {displayPlans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isHighlighted =
                  (plan.tag || "").toLowerCase().includes("popular") ||
                  (plan.tag || "").toLowerCase().includes("escolhido") ||
                  (plan.tag || "").toLowerCase().includes("destaque");

                const formattedPrice = Number(plan.price || 0)
                  .toFixed(2)
                  .replace(".", ",");

                return (
                  <div
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`
                      p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 text-left relative
                      ${
                        isSelected
                          ? "bg-amber-950/25 border-amber-500 shadow-2xl ring-2 ring-amber-500/50 scale-[1.02]"
                          : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950"
                      }
                    `}
                  >
                    {plan.tag && (
                      <span
                        className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 w-fit ${
                          isHighlighted
                            ? "bg-amber-500 text-neutral-950 absolute -top-3 right-4 font-black"
                            : "bg-neutral-800 text-neutral-300 font-bold"
                        }`}
                      >
                        <span>{plan.tag}</span>
                        {isHighlighted && (
                          <Star className="w-2.5 h-2.5 fill-neutral-950 text-neutral-950" />
                        )}
                      </span>
                    )}

                    <div className="space-y-2 pt-1">
                      <h4 className="text-base font-bold text-white">{plan.name}</h4>
                      <p className="text-2xl font-black text-amber-400 font-mono">
                        R$ {formattedPrice}
                        <span className="text-xs text-neutral-500 font-normal">
                          /mês
                        </span>
                      </p>
                      <p className="text-xs text-neutral-400">
                        {plan.maxBarbers >= 999
                          ? "Barbeiros ilimitados para grandes redes e franquias."
                          : plan.maxBarbers === 1
                            ? "Para barbeiros autônomos ou cadeira individual."
                            : `Para equipes de até ${plan.maxBarbers} profissionais.`}
                      </p>
                    </div>

                    <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl text-xs space-y-1">
                      <p className="text-neutral-300">
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
                        <p className="text-[11px] font-bold text-amber-400">
                          + R${" "}
                          {Number(plan.extraBarberPrice)
                            .toFixed(2)
                            .replace(".", ",")}/mês por cadeira extra
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-neutral-800/80 text-xs text-neutral-300 grow">
                      {Array.isArray(plan.features) && plan.features.length > 0 ? (
                        plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0" />
                            <span>Agenda Online 24/7</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0" />
                            <span>Gestão de Comissões e Caixa</span>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                          : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800"
                      }`}
                    >
                      {isSelected ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Selecionado</span>
                        </span>
                      ) : (
                        `Escolher ${plan.name}`
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
        onClose={() => {}}
        title="Redirecionando para Pagamento"
        size="sm"
      >
        <div className="py-6 px-2 flex flex-col items-center justify-center text-center space-y-4 select-none">
          <Spinner
            size="xl"
            color="primary"
            label="Conectando com Gateway Seguro..."
          />

          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">
              Preparando ambiente seguro
            </h4>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              Gerando cobrança oficial para o plano{" "}
              <strong className="text-amber-400">
                {redirectInfo.planName}
              </strong>
              ...
            </p>
          </div>

          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl text-[11px] text-neutral-400 max-w-xs w-full space-y-1">
            <p className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Conexão Segura & Criptografada
            </p>
            <p className="text-neutral-500 text-[10px]">
              Uma nova aba será aberta automaticamente com opções de PIX e
              Cartão.
            </p>
          </div>

          <a
            href={redirectInfo.link}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-amber-500 hover:underline pt-2 inline-flex items-center gap-1 cursor-pointer font-semibold"
          >
            <span>Clique aqui se a página não abrir sozinha</span>
            <ExternalLink className="w-3 h-3 text-amber-500" />
          </a>
        </div>
      </Modal>
    </>
  );
}
