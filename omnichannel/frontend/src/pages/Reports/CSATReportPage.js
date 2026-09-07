import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { usePageTitle } from '../../context/HeaderContext';
import { Star, ThumbsUp, MessageSquare, BarChart2, RefreshCw, Award, UserCheck } from 'lucide-react';

export default function CSATReportPage() {
    usePageTitle('CSAT REPORT');
    const [stats, setStats] = useState({
        avgRating: 0,
        totalResponses: 0,
        totalSurveys: 0,
        responseRate: 0,
        nps: 0,
        ratingDistribution: [5, 4, 3, 2, 1].map(r => ({ rating: r, count: 0 })),
        leaderboard: []
    });
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30');

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, surveysRes] = await Promise.all([
                axios.get(`/api/app/csat/stats?days=${period}`),
                axios.get(`/api/app/csat/surveys?limit=20&days=${period}`)
            ]);

            const raw = statsRes.data || {};
            const summary = raw.summary || {};

            const avgRating = parseFloat(raw.avgRating ?? summary.average_rating ?? 0) || 0;
            const totalResponses = parseInt(raw.totalResponses ?? summary.total_responses ?? 0) || 0;
            const totalSurveys = parseInt(raw.totalSurveys ?? summary.total_surveys ?? 0) || 0;
            const responseRate = parseFloat(raw.responseRate ?? summary.response_rate ?? (totalSurveys > 0 ? (totalResponses / totalSurveys) * 100 : 0)) || 0;
            const nps = parseFloat(raw.nps ?? summary.nps ?? 0) || 0;

            let ratingDistribution = raw.ratingDistribution;
            if (!Array.isArray(ratingDistribution) || ratingDistribution.length === 0) {
                ratingDistribution = [5, 4, 3, 2, 1].map(r => ({
                    rating: r,
                    count: parseInt(summary[`stars_${r}`] || 0) || 0
                }));
            }

            setStats({
                avgRating,
                totalResponses,
                totalSurveys,
                responseRate,
                nps,
                ratingDistribution,
                leaderboard: Array.isArray(raw.leaderboard) ? raw.leaderboard : []
            });

            const surveyList = surveysRes.data?.surveys || surveysRes.data?.data || (Array.isArray(surveysRes.data) ? surveysRes.data : []);
            setSurveys(surveyList);
        } catch (e) {
            console.error('Failed to load CSAT data:', e);
            setStats({
                avgRating: 0,
                totalResponses: 0,
                totalSurveys: 0,
                responseRate: 0,
                nps: 0,
                ratingDistribution: [5, 4, 3, 2, 1].map(r => ({ rating: r, count: 0 })),
                leaderboard: []
            });
            setSurveys([]);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating) => {
        const numRating = Math.round(Number(rating) || 0);
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} className={`w-4 h-4 ${star <= numRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                ))}
            </div>
        );
    };

    const getRatingColor = (rating) => {
        const r = Number(rating) || 0;
        if (r >= 4) return 'text-green-500';
        if (r >= 3) return 'text-yellow-500';
        return 'text-red-500';
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Memuat data survei CSAT...</div>;

    const avgRatingVal = Number(stats?.avgRating) || 0;
    const responseRateVal = Number(stats?.responseRate) || 0;
    const npsVal = Number(stats?.nps) || 0;
    const maxCount = Math.max(1, ...(stats?.ratingDistribution || []).map(d => parseInt(d?.count) || 0));

    return (
        <div className="p-3.5 sm:p-6 md:p-8 pb-20 md:pb-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-indigo-600" />
                        CSAT Report
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                        Customer Satisfaction Survey & Feedback Analytics
                    </p>
                </div>
                <div className="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-3">
                    <select 
                        value={period} 
                        onChange={e => setPeriod(e.target.value)} 
                        className="px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-dark-border rounded-lg text-xs sm:text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="7">7 Hari Terakhir</option>
                        <option value="30">30 Hari Terakhir</option>
                        <option value="90">90 Hari Terakhir</option>
                        <option value="0">Semua Waktu</option>
                    </select>
                    <button 
                        onClick={fetchData} 
                        className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
                        title="Refresh data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-6 sm:mb-8">
                {/* Average Rating */}
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Avg Rating</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {avgRatingVal.toFixed(1)} <span className="text-lg text-gray-400 font-normal">/ 5</span>
                    </div>
                    <div className="mt-2">{renderStars(avgRatingVal)}</div>
                </div>

                {/* Total Responses */}
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Respon</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {stats?.totalResponses || 0}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                        Dari total {stats?.totalSurveys || 0} survei terkirim
                    </div>
                </div>

                {/* Response Rate */}
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <BarChart2 className="w-5 h-5 text-green-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Response Rate</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {responseRateVal.toFixed(1)}%
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                        Tingkat partisipasi pelanggan
                    </div>
                </div>

                {/* NPS Score */}
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <ThumbsUp className="w-5 h-5 text-purple-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">NPS Score</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {npsVal > 0 ? '+' : ''}{npsVal}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                        Net Promoter Index (-100 s/d +100)
                    </div>
                </div>
            </div>

            {/* Rating Distribution & Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Rating Distribution */}
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                        <span>Distribusi Bintang</span>
                        <span className="text-xs font-normal text-gray-400">
                            {stats?.totalResponses || 0} total ulasan
                        </span>
                    </h3>
                    <div className="space-y-3">
                        {[5, 4, 3, 2, 1].map(rating => {
                            const dist = (stats?.ratingDistribution || []).find(d => d.rating === rating);
                            const count = parseInt(dist?.count) || 0;
                            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                            return (
                                <div key={rating} className="flex items-center gap-3">
                                    <div className="w-6 text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1">
                                        {rating}
                                    </div>
                                    <Star className={`w-4 h-4 shrink-0 ${rating >= 4 ? 'text-green-500 fill-green-500' : rating >= 3 ? 'text-yellow-400 fill-yellow-400' : 'text-red-400 fill-red-400'}`} />
                                    <div className="flex-1 bg-gray-100 dark:bg-dark-bg rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${rating >= 4 ? 'bg-green-500' : rating >= 3 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="w-12 text-sm font-medium text-gray-600 dark:text-slate-400 text-right">
                                        {count}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Agent Leaderboard */}
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-indigo-600" />
                        Peringkat Kepuasan Agen
                    </h3>
                    {(!stats?.leaderboard || stats.leaderboard.length === 0) ? (
                        <div className="py-8 text-center text-xs text-gray-400">
                            Belum ada ulasan yang terasosiasi dengan agen dalam periode ini.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-dark-border">
                            {stats.leaderboard.slice(0, 5).map((agent, idx) => (
                                <div key={agent.id || idx} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                            idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : 'bg-slate-50 text-slate-500'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-white truncate">
                                            {agent.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-gray-500 text-xs">
                                            {agent.total_reviews} ulasan
                                        </span>
                                        <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-green-500 text-green-500" />
                                            {parseFloat(agent.avg_rating || 0).toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Surveys */}
            <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                        Respon Survei Terbaru
                    </h3>
                    <span className="text-xs text-gray-400 font-medium">
                        {surveys.length} respon ditampilkan
                    </span>
                </div>
                {surveys.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-sm">
                        Belum ada respon survei kepuasan pelanggan pada periode ini.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-dark-border">
                        {surveys.map(survey => (
                            <div key={survey.id} className="px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                                {survey.contact_name || survey.phone_number || 'Pelanggan'}
                                            </span>
                                            {survey.agent_name && (
                                                <span className="text-[11px] text-gray-400">
                                                    (Agen: {survey.agent_name})
                                                </span>
                                            )}
                                            {survey.channel && (
                                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-[11px] text-gray-600 dark:text-slate-400 font-medium">
                                                    {survey.channel}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {renderStars(survey.rating)}
                                            <span className={`text-xs font-bold ${getRatingColor(survey.rating)}`}>
                                                {survey.rating}/5
                                            </span>
                                        </div>
                                        {survey.feedback && (
                                            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 mt-2 bg-gray-50 dark:bg-dark-bg p-2.5 rounded-lg italic border border-gray-100 dark:border-dark-border">
                                                "{survey.feedback}"
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">
                                        {survey.created_at ? new Date(survey.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

