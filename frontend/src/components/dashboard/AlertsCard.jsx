import { motion } from 'framer-motion';
import { AlertTriangle, FileText, Clock } from 'lucide-react';

/**
 * Card de Alertas de Auditoria
 * Exibe resumo de alertas detectados nas análises da IA
 */
export default function AlertsCard({ alerts, className = '' }) {
    if (!alerts || alerts.total === 0) {
        return (
            <div className={`glass rounded-3xl p-8 ${className}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-light-100 uppercase tracking-widest">Auditoria de Qualidade</h3>
                        <p className="text-[10px] text-dark-500 font-medium mt-1">Nenhum alerta detectado</p>
                    </div>
                </div>
                <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                        <AlertTriangle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-sm text-light-200 font-medium">Todas as análises estão limpas!</p>
                    <p className="text-xs text-dark-500 mt-2">Nenhum problema detectado pela auditoria automática.</p>
                </div>
            </div>
        );
    }

    const topAlerts = Object.entries(alerts.byAlertType || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass rounded-3xl p-8 ${className}`}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-light-100 uppercase tracking-widest">Auditoria de Qualidade</h3>
                        <p className="text-[10px] text-dark-500 font-medium mt-1">Alertas detectados nas análises</p>
                    </div>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                    <span className="text-xs font-bold text-red-400">{alerts.total}</span>
                </div>
            </div>

            <div className="space-y-4">
                {/* Top Alertas */}
                {topAlerts.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold text-dark-500 uppercase tracking-widest mb-3">Problemas mais comuns</p>
                        <div className="space-y-2">
                            {topAlerts.map(([alertType, count], index) => (
                                <motion.div
                                    key={alertType}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center justify-between p-3 rounded-xl bg-dark-700/50 border border-dark-600/50 hover:border-red-500/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                                        <span className="text-xs text-light-200 truncate">{alertType}</span>
                                    </div>
                                    <span className="text-xs font-bold text-red-400 ml-3 flex-shrink-0">{count}x</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Alertas Recentes */}
                {alerts.recentAlerts && alerts.recentAlerts.length > 0 && (
                    <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] font-bold text-dark-500 uppercase tracking-widest mb-3">Alertas Recentes</p>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {alerts.recentAlerts.map((alert, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: (topAlerts.length + index) * 0.1 }}
                                    className="p-3 rounded-xl bg-dark-700/30 border border-dark-600/30"
                                >
                                    <div className="flex items-start gap-2 mb-2">
                                        <FileText className="w-3.5 h-3.5 text-dark-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-light-100 truncate">{alert.fileName}</p>
                                            <p className="text-[10px] text-dark-500 mt-0.5">{alert.company}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {alert.alerts && alert.alerts.map((a, i) => (
                                            <span
                                                key={i}
                                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-medium"
                                            >
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                    {alert.timestamp && (
                                        <div className="flex items-center gap-1 mt-2 text-[10px] text-dark-500">
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(alert.timestamp).toLocaleString('pt-BR', { 
                                                day: '2-digit', 
                                                month: '2-digit', 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}</span>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
