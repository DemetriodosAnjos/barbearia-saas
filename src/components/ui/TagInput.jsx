import { useState } from "react";
import { tagInputStyles } from "./TagInput.styles";
import ProjectIcon from "./ProjectIcon";

export default function TagInput({
  label = "Especialidades de Atendimento",
  tags = [],
  onChange,
  placeholder = "Adicionar especialidade + TAB",
  suggestions = [
    "Massoterapia",
    "Degradê Navalhado",
    "Barboterapia",
    "Platinado / Nevou",
    "Sobrancelha",
    "Visagismo",
  ],
  className = "",
}) {
  const [inputValue, setInputValue] = useState("");

  // Adiciona a tag na lista ativa
  const addTag = (text) => {
    const clean = text.trim().replace(/,/g, "");
    if (!clean) return;

    // Evita tags duplicadas
    if (!tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      if (onChange) onChange([...tags, clean]);
    }
    setInputValue("");
  };

  // Suporte a teclas TAB, Enter e Vírgula
  const handleKeyDown = (e) => {
    if (e.key === "Tab" || e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  // Remove da lista ativa (volta a ficar disponível nas sugestões!)
  const removeTag = (tagToRemove) => {
    if (onChange) onChange(tags.filter((t) => t !== tagToRemove));
  };

  // Sugestões que ainda NÃO foram selecionadas
  const availableSuggestions = suggestions.filter(
    (sug) => !tags.some((t) => t.toLowerCase() === sug.toLowerCase()),
  );

  return (
    <div className={`${tagInputStyles.container} ${className}`}>
      {/* Rótulo */}
      <div className={tagInputStyles.labelWrapper}>
        {label && <label className={tagInputStyles.label}>{label}</label>}
        <span className={tagInputStyles.counterText}>
          {tags.length} selecionada{tags.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* 1. CAMPO INPUT LIMPO COM O PLACEHOLDER SOLICITADO */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(inputValue)}
        placeholder={placeholder}
        className={tagInputStyles.input}
      />

      {/* 2. SUGESTÕES RÁPIDAS CLICÁVEIS (MEIO) */}
      {availableSuggestions.length > 0 && (
        <div className={tagInputStyles.suggestionsSection}>
          <p className={tagInputStyles.suggestionsHeader}>
            <ProjectIcon name="Lightbulb" size={13} className="text-[#059669] dark:text-amber-400" />
            <span>Sugestões rápidas (clique para adicionar):</span>
          </p>

          <div className={tagInputStyles.suggestionsList}>
            {availableSuggestions.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => addTag(sug)}
                className={`${tagInputStyles.suggestionBtn} profile-suggestion-btn`}
                data-profile-suggestion-btn
                title={`Adicionar ${sug}`}
              >
                <span>+</span>
                <span>{sug}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. TAGS ATIVAS DO PROFISSIONAL (PASSA PARA BAIXO) */}
      <div
        className={`${tagInputStyles.activeSection} profile-active-tags-container`}
        data-active-tags-section
      >
        <div className={tagInputStyles.activeHeader}>
          <span
            className="text-[#18181B] dark:text-amber-400 font-bold uppercase tracking-wider"
            data-active-tags-header
          >
            TAGS ATIVAS NO PERFIL
          </span>
          <span
            className="text-[10px] text-[#18181B] dark:text-neutral-500 font-normal lowercase"
            data-active-tags-subtitle
          >
            visíveis na agenda do cliente
          </span>
        </div>

        <div className={tagInputStyles.tagsGrid}>
          {tags.length > 0 ? (
            tags.map((tag) => (
              <span
                key={tag}
                className={`${tagInputStyles.tag} profile-tag-item`}
                data-profile-tag-item
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className={`${tagInputStyles.removeBtn} profile-tag-remove-btn`}
                  data-profile-tag-remove
                  title={`Remover ${tag}`}
                >
                  <ProjectIcon
                    name="X"
                    size={10}
                    className="text-white dark:text-inherit"
                    colorVariant="inherit"
                  />
                </button>
              </span>
            ))
          ) : (
            <p className={tagInputStyles.emptyState}>
              Nenhuma especialidade ativa. Escolha nas sugestões acima ou digite
              no campo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
