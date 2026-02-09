import React, { useRef, useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useResearchStore } from '../store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Bot, User, Send, StopCircle, Sparkles, Loader2, Terminal, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MessageBoxLoading } from './MessageBoxLoading';

export const ChatInterface = () => {
    const {
        chatHistory,
        addChatMessage,
        activeJob,
        stopPolling,
        setCurrentStage,
        setStartedAt,
        startedAt
    } = useResearchStore(useShallow(state => ({
        chatHistory: state.chatHistory,
        addChatMessage: state.addChatMessage,
        activeJob: state.activeJob,
        stopPolling: state.stopPolling,
        setCurrentStage: state.setCurrentStage,
        setStartedAt: state.setStartedAt,
        startedAt: state.startedAt
    })));
    
    const isProcessing = activeJob?.status === 'processing' || activeJob?.status === 'queued';
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, activeJob?.logs]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;
        
        // Smart local responses for common patterns
        const message = input.trim().toLowerCase();
        
        // Greetings
        if (['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'].includes(message)) {
            addChatMessage(input, 'user');
            addChatMessage("Hello! I'm your research assistant. Try `/research [topic]` to start a new research, or ask me anything about your current workspace.", 'assistant');
            setInput('');
            return;
        }
        
        // Gratitude
        if (['thanks', 'thank you', 'great', 'perfect', 'awesome', 'cool'].includes(message)) {
            addChatMessage(input, 'user');
            addChatMessage("Glad I could help! Let me know if you need anything else.", 'assistant');
            setInput('');
            return;
        }
        
        // Help
        if (['help', '?', '/help'].includes(message)) {
            addChatMessage(input, 'user');
            addChatMessage(`**Available Commands:**

\`/research [topic]\` - Start comprehensive research\n\`/edit [section]\` - Edit document sections\n\`/search [query]\` - Quick web search\n\`/sources\` - View all data sources\n\`/export\` - Download your research

Or just ask me any question about your research!`, 'assistant');
            setInput('');
            return;
        }
        
        // Research commands
        if (message.startsWith('/research')) {
            setCurrentStage('topic_discovery');
            if (!startedAt) {
                setStartedAt(new Date().toISOString());
            }
        }
        
        // Create abort controller for streaming
        abortControllerRef.current = new AbortController();
        setIsStreaming(true);
        
        addChatMessage(input, 'user', abortControllerRef.current.signal)
            .finally(() => {
                setIsStreaming(false);
                abortControllerRef.current = null;
            });
        setInput('');
    };
    
    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsStreaming(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-zinc-900/50 border-r border-border">
            {/* Header */}
            <div className="h-14 shrink-0 border-b border-border flex items-center px-4 bg-background">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    Research Assistant
                </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 scroll-smooth space-y-4">
                {chatHistory.length === 0 && (
                    <div className="text-center mt-12">
                        <Card className="p-6 max-w-sm mx-auto bg-gradient-to-br from-primary/5 to-brand/5 border-primary/10">
                            <div className="flex items-center justify-center mb-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Terminal className="w-6 h-6 text-primary" />
                                </div>
                            </div>
                            <h3 className="font-semibold text-foreground mb-2">Welcome to Research Assistant</h3>
                            <p className="text-sm text-muted-foreground mb-4">Start your research journey or manage your workspace</p>
                            
                            <div className="space-y-2 text-xs">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full justify-start text-left h-auto p-3"
                                    onClick={() => setInput('/research AI in healthcare')}
                                >
                                    <ArrowRight className="w-3 h-3 mr-2 text-brand" />
                                    <div>
                                        <div className="font-medium">Start Research</div>
                                        <div className="text-muted-foreground">Type `/research [topic]`</div>
                                    </div>
                                </Button>
                                
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full justify-start text-left h-auto p-3"
                                    onClick={() => setInput('What is in my current research?')}
                                >
                                    <ArrowRight className="w-3 h-3 mr-2 text-brand" />
                                    <div>
                                        <div className="font-medium">Ask Questions</div>
                                        <div className="text-muted-foreground">About your workspace</div>
                                    </div>
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {chatHistory.map((msg) => {
                    const isAssistant = msg.role === 'assistant';
                    return (
                        <div key={msg.id} className={cn("flex flex-col max-w-[95%]", isAssistant ? "items-start" : "items-end ml-auto")}>
                            <div className={cn(
                                "rounded-lg p-3 text-sm shadow-sm",
                                isAssistant
                                    ? "bg-white border border-border text-foreground dark:bg-card"
                                    : "bg-primary text-primary-foreground"
                            )}>
                                {msg.content ? (
                                    <MarkdownRenderer content={msg.content} />
                                ) : (
                                    <MessageBoxLoading />
                                )}
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                {isAssistant ? "AI Engine" : "You"}
                            </span>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t border-border">
                <form onSubmit={handleSend} className="relative">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isStreaming ? "AI is responding..." : "Type a message or /command..."}
                        className="pr-20 bg-white dark:bg-card"
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
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            disabled={!input.trim() || isStreaming}
                        >
                            {isProcessing && !isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
