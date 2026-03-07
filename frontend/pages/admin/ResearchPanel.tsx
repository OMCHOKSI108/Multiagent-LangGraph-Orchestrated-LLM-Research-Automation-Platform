import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Search, Trash2, Download, Eye, ExternalLink, Activity } from 'lucide-react';
import { toast } from 'sonner';

export const ResearchPanel = () => {
    const [researchList, setResearchList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchResearch = async () => {
        try {
            const data = await api.getAdminResearch();
            setResearchList(data.research_logs || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load research logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResearch();
        const interval = setInterval(fetchResearch, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleDelete = async (id: string, title: string) => {
        if (window.confirm(`Are you sure you want to delete research "${title}"? This cannot be undone.`)) {
            try {
                await api.deleteResearch(id);
                toast.success('Research deleted successfully');
                setResearchList(prev => prev.filter(r => r.id !== id));
            } catch (err) {
                toast.error('Failed to delete research');
            }
        }
    };

    const filteredResearch = researchList.filter(r =>
        (r.task || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
        String(r.id).includes(search)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Research Surveillance</h2>
                    <p className="text-sm text-gray-500 mt-1">Monitor all research pipelines globally across the network.</p>
                </div>

                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search topic, ID, or user..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:border-transparent w-full sm:w-72 bg-white"
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Topic / Title</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Created</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && researchList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Scanning research pipelines...</td>
                                </tr>
                            ) : filteredResearch.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No active research matching "{search}"</td>
                                </tr>
                            ) : (
                                filteredResearch.map((job) => {

                                    const isDone = job.status === 'completed';
                                    const isRunning = job.status === 'processing';
                                    const isFailed = job.status === 'failed';

                                    return (
                                        <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                                #{job.id}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col max-w-sm">
                                                    <span className="font-medium text-sm text-gray-900 truncate" title={job.title || job.task}>{job.title || job.task || 'Untitled Research'}</span>
                                                    <span className="text-xs text-gray-500 truncate mt-0.5">Stage: {job.current_stage || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {job.user_email?.replace('disabled_', '') || 'Ghost'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isDone ? 'bg-green-50 text-green-700 border-green-200' :
                                                        isRunning ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            isFailed ? 'bg-red-50 text-red-700 border-red-200' :
                                                                'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-green-500' :
                                                            isRunning ? 'bg-amber-500 animate-pulse' :
                                                                isFailed ? 'bg-red-500' : 'bg-gray-500'
                                                        }`} />
                                                    {job.status?.toUpperCase() || 'UNKNOWN'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                                                {new Date(job.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                        title="Live Stream / Read Report"
                                                        onClick={() => window.open(`/#/research/${job.id}`, '_blank')}
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    <button
                                                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                        title="Download PDF"
                                                        onClick={() => api.exportPDF(job.id)}
                                                    >
                                                        <Download size={16} />
                                                    </button>

                                                    <button
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Purge Research"
                                                        onClick={() => handleDelete(job.id, job.title || job.task)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
