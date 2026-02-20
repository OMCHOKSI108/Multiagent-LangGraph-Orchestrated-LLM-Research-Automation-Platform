import React, { useState, useEffect } from 'react';
import { X, Lightbulb, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

const ONBOARDING_KEY = 'deepresearch-onboarding-dismissed';

/**
 * A single-use onboarding hint that teaches new users 
 * the workspace workflow. Dismisses permanently via localStorage.
 */
export const OnboardingHint: React.FC<{ className?: string }> = ({ className }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem(ONBOARDING_KEY);
        if (!dismissed) setVisible(true);
    }, []);

    const dismiss = () => {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className={`mx-4 my-3 rounded-lg border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-4 duration-500 ${className || ''}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                    <div className="mt-0.5 h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Lightbulb className="w-4 h-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-foreground">Welcome to your Workspace</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Enter a research topic in the chat panel on the left to start. Our AI agents will gather sources,
                            analyze data, and generate a comprehensive report — all visible in real-time across the panels.
                        </p>
                        <div className="flex items-center gap-3 pt-1.5">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                Chat <ArrowRight className="w-2.5 h-2.5" /> Sources <ArrowRight className="w-2.5 h-2.5" /> Report
                            </span>
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={dismiss}
                >
                    <X className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
};
