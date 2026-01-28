import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Building2, ShiedCheck, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateUserCompanies } from '../../utils/dashboardApi';

/**
 * Modal para gerenciar empresas permitidas para um usuário
 */
export default function CompanyPermissionModal({ isOpen, onClose, user, availableCompanies = [], onUpdate }) {
    const [selectedCompanies, setSelectedCompanies] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user && user.allowed_companies) {
            setSelectedCompanies(user.allowed_companies);
        } else {
            setSelectedCompanies([]);
        }
    }, [user, isOpen]);

    if (!isOpen || !user) return null;

    const handleToggleCompany = (companyId) => {
        setSelectedCompanies(prev =>
            prev.includes(companyId)
                ? prev.filter(id => id !== companyId)
                : [...prev, companyId]
        );
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
                    className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-dark-800 border border-dark-600 rounded-[2.5rem] shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-dark-600 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center border border-brand-blue/20">
                                <Building2 className="w-6 h-6 text-brand-blue" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-light-100 uppercase tracking-tighter">Permissões de Empresa</h2>
                                <p className="text-dark-500 font-bold uppercase tracking-widest text-[9px] mt-1">Configurando acesso para: {user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-dark-700 rounded-xl text-dark-400 hover:text-light-100 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 gap-3">
                            {availableCompanies.length === 0 ? (
                                <div className="text-center py-10 text-dark-500 italic text-sm">
                                    Nenhuma empresa configurada no sistema.
                                </div>
                            ) : (
                                availableCompanies.map(company => {
                                    const isSelected = selectedCompanies.includes(company.id);
                                    return (
                                        <button
                                            key={company.id}
                                            onClick={() => handleToggleCompany(company.id)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isSelected
                                                    ? 'bg-brand-blue/10 border-brand-blue/50 text-light-100'
                                                    : 'bg-dark-700/50 border-dark-600/50 text-dark-400 hover:border-dark-500'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand-blue text-white' : 'bg-dark-600 text-dark-500'}`}>
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold text-sm uppercase tracking-tight">{company.name}</span>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isSelected
                                                    ? 'bg-brand-blue border-brand-blue text-white'
                                                    : 'border-dark-500 bg-transparent'
                                                }`}>
                                                {isSelected && <Check className="w-3.5 h-3.5" />}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 bg-dark-800/50 border-t border-dark-600 flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-dark-700 hover:bg-dark-600 text-dark-300 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-[2] py-4 bg-brand-blue hover:bg-brand-blue/90 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Salvar Alterações
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
