import { paginationStyles } from "./Pagination.styles";

export default function Pagination({
  currentPage = 1,
  totalRecords = 0,
  pageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  siblingCount = 1, // Número de páginas vizinhas exibidas ao lado da página atual
  recordLabel = "registros", // Ex: "clientes", "cortes", "comandas"
  className = "",
}) {
  // 1. Cálculo matemático de páginas e escopo
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // 2. Navegação protegida
  const handlePageChange = (newPage) => {
    if (
      isLoading ||
      newPage === currentPage ||
      newPage < 1 ||
      newPage > totalPages
    ) {
      return;
    }
    if (onPageChange) onPageChange(newPage);
  };

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
      // Regra de Negócio: Resetar obrigatoriamente para a página 1
      if (onPageChange) onPageChange(1);
    }
  };

  // 3. Algoritmo de Geração dos Botões com Elipses (...)
  const generatePaginationRange = () => {
    const totalNumbers = siblingCount * 2 + 5; // Total de posições na barra

    // Se o total de páginas for menor que o limite, exibe tudo sem elipse
    if (totalPages <= totalNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    // Caso 1: Apenas elipse na direita
    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "...", totalPages];
    }

    // Caso 2: Apenas elipse na esquerda
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + 1 + i,
      );
      return [1, "...", ...rightRange];
    }

    // Caso 3: Ambas as elipses presentes
    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i,
      );
      return [1, "...", ...middleRange, "...", totalPages];
    }

    return [];
  };

  const paginationRange = generatePaginationRange();

  return (
    <div className={`${paginationStyles.container} ${className}`}>
      {/* Lado Esquerdo: Resumo do Escopo e Seletor de Limite */}
      <div className={paginationStyles.infoSection}>
        <span>
          Exibindo{" "}
          <strong className={paginationStyles.strongText}>
            {startRecord}-{endRecord}
          </strong>{" "}
          de{" "}
          <strong className={paginationStyles.strongText}>
            {totalRecords}
          </strong>{" "}
          {recordLabel}
        </span>

        {/* Seletor de registros por página */}
        {pageSizeOptions.length > 0 && (
          <div className={paginationStyles.pageSizeWrapper}>
            <span>| Linhas:</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              disabled={isLoading || totalRecords === 0}
              className={paginationStyles.pageSizeSelect}
              aria-label="Registros por página"
            >
              {pageSizeOptions.map((option) => (
                <option
                  key={option}
                  value={option}
                  className="bg-neutral-900 text-white"
                >
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Lado Direito: Controles de Navegação */}
      <div className={paginationStyles.controlsWrapper}>
        {/* Primeira Página (<<) */}
        <button
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={isLoading || currentPage === 1 || totalRecords === 0}
          className={paginationStyles.navButton}
          title="Primeira página"
          aria-label="Primeira página"
        >
          <span>«</span>
        </button>

        {/* Página Anterior (<) */}
        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={isLoading || currentPage === 1 || totalRecords === 0}
          className={paginationStyles.navButton}
          title="Página anterior"
          aria-label="Página anterior"
        >
          <span>‹</span>
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Botões Numéricos com Elipses (Visíveis em Desktop e Tablet) */}
        <div className={paginationStyles.pageNumbersWrapper}>
          {paginationRange.map((pageNumber, idx) => {
            if (pageNumber === "...") {
              return (
                <span key={`dots-${idx}`} className={paginationStyles.ellipsis}>
                  …
                </span>
              );
            }

            const isActive = pageNumber === currentPage;
            return (
              <button
                key={pageNumber}
                type="button"
                onClick={() => handlePageChange(pageNumber)}
                disabled={isLoading}
                aria-current={isActive ? "page" : undefined}
                className={`
                  ${paginationStyles.pageButton}
                  ${isActive ? paginationStyles.pageActive : paginationStyles.pageInactive}
                `}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>

        {/* Indicador compacto no Mobile (Página X de Y) */}
        <span className="md:hidden text-neutral-400 font-semibold px-2">
          {currentPage} / {totalPages}
        </span>

        {/* Próxima Página (>) */}
        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={
            isLoading || currentPage === totalPages || totalRecords === 0
          }
          className={paginationStyles.navButton}
          title="Próxima página"
          aria-label="Próxima página"
        >
          <span className="hidden sm:inline">Próxima</span>
          <span>›</span>
        </button>

        {/* Última Página (>>) */}
        <button
          type="button"
          onClick={() => handlePageChange(totalPages)}
          disabled={
            isLoading || currentPage === totalPages || totalRecords === 0
          }
          className={paginationStyles.navButton}
          title="Última página"
          aria-label="Última página"
        >
          <span>»</span>
        </button>
      </div>
    </div>
  );
}
