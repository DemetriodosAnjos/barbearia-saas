// Supabase Edge Function: Verificação em Tempo Real de JWT, TTL e Revogação Ativa
// Caminho: supabase/functions/verify-jwt-session/index.ts
// Runtime: Deno / Supabase Edge Runtime (TypeScript)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const MAX_ACCESS_TOKEN_TTL_SECONDS = 900; // 15 minutos

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          valid: false,
          code: "MISSING_TOKEN",
          error: "Cabeçalho de autorização (Bearer token) ausente.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.substring(7).trim();
    const parts = token.split(".");
    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({
          valid: false,
          code: "MALFORMED_JWT",
          error: "Formato do token JWT inválido.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));

    const nowSeconds = Math.floor(Date.now() / 1000);
    const iat = payload.iat || 0;
    const exp = payload.exp || 0;
    const userId = payload.sub || payload.user_id;
    const sessionId = payload.session_id || payload.sid;

    // 1. Validação de TTL Máximo (15 minutos)
    const tokenTtl = exp - iat;
    if (tokenTtl > MAX_ACCESS_TOKEN_TTL_SECONDS) {
      return new Response(
        JSON.stringify({
          valid: false,
          code: "TOKEN_TTL_EXCEEDED",
          error: `O tempo de vida do token (${tokenTtl}s) excede a política de 15 minutos (900s).`,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (exp < nowSeconds) {
      return new Response(
        JSON.stringify({
          valid: false,
          code: "TOKEN_EXPIRED",
          error: "Token expirado.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Consulta de Usuário Bloqueado e Sessão Ativa via Supabase Admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseServiceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Checa se o usuário está bloqueado no perfil
      if (userId) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("status, is_active")
          .eq("id", userId)
          .maybeSingle();

        if (profile && (profile.status === "blocked" || profile.is_active === false)) {
          return new Response(
            JSON.stringify({
              valid: false,
              code: "USER_BLOCKED",
              error: "Acesso revogado: Este usuário está bloqueado pelo administrador.",
            }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Checa se a sessão específica ainda consta ativa na tabela sessions
      if (sessionId && userId) {
        const { data: session } = await supabaseAdmin
          .from("sessions")
          .select("is_active, revoked_at")
          .eq("id", sessionId)
          .eq("user_id", userId)
          .maybeSingle();

        if (session && session.is_active === false) {
          return new Response(
            JSON.stringify({
              valid: false,
              code: "SESSION_REVOKED",
              error: "Sessão revogada (Sair em todos os dispositivos ou troca de credenciais).",
              revoked_at: session.revoked_at,
            }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        valid: true,
        user_id: userId,
        session_id: sessionId,
        role: payload.role || "client",
        tenant_id: payload.tenant_id,
        ttl_seconds: tokenTtl,
        expires_at: new Date(exp * 1000).toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ valid: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
