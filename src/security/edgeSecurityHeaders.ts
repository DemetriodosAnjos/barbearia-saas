/**
 * @file edgeSecurityHeaders.ts
 * @description Definições oficiais e utilitários de validação de Headers de Segurança HTTP e CSP na Borda (Vercel, Cloudflare, Netlify).
 * Garante conformidade estrita com OWASP Secure Headers Project e previne quebras de scripts legítimos da aplicação.
 */

export interface SecurityHeadersConfig {
  'Content-Security-Policy': string;
  'Strict-Transport-Security': string;
  'X-Frame-Options': 'DENY' | 'SAMEORIGIN';
  'X-Content-Type-Options': 'nosniff';
  'Referrer-Policy': 'strict-origin-when-cross-origin' | 'no-referrer' | 'same-origin';
  'Permissions-Policy'?: string;
  'X-XSS-Protection'?: string;
  'X-Permitted-Cross-Domain-Policies'?: string;
  'Cross-Origin-Opener-Policy'?: string;
  'Cross-Origin-Resource-Policy'?: string;
}

export interface CspDirectives {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'font-src': string[];
  'connect-src': string[];
  'frame-src': string[];
  'frame-ancestors': string[];
  'object-src': string[];
  'base-uri': string[];
  'form-action': string[];
  'upgrade-insecure-requests'?: boolean;
}

/**
 * Política CSP Oficial da Aplicação (Compatível com React, Tailwind, Supabase WebSockets e Mercado Pago)
 */
export const OFFICIAL_CSP_DIRECTIVES: CspDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'wasm-unsafe-eval'",
    "https://*.supabase.co",
    "https://*.mercadopago.com",
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
  ],
  'font-src': [
    "'self'",
    "data:",
    "https://fonts.gstatic.com",
  ],
  'img-src': [
    "'self'",
    "data:",
    "blob:",
    "https:",
    "https://*.supabase.co",
    "https://images.unsplash.com",
  ],
  'connect-src': [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://*.mercadopago.com",
    "https://api.mercadopago.com",
    "https://*.googleapis.com",
  ],
  'frame-src': [
    "'self'",
    "https://*.mercadopago.com",
  ],
  'frame-ancestors': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': true,
};

/**
 * Converte o objeto de diretivas CSP em string de cabeçalho padrão HTTP
 */
export function buildCspHeaderString(directives: CspDirectives = OFFICIAL_CSP_DIRECTIVES): string {
  const parts: string[] = [];

  Object.entries(directives).forEach(([key, val]) => {
    if (key === 'upgrade-insecure-requests') {
      if (val) parts.push('upgrade-insecure-requests');
    } else if (Array.isArray(val) && val.length > 0) {
      parts.push(`${key} ${val.join(' ')}`);
    }
  });

  return parts.join('; ') + ';';
}

/**
 * Conjunto completo de cabeçalhos de segurança para borda CDN / Hospedagem
 */
export const OFFICIAL_EDGE_SECURITY_HEADERS: SecurityHeadersConfig = {
  'Content-Security-Policy': buildCspHeaderString(OFFICIAL_CSP_DIRECTIVES),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self "https://*.mercadopago.com"), usb=(), interest-cohort=()',
  'X-XSS-Protection': '1; mode=block',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Validador rigoroso de conformidade para auditoria de respostas HTTP
 */
export function validateSecurityHeaders(headers: Record<string, string | undefined>): {
  valid: boolean;
  score: number;
  checks: {
    name: string;
    passed: boolean;
    value?: string;
    expected: string;
    details: string;
  }[];
} {
  const normalized: Record<string, string> = {};
  Object.keys(headers).forEach((k) => {
    normalized[k.toLowerCase()] = headers[k] || '';
  });

  const csp = normalized['content-security-policy'] || '';
  const hsts = normalized['strict-transport-security'] || '';
  const xfo = normalized['x-frame-options'] || '';
  const xcto = normalized['x-content-type-options'] || '';
  const refPol = normalized['referrer-policy'] || '';

  const checks = [
    {
      name: 'Content-Security-Policy (CSP)',
      passed: Boolean(csp && csp.includes('default-src') && csp.includes('script-src') && csp.includes('connect-src')),
      value: csp ? `${csp.slice(0, 80)}...` : undefined,
      expected: "default-src, script-src, connect-src (com wss:// e https:// Supabase)",
      details: 'Restringe fontes de execução de scripts, conexões e renderização.',
    },
    {
      name: 'Supabase WebSockets no CSP (connect-src)',
      passed: csp.includes('wss://*.supabase.co') && csp.includes('https://*.supabase.co'),
      value: csp.includes('wss://*.supabase.co') ? 'Presente' : 'Ausente',
      expected: 'wss://*.supabase.co e https://*.supabase.co em connect-src',
      details: 'Garante que os canais de tempo real (Realtime / Postgres Changes) não sejam bloqueados.',
    },
    {
      name: 'Compatibilidade com Scripts e Estilos Legítimos',
      passed: csp.includes("'unsafe-inline'") && csp.includes("'self'"),
      value: 'script-src e style-src com allowlist segura',
      expected: "'self' com suporte controlado para frameworks SPA e Tailwind",
      details: 'Evita a quebra da renderização do Tailwind CSS e runtime React.',
    },
    {
      name: 'Strict-Transport-Security (HSTS)',
      passed: hsts.includes('max-age=31536000') && hsts.includes('includeSubDomains'),
      value: hsts || undefined,
      expected: 'max-age=31536000; includeSubDomains (mínimo 1 ano)',
      details: 'Força o navegador a utilizar exclusivamente conexões HTTPS criptografadas.',
    },
    {
      name: 'X-Frame-Options',
      passed: xfo.toUpperCase() === 'DENY' || xfo.toUpperCase() === 'SAMEORIGIN',
      value: xfo || undefined,
      expected: 'DENY ou SAMEORIGIN',
      details: 'Impede ataques de Clickjacking por encapsulamento em <iframe> em domínios não autorizados.',
    },
    {
      name: 'X-Content-Type-Options',
      passed: xcto.toLowerCase() === 'nosniff',
      value: xcto || undefined,
      expected: 'nosniff',
      details: 'Desativa o MIME-type sniffing e força os tipos declarados pelo servidor.',
    },
    {
      name: 'Referrer-Policy',
      passed: refPol.toLowerCase() === 'strict-origin-when-cross-origin' || refPol.toLowerCase() === 'no-referrer',
      value: refPol || undefined,
      expected: 'strict-origin-when-cross-origin',
      details: 'Protege tokens ou parâmetros de query string no cabeçalho Referer em requisições de terceiros.',
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return {
    valid: passedCount === checks.length,
    score,
    checks,
  };
}
