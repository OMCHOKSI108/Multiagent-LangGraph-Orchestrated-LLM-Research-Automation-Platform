import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useResearchStore } from '../store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Send, StopCircle, Bot, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MessageBoxLoading } from './MessageBoxLoading';
import { api } from '../services/api';
import { toast } from 'sonner';
import { AppErrorBoundary } from './AppErrorBoundary';

export const ChatInterface = () => {
    const navigate = useNavigate();
    const {
        chatHistory,
        addChatMessage,
        activeJob,
        stopPolling,
        setCurrentStage,
        setStartedAt,
        startedAt,
        createResearch
    } = useResearchStore(useShallow(state => ({
        chatHistory: state.chatHistory,
        addChatMessage: state.addChatMessage,
        activeJob: state.activeJob,
        stopPolling: state.stopPolling,
        setCurrentStage: state.setCurrentStage,
        setStartedAt: state.setStartedAt,
        startedAt: state.startedAt,
        createResearch: state.createResearch
    })));

    const isProcessing = activeJob?.status === 'processing' || activeJob?.status === 'queued';
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const appendLocalMessage = React.useCallback((content: string, role: 'user' | 'assistant') => {
        const msg = {
            id: Math.random().toString(36),
            role,
            content,
            timestamp: new Date().toISOString(),
        };
        useResearchStore.setState((state: any) => ({
            chatHistory: [...state.chatHistory, msg],
        }));
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, activeJob?.logs]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        const check = async () => {
            try {
                await api.healthCheck();
                if (mounted) setConnectionStatus('online');
            } catch {
                if (mounted) setConnectionStatus('offline');
            }
        };
        check();
        const interval = setInterval(check, 15000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    const sendMessage = (rawInput: string) => {
        const trimmedInput = rawInput.trim();
        if (!trimmedInput || isStreaming) return;

        const researchMatch = trimmedInput.match(/^\/research\s+(?:(deep|quick)\s+)?(.+)$/i);

        // Research command
        if (researchMatch) {
            const depth = (researchMatch[1] || 'deep').toLowerCase() as 'deep' | 'quick';
            const topic = researchMatch[2].trim();

            if (!topic) {
                appendLocalMessage(trimmedInput, 'user');
                appendLocalMessage('Please specify a research topic. Usage: `/research [deep|quick] <topic>`', 'assistant');
                setInput('');
                return;
            }

            appendLocalMessage(trimmedInput, 'user');

            // If already inside a workspace, lock/select topic in-place instead of creating a new job.
            if (activeJob?.id) {
                appendLocalMessage(`Setting topic: "${topic}" (${depth} mode)...`, 'assistant');
                api.selectTopic(activeJob.id, topic)
                    .then(() => {
                        useResearchStore.getState().setTopicSuggestions([]);
                        appendLocalMessage(`Topic locked: **${topic}**. Research is starting in this workspace.`, 'assistant');
                    })
                    .catch((error: any) => {
                        appendLocalMessage(`Error setting topic: ${error?.message || 'Unknown error'}`, 'assistant');
                    });
                setInput('');
                return;
            }

            // If no active workspace, create a new one and navigate.
            appendLocalMessage(`Creating new research for: "${topic}" (${depth} mode)...`, 'assistant');
            createResearch(topic, depth)
                .then((id) => navigate(`/research/${id}`))
                .catch((error: any) => {
                    appendLocalMessage(`Error creating research: ${error?.message || 'Unknown error'}`, 'assistant');
                });

            setInput('');
            return; // CRITICAL FIX: Stop command from being sent to LLM as chat
        }

        // Check if we are in Topic Selection mode
        const { topicSuggestions } = useResearchStore.getState();
        if (topicSuggestions && topicSuggestions.length > 0) {
            // Treat input as topic selection/refinement
            handleTopicSelect(trimmedInput);
            setInput('');
            return;
        }

        // Create abort controller for streaming
        abortControllerRef.current = new AbortController();
        setIsStreaming(true);

        addChatMessage(trimmedInput, 'user', abortControllerRef.current.signal)
            .finally(() => {
                setIsStreaming(false);
                abortControllerRef.current = null;
            });
        setInput('');
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsStreaming(false);
        }
    };

    // ... existing code ...

    // Topic Selection Handler
    const handleTopicSelect = async (topic: string) => {
        if (!activeJob) return;
        try {
            await api.selectTopic(activeJob.id, topic);

            // Optimistic update
            useResearchStore.getState().setTopicSuggestions([]); // Clear suggestions
            appendLocalMessage(`Selected Research Topic: **${topic}**`, 'user');
            appendLocalMessage(`Topic locked. Proceeding with research...`, 'assistant');
        } catch (error) {
            toast.error("Failed to select topic");
        }
    };

    const { topicSuggestions } = useResearchStore(useShallow(state => ({
        topicSuggestions: state.topicSuggestions
    })));

    return (
        <AppErrorBoundary
            fallback={
                <div className="flex flex-col h-full bg-card border-r border-border relative items-center justify-center">
                    <div className="text-center">
                        <Bot className="w-12 h-12 mb-4 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Chat interface error. Please refresh the page.</p>
                    </div>
                </div>
            }
            onError={(error) => console.error('Chat interface error:', error)}
        >
            <div className="flex flex-col h-full bg-card border-r border-border relative">
                {/* Header */}
                <div className="h-16 shrink-0 border-b border-border flex items-center px-4 bg-card">
                    <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-foreground">Research Assistant</div>
                            <div className="text-[11px] text-muted-foreground">AI Engine</div>
                        </div>
                    </div>

                    <div>
                        {isStreaming ? (
                            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 shadow-sm">
                                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                <span className="text-xs font-medium">Thinking...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {topicSuggestions?.length > 0 && (
                                    <span
                                        className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-[10px] font-medium text-primary uppercase tracking-wider"
                                        title="Debug: suggestions currently loaded in frontend store"
                                    >
                                        Suggestions: {topicSuggestions.length}
                                    </span>
                                )}
                                <span className="ml-2 px-2 py-0.5 rounded-full bg-secondary/50 border border-white/10 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                    {connectionStatus === 'offline' ? 'Using Ollama' : connectionStatus}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 scroll-smooth space-y-4 min-h-0">
                {!chatHistory.some(m => m.role === 'user') && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                        <Bot className="w-12 h-12 mb-4" />
                        <p>Enter a topic to start research</p>
                    </div>
                )}

                {chatHistory.map((msg) => {
                    const isAssistant = msg.role === 'assistant';
                    return (
                        <div key={msg.id} className="flex flex-col">
                            <div
                                className={cn(
                                    "rounded-xl p-4 max-w-[85%] text-sm leading-relaxed shadow-sm transition-all",
                                    msg.role === 'user'
                                        ? "ml-auto max-w-[80%] bg-card border border-primary/30 text-foreground dark:bg-card dark:border-primary/50 dark:text-white"
                                        : "mr-auto bg-card border border-border/60 text-foreground dark:bg-card dark:text-white"
                                )}
                            >
                                {msg.content ? (
                                    <MarkdownRenderer
                                        content={msg.content}
                                        className={msg.role === 'user' ? 'prose-inherit' : ''}
                                    />
                                ) : (
                                    <MessageBoxLoading />
                                )}
                            </div>
                            <span className={cn(
                                "text-[10px] text-muted-foreground mt-1 px-1",
                                msg.role === 'user' ? "ml-auto" : "mr-auto"
                            )}>
                                {isAssistant ? "AI Engine" : "You"}
                            </span>
                        </div>
                    );
                })}

                {/* Topic Selection UI */}
                {topicSuggestions && topicSuggestions.length > 0 && (
                    <div className="flex flex-col gap-2 mt-4 ml-auto mr-auto max-w-[85%] w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-lg">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Bot className="w-4 h-4 text-primary" />
                                Select a Research Angle
                            </h3>
                            <div className="space-y-2">
                                {topicSuggestions.map((suggestion: any, idx: number) => {
                                    const title = typeof suggestion === 'string' ? suggestion : suggestion.title;
                                    const desc = typeof suggestion === 'string' ? '' : suggestion.novelty_angle || suggestion.domain;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleTopicSelect(title)}
                                            className="w-full text-left p-3 rounded-lg border border-border/40 hover:bg-secondary/50 hover:border-primary/50 transition-all group relative overflow-hidden"
                                        >
                                            <div className="font-medium text-sm group-hover:text-primary transition-colors">{title}</div>
                                            {desc && <div className="text-xs text-muted-foreground mt-1">{desc}</div>}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowRight className="w-4 h-4 text-primary" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card border-t border-border space-y-3">
                {/* Quick Commands */}
                {/* Persistent Quick Actions */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                        onClick={() => {
                            const cmd = "/research ";
                            setInput(cmd);
                            // Optional: auto-focus input
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary transition-colors border border-primary/20"
                    >
                        <Bot className="w-3 h-3" />
                        Start Research
                    </button>

                    {[
                        { label: "Deep Dive", cmd: "/research deep " },
                        { label: "Quick Scan", cmd: "/research quick " },
                        { label: "Help", cmd: "/help" }
                    ].map((action, i) => (
                        <button
                            key={i}
                            onClick={() => setInput(action.cmd)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary text-xs font-medium text-secondary-foreground transition-colors border border-transparent hover:border-border"
                        >
                            <span className="opacity-70">/</span>
                            {action.label}
                        </button>
                    ))}
                </div>
                <form onSubmit={handleSend} className="relative">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isStreaming ? "AI is thinking..." : "Type a message or /command..."}
                        className={cn(
                            "pr-20 h-11 rounded-xl",
                            isStreaming ? "bg-background/95 border-border ring-2 ring-amber-400/20 opacity-95 cursor-not-allowed" : "bg-background border-border"
                        )}
                        disabled={isStreaming}
                    />
                    <div className="absolute right-1 top-1 flex gap-1">
                        {isStreaming && (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={handleStop}
                                title="Stop generation"
                            >
                                <StopCircle className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            type="submit"
                            size="icon"
                            variant={isStreaming ? "ghost" : "default"}
                            className={cn(
                                "h-8 w-8",
                                isStreaming ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground hover:brightness-95"
                            )}
                            disabled={!input.trim() || isStreaming}
                        >
                            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                </form>
            </div>
        </AppErrorBoundary>
    );
};
