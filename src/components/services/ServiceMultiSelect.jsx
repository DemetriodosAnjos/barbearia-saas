import { useState } from "react";
import { serviceMultiSelectStyles } from "./ServiceMultiSelect.styles";
import ServiceCard from "./ServiceCard";
import Button from "../ui/Button";

export default function ServiceMultiSelect({
  services = [],
  selectedServices = [], // Array de objetos de serviços selecionados
  onChange,
  onContinue,
  className = "",
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  // 1. Extrai categorias únicas dinamicamente a partir dos serviços fornecidos
  const categories = [
    { id: "all", label: "Todos os Serviços" },
    ...Array.from(new Set(services.map((s) => s.category))).map((cat) => ({
      id: cat,
      label: cat,
    })),
  ];

  // 2. Filtra os serviços pela categoria ativa
  const filteredServices =
    selectedCategory === "all"
      ? services
      : services.filter((s) => s.category === selectedCategory);

  // 3. Alterna a seleção de um serviço (Adicionar / Remover)
  const handleToggleSelect = (service) => {
    const isAlreadySelected = selectedServices.some((s) => s.id === service.id);
    let updated;

    if (isAlreadySelected) {
      updated = selectedServices.filter((s) => s.id !== service.id);
    } else {
      updated = [...selectedServices, service];
    }

    if (onChange) onChange(updated);
  };

  // 4. Limpa todos os serviços marcados
  const handleClearAll = () => {
    if (onChange) onChange([]);
  };

  // 5. Cálculos Matemáticos Automáticos (Tempo Total e Preço Total)
  const totalDurationMinutes = selectedServices.reduce(
    (acc, curr) => acc + (curr.durationMinutes || 0),
    0,
  );

  const totalPrice = selectedServices.reduce(
    (acc, curr) => acc + (Number(curr.price) || 0),
    0,
  );

  // Converte minutos para formato amigável (ex: 85 min vira "1h 25min")
  const formatTotalTime = (minutes) => {
    if (minutes === 0) return "0 min";
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) return `${remainingMinutes} min`;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}min`;
  };

  const hasSelections = selectedServices.length > 0;

  return (
    <div className={`${serviceMultiSelectStyles.container} ${className}`}>
      {/* 1. TOPO: Título e Filtros de Categoria */}
      <div className={serviceMultiSelectStyles.header}>
        <div className={serviceMultiSelectStyles.titleWrapper}>
          <h2 className={serviceMultiSelectStyles.title}>
            Escolha os Serviços do seu Atendimento
          </h2>
          <p className={serviceMultiSelectStyles.subtitle}>
            Você pode combinar múltiplos serviços em um único agendamento (ex:
            Cabelo + Barba).
          </p>
        </div>

        {/* Pílulas de Categoria */}
        <div className={serviceMultiSelectStyles.categoriesWrapper}>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`
                  ${serviceMultiSelectStyles.categoryPill}
                  ${isActive ? serviceMultiSelectStyles.categoryActive : serviceMultiSelectStyles.categoryInactive}
                `}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. GRADE DE SERVIÇOS DISPONÍVEIS */}
      <div className={serviceMultiSelectStyles.servicesGrid}>
        {filteredServices.map((service) => {
          const isSelected = selectedServices.some((s) => s.id === service.id);

          return (
            <ServiceCard
              key={service.id}
              service={service}
              isSelected={isSelected}
              onToggleSelect={handleToggleSelect}
            />
          );
        })}
      </div>

      {/* 3. BARRA DE RESUMO INFERIOR (CARRINHO / DOCK) */}
      <div className={serviceMultiSelectStyles.summaryDock}>
        <div className={serviceMultiSelectStyles.totalsGroup}>
          {/* Contador de Itens */}
          <div className={serviceMultiSelectStyles.metricBox}>
            <span className={serviceMultiSelectStyles.metricLabel}>
              Selecionados
            </span>
            <span className="text-sm font-bold text-neutral-200">
              {selectedServices.length}{" "}
              {selectedServices.length === 1 ? "serviço" : "serviços"}
            </span>
          </div>

          {/* Duração Total Formatada */}
          <div className={serviceMultiSelectStyles.metricBox}>
            <span className={serviceMultiSelectStyles.metricLabel}>
              Tempo Estimado
            </span>
            <span className={serviceMultiSelectStyles.metricValueTime}>
              <span>⏱️</span>
              <span>{formatTotalTime(totalDurationMinutes)}</span>
            </span>
          </div>

          {/* Preço Total em Reais */}
          <div className={serviceMultiSelectStyles.metricBox}>
            <span className={serviceMultiSelectStyles.metricLabel}>
              Valor Total
            </span>
            <span className={serviceMultiSelectStyles.metricValuePrice}>
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>

        {/* Ações (Limpar e Avançar) */}
        <div className={serviceMultiSelectStyles.actionsGroup}>
          {hasSelections && (
            <button
              type="button"
              onClick={handleClearAll}
              className={serviceMultiSelectStyles.clearButton}
            >
              Limpar Seleção
            </button>
          )}

          <Button
            variant="primary"
            disabled={!hasSelections}
            onClick={onContinue}
            className="w-full sm:w-auto"
          >
            Avançar para Escolha do Barbeiro ➔
          </Button>
        </div>
      </div>
    </div>
  );
}
