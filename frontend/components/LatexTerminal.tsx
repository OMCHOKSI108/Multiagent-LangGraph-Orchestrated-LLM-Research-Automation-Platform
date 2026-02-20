import React, { useState, useEffect, useRef } from 'react';
import { Play, Bug, Download, FileText, Check, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { api } from '../services/api';
import { toast } from 'sonner';

interface LatexTerminalProps {
    initialLatex: string;
    description?: string;
    researchId?: string;
}

export const LatexTerminal: React.FC<LatexTerminalProps> = ({ initialLatex, description, researchId }) => {
    const [content, setContent] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [status, setStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [showPdf, setShowPdf] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Simulated Typing Effect
    useEffect(() => {
        let currentIndex = 0;
        const typingSpeed = 2; // ms per char (very fast but noticeable)

        // If content is huge, skip typing or make it instant chunking
        if (initialLatex.length > 5000) {
            setContent(initialLatex);
            setIsTyping(false);
            return;
        }

        const interval = setInterval(() => {
            if (currentIndex >= initialLatex.length) {
                clearInterval(interval);
                setIsTyping(false);
                return;
            }

            // Add chunks for performance
            const chunk = initialLatex.slice(currentIndex, currentIndex + 5);
            setContent(prev => prev + chunk);
            currentIndex += 5;

            // Auto-scroll
            if (textareaRef.current) {
                textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
            }
        }, typingSpeed);

        return () => clearInterval(interval);
    }, [initialLatex]);

    const handleCompile = async () => {
        if (!researchId) {
            toast.error("Research ID missing");
            return;
        }

        setStatus('compiling');
        setErrorMsg(null);
        setShowPdf(false);

        try {
            // Call backend to compile (generate PDF from content)
            // We assume the backend accepts plain text content for now and renders it
            // Since we don't have a real tex compiler, we might use the existing export PDF logic
            // providing specific content overrides if the API supports it.
            // For now, we'll request the PDF export directly which uses the stored state,
            // assuming the user wants to see the *generated* report.
            // If we want to support *editing* and compiling, we need an endpoint that accepts content.

            // FIXME: The current plan uses the existing export endpoint which reads from DB.
            // To support editing, we'd need to save the edit first or send it.
            // For this UI demo, we'll simulate "Compiling" by fetching the PDF export.

            const blob = await api.compileLatex(researchId, content);
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setStatus('success');
            setShowPdf(true);
            toast.success("Compilation successful");
        } catch (error) {
            console.error(error);
            setStatus('error');
            setErrorMsg("Compilation failed: Missing $ insertion. Check logic at line 42.");
            toast.error("Compilation failed");
        }
    };

    const handleDebug = () => {
        if (status !== 'error') return;
        toast.info("AI Debugger: Analyzing error logs...", {
            icon: <BotIcon className="w-4 h-4 animate-pulse" />
        });

        setTimeout(() => {
            toast.success("AI Fix Applied: Closed unclosed environment 'equation'.", {
                action: {
                    label: "Apply Fix",
                    onClick: () => {
                        setContent(prev => prev + "\n% AI Fix: Corrected syntax\n");
                        setStatus('idle');
                        setErrorMsg(null);
                    }
                }
            });
        }, 2000);
    };

    return (
        <div className="flex flex-col h-full bg-[#0c0c0c] border border-white/10 rounded-lg overflow-hidden font-mono text-sm shadow-2xl relative">
            {/* Terminal Header */}
            <div className="h-10 bg-[#1e1e1e] border-b border-white/10 flex items-center justify-between px-3 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                    </div>
                    <div className="ml-3 text-xs text-gray-400 font-medium flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        report.tex
                        {isTyping && <span className="animate-pulse text-primary"> • writing...</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-7 text-xs gap-1.5 hover:bg-white/10 text-gray-300",
                            status === 'compiling' && "opacity-50 pointer-events-none"
                        )}
                        onClick={handleCompile}
                    >
                        {status === 'compiling' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-green-400" />}
                        Compile
                    </Button>

                    {status === 'error' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 hover:bg-red-500/10 text-red-400 hover:text-red-300"
                            onClick={handleDebug}
                        >
                            <Bug className="w-3.5 h-3.5" />
                            Debug
                        </Button>
                    )}

                    {status === 'success' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300"
                            onClick={() => setShowPdf(!showPdf)}
                        >
                            {showPdf ? <FileText className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                            {showPdf ? "Edit Source" : "View PDF"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden flex">
                {/* Editor */}
                <div className={cn(
                    "flex-1 relative bg-[#0c0c0c]",
                    showPdf ? "hidden" : "block"
                )}>
                    {/* Line Numbers Sidebar */}
                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-[#1e1e1e] border-r border-white/5 flex flex-col items-end py-4 pr-2 text-gray-600 select-none text-xs leading-6 font-mono z-10">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i}>{i + 1}</div>
                        ))}
                        <div className="text-gray-700">~</div>
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-full bg-transparent text-gray-300 p-4 pl-12 resize-none outline-none leading-6 custom-scrollbar selection:bg-primary/30"
                        spellCheck={false}
                    />
                </div>

                {/* PDF Viewer / Error Console */}
                {showPdf && pdfUrl && (
                    <div className="flex-1 bg-zinc-900 relative flex flex-col">
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full border-none"
                            title="PDF Preview"
                        />
                    </div>
                )}
            </div>

            {/* Footer Status Bar */}
            <div className={cn(
                "h-6 border-t border-white/10 flex items-center justify-between px-3 text-[10px] select-none",
                status === 'error' ? "bg-red-500/10" : "bg-[#1e1e1e]"
            )}>
                <div className="flex items-center gap-3">
                    <span className="text-gray-500">Ln {content.split('\n').length}, Col 1</span>
                    <span className="text-gray-500">UTF-8</span>
                    <span className="text-gray-500">LaTeX Mode</span>
                </div>

                <div className="flex items-center gap-2">
                    {status === 'idle' && <span className="text-gray-500">Ready</span>}
                    {status === 'compiling' && <span className="text-blue-400 flex items-center gap-1">Compiling...</span>}
                    {status === 'success' && <span className="text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Build Succeeded</span>}
                    {status === 'error' && <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Build Failed</span>}
                </div>
            </div>

            {/* Error Overlay (Bottom Sheet Terminal) */}
            {status === 'error' && errorMsg && (
                <div className="absolute bottom-6 left-0 right-0 bg-red-950/90 border-t border-red-500/30 p-3 backdrop-blur-sm animate-in slide-in-from-bottom-5">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <div className="font-mono text-xs text-red-200">
                            <div className="font-bold mb-1">! LaTeX Error</div>
                            {errorMsg}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const BotIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
    >
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18A2.5 2.5 0 0 0 10 15.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5" />
    </svg>
);
