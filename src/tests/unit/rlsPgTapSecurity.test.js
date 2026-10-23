import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Módulo 6: Políticas de RLS no PostgreSQL e Testes pgTAP", () => {
  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20260925_enable_rls_and_storage_policies.sql"
  );
  const pgTapPath = path.resolve(
    process.cwd(),
    "supabase/tests/database/01_rls_pgtap_security.test.sql"
  );

  it("deve conter o arquivo de migração SQL com ativação de RLS", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const content = fs.readFileSync(migrationPath, "utf-8");

    // Valida ativação de RLS nas tabelas principais
    expect(content).toContain("ALTER TABLE IF EXISTS public.barbershops ENABLE ROW LEVEL SECURITY;");
    expect(content).toContain("ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;");
    expect(content).toContain("ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;");
    expect(content).toContain("ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;");
    expect(content).toContain("ALTER TABLE IF EXISTS public.security_audit_events ENABLE ROW LEVEL SECURITY;");
    expect(content).toContain("ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;");
    expect(content).toContain("ALTER TABLE IF EXISTS storage.buckets ENABLE ROW LEVEL SECURITY;");
  });

  it("deve conter políticas CRUD estritas para appointments e clients", () => {
    const content = fs.readFileSync(migrationPath, "utf-8");

    expect(content).toContain("CREATE POLICY \"appointments_select_policy\"");
    expect(content).toContain("CREATE POLICY \"appointments_insert_policy\"");
    expect(content).toContain("CREATE POLICY \"appointments_update_policy\"");
    expect(content).toContain("CREATE POLICY \"appointments_delete_policy\"");

    expect(content).toContain("CREATE POLICY \"clients_select_policy\"");
    expect(content).toContain("CREATE POLICY \"clients_modify_policy\"");
  });

  it("deve proteger os buckets do Supabase Storage e restringir comprovantes de Pix", () => {
    const content = fs.readFileSync(migrationPath, "utf-8");

    expect(content).toContain("CREATE POLICY \"receipts_deny_anon\"");
    expect(content).toContain("CREATE POLICY \"receipts_select_policy\"");
    expect(content).toContain("CREATE POLICY \"receipts_insert_policy\"");
  });

  it("deve conter o script de teste pgTAP com plano e asserções formais", () => {
    expect(fs.existsSync(pgTapPath)).toBe(true);
    const content = fs.readFileSync(pgTapPath, "utf-8");

    expect(content).toContain("CREATE EXTENSION IF NOT EXISTS pgtap;");
    expect(content).toContain("SELECT plan(20);");
    expect(content).toContain("SET ROLE anon;");
    expect(content).toContain("Default Deny");
    expect(content).toContain("42501"); // RLS violation code
    expect(content).toContain("SELECT * FROM finish();");
  });

  it("deve validar bloqueio de chave pública (anon) sem JWT no script pgTAP", () => {
    const content = fs.readFileSync(pgTapPath, "utf-8");

    // Valida que anon tem count(*) = 0 em appointments, clients, sessions e receipts
    expect(content).toContain("SELECT count(*)::int FROM public.appointments");
    expect(content).toContain("SELECT count(*)::int FROM public.clients");
    expect(content).toContain("SELECT count(*)::int FROM public.sessions");
    expect(content).toContain("SELECT count(*)::int FROM storage.objects WHERE bucket_id = ''receipts''");
  });

  it("deve validar isolamento estrito entre Tenant Alpha e Tenant Beta", () => {
    const content = fs.readFileSync(pgTapPath, "utf-8");

    expect(content).toContain("Tenant Alpha");
    expect(content).toContain("Tenant Beta");
    expect(content).toContain("Cross-Tenant Tampering");
  });
});
