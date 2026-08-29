import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Nunca guarda a sessão entre acessos — toda vez que a pessoa
    // abrir o sistema (aba nova, F5, ou depois de sair), precisa
    // digitar e-mail e senha de novo. Decisão de segurança.
    persistSession: false,
  },
});
