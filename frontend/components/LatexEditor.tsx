import React from 'react';
import { Copy, Check } from 'lucide-react';

interface LatexEditorProps {
    latex: string;
}

export const LatexEditor: React.FC<LatexEditorProps> = ({ latex }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(latex);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative h-full flex flex-col bg-[#1e1e1e] rounded-lg border border-zinc-800 overflow-hidden shadow-inner font-mono text-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    <span className="ml-2 text-xs text-zinc-400">report.tex</span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-xs"
                >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy Code'}
                </button>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <pre className="text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">
                    {latex || '% No LaTeX content generated yet...'}
                </pre>
            </div>

            {/* Status Bar */}
            <div className="px-3 py-1 bg-[#007acc] text-white text-[10px] flex justify-between shrink-0">
                <span>LaTeX</span>
                <span>UTF-8</span>
            </div>
        </div>
    );
};
