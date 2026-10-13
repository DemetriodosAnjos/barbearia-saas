/**
 * sessionTracker.js
 * Rastreador e gerenciador global de sessões ativas e dispositivos conectados.
 * Garante que qualquer dispositivo (celular, notebook, tablet) registre e sincronize
 * sua presença no Supabase assim que acessa a aplicação.
 */
import { supabase } from "../lib/supabase";
import { safeStorage } from "../utils/safeStorage";

const STORAGE_SESSION_KEY = "saas_active_session_id";

/**
 * Converte qualquer identificador (texto, e-mail ou 'owner-usr-01') em um UUID determinístico
 * para garantir compatibilidade se a coluna user_id no Supabase for do tipo UUID.
 */
export function toSafeUuid(identifier) {
  if (!identifier) return "a0000000-0000-0000-0000-000000000001";
  const str = String(identifier).trim().toLowerCase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    return str;
  }
  // Gera hash de 32 bits determinístico
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `a0000000-0000-4000-8000-${hex.repeat(2).slice(0, 12)}`;
}

/**
 * Normaliza os identificadores do usuário para localização multi-dispositivo
 */
export function getNormalizedSessionUser(user, tenant) {
  const userId = user?.id ? String(user.id) : "owner-usr-01";
  const userEmail = (user?.email || "").toLowerCase().trim();
  const tenantId =
    tenant?.id && tenant.id !== "default"
      ? tenant.id
      : user?.user_metadata?.barbershop_id || null;

  // UUID determinístico compartilhado pelo mesmo usuário em qualquer dispositivo
  const safeUuid = toSafeUuid(user?.id || userEmail || tenantId || "owner-usr-01");

  return {
    userId,
    safeUuid,
    userEmail,
    tenantId,
  };
}

/**
 * Detecta o sistema operacional, navegador e tipo de dispositivo do cliente atual
 */
export function getClientDeviceInfo() {
  if (typeof window === "undefined" || !navigator) {
    return {
      deviceName: "Navegador Web",
      browser: "Navegador Web",
      os: "Sistema Operacional",
      isMobile: false,
    };
  }

  const ua = navigator.userAgent;
  let os = "Sistema Operacional";
  if (/windows phone/i.test(ua)) os = "Windows Phone";
  else if (/win/i.test(ua)) os = "Windows";
  else if (/iphone/i.test(ua)) os = "iPhone (iOS)";
  else if (/ipad|ipod/i.test(ua)) os = "iPad (iOS)";
  else if (/android/i.test(ua)) os = "Android";
  else if (/mac/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Navegador Web";
  if (/edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) browser = "Google Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Apple Safari";
  else if (/opr|opera/i.test(ua)) browser = "Opera";

  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);

  return {
    deviceName: `${browser} no ${os}`,
    browser,
    os,
    isMobile,
  };
}

/**
 * Formata o tempo transcorrido desde a última atividade
 */
export function formatSessionActivity(isoDate) {
  if (!isoDate) return "Atividade recente";
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Ativo agora";
    if (diffMins < 60) return `Há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Há ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Há ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
  } catch {
    return "Atividade recente";
  }
}

/**
 * Obtém o ID da sessão atual armazenado localmente neste navegador
 */
export function getStoredSessionId() {
  return safeStorage.getItem(STORAGE_SESSION_KEY) || null;
}

/**
 * Define o ID da sessão atual neste navegador
 */
export function setStoredSessionId(id) {
  if (id) {
    safeStorage.setItem(STORAGE_SESSION_KEY, id);
  } else {
    safeStorage.removeItem(STORAGE_SESSION_KEY);
  }
}

let lastGlobalRegistrationAt = 0;
const REGISTRATION_THROTTLE_MS = 20000; // Máximo de 1 registro/atualização a cada 20 segundos

/**
 * Registra ou atualiza a sessão do dispositivo atual no Supabase (Executado globalmente no login/início do app)
 */
export async function registerOrUpdateGlobalSession(user, tenant, force = false) {
  const now = Date.now();
  if (!force && now - lastGlobalRegistrationAt < REGISTRATION_THROTTLE_MS) {
    return null;
  }
  lastGlobalRegistrationAt = now;

  const clientDevice = getClientDeviceInfo();
  const currentUa = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const storedSessionId = getStoredSessionId();
  const { safeUuid, userEmail, tenantId, userId } = getNormalizedSessionUser(user, tenant);

  try {
    // 1. Busca todas as sessões ativas do usuário para casar e deduplicar
    let matchQuery = supabase
      .from("sessions")
      .select("id, is_active, device_name, user_agent, browser, os")
      .eq("is_active", true)
      .order("last_activity_at", { ascending: false });

    if (userEmail) {
      matchQuery = matchQuery.or(`user_id.eq.${safeUuid},user_id.eq.${userId},user_email.eq.${userEmail}`);
    } else {
      matchQuery = matchQuery.or(`user_id.eq.${safeUuid},user_id.eq.${userId}`);
    }

    const { data: activeRows, error: searchErr } = await matchQuery;

    if (!searchErr && activeRows && activeRows.length > 0) {
      // Prioridade:
      // 1) Sessão com ID armazenado neste navegador
      // 2) Sessão com mesmo User-Agent
      // 3) Sessão com mesmo nome legível do dispositivo (ex: "Google Chrome no Android")
      const matched =
        (storedSessionId && activeRows.find((r) => r.id === storedSessionId)) ||
        activeRows.find((r) => r.user_agent === currentUa) ||
        activeRows.find((r) => r.device_name === clientDevice.deviceName);

      if (matched) {
        setStoredSessionId(matched.id);
        await supabase
          .from("sessions")
          .update({
            last_activity_at: new Date().toISOString(),
            device_name: clientDevice.deviceName,
            browser: clientDevice.browser,
            os: clientDevice.os,
            user_agent: currentUa,
          })
          .eq("id", matched.id);

        // Desativa automaticamente quaisquer duplicatas antigas acumuladas deste mesmo aparelho
        const duplicateIds = activeRows
          .filter(
            (r) =>
              r.id !== matched.id &&
              (r.device_name === clientDevice.deviceName || r.user_agent === currentUa)
          )
          .map((r) => r.id);

        if (duplicateIds.length > 0) {
          await supabase
            .from("sessions")
            .update({
              is_active: false,
              revoked_at: new Date().toISOString(),
              revocation_reason: "Deduplicação automática de sessão repetida",
            })
            .in("id", duplicateIds);
        }

        return matched;
      }
    }

    // 2. Cria um único novo registro para este novo aparelho
    const payload = {
      user_id: safeUuid,
      user_email: userEmail || null,
      tenant_id: tenantId,
      device_name: clientDevice.deviceName,
      browser: clientDevice.browser,
      os: clientDevice.os,
      user_agent: currentUa,
      is_active: true,
      last_activity_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("sessions")
      .insert([payload])
      .select()
      .maybeSingle();

    if (!insertErr && inserted?.id) {
      setStoredSessionId(inserted.id);
      return inserted;
    }

    if (insertErr) {
      if (insertErr.code === "42501") {
        console.warn(
          "[Supabase Sessions] Erro 42501 (RLS): Para sincronizar múltiplos dispositivos, aplique o script SQL em Supabase Editor.",
          insertErr.message
        );
      } else {
        console.debug("Info de sincronização de sessão:", insertErr.message || insertErr);
      }
    }
  } catch (err) {
    console.debug("Falha na sincronização de sessão:", err?.message || err);
  }

  return null;
}

/**
 * Busca todas as sessões ativas do usuário e identifica qual é o dispositivo atual
 * Aplica deduplicação estrita: cada aparelho aparece apenas UMA VEZ na lista.
 */
export async function fetchUserActiveSessions(user, tenant) {
  const clientDevice = getClientDeviceInfo();
  const currentUa = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const storedSessionId = getStoredSessionId();
  const { safeUuid, userEmail, userId } = getNormalizedSessionUser(user, tenant);

  try {
    let query = supabase
      .from("sessions")
      .select("*")
      .eq("is_active", true);

    if (userEmail) {
      query = query.or(`user_id.eq.${safeUuid},user_id.eq.${userId},user_email.eq.${userEmail}`);
    } else {
      query = query.or(`user_id.eq.${safeUuid},user_id.eq.${userId}`);
    }

    const { data: dbSessions, error } = await query.order("last_activity_at", { ascending: false });

    if (!error && dbSessions && dbSessions.length > 0) {
      // 1. DEDUPLICAÇÃO ESTREITA POR DISPOSITIVO
      // Cada aparelho único (ex: "Google Chrome no Android", "Google Chrome no Windows")
      // deve aparecer exatamente UMA VEZ, preservando o registro mais recente.
      const uniqueDeviceMap = new Map();
      const duplicateIdsToDeactivate = [];

      for (const s of dbSessions) {
        const deviceKey = (s.device_name || `${s.browser || "Navegador"} no ${s.os || "SO"}`).trim();

        if (!uniqueDeviceMap.has(deviceKey)) {
          uniqueDeviceMap.set(deviceKey, s);
        } else {
          // Identifica linhas duplicadas para faxina no banco
          duplicateIdsToDeactivate.push(s.id);
        }
      }

      // Faxina assíncrona no Supabase das duplicatas antigas
      if (duplicateIdsToDeactivate.length > 0) {
        supabase
          .from("sessions")
          .update({
            is_active: false,
            revoked_at: new Date().toISOString(),
            revocation_reason: "Deduplicação automática de sessão repetida",
          })
          .in("id", duplicateIdsToDeactivate)
          .then(() => {})
          .catch(() => {});
      }

      const deduplicatedList = Array.from(uniqueDeviceMap.values());
      let hasCurrent = false;

      const mapped = deduplicatedList.map((s) => {
        const isCurrent =
          (storedSessionId && s.id === storedSessionId) ||
          (!storedSessionId && (s.user_agent === currentUa || s.device_name === clientDevice.deviceName));

        if (isCurrent) hasCurrent = true;

        return {
          ...s,
          is_current: isCurrent,
          isMobile: /mobile|android|iphone|ipad|ipod/i.test(
            s.user_agent || s.device_name || s.os || ""
          ),
        };
      });

      // Se nenhum bateu exatamente com o id armazenado, marca o dispositivo com user_agent local como atual
      if (!hasCurrent && mapped.length > 0) {
        const uaMatch = mapped.find((m) => m.user_agent === currentUa || m.device_name === clientDevice.deviceName);
        if (uaMatch) {
          uaMatch.is_current = true;
        } else {
          mapped[0].is_current = true;
        }
      }

      return mapped;
    }

    if (error && error.code === "42501") {
      console.warn(
        "[Supabase Sessions] Erro 42501 (RLS) ao buscar sessões. Script SQL pendente de execução no Supabase SQL Editor.",
        error.message
      );
    }
  } catch (err) {
    console.debug("Info de busca de sessões:", err?.message || err);
  }

  // Fallback caso a tabela ainda esteja sendo criada no Supabase
  return [
    {
      id: storedSessionId || "current-local-session",
      device_name: clientDevice.deviceName,
      browser: clientDevice.browser,
      os: clientDevice.os,
      user_agent: currentUa,
      is_current: true,
      is_active: true,
      last_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      isMobile: clientDevice.isMobile,
    },
  ];
}

/**
 * Desconecta/Revoga uma sessão específica (e quaisquer duplicatas do mesmo aparelho)
 */
export async function revokeUserSession(sessionId, user, tenant, reason = "Revogado pelo usuário no perfil") {
  const { safeUuid, userEmail, userId } = getNormalizedSessionUser(user, tenant);
  try {
    // 1. Busca os dados do aparelho alvo para revogar em cascata quaisquer duplicatas
    const { data: targetSession } = await supabase
      .from("sessions")
      .select("id, device_name")
      .eq("id", sessionId)
      .maybeSingle();

    let query = supabase
      .from("sessions")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revocation_reason: reason,
      });

    if (targetSession?.device_name) {
      query = query.or(`id.eq.${sessionId},device_name.eq."${targetSession.device_name}"`);
    } else {
      query = query.eq("id", sessionId);
    }

    if (userEmail) {
      query = query.or(`user_id.eq.${safeUuid},user_id.eq.${userId},user_email.eq.${userEmail}`);
    } else {
      query = query.or(`user_id.eq.${safeUuid},user_id.eq.${userId}`);
    }

    await query;

    // Registra trilha de auditoria se tabela existir
    await supabase.from("security_audit_events").insert([
      {
        user_id: safeUuid,
        event_type: "session_revoked",
        reason: reason,
        metadata: { revoked_session_id: sessionId, device_name: targetSession?.device_name },
      },
    ]).catch(() => {});

    return true;
  } catch (err) {
    console.warn("Aviso ao revogar sessão:", err);
    return false;
  }
}

/**
 * Desconecta/Revoga todas as sessões exceto a atual
 */
export async function revokeOtherUserSessions(currentSessionId, user, tenant) {
  const { safeUuid, userEmail, userId } = getNormalizedSessionUser(user, tenant);
  try {
    let query = supabase
      .from("sessions")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revocation_reason: "Desconectado remotamente pelo usuário",
      })
      .eq("is_active", true);

    if (userEmail) {
      query = query.or(`user_id.eq.${safeUuid},user_id.eq.${userId},user_email.eq.${userEmail}`);
    } else {
      query = query.or(`user_id.eq.${safeUuid},user_id.eq.${userId}`);
    }

    if (currentSessionId && currentSessionId !== "current-local-session") {
      query = query.neq("id", currentSessionId);
    }

    await query;

    // Registra trilha de auditoria
    await supabase.from("security_audit_events").insert([
      {
        user_id: safeUuid,
        event_type: "all_other_sessions_revoked",
        reason: "Desconectou todos os outros dispositivos",
        metadata: { preserved_session_id: currentSessionId },
      },
    ]).catch(() => {});

    return true;
  } catch (err) {
    console.warn("Aviso ao desconectar outros dispositivos:", err);
    return false;
  }
}
