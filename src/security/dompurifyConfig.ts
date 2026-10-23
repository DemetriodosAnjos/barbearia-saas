/**
 * @file dompurifyConfig.ts
 * @description Configuração corporativa do DOMPurify com Allowlist restrita,
 * hooks de validação de atributos, bloqueio de URIs perigosas e prevenção contra mXSS.
 */

import DOMPurifyModule, { Config } from 'dompurify';

export type SanitizationPreset = 'strict' | 'rich' | 'comment';

export interface SanitizeReport {
  originalLength: number;
  sanitizedLength: number;
  removedElementsCount: number;
  removedAttributesCount: number;
  hasThreats: boolean;
  detectedThreats: string[];
  executionTimeMs: number;
}

/**
 * Allowlists restritas por preset
 */
export const ALLOWED_TAGS_BY_PRESET: Record<SanitizationPreset, string[]> = {
  // Preset Super Restrito (apenas tags de formatação inline)
  strict: [
    'b', 'i', 'em', 'strong', 'u', 'span', 'code', 'kbd', 'mark', 'sub', 'sup'
  ],
  
  // Preset de Comentários (formatação básica + parágrafos + links seguros)
  comment: [
    'p', 'b', 'i', 'em', 'strong', 'u', 'span', 'code', 'pre', 'br',
    'ul', 'ol', 'li', 'blockquote', 'a'
  ],

  // Preset Rich Text (Artigos/descrições formatadas com tabelas e cabeçalhos)
  rich: [
    'p', 'b', 'i', 'em', 'strong', 'u', 'span', 'code', 'pre', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote',
    'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img'
  ]
};

export const ALLOWED_ATTR_BY_PRESET: Record<SanitizationPreset, string[]> = {
  strict: ['class', 'dir'],
  comment: ['class', 'href', 'title', 'rel', 'target'],
  rich: ['class', 'href', 'title', 'rel', 'target', 'src', 'alt', 'width', 'height', 'align', 'colspan', 'rowspan']
};

// Protocolos de URL estritamente permitidos
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Instância singleton estável do DOMPurify
 */
let cachedPurifyInstance: any = null;

export function getPurifyInstance(): any {
  if (cachedPurifyInstance) {
    return cachedPurifyInstance;
  }

  if (typeof DOMPurifyModule === 'function' && typeof (DOMPurifyModule as any).sanitize !== 'function') {
    if (typeof window !== 'undefined') {
      try {
        cachedPurifyInstance = (DOMPurifyModule as any)(window);
        return cachedPurifyInstance;
      } catch {
        // Ignora e utiliza módulo padrão
      }
    }
  }

  cachedPurifyInstance = DOMPurifyModule;
  return cachedPurifyInstance;
}

/**
 * Inicializa e anexa os ganchos (hooks) de segurança do DOMPurify
 */
let isHooksConfigured = false;

export function setupSecurityHooks() {
  if (isHooksConfigured) return;

  const purify = getPurifyInstance();
  if (!purify || typeof purify.addHook !== 'function') {
    return;
  }

  try {
    // Hook 1: Inspeção antes da higienização de atributos
    purify.addHook('uponSanitizeAttribute', (_node: any, data: any) => {
      if (!data || !data.attrName) return;
      const attrName = String(data.attrName).toLowerCase();
      const attrValue = String(data.attrValue || '').trim().toLowerCase();

      // 1. Bloquear qualquer manipulador de evento inline (onload, onerror, onclick, etc)
      if (attrName.startsWith('on')) {
        data.keepAttr = false;
        return;
      }

      // 2. Bloquear atributos de estilo com expressões CSS maliciosas
      if (attrName === 'style') {
        if (
          attrValue.includes('javascript:') ||
          attrValue.includes('expression(') ||
          attrValue.includes('url(') ||
          attrValue.includes('-moz-binding')
        ) {
          data.keepAttr = false;
          return;
        }
      }

      // 3. Inspeção rigorosa de URIs em href, src, formaction, data
      if (['href', 'src', 'formaction', 'action', 'data', 'xlink:href'].includes(attrName)) {
        // Bloquear URIs javascript:, vbscript:, livescript:
        if (/^(javascript|vbscript|livescript):/i.test(attrValue)) {
          data.keepAttr = false;
          return;
        }

        // Bloquear data: URIs que executam código (exceto imagens)
        if (/^data:/i.test(attrValue) && !/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(attrValue)) {
          data.keepAttr = false;
          return;
        }

        // Validar protocolo seguro para links externos
        try {
          if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(attrValue)) {
            const parsed = new URL(attrValue, 'https://dummy-base.local');
            if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
              data.keepAttr = false;
              return;
            }
          }
        } catch {
          data.keepAttr = false;
          return;
        }
      }
    });

    // Hook 2: Proteção pós-higienização para tags âncora e imagem
    purify.addHook('afterSanitizeAttributes', (node: any) => {
      if (!node || node.nodeType !== 1) return;
      const tagName = String(node.tagName || '').toUpperCase();

      if (tagName === 'A') {
        if (typeof node.setAttribute === 'function') {
          node.setAttribute('rel', 'noopener noreferrer nofollow');
          if (typeof node.hasAttribute === 'function' && !node.hasAttribute('target')) {
            node.setAttribute('target', '_blank');
          }
        }
      }
      
      if (tagName === 'IMG') {
        if (typeof node.setAttribute === 'function') {
          node.setAttribute('loading', 'lazy');
          node.setAttribute('decoding', 'async');
          const currentClass = (typeof node.getAttribute === 'function' && node.getAttribute('class')) || '';
          if (!currentClass.includes('max-w-full')) {
            node.setAttribute('class', (currentClass + ' max-w-full h-auto').trim());
          }
        }
      }
    });

    isHooksConfigured = true;
  } catch {
    // Resiliente a falhas
  }
}

/**
 * Cria a configuração do DOMPurify baseada no preset e opções adicionais
 */
export function getPurifyConfig(
  preset: SanitizationPreset = 'comment',
  overrides?: Partial<Config>
): Config {
  setupSecurityHooks();

  const allowedTags = ALLOWED_TAGS_BY_PRESET[preset] || ALLOWED_TAGS_BY_PRESET.comment;
  const allowedAttrs = ALLOWED_ATTR_BY_PRESET[preset] || ALLOWED_ATTR_BY_PRESET.comment;

  const baseConfig: Config = {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttrs,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    FORCE_BODY: false,
    SANITIZE_DOM: true,
    FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'base', 'meta', 'link', 'applet', 'svg', 'math'],
    FORBID_ATTR: [
      'onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur',
      'onkeydown', 'onkeypress', 'onkeyup', 'formaction', 'action'
    ],
    KEEP_CONTENT: true,
  };

  return {
    ...baseConfig,
    ...overrides,
  };
}

/**
 * Fallback estático caso DOMPurify não esteja em ambiente com DOM (ex: SSR puro)
 */
function fallbackSanitize(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\bon\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/javascript:[^"'>\s]*/gi, '');
}

/**
 * Função utilitária para higienização pura com relatório de auditoria
 */
export function sanitizeClientHtml(
  rawInput: string,
  preset: SanitizationPreset = 'comment',
  customConfig?: Partial<Config>
): { cleanHtml: string; report: SanitizeReport } {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      cleanHtml: '',
      report: {
        originalLength: 0,
        sanitizedLength: 0,
        removedElementsCount: 0,
        removedAttributesCount: 0,
        hasThreats: false,
        detectedThreats: [],
        executionTimeMs: 0,
      }
    };
  }

  const startTime = typeof performance !== 'undefined' ? performance.now() : 0;
  const config = getPurifyConfig(preset, customConfig);
  
  // Detecção prévia de vetores conhecidos para auditoria
  const threatPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /\bon\w+\s*=/gi,
    /javascript\s*:/gi,
    /data:\s*text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ];

  const detectedThreats: string[] = [];
  threatPatterns.forEach((pattern) => {
    const matches = rawInput.match(pattern);
    if (matches) {
      matches.forEach(m => detectedThreats.push(m.substring(0, 40)));
    }
  });

  const purify = getPurifyInstance();
  let cleanHtml = '';

  if (purify && typeof purify.sanitize === 'function') {
    try {
      cleanHtml = String(purify.sanitize(rawInput, config) || '');
    } catch {
      cleanHtml = fallbackSanitize(rawInput);
    }
  } else {
    cleanHtml = fallbackSanitize(rawInput);
  }

  const endTime = typeof performance !== 'undefined' ? performance.now() : 0;
  const executionTimeMs = Number((endTime - startTime).toFixed(2));

  const report: SanitizeReport = {
    originalLength: rawInput.length,
    sanitizedLength: cleanHtml.length,
    removedElementsCount: Math.max(0, rawInput.split('<').length - cleanHtml.split('<').length),
    removedAttributesCount: detectedThreats.length,
    hasThreats: detectedThreats.length > 0 || (rawInput.length > 0 && cleanHtml.length === 0 && rawInput.includes('<')),
    detectedThreats,
    executionTimeMs,
  };

  return { cleanHtml, report };
}
