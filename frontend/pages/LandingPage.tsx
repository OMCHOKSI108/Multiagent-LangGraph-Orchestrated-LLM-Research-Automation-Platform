import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useResearchStore } from '../store';
import { ArrowRight, Terminal, CheckCircle2, Globe, Cpu, Zap, BarChart, Shield, X, User, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

type AuthMode = 'signin' | 'signup' | null;

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, login, signup, authError, clearAuthError } = useResearchStore();

    // Auth state
    const [authMode, setAuthMode] = useState<AuthMode>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const emailInputRef = useRef<HTMLInputElement | null>(null);
    const passwordInputRef = useRef<HTMLInputElement | null>(null);
    const usernameInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (isAuthenticated) navigate('/dashboard');
        return () => clearAuthError();
    }, [clearAuthError, isAuthenticated, navigate]);

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (authMode === 'signin') await login(email, password);
            else if (authMode === 'signup') await signup(email, password, username);
            if (useResearchStore.getState().isAuthenticated) {
                navigate('/dashboard');
            }
        } catch (e) {
            // Handled in store
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authMode) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !loading) {
                setAuthMode(null);
                return;
            }
            if (event.key !== 'Tab' || !modalRef.current) return;

            const selectors = [
                'button:not([disabled])',
                'input:not([disabled])',
                'a[href]',
                '[tabindex]:not([tabindex="-1"])',
            ].join(', ');

            const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(selectors))
                .filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);

            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement as HTMLElement | null;

            if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [authMode, loading]);

    useEffect(() => {
        if (!authError) return;
        const message = authError.toLowerCase();
        if (authMode === 'signup' && message.includes('name')) {
            usernameInputRef.current?.focus();
            return;
        }
        if (message.includes('password')) {
            passwordInputRef.current?.focus();
            return;
        }
        emailInputRef.current?.focus();
    }, [authError, authMode]);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-sm">
                <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                    <div className="flex items-center font-bold text-xl tracking-tight">
                        DeepResearch
                    </div>
                    <nav className="hidden md:flex gap-6 text-sm font-medium">
                        <a href="#features" className="hover:text-primary transition-colors">Features</a>
                        <a href="#about" className="hover:text-primary transition-colors">About</a>
                        <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        <ThemeSwitcher />
                        {isAuthenticated ? (
                            <Link to="/dashboard">
                                <Button>Dashboard</Button>
                            </Link>
                        ) : (
                            <>
                                <Button variant="ghost" onClick={() => setAuthMode('signin')}>Sign In</Button>
                                <Button onClick={() => setAuthMode('signup')}>Get Started</Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-32 pb-24 px-4 md:px-6 text-center">
                <div className="container mx-auto max-w-5xl space-y-8">
                    <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-normal animate-in fade-in slide-in-from-bottom-4">
                        v2.0 Now Available • Multi-Agent Research
                    </Badge>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700">
                        The Operating System for <br className="hidden md:block" />
                        <span className="text-primary">Deep Research</span>
                    </h1>

                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        Autonomous agents that research, analyze, and report. Revolutionize your workflow with orchestrated AI intelligence.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 animate-in fade-in slide-in-from-bottom-10 duration-1200">
                        <Button size="lg" className="h-12 px-8 text-base" onClick={() => setAuthMode('signup')}>
                            Start Researching <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                            View Documentation
                        </Button>
                    </div>

                    {/* Product Preview */}
                    <div className="mt-16 rounded-xl border bg-muted/50 p-2 shadow-2xl">
                        <div className="rounded-lg bg-background border overflow-hidden">
                            <div className="h-10 border-b bg-muted/20 flex items-center px-4 gap-2">
                                <div className="h-3 w-3 rounded-full bg-red-400/40" />
                                <div className="h-3 w-3 rounded-full bg-yellow-400/40" />
                                <div className="h-3 w-3 rounded-full bg-green-400/40" />
                                <span className="ml-3 text-xs text-muted-foreground font-mono">deepresearch / workspace</span>
                            </div>
                            <div className="grid grid-cols-12 divide-x divide-border" style={{ minHeight: '280px' }}>
                                {/* Sidebar mock */}
                                <div className="col-span-2 p-3 space-y-2 bg-muted/5">
                                    <div className="h-3 w-16 bg-muted rounded" />
                                    <div className="h-3 w-20 bg-primary/20 rounded" />
                                    <div className="h-3 w-14 bg-muted rounded" />
                                    <div className="h-3 w-18 bg-muted rounded" />
                                </div>
                                {/* Chat mock */}
                                <div className="col-span-3 p-3 space-y-3">
                                    <div className="h-3 w-24 bg-muted rounded" />
                                    <div className="rounded-lg bg-primary/10 p-2 space-y-1">
                                        <div className="h-2 w-full bg-primary/20 rounded" />
                                        <div className="h-2 w-3/4 bg-primary/20 rounded" />
                                    </div>
                                    <div className="rounded-lg bg-muted/30 p-2 space-y-1 ml-auto max-w-[80%]">
                                        <div className="h-2 w-full bg-muted rounded" />
                                        <div className="h-2 w-1/2 bg-muted rounded" />
                                    </div>
                                </div>
                                {/* Report mock */}
                                <div className="col-span-5 p-3 space-y-2">
                                    <div className="flex gap-2 mb-3">
                                        <div className="h-5 w-20 bg-primary/15 rounded text-[9px] flex items-center justify-center text-primary font-medium">Preview</div>
                                        <div className="h-5 w-16 bg-muted rounded text-[9px] flex items-center justify-center text-muted-foreground">LaTeX</div>
                                    </div>
                                    <div className="h-3 w-3/4 bg-foreground/10 rounded" />
                                    <div className="h-2 w-full bg-muted rounded" />
                                    <div className="h-2 w-full bg-muted rounded" />
                                    <div className="h-2 w-5/6 bg-muted rounded" />
                                    <div className="h-2 w-full bg-muted rounded" />
                                    <div className="h-2 w-2/3 bg-muted rounded" />
                                </div>
                                {/* Activity mock */}
                                <div className="col-span-2 p-3 space-y-2 bg-muted/5">
                                    <div className="h-3 w-16 bg-muted rounded" />
                                    <div className="flex items-center gap-1">
                                        <div className="h-2 w-2 rounded-full bg-green-400" />
                                        <div className="h-2 w-14 bg-muted rounded" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="h-2 w-2 rounded-full bg-green-400" />
                                        <div className="h-2 w-12 bg-muted rounded" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                                        <div className="h-2 w-16 bg-muted rounded" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="border-y bg-muted/20 py-12">
                <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { label: "AI Agents", value: "29" },
                        { label: "Data Sources", value: "6" },
                        { label: "Export Formats", value: "5" },
                        { label: "Pipeline Stages", value: "7" },
                    ].map((stat, i) => (
                        <div key={i}>
                            <div className="text-3xl font-bold mb-1">{stat.value}</div>
                            <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section id="features" className="py-24 px-4 md:px-6 bg-background">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-bold">Powered by Intelligent Agents</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Our architecture orchestrates specialized agents to deliver comprehensive analysis.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: Cpu, title: "Orchestration", desc: "Multi-agent systems working in harmony." },
                            { icon: Globe, title: "Universal Search", desc: "Access verified data from 7+ providers." },
                            { icon: BarChart, title: "Analytics", desc: "Export reports in PDF, LaTeX, and Markdown." },
                            { icon: Shield, title: "Verification", desc: "Built-in fact checking and source validation." },
                            { icon: Zap, title: "Real-time", desc: "Live streaming of research progress." },
                            { icon: Mail, title: "Export", desc: "One-click report generation and sharing." },
                        ].map((feature, i) => (
                            <Card key={i} className="bg-muted/10 border-muted/20 hover:border-primary/20 transition-colors">
                                <CardContent className="p-6 space-y-4">
                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <feature.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-bold">{feature.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {feature.desc}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-12 bg-muted/10">
                <div className="container mx-auto px-4 text-center text-muted-foreground">
                    <p>&copy; 2026 DeepResearch. All rights reserved.</p>
                </div>
            </footer>

            {/* Auth Modal */}
            {authMode && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <button
                        type="button"
                        className="absolute inset-0"
                        onClick={() => {
                            if (!loading) setAuthMode(null);
                        }}
                        aria-label="Close authentication dialog"
                    />
                    <Card
                        ref={modalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="auth-modal-title"
                        className="w-full max-w-md relative animate-in zoom-in-95 duration-200"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-4"
                            onClick={() => setAuthMode(null)}
                            disabled={loading}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        <CardContent className="p-8">
                            <div className="text-center mb-8">
                                <h2 id="auth-modal-title" className="text-2xl font-bold">
                                    {authMode === 'signin' ? 'Welcome back' : 'Create an account'}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-2">
                                    {authMode === 'signin' ? 'Enter your credentials to continue' : 'Start your free trial today'}
                                </p>
                            </div>

                            {authError && (
                                <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm" role="alert" aria-live="polite">
                                    {authError}
                                </div>
                            )}

                            <form onSubmit={handleAuthSubmit} className="space-y-4">
                                {authMode === 'signup' && (
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input id="name" ref={usernameInputRef} className="pl-9" placeholder="John Doe" value={username} onChange={e => setUsername(e.target.value)} required disabled={loading} />
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input id="email" ref={emailInputRef} className="pl-9" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            ref={passwordInputRef}
                                            className="pl-9 pr-9"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="********"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            disabled={loading}
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground" disabled={loading}>
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};



