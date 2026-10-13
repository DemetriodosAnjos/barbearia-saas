import ProjectIcon from "./components/ui/ProjectIcon";
import { useState, useEffect, useCallback } from "react";
import {
  supabase,
  buildTenantRecordPayload,
  normalizeTenantRecord,
} from "./lib/supabase";
import DesignSystem from "./pages/DesignSystem";
import QAPanel from "./pages/QAPanel/QAPanel";
import OnboardingWizard from "./pages/Onboarding/OnboardingWizard";
import Login from "./pages/Auth/Login";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import BarbershopDashboard from "./pages/BarbershopAdmin/BarbershopDashboard";
import ClientBookingView from "./pages/ClientBooking/ClientBookingView";
import OnboardingQuiz from "./components/onboarding/OnboardingQuiz";
import { safeStorage } from "./utils/safeStorage";
import ProtectedRoute from "./components/security/ProtectedRoute";
import { USER_ROLES } from "./security/authorizationMatrix";
import {
  detectAndNeutralizeStorageTampering,
} from "./security/routeSecurityGuard";
import { useSecureLogout } from "./hooks/useSecureLogout";
import {
  validateServicesContract,
  validateBarbersContract,
  validateAppointmentsContract,
  validateProductsContract,
} from "./security/apiContractValidator";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { PartialDataNotice } from "./components/ui/ContractFallback";
import OfflineBanner from "./components/resilience/OfflineBanner";
import { registerOrUpdateGlobalSession } from "./services/sessionTracker";

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlScreen = urlParams.get("screen");
  const urlBarber = urlParams.get("barbeiro");
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  // 1. Auditoria Imediata Anti-Bypass no Inicializador de Rota
  const storageAudit = detectAndNeutralizeStorageTampering();
  const isDirectProtectedUrl =
    pathname === "/admin" ||
    pathname === "/dashboard" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/dashboard/");

  // Determina usuário e papel iniciais com base na sessão persistida no safeStorage
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUserStr = safeStorage.getItem("saas_auth_user");
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed?.email) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [activeUserRole, setActiveUserRole] = useState(() => {
    if (storageAudit.tamperingDetected) return USER_ROLES.ANON;
    try {
      const savedUserStr = safeStorage.getItem("saas_auth_user");
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        const r = parsed?.user_metadata?.role || parsed?.role;
        if (r) return r === "owner" || r === "tenant" ? USER_ROLES.ADMIN : r;
      }
    } catch {
      // ignore
    }
    return USER_ROLES.ANON;
  });

  // Determina tela inicial: restaura tela persistida ou redireciona conforme perfil
  const initialScreen = (() => {
    if (storageAudit.tamperingDetected) return "login";
    if (urlScreen) return urlScreen;
    if (urlBarber) return "login";

    try {
      const savedUserStr = safeStorage.getItem("saas_auth_user");
      const savedScreen = safeStorage.getItem("saas_active_screen");
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed?.email) {
          const userEmail = (parsed.email || "").toLowerCase().trim();
          const isSuperAdminEmail =
            userEmail === "atendmentor@gmail.com" ||
            (Boolean(import.meta.env?.VITE_SUPERADMIN_EMAIL) &&
              userEmail === String(import.meta.env.VITE_SUPERADMIN_EMAIL).toLowerCase().trim());
          if (savedScreen && savedScreen !== "login") {
            return savedScreen;
          }
          return isSuperAdminEmail ? "superadmin" : "barbershop";
        }
      }
    } catch {
      // ignore
    }

    if (isDirectProtectedUrl) return "login";
    return "login";
  })();

  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [loginPrefillEmail, setLoginPrefillEmail] = useState("");
  const [googleNewUserCandidate, setGoogleNewUserCandidate] = useState(null);

  const handleNavigate = useCallback((screenId) => {
    safeStorage.setItem("saas_active_screen", screenId);
    setCurrentScreen(screenId);
  }, []);

  // Estados Centrais do SaaS (Carregado com dados reais do banco de dados)
  const [tenant, setTenant] = useState(() =>
    normalizeTenantRecord({
      id: "788299e3-a26c-4a0b-bc71-c7ae81ed40d3",
      name: "Barbearia Dos Anjos",
      slug: "barbearia-dos-anjos",
      plan: "starter",
      subscription_plan: "Starter",
      status: "active",
      owner_email: "ddoanjos@gmail.com",
      owner_name: "Demetrio A L dos Anjos",
      phone: "(41) 99788-4424",
    })
  );

  // Resolve e sincroniza o registro do tenant do usuário autenticado na tabela `tenants`
  const resolveAndSyncUserTenant = useCallback(async (authUser) => {
    if (!authUser) return null;

    try {
      const userMeta = authUser.user_metadata || {};
      const userEmail = (authUser.email || userMeta.owner_email || "").trim().toLowerCase();
      let candidateTenantId = userMeta.barbershop_id || userMeta.tenant_id || null;

      let tenantRow = null;
      let barbershopRow = null;
      let profileRow = null;

      // 1. Consulta perfil se existir ID de usuário válido
      if (authUser.id && authUser.id !== "owner-usr-01") {
        try {
          const { data: pData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();
          if (pData) {
            profileRow = pData;
            if (!candidateTenantId && pData.barbershop_id) {
              candidateTenantId = pData.barbershop_id;
            }
          }
        } catch {
          // Segue resolução
        }
      }

      // 2. Busca na tabela oficial `tenants` por ID ou por owner_email
      if (candidateTenantId) {
        try {
          const { data: tById } = await supabase
            .from("tenants")
            .select("*")
            .eq("id", candidateTenantId)
            .maybeSingle();
          if (tById) tenantRow = tById;
        } catch {
          // Continua busca
        }
      }

      if (!tenantRow && userEmail) {
        try {
          const { data: tByEmail } = await supabase
            .from("tenants")
            .select("*")
            .eq("owner_email", userEmail)
            .order("created_at", { ascending: false })
            .limit(1);
          const firstMatch = Array.isArray(tByEmail) ? tByEmail[0] : tByEmail;
          if (firstMatch) {
            tenantRow = firstMatch;
            if (!candidateTenantId) candidateTenantId = firstMatch.id;
          }
        } catch {
          // Continua busca
        }
      }

      // 3. Busca dados complementares na tabela `barbershops`
      const lookupShopId = candidateTenantId || tenantRow?.id;
      if (lookupShopId) {
        try {
          const { data: bData } = await supabase
            .from("barbershops")
            .select("*")
            .eq("id", lookupShopId)
            .maybeSingle();
          if (bData) barbershopRow = bData;
        } catch {
          // Continua
        }
      }

      const resolvedId =
        tenantRow?.id ||
        barbershopRow?.id ||
        candidateTenantId ||
        "a0000000-0000-0000-0000-000000000001";

      const resolvedName =
        (barbershopRow?.name && (!tenantRow?.name || tenantRow.name.startsWith("Barbearia ")))
          ? barbershopRow.name
          : tenantRow?.name || barbershopRow?.name || userMeta.barbershop_name || "Minha Barbearia";

      const resolvedSlug =
        (barbershopRow?.slug && (!tenantRow?.slug || tenantRow.slug.startsWith("barbearia-")))
          ? barbershopRow.slug
          : tenantRow?.slug || barbershopRow?.slug || userMeta.slug || "minha-barbearia";

      const resolvedOwnerName =
        tenantRow?.owner_name ||
        profileRow?.full_name ||
        userMeta.owner_name ||
        userMeta.name ||
        "Gestor";

      const resolvedPhone =
        tenantRow?.phone ||
        barbershopRow?.phone ||
        profileRow?.phone ||
        userMeta.phone ||
        "";

      const isShopTrial =
        String(tenantRow?.plan || "").toLowerCase() === "trial" ||
        String(tenantRow?.status || "").toLowerCase() === "trial" ||
        String(barbershopRow?.subscription_plan || "").toLowerCase() === "trial" ||
        String(barbershopRow?.subscription_plan || "").toLowerCase().includes("teste") ||
        String(barbershopRow?.payment_status || "").toLowerCase() === "trial";

      const resolvedPlan = isShopTrial
        ? "trial"
        : (barbershopRow?.subscription_plan && barbershopRow.subscription_plan !== "trial"
            ? String(barbershopRow.subscription_plan).toLowerCase()
            : tenantRow?.plan || barbershopRow?.plan || userMeta.plan || "pro");

      const resolvedTrialEndsAt =
        tenantRow?.trial_ends_at ||
        barbershopRow?.trial_ends_at ||
        userMeta.trial_ends_at ||
        null;

      // Se o usuário possui e-mail válido e a linha em `tenants` não existia ou estava incompleta, sincroniza
      const isRealUser = Boolean(userEmail && userEmail.includes("@"));
      const needsTenantUpsert =
        isRealUser &&
        (!tenantRow ||
          (!tenantRow.owner_email && userEmail) ||
          (!tenantRow.phone && resolvedPhone));

      let syncedTenantData = tenantRow;
      if (needsTenantUpsert) {
        const upsertPayload = buildTenantRecordPayload({
          id: resolvedId,
          name: resolvedName,
          slug: resolvedSlug,
          ownerName: resolvedOwnerName,
          ownerEmail: userEmail,
          phone: resolvedPhone,
          plan: resolvedPlan,
          status: tenantRow?.status || "active",
          barbersCount: Number(tenantRow?.barbers_count || 1),
          mrr: Number(tenantRow?.mrr || 0) > 0 ? Number(tenantRow.mrr) : undefined,
          trialDaysLeft: Number(tenantRow?.trial_days_left || 7),
          trialEndsAt: resolvedTrialEndsAt,
          hasWhiteLabel: Boolean(tenantRow?.has_white_label),
          brandPrimary: tenantRow?.brand_primary || "#ea580c",
          brandSecondary: tenantRow?.brand_secondary || "#16a34a",
          logoUrl: tenantRow?.logo_url || "",
          createdAt: tenantRow?.created_at,
        });

        try {
          const { data: upserted, error: upsertErr } = await supabase
            .from("tenants")
            .upsert([upsertPayload], { onConflict: "id" })
            .select()
            .maybeSingle();
          if (upsertErr) {
            console.warn(
              "Aviso na sincronização do tenant (verifique as políticas RLS na tabela tenants do Supabase):",
              upsertErr.message
            );
          }
          syncedTenantData = upserted || upsertPayload;
        } catch (err) {
          console.warn("Aviso ao sincronizar tenant:", err);
          syncedTenantData = upsertPayload;
        }
      }

      const finalNormalized = normalizeTenantRecord(
        {
          ...(barbershopRow || {}),
          ...(syncedTenantData || {}),
          id: resolvedId,
          name: resolvedName,
          slug: resolvedSlug,
          owner_name: resolvedOwnerName,
          owner_email: userEmail,
          phone: resolvedPhone,
          plan: resolvedPlan,
          trial_ends_at: resolvedTrialEndsAt,
        },
        authUser
      );

      if (profileRow) {
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const mergedMeta = {
            ...(prev.user_metadata || {}),
            name: profileRow.full_name || prev.user_metadata?.name || prev.name,
            full_name: profileRow.full_name || prev.user_metadata?.full_name,
            display_name: profileRow.display_name || prev.user_metadata?.display_name,
            displayName: profileRow.display_name || prev.user_metadata?.displayName,
            cpf: profileRow.cpf || prev.user_metadata?.cpf,
            cnpj: profileRow.cnpj || prev.user_metadata?.cnpj,
            birth_date: profileRow.birth_date || prev.user_metadata?.birth_date,
            birthDate: profileRow.birth_date || prev.user_metadata?.birthDate,
            phone: profileRow.phone || prev.user_metadata?.phone,
            avatar_url: profileRow.avatar_url || prev.user_metadata?.avatar_url,
          };
          const updated = {
            ...prev,
            name: profileRow.full_name || prev.name,
            displayName: profileRow.display_name || prev.displayName,
            display_name: profileRow.display_name || prev.display_name,
            cpf: profileRow.cpf || prev.cpf,
            cnpj: profileRow.cnpj || prev.cnpj,
            birth_date: profileRow.birth_date || prev.birth_date,
            birthDate: profileRow.birth_date || prev.birthDate,
            user_metadata: mergedMeta,
          };
          safeStorage.setItem("saas_auth_user", JSON.stringify(updated));
          return updated;
        });
      }

      setTenant(finalNormalized);
      return finalNormalized;
    } catch (err) {
      console.warn("Aviso ao resolver tenant do usuário autenticado:", err);
      const fallback = normalizeTenantRecord(
        {
          id: authUser?.user_metadata?.barbershop_id || "a0000000-0000-0000-0000-000000000001",
          name: authUser?.user_metadata?.barbershop_name || "Minha Barbearia",
          slug: authUser?.user_metadata?.slug || "minha-barbearia",
          owner_name: authUser?.user_metadata?.name || "Gestor",
          owner_email: authUser?.email || "",
          phone: authUser?.user_metadata?.phone || "",
        },
        authUser
      );
      setTenant(fallback);
      return fallback;
    }
  }, []);

  // Sincronização e validação de sessão real ao recarregar a página (F5)
  useEffect(() => {
    let isMounted = true;

    async function syncAuthSession() {
      try {
        // 1. Tenta sessão oficial do Supabase GoTrue
        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (session?.user) {
          if (!isMounted) return;
          const rawRole = session.user.user_metadata?.role || session.user.role;
          const normalizedRole =
            !rawRole || rawRole === "owner" || rawRole === "tenant" || rawRole === "authenticated"
              ? USER_ROLES.ADMIN
              : rawRole;
          const userWithRole = {
            ...session.user,
            role: normalizedRole,
            user_metadata: {
              ...(session.user.user_metadata || {}),
              role: normalizedRole,
            },
          };
          setCurrentUser(userWithRole);
          setActiveUserRole(normalizedRole);
          safeStorage.setItem("saas_auth_user", JSON.stringify(userWithRole));
          if (session.access_token) {
            safeStorage.setItem("saas_jwt_access_token", session.access_token);
            safeStorage.setItem("access_token", session.access_token);
          }
          await resolveAndSyncUserTenant(userWithRole);

          const savedScreen = safeStorage.getItem("saas_active_screen");
          const targetScreen =
            savedScreen && savedScreen !== "login"
              ? savedScreen
              : normalizedRole === USER_ROLES.SUPERADMIN
                ? "superadmin"
                : "barbershop";
          setCurrentScreen(targetScreen);
          safeStorage.setItem("saas_active_screen", targetScreen);
          return;
        }

        // 2. Se o Supabase GoTrue não tiver sessão, recupera a sessão salva no safeStorage (Google SSO, login local ou token)
        const savedUserStr = safeStorage.getItem("saas_auth_user");
        if (savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            if (savedUser?.email) {
              if (!isMounted) return;
              const userEmail = (savedUser.email || "").toLowerCase().trim();
              const isSuper =
                userEmail === "atendmentor@gmail.com" ||
                (Boolean(import.meta.env?.VITE_SUPERADMIN_EMAIL) &&
                  userEmail === String(import.meta.env.VITE_SUPERADMIN_EMAIL).toLowerCase().trim());
              const role = isSuper
                ? USER_ROLES.SUPERADMIN
                : savedUser.user_metadata?.role || savedUser.role || USER_ROLES.ADMIN;
              const normalizedRole =
                role === "owner" || role === "tenant" ? USER_ROLES.ADMIN : role;
              const userWithRole = {
                ...savedUser,
                role: normalizedRole,
                user_metadata: {
                  ...(savedUser.user_metadata || {}),
                  role: normalizedRole,
                },
              };
              setCurrentUser(userWithRole);
              setActiveUserRole(normalizedRole);
              await resolveAndSyncUserTenant(userWithRole);

              const savedScreen = safeStorage.getItem("saas_active_screen");
              const targetScreen =
                savedScreen && savedScreen !== "login"
                  ? savedScreen
                  : normalizedRole === USER_ROLES.SUPERADMIN
                    ? "superadmin"
                    : "barbershop";
              setCurrentScreen(targetScreen);
              safeStorage.setItem("saas_active_screen", targetScreen);
              return;
            }
          } catch {
            // falha ao ler json salvo
          }
        }

        // 3. Tenta silent refresh com a API /api/auth/refresh
        try {
          const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData?.success && refreshData?.user) {
              if (!isMounted) return;
              const rUser = refreshData.user;
              const userEmail = (rUser.email || "").toLowerCase().trim();
              const isSuper =
                userEmail === "atendmentor@gmail.com" ||
                (Boolean(import.meta.env?.VITE_SUPERADMIN_EMAIL) &&
                  userEmail === String(import.meta.env.VITE_SUPERADMIN_EMAIL).toLowerCase().trim());
              const role = isSuper
                ? USER_ROLES.SUPERADMIN
                : rUser.role || USER_ROLES.ADMIN;
              const normalizedRole =
                role === "owner" || role === "tenant" ? USER_ROLES.ADMIN : role;
              const userWithRole = {
                ...rUser,
                role: normalizedRole,
                user_metadata: {
                  role: normalizedRole,
                },
              };
              setCurrentUser(userWithRole);
              setActiveUserRole(normalizedRole);
              safeStorage.setItem("saas_auth_user", JSON.stringify(userWithRole));
              if (refreshData.accessToken) {
                safeStorage.setItem("saas_jwt_access_token", refreshData.accessToken);
                safeStorage.setItem("access_token", refreshData.accessToken);
              }
              await resolveAndSyncUserTenant(userWithRole);

              const savedScreen = safeStorage.getItem("saas_active_screen");
              const targetScreen =
                savedScreen && savedScreen !== "login"
                  ? savedScreen
                  : normalizedRole === USER_ROLES.SUPERADMIN
                    ? "superadmin"
                    : "barbershop";
              setCurrentScreen(targetScreen);
              safeStorage.setItem("saas_active_screen", targetScreen);
              return;
            }
          }
        } catch {
          // ignore
        }

        // 4. Se não há sessão válida em nenhuma fonte e tela protegida
        if (!isMounted) return;
        const currentSavedUser = safeStorage.getItem("saas_auth_user");
        if (!currentSavedUser) {
          if (
            currentScreen !== "superadmin" &&
            currentScreen !== "design-system" &&
            currentScreen !== "client-app" &&
            currentScreen !== "onboarding" &&
            currentScreen !== "qa-panel"
          ) {
            setCurrentUser(null);
            setActiveUserRole(USER_ROLES.ANON);
            if (currentScreen === "barbershop") {
              setCurrentScreen("login");
            }
          }
        }
      } catch (err) {
        console.error("Erro na verificação de sessão:", err);
      }
    }

    syncAuthSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const rawRole = session.user.user_metadata?.role || session.user.role;
        const normalizedRole =
          !rawRole || rawRole === "owner" || rawRole === "tenant" || rawRole === "authenticated"
            ? USER_ROLES.ADMIN
            : rawRole;
        const userWithRole = {
          ...session.user,
          role: normalizedRole,
          user_metadata: {
            ...(session.user.user_metadata || {}),
            role: normalizedRole,
          },
        };
        setCurrentUser(userWithRole);
        setActiveUserRole(normalizedRole);
        safeStorage.setItem("saas_auth_user", JSON.stringify(userWithRole));
        if (session.access_token) {
          safeStorage.setItem("saas_jwt_access_token", session.access_token);
          safeStorage.setItem("access_token", session.access_token);
        }
        resolveAndSyncUserTenant(userWithRole);

        if (event === "SIGNED_IN") {
          const savedScreen = safeStorage.getItem("saas_active_screen");
          const nextScreen =
            savedScreen && savedScreen !== "login"
              ? savedScreen
              : normalizedRole === USER_ROLES.SUPERADMIN
                ? "superadmin"
                : "barbershop";
          setCurrentScreen(nextScreen);
          safeStorage.setItem("saas_active_screen", nextScreen);
        }
      } else if (event === "SIGNED_OUT") {
        const savedUserStr = safeStorage.getItem("saas_auth_user");
        if (!savedUserStr) {
          setCurrentUser(null);
          setActiveUserRole(USER_ROLES.ANON);
          setCurrentScreen("login");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [resolveAndSyncUserTenant]);

  // Sincronização global automática do dispositivo, presença ativa e escuta de revogação remota
  useEffect(() => {
    if (currentUser?.id || currentUser?.email) {
      registerOrUpdateGlobalSession(currentUser, tenant);

      // Heartbeat a cada 30 segundos enquanto a aplicação estiver aberta
      const heartbeatInterval = setInterval(async () => {
        registerOrUpdateGlobalSession(currentUser, tenant);

        // Verifica se a sessão deste aparelho específico foi revogada remotamente
        const storedSessionId = safeStorage.getItem("saas_active_session_id");
        if (storedSessionId) {
          try {
            const { data } = await supabase
              .from("sessions")
              .select("id, is_active")
              .eq("id", storedSessionId)
              .maybeSingle();
            if (data && data.is_active === false) {
              console.warn("[Segurança] Sessão deste aparelho revogada. Redirecionando para login.");
              safeStorage.removeItem("saas_auth_user");
              safeStorage.removeItem("saas_active_screen");
              safeStorage.removeItem("saas_jwt_access_token");
              safeStorage.removeItem("access_token");
              safeStorage.removeItem("saas_active_session_id");
              setCurrentUser(null);
              setActiveUserRole(USER_ROLES.ANON);
              setCurrentScreen("login");
            }
          } catch {
            // ignore
          }
        }
      }, 30000);

      // Sincroniza e verifica status imediatamente ao focar na janela/aba do navegador
      const handleWindowFocus = async () => {
        registerOrUpdateGlobalSession(currentUser, tenant);
        const storedSessionId = safeStorage.getItem("saas_active_session_id");
        if (storedSessionId) {
          try {
            const { data } = await supabase
              .from("sessions")
              .select("id, is_active")
              .eq("id", storedSessionId)
              .maybeSingle();
            if (data && data.is_active === false) {
              safeStorage.removeItem("saas_auth_user");
              safeStorage.removeItem("saas_active_screen");
              safeStorage.removeItem("saas_jwt_access_token");
              safeStorage.removeItem("access_token");
              safeStorage.removeItem("saas_active_session_id");
              setCurrentUser(null);
              setActiveUserRole(USER_ROLES.ANON);
              setCurrentScreen("login");
            }
          } catch {
            // ignore
          }
        }
      };
      window.addEventListener("focus", handleWindowFocus);

      // Escuta eventos Realtime na tabela sessions para revogação instantânea (< 1s)
      let channel;
      try {
        channel = supabase
          .channel("realtime-session-revocation-guard")
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "sessions" },
            (payload) => {
              const currentStoredId = safeStorage.getItem("saas_active_session_id");
              if (
                payload.new &&
                payload.new.is_active === false &&
                currentStoredId &&
                payload.new.id === currentStoredId
              ) {
                console.warn("[Segurança] Sessão revogada em tempo real. Redirecionando para login.");
                safeStorage.removeItem("saas_auth_user");
                safeStorage.removeItem("saas_active_screen");
                safeStorage.removeItem("saas_jwt_access_token");
                safeStorage.removeItem("access_token");
                safeStorage.removeItem("saas_active_session_id");
                setCurrentUser(null);
                setActiveUserRole(USER_ROLES.ANON);
                setCurrentScreen("login");
              }
            }
          )
          .subscribe();
      } catch {
        // ignore
      }

      // Escuta evento customizado de logout forçado disparado pelo perfil
      const handleCustomForceLogout = () => {
        safeStorage.removeItem("saas_auth_user");
        safeStorage.removeItem("saas_active_screen");
        safeStorage.removeItem("saas_jwt_access_token");
        safeStorage.removeItem("access_token");
        safeStorage.removeItem("saas_active_session_id");
        setCurrentUser(null);
        setActiveUserRole(USER_ROLES.ANON);
        setCurrentScreen("login");
      };
      window.addEventListener("saas:force-logout", handleCustomForceLogout);

      return () => {
        clearInterval(heartbeatInterval);
        window.removeEventListener("focus", handleWindowFocus);
        window.removeEventListener("saas:force-logout", handleCustomForceLogout);
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, [currentUser?.id, currentUser?.email, tenant?.id]);

  // Efeito de auditoria contínua a cada alteração de tela
  useEffect(() => {
    const audit = detectAndNeutralizeStorageTampering();
    if (audit.tamperingDetected && currentScreen !== "superadmin") {
      setCurrentUser(null);
      setActiveUserRole(USER_ROLES.ANON);
      setCurrentScreen("login");
    }
  }, [currentScreen]);

  const getTodayLocalYMD = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [comandas, setComandas] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [contractNotice, setContractNotice] = useState(null);

  // Handlers reativos para Serviços
  const handleAddService = useCallback((newServ) => {
    setServices((prev) => [newServ, ...prev]);
  }, []);

  const handleUpdateService = useCallback((updatedServ) => {
    setServices((prev) =>
      prev.map((s) => (s.id === updatedServ.id ? { ...s, ...updatedServ } : s))
    );
  }, []);

  const handleDeleteService = useCallback((serviceId) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, active: false } : s))
    );
  }, []);

  // Handlers reativos para Produtos
  const handleAddProduct = useCallback((newProd) => {
    setProducts((prev) => [newProd, ...prev]);
  }, []);

  const handleUpdateProduct = useCallback((updatedProd) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProd.id ? { ...p, ...updatedProd } : p))
    );
  }, []);

  const handleDeleteProduct = useCallback((productId) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, active: false } : p))
    );
  }, []);

  // Hook central de logout seguro com expurgo de cache, storage e prevenção de vazamento
  const { logout: handleSecureLogout } = useSecureLogout({
    defaultReason: "MANUAL_LOGOUT",
    onSuccess: () => {
      safeStorage.removeItem("saas_auth_user");
      safeStorage.removeItem("saas_active_screen");
      safeStorage.removeItem("saas_jwt_access_token");
      safeStorage.removeItem("access_token");
      safeStorage.removeItem("saas_active_session_id");
      setCurrentUser(null);
      setActiveUserRole(USER_ROLES.ANON);
      setCurrentScreen("login");
      setAppointments([]);
      setContractNotice(null);
    },
  });

  // Busca de dados com fallback de contingência resiliente
  const loadDataFromSupabase = useCallback(async () => {
    try {
      setLoadingData(true);
      setConnectionError(null);
      setContractNotice(null);

      const [servicesRes, productsRes, barbersRes, appointmentsRes, clientsRes] = await Promise.all([
        supabase.from("services").select("*").order("name"),
        supabase.from("products").select("*").order("name"),
        supabase.from("barbers").select("*").order("name"),
        supabase.from("appointments").select("*").order("start_time"),
        supabase.from("clients").select("*").order("name"),
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (barbersRes.error) throw barbersRes.error;
      if (appointmentsRes.error) throw appointmentsRes.error;

      const servicesResult = validateServicesContract(servicesRes.data || []);
      const barbersResult = validateBarbersContract(barbersRes.data || []);
      const appointmentsResult = validateAppointmentsContract(appointmentsRes.data || []);

      setServices(servicesResult.data);
      setBarbers(barbersResult.data);
      if (clientsRes?.data) {
        setClients(clientsRes.data);
      }
      setServices(servicesResult.data || []);
      setBarbers(barbersResult.data || []);
      if (clientsRes?.data) {
        setClients(clientsRes.data);
      }
      setAppointments(appointmentsResult.data || []);

      if (productsRes?.data && productsRes.data.length > 0) {
        const productsResult = validateProductsContract(productsRes.data);
        setProducts(productsResult.data || []);
      } else {
        setProducts([]);
      }

      if (servicesResult.isPartial || barbersResult.isPartial || appointmentsResult.isPartial) {
        const totalDropped = servicesResult.droppedCount + barbersResult.droppedCount + appointmentsResult.droppedCount;
        setContractNotice(
          `Resiliência Ativa: Dados parciais carregados com validação Zod (${totalDropped} registros com contrato divergente foram sanitizados).`
        );
      }
    } catch (error) {
      console.warn("Aviso ao carregar dados do Supabase:", error);
      setServices([]);
      setProducts([]);
      setBarbers([]);
      setAppointments([]);
      setConnectionError(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadDataFromSupabase();
  }, [loadDataFromSupabase]);

  // Sincronização de novo agendamento do cliente
  const handleClientBookingFinished = (bookingData) => {
    const createdAppointment = {
      id: `apt-${Date.now()}`,
      barberId: bookingData.barberId || "",
      barberName: bookingData.barberName,
      clientName: bookingData.clientName,
      clientPhone: bookingData.clientPhone,
      serviceName: bookingData.services,
      date: bookingData.date || getTodayLocalYMD(),
      startTime: bookingData.time,
      endTime: bookingData.endTime,
      durationMinutes: bookingData.totalDuration,
      price: bookingData.totalPrice,
      status: "confirmed",
      isPaid: false,
      isVip: false,
    };

    setAppointments((prev) => [...prev, createdAppointment]);
  };

  const handleGoToOnboarding = useCallback(() => {
    setGoogleNewUserCandidate(null);
    setCurrentScreen("onboarding");
  }, []);

  const handleGoToLogin = useCallback((prefillEmail = "") => {
    if (prefillEmail && typeof prefillEmail === "string") {
      setLoginPrefillEmail(prefillEmail);
    }
    setGoogleNewUserCandidate(null);
    setCurrentScreen("login");
  }, []);

  // Barra de ferramentas Dev apenas quando explicitamente requisitada via ?dev=true na URL
  const showDevNav = urlParams.get("dev") === "true";

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col">
      {/* Barra de Navegação Central do SaaS (Ativada apenas em modo de desenvolvimento explícito ?dev=true) */}
      {showDevNav && (
      <div className="bg-neutral-900 border-b border-neutral-800 p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-50 sticky top-0 shadow-lg select-none">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-neutral-500 font-bold self-center">
            Navegação:
          </span>

          <button
            type="button"
            onClick={() => setCurrentScreen("client-app")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              currentScreen === "client-app"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-neutral-400 hover:text-white bg-neutral-800/60"
            }`}
          >
            <span className="flex items-center gap-1.5"><ProjectIcon name="Smartphone" size={14} colorVariant="inherit" /><span>App do Cliente (Agendar)</span></span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeUserRole === USER_ROLES.ANON) {
                setActiveUserRole(USER_ROLES.ADMIN);
                if (!currentUser) {
                  setCurrentUser({
                    id: "owner-usr-01",
                    email: "admin@barbearia.com",
                    user_metadata: {
                      name: "Carlos Gestor",
                      role: USER_ROLES.ADMIN,
                      barbershop_name: tenant?.name || "Barbearia",
                    },
                  });
                }
              }
              setCurrentScreen("barbershop");
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              currentScreen === "barbershop"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-neutral-400 hover:text-white bg-neutral-800/60"
            }`}
          >
            <span className="flex items-center gap-1.5"><ProjectIcon name="Scissors" size={14} colorVariant="inherit" /><span>Painel da Barbearia</span></span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentScreen("superadmin")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              currentScreen === "superadmin"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-neutral-400 hover:text-white bg-neutral-800/60"
            }`}
          >
            <span className="flex items-center gap-1.5"><ProjectIcon name="Crown" size={14} colorVariant="inherit" /><span>SuperAdmin</span></span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentScreen("onboarding-quiz")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              currentScreen === "onboarding-quiz"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-neutral-400 hover:text-white bg-neutral-800/60"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <ProjectIcon name="ClipboardList" size={14} colorVariant="inherit" />
              <span>Quiz Onboarding</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentScreen("onboarding")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              currentScreen === "onboarding"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-neutral-400 hover:text-white bg-neutral-800/60"
            }`}
          >
            Onboarding
          </button>

          <button
            type="button"
            onClick={() => setCurrentScreen("login")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              currentScreen === "login"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-neutral-400 hover:text-white bg-neutral-800/60"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => setCurrentScreen("design-system")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              currentScreen === "design-system"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-neutral-400 hover:text-white bg-neutral-800/60"
            }`}
          >
            <span className="flex items-center gap-1.5"><ProjectIcon name="Palette" size={14} colorVariant="inherit" /><span>UI Kit</span></span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentScreen("qa-panel")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              currentScreen === "qa-panel"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-neutral-400 hover:text-white bg-neutral-800/60"
            }`}
          >
            <span className="flex items-center gap-1.5"><ProjectIcon name="Shield" size={14} colorVariant="inherit" /><span>QA & DevSecOps</span></span>
          </button>
        </div>

        {/* Simulador de Role RBAC Ativo */}
        <div className="flex items-center gap-2 bg-neutral-950/80 px-2.5 py-1 rounded-lg border border-neutral-800 text-xs">
          <span className="text-neutral-400 font-semibold flex items-center gap-1">
            <ProjectIcon name="Shield" size={14} colorVariant="amber" />
            <span>Role RBAC:</span>
          </span>
          <select
            value={activeUserRole}
            onChange={(e) => setActiveUserRole(e.target.value)}
            className="bg-neutral-800 text-white font-mono text-xs px-2 py-0.5 rounded border border-neutral-700 outline-none cursor-pointer focus:border-amber-500"
            title="Alterne o perfil ativo para testar as regras de acesso RBAC e Default Deny"
          >
            <option value={USER_ROLES.ADMIN}>admin (Dono da Barbearia)</option>
            <option value={USER_ROLES.EMPLOYEE}>employee (Barbeiro)</option>
            <option value={USER_ROLES.CLIENT}>client (Cliente Final)</option>
            <option value={USER_ROLES.SUPERADMIN}>superadmin (SaaS Master)</option>
            <option value={USER_ROLES.ANON}>anon (Deslogado / Sem Token)</option>
          </select>
        </div>
      </div>
      )}

      {/* Indicador discreto de resiliência e status offline */}
      {showDevNav && <OfflineBanner showSimulator={false} />}

      {/* Aviso não-bloqueante de contingência de contrato Zod */}
      {showDevNav && contractNotice && (
        <div className="p-3 bg-neutral-900 border-b border-amber-500/20">
          <PartialDataNotice
            entityName="dados do SaaS"
            totalItems={services.length + barbers.length + appointments.length}
            recoveredItems={services.length + barbers.length + appointments.length}
            onRefresh={loadDataFromSupabase}
          />
        </div>
      )}

      {/* Roteamento Protegido por Guard de Autorização RBAC & Error Boundaries */}
      <ProtectedRoute
        screenId={currentScreen}
        currentRole={activeUserRole}
        onNavigate={handleNavigate}
        onSwitchRole={setActiveUserRole}
      >
        {/* 1. APP DO CLIENTE: Funil de agendamento online */}
        {currentScreen === "client-app" && (
          <ErrorBoundary componentName="App do Cliente (Agendamentos)">
            <ClientBookingView
              tenant={tenant}
              services={services}
              barbers={barbers}
              onFinishBooking={handleClientBookingFinished}
              onGoToLogin={handleGoToLogin}
            />
          </ErrorBoundary>
        )}

        {/* 2. PAINEL DA BARBEARIA: Gestão operacional, comissões, comandas e equipe */}
        {currentScreen === "barbershop" && (
          <ErrorBoundary componentName="Painel Administrativo da Barbearia">
            <BarbershopDashboard
              tenant={tenant}
              onUpdateTenant={(updatedTenant) =>
                setTenant((prev) => normalizeTenantRecord({ ...prev, ...updatedTenant }, currentUser))
              }
              user={currentUser}
              onUpdateUser={setCurrentUser}
              appointments={appointments}
              onUpdateAppointments={setAppointments}
              clients={clients}
              onUpdateClients={setClients}
              comandas={comandas}
              onUpdateComandas={setComandas}
              services={services}
              onAddService={handleAddService}
              onUpdateService={handleUpdateService}
              onUpdateServices={setServices}
              onDeleteService={handleDeleteService}
              products={products}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onUpdateProducts={setProducts}
              onDeleteProduct={handleDeleteProduct}
              barbers={barbers}
              onUpdateBarbers={setBarbers}
              onNavigateSuperAdmin={() => setCurrentScreen("superadmin")}
              onLogout={() => {
                setCurrentUser(null);
                setActiveUserRole(USER_ROLES.ANON);
                setCurrentScreen("login");
                handleSecureLogout({ reason: "MANUAL_LOGOUT_BARBERSHOP" }).catch(() => {});
              }}
              isLoading={loadingData}
            />
          </ErrorBoundary>
        )}

        {/* 3. PAINEL SUPERADMIN: Controle global do SaaS, planos, Mercado Pago e barbearias */}
        {currentScreen === "superadmin" && (
          <ErrorBoundary componentName="Painel SuperAdmin">
            <SuperAdminDashboard
              onNavigateBarbershop={() => {
                if (currentUser) {
                  resolveAuthenticatedTenant(currentUser).catch(() => {});
                }
                setCurrentScreen("barbershop");
              }}
              onImpersonateTenant={(selectedTenant) => {
                if (selectedTenant) {
                  setTenant(normalizeTenantRecord(selectedTenant, currentUser));
                }
                setCurrentScreen("barbershop");
              }}
              onLogout={() => {
                setCurrentUser(null);
                setActiveUserRole(USER_ROLES.ANON);
                setCurrentScreen("login");
                handleSecureLogout({ reason: "MANUAL_LOGOUT_SUPERADMIN" }).catch(() => {});
              }}
            />
          </ErrorBoundary>
        )}

        {/* 4. ONBOARDING: Fluxo de onboarding de novas barbearias */}
        {currentScreen === "onboarding" && (
          <ErrorBoundary componentName="Onboarding Wizard">
            <OnboardingWizard
              initialGoogleUser={googleNewUserCandidate}
              onGoToLogin={(prefillEmail) => {
                if (prefillEmail) setLoginPrefillEmail(prefillEmail);
                setGoogleNewUserCandidate(null);
                safeStorage.setItem("saas_active_screen", "login");
                setCurrentScreen("login");
              }}
              onLoginSuccess={async (existingUser) => {
                setGoogleNewUserCandidate(null);
                const role = USER_ROLES.ADMIN;
                const userWithRole = {
                  ...existingUser,
                  role,
                  user_metadata: {
                    ...(existingUser?.user_metadata || {}),
                    role,
                  },
                };
                safeStorage.setItem("saas_auth_user", JSON.stringify(userWithRole));
                safeStorage.setItem("saas_active_screen", "barbershop");
                setCurrentUser(userWithRole);
                setActiveUserRole(role);
                await resolveAndSyncUserTenant(userWithRole);
                setCurrentScreen("barbershop");
              }}
              onCompleteOnboarding={({ user: newUser, tenant: newTenant }) => {
                setGoogleNewUserCandidate(null);
                if (newUser) {
                  const role = USER_ROLES.ADMIN;
                  const userWithRole = {
                    ...newUser,
                    role,
                    user_metadata: {
                      ...(newUser?.user_metadata || {}),
                      role,
                    },
                  };
                  safeStorage.setItem("saas_auth_user", JSON.stringify(userWithRole));
                  safeStorage.setItem("saas_active_screen", "barbershop");
                  setCurrentUser(userWithRole);
                  setActiveUserRole(role);
                }
                if (newTenant) setTenant(normalizeTenantRecord(newTenant, newUser));
                safeStorage.setItem("saas_active_screen", "barbershop");
                setCurrentScreen("barbershop");
              }}
            />
          </ErrorBoundary>
        )}

        {/* 4b. ONBOARDING QUIZ: Quiz simplificado de definição de cenário (Dono com equipe vs. Autônomo solo) */}
        {currentScreen === "onboarding-quiz" && (
          <ErrorBoundary componentName="Onboarding Quiz">
            <OnboardingQuiz
              user={currentUser}
              onCancel={() => {
                safeStorage.setItem("saas_active_screen", "login");
                setCurrentScreen("login");
              }}
              onSelectScenario={async (scenario) => {
                safeStorage.setItem("barber_saas_persona", scenario);
                const isSolo = scenario === "solo_barber";
                const role = USER_ROLES.ADMIN;

                const updatedUser = {
                  ...(currentUser || {}),
                  persona: scenario,
                  isSolo,
                  user_metadata: {
                    ...(currentUser?.user_metadata || {}),
                    role,
                    persona: scenario,
                    is_solo: isSolo,
                  },
                };

                safeStorage.setItem("saas_auth_user", JSON.stringify(updatedUser));
                safeStorage.setItem("saas_active_screen", "barbershop");
                setCurrentUser(updatedUser);
                setActiveUserRole(role);

                try {
                  const resolved = await resolveAndSyncUserTenant(updatedUser);
                  if (resolved) {
                    setTenant(resolved);
                  }
                } catch (syncErr) {
                  console.warn("Aviso na sincronização do tenant no quiz:", syncErr);
                }

                setCurrentScreen("barbershop");
              }}
            />
          </ErrorBoundary>
        )}

        {/* 5. LOGIN: Autenticação de usuários */}
        {currentScreen === "login" && (
          <ErrorBoundary componentName="Tela de Login">
            <Login
              initialEmail={loginPrefillEmail}
              onGoToSignup={handleGoToOnboarding}
              onLoginSuccess={async (loggedUser) => {
                const userEmail = (
                  loggedUser?.email ||
                  loggedUser?.user_metadata?.email ||
                  ""
                ).toLowerCase().trim();

                const isSuperAdminEmail =
                  userEmail === "atendmentor@gmail.com" ||
                  (Boolean(import.meta.env?.VITE_SUPERADMIN_EMAIL) &&
                    userEmail === String(import.meta.env.VITE_SUPERADMIN_EMAIL).toLowerCase().trim());

                if (isSuperAdminEmail) {
                  const superAdminUser = {
                    ...loggedUser,
                    role: USER_ROLES.SUPERADMIN,
                    user_metadata: {
                      ...(loggedUser?.user_metadata || {}),
                      role: USER_ROLES.SUPERADMIN,
                    },
                  };
                  safeStorage.setItem("saas_auth_user", JSON.stringify(superAdminUser));
                  safeStorage.setItem("saas_active_screen", "superadmin");
                  setCurrentUser(superAdminUser);
                  setActiveUserRole(USER_ROLES.SUPERADMIN);
                  await resolveAndSyncUserTenant(superAdminUser);
                  setCurrentScreen("superadmin");
                  return;
                }

                // =====================================================================
                // CENÁRIO 3 (Opção 2): Novo usuário via Google (isNewUser = true)
                // Direciona o novo usuário para o Onboarding / Setup inicial da sua barbearia.
                // Criação limpa da primeira conta sem duplicidade!
                // =====================================================================
                if (loggedUser?.isNewUser) {
                  setGoogleNewUserCandidate(loggedUser);
                  safeStorage.setItem("saas_active_screen", "onboarding");
                  setCurrentScreen("onboarding");
                  return;
                }

                // =====================================================================
                // CENÁRIO 2 (Opção 2): E-mail que JÁ existe no banco (Account Linking)
                // Faz o login na conta existente (vincula o Google à conta já cadastrada).
                // O usuário entra direto no painel da barbearia dele. Zero duplicidade.
                // =====================================================================
                const rawRole = loggedUser?.user_metadata?.role || loggedUser?.role;
                const role =
                  !rawRole || rawRole === "owner" || rawRole === "tenant" || rawRole === "authenticated"
                    ? USER_ROLES.ADMIN
                    : rawRole;
                const userWithRole = {
                  ...loggedUser,
                  role: role,
                  user_metadata: {
                    ...(loggedUser?.user_metadata || {}),
                    role: role,
                  },
                };
                const nextScreen =
                  role === USER_ROLES.SUPERADMIN ? "superadmin" : "barbershop";
                safeStorage.setItem("saas_auth_user", JSON.stringify(userWithRole));
                safeStorage.setItem("saas_active_screen", nextScreen);
                setCurrentUser(userWithRole);
                setActiveUserRole(role);
                await resolveAndSyncUserTenant(userWithRole);
                setCurrentScreen(nextScreen);
              }}
            />
          </ErrorBoundary>
        )}

        {/* 6. DESIGN SYSTEM: Catálogo de componentes UI e tokens de design */}
        {currentScreen === "design-system" && (
          <ErrorBoundary componentName="Design System / UI Kit">
            <DesignSystem onGoToLogin={handleGoToLogin} />
          </ErrorBoundary>
        )}

        {/* 7. QA STUDIO & DEVSECOPS: Suíte de testes, caos e auditoria de segurança */}
        {currentScreen === "qa-panel" && (
          <ErrorBoundary componentName="QA Studio & DevSecOps">
            <QAPanel
              currentUserRole={activeUserRole}
              onSwitchRole={setActiveUserRole}
              onNavigate={handleNavigate}
            />
          </ErrorBoundary>
        )}
      </ProtectedRoute>
    </div>
  );
}
