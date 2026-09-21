import { useState } from "react";
import { posProductStyles } from "./PosProductItem.styles";

export default function PosProductItem({
  // [Remoção do mock estático da Pomada Matte e inicialização como objeto vazio]
  product = {},
  quantityInComanda = 0,
  onAddToCart,
  onEdit,
  onDelete,
  onRestore,
  className = "",
}) {
  // [Defesa: se o produto for nulo ou inválido, não quebra a interface]
  if (!product || !product.name) return null;

  // [Normalização defensiva de colunas do Supabase: stock, active e commission]
  const isInactive = product.active === false;
  const hasVariants =
    Array.isArray(product.variants) && product.variants.length > 0;
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  const activeVariant = hasVariants
    ? product.variants[selectedVariantIndex]
    : null;
  const currentPrice = activeVariant
    ? Number(activeVariant.price || 0)
    : Number(product.price || 0);

  const stockCount = Number(product.stock ?? 0);
  const isOutOfStock = stockCount <= 0;
  const isLowStock = stockCount > 0 && stockCount <= 3;
  const isManagementMode = Boolean(onEdit || onDelete || onRestore);

  const commissionPercent =
    product.commissionPercent ?? product.commission_percent;

  // CORREÇÃO: No modo de gestão, não bloqueia ponteiro do mouse
  const currentStyle = isInactive
    ? "opacity-60 bg-neutral-950 border-neutral-800"
    : isManagementMode
      ? "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700"
      : isOutOfStock
        ? posProductStyles.states.outOfStock
        : isLowStock
          ? posProductStyles.states.lowStock
          : posProductStyles.states.available;

  return (
    <div
      className={`
        ${posProductStyles.container}
        ${currentStyle}
        ${className}
      `}
    >
      <div className={posProductStyles.header}>
        <div className={posProductStyles.productIcon}>
          {product.icon || "📦"}
        </div>

        <div className={posProductStyles.infoWrapper}>
          <h4 className={posProductStyles.name}>{product.name}</h4>
          <span className={posProductStyles.categoryText}>
            {product.category}
          </span>
        </div>

        <div className={posProductStyles.badgesGroup}>
          {isInactive ? (
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-red-950/60 text-red-400 border border-red-800/60">
              Desativado
            </span>
          ) : isOutOfStock ? (
            <span className={posProductStyles.outBadge}>Esgotado</span>
          ) : isLowStock ? (
            <span className={posProductStyles.lowBadge}>
              Restam {product.stock}
            </span>
          ) : (
            <span className={posProductStyles.stockCount}>
              {product.stock} un.
            </span>
          )}
        </div>
      </div>

      {hasVariants && !isInactive && (
        <div className={posProductStyles.variantsWrapper}>
          <span className="text-[10px] text-neutral-500 mr-1">Tamanho:</span>
          {product.variants.map((v, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedVariantIndex(idx)}
              className={`
                ${posProductStyles.variantPill}
                ${selectedVariantIndex === idx ? posProductStyles.variantActive : posProductStyles.variantInactive}
              `}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      <div
        className={posProductStyles.footer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={posProductStyles.priceGroup}>
          <span className={posProductStyles.priceText}>
            R${" "}
            {Number(currentPrice || 0)
              .toFixed(2)
              .replace(".", ",")}
          </span>
          {/* [Exibição correta da comissão de venda suportando snake_case e camelCase] */}
          {commissionPercent !== undefined && (
            <span className={posProductStyles.commissionBadge}>
              +{commissionPercent}% comissão
            </span>
          )}
        </div>

        {isManagementMode ? (
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {isInactive ? (
              <button
                type="button"
                onClick={() => onRestore && onRestore(product)}
                className="text-xs font-bold py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-emerald-600 text-neutral-200 hover:text-white border border-neutral-700 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                ↺ Reativar
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onEdit && onEdit(product)}
                  className="text-xs font-bold py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
                >
                  ✏️ Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDelete && onDelete(product)}
                  className="text-xs font-bold p-1.5 rounded-xl bg-neutral-800 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-neutral-700 hover:border-red-800/60 transition-colors cursor-pointer"
                  title="Desativar produto"
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        ) : (
          /* [Botão: envia o produto com o preço e tamanho da variação escolhida pelo cliente] */
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => {
              if (onAddToCart) {
                const itemToAdd = activeVariant
                  ? {
                      ...product,
                      price: currentPrice,
                      variantName: activeVariant.name,
                      name: `${product.name} (${activeVariant.name})`,
                    }
                  : product;
                onAddToCart(itemToAdd);
              }
            }}
            className={posProductStyles.addButton}
          >
            {quantityInComanda > 0 && (
              <span className={posProductStyles.counterBadge}>
                {quantityInComanda}
              </span>
            )}
            <span>+ Comanda</span>
          </button>
        )}
      </div>
    </div>
  );
}
