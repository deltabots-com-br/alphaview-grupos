import React from 'react';
import { LayoutDashboard, Users, MessageSquare, Settings, LogOut, Bell } from 'lucide-react';
import SidebarItem from '../components/SidebarItem';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout = ({ currentUser, companyName, unreadCount, data, setData }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const currentPath = location.pathname;

    const getActive = (path) => {
        if (path === '/') return currentPath === '/';
        return currentPath.startsWith(path);
    };

    const getPageTitle = () => {
        switch (currentPath) {
            case '/': return 'Visão Geral';
            case '/groups': return 'Grupos';
            case '/settings': return 'Configurações';
            case '/chat': return 'Chat';
            default:
                if (currentPath.startsWith('/groups/')) return 'Detalhes';
                return 'Dashboard';
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navigationItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard', badge: null },
        { path: '/chat', icon: MessageSquare, label: 'Chat', badge: unreadCount },
        { path: '/groups', icon: Users, label: 'Grupos', badge: null },
        { path: '/settings', icon: Settings, label: 'Config', badge: null },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-accent-50 md:flex font-sans text-slate-800">
            {/* SIDEBAR DESKTOP */}
            <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 fixed h-full z-10 hidden md:flex flex-col shadow-xl">
                {/* Logo / Brand */}
                <div className="p-6 border-b border-slate-200/60">
                    {/* Logo & Branding */}
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                            <img
                                src="https://cmalphaview.com.br/wp-content/uploads/2025/09/LogoAlpha-1024x331.png"
                                alt={companyName || 'Sistema de Grupos'}
                                className="h-24 w-auto object-contain"
                            />
                        </div>
                        <div className="hidden lg:block border-l border-slate-300 pl-3 w-20">
                            <p className="text-xs text-slate-600 font-medium leading-tight whitespace-nowrap">
                                Gestão de
                            </p>
                            <p className="text-xs text-slate-600 font-medium leading-tight">
                                Grupos
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 overflow-y-auto">
                    <div className="space-y-1">
                        <SidebarItem icon={LayoutDashboard} label="Dashboard" active={getActive('/')} onClick={() => navigate('/')} />
                        <SidebarItem icon={MessageSquare} label="Chat" active={getActive('/chat')} badge={unreadCount} onClick={() => navigate('/chat')} />
                        <SidebarItem icon={Users} label="Grupos" active={getActive('/groups')} onClick={() => navigate('/groups')} />
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">SISTEMA</p>
                        <SidebarItem icon={Settings} label="Configurações" active={getActive('/settings')} onClick={() => navigate('/settings')} />
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 text-slate-600 hover:text-red-600 w-full px-3 py-2 rounded-lg hover:bg-white transition-all text-sm font-medium"
                    >
                        <LogOut size={16} strokeWidth={2.5} />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 md:ml-72 pb-16 md:pb-0 md:p-6 lg:p-8 transition-all duration-300">
                {/* Top Header - Enhanced */}
                <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-5 sticky top-0 z-10 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-base md:text-2xl font-bold text-slate-900 tracking-tight">
                                {getPageTitle()}
                            </h1>
                            <p className="text-[10px] md:text-sm text-slate-600 mt-0.5 font-medium hidden md:block">
                                {companyName || 'Sistema de Grupos'}
                            </p>
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <Bell size={18} className="text-slate-600 hover:text-brand-600 cursor-pointer transition-colors" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-600 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 md:p-0 md:mt-6">
                    <Outlet context={{ data, setData }} />
                </div>
            </main>

            {/* BOTTOM NAVIGATION - MOBILE ONLY */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 shadow-lg safe-area-inset-bottom">
                <div className="flex justify-around items-center px-2 py-2">
                    {navigationItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-all duration-200 ${getActive(item.path)
                                ? 'text-brand-600'
                                : 'text-slate-500'
                                }`}
                        >
                            <div className="relative">
                                <item.icon
                                    size={24}
                                    className={`transition-all ${getActive(item.path) ? 'scale-110' : 'scale-100'
                                        }`}
                                    strokeWidth={getActive(item.path) ? 2.5 : 2}
                                />
                                {item.badge && item.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] font-medium mt-1 ${getActive(item.path) ? 'text-brand-600' : 'text-slate-500'
                                }`}>
                                {item.label}
                            </span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default DashboardLayout;
