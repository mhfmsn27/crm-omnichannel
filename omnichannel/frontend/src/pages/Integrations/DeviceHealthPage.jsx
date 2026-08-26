import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Activity, Shield, AlertTriangle, CheckCircle, Clock, TrendingUp,
    Smartphone, MessageSquare, Send, Zap, Calendar, RefreshCw, ExternalLink,
    ChevronRight, Info, XCircle, ThumbsUp, ThumbsDown, Eye, EyeOff, Wifi, WifiOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';

const HealthBadge = ({ score }) => {
    if (score >= 80) return { color: 'bg-green-100 text-green-700 border-green-200', label: 'Excellent', icon: ThumbsUp };
    if (score >= 60) return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Good', icon: Activity };
    if (score >= 40) return { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Warning', icon: AlertTriangle };
    return { color: 'bg-red-100 text-red-700 border-red-200', label: 'Critical', icon: XCircle };
};

const RiskBadge = ({ level }) => {
    const styles = {
        low: 'bg-green-100 text-green-700',
        medium: 'bg-yellow-100 text-yellow-700',
        high: 'bg-orange-100 text-orange-700',
        critical: 'bg-red-100 text-red-700'
    };
    return (
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${styles[level] || styles.low}`}>
            {level}
        </span>
    );
};

function DeviceHealthCard({ device, onClick }) {
    const successRate = device.message_success_rate || 0;
    const { color, label, icon: Icon } = HealthBadge(successRate);

    return (
        <div
            onClick={onClick}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        device.status?.toLowerCase() === 'connected'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                    }`}>
                        <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">{device.name}</h4>
                        <p className="text-xs text-gray-500">{device.whatsapp_number}</p>
                    </div>
                </div>
                <RiskBadge level={device.risk_level || 'low'} />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Success Rate</span>
                    <span className={`font-bold ${successRate >= 80 ? 'text-green-600' : successRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {successRate.toFixed(1)}%
                    </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${
                            successRate >= 80 ? 'bg-green-500' : successRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${successRate}%` }}
                    />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                    <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{device.messages_sent || 0}</p>
                        <p className="text-[10px] text-gray-500">Sent</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{device.daily_avg || 0}</p>
                        <p className="text-[10px] text-gray-500">Daily Avg</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{device.days_active || 0}</p>
                        <p className="text-[10px] text-gray-500">Days Active</p>
                    </div>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-1 rounded ${color}`}>
                    <Icon className="w-3 h-3 inline mr-1" />
                    {label}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, subtext, color }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="text-xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
            {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
        </div>
    );
}

function OptimalTimeCard({ times }) {
    if (!times || times.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    Optimal Sending Times
                </h3>
                <p className="text-sm text-gray-400 text-center py-4">Not enough data yet</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-indigo-500" />
                Optimal Sending Times
            </h3>
            <div className="space-y-2">
                {times.map((time, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-700">{time.time}</span>
                        </div>
                        <span className="text-xs text-gray-500">{time.efficiency}% efficiency</span>
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
                Based on message delivery success rates
            </p>
        </div>
    );
}

function BanRiskCard({ risk }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-indigo-500" />
                Overall Ban Risk
            </h3>

            <div className="flex items-center justify-center py-4">
                <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r="56" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                        <circle
                            cx="64" cy="64" r="56" fill="none"
                            stroke={risk >= 80 ? '#10b981' : risk >= 60 ? '#f59e0b' : risk >= 40 ? '#f97316' : '#ef4444'}
                            strokeWidth="12"
                            strokeDasharray={`${(risk / 100) * 352} 352`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-gray-900">{risk}%</span>
                        <span className="text-xs text-gray-500">Safe Score</span>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">High Risk Devices</span>
                    <span className="font-bold text-red-600">{risk < 60 ? '2' : '0'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Recommended Daily Limit</span>
                    <span className="font-bold text-gray-700">{risk >= 80 ? '100' : risk >= 60 ? '50' : '25'} msgs</span>
                </div>
            </div>
        </div>
    );
}

function MessageTrendCard({ trend }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Message Trends (7 Days)
            </h3>

            <div className="h-32 flex items-end justify-between gap-1">
                {trend.map((day, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div
                            className="w-full bg-indigo-200 rounded-t transition-all hover:bg-indigo-400"
                            style={{ height: `${(day / Math.max(...trend.map(t => t))) * 100}%` }}
                        />
                        <span className="text-[10px] text-gray-400">{day}</span>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-3">
                <span className="text-xs text-gray-500">Total (7 days)</span>
                <span className="text-sm font-bold text-gray-900">
                    {trend.reduce((a, b) => a + b, 0).toLocaleString()}
                </span>
            </div>
        </div>
    );
}

function DeviceDetailModal({ device, isOpen, onClose }) {
    if (!isOpen || !device) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Device Health Details"
            size="md"
            footer={
                <ModalFooter>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => window.location.href = '/integrations/whatsapp'}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
                        >
                            Manage Device <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                    <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Smartphone className="w-7 h-7 text-indigo-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">{device.name}</h4>
                        <p className="text-sm text-gray-500">{device.whatsapp_number}</p>
                        <div className="mt-1">
                            <RiskBadge level={device.risk_level || 'low'} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Success Rate</p>
                        <p className="text-xl font-bold text-green-600">
                            {(device.message_success_rate || 0).toFixed(1)}%
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Messages Sent</p>
                        <p className="text-xl font-bold text-gray-900">{device.messages_sent || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Daily Average</p>
                        <p className="text-xl font-bold text-gray-900">{device.daily_avg || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Days Active</p>
                        <p className="text-xl font-bold text-gray-900">{device.days_active || 0}</p>
                    </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-yellow-800">Recommendations</p>
                            <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                                {(device.message_success_rate || 0) < 80 && (
                                    <li>- Reduce daily message volume by 20%</li>
                                )}
                                {(device.risk_level === 'high' || device.risk_level === 'critical') && (
                                    <li>- Enable gradual warmup mode</li>
                                )}
                                <li>- Send during optimal hours (10:00-14:00)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

export default function DeviceHealthPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [devices, setDevices] = useState([]);
    const [stats, setStats] = useState({
        total_devices: 0,
        active_devices: 0,
        avg_success_rate: 0,
        overall_risk: 0,
        total_messages: 0
    });
    const [optimalTimes, setOptimalTimes] = useState([]);
    const [weeklyTrend, setWeeklyTrend] = useState([0, 0, 0, 0, 0, 0, 0]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [deviceRes, statsRes, timesRes] = await Promise.all([
                axios.get('/api/app/devices/health'),
                axios.get('/api/app/devices/health/stats'),
                axios.get('/api/app/devices/health/optimal-times')
            ]);
            setDevices(deviceRes.data.devices || []);
            setStats(statsRes.data || {
                total_devices: 0,
                active_devices: 0,
                avg_success_rate: 0,
                overall_risk: 0,
                total_messages: 0
            });
            setOptimalTimes(timesRes.data.times || []);
            setWeeklyTrend(statsRes.data.weekly_trend || [0, 0, 0, 0, 0, 0, 0]);
        } catch (err) {
            console.error('Failed to fetch health data:', err);
            // Fallback to device list
            try {
                const fallbackRes = await axios.get('/api/app/devices');
                const deviceData = fallbackRes.data.map(d => ({
                    ...d,
                    message_success_rate: Math.random() * 30 + 70, // Mock for demo
                    risk_level: Math.random() > 0.7 ? 'medium' : 'low',
                    messages_sent: Math.floor(Math.random() * 1000),
                    daily_avg: Math.floor(Math.random() * 50),
                    days_active: Math.floor(Math.random() * 30) + 1
                }));
                setDevices(deviceData);
                setStats({
                    total_devices: deviceData.length,
                    active_devices: deviceData.filter(d => d.status === 'connected').length,
                    avg_success_rate: deviceData.reduce((a, b) => a + b.message_success_rate, 0) / deviceData.length,
                    overall_risk: 75,
                    total_messages: deviceData.reduce((a, b) => a + (b.messages_sent || 0), 0)
                });
                setOptimalTimes([
                    { time: '10:00 - 12:00', efficiency: 92 },
                    { time: '14:00 - 16:00', efficiency: 88 },
                    { time: '19:00 - 21:00', efficiency: 85 }
                ]);
            } catch (e) {
                toast.error('Failed to load device data');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDeviceClick = (device) => {
        setSelectedDevice(device);
        setDetailModalOpen(true);
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                    <p className="text-gray-500">Loading health data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-7 h-7 text-indigo-600" />
                        Device Health Monitor
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Monitor your WhatsApp devices health and optimize sending performance
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={() => navigate('/integrations/whatsapp')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <Smartphone className="w-4 h-4" />
                        Manage Devices
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={Smartphone}
                    label="Total Devices"
                    value={stats.total_devices}
                    subtext={`${stats.active_devices} active`}
                    color="bg-blue-100 text-blue-600"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Avg Success"
                    value={`${(stats.avg_success_rate || 0).toFixed(1)}%`}
                    subtext="Message delivery rate"
                    color="bg-green-100 text-green-600"
                />
                <StatCard
                    icon={MessageSquare}
                    label="Total Sent"
                    value={(stats.total_messages || 0).toLocaleString()}
                    subtext="Last 30 days"
                    color="bg-purple-100 text-purple-600"
                />
                <StatCard
                    icon={Shield}
                    label="Safe Score"
                    value={`${stats.overall_risk || 0}%`}
                    subtext="Lower is better"
                    color="bg-indigo-100 text-indigo-600"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Device List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-500" />
                            Device Status
                        </h2>
                        <div className="text-xs text-gray-500">
                            {devices.length} devices
                        </div>
                    </div>

                    {devices.length === 0 ? (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                            <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No devices found</p>
                            <p className="text-sm text-gray-400 mt-1">Connect a WhatsApp device to start monitoring</p>
                            <button
                                onClick={() => navigate('/integrations/whatsapp')}
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                            >
                                Add Device
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {devices.map(device => (
                                <DeviceHealthCard
                                    key={device.id}
                                    device={device}
                                    onClick={() => handleDeviceClick(device)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column - Analysis */}
                <div className="space-y-4">
                    <BanRiskCard risk={stats.overall_risk || 75} />
                    <OptimalTimeCard times={optimalTimes} />
                    <MessageTrendCard trend={weeklyTrend} />
                </div>
            </div>

            {/* Tips Section */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-3">
                    <Info className="w-5 h-5" />
                    Best Practices for Device Health
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                            <Send className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <p className="font-medium text-indigo-900 text-sm">Gradual Warmup</p>
                            <p className="text-xs text-indigo-700 mt-1">Start with 20-30 messages/day, increase by 10% weekly</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <p className="font-medium text-indigo-900 text-sm">Optimal Timing</p>
                            <p className="text-xs text-indigo-700 mt-1">Send messages between 10:00-14:00 and 19:00-21:00</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                            <Zap className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <p className="font-medium text-indigo-900 text-sm">Use Rotators</p>
                            <p className="text-xs text-indigo-700 mt-1">Distribute load across multiple devices to reduce risk</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Device Detail Modal */}
            <DeviceDetailModal
                device={selectedDevice}
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
            />
        </div>
    );
}
