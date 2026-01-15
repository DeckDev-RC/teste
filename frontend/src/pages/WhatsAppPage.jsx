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
                setGroups(result.data.groups || []);
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

            <div className="relative z-10 max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-6"
                >
                    <button
                        onClick={() => navigate('/user-dashboard')}
                        className="p-2 bg-dark-700 rounded-xl hover:bg-dark-600 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-light-200" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-light-100 flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-emerald-500" />
                            WhatsApp Integration
                        </h1>
                        <p className="text-dark-500 text-sm mt-1">
                            Conecte seu WhatsApp e monitore grupos automaticamente
                        </p>
                    </div>
                </motion.div>

                {/* Stepper */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-2xl p-4 mb-6"
                >
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => {
                            const StepIcon = step.icon;
                            const isCompleted = index < currentStep;
                            const isCurrent = index === currentStep;

                            return (
                                <div key={step.label} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center">
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center transition-all
                                            ${isCompleted ? 'bg-emerald-500 text-white' : ''}
                                            ${isCurrent ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/50' : ''}
                                            ${!isCompleted && !isCurrent ? 'bg-dark-700 text-dark-500' : ''}
                                        `}>
                                            {isCompleted ? (
                                                <Check className="w-5 h-5" />
                                            ) : (
                                                <StepIcon className="w-5 h-5" />
                                            )}
                                        </div>
                                        <span className={`text-xs mt-1 ${isCurrent ? 'text-emerald-400 font-medium' : 'text-dark-500'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-2 ${index < currentStep ? 'bg-emerald-500' : 'bg-dark-700'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Status Card - Quando conectado */}
                {instance && status === 'connected' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass rounded-2xl p-6 mb-6"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <Wifi className="w-7 h-7 text-emerald-500" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-light-100 font-bold text-lg">Conectado</p>
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    </div>
                                    <p className="text-dark-400 text-sm">
                                        {instance?.phone_number || 'Número vinculado'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={deleteInstance}
                                className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                title="Desconectar"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-dark-700">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-light-100">{stats.groups}</p>
                                <p className="text-dark-500 text-xs">Grupos Monitorados</p>
                            </div>
                            <div className="text-center border-x border-dark-700">
                                <p className="text-2xl font-bold text-light-100">{stats.docsToday}</p>
                                <p className="text-dark-500 text-xs">Docs Hoje</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                                    <p className="text-emerald-400 font-bold">Ativo</p>
                                </div>
                                <p className="text-dark-500 text-xs">Monitoramento</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Status Card - Quando desconectado */}
                {instance && status !== 'connected' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-2xl p-6 mb-6"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-dark-700 border border-dark-600 rounded-xl flex items-center justify-center">
                                    <WifiOff className="w-6 h-6 text-dark-500" />
                                </div>
                                <div>
                                    <p className="text-light-100 font-medium">Desconectado</p>
                                    <p className="text-dark-500 text-sm">Aguardando QR Code...</p>
                                </div>
                            </div>
                            <button
                                onClick={deleteInstance}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                title="Remover"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* No instance - Create button */}
                {!instance && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-2xl p-10 text-center"
                    >
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Smartphone className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-light-100 mb-3">
                            Conecte seu WhatsApp
                        </h2>
                        <p className="text-dark-400 text-sm mb-8 max-w-md mx-auto">
                            Vincule seu número para monitorar grupos e processar documentos automaticamente com IA
                        </p>
                        <button
                            onClick={createInstance}
                            disabled={creatingInstance}
                            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all flex items-center gap-3 mx-auto disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                        >
                            {creatingInstance ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Power className="w-5 h-5" />
                            )}
                            {creatingInstance ? 'Criando...' : 'Iniciar Conexão'}
                        </button>
                    </motion.div>
                )}

                {/* QR Code */}
                {instance && status !== 'connected' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-2xl p-8 text-center"
                    >
                        <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <QrCode className="w-8 h-8 text-brand-blue" />
                        </div>
                        <h2 className="text-xl font-bold text-light-100 mb-2">
                            Escaneie o QR Code
                        </h2>
                        <p className="text-dark-400 text-sm mb-6">
                            WhatsApp → Dispositivos conectados → Vincular dispositivo
                        </p>

                        <div className="flex justify-center">
                            {qrCode ? (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-white p-4 rounded-2xl shadow-xl"
                                >
                                    <img
                                        src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                                        alt="QR Code"
                                        className="w-52 h-52"
                                    />
                                </motion.div>
                            ) : (
                                <div className="w-52 h-52 bg-dark-700 rounded-2xl flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-dark-500 animate-spin" />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-center gap-2 mt-6 text-dark-500 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Aguardando conexão...
                        </div>
                    </motion.div>
                )}

                {/* Groups Section with Tabs */}
                {instance && status === 'connected' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass rounded-2xl overflow-hidden mb-6"
                    >
                        {/* Header with Tabs */}
                        <div className="p-4 border-b border-dark-700">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-brand-blue" />
                                    <h2 className="text-lg font-bold text-light-100">Grupos</h2>
                                </div>
                                <button
                                    onClick={() => loadGroups(instance.instance_id)}
                                    disabled={loadingGroups}
                                    className="p-2 text-dark-400 hover:text-brand-blue transition-colors rounded-lg hover:bg-dark-700"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loadingGroups ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setGroupsTab('monitored')}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${groupsTab === 'monitored'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-dark-700 text-dark-400 hover:text-light-200'
                                        }`}
                                >
                                    <Check className="w-4 h-4" />
                                    Monitorados
                                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                                        {monitoredGroupsList.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setGroupsTab('all')}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${groupsTab === 'all'
                                        ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                                        : 'bg-dark-700 text-dark-400 hover:text-light-200'
                                        }`}
                                >
                                    <Users className="w-4 h-4" />
                                    Todos
                                    <span className="px-1.5 py-0.5 bg-dark-600 text-dark-300 text-xs rounded-full">
                                        {groups.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="max-h-80 overflow-y-auto">
                            {groupsTab === 'monitored' ? (
                                monitoredGroupsList.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <Users className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                                        <p className="text-dark-400 font-medium">Nenhum grupo monitorado</p>
                                        <p className="text-dark-500 text-sm mt-1">Vá em "Todos" para adicionar grupos</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-dark-700/50">
                                        {monitoredGroupsList.map((group) => (
                                            <div
                                                key={group.jid}
                                                className="p-4 flex items-center justify-between hover:bg-dark-800/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                        <Users className="w-5 h-5 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-light-100 font-medium text-sm">{group.name}</p>
                                                        <p className="text-emerald-400 text-xs flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                            Monitorando
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => toggleMonitor(group, false)}
                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Parar de monitorar"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                groups.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <Users className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                                        <p className="text-dark-400 font-medium">Nenhum grupo encontrado</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-dark-700/50">
                                        {/* Monitored first, then others */}
                                        {[...monitoredGroupsList, ...otherGroupsList].map((group) => {
                                            const isMonitored = monitoredGroups.includes(group.jid);
                                            return (
                                                <div
                                                    key={group.jid}
                                                    className="p-3 flex items-center justify-between hover:bg-dark-800/30 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isMonitored
                                                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                                                            : 'bg-dark-700'
                                                            }`}>
                                                            <Users className={`w-4 h-4 ${isMonitored ? 'text-emerald-500' : 'text-dark-500'}`} />
                                                        </div>
                                                        <p className="text-light-100 text-sm font-medium truncate max-w-[180px]">
                                                            {group.name}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleMonitor(group, !isMonitored)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isMonitored
                                                            ? 'bg-emerald-500/10 text-emerald-400'
                                                            : 'bg-dark-700 text-dark-400 hover:text-light-200'
                                                            }`}
                                                    >
                                                        {isMonitored ? '✓' : 'Monitorar'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Recent Documents */}
                {instance && status === 'connected' && recentDocs.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="glass rounded-2xl overflow-hidden"
                    >
                        <div className="p-5 border-b border-dark-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-amber-500" />
                                <h2 className="text-lg font-bold text-light-100">Últimos Documentos</h2>
                            </div>
                            <button
                                onClick={() => navigate('/history')}
                                className="text-brand-blue text-sm font-medium hover:underline"
                            >
                                Ver todos
                            </button>
                        </div>

                        <div className="divide-y divide-dark-700/50">
                            {recentDocs.slice(0, 5).map((doc) => (
                                <div key={doc.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center">
                                            {doc.file_type?.includes('image') ? (
                                                <Image className="w-5 h-5 text-purple-400" />
                                            ) : (
                                                <FileText className="w-5 h-5 text-blue-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-light-100 text-sm font-medium truncate max-w-[200px]">
                                                {doc.file_name || 'Documento'}
                                            </p>
                                            <p className="text-dark-500 text-xs">
                                                {new Date(doc.created_at).toLocaleString('pt-BR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {doc.drive_url && (
                                            <a
                                                href={doc.drive_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 hover:bg-dark-700/50 rounded-lg text-brand-blue transition-colors"
                                                title="Ver no Google Drive"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                        <div className={`flex items-center gap-1.5 text-xs font-medium ${doc.status === 'completed' ? 'text-emerald-400' :
                                            doc.status === 'processing' ? 'text-amber-400' :
                                                doc.status === 'failed' ? 'text-red-400' :
                                                    'text-dark-400'
                                            }`}>
                                            {doc.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                                            {doc.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {doc.status === 'failed' && <AlertCircle className="w-4 h-4" />}
                                            {doc.status === 'pending' && <Clock className="w-4 h-4" />}
                                            {doc.status === 'completed' ? 'Processado' :
                                                doc.status === 'processing' ? 'Processando' :
                                                    doc.status === 'failed' ? 'Falhou' : 'Pendente'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
