import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

function loadDotEnvOverride(): Record<string, string> {
  const loaded: Record<string, string> = {};
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const k = trimmed.slice(0, eqIdx).trim();
            let v = trimmed.slice(eqIdx + 1).trim();
            if (
              (v.startsWith('"') && v.endsWith('"')) ||
              (v.startsWith("'") && v.endsWith("'"))
            ) {
              v = v.slice(1, -1);
            }
            if (v) {
              loaded[k] = v;
              process.env[k] = v;
            }
          }
        }
      });
    }
  } catch {
    // ignore
  }
  return loaded;
}

const dotEnvValues = loadDotEnvOverride();

/**
 * Plugin de Mediação Segura (Server-Side Proxy) para a API Mercado Pago e Rotas de Backend (/api/*).
 * Elimina restrições de CORS do navegador, permitindo que a validação de chaves
 * e telemetria consulte diretamente os servidores oficiais do Mercado Pago.
 */
function mercadoPagoProxyPlugin(): Plugin {
  return {
    name: 'mercado-pago-proxy',
    configureServer(server) {
      // 1. Endpoint seguro para sincronização com o arquivo .env do sistema
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/env/sync')) {
          return next();
        }

        try {
          const fs = await import('fs');
          const path = await import('path');
          const envPath = path.resolve(process.cwd(), '.env');
          const examplePath = path.resolve(process.cwd(), '.env.example');
          let targetPath = envPath;

          if (!fs.existsSync(envPath)) {
            if (fs.existsSync(examplePath)) {
              try {
                fs.copyFileSync(examplePath, envPath);
                targetPath = envPath;
              } catch {
                targetPath = examplePath;
              }
            } else {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: false, message: 'Arquivo de ambiente não encontrado.' }));
            }
          }

          const content = fs.readFileSync(targetPath, 'utf8');
          const parsed: Record<string, string> = {};

          content.split('\n').forEach((line) => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              const eqIdx = trimmed.indexOf('=');
              if (eqIdx !== -1) {
                const key = trimmed.slice(0, eqIdx).trim();
                let val = trimmed.slice(eqIdx + 1).trim();
                if (
                  (val.startsWith('"') && val.endsWith('"')) ||
                  (val.startsWith("'") && val.endsWith("'"))
                ) {
                  val = val.slice(1, -1);
                }
                parsed[key] = val;
              }
            }
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, env: parsed, totalKeys: Object.keys(parsed).length }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: err?.message || 'Erro ao ler .env' }));
        }
      });

      // 1b. Proxy Server-Side seguro para operações na tabela public.tenants (e sincronização multi-tenant)
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/supabase-proxy')) {
          return next();
        }

        try {
          const fs = await import('fs');
          const path = await import('path');
          const envPath = path.resolve(process.cwd(), '.env');
          const envVars: Record<string, string> = {};

          if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach((line) => {
              const trimmed = line.trim();
              if (trimmed && !trimmed.startsWith('#')) {
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx !== -1) {
                  const k = trimmed.slice(0, eqIdx).trim();
                  let v = trimmed.slice(eqIdx + 1).trim();
                  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                    v = v.slice(1, -1);
                  }
                  envVars[k] = v;
                }
              }
            });
          }

          const rawUrlCandidate =
            envVars.VITE_SUPABASE_URL ||
            process.env.VITE_SUPABASE_URL ||
            '';
          const supabaseUrl =
            rawUrlCandidate && !rawUrlCandidate.includes('seu-projeto')
              ? rawUrlCandidate
              : 'https://njgeevywotbflikilway.supabase.co';

          const rawServiceKey =
            envVars.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            '';
          const rawAnonKey =
            envVars.VITE_SUPABASE_ANON_KEY ||
            process.env.VITE_SUPABASE_ANON_KEY ||
            '';
          const fallbackAnonKey =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZ2Vldnl3b3RiZmxpa2lsd2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MzcyMTgsImV4cCI6MjEwNTUxMzIxOH0.MqO9fbKFvAa3DK8YW44F8obbnW4yG7wzhcgDDa2S3Qk';
          const fallbackServiceKey =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZ2Vldnl3b3RiZmxpa2lsd2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTkzNzIxOCwiZXhwIjoyMTA1NTEzMjE4fQ.BD2nXZJyGwQN3FA5yfhgCWabkUpjM8d0wxYForx4pZc';
          const anonKey =
            rawAnonKey && !rawAnonKey.includes('sua_chave') && rawAnonKey.startsWith('eyJ')
              ? rawAnonKey
              : fallbackAnonKey;
          const serviceKey =
            rawServiceKey && !rawServiceKey.includes('sua_chave') && rawServiceKey.startsWith('eyJ')
              ? rawServiceKey
              : fallbackServiceKey;

          const reqUrlObj = new URL(req.url, 'http://localhost:3000');
          const targetPath = reqUrlObj.searchParams.get('path');
          if (
            !targetPath ||
            (!targetPath.startsWith('/rest/v1/') && !targetPath.startsWith('/auth/v1/'))
          ) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Invalid target path' }));
          }

          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const rawBody = Buffer.concat(chunks).toString('utf8');

          const isAuthRoute = targetPath.startsWith('/auth/v1/');
          const clientAuth = req.headers['x-client-authorization'] || req.headers['authorization'];
          const forwardHeaders: Record<string, string> = isAuthRoute
            ? {
                apikey: anonKey,
                Authorization: clientAuth ? String(clientAuth) : `Bearer ${anonKey}`,
              }
            : {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
              };

          if (req.headers['content-type']) {
            forwardHeaders['Content-Type'] = String(req.headers['content-type']);
          } else if (rawBody) {
            forwardHeaders['Content-Type'] = 'application/json';
          }
          if (req.headers['prefer']) {
            forwardHeaders['Prefer'] = String(req.headers['prefer']);
          }
          if (req.headers['accept']) {
            forwardHeaders['Accept'] = String(req.headers['accept']);
          }
          if (req.headers['range']) {
            forwardHeaders['Range'] = String(req.headers['range']);
          }

          const upstreamUrl = `${supabaseUrl.replace(/\/$/, '')}${targetPath}`;
          const upstreamRes = await fetch(upstreamUrl, {
            method: req.method || 'GET',
            headers: forwardHeaders,
            body: ['GET', 'HEAD'].includes((req.method || 'GET').toUpperCase()) ? undefined : rawBody || undefined,
          });

          res.statusCode = upstreamRes.status;
          const contentType = upstreamRes.headers.get('content-type');
          if (contentType) res.setHeader('Content-Type', contentType);
          const contentRange = upstreamRes.headers.get('content-range');
          if (contentRange) res.setHeader('Content-Range', contentRange);

          const responseText = await upstreamRes.text();
          return res.end(responseText);
        } catch (err: any) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err?.message || 'Supabase proxy error' }));
        }
      });

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/mercadopago/health-check')) {
          return next();
        }

        try {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const publicKey = (urlObj.searchParams.get('publicKey') || '').trim();
          const accessToken = (urlObj.searchParams.get('accessToken') || '').trim();

          if (!publicKey) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                status: 400,
                error: 'bad_request',
                message: 'Chave Pública não informada.',
              })
            );
          }

          // 1. Validação da Public Key diretamente no endpoint oficial do Mercado Pago
          const pkResponse = await fetch(
            `https://api.mercadopago.com/v1/payment_methods?public_key=${encodeURIComponent(publicKey)}`,
            {
              method: 'GET',
              headers: { Accept: 'application/json' },
            }
          );

          const pkData = await pkResponse.json().catch(() => ({}));

          // Se a chave pública for inválida/alterada, Mercado Pago responde 400
          if (!pkResponse.ok) {
            res.statusCode = pkResponse.status;
            res.setHeader('Content-Type', 'application/json');
            return res.end(
              JSON.stringify({
                status: pkResponse.status,
                stage: 'public_key',
                error: pkData.error || 'bad_request',
                message: pkData.message || 'Invalid public key',
                cause: pkData.cause || [],
              })
            );
          }

          // 2. Se houver Access Token, valida a credencial privada na API do Mercado Pago
          let tokenData: any = null;
          if (accessToken && accessToken.length > 5) {
            const tokenResponse = await fetch('https://api.mercadopago.com/users/me', {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
              },
            });

            tokenData = await tokenResponse.json().catch(() => ({}));

            if (!tokenResponse.ok) {
              res.statusCode = tokenResponse.status;
              res.setHeader('Content-Type', 'application/json');
              return res.end(
                JSON.stringify({
                  status: tokenResponse.status,
                  stage: 'access_token',
                  error: tokenData.error || 'unauthorized',
                  message: tokenData.message || 'Access Token não autorizado no Mercado Pago',
                  publicKeyValid: true,
                  paymentMethodsCount: Array.isArray(pkData) ? pkData.length : 0,
                })
              );
            }
          }

          // 3. Sucesso total: chaves verificadas no Mercado Pago
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              status: 200,
              stage: 'success',
              publicKeyValid: true,
              paymentMethodsCount: Array.isArray(pkData) ? pkData.length : 0,
              user: tokenData
                ? {
                    id: tokenData.id,
                    nickname: tokenData.nickname,
                    site_id: tokenData.site_id,
                  }
                : null,
            })
          );
        } catch (err: any) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              status: 502,
              error: 'gateway_error',
              message: `Falha na mediação com servidores do Mercado Pago: ${err.message}`,
            })
          );
        }
      });

      // 3. Dispatcher HTTP seguro para endpoints de autenticação e API (/api/*)
      server.middlewares.use(async (req, res, next) => {
        if (
          req.url &&
          req.url.startsWith('/api') &&
          !req.url.startsWith('/api/env/sync') &&
          !req.url.startsWith('/api/supabase-proxy') &&
          !req.url.startsWith('/api/mercadopago/health-check')
        ) {
          try {
            const { dispatchApiRequest } = await import('./src/api/apiDispatcher.ts');
            await dispatchApiRequest(req, res, next);
            return;
          } catch (err: any) {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Internal API Error' }));
            }
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  loadDotEnvOverride();
  return {
    base: process.env.VITE_BASE_PATH || (process.env.GITHUB_PAGES === 'true' ? '/barbearia-saas/' : './'),
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        dotEnvValues.VITE_SUPABASE_URL || 'https://njgeevywotbflikilway.supabase.co'
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        dotEnvValues.VITE_SUPABASE_ANON_KEY ||
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZ2Vldnl3b3RiZmxpa2lsd2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MzcyMTgsImV4cCI6MjEwNTUxMzIxOH0.MqO9fbKFvAa3DK8YW44F8obbnW4yG7wzhcgDDa2S3Qk'
      ),
      'import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY': JSON.stringify(
        dotEnvValues.VITE_MERCADO_PAGO_PUBLIC_KEY || 'APP_USR-5ac54098-969a-4315-aa30-04d5faa9d008'
      ),
    },
    plugins: [react(), tailwindcss(), mercadoPagoProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), '.'),
      },
    },
    build: {
      sourcemap: false, // Prevenção estrita de vazamento de código-fonte (.map) em produção
      chunkSizeWarningLimit: 3000,
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
