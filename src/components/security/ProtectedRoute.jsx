import { useEffect } from "react";
import { Lock, ShieldAlert, ArrowRight, ArrowLeft, Zap } from "lucide-react";
import { findScreenDefinition, USER_ROLES } from "../../security/authorizationMatrix";
import { detectAndNeutralizeStorageTampering } from "../../security/routeSecurityGuard";
import Button from "../ui/Button";

export default function ProtectedRoute({
  screenId,
  allowedRoles: explicitAllowedRoles,
  currentRole = USER_ROLES.ANON,
  onNavigate,
  onSwitchRole,
  redirectTo = "login",
  autoRedirect = true,
  children,
}) {
  const screenDef = screenId ? findScreenDefinition(screenId) : null;

  // Se a tela não está mapeada (Default Deny para frontend), restringe a admin/superadmin
  const isPublic = screenDef?.isPublic ?? false;
  const allowedRoles = explicitAllowedRoles || screenDef?.allowedRoles || [USER_ROLES.SUPERADMIN];

  // Efeito de auditoria e redirecionamento automático
  useEffect(() => {
    // 1. Auditoria de integridade do storage: purga adulterações
    const tampering = detectAndNeutralizeStorageTampering();
    if (tampering.tamperingDetected && onNavigate) {
      if (onSwitchRole) onSwitchRole(USER_ROLES.ANON);
      onNavigate("login");
      return;
    }

    // 2. Redirecionamento imediato caso anônimo tente rota restrita
    if (autoRedirect && !isPublic && currentRole === USER_ROLES.ANON && onNavigate) {
      onNavigate(redirectTo);
    }
  }, [autoRedirect, currentRole, isPublic, onNavigate, onSwitchRole, redirectTo]);

  // 1. Tela pública: acesso irrestrito
  if (isPublic) {
    return children;
  }

  // 2. Não autenticado (anon): redirecionamento imediato para login sem vazamento no DOM
  if (currentRole === USER_ROLES.ANON) {
    if (autoRedirect) {
      return null; // Garante ZERO renderização de qualquer nó sensível no DOM antes do redirecionamento
    }
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-neutral-950 text-white">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/5">
          <Lock className="w-8 h-8 text-amber-500" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold uppercase mb-2">
          HTTP 401 • Unauthorized
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Autenticação Obrigatória
        </h2>
        <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
          Esta tela (<strong className="text-neutral-200">{screenDef?.name || screenId}</strong>) é restrita e exige uma sessão autenticada com token JWT válido.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            variant="primary"
            onClick={() => onNavigate && onNavigate("login")}
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <span>Ir para Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
          {onSwitchRole && (
            <Button
              variant="secondary"
              onClick={() => onSwitchRole(USER_ROLES.ADMIN)}
              className="text-xs font-bold"
            >
              Simular Acesso como Admin
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 3. Usuário autenticado, mas com papel insuficiente: HTTP 403
  const hasAccess =
    currentRole === USER_ROLES.SUPERADMIN || allowedRoles.includes(currentRole);

  if (!hasAccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-neutral-950 text-white">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4 shadow-lg shadow-red-500/5">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono font-bold uppercase mb-2">
          HTTP 403 • Forbidden
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Acesso Negado (Privilégio Insuficiente)
        </h2>
        <p className="text-xs text-neutral-400 max-w-md mb-4 leading-relaxed">
          O seu papel atual é <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{currentRole}</span>.
          A rota <strong className="text-neutral-200">{screenDef?.name || screenId}</strong> requer um dos seguintes papéis:
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {allowedRoles.map((role) => (
            <span
              key={role}
              className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700"
            >
              {role}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={() => onNavigate && onNavigate("client-app")}
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para App do Cliente</span>
          </Button>
          {onSwitchRole && (
            <Button
              variant="primary"
              onClick={() => onSwitchRole(allowedRoles[0] || USER_ROLES.ADMIN)}
              className="text-xs font-bold flex items-center gap-1.5"
            >
              <span>Elevar Perfil para {allowedRoles[0] || "admin"}</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 4. Acesso Concedido
  return children;
}
