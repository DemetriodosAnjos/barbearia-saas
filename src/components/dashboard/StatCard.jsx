import { statCardStyles } from "./StatCard.styles";
import ProjectIcon from "../ui/ProjectIcon";

export default function StatCard({
  title = "Métrica",
  value = "—", // Fallback neutro e limpo (sem valores inventados)
  icon = "barChart",
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
          {typeof icon === "string" ? (
            <ProjectIcon name={icon} size={18} colorVariant="inherit" />
          ) : (
            icon
          )}
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
            <span className="flex items-center">
              {delta.isPositive ? (
                <ProjectIcon name="TrendingUp" size={12} colorVariant="inherit" />
              ) : delta.isPositive === false ? (
                <ProjectIcon name="TrendingDown" size={12} colorVariant="inherit" />
              ) : (
                <ProjectIcon name="Minus" size={12} colorVariant="inherit" />
              )}
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
