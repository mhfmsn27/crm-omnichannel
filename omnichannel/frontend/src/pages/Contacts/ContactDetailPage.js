import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    User, Mail, Smartphone, MapPin, Calendar, Tag, MessageSquare,
    ArrowLeft, Phone, Send, Clock, CheckCircle, XCircle, FileText,
    TrendingUp, Star, Loader2, ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';

const ACTIVITY_ICONS = {
    message:    { icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    broadcast:  { icon: Send,        color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
    task:       { icon: CheckCircle, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    pipeline:   { icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    note:       { icon: FileText,    color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    call:       { icon: Phone,      color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
};

const SENTIMENT_CONFIG = {
    positive: { emoji: '😊', label: 'Positif' },
    happy:    { emoji: '😄', label: 'Senang' },
    neutral:  { emoji: '😐', label: 'Netral' },
    negative: { emoji: '😔', label: 'Negatif' },
    angry:    { emoji: '😠', label: 'Marah' },
};

function LeadScoreBadge({ score, status }) {
    if (score == null || score === 0) {
        return <span className="text-xs text-gray-400 italic">Belum di-score</span>;
    }
    const cfg = status === 'hot' ? { label: 'Hot', color: 'text-red-600 bg-red-50 border-red-200' }
        : status === 'warm' ? { label: 'Warm', color: 'text-orange-600 bg-orange-50 border-orange-200' }
        : status === 'cold' ? { label: 'Cold', color: 'text-blue-600 bg-blue-50 border-blue-200' }
        : { label: 'Unqualified', color: 'text-gray-500 bg-gray-50 border-gray-200' };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.color}`}>
            <TrendingUp className="w-3 h-3" />
            {cfg.label} · {score}/100
        </span>
    );
}

function ActivityItem({ item }) {
    const cfg = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.message;
    const Icon = cfg.icon;
    const time = item.created_at
        ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: id })
        : '';

    return (
        <div className="flex items-start gap-3 py-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{item.title}</span>
                    {item.sentiment && SENTIMENT_CONFIG[item.sentiment] && (
                        <span className="text-xs" title={SENTIMENT_CONFIG[item.sentiment].label}>
                            {SENTIMENT_CONFIG[item.sentiment].emoji}
                        </span>
                    )}
                    <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{time}</span>
                </div>
                {item.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                )}
                {item.metadata && (
                    <div className="flex flex-wrap gap-2 mt-1">
                        {item.metadata.channel && (
                            <span className="text-[10px] text-gray-400">{item.metadata.channel}</span>
                        )}
                        {item.metadata.pipeline_name && (
                            <span className="text-[10px] text-orange-500">Pipeline: {item.metadata.pipeline_name}</span>
                        )}
                        {item.metadata.stage_name && (
                            <span className="text-[10px] text-orange-400">→ {item.metadata.stage_name}</span>
                        )}
                        {item.metadata.task_status && (
                            <span className={`text-[10px] font-medium ${item.metadata.task_status === 'done' ? 'text-green-500' : 'text-gray-400'}`}>
                                Task: {item.metadata.task_status}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ContactDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [contact, setContact] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('timeline');

    const fetchContact = useCallback(async () => {
        try {
            const res = await axios.get(`/api/app/contacts/${id}`);
            setContact(res.data);
        } catch {
            toast.error('Kontak tidak ditemukan');
            navigate('/contacts/list');
        }
    }, [id, navigate]);

    const fetchActivities = useCallback(async () => {
        try {
            const res = await axios.get(`/api/app/contacts/${id}/activity`);
            setActivities(res.data);
        } catch {
            setActivities([]);
        }
    }, [id]);

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchContact(), fetchActivities()]).finally(() => setLoading(false));
    }, [fetchContact, fetchActivities]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!contact) return null;

    const phoneDisplay = contact.phone_number?.replace('@s.whatsapp.net', '').replace('@c.us', '');

    const tabs = [
        { key: 'timeline', label: 'Timeline' },
        { key: 'customFields', label: 'Custom Fields' },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Back button */}
            <div className="px-4 sm:px-6 pt-4 pb-2 flex items-center gap-2 flex-shrink-0">
                <button onClick={() => navigate('/contacts/list')}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Kembali
                </button>
            </div>

            {/* Contact Header Card */}
            <div className="px-4 sm:px-6 pb-4 flex-shrink-0">
                <div className="bg-white dark:bg-dark-surface rounded-xl border dark:border-dark-border p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xl flex-shrink-0">
                            {contact.name ? contact.name.charAt(0).toUpperCase() : '#'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{contact.name || 'Tanpa Nama'}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-0.5">{phoneDisplay}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <LeadScoreBadge score={contact.lead_score} status={contact.lead_status} />
                                    {contact.is_subscribed !== false ? (
                                        <span className="text-[10px] text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Subscribed
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                                            <XCircle className="w-3 h-3" /> Unsubscribed
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Quick Info Row */}
                            <div className="flex flex-wrap gap-4 mt-3">
                                {contact.email && (
                                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <Mail className="w-3 h-3" /> {contact.email}
                                    </span>
                                )}
                                {contact.city && (
                                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <MapPin className="w-3 h-3" /> {contact.city}{contact.province ? `, ${contact.province}` : ''}
                                    </span>
                                )}
                                {contact.birth_date && (
                                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <Calendar className="w-3 h-3" /> {format(new Date(contact.birth_date), 'd MMMM yyyy', { locale: id })}
                                    </span>
                                )}
                                {contact.source && contact.source !== 'manual' && (
                                    <span className="text-xs text-gray-400 italic capitalize">{contact.source}</span>
                                )}
                            </div>

                            {/* Labels */}
                            {contact.labels?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {contact.labels.map(l => (
                                        <span key={l.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                                            style={{ backgroundColor: l.color + '20', color: l.color, borderColor: l.color + '40' }}>
                                            <Tag className="w-2.5 h-2.5" />{l.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 sm:px-6 flex-shrink-0">
                <div className="flex border-b dark:border-dark-border">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === t.key
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 custom-scrollbar">
                {activeTab === 'timeline' && (
                    <div className="divide-y divide-gray-100 dark:divide-dark-border">
                        {activities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <Clock className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm">Belum ada aktivitas tercatat</p>
                            </div>
                        ) : (
                            activities.map(item => <ActivityItem key={item.id} item={item} />)
                        )}
                    </div>
                )}

                {activeTab === 'customFields' && (
                    <div className="py-4">
                        <p className="text-xs text-gray-400 italic">Custom field values dapat dilihat di panel detail inbox percakapan.</p>
                    </div>
                )}
            </div>
        </div>
    );
}