import { useState } from 'react';
import { Calendar, X } from 'lucide-react';

/**
 * Seletor de período customizado
 */
export default function DateRangePicker({ startDate, endDate, onChange, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);

    const handleStartChange = (e) => {
        onChange({
            startDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
            endDate
        });
    };

    const handleEndChange = (e) => {
        onChange({
            startDate,
            endDate: e.target.value ? `${e.target.value}T23:59:59.999Z` : null
        });
    };

    const clearDates = () => {
        onChange({ startDate: null, endDate: null });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/5 rounded-2xl text-light-200 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95 group shadow-soft"
            >
                <Calendar className="w-4 h-4 text-brand-blue group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest">
                    {startDate && endDate
                        ? `${formatDate(startDate)} — ${formatDate(endDate)}`
                        : 'Filtrar Período'}
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-4 glass p-6 shadow-glow-lg z-50 min-w-[380px] origin-top-right animate-scale-in rounded-[2rem]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-brand-blue" />
                            <h3 className="text-xs font-bold text-light-100 uppercase tracking-widest">Definir Intervalo</h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 text-dark-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-dark-500 uppercase tracking-[0.15em] ml-1">
                                Início
                            </label>
                            <input
                                type="date"
                                value={formatDate(startDate)}
                                onChange={handleStartChange}
                                className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-2xl text-xs text-light-100 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-dark-500 uppercase tracking-[0.15em] ml-1">
                                Término
                            </label>
                            <input
                                type="date"
                                value={formatDate(endDate)}
                                onChange={handleEndChange}
                                className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-2xl text-xs text-light-100 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8 pt-6 border-t border-white/5">
                        <button
                            onClick={clearDates}
                            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-light-200 transition-all active:scale-95"
                        >
                            Limpar
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex-1 px-4 py-3 bg-brand-blue hover:bg-brand-blue-dark shadow-glow rounded-xl text-[10px] font-bold uppercase tracking-widest text-white transition-all active:scale-95"
                        >
                            Aplicar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
