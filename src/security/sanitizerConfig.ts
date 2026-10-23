import DOMPurify from "dompurify";

/**
 * Configuração estrita de Allowlist para DOMPurify
 * Projetada de acordo com OWASP ASVS v4.0.3 V5 (Input Validation & Output Sanitization)
 * e OWASP Cross-Site Scripting (XSS) Prevention Cheat Sheet.
 */
export interface SanitizerConfigOptions {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  FORBID_TAGS?: string[];
  FORBID_ATTR?: string[];
  ALLOW_DATA_ATTR?: boolean;
  ADD_ATTR?: string[];
  RETURN_DOM?: boolean;
  RETURN_DOM_FRAGMENT?: boolean;
  USE_PROFILES?: { html?: boolean; svg?: boolean; mathMl?: boolean };
}

/**
 * Allowlist estrita de tags HTML permitidas para estilização de conteúdo rico:
 * Formatações tipográficas básicas, listas, links e quebras.
 * Bloqueia estritamente tags ativas: script, object, embed, iframe, applet, svg, form, meta, link, base.
 */
export const STRICT_ALLOWED_TAGS: string[] = [
  "b",
  "i",
  "em",
  "strong",
  "u",
  "s",
  "strike",
  "a",
  "p",
  "br",
  "hr",
  "ul",
  "ol",
  "li",
  "span",
  "small",
  "sub",
  "sup",
  "blockquote",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
];

/**
 * Allowlist estrita de atributos permitidos.
 * Todos os eventos (on*) e atributos de execução são categoricamente barrados.
 */
export const STRICT_ALLOWED_ATTR: string[] = [
  "href",
  "title",
  "target",
  "rel",
  "class",
  "id",
  "aria-label",
  "aria-hidden",
  "aria-describedby",
];

/**
 * Tags categoricamente proibidas (Defense in Depth / Zero-Day Bypass Mitigation).
 */
export const STRICT_FORBIDDEN_TAGS: string[] = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "dialog",
  "template",
  "meta",
  "link",
  "base",
];

/**
 * Atributos categoricamente proibidos (Event Handlers e vetores de injeção direta).
 */
export const STRICT_FORBIDDEN_ATTR: string[] = [
  "onerror",
  "onload",
  "onclick",
  "onmouseover",
  "onfocus",
  "onblur",
  "onchange",
  "onsubmit",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "onmouseenter",
  "onmouseleave",
  "onpointerdown",
  "onpointerup",
  "formaction",
  "action",
  "srcdoc",
  "data",
];

/**
 * Configuração padrão imutável do DOMPurify.
 */
export const DEFAULT_DOMPURIFY_CONFIG: SanitizerConfigOptions = {
  ALLOWED_TAGS: STRICT_ALLOWED_TAGS,
  ALLOWED_ATTR: STRICT_ALLOWED_ATTR,
  FORBID_TAGS: STRICT_FORBIDDEN_TAGS,
  FORBID_ATTR: STRICT_FORBIDDEN_ATTR,
  ALLOW_DATA_ATTR: false,
};

/**
 * Inicializador e registrador de hooks de segurança para instâncias DOMPurify.
 * Garante:
 * 1. Sanitização forçada de links <a> (injeta rel="noopener noreferrer" e target="_blank").
 * 2. Neutralização de esquemas de URL perigosos (javascript:, data:text/html, vbscript:, blob:).
 */
export function initializeSecurityHooks(purifierInstance: typeof DOMPurify = DOMPurify): void {
  if (typeof window === "undefined" || !purifierInstance || !purifierInstance.addHook) {
    return;
  }

  // Remove hooks duplicados se já existirem
  try {
    purifierInstance.removeHook("afterSanitizeAttributes");
  } catch {
    // ignore
  }

  // Hook 1: Inspeção de Atributos e Endurecimento de Links
  purifierInstance.addHook("afterSanitizeAttributes", (node) => {
    // Sanitização e isolamento de links âncora
    if (node.tagName === "A") {
      const href = node.getAttribute("href");

      if (href) {
        const trimmedHref = href.trim().toLowerCase();
        // Bloqueio rigoroso de esquemas de pseudo-protocolos executáveis
        if (
          trimmedHref.startsWith("javascript:") ||
          trimmedHref.startsWith("vbscript:") ||
          trimmedHref.startsWith("data:") ||
          trimmedHref.startsWith("blob:")
        ) {
          node.removeAttribute("href");
        } else {
          // Links seguros recebem isolamento estrito contra tabnabbing reverso
          node.setAttribute("rel", "noopener noreferrer");
          node.setAttribute("target", "_blank");
        }
      }
    }

    // Remoção defensiva de qualquer atributo com valor javascript: ou data: malicioso
    const attrs = Array.from(node.attributes || []);
    for (const attr of attrs) {
      const val = (attr.value || "").trim().toLowerCase();
      if (val.startsWith("javascript:") || val.startsWith("vbscript:")) {
        node.removeAttribute(attr.name);
      }
    }
  });
}

// Inicializa hooks automaticamente no runtime
initializeSecurityHooks();

/**
 * Função utilitária pura para sanitizar qualquer string no client ou SSR.
 */
export function sanitizeClientHtml(
  rawInput: string | null | undefined,
  customConfig?: SanitizerConfigOptions
): string {
  if (!rawInput || typeof rawInput !== "string") {
    return "";
  }

  return DOMPurify.sanitize(rawInput, {
    ...DEFAULT_DOMPURIFY_CONFIG,
    ...customConfig,
  }) as string;
}

/**
 * Estatísticas e métricas de proteção contra XSS na camada de apresentação.
 */
export function getSanitizerEngineMetrics() {
  return {
    allowedTagsCount: STRICT_ALLOWED_TAGS.length,
    allowedAttrsCount: STRICT_ALLOWED_ATTR.length,
    forbiddenTagsCount: STRICT_FORBIDDEN_TAGS.length,
    forbiddenAttrsCount: STRICT_FORBIDDEN_ATTR.length,
    hooksActive: ["afterSanitizeAttributes:rel_noopener_noreferrer", "url_scheme_disarmer"],
    protocolBlocklist: ["javascript:", "data:", "vbscript:", "blob:"],
    defenseEngine: "DOMPurify v3.x Strict Client-Side Presentation Sanitizer",
  };
}
