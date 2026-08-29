
import React, { useState, memo, useCallback, useRef, useEffect } from 'react';
import { List } from 'react-window';
import { getInitialsAvatar } from '../../utils/avatar';
import { Image, Video, FileText, Mic, Sticker, GitBranch, User, Pin, Archive, Trash, EyeOff, Eye, AlertCircle, CheckCircle, Calendar, MapPin, ChevronDown, BellOff, Bell, Ban, Eraser } from 'lucide-react';
import { Skeleton, SkeletonCircle } from '../common/Skeleton';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { id } from 'date-fns/locale';
import { getApiUrl } from '../../config/api';
import ContextMenu from '../common/ContextMenu';
import MessageStatusTick from './MessageStatusTick.jsx';
import { UrgencyBadge, SentimentBadge } from './UrgencyBadge';

// Virtualization threshold - only virtualize if more than this many items
const VIRTUALIZATION_THRESHOLD = 5000;
const ITEM_HEIGHT = 80;

// Helper to get SVG icon path based on channel/type
const getChannelIcon = (channel, deviceType) => {
    if (channel === 'whatsapp') {
        return deviceType === 'official' ? '/icons/whatsapp-official.svg' : '/icons/whatsapp-unofficial.svg';
    }
    switch (channel) {
        case 'messenger': return '/icons/messenger.svg';
        case 'instagram': return '/icons/instagram.svg';
        case 'telegram': return '/icons/telegram.svg';
        case 'webchat': return '/icons/webchat.svg';
        case 'email': return '/icons/email.svg';
        case 'shopee': return '/icons/shopee.svg';
        default: return '/icons/device.svg';
    }
};

const isLidNumber = (str) => {
    if (!str) return false;
    const s = String(str);
    // LID: pure numeric string of 15+ digits (WhatsApp internal ID), or contains @lid
    return s.includes('@lid') || /^\d{15,}$/.test(s.split('@')[0]);
};

const formatDisplayName = (name, phone) => {
    if (!name) return phone ? formatDisplayName(phone) : 'Kontak WA';
    const s = String(name);
    // Strip @lid / @s.whatsapp.net domain
    const stripped = s.split('@')[0];
    // If stripped is a raw LID (15+ digits) — show phone if available, else generic label
    if (/^\d{15,}$/.test(stripped)) {
        if (phone && !isLidNumber(phone)) return String(phone).split('@')[0];
        return 'Kontak WA';
    }
    return stripped;
};

const safeFormatDistance = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isToday(date)) {
            return format(date, 'HH:mm');
        } else if (isYesterday(date)) {
            return 'Kemarin';
        } else if (isThisWeek(date)) {
            return format(date, 'EEEE', { locale: id });
        } else {
            return format(date, 'dd/MM/yyyy');
        }
    } catch { 
        return ''; 
    }
};

const getDeviceBadgeStyle = (channel) => {
    switch (channel) {
        case 'whatsapp':
        case 'whatsapp_official':
            return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
        case 'messenger':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
        case 'instagram':
            return 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300';
        case 'telegram':
            return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
        case 'webchat':
            return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
        case 'email':
            return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';
        case 'tiktok':
            return 'bg-gray-900 text-white dark:bg-black dark:text-white';
        case 'shopee':
            return 'bg-orange-100 text-[#EE4D2D] dark:bg-orange-950/50 dark:text-orange-300';
        case 'tokopedia':
            return 'bg-emerald-100 text-[#03AC0E] dark:bg-emerald-950/50 dark:text-emerald-300';
        case 'line':
            return 'bg-emerald-50 text-[#06C755] dark:bg-green-950/50 dark:text-green-300';
        default:
            return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400';
    }
};

const ContactItem = ({ conversation, isActive, onClick, onContextMenu, isSelectionMode, isSelected, onToggleSelection, drafts, contactPresence }) => {
    const iconPath = getChannelIcon(conversation.channel, conversation.device_type);
    const isResolved = conversation.status === 'resolved';
    const hasActiveFlow = !!conversation.active_flow_name;
    const deviceStyle = getDeviceBadgeStyle(conversation.channel);

    const renderPreview = () => {
        const presence = contactPresence?.[conversation.phone_number];
        if (presence?.status === 'composing') {
            return <span className="text-[#00a884] font-medium animate-pulse">typing...</span>;
        }
        if (presence?.status === 'recording') {
            return <span className="text-[#00a884] font-medium animate-pulse flex items-center gap-1"><Mic className="w-3 h-3" /> recording audio...</span>;
        }

        if (drafts?.[conversation.id] && drafts[conversation.id].trim().length > 0) {
            const draftText = drafts[conversation.id].trim();
            return (
                <span className="truncate flex items-center gap-1">
                    <span className="text-red-500 font-medium">[Draft]</span> 
                    {draftText.length > 30 ? draftText.substring(0, 30) + '...' : draftText}
                </span>
            );
        }

        const msg = conversation.last_message;
        const getPreviewText = () => {
            if (!msg || typeof msg !== 'string') return <span className="italic opacity-50">No messages</span>;

            if (msg.includes('[IMAGE]')) return <span className="flex items-center gap-1"><Image className="w-3 h-3" /> Photo</span>;
            if (msg.includes('[VIDEO]')) return <span className="flex items-center gap-1"><Video className="w-3 h-3" /> Video</span>;
            if (msg.includes('[AUDIO]')) return <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> Audio</span>;
            if (msg.includes('[DOCUMENT]') || msg.includes('[FILE]')) return <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> File</span>;
            if (msg.includes('[STICKER]')) return <span className="flex items-center gap-1"><Sticker className="w-3 h-3" /> Sticker</span>;
            if (msg.includes('[CONTACT]')) return <span className="flex items-center gap-1"><User className="w-3 h-3" /> {msg.replace('[Contact] ', '')}</span>;
            if (msg.includes('[POLL]')) return <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> {msg.replace('[Poll] ', '')}</span>;
            if (msg.includes('[EVENT]')) return <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {msg.replace('[Event] ', '')}</span>;
            if (msg.includes('[LOCATION]')) return <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Shared location</span>;

            return msg.length > 35 ? msg.substring(0, 35) + '...' : msg;
        };

        return (
            <div className="flex items-center gap-1 truncate w-full">
                {conversation.last_message_from_me && (
                    <div className="flex-shrink-0 opacity-70">
                        <MessageStatusTick status={conversation.last_message_status || 'sent'} />
                    </div>
                )}
                <span className="truncate">{getPreviewText()}</span>
            </div>
        );
    };

    return (
        <div
            onClick={(e) => {
                if (isSelectionMode) {
                    onToggleSelection(conversation.id);
                } else {
                    onClick(e);
                }
            }}
            onContextMenu={(e) => onContextMenu(e, conversation)}
            className={`
            relative px-4 py-2.5 cursor-pointer transition-all duration-200 border-b border-gray-50 dark:border-slate-800/50 group
            ${isActive && !isSelectionMode
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/20 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-indigo-500 before:rounded-r'
                    : 'bg-white dark:bg-[#1e293b] hover:bg-gray-50/80 dark:hover:bg-slate-800'
                }
            ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}
          `}
        >
            <div className="flex items-center gap-3">
                {isSelectionMode && (
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0 mr-1">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelection(conversation.id)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                    </div>
                )}
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <img
                        src={conversation.profile_pic_url || getInitialsAvatar(conversation.contact_name)}
                        onError={(e) => { e.target.onerror = null; e.target.src = getInitialsAvatar(conversation.contact_name); }}
                        className={`w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-slate-600 ${isResolved ? 'opacity-60 grayscale' : ''}`}
                        alt=""
                    />
                    {/* Channel Icon Badge */}
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#1e293b] rounded-full p-0.5 shadow-sm border border-gray-100 dark:border-slate-700">
                        <img src={getApiUrl(iconPath)} className="w-3 h-3" alt="ch" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header: Name, Agent & Time */}
                    <div className="flex justify-between items-baseline mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0 max-w-[85%]">
                            <h4 className={`text-sm font-bold truncate ${conversation.unread_count > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-slate-300'}`}>
                                {formatDisplayName(conversation.contact_name, conversation.phone_number)}
                            </h4>

                            {/* Pinned Icon */}
                            {conversation.is_pinned && <Pin className="w-3 h-3 text-gray-500 fill-gray-500 transform rotate-45" />}

                            {/* Group Badge */}
                            {conversation.phone_number?.endsWith('@g.us') && (
                                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 text-[9px] font-bold px-1 rounded-sm uppercase tracking-wider flex-shrink-0">
                                    GROUP
                                </span>
                            )}

                            {/* Agent Name Inline */}
                            {conversation.agent_name && (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 truncate">
                                    <User className="w-2.5 h-2.5" /> {conversation.agent_name.split(' ')[0]}
                                </span>
                            )}
                        </div>
                        <span className={`text-[9px] flex-shrink-0 ${conversation.unread_count > 0 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400 dark:text-slate-500'}`}>
                            {safeFormatDistance(conversation.last_message_at)}
                        </span>
                    </div>

                    {/* Preview Message */}
                    <div 
                        className={`text-xs truncate h-4.5 flex items-center mb-1 ${conversation.unread_count > 0 ? 'text-gray-800 dark:text-slate-200 font-medium' : 'text-gray-500 dark:text-slate-500'}`}
                        title={conversation.last_message || ''}
                    >
                        {renderPreview()}
                    </div>

                    {/* Meta Tags (Compact) */}
                    <div className="flex items-center gap-1.5 overflow-hidden w-full">
                        {/* Device Name with Color */}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold truncate max-w-[90px] uppercase tracking-wider ${deviceStyle}`}>
                            {conversation.device_name || 'Unknown'}
                        </span>

                        {/* Flow Badge */}
                        {hasActiveFlow && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-[8px] font-medium text-blue-700 dark:text-blue-300 flex-shrink-0 animate-pulse">
                                <GitBranch className="w-2.5 h-2.5 mr-0.5" /> Bot
                            </span>
                        )}

                        {/* Urgency Badge */}
                        <UrgencyBadge isUrgent={conversation.is_urgent} size="sm" />

                        {/* Sentiment Badge */}
                        <SentimentBadge sentiment={conversation.last_sentiment} />


                        {/* Labels */}
                        {conversation.labels && conversation.labels.length > 0 && (
                            <>
                                <span
                                    className="px-1.5 py-0.5 rounded text-[8px] font-bold border truncate max-w-[80px]"
                                    style={{
                                        backgroundColor: conversation.labels[0].color + '15',
                                        color: conversation.labels[0].color,
                                        borderColor: conversation.labels[0].color + '30'
                                    }}
                                >
                                    {conversation.labels[0].name}
                                </span>
                                {conversation.labels.length > 1 && (
                                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold">
                                        +{conversation.labels.length - 1}
                                    </span>
                                )}
                            </>
                        )}

                        {/* Unread Badge (If > 0) */}
                        {conversation.unread_count > 0 && (
                            <span className="ml-auto bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.4)]">
                                {conversation.unread_count}
                            </span>
                        )}
                    </div>
                </div>
                
                {/* WA Web Hover Menu Arrow */}
                {!isSelectionMode && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                onContextMenu(e, conversation);
                            }}
                            className="bg-white/90 dark:bg-[#1e293b]/90 shadow-sm rounded-full p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors backdrop-blur-sm border border-gray-100 dark:border-slate-700"
                            title="Menu Chat"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const MemoizedContactItem = memo(ContactItem);

    // Virtualized row renderer for react-window (for 50+ conversations)
    const VirtualizedRow = memo(({ index, style, data }) => {
        const { conversations, selectedConvId, onSelect, handleContextMenu, isSelectionMode, selectedIds, onToggleSelection, drafts, contactPresence } = data;
        const c = conversations[index];
        return (
            <div style={style}>
                <MemoizedContactItem
                    key={c.id}
                    conversation={c}
                    isActive={String(c.id) === String(selectedConvId)}
                    onClick={() => onSelect(c.id)}
                    onContextMenu={(e) => handleContextMenu(e, c)}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds?.includes(c.id)}
                    onToggleSelection={onToggleSelection}
                    drafts={drafts}
                    contactPresence={contactPresence}
                />
            </div>
        );
    });

    export default function ConversationList({ conversations, selectedConvId, onSelect, isLoading, onArchive, onPin, onUnread, onDelete, isSelectionMode, selectedIds, onToggleSelection, onTransfer, onResolve, onLabel, onMute, onBlock, onClearChat, onLoadMore, hasMore, drafts, contactPresence }) {
    const [contextMenu, setContextMenu] = useState(null);

    const handleContextMenu = (e, conversation) => {
        e.preventDefault();
        setContextMenu({
            x: e.pageX,
            y: e.pageY,
            conversation
        });
    };

    const handleCloseMenu = () => setContextMenu(null);

    if (isLoading) return (
        <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white dark:bg-[#1e293b] p-3 rounded-lg flex gap-3 border border-gray-50 dark:border-slate-700">
                    <SkeletonCircle size="10" className="bg-gray-200 dark:bg-slate-700" />
                    <div className="flex-1 space-y-2">
                        <div className="flex justify-between">
                            <Skeleton className="h-3 w-24 bg-gray-200 dark:bg-slate-700" />
                            <Skeleton className="h-2 w-10 bg-gray-200 dark:bg-slate-700" />
                        </div>
                        <Skeleton className="h-2.5 w-full bg-gray-200 dark:bg-slate-700" />
                        <Skeleton className="h-2 w-1/2 bg-gray-200 dark:bg-slate-700" />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col flex-1 min-h-0 w-full bg-white dark:bg-[#1e293b]">
            {conversations.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 p-6 text-center">
                    <p className="text-sm font-medium">No conversations found.</p>
                </div>
            ) : conversations.length > VIRTUALIZATION_THRESHOLD ? (
                // VIRTUALIZED LIST - For large datasets
                <div className="flex-1">
                    <List
                        height={window?.innerHeight - 200 || 600}
                        width="100%"
                        itemCount={hasMore ? conversations.length + 1 : conversations.length}
                        itemSize={ITEM_HEIGHT}
                        onItemsRendered={({ visibleStopIndex }) => {
                            if (hasMore && visibleStopIndex >= conversations.length - 5 && onLoadMore) {
                                onLoadMore();
                            }
                        }}
                        itemData={{
                            conversations,
                            selectedConvId,
                            onSelect,
                            handleContextMenu,
                            isSelectionMode,
                            selectedIds,
                            onToggleSelection,
                            drafts,
                            contactPresence
                        }}
                    >
                        {VirtualizedRow}
                    </List>
                </div>
            ) : (
                // REGULAR LIST - For small datasets (faster initial render)
                <div 
                    className="flex-1 overflow-y-auto custom-scrollbar"
                    onScroll={(e) => {
                        const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50;
                        if (bottom && hasMore && onLoadMore) {
                            onLoadMore();
                        }
                    }}
                >
                    {conversations.map(c => (
                        <MemoizedContactItem
                            key={c.id}
                            conversation={c}
                            isActive={String(c.id) === String(selectedConvId)}
                            onClick={() => onSelect(c.id)}
                            onContextMenu={handleContextMenu}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedIds?.includes(c.id)}
                            onToggleSelection={onToggleSelection}
                            drafts={drafts}
                            contactPresence={contactPresence}
                        />
                    ))}
                </div>
            )}

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={handleCloseMenu}
                    options={[
                        {
                            label: contextMenu.conversation.is_archived ? "Buka arsip chat" : "Arsipkan chat",
                            icon: <Archive className="w-4 h-4" />,
                            onClick: () => onArchive(contextMenu.conversation.id, contextMenu.conversation.is_archived)
                        },
                        {
                            label: contextMenu.conversation.is_muted ? "Bunyikan notifikasi" : "Bisukan notifikasi",
                            icon: contextMenu.conversation.is_muted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />,
                            onClick: () => onMute && onMute(contextMenu.conversation)
                        },
                        {
                            label: contextMenu.conversation.is_pinned ? "Batal sematkan" : "Sematkan chat",
                            icon: <Pin className="w-4 h-4" />,
                            onClick: () => onPin(contextMenu.conversation.id, contextMenu.conversation.is_pinned)
                        },
                        {
                            label: contextMenu.conversation.unread_count > 0 ? "Tandai sudah dibaca" : "Tandai belum dibaca",
                            icon: contextMenu.conversation.unread_count > 0 ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />,
                            onClick: () => onUnread(contextMenu.conversation.id, contextMenu.conversation.unread_count > 0)
                        },
                        { type: 'divider' },
                        {
                            label: "Label obrolan",
                            icon: <AlertCircle className="w-4 h-4" />,
                            onClick: () => onLabel(contextMenu.conversation)
                        },
                        {
                            label: "Transfer obrolan",
                            icon: <User className="w-4 h-4" />,
                            onClick: () => onTransfer(contextMenu.conversation)
                        },
                        {
                            label: contextMenu.conversation.status === 'resolved' ? "Buka kembali obrolan" : "Selesaikan obrolan",
                            icon: <CheckCircle className="w-4 h-4" />,
                            onClick: () => onResolve(contextMenu.conversation)
                        },
                        { type: 'divider' },
                        {
                            label: contextMenu.conversation.is_blocked ? "Buka blokir" : "Blokir",
                            icon: <Ban className="w-4 h-4" />,
                            onClick: () => onBlock && onBlock(contextMenu.conversation)
                        },
                        {
                            label: "Bersihkan obrolan",
                            icon: <Eraser className="w-4 h-4" />,
                            onClick: () => onClearChat && onClearChat(contextMenu.conversation)
                        },
                        {
                            label: "Hapus obrolan",
                            icon: <Trash className="w-4 h-4 text-red-500" />,
                            className: "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
                            onClick: () => onDelete(contextMenu.conversation.id)
                        }
                    ]}
                />
            )}
        </div>
    );
}

