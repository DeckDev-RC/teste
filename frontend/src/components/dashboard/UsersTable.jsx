import { useState, useMemo, useEffect } from 'react';
import { ChevronUp, ChevronDown, ShieldCheck, Settings } from 'lucide-react';
import CompanyPermissionModal from './CompanyPermissionModal';
import { authenticatedFetch } from '../../utils/api';

/**
 * Tabela de usuários com paginação e ordenação
 */
export default function UsersTable({ users = [], className = '' }) {
    const [sortField, setSortField] = useState('creditsUsed');
    const [sortDirection, setSortDirection] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [availableCompanies, setAvailableCompanies] = useState([]);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const response = await authenticatedFetch('/api/companies');
                const data = await response.json();
                if (data.success) {
                    setAvailableCompanies(data.data.companies || []);
                }
            } catch (error) {
                console.error('Erro ao buscar empresas:', error);
            }
        };
        fetchCompanies();
    }, []);

    const sortedUsers = useMemo(() => {
        const sorted = [...users].sort((a, b) => {
            const aVal = a[sortField] || 0;
            const bVal = b[sortField] || 0;

            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        return sorted;
    }, [users, sortField, sortDirection]);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedUsers.slice(start, start + itemsPerPage);
    }, [sortedUsers, currentPage]);

    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

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

    if (users.length === 0) {
        return (
            <div className={`glass rounded-3xl p-8 ${className}`}>
                <div className="flex items-center justify-center h-[200px]">
                    <p className="text-dark-500 text-sm">Nenhum usuário encontrado</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`glass rounded-3xl p-8 overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-dark-600/50">
                            <th
                                className="text-left py-4 px-4 text-[10px] font-bold text-dark-500 uppercase tracking-widest cursor-pointer hover:text-brand-blue group transition-colors"
                                onClick={() => handleSort('email')}
                            >
                                <div className="flex items-center gap-1">
                                    Email
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <SortIcon field="email" />
                                    </div>
                                </div>
                            </th>
                            <th
                                className="text-left py-4 px-4 text-[10px] font-bold text-dark-500 uppercase tracking-widest cursor-pointer hover:text-brand-blue group transition-colors"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center gap-1">
                                    Nome
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <SortIcon field="name" />
                                    </div>
                                </div>
                            </th>
                            <th
                                className="text-right py-4 px-4 text-[10px] font-bold text-dark-500 uppercase tracking-widest cursor-pointer hover:text-brand-blue group transition-colors"
                                onClick={() => handleSort('creditsUsed')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Uso
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <SortIcon field="creditsUsed" />
                                    </div>
                                </div>
                            </th>
                            <th
                                className="text-right py-4 px-4 text-[10px] font-bold text-dark-500 uppercase tracking-widest cursor-pointer hover:text-brand-blue group transition-colors"
                                onClick={() => handleSort('creditsLimit')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Limite
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <SortIcon field="creditsLimit" />
                                    </div>
                                </div>
                            </th>
                            <th
                                className="text-right py-4 px-4 text-[10px] font-bold text-dark-500 uppercase tracking-widest cursor-pointer hover:text-brand-blue group transition-colors"
                                onClick={() => handleSort('creditsRemaining')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Saldo
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <SortIcon field="creditsRemaining" />
                                    </div>
                                </div>
                            </th>
                            <th className="text-right py-4 px-4 text-[10px] font-bold text-dark-500 uppercase tracking-widest">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-600/30">
                        {paginatedUsers.map((user, index) => (
                            <tr key={user.userId || index} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 px-4">
                                    <span className="text-sm font-medium text-light-100 group-hover:text-brand-blue transition-colors">
                                        {user.email}
                                    </span>
                                </td>
                                <td className="py-4 px-4">
                                    <span className="text-sm text-dark-500">
                                        {user.name || '—'}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <span className="text-sm font-semibold text-light-100">
                                        {user.creditsUsed?.toLocaleString('pt-BR') || 0}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <span className="text-xs font-medium text-dark-500">
                                        {user.creditsLimit?.toLocaleString('pt-BR') || 0}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right text-xs">
                                    <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-dark-700/50 border border-dark-600/50">
                                        <span className={`font-bold ${user.creditsRemaining > (user.creditsLimit * 0.2) ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {user.creditsRemaining?.toLocaleString('pt-BR') || 0}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <button
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setIsPermissionModalOpen(true);
                                        }}
                                        className="p-2 hover:bg-brand-blue/10 rounded-lg text-dark-400 hover:text-brand-blue transition-all border border-transparent hover:border-brand-blue/30 group/btn"
                                        title="Gerenciar Permissões"
                                    >
                                        <ShieldCheck className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <CompanyPermissionModal
                isOpen={isPermissionModalOpen}
                onClose={() => setIsPermissionModalOpen(false)}
                user={selectedUser}
                availableCompanies={availableCompanies}
                onUpdate={(userId, allowedCompanies) => {
                    // Atualizar localmente o estado se necessário (opcional, já que o pai recarrega)
                }}
            />

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-600/50">
                    <p className="text-[10px] font-bold text-dark-500 uppercase tracking-widest">
                        Página {currentPage} de {totalPages}
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
