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
        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all ${
            active 
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
    const [results, setResults] = useState<Record<string, { status: 'ok'|'error', latency?: number }>>({});

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

    return (
        <div className="max-w-xl space-y-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                API keys are stored securely in your browser's local storage and are never sent to our servers except to proxy requests to the providers.
            </div>

            <div className="space-y-6">
                {['gemini', 'groq'].map(provider => (
                    <div key={provider} className="group">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">{provider} API Key</label>
                            {results[provider] && (
                                <span className={`text-xs font-medium flex items-center gap-1.5 px-2 py-0.5 rounded-full ${results[provider].status === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {results[provider].status === 'ok' ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                    {results[provider].status === 'ok' ? `${results[provider].latency}ms` : 'Error'}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Key className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
                                <input 
                                    type="password" 
                                    value={keys[provider] || ''}
                                    onChange={e => handleChange(provider, e.target.value)}
                                    placeholder={`sk-...`}
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-dark-primary border border-zinc-300 dark:border-dark-300 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-500 outline-none transition-all font-mono"
                                />
                            </div>
                            <button 
                                onClick={() => handleTest(provider)}
                                disabled={testing === provider || !keys[provider]}
                                className="px-4 py-2 bg-white dark:bg-dark-200 border border-zinc-300 dark:border-dark-300 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-dark-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 transition-colors"
                            >
                                {testing === provider ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-6 border-t border-zinc-100 dark:border-dark-300 flex justify-end">
                <button 
                    onClick={() => onSave(keys)}
                    className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-card hover:shadow-lg"
                >
                    Save Changes
                </button>
            </div>
        </div>
    );
};