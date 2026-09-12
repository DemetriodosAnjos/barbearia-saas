import { useState } from "react";
import { avatarStyles } from "./Avatar.styles";

// Paleta de cores para fallback determinístico
const HASH_COLORS = [
  "bg-amber-600/30 text-amber-300 border-amber-500/40",
  "bg-emerald-600/30 text-emerald-300 border-emerald-500/40",
  "bg-sky-600/30 text-sky-300 border-sky-500/40",
  "bg-purple-600/30 text-purple-300 border-purple-500/40",
  "bg-rose-600/30 text-rose-300 border-rose-500/40",
  "bg-indigo-600/30 text-indigo-300 border-indigo-500/40",
];

export default function Avatar({
  src,
  name = "Usuário",
  size = "md", // xs | sm | md | lg | xl
  status, // available | in_service | on_break | offline
  isVip = false,
  className = "",
}) {
  const [hasImageError, setHasImageError] = useState(false);

  // 1. Extrai as iniciais do nome (ex: "Carlos Eduardo" -> "CE")
  const getInitials = (fullName) => {
    if (!fullName) return "US";
    const parts = fullName.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // 2. Gera um hash determinístico para garantir a mesma cor fixa por usuário
  const getColorByName = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % HASH_COLORS.length;
    return HASH_COLORS[index];
  };

  const sizeClass = avatarStyles.sizes[size] || avatarStyles.sizes.md;
  const statusSizeClass =
    avatarStyles.statusSizes[size] || avatarStyles.statusSizes.md;

  return (
    <div className={`${avatarStyles.container} ${sizeClass} ${className}`}>
      {/* Imagem Real ou Fallback com Iniciais */}
      {src && !hasImageError ? (
        <img
          src={src}
          alt={name}
          onError={() => setHasImageError(true)}
          className={avatarStyles.image}
        />
      ) : (
        <div className={`${avatarStyles.fallback} ${getColorByName(name)}`}>
          {getInitials(name)}
        </div>
      )}

      {/* Ponto Indicador de Status Presencial */}
      {status && avatarStyles.statuses[status] && (
        <span
          className={`
            ${avatarStyles.statusDot}
            ${statusSizeClass}
            ${avatarStyles.statuses[status]}
          `}
          title={`Status: ${status}`}
        />
      )}

      {/* Selo VIP */}
      {isVip && (
        <span className={avatarStyles.vipBadge} title="Cliente VIP / Assinante">
          👑
        </span>
      )}
    </div>
  );
}
