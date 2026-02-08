import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useResearchStore } from '../store';
import { ArrowRight, AlertCircle, Terminal } from 'lucide-react';
import { AnimatedBackground } from '../components/AnimatedBackground';

export const Signup = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup, authError, clearAuthError, isAuthenticated } = useResearchStore();
    const navigate = useNavigate();

    useEffect(() => {
        clearAuthError();
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [clearAuthError, isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signup(email, password, username);
            // Navigation happens via the isAuthenticated useEffect above
        } catch (e) {
            // Handled in store
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <AnimatedBackground />

            <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-zinc-900 dark:text-white font-semibold z-10">
                <div className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg flex items-center justify-center">
                    <Terminal className="w-4 h-4" />
                </div>
                DeepResearch
            </Link>

            <div className="w-full max-w-md bg-white/50 dark:bg-black/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 animate-in fade-in zoom-in-95 duration-300 relative z-10">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Create an account</h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8">Start your research journey today.</p>

                {authError && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-600 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{authError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-700">Full Name</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all placeholder-zinc-400"
                            placeholder="John Doe"
                            required
                        />
                    </div>
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
                        <label className="text-xs font-medium text-zinc-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all placeholder-zinc-400"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                        <p className="text-[10px] text-zinc-400">Must be at least 6 characters</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2.5 rounded-lg transition-all mt-4 shadow-subtle hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>Create Account <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-zinc-100 text-center text-sm text-zinc-500">
                    Already have an account? <Link to="/login" className="font-medium text-zinc-900 hover:underline">Log in</Link>
                </div>
            </div>
        </div>
    );
};