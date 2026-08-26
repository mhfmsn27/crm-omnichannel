import React, { useState, useRef, useEffect } from 'react';
import { getInitialsAvatar, getValidProfilePicUrl } from '../../utils/avatar';
import { Draggable } from '@hello-pangea/dnd';
import { User, Clock, ExternalLink, TrendingUp, Calendar, Edit3, X, Save } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const formatIDR = (n) => n ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n) : null;

function DealPopover({ conversation, onClose, onSaved }) {
    const [form, setForm] = useState({
        value: conversation.value || '',
        deal_probability: conversation.deal_probability ?? '',
        deal_close_date: conversation.deal_close_date ? conversation.deal_close_date.split('T')[0] : '',
        deal_note: conversation.deal_note || '',
    });
    const [saving, setSaving] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await axios.patch(`/api/app/conversations/${conversation.id}/deal`, form);
            onSaved(res.data);
            onClose();
        } catch {
            toast.error('Gagal menyimpan deal');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div ref={ref} className="absolute top-8 right-0 z-50 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Edit Deal</span>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Nilai Deal (IDR)</label>
                <input type="number" className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-400"
                    value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="0" />
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Probabilitas (%)</label>
                <input type="number" min="0" max="100" className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-400"
                    value={form.deal_probability} onChange={e => setForm({ ...form, deal_probability: e.target.value })} placeholder="0-100" />
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Tanggal Close</label>
                <input type="date" className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-400"
                    value={form.deal_close_date} onChange={e => setForm({ ...form, deal_close_date: e.target.value })} />
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">Catatan Deal</label>
                <textarea rows={2} className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                    value={form.deal_note} onChange={e => setForm({ ...form, deal_note: e.target.value })} placeholder="Catatan..." />
            </div>
            <button onClick={handleSave} disabled={saving}
                className="w-full py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1">
                <Save className="w-3 h-3" /> Simpan
            </button>
        </div>
    );
}

export default function ConversationCard({ conversation: initialConversation, index }) {
    const navigate = useNavigate();
    const [conversation, setConversation] = useState(initialConversation);
    const [showDealEdit, setShowDealEdit] = useState(false);

    const contactName = conversation.contact_name || conversation.phone || 'Unknown';
    const formattedValue = formatIDR(conversation.value);

    const timeAgo = conversation.last_message_at
        ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: idLocale })
        : '';

    const handleOpenChat = (e) => {
        e.stopPropagation();
        navigate(`/inbox?conversationId=${conversation.id}`);
    };

    const handleDealSaved = (updated) => {
        setConversation(prev => ({ ...prev, ...updated }));
    };

    const probColor = conversation.deal_probability >= 70 ? 'text-green-600' :
        conversation.deal_probability >= 40 ? 'text-orange-500' : 'text-red-500';

    return (
        <Draggable draggableId={String(conversation.id)} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`
                        bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
                        hover:shadow-md transition-shadow mb-3 group relative
                        ${snapshot.isDragging ? 'rotate-2 shadow-xl ring-2 ring-indigo-500 z-50' : ''}
                    `}
                    style={provided.draggableProps.style}
                >
                    {/* Action buttons on hover */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setShowDealEdit(v => !v); }}
                            className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"
                            title="Edit Deal">
                            <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={handleOpenChat}
                            className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"
                            title="Open Chat">
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Deal Popover */}
                    {showDealEdit && (
                        <DealPopover
                            conversation={conversation}
                            onClose={() => setShowDealEdit(false)}
                            onSaved={handleDealSaved}
                        />
                    )}

                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <img
                                src={getValidProfilePicUrl(conversation.profile_pic_url) || getInitialsAvatar(contactName)}
                                onError={(e) => { e.target.onerror = null; e.target.src = getInitialsAvatar(contactName); }}
                                alt={contactName}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        </div>

                        <div className="flex-1 min-w-0 pr-6">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{contactName}</h4>

                            {/* Value */}
                            {formattedValue && (
                                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{formattedValue}</div>
                            )}

                            {/* Deal meta */}
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {conversation.deal_probability != null && (
                                    <span className={`flex items-center gap-0.5 text-[10px] font-bold ${probColor}`}>
                                        <TrendingUp className="w-3 h-3" />{conversation.deal_probability}%
                                    </span>
                                )}
                                {conversation.deal_close_date && (
                                    <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(conversation.deal_close_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </span>
                                )}
                            </div>

                            {/* Last Message */}
                            {conversation.last_message && (
                                <div className="mt-2 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs p-2 rounded-lg truncate max-w-full">
                                    {conversation.last_message}
                                </div>
                            )}

                            {/* Deal note */}
                            {conversation.deal_note && (
                                <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 italic line-clamp-1">
                                    "{conversation.deal_note}"
                                </div>
                            )}

                            <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                                {conversation.agent_name && (
                                    <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" /> {conversation.agent_name}
                                    </span>
                                )}
                                {timeAgo && (
                                    <span className="flex items-center gap-1 ml-auto">
                                        <Clock className="w-3 h-3" /> {timeAgo}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
}
