import { serviceCardStyles } from "./ServiceCard.styles";

export default function ServiceCard({
  service = {
    id: "serv-1",
    name: "Corte Degradê Navalhado",
    description:
      "Acabamento com navalha, toalha quente e finalização com pomada.",
    category: "Cabelo",
    durationMinutes: 40,
    price: 55,
    commissionPercent: 50,
    active: true,
    tag: "Mais Pedido ⭐",
  },
  isSelected = false,
  onToggleSelect,
  onEdit,
  onDelete,
  onRestore,
  disabled = false,
  className = "",
}) {
  const isInactive = service.active === false;
  const isManagementMode = Boolean(onEdit || onDelete || onRestore);

  // 👇 CORREÇÃO: No modo de gestão, NUNCA aplicamos pointer-events-none para permitir reativar!
  const currentState = isInactive
    ? "opacity-60 bg-neutral-950 border-neutral-800"
    : disabled
      ? serviceCardStyles.states.disabled
      : isSelected
        ? serviceCardStyles.states.selected
        : serviceCardStyles.states.default;

  return (
    <div
      onClick={() =>
        !isManagementMode && onToggleSelect && onToggleSelect(service)
      }
      className={`
        ${serviceCardStyles.container}
        ${currentState}
        ${className}
      `}
    >
      {/* TOPO */}
      <div className={serviceCardStyles.header}>
        <div className="flex items-center gap-2">
          <span className={serviceCardStyles.categoryBadge}>
            {service.category}
          </span>
          {isInactive && (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-red-950/60 text-red-400 border border-red-800/60">
              Desativado
            </span>
          )}
        </div>

        {service.tag && !isInactive && (
          <span className={serviceCardStyles.promoBadge}>{service.tag}</span>
        )}
      </div>

      {/* CENTRO */}
      <div className="flex-1 my-1">
        <h3 className={serviceCardStyles.title}>{service.name}</h3>
        {service.description && (
          <p className={serviceCardStyles.description}>{service.description}</p>
        )}

        {service.commissionPercent !== undefined && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
            <span>✂️</span>
            <span>Comissão do Barbeiro: {service.commissionPercent}%</span>
          </div>
        )}
      </div>

      {/* RODAPÉ */}
      <div
        className={serviceCardStyles.footer}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <span className={serviceCardStyles.priceText}>
            R${" "}
            {Number(service.price || 0)
              .toFixed(2)
              .replace(".", ",")}
          </span>
          <div className={serviceCardStyles.metaGroup}>
            <span className={serviceCardStyles.durationIcon}>⏱️</span>
            <span>{service.durationMinutes} min de cadeira</span>
          </div>
        </div>

        {isManagementMode ? (
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {isInactive ? (
              <button
                type="button"
                onClick={() => onRestore && onRestore(service)}
                className="text-xs font-bold py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-emerald-600 text-neutral-200 hover:text-white border border-neutral-700 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                ↺ Reativar
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onEdit && onEdit(service)}
                  className="text-xs font-bold py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
                >
                  ✏️ Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDelete && onDelete(service)}
                  className="text-xs font-bold p-1.5 rounded-xl bg-neutral-800 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-neutral-700 hover:border-red-800/60 transition-colors cursor-pointer"
                  title="Desativar serviço"
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            className={`
              ${serviceCardStyles.selectButton}
              ${isSelected ? serviceCardStyles.btnSelected : serviceCardStyles.btnDefault}
            `}
          >
            {isSelected ? "✓ Selecionado" : "+ Adicionar"}
          </button>
        )}
      </div>
    </div>
  );
}
