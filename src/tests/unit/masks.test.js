import { describe, it, expect } from "vitest";
import { masks } from "../../utils/masks";

describe("Utility: masks", () => {
  describe("phone mask", () => {
    it("should handle empty or undefined input", () => {
      expect(masks.phone("")).toBe("");
      expect(masks.phone(undefined)).toBe("");
    });

    it("should format partial numbers", () => {
      expect(masks.phone("1")).toBe("(1");
      expect(masks.phone("11")).toBe("(11");
      expect(masks.phone("119")).toBe("(11) 9");
      expect(masks.phone("119876")).toBe("(11) 9876");
    });

    it("should format 10-digit phone number", () => {
      expect(masks.phone("1133334444")).toBe("(11) 3333-4444");
    });

    it("should format 11-digit mobile phone number", () => {
      expect(masks.phone("11987654321")).toBe("(11) 98765-4321");
    });

    it("should strip non-digit characters and truncate beyond 11 digits", () => {
      expect(masks.phone("(11) 9.8765-432199")).toBe("(11) 98765-4321");
    });
  });

  describe("cpf mask", () => {
    it("should handle empty input", () => {
      expect(masks.cpf("")).toBe("");
      expect(masks.cpf(undefined)).toBe("");
    });

    it("should format complete 11-digit CPF", () => {
      expect(masks.cpf("12345678901")).toBe("123.456.789-01");
    });

    it("should strip existing non-digits before formatting", () => {
      expect(masks.cpf("123.456.789-01")).toBe("123.456.789-01");
    });
  });

  describe("currency mask", () => {
    it("should handle empty input", () => {
      expect(masks.currency("")).toBe("");
      expect(masks.currency(undefined)).toBe("");
    });

    it("should format cents into Brazilian currency format", () => {
      // 6500 cents -> 65,00
      const formatted = masks.currency("6500");
      expect(formatted).toMatch(/65,00/);
    });

    it("should format large amounts correctly", () => {
      // 150050 cents -> 1.500,50
      const formatted = masks.currency("150050");
      expect(formatted).toMatch(/1\.500,50|1500,50/);
    });
  });
});
