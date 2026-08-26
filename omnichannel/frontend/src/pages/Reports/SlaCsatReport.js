import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import { Loader2, Download, BarChart2, TrendingUp, Star, Users, Clock, AlertCircle, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import DateRangeFilter from '../../components/analytics/DateRangeFilter';

export default function SlaCsatReport() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [loading, setLoading] = useState(true);
    const [agentsList, setAgentsList] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState('all');

    const [data, setData] = useState({
        sla: { total: 0, compliant: 0, breached: 0, rate: 0, breach_unassigned: 0, breach_assigned: 0, breach_after_hours: 0 },
        resolution_sla: { ok: 0, fail: 0, rate: 100, threshold_hours: 8 },
        fcr: { count: 0, rate: 0 },
        csat: {
            respondents: 0, rated: 0, unrated: 0,
            breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            score: 0
        },
        agents: []
    });

    useEffect(() => {
        fetchData();
        fetchAgents();
    }, [startDate, endDate, selectedAgent]);

    const fetchAgents = async () => {
        try {
            const res = await axios.get('/api/app/team');
            setAgentsList(res.data.filter(u => u.role !== 'super_admin'));
        } catch (e) { console.error("Failed to load agents", e); }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = { startDate, endDate };
            if (selectedAgent !== 'all') params.agentId = selectedAgent;

            const res = await axios.get('/api/app/analytics', { params });
            const apiData = res.data;

            // Process API Data to match UI requirements
            const totalChats = apiData.summary.total_conversations?.value || 0;
            const ratedCount = apiData.agent_performance.reduce((acc, curr) => acc + parseInt(curr.rated_count), 0);
            const unratedCount = totalChats - ratedCount;
            const csatScore = parseFloat(apiData.summary.csat_score?.value || 0);

            // REAL SLA DATA
            const slaData = apiData.summary.sla || { rate: 0, passed: 0, breached: 0 };

            // Real Star Rating Breakdown (Aggregated from agents or backend global stats needed)
            // Currently backend doesn't send global star breakdown in summary, so we sum up from agents or default to 0
            // Enhancement: We can sum it up here.
            const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            apiData.agent_performance.forEach(a => {
                stars[1] += parseInt(a.star_1 || 0);
                stars[2] += parseInt(a.star_2 || 0);
                stars[3] += parseInt(a.star_3 || 0);
                stars[4] += parseInt(a.star_4 || 0);
                stars[5] += parseInt(a.star_5 || 0);
            });

            const resSla = apiData.summary.resolution_sla || { ok: 0, fail: 0, rate: 100, threshold_hours: 8 };
            const fcrData = apiData.summary.fcr || { count: 0, rate: 0 };

            setData({
                sla: {
                    total: parseInt(slaData.passed) + parseInt(slaData.breached),
                    compliant: parseInt(slaData.passed),
                    breached: parseInt(slaData.breached),
                    rate: slaData.rate,
                    breach_unassigned: parseInt(slaData.breach_unassigned || 0),
                    breach_assigned: parseInt(slaData.breach_assigned || 0),
                    breach_after_hours: parseInt(slaData.breach_after_hours || 0)
                },
                resolution_sla: {
                    ok: parseInt(resSla.ok || 0),
                    fail: parseInt(resSla.fail || 0),
                    rate: parseInt(resSla.rate || 100),
                    threshold_hours: resSla.threshold_hours || 8
                },
                fcr: {
                    count: parseInt(fcrData.count || 0),
                    rate: parseInt(fcrData.rate || 0)
                },
                csat: {
                    respondents: totalChats, // Total potential respondents
                    rated: ratedCount,
                    unrated: unratedCount,
                    breakdown: stars,
                    score: (csatScore / 5 * 100).toFixed(0) // Convert 5-scale to 100-scale
                },
                agents: apiData.agent_performance.map(a => ({
                    name: a.agent_name,
                    // Real SLA per agent
                    sla_ok: parseInt(a.sla_ok || 0),
                    sla_fail: parseInt(a.sla_fail || 0),
                    // CSAT breakdown
                    rating_avg: a.avg_rating,
                    rating_count: a.rated_count,
                    star_1: parseInt(a.star_1) || 0,
                    star_2: parseInt(a.star_2) || 0,
                    star_3: parseInt(a.star_3) || 0,
                    star_4: parseInt(a.star_4) || 0,
                    star_5: parseInt(a.star_5) || 0
                }))
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const [downloading, setDownloading] = useState(false);

    const handleExport = async () => {
        setDownloading(true);
        try {
            const res = await axios.get('/api/app/analytics/export/sla', {
                params: { startDate, endDate },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `SLA_CSAT_Report_${startDate}_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error("Export failed", err);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 h-full overflow-y-auto bg-gray-50">
            {/* HEADER */}
            <div className="flex flex-wrap justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <h2 className="text-2xl font-bold text-gray-900">SLA & CSAT Analytics</h2>
                <div className="flex gap-2">
                    <select
                        className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                    >
                        <option value="all">Semua Agen</option>
                        {agentsList.map(agent => (
                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                        ))}
                    </select>
                    <DateRangeFilter startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
                    <button
                        onClick={handleExport}
                        disabled={downloading}
                        className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-50"
                        title="Export Report"
                    >
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* 1. SUMMARY CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                {/* SLA CARD */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-600" /> Ringkasan SLA
                        </h3>
                        <Download className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Jumlah Obrolan</span>
                            <span className="font-bold text-gray-900">{data.sla.total}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Sesuai Aturan (&lt; 15m)</span>
                            <span className="font-bold text-green-600">{data.sla.compliant}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Tidak Sesuai Aturan</span>
                            <span className="font-bold text-red-600">{data.sla.breached}</span>
                        </div>
                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-700">Tingkat Kesesuaian</span>
                            <span className="text-xl font-extrabold text-indigo-600">{data.sla.rate}%</span>
                        </div>
                        {/* Visual Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden flex">
                            <div className="bg-indigo-500 h-full" style={{ width: `${data.sla.rate}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* CSAT CARD */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-500" /> Ringkasan CSAT
                        </h3>
                        <Download className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Total Responden</span>
                                <span className="font-bold">{data.csat.respondents}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Sudah Dirating</span>
                                <span className="font-bold text-green-600">{data.csat.rated}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Belum Dirating</span>
                                <span className="font-bold text-gray-400">{data.csat.unrated}</span>
                            </div>
                            <div className="pt-3 border-t border-gray-100">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-gray-700">CSAT Score</span>
                                    <span className="text-2xl font-extrabold text-yellow-500">{data.csat.score}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Sangat Puas (5)</span>
                                <span className="font-bold">{data.csat.breakdown[5]}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-lime-500"></div> Puas (4)</span>
                                <span className="font-bold">{data.csat.breakdown[4]}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Netral (3)</span>
                                <span className="font-bold">{data.csat.breakdown[3]}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Tidak Puas (2)</span>
                                <span className="font-bold">{data.csat.breakdown[2]}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Sangat Kecewa (1)</span>
                                <span className="font-bold">{data.csat.breakdown[1]}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 1b. FCR + RESOLUTION SLA + BREACH REASON */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                {/* FCR CARD */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" /> FCR
                        </h3>
                        <span className="text-xs text-gray-400">First Contact Resolution</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-4xl font-extrabold text-green-600">{data.fcr.rate}%</p>
                            <p className="text-xs text-gray-400 mt-1">{data.fcr.count} dari {data.sla.total || 0} selesai hari itu</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Definisi</p>
                            <p className="text-xs text-gray-400">Resolved same-day</p>
                        </div>
                    </div>
                    <div className="mt-4 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-green-500 h-full" style={{ width: `${data.fcr.rate}%` }} />
                    </div>
                </div>

                {/* RESOLUTION SLA CARD */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" /> Resolution SLA
                        </h3>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">≤ {data.resolution_sla.threshold_hours}h</span>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Selesai dalam {data.resolution_sla.threshold_hours}h</span>
                            <span className="font-bold text-green-600">{data.resolution_sla.ok}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Melebihi {data.resolution_sla.threshold_hours}h</span>
                            <span className="font-bold text-red-500">{data.resolution_sla.fail}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                            <span className="font-bold text-gray-700 text-sm">Tingkat Kesesuaian</span>
                            <span className="text-2xl font-extrabold text-blue-600">{data.resolution_sla.rate}%</span>
                        </div>
                    </div>
                    <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                        <div className="bg-blue-500 h-full" style={{ width: `${data.resolution_sla.rate}%` }} />
                    </div>
                </div>

                {/* BREACH REASON CARD */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" /> Penyebab Breach SLA
                        </h3>
                    </div>
                    {data.sla.breached === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 text-green-600">
                            <ShieldCheck className="w-8 h-8 mb-2" />
                            <p className="text-sm font-medium">Tidak ada breach!</p>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                                    <span className="text-gray-600">Chat Unassigned</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-orange-500">{data.sla.breach_unassigned}</span>
                                    <span className="text-xs text-gray-400">
                                        ({data.sla.breached > 0 ? Math.round((data.sla.breach_unassigned / data.sla.breached) * 100) : 0}%)
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                    <span className="text-gray-600">Chat Assigned</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-red-500">{data.sla.breach_assigned}</span>
                                    <span className="text-xs text-gray-400">
                                        ({data.sla.breached > 0 ? Math.round((data.sla.breach_assigned / data.sla.breached) * 100) : 0}%)
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                                    <span className="text-gray-600">Di Luar Jam Kerja</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-500">{data.sla.breach_after_hours}</span>
                                    <span className="text-xs text-gray-400">
                                        ({data.sla.breached > 0 ? Math.round((data.sla.breach_after_hours / data.sla.breached) * 100) : 0}%)
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 pt-1">*Jam kerja: 08:00–17:00. Satu breach bisa masuk beberapa kategori.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. SLA AGENT TABLE */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-lg">Agen Berdasarkan SLA</h3>
                    <Download className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3">Nama Agen</th>
                                <th className="px-6 py-3 text-center">Sesuai FRT SLA</th>
                                <th className="px-6 py-3 text-center">Breach FRT</th>
                                <th className="px-6 py-3 text-center">Avg FRT</th>
                                <th className="px-6 py-3 text-center">Res. SLA (8h)</th>
                                <th className="px-6 py-3 text-right">Tingkat Kesuksesan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.agents.map((agent, idx) => {
                                const total = agent.sla_ok + agent.sla_fail;
                                const percent = total > 0 ? Math.round((agent.sla_ok / total) * 100) : 0;
                                const resSlaTotal = (parseInt(agent.res_sla_ok || 0) + parseInt(agent.res_sla_fail || 0));
                                const resSlaPct = resSlaTotal > 0 ? Math.round((parseInt(agent.res_sla_ok || 0) / resSlaTotal) * 100) : null;
                                return (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{agent.name}</td>
                                        <td className="px-6 py-4 text-center font-bold text-green-600">{agent.sla_ok}</td>
                                        <td className="px-6 py-4 text-center font-bold text-red-500">{agent.sla_fail}</td>
                                        <td className="px-6 py-4 text-center text-gray-600 text-sm">
                                            {agent.avg_frt_mins != null ? `${agent.avg_frt_mins}m` : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {resSlaPct != null ? (
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${resSlaPct >= 80 ? 'bg-blue-100 text-blue-700' : resSlaPct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {resSlaPct}%
                                                </span>
                                            ) : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${percent >= 80 ? 'bg-green-100 text-green-800' : percent >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                {percent}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {data.agents.length === 0 && (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-400">Tidak ada data obrolan</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. CSAT AGENT TABLE */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-lg">Agen Berdasarkan CSAT</h3>
                    <Download className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3">Nama Agen</th>
                                <th className="px-6 py-3 text-center text-red-600">1 Star</th>
                                <th className="px-6 py-3 text-center text-orange-600">2 Star</th>
                                <th className="px-6 py-3 text-center text-yellow-600">3 Star</th>
                                <th className="px-6 py-3 text-center text-lime-600">4 Star</th>
                                <th className="px-6 py-3 text-center text-green-600">5 Star</th>
                                <th className="px-6 py-3 text-right">Avg Skor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.agents.map((agent, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{agent.name}</td>
                                    <td className="px-6 py-4 text-center text-red-600 font-medium">{agent.star_1 || '-'}</td>
                                    <td className="px-6 py-4 text-center text-orange-600 font-medium">{agent.star_2 || '-'}</td>
                                    <td className="px-6 py-4 text-center text-yellow-600 font-medium">{agent.star_3 || '-'}</td>
                                    <td className="px-6 py-4 text-center text-lime-600 font-medium">{agent.star_4 || '-'}</td>
                                    <td className="px-6 py-4 text-center text-green-600 font-bold">{agent.star_5 || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 font-bold text-gray-900">
                                            {agent.rating_avg} <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                        </div>
                                        <span className="text-xs text-gray-400">({agent.rating_count} ratings)</span>
                                    </td>
                                </tr>
                            ))}
                            {data.agents.length === 0 && (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-400">Tidak ada data rating</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}