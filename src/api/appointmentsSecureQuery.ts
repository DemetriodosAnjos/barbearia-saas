import { supabase } from "../lib/supabase";

export interface AppointmentSearchParams {
  tenantId: string;
  clientName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AppointmentRecord {
  id: string;
  tenant_id: string;
  client_name: string;
  client_phone: string;
  barber_id: string;
  service_name: string;
  price: number;
  start_time: string;
  end_time: string;
  status: string;
  created_at?: string;
}

/**
 * Construtor funcional da consulta segura via Supabase JS
 * Recebe o client Supabase e os parâmetros, retornando a query encadeada de forma 100% parametrizada.
 */
export function buildSupabaseAppointmentQuery(
  client: any,
  params: AppointmentSearchParams
) {
  if (!params.tenantId || typeof params.tenantId !== "string") {
    throw new Error("Identificador do tenant (tenant_id) obrigatório.");
  }

  let query = client
    .from("appointments")
    .select(
      "id, tenant_id, client_name, client_phone, barber_id, service_name, price, start_time, end_time, status, created_at"
    )
    .eq("tenant_id", params.tenantId.trim());

  if (params.clientName && typeof params.clientName === "string" && params.clientName.trim().length > 0) {
    query = query.ilike("client_name", `%${params.clientName.trim()}%`);
  }

  if (params.status && typeof params.status === "string" && params.status.trim().length > 0) {
    query = query.eq("status", params.status.trim());
  }

  if (params.startDate) {
    query = query.gte("start_time", params.startDate);
  }
  if (params.endDate) {
    query = query.lte("start_time", params.endDate);
  }

  const limit = params.limit || 50;
  const offset = params.offset || 0;

  return query
    .order("start_time", { ascending: false })
    .range(offset, offset + limit - 1);
}

/**
 * Task 5.1: Abordagem 1 - Consulta Segura via Construtor Supabase JS (supabase.from().select())
 * Elimina completamente interpolação de strings, tratando apóstrofos e caracteres especiais via parameter binding nativo.
 */
export async function getAppointmentsSecure(
  params: AppointmentSearchParams,
  client = supabase
): Promise<{ data: AppointmentRecord[] | null; error: Error | null }> {
  try {
    const query = buildSupabaseAppointmentQuery(client, params);
    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as AppointmentRecord[], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { data: null, error: new Error(msg) };
  }
}

/**
 * Task 5.1: Abordagem 2 - Consulta Segura via Função RPC Parametrizada no PostgreSQL
 * Utiliza função PL/pgSQL com argumentos fortemente tipados e plano de execução compilado.
 */
export async function searchAppointmentsByClientRpc(
  params: { tenantId: string; clientName?: string; status?: string }
): Promise<{ data: AppointmentRecord[] | null; error: Error | null }> {
  const { tenantId, clientName, status } = params;

  if (!tenantId) {
    return { data: null, error: new Error("tenant_id é obrigatório.") };
  }

  const { data, error } = await supabase.rpc("search_appointments_by_client", {
    p_tenant_id: tenantId.trim(),
    p_client_name: clientName ? clientName.trim() : null,
    p_status: status ? status.trim() : null,
  });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as AppointmentRecord[], error: null };
}
