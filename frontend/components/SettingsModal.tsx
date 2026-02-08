import React, { useState, useEffect, useRef } from 'react';
import { useResearchStore } from '../store';
import { X, User, Key, BarChart3, Check, AlertTriangle, Loader2, LogOut, Brain } from 'lucide-react';
import { UsageChart } from './UsageChart';
import { MemoryPanel } from './MemoryPanel';

export const SettingsModal = () => {
    const {
        isSettingsOpen,
        closeSettings,
        user,
        logout,
        apiKeys,
        saveApiKeys,
        testConnection,
        usageStats,
        updatePassword
    } = useResearchStore();

    const [activeTab, setActiveTab] = useState<'profile' | 'api' | 'usage' | 'memory'>('profile');
    const modalRef = useRef<HTMLDivElement>(null);

    // Handle Escape key and body scroll lock
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isSettingsOpen) {
                closeSettings();
            }
        };

        if (isSettingsOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isSettingsOpen, closeSettings]);

    // Handle click outside
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            closeSettings();
        }
    };

    if (!isSettingsOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="bg-white dark:bg-dark-secondary rounded-xl shadow-2xl border border-zinc-200 dark:border-dark-300 w-full max-w-4xl h-[600px] flex overflow-hidden animate-in zoom-in-95 duration-200"
            >

                {/* Sidebar Navigation */}
                <div className="w-64 bg-zinc-50 dark:bg-dark-primary border-r border-zinc-200 dark:border-dark-300 flex flex-col p-4">
                    <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-6 px-3">Settings</h2>
                    <div className="space-y-1">
                        <NavButton
                            active={activeTab === 'profile'}
                            onClick={() => setActiveTab('profile')}
                            icon={User}
                            label="Profile"
                        />
                        <NavButton
                            active={activeTab === 'api'}
                            onClick={() => setActiveTab('api')}
                            icon={Key}
                            label="AI Providers"
                        />
                        <NavButton
                            active={activeTab === 'usage'}
                            onClick={() => setActiveTab('usage')}
                            icon={BarChart3}
                            label="Usage & Billing"
                        />
                        <NavButton
                            active={activeTab === 'memory'}
                            onClick={() => setActiveTab('memory')}
                            icon={Brain}
                            label="Memory"
                        />
                    </div>
                    <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-dark-300">
                        <button
                            onClick={() => { closeSettings(); logout(); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" /> Log Out
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col bg-white dark:bg-dark-secondary">
                    <div className="h-16 border-b border-zinc-100 dark:border-dark-300 flex items-center justify-between px-8 shrink-0">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {activeTab === 'profile' && 'User Profile'}
                            {activeTab === 'api' && 'API Configuration'}
                            {activeTab === 'usage' && 'Usage Analytics'}
                            {activeTab === 'memory' && 'Memory'}
                        </h3>
                        <button
                            onClick={closeSettings}
                            className="p-2 -mr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-dark-200 rounded-full transition-colors"
                            aria-label="Close settings"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        {activeTab === 'profile' && <ProfileSettings user={user} updatePassword={updatePassword} />}
                        {activeTab === 'api' && <ApiSettings apiKeys={apiKeys} onSave={saveApiKeys} onTest={testConnection} />}
                        {activeTab === 'usage' && usageStats && (
                            <div className="space-y-8 max-w-2xl">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 border border-zinc-200 dark:border-dark-300 rounded-xl bg-zinc-50/50 dark:bg-dark-primary/50">
                                        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Total Tokens</div>
                                        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">{(usageStats.totalTokens / 1000).toFixed(1)}k</div>
                                    </div>
                                    <div className="p-5 border border-zinc-200 dark:border-dark-300 rounded-xl bg-zinc-50/50 dark:bg-dark-primary/50">
                                        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Estimated Cost</div>
                                        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">${usageStats.cost.toFixed(2)}</div>
                                    </div>
                                </div>
                                <UsageChart data={usageStats.history} />
                            </div>
                        )}
                        {activeTab === 'usage' && !usageStats && (
                            <div className="flex items-center justify-center h-full text-zinc-300">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        )}
                        {activeTab === 'memory' && (
                            <div className="max-w-2xl h-full">
                                <MemoryPanel />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub-Components ---

const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all ${active
                ? 'bg-white dark:bg-dark-200 text-zinc-900 dark:text-zinc-100 shadow-subtle border border-zinc-200 dark:border-dark-300'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-dark-200 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);

const ProfileSettings = ({ user, updatePassword }: any) => {
    const [current, setCurrent] = useState('');
    const [newPass, setNewPass] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        try {
            await updatePassword(current, newPass);
            setStatus('success');
            setCurrent('');
            setNewPass('');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (err) {
            setStatus('error');
        }
    };

    return (
        <div className="max-w-md space-y-8">
            <div className="flex items-center gap-4 p-4 border border-zinc-100 dark:border-dark-300 rounded-xl bg-zinc-50/50 dark:bg-dark-primary/50">
                <div className="w-12 h-12 bg-zinc-900 dark:bg-zinc-100 rounded-full flex items-center justify-center text-lg font-bold text-white dark:text-zinc-900">
                    {user?.name?.[0]}
                </div>
                <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">{user?.name}</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">{user?.email}</div>
                </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-dark-300 pb-2">Change Password</h4>
                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Current Password</label>
                    <input
                        type="password"
                        value={current}
                        onChange={e => setCurrent(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-dark-primary border border-zinc-300 dark:border-dark-300 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-500 outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">New Password</label>
                    <input
                        type="password"
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-dark-primary border border-zinc-300 dark:border-dark-300 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-500 outline-none transition-all"
                    />
                </div>

                <div className="flex items-center justify-between pt-2">
                    <button
                        type="submit"
                        disabled={!current || !newPass || status === 'loading'}
                        className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all shadow-subtle hover:shadow-md"
                    >
                        {status === 'loading' ? 'Updating...' : 'Update Password'}
                    </button>

                    {status === 'success' && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="w-4 h-4" /> Saved</span>}
                    {status === 'error' && <span className="text-sm text-red-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Failed</span>}
                </div>
            </form>
        </div>
    );
};

const ApiSettings = ({ apiKeys, onSave, onTest }: any) => {
    const [keys, setKeys] = useState(apiKeys);
    const [testing, setTesting] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, { status: 'ok' | 'error', latency?: number }>>({});

    const handleChange = (provider: string, value: string) => {
        setKeys((prev: any) => ({ ...prev, [provider]: value }));
    };

    const handleTest = async (provider: string) => {
        setTesting(provider);
        try {
            const res = await onTest(provider, keys[provider]);
            setResults(prev => ({ ...prev, [provider]: res }));
        } catch (err) {
            setResults(prev => ({ ...prev, [provider]: { status: 'error' } }));
        } finally {
            setTesting(null);
        }
    };

    const ProviderIcon = ({ provider }: { provider: string }) => {
        if (provider === 'gemini') {
            return (
                <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center p-1.5 shadow-sm">
                    <svg viewBox="0 0 24 24" className="w-full h-full"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                </div>
            );
        }
        if (provider === 'groq') {
            return (
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center p-1.5 text-white font-bold text-xs shadow-sm">
                    GROQ
                </div>
            );
        }
        return <Key className="w-5 h-5 text-zinc-400" />;
    };

    return (
        <div className="max-w-xl space-y-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-lg text-sm text-blue-700 dark:text-blue-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p>
                    API keys are stored securely in your browser's local storage. They are never sent to our servers, only directly to the AI providers via our secure proxy.
                </p>
            </div>

            <div className="space-y-6">
                {['gemini', 'groq'].map(provider => (
                    <div key={provider} className="group bg-zinc-50 dark:bg-dark-primary/50 p-4 rounded-xl border border-zinc-200 dark:border-dark-300 transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <ProviderIcon provider={provider} />
                                <div>
                                    <label className="text-sm font-semibold capitalize text-zinc-900 dark:text-zinc-100 font-display block">
                                        {provider === 'gemini' ? 'Google Gemini' : 'Groq Cloud'}
                                    </label>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {provider === 'gemini' ? 'Required for reasoning & vision' : 'Required for fast inference'}
                                    </span>
                                </div>
                            </div>
                            {results[provider] && (
                                <span className={`text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${results[provider].status === 'ok'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900'
                                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900'}`}>
                                    {results[provider].status === 'ok' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                    {results[provider].status === 'ok' ? 'Connected' : 'Error'}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="password"
                                    value={keys[provider] || ''}
                                    onChange={e => handleChange(provider, e.target.value)}
                                    placeholder={provider === 'gemini' ? "AIzaSy..." : "gsk_..."}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-dark-secondary border border-zinc-200 dark:border-dark-300 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-500 outline-none transition-all font-mono shadow-sm"
                                />
                            </div>
                            <button
                                onClick={() => handleTest(provider)}
                                disabled={testing === provider || !keys[provider]}
                                className="px-5 py-2.5 bg-white dark:bg-dark-secondary border border-zinc-200 dark:border-dark-300 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-dark-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 transition-all shadow-sm hover:shadow-md active:scale-95"
                            >
                                {testing === provider ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                            </button>
                        </div>
                        {results[provider]?.latency && (
                            <div className="mt-2 text-[10px] text-zinc-400 text-right font-mono">
                                Latency: {results[provider].latency}ms
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="pt-6 border-t border-zinc-100 dark:border-dark-300 flex justify-end">
                <button
                    onClick={() => onSave(keys)}
                    className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-8 py-3 rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2"
                >
                    <Check className="w-4 h-4" />
                    Save Configuration
                </button>
            </div>
        </div>
    );
};