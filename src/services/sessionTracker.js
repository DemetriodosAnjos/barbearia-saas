/**
 * sessionTracker.js
 * Rastreador e gerenciador global de sessões ativas e dispositivos conectados.
 * Garante que qualquer dispositivo (celular, notebook, tablet) registre e atualize
 * sua presença no Supabase assim que acessa a aplicação.
 */
import { supabase } from "../lib/supabase";
import { safeStorage } from "../utils/safeStorage";

const STORAGE_SESSION_KEY = "saas_active_session_id";

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

/**
 * Registra ou atualiza a sessão do dispositivo atual no Supabase (Executado globalmente no login/início do app)
 */
export async function registerOrUpdateGlobalSession(user, tenant) {
  if (!user?.id || user.id === "owner-usr-01") {
    return null;
  }

  const clientDevice = getClientDeviceInfo();
  const currentUa = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const storedSessionId = getStoredSessionId();

  try {
    // 1. Se já temos um ID de sessão salvo no navegador, atualiza a última atividade
    if (storedSessionId) {
      const { data: existingSession, error: checkErr } = await supabase
        .from("sessions")
        .select("id, is_active")
        .eq("id", storedSessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!checkErr && existingSession && existingSession.is_active) {
        await supabase
          .from("sessions")
          .update({
            last_activity_at: new Date().toISOString(),
            device_name: clientDevice.deviceName,
            browser: clientDevice.browser,
            os: clientDevice.os,
          })
          .eq("id", storedSessionId);
        return existingSession;
      }
    }

    // 2. Busca se já existe uma sessão ativa deste mesmo user_agent/aparelho
    const { data: matchSession } = await supabase
      .from("sessions")
      .select("id, is_active")
      .eq("user_id", user.id)
      .eq("user_agent", currentUa)
      .eq("is_active", true)
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (matchSession?.id) {
      setStoredSessionId(matchSession.id);
      await supabase
        .from("sessions")
        .update({
          last_activity_at: new Date().toISOString(),
          device_name: clientDevice.deviceName,
          browser: clientDevice.browser,
          os: clientDevice.os,
        })
        .eq("id", matchSession.id);
      return matchSession;
    }

    // 3. Cria um novo registro para esta nova sessão/dispositivo conectado
    const tenantId =
      tenant?.id && tenant.id !== "default"
        ? tenant.id
        : user?.user_metadata?.barbershop_id || null;

    const payload = {
      user_id: user.id,
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
  } catch (err) {
    // Falha silenciosa para não travar a aplicação caso a tabela ainda não exista no Supabase
    console.debug("Info de sincronização de sessão:", err?.message || err);
  }

  return null;
}

/**
 * Busca todas as sessões ativas do usuário e identifica qual é o dispositivo atual
 */
export async function fetchUserActiveSessions(user) {
  const clientDevice = getClientDeviceInfo();
  const currentUa = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const storedSessionId = getStoredSessionId();

  // Caso usuário local ou offline
  if (!user?.id || user.id === "owner-usr-01") {
    return [
      {
        id: "current-local-session",
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

  try {
    const { data: dbSessions, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("last_activity_at", { ascending: false });

    if (!error && dbSessions && dbSessions.length > 0) {
      let hasCurrent = false;

      const mapped = dbSessions.map((s) => {
        const isCurrent =
          (storedSessionId && s.id === storedSessionId) ||
          (!storedSessionId && (s.user_agent === currentUa || s.device_name === clientDevice.deviceName));

        if (isCurrent) hasCurrent = true;

        return {
          ...s,
          is_current: isCurrent,
          isMobile: /mobile|android|iphone|ipad|ipod/i.test(
            s.user_agent || s.device_name || ""
          ),
        };
      });

      if (!hasCurrent && mapped.length > 0) {
        mapped[0].is_current = true;
      }

      return mapped;
    }
  } catch (err) {
    console.debug("Info de busca de sessões:", err?.message || err);
  }

  // Fallback caso a tabela ainda esteja sendo criada no Supabase
  return [
    {
      id: "current-local-session",
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
 * Desconecta/Revoga uma sessão específica
 */
export async function revokeUserSession(sessionId, userId, reason = "Revogado pelo usuário no perfil") {
  try {
    await supabase
      .from("sessions")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revocation_reason: reason,
      })
      .eq("id", sessionId)
      .eq("user_id", userId);

    // Registra trilha de auditoria
    await supabase.from("security_audit_events").insert([
      {
        user_id: userId,
        event_type: "session_revoked",
        reason: reason,
        metadata: { revoked_session_id: sessionId },
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
export async function revokeOtherUserSessions(currentSessionId, userId) {
  try {
    let query = supabase
      .from("sessions")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revocation_reason: "Desconectado remotamente pelo usuário",
      })
      .eq("user_id", userId)
      .eq("is_active", true);

    if (currentSessionId && currentSessionId !== "current-local-session") {
      query = query.neq("id", currentSessionId);
    }

    await query;

    // Registra trilha de auditoria
    await supabase.from("security_audit_events").insert([
      {
        user_id: userId,
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
