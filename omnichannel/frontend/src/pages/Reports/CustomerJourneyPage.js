import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    GitBranch, Clock, User, MessageCircle, Eye, ShoppingCart,
    Heart, AlertCircle, ChevronRight, Calendar, Filter, RefreshCw,
    TrendingUp, TrendingDown, Minus, Globe, Smartphone
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const formatDate = (date) => date ? format(new Date(date), 'd MMM yyyy, HH:mm') : '-';
const timeAgo = (date) => date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '-';

function EngagementBadge({ score }) {
    const color = score >= 70 ? 'bg-green-100 text-green-700' :
        score >= 40 ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600';

    return (
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${color}`}>
            {score}
        </span>
    );
}

function ChannelIcon({ channel }) {
    const icons = {
        whatsapp: <span className="text-green-500">WA</span>,
        instagram: <span className="text-pink-500">IG</span>,
        facebook: <span className="text-blue-500">FB</span>,
        tiktok: <span className="text-gray-900">TT</span>,
        shopee: <span className="text-orange-500">SH</span>,
        website: <Globe className="w-4 h-4 text-indigo-500" />,
        webchat: <Smartphone className="w-4 h-4 text-purple-500" />
    };

    return (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
            {icons[channel] || '?'}
        </div>
    );
}

function TimelineEvent({ event }) {
    const getIcon = () => {
        switch (event.type) {
            case 'conversation': return <MessageCircle className="w-4 h-4" />;
            case 'touchpoint': return <Eye className="w-4 h-4" />;
            case 'conversion': return <ShoppingCart className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    const getColor = () => {
        switch (event.type) {
            case 'conversation': return 'border-l-blue-500 bg-blue-50';
            case 'touchpoint': return 'border-l-green-500 bg-green-50';
            case 'conversion': return 'border-l-purple-500 bg-purple-50';
            default: return 'border-l-gray-500 bg-gray-50';
        }
    };

    return (
        <div className={`flex gap-3 p-3 rounded-lg border-l-4 ${getColor()}`}>
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">
                        {event.type === 'conversation' ? (
                            <>Conversation <span className="text-gray-500">on</span> {event.channel?.toUpperCase()}</>
                        ) : (
                            event.touchpointType || event.interactionType || 'Event'
                        )}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(event.timestamp)}</span>
                </div>
                {event.agent && (
                    <p className="text-xs text-gray-500 mt-1">Agent: {event.agent}</p>
                )}
                {event.lastMessage && (
                    <p className="text-xs text-gray-600 mt-1 truncate">{event.lastMessage}</p>
                )}
                {event.utm?.source && (
                    <div className="flex items-center gap-1 mt-1">
                        <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px]">
                            {event.utm.source}
                        </span>
                        {event.utm.campaign && (
                            <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px]">
                                {event.utm.campaign}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ContactJourneyCard({ contact, onClick }) {
    return (
        <div
            className="bg-white rounded-xl border p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
            onClick={() => onClick(contact)}
        >
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    {contact.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{contact.name || 'Unknown'}</h3>
                    <p className="text-sm text-gray-500">{contact.phone_number || 'No phone'}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {contact.last_channel && (
                            <span className="flex items-center gap-1">
                                <ChannelIcon channel={contact.last_channel} />
                                {contact.last_channel}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(contact.updated_at || contact.created_at)}
                        </span>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
        </div>
    );
}

export default function CustomerJourneyPage() {
    const [loading, setLoading] = useState(true);
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [journeyData, setJourneyData] = useState(null);
    const [timeline, setTimeline] = useState(null);
    const [search, setSearch] = useState('');
    const [filterChannel, setFilterChannel] = useState('');

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const params = {};
            if (search) params.search = search;
            if (filterChannel) params.channel = filterChannel;

            const res = await axios.get('/api/app/contacts', { params });
            setContacts(res.data.contacts || []);
        } catch (e) {
            toast.error('Failed to load contacts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, [search, filterChannel]);

    const loadJourney = async (contact) => {
        try {
            setSelectedContact(contact);
            const [journeyRes, timelineRes] = await Promise.all([
                axios.get(`/api/app/journeys/${contact.id}`),
                axios.get(`/api/app/journeys/${contact.id}/timeline`)
            ]);
            setJourneyData(journeyRes.data);
            setTimeline(timelineRes.data);
        } catch (e) {
            console.error('Journey load error:', e);
            setJourneyData(null);
            setTimeline(null);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {/* Left Panel - Contact List */}
            <div className="w-80 border-r bg-gray-50 flex flex-col">
                <div className="p-4 border-b bg-white">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-indigo-500" />
                        Customer Journeys
                    </h2>
                    <div className="mt-3 space-y-2">
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                        <select
                            value={filterChannel}
                            onChange={(e) => setFilterChannel(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="">All Channels</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="instagram">Instagram</option>
                            <option value="facebook">Facebook</option>
                            <option value="tiktok">TikTok</option>
                            <option value="shopee">Shopee</option>
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="text-center py-8 text-gray-400">Loading...</div>
                    ) : contacts.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            No contacts found
                        </div>
                    ) : (
                        contacts.map(contact => (
                            <ContactJourneyCard
                                key={contact.id}
                                contact={contact}
                                onClick={loadJourney}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Right Panel - Journey Detail */}
            <div className="flex-1 overflow-y-auto">
                {!selectedContact ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg">Select a contact to view their journey</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        {/* Contact Header */}
                        <div className="bg-white rounded-xl border p-6 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
                                    {selectedContact.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-gray-900">{selectedContact.name}</h2>
                                    <p className="text-gray-500">{selectedContact.phone_number}</p>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                        {selectedContact.email && <span>Email: {selectedContact.email}</span>}
                                        {selectedContact.lifetime_value > 0 && (
                                            <span className="text-green-600 font-medium">
                                                Lifetime Value: Rp {selectedContact.lifetime_value.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {journeyData && (
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">Engagement</div>
                                        <EngagementBadge score={journeyData.engagement_score || 0} />
                                        <div className="text-xs text-gray-400 mt-1">
                                            {journeyData.engagement_trend === 'improving' ? (
                                                <span className="text-green-600 flex items-center gap-1 justify-end">
                                                    <TrendingUp className="w-3 h-3" /> Improving
                                                </span>
                                            ) : journeyData.engagement_trend === 'declining' ? (
                                                <span className="text-red-500 flex items-center gap-1 justify-end">
                                                    <TrendingDown className="w-3 h-3" /> Declining
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 justify-end">
                                                    <Minus className="w-3 h-3" /> Stable
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Journey Stats */}
                        {journeyData && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white rounded-xl border p-4 shadow-sm text-center">
                                    <div className="text-2xl font-bold text-indigo-600">
                                        {journeyData.touchpoint_count || 0}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Touchpoints</div>
                                </div>
                                <div className="bg-white rounded-xl border p-4 shadow-sm text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {timeline?.summary?.totalConversations || 0}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Conversations</div>
                                </div>
                                <div className="bg-white rounded-xl border p-4 shadow-sm text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {timeline?.summary?.channels?.length || 0}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Channels</div>
                                </div>
                                <div className="bg-white rounded-xl border p-4 shadow-sm text-center">
                                    <div className={`text-2xl font-bold ${
                                        journeyData.status === 'converted' ? 'text-purple-600' :
                                            journeyData.status === 'active' ? 'text-blue-600' : 'text-gray-600'
                                    }`}>
                                        {journeyData.status || 'unknown'}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Status</div>
                                </div>
                            </div>
                        )}

                        {/* Channels */}
                        {timeline?.summary?.channels?.length > 0 && (
                            <div className="bg-white rounded-xl border p-4 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-3">Channels Used</h3>
                                <div className="flex flex-wrap gap-2">
                                    {timeline.summary.channels.map(channel => (
                                        <ChannelIcon key={channel} channel={channel} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="bg-white rounded-xl border p-6 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Journey Timeline
                            </h3>
                            {timeline?.events?.length > 0 ? (
                                <div className="space-y-3">
                                    {timeline.events.map((event, idx) => (
                                        <TimelineEvent key={idx} event={event} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    No journey events yet
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}