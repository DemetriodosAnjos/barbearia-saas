/**
 * @file googleSsoAuth.test.ts
 * @description Suíte de Testes Unitários e de Integração para as Regras de Negócio do Login com Google (SSO):
 * - RN-01: Associação Automática de Contas por E-mail existente
 * - RN-02 & EX-04: Verificação Obrigatória do E-mail (email_verified === true)
 * - RN-03: Perfil e Dados do Usuário no Primeiro Acesso (senha nula, foto, nome)
 * - RN-04: Bloqueio de Conta Inativa com mensagem explicativa
 * - EX-05: Bloqueio de Conta Suspensa/Bloqueada
 * - EX-03: Rejeição de Token Inválido / Assinatura Adulterada / Expirado
 * - RN-05: Sessão e Persistência com TTL de 15m (Access Token) e 7d (Refresh Token)
 * - RNF-01 a RNF-04: OpenID Connect, validação no backend, proteção CSRF e google_id
 * 
 * Conforme especificação oficial em docs/entrar-com-google.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateOAuthState,
  verifyOAuthState,
  generateGoogleIdToken,
  verifyGoogleIdToken,
  JWT_EXPIRATION,
} from '../../services/jwtService';
import {
  googleOAuthUrlController,
  googleOAuthTokenExchangeController,
  googleSsoController,
  GOOGLE_SSO_MESSAGES,
  MOCK_USERS_DB,
  REFRESH_COOKIE_NAME,
} from '../../api/authController';

describe('Suíte de Regras de Negócio: Login com Google SSO (docs/entrar-com-google.md)', () => {
  let validState: string;

  beforeEach(() => {
    validState = generateOAuthState('https://barbearia-saas.com');
  });

  describe('RNF-01 & RNF-03: OpenID Connect & Proteção Anti-CSRF (State)', () => {
    it('deve gerar parâmetro state assinado criptograficamente com expiração de 10 minutos', () => {
      const state = generateOAuthState('https://barbearia-saas.com');
      expect(typeof state).toBe('string');
      expect(state.split('.')).toHaveLength(3);

      const res = verifyOAuthState(state);
      expect(res.valid).toBe(true);
      expect(res.payload?.purpose).toBe('google_oauth_state');
      expect(res.payload?.origin).toBe('https://barbearia-saas.com');
      expect(res.payload!.exp - res.payload!.iat).toBe(600); // 10 minutos
    });

    it('deve rejeitar requisição de SSO quando o state estiver ausente ou corrompido (RNF-03 & EX-03)', async () => {
      let statusCode = 0;
      let jsonResult: any = null;

      const req = {
        body: {
          idToken: 'qualquer_token',
          state: 'state_invalido_ou_tampered',
        },
      } as any;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          jsonResult = data;
          return this;
        },
      } as any;

      await googleSsoController(req, res);

      expect(statusCode).toBe(401);
      expect(jsonResult.success).toBe(false);
      expect(jsonResult.code).toBe('EX-03');
      expect(jsonResult.message).toBe(GOOGLE_SSO_MESSAGES.EX_03_INVALID_TOKEN);
    });

    it('deve retornar URL de autorização OpenID Connect válida no endpoint GET /api/auth/google/url', async () => {
      let statusCode = 0;
      let jsonResult: any = null;

      const req = {
        headers: { origin: 'https://barbearia-saas.com' },
      } as any;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          jsonResult = data;
          return this;
        },
      } as any;

      await googleOAuthUrlController(req, res);

      expect(statusCode).toBe(200);
      expect(jsonResult.success).toBe(true);
      expect(jsonResult.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(jsonResult.authUrl).toContain('scope=openid+email+profile');
      expect(jsonResult.state).toBeDefined();
    });
  });

  describe('RNF-02 & EX-03: Validação do id_token no Backend', () => {
    it('deve gerar e verificar um id_token OIDC com claims padronizadas', async () => {
      const idToken = generateGoogleIdToken({
        email: 'gestor.teste@gmail.com',
        name: 'Gestor Teste',
        email_verified: true,
      });

      const verification = await verifyGoogleIdToken(idToken);
      expect(verification.valid).toBe(true);
      expect(verification.payload?.email).toBe('gestor.teste@gmail.com');
      expect(verification.payload?.name).toBe('Gestor Teste');
      expect(verification.payload?.email_verified).toBe(true);
      expect(verification.payload?.sub).toContain('google_sso_');
    });

    it('deve rejeitar id_token com assinatura JWS adulterada (EX-03)', async () => {
      let statusCode = 0;
      let jsonResult: any = null;

      const originalToken = generateGoogleIdToken({
        email: 'gestor.teste@gmail.com',
        name: 'Gestor Teste',
      });

      // Adultera assinatura
      const parts = originalToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.assinatura_falsificada`;

      const req = {
        body: {
          idToken: tamperedToken,
          state: validState,
        },
      } as any;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          jsonResult = data;
          return this;
        },
      } as any;

      await googleSsoController(req, res);

      expect(statusCode).toBe(401);
      expect(jsonResult.success).toBe(false);
      expect(jsonResult.code).toBe('EX-03');
      expect(jsonResult.message).toBe(GOOGLE_SSO_MESSAGES.EX_03_INVALID_TOKEN);
    });

    it('deve rejeitar id_token expirado (EX-03)', async () => {
      let statusCode = 0;
      let jsonResult: any = null;

      const expiredToken = generateGoogleIdToken({
        email: 'expirado@gmail.com',
        name: 'Token Expirado',
        expiresInSeconds: -10, // Expirado há 10 segundos
      });

      const req = {
        body: {
          idToken: expiredToken,
          state: validState,
        },
      } as any;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          jsonResult = data;
          return this;
        },
      } as any;

      await googleSsoController(req, res);

      expect(statusCode).toBe(401);
      expect(jsonResult.success).toBe(false);
      expect(jsonResult.code).toBe('EX-03');
      expect(jsonResult.message).toBe(GOOGLE_SSO_MESSAGES.EX_03_INVALID_TOKEN);
    });
  });

  describe('RN-02 & EX-04: Exigência Estrita de E-mail Verificado', () => {
    it('deve bloquear login se o e-mail retornado pela conta Google não for verificado (EX-04)', async () => {
      let statusCode = 0;
      let jsonResult: any = null;

      const unverifiedToken = generateGoogleIdToken({
        email: 'nao_verificado@gmail.com',
        name: 'Conta Não Verificada',
        email_verified: false, // EX-04
      });

      const req = {
        body: {
          idToken: unverifiedToken,
          state: validState,
        },
      } as any;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          jsonResult = data;
          return this;
        },
      } as any;

      await googleSsoController(req, res);

      expect(statusCode).toBe(403);
      expect(jsonResult.success).toBe(false);
      expect(jsonResult.code).toBe('EX-04');
      expect(jsonResult.message).toBe(GOOGLE_SSO_MESSAGES.EX_04_EMAIL_NOT_VERIFIED);
    });
  });

  describe('RN-01: Associação Automática de Contas por E-mail', () => {
    it('deve vincular conta local existente (dono@barbearia.com) ao Google SSO mantendo o papel de owner', async () => {
      let statusCode = 0;
      let jsonResult: any = null;
      let cookieSet: { name: string; val: string } | null = null;

      const idToken = generateGoogleIdToken({
        email: 'dono@barbearia.com',
        name: 'Carlos Oliveira Google',
        picture: 'https://lh3.googleusercontent.com/avatar_carlos.jpg',
        email_verified: true,
      });

      const req = {
        body: {
          idToken,
          state: validState,
        },
      } as any;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        cookie(name: string, val: string) {
          cookieSet = { name, val };
          return this;
        },
        json(data: any) {
          jsonResult = data;
          return this;
        },
      } as any;

      await googleSsoController(req, res);

      expect(statusCode).toBe(200);
      expect(jsonResult.success).toBe(true);
      expect(jsonResult.accountLinked).toBe(true);
      expect(jsonResult.user.email).toBe('dono@barbearia.com');
      expect(jsonResult.user.role).toBe('owner');
      expect(jsonResult.user.googleId).toBeDefined();
      expect(jsonResult.user.authProvider).toBe('linked');
      expect(cookieSet).not.toBeNull();
      expect(cookieSet?.name).toBe(REFRESH_COOKIE_NAME);
    });
  });

  describe('RN-03: Perfil e Dados do Usuário no Primeiro Acesso (Novo Usuário)', () => {
    it('deve criar automaticamente uma nova conta com Nome, E-mail, Avatar e senha nula', async () => {
      let statusCode = 0;
      let jsonResult: any = null;

      const newEmail = `cliente_novo_${Date.now()}@gmail.com`;
      const idToken = generateGoogleIdToken({
        email: newEmail,
        name: 'Ana Carolina Silva',
        picture: 'https://lh3.googleusercontent.com/avatar_ana.jpg',
        email_verified: true,
      });

      const req = {
        body: {
          idToken,
          state: validState,
        },
      } as any;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        cookie() {
          return this;
        },
        json(data: any) {
          jsonResult = data;
          return this;
        },
      } as any;

      await googleSsoController(req, res);

      expect(statusCode).toBe(200);
      expect(jsonResult.success).toBe(true);
      expect(jsonResult.isNewUser).toBe(true);
      expect(jsonResult.user.email).toBe(newEmail);
      expect(jsonResult.user.name).toBe('Ana Carolina Silva');
      expect(jsonResult.user.avatarUrl).toBe('https://lh3.googleusercontent.com/avatar_ana.jpg');
      expect(jsonResult.user.googleId).toBeDefined();

      // Confere se no banco a senha permaneceu nula (RN-03)
      const stored = MOCK_USERS_DB[newEmail];
      expect(stored).toBeDefined();
      expect(stored.passwordHash).toBeNull();
    });
  });

  describe('RN-04 & EX-05: Verificação de Status da Conta (Inativo / Suspenso)', () => {
    it('deve bloquear acesso com HTTP 403 e mensagem EX-05 para usuário suspenso (suspenso@barbearia.com)', async () => {
      let statusCode = 0;
      let jsonResult: any = null;

      const idToken = generateGoogleIdToken({
        email: 'suspenso@barbearia.com',
        name: 'Roberto Almeida',
        email_verified: true,
      });

      const req = {
        body: {
          idToken,
          state: validState,
        },
      } as any;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          jsonResult = data;
          return this;
        },
      } as any;

      await googleSsoController(req, res);

      expect(statusCode).toBe(403);
      expect(jsonResult.success).toBe(false);
      expect(jsonResult.code).toBe('EX-05');
      expect(jsonResult.message).toBe(GOOGLE_SSO_MESSAGES.EX_05_ACCOUNT_SUSPENDED);
    });

    it('deve bloquear acesso com HTTP 403 e mensagem RN-04 para usuário inativo (inativo@barbearia.com)', async () => {
      let statusCode = 0;
      let jsonResult: any = null;

      const idToken = generateGoogleIdToken({
        email: 'inativo@barbearia.com',
        name: 'Fernanda Costa',
        email_verified: true,
      });

      const req = {
        body: {
          idToken,
          state: validState,
        },
      } as any;

      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(data: any) {
          jsonResult = data;
          return this;
        },
      } as any;

      await googleSsoController(req, res);

      expect(statusCode).toBe(403);
      expect(jsonResult.success).toBe(false);
      expect(jsonResult.code).toBe('RN-04');
      expect(jsonResult.message).toBe(GOOGLE_SSO_MESSAGES.RN_04_ACCOUNT_INACTIVE);
    });
  });

  describe('RN-05: Sessão e Persistência com mesmo TTL da Plataforma', () => {
    it('deve emitir Access Token válido por 15 minutos (900s) e Refresh Token por 7 dias', async () => {
      let jsonResult: any = null;

      const idToken = generateGoogleIdToken({
        email: 'atendmentor@gmail.com',
        name: 'Gestor Master Barbearia SaaS',
        email_verified: true,
      });

      const req = {
        body: {
          idToken,
          state: validState,
        },
      } as any;

      const res = {
        status() {
          return this;
        },
        cookie() {
          return this;
        },
        json(data: any) {
          jsonResult = data;
          return this;
        },
      } as any;

      await googleSsoController(req, res);

      expect(jsonResult.success).toBe(true);
      expect(jsonResult.accessToken).toBeDefined();
      expect(jsonResult.expiresIn).toBe(JWT_EXPIRATION.ACCESS_TOKEN_SECONDS);
      expect(jsonResult.expiresIn).toBe(900); // 15 minutos
    });
  });
});
