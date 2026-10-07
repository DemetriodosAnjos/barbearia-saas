// Edge Function: Invalidação de Refresh Tokens (Supabase Admin API)
// Caminho de deploy: supabase/functions/revoke-user-sessions/index.ts
// Runtime: Deno / Supabase Edge Runtime (TypeScript)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

interface RevokeSessionPayload {
  user_id: string;
  reason?: "password_change" | "user_blocked" | "anomaly_detected" | "manual_admin_revocation";
  admin_id?: string;
  metadata?: Record<string, unknown>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const internalSecret = Deno.env.get("INTERNAL_SERVICE_SECRET");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta (chaves ausentes)." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providedSecret = req.headers.get("x-internal-secret");
    const authHeader = req.headers.get("Authorization");

    if (internalSecret && providedSecret !== internalSecret) {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Não autorizado: Chave de serviço interna inválida." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body: RevokeSessionPayload = await req.json();
    const { user_id, reason = "manual_admin_revocation", admin_id, metadata = {} } = body;

    if (!user_id || typeof user_id !== "string" || user_id.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Campo obrigatório ausente: 'user_id' é necessário." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedUserId = user_id.trim();

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Revoga todos os Refresh Tokens do usuário no Supabase Auth GoTrue (invalidação global)
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(
      normalizedUserId,
      "global"
    );

    if (signOutError) {
      return new Response(
        JSON.stringify({
          error: "Falha ao revogar tokens de atualização no provedor de autenticação.",
          details: signOutError.message,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    // Invalida sessões ativas na tabela persistente de sessões
    await supabaseAdmin
      .from("sessions")
      .update({
        is_active: false,
        revoked_at: now,
        revocation_reason: reason,
        updated_at: now,
      })
      .eq("user_id", normalizedUserId)
      .eq("is_active", true);

    // Registra evento imutável na trilha de auditoria de segurança
    await supabaseAdmin
      .from("security_audit_events")
      .insert({
        event_type: "SESSION_ALL_REFRESH_TOKENS_REVOKED",
        user_id: normalizedUserId,
        actor_id: admin_id || "SYSTEM_EDGE_FUNCTION",
        reason,
        metadata: {
          ...metadata,
          revoked_at: now,
          scope: "global",
          source: "supabase-edge-function",
        },
        created_at: now,
      });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: normalizedUserId,
        action: "ALL_REFRESH_TOKENS_REVOKED",
        reason,
        revoked_at: now,
        scope: "global",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno no processamento";
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar revogação de tokens.", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
