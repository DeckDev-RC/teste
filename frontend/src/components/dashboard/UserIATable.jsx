import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, User, Cpu } from 'lucide-react';

/**
 * Tabela de estatísticas de Usuário x IA (quem usa qual provedor)
 */
export default function UserIATable({ data = [], className = '' }) {
    const [sortField, setSortField] = useState('totalAnalyses');
    const [sortDirection, setSortDirection] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const sortedData = useMemo(() => {
        const sorted = [...data].sort((a, b) => {
            const aVal = a[sortField] || 0;
            const bVal = b[sortField] || 0;

            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        return sorted;
    }, [data, sortField, sortDirection]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(start, start + itemsPerPage);
    }, [sortedData, currentPage]);

    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4 inline ml-1" />
            : <ChevronDown className="w-4 h-4 inline ml-1" />;
    };

    if (data.length === 0) {
        return (
            <div className={`glass rounded-3xl p-8 ${className}`}>
                <div className="flex items-center justify-center h-[200px]">
                    <p className="text-dark-500 text-sm">Nenhum dado disponível</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`glass rounded-3xl p-8 overflow-hidden ${className}`}>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                    <Cpu className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-light-100 uppercase tracking-widest">Uso por Usuário e IA</h3>
                    <p className="text-[10px] text-dark-500 font-medium mt-1">Rastreamento detalhado de qual IA cada usuário utiliza</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-dark-600/50">
                            <th
                                className="text-left py-4 px-4 text-[10px] font-bold text-dark-500 uppercase tracking-widest cursor-pointer hover:text-brand-blue group transition-colors"
                                onClick={() => handleSort('userEmail')}
                            >
                                <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    Usuário
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <SortIcon field="userEmail" />
                                    </div>
                                </div>
                            </th>
                            <th
                                className="text-left py-4 px-4 text-[10px] font-bold text-dark-500 uppercase tracking-widest cursor-pointer hover:text-brand-blue group transition-colors"
                                onClick={() => handleSort('providerName')}
                            >
                                <div className="flex items-center gap-1">
                                    <Cpu className="w-3 h-3" />
                                    Provedor IA
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <SortIcon field="providerName" />
                                    </div>
                                </div>
                            </th>
                            <th
                                className="text-right py-4 px-4 text-[10px] font-bold text-dark-500 uppercase tracking-widest cursor-pointer hover:text-brand-blue group transition-colors"
                                onClick={() => handleSort('totalAnalyses')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Total
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <SortIcon field="totalAnalyses" />
                                    </div>
                                </div>
                            </th>
                            <th
                                className="text-right py-4 px-4 text-[10px] font-bold text-dark-500 uppercase tracking-widest cursor-pointer hover:text-brand-blue group transition-colors"
                                onClick={() => handleSort('successRate')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Taxa Sucesso
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <SortIcon field="successRate" />
                                    </div>
                                </div>
                            </th>
                            <th
                                className="text-right py-4 px-4 text-[10px] font-bold text-dark-500 uppercase tracking-widest cursor-pointer hover:text-brand-blue group transition-colors"
                                onClick={() => handleSort('avgProcessingTime')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Tempo Médio
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <SortIcon field="avgProcessingTime" />
                                    </div>
                                </div>
                            </th>
                            <th
                                className="text-right py-4 px-4 text-[10px] font-bold text-dark-500 uppercase tracking-widest"
                            >
                                Empresas
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-600/30">
                        {paginatedData.map((item, index) => (
                            <tr key={`${item.userId}_${item.provider}_${index}`} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 px-4">
                                    <div>
                                        <span className="text-sm font-medium text-light-100 group-hover:text-brand-blue transition-colors block">
                                            {item.userEmail}
                                        </span>
                                        {item.userName !== 'N/A' && (
                                            <span className="text-xs text-dark-500">{item.userName}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold">
                                        {item.providerName}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <span className="text-sm font-semibold text-light-100">
                                        {item.totalAnalyses?.toLocaleString('pt-BR') || 0}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <span className={`text-sm font-semibold ${item.successRate >= 95 ? 'text-emerald-400' : item.successRate >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {item.successRate?.toFixed(1) || '0.0'}%
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <span className="text-xs text-dark-500">
                                        {item.avgProcessingTime ? `${(item.avgProcessingTime / 1000).toFixed(2)}s` : '—'}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <div className="flex flex-wrap gap-1 justify-end">
                                        {Object.entries(item.byCompany || {}).slice(0, 2).map(([company, count]) => (
                                            <span key={company} className="text-[10px] px-1.5 py-0.5 rounded bg-dark-700/50 text-dark-500">
                                                {company}: {count}
                                            </span>
                                        ))}
                                        {Object.keys(item.byCompany || {}).length > 2 && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-700/50 text-dark-500">
                                                +{Object.keys(item.byCompany || {}).length - 2}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-600/50">
                    <p className="text-[10px] font-bold text-dark-500 uppercase tracking-widest">
                        Página {currentPage} de {totalPages} ({data.length} registros)
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 bg-dark-700/50 border border-dark-600/50 rounded-xl text-light-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-dark-600 hover:border-brand-blue/50 transition-all"
                        >
                            <ChevronUp className="w-5 h-5 -rotate-90" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 bg-dark-700/50 border border-dark-600/50 rounded-xl text-light-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-dark-600 hover:border-brand-blue/50 transition-all"
                        >
                            <ChevronDown className="w-5 h-5 -rotate-90" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
