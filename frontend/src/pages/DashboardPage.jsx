import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, CreditCard, Activity, TrendingUp, TrendingDown,
    Zap, BarChart3, RefreshCw, AlertCircle, DollarSign,
    ArrowLeft, LogOut, LayoutDashboard, Brain, Sparkles, Building2,
    CheckCircle, MessageSquare, Menu, X, ChevronRight, Layout, Search, Clock
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
import Header from '../components/Header';

export default function DashboardPage() {
    const { user, logout, isMaster } = useContext(AuthContext);
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

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-dark-400 font-bold uppercase tracking-widest text-[10px]">Sincronizando Dados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 relative overflow-hidden selection:bg-brand-blue/30 text-light-100">
            {/* Standardized Dynamic Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-brand-blue/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

                {/* Floating Decorative Icons */}
                <div className="absolute top-[15%] left-[10%] opacity-10 animate-bounce" style={{ animationDuration: '6s' }}><Activity className="w-12 h-12 text-brand-blue" /></div>
                <div className="absolute bottom-[20%] right-[15%] opacity-10 animate-bounce" style={{ animationDuration: '8s', animationDelay: '1s' }}><Zap className="w-16 h-16 text-amber-500" /></div>
                <div className="absolute top-[40%] right-[10%] opacity-5 animate-pulse"><BarChart3 className="w-24 h-24 text-emerald-500" /></div>
            </div>

            <div className="relative z-20 flex flex-col min-h-screen">
                <Header title="Analytics Master" />

                {/* Toolbar for Date Filters */}
                <div className="bg-dark-800/50 backdrop-blur-sm border-b border-dark-600 sticky top-16 z-40 py-3">
                    <div className="max-w-screen-2xl mx-auto px-6 flex justify-end">
                        <DateRangePicker
                            startDate={filters.startDate}
                            endDate={filters.endDate}
                            onChange={handleDateRangeChange}
                        />
                    </div>
                </div>

                <main className="flex-1 w-full max-w-screen-2xl mx-auto px-6 py-10">
                    <div className="space-y-10">
                        {/* Page Title & Refresh */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-4xl font-black text-light-100 tracking-tighter uppercase mb-2">Visão Geral</h1>
                                <p className="text-dark-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-brand-blue" />
                                    Métricas em Tempo Real
                                </p>
                            </div>
                            <button
                                onClick={loadDashboardData}
                                disabled={loading}
                                className={`px-5 py-3 bg-dark-800 border border-dark-600 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest hover:bg-dark-700 transition-all ${loading ? 'opacity-50' : ''}`}
                            >
                                <RefreshCw className={`w-4 h-4 text-brand-blue ${loading ? 'animate-spin' : ''}`} />
                                {loading ? 'Atualizando...' : 'Atualizar Dados'}
                            </button>
                        </div>

                        {/* Primary Stat Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <MasterStatsCard
                                title="Usuários na Base"
                                value={stats?.users?.total || 0}
                                icon={Users}
                                color="blue"
                                change={stats?.users?.changeThisMonth}
                            />
                            <MasterStatsCard
                                title="Operações Realizadas"
                                value={stats?.usage?.totalAnalyses || 0}
                                icon={Zap}
                                color="amber"
                                change={stats?.usage?.changeLast24h}
                            />
                            <MasterStatsCard
                                title="Créditos Consumidos"
                                value={stats?.credits?.totalUsed || 0}
                                icon={CreditCard}
                                color="purple"
                                change={stats?.credits?.changeVsPrevious}
                            />
                            <MasterStatsCard
                                title="Disponibilidade"
                                value={`${(stats?.performance?.availabilityRate || 99.9).toFixed(1)}%`}
                                icon={Activity}
                                color="emerald"
                            />
                        </div>

                        {/* Main Visuals Grid */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            <div className="xl:col-span-2 space-y-8">
                                <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-2xl relative overflow-hidden">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-8 h-8 bg-brand-blue/10 rounded-lg flex items-center justify-center border border-brand-blue/20">
                                            <TrendingUp className="w-4 h-4 text-brand-blue" />
                                        </div>
                                        <h2 className="text-lg font-black text-light-100 uppercase tracking-widest leading-none">Frequência de Uso</h2>
                                    </div>
                                    <div className="h-[400px]">
                                        <TimeSeriesChart data={stats?.usage?.timeSeries || []} />
                                    </div>
                                </section>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-2xl">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                                                <Building2 className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <h2 className="text-lg font-black text-light-100 uppercase tracking-widest leading-none">Uso por Organização</h2>
                                        </div>
                                        <BarChart
                                            data={stats?.usage?.byCompany || {}}
                                            label="Análises"
                                        />
                                    </section>
                                    <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-2xl">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
                                                <Brain className="w-4 h-4 text-purple-500" />
                                            </div>
                                            <h2 className="text-lg font-black text-light-100 uppercase tracking-widest leading-none">Distribuição de IA</h2>
                                        </div>
                                        <PieChart data={stats?.usage?.byProvider || {}} />
                                    </section>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-2xl">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
                                            <Layout className="w-4 h-4 text-amber-500" />
                                        </div>
                                        <h2 className="text-lg font-black text-light-100 uppercase tracking-widest leading-none">Documentos</h2>
                                    </div>
                                    <PieChart data={stats?.usage?.byType || {}} />
                                </section>

                                <AlertsCard alerts={stats?.usage?.alerts} />

                                <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-2xl relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-brand-blue/10 rounded-lg flex items-center justify-center border border-brand-blue/20">
                                                <Cpu className="w-4 h-4 text-brand-blue" />
                                            </div>
                                            <h2 className="text-sm font-black text-light-100 uppercase tracking-widest leading-none">Performance do Motor</h2>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${(stats?.performance?.availabilityRate || 99.9) >= 99
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                            }`}>
                                            {(stats?.performance?.availabilityRate || 99.9) >= 99 ? 'Saudável' : 'Atenção'}
                                        </span>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold text-dark-500 uppercase tracking-widest mb-2">
                                                <span>Tempo de Resposta</span>
                                                <span className="text-light-100">{((stats?.performance?.avgProcessingTime || 0) / 1000).toFixed(2)}s</span>
                                            </div>
                                            <div className="h-2 w-full bg-dark-900 rounded-full overflow-hidden p-[2px]">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(((stats?.performance?.avgProcessingTime || 0) / 10000) * 100, 100)}%` }}
                                                    className="h-full bg-brand-blue rounded-full shadow-[0_0_10px_rgba(43,153,255,0.5)]"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold text-dark-500 uppercase tracking-widest mb-2">
                                                <span>Uso Financeiro (Mensal)</span>
                                                <span className="text-light-100">R$ {(stats?.financial?.totalCost || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-4 bg-dark-900 rounded-2xl border border-dark-700 mt-2">
                                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                                    <DollarSign className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-dark-500 uppercase tracking-widest">Gasto Estimado IA</p>
                                                    <p className="text-lg font-black text-light-100">BRL {stats?.financial?.totalCost?.toLocaleString('pt-BR') || "0,00"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* List Tracking Section */}
                        <div className="space-y-8 pb-12">
                            <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2.5rem] p-8 border border-dark-600 shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center border border-brand-blue/20">
                                            <LayoutDashboard className="w-6 h-6 text-brand-blue" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-light-100 uppercase tracking-tighter">Rastreamento de Uso</h2>
                                            <p className="text-dark-500 font-bold uppercase tracking-widest text-[10px] mt-1">LOGS DE ATIVIDADE DOS MOTORES DE IA</p>
                                        </div>
                                    </div>
                                </div>
                                <UserIATable data={userIAStats} />
                            </section>

                            <section className="bg-dark-800/80 backdrop-blur-sm rounded-[2.5rem] p-8 border border-dark-600 shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                                            <Users className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-light-100 uppercase tracking-tighter">Utilização por Usuário</h2>
                                            <p className="text-dark-500 font-bold uppercase tracking-widest text-[10px] mt-1">RANKING DE CONSUMO DE CRÉDITOS</p>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">TOP 100 ATIVOS</p>
                                    </div>
                                </div>
                                <UsersTable users={topUsers} />
                            </section>
                        </div>
                    </div>
                </main>

                <footer className="mt-auto py-10 border-t border-dark-600/30 bg-dark-900/50">
                    <div className="max-w-screen-2xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-[10px] font-black text-dark-500 uppercase tracking-[0.3em]">
                                &copy; 2026 LEITOR DE DOCS. POWERED BY AI ENGINES.
                            </p>
                        </div>
                        <div className="flex items-center gap-8">
                            <a href="#" className="text-[10px] font-black text-dark-500 hover:text-brand-blue uppercase tracking-widest transition-colors">Termos</a>
                            <a href="#" className="text-[10px] font-black text-dark-500 hover:text-brand-blue uppercase tracking-widest transition-colors">Privacidade</a>
                            <a href="#" className="text-[10px] font-black text-dark-400 hover:text-light-100 border border-dark-600 px-4 py-2 rounded-lg transition-all">Support Center</a>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

// Internal Master Component for Stats - Aligned with the others
function MasterStatsCard({ title, value, icon: Icon, color, change }) {
    const colorMap = {
        blue: { bg: 'bg-brand-blue/10', text: 'text-brand-blue', border: 'border-brand-blue/20', glow: 'shadow-brand-blue/10' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', glow: 'shadow-amber-500/10' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20', glow: 'shadow-purple-500/10' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' }
    };

    const scheme = colorMap[color] || colorMap.blue;

    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-7 border border-dark-600 shadow-xl relative overflow-hidden group transition-all hover:border-dark-500"
        >
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className={`p-4 rounded-2xl ${scheme.bg} ${scheme.text} ${scheme.border} border shadow-lg ${scheme.glow} transition-transform group-hover:rotate-12`}>
                    <Icon className="w-6 h-6" />
                </div>
                {change !== undefined && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black ${change >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        <TrendingUp className={`w-3 h-3 ${change < 0 ? 'rotate-180' : ''}`} />
                        {Math.abs(change)}%
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <h3 className="text-dark-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{title}</h3>
                <p className="text-3xl font-black text-light-100 tracking-tighter truncate">{value}</p>
            </div>

            {/* Subtle background decoration */}
            <div className={`absolute -bottom-6 -right-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity ${scheme.text} transform group-hover:scale-125 duration-500`}>
                <Icon className="w-28 h-28" />
            </div>
        </motion.div>
    );
}

const Cpu = (props) => (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
        <rect x="9" y="9" width="6" height="6"></rect>
        <line x1="9" y1="1" x2="9" y2="4"></line>
        <line x1="15" y1="1" x2="15" y2="4"></line>
        <line x1="9" y1="20" x2="9" y2="23"></line>
        <line x1="15" y1="20" x2="15" y2="23"></line>
        <line x1="20" y1="9" x2="23" y2="9"></line>
        <line x1="20" y1="15" x2="23" y2="15"></line>
        <line x1="1" y1="9" x2="4" y2="9"></line>
        <line x1="1" y1="15" x2="4" y2="15"></line>
    </svg>
);
