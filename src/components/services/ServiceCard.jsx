import { serviceCardStyles } from "./ServiceCard.styles";

export default function ServiceCard({
  service = {
    id: "serv-1",
    name: "Corte Degradê Navalhado",
    description:
      "Acabamento com navalha, toalha quente e finalização com pomada modeladora.",
    category: "Cabelo",
    durationMinutes: 40,
    price: 55,
    tag: "Mais Pedido ⭐", // Opcional: tag promocional ou destaque
  },
  isSelected = false,
  onToggleSelect,
  disabled = false,
  className = "",
}) {
  const currentState = disabled
    ? serviceCardStyles.states.disabled
    : isSelected
      ? serviceCardStyles.states.selected
      : serviceCardStyles.states.default;

  const handleCardClick = () => {
    if (!disabled && onToggleSelect) {
      onToggleSelect(service);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`
        ${serviceCardStyles.container}
        ${currentState}
        ${className}
      `}
    >
      {/* 1. TOPO: Categoria e Selo de Destaque */}
      <div className={serviceCardStyles.header}>
        <span className={serviceCardStyles.categoryBadge}>
          {service.category}
        </span>

        {service.tag && (
          <span className={serviceCardStyles.promoBadge}>{service.tag}</span>
        )}
      </div>

      {/* 2. CENTRO: Nome e Descrição */}
      <div className="flex-1">
        <h3 className={serviceCardStyles.title}>{service.name}</h3>
        {service.description && (
          <p className={serviceCardStyles.description}>{service.description}</p>
        )}
      </div>

      {/* 3. RODAPÉ: Duração, Preço e Botão de Ação */}
      <div className={serviceCardStyles.footer}>
        <div>
          <span className={serviceCardStyles.priceText}>
            R$ {Number(service.price).toFixed(2).replace(".", ",")}
          </span>
          <div className={serviceCardStyles.metaGroup}>
            <span className={serviceCardStyles.durationIcon}>⏱️</span>
            <span>{service.durationMinutes} min</span>
          </div>
        </div>

        {/* Botão de Alternância de Seleção */}
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation(); // Evita duplo clique
            handleCardClick();
          }}
          className={`
            ${serviceCardStyles.selectButton}
            ${isSelected ? serviceCardStyles.btnSelected : serviceCardStyles.btnDefault}
          `}
        >
          {isSelected ? (
            <>
              <span>✓</span>
              <span>Selecionado</span>
            </>
          ) : (
            <span>+ Adicionar</span>
          )}
        </button>
      </div>
    </div>
  );
}
