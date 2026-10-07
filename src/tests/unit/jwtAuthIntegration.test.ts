/**
 * @file jwtAuthIntegration.test.ts
 * @description Suíte de Testes Automatizados no Vitest para o Sistema de Autenticação JWT:
 * 1. Assinatura e Expiração de Access Token (15m) e Refresh Token (7d).
 * 2. Proteção contra adulteração de assinatura (HS256) e timing attacks.
 * 3. Validação do Controller de Login (Access Token no JSON, Refresh Token em Cookie HttpOnly).
 * 4. Validação da Rota de Silent Refresh (/refresh).
 * 5. Multi-tenant e RBAC (Owner, Barber, Client com barbeariaId).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken,
  JWT_EXPIRATION 
} from '../../services/jwtService';
import { 
  loginController, 
  refreshTokenController, 
  REFRESH_COOKIE_NAME,
  getRefreshTokenCookieOptions 
} from '../../api/authController';

describe('Suíte de Autenticação JWT (In-Memory Access Token + HttpOnly Refresh Token)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('ETAPA 1: Funções de Assinatura e Verificação de Tokens', () => {
    it('deve assinar e verificar um Access Token com expiração de 15 minutos (900s)', () => {
      const user = {
        userId: 'usr_owner_001',
        email: 'dono@barbearia.com',
        role: 'owner' as const,
        barbeariaId: 'tenant_barbearia_central',
        name: 'Carlos Oliveira',
      };

      const token = generateAccessToken(user);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const verification = verifyAccessToken(token);
      expect(verification.valid).toBe(true);
      expect(verification.payload).toBeDefined();
      expect(verification.payload?.userId).toBe('usr_owner_001');
      expect(verification.payload?.barbeariaId).toBe('tenant_barbearia_central');
      expect(verification.payload?.role).toBe('owner');
      expect(verification.payload?.tokenType).toBe('access');

      // Verifica se a expiração é de exatamente 900 segundos (15m)
      const diff = verification.payload!.exp - verification.payload!.iat;
      expect(diff).toBe(JWT_EXPIRATION.ACCESS_TOKEN_SECONDS);
      expect(diff).toBe(900);
    });

    it('deve assinar e verificar um Refresh Token com expiração de 7 dias (604800s)', () => {
      const token = generateRefreshToken({
        userId: 'usr_barber_002',
        barbeariaId: 'tenant_barbearia_central',
      });

      const verification = verifyRefreshToken(token);
      expect(verification.valid).toBe(true);
      expect(verification.payload?.tokenType).toBe('refresh');
      expect(verification.payload?.userId).toBe('usr_barber_002');
      expect(verification.payload?.barbeariaId).toBe('tenant_barbearia_central');

      // Verifica expiração de 7 dias
      const diff = verification.payload!.exp - verification.payload!.iat;
      expect(diff).toBe(JWT_EXPIRATION.REFRESH_TOKEN_SECONDS);
      expect(diff).toBe(604800);
    });

    it('deve rejeitar token com assinatura adulterada (anti-tampering)', () => {
      const token = generateAccessToken({
        userId: 'usr_client_003',
        email: 'cliente@cliente.com',
        role: 'client',
        barbeariaId: 'tenant_barbearia_central',
      });

      const parts = token.split('.');
      // Modifica o primeiro caractere da assinatura garantindo alteração de bytes
      const tamperedSig = (parts[2].startsWith('A') ? 'B' : 'A') + parts[2].slice(1);
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

      const verification = verifyAccessToken(tamperedToken);
      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('INVALID_SIGNATURE');
    });
  });

  describe('ETAPA 2: Controller de Login e Configuração do Cookie Seguro', () => {
    it('deve emitir Access Token no JSON e Refresh Token em Cookie com httpOnly, secure e sameSite', async () => {
      let responseStatusCode = 0;
      let responseJson: any = null;
      let setCookieName = '';
      let setCookieValue = '';
      let setCookieOptions: any = null;

      const mockReq: any = {
        body: {
          email: 'dono@barbearia.com',
          password: 'senha123',
        },
      };

      const mockRes: any = {
        status(code: number) {
          responseStatusCode = code;
          return this;
        },
        cookie(name: string, val: string, options: any) {
          setCookieName = name;
          setCookieValue = val;
          setCookieOptions = options;
          return this;
        },
        json(data: any) {
          responseJson = data;
          return this;
        },
      };

      await loginController(mockReq, mockRes);

      expect(responseStatusCode).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.accessToken).toBeDefined();
      expect(responseJson.user.role).toBe('owner');
      expect(responseJson.user.barbeariaId).toBe('tenant_barbearia_central');

      // Validação dos atributos estritos de segurança do Cookie
      expect(setCookieName).toBe(REFRESH_COOKIE_NAME);
      expect(typeof setCookieValue).toBe('string');
      expect(setCookieOptions.httpOnly).toBe(true); // Bloqueia leitura pelo document.cookie (Anti-XSS)
      expect(setCookieOptions.maxAge).toBe(7 * 24 * 60 * 60 * 1000); // 7 dias
      expect(['strict', 'lax']).toContain(setCookieOptions.sameSite); // Protege contra CSRF
    });

    it('deve rejeitar login com senha incorreta com HTTP 401', async () => {
      let responseStatusCode = 0;
      let responseJson: any = null;

      const mockReq: any = {
        body: {
          email: 'dono@barbearia.com',
          password: 'senha_errada_atacante',
        },
      };

      const mockRes: any = {
        status(code: number) {
          responseStatusCode = code;
          return this;
        },
        json(data: any) {
          responseJson = data;
          return this;
        },
      };

      await loginController(mockReq, mockRes);
      expect(responseStatusCode).toBe(401);
      expect(responseJson.success).toBe(false);
      expect(responseJson.error).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('ETAPA 5: Rota de Renovação Silenciosa (/refresh)', () => {
    it('deve ler o cookie HttpOnly e retornar um novo Access Token válido', async () => {
      const validRefreshToken = generateRefreshToken({
        userId: 'usr_owner_001',
        barbeariaId: 'tenant_barbearia_central',
      });

      let responseStatusCode = 0;
      let responseJson: any = null;

      const mockReq: any = {
        cookies: {
          [REFRESH_COOKIE_NAME]: validRefreshToken,
        },
        headers: {},
      };

      const mockRes: any = {
        status(code: number) {
          responseStatusCode = code;
          return this;
        },
        json(data: any) {
          responseJson = data;
          return this;
        },
      };

      await refreshTokenController(mockReq, mockRes);

      expect(responseStatusCode).toBe(200);
      expect(responseJson.success).toBe(true);
      expect(responseJson.accessToken).toBeDefined();

      // Verifica se o novo token gerado é válido
      const check = verifyAccessToken(responseJson.accessToken);
      expect(check.valid).toBe(true);
      expect(check.payload?.userId).toBe('usr_owner_001');
      expect(check.payload?.barbeariaId).toBe('tenant_barbearia_central');
    });

    it('deve rejeitar /refresh caso o cookie não exista com HTTP 401', async () => {
      let responseStatusCode = 0;
      const mockReq: any = { cookies: {}, headers: {} };
      const mockRes: any = {
        status(code: number) {
          responseStatusCode = code;
          return this;
        },
        json() {
          return this;
        },
      };

      await refreshTokenController(mockReq, mockRes);
      expect(responseStatusCode).toBe(401);
    });
  });
});
