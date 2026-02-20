import React, { useEffect } from 'react';
import { useResearchStore } from '../store';
import { CheckCircle2, AlertCircle, Globe, BookOpen, Search, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const ProviderIcon = ({ name }: { name: string }) => {
    const n = name.toLowerCase();
    if (n.includes('google') || n.includes('duck')) return <Search className="w-4 h-4" />;
    if (n.includes('arxiv') || n.includes('alex') || n.includes('pub')) return <BookOpen className="w-4 h-4" />;
    if (n.includes('wiki')) return <Globe className="w-4 h-4" />;
    return <Database className="w-4 h-4" />;
};

export const ProvidersList = () => {
    const { providers, fetchProviders } = useResearchStore();

    useEffect(() => {
        fetchProviders();
    }, [fetchProviders]);

    if (!providers) {
        return <div className="p-4 text-sm text-muted-foreground">Loading providers...</div>;
    }

    const available = providers.available || [];
    const unavailable = providers.unavailable || [];

    return (
        <Card className="h-full border-0 shadow-none">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Data Sources
                </CardTitle>
                <CardDescription>
                    Active search engines and academic databases used for research.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[calc(100vh-200px)] pr-4">
                    <div className="space-y-6">
                        {/* Available Providers */}
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                Active Sources
                            </h3>
                            <div className="grid gap-3">
                                {available.map((provider: string) => (
                                    <div key={provider} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <ProviderIcon name={provider} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium capitalize">{provider.replace('_', ' ')}</span>
                                                <span className="text-[10px] text-muted-foreground">Operational</span>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                            Active
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Unavailable Providers */}
                        {unavailable.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2 mt-6">
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                    configured but unavailable
                                </h3>
                                <div className="grid gap-3 opacity-60">
                                    {unavailable.map((provider: string) => (
                                        <div key={provider} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                    <ProviderIcon name={provider} />
                                                </div>
                                                <span className="text-sm font-medium capitalize text-muted-foreground">{provider}</span>
                                            </div>
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                Missing Key
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
