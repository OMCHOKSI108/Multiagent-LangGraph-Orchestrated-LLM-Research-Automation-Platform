import React from 'react';
import { Link } from 'react-router-dom';
import { useResearchStore } from '../store';
import { ChevronRight, ArrowRight, CheckCircle2, Globe, Cpu, Lock, Terminal } from 'lucide-react';

export const LandingPage = () => {
    const { isAuthenticated } = useResearchStore();

    return (
        <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
            {/* Navbar */}
            <nav className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md border-b border-zinc-200 z-50">
                <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-zinc-900 text-white rounded-lg flex items-center justify-center">
                            <Terminal className="w-4 h-4" />
                        </div>
                        <span className="font-semibold tracking-tight text-lg">DeepResearch</span>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        {isAuthenticated ? (
                             <Link to="/dashboard" className="text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors shadow-subtle">
                                Open Workspace
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                                    Sign In
                                </Link>
                                <Link to="/signup" className="text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors shadow-subtle">
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="pt-32 pb-24 px-6 max-w-6xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-600 mb-8 animate-in fade-in slide-in-from-bottom-4">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    v2.0 Now Available
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    The Operating System for <br className="hidden md:block"/>
                    <span className="text-zinc-400">Deep Research.</span>
                </h1>
                
                <p className="text-xl text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
                    Automate information synthesis. Connect LLMs to live data sources. Generate executive-grade reports in minutes.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
                    <Link to={isAuthenticated ? "/dashboard" : "/signup"} className="h-12 px-8 rounded-lg bg-zinc-900 text-white font-medium flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-card hover:shadow-lg hover:-translate-y-0.5">
                        Start Researching <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button className="h-12 px-8 rounded-lg bg-white border border-zinc-200 text-zinc-700 font-medium hover:bg-zinc-50 transition-colors">
                        View Demo
                    </button>
                </div>
                
                <div className="mt-12 flex items-center justify-center gap-8 text-sm text-zinc-400 animate-in fade-in delay-300">
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-zinc-300" /> SOC2 Compliant</span>
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-zinc-300" /> Enterprise Ready</span>
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-zinc-300" /> 99.9% Uptime</span>
                </div>
            </main>

            {/* Feature Grid */}
            <section className="py-24 bg-zinc-50 border-t border-zinc-200">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { 
                                icon: Globe, 
                                title: "Global Synthesis", 
                                desc: "Our agents scrape, parse, and synthesize data from 40+ languages and millions of sources instantly." 
                            },
                            { 
                                icon: Cpu, 
                                title: "Multi-Model Reasoning", 
                                desc: "Chain Gemini for context window and Groq for speed. We handle the orchestration automatically." 
                            },
                            { 
                                icon: Lock, 
                                title: "Ephemeral Contexts", 
                                desc: "Data is processed in isolated execution environments and wiped after synthesis. Zero retention policy." 
                            }
                        ].map((feature, i) => (
                            <div key={i} className="p-8 rounded-2xl bg-white border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mb-6 text-zinc-900">
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-900 mb-3">{feature.title}</h3>
                                <p className="text-zinc-500 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-24 bg-white border-t border-zinc-200">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-zinc-900 mb-4">How it works</h2>
                        <p className="text-zinc-500">From raw question to comprehensive report in three steps.</p>
                    </div>
                    
                    <div className="space-y-12 relative before:absolute before:left-8 before:top-8 before:bottom-8 before:w-px before:bg-zinc-200 md:before:left-1/2">
                        {[
                            { step: "01", title: "Define Scope", desc: "Input your research topic and select depth (Quick Scan vs Deep Dive)." },
                            { step: "02", title: "Autonomous Execution", desc: "Agents decompose the query, search live sources, and validate facts." },
                            { step: "03", title: "Synthesis", desc: "Receive a structured markdown report with citations, diagrams, and figures." }
                        ].map((item, i) => (
                            <div key={i} className="relative flex flex-col md:flex-row gap-8 md:gap-0 items-start md:items-center">
                                <div className={`md:w-1/2 ${i % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16 md:order-last'}`}>
                                    <h3 className="text-xl font-semibold text-zinc-900 mb-2">{item.title}</h3>
                                    <p className="text-zinc-500">{item.desc}</p>
                                </div>
                                <div className="absolute left-0 md:left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-zinc-50 flex items-center justify-center font-mono font-bold text-zinc-300 shadow-sm z-10">
                                    {item.step}
                                </div>
                                <div className="md:w-1/2"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-zinc-50 border-t border-zinc-200 py-12">
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 text-zinc-900 font-semibold">
                        <Terminal className="w-5 h-5" /> DeepResearch
                    </div>
                    <div className="flex gap-8 text-sm text-zinc-500">
                        <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
                        <a href="#" className="hover:text-zinc-900 transition-colors">Security</a>
                        <a href="#" className="hover:text-zinc-900 transition-colors">Status</a>
                    </div>
                    <div className="text-sm text-zinc-400">
                        © 2024 Deep Research Inc.
                    </div>
                </div>
            </footer>
        </div>
    );
};