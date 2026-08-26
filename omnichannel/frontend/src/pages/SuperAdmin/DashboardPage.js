
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    DollarSign, Users, UserPlus, AlertCircle,
    Activity, RefreshCw, Server, List, BarChart2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// --- COMPONENTS ---

const KpiCard = ({ title, value, subValue, icon: Icon, color, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}
    >
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                {subValue && (
                    <p className={`text-xs mt-1 font-medium ${subValue.includes('+') ? 'text-green-600' : 'text-gray-400'}`}>
                        {subValue}
                    </p>
                )}
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </div>
);

const SystemStatus = ({ status, queue }) => {
    const StatusItem = ({ label, state }) => (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
            <span className="text-sm text-gray-600 font-medium">{label}</span>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${state === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-xs font-bold uppercase ${state === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                    {state}
                </span>
            </div>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-full">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" /> System Health
            </h3>
            <StatusItem label="WA Gateway" state={status?.wa_gateway || 'offline'} />
            <StatusItem label="Redis Queue" state={status?.redis || 'offline'} />
            <StatusItem label="Main Database" state={status?.database || 'online'} />

            {queue && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Broadcast Queue</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">{queue.active}</div>
                            <div className="text-[10px] text-gray-500">Active</div>
                        </div>
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <div className="text-lg font-bold text-orange-600">{queue.waiting}</div>
                            <div className="text-[10px] text-gray-500">Waiting</div>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg">
                            <div className="text-lg font-bold text-red-600">{queue.failed}</div>
                            <div className="text-[10px] text-gray-500">Failed</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ActivityList = ({ activities }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-full">
        <h3 className="font-bold text-gray-800 mb-4">Recent Activity</h3>
        <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
            {activities.map((act, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${act.type === 'signup' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                    <div className="flex-1 border-b border-gray-50 pb-3 last:border-0">
                        <p className="text-sm text-gray-800">{act.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {act.created_at ? formatDistanceToNow(new Date(act.created_at), { addSuffix: true }) : 'Just now'}
                        </p>
                    </div>
                </div>
            ))}
            {activities.length === 0 && <p className="text-gray-400 text-sm">No recent activities.</p>}
        </div>
    </div>
);

const TopTenantsTable = ({ tenants }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-full">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600" /> Top Usage (30 Days)
        </h3>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-100">
                        <th className="pb-2">Tenant</th>
                        <th className="pb-2">Plan</th>
                        <th className="pb-2 text-right">Messages</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {tenants && tenants.map((t, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 font-medium text-gray-800">{t.name}</td>
                            <td className="py-2 text-gray-500 text-xs uppercase">{t.plan_name || 'Free'}</td>
                            <td className="py-2 text-right font-bold text-indigo-600">{parseInt(t.msg_count).toLocaleString()}</td>
                        </tr>
                    ))}
                    {(!tenants || tenants.length === 0) && (
                        <tr><td colSpan="3" className="py-4 text-center text-gray-400 text-xs">No data available</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

// --- MAIN PAGE ---

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            // FIXED: Use relative path
            const res = await axios.get('/api/sa/dashboard');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return <div className="p-10 text-center">Loading Super Admin Dashboard...</div>;
    if (!data) return <div className="p-10 text-center">Failed to load data</div>;

    const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
                    <p className="text-gray-500">Overview of business performance and system health.</p>
                </div>
                <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* 1. KPI CARDS */}
            {/* KPI CARDS - Personal Version: Hidden SaaS Metrics */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <KpiCard 
              title="Monthly Recurring Revenue" 
              value={`Rp ${(data.kpi.mrr / 1000000).toFixed(1)}M`}
              subValue={`+${data.kpi.mrr_growth}% from last month`}
              icon={DollarSign}
              color="bg-green-600"
           />
           <KpiCard 
              title="Active Tenants" 
              value={data.kpi.active_tenants}
              icon={Users}
              color="bg-indigo-600"
              onClick={() => navigate('/admin/members')}
           />
           <KpiCard 
              title="New Signups" 
              value={data.kpi.new_signups}
              subValue="This Month"
              icon={UserPlus}
              color="bg-blue-500"
           />
           <KpiCard 
              title="Pending Payments" 
              value={data.kpi.pending_payments}
              subValue="Action Needed"
              icon={AlertCircle}
              color="bg-orange-500"
              onClick={() => navigate('/admin/transactions?status=pending_confirmation')}
           />
       </div> */}

            {/* 2. CHARTS */}
            {/* 2. CHARTS - Personal Version: Hidden */}
            {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
           <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[400px]">
               <h3 className="font-bold text-gray-800 mb-6">Revenue Growth</h3>
               <ResponsiveContainer width="100%" height="85%">
                   <LineChart data={data.charts.revenue_growth}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                       <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#9ca3af'}} 
                            tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`}
                       />
                       <Tooltip 
                            formatter={(val) => `Rp ${val.toLocaleString()}`}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                       />
                       <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} />
                   </LineChart>
               </ResponsiveContainer>
           </div>

           <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-[400px]">
               <h3 className="font-bold text-gray-800 mb-2">Plan Distribution</h3>
               <ResponsiveContainer width="100%" height="90%">
                   <PieChart>
                       <Pie
                           data={data.charts.plan_distribution}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                       >
                           {data.charts.plan_distribution.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                           ))}
                       </Pie>
                       <Tooltip />
                       <Legend verticalAlign="bottom" height={36}/>
                   </PieChart>
               </ResponsiveContainer>
           </div>
       </div> */}

            {/* 3. BOTTOM ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <ActivityList activities={data.recent_activities} />
                </div>
                {/* <div className="lg:col-span-1">
                    <TopTenantsTable tenants={data.top_tenants} />
                </div> */}
                <div className="lg:col-span-1">
                    <SystemStatus status={data.system_status} queue={data.queue_stats} />
                </div>
            </div>

        </div>
    );
}
