import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, createContext, useEffect, lazy, Suspense } from 'react'
import { supabase } from './supabaseClient'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import RecoveryPage from './pages/RecoveryPage'
import toast, { Toaster } from 'react-hot-toast'
import { authenticatedFetch } from './utils/api'

// Lazy load de páginas menos frequentes para reduzir bundle inicial
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const UserDashboardPage = lazy(() => import('./pages/UserDashboardPage'))

// Componente de loading para Suspense
const PageLoader = () => (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
    </div>
)

// Auth Context
export const AuthContext = createContext(null)

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [user, setUser] = useState(null)
    const [userRole, setUserRole] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    // Função para buscar role do usuário
    const fetchUserRole = async (userId) => {
        if (!userId) return 'user'

        try {
            // Tentar buscar diretamente do Supabase (com RLS) - mais eficiente
            const { data, error: supabaseError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single()

            if (!supabaseError && data) {
                return data.role || 'user'
            }
        } catch (e) {
            console.warn('Não foi possível buscar role do usuário:', e)
        }

        // Fallback: tentar via API admin apenas se Supabase falhar
        try {
            const response = await authenticatedFetch(`/api/admin/users`)
            if (response.ok) {
                const data = await response.json()
                if (data.success && data.data?.users) {
                    const currentUser = data.data.users.find(u => u.id === userId)
                    return currentUser?.role || 'user'
                }
            }
        } catch (error) {
            // Ignora erro silenciosamente
        }

        return 'user'
    }

    useEffect(() => {
        let mounted = true

        // Check current session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!mounted) return

            if (session) {
                setIsAuthenticated(true)
                setUser(session.user)
                // Buscar role do usuário de forma assíncrona (não bloqueia loading)
                fetchUserRole(session.user.id).then(role => {
                    if (mounted) {
                        setUserRole(role)
                    }
                }).catch(() => {
                    if (mounted) {
                        setUserRole('user')
                    }
                })
            } else {
                setIsAuthenticated(false)
                setUser(null)
                setUserRole(null)
            }

            setIsLoading(false)
        }).catch(() => {
            if (mounted) {
                setIsLoading(false)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return

            if (session) {
                setIsAuthenticated(true)
                setUser(session.user)
                // Buscar role do usuário de forma assíncrona
                fetchUserRole(session.user.id).then(role => {
                    if (mounted) {
                        setUserRole(role)
                    }
                }).catch(() => {
                    if (mounted) {
                        setUserRole('user')
                    }
                })
            } else {
                setIsAuthenticated(false)
                setUser(null)
                setUserRole(null)
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    const logout = async () => {
        try {
            await supabase.auth.signOut()
            toast.success('Sessão encerrada')
        } catch (error) {
            toast.error('Erro ao sair')
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
            </div>
        )
    }

    const isMaster = userRole === 'master' || userRole === 'admin'

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, logout, userRole, isMaster }}>
            <Toaster position="top-right" />
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route
                        path="/login"
                        element={
                            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />
                        }
                    />
                    <Route
                        path="/recovery"
                        element={<RecoveryPage />}
                    />
                    <Route
                        path="/dashboard"
                        element={
                            isAuthenticated && isMaster ? <DashboardPage /> : <Navigate to="/" replace />
                        }
                    />
                    <Route
                        path="/user-dashboard"
                        element={
                            isAuthenticated ? <UserDashboardPage /> : <Navigate to="/login" replace />
                        }
                    />
                    <Route
                        path="/whatsapp"
                        element={
                            isAuthenticated ? <div className="min-h-screen bg-dark-900 flex items-center justify-center text-light-100">WhatsApp - Em breve</div> : <Navigate to="/login" replace />
                        }
                    />
                    <Route
                        path="/history"
                        element={
                            isAuthenticated ? <div className="min-h-screen bg-dark-900 flex items-center justify-center text-light-100">Histórico - Em breve</div> : <Navigate to="/login" replace />
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            isAuthenticated ? <div className="min-h-screen bg-dark-900 flex items-center justify-center text-light-100">Configurações - Em breve</div> : <Navigate to="/login" replace />
                        }
                    />
                    <Route
                        path="/"
                        element={
                            isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </AuthContext.Provider>
    )
}

export default App
