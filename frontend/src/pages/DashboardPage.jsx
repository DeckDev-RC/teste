import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Users, CreditCard, Activity, TrendingUp, TrendingDown,
    Zap, BarChart3, RefreshCw, AlertCircle, DollarSign,
    ArrowLeft, LogOut
} from 'lucide-react';
import { AuthContext } from '../App';
import toast from 'react-hot-toast';
import {
    getDashboardStats,
    getTopUsers,
    getUserIAStats
} from '../utils/dashboardApi';
import StatsCard from '../components/dashboard/StatsCard';
import TimeSeriesChart from '../components/dashboard/TimeSeriesChart';
import PieChart from '../components/dashboard/PieChart';
import BarChart from '../components/dashboard/BarChart';
import UsersTable from '../components/dashboard/UsersTable';
import UserIATable from '../components/dashboard/UserIATable';
import AlertsCard from '../components/dashboard/AlertsCard';
import DateRangePicker from '../components/dashboard/DateRangePicker';

export default function DashboardPage() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [topUsers, setTopUsers] = useState([]);
    const [userIAStats, setUserIAStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        groupBy: 'day'
    });

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadDashboardData();
    }, [user, filters]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [statsData, topUsersData, userIAData] = await Promise.all([
                getDashboardStats(filters),
                getTopUsers(10, filters),
                getUserIAStats(filters)
            ]);

            if (statsData.success) {
                setStats(statsData.data);
            } else {
                toast.error(statsData.error || 'Erro ao carregar estatísticas');
            }

            if (topUsersData.success) {
                setTopUsers(topUsersData.data.users || []);
            }

            if (userIAData.success) {
                setUserIAStats(userIAData.data.stats || []);
            }
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            toast.error('Erro ao carregar dados do dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleDateRangeChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-light-200">Erro ao carregar dashboard</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 relative overflow-hidden font-sans">
            {/* Background blobs premium - animated */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        x: [0, 50, 0],
                        y: [0, 30, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-40 -right-40 w-[800px] h-[800px] bg-brand-blue/10 rounded-full blur-[160px]"
                />
                <motion.div
                    animate={{
                        x: [0, -40, 0],
                        y: [0, 60, 0],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute -bottom-40 -left-20 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px]"
                />
            </div>

            <div className="relative z-20 flex flex-col min-h-screen">
                {/* Master Header */}
                <header className="glass-light border-b border-white/5 sticky top-0 z-50">
                    <div className="max-w-[1800px] mx-auto px-8 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center shadow-glow">
                                    <BarChart3 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-light-100 tracking-tight leading-none">Dashboard Master</h1>
                                    <p className="text-[10px] font-bold text-dark-500 uppercase tracking-widest mt-1">Analytics Global</p>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-white/10 hidden md:block" />
                            <button
                                onClick={loadDashboardData}
                                className={`p-2.5 text-dark-500 hover:text-brand-blue rounded-xl hover:bg-white/5 transition-all ${loading ? 'animate-spin cursor-not-allowed' : ''}`}
                                title="Atualizar dados"
                                disabled={loading}
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-dark-500 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="hidden sm:block">Voltar</span>
                            </button>
                            <div className="h-8 w-px bg-white/10 hidden lg:block" />
                            <div className="hidden lg:block">
                                <DateRangePicker
                                    startDate={filters.startDate}
                                    endDate={filters.endDate}
                                    onChange={handleDateRangeChange}
                                />
                            </div>
                            <div className="h-8 w-px bg-white/10 hidden sm:block" />
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-bold text-light-100">{user?.email?.split('@')[0]}</p>
                                    <p className="text-[10px] text-dark-500 font-medium">Administrador</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-dark-700 border border-white/10 flex items-center justify-center text-brand-blue font-bold text-sm">
                                    {user?.email?.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-red-500/80 hover:text-red-400 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all active:scale-95"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:block">Sair</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 w-full max-w-[1800px] mx-auto px-8 py-10 space-y-10">
                    {/* Welcome & Quick Info */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <motion.h2
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-3xl font-bold text-light-100 tracking-tight"
                            >
                                Visão Geral do Sistema
                            </motion.h2>
                            <p className="text-dark-500 font-medium">Acompanhe as métricas de desempenho e uso da plataforma em tempo real.</p>
                        </div>
                        {stats?.lastUpdate && (
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-dark-500 uppercase tracking-widest">Última atualização</p>
                                <p className="text-xs text-light-200 mt-1">{new Date(stats.lastUpdate).toLocaleString('pt-BR')}</p>
                            </div>
                        )}
                    </div>

                    {/* Primary KPIs - Large Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatsCard
                            title="Usuários na Base"
                            value={stats.users?.total || 0}
                            icon={Users}
                            color="blue"
                            change={stats.users?.changeThisMonth !== undefined ? stats.users.changeThisMonth : undefined}
                            changeLabel={stats.users?.changeLabel || "este mês"}
                        />
                        <StatsCard
                            title="Operações Realizadas"
                            value={stats.usage?.totalAnalyses || 0}
                            icon={Zap}
                            color="amber"
                            change={stats.usage?.changeLast24h !== undefined ? stats.usage.changeLast24h : undefined}
                            changeLabel={stats.usage?.changeLabel || "últ. 24h"}
                        />
                        <StatsCard
                            title="Consumo de Créditos"
                            value={stats.credits?.totalUsed || 0}
                            icon={CreditCard}
                            color="purple"
                            change={stats.credits?.changeVsPrevious !== undefined ? stats.credits.changeVsPrevious : undefined}
                            changeLabel={stats.credits?.changeLabel || "vs anterior"}
                        />
                        <StatsCard
                            title="Taxa de Disponibilidade"
                            value={`${(stats.performance?.availabilityRate || 99.9).toFixed(1)}%`}
                            icon={Activity}
                            color="green"
                        />
                    </div>

                    {/* Main Charts Architecture */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-2 space-y-8">
                            <TimeSeriesChart
                                data={stats.usage?.timeSeries || []}
                                title="Frequência de Uso"
                            />

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <BarChart
                                    data={stats.usage?.byCompany || {}}
                                    title="Uso por Organização"
                                    label="Análises"
                                />
                                <PieChart
                                    data={stats.usage?.byProvider || {}}
                                    title="Distribuição de IA"
                                />
                            </div>
                        </div>

                        <div className="space-y-8">
                            <PieChart
                                data={stats.usage?.byType || {}}
                                title="Tipos de Documentos"
                            />

                            <AlertsCard
                                alerts={stats.usage?.alerts}
                            />

                            <div className="glass rounded-3xl p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-light-100 uppercase tracking-widest text-[11px]">Performance do Motor</h3>
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        (stats.performance?.availabilityRate || 99.9) >= 99 
                                            ? 'bg-emerald-500/10 text-emerald-400' 
                                            : (stats.performance?.availabilityRate || 99.9) >= 95
                                            ? 'bg-amber-500/10 text-amber-400'
                                            : 'bg-red-500/10 text-red-400'
                                    }`}>
                                        {(stats.performance?.availabilityRate || 99.9) >= 99 ? 'Saudável' : (stats.performance?.availabilityRate || 99.9) >= 95 ? 'Atenção' : 'Crítico'}
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold text-dark-500 uppercase tracking-widest mb-2">
                                            <span>Tempo de Resposta</span>
                                            <span className="text-light-100">{((stats.performance?.avgProcessingTime || 0) / 1000).toFixed(2)}s</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-dark-700 rounded-full overflow-hidden">
                                            {(() => {
                                                // Calcular percentual baseado em tempo (100% = 10s, ideal < 3s)
                                                const avgTime = (stats.performance?.avgProcessingTime || 0) / 1000;
                                                const maxTime = 10; // 10 segundos = 100%
                                                const progressPercent = Math.min((avgTime / maxTime) * 100, 100);
                                                const colorClass = avgTime < 3 ? 'bg-emerald-500' : avgTime < 6 ? 'bg-amber-500' : 'bg-red-500';
                                                return (
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progressPercent}%` }}
                                                        className={`h-full ${colorClass} rounded-full shadow-glow`}
                                                    />
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold text-dark-500 uppercase tracking-widest mb-2">
                                            <span>Taxa de Acerto (Cache)</span>
                                            <span className="text-light-100">{(stats.usage?.cacheHitRate || 0).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-dark-700 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(stats.usage?.cacheHitRate || 0, 100)}%` }}
                                                className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                                <DollarSign className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-dark-500 uppercase tracking-widest">Custo Operacional</p>
                                                <p className="text-lg font-bold text-light-100">R$ {(stats.financial?.totalCost || 0).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tables Section */}
                    <div className="space-y-8 pb-12">
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-light-100 tracking-tight">Rastreamento de Uso</h2>
                            </div>
                            <UserIATable data={userIAStats} />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-light-100 tracking-tight">Utilização por Usuário (Créditos)</h2>
                                <p className="text-xs font-bold text-dark-500 uppercase tracking-widest">Top 100 usuários ativos</p>
                            </div>
                            <UsersTable users={topUsers} />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
