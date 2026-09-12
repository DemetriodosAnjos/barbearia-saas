import { professionalCardStyles } from "./ProfessionalCard.styles";

export default function ProfessionalCard({
  professional = {
    id: "prof-1",
    name: "Carlos Silva",
    role: "Master Barber",
    avatar: "CS",
    rating: 4.9,
    reviewCount: 142,
    specialties: ["Degradê", "Barboterapia", "Navalha"],
    nextAvailableSlot: "Hoje às 14:30",
    isAvailable: true,
    isAnyProfessional: false, // Caso seja a opção "Qualquer Profissional"
  },
  isSelected = false,
  onSelect,
  disabled = false,
  className = "",
}) {
  const currentState = disabled
    ? professionalCardStyles.states.disabled
    : isSelected
      ? professionalCardStyles.states.selected
      : professionalCardStyles.states.default;

  const handleClick = () => {
    if (!disabled && onSelect) {
      onSelect(professional);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        ${professionalCardStyles.container}
        ${currentState}
        ${className}
      `}
    >
      {/* 1. CABEÇALHO: Avatar, Nome, Cargo e Nota de Avaliação */}
      <div className={professionalCardStyles.header}>
        <div className={professionalCardStyles.profileGroup}>
          {/* Avatar com foto/iniciais ou ícone de dados aleatórios */}
          <div
            className={
              professional.isAnyProfessional
                ? professionalCardStyles.avatarAny
                : professionalCardStyles.avatar
            }
          >
            {professional.isAnyProfessional
              ? "🎲"
              : professional.avatar ||
                professional.name.slice(0, 2).toUpperCase()}
          </div>

          <div className={professionalCardStyles.nameWrapper}>
            <h3 className={professionalCardStyles.name}>{professional.name}</h3>
            <p className={professionalCardStyles.role}>{professional.role}</p>
          </div>
        </div>

        {/* Avaliação por Estrelas (oculta se for "Qualquer Profissional") */}
        {!professional.isAnyProfessional && professional.rating && (
          <div
            className={professionalCardStyles.ratingBadge}
            title={`Nota ${professional.rating} de 5.0`}
          >
            <span className={professionalCardStyles.starIcon}>★</span>
            <span className={professionalCardStyles.ratingScore}>
              {professional.rating.toFixed(1)}
            </span>
            {professional.reviewCount && (
              <span className={professionalCardStyles.reviewCount}>
                ({professional.reviewCount})
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. CENTRO: Pílulas de Especialidades */}
      {professional.specialties && professional.specialties.length > 0 && (
        <div className={professionalCardStyles.specialtiesWrapper}>
          {professional.specialties.map((spec, idx) => (
            <span key={idx} className={professionalCardStyles.specialtyTag}>
              {spec}
            </span>
          ))}
        </div>
      )}

      {/* 3. RODAPÉ: Próximo Horário Vago e Botão de Ação */}
      <div className={professionalCardStyles.footer}>
        {/* Status de Disponibilidade */}
        {professional.isAvailable ? (
          <div className={professionalCardStyles.nextSlotText}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{professional.nextAvailableSlot || "Disponível Hoje"}</span>
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
              <span>✓</span>
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
