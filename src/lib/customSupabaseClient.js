import { createClient } from '@supabase/supabase-js'

// Lê automaticamente as variáveis do .env.local (local) ou do painel da Vercel (produção)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Verifica se as variáveis existem (ajuda a debugar se faltar no Vercel)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Variáveis do Supabase não encontradas. Verifique o .env.local ou o painel da Vercel.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
