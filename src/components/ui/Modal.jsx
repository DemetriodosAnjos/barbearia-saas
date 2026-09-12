import { useEffect } from "react";
import { modalStyles } from "./Modal.styles";

export default function Modal({
  isOpen = false,
  onClose,
  title,
  children,
  footer,
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

  return (
    <div
      className={modalStyles.backdrop}
      onClick={onClose} // Clicar fora fecha
    >
      {/* Clicar dentro do modal NÃO fecha (stopPropagation) */}
      <div
        role="dialog"
        aria-modal="true"
        className={modalStyles.container}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className={modalStyles.header}>
          {title && <h3 className={modalStyles.title}>{title}</h3>}
          <button
            type="button"
            onClick={onClose}
            className={modalStyles.closeButton}
            aria-label="Fechar modal"
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
