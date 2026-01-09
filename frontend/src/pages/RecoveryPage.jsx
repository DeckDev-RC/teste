import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Brain, ShieldAlert } from 'lucide-react'
import { supabase } from '../supabaseClient'
import toast from 'react-hot-toast'

export default function RecoveryPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isResetMode, setIsResetMode] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        // Verificar se estamos no modo de reset (após clicar no link do email)
        // O Supabase redireciona com o token no hash (#access_token=...&type=recovery)
        const hash = window.location.hash
        const urlParams = new URLSearchParams(window.location.search)
        
        // Verificar se há token de recuperação no hash ou query params
        const hasRecoveryToken = 
            (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) ||
            (urlParams.get('type') === 'recovery') ||
            (urlParams.get('token') && urlParams.get('type') === 'recovery')
        
        if (hasRecoveryToken) {
            setIsResetMode(true)
            
            // Processar o token do hash se existir
            if (hash && hash.includes('access_token')) {
                // Extrair access_token do hash
                const hashParams = new URLSearchParams(hash.substring(1))
                const accessToken = hashParams.get('access_token')
                const type = hashParams.get('type')
                
                if (accessToken && type === 'recovery') {
                    // O Supabase já processa o token automaticamente quando está no hash
                    // Mas podemos verificar a sessão
                    supabase.auth.getSession().then(({ data: { session } }) => {
                        if (session) {
                            // Sessão criada com sucesso, usuário pode redefinir senha
                            console.log('Token de recuperação processado com sucesso')
                        }
                    })
                }
            }
        }
    }, [])

    const handleRequest = async (e) => {
        e.preventDefault()
        if (!email) {
            toast.error('Insira seu email')
            return
        }

        setIsLoading(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/recovery`,
            })
            if (error) throw error
            toast.success('Email de recuperação enviado!')
        } catch (error) {
            toast.error(error.message || 'Erro ao enviar email')
        } finally {
            setIsLoading(false)
        }
    }

    const handleReset = async (e) => {
        e.preventDefault()
        if (!password) {
            toast.error('Insira a nova senha')
            return
        }

        if (password.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres')
            return
        }

        setIsLoading(true)
        try {
            // Verificar se há sessão ativa (token já foi processado pelo Supabase)
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            
            if (sessionError || !session) {
                throw new Error('Token de recuperação inválido ou expirado. Solicite um novo link.')
            }
            
            // Atualizar a senha do usuário
            const { error } = await supabase.auth.updateUser({ 
                password: password 
            })
            
            if (error) throw error
            
            toast.success('Senha atualizada com sucesso!')
            
            // Limpar hash da URL
            window.history.replaceState(null, '', window.location.pathname)
            
            // Redirecionar para login após 1 segundo
            setTimeout(() => {
                navigate('/login')
            }, 1000)
        } catch (error) {
            toast.error(error.message || 'Erro ao atualizar senha')
            console.error('Erro ao redefinir senha:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[120px]" />
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm z-20">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-light-100 tracking-tight">
                        {isResetMode ? 'Nova Senha' : 'Recuperar Acesso'}
                    </h1>
                    <p className="text-dark-500 text-sm mt-2">
                        {isResetMode ? 'Defina sua nova senha' : 'Enviaremos um link para seu email'}
                    </p>
                </div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-[2rem] p-8">
                    {isResetMode ? (
                        <form onSubmit={handleReset} className="space-y-5">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-dark-500 mb-1 uppercase tracking-widest px-1">
                                    <Lock className="w-3 h-3 text-brand-blue/60" /> Nova Senha
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Digite sua nova senha (mín. 6 caracteres)"
                                    className="w-full px-5 py-4 bg-dark-700/50 border border-dark-600 rounded-2xl text-light-100 placeholder-dark-600 focus:outline-none focus:border-brand-blue transition-all"
                                    minLength={6}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || password.length < 6}
                                className="w-full py-4 bg-brand-blue text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Atualizando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Definir Nova Senha</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                            <div className="text-center mt-4">
                                <Link to="/login" className="text-[10px] font-bold text-dark-500 hover:text-brand-blue uppercase transition-colors">
                                    Voltar para o Login
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleRequest} className="space-y-5">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-dark-500 mb-1 uppercase tracking-widest px-1">
                                    <Mail className="w-3 h-3 text-brand-blue/60" /> Seu Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    className="w-full px-5 py-4 bg-dark-700/50 border border-dark-600 rounded-2xl text-light-100 focus:outline-none focus:border-brand-blue transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-brand-blue text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                            </button>
                            <div className="text-center mt-4">
                                <Link to="/login" className="text-[10px] font-bold text-dark-500 hover:text-brand-blue uppercase transition-colors">
                                    Voltar para o Login
                                </Link>
                            </div>
                        </form>
                    )}
                </motion.div>
            </motion.div>
        </div>
    )
}
