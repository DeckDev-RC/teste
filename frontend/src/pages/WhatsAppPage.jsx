import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, QrCode, Users, Check, X, RefreshCw,
    ArrowLeft, Smartphone, Wifi, WifiOff, Trash2, Power,
    Building2, ChevronRight, FileText, Image, Clock,
    CheckCircle, AlertCircle, Loader2, Sparkles, ExternalLink
} from 'lucide-react';
import { AuthContext } from '../App';
import { authenticatedJsonFetch } from '../utils/api';
import toast from 'react-hot-toast';

export default function WhatsAppPage() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [instance, setInstance] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [status, setStatus] = useState('disconnected');
    const [groups, setGroups] = useState([]);
    const [monitoredGroups, setMonitoredGroups] = useState([]);
    const [recentDocs, setRecentDocs] = useState([]);
    const [stats, setStats] = useState({ groups: 0, docsToday: 0 });
    const [loading, setLoading] = useState(true);
    const [creatingInstance, setCreatingInstance] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(false);

    const [groupsTab, setGroupsTab] = useState('monitored'); // 'monitored' | 'all'

    // Determina etapa atual do stepper (3 etapas simples)
    const getCurrentStep = () => {
        if (!instance) return 0;
        if (status !== 'connected') return 1;
        return 2; // Conectado = pronto
    };

    const steps = [
        { label: 'Conectar', icon: QrCode },
        { label: 'Vincular', icon: Smartphone },
        { label: 'Pronto', icon: Sparkles }
    ];

    // Separa grupos monitorados dos demais
    const monitoredGroupsList = groups.filter(g => monitoredGroups.includes(g.jid));
    const otherGroupsList = groups.filter(g => !monitoredGroups.includes(g.jid));

    // Carrega instância do usuário
    useEffect(() => {
        if (user) {
            loadInstance();
        }
    }, [user]);

    const loadInstance = async () => {
        // Só mostra loading se não tem dados ainda
        if (!instance) {
            setLoading(true);
        }
        try {
            const result = await authenticatedJsonFetch('/api/whatsapp/instance');
            if (result.success && result.data.instance) {
                setInstance(result.data.instance);
                await checkStatus(result.data.instance.instance_id);
            }
        } catch (error) {
            console.error('Erro ao carregar instância:', error);
        } finally {
            setLoading(false);
        }
    };

    const createInstance = async () => {
        setCreatingInstance(true);
        try {
            const result = await authenticatedJsonFetch('/api/whatsapp/instance', {
                method: 'POST',
                body: JSON.stringify({ instanceName: `WhatsApp ${user?.email?.split('@')[0]}` }),
            });

            if (result.success) {
                setInstance(result.data.instance);
                toast.success('Instância criada! Escaneie o QR Code.');
                await loadQrCode(result.data.instance.instance_id);
            } else {
                toast.error(result.error || 'Erro ao criar instância');
            }
        } catch (error) {
            toast.error('Erro ao criar instância');
        } finally {
            setCreatingInstance(false);
        }
    };

    const loadQrCode = async (instanceId) => {
        try {
            const result = await authenticatedJsonFetch(`/api/whatsapp/qrcode/${instanceId}`);
            if (result.success && result.data.qrcode) {
                setQrCode(result.data.qrcode);
            }
        } catch (error) {
            console.error('Erro ao carregar QR:', error);
        }
    };

    const checkStatus = async (instanceId) => {
        try {
            const result = await authenticatedJsonFetch(`/api/whatsapp/status/${instanceId}`);
            if (result.success) {
                setStatus(result.data.status);
                if (result.data.status === 'connected') {
                    setQrCode(null);
                    await Promise.all([
                        loadGroups(instanceId),
                        loadMonitoredGroups(),
                        loadRecentDocs()
                    ]);
                } else {
                    await loadQrCode(instanceId);
                }
            }
        } catch (error) {
            console.error('Erro ao verificar status:', error);
        }
    };

    const loadGroups = async (instanceId) => {
        setLoadingGroups(true);
        try {
            const result = await authenticatedJsonFetch(`/api/whatsapp/groups/${instanceId}`);
            if (result.success) {
                setGroups(result.data || []);
            }
        } catch (error) {
            console.error('Erro ao carregar grupos:', error);
        } finally {
            setLoadingGroups(false);
        }
    };

    const loadMonitoredGroups = async () => {
        try {
            const result = await authenticatedJsonFetch('/api/whatsapp/monitored-groups');
            if (result.success) {
                const monitored = result.data.groups || [];
                setMonitoredGroups(monitored.map(g => g.group_jid));
                setStats(prev => ({ ...prev, groups: monitored.length }));
            }
        } catch (error) {
            console.error('Erro ao carregar grupos monitorados:', error);
        }
    };

    const loadRecentDocs = async () => {
        try {
            const result = await authenticatedJsonFetch('/api/user/analyses?limit=5');
            if (result.success) {
                setRecentDocs(result.data.analyses || []);
                // Conta docs de hoje
                const today = new Date().toDateString();
                const docsToday = (result.data.analyses || []).filter(d =>
                    new Date(d.created_at).toDateString() === today
                ).length;
                setStats(prev => ({ ...prev, docsToday }));
            }
        } catch (error) {
            console.error('Erro ao carregar documentos:', error);
        }
    };

    const toggleMonitor = async (group, active) => {
        try {
            const result = await authenticatedJsonFetch('/api/whatsapp/groups/monitor', {
                method: 'POST',
                body: JSON.stringify({
                    instanceId: instance.instance_id,
                    groupJid: group.jid,
                    groupName: group.name,
                    active,
                }),
            });

            if (result.success) {
                if (active) {
                    setMonitoredGroups(prev => [...prev, group.jid]);
                    setStats(prev => ({ ...prev, groups: prev.groups + 1 }));
                    toast.success(`Monitorando: ${group.name}`);
                } else {
                    setMonitoredGroups(prev => prev.filter(jid => jid !== group.jid));
                    setStats(prev => ({ ...prev, groups: Math.max(0, prev.groups - 1) }));
                    toast.success(`Parou de monitorar: ${group.name}`);
                }
            }
        } catch (error) {
            toast.error('Erro ao configurar monitoramento');
        }
    };

    const deleteInstance = async () => {
        if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;

        try {
            const result = await authenticatedJsonFetch(`/api/whatsapp/instance/${instance.instance_id}`, {
                method: 'DELETE',
            });

            if (result.success) {
                setInstance(null);
                setQrCode(null);
                setStatus('disconnected');
                setGroups([]);
                setMonitoredGroups([]);
                toast.success('WhatsApp desconectado');
            }
        } catch (error) {
            toast.error('Erro ao desconectar');
        }
    };

    // Polling para verificar conexão enquanto aguarda QR
    useEffect(() => {
        let interval;
        if (instance && status !== 'connected') {
            interval = setInterval(() => {
                checkStatus(instance.instance_id);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [instance, status]);

    const currentStep = getCurrentStep();

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-dark-400">Carregando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 p-6">
            {/* Background effects */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-brand-blue/3 rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
                >
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/user-dashboard')}
                            className="p-2 bg-dark-700/50 rounded-xl hover:bg-dark-600 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-light-200" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-light-100 flex items-center gap-3">
                                <MessageSquare className="w-6 h-6 text-emerald-500" />
                                WhatsApp Integration
                            </h1>
                            <p className="text-dark-500 text-sm mt-1">
                                Gerencie sua conexão, grupos e monitore atividades em tempo real
                            </p>
                        </div>
                    </div>

                    {/* Compact Stepper - Only show when not connected */}
                    {status !== 'connected' && (
                        <div className="flex bg-dark-800/50 p-2 rounded-xl backdrop-blur-sm">
                            {steps.map((step, index) => {
                                const StepIcon = step.icon;
                                const isCompleted = index < currentStep;
                                const isCurrent = index === currentStep;
                                return (
                                    <div key={step.label} className={`flex items-center px-3 py-1.5 rounded-lg ${isCurrent ? 'bg-dark-700' : ''}`}>
                                        <StepIcon className={`w-4 h-4 mr-2 ${isCompleted || isCurrent ? 'text-emerald-500' : 'text-dark-500'}`} />
                                        <span className={`text-xs font-medium ${isCompleted || isCurrent ? 'text-light-200' : 'text-dark-500'}`}>{step.label}</span>
                                        {index < steps.length - 1 && <ChevronRight className="w-3 h-3 text-dark-600 ml-2" />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>

                {/* Main Content Grid */}
                <div className="space-y-6">

                    {/* Top Section: Connection Status & Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Connection Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="lg:col-span-2 glass rounded-2xl p-6 relative overflow-hidden"
                        >
                            {status === 'connected' && instance ? (
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                            <Wifi className="w-8 h-8 text-emerald-500" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h2 className="text-xl font-bold text-light-100">Conectado</h2>
                                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                    ONLINE
                                                </span>
                                            </div>
                                            <p className="text-dark-400 font-mono">
                                                {instance.phone_number ? `+${instance.phone_number.split('@')[0]}` : 'Número vinculado'}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={deleteInstance}
                                        className="px-4 py-2 text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Desconectar
                                    </button>
                                </div>
                            ) : (
                                // Disconnected State
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    {!instance && (
                                        <div className="flex-1 text-center md:text-left">
                                            <div className="w-16 h-16 bg-dark-700/50 rounded-2xl flex items-center justify-center mb-4 mx-auto md:mx-0">
                                                <Smartphone className="w-8 h-8 text-dark-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-light-100 mb-2">Conectar Nova Instância</h3>
                                            <p className="text-dark-400 text-sm mb-6">Escaneie o QR Code para sincronizar seus grupos.</p>
                                            <button
                                                onClick={createInstance}
                                                disabled={creatingInstance}
                                                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-2 mx-auto md:mx-0 transition-all"
                                            >
                                                {creatingInstance ? <Loader2 className="w-5 h-5 animate-spin" /> : <Power className="w-5 h-5" />}
                                                Gerar QR Code
                                            </button>
                                        </div>
                                    )}

                                    {(instance || creatingInstance) && (
                                        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/10">
                                            {qrCode ? (
                                                <div className="bg-white p-3 rounded-xl shadow-lg">
                                                    <img
                                                        src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                                                        alt="QR Code"
                                                        className="w-48 h-48"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-48 h-48 flex items-center justify-center text-dark-500">
                                                    <Loader2 className="w-8 h-8 animate-spin" />
                                                </div>
                                            )}
                                            <p className="text-dark-400 text-xs mt-3 flex items-center gap-2">
                                                <Smartphone className="w-3 h-3" />
                                                Abra o WhatsApp &gt; Aparelhos Conectados
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Decorative Background for Card */}
                            <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
                        </motion.div>

                        {/* Stats Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass rounded-2xl p-6 flex flex-col justify-center"
                        >
                            <h3 className="text-lg font-bold text-light-100 mb-6 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                                Resumo de Hoje
                            </h3>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div className="text-sm text-dark-300">Documentos</div>
                                    </div>
                                    <span className="text-2xl font-bold text-light-100">{stats.docsToday}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-dark-700/50 pt-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <Users className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <div className="text-sm text-dark-300">Grupos Ativos</div>
                                    </div>
                                    <span className="text-2xl font-bold text-light-100">{stats.groups}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Bottom Split Section: Groups & Docs */}
                    {status === 'connected' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">

                            {/* Left Col: Groups Manager */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="glass rounded-2xl flex flex-col overflow-hidden h-full border border-dark-700/50 shadow-xl"
                            >
                                <div className="p-5 border-b border-dark-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-800/30">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-emerald-500" />
                                        <h2 className="text-lg font-bold text-light-100">Gerenciar Grupos</h2>
                                    </div>

                                    <div className="flex bg-dark-900/50 p-1 rounded-lg">
                                        <button
                                            onClick={() => setGroupsTab('monitored')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${groupsTab === 'monitored'
                                                    ? 'bg-emerald-500 text-white shadow-lg'
                                                    : 'text-dark-400 hover:text-light-200'
                                                }`}
                                        >
                                            Monitorados ({monitoredGroupsList.length})
                                        </button>
                                        <button
                                            onClick={() => setGroupsTab('all')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${groupsTab === 'all'
                                                    ? 'bg-brand-blue text-white shadow-lg'
                                                    : 'text-dark-400 hover:text-light-200'
                                                }`}
                                        >
                                            Todos ({groups.length})
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                    {groupsTab === 'monitored' && monitoredGroupsList.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                                            <Users className="w-16 h-16 text-dark-600 mb-4" />
                                            <p className="text-dark-300 font-medium">Nenhum grupo sendo monitorado</p>
                                            <p className="text-dark-500 text-sm mt-2">Selecione "Todos" para adicionar</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {(groupsTab === 'monitored' ? monitoredGroupsList : groups).map(group => {
                                                const isMonitored = monitoredGroups.includes(group.jid);
                                                return (
                                                    <div
                                                        key={group.jid}
                                                        className={`p-3 rounded-xl flex items-center justify-between transition-all group ${isMonitored ? 'bg-emerald-500/5 border border-emerald-500/10' : 'hover:bg-dark-800/50 border border-transparent'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-lg ${isMonitored ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg' : 'bg-dark-700 text-dark-400'
                                                                }`}>
                                                                {group.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className={`text-sm font-medium truncate ${isMonitored ? 'text-emerald-400' : 'text-light-200'}`}>
                                                                    {group.name}
                                                                </p>
                                                                <p className="text-[10px] text-dark-500 truncate">{group.jid.split('@')[0]}</p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => toggleMonitor(group, !isMonitored)}
                                                            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isMonitored
                                                                    ? 'text-red-400 hover:bg-red-500/10'
                                                                    : 'text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                                                                }`}
                                                        >
                                                            {isMonitored ? <X className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 border-t border-dark-700 bg-dark-800/20 text-center">
                                    <button
                                        onClick={() => loadGroups(instance.instance_id)}
                                        disabled={loadingGroups}
                                        className="text-xs text-dark-400 hover:text-light-200 flex items-center justify-center gap-2 w-full py-2 hover:bg-dark-700/50 rounded-lg transition-colors"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${loadingGroups ? 'animate-spin' : ''}`} />
                                        Atualizar Lista
                                    </button>
                                </div>
                            </motion.div>

                            {/* Right Col: Recent Activity */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="glass rounded-2xl flex flex-col overflow-hidden h-full border border-dark-700/50 shadow-xl"
                            >
                                <div className="p-5 border-b border-dark-700 flex items-center justify-between bg-dark-800/30">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                                            <Smartphone className="w-5 h-5 text-brand-blue" />
                                        </div>
                                        <h2 className="text-lg font-bold text-light-100">Live Feed</h2>
                                    </div>
                                    <button onClick={() => loadRecentDocs()} className="text-dark-400 hover:text-brand-blue transition-colors">
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                    {recentDocs.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                                            <FileText className="w-16 h-16 text-dark-600 mb-4" />
                                            <p className="text-dark-300 font-medium">Nenhum documento recente</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-dark-700/50">
                                            {recentDocs.map((doc) => (
                                                <div key={doc.id} className="p-4 hover:bg-dark-800/30 transition-colors flex items-start gap-4">
                                                    <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${doc.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                                            doc.status === 'processing' ? 'bg-amber-500/10 text-amber-500' :
                                                                'bg-dark-700 text-dark-400'
                                                        }`}>
                                                        {doc.file_type?.includes('image') ? <Image className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between">
                                                            <h4 className="text-sm font-medium text-light-100 truncate pr-4" title={doc.file_name}>
                                                                {doc.file_name || 'Documento sem nome'}
                                                            </h4>
                                                            <span className="text-[10px] text-dark-500 whitespace-nowrap">
                                                                {new Date(doc.created_at).toLocaleTimeString().slice(0, 5)}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-dark-400 mt-1 truncate">
                                                            {doc.company || 'Sem empresa identificada'}
                                                        </p>

                                                        {/* Status Badge */}
                                                        <div className="flex items-center gap-3 mt-3">
                                                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${doc.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                                                    doc.status === 'processing' ? 'bg-amber-500/10 text-amber-500' :
                                                                        doc.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                                                                            'bg-dark-700 text-dark-400'
                                                                }`}>
                                                                {doc.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                                                                {doc.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                                                                {doc.status}
                                                            </div>

                                                            {doc.drive_url && (
                                                                <a
                                                                    href={doc.drive_url}
                                                                    target="_blank"
                                                                    className="text-xs text-brand-blue hover:underline flex items-center gap-1"
                                                                >
                                                                    Ver Arquivo <ExternalLink className="w-3 h-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 border-t border-dark-700 bg-dark-800/20 text-center">
                                    <button onClick={() => navigate('/history')} className="text-xs font-bold text-brand-blue hover:text-brand-blue/80 uppercase tracking-wider">
                                        Ver Histórico Completo
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
