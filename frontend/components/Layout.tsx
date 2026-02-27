import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Sparkles, User, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useResearchStore } from '../store';
import { Button } from './ui/button';

interface LayoutProps {
    children?: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isWorkspace = location.pathname.startsWith('/research/');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const { user, logout } = useResearchStore();

    useEffect(() => {
        setIsDrawerOpen(false);
        setIsProfileOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsDrawerOpen(false);
                setIsProfileOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        const onMouseDown = (event: MouseEvent) => {
            if (!dropdownRef.current) return;
            if (!dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, []);

    const firstLetter = user?.name?.trim()?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';

    return (
        <div className="flex h-screen w-full bg-bg font-sans overflow-hidden">
            <header className="sticky top-0 z-50 h-16 border-b border-[var(--color-border)] bg-[var(--color-bg-sec)] backdrop-blur-sm">
                <div className="flex h-full w-full items-center justify-between px-3 sm:px-4 lg:px-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                        {!isWorkspace && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden h-9 w-9"
                                    onClick={() => setIsDrawerOpen(true)}
                                    aria-label="Open navigation drawer"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hidden md:inline-flex h-9 w-9"
                                    onClick={() => setIsDesktopSidebarOpen((prev) => !prev)}
                                    aria-label={isDesktopSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                                    title={isDesktopSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </>
                        )}

                        <Link to="/dashboard" className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 hover:bg-surface2">
                            <span className="font-display font-bold tracking-tight text-text-c">Deep</span>
                            <span className="font-display font-bold tracking-tight text-accent">Research</span>
                        </Link>

                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeSwitcher />
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsProfileOpen((prev) => !prev)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-haspopup="menu"
                                aria-expanded={isProfileOpen}
                                aria-label="Open profile menu"
                            >
                                {firstLetter}
                            </button>

                            {isProfileOpen && (
                                <div
                                    role="menu"
                                    className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-card p-1 shadow-lg"
                                >
                                    <button
                                        role="menuitem"
                                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent focus-visible:outline-none"
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            navigate('/profile');
                                        }}
                                    >
                                        <User className="h-4 w-4" />
                                        View Profile
                                    </button>
                                    <button
                                        role="menuitem"
                                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent focus-visible:outline-none"
                                        onClick={() => {
                                            setIsProfileOpen(false);
                                            logout();
                                            navigate('/login');
                                        }}
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Persistent Desktop Sidebar (non-workspace screens) */}
            {!isWorkspace && isDesktopSidebarOpen && (
                <aside className="hidden md:block w-[260px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-sec)]">
                    <Sidebar className="w-full h-full border-r-0" />
                </aside>
            )}

            {/* Sidebar Drawer (non-workspace screens) */}
            {!isWorkspace && isDrawerOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <button
                        className="absolute inset-0 bg-black/55"
                        onClick={() => setIsDrawerOpen(false)}
                        aria-label="Close navigation drawer"
                    />
                    <div className="relative h-full w-[85vw] max-w-80">
                        <Sidebar
                            onClose={() => setIsDrawerOpen(false)}
                            className="w-full border-r border-border shadow-2xl"
                        />
                        <button
                            className="absolute top-3 right-3 h-8 w-8 rounded-md bg-[var(--color-surface)] text-[var(--color-text)] flex items-center justify-center"
                            onClick={() => setIsDrawerOpen(false)}
                            aria-label="Close drawer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <div className="flex-1 overflow-y-auto scroll-smooth">
                    {children || <Outlet />}
                </div>
            </main>
        </div>
    );
};
