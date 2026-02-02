import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Upload, MessageSquare, Folder, Clock, CheckCircle,
    AlertCircle, TrendingUp, CreditCard, Zap, ArrowRight, RefreshCw,
    Image, Loader2, ChevronRight, Search, BarChart, LayoutDashboard,
    LogOut, Brain, Sparkles, Bot, ArrowLeft, Coins
} from 'lucide-react';
import { AuthContext } from '../App';
import { authenticatedJsonFetch } from '../utils/api';
import toast from 'react-hot-toast';
import Header from '../components/Header';

export default function UserDashboardPage() {
    const { user, logout, isMaster } = useContext(AuthContext);
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [recentAnalyses, setRecentAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadUserData();
        }
    }, [user]);

    const loadUserData = async () => {
        setLoading(true);
        try {
            const [statsData, analysesData] = await Promise.all([
                authenticatedJsonFetch('/api/user/stats'),
                authenticatedJsonFetch('/api/user/analyses?limit=6')
            ]);

            if (statsData.success) {
                setStats(statsData.data);
            }
            if (analysesData.success) {
                setRecentAnalyses(analysesData.data.analyses || []);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            toast.error('Erro ao carregar dados do painel');
        } finally {
            setLoading(false);
        }
    };

    const quickActions = [
        {
            title: 'Nova Análise',
            description: 'Processar novo documento',
            icon: Upload,
            color: 'blue',
            action: () => navigate('/')
        },
        {
            title: 'WhatsApp',
            description: 'Monitorar grupos e mensagens',
            icon: MessageSquare,
            color: 'emerald',
            action: () => navigate('/whatsapp'),
            hidden: !isMaster
        },
        {
            title: 'Google Drive',
            description: 'Destinos de exportação',
            icon: Folder,
            color: 'amber',
            action: () => navigate('/settings')
        },
        {
            title: 'Histórico',
            description: 'Base completa de análises',
            icon: Clock,
            color: 'purple',
            action: () => navigate('/history')
        }
    ].filter(a => !a.hidden);

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-2 border-brand-blue/30 border-t-brand-blue rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 relative overflow-hidden selection:bg-brand-blue/30 text-light-100">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <motion.div
                    animate={{ x: [0, 30, 0], y: [0, 40, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-blue/5 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{ x: [0, -20, 0], y: [0, 60, 0] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px]"
                />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]"></div>
            </div>

            {/* Floating Decorative Icons */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 7, repeat: Infinity }} className="absolute top-[15%] left-[5%] text-brand-blue/10">
                    <Brain className="w-16 h-16" />
                </motion.div>
                <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 9, repeat: Infinity }} className="absolute bottom-[20%] right-[8%] text-emerald-500/10">
                    <Sparkles className="w-12 h-12" />
                </motion.div>
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 5, repeat: Infinity }} className="absolute top-[40%] right-[15%] text-brand-blue/5">
                    <Bot className="w-24 h-24" />
                </motion.div>
            </div>

            <Header title="Painel do Usuário" />

            <div className="relative z-20 flex flex-col min-h-screen">

                <main className="flex-1 max-w-screen-xl mx-auto px-6 py-12 w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        <h1 className="text-4xl font-black text-light-100 mb-3 tracking-tight">
                            Bem-vindo de volta, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-emerald-400">{user?.email?.split('@')[0] || 'Usuário'}</span>
                        </h1>
                        <p className="text-dark-400 text-lg font-medium opacity-80">
                            Central de automação e monitoramento de documentos.
                        </p>
                    </motion.div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <StatsCard
                            title="Docs Hoje"
                            value={stats?.analysesToday || 0}
                            icon={FileText}
                            color="blue"
                            change={stats?.analysesTodayChange}
                        />
                        <StatsCard
                            title="Saldo Créditos"
                            value={stats?.credits || 0}
                            icon={Coins}
                            color="emerald"
                        />
                        <StatsCard
                            title="Taxa de Precisão"
                            value={`${stats?.successRate || 0}%`}
                            icon={TrendingUp}
                            color="purple"
                        />
                        <StatsCard
                            title="Total Mensal"
                            value={stats?.monthTotal || 0}
                            icon={Zap}
                            color="amber"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Quick Actions - 5 cols */}
                        <div className="lg:col-span-5 space-y-6">
                            <h2 className="text-xs font-black text-dark-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                <Zap className="w-4 h-4 text-amber-500" />
                                Atalhos Rápidos
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {quickActions.map((action, index) => (
                                    <motion.button
                                        key={action.title}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        onClick={action.action}
                                        whileHover={{ y: -5, scale: 1.02 }}
                                        className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-6 border border-dark-600 shadow-xl group text-left relative overflow-hidden"
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-110 shadow-lg ${action.color === 'blue' ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20 shadow-brand-blue/5' :
                                            action.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-emerald-500/5' :
                                                action.color === 'amber' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-amber-500/5' :
                                                    'bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-purple-500/5'
                                            }`}>
                                            <action.icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-light-100 font-bold text-lg mb-1">{action.title}</h3>
                                        <p className="text-dark-500 text-xs leading-relaxed">{action.description}</p>

                                        <div className="mt-6 flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-dark-500 group-hover:text-light-100 transition-colors">
                                            Explorar <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </div>

                                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                            <action.icon className="w-24 h-24" />
                                        </div>
                                    </motion.button>
                                ))}
                            </div>

                            {/* Promotional / Info Card */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="mt-8 bg-gradient-to-br from-brand-blue/20 to-emerald-500/10 rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group"
                            >
                                <div className="relative z-10">
                                    <h3 className="text-light-100 font-black text-xl mb-2 italic">Precisando de escala?</h3>
                                    <p className="text-dark-300 text-sm mb-6 leading-relaxed">
                                        Fale com nosso time para planos personalizados e processamento massivo via API direta.
                                    </p>
                                    <button className="px-6 py-3 bg-white text-dark-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all shadow-xl shadow-black/20">
                                        Contatar Vendas
                                    </button>
                                </div>
                                <Bot className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12 group-hover:scale-110 transition-transform" />
                            </motion.div>
                        </div>

                        {/* Recent Activity - 7 cols */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xs font-black text-dark-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-brand-blue" />
                                    Atividades Recentes
                                </h2>
                                <button
                                    onClick={() => navigate('/history')}
                                    className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue hover:text-white transition-colors"
                                >
                                    Ver Histórico Completo
                                </button>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] border border-dark-600 shadow-xl overflow-hidden"
                            >
                                {recentAnalyses.length === 0 ? (
                                    <div className="p-20 text-center flex flex-col items-center justify-center">
                                        <div className="w-20 h-20 bg-dark-700/50 rounded-full flex items-center justify-center mb-6 border border-dark-600">
                                            <FileText className="w-10 h-10 text-dark-600" />
                                        </div>
                                        <p className="text-dark-300 font-bold text-lg mb-2">Sem registros ainda</p>
                                        <p className="text-dark-500 text-sm max-w-[280px] mx-auto leading-relaxed">
                                            Sua atividade começará a aparecer aqui assim que você processar o primeiro documento.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-dark-700/30">
                                        {recentAnalyses.map((analysis) => (
                                            <div
                                                key={analysis.id}
                                                onClick={() => navigate(`/analysis/${analysis.id}`)}
                                                className="p-6 hover:bg-dark-900/50 transition-all flex items-center gap-6 cursor-pointer group"
                                            >
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${analysis.success === true ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-sm shadow-emerald-500/5' :
                                                    analysis.success === false ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                                        'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-sm shadow-amber-500/5'
                                                    }`}>
                                                    {analysis.file_type?.includes('image') ? <Image className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="text-md font-bold text-light-100 truncate pr-4 group-hover:text-brand-blue transition-colors">
                                                            {analysis.file_name || 'Documento sem nome'}
                                                        </h4>
                                                        <span className="text-[10px] text-dark-500 font-mono font-bold whitespace-nowrap opacity-60">
                                                            {new Date(analysis.created_at).toLocaleTimeString().slice(0, 5)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <p className="text-xs text-dark-500 font-medium">
                                                            Tipo: <span className="text-dark-300">{analysis.analysis_type || 'WhatsApp'}</span>
                                                        </p>
                                                        <div className="w-1 h-1 bg-dark-600 rounded-full"></div>
                                                        <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${analysis.success === true ? 'text-emerald-500' :
                                                            analysis.success === false ? 'text-red-500' : 'text-amber-500'
                                                            }`}>
                                                            {analysis.success === true ? <CheckCircle className="w-2.5 h-2.5" /> :
                                                                analysis.success === false ? <AlertCircle className="w-2.5 h-2.5" /> :
                                                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                                                            {analysis.success === true ? 'Processado' :
                                                                analysis.success === false ? 'Falha' : 'Em andamento'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <ChevronRight className="w-5 h-5 text-dark-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        ))}

                                        <button
                                            onClick={() => navigate('/history')}
                                            className="w-full py-5 bg-dark-900/30 hover:bg-dark-700/50 text-dark-500 hover:text-light-100 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-t border-dark-700/30"
                                        >
                                            Base de Conhecimento Completa
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </main>

                <footer className="mt-auto py-8 border-t border-dark-600/30 bg-dark-900/50">
                    <div className="max-w-screen-xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-[10px] font-black text-dark-500 uppercase tracking-widest">
                            &copy; 2026 LEITOR DE DOCS. POWERED BY AI ENGINES.
                        </p>
                        <div className="flex items-center gap-6">
                            <a href="#" className="text-[10px] font-black text-dark-500 hover:text-brand-blue uppercase tracking-widest transition-colors">Termos</a>
                            <a href="#" className="text-[10px] font-black text-dark-500 hover:text-brand-blue uppercase tracking-widest transition-colors">Privacidade</a>
                            <a href="#" className="text-[10px] font-black text-dark-500 hover:text-brand-blue uppercase tracking-widest transition-colors">Suporte</a>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, color, change }) {
    const colorMap = {
        blue: {
            bg: 'bg-brand-blue/10',
            text: 'text-brand-blue',
            border: 'border-brand-blue/20',
            glow: 'shadow-brand-blue/5'
        },
        emerald: {
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-500',
            border: 'border-emerald-500/20',
            glow: 'shadow-emerald-500/5'
        },
        purple: {
            bg: 'bg-purple-500/10',
            text: 'text-purple-500',
            border: 'border-purple-500/20',
            glow: 'shadow-purple-500/5'
        },
        amber: {
            bg: 'bg-amber-500/10',
            text: 'text-amber-500',
            border: 'border-amber-500/20',
            glow: 'shadow-amber-500/5'
        }
    };

    const scheme = colorMap[color] || colorMap.blue;

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-6 border border-dark-600 shadow-xl relative overflow-hidden group transition-all hover:border-dark-500"
        >
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={`p-3 rounded-2xl ${scheme.bg} ${scheme.text} ${scheme.border} border shadow-lg ${scheme.glow} transition-transform group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                </div>
                {change !== undefined && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                        {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                        {Math.abs(change)}%
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <h3 className="text-dark-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</h3>
                <p className="text-3xl font-black text-light-100 tracking-tighter">{value}</p>
            </div>

            <div className={`absolute -bottom-6 -right-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity ${scheme.text}`}>
                <Icon className="w-24 h-24" />
            </div>
        </motion.div>
    );
}
