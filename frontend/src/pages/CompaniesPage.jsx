import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Building2, Edit, Trash2,
    ChevronRight, Loader2, ArrowLeft,
    Gem, Zap, Factory, Store, BarChart3, Building, User,
    FileText, ShieldCheck, Tag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getAdminCompanies, deleteAdminCompany } from '../utils/dashboardApi';
import Header from '../components/Header';
import CompanyFormModal from '../components/dashboard/CompanyFormModal';

const ICON_MAP = {
    'Building2': Building2,
    'Building': Building,
    'Factory': Factory,
    'Store': Store,
    'Gem': Gem,
    'Zap': Zap,
    'BarChart3': BarChart3,
    'User': User,
    'default': Building2
};

export default function CompaniesPage() {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const result = await getAdminCompanies();
            if (result.success) {
                setCompanies(result.data.companies);
            } else {
                toast.error('Erro ao carregar catálogo');
            }
        } catch (error) {
            console.error('Erro:', error);
            toast.error('Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm('Deseja realmente remover esta empresa do catálogo?')) return;

        try {
            const result = await deleteAdminCompany(id);
            if (result.success) {
                toast.success('Empresa removida');
                fetchCompanies();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error('Erro ao remover');
        }
    };

    const handleEdit = (company) => {
        setSelectedCompany(company);
        setIsModalOpen(true);
    };

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-dark-900 text-light-100 selection:bg-brand-blue/30 selection:text-brand-blue">
            <Header />

            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Top Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-3 bg-dark-800 border border-dark-600 rounded-2xl hover:bg-dark-700 hover:border-brand-blue/50 transition-all group"
                        >
                            <ArrowLeft className="w-6 h-6 text-dark-400 group-hover:text-brand-blue" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">Catálogo de Empresas</h1>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-brand-blue rounded-full animate-pulse" />
                                <p className="text-[11px] font-bold text-dark-500 uppercase tracking-widest">Gestão de Prompts e Ativos de IA</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                            <input
                                type="text"
                                placeholder="Buscar empresa..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-dark-800 border border-dark-600 rounded-2xl pl-11 pr-6 py-4 w-64 text-sm focus:border-brand-blue/50 outline-none transition-all placeholder:text-dark-500 font-medium"
                            />
                        </div>
                        <button
                            onClick={() => navigate('/admin/naming-patterns')}
                            className="bg-dark-800 hover:bg-dark-700 text-light-100 p-4 rounded-2xl flex items-center gap-3 border border-dark-600 transition-all font-black uppercase tracking-widest text-[11px] active:scale-95"
                        >
                            <Tag className="w-5 h-5 text-brand-blue" />
                            Padrões de Nome
                        </button>
                        <button
                            onClick={() => { setSelectedCompany(null); setIsModalOpen(true); }}
                            className="bg-brand-blue hover:bg-brand-blue/90 text-white p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-brand-blue/20 transition-all font-black uppercase tracking-widest text-[11px] active:scale-95"
                        >
                            <Plus className="w-5 h-5 font-black" />
                            Nova Empresa
                        </button>
                    </div>
                </div>

                {/* Grid de Empresas */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="w-12 h-12 text-brand-blue animate-spin" />
                        <p className="text-dark-500 font-bold uppercase tracking-widest text-xs">Carregando catálogo...</p>
                    </div>
                ) : filteredCompanies.length === 0 ? (
                    <div className="bg-dark-800/50 border-2 border-dashed border-dark-600 rounded-[3rem] py-32 flex flex-col items-center justify-center text-center px-6">
                        <div className="w-20 h-20 bg-dark-700/50 rounded-3xl flex items-center justify-center mb-6">
                            <Building2 className="w-10 h-10 text-dark-500" />
                        </div>
                        <h3 className="text-xl font-black text-light-100 uppercase tracking-tight mb-2">Nenhuma empresa encontrada</h3>
                        <p className="text-dark-500 max-w-sm font-medium">Não encontramos nenhuma empresa com os critérios informados ou o catálogo está vazio.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCompanies.map((company, index) => {
                            const Icon = ICON_MAP[company.icon] || ICON_MAP['default'];
                            return (
                                <motion.div
                                    key={company.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group relative bg-dark-800 border border-dark-600 rounded-[2.5rem] p-8 hover:border-brand-blue/50 hover:bg-dark-700/50 transition-all cursor-default"
                                >
                                    {/* Badge de ID */}
                                    <div className="absolute top-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-dark-900 border border-dark-600 px-3 py-1 rounded-full">
                                            <span className="text-[9px] font-black text-dark-500 uppercase tracking-tighter">ID: {company.id}</span>
                                        </div>
                                    </div>

                                    {/* Icon & Info */}
                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="w-16 h-16 bg-dark-700 rounded-[1.5rem] flex items-center justify-center border border-dark-600 group-hover:bg-brand-blue/10 group-hover:border-brand-blue/30 group-hover:text-brand-blue transition-all">
                                            <Icon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-light-100 uppercase tracking-tighter leading-tight group-hover:text-brand-blue transition-colors">
                                                {company.name}
                                            </h3>
                                            <p className="text-dark-500 font-bold uppercase tracking-widest text-[9px] mt-1">Ativa no Sistema</p>
                                        </div>
                                    </div>

                                    {/* Stats/Quick View */}
                                    <div className="grid grid-cols-2 gap-3 mb-8">
                                        <div className="bg-dark-900/50 p-4 rounded-2xl border border-dark-600/50">
                                            <p className="text-[10px] font-black text-dark-500 uppercase tracking-widest mb-1">Receber</p>
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-3 h-3 text-emerald-400" />
                                                <span className="text-[10px] font-bold text-light-200">Prompt Ok</span>
                                            </div>
                                        </div>
                                        <div className="bg-dark-900/50 p-4 rounded-2xl border border-dark-600/50">
                                            <p className="text-[10px] font-black text-dark-500 uppercase tracking-widest mb-1">Pagar</p>
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-3 h-3 text-amber-400" />
                                                <span className="text-[10px] font-bold text-light-200">Prompt Ok</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleEdit(company)}
                                            className="flex-1 py-4 bg-dark-700 hover:bg-dark-600 text-light-100 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-dark-600"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Configurar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(company.id)}
                                            className="p-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            <CompanyFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                company={selectedCompany}
                onSuccess={fetchCompanies}
            />
        </div>
    );
}
