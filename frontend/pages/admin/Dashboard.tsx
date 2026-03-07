import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Users, FolderKanban, Briefcase, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Dashboard = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Fallback to checking normal health route as well
    const [health, setHealth] = useState({ backend: true, aiEngine: true, db: true });

    const fetchStats = async () => {
        try {
            const data = await api.getAdminStatsOverview();
            setStats(data.stats);

            // We will perform a basic ping to update the health indicators
            const [backendHealth, aiHealth] = await Promise.allSettled([
                api.healthCheck(),
                api.getLLMStatus().catch(() => ({ status: 'error' }))
            ]);

            setHealth({
                backend: backendHealth.status === 'fulfilled' && !!backendHealth.value,
                aiEngine: aiHealth.status === 'fulfilled' && !!aiHealth.value,
                db: true // Derived internally from backend queries working
            });

        } catch (err) {
            console.error(err);
            toast.error('Failed to load dashboard metrics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Auto-refresh every 30 seconds as specified
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-xl border border-gray-200" />
                ))}
            </div>
        );
    }

    const statCards = [
        { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
        { label: 'Active Workspaces', value: stats?.total_workspaces || 0, icon: FolderKanban, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
        { label: 'Total Research Jobs', value: stats?.total_research_jobs || 0, icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
        { label: 'Active Jobs', value: stats?.active_research_jobs || 0, icon: Activity, color: 'text-[#D97757]', bg: 'bg-[#D97757]/10 border-[#D97757]/20' },
    ];

    return (
        <div className="space-y-8 pb-8">
            {/* Top Stat Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between shadow-sm hover:shadow transition-shadow">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-2">{card.label}</p>
                            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                        </div>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${card.bg}`}>
                            <card.icon size={26} className={card.color} />
                        </div>
                    </div>
                ))}
            </div>

            {/* System Health View */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Activity size={20} className="text-[#D97757]" />
                    Infrastructure Health
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Backend Health */}
                    <div className="flex items-center justify-between p-4 border border-gray-100 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-900 text-sm">Node.js API</span>
                                <span className="text-xs text-gray-500 font-mono">Port 5000</span>
                            </div>
                        </div>
                        {health.backend ? <CheckCircle2 size={24} className="text-[#28C840]" /> : <AlertCircle size={24} className="text-[#EF4444]" />}
                    </div>

                    {/* AI Engine Health */}
                    <div className="flex items-center justify-between p-4 border border-gray-100 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-900 text-sm">FastAPI AI Engine</span>
                                <span className="text-xs text-gray-500 font-mono">Port 8000</span>
                            </div>
                        </div>
                        {health.aiEngine ? <CheckCircle2 size={24} className="text-[#28C840]" /> : <AlertCircle size={24} className="text-[#EF4444]" />}
                    </div>

                    {/* DB Health */}
                    <div className="flex items-center justify-between p-4 border border-gray-100 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <span className="font-semibold text-gray-900 text-sm">PostgreSQL DB</span>
                                <span className="text-xs text-gray-500 font-mono">Port 5432</span>
                            </div>
                        </div>
                        {health.db ? <CheckCircle2 size={24} className="text-[#28C840]" /> : <AlertCircle size={24} className="text-[#EF4444]" />}
                    </div>
                </div>
            </div>

            {/* Recent Activity Feed Placeholder */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Recent User Activity</h2>
                    <span className="text-xs text-gray-500">Auto-updating...</span>
                </div>
                <div className="p-8 text-center text-gray-500">
                    <Activity size={32} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium text-gray-800 text-sm">Activity feed will populate as research jobs are started.</p>
                    <p className="text-xs mt-1">Check the Research tab for full logs.</p>
                </div>
            </div>
        </div>
    );
};
