import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    BarChart2, TrendingUp, DollarSign, Users, CheckCircle, XCircle, Loader2,
    ArrowUp, ArrowDown, Minus, Filter, RefreshCw, ChevronRight
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import DateRangeFilter from '../../components/analytics/DateRangeFilter';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const formatIDR = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

function PipelineCard({ label, value, icon: Icon, color, sub, trend }) {
    return (
        <div className="bg-white dark:bg-dark-surface rounded-xl border dark:border-dark-border p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
            {trend !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {trend > 0 ? <ArrowUp className="w-3 h-3" /> : trend < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {Math.abs(trend)}% vs prev period
                </div>
            )}
        </div>
    );
}

function StageRow({ stage, deals, totalValue, totalWeighted }) {
    const wonDeals = deals.filter(d => d.is_closed);
    const wonValue = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
    const avgValue = wonDeals.length > 0 ? wonValue / wonDeals.length : 0;

    return (
        <div className="border-b border-gray-100 dark:border-dark-border py-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || '#6366f1' }} />
                    <span className="text-sm font-bold text-gray-800 dark:text-white">{stage.name}</span>
                    <span className="text-xs text-gray-400">({deals.length} deals)</span>
                </div>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{formatIDR(totalValue)}</span>
            </div>
            <div className="flex gap-6 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Weighted: {formatIDR(totalWeighted)}</span>
                <span>Won: {wonDeals.length}</span>
                <span>Avg Won: {formatIDR(avgValue)}</span>
            </div>
        </div>
    );
}

// Funnel visualization: shows deal count per stage with drop-off %
function PipelineFunnel({ pipelines }) {
    if (!pipelines || pipelines.length === 0) return null;

    const FUNNEL_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#f0f4ff'];

    return (
        <div className="space-y-6">
            {pipelines.map((pipe, pi) => {
                if (!pipe.stages || pipe.stages.length === 0) return null;
                const maxCount = Math.max(...pipe.stages.map(s => s.deals.length), 1);

                return (
                    <div key={pipe.id} className="bg-white dark:bg-dark-surface rounded-xl border dark:border-dark-border p-5 shadow-sm">
                        <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-indigo-500" />
                            {pipe.name}
                        </h4>
                        <div className="space-y-2">
                            {pipe.stages.map((stage, idx) => {
                                const count = stage.deals.length;
                                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                const prevCount = idx > 0 ? pipe.stages[idx - 1].deals.length : count;
                                const dropOff = prevCount > 0 && idx > 0
                                    ? Math.round(((prevCount - count) / prevCount) * 100)
                                    : null;
                                const color = FUNNEL_COLORS[idx % FUNNEL_COLORS.length];

                                return (
                                    <div key={stage.id} className="relative">
                                        {dropOff !== null && dropOff > 0 && (
                                            <div className="flex items-center gap-1 text-xs text-red-400 mb-1 pl-1">
                                                <ArrowDown className="w-3 h-3" />
                                                <span>{dropOff}% drop-off</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className="w-28 text-xs text-gray-600 dark:text-gray-300 truncate flex-shrink-0">{stage.name}</div>
                                            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-7 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                                                    style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}
                                                >
                                                    <span className="text-white text-xs font-bold">{count}</span>
                                                </div>
                                            </div>
                                            <div className="w-20 text-xs text-right text-gray-500 dark:text-gray-400 flex-shrink-0">
                                                {formatIDR(stage.totalValue)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bar chart: deals per stage */}
                        <div className="mt-5 h-36">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pipe.stages.map(s => ({ name: s.name, deals: s.deals.length, value: s.totalValue }))}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(v, n) => [v, n === 'deals' ? 'Deals' : 'Nilai']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="deals" radius={[4, 4, 0, 0]}>
                                        {pipe.stages.map((_, i) => (
                                            <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function SalesPipelineReport() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [stages, setStages] = useState([]);
    const [pipelines, setPipelines] = useState([]);
    const [topDeals, setTopDeals] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = { startDate, endDate };
            const [statsRes, pipelinesRes] = await Promise.all([
                axios.get('/api/app/reports/pipeline-stats', { params }),
                axios.get('/api/app/pipelines'),
            ]);
            setStats(statsRes.data);

            // Build stage data preserving pipeline order
            const stageData = [];
            const pipelineData = [];
            for (const pipe of pipelinesRes.data) {
                const boardRes = await axios.get(`/api/app/pipelines/${pipe.id}/board`);
                const pipeStages = [];
                for (const stage of boardRes.data) {
                    let totalValue = 0;
                    let totalWeighted = 0;
                    stage.items.forEach(item => {
                        const val = item.value || 0;
                        const prob = item.deal_probability ?? 0;
                        totalValue += val;
                        totalWeighted += val * (prob / 100);
                    });
                    const enrichedStage = {
                        ...stage,
                        pipeline_name: pipe.name,
                        totalValue,
                        totalWeighted,
                        deals: stage.items,
                    };
                    stageData.push(enrichedStage);
                    pipeStages.push(enrichedStage);
                }
                pipelineData.push({ id: pipe.id, name: pipe.name, stages: pipeStages });
            }
            setPipelines(pipelineData);
            // For the stage breakdown table, sort by pipeline order (already correct)
            setStages(stageData);

            // Top 10 deals across all pipelines
            const allDeals = stageData.flatMap(s => s.deals).filter(d => d.value > 0);
            allDeals.sort((a, b) => (b.value || 0) - (a.value || 0));
            setTopDeals(allDeals.slice(0, 10));
        } catch (e) {
            toast.error('Gagal memuat data pipeline');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalPipelineValue = stages.reduce((s, st) => s + st.totalValue, 0);
    const totalWeightedValue = stages.reduce((s, st) => s + st.totalWeighted, 0);
    const totalDeals = stages.reduce((s, st) => s + st.deals.length, 0);
    const wonDeals = stages.reduce((s, st) => s + st.deals.filter(d => d.is_closed).length, 0);
    const conversionRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;
    const avgDealSize = wonDeals > 0 ? totalPipelineValue / wonDeals : 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        Sales Pipeline Report
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview nilai pipeline, konversi, dan deal terbesar</p>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangeFilter startDate={startDate} endDate={endDate}
                        onStartChange={setStartDate} onEndChange={setEndDate} />
                    <button onClick={fetchData} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat...
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <PipelineCard label="Total Pipeline" value={formatIDR(totalPipelineValue)}
                            icon={DollarSign} color="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                            sub={`${totalDeals} deals aktif`} />
                        <PipelineCard label="Weighted Value" value={formatIDR(totalWeightedValue)}
                            icon={TrendingUp} color="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            sub="Probabilitas × Nilai" />
                        <PipelineCard label="Conversion Rate" value={`${conversionRate}%`}
                            icon={CheckCircle} color="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                            sub={`${wonDeals} deal won`} />
                        <PipelineCard label="Avg Deal Size" value={formatIDR(avgDealSize)}
                            icon={Users} color="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                            sub="Rata-rata nilai deal" />
                    </div>

                    {/* Funnel Chart */}
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 text-indigo-500" />
                            Funnel Konversi per Pipeline
                        </h3>
                        <PipelineFunnel pipelines={pipelines} />
                    </div>

                    {/* Stage Breakdown */}
                    <div className="bg-white dark:bg-dark-surface rounded-xl border dark:border-dark-border p-5 shadow-sm">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Nilai per Stage</h3>
                        {stages.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">Belum ada data pipeline</p>
                        ) : (
                            <div>
                                {stages.map(stage => (
                                    <StageRow
                                        key={stage.id}
                                        stage={stage}
                                        deals={stage.deals}
                                        totalValue={stage.totalValue}
                                        totalWeighted={stage.totalWeighted}
                                    />
                                ))}
                                <div className="flex justify-between items-center pt-4 font-bold">
                                    <span className="text-sm text-gray-700 dark:text-gray-200">Total Pipeline</span>
                                    <span className="text-lg text-indigo-600 dark:text-indigo-400">{formatIDR(totalPipelineValue)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Top Deals */}
                    {topDeals.length > 0 && (
                        <div className="bg-white dark:bg-dark-surface rounded-xl border dark:border-dark-border p-5 shadow-sm">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Top 10 Deals (Nilai Tertinggi)</h3>
                            <div className="divide-y divide-gray-100 dark:divide-dark-border">
                                {topDeals.map((deal, i) => (
                                    <div key={deal.id} className="flex items-center justify-between py-3 gap-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500">{i + 1}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{deal.contact_name || deal.phone || 'Unknown'}</p>
                                                {deal.deal_probability != null && (
                                                    <span className="text-[10px] text-gray-400">{deal.deal_probability}% probability</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            {deal.deal_close_date && (
                                                <span className="text-[10px] text-gray-400">
                                                    Close: {format(new Date(deal.deal_close_date), 'd MMM')}
                                                </span>
                                            )}
                                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{formatIDR(deal.value)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}