import { cardStyles } from "./Card.styles";
import Skeleton from "./Skeleton";

export default function Card({
  title,
  description,
  headerAction,
  footer,
  children,
  variant = "default",
  isClickable = false,
  isSelected = false,
  isLoading = false,
  padding = "md",
  onClick,
  className = "",
  ...props
}) {
  const resolvedVariant = isSelected
    ? "selected"
    : isClickable || onClick
      ? "clickable"
      : variant;

  const variantClass =
    cardStyles.variants[resolvedVariant] || cardStyles.variants.default;
  const paddingClass = cardStyles.paddings[padding] || cardStyles.paddings.md;

  return (
    <div
      onClick={onClick}
      className={`
        ${cardStyles.base}
        ${variantClass}
        ${paddingClass}
        ${className}
      `}
      {...props}
    >
      {/* 1. CABEÇALHO */}
      {(title || description || headerAction) && (
        <div className={cardStyles.header}>
          <div className={cardStyles.titleWrapper}>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton variant="text" width="160px" height="18px" />
                <Skeleton variant="text" width="220px" height="12px" />
              </div>
            ) : (
              <>
                {title && <h3 className={cardStyles.title}>{title}</h3>}
                {description && (
                  <p className={cardStyles.description}>{description}</p>
                )}
              </>
            )}
          </div>

          {headerAction && !isLoading && (
            <div
              className={cardStyles.headerAction}
              onClick={(e) => e.stopPropagation()}
            >
              {headerAction}
            </div>
          )}
        </div>
      )}

      {/* 2. CORPO */}
      <div className={cardStyles.body}>
        {isLoading ? (
          <div className="space-y-2.5 py-2">
            <Skeleton variant="text" width="100%" height="14px" />
            <Skeleton variant="text" width="85%" height="14px" />
            <Skeleton variant="rounded" width="100%" height="36px" />
          </div>
        ) : (
          children
        )}
      </div>

      {/* 3. RODAPÉ */}
      {footer && (
        <div className={cardStyles.footer} onClick={(e) => e.stopPropagation()}>
          {isLoading ? (
            <Skeleton variant="text" width="120px" height="14px" />
          ) : (
            footer
          )}
        </div>
      )}
    </div>
  );
}
