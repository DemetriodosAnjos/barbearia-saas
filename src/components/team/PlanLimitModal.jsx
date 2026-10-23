import React, { useEffect } from "react";
import { AlertCircle, X, ArrowUpRight, Headphones } from "lucide-react";
import Button from "../ui/Button";

export const PLAN_LIMIT_CONFIGS = {
  trial: {
    key: "trial",
    maxBarbers: 1,
    title: "Plano Trial",
    text: "este plano só permite 1 cadastro, caso deseje cadastrar mais profissionais escolha os planos Starter Pro ou Enterprise",
    links: [
      { id: "starter", label: "Starter" },
      { id: "pro", label: "Pro" },
      { id: "enterprise", label: "Enterprise" },
    ],
    isSupport: false,
  },
  starter: {
    key: "starter",
    maxBarbers: 2,
    title: 'Plano Starter “Mais Popular”',
    text: "este plano só permite 2 cadastros, caso deseje cadastrar mais profissionais escolha os planos Pro ou Enterprise",
    links: [
      { id: "pro", label: "Pro" },
      { id: "enterprise", label: "Enterprise" },
    ],
    isSupport: false,
  },
  pro: {
    key: "pro",
    maxBarbers: 5,
    title: "Plano Pro",
    text: "este plano só permite 5 cadastros, caso deseje cadastrar mais profissionais escolha o plano Enterprise",
    links: [
      { id: "enterprise", label: "Enterprise" },
    ],
    isSupport: false,
  },
  enterprise: {
    key: "enterprise",
    maxBarbers: 15,
    title: "Plano Enterprise",
    text: "este plano permite 15 cadastros caso deseje cadastrar mais profissionais entre em contato com o suporte técnico",
    links: [
      { id: "support", label: "Suporte Técnico" },
    ],
    isSupport: true,
  },
};

/**
 * Normaliza o plano atual da barbearia para uma chave válida ('trial' | 'starter' | 'pro' | 'enterprise')
 */
export function resolveTenantPlanKey(tenant) {
  const p = String(tenant?.plan || tenant?.subscription_plan || "").toLowerCase().trim();
  const s = String(tenant?.status || "").toLowerCase().trim();

  if (p === "trial" || p.includes("teste") || s === "trial") {
    return "trial";
  }
  if (p.includes("starter") || p.includes("solo")) {
    return "starter";
  }
  if (p.includes("enterprise") || p.includes("entreprise")) {
    return "enterprise";
  }
  if (p.includes("pro")) {
    return "pro";
  }
  return "trial";
}

/**
 * Retorna o limite máximo de profissionais permitidos para o plano atual
 */
export function getPlanMaxBarbers(tenant) {
  const key = resolveTenantPlanKey(tenant);
  return PLAN_LIMIT_CONFIGS[key]?.maxBarbers ?? 1;
}

export default function PlanLimitModal({
  isOpen = false,
  onClose,
  tenant,
  planKey: propPlanKey,
  onOpenPlansModal,
  onNavigateToSupport,
}) {
  const activePlanKey = propPlanKey || resolveTenantPlanKey(tenant);
  const config = PLAN_LIMIT_CONFIGS[activePlanKey] || PLAN_LIMIT_CONFIGS.trial;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLinkClick = (linkItem) => {
    onClose?.();

    if (linkItem.id === "support" || config.isSupport) {
      if (onNavigateToSupport) {
        onNavigateToSupport();
      } else {
        const supportPhone = "5511999998888";
        const barbershopName = tenant?.name || "Minha Barbearia";
        const msg = encodeURIComponent(
          `Olá Suporte Técnico BarberSaaS! Sou gestor da barbearia ${barbershopName} e atingi o limite de 15 profissionais no Plano Enterprise. Gostaria de atendimento para cadastrar mais profissionais.`
        );
        window.open(`https://wa.me/${supportPhone}?text=${msg}`, "_blank");
      }
      return;
    }

    if (onOpenPlansModal) {
      onOpenPlansModal(linkItem.id);
    } else {
      window.dispatchEvent(
        new CustomEvent("saas:open-plans-modal", {
          detail: { targetPlanId: linkItem.id },
        })
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-limit-title"
    >
      <div
        className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-neutral-100 space-y-5 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho: Título e Botão Fechar (x) */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <h3
              id="plan-limit-title"
              className="text-base font-bold text-neutral-100 tracking-tight"
            >
              {config.title}
            </h3>
          </div>

          {/* Botão Fechar (x) */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors cursor-pointer"
            aria-label="Fechar modal"
            title="Fechar (X)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="space-y-4">
          {/* Texto Oficial */}
          <p className="text-sm text-neutral-300 leading-relaxed">
            {config.text}
          </p>

          {/* Seção de Link */}
          <div className="p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-neutral-400 font-medium">Link:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {config.links.map((linkItem, idx) => (
                <React.Fragment key={linkItem.id}>
                  <button
                    type="button"
                    onClick={() => handleLinkClick(linkItem)}
                    className="inline-flex items-center gap-1 font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    {config.isSupport && (
                      <Headphones className="w-3.5 h-3.5 mr-0.5 text-amber-400" />
                    )}
                    <span>{linkItem.label}</span>
                    <ArrowUpRight className="w-3 h-3 opacity-70" />
                  </button>
                  {idx < config.links.length - 1 && (
                    <span className="text-neutral-500 font-normal"> / </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé: Botão Ok, entendi! */}
        <div className="pt-2">
          <Button
            variant="primary"
            onClick={onClose}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-900/20 rounded-xl cursor-pointer"
          >
            Ok, entendi!
          </Button>
        </div>
      </div>
    </div>
  );
}
