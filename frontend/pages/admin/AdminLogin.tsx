import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Hardcoded credentials based on spec
        if (email === 'omchoksiadmin@gmail.com' && password === 'OMchoksi@108') {
            setTimeout(() => {
                localStorage.setItem('dr_admin_auth', 'true');
                toast.success('Authentication successful');
                navigate('/admin');
            }, 500);
        } else {
            setTimeout(() => {
                toast.error('Invalid admin credentials');
                setIsLoading(false);
            }, 500);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#1A1915] text-[#FAF9F6]">
            <div className="w-full max-w-md p-8 bg-surface border border-border rounded-xl shadow-2xl relative overflow-hidden">
                {/* Decorative Top Accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-[#D97757]" />

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#D97757]/20 border border-[#D97757]/30 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#D97757]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">System Surveillance</h1>
                    <p className="text-sm text-text-c mt-2">Restricted Access // Admin Gateway</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-text-b mb-1">Admin Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-surface-2 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/50 focus:border-[#D97757] transition-all font-mono text-sm"
                            placeholder="admin@system.local"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-b mb-1">Authorization Code</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-surface-2 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/50 focus:border-[#D97757] transition-all font-mono text-sm tracking-widest"
                            placeholder="••••••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-[#D97757] hover:bg-[#D97757]/90 text-white font-medium rounded-lg transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Authenticate'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-text-c font-mono">
                    <p>UNAUTHORIZED ACCESS IS STRICTLY LOGGED</p>
                </div>
            </div>
        </div>
    );
};
