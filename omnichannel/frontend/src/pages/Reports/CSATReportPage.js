import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { usePageTitle } from '../../context/HeaderContext';
import { Star, ThumbsUp, ThumbsDown, MessageSquare, BarChart2, RefreshCw, Loader2 } from 'lucide-react';

export default function CSATReportPage() {
    usePageTitle('CSAT REPORT');
    const [stats, setStats] = useState(null);
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
            setStats(statsRes.data);
            setSurveys(surveysRes.data.data || []);
        } catch (e) {
            console.error('Failed to load CSAT data:', e);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                ))}
            </div>
        );
    };

    const getRatingColor = (rating) => {
        if (rating >= 4) return 'text-green-500';
        if (rating >= 3) return 'text-yellow-500';
        return 'text-red-500';
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Memuat...</div>;

    return (
        <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">CSAT Report</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Customer Satisfaction Survey Results
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-bg text-gray-900 dark:text-white">
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                    </select>
                    <button onClick={fetchData} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* Average Rating */}
                    <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                <Star className="w-5 h-5 text-yellow-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Avg Rating</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {stats.avgRating.toFixed(1)} <span className="text-lg text-gray-400">/ 5</span>
                        </div>
                        <div className="mt-2">{renderStars(Math.round(stats.avgRating))}</div>
                    </div>

                    {/* Total Responses */}
                    <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <MessageSquare className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Responses</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {stats.totalResponses}
                        </div>
                    </div>

                    {/* Response Rate */}
                    <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <BarChart2 className="w-5 h-5 text-green-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Response Rate</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {stats.responseRate.toFixed(1)}%
                        </div>
                    </div>

                    {/* NPS Score */}
                    <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <ThumbsUp className="w-5 h-5 text-purple-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-slate-400">NPS Score</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {stats.nps > 0 ? '+' : ''}{stats.nps}
                        </div>
                    </div>
                </div>
            )}

            {/* Rating Distribution */}
            {stats && stats.ratingDistribution && stats.ratingDistribution.length > 0 && (
                <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-5 mb-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Rating Distribution</h3>
                    <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map(rating => {
                            const dist = stats.ratingDistribution.find(d => d.rating === rating);
                            const count = parseInt(dist?.count) || 0;
                            const maxCount = Math.max(...stats.ratingDistribution.map(d => parseInt(d.count)));
                            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                            return (
                                <div key={rating} className="flex items-center gap-3">
                                    <div className="w-8 text-sm font-medium text-gray-600 dark:text-slate-400">{rating}</div>
                                    <Star className={`w-4 h-4 ${rating >= 4 ? 'text-green-400' : rating >= 3 ? 'text-yellow-400' : 'text-red-400'} fill-current`} />
                                    <div className="flex-1 bg-gray-100 dark:bg-dark-bg rounded-full h-4 overflow-hidden">
                                        <div
                                            className={`h-full ${rating >= 4 ? 'bg-green-400' : rating >= 3 ? 'bg-yellow-400' : 'bg-red-400'} rounded-full`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="w-12 text-sm text-gray-500 text-right">{count}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent Surveys */}
            <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border">
                    <h3 className="font-bold text-gray-900 dark:text-white">Recent Responses</h3>
                </div>
                {surveys.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        No survey responses yet
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-dark-border">
                        {surveys.map(survey => (
                            <div key={survey.id} className="px-5 py-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {survey.contact_name || 'Unknown'}
                                            </span>
                                            {survey.channel && (
                                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-xs text-gray-500">
                                                    {survey.channel}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {renderStars(survey.rating)}
                                            <span className={`text-sm font-medium ${getRatingColor(survey.rating)}`}>
                                                {survey.rating}/5
                                            </span>
                                        </div>
                                        {survey.feedback && (
                                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 italic">
                                                "{survey.feedback}"
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {new Date(survey.created_at).toLocaleDateString()}
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
