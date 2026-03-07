import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    LayoutDashboard,
    Users,
    Search,
    Bot,
    BarChart3,
    FolderKanban,
    MessageSquare,
    Database,
    ShieldCheck,
    LogOut
} from 'lucide-react';

const SIDEBAR_WIDTH = 220;

const NAV_LINKS = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Research', path: '/admin/research', icon: Search },
    { name: 'Agents', path: '/admin/agents', icon: Bot },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Workspaces', path: '/admin/workspaces', icon: FolderKanban },
    { name: 'Chat', path: '/admin/chat', icon: MessageSquare },
    { name: 'Vector Store', path: '/admin/vectorstore', icon: Database },
    { name: 'Security', path: '/admin/security', icon: ShieldCheck },
];

export const AdminLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('dr_admin_auth');
        toast.success('Admin session terminated');
        navigate('/login');
    };

    // Find the exact name of the current path to show in the header
    const currentNav = NAV_LINKS.find(link => location.pathname === link.path || (link.path !== '/admin' && location.pathname.startsWith(link.path)));
    const pageTitle = currentNav ? currentNav.name : 'System Panel';

    return (
        <div className="flex h-screen w-full bg-[#FAF9F6] text-[#1A1915] font-sans">

            {/* Sidebar - Fixed and Dark */}
            <aside
                style={{ width: `${SIDEBAR_WIDTH}px` }}
                className="fixed top-0 left-0 h-full bg-[#1A1915] text-[#FAF9F6] shadow-2xl z-50 flex flex-col"
            >
                {/* Header */}
                <div className="h-16 flex items-center px-6 border-b border-[#FAF9F6]/10">
                    <div className="w-6 h-6 rounded bg-[#D97757] flex items-center justify-center mr-3">
                        <Bot size={14} className="text-white" />
                    </div>
                    <span className="font-bold tracking-wide text-sm">DeepResearch OS</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1 px-3">
                    <div className="px-3 mb-2 text-[10px] font-bold tracking-widest text-[#FAF9F6]/40 uppercase">
                        Surveillance
                    </div>

                    {NAV_LINKS.map((link) => {
                        const isActive = location.pathname === link.path || (link.path !== '/admin' && location.pathname.startsWith(link.path));

                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all relative ${isActive
                                    ? 'text-[#D97757] bg-[#D97757]/10 font-medium'
                                    : 'text-[#FAF9F6]/60 hover:text-[#FAF9F6] hover:bg-[#FAF9F6]/5'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D97757] rounded-r-full" />
                                )}
                                <link.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Status Panel */}
                <div className="p-4 border-t border-[#FAF9F6]/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#D97757]/20 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck size={16} className="text-[#D97757]" />
                        </div>
                        <div className="flex flex-col truncate">
                            <span className="text-xs font-medium text-white">omchoksiadmin</span>
                            <span className="text-[10px] text-[#FAF9F6]/50 truncate">Super Admin</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main
                className="flex-1 flex flex-col h-full overflow-hidden"
                style={{ marginLeft: `${SIDEBAR_WIDTH}px` }}
            >
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
                        <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 flex items-center gap-1.5 uppercase tracking-wider">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                            ADMIN MODE
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 hover:bg-gray-100 rounded-md"
                    >
                        <LogOut size={16} />
                        Secure Logout
                    </button>
                </header>

                {/* Page Content Viewport */}
                <div className="flex-1 overflow-auto p-8 relative">
                    <div className="max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </div>
            </main>

        </div>
    );
};
