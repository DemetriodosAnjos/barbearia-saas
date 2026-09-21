import { useState } from "react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Alert from "../ui/Alert";
import Spinner from "../ui/Spinner";

export default function TrialBanner({ trialDaysLeft, onSubscribePlan }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // 1. Defesa: se trialDaysLeft for null/undefined (ex: assinante ativo ou dados ainda carregando), não renderiza
  if (trialDaysLeft === undefined || trialDaysLeft === null) return null;

  // Estados do Modal de Redirecionamento com Spinner
  const [isRedirectModalOpen, setIsRedirectModalOpen] = useState(false);
  const [redirectInfo, setRedirectInfo] = useState({ planName: "", link: "" });

  const isExpired = trialDaysLeft <= 0;

  // Função disparada ao clicar no botão de pagamento
  const handleProceedToPayment = () => {
    // 1. Validação de escolha obrigatória
    if (!selectedPlan) {
      setErrorMessage(
        "Por favor, selecione um dos planos acima para prosseguir para o pagamento.",
      );
      return;
    }

    // Validade dos links 30 dias (substituir por webhook Mercado Pago)
    const paymentLinks = {
      starter: "https://checkout.nubank.com.br/cqOIhHqs1xetkbs",
      pro: "https://checkout.nubank.com.br/c5JntImFeMetkbs",
      enterprise: "https://checkout.nubank.com.br/PbzsvFlouxetkbs",
    };

    const planNames = {
      starter: "Plano Solo (R$ 69,90/mês)",
      pro: "Plano Pro (R$ 149,90/mês)",
      enterprise: "Redes & Franquias (R$ 279,90/mês)",
    };

    const chosenLink = paymentLinks[selectedPlan] || paymentLinks.pro;
    const chosenPlanName = planNames[selectedPlan];

    // 2. Fecha o modal de planos
    setIsModalOpen(false);

    // 3. Abre o modal com Spinner e tela bloqueada (Overlay)
    setRedirectInfo({ planName: chosenPlanName, link: chosenLink });
    setIsRedirectModalOpen(true);

    // 4. Simula o processamento de 2 segundos e abre a aba do Nubank
    setTimeout(() => {
      window.open(chosenLink, "_blank");
      setIsRedirectModalOpen(false);
      setErrorMessage("");

      if (onSubscribePlan) {
        onSubscribePlan(selectedPlan, chosenLink);
      }
    }, 2000);
  };

  const handleSelectPlan = (planKey) => {
    setSelectedPlan(planKey);
    setErrorMessage("");
  };

  return (
    <>
      {/* 1. FAIXA DE CONTAGEM REGRESSIVA NO TOPO */}
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
          <span>{isExpired ? "⚠️" : "⏳"}</span>
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

      {/* 2. MODAL DE ESCOLHA DE PLANOS */}
      <Modal
        isOpen={isModalOpen}
        size="xl"
        onClose={() => {
          // Método: impede fechamento se o trial estiver expirado, exibindo aviso no próprio layout
          if (!isExpired) {
            setIsModalOpen(false);
            setErrorMessage("");
          } else {
            setErrorMessage(
              "Seu período de teste terminou. Selecione um plano para desbloquear o acesso.",
            );
          }
        }}
        title="Escolha o plano ideal para a sua barbearia"
        footer={
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-neutral-400">
              Pagamento 100% seguro via Nubank PJ (PIX ou Cartão em até 12x).
            </span>
            <Button
              variant="primary"
              onClick={handleProceedToPayment}
              className="w-full sm:w-auto text-xs py-2.5 px-6 font-extrabold bg-emerald-600 hover:bg-emerald-500 shadow-lg cursor-pointer"
            >
              Continuar para Pagamento Seguro →
            </Button>
          </div>
        }
      >
        <div className="space-y-5 text-left">
          <p className="text-xs text-neutral-400">
            Mantenha sua agenda online, cálculo de comissões e controle de caixa
            ativos sem interrupções.
          </p>

          {errorMessage && (
            <Alert variant="warning" title="Seleção Obrigatória">
              {errorMessage}
            </Alert>
          )}

          {/* GRADE DE CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {/* Plano Solo */}
            <div
              onClick={() => handleSelectPlan("starter")}
              className={`
                p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 text-left relative
                ${
                  selectedPlan === "starter"
                    ? "bg-amber-950/20 border-amber-500 shadow-xl ring-2 ring-amber-500/40 scale-[1.02]"
                    : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950"
                }
              `}
            >
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                  Individual
                </span>
                <h4 className="text-base font-bold text-white">Plano Solo</h4>
                <p className="text-2xl font-black text-amber-400 font-mono">
                  R$ 69,90
                  <span className="text-xs text-neutral-500 font-normal">
                    /mês
                  </span>
                </p>
                <p className="text-xs text-neutral-400">
                  Para barbeiros autônomos ou cadeira individual.
                </p>
              </div>

              <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl text-xs space-y-1">
                <p className="text-neutral-300">
                  Capacidade:{" "}
                  <strong className="text-white">1 Barbeiro / Cadeira</strong>
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-800/80 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Agenda Online 24h</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Controle de Fila & PDV</span>
                </div>
              </div>

              <button
                type="button"
                className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                  selectedPlan === "starter"
                    ? "bg-amber-600 text-white"
                    : "bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                {selectedPlan === "starter"
                  ? "✓ Selecionado"
                  : "Escolher Plano Solo"}
              </button>
            </div>

            {/* Plano Pro */}
            <div
              onClick={() => handleSelectPlan("pro")}
              className={`
                p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 text-left relative
                ${
                  selectedPlan === "pro"
                    ? "bg-amber-950/25 border-amber-500 shadow-2xl ring-2 ring-amber-500/50 scale-[1.03]"
                    : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950"
                }
              `}
            >
              <span className="absolute -top-3 right-4 text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500 text-neutral-950 shadow-md">
                Mais Escolhido ★
              </span>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                  Equipes Médias
                </span>
                <h4 className="text-base font-bold text-white">Plano Pro</h4>
                <p className="text-2xl font-black text-amber-400 font-mono">
                  R$ 149,90
                  <span className="text-xs text-neutral-500 font-normal">
                    /mês
                  </span>
                </p>
                <p className="text-xs text-neutral-400">
                  Comissões automáticas e equipe.
                </p>
              </div>

              <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl text-xs space-y-1">
                <p className="text-neutral-300">
                  Capacidade:{" "}
                  <strong className="text-white">Até 6 Barbeiros</strong>
                </p>
                <p className="text-[11px] font-bold text-amber-400">
                  + R$ 19,90/mês por cadeira extra
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-800/80 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Tudo do Plano Solo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <strong className="text-white">Comissões Automáticas</strong>
                </div>
              </div>

              <button
                type="button"
                className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                  selectedPlan === "pro"
                    ? "bg-amber-600 text-white"
                    : "bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                {selectedPlan === "pro"
                  ? "✓ Selecionado"
                  : "Escolher Plano Pro"}
              </button>
            </div>

            {/* Plano Redes */}
            <div
              onClick={() => handleSelectPlan("enterprise")}
              className={`
                p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 text-left relative
                ${
                  selectedPlan === "enterprise"
                    ? "bg-amber-950/20 border-amber-500 shadow-xl ring-2 ring-amber-500/40 scale-[1.02]"
                    : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950"
                }
              `}
            >
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                  Escala & Redes
                </span>
                <h4 className="text-base font-bold text-white">
                  Redes & Franquias
                </h4>
                <p className="text-2xl font-black text-amber-400 font-mono">
                  R$ 279,90
                  <span className="text-xs text-neutral-500 font-normal">
                    /mês
                  </span>
                </p>
                <p className="text-xs text-neutral-400">
                  Grandes equipes e multi-unidades.
                </p>
              </div>

              <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl text-xs space-y-1">
                <p className="text-emerald-400 font-bold">
                  ★ Barbeiros Ilimitados
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-800/80 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Tudo do Plano Pro</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <strong className="text-amber-400">
                    White-Label Incluso
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                  selectedPlan === "enterprise"
                    ? "bg-amber-600 text-white"
                    : "bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                {selectedPlan === "enterprise"
                  ? "✓ Selecionado"
                  : "Escolher Redes & Franquias"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 3. NOVO: MODAL COM SPINNER DE REDIRECIONAMENTO NUBANK PJ */}
      {/* ======================================================== */}
      <Modal
        isOpen={isRedirectModalOpen}
        onClose={() => {}} // Não fecha clicando fora durante a transição!
        title="Redirecionando para Pagamento"
        size="sm"
      >
        <div className="py-6 px-2 flex flex-col items-center justify-center text-center space-y-4 select-none">
          {/* Spinner Grande em Destaque */}
          <Spinner
            size="xl"
            color="primary"
            label="Conectando com Nubank PJ..."
          />

          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">
              Preparando ambiente seguro Nubank PJ
            </h4>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              Gerando cobrança oficial para o plano{" "}
              <strong className="text-amber-400">
                {redirectInfo.planName}
              </strong>
              ...
            </p>
          </div>

          {/* Badge de Segurança */}
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

          {/* Link de contingência caso o navegador bloqueie popups */}
          <a
            href={redirectInfo.link}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-amber-500 hover:underline pt-2 inline-block cursor-pointer font-semibold"
          >
            Clique aqui se a página não abrir sozinha ➔
          </a>
        </div>
      </Modal>
    </>
  );
}
