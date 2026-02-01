import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Building2, Save, Loader2, Info, Gem, Zap, Factory, Store, BarChart3, Building, User, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { createAdminCompany, updateAdminCompany, getNamingPatterns } from '../../utils/dashboardApi';

const AVAILABLE_ICONS = [
    { name: 'Predio', id: 'Building2', icon: Building2 },
    { name: 'Empresa', id: 'Building', icon: Building },
    { name: 'Fabrica', id: 'Factory', icon: Factory },
    { name: 'Loja', id: 'Store', icon: Store },
    { name: 'Joia', id: 'Gem', icon: Gem },
    { name: 'Energia', id: 'Zap', icon: Zap },
    { name: 'Grafico', id: 'BarChart3', icon: BarChart3 },
    { name: 'Usuario', id: 'User', icon: User },
];

export default function CompanyFormModal({ isOpen, onClose, company = null, onSuccess }) {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        icon: 'Building2',
        financial_receipt_prompt: '',
        financial_payment_prompt: '',
        naming_pattern_id: ''
    });
    const [availablePatterns, setAvailablePatterns] = useState([]);
    const [loadingPatterns, setLoadingPatterns] = useState(false);
    const [saving, setSaving] = useState(false);
    const isEditing = !!company;

    useEffect(() => {
        if (isOpen) {
            if (company) {
                setFormData({
                    id: company.id,
                    name: company.name,
                    icon: company.icon || 'Building2',
                    financial_receipt_prompt: company.financial_receipt_prompt || '',
                    financial_payment_prompt: company.financial_payment_prompt || '',
                    naming_pattern_id: company.naming_pattern_id || ''
                });
            } else {
                setFormData({
                    id: '',
                    name: '',
                    icon: 'Building2',
                    financial_receipt_prompt: '',
                    financial_payment_prompt: '',
                    naming_pattern_id: ''
                });
            }

            // Fetch available patterns
            fetchPatterns();
        }
    }, [company, isOpen]);

    const fetchPatterns = async () => {
        setLoadingPatterns(true);
        try {
            const result = await getNamingPatterns();
            if (result.success) {
                setAvailablePatterns(result.data.patterns);
            }
        } catch (error) {
            console.error('Erro ao buscar padrões:', error);
        } finally {
            setLoadingPatterns(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.id || !formData.name) {
            toast.error('ID e Nome são obrigatórios');
            return;
        }

        setSaving(true);
        try {
            let result;
            if (isEditing) {
                result = await updateAdminCompany(company.id, formData);
            } else {
                result = await createAdminCompany(formData);
            }

            if (result.success) {
                toast.success(isEditing ? 'Empresa atualizada!' : 'Empresa criada!');
                if (onSuccess) onSuccess();
                onClose();
            } else {
                toast.error(result.error || 'Erro ao salvar empresa');
            }
        } catch (error) {
            console.error('Erro ao salvar empresa:', error);
            toast.error('Erro de conexão');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-dark-900/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-4xl bg-dark-800 border border-dark-600 rounded-[2.5rem] shadow-2xl overflow-hidden my-auto"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-dark-600 flex items-center justify-between bg-gradient-to-r from-dark-800 to-dark-700">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-brand-blue/10 rounded-2xl flex items-center justify-center border border-brand-blue/20">
                                {isEditing ? <Save className="w-7 h-7 text-brand-blue" /> : <Building2 className="w-7 h-7 text-brand-blue" />}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-light-100 uppercase tracking-tighter">
                                    {isEditing ? 'Editar Empresa' : 'Nova Empresa'}
                                </h2>
                                <p className="text-dark-500 font-bold uppercase tracking-widest text-[10px] mt-1">
                                    {isEditing ? `Modificando: ${company.name}` : 'Cadastre uma nova empresa no catálogo'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-dark-600 rounded-2xl text-dark-400 hover:text-light-100 transition-all">
                            <X className="w-7 h-7" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Coluna Esquerda: Dados Básicos */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-dark-400 uppercase tracking-widest mb-2 ml-1">ID Único (Slug)</label>
                                    <input
                                        type="text"
                                        disabled={isEditing}
                                        value={formData.id}
                                        onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                        placeholder="ex: leticia-joias"
                                        className="w-full bg-dark-700 border border-dark-600 rounded-2xl p-4 text-light-100 focus:border-brand-blue/50 outline-none transition-all disabled:opacity-50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-dark-400 uppercase tracking-widest mb-2 ml-1">Nome de Exibição</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Nome da Empresa"
                                        className="w-full bg-dark-700 border border-dark-600 rounded-2xl p-4 text-light-100 focus:border-brand-blue/50 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-dark-400 uppercase tracking-widest mb-4 ml-1">Ícone Visual</label>
                                    <div className="grid grid-cols-4 gap-3">
                                        {AVAILABLE_ICONS.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, icon: item.id })}
                                                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${formData.icon === item.id
                                                    ? 'bg-brand-blue/20 border-brand-blue text-brand-blue shadow-[0_0_15px_rgba(43,153,255,0.2)]'
                                                    : 'bg-dark-700 border-dark-600 text-dark-400 hover:border-dark-500'
                                                    }`}
                                            >
                                                <item.icon className="w-6 h-6" />
                                                <span className="text-[8px] font-bold uppercase">{item.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-dark-400 uppercase tracking-widest mb-2 ml-1">Padrão de Renomeação</label>
                                    <div className="relative">
                                        <select
                                            value={formData.naming_pattern_id}
                                            onChange={(e) => setFormData({ ...formData, naming_pattern_id: e.target.value })}
                                            className="w-full bg-dark-700 border border-dark-600 rounded-2xl p-4 text-light-100 focus:border-brand-blue/50 outline-none transition-all appearance-none cursor-pointer pr-12"
                                        >
                                            <option value="">Padrão Genérico</option>
                                            {availablePatterns.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <Tag className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
                                    </div>
                                    {loadingPatterns && <p className="text-[9px] text-brand-blue animate-pulse mt-1 ml-1 font-bold">Carregando padrões...</p>}
                                </div>
                            </div>

                            {/* Coluna Direita: Prompts */}
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-dark-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                                        Prompt: Contas a Receber
                                        <Info className="w-3 h-3 text-brand-blue" />
                                    </label>
                                    <textarea
                                        value={formData.financial_receipt_prompt}
                                        onChange={(e) => setFormData({ ...formData, financial_receipt_prompt: e.target.value })}
                                        rows={6}
                                        className="w-full bg-dark-700 border border-dark-600 rounded-2xl p-4 text-xs font-mono text-light-200 focus:border-brand-blue/50 outline-none transition-all resize-none custom-scrollbar"
                                        placeholder="Instruções para extração de boletos/comprovantes de venda..."
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-dark-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                                        Prompt: Contas a Pagar
                                        <Info className="w-3 h-3 text-brand-blue" />
                                    </label>
                                    <textarea
                                        value={formData.financial_payment_prompt}
                                        onChange={(e) => setFormData({ ...formData, financial_payment_prompt: e.target.value })}
                                        rows={6}
                                        className="w-full bg-dark-700 border border-dark-600 rounded-2xl p-4 text-xs font-mono text-light-200 focus:border-brand-blue/50 outline-none transition-all resize-none custom-scrollbar"
                                        placeholder="Instruções para extração de notas fiscais, contas de luz/água..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-10 flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
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
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Salvando Dados...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        {isEditing ? 'Atualizar Empresa' : 'Cadastrar Empresa'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
