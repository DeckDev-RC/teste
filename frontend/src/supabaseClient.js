import { createClient } from '@supabase/supabase-js'

// Variáveis de ambiente do Supabase
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!')
  console.error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
  throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.')
}

// Detectar se está em produção (HTTPS) e o Supabase está em HTTP
// Se sim, usar proxy relativo para evitar Mixed Content
const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:'
const isSupabaseHttp = supabaseUrl && supabaseUrl.startsWith('http://')

if (isProduction && isSupabaseHttp && typeof window !== 'undefined') {
  // Usar proxy relativo através do nginx
  // O nginx redireciona /supabase/* para o Supabase HTTP interno
  // Exemplo: https://leitordedocs-frontend...host/supabase/auth/v1/token
  //          → http://31.97.164.208:8000/auth/v1/token (interno via nginx)
  const originalUrl = new URL(supabaseUrl)
  // Manter apenas o pathname (ex: /auth/v1) sem a porta
  supabaseUrl = `${window.location.origin}/supabase`
  console.log('🔒 Usando proxy HTTPS para Supabase:', supabaseUrl)
  console.log('   Original:', originalUrl.toString())
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Garantir que redirectTo use HTTPS em produção
    redirectTo: isProduction 
      ? `${window.location.origin}${window.location.pathname}`
      : window.location.href
  }
})
