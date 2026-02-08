import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

interface LayoutProps {
    children?: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    return (
        <div className="flex h-screen w-full bg-background font-sans overflow-hidden">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 flex-shrink-0 z-20">
                <Sidebar />
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <div className="flex-1 overflow-y-auto scroll-smooth">
                    {children || <Outlet />}
                </div>
            </main>
        </div>
    );
};
