import { createClient } from '@supabase/supabase-js'

// Variáveis de ambiente do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!')
  console.error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
  throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
