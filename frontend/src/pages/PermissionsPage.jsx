import { useState, useEffect, useMemo, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, ShieldCheck, Search, Building2, Check,
    Gem, Zap, Factory, Store, BarChart3, Building, User as UserIcon,
    Loader2, Save, ChevronRight, LayoutGrid, Info, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import Header from '../components/Header';
import toast from 'react-hot-toast';
import { getAdminCompanies, updateUserCompanies } from '../utils/dashboardApi';
import { authenticatedFetch } from '../utils/api';

const ICON_MAP = {
    'Building2': Building2,
    'Building': Building,
    'Factory': Factory,
    'Store': Store,
    'Gem': Gem,
    'Zap': Zap,
    'BarChart3': BarChart3,
    'User': UserIcon,
    'default': Building2
};

export default function PermissionsPage() {
    const { isMaster } = useContext(AuthContext);
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedCompanies, setSelectedCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [companySearchTerm, setCompanySearchTerm] = useState('');

    useEffect(() => {
        if (!isMaster) {
            navigate('/');
            return;
        }
        fetchInitialData();
    }, [isMaster]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Note: Reuse the top users or a dedicated user fetcher if available
            // For now, let's fetch all users from the profiles table
            const [usersRes, companiesRes] = await Promise.all([
                authenticatedFetch('/api/admin/users'),
                getAdminCompanies()
            ]);

            const usersData = await usersRes.json();

            if (usersData.success) {
                setUsers(usersData.data.users || []);
            }

            if (companiesRes.success) {
                setCompanies(companiesRes.data.companies || []);
            }
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            toast.error('Erro ao carregar dados de permissões');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!Array.isArray(users)) return [];
        return users.filter(u =>
            (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            (u.full_name || '').toLowerCase().includes(userSearchTerm.toLowerCase())
        );
    }, [users, userSearchTerm]);

    const filteredCompanies = useMemo(() => {
        if (!Array.isArray(companies)) return [];
        return companies.filter(c =>
            (c.name || '').toLowerCase().includes(companySearchTerm.toLowerCase()) ||
            (c.id || '').toLowerCase().includes(companySearchTerm.toLowerCase())
        );
    }, [companies, companySearchTerm]);

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setSelectedCompanies(user.allowed_companies || []);
    };

    const handleToggleCompany = (companyId) => {
        if (!selectedUser) return;

        setSelectedCompanies(prev =>
            prev.includes(companyId)
                ? prev.filter(id => id !== companyId)
                : [...prev, companyId]
        );
    };

    const handleSave = async () => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            const result = await updateUserCompanies(selectedUser.id || selectedUser.userId, selectedCompanies);
            if (result.success) {
                toast.success(`Permissões de ${selectedUser.full_name || selectedUser.email} atualizadas!`);
                // Update local user state
                setUsers(prev => prev.map(u =>
                    (u.id === selectedUser.id || u.userId === selectedUser.userId)
                        ? { ...u, allowed_companies: selectedCompanies }
                        : u
                ));
            } else {
                toast.error(result.error || 'Erro ao salvar');
            }
        } catch (error) {
            console.error('Erro ao salvar permissões:', error);
            toast.error('Erro de conexão');
        } finally {
            setSaving(false);
        }
    };

    const handleBack = () => navigate('/dashboard');

    if (loading && users.length === 0) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand-blue animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 text-light-100 flex flex-col">
            <Header title="Gestão de Acessos" />

            <main className="flex-1 flex overflow-hidden">
                {/* Lado Esquerdo: Lista de Usuários (Master) */}
                <aside className="w-96 border-r border-dark-600 bg-dark-800/30 flex flex-col">
                    <div className="p-6 border-b border-dark-600">
                        <div className="flex items-center gap-3 mb-6">
                            <button onClick={handleBack} className="p-2 hover:bg-dark-700 rounded-xl text-dark-400 transition-all">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-black uppercase tracking-tighter">Usuários</h2>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                            <input
                                type="text"
                                placeholder="Buscar usuário..."
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                className="w-full bg-dark-700 border border-dark-600 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-brand-blue outline-none transition-all placeholder:text-dark-500 font-bold uppercase tracking-widest"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {filteredUsers.map(u => {
                            const isUserSelected = selectedUser && (selectedUser.id === u.id || selectedUser.userId === u.userId);
                            const activeCount = (u.allowed_companies || []).length;

                            return (
                                <button
                                    key={u.id || u.userId}
                                    onClick={() => handleSelectUser(u)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left border ${isUserSelected
                                        ? 'bg-brand-blue/10 border-brand-blue/50'
                                        : 'hover:bg-dark-700/50 border-transparent hover:border-dark-600'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isUserSelected ? 'bg-brand-blue text-white' : 'bg-dark-700 text-dark-400'
                                        }`}>
                                        <UserIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-sm uppercase tracking-tight truncate">
                                            {u.full_name || u.email.split('@')[0]}
                                        </p>
                                        <p className="text-[10px] text-dark-500 font-bold uppercase tracking-widest truncate">
                                            {u.email}
                                        </p>
                                    </div>
                                    {activeCount > 0 && (
                                        <div className="px-2 py-1 rounded-lg bg-dark-600 border border-dark-500 text-[10px] font-black text-brand-blue">
                                            {activeCount}
                                        </div>
                                    )}
                                    <ChevronRight className={`w-4 h-4 text-dark-600 ${isUserSelected ? 'text-brand-blue' : ''}`} />
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Lado Direito: Grid de Empresas (Detail) */}
                <section className="flex-1 flex flex-col bg-dark-900/50 relative">
                    {selectedUser ? (
                        <>
                            {/* Toolbar Detail */}
                            <div className="p-8 border-b border-dark-600 flex items-center justify-between bg-dark-800/30 backdrop-blur-sm sticky top-0 z-10">
                                <div>
                                    <p className="text-[10px] font-black text-dark-500 uppercase tracking-widest mb-1">Configurando Acessos para</p>
                                    <h2 className="text-3xl font-black text-brand-blue tracking-tighter uppercase leading-none">
                                        {selectedUser.full_name || selectedUser.email}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-64">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                                        <input
                                            type="text"
                                            placeholder="Filtrar catálogo..."
                                            value={companySearchTerm}
                                            onChange={(e) => setCompanySearchTerm(e.target.value)}
                                            className="w-full bg-dark-800 border border-dark-600 rounded-xl pl-11 pr-4 py-2 text-xs focus:border-brand-blue outline-none transition-all placeholder:text-dark-500 font-bold uppercase tracking-widest"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-8 py-3 bg-brand-blue hover:bg-brand-blue/90 text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-brand-blue/20 transition-all flex items-center gap-3 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        {saving ? 'Sincronizando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredCompanies.map(company => {
                                        const isSelected = selectedCompanies.includes(company.id);
                                        const Icon = ICON_MAP[company.icon] || ICON_MAP['default'];

                                        return (
                                            <button
                                                key={company.id}
                                                onClick={() => handleToggleCompany(company.id)}
                                                className={`relative flex flex-col p-8 rounded-[2.5rem] border-2 transition-all text-left group ${isSelected
                                                    ? 'bg-brand-blue/10 border-brand-blue shadow-[0_0_30px_rgba(43,153,255,0.1)]'
                                                    : 'bg-dark-800 border-dark-600 hover:border-dark-500'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${isSelected
                                                        ? 'bg-brand-blue border-brand-blue text-white shadow-lg'
                                                        : 'bg-dark-700 border-dark-600 text-dark-400 group-hover:text-light-100'
                                                        }`}>
                                                        <Icon className="w-7 h-7" />
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-blue border-brand-blue text-white' : 'border-dark-500'
                                                        }`}>
                                                        {isSelected && <Check className="w-5 h-5" />}
                                                    </div>
                                                </div>
                                                <h3 className={`font-black uppercase tracking-tighter text-lg mb-1 ${isSelected ? 'text-light-100' : 'text-dark-300'
                                                    }`}>
                                                    {company.name}
                                                </h3>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-brand-blue' : 'text-dark-500'
                                                    }`}>
                                                    {isSelected ? 'Acesso Permitido' : 'Sem Acesso'}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-50">
                            <div className="w-24 h-24 bg-dark-800 border border-dark-600 rounded-[2rem] flex items-center justify-center mb-6">
                                <Users className="w-10 h-10 text-dark-500" />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-light-100 mb-2">Selecione um Usuário</h3>
                            <p className="text-dark-500 font-bold uppercase tracking-widest text-xs max-w-xs leading-relaxed">
                                Use a lista à esquerda para escolher o administrador ou analista que você deseja habilitar.
                            </p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
