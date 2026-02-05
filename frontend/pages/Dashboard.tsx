import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchStore } from '../store';
import { Sparkles, ArrowRight, Zap, Clock } from 'lucide-react';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { createResearch } = useResearchStore();
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

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="mb-8 flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-gray-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">What would you like to research?</h1>
            <p className="text-gray-500">Enter a topic and the Deep Research Engine will generate a comprehensive report.</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4 text-left">
            <div className="relative">
                <textarea 
                    className="w-full bg-white border border-gray-300 rounded-xl p-4 text-base text-gray-900 shadow-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none h-32"
                    placeholder="E.g., The impact of quantum computing on cryptography by 2030..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    autoFocus
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium px-2">
                        {topic.length > 0 ? 'Press Enter to start' : ''}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => setDepth('quick')}
                    className={`flex-1 flex items-center gap-3 p-3 rounded-lg border transition-all ${depth === 'quick' ? 'bg-gray-50 border-black ring-1 ring-black/5' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${depth === 'quick' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <Zap className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">Quick Scan</div>
                        <div className="text-xs text-gray-500">~2 min • High level</div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setDepth('deep')}
                    className={`flex-1 flex items-center gap-3 p-3 rounded-lg border transition-all ${depth === 'deep' ? 'bg-gray-50 border-black ring-1 ring-black/5' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center ${depth === 'deep' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <Clock className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">Deep Dive</div>
                        <div className="text-xs text-gray-500">~10 min • Comprehensive</div>
                    </div>
                </button>
            </div>

            <button 
                type="submit" 
                disabled={!topic || isSubmitting}
                className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
                {isSubmitting ? (
                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                     <>Start Research <ArrowRight className="w-4 h-4" /></>
                )}
            </button>
        </form>
      </div>
    </div>
  );
};