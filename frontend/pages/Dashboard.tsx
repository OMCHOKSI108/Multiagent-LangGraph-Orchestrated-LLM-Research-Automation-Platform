import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchStore } from '../store';
import { Sparkles, ArrowRight, Zap, Clock, Search, Settings, Loader2, Trash2, CheckCircle2, AlertCircle, Timer } from 'lucide-react';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { JobStatus } from '../types';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { createResearch, user, logout, openSettings, researches, fetchResearches, deleteResearch, loadingList } = useResearchStore();
  const [topic, setTopic] = useState('');
  const [depth] = useState<'quick' | 'deep'>('deep'); // Default to deep research
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchResearches();
  }, [fetchResearches]);

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



              {/* Submit Button */}
              <button
                type="submit"
                disabled={!topic || isSubmitting}
                className="w-full bg-gradient-to-r from-primary to-brand-orange hover:from-primary/90 hover:to-brand-orange/90 text-white font-medium py-6 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 backdrop-blur-xl text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting Deep Research...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Start Deep Research
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Recent Research History */}
        {researches.length > 0 && (
          <div className="w-full max-w-2xl mt-12 z-10">
            <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Research
            </h2>
            <div className="space-y-2">
              {loadingList && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                </div>
              )}
              {researches.slice(0, 8).map((job) => (
                <div
                  key={job.id}
                  className="group flex items-center justify-between bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/60 dark:hover:bg-black/40 transition-all"
                  onClick={() => navigate(`/research/${job.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      job.status === JobStatus.COMPLETED ? 'bg-emerald-500' :
                      job.status === JobStatus.PROCESSING ? 'bg-amber-500 animate-pulse' :
                      job.status === JobStatus.FAILED ? 'bg-red-500' :
                      'bg-zinc-300'
                    }`} />
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {job.topic}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      job.status === JobStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      job.status === JobStatus.PROCESSING ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      job.status === JobStatus.FAILED ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {job.status}
                    </span>
                    <button
                      className="p-1.5 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this research?')) deleteResearch(job.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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