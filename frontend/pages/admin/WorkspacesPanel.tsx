import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { FolderKanban, Search, Trash2, Edit2, Check, X, Eye } from 'lucide-react';
import { toast } from 'sonner';

export const WorkspacesPanel = () => {
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const fetchWorkspaces = async () => {
        try {
            const data = await api.getAdminWorkspaces();

            // Attempt to enrich with sources count per spec (though doing it inline is N+1, we'll do best effort, or let the backend do it)
            // Spec: Sources count populated from GET /workspaces/:wid/sources
            // Doing this conditionally or letting backend do it is better. The spec says "Sources count populated from GET /workspaces/:wid/sources".
            // We will do a parallel lookup for each workspace.

            const enriched = await Promise.all(data.workspaces.map(async (ws: any) => {
                try {
                    const sData = await api.getWorkspaceSources(ws.id).catch(() => []);
                    return { ...ws, sources_count: sData?.length || 0 };
                } catch (e) {
                    return { ...ws, sources_count: 0 };
                }
            }));

            setWorkspaces(enriched);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load workspaces');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkspaces();
        const interval = setInterval(fetchWorkspaces, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete workspace "${name}"?\nThis restricts all associated research visibility.`)) {
            try {
                await api.deleteAdminWorkspace(id);
                toast.success('Workspace deleted');
                setWorkspaces(prev => prev.filter(w => w.id !== id));
            } catch (err) {
                toast.error('Failed to delete workspace');
            }
        }
    };

    const startEdit = (ws: any) => {
        setEditingId(ws.id);
        setEditName(ws.name);
    };

    const saveEdit = async (id: string) => {
        try {
            await api.updateAdminWorkspace(id, { name: editName });
            toast.success('Workspace updated');
            setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, name: editName } : w));
        } catch (err) {
            toast.error('Update failed');
        } finally {
            setEditingId(null);
        }
    };

    const filteredWorkspaces = workspaces.filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.owner_email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Workspace Manager</h2>
                    <p className="text-sm text-gray-500 mt-1">Audit active project folders and user partitions.</p>
                </div>

                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search workspaces..."
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
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Workspace Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Research Count</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Sources</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Created At</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && workspaces.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading workspaces...</td>
                                </tr>
                            ) : filteredWorkspaces.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No workspaces matching "{search}"</td>
                                </tr>
                            ) : (
                                filteredWorkspaces.map((ws) => (
                                    <tr key={ws.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            {editingId === ws.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(ws.id)}
                                                    />
                                                    <button onClick={() => saveEdit(ws.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={16} /></button>
                                                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <FolderKanban size={16} className="text-[#D97757]" />
                                                    <span className="font-medium text-sm text-gray-900">{ws.name}</span>
                                                    <button onClick={() => startEdit(ws)} className="text-gray-300 hover:text-indigo-600 transition-colors ml-2">
                                                        <Edit2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-700">{ws.owner_email?.replace('disabled_', '') || 'Ghost'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 font-mono text-right">
                                            {ws.session_count || 0}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 font-mono text-right">
                                            {ws.sources_count || 0}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                                            {new Date(ws.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                    title="Inspect Workspace"
                                                    onClick={() => window.open(`/#/workspaces/${ws.id}`, '_blank')}
                                                >
                                                    <Eye size={16} />
                                                </button>

                                                <button
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Purge Workspace"
                                                    onClick={() => handleDelete(ws.id, ws.name)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
