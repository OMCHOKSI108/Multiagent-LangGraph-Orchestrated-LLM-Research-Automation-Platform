import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu, X } from 'lucide-react';

import { SettingsModal } from './SettingsModal';

export const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen w-full bg-white dark:bg-dark-primary overflow-hidden font-sans">
            <SettingsModal />

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - hidden on mobile, shown on desktop */}
            <div className={`
                fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-dark-primary transition-all duration-300">
                {/* Mobile header with hamburger */}
                <div className="lg:hidden flex items-center h-14 px-4 border-b border-zinc-200 dark:border-dark-300 bg-white/80 dark:bg-dark-secondary/80 backdrop-blur-sm sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-dark-200 rounded-md transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="ml-3 font-semibold text-sm text-zinc-900 dark:text-zinc-100">DeepResearch</span>
                </div>
                <Outlet />
            </div>
        </div>
    );
};
