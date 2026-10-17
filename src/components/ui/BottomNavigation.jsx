import { bottomNavStyles } from "./BottomNavigation.styles";
import ProjectIcon from "./ProjectIcon";

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

  const renderIcon = (icon) => {
    if (!icon) return null;
    if (typeof icon === "string") {
      return <ProjectIcon name={icon} size={20} />;
    }
    return icon;
  };

  return (
    <nav
      className={`${containerClass} ${className}`}
      role="navigation"
      aria-label="Navegação inferior mobile"
      data-testid="bottom-navigation-bar"
    >
      <div className={bottomNavStyles.navGrid}>
        {items.map((item, idx) => {
          const isActive =
            item.isActive !== undefined ? item.isActive : activeItem === item.id;

          // Se for o botão central em destaque (ex: Novo Atendimento - coluna 3)
          if (item.isCenterAction) {
            return (
              <div
                key={item.id || idx}
                className="flex justify-center items-center w-full"
              >
                <button
                  type="button"
                  onClick={() =>
                    item.onClick ? item.onClick() : onChange && onChange(item.id)
                  }
                  className={bottomNavStyles.centerButtonWrapper}
                  aria-label={item.ariaLabel || item.title || item.label}
                  title={item.title || item.label}
                  data-nav-center="true"
                  data-testid="bottom-nav-cta-center"
                >
                  <div className={bottomNavStyles.centerButton}>
                    {renderIcon(item.icon)}
                  </div>
                  <span className={bottomNavStyles.centerLabel}>
                    {item.label}
                  </span>
                </button>
              </div>
            );
          }

          // Abas normais (2 à esquerda e 2 à direita no layout 2+1+2)
          return (
            <div
              key={item.id || idx}
              className="flex justify-center items-center w-full"
            >
              <button
                type="button"
                onClick={() =>
                  item.onClick ? item.onClick() : onChange && onChange(item.id)
                }
                className={`
                  ${bottomNavStyles.tabButton}
                  ${isActive ? bottomNavStyles.tabActive : bottomNavStyles.tabInactive}
                `}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.ariaLabel || item.title || item.label}
                title={item.title || item.label}
                data-nav-item={item.id}
                data-testid={`bottom-nav-${item.id}`}
              >
                {/* Ícone com suporte a Badge de contador */}
                <div className={bottomNavStyles.iconWrapper}>
                  <div className="flex items-center justify-center">
                    {renderIcon(item.icon)}
                  </div>
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

                {/* Pontinho sutil indicando seleção ativa */}
                {isActive && <span className={bottomNavStyles.activeIndicator} />}
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
