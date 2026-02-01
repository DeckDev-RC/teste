import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Edit, Trash2,
    ArrowLeft, Loader2, Save, X, Info,
    FileText, Tag, Copy, HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    getNamingPatterns,
    createNamingPattern,
    updateNamingPattern,
    deleteNamingPattern
} from '../utils/dashboardApi';
import Header from '../components/Header';

export default function NamingPatternsPage() {
    const navigate = useNavigate();
    const [patterns, setPatterns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPattern, setSelectedPattern] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        pattern: '{{DATA}} - {{VALOR}} - {{EMPRESA}}'
    });

    const fetchPatterns = async () => {
        setLoading(true);
        try {
            const result = await getNamingPatterns();
            if (result.success) {
                setPatterns(result.data.patterns);
            } else {
                toast.error('Erro ao carregar padrões');
            }
        } catch (error) {
            console.error('Erro:', error);
            toast.error('Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatterns();
    }, []);

    const handleOpenModal = (pattern = null) => {
        if (pattern) {
            setSelectedPattern(pattern);
            setFormData({
                name: pattern.name,
                description: pattern.description || '',
                pattern: pattern.pattern
            });
        } else {
            setSelectedPattern(null);
            setFormData({
                name: '',
                description: '',
                pattern: '{{DATA}} - {{VALOR}} - {{EMPRESA}}'
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Deseja realmente remover este padrão? Empresas que o utilizam voltarão para o padrão genérico.')) return;

        try {
            const result = await deleteNamingPattern(id);
            if (result.success) {
                toast.success('Padrão removido');
                fetchPatterns();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error('Erro ao remover');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.pattern) {
            toast.error('Nome e Padrão são obrigatórios');
            return;
        }

        setSaving(true);
        try {
            let result;
            if (selectedPattern) {
                result = await updateNamingPattern(selectedPattern.id, formData);
            } else {
                result = await createNamingPattern(formData);
            }

            if (result.success) {
                toast.success(selectedPattern ? 'Padrão atualizado!' : 'Padrão criado!');
                fetchPatterns();
                setIsModalOpen(false);
            } else {
                toast.error(result.error || 'Erro ao salvar');
            }
        } catch (error) {
            toast.error('Erro de conexão');
        } finally {
            setSaving(false);
        }
    };

    const copyTag = (tag) => {
        navigator.clipboard.writeText(tag);
        toast.success(`Tag ${tag} copiada!`);
    };

    const filteredPatterns = patterns.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.pattern.toLowerCase().includes(searchTerm.toLowerCase())
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
                            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">Padrões de Nome</h1>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <p className="text-[11px] font-bold text-dark-500 uppercase tracking-widest">Renomeação Dinâmica de Arquivos</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                            <input
                                type="text"
                                placeholder="Buscar padrão..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-dark-800 border border-dark-600 rounded-2xl pl-11 pr-6 py-4 w-64 text-sm focus:border-brand-blue/50 outline-none transition-all placeholder:text-dark-500 font-medium"
                            />
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-brand-blue hover:bg-brand-blue/90 text-white p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-brand-blue/20 transition-all font-black uppercase tracking-widest text-[11px] active:scale-95"
                        >
                            <Plus className="w-5 h-5 font-black" />
                            Novo Padrão
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="w-12 h-12 text-brand-blue animate-spin" />
                        <p className="text-dark-500 font-bold uppercase tracking-widest text-xs">Carregando padrões...</p>
                    </div>
                ) : filteredPatterns.length === 0 ? (
                    <div className="bg-dark-800/50 border-2 border-dashed border-dark-600 rounded-[3rem] py-32 flex flex-col items-center justify-center text-center px-6">
                        <div className="w-20 h-20 bg-dark-700/50 rounded-3xl flex items-center justify-center mb-6">
                            <Tag className="w-10 h-10 text-dark-500" />
                        </div>
                        <h3 className="text-xl font-black text-light-100 uppercase tracking-tight mb-2">Nenhum padrão encontrado</h3>
                        <p className="text-dark-500 max-w-sm font-medium">Crie padrões de renomeação para organizar os arquivos baixados automaticamente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredPatterns.map((pattern, index) => (
                            <motion.div
                                key={pattern.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group bg-dark-800 border border-dark-600 rounded-[2.5rem] p-8 hover:border-brand-blue/50 transition-all flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-dark-700 rounded-2xl flex items-center justify-center border border-dark-600 group-hover:bg-brand-blue/10 group-hover:text-brand-blue transition-all">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-light-100 uppercase tracking-tighter group-hover:text-brand-blue transition-colors">
                                                {pattern.name}
                                            </h3>
                                            <p className="text-dark-500 font-bold uppercase tracking-widest text-[9px] mt-1 line-clamp-1">{pattern.description || 'Sem descrição'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(pattern)}
                                            className="p-3 bg-dark-700 hover:bg-dark-600 text-light-100 rounded-xl border border-dark-600 transition-all"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(pattern.id)}
                                            className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-dark-900/50 rounded-2xl p-4 border border-dark-600/50 mb-4">
                                    <p className="text-[10px] font-black text-dark-500 uppercase tracking-widest mb-2">Estrutura do Arquivo</p>
                                    <code className="text-brand-blue font-mono text-sm break-all font-bold">
                                        {pattern.pattern}
                                    </code>
                                </div>

                                <div className="mt-auto pt-4 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {/* Futuramente: Listar logos das empresas que usam este padrão */}
                                        <div className="text-[10px] font-bold text-dark-500 uppercase tracking-widest">
                                            {/* mockcount */}
                                            Padrão Reutilizável
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-dark-600 uppercase tracking-tighter">ID: {pattern.id}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal de Formulário */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 bg-dark-900/80 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-dark-800 border border-dark-600 rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 border-b border-dark-600 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-brand-blue/10 rounded-2xl flex items-center justify-center border border-brand-blue/20 text-brand-blue">
                                        <Tag className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-light-100 uppercase tracking-tighter">
                                            {selectedPattern ? 'Editar Padrão' : 'Novo Padrão'}
                                        </h2>
                                        <p className="text-dark-500 font-bold uppercase tracking-widest text-[10px] mt-1">Configuração de Renomeação</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-dark-600 rounded-2xl text-dark-400 hover:text-light-100 transition-all">
                                    <X className="w-7 h-7" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-dark-400 uppercase tracking-widest mb-2 ml-1">Nome Identificador</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="ex: Padrão Vendas Jóias"
                                        className="w-full bg-dark-700 border border-dark-600 rounded-2xl p-4 text-light-100 focus:border-brand-blue/50 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-dark-400 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Breve descrição do uso deste padrão"
                                        className="w-full bg-dark-700 border border-dark-600 rounded-2xl p-4 text-light-100 focus:border-brand-blue/50 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2 ml-1">
                                        <label className="text-[10px] font-black text-dark-400 uppercase tracking-widest flex items-center gap-2">
                                            Fórmula do Nome
                                            <HelpCircle className="w-3 h-3 text-brand-blue cursor-help" />
                                        </label>
                                        <span className="text-[9px] font-bold text-dark-500 uppercase tracking-widest">Clique nas tags abaixo para inserir</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.pattern}
                                        onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                                        className="w-full bg-dark-900 border border-dark-600 rounded-2xl p-6 font-mono text-brand-blue font-bold text-lg focus:border-brand-blue transition-all"
                                    />

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                                        <TagButton label="DATA" tag="{{DATA}}" onCopy={copyTag} />
                                        <TagButton label="VALOR" tag="{{VALOR}}" onCopy={copyTag} />
                                        <TagButton label="VENDA" tag="{{VENDA}}" onCopy={copyTag} />
                                        <TagButton label="NOME" tag="{{NOME}}" onCopy={copyTag} />
                                    </div>
                                    <p className="mt-4 text-[10px] text-dark-500 font-medium leading-relaxed italic border-l-2 border-dark-600 pl-4">
                                        Dica: Use hífens, espaços e pontos livremente. As tags entre {'{{ }}'} serão substituídas pelos dados extraídos pela IA.
                                    </p>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-5 bg-dark-700 hover:bg-dark-600 text-dark-300 font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all border border-dark-600"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-[2] py-5 bg-brand-blue hover:bg-brand-blue/90 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-brand-blue/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5" />
                                                {selectedPattern ? 'Salvar Mudanças' : 'Criar Padrão'}
                                            </>
                                        )}
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

function TagButton({ label, tag, onCopy }) {
    return (
        <button
            type="button"
            onClick={() => onCopy(tag)}
            className="flex items-center justify-between p-3 bg-dark-700 hover:bg-dark-600 rounded-xl border border-dark-600 group transition-all"
        >
            <span className="text-[10px] font-black text-light-200 group-hover:text-brand-blue transition-colors uppercase tracking-widest">{label}</span>
            <Copy className="w-3 h-3 text-dark-500 group-hover:text-brand-blue transition-colors" />
        </button>
    );
}
