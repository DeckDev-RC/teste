import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Card reutilizável para exibir métricas
 * @param {Object} props
 * @param {string} props.title - Título do card
 * @param {number|string} props.value - Valor a exibir
 * @param {React.ComponentType} props.icon - Componente de ícone (do lucide-react)
 * @param {number} [props.change] - Variação percentual (opcional)
 * @param {string} [props.changeLabel] - Label da variação (opcional)
 * @param {string} [props.color] - Cor do tema (blue, green, red, purple, amber)
 * @param {string} [props.className] - Classes CSS adicionais
 */
export default function StatsCard({
    title,
    value,
    icon: Icon,
    change,
    changeLabel,
    color = 'blue',
    className = ''
}) {
    const colorClasses = {
        blue: 'border-brand-blue/20 bg-brand-blue/10 text-brand-blue shadow-[0_0_20px_rgba(56,182,255,0.15)]',
        green: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]',
        red: 'border-red-500/20 bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]',
        purple: 'border-purple-500/20 bg-purple-500/10 text-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.1)]',
        amber: 'border-amber-500/20 bg-amber-500/10 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
    };

    const selectedColor = colorClasses[color] || colorClasses.blue;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5, scale: 1.02 }}
            className={`glass rounded-3xl p-6 transition-all duration-300 hover:shadow-glow-lg group ${className}`}
        >
            <div className="flex items-center justify-between mb-5">
                <div className={`p-3.5 rounded-2xl border ${selectedColor} group-hover:scale-110 transition-transform duration-300`}>
                    {Icon && <Icon className="w-6 h-6" />}
                </div>
                {change !== undefined && (
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                    >
                        {change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {Math.abs(change)}%
                    </motion.div>
                )}
            </div>
            <div className="space-y-1">
                <p className="text-dark-500 text-[10px] font-bold uppercase tracking-[0.15em]">{title}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-light-100 tracking-tight">
                        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
                    </p>
                    {changeLabel && <span className="text-dark-500 text-[10px] uppercase font-medium">{changeLabel}</span>}
                </div>
            </div>
        </motion.div>
    );
}
