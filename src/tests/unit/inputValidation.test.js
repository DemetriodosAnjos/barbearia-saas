import { describe, it, expect } from "vitest";
import {
  validateSchema,
  SCHEMAS,
  validateAvatarUpload,
  ALLOWED_BARBER_ROLES,
} from "../../utils/inputValidator";

describe("Solicitação #02: Mapeamento de Entradas, Validação de Tipos & Proteção Mass Assignment", () => {
  // ========================================================
  // 1. TESTES DE TIPAGEM INCORRETA (WRONG TYPE)
  // ========================================================
  describe("Validação Estrita de Tipos", () => {
    it("rejeita campo numérico enviado como string alfabética ou objeto", () => {
      const invalidPayload = {
        client_name: "Marcos Souza",
        client_phone: "11987654321",
        barber_name: "Thiago Silva",
        service_name: "Corte Degradê",
        duration_minutes: "trinta_minutos", // TIPO ERRADO: string em vez de number
        price: 45.0,
        start_time: "14:00",
        end_time: "14:45",
      };

      const result = validateSchema(invalidPayload, SCHEMAS.appointmentBooking);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Tipo inválido para 'duration_minutes'"))).toBe(true);
    });

    it("rejeita preço negativo ou fora da faixa permitida", () => {
      const invalidPricePayload = {
        client_name: "Carlos Lima",
        client_phone: "11987654321",
        barber_name: "Thiago Silva",
        service_name: "Barboterapia",
        duration_minutes: 30,
        price: -50, // TIPO INVÁLIDO: negativo
        start_time: "10:00",
        end_time: "10:30",
      };

      const result = validateSchema(invalidPricePayload, SCHEMAS.appointmentBooking);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("deve ser no mínimo 0"))).toBe(true);
    });
  });

  // ========================================================
  // 2. TESTES DE TEXTO ALÉM DO LIMITE (LENGTH OVERFLOW / DOS)
  // ========================================================
  describe("Validação de Limites de Texto (MaxLength)", () => {
    it("rejeita nome de cliente excedendo 80 caracteres", () => {
      const oversizedNamePayload = {
        client_name: "A".repeat(120), // 120 caracteres (limite é 80)
        client_phone: "11999998888",
        barber_name: "Thiago Silva",
        service_name: "Corte",
        duration_minutes: 30,
        price: 40,
        start_time: "15:00",
        end_time: "15:30",
      };

      const result = validateSchema(oversizedNamePayload, SCHEMAS.appointmentBooking);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("ultrapassa o limite máximo permitido de 80"))).toBe(true);
    });

    it("rejeita observações de cliente excedendo 500 caracteres para evitar Memory Bloat", () => {
      const oversizedNotesClient = {
        name: "João Silva",
        phone: "11987654321",
        notes: "X".repeat(600), // Limite é 500
      };

      const result = validateSchema(oversizedNotesClient, SCHEMAS.clientDirectory);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("ultrapassa o limite máximo permitido de 500"))).toBe(true);
    });
  });

  // ========================================================
  // 3. TESTES DE INJEÇÃO DE PRIVILÉGIOS (MASS ASSIGNMENT / ROLE: ADMIN)
  // ========================================================
  describe("Defesa contra Mass Assignment & Escalada de Privilégios", () => {
    it("rejeita injeção de role: 'admin' em payload de agendamento de cliente", () => {
      const maliciousPayload = {
        client_name: "Hacker User",
        client_phone: "11987654321",
        barber_name: "Thiago Silva",
        service_name: "Corte",
        duration_minutes: 30,
        price: 40,
        start_time: "16:00",
        end_time: "16:30",
        role: "admin", // INJEÇÃO MALICIOSA DE PRIVILÉGIO
      };

      const result = validateSchema(maliciousPayload, SCHEMAS.appointmentBooking, { rejectUnknown: true });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("VIOLAÇÃO DE SEGURANÇA (Mass Assignment)"))).toBe(true);
      expect(result.sanitized).toBeNull();
    });

    it("rejeita injeção de campos financeiros sensíveis (is_paid: true, balance, tenant_id)", () => {
      const financialFraudPayload = {
        client_name: "Frauder",
        client_phone: "11987654321",
        barber_name: "Thiago",
        service_name: "Barba",
        duration_minutes: 30,
        price: 35,
        start_time: "11:00",
        end_time: "11:30",
        is_paid: true, // TENTATIVA DE FRAUDE: marcar como pago no client
        tenant_id: "barbearia_vitima_99", // TENTATIVA DE SEQUESTRO MULTI-TENANT
      };

      const result = validateSchema(financialFraudPayload, SCHEMAS.appointmentBooking, { rejectUnknown: true });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.some((e) => e.includes("is_paid"))).toBe(true);
      expect(result.errors.some((e) => e.includes("tenant_id"))).toBe(true);
    });

    it("bloqueia cadastro de membro da equipe com role 'superadmin' ou 'admin'", () => {
      const adminMemberPayload = {
        name: "Novo Membro",
        display_name: "Membro",
        role: "superadmin", // ROLE ILEGAL
        specialties: [],
      };

      const result = validateSchema(adminMemberPayload, SCHEMAS.barberMember);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Valor não permitido para 'role'"))).toBe(true);
    });

    it("assegura que autorização (RBAC/RLS) não é confundida com validação de formulário", () => {
      // Mesmo que o formulário seja 100% válido, a autorização pertence à sessão/RLS
      const validForm = {
        name: "Carlos Barbeiro",
        display_name: "Carlinhos",
        role: "barber",
        specialties: ["Corte"],
      };

      const validation = validateSchema(validForm, SCHEMAS.barberMember);
      expect(validation.isValid).toBe(true);
      // Validação garante conformidade estrutural, NÃO substitui o auth.uid() da sessão
      expect(validation.sanitized.role).toBe("barber");
    });
  });

  // ========================================================
  // 4. TESTES DE QUERY & PATH PARAMETERS
  // ========================================================
  describe("Validação de Query e Path Parameters", () => {
    it("rejeita Path Traversal em parâmetros de rota", () => {
      const maliciousPath = { id: "../../../etc/passwd" };
      const result = validateSchema(maliciousPath, SCHEMAS.pathParams);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("formato do campo 'id' é inválido"))).toBe(true);
    });

    it("rejeita injeção SQL clássica em parâmetros de rota", () => {
      const sqliPath = { id: "1' OR '1'='1" };
      const result = validateSchema(sqliPath, SCHEMAS.pathParams);
      expect(result.isValid).toBe(false);
    });

    it("aceita ID alfanumérico seguro com hífens e underlines", () => {
      const safePath = { id: "barber_101-sp" };
      const result = validateSchema(safePath, SCHEMAS.pathParams);
      expect(result.isValid).toBe(true);
      expect(result.sanitized.id).toBe("barber_101-sp");
    });
  });

  // ========================================================
  // 5. TESTES DE UPLOADS (ARQUIVOS & AVATARES)
  // ========================================================
  describe("Validação Estrita de Uploads de Arquivos", () => {
    it("rejeita uploads com extensões executáveis perigosas (.php, .exe, .svg)", () => {
      const phpFile = { name: "shell.php", size: 1024, type: "image/jpeg" };
      const resPhp = validateAvatarUpload(phpFile);
      expect(resPhp.isValid).toBe(false);
      expect(resPhp.errors.some((e) => e.includes(".php"))).toBe(true);

      const exeFile = { name: "trojan.exe", size: 2048, type: "image/png" };
      const resExe = validateAvatarUpload(exeFile);
      expect(resExe.isValid).toBe(false);
      expect(resExe.errors.some((e) => e.includes(".exe"))).toBe(true);

      const svgFile = { name: "xss.svg", size: 500, type: "image/svg+xml" };
      const resSvg = validateAvatarUpload(svgFile);
      expect(resSvg.isValid).toBe(false);
    });

    it("rejeita arquivos excedendo o limite de 2MB", () => {
      const heavyFile = {
        name: "foto_gigante.jpg",
        size: 3 * 1024 * 1024, // 3MB (limite 2MB)
        type: "image/jpeg",
      };
      const res = validateAvatarUpload(heavyFile);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("excedendo o limite máximo de 2MB"))).toBe(true);
    });

    it("rejeita tipos MIME não suportados (ex: application/pdf, text/html)", () => {
      const pdfFile = {
        name: "contrato.pdf",
        size: 50000,
        type: "application/pdf",
      };
      const res = validateAvatarUpload(pdfFile);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("Tipo MIME 'application/pdf' não suportado"))).toBe(true);
    });

    it("aceita arquivos de imagem válidos (JPG, PNG, WEBP) dentro do limite", () => {
      const validPhoto = {
        name: "barbeiro_carlos.png",
        size: 450 * 1024, // 450KB
        type: "image/png",
      };
      const res = validateAvatarUpload(validPhoto);
      expect(res.isValid).toBe(true);
      expect(res.errors.length).toBe(0);
    });
  });

  // ========================================================
  // 6. ENTRADAS VÁLIDAS CONTINUAM FUNCIONANDO PERFEITAMENTE
  // ========================================================
  describe("Garantia de Regressão: Entradas Válidas", () => {
    it("processa agendamento legítimo com sucesso e devolve payload sanitizado", () => {
      const legitBooking = {
        client_name: "Rodrigo Oliveira",
        client_phone: "(11) 98765-4321",
        barber_id: "barber-01",
        barber_name: "Thiago Alcantara",
        service_name: "Corte Degradê + Barboterapia",
        duration_minutes: 50,
        price: 85.0,
        start_time: "15:00",
        end_time: "15:50",
      };

      const result = validateSchema(legitBooking, SCHEMAS.appointmentBooking);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.sanitized.client_name).toBe("Rodrigo Oliveira");
      expect(result.sanitized.price).toBe(85);
    });

    it("processa cadastro legítimo de cliente com valores default corretos", () => {
      const legitClient = {
        name: "Marcelo Dutra",
        phone: "11988887777",
        cpf: "123.456.789-00",
      };

      const result = validateSchema(legitClient, SCHEMAS.clientDirectory);
      expect(result.isValid).toBe(true);
      expect(result.sanitized.frequency_days).toBe(18); // Default aplicado
      expect(result.sanitized.notes).toBe(""); // Default aplicado
    });

    it("valida a lista oficial de cargos permitidos para profissionais", () => {
      expect(ALLOWED_BARBER_ROLES).toContain("barber");
      expect(ALLOWED_BARBER_ROLES).toContain("assistant");
      expect(ALLOWED_BARBER_ROLES).toContain("receptionist");
      expect(Array.isArray(ALLOWED_BARBER_ROLES)).toBe(true);
    });
  });
});
