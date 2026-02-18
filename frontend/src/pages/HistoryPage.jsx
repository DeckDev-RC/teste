import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Clock, CheckCircle, AlertCircle, RefreshCw,
    Search, Filter, ChevronLeft, ChevronRight, Download,
    ExternalLink, Image, LayoutDashboard, Calendar, Building2,
    ArrowUpDown, MoreVertical, Eye
} from 'lucide-react';
import { AuthContext } from '../App';
import { authenticatedJsonFetch } from '../utils/api';
import toast from 'react-hot-toast';
import Header from '../components/Header';

export default function HistoryPage() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [analyses, setAnalyses] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [limit] = useState(10);

    useEffect(() => {
        if (user) {
            loadAnalyses();
        }
    }, [user, page, statusFilter]);

    const loadAnalyses = async () => {
        setLoading(true);
        try {
            const offset = (page - 1) * limit;
            let url = `/api/user/analyses?limit=${limit}&offset=${offset}`;
            if (statusFilter !== 'all') {
                url += `&status=${statusFilter}`;
            }

            const result = await authenticatedJsonFetch(url);
            if (result.success) {
                setAnalyses(result.data.analyses || []);
                setTotal(result.data.total || 0);
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            toast.error('Erro ao carregar histórico');
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(total / limit);

    const filteredAnalyses = analyses.filter(a =>
    (a.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.suggested_file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getStatusStyles = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'failed':
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'processing':
                return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'pending_export':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default:
                return 'bg-dark-700 text-dark-300 border-dark-600';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'completed': return 'Processado';
            case 'failed': return 'Falha';
            case 'processing': return 'Em andamento';
            case 'pending_export': return 'Exportação Pendente';
            default: return status;
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 relative overflow-hidden text-light-100">
            {/* Background elements - similar to UserDashboard */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-blue/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]"></div>
            </div>

            <Header title="Histórico de Análises" />

            <main className="relative z-10 max-w-screen-xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-black mb-2 tracking-tight">Histórico <span className="text-brand-blue">Completo</span></h1>
                        <p className="text-dark-400 text-sm font-medium">Explore e gerencie todas as suas análises de documentos.</p>
                    </div>

                    <div className="flex bg-dark-800/80 p-1 rounded-2xl border border-dark-600">
                        {['all', 'completed', 'failed', 'processing'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => { setStatusFilter(filter); setPage(1); }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === filter
                                        ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                                        : 'text-dark-400 hover:text-light-100'
                                    }`}
                            >
                                {filter === 'all' ? 'Todos' : filter === 'completed' ? 'Sucesso' : filter === 'failed' ? 'Falhas' : 'Pendentes'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
                    <div className="lg:col-span-12 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 group-focus-within:text-brand-blue transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por nome do arquivo, empresa ou conteúdo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-dark-800/80 border border-dark-600 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/5 transition-all"
                        />
                    </div>
                </div>

                {/* Table/List Container */}
                <div className="bg-dark-800/50 backdrop-blur-sm rounded-[2.5rem] border border-dark-600 shadow-xl overflow-hidden mb-8">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center">
                            <RefreshCw className="w-10 h-10 text-brand-blue animate-spin mb-4" />
                            <p className="text-dark-400 font-black uppercase tracking-widest text-[10px]">Consultando base...</p>
                        </div>
                    ) : filteredAnalyses.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="w-20 h-20 bg-dark-700/50 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <Search className="w-10 h-10 text-dark-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Nenhum resultado encontrado</h3>
                            <p className="text-dark-500 text-sm">Tente ajustar seus filtros ou busca.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-dark-700/50 bg-dark-900/30">
                                        <th className="px-8 py-5 text-[10px] font-black text-dark-500 uppercase tracking-[0.2em]">Documento</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-dark-500 uppercase tracking-[0.2em]">Empresa</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-dark-500 uppercase tracking-[0.2em]">Data/Hora</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-dark-500 uppercase tracking-[0.2em]">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-dark-500 uppercase tracking-[0.2em] text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-700/30">
                                    {filteredAnalyses.map((item) => (
                                        <tr key={item.id} className="group hover:bg-dark-900/40 transition-all cursor-pointer" onClick={() => navigate(`/analysis/${item.id}`)}>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-110 ${getStatusStyles(item.status)}`}>
                                                        {item.file_type?.includes('image') ? <Image className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-light-100 truncate max-w-[200px] lg:max-w-md group-hover:text-brand-blue transition-colors">
                                                            {item.suggested_file_name || item.file_name}
                                                        </p>
                                                        <p className="text-[10px] text-dark-500 font-medium uppercase tracking-widest mt-0.5">{item.file_type || 'Desconhecido'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-3.5 h-3.5 text-dark-500" />
                                                    <span className="text-sm text-dark-200 font-medium">{item.companies?.name || 'Não vinculada'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-light-200 font-medium">{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                                                    <span className="text-[10px] text-dark-500 font-mono mt-0.5">{new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit ${getStatusStyles(item.status)}`}>
                                                    {item.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                                                    {item.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                                                    {item.status === 'processing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                                                    {getStatusLabel(item.status)}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/analysis/${item.id}`); }}
                                                        className="p-2 text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-all"
                                                        title="Ver Detalhes"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {item.original_file_url && (
                                                        <a
                                                            href={item.original_file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                            title="Baixar Original"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-dark-800/50 backdrop-blur-sm p-6 rounded-[2rem] border border-dark-600 shadow-lg">
                        <p className="text-xs text-dark-500 font-bold uppercase tracking-widest">
                            Mostrando <span className="text-light-100">{analyses.length}</span> de <span className="text-light-100">{total}</span> registros
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page === 1 || loading}
                                className="p-3 bg-dark-900 border border-dark-700 rounded-xl text-dark-300 disabled:opacity-30 hover:border-brand-blue transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-1">
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    const pageNum = i + 1; // Simplified for now
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${page === pageNum
                                                    ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30'
                                                    : 'bg-dark-900 text-dark-500 border border-dark-700 hover:border-brand-blue'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={page === totalPages || loading}
                                className="p-3 bg-dark-900 border border-dark-700 rounded-xl text-dark-300 disabled:opacity-30 hover:border-brand-blue transition-all"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
