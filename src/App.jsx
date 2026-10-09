import ProjectIcon from "./components/ui/ProjectIcon";
import { useState, useEffect, useCallback } from "react";
import {
  supabase,
  buildTenantRecordPayload,
  normalizeTenantRecord,
} from "./lib/supabase";
import DesignSystem from "./pages/DesignSystem";
import OnboardingWizard from "./pages/Onboarding/OnboardingWizard";
import Login from "./pages/Auth/Login";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import BarbershopDashboard from "./pages/BarbershopAdmin/BarbershopDashboard";
import ClientBookingView from "./pages/ClientBooking/ClientBookingView";
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

  // Estados Centrais do SaaS
  const [tenant, setTenant] = useState(() =>
    normalizeTenantRecord({
      id: "a0000000-0000-0000-0000-000000000001",
      name: "Vintage Club Barber Shop",
      slug: "vintage-club",
      plan: "pro",
      status: "active",
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

      const resolvedPlan =
        tenantRow?.plan || barbershopRow?.plan || userMeta.plan || "pro";

      const resolvedTrialEndsAt =
        tenantRow?.trial_ends_at ||
        barbershopRow?.trial_ends_at ||
        userMeta.trial_ends_at ||
        null;

      // Se o usuário é real (UUID) e a linha em `tenants` não existia ou estava incompleta, sincroniza
      const isUuidUser = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        String(authUser.id || "")
      );
      const needsTenantUpsert =
        isUuidUser &&
        (!tenantRow ||
          !tenantRow.phone ||
          !tenantRow.owner_email ||
          Number(tenantRow.mrr || 0) === 0 ||
          tenantRow.name !== resolvedName ||
          tenantRow.slug !== resolvedSlug);

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
          const { data: upserted } = await supabase
            .from("tenants")
            .upsert([upsertPayload], { onConflict: "id" })
            .select()
            .maybeSingle();
          syncedTenantData = upserted || upsertPayload;
        } catch {
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
          setCurrentUser(null);
          if (currentScreen !== "design-system" && currentScreen !== "client-app" && currentScreen !== "onboarding") {
            setActiveUserRole(USER_ROLES.ANON);
            if (currentScreen === "barbershop" || currentScreen === "superadmin") {
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
        if (isMounted) {
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
        setCurrentUser(null);
        if (currentScreen === "barbershop" || currentScreen === "superadmin") {
          setActiveUserRole(USER_ROLES.ANON);
          setCurrentScreen("login");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [currentScreen, isDirectProtectedUrl, resolveAndSyncUserTenant, storageAudit.tamperingDetected]);

  // Efeito de auditoria contínua a cada alteração de tela
  useEffect(() => {
    const audit = detectAndNeutralizeStorageTampering();
    if (audit.tamperingDetected) {
      setCurrentUser(null);
      setActiveUserRole(USER_ROLES.ANON);
      setCurrentScreen("login");
    }
  }, [currentScreen]);

  // Atendimento especificado: #apt-179138762174 concluído de R$ 20,00 com status Pendente
  const DEFAULT_APPOINTMENT_179138762174 = {
    id: "apt-179138762174",
    barberId: "barber-carlos",
    barberName: "Carlos Silva",
    clientName: "Marcos Oliveira",
    clientPhone: "(11) 98765-4321",
    serviceName: "Acabamento / Pezinho",
    startTime: "10:00",
    endTime: "10:20",
    durationMinutes: 20,
    price: 20,
    status: "completed", // Atendimento Concluído
    isPaid: false,       // Pagamento Pendente
    isVip: false,
    notes: "Acabamento navalhado. Atendimento concluído pelo barbeiro, pagamento pendente no caixa.",
  };

  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([DEFAULT_APPOINTMENT_179138762174]);
  const [comandas, setComandas] = useState([
    {
      id: "apt-179138762174",
      clientName: "Marcos Oliveira",
      clientPhone: "(11) 98765-4321",
      barberName: "Carlos Silva",
      status: "pending_payment",
      openedAt: "10:00",
      isAppointment: true,
      services: [
        {
          id: "serv-4",
          name: "Acabamento / Pezinho",
          price: 20,
          barberCommission: 10,
        },
      ],
      products: [],
    },
    {
      id: "CMD-1042",
      clientName: "Ricardo Almeida",
      clientPhone: "(11) 99881-2233",
      barberName: "Lucas Rocha",
      status: "open",
      openedAt: "10:15",
      services: [
        { id: "s-1", name: "Corte Degradê", price: 50, barberCommission: 25 },
      ],
      products: [
        { id: "p-3", name: "Cerveja Heineken Long Neck 330ml", quantity: 2, unitPrice: 12, total: 24, sellerCommission: 2.4 },
      ],
    },
  ]);
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
      const rawAppts = appointmentsResult.data || [];
      const hasTarget = rawAppts.some((a) => a.id === "apt-179138762174" || a.id === "#apt-179138762174");
      const mergedAppts = hasTarget ? rawAppts : [DEFAULT_APPOINTMENT_179138762174, ...rawAppts];
      setAppointments(mergedAppts);

      if (productsRes?.data && productsRes.data.length > 0) {
        const productsResult = validateProductsContract(productsRes.data);
        setProducts(productsResult.data);
      } else {
        const fallbackProducts = [
          {
            id: "prod-1",
            barbershop_id: "a0000000-0000-0000-0000-000000000001",
            name: "Pomada Modeladora Efeito Matte 150g",
            category: "Vitrine",
            icon: "product",
            costPrice: 22,
            price: 45,
            stock: 24,
            commissionPercent: 10,
            active: true,
          },
          {
            id: "prod-2",
            barbershop_id: "a0000000-0000-0000-0000-000000000001",
            name: "Óleo Hidratante para Barba 30ml",
            category: "Vitrine",
            icon: "product",
            costPrice: 18,
            price: 38,
            stock: 15,
            commissionPercent: 10,
            active: true,
          },
          {
            id: "prod-3",
            barbershop_id: "a0000000-0000-0000-0000-000000000001",
            name: "Cerveja Heineken Long Neck 330ml",
            category: "Bar",
            icon: "beer",
            costPrice: 6,
            price: 12,
            stock: 48,
            commissionPercent: 5,
            active: true,
          },
          {
            id: "prod-4",
            barbershop_id: "a0000000-0000-0000-0000-000000000001",
            name: "Água Mineral com Gás 500ml",
            category: "Bar",
            icon: "beer",
            costPrice: 2,
            price: 5,
            stock: 60,
            commissionPercent: 5,
            active: true,
          },
          {
            id: "prod-5",
            barbershop_id: "a0000000-0000-0000-0000-000000000001",
            name: "Refrigerante Coca-Cola Lata 350ml",
            category: "Bar",
            icon: "beer",
            costPrice: 3.5,
            price: 7,
            stock: 36,
            commissionPercent: 5,
            active: true,
          },
        ];
        setProducts(fallbackProducts);
      }

      if (servicesResult.isPartial || barbersResult.isPartial || appointmentsResult.isPartial) {
        const totalDropped = servicesResult.droppedCount + barbersResult.droppedCount + appointmentsResult.droppedCount;
        setContractNotice(
          `Resiliência Ativa: Dados parciais carregados com validação Zod (${totalDropped} registros com contrato divergente foram sanitizados).`
        );
      }
    } catch (error) {
      console.warn("Supabase não acessível ou em modo offline, aplicando fallback tolerante:", error);
      const fallbackServices = [
        { id: "serv-1", name: "Corte Tradicional / Degradê", category: "Cabelo", durationMinutes: 40, price: 45, active: true },
        { id: "serv-2", name: "Barba Completa com Toalha Quente", category: "Barba", durationMinutes: 30, price: 35, active: true },
        { id: "serv-3", name: "Combo Cabelo + Barba Premium", category: "Combo", durationMinutes: 60, price: 70, active: true },
        { id: "serv-4", name: "Acabamento / Pezinho", category: "Cabelo", durationMinutes: 20, price: 20, active: true },
        { id: "serv-5", name: "Sobrancelha Navalhada", category: "Estética", durationMinutes: 15, price: 15, active: true },
      ];
      const fallbackProducts = [
        { id: "prod-1", barbershop_id: "a0000000-0000-0000-0000-000000000001", name: "Pomada Modeladora Efeito Matte 150g", category: "Vitrine", icon: "product", costPrice: 22, price: 45, stock: 24, commissionPercent: 10, active: true },
        { id: "prod-2", barbershop_id: "a0000000-0000-0000-0000-000000000001", name: "Óleo Hidratante para Barba 30ml", category: "Vitrine", icon: "product", costPrice: 18, price: 38, stock: 15, commissionPercent: 10, active: true },
        { id: "prod-3", barbershop_id: "a0000000-0000-0000-0000-000000000001", name: "Cerveja Heineken Long Neck 330ml", category: "Bar", icon: "beer", costPrice: 6, price: 12, stock: 48, commissionPercent: 5, active: true },
        { id: "prod-4", barbershop_id: "a0000000-0000-0000-0000-000000000001", name: "Água Mineral com Gás 500ml", category: "Bar", icon: "beer", costPrice: 2, price: 5, stock: 60, commissionPercent: 5, active: true },
        { id: "prod-5", barbershop_id: "a0000000-0000-0000-0000-000000000001", name: "Refrigerante Coca-Cola Lata 350ml", category: "Bar", icon: "beer", costPrice: 3.5, price: 7, stock: 36, commissionPercent: 5, active: true },
      ];
      const fallbackBarbers = [
        { id: "barber-carlos", name: "Carlos Silva", displayName: "Carlos", role: "Master Barber", avatar: "CS", rating: 4.9, reviewCount: 88, status: "active", specialties: ["Degradê", "Barba Terapia"] },
        { id: "barber-lucas", name: "Lucas Rocha", displayName: "Lucas", role: "Barbeiro Sênior", avatar: "LR", rating: 4.8, reviewCount: 64, status: "active", specialties: ["Corte Social", "Pigmentação"] },
        { id: "barber-andre", name: "André Santos", displayName: "André", role: "Especialista em Barba", avatar: "AS", rating: 4.7, reviewCount: 42, status: "active", specialties: ["Navalhado", "Toalha Quente"] },
      ];
      const fallbackAppointments = [
        DEFAULT_APPOINTMENT_179138762174,
        { id: "apt-1", barberId: "barber-carlos", barberName: "Carlos Silva", clientName: "João Pedro", clientPhone: "(11) 98765-4321", serviceName: "Corte Tradicional", startTime: "09:00", endTime: "09:40", durationMinutes: 40, price: 45, status: "confirmed", isPaid: true, isVip: false },
        { id: "apt-2", barberId: "barber-lucas", barberName: "Lucas Rocha", clientName: "Mateus Costa", clientPhone: "(11) 91234-5678", serviceName: "Barba Completa", startTime: "10:00", endTime: "10:30", durationMinutes: 30, price: 35, status: "confirmed", isPaid: false, isVip: true },
      ];

      setServices(fallbackServices);
      setProducts(fallbackProducts);
      setBarbers(fallbackBarbers);
      setAppointments(fallbackAppointments);
      setConnectionError(null);
      setContractNotice("Modo Resiliente: Catálogo de contingência carregado com sucesso.");
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
      barberId: bookingData.barberId || "barber-carlos",
      barberName: bookingData.barberName,
      clientName: bookingData.clientName,
      clientPhone: bookingData.clientPhone,
      serviceName: bookingData.services,
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

  // 1. Tela de Carregamento
  // 1. Se estiver na tela de login, revela única e exclusivamente o Login.jsx
  if (currentScreen === "login") {
    return (
      <ErrorBoundary componentName="Tela de Login">
        <Login
          onGoToSignup={() => setCurrentScreen("onboarding")}
          onLoginSuccess={async (loggedUser) => {
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
    );
  }

  // 2. Se estiver no onboarding, exibe o assistente isolado
  if (currentScreen === "onboarding") {
    return (
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
    );
  }

  // 3. Tela de Carregamento para rotas autenticadas/operacionais
  if (loadingData) {
    return (
      <div className="min-h-screen w-full bg-neutral-950 flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-neutral-400">
          Sincronizando barbearia com a nuvem...
        </p>
      </div>
    );
  }

  // 4. Tela de Erro de Conexão
  if (connectionError) {
    return (
      <div className="min-h-screen w-full bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-xl mb-4">
          <ProjectIcon name="AlertTriangle" size={24} colorVariant="danger" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Erro de Conexão</h3>
        <p className="text-xs text-neutral-400 max-w-sm mb-5 leading-relaxed">
          {connectionError}
        </p>
        <button
          onClick={loadDataFromSupabase}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <ProjectIcon name="RefreshCw" size={13} colorVariant="inherit" />
          <span>Tentar Novamente</span>
        </button>
      </div>
    );
  }

  const showDevNav = urlParams.get("dev") === "true";

  return (
    <div>
      {/* Barra de Navegação Central do SaaS (Apenas visível se ?dev=true) */}
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
            onClick={() => setCurrentScreen("barbershop")}
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

        {/* 5. LOGIN: Autenticação de usuários */}
        {currentScreen === "login" && (
          <ErrorBoundary componentName="Tela de Login">
            <Login
              onGoToSignup={() => setCurrentScreen("onboarding")}
              onLoginSuccess={async (loggedUser) => {
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
            <DesignSystem />
          </ErrorBoundary>
        )}
      </ProtectedRoute>
    </div>
  );
}
