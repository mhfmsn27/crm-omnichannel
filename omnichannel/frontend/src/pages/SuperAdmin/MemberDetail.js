
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, ShieldCheck, Globe, Calendar, Link as LinkIcon, Trash2, Smartphone, Instagram, Send, MessageCircle } from 'lucide-react';
import ChannelIcon from '../../components/common/ChannelIcons';
import { toast } from 'react-hot-toast';

export default function MemberDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [member, setMember] = useState(null);
    const [plans, setPlans] = useState([]);
    const [channels, setChannels] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [overrideData, setOverrideData] = useState({ plan_id: '', expires_at: '' });
    const [webhookUrl, setWebhookUrl] = useState('');

    useEffect(() => {
        fetchData();
        fetchChannels();
    }, [id]);

    const fetchData = async () => {
        try {
            const [memberRes, plansRes] = await Promise.all([
                axios.get(`/api/sa/members/${id}`),
                axios.get('/api/sa/plans')
            ]);

            setMember(memberRes.data);
            // Defensive check: ensure plans is an array
            setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);

            // Init Form
            if (memberRes.data.plan_id) {
                setOverrideData({
                    plan_id: memberRes.data.plan_id,
                    expires_at: memberRes.data.expires_at ? memberRes.data.expires_at.split('T')[0] : ''
                });
            }
            setWebhookUrl(memberRes.data.webhook_url || '');

        } catch (err) {
            console.error(err);
            toast.error('Failed to load data');
            navigate('/admin/members');
        } finally {
            setLoading(false);
        }
    };

    const fetchChannels = async () => {
        try {
            const res = await axios.get(`/api/sa/members/${id}/channels`);
            // Defensive check: ensure channels is an array
            setChannels(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleOverrideSubmit = async (e) => {
        e.preventDefault();
        if (!confirm("WARNING: This will change the subscription immediately without payment. Continue?")) return;

        try {
            await axios.post(`/api/sa/members/${id}/manual-override`, overrideData);
            toast.success("Subscription updated successfully.");
            fetchData();
        } catch (err) {
            toast.error("Failed to update subscription");
        }
    };

    const handleWebhookSubmit = async () => {
        try {
            await axios.post(`/api/sa/members/${id}/webhook`, { webhook_url: webhookUrl });
            toast.success("Webhook URL updated.");
        } catch (err) {
            toast.error("Failed to update webhook");
        }
    };

    const handleForceDeleteChannel = async (type, channelId) => {
        if (!confirm(`FORCE DELETE this ${type} connection? This will remove it from the database even if still active on Meta/Gateway. Use this to fix 'stuck' connections.`)) return;

        try {
            await axios.delete(`/api/sa/members/${id}/channels/${type}/${channelId}`);
            toast.success("Channel force deleted.");
            fetchChannels();
        } catch (err) {
            toast.error("Delete failed: " + (err.response?.data?.error || err.message));
        }
    };

    const getChannelIcon = (type) => {
        return <ChannelIcon type={type} className="w-4 h-4" />;
    };

    if (loading || !member) return <div className="p-8 text-center">Loading Member Data...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <button onClick={() => navigate('/admin/members')} className="flex items-center text-gray-500 hover:text-gray-800 mb-6 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Member List
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">{member.name}</h1>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">ID: {member.id}</span>
                        <span>•</span>
                        <span>Owner: <strong className="text-gray-700">{member.owner_name}</strong> ({member.owner_email})</span>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 ${member.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {member.is_active ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {member.is_active ? 'Active Account' : 'Suspended'}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN */}
                <div className="lg:col-span-1 space-y-6">
                    {/* STATS */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Usage Statistics</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600 text-sm">Registered Agents</span>
                                <span className="font-bold text-gray-900">{member.stats.agent_count}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600 text-sm">Connected Devices</span>
                                <span className="font-bold text-gray-900">{member.stats.device_count}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600 text-sm">Current Plan</span>
                                <span className="font-bold text-indigo-600 uppercase">{member.plan_name || 'None'}</span>
                            </div>
                        </div>
                    </div>

                    {/* CONNECTED CHANNELS (NEW) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Connected Channels</h3>
                        <p className="text-xs text-gray-500 mb-4">Use this to force disconnect stuck channels.</p>

                        {/* WARNING NOTICE */}
                        <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg text-xs text-yellow-800 mb-4">
                            <strong>Note:</strong> If user complains about missing pages, ask them to check "Select All" in the Facebook Popup. Use "Force Delete" below to reset their state on our end.
                        </div>

                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                            {channels.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">No connected channels.</p>
                            ) : (
                                channels.map((ch, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 border rounded-lg bg-gray-50">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {getChannelIcon(ch.type)}
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-800 truncate w-32" title={ch.name}>{ch.name}</p>
                                                <p className="text-[10px] text-gray-500 truncate">{ch.info}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleForceDeleteChannel(ch.type, ch.id)}
                                            className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                                            title="Force Delete from DB"
                                        >
                                            <Trash2 className="w-3 h-3" /> Del
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="lg:col-span-2 space-y-6">
                    {/* SUBSCRIPTION OVERRIDE */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-orange-500" />
                            Manual Subscription Override
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Forcefully change the subscription plan and expiry date. This bypasses the payment gateway.
                            <br /><span className="text-orange-600 font-medium">Use with caution.</span>
                        </p>

                        <form onSubmit={handleOverrideSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                    value={overrideData.plan_id}
                                    onChange={e => setOverrideData({ ...overrideData, plan_id: e.target.value })}
                                    required
                                >
                                    <option value="">-- Select Plan --</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (Rp {parseInt(p.price_monthly).toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                                    value={overrideData.expires_at}
                                    onChange={e => setOverrideData({ ...overrideData, expires_at: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="md:col-span-2 flex justify-end mt-2">
                                <button type="submit" className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 flex items-center gap-2 shadow-sm">
                                    <Save className="w-4 h-4" /> Update Subscription
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* TECH CONFIG */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-gray-600" />
                            Technical Configuration
                        </h3>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Client Webhook URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="https://client-system.com/webhook"
                                    value={webhookUrl}
                                    onChange={e => setWebhookUrl(e.target.value)}
                                />
                                <button onClick={handleWebhookSubmit} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-bold text-sm">
                                    Save
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">This URL will receive updates about incoming messages and status changes for this organization.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
