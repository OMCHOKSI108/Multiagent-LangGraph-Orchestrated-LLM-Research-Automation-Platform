import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { MessageSquare, BrainCircuit, Search, Trash2, Maximize2, User, Bot, AlertTriangle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export const ChatPanel = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [memories, setMemories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'chat' | 'memory'>('chat');

    const [memSearch, setMemSearch] = useState('');

    const [transcriptData, setTranscriptData] = useState<any[] | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            if (activeTab === 'chat') {
                const data = await api.getAdminChatSessions();
                setSessions(data.sessions || []);
            } else {
                if (!memSearch) {
                    const data = await api.getAdminMemories();
                    setMemories(data.memories || []);
                }
            }
        } catch (e) {
            toast.error('Failed to load surveillance data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [activeTab]);

    const handleSearchMemories = async () => {
        if (!memSearch.trim()) {
            fetchData();
            return;
        }
        setLoading(true);
        try {
            const data = await api.searchAdminMemories(memSearch);
            setMemories(data.results || []);
        } catch (e) {
            toast.error('Memory search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleMemSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearchMemories();
    };

    const handleDeleteMemory = async (id: string, content: string) => {
        if (window.confirm(`Are you sure you want to delete this memory cross-network?\nWarning: This removes context for user's AI agents.`)) {
            try {
                await api.deleteAdminMemory(id);
                toast.success('Memory purged');
                setMemories(prev => prev.filter(m => String(m.id) !== String(id)));
            } catch (e) {
                toast.error('Failed to delete memory');
            }
        }
    };

    const loadTranscript = async (sessionId: string) => {
        setActiveSessionId(sessionId);
        setTranscriptData(null);
        try {
            const data = await api.getAdminChatTranscript(sessionId);
            setTranscriptData(data.transcript || []);
        } catch (err) {
            toast.error('Could not load transcript');
            setActiveSessionId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <MessageSquare size={24} className="text-[#D97757]" /> User Conversations & Memory
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Audit interaction logs and stored network variables (Memories).</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white border border-gray-200 rounded-lg p-1 w-full max-w-sm shadow-sm">
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'bg-[#1A1915] text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    <MessageSquare size={16} /> Chat Transcripts
                </button>
                <button
                    onClick={() => setActiveTab('memory')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'memory' ? 'bg-[#1A1915] text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    <BrainCircuit size={16} /> Vector Memories
                </button>
            </div>

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sessions List */}
                    <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[600px]">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 font-bold text-gray-900 text-sm">
                            Active Sessions ({sessions.length})
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {loading ? (
                                <div className="p-4 text-center text-sm text-gray-400">Loading sessions...</div>
                            ) : sessions.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-400">No chat sessions found.</div>
                            ) : (
                                sessions.map((sess) => (
                                    <button
                                        key={sess.session_id}
                                        onClick={() => loadTranscript(sess.session_id)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all ${activeSessionId === sess.session_id
                                                ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                                : 'bg-white border-transparent hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="text-xs font-mono text-gray-500 truncate mb-1">ID: {sess.session_id.split('-')[0]}...</div>
                                        <div className="font-medium text-sm text-gray-900 truncate flex items-center gap-2">
                                            <User size={14} className="text-[#D97757]" /> {sess.user_email?.replace('disabled_', '') || 'Ghost User'}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1 flex justify-between">
                                            <span>{sess.message_count} messages</span>
                                            <span>{new Date(sess.last_activity).toLocaleDateString()}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Transcript View */}
                    <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[600px]">
                        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <span className="font-bold text-gray-900 text-sm">
                                {activeSessionId ? `Transcript Viewer` : 'Select a Session'}
                            </span>
                            {activeSessionId && <span className="text-xs text-gray-400 font-mono">Read Only 🔒</span>}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-[#FAF9F6]">
                            {!activeSessionId ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <MessageSquare size={48} className="mb-4 opacity-50" />
                                    <p className="text-sm">Click a session to read transcripts</p>
                                </div>
                            ) : !transcriptData ? (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    Loading messages...
                                </div>
                            ) : transcriptData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    This session is empty.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {transcriptData.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                                                    ? 'bg-[#1A1915] text-[#FAF9F6] rounded-br-sm'
                                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                                                }`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    {msg.role === 'user' ? <User size={14} className="text-[#D97757]" /> : <Bot size={14} className="text-indigo-500" />}
                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                                                        {msg.role}
                                                    </span>
                                                    <span className="text-[10px] opacity-40 ml-auto">
                                                        {new Date(msg.created_at).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MEMORY TAB */}
            {activeTab === 'memory' && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search vector memories via semantic match / text..."
                                value={memSearch}
                                onChange={(e) => setMemSearch(e.target.value)}
                                onKeyDown={handleMemSearchKeyDown}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757] w-full bg-white"
                            />
                        </div>
                        <button
                            onClick={handleSearchMemories}
                            className="bg-[#1A1915] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                        >
                            Search
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Memory Content</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32 hidden md:table-cell">Created</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">Querying memory store...</td></tr>
                                ) : memories.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">No memories found.</td></tr>
                                ) : (
                                    memories.map((mem) => (
                                        <tr key={mem.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                        <User size={14} className="text-indigo-600" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{mem.user_email?.replace('disabled_', '') || 'Guest'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-100 italic break-words max-w-2xl">
                                                    "{mem.content}"
                                                </div>
                                                {mem.source && <span className="inline-block mt-2 text-[10px] font-mono text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">SRC: {mem.source}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 hidden md:table-cell">
                                                {new Date(mem.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteMemory(mem.id, mem.content)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete Memory Override"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
