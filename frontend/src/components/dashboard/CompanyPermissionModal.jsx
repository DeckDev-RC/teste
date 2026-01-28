import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Check, Building2, ShieldCheck, Loader2, Save, Search,
    Gem, Zap, Factory, Store, BarChart3, Building, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { updateUserCompanies } from '../../utils/dashboardApi';

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

/**
 * Modal para gerenciar empresas permitidas para um usuário
 */
export default function CompanyPermissionModal({ isOpen, onClose, user, availableCompanies = [], onUpdate }) {
    const [selectedCompanies, setSelectedCompanies] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user && user.allowed_companies) {
            setSelectedCompanies(user.allowed_companies);
        } else {
            setSelectedCompanies([]);
        }
    }, [user, isOpen]);

    const filteredCompanies = useMemo(() => {
        return availableCompanies.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [availableCompanies, searchTerm]);

    if (!isOpen || !user) return null;

    const handleToggleCompany = (companyId) => {
        setSelectedCompanies(prev =>
            prev.includes(companyId)
                ? prev.filter(id => id !== companyId)
                : [...prev, companyId]
        );
    };

    const handleSelectAll = () => {
        if (selectedCompanies.length === availableCompanies.length) {
            setSelectedCompanies([]);
        } else {
            setSelectedCompanies(availableCompanies.map(c => c.id));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await updateUserCompanies(user.id || user.userId, selectedCompanies);
            if (result.success) {
                toast.success('Permissões atualizadas com sucesso!');
                if (onUpdate) onUpdate(user.id || user.userId, selectedCompanies);
                onClose();
            } else {
                toast.error(result.error || 'Erro ao atualizar permissões');
            }
        } catch (error) {
            console.error('Erro ao salvar permissões:', error);
            toast.error('Erro ao conectar com o servidor');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-dark-900/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-4xl bg-dark-800 border border-dark-600 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-dark-600 flex items-center justify-between bg-gradient-to-r from-dark-800 to-dark-700">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-brand-blue/10 rounded-2xl flex items-center justify-center border border-brand-blue/20">
                                <ShieldCheck className="w-7 h-7 text-brand-blue" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-light-100 uppercase tracking-tighter">Atribuir Empresas</h2>
                                <p className="text-dark-500 font-bold uppercase tracking-widest text-[10px] mt-1">
                                    Usuário: <span className="text-brand-blue">{user.name || user.email}</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-dark-600 rounded-2xl text-dark-400 hover:text-light-100 transition-all"
                        >
                            <X className="w-7 h-7" />
                        </button>
                    </div>

                    {/* Controls */}
                    <div className="px-8 py-4 border-b border-dark-600 flex flex-col sm:flex-row items-center justify-between gap-4 bg-dark-800/50">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                            <input
                                type="text"
                                placeholder="Filtrar empresas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-dark-700 border border-dark-600 rounded-xl pl-11 pr-4 py-2 text-xs text-light-100 focus:border-brand-blue/50 outline-none transition-all placeholder:text-dark-500 font-bold uppercase tracking-widest"
                            />
                        </div>
                        <button
                            onClick={handleSelectAll}
                            className="text-[10px] font-black uppercase tracking-widest text-brand-blue hover:text-brand-blue/80 transition-colors"
                        >
                            {selectedCompanies.length === availableCompanies.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                        </button>
                    </div>

                    {/* Content (Grid of Cards) */}
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                        {filteredCompanies.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <Building2 className="w-12 h-12 text-dark-600 mb-4" />
                                <p className="text-dark-500 font-bold uppercase tracking-widest text-xs">Nenhuma empresa disponível</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredCompanies.map(company => {
                                    const isSelected = selectedCompanies.includes(company.id);
                                    const Icon = ICON_MAP[company.icon] || ICON_MAP['default'];

                                    return (
                                        <button
                                            key={company.id}
                                            onClick={() => handleToggleCompany(company.id)}
                                            className={`relative flex flex-col p-6 rounded-[2rem] border-2 transition-all text-left group ${isSelected
                                                    ? 'bg-brand-blue/10 border-brand-blue shadow-[0_0_20px_rgba(43,153,255,0.1)]'
                                                    : 'bg-dark-700/50 border-dark-600 hover:border-dark-500'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${isSelected
                                                        ? 'bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20'
                                                        : 'bg-dark-600 border-dark-500 text-dark-400 group-hover:text-light-200'
                                                    }`}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-blue border-brand-blue text-white' : 'border-dark-500'
                                                    }`}>
                                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                                </div>
                                            </div>
                                            <h3 className={`font-black uppercase tracking-tighter text-sm mb-1 ${isSelected ? 'text-light-100' : 'text-dark-300'
                                                }`}>
                                                {company.name}
                                            </h3>
                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'text-brand-blue' : 'text-dark-500'
                                                }`}>
                                                {isSelected ? 'Acesso Permitido' : 'Sem Acesso'}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-8 bg-dark-800/80 border-t border-dark-600 flex flex-col sm:flex-row gap-4 items-center">
                        <div className="flex-1 text-center sm:text-left">
                            <p className="text-[10px] font-black text-dark-500 uppercase tracking-widest leading-none mb-1">Empresas Selecionadas</p>
                            <span className="text-xl font-black text-brand-blue tracking-tighter">
                                {selectedCompanies.length} <span className="text-xs text-dark-400 uppercase tracking-widest">Atribuídas</span>
                            </span>
                        </div>
                        <div className="flex gap-4 w-full sm:w-auto">
                            <button
                                onClick={onClose}
                                className="flex-1 sm:px-10 py-4 bg-dark-700 hover:bg-dark-600 text-dark-300 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all border border-dark-600"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-[2] sm:px-12 py-4 bg-brand-blue hover:bg-brand-blue/90 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-brand-blue/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sincronizando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Salvar Permissões
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
