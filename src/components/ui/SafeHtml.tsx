import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import {
  DEFAULT_DOMPURIFY_CONFIG,
  SanitizerConfigOptions,
  initializeSecurityHooks,
} from "../../security/sanitizerConfig";

// Inicializa hooks do DOMPurify se executado no navegador
initializeSecurityHooks(DOMPurify);

export interface SafeHtmlProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * String de conteúdo bruto (HTML, texto ou saída de API externa)
   */
  html?: string | null;
  /**
   * Elemento ou tag HTML que envolverá o conteúdo (padrão: "div")
   */
  as?: React.ElementType;
  /**
   * Classes CSS do Tailwind ou customizadas
   */
  className?: string;
  /**
   * Configuração customizada adicional para o DOMPurify
   */
  config?: SanitizerConfigOptions;
  /**
   * Conteúdo alternativo exibido caso a string sanitizada resulte vazia
   */
  fallback?: React.ReactNode;
}

/**
 * Componente SafeHtml (Prompt 13 - Wrapper de Sanitização e XSS no Client)
 * 
 * Atua como barreira defensiva mandatória na camada de apresentação (React).
 * Envolve a renderização de strings formatadas e ricas vindas de inputs de usuários,
 * formulários ou APIs externas de terceiros, garantindo:
 * 1. Allowlist estrita de tags HTML permitidas (b, i, strong, em, p, a, etc.).
 * 2. Neutralização absoluta de tags executáveis (<script>, <iframe>, <object>, <embed>, <svg>, <math>).
 * 3. Expurgamento de manipuladores de evento inline (onload, onerror, onclick, onmouseover).
 * 4. Desarmamento de pseudo-protocolos perigosos (javascript:, vbscript:, data:).
 * 5. Injeção forçada de rel="noopener noreferrer" e target="_blank" em links âncora.
 */
export function SafeHtml({
  html = "",
  as: Component = "div",
  className = "",
  config = {},
  fallback = null,
  ...props
}: SafeHtmlProps) {
  const sanitizedContent = useMemo(() => {
    if (!html || typeof html !== "string") {
      return "";
    }

    return DOMPurify.sanitize(html, {
      ...DEFAULT_DOMPURIFY_CONFIG,
      ...config,
    }) as string;
  }, [html, config]);

  if (!sanitizedContent) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      {...props}
    />
  );
}

export default SafeHtml;
