import { describe, it, expect } from 'vitest';
import {
  OFFICIAL_EDGE_SECURITY_HEADERS,
  OFFICIAL_CSP_DIRECTIVES,
  buildCspHeaderString,
  validateSecurityHeaders,
} from '../../security/edgeSecurityHeaders';
import fs from 'fs';
import path from 'path';

describe('DevSecOps Prompt 21: Headers de Segurança e CSP na Borda', () => {
  it('deve possuir Content-Security-Policy com todas as origens mandatárias', () => {
    const csp = OFFICIAL_EDGE_SECURITY_HEADERS['Content-Security-Policy'];

    // 1. Scripts
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("'unsafe-inline'");

    // 2. Estilos
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("'unsafe-inline'");

    // 3. Conexões e WebSockets do Supabase
    expect(csp).toContain('connect-src');
    expect(csp).toContain('https://*.supabase.co');
    expect(csp).toContain('wss://*.supabase.co');

    // 4. Imagens
    expect(csp).toContain('img-src');
    expect(csp).toContain("'self'");
    expect(csp).toContain('data:');
  });

  it('deve conter Strict-Transport-Security (HSTS) com max-age=31536000 e includeSubDomains', () => {
    const hsts = OFFICIAL_EDGE_SECURITY_HEADERS['Strict-Transport-Security'];
    expect(hsts).toContain('max-age=31536000');
    expect(hsts).toContain('includeSubDomains');
  });

  it('deve conter X-Frame-Options DENY ou SAMEORIGIN', () => {
    const xfo = OFFICIAL_EDGE_SECURITY_HEADERS['X-Frame-Options'];
    expect(['DENY', 'SAMEORIGIN']).toContain(xfo);
  });

  it('deve conter X-Content-Type-Options nosniff', () => {
    const xcto = OFFICIAL_EDGE_SECURITY_HEADERS['X-Content-Type-Options'];
    expect(xcto).toBe('nosniff');
  });

  it('deve conter Referrer-Policy strict-origin-when-cross-origin', () => {
    const ref = OFFICIAL_EDGE_SECURITY_HEADERS['Referrer-Policy'];
    expect(ref).toBe('strict-origin-when-cross-origin');
  });

  it('deve validar arquivos de configuração de borda (vercel.json, _headers e netlify.toml)', () => {
    const rootDir = process.cwd();

    // 1. vercel.json
    const vercelPath = path.join(rootDir, 'vercel.json');
    expect(fs.existsSync(vercelPath)).toBe(true);
    const vercelContent = fs.readFileSync(vercelPath, 'utf8');
    const vercelJson = JSON.parse(vercelContent);
    expect(vercelJson.headers).toBeDefined();

    const globalHeaders = vercelJson.headers.find((h: any) => h.source === '/(.*)');
    expect(globalHeaders).toBeDefined();

    const headerKeys = globalHeaders.headers.map((h: any) => h.key);
    expect(headerKeys).toContain('Content-Security-Policy');
    expect(headerKeys).toContain('Strict-Transport-Security');
    expect(headerKeys).toContain('X-Frame-Options');
    expect(headerKeys).toContain('X-Content-Type-Options');
    expect(headerKeys).toContain('Referrer-Policy');

    // 2. _headers
    const headersPath = path.join(rootDir, '_headers');
    expect(fs.existsSync(headersPath)).toBe(true);
    const headersContent = fs.readFileSync(headersPath, 'utf8');
    expect(headersContent).toContain('Content-Security-Policy:');
    expect(headersContent).toContain('Strict-Transport-Security:');
    expect(headersContent).toContain('X-Frame-Options: DENY');
    expect(headersContent).toContain('wss://*.supabase.co');

    // 3. netlify.toml
    const netlifyPath = path.join(rootDir, 'netlify.toml');
    expect(fs.existsSync(netlifyPath)).toBe(true);
    const netlifyContent = fs.readFileSync(netlifyPath, 'utf8');
    expect(netlifyContent).toContain('Content-Security-Policy =');
    expect(netlifyContent).toContain('Strict-Transport-Security =');
  });

  it('validador de headers deve pontuar 100% para os cabeçalhos oficiais', () => {
    const result = validateSecurityHeaders(OFFICIAL_EDGE_SECURITY_HEADERS);
    expect(result.valid).toBe(true);
    expect(result.score).toBe(100);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });
});
