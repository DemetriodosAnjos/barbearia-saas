import { createClient } from "@supabase/supabase-js";
import { FICTITIOUS_MOCK_CREDENTIALS } from "../utils/security";
import { safeStorage } from "../utils/safeStorage";

// As variáveis devem vir preferencialmente de variáveis de ambiente.
const env = (typeof import.meta !== "undefined" && import.meta.env) || (typeof process !== "undefined" && process.env) || {};

let storedUrl = "";
let storedKey = "";
try {
  const raw = safeStorage.getItem("barbearia_api_keys_vault_v1");
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed?.supabase?.projectUrl && !parsed.supabase.projectUrl.includes("mock") && !parsed.supabase.projectUrl.includes("seu-projeto")) {
      storedUrl = parsed.supabase.projectUrl;
      storedKey = parsed.supabase.anonKey;
    }
  }
} catch {
  // ignore
}

const supabaseUrl =
  env.VITE_SUPABASE_URL ||
  storedUrl ||
  "https://njgeevywotbflikilway.supabase.co";

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  storedKey ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZ2Vldnl3b3RiZmxpa2lsd2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MzcyMTgsImV4cCI6MjEwNTUxMzIxOH0.MqO9fbKFvAa3DK8YW44F8obbnW4yG7wzhcgDDa2S3Qk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: safeStorage,
  },
});

export async function ensureDefaultBarbershop() {
  try {
    await supabase.from("barbershops").upsert(
      [
        {
          id: "a0000000-0000-0000-0000-000000000001",
          name: "Barbearia Matriz",
          slug: "matriz",
          phone: "(11) 99999-9999",
          plan: "pro",
          subscription_plan: "trial",
        },
      ],
      { onConflict: "id" }
    );
  } catch (_e) {
    // Non-blocking fallback
  }
}

if (typeof window !== "undefined") {
  ensureDefaultBarbershop();
}
