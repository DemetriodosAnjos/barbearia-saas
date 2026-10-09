import QRCode from "qrcode";
import { safeStorage } from "./safeStorage";

export const USER_PIX_KEY_STORAGE_KEY = "barbearia_user_pix_key";

/**
 * Valida dígitos verificadores de um CPF de 11 dígitos.
 */
function isValidCpfDigits(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(digits.charAt(10), 10);
}

/**
 * Normaliza a chave PIX segundo o padrão EMV® QRCPS-MPM do Banco Central do Brasil.
 */
export function normalizePixKeyForBrCode(rawKey: string): string {
  const trimmed = (rawKey || "").trim();
  if (!trimmed) return "";

  // 1. E-mail
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  // 2. Chave Aleatória (EVP / UUID)
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      trimmed
    )
  ) {
    return trimmed.toLowerCase();
  }

  // 3. Telefone já com DDI +55
  if (trimmed.startsWith("+")) {
    return "+" + trimmed.replace(/\D/g, "");
  }

  const digits = trimmed.replace(/\D/g, "");

  // 4. Se possui parênteses de DDD ex: (41) 99788-4424 -> Telefone celular/fixo
  if (trimmed.includes("(") || trimmed.includes(")")) {
    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
  }

  // 5. Se possui máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
  if (trimmed.includes(".") && (trimmed.includes("-") || trimmed.includes("/"))) {
    return digits;
  }

  // 6. Apenas dígitos (10, 11 ou 14)
  if (digits.length === 14) {
    return digits; // CNPJ
  }
  if (digits.length === 10) {
    return `+55${digits}`; // Telefone fixo com DDD
  }
  if (digits.length === 11) {
    // Se o 3º dígito é 9 e não é um CPF válido (ou se começa com DDD + 9), trata como celular se não passar no mod-11 de CPF
    if (!isValidCpfDigits(digits) && digits.charAt(2) === "9") {
      return `+55${digits}`;
    }
    return digits; // CPF
  }

  return trimmed;
}

function formatEmvField(id: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

function sanitizeAsciiText(input: string, maxLen: number, fallback: string): string {
  const cleaned = (input || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  return (cleaned || fallback).slice(0, maxLen);
}

/**
 * Calcula o CRC16-CCITT (Polinômio 0x1021, Inicial 0xFFFF) oficial do Banco Central (BR Code).
 */
export function computeBrCodeCrc16(payloadWithoutCrcValue: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payloadWithoutCrcValue.length; i++) {
    crc ^= payloadWithoutCrcValue.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Monta o payload oficial PIX Copia e Cola (BR Code BCB) a partir da Chave PIX cadastrada.
 */
export function generatePixBrCodePayload({
  pixKey,
  merchantName = "BARBEARIA",
  merchantCity = "SAO PAULO",
  amount = 0,
  txid = "***",
}: {
  pixKey: string;
  merchantName?: string;
  merchantCity?: string;
  amount?: number;
  txid?: string;
}): string {
  const normalizedKey = normalizePixKeyForBrCode(pixKey);
  if (!normalizedKey) return "";

  const guiField = formatEmvField("00", "br.gov.bcb.pix");
  const keyField = formatEmvField("01", normalizedKey);
  const merchantAccountInfo = formatEmvField("26", `${guiField}${keyField}`);

  const cleanName = sanitizeAsciiText(merchantName, 25, "BARBEARIA");
  const cleanCity = sanitizeAsciiText(merchantCity, 15, "SAO PAULO");
  const cleanTxId =
    txid === "***"
      ? "***"
      : txid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";

  const parts: string[] = [
    formatEmvField("00", "01"), // Payload Format Indicator
    merchantAccountInfo,        // Merchant Account Information - PIX
    formatEmvField("52", "0000"), // Merchant Category Code
    formatEmvField("53", "986"),  // Currency BRL (986)
  ];

  const numericAmount = Number(amount || 0);
  if (numericAmount > 0) {
    parts.push(formatEmvField("54", numericAmount.toFixed(2)));
  }

  parts.push(
    formatEmvField("58", "BR"),
    formatEmvField("59", cleanName),
    formatEmvField("60", cleanCity),
    formatEmvField("62", formatEmvField("05", cleanTxId))
  );

  const payloadWithCrcHeader = `${parts.join("")}6304`;
  const crc16 = computeBrCodeCrc16(payloadWithCrcHeader);
  return `${payloadWithCrcHeader}${crc16}`;
}

/**
 * Gera a imagem QR Code real (Data URL PNG de alta definição) a partir do payload BR Code.
 */
export async function generatePixQrCodeDataUrl(
  brCodePayload: string
): Promise<string> {
  if (!brCodePayload) return "";
  return await QRCode.toDataURL(brCodePayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 280,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Recupera a chave PIX cadastrada pelo usuário em "Meu Perfil" => "Perfil & Chave PIX" ("Chave PIX Cadastrada").
 */
export function getRegisteredUserPixKey(user?: any, tenant?: any): string {
  try {
    const stored = safeStorage.getItem(USER_PIX_KEY_STORAGE_KEY);
    if (stored && stored.trim()) {
      return stored.trim();
    }
  } catch {
    // ignore
  }

  const fromUserMeta =
    user?.user_metadata?.pix_key ||
    user?.user_metadata?.pixKey ||
    user?.pix_key ||
    user?.pixKey;
  if (fromUserMeta && String(fromUserMeta).trim()) {
    return String(fromUserMeta).trim();
  }

  const fromTenant =
    tenant?.pix_key ||
    tenant?.pixKey;
  if (fromTenant && String(fromTenant).trim()) {
    return String(fromTenant).trim();
  }

  return "";
}

/**
 * Salva a chave PIX cadastrada pelo usuário no storage seguro.
 */
export function saveRegisteredUserPixKey(pixKey: string): void {
  try {
    const clean = (pixKey || "").trim();
    safeStorage.setItem(USER_PIX_KEY_STORAGE_KEY, clean);
  } catch {
    // ignore
  }
}
