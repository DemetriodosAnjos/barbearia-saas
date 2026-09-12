import { useState } from "react";
import { posProductStyles } from "./PosProductItem.styles";

export default function PosProductItem({
  product = {
    id: "prod-1",
    name: "Pomada Modeladora Matte",
    category: "Vitrine",
    icon: "🧴",
    price: 45,
    stock: 8,
    commissionPercent: 10, // Barbeiro ganha 10%
    variants: [], // Ex: [{ name: "50g", price: 35 }, { name: "100g", price: 55 }]
  },
  quantityInComanda = 0, // Se o item já estiver na comanda aberta
  onAddToCart,
  className = "",
}) {
  const hasVariants = product.variants && product.variants.length > 0;
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  const activeVariant = hasVariants
    ? product.variants[selectedVariantIndex]
    : null;
  const currentPrice = activeVariant ? activeVariant.price : product.price;

  // Estados de estoque
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 3;

  const currentStyle = isOutOfStock
    ? posProductStyles.states.outOfStock
    : isLowStock
      ? posProductStyles.states.lowStock
      : posProductStyles.states.available;

  const handleAdd = () => {
    if (isOutOfStock || !onAddToCart) return;
    onAddToCart({
      ...product,
      selectedVariant: activeVariant,
      finalPrice: currentPrice,
    });
  };

  return (
    <div
      className={`${posProductStyles.container} ${currentStyle} ${className}`}
    >
      {/* 1. CABEÇALHO: Ícone, Nome e Selos de Estoque */}
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

        {/* Badges de Estoque */}
        <div className={posProductStyles.badgesGroup}>
          {isOutOfStock && (
            <span className={posProductStyles.outBadge}>Esgotado</span>
          )}
          {isLowStock && (
            <span className={posProductStyles.lowBadge}>
              Restam {product.stock}
            </span>
          )}
          {!isOutOfStock && !isLowStock && (
            <span className={posProductStyles.stockCount}>
              {product.stock} un.
            </span>
          )}
        </div>
      </div>

      {/* 2. VARIAÇÕES DE TAMANHO / EMBALAGEM (SE HOUVER) */}
      {hasVariants && (
        <div className={posProductStyles.variantsWrapper}>
          <span className="text-[10px] text-neutral-500 mr-1">Tamanho:</span>
          {product.variants.map((v, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isOutOfStock}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedVariantIndex(idx);
              }}
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

      {/* 3. RODAPÉ: Preço, Comissão e Botão de Adicionar */}
      <div className={posProductStyles.footer}>
        <div className={posProductStyles.priceGroup}>
          <span className={posProductStyles.priceText}>
            R$ {Number(currentPrice).toFixed(2).replace(".", ",")}
          </span>
          {product.commissionPercent && (
            <span className={posProductStyles.commissionBadge}>
              +{product.commissionPercent}% comissão
            </span>
          )}
        </div>

        {/* Botão de Adição Rápida */}
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={handleAdd}
          className={posProductStyles.addButton}
          aria-label={`Adicionar ${product.name} na comanda`}
        >
          {quantityInComanda > 0 && (
            <span className={posProductStyles.counterBadge}>
              {quantityInComanda}
            </span>
          )}
          <span>+ Comanda</span>
        </button>
      </div>
    </div>
  );
}
