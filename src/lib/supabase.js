import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://njgeevywotbflikilway.supabase.co";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZ2Vldnl3b3RiZmxpa2lsd2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MzcyMTgsImV4cCI6MjEwNTUxMzIxOH0.MqO9fbKFvAa3DK8YW44F8obbnW4yG7wzhcgDDa2S3Qk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
