import { bottomNavStyles } from "./BottomNavigation.styles";

export default function BottomNavigation({
  items = [],
  activeItem,
  onChange,
  fixed = true, // 'true' para fixar no rodapé da janela, 'false' para preview embutido
  className = "",
}) {
  const containerClass = fixed
    ? bottomNavStyles.containerFixed
    : bottomNavStyles.containerStatic;

  return (
    <nav
      className={`${containerClass} ${className}`}
      role="navigation"
      aria-label="Navegação inferior do cliente"
    >
      {items.map((item) => {
        const isActive = activeItem === item.id;

        // Se for o botão central em destaque (ex: Botão Agendar)
        if (item.isCenterAction) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={bottomNavStyles.centerButtonWrapper}
              aria-label={item.label}
            >
              <div className={bottomNavStyles.centerButton}>{item.icon}</div>
              <span className={bottomNavStyles.centerLabel}>{item.label}</span>
            </button>
          );
        }

        // Abas normais
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`
              ${bottomNavStyles.tabButton}
              ${isActive ? bottomNavStyles.tabActive : bottomNavStyles.tabInactive}
            `}
            aria-current={isActive ? "page" : undefined}
          >
            {/* Ícone com suporte a Badge de contador */}
            <div className={bottomNavStyles.iconWrapper}>
              <span className="text-lg">{item.icon}</span>
              {item.badge && (
                <span className={bottomNavStyles.badge}>{item.badge}</span>
              )}
            </div>

            {/* Texto da Aba */}
            <span
              className={`
                ${bottomNavStyles.label}
                ${isActive ? bottomNavStyles.labelActive : ""}
              `}
            >
              {item.label}
            </span>

            {/* Pontinho sutil indicando seleção */}
            {isActive && <span className={bottomNavStyles.activeIndicator} />}
          </button>
        );
      })}
    </nav>
  );
}
