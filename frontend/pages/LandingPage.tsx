import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Terminal, Globe, Cpu, Brain, BarChart, Shield, Zap, CheckCircle2, Mail, Lock, User, Eye, EyeOff, X, Loader2 } from 'lucide-react';
import { useResearchStore } from '../store';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

type AuthMode = 'signin' | 'signup' | null;

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, login, signup, authError, clearAuthError } = useResearchStore();
    
    // Refs for smooth scrolling
    const heroRef = useRef<HTMLElement>(null);
    const featuresRef = useRef<HTMLElement>(null);
    const aboutRef = useRef<HTMLElement>(null);
    
    // Auth state
    const [authMode, setAuthMode] = useState<AuthMode>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
        return () => {
            clearAuthError();
        };
    }, [clearAuthError, isAuthenticated, navigate]);

    const scrollToSection = (ref: React.RefObject<HTMLElement>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const resetAuthForm = () => {
        setEmail('');
        setPassword('');
        setUsername('');
        setShowPassword(false);
        clearAuthError();
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || (authMode === 'signup' && !username)) return;
        
        setLoading(true);
        try {
            if (authMode === 'signin') {
                await login(email, password);
            } else if (authMode === 'signup') {
                await signup(email, password, username);
            }
            navigate('/dashboard');
        } catch (e) {
            // Error handled in store
        } finally {
            setLoading(false);
        }
    };

    const openAuth = (mode: AuthMode) => {
        resetAuthForm();
        setAuthMode(mode);
    };

    const closeAuth = () => {
        setAuthMode(null);
        resetAuthForm();
    };

    return (
        <div className="min-h-screen bg-light-primary dark:bg-dark-primary text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 dark:selection:bg-zinc-100 selection:text-white dark:selection:text-zinc-900 relative overflow-x-hidden">
            {/* Animated Background */}
            <AnimatedBackground />
            
            {/* Navbar */}
            <nav className="fixed top-0 inset-x-0 h-16 bg-light-primary/80 dark:bg-dark-primary/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 z-50">
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg flex items-center justify-center">
                            <Terminal className="w-4 h-4" />
                        </div>
                        <span className="font-semibold tracking-tight text-lg">DeepResearch</span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8">
                        <button onClick={() => scrollToSection(heroRef)} className="text-sm font-medium hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                            Home
                        </button>
                        <button onClick={() => scrollToSection(featuresRef)} className="text-sm font-medium hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                            Features
                        </button>
                        <button onClick={() => scrollToSection(aboutRef)} className="text-sm font-medium hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                            About
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <ThemeSwitcher />
                        {isAuthenticated ? (
                             <Link to="/dashboard" className="text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg">
                                Open Workspace
                            </Link>
                        ) : (
                            <>
                                <button
                                    onClick={() => openAuth('signin')}
                                    className="text-sm font-medium hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => openAuth('signup')}
                                    className="text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg"
                                >
                                    Get Started
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main ref={heroRef} className="pt-32 pb-24 px-6 max-w-7xl mx-auto text-center relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-8 animate-in fade-in slide-in-from-bottom-4">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    v2.0 Now Available • Multi-Agent AI Platform
                </div>
                
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    The Operating System for{' '}
                    <br className="hidden md:block"/>
                    <span className="bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-900 dark:from-zinc-100 dark:via-zinc-400 dark:to-zinc-100 bg-clip-text text-transparent animate-pulse">
                        Deep Research
                    </span>
                </h1>
                
                <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-4xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    Harness the power of <strong>20+ specialized AI agents</strong> working in concert to revolutionize academic research, literature reviews, and scientific discovery.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-in fade-in slide-in-from-bottom-10 duration-1200">
                    <button
                        onClick={() => openAuth('signup')}
                        className="group bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform flex items-center gap-3"
                    >
                        Start Research for Free
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={() => scrollToSection(featuresRef)}
                        className="group border-2 border-zinc-300 dark:border-zinc-700 px-8 py-4 rounded-xl font-semibold text-lg hover:border-zinc-900 dark:hover:border-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center gap-3"
                    >
                        Explore Platform
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-4xl mx-auto">
                    <div className="text-center">
                        <div className="text-4xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">20+</div>
                        <div className="text-zinc-600 dark:text-zinc-400">Specialized AI Agents</div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">7</div>
                        <div className="text-zinc-600 dark:text-zinc-400">Search Providers</div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">∞</div>
                        <div className="text-zinc-600 dark:text-zinc-400">Research Possibilities</div>
                    </div>
                </div>
            </main>

            {/* Features Section */}
            <section ref={featuresRef} className="py-24 px-6 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-6xl font-bold mb-6">Powered by AI Agents</h2>
                        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
                            Our multi-agent architecture orchestrates specialized AI agents to deliver comprehensive research analysis
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Cpu className="w-8 h-8" />,
                                title: "Orchestrated Intelligence",
                                description: "Multi-agent system with specialized roles: discovery, synthesis, verification, and reporting agents working in harmony.",
                                features: ["Domain Intelligence", "Gap Synthesis", "Technical Verification"]
                            },
                            {
                                icon: <Globe className="w-8 h-8" />,
                                title: "Universal Search",
                                description: "Query across arXiv, PubMed, OpenAlex, Wikipedia, and web sources with intelligent result aggregation.",
                                features: ["7+ Search Providers", "Real-time Data", "Citation Tracking"]
                            },
                            {
                                icon: <Brain className="w-8 h-8" />,
                                title: "Deep Analysis",
                                description: "Advanced paper decomposition, understanding, and critique with reproducibility assessment.",
                                features: ["Paper Parsing", "Bias Detection", "Reproducibility"]
                            },
                            {
                                icon: <Shield className="w-8 h-8" />,
                                title: "Verification Layer",
                                description: "Built-in fact-checking, source validation, and hallucination detection for reliable results.",
                                features: ["Fact Checking", "Source Validation", "Quality Control"]
                            },
                            {
                                icon: <Zap className="w-8 h-8" />,
                                title: "Streaming Intelligence",
                                description: "Real-time processing with live updates, streaming chat, and interactive exploration.",
                                features: ["Live Updates", "Chat Interface", "Interactive"]
                            },
                            {
                                icon: <BarChart className="w-8 h-8" />,
                                title: "Export & Analytics",
                                description: "Generate publication-ready reports in Markdown, PDF, and LaTeX with usage analytics.",
                                features: ["Multi-format Export", "Usage Tracking", "Analytics"]
                            }
                        ].map((feature, index) => (
                            <div key={index} className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:shadow-lg group">
                                <div className="w-16 h-16 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">{feature.description}</p>
                                <div className="space-y-2">
                                    {feature.features.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            <span className="text-zinc-600 dark:text-zinc-400">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section ref={aboutRef} className="py-24 px-6 bg-zinc-50 dark:bg-zinc-900/50 relative z-10">
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-4xl md:text-6xl font-bold mb-8">Research, Accelerated</h2>
                    <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-4xl mx-auto mb-16 leading-relaxed">
                        DeepResearch combines cutting-edge AI agents, real-time data sources, and intelligent workflows to transform how research is conducted. From literature reviews to novel discovery, our platform handles the complexity so you can focus on insights.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
                        <div className="text-left">
                            <h3 className="text-2xl font-bold mb-6">For Researchers</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <strong>Automated Literature Reviews:</strong> Comprehensive analysis across multiple databases
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <strong>Gap Identification:</strong> Discover research opportunities and unexplored areas
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <strong>Citation Networks:</strong> Understand paper relationships and impact
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="text-left">
                            <h3 className="text-2xl font-bold mb-6">For Organizations</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <strong>Team Collaboration:</strong> Shared workspaces and memory management
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <strong>Usage Analytics:</strong> Track costs, performance, and research insights
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <strong>Enterprise Security:</strong> SOC2 compliance and data protection
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Auth Modal */}
            {authMode && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 relative">
                        <button
                            onClick={closeAuth}
                            className="absolute top-4 right-4 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-2">
                                {authMode === 'signin' ? 'Welcome back' : 'Create account'}
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                {authMode === 'signin' ? 'Sign in to continue your research' : 'Join thousands of researchers worldwide'}
                            </p>
                        </div>

                        <form onSubmit={handleAuthSubmit} className="space-y-6">
                            {authMode === 'signup' && (
                                <div>
                                    <label htmlFor="username" className="block text-sm font-medium mb-2">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
                                        <input
                                            id="username"
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </div>
                                </div>
                            )}
                            
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium mb-2">
                                    Email address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-400" />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                                        placeholder={authMode === 'signin' ? 'Enter your password' : 'Create a password'}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {authMode === 'signup' && (
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Minimum 6 characters
                                    </p>
                                )}
                            </div>
                            
                            {authError && (
                                <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                    {authError}
                                </div>
                            )}
                            
                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={loading || !email || !password || (authMode === 'signup' && !username)}
                                    className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-3 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {authMode === 'signin' ? 'Signing in...' : 'Creating account...'}
                                        </>
                                    ) : (
                                        authMode === 'signin' ? 'Sign in' : 'Create account'
                                    )}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                                    className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                >
                                    {authMode === 'signin' 
                                        ? "Don't have an account? Sign up" 
                                        : "Already have an account? Sign in"
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 relative z-10">
                <div className="max-w-7xl mx-auto text-center text-zinc-600 dark:text-zinc-400">
                    <p>&copy; 2026 DeepResearch. Accelerating research through intelligent automation.</p>
                </div>
            </footer>
        </div>
    );
};