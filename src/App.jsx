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

  // Determina tela e papel iniciais com base na blindagem contra bypass
  const initialScreen = (() => {
    if (storageAudit.tamperingDetected) return "login";
    if (isDirectProtectedUrl) return "login";
    if (urlScreen) return urlScreen;
    if (urlBarber) return "login";
    return "login"; // Revela apenas Login.jsx por padrão para o fluxo de autenticação do dono
  })();

  const [currentScreen, setCurrentScreen] = useState(initialScreen);

  const handleNavigate = useCallback((screenId) => {
    setCurrentScreen(screenId);
  }, []);

  // Usuário autenticado ativo (Supabase Auth)
  const [currentUser, setCurrentUser] = useState(null);

  // Perfil RBAC ativo: por segurança Default-Deny, inicia como ANON
  const [activeUserRole, setActiveUserRole] = useState(() => {
    if (storageAudit.tamperingDetected || isDirectProtectedUrl) return USER_ROLES.ANON;
    return USER_ROLES.ANON;
  });

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

  // Sincronização e validação de sessão real do Supabase ao recarregar a página
  useEffect(() => {
    let isMounted = true;

    async function syncAuthSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) {
          if (!isMounted) return;
          // Verifica se há sessão ativa via Google SSO em safeStorage antes de forçar logout
          const savedUserStr = safeStorage.getItem("saas_auth_user");
          const savedToken = safeStorage.getItem("saas_jwt_access_token");
          if (savedUserStr && savedToken && savedToken.startsWith("g_sso_")) {
            try {
              const savedUser = JSON.parse(savedUserStr);
              if (savedUser?.email) {
                const role =
                  savedUser.user_metadata?.role ||
                  savedUser.role ||
                  USER_ROLES.ADMIN;
                const normalizedRole =
                  role === "owner" || role === "tenant" ? USER_ROLES.ADMIN : role;
                const userWithRole = {
                  ...savedUser,
                  user_metadata: {
                    ...(savedUser.user_metadata || {}),
                    role: normalizedRole,
                  },
                };
                setCurrentUser(userWithRole);
                setActiveUserRole(normalizedRole);
                resolveAndSyncUserTenant(userWithRole);
                if (currentScreen === "login") {
                  setCurrentScreen(
                    normalizedRole === USER_ROLES.SUPERADMIN ? "superadmin" : "barbershop"
                  );
                }
                return;
              }
            } catch {
              // segue deslogando se JSON corrompido
            }
          }

          // Não reseta usuário nem redireciona se estiver no SuperAdmin, Design System, etc.
          if (currentScreen !== "superadmin" && currentScreen !== "design-system" && currentScreen !== "client-app" && currentScreen !== "onboarding") {
            setCurrentUser(null);
            setActiveUserRole(USER_ROLES.ANON);
            if (currentScreen === "barbershop") {
              setCurrentScreen("login");
            }
          }
        } else {
          if (!isMounted) return;
          const rawRole = session.user.user_metadata?.role;
          const normalizedRole =
            !rawRole || rawRole === "owner" || rawRole === "tenant"
              ? USER_ROLES.ADMIN
              : rawRole;
          const userWithRole = {
            ...session.user,
            user_metadata: {
              ...(session.user.user_metadata || {}),
              role: normalizedRole,
            },
          };
          setCurrentUser(userWithRole);
          setActiveUserRole(normalizedRole);
          resolveAndSyncUserTenant(userWithRole);

          if (currentScreen === "login" && !storageAudit.tamperingDetected && !isDirectProtectedUrl) {
            setCurrentScreen(
              normalizedRole === USER_ROLES.SUPERADMIN ? "superadmin" : "barbershop"
            );
          }
        }
      } catch (err) {
        console.error("Erro na verificação de sessão Supabase:", err);
        if (isMounted && currentScreen !== "superadmin") {
          setCurrentUser(null);
          setActiveUserRole(USER_ROLES.ANON);
        }
      }
    }

    syncAuthSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const rawRole = session.user.user_metadata?.role;
        const normalizedRole =
          !rawRole || rawRole === "owner" || rawRole === "tenant"
            ? USER_ROLES.ADMIN
            : rawRole;
        const userWithRole = {
          ...session.user,
          user_metadata: {
            ...(session.user.user_metadata || {}),
            role: normalizedRole,
          },
        };
        setCurrentUser(userWithRole);
        setActiveUserRole(normalizedRole);
        resolveAndSyncUserTenant(userWithRole);

        if (event === "SIGNED_IN" && currentScreen === "login") {
          setCurrentScreen(
            normalizedRole === USER_ROLES.SUPERADMIN ? "superadmin" : "barbershop"
          );
        }
      } else {
        if (currentScreen !== "superadmin" && currentScreen !== "client-app" && currentScreen !== "design-system") {
          setCurrentUser(null);
          if (currentScreen === "barbershop") {
            setActiveUserRole(USER_ROLES.ANON);
            setCurrentScreen("login");
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

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
    setCurrentScreen("onboarding");
  }, []);

  const handleGoToLogin = useCallback(() => {
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
              onGoToLogin={() => setCurrentScreen("login")}
              onCompleteOnboarding={({ user: newUser, tenant: newTenant }) => {
                if (newUser) setCurrentUser(newUser);
                if (newTenant) setTenant(normalizeTenantRecord(newTenant, newUser));
                setActiveUserRole(USER_ROLES.ADMIN);
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
              onCancel={() => setCurrentScreen("login")}
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
                    user_metadata: {
                      ...(loggedUser?.user_metadata || {}),
                      role: USER_ROLES.SUPERADMIN,
                    },
                  };
                  setCurrentUser(superAdminUser);
                  setActiveUserRole(USER_ROLES.SUPERADMIN);
                  await resolveAndSyncUserTenant(superAdminUser);
                  setCurrentScreen("superadmin");
                  return;
                }

                // Verifica se é primeiro acesso via Google (marcado como isNewUser na criação)
                const isFirstTimeGoogle = Boolean(loggedUser?.isNewUser);

                if (isFirstTimeGoogle) {
                  setCurrentUser(loggedUser);
                  setCurrentScreen("onboarding-quiz");
                  return;
                }

                const rawRole = loggedUser?.user_metadata?.role;
                const role =
                  !rawRole || rawRole === "owner" || rawRole === "tenant"
                    ? USER_ROLES.ADMIN
                    : rawRole;
                const userWithRole = {
                  ...loggedUser,
                  user_metadata: {
                    ...(loggedUser?.user_metadata || {}),
                    role: role,
                  },
                };
                setCurrentUser(userWithRole);
                setActiveUserRole(role);
                await resolveAndSyncUserTenant(userWithRole);
                setCurrentScreen(
                  role === USER_ROLES.SUPERADMIN ? "superadmin" : "barbershop"
                );
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
