/**
 * @file routeSecurityGuard.ts
 * @description Mecanismo corporativo de defesa contra ataques de Bypass de Rotas,
 * Adulteração de Client-Side Storage (LocalStorage Forgery) e Vazamento de Dados no DOM.
 * Conforme OWASP Top 10 A01:2021 (Broken Access Control) e A07:2021 (Identification Failures).
 */

import { USER_ROLES } from './authorizationMatrix';
import { parseAndValidateJwt } from '../middleware/rbacMiddleware';
import { safeStorage } from '../utils/safeStorage';

export interface SecurityInspectionResult {
  allowed: boolean;
  tamperingDetected: boolean;
  redirectUrl: string | null;
  denialReason: string | null;
  purgedKeys: string[];
  sensitiveDataBlocked: boolean;
}

export const SENSITIVE_STORAGE_KEYS = [
  'role',
  'user_role',
  'barbearia_role',
  'user',
  'auth_user',
  'sb-auth-token',
  'supabase.auth.token',
  'access_token',
  'jwt_token',
  'admin_privileges',
];

export const PROTECTED_ROUTES = ['/admin', '/dashboard', '/barbershop', '/superadmin'];

/**
 * Normaliza a rota solicitada a partir de pathname ou parâmetros de busca
 */
export function resolveNormalizedScreen(pathname: string, search: string = ''): string {
  const cleanPath = (pathname || '/').toLowerCase().replace(/\/$/, '');
  const params = new URLSearchParams(search);
  const screenParam = params.get('screen');

  if (cleanPath === '/admin' || screenParam === 'barbershop' || cleanPath.startsWith('/admin')) {
    return 'barbershop';
  }
  if (cleanPath === '/dashboard' || screenParam === 'superadmin' || cleanPath.startsWith('/dashboard')) {
    return 'superadmin';
  }
  if (cleanPath === '/login' || screenParam === 'login') {
    return 'login';
  }
  if (cleanPath === '/onboarding' || screenParam === 'onboarding') {
    return 'onboarding';
  }
  if (cleanPath === '/design-system' || screenParam === 'design-system') {
    return 'design-system';
  }
  if (cleanPath === '/client-app' || screenParam === 'client-app' || cleanPath === '/') {
    return 'client-app';
  }

  return cleanPath.replace(/^\//, '') || 'client-app';
}

/**
 * Inspeciona o localStorage em busca de injeções arbitrárias de privilégios ('role: admin', etc.)
 * Se encontrar papéis administrativos sem um JWT criptograficamente assinado pelo servidor,
 * acusa manipulação maliciosa e limpa as chaves forjadas.
 */
export function detectAndNeutralizeStorageTampering(): {
  tamperingDetected: boolean;
  purgedKeys: string[];
  forgedDetails: string[];
} {
  const purgedKeys: string[] = [];
  const forgedDetails: string[] = [];
  let tamperingDetected = false;

  try {
    // 1. Inspeciona chaves diretas de role injetadas
    const rawRole = safeStorage.getItem('role') || safeStorage.getItem('user_role') || safeStorage.getItem('barbearia_role');
    const rawToken = safeStorage.getItem('access_token') || safeStorage.getItem('jwt_token') || safeStorage.getItem('token');
    const rawUser = safeStorage.getItem('user') || safeStorage.getItem('auth_user');

    // Validação cruzada: se o papel alegado for admin/superadmin
    const privilegedRoles = ['admin', 'superadmin', 'manager', 'root'];
    let claimedRole = rawRole ? rawRole.toLowerCase().trim() : null;

    if (!claimedRole && rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed?.role) claimedRole = String(parsed.role).toLowerCase();
      } catch {
        // Formato inválido no storage
      }
    }

    if (claimedRole && privilegedRoles.includes(claimedRole)) {
      // Exige comprovação criptográfica server-side (JWT válido com assinatura e claims correspondentes)
      let isTokenValid = false;
      if (rawToken) {
        const validation = parseAndValidateJwt(rawToken);
        if (validation.valid && validation.payload) {
          const tokenRole = validation.payload.role || validation.payload.user_metadata?.role;
          if (tokenRole === claimedRole) {
            isTokenValid = true;
          }
        }
      }

      // Se não há token válido ou se o token não sustenta o papel alegado -> TAMPERING CONFIRMADO!
      if (!isTokenValid) {
        tamperingDetected = true;
        forgedDetails.push(
          `Papel forjado detectado: "${claimedRole}" injetado no localStorage sem assinatura JWT legítima.`
        );

        // Expurgo imediato das chaves adulteradas
        SENSITIVE_STORAGE_KEYS.forEach((key) => {
          if (safeStorage.getItem(key) !== null) {
            safeStorage.removeItem(key);
            purgedKeys.push(key);
          }
        });
      }
    }
  } catch (err) {
    console.warn('[SecurityGuard] Falha ao auditar localStorage:', err);
  }

  return { tamperingDetected, purgedKeys, forgedDetails };
}

/**
 * Validação abrangente de acesso à rota com blindagem contra bypass
 */
export function evaluateRouteAccessSecurity({
  targetScreen,
  currentRole,
  authToken,
}: {
  targetScreen: string;
  currentRole: string;
  authToken?: string | null;
}): SecurityInspectionResult {
  // 1. Telas públicas liberadas
  const publicScreens = ['client-app', 'login', 'onboarding', 'design-system'];
  if (publicScreens.includes(targetScreen)) {
    return {
      allowed: true,
      tamperingDetected: false,
      redirectUrl: null,
      denialReason: null,
      purgedKeys: [],
      sensitiveDataBlocked: false,
    };
  }

  // 2. Checagem de adulteração no localStorage
  const audit = detectAndNeutralizeStorageTampering();
  if (audit.tamperingDetected) {
    return {
      allowed: false,
      tamperingDetected: true,
      redirectUrl: '/login',
      denialReason: 'Tentativa de manipulação de localStorage detectada (Injeção de Role forjado). Sessão purgada.',
      purgedKeys: audit.purgedKeys,
      sensitiveDataBlocked: true,
    };
  }

  // 3. Usuário anônimo ou sem token tentando acessar /admin ou /dashboard
  if (!currentRole || currentRole === USER_ROLES.ANON || !authToken) {
    // Se há tentativa de rota restrita sem autenticação
    if (['barbershop', 'superadmin'].includes(targetScreen)) {
      return {
        allowed: false,
        tamperingDetected: false,
        redirectUrl: '/login',
        denialReason: 'Acesso direto não autorizado a rota protegida sem credenciais de sessão.',
        purgedKeys: [],
        sensitiveDataBlocked: true,
      };
    }
  }

  // 4. Verificação de privilégios RBAC com token válido
  if (targetScreen === 'superadmin') {
    if (currentRole !== USER_ROLES.SUPERADMIN) {
      return {
        allowed: false,
        tamperingDetected: false,
        redirectUrl: '/login',
        denialReason: 'Privilégio insuficiente para tela SuperAdmin (Exige papel superadmin).',
        purgedKeys: [],
        sensitiveDataBlocked: true,
      };
    }
  }

  if (targetScreen === 'barbershop') {
    if (![USER_ROLES.ADMIN, USER_ROLES.EMPLOYEE, USER_ROLES.SUPERADMIN, 'owner', 'tenant'].includes(currentRole as any)) {
      return {
        allowed: false,
        tamperingDetected: false,
        redirectUrl: '/login',
        denialReason: 'Privilégio insuficiente para Painel da Barbearia.',
        purgedKeys: [],
        sensitiveDataBlocked: true,
      };
    }
  }

  return {
    allowed: true,
    tamperingDetected: false,
    redirectUrl: null,
    denialReason: null,
    purgedKeys: [],
    sensitiveDataBlocked: false,
  };
}
