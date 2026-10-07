import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

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

export default defineConfig(() => {
  return {
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
