/**
 * @file ssrfProtectionEngine.test.ts
 * @description Suíte de Testes Unitários para o Módulo de Prevenção de SSRF e Restrição de Saída de Rede
 */

import { describe, it, expect } from "vitest";
import {
  validateDestinationUrl,
  safeFetch,
  isIpv4InForbiddenRange,
  isForbiddenIpv6,
  isHostnameAllowed,
  DEFAULT_EGRESS_ALLOWLIST,
} from "../../security/ssrfProtectionEngine";

describe("Segurança de Saída de Rede & Prevenção de SSRF (CWE-918)", () => {
  describe("1. Bloqueio de Metadados de Provedores de Nuvem (IMDS)", () => {
    it("Bloqueia categoricamente o IP de metadados AWS/GCP (169.254.169.254)", () => {
      const res = validateDestinationUrl("https://169.254.169.254/latest/meta-data/");
      expect(res.valid).toBe(false);
      expect(res.code).toBe("CLOUD_METADATA_BLOCKED");
      expect(res.reason).toContain("metadados");
    });

    it("Bloqueia hostnames de metadados internos (metadata.google.internal)", () => {
      const res = validateDestinationUrl("http://metadata.google.internal/computeMetadata/v1/");
      expect(res.valid).toBe(false);
      expect(res.code).toBe("CLOUD_METADATA_BLOCKED");
    });

    it("Bloqueia qualquer endereço contido na faixa link-local (169.254.1.5)", () => {
      const res = validateDestinationUrl("https://169.254.1.5/api");
      expect(res.valid).toBe(false);
      expect(res.code).toBe("CLOUD_METADATA_BLOCKED");
    });
  });

  describe("2. Bloqueio de Loopback e Ambientes Locais", () => {
    it("Bloqueia 127.0.0.1 e toda a sub-rede 127.0.0.0/8", () => {
      const res1 = validateDestinationUrl("https://127.0.0.1:8080/admin");
      expect(res1.valid).toBe(false);
      expect(res1.code).toBe("LOOPBACK_BLOCKED");

      const res2 = validateDestinationUrl("https://127.0.1.99:9229");
      expect(res2.valid).toBe(false);
      expect(res2.code).toBe("LOOPBACK_BLOCKED");
    });

    it("Bloqueia hostname 'localhost' e variantes de domínio local", () => {
      const res = validateDestinationUrl("https://localhost:3000/internal");
      expect(res.valid).toBe(false);
      expect(res.code).toBe("LOOPBACK_BLOCKED");
    });

    it("Bloqueia endereço zero network 0.0.0.0", () => {
      const check = isIpv4InForbiddenRange("0.0.0.0");
      expect(check.forbidden).toBe(true);
      expect(check.rangeName).toBe("Zero Network");
    });
  });

  describe("3. Bloqueio de Redes Privadas (RFC 1918)", () => {
    it("Bloqueia endereços de Classe A (10.0.0.0/8)", () => {
      const res = validateDestinationUrl("https://10.0.0.15/database");
      expect(res.valid).toBe(false);
      expect(res.code).toBe("PRIVATE_IP_BLOCKED");
    });

    it("Bloqueia endereços de Classe B (172.16.0.0/12)", () => {
      const res1 = validateDestinationUrl("https://172.16.0.1:6379");
      expect(res1.valid).toBe(false);
      expect(res1.code).toBe("PRIVATE_IP_BLOCKED");

      const res2 = validateDestinationUrl("https://172.31.255.254:5432");
      expect(res2.valid).toBe(false);
      expect(res2.code).toBe("PRIVATE_IP_BLOCKED");
    });

    it("Bloqueia endereços de Classe C (192.168.0.0/16)", () => {
      const res = validateDestinationUrl("https://192.168.1.254/router");
      expect(res.valid).toBe(false);
      expect(res.code).toBe("PRIVATE_IP_BLOCKED");
    });
  });

  describe("4. Bloqueio de IPv6 Local e Privado", () => {
    it("Bloqueia IPv6 Loopback (::1)", () => {
      expect(isForbiddenIpv6("::1")).toBe(true);
      expect(isForbiddenIpv6("[::1]")).toBe(true);
      const res = validateDestinationUrl("https://[::1]/secret");
      expect(res.valid).toBe(false);
      expect(res.code).toBe("IPV6_LOCAL_BLOCKED");
    });

    it("Bloqueia IPv6 Link-Local (fe80::/10) e Unique Local (fc00::/7)", () => {
      expect(isForbiddenIpv6("fe80::1ff:fe23:4567")).toBe(true);
      expect(isForbiddenIpv6("fc00::abcd:1234")).toBe(true);
    });

    it("Bloqueia IPv4-mapped IPv6 para loopback (::ffff:127.0.0.1)", () => {
      expect(isForbiddenIpv6("::ffff:127.0.0.1")).toBe(true);
    });
  });

  describe("5. Validação de Protocolo e Esquemas Inseguros", () => {
    it("Rejeita esquemas perigosos como file:, gopher:, ftp:", () => {
      const resFile = validateDestinationUrl("file:///etc/passwd");
      expect(resFile.valid).toBe(false);
      expect(resFile.code).toBe("INVALID_PROTOCOL");

      const resGopher = validateDestinationUrl("gopher://127.0.0.1:70/_test");
      expect(resGopher.valid).toBe(false);
      expect(resGopher.code).toBe("INVALID_PROTOCOL");
    });

    it("Exige protocolo HTTPS por padrão para saídas de produção", () => {
      const res = validateDestinationUrl("http://api.mercadopago.com/checkout", {
        requireHttps: true,
      });
      expect(res.valid).toBe(false);
      expect(res.code).toBe("INVALID_PROTOCOL");
      expect(res.reason).toContain("HTTPS");
    });
  });

  describe("6. Allowlist Estrita de Domínios Homologados", () => {
    it("Permite domínios oficiais na Allowlist (Mercado Pago, Stripe, Supabase)", () => {
      expect(isHostnameAllowed("api.mercadopago.com", DEFAULT_EGRESS_ALLOWLIST)).toBe(true);
      expect(isHostnameAllowed("api.stripe.com", DEFAULT_EGRESS_ALLOWLIST)).toBe(true);
      expect(isHostnameAllowed("graph.facebook.com", DEFAULT_EGRESS_ALLOWLIST)).toBe(true);
      expect(isHostnameAllowed("db.supabase.co", DEFAULT_EGRESS_ALLOWLIST)).toBe(true);

      const res = validateDestinationUrl("https://api.mercadopago.com/v1/payments");
      expect(res.valid).toBe(true);
      expect(res.code).toBe("VALID");
    });

    it("Bloqueia domínios externos arbitrários fora da Allowlist", () => {
      const res = validateDestinationUrl("https://attacker-c2-server.com/exfiltrate");
      expect(res.valid).toBe(false);
      expect(res.code).toBe("DOMAIN_NOT_IN_ALLOWLIST");
    });
  });

  describe("7. Wrapper safeFetch() em Execução", () => {
    it("Retorna status 403 e código SSRF_PREVENTION_BLOCKED ao tentar acessar destino proibido", async () => {
      const result = await safeFetch("https://169.254.169.254/latest/meta-data/");
      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.statusText).toBe("SSRF_PREVENTION_BLOCKED");
      expect(result.headers["x-ssrf-protection"]).toBe("BLOCKED");
      expect(result.validation.code).toBe("CLOUD_METADATA_BLOCKED");
    });

    it("Interrompe chamadas com domínio fora da allowlist sem abrir conexão de socket", async () => {
      const result = await safeFetch("https://pastebin.com/raw/data");
      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.validation.code).toBe("DOMAIN_NOT_IN_ALLOWLIST");
    });
  });
});
