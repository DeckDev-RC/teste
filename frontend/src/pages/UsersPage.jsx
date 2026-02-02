import { useState, useEffect, useMemo, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, UserPlus, Search, Edit2, Trash2, Shield,
    Mail, Lock, ChevronRight, Loader2, Save, X, Plus,
    Building2, ShieldCheck, ArrowLeft, MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import Header from '../components/Header';
import toast from 'react-hot-toast';
import { authenticatedFetch } from '../utils/api';

export default function UsersPage() {
    const { isMaster } = useContext(AuthContext);
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'user'
    });

    useEffect(() => {
        if (!isMaster) {
            navigate('/');
            return;
        }
        fetchUsers();
    }, [isMaster]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await authenticatedFetch('/api/admin/users');
            const data = await response.json();
            if (data.success) {
                setUsers(data.data.users || []);
            } else {
                toast.error(data.error || 'Erro ao carregar usuários');
            }
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            toast.error('Erro de conexão ao carregar usuários');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await authenticatedFetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Usuário criado com sucesso!');
                setIsCreateModalOpen(false);
                setFormData({ email: '', password: '', fullName: '', role: 'user' });
                fetchUsers();
            } else {
                toast.error(data.error || 'Erro ao criar usuário');
            }
        } catch (error) {
            toast.error('Erro de conexão ao criar usuário');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const uId = selectedUser.id;
            const response = await authenticatedFetch(`/api/admin/users/${uId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password || undefined,
                    fullName: formData.fullName,
                    role: formData.role
                })
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Usuário atualizado com sucesso!');
                setIsEditModalOpen(false);
                fetchUsers();
            } else {
                toast.error(data.error || 'Erro ao atualizar usuário');
            }
        } catch (error) {
            toast.error('Erro de conexão ao atualizar usuário');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (uId) => {
        if (!window.confirm('Tem certeza que deseja remover este usuário? Esta ação é irreversível.')) return;

        try {
            const response = await authenticatedFetch(`/api/admin/users/${uId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Usuário removido');
                fetchUsers();
            } else {
                toast.error(data.error || 'Erro ao remover usuário');
            }
        } catch (error) {
            toast.error('Erro de conexão');
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            email: user.email,
            password: '',
            fullName: user.full_name || '',
            role: user.role || 'user'
        });
        setIsEditModalOpen(true);
    };

    if (loading && users.length === 0) {
        return (
            <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand-blue animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 text-light-100 flex flex-col">
            <Header title="Gestão de Usuários" />

            <main className="flex-1 max-w-screen-2xl mx-auto w-full p-6 md:p-10">
                {/* Cabeçalho de Ação */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-dark-800 rounded-xl text-dark-400 transition-all">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-4xl font-black uppercase tracking-tighter">Usuários</h1>
                        </div>
                        <p className="text-dark-500 font-bold uppercase tracking-widest text-xs">Administração de contas e acessos</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                            <input
                                type="text"
                                placeholder="Buscar usuários..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-dark-800 border border-dark-600 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:border-brand-blue outline-none transition-all placeholder:text-dark-500 font-bold uppercase tracking-widest"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setFormData({ email: '', password: '', fullName: '', role: 'user' });
                                setIsCreateModalOpen(true);
                            }}
                            className="bg-brand-blue hover:bg-brand-blue/90 text-white p-3.5 md:px-6 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-brand-blue/20"
                        >
                            <UserPlus className="w-5 h-5" />
                            <span className="font-black uppercase tracking-widest text-[11px] hidden md:block">Adicionar Usuário</span>
                        </button>
                    </div>
                </div>

                {/* Grid de Usuários */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredUsers.map(u => (
                        <motion.div
                            key={u.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-dark-800 border border-dark-600 rounded-[2rem] p-8 hover:border-dark-500 transition-all group relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-dark-700 flex items-center justify-center border border-dark-600">
                                    <Users className="w-8 h-8 text-brand-blue" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditModal(u)}
                                        className="p-3 bg-dark-700 hover:bg-brand-blue/10 hover:text-brand-blue rounded-xl border border-dark-600 transition-all"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(u.id)}
                                        className="p-3 bg-dark-700 hover:bg-red-500/10 hover:text-red-400 rounded-xl border border-dark-600 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xl font-black uppercase tracking-tighter truncate">{u.full_name || 'Usuário sem Nome'}</h3>
                                <div className="flex items-center gap-2 text-dark-500 mt-1">
                                    <Mail className="w-3 h-3" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest truncate">{u.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-dark-600/50">
                                <div className="flex items-center gap-2">
                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${u.role === 'master' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                            u.role === 'admin' ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20' :
                                                'bg-dark-600 text-dark-400 border-dark-500'
                                        }`}>
                                        {u.role}
                                    </div>
                                    <button
                                        onClick={() => navigate('/admin/permissions')}
                                        className="text-[9px] font-black text-brand-blue uppercase tracking-widest hover:underline"
                                    >
                                        Acessos
                                    </button>
                                </div>
                                <div className="flex items-center gap-1.5 text-dark-500">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">{(u.allowed_companies || []).length} Emp.</span>
                                </div>
                            </div>

                            {/* Detalhe estético */}
                            <div className="absolute -bottom-4 -right-4 opacity-[0.02] transform rotate-12 transition-transform group-hover:scale-110">
                                <Users className="w-32 h-32" />
                            </div>
                        </motion.div>
                    ))}
                </div>

                {filteredUsers.length === 0 && (
                    <div className="py-20 text-center opacity-50">
                        <Users className="w-16 h-16 mx-auto mb-4 text-dark-600" />
                        <h3 className="text-xl font-black uppercase tracking-tighter text-light-100">Nenhum Usuário Encontrado</h3>
                        <p className="text-dark-500 font-bold uppercase tracking-widest text-[10px] mt-2">Tente ajustar seus termos de busca</p>
                    </div>
                )}
            </main>

            {/* Modal: Criar / Editar */}
            <AnimatePresence>
                {(isCreateModalOpen || isEditModalOpen) && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-xl bg-dark-800 border border-dark-600 rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 border-b border-dark-600 flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">
                                        {isCreateModalOpen ? 'Adicionar Usuário' : 'Editar Usuário'}
                                    </h2>
                                    <p className="text-[10px] font-bold text-dark-500 uppercase tracking-widest">Configurações de conta e role</p>
                                </div>
                                <button
                                    onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                                    className="p-3 hover:bg-dark-700 rounded-2xl text-dark-400 transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={isCreateModalOpen ? handleCreateUser : handleUpdateUser} className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest mb-2 block ml-2">Nome Completo</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            className="w-full bg-dark-900 border border-dark-600 rounded-2xl px-5 py-4 text-sm focus:border-brand-blue outline-none transition-all placeholder:text-dark-700"
                                            placeholder="Ex: João Silva"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest mb-2 block ml-2">Email de Acesso</label>
                                        <div className="relative">
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-dark-900 border border-dark-600 rounded-2xl pl-12 pr-5 py-4 text-sm focus:border-brand-blue outline-none transition-all placeholder:text-dark-700"
                                                placeholder="email@empresa.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest mb-2 block ml-2">
                                            {isCreateModalOpen ? 'Senha Inicial' : 'Alterar Senha (Opcional)'}
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                                            <input
                                                type="password"
                                                required={isCreateModalOpen}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full bg-dark-900 border border-dark-600 rounded-2xl pl-12 pr-5 py-4 text-sm focus:border-brand-blue outline-none transition-all placeholder:text-dark-700"
                                                placeholder={isCreateModalOpen ? "Mínimo 6 caracteres" : "Deixe em branco para manter"}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest mb-2 block ml-2">Nível de Permissão</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['user', 'admin', 'master'].map(role => (
                                                <button
                                                    key={role}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, role })}
                                                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.role === role
                                                            ? 'bg-brand-blue/20 border-brand-blue text-brand-blue shadow-lg shadow-brand-blue/5'
                                                            : 'bg-dark-900 border-dark-600 text-dark-500'
                                                        }`}
                                                >
                                                    {role}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-brand-blue/20 disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        {submitting ? 'Salvando...' : (isCreateModalOpen ? 'Criar Acesso' : 'Salvar Alterações')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
