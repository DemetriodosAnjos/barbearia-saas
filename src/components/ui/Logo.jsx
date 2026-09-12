import { logoStyles } from "./Logo.styles";

export default function Logo({
  src, // URL da imagem da logo (se houver)
  name = "BarberSaaS", // Nome da marca ou da barbearia
  subtitle, // Subtítulo opcional
  size = "sm", // 'xs' | 'sm' (32px) | 'md' | 'lg'
  symbolOnly = false, // Se 'true', exibe apenas o quadradinho de 32px sem texto ao lado
  centered = false, // Centraliza verticalmente (ideal para cards de login)
  className = "",
}) {
  const currentSize = logoStyles.sizes[size] || logoStyles.sizes.sm;

  return (
    <div
      className={`
        ${centered ? logoStyles.wrapperCentered : logoStyles.wrapper}
        ${className}
      `}
    >
      {/* Caixa do Símbolo (32x32px no tamanho 'sm') */}
      <div className={`${logoStyles.iconBox} ${currentSize.box}`}>
        {src ? (
          <img src={src} alt={name} className={logoStyles.image} />
        ) : (
          <span>💈</span>
        )}
      </div>

      {/* Rótulo da Marca (opcional se não for symbolOnly) */}
      {!symbolOnly && (
        <div className={centered ? "text-center" : logoStyles.textGroup}>
          <span className={`${logoStyles.brandName} ${currentSize.text}`}>
            {name}
          </span>
          {subtitle && (
            <p className={`${logoStyles.subtitle} ${currentSize.sub}`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
