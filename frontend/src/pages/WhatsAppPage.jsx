import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    MessageSquare, QrCode, Users, Check, X, RefreshCw,
    ArrowLeft, Smartphone, Wifi, WifiOff, Trash2, Power,
    Building2, ChevronRight
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
    const [loading, setLoading] = useState(true);
    const [creatingInstance, setCreatingInstance] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(false);

    // Carrega instância do usuário
    useEffect(() => {
        if (user) {
            loadInstance();
        }
    }, [user]);

    const loadInstance = async () => {
        setLoading(true);
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
                    await loadGroups(instanceId);
                    await loadMonitoredGroups();
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
                setMonitoredGroups(result.data.groups?.map(g => g.group_jid) || []);
            }
        } catch (error) {
            console.error('Erro ao carregar grupos monitorados:', error);
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
                    toast.success(`Monitorando: ${group.name}`);
                } else {
                    setMonitoredGroups(prev => prev.filter(jid => jid !== group.jid));
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

    if (loading) {
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
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-brand-blue/3 rounded-full blur-[140px]" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-8"
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

                {/* Status Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-6 mb-6"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status === 'connected'
                                ? 'bg-emerald-500/10 border border-emerald-500/20'
                                : 'bg-dark-700 border border-dark-600'
                                }`}>
                                {status === 'connected' ? (
                                    <Wifi className="w-6 h-6 text-emerald-500" />
                                ) : (
                                    <WifiOff className="w-6 h-6 text-dark-500" />
                                )}
                            </div>
                            <div>
                                <p className="text-light-100 font-medium">
                                    {status === 'connected' ? 'Conectado' : 'Desconectado'}
                                </p>
                                <p className="text-dark-500 text-sm">
                                    {instance?.phone_number || 'Nenhum número vinculado'}
                                </p>
                            </div>
                        </div>

                        {instance && (
                            <button
                                onClick={deleteInstance}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                title="Desconectar"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* No instance - Create button */}
                {!instance && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-2xl p-8 text-center"
                    >
                        <Smartphone className="w-16 h-16 text-dark-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-light-100 mb-2">
                            Conecte seu WhatsApp
                        </h2>
                        <p className="text-dark-500 text-sm mb-6 max-w-md mx-auto">
                            Vincule seu número para monitorar grupos e processar documentos automaticamente
                        </p>
                        <button
                            onClick={createInstance}
                            disabled={creatingInstance}
                            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                        >
                            {creatingInstance ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
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
                        <QrCode className="w-12 h-12 text-brand-blue mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-light-100 mb-2">
                            Escaneie o QR Code
                        </h2>
                        <p className="text-dark-500 text-sm mb-6">
                            Abra o WhatsApp → Dispositivos conectados → Vincular dispositivo
                        </p>

                        {qrCode ? (
                            <div className="bg-white p-4 rounded-xl inline-block">
                                <img
                                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                                    alt="QR Code"
                                    className="w-48 h-48"
                                />
                            </div>
                        ) : (
                            <div className="w-48 h-48 bg-dark-700 rounded-xl flex items-center justify-center mx-auto">
                                <RefreshCw className="w-8 h-8 text-dark-500 animate-spin" />
                            </div>
                        )}

                        <p className="text-dark-500 text-xs mt-4">
                            O QR Code atualiza automaticamente • Aguardando conexão...
                        </p>
                    </motion.div>
                )}

                {/* Groups List */}
                {instance && status === 'connected' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-dark-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-brand-blue" />
                                <h2 className="text-lg font-bold text-light-100">Grupos</h2>
                                <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-xs font-bold rounded-full">
                                    {groups.length}
                                </span>
                            </div>
                            <button
                                onClick={() => loadGroups(instance.instance_id)}
                                disabled={loadingGroups}
                                className="p-2 text-dark-500 hover:text-brand-blue transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingGroups ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {groups.length === 0 ? (
                            <div className="p-8 text-center">
                                <Users className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                                <p className="text-dark-500">Nenhum grupo encontrado</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-dark-700">
                                {groups.map((group) => {
                                    const isMonitored = monitoredGroups.includes(group.jid);
                                    return (
                                        <div
                                            key={group.jid}
                                            className="p-4 flex items-center justify-between hover:bg-dark-800/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-dark-700 rounded-full flex items-center justify-center">
                                                    <Users className="w-5 h-5 text-dark-500" />
                                                </div>
                                                <div>
                                                    <p className="text-light-100 font-medium">{group.name}</p>
                                                    <p className="text-dark-500 text-xs">
                                                        {group.participants} participantes
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleMonitor(group, !isMonitored)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${isMonitored
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-dark-700 text-dark-400 hover:text-light-200'
                                                    }`}
                                            >
                                                {isMonitored ? (
                                                    <>
                                                        <Check className="w-3 h-3" />
                                                        Monitorando
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronRight className="w-3 h-3" />
                                                        Monitorar
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
