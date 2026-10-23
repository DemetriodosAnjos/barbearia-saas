import {
  supabase,
  buildTenantRecordPayload,
  normalizeTenantRecord,
} from "../lib/supabase";
import { safeStorage } from "../utils/safeStorage";
import { USER_ROLES } from "../security/authorizationMatrix";

const generateUUID = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Registra o profissional autônomo (ou dono) de forma síncrona e definitiva
 * nas 3 tabelas fundamentais do Supabase:
 * 1. public.tenants (Dados da barbearia / tenant)
 * 2. public.barbers (Profissional para agenda e agendamentos)
 * 3. public.profiles (Identidade do usuário vinculado ao tenant)
 */
export async function registerSoloBarberInSupabase(
  googleUser: any,
  options: { isSolo?: boolean } = {}
) {
  const isSolo = options.isSolo !== false;
  const normalizedEmail = (
    googleUser?.email ||
    googleUser?.user_metadata?.email ||
    ""
  ).toLowerCase().trim();

  const cleanName = (
    googleUser?.name ||
    googleUser?.user_metadata?.name ||
    googleUser?.user_metadata?.full_name ||
    normalizedEmail.split("@")[0] ||
    "Barbeiro Autônomo"
  ).trim();

  const avatarUrl =
    googleUser?.avatarUrl ||
    googleUser?.user_metadata?.picture ||
    googleUser?.user_metadata?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=d97706&color=fff&bold=true`;

  const nowIso = new Date().toISOString();
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 7);
  const trialEndsAtIso = trialEnds.toISOString();

  // 1. Verifica se já existe um tenant para este e-mail no Supabase
  let existingTenantId = null;
  let existingTenantRow = null;

  try {
    const { data: foundTenants } = await supabase
      .from("tenants")
      .select("*")
      .ilike("owner_email", normalizedEmail)
      .limit(1);

    if (foundTenants && foundTenants.length > 0) {
      existingTenantRow = foundTenants[0];
      existingTenantId = existingTenantRow.id;
    }
  } catch (tCheckErr) {
    console.warn("Aviso na consulta preventiva de tenants:", tCheckErr);
  }

  // 2. Define IDs com formato canônico UUID (v4)
  const tenantId = existingTenantId || generateUUID();
  const userId =
    googleUser?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(googleUser.id)
      ? googleUser.id
      : generateUUID();
  const barberId = generateUUID();

  // 3. Monta o slug da barbearia
  const slugBase = cleanName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const shopSlug = existingTenantRow?.slug || `barbearia-${slugBase || "autonomo"}-${tenantId.slice(0, 4)}`;
  const barbershopName = existingTenantRow?.name || `Barbearia ${cleanName}`;

  // 4. Grava em public.tenants (18 colunas oficiais)
  const tenantPayload = buildTenantRecordPayload({
    id: tenantId,
    name: barbershopName,
    slug: shopSlug,
    ownerName: cleanName,
    ownerEmail: normalizedEmail,
    phone: googleUser?.phone || googleUser?.user_metadata?.phone || "",
    plan: isSolo ? "starter" : "pro",
    status: "active",
    barbersCount: 1,
    mrr: isSolo ? 69.9 : 149.9,
    trialDaysLeft: 7,
    trialEndsAt: trialEndsAtIso,
    hasWhiteLabel: false,
    brandPrimary: "#ea580c",
    brandSecondary: "#16a34a",
    logoUrl: avatarUrl,
    createdAt: existingTenantRow?.created_at || nowIso,
    updatedAt: nowIso,
  } as any);

  let savedTenant: any = null;
  try {
    const { data: tData, error: tErr } = await supabase
      .from("tenants")
      .upsert([tenantPayload], { onConflict: "id" })
      .select()
      .maybeSingle();

    if (tErr) {
      console.warn("Aviso ao persistir em tenants:", tErr.message);
      savedTenant = normalizeTenantRecord(tenantPayload, googleUser);
    } else {
      savedTenant = normalizeTenantRecord(tData || tenantPayload, googleUser);
    }
  } catch (err) {
    console.warn("Falha de rede ao persistir tenant:", err);
    savedTenant = normalizeTenantRecord(tenantPayload, googleUser);
  }

  // 5. Sincroniza em public.barbershops com o mesmo UUID
  try {
    await supabase.from("barbershops").upsert(
      [
        {
          id: tenantId,
          name: barbershopName,
          slug: shopSlug,
          phone: googleUser?.phone || googleUser?.user_metadata?.phone || "",
          plan: isSolo ? "starter" : "pro",
          subscription_plan: "trial",
          trial_ends_at: trialEndsAtIso,
          updated_at: nowIso,
        },
      ],
      { onConflict: "id" }
    );
  } catch (bShopErr) {
    console.warn("Aviso ao sincronizar barbershops:", bShopErr);
  }

  // 6. Grava em public.barbers (Tabela oficial da equipe)
  let savedBarber = null;
  try {
    const barberPayload = {
      id: barberId,
      tenant_id: tenantId,
      barbershop_id: tenantId,
      name: cleanName,
      display_name: cleanName,
      email: normalizedEmail,
      phone: googleUser?.phone || googleUser?.user_metadata?.phone || "",
      avatar_url: avatarUrl,
      role: "barber",
      status: "active",
      rating: 5.0,
      review_count: 0,
      service_commission: isSolo ? 100 : 50,
      product_commission: isSolo ? 100 : 10,
    };

    const { data: bData, error: bErr } = await supabase
      .from("barbers")
      .upsert([barberPayload], { onConflict: "id" })
      .select()
      .maybeSingle();

    if (!bErr && bData) {
      savedBarber = bData;
    } else {
      savedBarber = barberPayload;
    }
  } catch (barberErr) {
    console.warn("Aviso ao persistir em barbers:", barberErr);
  }

  // 7. Grava em public.profiles (Tabela oficial de perfis)
  try {
    const profilePayload = {
      id: userId,
      email: normalizedEmail,
      full_name: cleanName,
      phone: googleUser?.phone || googleUser?.user_metadata?.phone || "",
      role: USER_ROLES.ADMIN,
      barbershop_id: tenantId,
      updated_at: nowIso,
    };

    await supabase
      .from("profiles")
      .upsert([profilePayload], { onConflict: "id" });
  } catch (pErr) {
    console.warn("Aviso ao persistir em profiles:", pErr);
  }

  // 8. Cria serviço inicial básico se não houver
  try {
    const servicePayload = {
      id: generateUUID(),
      tenant_id: tenantId,
      barbershop_id: tenantId,
      name: "Corte Tradicional",
      category: "Cabelo",
      price: 35.0,
      duration_minutes: 30,
      cost: 0,
      commission_percentage: 100,
      active: true,
    };
    await supabase.from("services").upsert([servicePayload], { onConflict: "id" });
  } catch (_sErr) {
    // Não-bloqueante
  }

  // 9. Atualiza o objeto de usuário e a persistência em safeStorage
  const updatedUser = {
    ...googleUser,
    id: userId,
    email: normalizedEmail,
    name: cleanName,
    role: "owner",
    barbeariaId: tenantId,
    tenant_id: tenantId,
    persona: isSolo ? "solo_barber" : "owner_team",
    isSolo,
    authProvider: "google",
    user_metadata: {
      ...(googleUser?.user_metadata || {}),
      name: cleanName,
      role: USER_ROLES.ADMIN,
      persona: isSolo ? "solo_barber" : "owner_team",
      is_solo: isSolo,
      barbershop_id: tenantId,
      tenant_id: tenantId,
      barbershop_name: barbershopName,
      picture: avatarUrl,
    },
  };

  safeStorage.setItem("saas_auth_user", JSON.stringify(updatedUser));
  safeStorage.setItem("barber_saas_persona", isSolo ? "solo_barber" : "owner_team");
  // Marca para exibir o banner de alerta "Complete seu perfil"
  safeStorage.setItem("barber_profile_completion_needed", "true");

  return {
    tenant: savedTenant,
    user: updatedUser,
    barber: savedBarber,
  };
}
