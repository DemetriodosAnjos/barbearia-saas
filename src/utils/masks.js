// Remove caracteres não numéricos
const cleanDigits = (value = "") => value.toString().replace(/\D/g, "");

export const masks = {
  // Telefone / WhatsApp celular: (11) 98765-4321 ou fixo: (11) 4321-4321
  phone: (value = "") => {
    const digits = cleanDigits(value).slice(0, 11);
    if (!digits) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  },

  // CPF: 000.000.000-00
  cpf: (value = "") => {
    const digits = cleanDigits(value).slice(0, 11);
    if (!digits) return "";
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  },

  // Moeda (R$): 6500 vira 65,00
  currency: (value = "") => {
    const digits = cleanDigits(value);
    if (!digits) return "";
    const number = Number(digits) / 100;
    return number.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },
};
