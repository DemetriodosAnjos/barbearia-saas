import { useEffect } from "react";
import { modalStyles } from "./Modal.styles";

export default function Modal({
  isOpen = false,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className = "",
  showHeaderBorder = true,
}) {
  // Efeito para fechar com tecla ESC e travar o scroll da tela
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Trava a rolagem da página ao abrir
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    // Limpeza ao fechar
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Se não estiver aberto, não renderiza nada no DOM
  if (!isOpen) return null;

  const sizeClass = modalStyles.sizes[size] || modalStyles.sizes.md;
  const hasHeaderBorder = Boolean(title && showHeaderBorder !== false);

  return (
    <div
      className={modalStyles.backdrop}
      onClick={onClose} // Clicar fora fecha
    >
      {/* Clicar dentro do modal NÃO fecha (stopPropagation) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title-heading" : undefined}
        className={`${modalStyles.containerBase} ${sizeClass} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div
          className={`flex items-center ${
            title ? "justify-between" : "justify-end"
          } px-6 ${title ? "py-4" : "pt-5 pb-0"} ${
            hasHeaderBorder ? "border-b border-neutral-800" : ""
          } shrink-0`}
        >
          {title && (
            <h3 id="modal-title-heading" className={modalStyles.title}>
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`${modalStyles.closeButton} ml-auto focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none`}
            aria-label="Fechar janela modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Corpo */}
        <div className={modalStyles.body}>{children}</div>

        {/* Rodapé opcional (Ações) */}
        {footer && <div className={modalStyles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
