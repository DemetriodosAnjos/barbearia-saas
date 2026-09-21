import { statCardStyles } from "./StatCard.styles";

export default function StatCard({
  title = "Métrica",
  value = "—", // Fallback neutro e limpo (sem valores inventados)
  icon = "📊",
  theme = "gold", // 'gold' | 'green' | 'blue' | 'purple'
  delta = null, // Por padrão sem comparativo, a menos que seja passado explicitamente
  isMasked = false, // Modo Privacidade ativado
  className = "",
}) {
  // Constante: resolve o estilo do ícone baseado no tema selecionado
  const iconThemeClass =
    statCardStyles.iconThemes[theme] || statCardStyles.iconThemes.gold;

  // Constante: avaliação defensiva de delta com optional chaining (evita erro se delta for null)
  const deltaStyle =
    delta?.isPositive === true
      ? statCardStyles.deltaPositive
      : delta?.isPositive === false
        ? statCardStyles.deltaNegative
        : statCardStyles.deltaNeutral;

  return (
    <div className={`${statCardStyles.container} ${className}`}>
      {/* 1. CABEÇALHO: Título e Ícone */}
      <div className={statCardStyles.header}>
        <div className={statCardStyles.titleWrapper}>
          <span className={statCardStyles.title}>{title}</span>
        </div>

        <div className={`${statCardStyles.iconWrapper} ${iconThemeClass}`}>
          {icon}
        </div>
      </div>

      {/* 2. VALOR PRINCIPAL (Visível ou Mascarado no Modo Privacidade) */}
      <div className="my-1">
        {isMasked ? (
          <span className={statCardStyles.maskedText}>••••••••</span>
        ) : (
          <span className={statCardStyles.valueText}>{value}</span>
        )}
      </div>

      {/* 3. RODAPÉ: Comparativo Percentual com Período Anterior */}
      {delta && (
        <div className={statCardStyles.footer}>
          <span className={`${statCardStyles.deltaBadge} ${deltaStyle}`}>
            <span>
              {delta.isPositive ? "▲" : delta.isPositive === false ? "▼" : "•"}
            </span>
            <span>{delta.value}</span>
          </span>

          {delta.comparisonText && (
            <span className={statCardStyles.comparisonText}>
              {delta.comparisonText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
