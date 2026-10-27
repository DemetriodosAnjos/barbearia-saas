import { Dices, Star, Check, Scissors } from "lucide-react";
import { professionalCardStyles } from "./ProfessionalCard.styles";

export default function ProfessionalCard({
  // Suporta tanto a prop professional quanto barber de forma intercambiável
  professional,
  barber,
  isSelected = false,
  onSelect,
  disabled = false,
  className = "",
}) {
  const activeProfessional = professional || barber || {};

  // [Defesa: se o objeto for nulo, não quebra a interface da listagem]
  if (!activeProfessional || Object.keys(activeProfessional).length === 0) return null;

  // [Normalização defensiva de chaves suportando Supabase (snake_case) e React (camelCase)]
  const name = activeProfessional.name || activeProfessional.display_name || "Profissional";
  const role = activeProfessional.role || "Barbeiro";
  const isAny = Boolean(
    activeProfessional.isAnyProfessional || activeProfessional.is_any_professional,
  );
  const avatar =
    activeProfessional.avatar || (name ? name.slice(0, 2).toUpperCase() : null);
  const rating =
    activeProfessional.rating !== undefined && activeProfessional.rating !== null
      ? Number(activeProfessional.rating)
      : null;
  const reviewCount = activeProfessional.reviewCount ?? activeProfessional.review_count;
  const specialties = Array.isArray(activeProfessional.specialties)
    ? activeProfessional.specialties
    : [];
  const isAvailable =
    activeProfessional.isAvailable ??
    (activeProfessional.status !== "unavailable" && activeProfessional.status !== "off");
  const nextSlot =
    activeProfessional.nextAvailableSlot ||
    activeProfessional.next_available_slot ||
    "Disponível Hoje";

  // [Variáveis: cálculo do estado visual de seleção e bloqueio do card]
  const currentState = disabled
    ? professionalCardStyles.states.disabled
    : isSelected
      ? professionalCardStyles.states.selected
      : professionalCardStyles.states.default;

  const handleClick = () => {
    if (!disabled && onSelect) {
      onSelect(activeProfessional);
    }
  };

  const handleKeyDown = (e) => {
    if (!disabled && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      aria-label={`Selecionar profissional ${name}, ${role}${rating ? `, avaliação ${rating} estrelas` : ""}${isSelected ? ", selecionado" : ""}`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={`
        ${professionalCardStyles.container}
        ${currentState}
        focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none cursor-pointer select-none
        ${className}
      `}
    >
      {/* 1. CABEÇALHO: Avatar, Nome, Cargo e Nota de Avaliação */}
      <div className={professionalCardStyles.header}>
        <div className={professionalCardStyles.profileGroup}>
          {/* [Avatar com iniciais seguras ou ícone dinâmico] */}
          <div
            className={
              isAny
                ? professionalCardStyles.avatarAny
                : professionalCardStyles.avatar
            }
          >
            {isAny ? (
              <Dices className="w-6 h-6 text-amber-400" />
            ) : avatar ? (
              avatar
            ) : (
              <Scissors className="w-5 h-5 text-amber-400" />
            )}
          </div>

          <div className={professionalCardStyles.nameWrapper}>
            {/* [Exibição do nome e cargo reais do profissional cadastrado] */}
            <h3 className={professionalCardStyles.name}>{name}</h3>
            <p className={professionalCardStyles.role}>{role}</p>
          </div>
        </div>

        {/* [Avaliação real por estrelas suportando review_count do Supabase] */}
        {!isAny && rating !== null && (
          <div
            className={professionalCardStyles.ratingBadge}
            title={`Nota ${rating.toFixed(1)} de 5.0`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 inline mr-0.5" />
            <span className={professionalCardStyles.ratingScore}>
              {rating.toFixed(1)}
            </span>
            {reviewCount !== undefined && reviewCount !== null && (
              <span className={professionalCardStyles.reviewCount}>
                ({reviewCount})
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. CENTRO: Pílulas de Especialidades Reais */}
      {specialties.length > 0 && (
        <div className={professionalCardStyles.specialtiesWrapper}>
          {/* [Array map: renderização das especialidades reais do barbeiro] */}
          {specialties.map((spec, idx) => (
            <span key={idx} className={professionalCardStyles.specialtyTag}>
              {spec}
            </span>
          ))}
        </div>
      )}

      {/* 3. RODAPÉ: Próximo Horário Vago e Botão de Ação */}
      <div className={professionalCardStyles.footer}>
        {/* [Status de Disponibilidade real da agenda do profissional] */}
        {isAvailable ? (
          <div className={professionalCardStyles.nextSlotText}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{nextSlot}</span>
          </div>
        ) : (
          <div className={professionalCardStyles.nextSlotOff}>
            <span className="w-2 h-2 rounded-full bg-neutral-600" />
            <span>Sem horários hoje</span>
          </div>
        )}

        {/* Botão de Seleção */}
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className={`
            ${professionalCardStyles.selectButton}
            ${isSelected ? professionalCardStyles.btnSelected : professionalCardStyles.btnDefault}
          `}
        >
          {isSelected ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Escolhido</span>
            </>
          ) : (
            <span>Escolher</span>
          )}
        </button>
      </div>
    </div>
  );
}
