import { safeStorage } from "./safeStorage";

// ========================================================
// 1. ESCALAS CROMÁTICAS COMPLETAS (50 A 950)
// ========================================================
export const OFFICIAL_PALETTE = {
  amber: [
    {
      token: "--brand-50",
      hex: "#fffbeb",
      label: "50",
      text: "dark",
      desc: "Destaques sutis",
    },
    {
      token: "--brand-100",
      hex: "#fef3c7",
      label: "100",
      text: "dark",
      desc: "Fundos de badges",
    },
    {
      token: "--brand-200",
      hex: "#fde68a",
      label: "200",
      text: "dark",
      desc: "Bordas de foco",
    },
    {
      token: "--brand-300",
      hex: "#fcd34d",
      label: "300",
      text: "dark",
      desc: "Textos claros",
    },
    {
      token: "--brand-400",
      hex: "#fbbf24",
      label: "400",
      text: "dark",
      desc: "Estrelas e ícones",
    },
    {
      token: "--brand-500",
      hex: "#f59e0b",
      label: "500 (Base)",
      text: "dark",
      desc: "Destaques & R$",
    },
    {
      token: "--brand-600",
      hex: "#d97706",
      label: "600 (Primary)",
      text: "light",
      desc: "Botões principais",
    },
    {
      token: "--brand-700",
      hex: "#b45309",
      label: "700 (Hover)",
      text: "light",
      desc: "Hover do botão",
    },
    {
      token: "--brand-800",
      hex: "#92400e",
      label: "800",
      text: "light",
      desc: "Active / Clique",
    },
    {
      token: "--brand-900",
      hex: "#78350f",
      label: "900",
      text: "light",
      desc: "Bordas escuras",
    },
    {
      token: "--brand-950",
      hex: "#451a03",
      label: "950",
      text: "light",
      desc: "Fundos com brilho",
    },
  ],
  emerald: [
    {
      token: "--brand-50",
      hex: "#ecfdf5",
      label: "50",
      text: "dark",
      desc: "Destaques sutis",
    },
    {
      token: "--brand-100",
      hex: "#d1fae5",
      label: "100",
      text: "dark",
      desc: "Fundos de badges",
    },
    {
      token: "--brand-200",
      hex: "#a7f3d0",
      label: "200",
      text: "dark",
      desc: "Bordas de foco",
    },
    {
      token: "--brand-300",
      hex: "#6ee7b7",
      label: "300",
      text: "dark",
      desc: "Textos claros",
    },
    {
      token: "--brand-400",
      hex: "#34d399",
      label: "400",
      text: "dark",
      desc: "Estrelas e ícones",
    },
    {
      token: "--brand-500",
      hex: "#10b981",
      label: "500 (Base)",
      text: "dark",
      desc: "Destaques & R$",
    },
    {
      token: "--brand-600",
      hex: "#059669",
      label: "600 (Primary)",
      text: "light",
      desc: "Botões principais",
    },
    {
      token: "--brand-700",
      hex: "#047857",
      label: "700 (Hover)",
      text: "light",
      desc: "Hover do botão",
    },
    {
      token: "--brand-800",
      hex: "#065f46",
      label: "800",
      text: "light",
      desc: "Active / Clique",
    },
    {
      token: "--brand-900",
      hex: "#064e3b",
      label: "900",
      text: "light",
      desc: "Bordas escuras",
    },
    {
      token: "--brand-950",
      hex: "#022c22",
      label: "950",
      text: "light",
      desc: "Fundos com brilho",
    },
  ],
  ruby: [
    {
      token: "--brand-50",
      hex: "#fef2f2",
      label: "50",
      text: "dark",
      desc: "Destaques sutis",
    },
    {
      token: "--brand-100",
      hex: "#fee2e2",
      label: "100",
      text: "dark",
      desc: "Fundos de badges",
    },
    {
      token: "--brand-200",
      hex: "#fecaca",
      label: "200",
      text: "dark",
      desc: "Bordas de foco",
    },
    {
      token: "--brand-300",
      hex: "#fca5a5",
      label: "300",
      text: "dark",
      desc: "Textos claros",
    },
    {
      token: "--brand-400",
      hex: "#f87171",
      label: "400",
      text: "dark",
      desc: "Estrelas e ícones",
    },
    {
      token: "--brand-500",
      hex: "#ef4444",
      label: "500 (Base)",
      text: "dark",
      desc: "Destaques & R$",
    },
    {
      token: "--brand-600",
      hex: "#dc2626",
      label: "600 (Primary)",
      text: "light",
      desc: "Botões principais",
    },
    {
      token: "--brand-700",
      hex: "#b91c1c",
      label: "700 (Hover)",
      text: "light",
      desc: "Hover do botão",
    },
    {
      token: "--brand-800",
      hex: "#991b1b",
      label: "800",
      text: "light",
      desc: "Active / Clique",
    },
    {
      token: "--brand-900",
      hex: "#7f1d1d",
      label: "900",
      text: "light",
      desc: "Bordas escuras",
    },
    {
      token: "--brand-950",
      hex: "#450a0a",
      label: "950",
      text: "light",
      desc: "Fundos com brilho",
    },
  ],
  sapphire: [
    {
      token: "--brand-50",
      hex: "#eff6ff",
      label: "50",
      text: "dark",
      desc: "Destaques sutis",
    },
    {
      token: "--brand-100",
      hex: "#dbeafe",
      label: "100",
      text: "dark",
      desc: "Fundos de badges",
    },
    {
      token: "--brand-200",
      hex: "#bfdbfe",
      label: "200",
      text: "dark",
      desc: "Bordas de foco",
    },
    {
      token: "--brand-300",
      hex: "#93c5fd",
      label: "300",
      text: "dark",
      desc: "Textos claros",
    },
    {
      token: "--brand-400",
      hex: "#60a5fa",
      label: "400",
      text: "dark",
      desc: "Estrelas e ícones",
    },
    {
      token: "--brand-500",
      hex: "#3b82f6",
      label: "500 (Base)",
      text: "dark",
      desc: "Destaques & R$",
    },
    {
      token: "--brand-600",
      hex: "#2563eb",
      label: "600 (Primary)",
      text: "light",
      desc: "Botões principais",
    },
    {
      token: "--brand-700",
      hex: "#1d4ed8",
      label: "700 (Hover)",
      text: "light",
      desc: "Hover do botão",
    },
    {
      token: "--brand-800",
      hex: "#1e40af",
      label: "800",
      text: "light",
      desc: "Active / Clique",
    },
    {
      token: "--brand-900",
      hex: "#1e3a8a",
      label: "900",
      text: "light",
      desc: "Bordas escuras",
    },
    {
      token: "--brand-950",
      hex: "#172554",
      label: "950",
      text: "light",
      desc: "Fundos com brilho",
    },
  ],
  neutrals: [
    {
      token: "--bg-app",
      hex: "#0a0a0a",
      label: "950 App",
      text: "light",
      desc: "Fundo Geral",
    },
    {
      token: "--bg-card",
      hex: "#171717",
      label: "900 Card",
      text: "light",
      desc: "Superfície Cards",
    },
    {
      token: "--bg-subtle",
      hex: "#262626",
      label: "800 Subtle",
      text: "light",
      desc: "Inputs e Linhas",
    },
    {
      token: "--border-strong",
      hex: "#404040",
      label: "700 Border",
      text: "light",
      desc: "Bordas Ativas",
    },
  ],
  semantics: [
    {
      token: "--color-success",
      hex: "#10b981",
      label: "Sucesso",
      text: "dark",
      desc: "Pago / Concluído",
    },
    {
      token: "--color-warning",
      hex: "#f59e0b",
      label: "Alerta",
      text: "dark",
      desc: "Aguardando / Pendente",
    },
    {
      token: "--color-danger",
      hex: "#ef4444",
      label: "Perigo",
      text: "light",
      desc: "Falta / Cancelado",
    },
    {
      token: "--color-info",
      hex: "#0ea5e9",
      label: "Info",
      text: "dark",
      desc: "Confirmado",
    },
    {
      token: "--color-service",
      hex: "#a855f7",
      label: "Em Cadeira",
      text: "light",
      desc: "Em Atendimento",
    },
  ],
};

// ========================================================
// 2. INJEÇÃO DINÂMICA DE TODAS AS VARIÁVEIS NO :root
// ========================================================
export function setBrandTheme(themeKey = "amber") {
  const root = document.documentElement;
  const palette = OFFICIAL_PALETTE[themeKey] || OFFICIAL_PALETTE.amber;

  // Injeta todas as 11 variáveis (--brand-50 até --brand-950) diretamente no :root!
  palette.forEach((item) => {
    root.style.setProperty(item.token, item.hex);
  });

  try {
    safeStorage.setItem("barbersaas_brand_theme", themeKey);
  } catch {
    // safe fallback
  }
}

export function applyThemeMode(mode = "dark") {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  try {
    safeStorage.setItem("barbersaas_theme_mode", mode);
  } catch {
    // safe fallback
  }
}

export function initTheme() {
  const savedMode = safeStorage.getItem("barbersaas_theme_mode") || "dark";
  const savedBrand = safeStorage.getItem("barbersaas_brand_theme") || "amber";
  applyThemeMode(savedMode);
  setBrandTheme(savedBrand);
}

// Cálculo de Contraste WCAG (Garante texto legível sobre qualquer cor)
export function getBestContrastTextColor(hexColor = "#000000") {
  if (!hexColor) return "#ffffff";
  let cleanHex = hexColor.replace("#", "").trim();

  // Expande shorthand se for de 3 dígitos (ex: "FFF" -> "FFFFFF")
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
  const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
  const b = parseInt(cleanHex.slice(4, 6), 16) || 0;

  // Fórmula YIQ recomendada pela W3C
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
}

/**
 * Calcula a Luminância Relativa segundo a fórmula oficial da W3C WCAG 2.2 (Critério 1.4.3)
 * @param {string} hexColor - Cor em formato hexadecimal (ex: #FFFFFF ou #0A0A0A)
 * @returns {number} Luminância normalizada entre 0 (preto absoluto) e 1 (branco puro)
 */
export function calculateRelativeLuminance(hexColor = "#000000") {
  if (!hexColor) return 0;
  let cleanHex = hexColor.replace("#", "").trim();

  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calcula a Taxa de Contraste exata (Ratio) entre duas cores conforme WCAG 2.2:
 * (L1 + 0.05) / (L2 + 0.05), onde L1 é a maior luminância e L2 é a menor.
 * @param {string} color1 - Primeira cor hex
 * @param {string} color2 - Segunda cor hex
 * @returns {number} Taxa de contraste como número de ponto flutuante (ex: 7.2)
 */
export function calculateContrastRatio(color1 = "#ffffff", color2 = "#000000") {
  const lum1 = calculateRelativeLuminance(color1);
  const lum2 = calculateRelativeLuminance(color2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  const ratio = (brightest + 0.05) / (darkest + 0.05);
  return Number(ratio.toFixed(2));
}

/**
 * Avalia se o par de cores cumpre os critérios da WCAG 2.2 Nível AA e AAA
 * @param {string} foreground - Cor do texto / primeiro plano
 * @param {string} background - Cor do fundo / superfície
 * @param {boolean} isLargeText - Se o texto é grande (>= 18pt / 24px ou >= 14pt / 18.66px em negrito)
 * @returns {{ ratio: number, passesAA: boolean, passesAAA: boolean, minRequired: number }}
 */
export function checkWcagCompliance(foreground = "#ffffff", background = "#000000", isLargeText = false) {
  const ratio = calculateContrastRatio(foreground, background);
  const minAA = isLargeText ? 3.0 : 4.5;
  const minAAA = isLargeText ? 4.5 : 7.0;

  return {
    ratio,
    passesAA: ratio >= minAA,
    passesAAA: ratio >= minAAA,
    minRequired: minAA,
    level: ratio >= minAAA ? "AAA" : ratio >= minAA ? "AA" : "REPROVADO",
  };
}
