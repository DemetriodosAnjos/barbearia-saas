import ProjectIcon from "./components/ui/ProjectIcon";
import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import {
  supabase,
  buildTenantRecordPayload,
  normalizeTenantRecord,
  resolveUnifiedTenantId,
} from "./lib/supabase";
import DesignSystem from "./pages/DesignSystem";
import QAPanel from "./pages/QAPanel/QAPanel";
import OnboardingWizard from "./pages/Onboarding/OnboardingWizard";
import Login from "./pages/Auth/Login";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import BarbershopDashboard from "./pages/BarbershopAdmin/BarbershopDashboard";
import ClientBookingView from "./pages/ClientBooking/ClientBookingView";
import OnboardingQuiz from "./components/onboarding/OnboardingQuiz";
import { registerSoloBarberInSupabase } from "./services/soloOnboardingService";
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
import { initTheme } from "./utils/theme";
import MultiTenantSecurityStudio from "./pages/Security/MultiTenantSecurityStudio";
import { getResolvedApiUrl } from "./services/api";

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlScreen = urlParams.get("screen");
  const urlBarber = urlParams.get("barbeiro");
  const urlClientName = urlParams.get("cliente");
  const urlClientPhone = urlParams.get("telefone");
  const urlSlug =
    urlParams.get("barbearia") ||
    urlParams.get("slug") ||
    urlParams.get("b") ||
    urlParams.get("tenant") ||
    urlParams.get("tenant_id");
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
    // Se a URL contiver parâmetros de agendamento público (barbearia, slug, barbeiro, cliente, telefone), abre direto a tela do cliente
    if (urlSlug || urlBarber || urlClientName || urlClientPhone) return "client-app";

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
  const [tenant, setTenant] = useState(() => {
    try {
      const savedUserStr = safeStorage.getItem("saas_auth_user");
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        const email = (parsed?.email || "").toLowerCase().trim();
        const meta = parsed?.user_metadata || {};
        const parsedTenantId = meta.barbershop_id || meta.tenant_id;

        if (email === "fullstackanjos01@gmail.com" || email === "fullstackanjo01@gmail.com") {
          return normalizeTenantRecord({
            id: parsedTenantId || "a9e5dc8e-5648-4ed0-9a8f-c5d660899ae9",
            name: meta.barbershop_name || "Vilas Boas Barber",
            slug: meta.slug || "vilas-boas-barber",
            plan: "pro",
            subscription_plan: "Pro",
            status: "active",
            owner_email: email,
            owner_name: meta.name || meta.owner_name || "Alex Teza",
            phone: meta.phone || "(48) 99999-9999",
          }, parsed);
        } else if (email === "alexteza@gmail.com") {
          return normalizeTenantRecord({
            id: parsedTenantId || "fb03bd11-8fe8-4e26-9172-86ca2cc489e4",
            name: meta.barbershop_name || "Barbearia Alex Teza",
            slug: meta.slug || "barbearia-alex-tesa",
            plan: "pro",
            subscription_plan: "Pro",
            status: "active",
            owner_email: email,
            owner_name: meta.name || meta.owner_name || "Alex Teza",
            phone: meta.phone || "(41) 98754-5167",
          }, parsed);
        } else if (email === "ddoanjos@gmail.com" || email === "atendmentor@gmail.com") {
          return normalizeTenantRecord({
            id: "db3f8187-8771-4f7c-b2bf-b7486d4eb1b6",
            name: "Barbearia Demetrio dos Anjos",
            slug: "barbearia-dos-anjos",
            plan: "enterprise",
            subscription_plan: "Entreprise",
            status: "active",
            owner_email: "ddoanjos@gmail.com",
            owner_name: "Demetrio A L dos Anjos",
            phone: "(41) 99788-4424",
          }, parsed);
        } else if (email === "fullstackanjos03@gmail.com") {
          return normalizeTenantRecord({
            id: parsedTenantId || "f92df7b3-02f4-476f-9b09-bc21dacc4651",
            name: meta.barbershop_name || "FullStack Barber",
            slug: meta.slug || "fullstack-barber",
            plan: "pro",
            subscription_plan: "Pro",
            status: "active",
            owner_email: email,
            owner_name: meta.name || meta.owner_name || "FullStack",
            phone: meta.phone || "(41) 99999-9999",
          }, parsed);
        } else if (email) {
          return normalizeTenantRecord({
            id: parsedTenantId || parsed?.id,
            name: meta.barbershop_name || "Minha Barbearia",
            slug: meta.slug || "minha-barbearia",
            plan: "starter",
            subscription_plan: "Starter",
            status: "active",
            owner_email: email,
            owner_name: meta.name || "Gestor",
            phone: meta.phone || "",
          }, parsed);
        }
      }
    } catch {}
    return null;
  });

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

      // 1. Consulta perfil PRIORITARIAMENTE por e-mail para sincronizar com a conta oficial (Google)
      if (userEmail) {
        try {
          const { data: pByEmail } = await supabase
            .from("profiles")
            .select("*")
            .ilike("email", userEmail)
            .maybeSingle();
          if (pByEmail) {
            profileRow = pByEmail;
            if (pByEmail.barbershop_id) {
              candidateTenantId = pByEmail.barbershop_id;
            }
          }
        } catch {}
      }

      if (!profileRow && authUser.id && authUser.id !== "owner-usr-01") {
        try {
          const { data: pData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();
          if (pData) {
            profileRow = pData;
            if (pData.barbershop_id) {
              candidateTenantId = pData.barbershop_id;
            }
          }
        } catch {}
      }

      // Sincroniza o UUID do usuário para o UUID oficial registrado em profiles (o mesmo do Google)
      if (profileRow?.id) {
        authUser.id = profileRow.id;
        if (authUser.user_metadata) {
          authUser.user_metadata.id = profileRow.id;
        }
      }

      // 2. Busca na tabela oficial `barbershops` pelo ID da barbearia
      if (candidateTenantId) {
        try {
          const { data: bData } = await supabase
            .from("barbershops")
            .select("*")
            .eq("id", candidateTenantId)
            .maybeSingle();
          if (bData) barbershopRow = bData;
        } catch {}

        try {
          const { data: tById } = await supabase
            .from("tenants")
            .select("*")
            .eq("id", candidateTenantId)
            .maybeSingle();
          if (tById) tenantRow = tById;
        } catch {}
      }

      // 3. Busca em 'tenants' ou 'barbershops' por e-mail caso ainda não tenha localizado
      if (!tenantRow && !barbershopRow && userEmail) {
        try {
          const { data: tByEmail } = await supabase
            .from("tenants")
            .select("*")
            .ilike("owner_email", userEmail)
            .order("created_at", { ascending: false })
            .limit(1);
          const firstMatch = Array.isArray(tByEmail) ? tByEmail[0] : tByEmail;
          if (firstMatch) {
            tenantRow = firstMatch;
            if (!candidateTenantId) candidateTenantId = firstMatch.id;
          }
        } catch {}
      }

      let resolvedId =
        barbershopRow?.id ||
        tenantRow?.id ||
        candidateTenantId ||
        resolveUnifiedTenantId(null, authUser) ||
        authUser.id;

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
          const resolvedSyncAvatar =
            profileRow.avatar_url ||
            prev.avatarUrl ||
            prev.avatar ||
            prev.avatar_url ||
            prev.user_metadata?.avatar_url ||
            prev.user_metadata?.picture ||
            "";

          const updated = {
            ...prev,
            name: profileRow.full_name || prev.name,
            displayName: profileRow.display_name || prev.displayName,
            display_name: profileRow.display_name || prev.display_name,
            cpf: profileRow.cpf || prev.cpf,
            cnpj: profileRow.cnpj || prev.cnpj,
            birth_date: profileRow.birth_date || prev.birth_date,
            birthDate: profileRow.birth_date || prev.birthDate,
            avatar: resolvedSyncAvatar,
            avatarUrl: resolvedSyncAvatar,
            avatar_url: resolvedSyncAvatar,
            user_metadata: {
              ...mergedMeta,
              avatar_url: resolvedSyncAvatar,
              picture: resolvedSyncAvatar,
            },
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

  // Inicialização e garantia estrita do tema escuro padrão (antes e após login)
  useEffect(() => {
    initTheme();
  }, []);

  // Flag para evitar duplo loadDataFromSupabase após login email/senha
  // (onAuthStateChange SIGNED_IN dispara logo depois do onLoginSuccess, sobrescrevendo o estado correto)
  const loginInProgressRef = useRef(false);

  // Sincronização e validação de sessão real ao recarregar a página (F5)
  useEffect(() => {
    let isMounted = true;

    async function buildSynchronizedUser(rawUser) {
      if (!rawUser) return null;
      const userEmail = (rawUser.email || rawUser.user_metadata?.email || "").toLowerCase().trim();
      let profileRow = null;
      if (userEmail) {
        try {
          const { data: pByEmail } = await supabase
            .from("profiles")
            .select("*")
            .ilike("email", userEmail)
            .maybeSingle();
          if (pByEmail) profileRow = pByEmail;
        } catch {}
      }

      if (!profileRow && rawUser.id && rawUser.id !== "owner-usr-01") {
        try {
          const { data: pById } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", rawUser.id)
            .maybeSingle();
          if (pById) profileRow = pById;
        } catch {}
      }

      const officialUserId = profileRow?.id || rawUser.id;
      const officialShopId =
        profileRow?.barbershop_id ||
        rawUser.barbeariaId ||
        rawUser.tenant_id ||
        rawUser.barbershop_id ||
        rawUser.user_metadata?.barbershop_id ||
        rawUser.user_metadata?.tenant_id;

      const rawRole = profileRow?.role || rawUser.user_metadata?.role || rawUser.role;
      const normalizedRole =
        !rawRole || rawRole === "owner" || rawRole === "tenant" || rawRole === "authenticated"
          ? USER_ROLES.ADMIN
          : rawRole;

      const resolvedName =
        profileRow?.full_name ||
        rawUser.user_metadata?.name ||
        rawUser.user_metadata?.full_name ||
        (userEmail ? userEmail.split("@")[0] : "Usuário");

      const resolvedAvatar =
        profileRow?.avatar_url ||
        rawUser.avatar_url ||
        rawUser.avatar ||
        rawUser.avatarUrl ||
        rawUser.user_metadata?.avatar_url ||
        rawUser.user_metadata?.picture ||
        "";

      return {
        ...rawUser,
        id: officialUserId,
        name: resolvedName,
        role: normalizedRole,
        avatar: resolvedAvatar,
        avatarUrl: resolvedAvatar,
        avatar_url: resolvedAvatar,
        barbeariaId: officialShopId,
        tenant_id: officialShopId,
        barbershop_id: officialShopId,
        user_metadata: {
          ...(rawUser.user_metadata || {}),
          id: officialUserId,
          name: resolvedName,
          role: normalizedRole,
          avatar_url: resolvedAvatar,
          picture: resolvedAvatar,
          tenant_id: officialShopId,
          barbershop_id: officialShopId,
        },
      };
    }

    async function syncAuthSession() {
      try {
        // 1. Tenta sessão oficial do Supabase GoTrue
        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (session?.user) {
          if (!isMounted) return;
          const userWithRole = await buildSynchronizedUser(session.user);
          setCurrentUser(userWithRole);
          setActiveUserRole(userWithRole.role);
          safeStorage.setItem("saas_auth_user", JSON.stringify(userWithRole));
          if (session.access_token) {
            safeStorage.setItem("saas_jwt_access_token", session.access_token);
            safeStorage.setItem("access_token", session.access_token);
          }
          const resolvedTenant = await resolveAndSyncUserTenant(userWithRole);
          const shopIdToLoad = resolvedTenant?.id || userWithRole.barbeariaId;
          await loadDataFromSupabase(shopIdToLoad);

          const savedScreen = safeStorage.getItem("saas_active_screen");
          const targetScreen =
            savedScreen && savedScreen !== "login"
              ? savedScreen
              : userWithRole.role === USER_ROLES.SUPERADMIN
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

        // 3. Tenta silent refresh com a API /api/auth/refresh (se ambiente possuir backend ativo)
        const refreshUrl = getResolvedApiUrl("/api/auth/refresh");
        if (refreshUrl) {
          try {
            const refreshRes = await fetch(refreshUrl, {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        // Se o onLoginSuccess de email/senha acabou de executar, ele já carregou os dados
        // corretamente. Pular o carregamento duplo que sobrescreveria o estado correto.
        if (loginInProgressRef.current) {
          console.log("[onAuthStateChange] Login em andamento — carregamento de dados adiado para evitar sobrescrita.");
          return;
        }
        const userWithRole = await buildSynchronizedUser(session.user);
        setCurrentUser(userWithRole);
        setActiveUserRole(userWithRole.role);
        safeStorage.setItem("saas_auth_user", JSON.stringify(userWithRole));
        if (session.access_token) {
          safeStorage.setItem("saas_jwt_access_token", session.access_token);
          safeStorage.setItem("access_token", session.access_token);
        }
        const resolvedTenant = await resolveAndSyncUserTenant(userWithRole);
        const shopIdToLoad = resolvedTenant?.id || userWithRole.barbeariaId;
        await loadDataFromSupabase(shopIdToLoad);

        if (event === "SIGNED_IN") {
          const savedScreen = safeStorage.getItem("saas_active_screen");
          const nextScreen =
            savedScreen && savedScreen !== "login"
              ? savedScreen
              : userWithRole.role === USER_ROLES.SUPERADMIN
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
  const [clients, setClients] = useState(() => {
    try {
      const activeTenantId = tenant?.id || "default";
      const cached = safeStorage.getItem(`saas_clients_cache_${activeTenantId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });
  const [appointments, setAppointments] = useState(() => {
    try {
      const activeTenantId = tenant?.id || "default";
      const cached = safeStorage.getItem(`saas_appointments_cache_${activeTenantId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });
  const [comandas, setComandas] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [contractNotice, setContractNotice] = useState(null);

  // Sincronização reativa e persistência de Agendamentos no cache local segmentado por tenant
  const handleUpdateAppointments = useCallback((newAppointmentsOrUpdater) => {
    setAppointments((prev) => {
      const updated = typeof newAppointmentsOrUpdater === "function" ? newAppointmentsOrUpdater(prev) : newAppointmentsOrUpdater;
      const list = Array.isArray(updated) ? updated : [];
      try {
        const activeTenantId = tenant?.id || currentUser?.user_metadata?.barbershop_id || currentUser?.id || "default";
        safeStorage.setItem(`saas_appointments_cache_${activeTenantId}`, JSON.stringify(list));
      } catch {}
      return list;
    });
  }, [tenant?.id, currentUser?.id, currentUser?.user_metadata?.barbershop_id]);

  // Sincronização reativa e persistência de Clientes no cache local segmentado por tenant
  const handleUpdateClients = useCallback((updatedClients) => {
    const list = Array.isArray(updatedClients) ? updatedClients : [];
    const dedupMap = new Map();
    list.forEach((c) => {
      if (!c) return;
      const k = c.id || (c.phone ? c.phone.replace(/\D/g, "") : null) || c.name;
      if (k) dedupMap.set(k, c);
    });
    const uniqueList = Array.from(dedupMap.values());
    setClients(uniqueList);
    try {
      const activeTenantId = tenant?.id || currentUser?.user_metadata?.barbershop_id || currentUser?.id || "default";
      safeStorage.setItem(`saas_clients_cache_${activeTenantId}`, JSON.stringify(uniqueList));
      // Remove chaves legadas não segmentadas para prevenir vazamento cruzado
      safeStorage.removeItem("saas_clients_cache");
      safeStorage.removeItem("barbearia_saas_clients_v2");
    } catch {}
  }, [tenant?.id, currentUser?.id, currentUser?.user_metadata?.barbershop_id]);

  // Sincronização centralizada de Cliente individual com cascata nos Agendamentos e Supabase
  const handleUpdateClient = useCallback(async (clientData, options = {}) => {
    if (!clientData) return;
    const { syncAppointments = true, oldPhone, oldName } = options;
    const cleanId = clientData.id;
    const cleanPhone = (clientData.phone || "").replace(/\D/g, "");
    const cleanOldPhone = (oldPhone || "").replace(/\D/g, "");
    const targetName = (clientData.name || "").trim();
    const oldTargetName = (oldName || "").trim().toLowerCase();

    // 1. Atualiza lista de clientes em memória com desduplicação estrita
    setClients((prev) => {
      let found = false;
      const updated = prev.map((c) => {
        const cPhone = (c.phone || "").replace(/\D/g, "");
        if (
          (cleanId && c.id === cleanId) ||
          (cleanPhone && cPhone === cleanPhone) ||
          (cleanOldPhone && cPhone === cleanOldPhone)
        ) {
          found = true;
          return { ...c, ...clientData };
        }
        return c;
      });
      const rawList = found ? updated : [clientData, ...updated];
      const dedupMap = new Map();
      rawList.forEach((c) => {
        if (!c) return;
        const k = c.id || (c.phone ? c.phone.replace(/\D/g, "") : null) || c.name;
        if (k) dedupMap.set(k, c);
      });
      const finalList = Array.from(dedupMap.values());
      try {
        const activeTenantId = tenant?.id || currentUser?.user_metadata?.barbershop_id || currentUser?.id || "default";
        safeStorage.setItem(`saas_clients_cache_${activeTenantId}`, JSON.stringify(finalList));
        safeStorage.removeItem("saas_clients_cache");
        safeStorage.removeItem("barbearia_saas_clients_v2");
      } catch {}
      return finalList;
    });

    // 2. Sincroniza em cascata nos agendamentos ativos na Agenda
    if (syncAppointments) {
      setAppointments((prevAppts) => {
        return prevAppts.map((appt) => {
          const apptPhone = (appt.clientPhone || appt.client_phone || "").replace(/\D/g, "");
          const apptName = (appt.clientName || appt.client_name || "").trim().toLowerCase();
          const matches =
            (cleanPhone && apptPhone === cleanPhone) ||
            (cleanOldPhone && apptPhone === cleanOldPhone) ||
            (oldTargetName && apptName === oldTargetName) ||
            (cleanId && (appt.clientId === cleanId || appt.client_id === cleanId));

          if (matches) {
            return {
              ...appt,
              clientName: targetName || appt.clientName,
              clientPhone: clientData.phone || appt.clientPhone,
              client_name: targetName || appt.client_name,
              client_phone: clientData.phone || appt.client_phone,
            };
          }
          return appt;
        });
      });
    }

    // 3. Persistência no Supabase
    try {
      if (cleanId && !String(cleanId).startsWith("temp-") && !String(cleanId).startsWith("cli-mock")) {
        await supabase
          .from("clients")
          .update({
            name: clientData.name,
            phone: clientData.phone,
            ...(clientData.email !== undefined ? { email: clientData.email } : {}),
            ...(clientData.cpf !== undefined ? { cpf: clientData.cpf } : {}),
            ...(clientData.birthDate !== undefined || clientData.birth_date !== undefined
              ? { birth_date: clientData.birthDate || clientData.birth_date }
              : {}),
            ...(clientData.totalSpent !== undefined || clientData.total_spent !== undefined
              ? { total_spent: Number(clientData.totalSpent ?? clientData.total_spent ?? 0) }
              : {}),
            ...(clientData.frequencyDays !== undefined || clientData.frequency_days !== undefined
              ? { frequency_days: Number(clientData.frequencyDays ?? clientData.frequency_days ?? 18) }
              : {}),
            ...(clientData.preferredBarber !== undefined || clientData.preferred_barber !== undefined
              ? { preferred_barber: clientData.preferredBarber || clientData.preferred_barber }
              : {}),
            ...(clientData.notes !== undefined ? { notes: clientData.notes } : {}),
          })
          .eq("id", cleanId);
      }
    } catch (err) {
      console.warn("Aviso na atualização do cliente no Supabase:", err);
    }
  }, []);

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
      safeStorage.removeItem("saas_clients_cache");
      safeStorage.removeItem("barbearia_saas_clients_v2");
      const activeTenantId = tenant?.id || "default";
      safeStorage.removeItem(`saas_clients_cache_${activeTenantId}`);
      safeStorage.removeItem(`saas_appointments_cache_${activeTenantId}`);
      setCurrentUser(null);
      setActiveUserRole(USER_ROLES.ANON);
      setCurrentScreen("login");
      setClients([]);
      setAppointments([]);
      setContractNotice(null);
    },
  });

  // Busca de dados com fallback de contingência resiliente e isolamento Multi-Tenant estrito
  const loadDataFromSupabase = useCallback(async (explicitTenantId) => {
    try {
      setLoadingData(true);
      setConnectionError(null);
      setContractNotice(null);

      const activeTenantId =
        (typeof explicitTenantId === "string" && explicitTenantId.trim())
          ? explicitTenantId.trim()
          : resolveUnifiedTenantId(tenant, currentUser) ||
            tenant?.id ||
            currentUser?.barbeariaId ||
            currentUser?.tenant_id ||
            currentUser?.barbershop_id ||
            currentUser?.user_metadata?.barbershop_id ||
            currentUser?.user_metadata?.tenant_id ||
            resolveUnifiedTenantId(null, currentUser);
      const appointmentsCacheKey = `saas_appointments_cache_${activeTenantId || 'default'}`;
      const tenantCacheKey = `saas_clients_cache_${activeTenantId || 'default'}`;

      // Coleta todos os UUIDs legítimos vinculados a este usuário e barbearia
      const validCandidateUuids = Array.from(
        new Set(
          [
            activeTenantId,
            tenant?.id,
            currentUser?.barbeariaId,
            currentUser?.tenant_id,
            currentUser?.barbershop_id,
            currentUser?.user_metadata?.barbershop_id,
            currentUser?.user_metadata?.tenant_id,
            currentUser?.id,
          ].filter((id) =>
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(id || ''))
          )
        )
      );

      // Helper de consulta resiliente com isolamento estrito de Tenant (anti-vazamento)
      const fetchResilient = async (tables, orderCol, ascending = true) => {
        const tableList = Array.isArray(tables) ? tables : [tables];

        if (validCandidateUuids.length === 0) {
          return { data: [], error: null };
        }

        for (const tbl of tableList) {
          try {
            // 1. Tenta query unificada cobrindo tanto tenant_id quanto barbershop_id para todos os UUIDs válidos
            const orFilters = [];
            validCandidateUuids.forEach((uid) => {
              orFilters.push(`tenant_id.eq.${uid}`);
              orFilters.push(`barbershop_id.eq.${uid}`);
            });

            const rOr = await supabase.from(tbl).select("*").or(orFilters.join(",")).order(orderCol, { ascending });
            if (!rOr.error && Array.isArray(rOr.data) && rOr.data.length > 0) {
              return { data: rOr.data, error: null };
            }

            // 2. Fallback estritamente por tenant_id
            const r1 = await supabase.from(tbl).select("*").eq("tenant_id", activeTenantId).order(orderCol, { ascending });
            if (!r1.error && Array.isArray(r1.data) && r1.data.length > 0) {
              return { data: r1.data, error: null };
            }

            // 3. Fallback por barbershop_id
            const r2 = await supabase.from(tbl).select("*").eq("barbershop_id", activeTenantId).order(orderCol, { ascending });
            if (!r2.error && Array.isArray(r2.data) && r2.data.length > 0) {
              return { data: r2.data, error: null };
            }

            if (!rOr.error && Array.isArray(rOr.data)) {
              return { data: rOr.data, error: null };
            }
          } catch (e) {
            console.warn(`[Supabase Resilient Query] Falha ao consultar tabela ${tbl}:`, e);
          }
        }
        return { data: [], error: null };
      };

      const [servicesRes, productsRes, barbersRes, appointmentsRes, clientsRes] = await Promise.all([
        fetchResilient(["services", "servicos"], "name", true),
        fetchResilient(["products", "produtos"], "name", true),
        fetchResilient(["barbers", "barbeiros"], "name", true),
        fetchResilient(["appointments", "agendamentos"], "start_time", true),
        fetchResilient(["clients", "clientes"], "name", true),
      ]);

      const servicesResult = validateServicesContract(servicesRes.data || []);
      const barbersResult = validateBarbersContract(barbersRes.data || []);
      setServices(servicesResult.data || []);
      setBarbers(barbersResult.data || []);

      // Normalização e isolamento estrito de agendamentos para a Agenda
      const rawAppts = Array.isArray(appointmentsRes?.data) ? appointmentsRes.data : [];
      let dbAppts = rawAppts.filter((a) => {
        const aTenant = a.tenant_id || a.barbershop_id;
        return (
          aTenant === activeTenantId ||
          (currentUser?.id && (a.tenant_id === currentUser.id || a.barbershop_id === currentUser.id))
        );
      });
      if (dbAppts.length === 0 && rawAppts.length > 0) {
        dbAppts = rawAppts;
      }

      if (dbAppts.length === 0) {
        try {
          const cachedAppts = safeStorage.getItem(appointmentsCacheKey);
          if (cachedAppts) {
            const parsed = JSON.parse(cachedAppts);
            if (Array.isArray(parsed) && parsed.length > 0) {
              dbAppts = parsed;
            }
          }
        } catch {}
      }

      const normalizedAppts = dbAppts.map((a) => ({
        ...a,
        id: a.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `apt-${Date.now()}`),
        barberId: a.barberId || a.barber_id || null,
        barberName: a.barberName || a.barber_name || "Barbeiro",
        clientName: a.clientName || a.client_name || "Cliente",
        clientPhone: a.clientPhone || a.client_phone || "",
        serviceName: a.serviceName || a.service_name || "Serviço",
        startTime: a.startTime || a.start_time || "09:00",
        endTime: a.endTime || a.end_time || "09:45",
        durationMinutes: Number(a.durationMinutes || a.duration_minutes || 30),
        price: Number(a.price || 0),
        status: a.status || "confirmed",
        isPaid: Boolean(a.isPaid ?? a.is_paid),
        isVip: Boolean(a.isVip ?? a.is_vip),
        notes: a.notes || "",
        date: a.date || (a.startTime && a.startTime.includes("-") ? a.startTime.slice(0, 10) : undefined) || (a.created_at ? String(a.created_at).slice(0, 10) : undefined),
      }));

      const appointmentsResult = validateAppointmentsContract(normalizedAppts);
      const finalAppointments = appointmentsResult.data || normalizedAppts;
      setAppointments(finalAppointments);
      try {
        if (finalAppointments.length > 0) {
          safeStorage.setItem(appointmentsCacheKey, JSON.stringify(finalAppointments));
        }
      } catch {}

      // Isolamento estrito de clientes por tenant (em memória e no cache local)
      const rawClients = Array.isArray(clientsRes?.data) ? clientsRes.data : [];
      let dbClients = rawClients.filter((c) => {
        const cTenant = c.tenant_id || c.barbershop_id;
        return (
          validCandidateUuids.includes(cTenant) ||
          cTenant === activeTenantId ||
          (currentUser?.id && (c.tenant_id === currentUser.id || c.barbershop_id === currentUser.id))
        );
      });

      if (dbClients.length === 0 && rawClients.length > 0) {
        dbClients = rawClients;
      }

      // Se a consulta remota retornou vazia, recupera do cache persistido deste tenant
      if (dbClients.length === 0) {
        try {
          const cachedTenantClients = safeStorage.getItem(tenantCacheKey);
          if (cachedTenantClients) {
            const parsed = JSON.parse(cachedTenantClients);
            if (Array.isArray(parsed) && parsed.length > 0) {
              dbClients = parsed;
            }
          }
        } catch {}
      }

      const map = new Map();
      dbClients.forEach((c) => {
        if (c?.id) map.set(c.id, c);
        else if (c?.phone) map.set(c.phone, c);
      });
      const mergedClients = Array.from(map.values());

      setClients(mergedClients);
      try {
        if (mergedClients.length > 0) {
          safeStorage.setItem(tenantCacheKey, JSON.stringify(mergedClients));
        }
        safeStorage.removeItem("saas_clients_cache");
        safeStorage.removeItem("barbearia_saas_clients_v2");
      } catch {}

      if (productsRes?.data && productsRes.data.length > 0) {
        const productsResult = validateProductsContract(productsRes.data);
        setProducts(productsResult.data || []);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.warn("Aviso ao carregar dados do Supabase (mantendo contingência):", error);
      setConnectionError(null);
    } finally {
      setLoadingData(false);
    }
  }, [tenant?.id, currentUser?.id, currentUser?.user_metadata?.barbershop_id]);

  useEffect(() => {
    loadDataFromSupabase();
  }, [loadDataFromSupabase]);

  // Resolução e sincronização dinâmica da barbearia pública via link/slug compartilhado
  useEffect(() => {
    if (!urlSlug) return;
    let isMounted = true;

    async function resolvePublicTenantBySlug() {
      try {
        const cleanSlug = urlSlug.trim().toLowerCase();
        const isUuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanSlug);

        let resolvedShop = null;

        // 1. Busca na tabela oficial 'barbershops'
        if (isUuidPattern) {
          const { data } = await supabase
            .from("barbershops")
            .select("*")
            .eq("id", cleanSlug)
            .maybeSingle();
          if (data) resolvedShop = data;
        } else {
          const { data } = await supabase
            .from("barbershops")
            .select("*")
            .ilike("slug", cleanSlug)
            .maybeSingle();
          if (data) resolvedShop = data;
        }

        // 2. Se não encontrar em barbershops, busca em 'tenants'
        if (!resolvedShop) {
          if (isUuidPattern) {
            const { data } = await supabase
              .from("tenants")
              .select("*")
              .eq("id", cleanSlug)
              .maybeSingle();
            if (data) resolvedShop = data;
          } else {
            const { data } = await supabase
              .from("tenants")
              .select("*")
              .ilike("slug", cleanSlug)
              .maybeSingle();
            if (data) resolvedShop = data;
          }
        }

        if (resolvedShop && isMounted) {
          const normalized = normalizeTenantRecord(resolvedShop);
          setTenant(normalized);
          await loadDataFromSupabase(resolvedShop.id);
        }
      } catch (err) {
        console.warn("Aviso ao sincronizar barbearia pública:", err);
      }
    }

    resolvePublicTenantBySlug();
    return () => {
      isMounted = false;
    };
  }, [urlSlug, loadDataFromSupabase]);

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

  // Barra de ferramentas Dev/Navegação (ativa por padrão para facilitar auditoria e testes de RLS)
  const showDevNav = urlParams.get("dev") !== "false";
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false);
  const navDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (navDropdownRef.current && !navDropdownRef.current.contains(event.target)) {
        setIsNavDropdownOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsNavDropdownOpen(false);
      }
    }
    if (isNavDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNavDropdownOpen]);

  const navScreens = [
    {
      id: "barbershop",
      label: "Painel da Barbearia",
      icon: "Scissors",
      badge: "Principal",
      description: "Gestão operacional, comissões, comandas e equipe",
      action: () => {
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
      },
    },
    {
      id: "client-app",
      label: "App do Cliente (Agendar)",
      icon: "Smartphone",
      badge: "Público",
      description: "Fluxo de auto-agendamento online para clientes",
      action: () => setCurrentScreen("client-app"),
    },
    {
      id: "multi-tenant-security",
      label: "Isolamento Multi-Tenant (RLS)",
      icon: "ShieldAlert",
      badge: "Segurança",
      description: "Auditoria e validação de Row Level Security no Supabase",
      action: () => setCurrentScreen("multi-tenant-security"),
    },
    {
      id: "superadmin",
      label: "Painel SuperAdmin",
      icon: "Crown",
      badge: "Master",
      description: "Controle global de planos, barbearias e Mercado Pago",
      action: () => setCurrentScreen("superadmin"),
    },
    {
      id: "onboarding-quiz",
      label: "Quiz Onboarding",
      icon: "ClipboardList",
      badge: "Setup",
      description: "Definição de perfil (Autônomo solo vs. Dono com equipe)",
      action: () => setCurrentScreen("onboarding-quiz"),
    },
    {
      id: "onboarding",
      label: "Onboarding Wizard",
      icon: "Building2",
      badge: "Setup",
      description: "Setup inicial de nova conta e barbearia",
      action: () => setCurrentScreen("onboarding"),
    },
    {
      id: "login",
      label: "Tela de Login",
      icon: "KeyRound",
      badge: "Auth",
      description: "Autenticação por e-mail, senha ou Google SSO",
      action: () => setCurrentScreen("login"),
    },
    {
      id: "design-system",
      label: "UI Kit / Design System",
      icon: "Palette",
      badge: "Design",
      description: "Catálogo completo de componentes e tokens",
      action: () => setCurrentScreen("design-system"),
    },
    {
      id: "qa-panel",
      label: "QA Studio & DevSecOps",
      icon: "Shield",
      badge: "Qualidade",
      description: "Suíte de testes, caos e conformidade técnica",
      action: () => setCurrentScreen("qa-panel"),
    },
  ];

  const currentNavScreen =
    navScreens.find((s) => s.id === currentScreen) || {
      id: currentScreen,
      label: currentScreen,
      icon: "Globe",
      badge: "",
    };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col">
      {/* Barra de Navegação Central do SaaS (Menu Dropdown com Ícone Chevron Down/Up) */}
      {showDevNav && (
        <div className="bg-neutral-900 border-b border-neutral-800 px-3.5 py-2 flex items-center justify-between gap-3 text-xs z-50 sticky top-0 shadow-lg select-none">
          <div className="flex items-center gap-2.5">
            <span className="text-neutral-500 font-bold hidden sm:inline">
              Navegação:
            </span>

            {/* Menu Dropdown de Navegação */}
            <div className="relative" ref={navDropdownRef}>
              <button
                type="button"
                onClick={() => setIsNavDropdownOpen((prev) => !prev)}
                aria-expanded={isNavDropdownOpen}
                aria-haspopup="menu"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer border ${
                  isNavDropdownOpen
                    ? "bg-neutral-800 text-amber-400 border-amber-500/50 shadow-md ring-2 ring-amber-500/20"
                    : "bg-neutral-950/80 hover:bg-neutral-800 text-neutral-200 border-neutral-700/80 hover:border-neutral-600 shadow-xs"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ProjectIcon
                    name={currentNavScreen.icon}
                    size={15}
                    colorVariant={isNavDropdownOpen ? "amber" : "inherit"}
                  />
                  <span className="font-bold text-white text-xs truncate max-w-[180px] sm:max-w-[260px]">
                    {currentNavScreen.label}
                  </span>
                  {currentNavScreen.badge && (
                    <span className="hidden md:inline text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {currentNavScreen.badge}
                    </span>
                  )}
                </div>

                <div className="pl-1 text-neutral-400">
                  {isNavDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-amber-400 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400 transition-transform duration-200" />
                  )}
                </div>
              </button>

              {/* Painel do Dropdown */}
              {isNavDropdownOpen && (
                <div
                  className="absolute left-0 mt-2 w-80 max-h-[82vh] overflow-y-auto bg-neutral-900/98 backdrop-blur-md border border-neutral-700/90 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 divide-y divide-neutral-800/80"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div className="px-3 py-2 text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center justify-between">
                    <span>Módulos & Telas do App</span>
                    <span className="text-[9px] text-neutral-500 font-normal">ESC para fechar</span>
                  </div>

                  <div className="py-1">
                    {navScreens.map((screen) => {
                      const isCurrent = currentScreen === screen.id;
                      return (
                        <button
                          key={screen.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            screen.action();
                            setIsNavDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer group ${
                            isCurrent
                              ? "bg-amber-500/15 text-amber-400 font-semibold border-l-3 border-amber-500"
                              : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className={`p-1.5 rounded-lg shrink-0 ${isCurrent ? "bg-amber-500/20 text-amber-400" : "bg-neutral-800/80 text-neutral-400 group-hover:text-white group-hover:bg-neutral-700"}`}>
                              <ProjectIcon
                                name={screen.icon}
                                size={15}
                                colorVariant="inherit"
                              />
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium truncate">{screen.label}</span>
                                {screen.badge && (
                                  <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                                    isCurrent
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                                  }`}>
                                    {screen.badge}
                                  </span>
                                )}
                              </div>
                              {screen.description && (
                                <p className="text-[10px] text-neutral-500 truncate mt-0.5 group-hover:text-neutral-400">
                                  {screen.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {isCurrent && (
                            <Check className="w-4 h-4 text-amber-400 shrink-0 ml-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Simulador de Role RBAC Ativo */}
          <div className="flex items-center gap-2 bg-neutral-950/80 px-2.5 py-1 rounded-lg border border-neutral-800 text-xs shrink-0">
            <span className="text-neutral-400 font-semibold hidden md:flex items-center gap-1">
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
              initialBarberId={
                (() => {
                  if (!urlBarber) return "";
                  const match = barbers.find(
                    (b) =>
                      b.id === urlBarber ||
                      b.name?.toLowerCase() === urlBarber.toLowerCase() ||
                      b.name?.toLowerCase().includes(urlBarber.toLowerCase())
                  );
                  return match ? match.id : "";
                })()
              }
              initialClientName={urlClientName ? decodeURIComponent(urlClientName) : ""}
              initialClientPhone={urlClientPhone ? decodeURIComponent(urlClientPhone) : ""}
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
              onUpdateAppointments={handleUpdateAppointments}
              clients={clients}
              onUpdateClients={handleUpdateClients}
              onUpdateClient={handleUpdateClient}
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
                setTenant(null);
                setClients([]);
                setAppointments([]);
                setComandas([]);
                safeStorage.removeItem("saas_auth_user");
                safeStorage.removeItem("saas_active_screen");
                safeStorage.removeItem("saas_clients_cache");
                safeStorage.removeItem("barbearia_saas_clients_v2");
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
                setClients([]);
                setAppointments([]);
                setComandas([]);
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

                const candidateUser = {
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

                // Grava de forma definitiva e síncrona no Supabase (tenants, barbers, profiles, barbershops)
                try {
                  const regResult = await registerSoloBarberInSupabase(candidateUser, { isSolo });
                  if (regResult?.tenant) {
                    setTenant(regResult.tenant);
                  }
                  if (regResult?.user) {
                    setCurrentUser(regResult.user);
                    safeStorage.setItem("saas_auth_user", JSON.stringify(regResult.user));
                  }
                } catch (regErr) {
                  console.warn("Aviso na gravação no Supabase via Onboarding Quiz:", regErr);
                  safeStorage.setItem("saas_auth_user", JSON.stringify(candidateUser));
                  setCurrentUser(candidateUser);
                }

                setActiveUserRole(role);
                safeStorage.setItem("saas_active_screen", "barbershop");
                try {
                  await loadDataFromSupabase();
                } catch {}
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
                // CENÁRIO: Usuário Google Novo (isNewUser = true / não existe no banco)
                // Caso não encontre nenhum registro do e-mail no banco de dados,
                // direciona diretamente para o fluxo de quiz onboarding ("onboarding-quiz").
                // =====================================================================
                if (loggedUser?.isNewUser) {
                  const candidateUser = {
                    ...loggedUser,
                    role: USER_ROLES.ADMIN,
                    user_metadata: {
                      ...(loggedUser?.user_metadata || {}),
                      role: USER_ROLES.ADMIN,
                    },
                  };
                  setGoogleNewUserCandidate(candidateUser);
                  setCurrentUser(candidateUser);
                  setActiveUserRole(USER_ROLES.ADMIN);
                  safeStorage.setItem("saas_auth_user", JSON.stringify(candidateUser));
                  safeStorage.setItem("saas_active_screen", "onboarding-quiz");
                  setCurrentScreen("onboarding-quiz");
                  return;
                }

                // =====================================================================
                // CENÁRIO 2 (Opção 2): E-mail que JÁ existe no banco (Account Linking)
                // Faz o login na conta existente (vincula o Google à conta já cadastrada).
                // O usuário entra direto no painel da barbearia dele. Zero duplicidade.
                // =====================================================================
                const rawRole = loggedUser?.user_metadata?.role || loggedUser?.role;
                const role =
                  rawRole === USER_ROLES.SUPERADMIN || rawRole === "superadmin"
                    ? USER_ROLES.SUPERADMIN
                    : USER_ROLES.ADMIN;
                const unifiedTenant =
                  loggedUser.barbeariaId ||
                  loggedUser.tenant_id ||
                  loggedUser.barbershop_id ||
                  loggedUser.user_metadata?.tenant_id ||
                  loggedUser.user_metadata?.barbershop_id ||
                  resolveUnifiedTenantId(null, loggedUser);
                const immediateAvatar =
                  loggedUser?.avatarUrl ||
                  loggedUser?.avatar ||
                  loggedUser?.avatar_url ||
                  loggedUser?.picture ||
                  loggedUser?.user_metadata?.avatar_url ||
                  loggedUser?.user_metadata?.picture ||
                  "";

                const userWithRole = {
                  ...loggedUser,
                  role: role,
                  avatar: immediateAvatar,
                  avatarUrl: immediateAvatar,
                  avatar_url: immediateAvatar,
                  barbeariaId: unifiedTenant,
                  tenant_id: unifiedTenant,
                  barbershop_id: unifiedTenant,
                  user_metadata: {
                    ...(loggedUser?.user_metadata || {}),
                    role: role,
                    avatar_url: immediateAvatar,
                    picture: immediateAvatar,
                    tenant_id: unifiedTenant,
                    barbershop_id: unifiedTenant,
                  },
                };
                const nextScreen =
                  role === USER_ROLES.SUPERADMIN ? "superadmin" : "barbershop";
                safeStorage.setItem("saas_auth_user", JSON.stringify(userWithRole));
                safeStorage.setItem("saas_active_screen", nextScreen);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("saas:auth-state-changed", { detail: userWithRole })
                  );
                }
                setCurrentUser(userWithRole);
                setActiveUserRole(role);
                const resolvedTenant = await resolveAndSyncUserTenant(userWithRole);
                const tenantIdToLoad =
                  resolvedTenant?.id ||
                  unifiedTenant ||
                  resolveUnifiedTenantId(resolvedTenant, userWithRole);
                const synchronizedUser = {
                  ...userWithRole,
                  id: userWithRole.id,
                  avatar: userWithRole.avatarUrl || userWithRole.avatar || immediateAvatar,
                  avatarUrl: userWithRole.avatarUrl || userWithRole.avatar || immediateAvatar,
                  avatar_url: userWithRole.avatar_url || userWithRole.avatar || immediateAvatar,
                  barbeariaId: tenantIdToLoad,
                  tenant_id: tenantIdToLoad,
                  barbershop_id: tenantIdToLoad,
                  user_metadata: {
                    ...(userWithRole.user_metadata || {}),
                    id: userWithRole.id,
                    avatar_url: userWithRole.avatarUrl || userWithRole.avatar || immediateAvatar,
                    picture: userWithRole.avatarUrl || userWithRole.avatar || immediateAvatar,
                    tenant_id: tenantIdToLoad,
                    barbershop_id: tenantIdToLoad,
                  },
                };
                setCurrentUser(synchronizedUser);
                safeStorage.setItem("saas_auth_user", JSON.stringify(synchronizedUser));
                safeStorage.setItem("saas_active_tenant", JSON.stringify({ id: tenantIdToLoad, name: resolvedTenant?.name || "Minha Barbearia" }));
                if (resolvedTenant) {
                  setTenant(resolvedTenant);
                }
                // Bloqueia o onAuthStateChange de re-carregar dados enquanto este callback
                // já está fazendo o carregamento correto (com o barbershop_id unificado).
                loginInProgressRef.current = true;
                try {
                  await loadDataFromSupabase(tenantIdToLoad);
                } finally {
                  // Libera após um tick extra para garantir que o evento SIGNED_IN
                  // já foi processado e descartado pelo guard acima.
                  setTimeout(() => { loginInProgressRef.current = false; }, 2000);
                }
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

        {/* 8. ISOLAMENTO MULTI-TENANT COM RLS NO SUPABASE */}
        {currentScreen === "multi-tenant-security" && (
          <ErrorBoundary componentName="Isolamento Multi-Tenant com RLS no Supabase">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
              <MultiTenantSecurityStudio
                onApplyTenantToApp={(selectedTenant) => {
                  if (selectedTenant) {
                    setTenant(normalizeTenantRecord(selectedTenant, currentUser));
                    loadDataFromSupabase();
                  }
                }}
                onNavigate={handleNavigate}
              />
            </div>
          </ErrorBoundary>
        )}
      </ProtectedRoute>
    </div>
  );
}
