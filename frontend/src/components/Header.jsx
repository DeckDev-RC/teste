import { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LogOut, LayoutDashboard, MessageSquare, Home,
    ChevronRight, Settings
} from 'lucide-react';
import { AuthContext } from '../App';

export default function Header({ title }) {
    const { user, logout, isMaster } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { label: 'Início', path: '/', icon: Home },
        { label: 'Dashboard Usuário', path: '/user-dashboard', icon: LayoutDashboard },
        { label: 'WhatsApp', path: '/whatsapp', icon: MessageSquare },
    ];

    // Adiciona Painel Master se for master
    if (isMaster) {
        navItems.push({ label: 'Painel Master', path: '/dashboard', icon: Settings, primary: true });
    }

    return (
        <header className="bg-dark-800/80 backdrop-blur-md border-b border-dark-600 sticky top-0 z-50">
            <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo Section */}
                <div className="flex items-center gap-4 flex-1">
                    <img
                        src="/logo.png"
                        alt="Logo"
                        className="h-9 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate('/')}
                    />
                    <div className="h-6 w-[1px] bg-dark-600 hidden md:block"></div>
                    <span className="font-black text-light-100 uppercase tracking-[0.2em] text-[10px] hidden md:block opacity-60">
                        {title || 'Plataforma BPO'}
                    </span>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center bg-dark-900/50 p-1 rounded-2xl border border-dark-600">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all
                                    ${isActive
                                        ? item.primary
                                            ? 'bg-brand-blue text-white shadow-[0_4px_12px_rgba(43,153,255,0.3)]'
                                            : 'bg-dark-700 text-light-100 border border-dark-600'
                                        : 'text-dark-400 hover:text-light-200 hover:bg-dark-800/50'
                                    }
                                `}
                            >
                                <Icon className={`w-3.5 h-3.5 ${isActive && !item.primary ? 'text-brand-blue' : ''}`} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="flex items-center justify-end gap-3 flex-1">
                    <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-black text-light-100 leading-none">{user?.name || user?.email?.split('@')[0]}</span>
                        <span className="text-[8px] font-bold text-dark-500 uppercase tracking-widest mt-1">
                            {isMaster ? 'Diretor Master' : 'Analista BPO'}
                        </span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="p-2.5 text-dark-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all group"
                        title="Sair"
                    >
                        <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Mobile Navigation (Bottom) - Optional or simplified */}
        </header>
    );
}
