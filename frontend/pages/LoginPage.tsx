import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useResearchStore } from '../store';
import { ArrowRight, AlertCircle, Terminal } from 'lucide-react';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, authError, clearAuthError, isAuthenticated } = useResearchStore();
    const navigate = useNavigate();

    useEffect(() => {
        clearAuthError();
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [clearAuthError, isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (e) {
            // Error is handled in store
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
            <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-900 font-semibold">
                <Terminal className="w-5 h-5" /> DeepResearch
            </Link>

            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-card border border-zinc-200 animate-in fade-in zoom-in-95 duration-300">
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Welcome back</h1>
                <p className="text-zinc-500 text-sm mb-8">Enter your credentials to access your workspace.</p>

                {authError && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-600 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{authError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-700">Email</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all placeholder-zinc-400"
                            placeholder="name@company.com"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-medium text-zinc-700">Password</label>
                            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-900">Forgot password?</a>
                        </div>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all placeholder-zinc-400"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2.5 rounded-lg transition-all mt-4 shadow-subtle hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>Sign In <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-zinc-100 text-center text-sm text-zinc-500">
                    Don't have an account? <Link to="/signup" className="font-medium text-zinc-900 hover:underline">Sign up</Link>
                </div>
            </div>
        </div>
    );
};