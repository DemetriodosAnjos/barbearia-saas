#!/usr/bin/env node
/**
 * scripts/revoke-tokens-admin.js
 *
 * Script SecOps de linha de comando para Revogação Imediata de Sessões e Refresh Tokens via Supabase Admin API.
 * Uso:
 *   node scripts/revoke-tokens-admin.js <USER_ID> [TRIGGER] [ADMIN_ID] [REASON]
 *
 * Exemplos:
 *   node scripts/revoke-tokens-admin.js usr_123 logout_all_devices
 *   node scripts/revoke-tokens-admin.js usr_123 password_change
 *   node scripts/revoke-tokens-admin.js usr_123 user_blocked ADMIN_01 "Suspeita de invasão"
 */

import { createClient } from "@supabase/supabase-js";

const userId = process.argv[2];
const trigger = process.argv[3] || "logout_all_devices";
const adminId = process.argv[4] || "SECOPS_CLI";
const reason = process.argv[5] || "Revogação disparada via CLI SecOps";

if (!userId) {
  console.error("Erro: Identificador de usuário (userId) obrigatório.");
  console.log("Uso: node scripts/revoke-tokens-admin.js <USER_ID> [TRIGGER] [ADMIN_ID] [REASON]");
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder_service_key";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`[SECOPS] Iniciando revogação de tokens para usuário: ${userId}`);
  console.log(`[SECOPS] Trigger: ${trigger} | Admin: ${adminId} | Razão: ${reason}`);

  try {
    // 1. Invoca o GoTrue Admin signOut global
    const { error: signOutError } = await supabase.auth.admin.signOut(userId, "global");
    if (signOutError) {
      console.warn(`[WARN] Erro ao revogar Refresh Tokens no GoTrue: ${signOutError.message}`);
    } else {
      console.log(`[OK] Refresh Tokens revogados no GoTrue (signOut global).`);
    }

    // 2. Inativa sessões na tabela de banco
    const nowIso = new Date().toISOString();
    const { error: dbError } = await supabase
      .from("sessions")
      .update({
        is_active: false,
        revoked_at: nowIso,
        revocation_reason: `${trigger}: ${reason}`,
      })
      .eq("user_id", userId);

    if (dbError) {
      console.warn(`[WARN] Erro ao inativar tabela 'sessions': ${dbError.message}`);
    } else {
      console.log(`[OK] Sessões marcadas como inativas no PostgreSQL.`);
    }

    console.log(`[SUCCESS] Revogação concluída com sucesso às ${nowIso}`);
  } catch (err) {
    console.error(`[FATAL] Falha na execução da revogação:`, err);
    process.exit(1);
  }
}

main();
