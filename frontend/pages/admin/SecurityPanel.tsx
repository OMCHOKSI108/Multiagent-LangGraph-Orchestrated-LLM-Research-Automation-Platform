import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Shield, Key, Plus, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export const SecurityPanel = () => {
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showKeyId, setShowKeyId] = useState<number | null>(null);

    const [newUserEmail, setNewUserEmail] = useState('');
    const [newKeyName, setNewKeyName] = useState('');
    const [generating, setGenerating] = useState(false);

    const fetchKeys = async () => {
        try {
            const data = await api.getAdminApiKeys();
            setKeys(data.keys || []);
        } catch (err) {
            toast.error('Failed to load API keys');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserEmail.trim()) return;
        setGenerating(true);
        try {
            await api.generateAdminApiKey(newUserEmail.trim(), newKeyName.trim() || 'Admin Issued Key');
            toast.success('API Key generated successfully');
            setNewUserEmail('');
            setNewKeyName('');
            fetchKeys(); // Refresh list to get new key
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate key (user might not exist)');
        } finally {
            setGenerating(false);
        }
    };

    const handleRevoke = async (id: number) => {
        if (window.confirm('Are you absolutely sure you want to revoke this key? Any connected agents will immediately lose access.')) {
            try {
                await api.revokeAdminApiKey(id);
                toast.success('API Key revoked and destroyed');
                setKeys(prev => prev.filter(k => k.id !== id));
            } catch (err) {
                toast.error('Failed to revoke API key');
            }
        }
    };

    const toggleKeyVisibility = (id: number) => {
        setShowKeyId(showKeyId === id ? null : id);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Shield size={24} className="text-[#D97757]" /> Security Controls
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage network access keys, oversee service accounts, and revoke compromised credentials.</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Generate Key Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Key size={18} className="text-indigo-600" /> Issue Network Key
                        </h3>
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Target User Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={e => setNewUserEmail(e.target.value)}
                                    placeholder="e.g. agent_zero@network.local"
                                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Key Alias / Description</label>
                                <input
                                    type="text"
                                    value={newKeyName}
                                    onChange={e => setNewKeyName(e.target.value)}
                                    placeholder="e.g. Production Data Pipeline"
                                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={generating || !newUserEmail.trim()}
                                    className="w-full bg-[#1A1915] hover:bg-gray-800 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    {generating ? 'GENERATING...' : <><Plus size={16} /> ISSUE CREDENTIAL</>}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 flex gap-2">
                            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed">
                                Keys grant full access to the user's workspace partitions and Agent network nodes. Issue with caution.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Keys Table */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">Active Network Credentials</h3>
                        <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded-full">Total: {keys.length}</span>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-100 sticky top-0 z-10">
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Alias & User</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Secret Token (dr_live_*)</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Created</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Burn</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">Loading credentials...</td></tr>
                                ) : keys.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">No active network credentials found.</td></tr>
                                ) : (
                                    keys.map((k) => (
                                        <tr key={k.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-sm text-gray-900">{k.key_name}</p>
                                                <p className="text-xs font-mono text-gray-500 mt-0.5">{k.user_email?.replace('disabled_', '') || `User ID: ${k.user_id}`}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-mono border border-gray-200">
                                                        {showKeyId === k.id ? k.key_value : `${k.key_value.substring(0, 12)}...${k.key_value.slice(-4)}`}
                                                    </code>
                                                    <button
                                                        onClick={() => toggleKeyVisibility(k.id)}
                                                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                    >
                                                        {showKeyId === k.id ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 hidden md:table-cell">
                                                {new Date(k.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleRevoke(k.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Revoke Credential"
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
            </div>
        </div>
    );
};
