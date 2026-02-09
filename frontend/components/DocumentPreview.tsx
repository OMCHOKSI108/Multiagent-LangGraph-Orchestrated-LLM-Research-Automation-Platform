import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { FileText, Code, GitBranch, History } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { LatexEditor } from './LatexEditor';

interface DocumentPreviewProps {
    markdown?: string;
    latexSource?: string;
    systemStatus?: string;
    statusDetail?: string;
    className?: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ markdown, latexSource, systemStatus, statusDetail, className }) => {
    const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');

    return (
        <div className={cn("flex flex-col h-full bg-white", className)}>
            {/* Header / Tabs */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
                <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-md">
                    <button
                        onClick={() => setViewMode('preview')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all",
                            viewMode === 'preview' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
                        )}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Preview
                    </button>
                    <button
                        onClick={() => setViewMode('source')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all",
                            viewMode === 'source' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
                        )}
                    >
                        <Code className="w-3.5 h-3.5" />
                        LaTeX Source
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        v2.4 (Draft)
                    </span>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'preview' ? (
                    <div className="absolute inset-0 overflow-y-auto bg-zinc-50 p-8 flex justify-center custom-scrollbar">
                        <div className="w-full max-w-[800px] min-h-[1000px] bg-white shadow-sm border border-zinc-200 p-12 ">
                            {markdown ? (
                                <article className="prose prose-zinc prose-sm max-w-none">
                                    <MarkdownRenderer content={markdown} />
                                </article>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                                    <FileText className="w-16 h-16 mb-4 opacity-50" />
                                    <p>Document preview will appear here.</p>
                                    {systemStatus && (
                                        <p className="mt-2 text-xs text-zinc-400">
                                            {systemStatus}{statusDetail ? ` — ${statusDetail}` : ''}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0">
                        <LatexEditor latex={latexSource || ''} />
                    </div>
                )}
            </div>
        </div>
    );
};
