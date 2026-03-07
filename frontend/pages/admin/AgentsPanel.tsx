import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Bot, Network, Play, Settings2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const AgentsPanel = () => {
    const [agents, setAgents] = useState<any>({});
    const [providers, setProviders] = useState<any[]>([]);
    const [llmStatus, setLlmStatus] = useState<any>(null);

    const [testingAgent, setTestingAgent] = useState<string | null>(null);
    const [testingProvider, setTestingProvider] = useState<string | null>(null);

    const [agentResults, setAgentResults] = useState<Record<string, 'success' | 'fail'>>({});
    const [providerResults, setProviderResults] = useState<Record<string, { status: 'success' | 'fail', latency?: number }>>({});

    const [isTestingAll, setIsTestingAll] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const [agentsData, providersData, statusData] = await Promise.all([
                api.getAdminAgents().catch(() => ({})),
                api.getAdminProviders().catch(() => []),
                api.getLLMStatus().catch(() => null)
            ]);
            setAgents(agentsData.agents || {});
            setProviders(providersData.providers || []);
            setLlmStatus(statusData);
        } catch (e) {
            toast.error('Failed to load agent configuration');
        }
    };

    const handleTestAgent = async (slug: string) => {
        setTestingAgent(slug);
        try {
            await api.testAdminAgent(slug);
            setAgentResults(prev => ({ ...prev, [slug]: 'success' }));
            toast.success(`Agent ${slug} responded successfully`);
        } catch (e) {
            setAgentResults(prev => ({ ...prev, [slug]: 'fail' }));
            toast.error(`Agent ${slug} test failed`);
        } finally {
            setTestingAgent(null);
        }
    };

    const handleTestProvider = async (provider: string) => {
        setTestingProvider(provider);
        const start = Date.now();
        try {
            await api.testAdminProvider(provider);
            setProviderResults(prev => ({
                ...prev,
                [provider]: { status: 'success', latency: Date.now() - start }
            }));
        } catch (e) {
            setProviderResults(prev => ({
                ...prev,
                [provider]: { status: 'fail', latency: Date.now() - start }
            }));
        } finally {
            setTestingProvider(null);
        }
    };

    const handleTestAllProviders = async () => {
        if (!providers || providers.length === 0) return;
        setIsTestingAll(true);
        toast.info('Initiating bulk provider tests...');

        // Test sequentially to not overwhelm limits
        for (const p of providers) {
            await handleTestProvider(p);
            await new Promise(r => setTimeout(r, 500)); // Sleep between requests
        }

        setIsTestingAll(false);
        toast.success('All provider tests completed');
    };

    const agentEntries = Object.entries(agents);

    return (
        <div className="space-y-8">
            {/* Header & LLM Status */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Bot className="text-[#D97757]" /> Agent & Provider Control
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage network intelligence nodes and search capabilities.</p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">LLM Mode</span>
                        {llmStatus?.mode === 'OFFLINE' ? (
                            <div className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-bold rounded flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                ISOLATED (OFFLINE)
                            </div>
                        ) : (
                            <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-bold rounded flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                CONNECTED (ONLINE)
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">

                {/* Left Col: Agents Grid */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Settings2 size={18} className="text-gray-500" /> Available Agents ({agentEntries.length})
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-4">
                        {agentEntries.map(([slug, name]) => (
                            <div key={slug} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-[#D97757]/50 transition-colors group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-sm">{String(name)}</h4>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{slug}</p>
                                    </div>

                                    {agentResults[slug] === 'success' && <CheckCircle2 size={18} className="text-green-500" />}
                                    {agentResults[slug] === 'fail' && <XCircle size={18} className="text-red-500" />}
                                </div>

                                <button
                                    onClick={() => handleTestAgent(slug)}
                                    disabled={testingAgent === slug}
                                    className="w-full py-1.5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-xs font-medium text-gray-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {testingAgent === slug ? (
                                        <><Loader2 size={12} className="animate-spin" /> EXECUTING...</>
                                    ) : (
                                        <><Play size={12} /> TEST NODE</>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Col: Providers Table */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Network size={18} className="text-gray-500" /> Search Providers
                        </h3>
                        <button
                            onClick={handleTestAllProviders}
                            disabled={isTestingAll || providers.length === 0}
                            className="text-xs bg-[#1A1915] text-white px-3 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        >
                            {isTestingAll ? 'TESTING...' : 'TEST ALL'}
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Provider</th>
                                    <th className="px-4 py-3 font-semibold text-right">Health</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {providers.map((p) => {
                                    const res = providerResults[p];
                                    const isTestingThis = testingProvider === p;

                                    return (
                                        <tr key={p} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                                                {p}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {isTestingThis ? (
                                                    <span className="inline-flex items-center text-amber-600 text-xs font-mono gap-1">
                                                        <Loader2 size={12} className="animate-spin" /> PING...
                                                    </span>
                                                ) : res ? (
                                                    res.status === 'success' ? (
                                                        <span className="inline-flex items-center text-green-600 text-xs font-mono gap-1" title="Operational">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                            {res.latency}ms
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center text-red-600 text-xs font-mono gap-1" title="Failed to respond">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                            FAIL
                                                        </span>
                                                    )
                                                ) : (
                                                    <button
                                                        onClick={() => handleTestProvider(p)}
                                                        className="text-xs text-gray-400 hover:text-indigo-600 font-medium"
                                                    >
                                                        TEST NOW
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}

                                {providers.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="px-4 py-6 text-center text-gray-500 text-xs">
                                            No providers detected on network.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
