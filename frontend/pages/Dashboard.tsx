import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchStore } from '../store';
import { Sparkles, ArrowRight, Zap, Clock, Search, Settings } from 'lucide-react';
import { AnimatedBackground } from '../components/AnimatedBackground';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { createResearch, user, logout, openSettings } = useResearchStore();
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<'quick' | 'deep'>('quick');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;
    setIsSubmitting(true);
    const id = await createResearch(topic, depth);
    setIsSubmitting(false);
    navigate(`/research/${id}`);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (topic && !isSubmitting) {
        await handleCreate(e);
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-zinc-900 dark:to-slate-900">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Main Content */}
      <main className="relative min-h-screen flex flex-col items-center p-8 md:pt-16 md:px-16">
        {/* Header */}
        <div className="z-10 max-w-5xl w-full items-center justify-between text-sm lg:flex mb-16">
          <div className="flex gap-4 w-full flex-row items-center justify-between">
            <div className="flex flex-col gap-4 justify-center">
              <div className="pointer-events-none flex items-center gap-2 lg:pointer-events-auto text-lg">
                <div className="w-10 h-10 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h1 className="text-3xl font-light leading-none whitespace-nowrap">DeepResearch</h1>
                  <p className="text-sm ml-0.5 tracking-widest font-light font-sans leading-none text-zinc-500 dark:text-zinc-400">
                    Multi-Agent Research Platform
                  </p>
                </div>
              </div>
            </div>

            {/* User Controls */}
            <div className="flex gap-4 items-center">
              {user && (
                <div className="flex items-center gap-4">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Welcome, {user.name || user.email}
                  </div>
                  <button
                    onClick={openSettings}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={logout}
                    className="text-sm text-red-600 hover:text-red-700 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Research Interface */}
        <div className="h-full flex-grow flex flex-col items-center justify-center w-full -mt-32">
          <div className="flex flex-col gap-8 w-full items-center justify-center">
            {/* Central Icon/Logo */}
            <div className="relative">
              <div className="w-24 h-24 bg-white/20 dark:bg-black/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-8 border border-white/30 dark:border-white/10">
                <Search className="w-12 h-12 text-zinc-600 dark:text-zinc-400" />
              </div>
            </div>

            {/* Main Title */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-6xl font-light mb-4 text-zinc-900 dark:text-white">
                What would you like to research?
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
                Enter a topic and the Deep Research Engine will generate a comprehensive report.
              </p>
            </div>

            {/* Research Form */}
            <form
              onSubmit={handleCreate}
              className="flex flex-col gap-6 max-w-2xl w-full"
            >
              {/* Topic Input */}
              <div className="relative">
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="E.g., The impact of quantum computing on cryptography by 2030..."
                  className="w-full bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-xl p-6 text-base text-zinc-900 dark:text-white shadow-lg focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all resize-none min-h-32 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                  disabled={isSubmitting}
                />
                {topic && !isSubmitting && (
                  <div className="absolute bottom-4 right-4 text-xs text-zinc-500 bg-white/80 dark:bg-black/80 px-2 py-1 rounded">
                    Press Enter to start
                  </div>
                )}
              </div>

              {/* Research Depth Selection */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setDepth('quick')}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-xl backdrop-blur-xl border transition-all ${
                    depth === 'quick'
                      ? 'bg-white/40 dark:bg-white/10 border-blue-500/50 ring-1 ring-blue-500/30'
                      : 'bg-white/20 dark:bg-black/20 border-white/20 dark:border-white/10 hover:bg-white/30 dark:hover:bg-white/15'
                  }`}
                  disabled={isSubmitting}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    depth === 'quick'
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-zinc-900 dark:text-white">Quick Scan</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">~2 min • High level</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDepth('deep')}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-xl backdrop-blur-xl border transition-all ${
                    depth === 'deep'
                      ? 'bg-white/40 dark:bg-white/10 border-blue-500/50 ring-1 ring-blue-500/30'
                      : 'bg-white/20 dark:bg-black/20 border-white/20 dark:border-white/10 hover:bg-white/30 dark:hover:bg-white/15'
                  }`}
                  disabled={isSubmitting}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    depth === 'deep'
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-zinc-900 dark:text-white">Deep Dive</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">~10 min • Comprehensive</div>
                  </div>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!topic || isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 backdrop-blur-xl"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting Research...
                  </>
                ) : (
                  <>
                    Start Research
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Powered by 20+ specialized AI agents for comprehensive research
          </p>
        </div>
      </main>
    </div>
  );
};