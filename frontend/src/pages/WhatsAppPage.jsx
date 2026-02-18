import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare, QrCode, Users, Check, X, RefreshCw,
    ArrowLeft, Smartphone, Wifi, WifiOff, Trash2, Power,
    Building2, ChevronRight, FileText, Image, Clock,
    CheckCircle, AlertCircle, Loader2, Sparkles, ExternalLink,
    Search, Coins, LogOut, BarChart, LayoutDashboard, Brain, Zap, Bot, Copy
} from 'lucide-react';
import { AuthContext } from '../App';
import { authenticatedJsonFetch } from '../utils/api';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Header from '../components/Header';

export default function WhatsAppPage() {
    const { user, logout, isMaster } = useContext(AuthContext);
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

    // New States for Phase 1
    const [credits, setCredits] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    // New States for Phase 2 & 3
    const [feedFilter, setFeedFilter] = useState('all'); // 'all' | 'completed' | 'failed' | 'processing'
    const [selectedDoc, setSelectedDoc] = useState(null);

    const [groupsTab, setGroupsTab] = useState('monitored'); // 'monitored' | 'all'
    const [availableCompanies, setAvailableCompanies] = useState([]);
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [pendingGroup, setPendingGroup] = useState(null);
    const [isSubmittingMonitor, setIsSubmittingMonitor] = useState(false);

    // ZIP Export States
    const [pendingExportDocs, setPendingExportDocs] = useState([]);
    const [isExporting, setIsExporting] = useState(false);

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

    // Filter Logic
    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Separa grupos monitorados dos demais
    const monitoredJids = monitoredGroups.map(g => g.group_jid);
    const monitoredGroupsList = filteredGroups.filter(g => monitoredJids.includes(g.jid));
    const otherGroupsList = filteredGroups.filter(g => !monitoredJids.includes(g.jid));

    // Carrega instância do usuário
    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        // Só mostra loading se não tem dados ainda
        if (!instance) {
            setLoading(true);
        }
        try {
            await Promise.all([
                loadInstance(),
                loadCredits(),
                loadCompanies(),
                loadPendingExport()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadInstance = async () => {
        try {
            const result = await authenticatedJsonFetch('/api/whatsapp/instance');
            if (result.success && result.data.instance) {
                setInstance(result.data.instance);
                await checkStatus(result.data.instance.instance_id);
            }
        } catch (error) {
            console.error('Erro ao carregar instância:', error);
        }
    };

    const loadCredits = async () => {
        try {
            const result = await authenticatedJsonFetch('/api/user/credits');
            if (result.success) {
                setCredits(result.data.credits);
            }
        } catch (error) {
            console.error('Erro ao carregar créditos:', error);
        }
    };

    const handle401Error = () => {
        toast.error('Erro de conexão: Suas credenciais podem estar expiradas. Por favor, limpe as credenciais e conecte novamente.', {
            duration: 6000,
            icon: '⚠️'
        });
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
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

            // Check for 401 or unauthorized in error message if the API returns it that way
            if (result.error && (result.error.includes('401') || result.error.toLowerCase().includes('unauthorized'))) {
                handle401Error();
            }

            if (result.success) {
                setStatus(result.data.status);
                // Update instance data if phone number changed
                if (result.data.instance) {
                    setInstance(prev => ({ ...prev, ...result.data.instance }));
                }

                if (result.data.status === 'connected') {
                    setQrCode(null);
                    await Promise.all([
                        loadGroups(instanceId),
                        loadMonitoredGroups(),
                        loadRecentDocs()
                    ]);
                } else if (result.data.status === 'disconnected') {
                    // Optionally alert user if it was connected before but now disconnected
                    await loadQrCode(instanceId);
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

    const loadCompanies = async () => {
        try {
            const result = await authenticatedJsonFetch('/api/system/companies');
            if (result.success) {
                setAvailableCompanies(result.data.companies || []);
            }
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
        }
    };

    const loadPendingExport = async () => {
        try {
            const result = await authenticatedJsonFetch('/api/analysis/pending-export');
            if (result.success) {
                setPendingExportDocs(result.data || []);
            }
        } catch (error) {
            console.error('Erro ao carregar pendentes de exportação:', error);
        }
    };

    const handleExportZip = async () => {
        if (pendingExportDocs.length === 0) {
            toast.error('Nenhum documento novo para exportar');
            return;
        }

        setIsExporting(true);
        const toastId = toast.loading('Gerando seu ZIP inteligente...');

        try {
            const zip = new JSZip();
            const dateStr = new Date().toISOString().split('T')[0];
            const rootFolder = zip.folder(`Exportacao_${dateStr}`);

            // Agrupar por empresa
            const docsByCompany = pendingExportDocs.reduce((acc, doc) => {
                const companyName = doc.companies?.name || 'Sem Empresa';
                if (!acc[companyName]) acc[companyName] = [];
                acc[companyName].push(doc);
                return acc;
            }, {});

            let processedCount = 0;

            for (const [companyName, docs] of Object.entries(docsByCompany)) {
                const companyFolder = rootFolder.folder(companyName);

                for (const doc of docs) {
                    try {
                        // Baixar o arquivo
                        const response = await fetch(doc.original_file_url);
                        if (!response.ok) throw new Error('Falha ao baixar arquivo');
                        const blob = await response.blob();

                        // Determinar nome do arquivo
                        const fileName = doc.suggested_file_name || doc.file_name || `documento_${doc.id}`;
                        companyFolder.file(fileName, blob);
                        processedCount++;
                    } catch (err) {
                        console.error(`Erro ao incluir arquivo ${doc.id} no ZIP:`, err);
                    }
                }
            }

            if (processedCount === 0) {
                throw new Error('Nenhum arquivo pôde ser incluído no ZIP');
            }

            // Gerar e salvar
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `Documentos_${dateStr}.zip`);

            // Marcar como exportado no backend
            const ids = pendingExportDocs.map(d => d.id);
            await authenticatedJsonFetch('/api/analysis/mark-exported', {
                method: 'POST',
                body: JSON.stringify({ ids })
            });

            toast.success('ZIP baixado e arquivos marcados como exportados!', { id: toastId });
            setPendingExportDocs([]);
            await loadRecentDocs(); // Atualiza feed para refletir status (opcional se mostramos badge)
        } catch (error) {
            console.error('Erro na exportação ZIP:', error);
            toast.error('Erro ao gerar exportação inteligente', { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    const loadMonitoredGroups = async () => {
        try {
            const result = await authenticatedJsonFetch('/api/whatsapp/monitored-groups');
            if (result.success) {
                const monitored = result.data.groups || [];
                setMonitoredGroups(monitored);
                setStats(prev => ({ ...prev, groups: monitored.length }));
            }
        } catch (error) {
            console.error('Erro ao carregar grupos monitorados:', error);
        }
    };

    const loadRecentDocs = async () => {
        try {
            let url = `/api/user/analyses?limit=5`;
            if (feedFilter !== 'all') {
                url += `&status=${feedFilter}`;
            }

            const result = await authenticatedJsonFetch(url);
            if (result.success) {
                setRecentDocs(result.data.analyses || []);
                // Se buscamos 'all', calculamos estatísticas de hoje
                if (feedFilter === 'all') {
                    const today = new Date().toDateString();
                    const docsToday = (result.data.analyses || []).filter(d =>
                        new Date(d.created_at).toDateString() === today
                    ).length;
                    setStats(prev => ({ ...prev, docsToday }));
                }
            }
        } catch (error) {
            console.error('Erro ao carregar documentos:', error);
        }
    };

    useEffect(() => {
        if (status === 'connected') {
            loadRecentDocs();
        }
    }, [feedFilter]);

    const toggleMonitor = async (group, active) => {
        if (!active) {
            // Desativar é simples
            return executeToggleMonitor(group, false);
        }

        // Ativar requer escolha da empresa
        setPendingGroup(group);
        setShowCompanyModal(true);
    };

    const executeToggleMonitor = async (group, active, companyId = null) => {
        setIsSubmittingMonitor(true);
        try {
            const payload = {
                instanceId: instance.instance_id,
                groupJid: group.jid,
                groupName: group.name,
                active,
            };

            if (companyId) {
                payload.companyId = companyId;
            }

            const result = await authenticatedJsonFetch('/api/whatsapp/groups/monitor', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (result.success) {
                await loadMonitoredGroups();
                if (active) {
                    toast.success(`Monitorando: ${group.name}`);
                } else {
                    toast.success(`Parou de monitorar: ${group.name}`);
                }
            }
        } catch (error) {
            toast.error('Erro ao configurar monitoramento');
        } finally {
            setIsSubmittingMonitor(false);
            setShowCompanyModal(false);
            setPendingGroup(null);
        }
    };

    const deleteInstance = async (isReset = false) => {
        const message = isReset
            ? 'Tem certeza que deseja limpar as credenciais? Isso removerá a conexão atual.'
            : 'Tem certeza que deseja desconectar o WhatsApp?';

        if (!confirm(message)) return;

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
                toast.success(isReset ? 'Credenciais limpas' : 'WhatsApp desconectado');
            }
        } catch (error) {
            toast.error(isReset ? 'Erro ao limpar credenciais' : 'Erro ao desconectar');
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
        <div className="min-h-screen bg-dark-900 relative overflow-hidden">
            {/* Dynamic Background Elements - From HomePage */}
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

            {/* Floating Decorative Icons - From HomePage */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 7, repeat: Infinity }} className="absolute top-[15%] left-[5%] text-brand-blue/10">
                    <Brain className="w-16 h-16" />
                </motion.div>
                <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 9, repeat: Infinity }} className="absolute bottom-[20%] right-[5%] text-emerald-500/10">
                    <Sparkles className="w-12 h-12" />
                </motion.div>
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute top-[40%] right-[15%] text-brand-blue/5">
                    <Zap className="w-10 h-10" />
                </motion.div>
            </div>

            <Header title="WhatsApp" />

            <div className="relative z-20">

                <main className="max-w-screen-xl mx-auto px-6 py-8">
                    {/* Page Title Section */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
                    >
                        <div>
                            <h1 className="text-2xl font-bold text-light-100 flex items-center gap-3">
                                <MessageSquare className="w-6 h-6 text-emerald-500" />
                                WhatsApp Integration
                            </h1>
                            <p className="text-dark-500 text-sm mt-1">
                                Gerencie sua conexão, grupos e monitore atividades em tempo real
                            </p>
                        </div>

                        {/* Compact Stepper - Only show when not connected */}
                        {status !== 'connected' && (
                            <div className="flex bg-dark-800/80 backdrop-blur-sm p-2 rounded-xl border border-dark-600">
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
                                className="lg:col-span-2 bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-xl relative overflow-hidden"
                            >
                                {status === 'connected' && instance ? (
                                    <div className="flex items-center justify-between relative z-10 h-full">
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                                <Wifi className="w-10 h-10 text-emerald-500" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h2 className="text-2xl font-bold text-light-100 uppercase tracking-tight">Conectado</h2>
                                                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20 flex items-center gap-1.5 uppercase tracking-widest">
                                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                        ONLINE
                                                    </span>
                                                </div>
                                                <p className="text-dark-400 font-mono text-lg">
                                                    {instance.phone_number ? `+${instance.phone_number.split('@')[0]}` : 'Número vinculado'}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={deleteInstance}
                                            className="px-5 py-2.5 text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all flex items-center gap-2 text-sm font-bold uppercase tracking-widest"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Desconectar
                                        </button>
                                    </div>
                                ) : (
                                    // Disconnected State
                                    <div className="flex flex-col md:flex-row items-center gap-12 h-full">
                                        {!instance && (
                                            <div className="flex-1 text-center md:text-left">
                                                <div className="w-16 h-16 bg-dark-700/50 rounded-2xl flex items-center justify-center mb-6 mx-auto md:mx-0">
                                                    <Smartphone className="w-8 h-8 text-dark-400" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-light-100 mb-2">Conectar Nova Instância</h3>
                                                <p className="text-dark-500 text-sm mb-8">Escaneie o QR Code com seu WhatsApp para começar a monitorar grupos e processar documentos.</p>
                                                <button
                                                    onClick={createInstance}
                                                    disabled={creatingInstance}
                                                    className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-3 mx-auto md:mx-0 transition-all shadow-lg shadow-emerald-500/20"
                                                >
                                                    {creatingInstance ? <Loader2 className="w-5 h-5 animate-spin" /> : <Power className="w-5 h-5" />}
                                                    Gerar QR Code Agora
                                                </button>
                                            </div>
                                        )}

                                        {(instance || creatingInstance) && (
                                            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md relative">
                                                {qrCode ? (
                                                    <div className="bg-white p-4 rounded-3xl shadow-2xl">
                                                        <img
                                                            src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                                                            alt="QR Code"
                                                            className="w-56 h-56"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-56 h-56 flex items-center justify-center text-dark-500 bg-dark-900/50 rounded-3xl border border-dark-700">
                                                        <Loader2 className="w-12 h-12 animate-spin text-brand-blue" />
                                                    </div>
                                                )}
                                                <div className="mt-6 flex flex-col items-center">
                                                    <p className="text-light-100 font-bold text-sm mb-1 uppercase tracking-widest">Aguardando Leitura</p>
                                                    <p className="text-dark-500 text-xs flex items-center gap-2 mb-4">
                                                        <Smartphone className="w-3 h-3" />
                                                        WhatsApp &gt; Aparelhos Conectados &gt; Conectar um Aparelho
                                                    </p>

                                                    {instance && (
                                                        <button
                                                            onClick={() => deleteInstance(true)}
                                                            className="px-4 py-2 text-[10px] text-red-500/60 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all flex items-center gap-2 font-bold uppercase tracking-widest border border-red-500/10"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                            Limpar Credenciais
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Decorative Gradient Overlay */}
                                <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
                            </motion.div>

                            {/* Stats & Credits Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-dark-800/80 backdrop-blur-sm rounded-[2rem] p-8 border border-dark-600 shadow-xl flex flex-col justify-center relative group overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-amber-500/10 transition-colors"></div>
                                <h3 className="text-sm font-bold text-light-100 mb-6 flex items-center gap-2 uppercase tracking-widest relative z-10">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    Resumo Operacional
                                </h3>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center justify-between p-4 bg-dark-900/50 rounded-2xl border border-dark-700 transition-all hover:bg-dark-900/80">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                                <Coins className="w-6 h-6 text-amber-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-dark-500 uppercase font-bold tracking-widest">Créditos</p>
                                                <p className="text-sm text-light-100 font-medium">Saldo em IA</p>
                                            </div>
                                        </div>
                                        <span className="text-3xl font-bold text-light-100">{credits || 0}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-4 bg-dark-900/30 rounded-2xl border border-dark-700/50 hover:border-dark-600 transition-all">
                                            <p className="text-2xl font-bold text-light-100">{stats.docsToday}</p>
                                            <p className="text-dark-500 text-[10px] font-bold uppercase tracking-widest mt-1">Docs Hoje</p>
                                        </div>
                                        <div className="text-center p-4 bg-dark-900/30 rounded-2xl border border-dark-700/50 hover:border-dark-600 transition-all">
                                            <p className="text-2xl font-bold text-light-100">{stats.groups}</p>
                                            <p className="text-dark-500 text-[10px] font-bold uppercase tracking-widest mt-1">Grupos</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Bottom Split Section: Groups & Docs */}
                        {status === 'connected' && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Left Col: Groups Manager */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="lg:col-span-12 xl:col-span-7 bg-dark-800/80 backdrop-blur-sm rounded-[2rem] flex flex-col overflow-hidden border border-dark-600 shadow-xl h-[650px]"
                                >
                                    <div className="p-6 border-b border-dark-700 flex flex-col gap-6 bg-dark-800/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                                    <Users className="w-5 h-5 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-light-100 tracking-tight">Monitorar Grupos</h2>
                                                    <p className="text-dark-500 text-xs">Selecione quais grupos a IA deve observar</p>
                                                </div>
                                            </div>

                                            <div className="flex bg-dark-900/50 p-1 rounded-xl border border-dark-700">
                                                <button
                                                    onClick={() => setGroupsTab('monitored')}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest ${groupsTab === 'monitored'
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'text-dark-500 hover:text-light-200'
                                                        }`}
                                                >
                                                    Ativos
                                                </button>
                                                <button
                                                    onClick={() => setGroupsTab('all')}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest ${groupsTab === 'all'
                                                        ? 'bg-brand-blue text-white'
                                                        : 'text-dark-500 hover:text-light-200'
                                                        }`}
                                                >
                                                    Todos ({filteredGroups.length})
                                                </button>
                                            </div>
                                        </div>

                                        {/* Search Bar */}
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 group-focus-within:text-brand-blue transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Filtrar grupos por nome..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full bg-dark-900/50 border border-dark-700 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-light-100 focus:outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/5 transition-all placeholder:text-dark-600 font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-dark-800/20">
                                        {groupsTab === 'monitored' && monitoredGroupsList.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                                <div className="w-20 h-20 bg-dark-700/50 rounded-full flex items-center justify-center mb-6">
                                                    <Users className="w-10 h-10 text-dark-600" />
                                                </div>
                                                <p className="text-light-200 font-bold text-lg mb-2">Nenhum grupo ativo</p>
                                                <p className="text-dark-500 text-sm max-w-[280px] mx-auto">Vá na aba "Todos" e clique no ícone de play para começar a capturar documentos de um grupo.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {(groupsTab === 'monitored' ? monitoredGroupsList : filteredGroups).map(group => {
                                                    const isMonitored = monitoredJids.includes(group.jid);
                                                    return (
                                                        <div
                                                            key={group.jid}
                                                            className={`p-4 rounded-2xl flex items-center justify-between transition-all group border ${isMonitored
                                                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                                                : 'bg-dark-900/30 border-transparent hover:border-dark-700 hover:bg-dark-900/50'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-4 overflow-hidden">
                                                                <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-xl transition-all ${isMonitored
                                                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                                    : 'bg-dark-800 text-dark-400 group-hover:bg-dark-700 group-hover:text-light-200'
                                                                    }`}>
                                                                    {group.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className={`text-sm font-bold truncate ${isMonitored ? 'text-emerald-400' : 'text-light-100'}`}>
                                                                        {group.name}
                                                                    </p>
                                                                    {isMonitored && (
                                                                        <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest truncate">
                                                                            {monitoredGroups.find(mg => mg.group_jid === group.jid)?.companies?.name || 'Carregando...'}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-[10px] text-dark-500 font-mono tracking-tighter truncate uppercase opacity-60">{group.jid.split('@')[0]}</p>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => toggleMonitor(group, !isMonitored)}
                                                                className={`p-3 rounded-xl transition-all shadow-sm ${isMonitored
                                                                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                                                                    : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                                                    }`}
                                                                title={isMonitored ? "Parar monitoramento" : "Iniciar monitoramento"}
                                                            >
                                                                {isMonitored ? <X className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 border-t border-dark-700 bg-dark-800/50">
                                        <button
                                            onClick={() => loadGroups(instance.instance_id)}
                                            disabled={loadingGroups}
                                            className="w-full py-3 bg-dark-900/50 hover:bg-dark-700 border border-dark-700 rounded-xl text-xs font-bold text-dark-400 hover:text-light-100 uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${loadingGroups ? 'animate-spin text-brand-blue' : ''}`} />
                                            Sincronizar Grupos do WhatsApp
                                        </button>
                                    </div>
                                </motion.div>

                                {/* Right Col: Recent Activity */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="lg:col-span-12 xl:col-span-5 bg-dark-800/80 backdrop-blur-sm rounded-[2rem] flex flex-col overflow-hidden border border-dark-600 shadow-xl h-[650px]"
                                >
                                    <div className="p-6 border-b border-dark-700 flex flex-col gap-6 bg-dark-800/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                                                    <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center border border-brand-blue/20">
                                                        <Bot className="w-5 h-5 text-brand-blue" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-light-100 tracking-tight">Live Feed</h2>
                                                    <p className="text-dark-500 text-xs">Atividades da IA em tempo real</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {pendingExportDocs.length > 0 && (
                                                    <button
                                                        onClick={handleExportZip}
                                                        disabled={isExporting}
                                                        className="relative flex items-center gap-2 px-4 py-2 bg-brand-blue/10 hover:bg-brand-blue/20 border border-brand-blue/30 rounded-xl text-brand-blue transition-all group"
                                                    >
                                                        <Zap className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Exportar {pendingExportDocs.length} novos</span>
                                                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-brand-blue text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-lg shadow-brand-blue/40 border border-dark-900 group-hover:scale-110 transition-transform">
                                                            {pendingExportDocs.length}
                                                        </span>
                                                    </button>
                                                )}

                                                <button onClick={() => { loadRecentDocs(); loadPendingExport(); }} className="p-2.5 bg-dark-900/50 border border-dark-700 rounded-xl text-dark-500 hover:text-brand-blue transition-all">
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Feed Filters */}
                                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                            {[
                                                { id: 'all', label: 'Todos' },
                                                { id: 'completed', label: 'Sucesso' },
                                                { id: 'failed', label: 'Falhas' }
                                            ].map(filter => (
                                                <button
                                                    key={filter.id}
                                                    onClick={() => setFeedFilter(filter.id)}
                                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${feedFilter === filter.id
                                                        ? 'bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20'
                                                        : 'bg-dark-900/50 border-dark-700 text-dark-500 hover:border-dark-600 hover:text-light-200'
                                                        }`}
                                                >
                                                    {filter.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-dark-800/10">
                                        {recentDocs.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                                <div className="w-16 h-16 bg-dark-700/50 rounded-full flex items-center justify-center mb-6">
                                                    <FileText className="w-8 h-8 text-dark-600" />
                                                </div>
                                                <p className="text-dark-500 font-medium">Nenhum documento processado ainda</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-dark-700/30">
                                                {recentDocs.map((doc) => (
                                                    <div
                                                        key={doc.id}
                                                        onClick={() => setSelectedDoc(doc)}
                                                        className="p-5 hover:bg-dark-900/50 transition-all flex items-start gap-4 cursor-pointer group relative"
                                                    >
                                                        <div className={`mt-1 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${doc.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500 shadow-sm shadow-emerald-500/5' :
                                                            doc.status === 'processing' ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' :
                                                                'bg-dark-800 border-dark-700 text-dark-500'
                                                            }`}>
                                                            {doc.file_type?.includes('image') ? <Image className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between mb-1">
                                                                <h4 className="text-sm font-bold text-light-100 truncate pr-4 group-hover:text-brand-blue transition-colors" title={doc.suggested_file_name || doc.file_name}>
                                                                    {doc.suggested_file_name || doc.file_name || 'Documento sem nome'}
                                                                </h4>
                                                                <span className="text-[10px] text-dark-500 font-mono tracking-tighter opacity-70">
                                                                    {new Date(doc.created_at).toLocaleTimeString().slice(0, 5)}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <p className="text-xs text-dark-500 font-medium truncate opacity-80">
                                                                    Empresa: <span className="text-dark-300">{doc.companies?.name || doc.company || 'Pendente'}</span>
                                                                </p>

                                                                {/* Status Mini Bagde */}
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${doc.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                                        doc.status === 'processing' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                                            doc.status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                                                                'bg-dark-700 border-dark-600 text-dark-400'
                                                                        }`}>
                                                                        {doc.status === 'completed' && <CheckCircle className="w-2.5 h-2.5" />}
                                                                        {doc.status === 'processing' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                                                        {doc.status === 'failed' && <AlertCircle className="w-2.5 h-2.5" />}
                                                                        {doc.status}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <ChevronRight className="w-5 h-5 text-dark-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all self-center shrink-0" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-dark-800/50 border-t border-dark-700">
                                        <button
                                            onClick={() => navigate('/history')}
                                            className="w-full py-3 bg-dark-900/30 hover:bg-dark-700 border border-dark-700/50 rounded-xl text-[10px] font-bold text-dark-500 hover:text-light-100 uppercase tracking-[0.2em] transition-all"
                                        >
                                            Ver Histórico Completo
                                        </button>
                                    </div>
                                </motion.div>

                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Analysis Details Modal */}
            <AnimatePresence>
                {selectedDoc && (
                    <DocumentDetailsModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
                )}
            </AnimatePresence>

            {/* Company Selection Modal */}
            <AnimatePresence>
                {showCompanyModal && (
                    <CompanySelectionModal
                        companies={availableCompanies}
                        group={pendingGroup}
                        onSelect={(companyId) => executeToggleMonitor(pendingGroup, true, companyId)}
                        onClose={() => {
                            setShowCompanyModal(false);
                            setPendingGroup(null);
                        }}
                        loading={isSubmittingMonitor}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function CompanySelectionModal({ companies, group, onSelect, onClose, loading }) {
    const [selectedCompanyId, setSelectedCompanyId] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedCompanyId) {
            onSelect(selectedCompanyId);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-dark-800 border border-dark-600 rounded-[2rem] w-full max-w-md p-8 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center border border-brand-blue/20">
                            <Building2 className="w-5 h-5 text-brand-blue" />
                        </div>
                        <h3 className="text-xl font-bold text-light-100">Vincular Empresa</h3>
                    </div>
                    <button onClick={onClose} className="text-dark-500 hover:text-light-100 p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <p className="text-dark-400 text-sm mb-6">
                    Selecione a empresa que será responsável pelo processamento dos documentos do grupo <span className="text-brand-blue font-bold">"{group?.name}"</span>.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] text-dark-500 uppercase font-bold tracking-widest pl-1">Escolha uma empresa</label>
                        <select
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            required
                            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3.5 text-light-100 focus:outline-none focus:border-brand-blue transition-all"
                        >
                            <option value="">Selecione...</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={!selectedCompanyId || loading}
                        className="w-full py-4 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-brand-blue/20"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? 'Configurando...' : 'Confirmar Monitoramento'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

// Modal Component - Styled to match the new aesthetic
function DocumentDetailsModal({ doc, onClose }) {
    if (!doc) return null;

    const handleCopy = () => {
        if (doc.analysis_json) {
            navigator.clipboard.writeText(JSON.stringify(doc.analysis_json, null, 2));
            toast.success('Dados JSON copiados!');
        }
    };

    const handleDownload = () => {
        if (doc.original_file_url) {
            const link = document.createElement('a');
            link.href = doc.original_file_url;
            link.download = doc.file_name || 'documento';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-dark-900 border border-dark-700 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(43,153,255,0.1)] relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button Header */}
                <div className="absolute top-6 right-6 z-10">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-dark-800/80 backdrop-blur-md rounded-full flex items-center justify-center border border-dark-700 text-dark-400 hover:text-light-100 hover:border-dark-600 transition-all shadow-xl"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Layout */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row h-full">
                    {/* Left Panel: File Visualization */}
                    <div className="md:w-1/2 p-8 bg-dark-900/50 flex flex-col border-b md:border-b-0 md:border-r border-dark-700 h-full">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center border border-brand-blue/20">
                                {doc.file_type?.includes('image') ? <Image className="w-6 h-6 text-brand-blue" /> : <FileText className="w-6 h-6 text-brand-blue" />}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xl font-bold text-light-100 truncate">{doc.file_name}</h3>
                                <p className="text-[10px] text-dark-500 uppercase tracking-widest font-black opacity-60">ID: {doc.id}</p>
                            </div>
                        </div>

                        <div className="flex-1 min-h-[400px] flex items-center justify-center bg-dark-800/20 rounded-3xl border border-dark-700/50 p-4 group relative overflow-hidden">
                            {doc.original_file_url ? (
                                <>
                                    {doc.file_type?.includes('image') ? (
                                        <img
                                            src={doc.original_file_url}
                                            alt="Visualização"
                                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-transform group-hover:scale-[1.02]"
                                        />
                                    ) : (
                                        <div className="text-center p-12">
                                            <FileText className="w-20 h-20 text-dark-700 mx-auto mb-6" />
                                            <p className="text-dark-500 font-bold uppercase tracking-widest text-xs">Pré-visualização PDF indisponível</p>
                                        </div>
                                    )}

                                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={handleDownload}
                                            className="px-5 py-3 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2"
                                        >
                                            <DownloadIcon className="w-4 h-4" /> Baixar Original
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-12">
                                    <AlertCircle className="w-16 h-16 text-dark-800 mx-auto mb-6" />
                                    <p className="text-dark-600 font-bold uppercase tracking-widest text-xs">Mídia original não disponível</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Analyzed Content */}
                    <div className="md:w-1/2 p-8 flex flex-col bg-dark-800/30">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h4 className="text-lg font-bold text-light-100 uppercase tracking-widest">Resultado do Processamento</h4>
                                <p className="text-dark-500 text-xs mt-1">Dados extraídos via {doc.provider || 'IA Engine'}</p>
                            </div>
                            <button
                                onClick={handleCopy}
                                className="p-3 bg-dark-900 border border-dark-700 rounded-xl text-dark-400 hover:text-brand-blue transition-all"
                                title="Copiar Tudo"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Analysis Grid */}
                        <div className="space-y-6 flex-1 overflow-y-auto">
                            {doc.analysis_json ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {Object.entries(doc.analysis_json).map(([key, value]) => (
                                        <div key={key} className="p-5 bg-dark-900/80 rounded-2xl border border-dark-700/50 group transition-all hover:border-dark-600">
                                            <p className="text-[10px] text-dark-500 uppercase font-black tracking-widest mb-1 group-hover:text-brand-blue transition-colors">
                                                {key.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-light-100 font-bold break-words">{String(value)}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                                        <AlertCircle className="w-8 h-8 text-red-500" />
                                    </div>
                                    <p className="text-red-400 font-bold text-sm uppercase tracking-widest mb-2">Erro na Extração</p>
                                    <p className="text-dark-500 text-xs">A IA não conseguiu estruturar os dados para este documento.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Helper for download icon
const DownloadIcon = ({ className }) => <ExternalLink className={className} />;
