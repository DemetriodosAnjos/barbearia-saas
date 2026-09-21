import { loyaltyStyles } from "./LoyaltyCard.styles";
import Button from "../ui/Button";

export default function LoyaltyCard({
  totalStampsRequired = 10,
  currentStamps = 0, // Inicia em zero para clientes novos (sem mock)
  rewardDescription = "1 Corte de Cabelo Grátis",
  expirationDate = null,
  clientName = "Cliente",
  onRedeem,
  className = "",
}) {
  // Constantes e Cálculos: proteção numérica e cálculo real de progresso
  const safeCurrentStamps = Number(currentStamps || 0);
  const safeTotalRequired = Math.max(1, Number(totalStampsRequired || 10));

  const isCompleted = safeCurrentStamps >= safeTotalRequired;
  const stampsRemaining = Math.max(0, safeTotalRequired - safeCurrentStamps);
  const progressPercent = Math.min(
    100,
    (safeCurrentStamps / safeTotalRequired) * 100,
  );

  const cardStyle = isCompleted
    ? loyaltyStyles.cardCompleted
    : loyaltyStyles.cardInProgress;

  return (
    <div className={`${loyaltyStyles.card} ${cardStyle} ${className}`}>
      {/* 1. CABEÇALHO DO CARTÃO */}
      <div className={loyaltyStyles.header}>
        <div className={loyaltyStyles.brandInfo}>
          <div className={loyaltyStyles.brandIcon}>💈</div>
          <div>
            <h3 className={loyaltyStyles.title}>Cartão Fidelidade Digital</h3>
            <p className={loyaltyStyles.clientName}>{clientName}</p>
          </div>
        </div>

        {/* Selo indicativo de status com valores reais */}
        {isCompleted ? (
          <span className={loyaltyStyles.rewardBadgeReady}>
            🎁 Prêmio Disponível!
          </span>
        ) : (
          <span className={loyaltyStyles.rewardBadgePending}>
            {safeCurrentStamps} de {safeTotalRequired} selos
          </span>
        )}
      </div>

      {/* 2. GRADE COM OS CARIMBOS (1 até totalStampsRequired) */}
      <div className={loyaltyStyles.stampsGrid}>
        {Array.from({ length: totalStampsRequired }, (_, i) => {
          const stampNumber = i + 1;
          const isStamped = stampNumber <= currentStamps;
          const isLastSlot = stampNumber === totalStampsRequired;

          // Se for o último slot (recompensa especial)
          if (isLastSlot) {
            return (
              <div
                key={stampNumber}
                className={`
                  ${loyaltyStyles.stampSlot}
                  ${isCompleted ? loyaltyStyles.stampGiftReady : loyaltyStyles.stampGiftSlot}
                `}
                title={
                  isCompleted
                    ? "Recompensa Liberada!"
                    : `Meta final: ${rewardDescription}`
                }
              >
                <span className="text-base">{isCompleted ? "★" : "🎁"}</span>
                <span className="text-[9px] font-extrabold uppercase mt-0.5">
                  Grátis
                </span>
              </div>
            );
          }

          // Slots normais
          return (
            <div
              key={stampNumber}
              className={`
                ${loyaltyStyles.stampSlot}
                ${isStamped ? loyaltyStyles.stampFilled : loyaltyStyles.stampEmpty}
              `}
              title={
                isStamped
                  ? `Selo #${stampNumber} conquistado!`
                  : `Selo #${stampNumber}`
              }
            >
              {isStamped ? (
                <span className={loyaltyStyles.stampFilledIcon}>✂️</span>
              ) : (
                <span className={loyaltyStyles.stampNumber}>{stampNumber}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. BARRA DE PROGRESSO E META */}
      <div className={loyaltyStyles.progressSection}>
        <div className={loyaltyStyles.progressTextWrapper}>
          <span className="text-neutral-300">
            {isCompleted
              ? "Meta alcançada! Apresente este cartão no caixa."
              : `Faltam ${stampsRemaining} ${stampsRemaining === 1 ? "corte" : "cortes"} para o seu prêmio`}
          </span>
          <span className="text-amber-400 font-mono font-bold">
            {Math.round(progressPercent)}%
          </span>
        </div>

        <div className={loyaltyStyles.progressBarBg}>
          <div
            className={loyaltyStyles.progressBarFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 4. RODAPÉ DO CARTÃO (PRÊMIO, VALIDADE E RESGATE) */}
      <div className={loyaltyStyles.footer}>
        <div>
          <p className={loyaltyStyles.rewardDetails}>
            Recompensa:{" "}
            <strong className="text-amber-400 font-bold">
              {rewardDescription}
            </strong>
          </p>
          {expirationDate ? (
            <p className={loyaltyStyles.expirationText}>
              Selos válidos até: {expirationDate}
            </p>
          ) : (
            <p className={loyaltyStyles.expirationText}>
              Selos sem data de expiração (acumulativos)
            </p>
          )}
        </div>

        {/* Botão de Resgate liberado apenas com 100% dos selos */}
        {isCompleted && (
          <Button
            variant="primary"
            onClick={onRedeem}
            className="text-xs py-2 px-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black shadow-lg"
          >
            Resgatar Prêmio
          </Button>
        )}
      </div>
    </div>
  );
}
