import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ShieldAlert, ShieldCheck, Search, Expand, Trash2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export const UsersPanel = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchUsers = async () => {
        try {
            const data = await api.getAdminUsers();
            setUsers(data.users || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        const interval = setInterval(fetchUsers, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleToggleStatus = async (user: any) => {
        const isCurrentlyDisabled = user.status === 'disabled';
        const action = isCurrentlyDisabled ? 'enable' : 'disable';

        // Optimistic update
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: isCurrentlyDisabled ? 'active' : 'disabled' } : u));

        try {
            await api.setAdminUserStatus(user.id, action);
            toast.success(`User successfully ${action}d`);
            // Re-sync with server
            fetchUsers();
        } catch (err) {
            toast.error(`Failed to ${action} user`);
            // Revert on error
            fetchUsers();
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">User Surveillance</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage platform access, view workspace activity, and enforce security policies.</p>
                </div>

                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search email or username..."
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
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User ID / Email</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Created At</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Workspaces</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Research Jobs</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading directory...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No users found matching "{search}"</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => {
                                    const isDisabled = user.status === 'disabled';
                                    const cleanEmail = user.email.replace('disabled_', '');

                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className={`font-medium text-sm ${isDisabled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{user.username}</span>
                                                    <span className="text-xs text-gray-500 font-mono">{cleanEmail} (ID: {user.id})</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isDisabled
                                                        ? 'bg-gray-100 text-gray-600 border-gray-200'
                                                        : 'bg-green-50 text-green-700 border-green-200'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isDisabled ? 'bg-gray-400' : 'bg-green-500'}`} />
                                                    {isDisabled ? 'SUSPENDED' : 'ACTIVE'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700 font-mono text-right">
                                                {user.workspace_count}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700 font-mono text-right">
                                                {user.research_count}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                        title="View Info"
                                                        onClick={() => toast.info('Detailed profile view coming soon!')}
                                                    >
                                                        <Expand size={16} />
                                                    </button>

                                                    <button
                                                        className={`p-1.5 rounded transition-colors ${isDisabled
                                                                ? 'text-emerald-600 hover:bg-emerald-50'
                                                                : 'text-amber-600 hover:bg-amber-50'
                                                            }`}
                                                        title={isDisabled ? 'Re-enable User' : 'Suspend User'}
                                                        onClick={() => handleToggleStatus(user)}
                                                    >
                                                        {isDisabled ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                                                    </button>

                                                    <button
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Force Password Reset"
                                                        onClick={() => toast.warning('Force password reset coming soon!')}
                                                    >
                                                        <KeyRound size={16} />
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

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
                    <span>Showing {filteredUsers.length} of {users.length} users</span>
                    <span className="font-mono">Page 1 of 1</span>
                </div>
            </div>
        </div>
    );
};
