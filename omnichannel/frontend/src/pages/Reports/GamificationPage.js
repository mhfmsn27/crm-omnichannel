import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Trophy, Medal, Star, Zap, Target, Award, Flame,
    ChevronDown, Settings, RefreshCw, Crown, TrendingUp,
    Calendar, Gift, Shield, Rocket
} from 'lucide-react';
import toast from 'react-hot-toast';

function RankBadge({ rank }) {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-gray-500">{rank}</span>;
}

function BadgeIcon({ icon, color }) {
    return (
        <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center`}>
            {icon === 'trophy' && <Trophy className="w-6 h-6 text-white" />}
            {icon === 'star' && <Star className="w-6 h-6 text-white" />}
            {icon === 'zap' && <Zap className="w-6 h-6 text-white" />}
            {icon === 'target' && <Target className="w-6 h-6 text-white" />}
            {icon === 'flame' && <Flame className="w-6 h-6 text-white" />}
            {icon === 'rocket' && <Rocket className="w-6 h-6 text-white" />}
            {icon === 'shield' && <Shield className="w-6 h-6 text-white" />}
            {!['trophy', 'star', 'zap', 'target', 'flame', 'rocket', 'shield'].includes(icon) && <Award className="w-6 h-6 text-white" />}
        </div>
    );
}

function LeaderboardRow({ agent, rank }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex-shrink-0">
                    <RankBadge rank={rank} />
                </div>

                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    {agent.agent_name?.charAt(0)?.toUpperCase() || '?'}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{agent.agent_name}</h3>
                    <p className="text-sm text-gray-500">{agent.resolutions || 0} resolutions</p>
                </div>

                <div className="text-right">
                    <div className="text-xl font-bold text-indigo-600">
                        {parseInt(agent.period_points || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">points</div>
                </div>

                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>

            {expanded && (
                <div className="border-t p-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-lg font-bold text-gray-900">
                                {parseInt(agent.period_points || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">Period Points</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-gray-900">
                                {parseInt(agent.lifetime_points || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">Lifetime Points</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-gray-900">
                                {agent.resolutions || 0}
                            </div>
                            <div className="text-xs text-gray-500">Resolutions</div>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1">
                                <Flame className="w-4 h-4 text-orange-500" />
                                <span className="text-lg font-bold text-orange-500">0</span>
                            </div>
                            <div className="text-xs text-gray-500">Day Streak</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MyStatsCard({ stats }) {
    return (
        <div className="bg-indigo-500 rounded-xl p-6 text-white">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                    {stats?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                    <h2 className="text-xl font-bold">{stats?.name || 'Your Stats'}</h2>
                    <p className="text-white/70">Keep up the great work!</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{parseInt(stats?.period_points || 0).toLocaleString()}</div>
                    <div className="text-xs text-white/70">Period Points</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{parseInt(stats?.lifetime_points || 0).toLocaleString()}</div>
                    <div className="text-xs text-white/70">Lifetime</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold flex items-center justify-center gap-1">
                        <Flame className="w-5 h-5 text-orange-400" />
                        {stats?.streak?.current || 0}
                    </div>
                    <div className="text-xs text-white/70">Day Streak</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{stats?.badges?.length || 0}</div>
                    <div className="text-xs text-white/70">Badges</div>
                </div>
            </div>
        </div>
    );
}

function BadgesSection({ badges }) {
    const defaultBadges = [
        { icon: 'trophy', color: 'bg-yellow-500', name: 'First Steps', desc: 'Resolve 10 conversations' },
        { icon: 'star', color: 'bg-blue-500', name: 'Rising Star', desc: 'Get 50 ratings' },
        { icon: 'zap', color: 'bg-orange-500', name: 'Quick Responder', desc: 'Avg response < 1 min' },
        { icon: 'target', color: 'bg-green-500', name: 'Sharpshooter', desc: '100% resolution rate' },
        { icon: 'flame', color: 'bg-red-500', name: 'On Fire', desc: '7 day streak' },
        { icon: 'rocket', color: 'bg-purple-500', name: 'Rocket Start', desc: '500 lifetime points' },
        { icon: 'shield', color: 'bg-indigo-500', name: 'Shield Bearer', desc: '100 resolutions' },
        { icon: 'award', color: 'bg-pink-500', name: 'Champion', desc: 'Monthly top 3' }
    ];

    const earnedIds = (badges || []).map(b => b.id);

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-500" />
                Achievement Badges
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {defaultBadges.map((badge, idx) => {
                    const earned = earnedIds.includes(idx + 1);
                    return (
                        <div
                            key={idx}
                            className={`p-4 rounded-lg border-2 text-center transition-all ${
                                earned ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-50'
                            }`}
                        >
                            <BadgeIcon icon={badge.icon} color={earned ? badge.color : 'bg-gray-300'} />
                            <h4 className="font-bold text-sm mt-3">{badge.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{badge.desc}</p>
                            {earned && (
                                <span className="inline-block mt-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                                    Earned
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SettingsPanel({ settings, onSave }) {
    const [form, setForm] = useState(settings || {});

    const handleSave = () => {
        onSave(form);
    };

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                Gamification Settings
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Points per Conversation
                    </label>
                    <input
                        type="number"
                        value={form.points_per_conversation || 10}
                        onChange={(e) => setForm({ ...form, points_per_conversation: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Points per Resolution
                    </label>
                    <input
                        type="number"
                        value={form.points_per_resolution || 25}
                        onChange={(e) => setForm({ ...form, points_per_resolution: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Points per 5-Star Rating
                    </label>
                    <input
                        type="number"
                        value={form.points_per_positive_rating || 15}
                        onChange={(e) => setForm({ ...form, points_per_positive_rating: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quick Response Threshold (sec)
                    </label>
                    <input
                        type="number"
                        value={form.quick_response_threshold || 60}
                        onChange={(e) => setForm({ ...form, quick_response_threshold: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Leaderboard Period
                    </label>
                    <select
                        value={form.leaderboard_period || 'weekly'}
                        onChange={(e) => setForm({ ...form, leaderboard_period: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function GamificationPage() {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [myStats, setMyStats] = useState(null);
    const [period, setPeriod] = useState('weekly');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingsRes, leaderboardRes, statsRes] = await Promise.all([
                axios.get('/api/app/gamification/settings'),
                axios.get('/api/app/gamification/leaderboard', { params: { period } }),
                axios.get('/api/app/gamification/me')
            ]);

            setSettings(settingsRes.data);
            setLeaderboard(leaderboardRes.data);
            setMyStats(statsRes.data);
        } catch (e) {
            console.error('Gamification fetch error:', e);
            toast.error('Failed to load gamification data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period]);

    const handleSaveSettings = async (newSettings) => {
        try {
            await axios.put('/api/app/gamification/settings', newSettings);
            toast.success('Settings saved');
            fetchData();
        } catch (e) {
            toast.error('Failed to save settings');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Team Gamification
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Motivate your team with points, badges, and leaderboards
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {['daily', 'weekly', 'monthly'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    period === p ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* My Stats */}
            <MyStatsCard stats={myStats} />

            {/* Leaderboard */}
            <div>
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    {period.charAt(0).toUpperCase() + period.slice(1)} Leaderboard
                </h2>
                <div className="space-y-3">
                    {leaderboard.map((agent, idx) => (
                        <LeaderboardRow key={agent.user_id} agent={agent} rank={agent.rank || idx + 1} />
                    ))}
                    {leaderboard.length === 0 && (
                        <div className="text-center py-8 text-gray-400 bg-white rounded-xl border">
                            No leaderboard data yet
                        </div>
                    )}
                </div>
            </div>

            {/* Badges */}
            <BadgesSection badges={myStats?.badges} />

            {/* Settings (Admin only - simplified) */}
            <SettingsPanel settings={settings} onSave={handleSaveSettings} />
        </div>
    );
}