import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Brain, Zap, ShieldCheck, FileCheck } from 'lucide-react'
import { supabase } from '../supabaseClient'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Por favor, preencha todos os campos')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('Bem-vindo!')
      navigate('/')
    } catch (error) {
      toast.error(error.message || 'Credenciais inválidas')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, 20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 40, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[140px]"
        />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] mix-blend-overlay"></div>
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute top-[20%] left-[15%] text-brand-blue/15">
          <Brain className="w-12 h-12" />
        </motion.div>
        <motion.div animate={{ y: [0, 15, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute bottom-[25%] left-[20%] text-emerald-500/10">
          <Zap className="w-8 h-8" />
        </motion.div>
        <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 7, repeat: Infinity }} className="absolute top-[30%] right-[10%] text-brand-blue/10">
          <Sparkles className="w-10 h-10" />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm z-20"
      >
        <div className="text-center mb-8 relative">
          <div className="absolute inset-0 bg-brand-blue/5 blur-3xl rounded-full scale-150 -z-10"></div>
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8 flex justify-center">
            <img src="/logo.png" alt="Logo" className="h-24 w-auto object-contain brightness-110" />
          </motion.div>
          <h1 className="text-2xl font-bold text-light-100 tracking-tight">Leitor de Docs</h1>
          <p className="text-dark-500 text-sm mt-2">Análise inteligente de documentos BPO</p>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-[2rem] p-8 relative">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-dark-500 mb-1 uppercase tracking-widest px-1">
                <Mail className="w-3 h-3 text-brand-blue/60" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-5 py-4 bg-dark-700/50 border border-dark-600 rounded-2xl text-light-100 placeholder-dark-600 focus:outline-none focus:border-brand-blue transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-dark-500 mb-1 uppercase tracking-widest px-1">
                <Lock className="w-3 h-3 text-brand-blue/60" /> Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-5 pr-12 py-4 bg-dark-700/50 border border-dark-600 rounded-2xl text-light-100 placeholder-dark-600 focus:outline-none focus:border-brand-blue transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-light-200">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pr-2">
              <Link to="/recovery" className="text-[10px] font-bold text-dark-500 hover:text-brand-blue uppercase tracking-wider transition-colors">
                Esqueceu a senha?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full py-4 px-4 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold rounded-2xl shadow-[0_10px_30px_rgba(43,153,255,0.3)] transition-all duration-500 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Entrar na Plataforma</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="text-center mt-4">
              <p className="text-dark-500 text-[10px] font-bold uppercase tracking-wider">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-brand-blue hover:text-brand-blue-dark transition-colors">
                  Cadastre-se
                </Link>
              </p>
            </div>
          </form>

          <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-white/5">
            <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] font-bold text-light-200 uppercase tracking-tighter">Seguro</span>
            </div>
            <div className="w-1 h-1 bg-dark-600 rounded-full"></div>
            <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] font-bold text-light-200 uppercase tracking-tighter">Rápido</span>
            </div>
          </div>
        </motion.div>

        <div className="mt-10 text-center">
          <p className="text-dark-500 text-[10px] tracking-[0.3em] font-bold uppercase opacity-50">
            © 2025 Agregar Negócios
          </p>
        </div>
      </motion.div>
    </div>
  )
}
