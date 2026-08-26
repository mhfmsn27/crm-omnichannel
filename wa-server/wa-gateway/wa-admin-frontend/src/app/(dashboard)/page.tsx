
'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  Users, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Activity,
  ArrowUpRight,
  Server,
  Cpu,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6'];

interface DashboardStats {
  overview: {
    totalClients: number;
    totalSessions: number;
    activeSessions: number;
    sessionsNeedingQr: number;
  };
  sessionStatusDistribution: {
    connected: number;
    disconnected: number;
    need_qr: number;
    initializing: number;
    total_in_memory: number;
  };
  recentClients: Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
  clientGrowth: Array<{
    date: string;
    count: string;
  }>;
  system: {
      memoryUsage: number;
      uptime: number;
      loadAvg: string;
      platform: string;
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!stats) return <div className="text-red-400">Failed to load dashboard data.</div>;

  const pieData = [
    { name: 'Connected', value: stats.sessionStatusDistribution.connected },
    { name: 'Disconnected', value: stats.sessionStatusDistribution.disconnected },
    { name: 'Need QR', value: stats.sessionStatusDistribution.need_qr },
    { name: 'Initializing', value: stats.sessionStatusDistribution.initializing },
  ].filter(d => d.value > 0);

  if(pieData.length === 0) pieData.push({ name: 'No Data', value: 1 });

  const barData = stats.clientGrowth.map(item => ({
    name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
    clients: parseInt(item.count)
  }));

  const formatUptime = (seconds: number) => {
      const days = Math.floor(seconds / (3600 * 24));
      const hours = Math.floor((seconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if(days > 0) return `${days}d ${hours}h`;
      return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mission Control</h1>
          <p className="text-gray-400 text-sm">System Overview & Real-time Metrics</p>
        </div>
        <div className="text-xs text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 rounded-full animate-pulse">
            Live System
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Clients" 
          value={stats.overview.totalClients} 
          icon={Users} 
          color="blue" 
        />
        <StatCard 
          title="Total Sessions" 
          value={stats.overview.totalSessions} 
          icon={Smartphone} 
          color="indigo" 
        />
        <StatCard 
          title="Active Sessions" 
          value={stats.overview.activeSessions} 
          icon={Wifi} 
          color="green" 
          subValue={`${((stats.overview.activeSessions / (stats.overview.totalSessions || 1)) * 100).toFixed(0)}% uptime`}
        />
        <StatCard 
          title="Scan Required" 
          value={stats.overview.sessionsNeedingQr} 
          icon={WifiOff} 
          color="yellow" 
        />
      </div>

      {/* System Health Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SystemCard 
            icon={Server} 
            title="Memory Usage" 
            value={`${stats.system.memoryUsage}%`} 
            color="purple"
            progress={stats.system.memoryUsage}
        />
        <SystemCard 
            icon={Cpu} 
            title="CPU Load (1m)" 
            value={stats.system.loadAvg} 
            color="red"
        />
        <SystemCard 
            icon={Clock} 
            title="System Uptime" 
            value={formatUptime(stats.system.uptime)} 
            color="teal"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart: Client Growth */}
        <div className="p-6 glass-panel rounded-2xl lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-400" />
            Client Growth (Last 7 Days)
          </h3>
          <div className="h-64">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} tick={{fill: '#9CA3AF'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#fff', borderRadius: '8px' }} 
                  />
                  <Bar dataKey="clients" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">No growth data available yet</div>
            )}
          </div>
        </div>

        {/* Chart: Session Status */}
        <div className="p-6 glass-panel rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-6">Real-time Status</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#fff', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center text-xs text-gray-300">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6 glass-panel rounded-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Recently Added Clients</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Joined Date</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentClients.map((client) => (
                <tr key={client.id} className="hover:bg-white/5 transition-colors border-b border-gray-800/50 last:border-0">
                  <td className="py-3 px-4 text-sm font-medium text-gray-200">{client.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-400">{new Date(client.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <a href="/clients" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center justify-end transition-colors">
                      Manage <ArrowUpRight size={14} className="ml-1" />
                    </a>
                  </td>
                </tr>
              ))}
              {stats.recentClients.length === 0 && (
                  <tr>
                      <td colSpan={3} className="text-center py-4 text-gray-500">No recent activity</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => {
  const colorClasses: any = {
    blue: 'text-blue-400 bg-blue-400/10',
    indigo: 'text-indigo-400 bg-indigo-400/10',
    green: 'text-emerald-400 bg-emerald-400/10',
    yellow: 'text-amber-400 bg-amber-400/10'
  };

  return (
    <div className="p-6 glass-panel rounded-2xl flex items-start justify-between hover:bg-white/5 transition-colors group">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <h3 className="text-3xl font-bold text-white mt-2 group-hover:scale-105 transition-transform">{value}</h3>
        {subValue && <p className="text-xs font-medium text-emerald-400 mt-1 flex items-center">
             <ArrowUpRight size={12} className="mr-1"/> {subValue}
        </p>}
      </div>
      <div className={`p-3 rounded-xl ${colorClasses[color] || 'bg-gray-700 text-white'}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

const SystemCard = ({ icon: Icon, title, value, color, progress }: any) => {
    const colorMap: any = {
        purple: 'bg-purple-500',
        red: 'bg-red-500',
        teal: 'bg-teal-500'
    };
    
    const textMap: any = {
        purple: 'text-purple-400',
        red: 'text-red-400',
        teal: 'text-teal-400'
    };

    return (
        <div className="glass-panel p-4 rounded-2xl flex items-center space-x-4">
            <div className={`p-3 rounded-full bg-opacity-10 ${textMap[color].replace('text-', 'bg-')}`}>
                <Icon size={24} className={textMap[color]}/>
            </div>
            <div className="flex-1">
                <p className="text-sm text-gray-400">{title}</p>
                <p className="text-xl font-bold text-white">{value}</p>
                {progress !== undefined && (
                    <div className="w-full h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                        <div className={`h-full rounded-full ${colorMap[color]}`} style={{ width: `${progress}%` }}></div>
                    </div>
                )}
            </div>
        </div>
    )
}
