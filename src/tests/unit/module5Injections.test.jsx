import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SafeHtml } from "../../components/ui/SafeHtml";
import {
  getAppointmentsSecure,
  buildSupabaseAppointmentQuery,
} from "../../api/appointmentsSecureQuery";

describe("Módulo 5: Injeções (SQLi e XSS)", () => {
  describe("Task 5.1: Remoção de SQL Manual (Supabase Query Builder)", () => {
    it("deve rejeitar execução se tenantId estiver ausente", async () => {
      const res = await getAppointmentsSecure({ tenantId: "" });
      expect(res.data).toBeNull();
      expect(res.error).toBeDefined();
      expect(res.error?.message).toContain("tenant_id");
    });

    it("deve construir query encadeada parametrizada preservando apóstrofo (caso D'Angelo)", () => {
      const calls = [];
      const mockQueryBuilder = {
        from: (table) => {
          calls.push({ method: "from", arg: table });
          return mockQueryBuilder;
        },
        select: (cols) => {
          calls.push({ method: "select", arg: cols });
          return mockQueryBuilder;
        },
        eq: (col, val) => {
          calls.push({ method: "eq", col, val });
          return mockQueryBuilder;
        },
        ilike: (col, pattern) => {
          calls.push({ method: "ilike", col, pattern });
          return mockQueryBuilder;
        },
        order: (col, opts) => {
          calls.push({ method: "order", col, opts });
          return mockQueryBuilder;
        },
        range: (from, to) => {
          calls.push({ method: "range", from, to });
          return mockQueryBuilder;
        },
      };

      buildSupabaseAppointmentQuery(mockQueryBuilder, {
        tenantId: "barbearia_alpha",
        clientName: "D'Angelo Santos",
        status: "confirmed",
      });

      // Valida chamada correta a partir da tabela
      expect(calls.some((c) => c.method === "from" && c.arg === "appointments")).toBe(true);

      // Valida isolamento estrito de tenant
      expect(
        calls.some((c) => c.method === "eq" && c.col === "tenant_id" && c.val === "barbearia_alpha")
      ).toBe(true);

      // Valida passagem segura do nome com apóstrofo como parâmetro vinculado (sem concatenação de strings SQL)
      const ilikeCall = calls.find((c) => c.method === "ilike");
      expect(ilikeCall).toBeDefined();
      expect(ilikeCall.col).toBe("client_name");
      expect(ilikeCall.pattern).toBe("%D'Angelo Santos%");
    });

    it("deve barrar e neutralizar payload clássico de SQLi (' OR '1'='1) via parameter binding do Supabase", () => {
      const calls = [];
      const mockQueryBuilder = {
        from: (table) => {
          calls.push({ method: "from", arg: table });
          return mockQueryBuilder;
        },
        select: (cols) => {
          calls.push({ method: "select", arg: cols });
          return mockQueryBuilder;
        },
        eq: (col, val) => {
          calls.push({ method: "eq", col, val });
          return mockQueryBuilder;
        },
        ilike: (col, pattern) => {
          calls.push({ method: "ilike", col, pattern });
          return mockQueryBuilder;
        },
        order: () => mockQueryBuilder,
        range: () => mockQueryBuilder,
      };

      const classicSqliPayload = "' OR '1'='1";
      buildSupabaseAppointmentQuery(mockQueryBuilder, {
        tenantId: "barbearia_alpha",
        clientName: classicSqliPayload,
      });

      // O payload não quebra a estrutura da query, sendo tratado literalmente como argumento de busca
      const ilikeCall = calls.find((c) => c.method === "ilike");
      expect(ilikeCall).toBeDefined();
      expect(ilikeCall.pattern).toBe(`%${classicSqliPayload}%`);
      expect(calls.filter((c) => c.method === "eq" && c.col === "tenant_id")[0].val).toBe("barbearia_alpha");
    });
  });

  describe("Task 5.2: Sanitizador de XSS no React (<SafeHtml>)", () => {
    it("deve neutralizar e remover tags <script> maliciosas clássicas (<script>alert('xss')</script>)", () => {
      const classicXssPayload = "<script>alert('xss')</script>";
      const dirtyHtml = `<p>Comentário do cliente</p>${classicXssPayload}`;
      const { container } = render(<SafeHtml html={dirtyHtml} />);

      expect(container.querySelector("script")).toBeNull();
      expect(screen.getByText("Comentário do cliente")).toBeInTheDocument();
      expect(container.innerHTML).not.toContain("<script>");
      expect(container.innerHTML).not.toContain("alert('xss')");
    });

    it("deve remover atributos de evento inline perigosos (onerror em img)", () => {
      const xssPayload = '<img src="invalid-url.jpg" onerror="alert(document.cookie)" alt="Imagem">';
      const { container } = render(<SafeHtml html={xssPayload} />);

      const img = container.querySelector("img");
      expect(img).toBeNull();
      expect(container.innerHTML).not.toContain("onerror");
      expect(container.innerHTML).not.toContain("document.cookie");
    });

    it("deve desarmar protocolos perigosos como javascript: em links", () => {
      const maliciousLink = '<a href="javascript:alert(1)">Clique aqui</a>';
      const { container } = render(<SafeHtml html={maliciousLink} />);

      const link = container.querySelector("a");
      if (link) {
        expect(link.hasAttribute("href")).toBe(false);
      }
    });

    it("deve forçar rel='noopener noreferrer' e target='_blank' em links seguros", () => {
      const safeLink = '<a href="https://barbearia.com/agendamento">Agendar Horário</a>';
      const { container } = render(<SafeHtml html={safeLink} />);

      const link = container.querySelector("a");
      expect(link).toBeInTheDocument();
      expect(link?.getAttribute("href")).toBe("https://barbearia.com/agendamento");
      expect(link?.getAttribute("rel")).toContain("noopener noreferrer");
      expect(link?.getAttribute("target")).toBe("_blank");
    });

    it("deve renderizar tags HTML seguras e formatações de texto normalmente", () => {
      const formattedText = "<strong>Corte Degradê</strong> com <em>Toalha Quente</em>.";
      const { container } = render(<SafeHtml html={formattedText} />);

      expect(container.querySelector("strong")).toHaveTextContent("Corte Degradê");
      expect(container.querySelector("em")).toHaveTextContent("Toalha Quente");
    });
  });
});
