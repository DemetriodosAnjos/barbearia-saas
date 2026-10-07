import { Scissors, Clock, RotateCcw, Edit3, Trash2, Check, Plus } from "lucide-react";
import { serviceCardStyles } from "./ServiceCard.styles";

export default function ServiceCard({
  // [Remoção do mock fixo de Corte Degradê e inicialização segura como objeto vazio]
  service = {},
  isSelected = false,
  onToggleSelect,
  onEdit,
  onDelete,
  onRestore,
  disabled = false,
  className = "",
}) {
  // [Defesa: se o serviço for nulo ou sem nome, não quebra a interface]
  if (!service || !service.name) return null;

  // [Normalização defensiva suportando snake_case do Supabase e camelCase do React]
  const isInactive = service.active === false;
  const isManagementMode = Boolean(onEdit || onDelete || onRestore);
  const duration = service.durationMinutes ?? service.duration_minutes ?? 30;
  const commission = service.commissionPercent ?? service.commission_percent;
  const category = service.category || "Geral";
  const price = Number(service.price || 0);

  // [Correção]: No modo de gestão, NUNCA aplicamos pointer-events-none para permitir reativar!
  const currentState = isInactive
    ? "opacity-60 bg-neutral-950 border-neutral-800"
    : disabled
      ? serviceCardStyles.states.disabled
      : isSelected
        ? serviceCardStyles.states.selected
        : serviceCardStyles.states.default;

  const handleKeyDown = (e) => {
    if (!isManagementMode && !disabled && !isInactive && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      onToggleSelect && onToggleSelect(service);
    }
  };

  return (
    <div
      role={isManagementMode ? undefined : "checkbox"}
      aria-checked={isManagementMode ? undefined : isSelected}
      aria-label={`Serviço ${service.name}, categoria ${category}, duração ${duration} minutos, valor R$ ${price.toFixed(2).replace(".", ",")}${isSelected ? ", selecionado" : ""}`}
      tabIndex={isManagementMode || disabled || isInactive ? -1 : 0}
      onKeyDown={handleKeyDown}
      onClick={() =>
        !isManagementMode && !disabled && !isInactive && onToggleSelect && onToggleSelect(service)
      }
      className={`
        ${serviceCardStyles.container}
        ${currentState}
        focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none cursor-pointer select-none
        ${className}
      `}
    >
      {/* TOPO */}
      <div className={serviceCardStyles.header}>
        <div className="flex items-center gap-2">
          {/* [Exibição da categoria normalizada] */}
          <span className={serviceCardStyles.categoryBadge}>{category}</span>
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

        {/* [Exibição da comissão suportando tanto commission_percent quanto commissionPercent] */}
        {commission !== undefined && commission !== null && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
            <Scissors className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Comissão do Barbeiro: {commission}%</span>
          </div>
        )}
      </div>

      {/* RODAPÉ */}
      <div
        className={serviceCardStyles.footer}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* [Preço e duração reais com formatação defensiva] */}
          <span className={serviceCardStyles.priceText}>
            R$ {price.toFixed(2).replace(".", ",")}
          </span>
          <div className={serviceCardStyles.metaGroup}>
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 inline mr-1" />
            <span>{duration} min de cadeira</span>
          </div>
        </div>

        {isManagementMode ? (
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {isInactive ? (
              <button
                type="button"
                onClick={() => onRestore && onRestore(service)}
                className="text-xs font-bold py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-emerald-600 text-neutral-200 hover:text-white border border-neutral-700 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reativar</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onEdit && onEdit(service)}
                  className="text-xs font-bold py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete && onDelete(service)}
                  className="text-xs font-bold p-1.5 rounded-xl bg-neutral-800 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-neutral-700 hover:border-red-800/60 transition-colors cursor-pointer flex items-center justify-center"
                  title="Desativar serviço"
                  aria-label="Desativar serviço"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ) : (
          /* [Botão: inclusão de onClick no próprio botão para garantir resposta imediata ao toque do cliente] */
          <button
            type="button"
            onClick={() => onToggleSelect && onToggleSelect(service)}
            className={`
              ${serviceCardStyles.selectButton}
              ${isSelected ? serviceCardStyles.btnSelected : serviceCardStyles.btnDefault}
            `}
          >
            {isSelected ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Selecionado</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
