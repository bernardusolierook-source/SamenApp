import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) console.error("Ontbrekende Supabase-config. Vul .env met VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY.");
export const supabase = createClient(url || "http://localhost", key || "anon");
