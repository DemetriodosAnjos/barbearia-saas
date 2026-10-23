import { breadcrumbStyles } from "./Breadcrumb.styles";

export default function Breadcrumb({
  items = [], // Array de objetos: [{ label, onClick, icon }]
  separator = "chevron", // 'chevron' (>) ou 'slash' (/)
  className = "",
}) {
  // Ícones de separação
  const separatorIcon =
    separator === "chevron" ? (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    ) : (
      <span className="text-neutral-600 text-xs">/</span>
    );

  return (
    <nav
      aria-label="Caminho de navegação"
      className={`${breadcrumbStyles.nav} ${className}`}
    >
      <ol className={breadcrumbStyles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className={breadcrumbStyles.item}>
              {/* Separador (não aparece antes do primeiro item) */}
              {index > 0 && (
                <span className={breadcrumbStyles.separator} aria-hidden="true">
                  {separatorIcon}
                </span>
              )}

              {/* Item da Trilha */}
              {isLast ? (
                // Último item: Página atual (não é link)
                <span
                  aria-current="page"
                  className={breadcrumbStyles.currentPage}
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                // Itens intermediários: Links clicáveis
                <button
                  type="button"
                  onClick={item.onClick}
                  className={breadcrumbStyles.link}
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
