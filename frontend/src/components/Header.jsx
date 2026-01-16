import { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LogOut, LayoutDashboard, MessageSquare, Home,
    ChevronRight, Settings, Menu, X
} from 'lucide-react';
import { AuthContext } from '../App';

export default function Header({ title }) {
    const { user, logout, isMaster } = useContext(AuthContext);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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

    if (isMaster) {
        navItems.push({ label: 'Painel Master', path: '/dashboard', icon: Settings, primary: true });
    }

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <header className="bg-dark-800/80 backdrop-blur-md border-b border-dark-600 sticky top-0 z-50">
            <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
                {/* Mobile Menu Button */}
                <button
                    onClick={toggleMenu}
                    className="p-2 lg:hidden text-dark-400 hover:text-light-100 hover:bg-dark-700/50 rounded-xl transition-all"
                >
                    {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>

                {/* Logo Section */}
                <div className="flex items-center gap-4 flex-1">
                    <img
                        src="/logo.png"
                        alt="Logo"
                        className="h-8 md:h-9 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
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

                {/* User Section (Right) */}
                <div className="flex items-center justify-end gap-3 flex-1 lg:flex-initial">
                    <div className="hidden sm:flex flex-col items-end mr-2">
                        <span className="text-[10px] font-black text-light-100 leading-none">{user?.name || user?.email?.split('@')[0]}</span>
                        <span className="text-[8px] font-bold text-dark-500 uppercase tracking-widest mt-1">
                            {isMaster ? 'Diretor Master' : 'Analista BPO'}
                        </span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="p-2.5 text-dark-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all group lg:block hidden"
                        title="Sair"
                    >
                        <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Logout icon small only for mobile if needed, or keeping it hidden to focus on sidebar */}
                    <button
                        onClick={handleLogout}
                        className="p-2 text-dark-500 lg:hidden"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Drawer */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[51] lg:hidden"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 bottom-0 w-[280px] bg-[#0f0f0f] border-r border-dark-600 z-[52] lg:hidden p-6 flex flex-col shadow-2xl backdrop-blur-xl"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
                                <button
                                    onClick={() => setIsMenuOpen(false)}
                                    className="p-2 text-dark-400"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="mb-8">
                                <span className="text-[10px] font-black text-dark-500 uppercase tracking-[0.2em] mb-4 block">Navegação</span>
                                <div className="space-y-2">
                                    {navItems.map((item) => {
                                        const isActive = location.pathname === item.path;
                                        const Icon = item.icon;

                                        return (
                                            <button
                                                key={item.path}
                                                onClick={() => {
                                                    navigate(item.path);
                                                    setIsMenuOpen(false);
                                                }}
                                                className={`
                                                    w-full flex items-center gap-4 px-4 py-3 rounded-xl text-[12px] font-bold transition-all
                                                    ${isActive
                                                        ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                                                        : 'text-dark-300 hover:bg-dark-800'
                                                    }
                                                `}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {item.label}
                                                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-auto pt-6 border-t border-dark-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-full bg-dark-800 border border-dark-600 flex items-center justify-center">
                                        <span className="text-[14px] font-black text-brand-blue uppercase">
                                            {(user?.name || user?.email || 'U')[0]}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-black text-light-100 leading-none mb-1">{user?.name || user?.email?.split('@')[0]}</p>
                                        <p className="text-[10px] font-bold text-dark-500 uppercase tracking-widest">
                                            {isMaster ? 'Diretor Master' : 'Analista BPO'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 text-[12px] font-black uppercase tracking-wider hover:bg-red-500/20 transition-all border border-red-500/20"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sair da Conta
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
}
