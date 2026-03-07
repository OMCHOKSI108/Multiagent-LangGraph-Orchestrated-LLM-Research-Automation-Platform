import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Database, Search, UploadCloud, RefreshCw, ChevronDown, Activity, Box, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export const VectorStorePanel = () => {
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Search
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[] | null>(null);
    const [searching, setSearching] = useState(false);

    // Ingest
    const [ingestText, setIngestText] = useState('');
    const [ingesting, setIngesting] = useState(false);

    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const data = await api.getAdminWorkspaces();
                setWorkspaces(data.workspaces || []);
                if (data.workspaces && data.workspaces.length > 0) {
                    setSelectedWorkspace(data.workspaces[0].id);
                }
            } catch (err) {
                toast.error('Failed to mount vector workspaces');
            } finally {
                setLoading(false);
            }
        };
        fetchWorkspaces();
    }, []);

    useEffect(() => {
        if (selectedWorkspace) {
            loadVectorStats(selectedWorkspace);
        }
    }, [selectedWorkspace]);

    const loadVectorStats = async (wsId: string) => {
        setStats(null);
        try {
            const data = await api.getAdminVectorStats(wsId);
            setStats(data);
        } catch (e) {
            // It throws 404 naturally when no elements exist in standard chromadb usually, we can safely ignore or show 0
            setStats({ total_documents: 0, items_count: 0 });
        }
    };

    const handleSearch = async () => {
        if (!selectedWorkspace || !query.trim()) return;
        setSearching(true);
        try {
            const res = await api.adminVectorSearch(selectedWorkspace, query);
            setSearchResults(res.results || []);
            toast.success(`Found ${res.results?.length || 0} relative chunks`);
        } catch (e) {
            toast.error('Search query operation failed');
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleIngest = async () => {
        if (!selectedWorkspace || !ingestText.trim()) return;
        setIngesting(true);
        try {
            const res = await api.adminVectorIngest(selectedWorkspace, ingestText);
            toast.success(`Successfully embedded ${res.chunks_added || 0} chunks`);
            setIngestText('');
            loadVectorStats(selectedWorkspace);
        } catch (e) {
            toast.error('Data ingestion failed');
        } finally {
            setIngesting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Database size={24} className="text-[#D97757]" /> Vector Store Monitor
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Audit high-dimensional embeddings and manage semantic partitions.</p>
                </div>

                <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-lg shadow-sm">
                    <span className="text-xs font-semibold text-gray-500 pl-2">PARTITION:</span>
                    <div className="relative">
                        <select
                            className="appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded focus:ring-[#D97757] focus:border-[#D97757] block w-48 p-2 pr-8 font-medium cursor-pointer"
                            value={selectedWorkspace || ''}
                            onChange={(e) => setSelectedWorkspace(e.target.value)}
                            disabled={loading}
                        >
                            {workspaces.map(w => (
                                <option key={w.id} value={w.id}>{w.name} (ID: {w.id})</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Status Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#1A1915] rounded-xl border border-gray-800 p-6 text-white shadow-lg relative overflow-hidden">
                        {/* Decorative bg element */}
                        <div className="absolute right-0 top-0 -mr-8 -mt-8 opacity-10 blur-xl">
                            <Database size={120} />
                        </div>

                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 relative z-10">
                            <Activity className="text-[#D97757]" /> Collection Telemetry
                        </h3>

                        {!stats ? (
                            <div className="flex gap-2 items-center text-gray-400 text-sm">
                                <RefreshCw size={14} className="animate-spin" /> Scanning ChromaDB instances...
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                    <p className="text-xs text-gray-400 font-mono mb-1 uppercase">Source Docs</p>
                                    <p className="text-2xl font-bold">{stats.total_documents || 0}</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                    <p className="text-xs text-gray-400 font-mono mb-1 uppercase">Vector Chunks</p>
                                    <p className="text-2xl font-bold text-[#D97757]">{stats.items_count || 0}</p>
                                </div>
                                <div className="col-span-2 bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-400 font-mono mb-1 uppercase">Collection ID</p>
                                        <p className="text-sm font-mono truncate text-gray-300">workspace_{selectedWorkspace || 'null'}</p>
                                    </div>
                                    <Box size={20} className="text-white/20" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Ingest Panel */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <UploadCloud size={18} className="text-indigo-600" /> Manual Data Ingestion
                        </h3>
                        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                            Inject raw text directly into the selected vector collection. The text will be chunked via `RecursiveCharacterTextSplitter` and embedded using the active model.
                        </p>
                        <textarea
                            className="w-full text-sm border border-gray-300 rounded-lg p-3 h-32 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none font-mono"
                            placeholder="Enter raw text payload to embed..."
                            value={ingestText}
                            onChange={val => setIngestText(val.target.value)}
                        />
                        <button
                            onClick={handleIngest}
                            disabled={ingesting || !ingestText.trim() || !selectedWorkspace}
                            className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            {ingesting ? <RefreshCw className="animate-spin" size={16} /> : 'Execute Sequence'}
                        </button>
                    </div>
                </div>

                {/* Search Panel */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-[650px]">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Search size={18} className="text-[#D97757]" /> Semantic Probe
                        </h3>
                        <p className="text-xs text-gray-500 font-mono">Top K: 5</p>
                    </div>

                    <div className="p-6 border-b border-gray-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]"
                                placeholder="Enter probe query (e.g. 'What is attention mechanism?')"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                            <button
                                onClick={handleSearch}
                                disabled={searching || !query.trim() || !selectedWorkspace}
                                className="bg-[#1A1915] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                                Probe
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-[#FAF9F6]">
                        {searching ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                                <RefreshCw className="animate-spin text-[#D97757]" size={32} />
                                <span className="text-sm font-mono">Computing Cosine Similarity...</span>
                            </div>
                        ) : !searchResults ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 opacity-50">
                                <Database size={48} />
                                <span className="text-sm">Initiate a probe to visualize embedding distances</span>
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                                <AlertTriangle size={32} />
                                <span>No relevant chunks found within threshold.</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Retrieval Results</h4>
                                {searchResults.map((res: any, idx: number) => (
                                    <div key={idx} className="bg-white border text-sm border-gray-200 rounded-lg p-4 shadow-sm relative group overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[#D97757]" />
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                                                Match: {(res.relevance_score * 100).toFixed(1)}%
                                            </div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-widest truncate max-w-[200px]" title={res.metadata?.source}>
                                                SRC: {res.metadata?.source || 'unknown'}
                                            </div>
                                        </div>
                                        <p className="text-gray-700 leading-relaxed font-serif break-words">
                                            {res.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
