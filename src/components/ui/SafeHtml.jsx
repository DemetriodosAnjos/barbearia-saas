import { useMemo } from "react";
import DOMPurify from "dompurify";
import {
  DEFAULT_DOMPURIFY_CONFIG,
  initializeSecurityHooks,
} from "../../security/sanitizerConfig";

// Inicializa hooks do DOMPurify se executado no navegador
initializeSecurityHooks(DOMPurify);

export function SafeHtml({
  html = "",
  as: Component = "span",
  className = "",
  config = {},
  fallback = null,
  ...props
}) {
  const sanitizedContent = useMemo(() => {
    if (!html || typeof html !== "string") {
      return "";
    }

    return DOMPurify.sanitize(html, {
      ...DEFAULT_DOMPURIFY_CONFIG,
      ...config,
    });
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
