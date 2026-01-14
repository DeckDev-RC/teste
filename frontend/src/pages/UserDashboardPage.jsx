import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FileText, Upload, MessageSquare, Folder, Clock, CheckCircle,
    AlertCircle, TrendingUp, CreditCard, Zap, ArrowRight, RefreshCw
} from 'lucide-react';
import { AuthContext } from '../App';
import { authenticatedJsonFetch } from '../utils/api';
import toast from 'react-hot-toast';

export default function UserDashboardPage() {
    const { user } = useContext(AuthContext);
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
                authenticatedJsonFetch('/api/user/analyses?limit=5')
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
            description: 'Upload manual de documento',
            icon: Upload,
            color: 'blue',
            action: () => navigate('/')
        },
        {
            title: 'WhatsApp',
            description: 'Conectar e monitorar grupos',
            icon: MessageSquare,
            color: 'green',
            action: () => navigate('/whatsapp')
        },
        {
            title: 'Google Drive',
            description: 'Configurar pasta de destino',
            icon: Folder,
            color: 'amber',
            action: () => navigate('/settings')
        },
        {
            title: 'Histórico',
            description: 'Ver todas as análises',
            icon: Clock,
            color: 'purple',
            action: () => navigate('/history')
        }
    ];

    const getStatusColor = (success) => {
        if (success === true) return 'text-emerald-400';
        if (success === false) return 'text-red-400';
        return 'text-amber-400'; // fallback para processando se houver
    };

    const getStatusIcon = (success) => {
        if (success === true) return <CheckCircle className="w-4 h-4" />;
        if (success === false) return <AlertCircle className="w-4 h-4" />;
        return <RefreshCw className="w-4 h-4 animate-spin" />;
    };

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 p-6">
            {/* Background effects */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-brand-blue/5 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-emerald-500/3 rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-2xl font-bold text-light-100">
                        Olá, {user?.email?.split('@')[0] || 'Usuário'} 👋
                    </h1>
                    <p className="text-dark-500 text-sm mt-1">
                        Acompanhe suas análises e gerencie suas integrações
                    </p>
                </motion.div>

                {/* Stats Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                >
                    <StatsCard
                        title="Análises Hoje"
                        value={stats?.analysesToday || 0}
                        icon={FileText}
                        color="blue"
                        change={stats?.analysesTodayChange}
                    />
                    <StatsCard
                        title="Créditos Restantes"
                        value={stats?.credits || 0}
                        icon={CreditCard}
                        color="green"
                    />
                    <StatsCard
                        title="Taxa de Sucesso"
                        value={`${stats?.successRate || 0}%`}
                        icon={TrendingUp}
                        color="purple"
                    />
                    <StatsCard
                        title="Total do Mês"
                        value={stats?.monthTotal || 0}
                        icon={Zap}
                        color="amber"
                    />
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                >
                    <h2 className="text-lg font-semibold text-light-100 mb-4">Ações Rápidas</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {quickActions.map((action, index) => (
                            <motion.button
                                key={action.title}
                                onClick={action.action}
                                whileHover={{ y: -4, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="glass rounded-2xl p-5 text-left group transition-all hover:shadow-glow"
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-${action.color === 'blue' ? 'brand-blue' : action.color}-500/10 border border-${action.color === 'blue' ? 'brand-blue' : action.color}-500/20`}>
                                    <action.icon className={`w-5 h-5 text-${action.color === 'blue' ? 'brand-blue' : action.color}-500`} />
                                </div>
                                <h3 className="text-light-100 font-medium mb-1">{action.title}</h3>
                                <p className="text-dark-500 text-xs">{action.description}</p>
                                <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-brand-blue transition-colors mt-3" />
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                {/* Recent Analyses */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-light-100">Análises Recentes</h2>
                        <button
                            onClick={() => navigate('/history')}
                            className="text-sm text-brand-blue hover:underline flex items-center gap-1"
                        >
                            Ver todas <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="glass rounded-2xl overflow-hidden">
                        {recentAnalyses.length === 0 ? (
                            <div className="p-8 text-center">
                                <FileText className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                                <p className="text-dark-500">Nenhuma análise recente</p>
                                <button
                                    onClick={() => navigate('/')}
                                    className="mt-4 px-4 py-2 bg-brand-blue/10 text-brand-blue rounded-xl text-sm hover:bg-brand-blue/20 transition-colors"
                                >
                                    Fazer primeira análise
                                </button>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-dark-700">
                                        <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-4">Arquivo</th>
                                        <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-4">Tipo</th>
                                        <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-4">Data</th>
                                        <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentAnalyses.map((analysis, index) => (
                                        <tr
                                            key={analysis.id || index}
                                            className="border-b border-dark-700/50 hover:bg-dark-800/30 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/analysis/${analysis.id}`)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-4 h-4 text-dark-500" />
                                                    <span className="text-light-200 text-sm truncate max-w-[200px]">
                                                        {analysis.file_name || 'Documento'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-dark-400 text-sm">
                                                    {analysis.analysis_type || 'Auto'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-dark-400 text-sm">
                                                    {new Date(analysis.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-2 ${getStatusColor(analysis.success)}`}>
                                                    {getStatusIcon(analysis.success)}
                                                    <span className="text-sm capitalize">
                                                        {analysis.success === true ? 'Concluído' :
                                                            analysis.success === false ? 'Erro' : 'Processando'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// Componente interno de StatsCard simplificado
function StatsCard({ title, value, icon: Icon, color, change }) {
    const colorClasses = {
        blue: 'border-brand-blue/20 bg-brand-blue/10 text-brand-blue',
        green: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
        purple: 'border-purple-500/20 bg-purple-500/10 text-purple-500',
        amber: 'border-amber-500/20 bg-amber-500/10 text-amber-500'
    };

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            className="glass rounded-2xl p-5 transition-all hover:shadow-glow"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {change !== undefined && (
                    <span className={`text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {change >= 0 ? '+' : ''}{change}%
                    </span>
                )}
            </div>
            <p className="text-dark-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
            <p className="text-2xl font-bold text-light-100">{value}</p>
        </motion.div>
    );
}
