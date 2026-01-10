import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User, ArrowRight, Brain, Zap, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react'
import { supabase } from '../supabaseClient'
import toast from 'react-hot-toast'
import { checkPasswordPwned, formatPwnedMessage } from '../utils/passwordCheck'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [checkingPassword, setCheckingPassword] = useState(false)
    const [pwnedWarning, setPwnedWarning] = useState(null)
    const navigate = useNavigate()

    // Verifica se a senha foi comprometida
    const handlePasswordBlur = async () => {
        if (password.length >= 8) {
            setCheckingPassword(true)
            const result = await checkPasswordPwned(password)
            if (result.compromised) {
                setPwnedWarning(formatPwnedMessage(result.count))
            } else {
                setPwnedWarning(null)
            }
            setCheckingPassword(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!email || !password || !confirmPassword) {
            toast.error('Por favor, preencha todos os campos')
            return
        }

        // SEGURANÇA: Validação de senha forte
        if (password.length < 8) {
            toast.error('A senha deve ter pelo menos 8 caracteres')
            return
        }

        if (!/[A-Z]/.test(password)) {
            toast.error('A senha deve conter pelo menos uma letra maiúscula')
            return
        }

        if (!/[a-z]/.test(password)) {
            toast.error('A senha deve conter pelo menos uma letra minúscula')
            return
        }

        if (!/[0-9]/.test(password)) {
            toast.error('A senha deve conter pelo menos um número')
            return
        }

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem')
            return
        }

        // SEGURANÇA: Verificação final de senha comprometida antes do cadastro
        setIsLoading(true)
        try {
            const pwnedResult = await checkPasswordPwned(password)
            if (pwnedResult.compromised) {
                const confirmed = window.confirm(
                    `⚠️ AVISO DE SEGURANÇA\n\n` +
                    `${formatPwnedMessage(pwnedResult.count)}\n\n` +
                    `Deseja continuar mesmo assim? (Não recomendado)`
                )
                if (!confirmed) {
                    setIsLoading(false)
                    return
                }
            }

            const { error } = await supabase.auth.signUp({
                email,
                password,
            })

            if (error) throw error

            toast.success('Cadastro realizado! Verifique seu email para confirmar.')
            navigate('/login')
        } catch (error) {
            toast.error(error.message || 'Erro ao realizar cadastro')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background blobs same as login */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[140px]" />
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm z-20">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-light-100 tracking-tight">Criar Conta</h1>
                    <p className="text-dark-500 text-sm mt-2">Junte-se à plataforma BPO Analytics</p>
                </div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-[2rem] p-8">
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
                                className="w-full px-5 py-4 bg-dark-700/50 border border-dark-600 rounded-2xl text-light-100 focus:outline-none focus:border-brand-blue transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-dark-500 mb-1 uppercase tracking-widest px-1">
                                <Lock className="w-3 h-3 text-brand-blue/60" /> Senha
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setPwnedWarning(null); }}
                                onBlur={handlePasswordBlur}
                                placeholder="••••••••"
                                className="w-full px-5 py-4 bg-dark-700/50 border border-dark-600 rounded-2xl text-light-100 focus:outline-none focus:border-brand-blue transition-all"
                            />
                            {checkingPassword && (
                                <p className="text-xs text-dark-500 px-1 flex items-center gap-1">
                                    <span className="w-3 h-3 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
                                    Verificando segurança da senha...
                                </p>
                            )}
                            {pwnedWarning && (
                                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-400">{pwnedWarning}</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-dark-500 mb-1 uppercase tracking-widest px-1">
                                <ShieldCheck className="w-3 h-3 text-brand-blue/60" /> Confirmar Senha
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-5 py-4 bg-dark-700/50 border border-dark-600 rounded-2xl text-light-100 focus:outline-none focus:border-brand-blue transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group w-full py-4 px-4 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold rounded-2xl shadow-[0_10px_30px_rgba(43,153,255,0.3)] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Criar minha conta</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <div className="text-center mt-4">
                            <p className="text-dark-500 text-[10px] font-bold uppercase tracking-wider">
                                Já tem uma conta?{' '}
                                <Link to="/login" className="text-brand-blue hover:text-brand-blue-dark transition-colors">
                                    Fazer Login
                                </Link>
                            </p>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </div>
    )
}
