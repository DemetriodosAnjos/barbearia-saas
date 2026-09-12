import { subscriptionStyles } from "./SubscriptionBadge.styles";
import Button from "../ui/Button";

export default function SubscriptionBadge({
  subscription = {
    planName: "Clube VIP Barba & Cabelo",
    monthlyPrice: 119.9,
    status: "active", // 'active' | 'overdue' | 'cancelled'
    quotaType: "limited", // 'limited' ou 'unlimited'
    totalQuota: 4,
    usedQuota: 2,
    renewalDate: "15/10/2026",
  },
  variant = "badge", // 'badge' (compacto) ou 'card' (detalhado)
  onManage,
  onSettleDebt,
  className = "",
}) {
  const isOverdue = subscription.status === "overdue";
  const isCancelled = subscription.status === "cancelled";
  const isUnlimited = subscription.quotaType === "unlimited";

  const remainingQuota = isUnlimited
    ? "Ilimitado"
    : Math.max(0, subscription.totalQuota - subscription.usedQuota);

  const quotaPercent = isUnlimited
    ? 100
    : Math.min(100, (subscription.usedQuota / subscription.totalQuota) * 100);

  // Status visual amigável
  const statusLabels = {
    active: { label: "Plano Ativo", dot: "bg-emerald-400" },
    overdue: { label: "Pagamento Pendente ⚠️", dot: "bg-amber-400" },
    cancelled: { label: "Cancelado", dot: "bg-neutral-500" },
  };

  const currentStatus =
    statusLabels[subscription.status] || statusLabels.active;

  // ==========================================
  // 1. RENDERIZAÇÃO COMPACTA (PÍLULA / BADGE)
  // ==========================================
  if (variant === "badge") {
    const badgeColor =
      subscriptionStyles.statusBadge[subscription.status] ||
      subscriptionStyles.statusBadge.active;

    return (
      <span
        className={`${subscriptionStyles.badgeBase} ${badgeColor} ${className}`}
      >
        <span className={`w-2 h-2 rounded-full ${currentStatus.dot}`} />
        <span>{subscription.planName}</span>
        <span className="opacity-60">•</span>
        <span className="font-mono">
          {isUnlimited ? "∞ Ilimitado" : `${remainingQuota} restantes`}
        </span>
      </span>
    );
  }

  // ==========================================
  // 2. RENDERIZAÇÃO DETALHADA (CARD / WIDGET)
  // ==========================================
  const cardColor =
    subscriptionStyles.cardStatus[subscription.status] ||
    subscriptionStyles.cardStatus.active;

  return (
    <div
      className={`${subscriptionStyles.cardContainer} ${cardColor} ${className}`}
    >
      {/* Cabeçalho do Card */}
      <div className={subscriptionStyles.cardHeader}>
        <div>
          <h4 className={subscriptionStyles.planName}>
            <span>👑</span>
            <span>{subscription.planName}</span>
          </h4>
          <p className={subscriptionStyles.planPrice}>
            R$ {Number(subscription.monthlyPrice).toFixed(2).replace(".", ",")}
            /mês
          </p>
        </div>

        <span
          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
            isOverdue
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
              : isCancelled
                ? "bg-neutral-800 text-neutral-400 border-neutral-700"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
          }`}
        >
          {currentStatus.label}
        </span>
      </div>

      {/* Alerta de Inadimplência (se houver falha no cartão) */}
      {isOverdue && (
        <div className={subscriptionStyles.overdueAlert}>
          <span>⚠️</span>
          <span className="text-[11px] leading-tight flex-1">
            Falha na cobrança automática. Regularize a fatura para liberar os
            cortes do mês.
          </span>
        </div>
      )}

      {/* Barra de Consumo de Franquia */}
      <div className={subscriptionStyles.quotaWrapper}>
        <div className={subscriptionStyles.quotaTextRow}>
          <span className="text-neutral-400 text-xs">Franquia Mensal:</span>
          <span className="font-bold text-neutral-100 font-mono">
            {isUnlimited
              ? "Cortes Ilimitados 🌟"
              : `${subscription.usedQuota} de ${subscription.totalQuota} cortes utilizados`}
          </span>
        </div>

        {!isUnlimited && (
          <div className={subscriptionStyles.quotaBarBg}>
            <div
              className={subscriptionStyles.quotaBarFill}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Rodapé (Data de Renovação e Ações) */}
      <div className={subscriptionStyles.cardFooter}>
        <div>
          <span>Renovação: </span>
          <span className={subscriptionStyles.renewalDate}>
            {subscription.renewalDate}
          </span>
        </div>

        {isOverdue ? (
          <Button
            variant="danger"
            onClick={onSettleDebt}
            className="text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-500 border-none text-neutral-950 font-black"
          >
            Pagar Fatura
          </Button>
        ) : (
          <button
            type="button"
            onClick={onManage}
            className="text-xs font-semibold text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
          >
            Gerenciar Plano ➔
          </button>
        )}
      </div>
    </div>
  );
}
