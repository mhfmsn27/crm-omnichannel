import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import {
    Search, Filter, Lock, Edit, UserPlus, MoreVertical,
    CheckCircle, CheckCircle2, CheckCheck, Activity, ChevronDown, ArrowLeft, Loader2,
    Users, Image as ImageIcon, Bell, BellOff, User, Info,
    RotateCcw, UserCheck, MessageCircle, X, Archive, Trash2, MailOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../config/api';
import Modal from '../components/common/Modal';
import { getInitialsAvatar } from '../utils/avatar';
import { Virtuoso } from 'react-virtuoso';
import { format } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';

// Modular Custom Hooks
import useConversations from '../hooks/useConversations';
import useMessages, { computeGroupedMessages } from '../hooks/useMessages';
import useInboxModals from '../hooks/useInboxModals';
import useInboxActions from '../hooks/useInboxActions';
import useInboxSocket from '../hooks/useInboxSocket';

// Modular UI Components
import ConversationList from '../components/inbox/ConversationList';
import MessageBubble, { DateSeparator } from '../components/inbox/MessageBubble';
import ChatInput from '../components/inbox/ChatInput';
import ContactInfoPanel from '../components/inbox/ContactInfoPanel';
import { Skeleton } from '../components/common/Skeleton';
import MessageLoadMore from '../components/inbox/MessageLoadMore';
import FilterTabs from '../components/inbox/FilterTabs';

// Modals
import WallpaperModal from '../components/inbox/WallpaperModal';
import TransferModal from '../components/inbox/TransferModal';
import ResolveModal from '../components/inbox/ResolveModal';
import ForwardModal from '../components/inbox/ForwardModal.jsx';
import SaveToKbModal from '../components/inbox/SaveToKbModal.jsx';
import MessageInfoModal from '../components/inbox/MessageInfoModal.jsx';
import ContactSelectionModal from '../components/inbox/ContactSelectionModal.jsx';
import FilterChatModal from '../components/inbox/FilterChatModal.jsx';
import LabelAssignmentModal from '../components/inbox/LabelAssignmentModal.jsx';
import RealtimeDiagnostics from '../components/managers/RealtimeDiagnostics.jsx';

// Helpers
const formatDisplayName = (name) => {
    if (!name) return '';
    return String(name).split('@')[0];
};

const getChannelIcon = (channel, deviceType) => {
    if (channel === 'whatsapp') {
        return deviceType === 'official' ? '/icons/whatsapp-official.svg' : '/icons/whatsapp-unofficial.svg';
    }
    switch (channel) {
        case 'wa-api':
        case 'wa_api':
        case 'official': return '/icons/whatsapp-official.svg';
        case 'wa-coex':
        case 'wa_coex': return '/icons/whatsapp-official.svg';
        case 'messenger': return '/icons/messenger.svg';
        case 'instagram': return '/icons/instagram.svg';
        case 'telegram': return '/icons/telegram.svg';
        case 'webchat': return '/icons/webchat.svg';
        case 'email': return '/icons/email.svg';
        case 'tiktok': return '/icons/tiktok.svg';
        case 'shopee': return '/icons/shopee.svg';
        case 'tokopedia': return '/icons/tokopedia.svg';
        case 'line': return '/icons/line.svg';
        default: return '/icons/whatsapp-unofficial.svg';
    }
};

export default function InboxPage() {
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Selected Conversation State
    const [selectedConvId, setSelectedConvId] = useState(null);
    const [showInfoPanel, setShowInfoPanel] = useState(true);
    const [activeContactLabels, setActiveContactLabels] = useState([]);
    const [contactPresence, setContactPresence] = useState({});
    const [agentPresence, setAgentPresence] = useState({});
    const [chatWallpaper, setChatWallpaper] = useState(localStorage.getItem('chat_wallpaper') || '#efeae2');

    // Sync URL ID with State
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const id = params.get('id') || params.get('conversationId');
        if (id) {
            setSelectedConvId(id);
        }
    }, [location.search]);

    // Stability Refs
    const selectedConvIdRef = useRef(selectedConvId);
    const syncTimeoutRef = useRef(null);
    const pendingConvFetchesRef = useRef(new Set());

    useEffect(() => {
        selectedConvIdRef.current = selectedConvId;
    }, [selectedConvId]);

    // Hook: Conversations
    const convHook = useConversations({ user });
    const {
        conversations, setConversations, agents, allTemplates, inboxBanners, queueConfig,
        allLabels, allDevices, filteredDevices, counts, setCounts, loadingConversations,
        page, setPage, hasMoreConversations, isLoadingMore, isSyncing, setIsSyncing,
        showArchived, setShowArchived, searchText, setSearchText, debouncedSearch,
        filterChannel, setFilterChannel, filterDevice, setFilterDevice, filterStatus,
        setFilterStatus, filterInboxId, setFilterInboxId, filterAgent, setFilterAgent,
        filterLabels, setFilterLabels, filterHideKontakWa, setFilterHideKontakWa,
        filterSortBy, setFilterSortBy, filterBy, setFilterBy, fetchData,
        refreshConversations, handleContactSelect, handlePickupQueue
    } = convHook;

    // Hook: Messages
    const msgHook = useMessages({
        selectedConvId,
        socket,
        user,
        setConversations,
        setActiveContactLabels
    });
    const {
        messages, setMessages, loadingMessages, messagePagination, loadingMore,
        loadingNewer, isSending, isAtBottom, setIsAtBottom, unreadSinceScroll,
        setUnreadSinceScroll, firstItemIndex, drafts, editingMessage, setEditingMessage,
        groupedMessages, messagesEndRef, messagesContainerRef, virtuosoRef,
        isAtBottomRef, scrollToBottom, handleLoadMoreMessages, handleLoadNewerMessages,
        handleSendMessage, handleDraftChange, handleFileUpload, handleSendCTA,
        handleStartEdit, handleCancelEdit
    } = msgHook;

    // Hook: Modals
    const modalHook = useInboxModals();
    const {
        isTransferOpen, setIsTransferOpen, isResolveOpen, setIsResolveOpen,
        isForwardOpen, setIsForwardOpen, isSaveKbOpen, setIsSaveKbOpen,
        isWallpaperOpen, setIsWallpaperOpen, isContactModalOpen, setIsContactModalOpen,
        isFilterModalOpen, setIsFilterModalOpen, isLabelModalOpen, setIsLabelModalOpen,
        isDiagnosticsOpen, setIsDiagnosticsOpen, isMenuOpen, setIsMenuOpen,
        isSelectionMode, setIsSelectionMode, selectedConversationIds, setSelectedConversationIds,
        actionTargetConv, setActionTargetConv, messageToForward, setMessageToForward,
        messageToSave, setMessageToSave, infoMessage, setInfoMessage,
        onBubbleForward, onBubbleSaveToKb, handleMessageInfo
    } = modalHook;

    const selectedConv = conversations.find(c => String(c.id) === String(selectedConvId));

    // Hook: Actions
    const actionHook = useInboxActions({
        selectedConvId,
        selectedConv,
        actionTargetConv,
        setActionTargetConv,
        setConversations,
        setMessages,
        setIsTransferOpen,
        setIsResolveOpen,
        setIsForwardOpen,
        setIsSaveKbOpen,
        setIsLabelModalOpen,
        setActiveContactLabels,
        fetchData,
        showArchived,
    });
    const {
        handleToggleArchive, handleTogglePin, handleToggleUnread, handleTransfer,
        handleResolve, handleForward, handleDeleteMessage, handleRevokeMessage,
        handleStarMessage, handlePinMessage, handleCopyMessage, handleRetryMessage,
        handleMuteConversation, handleBlockContact, handleClearChat, handleDeleteConversation,
        handleBulkDelete, handleBulkAction, handleToggleBot, handleSubmitEdit, handleWallpaperSave,
        handleLabelUpdate, onContextTransfer, onContextResolve, onContextLabel
    } = actionHook;

    // Hook: Sockets
    useInboxSocket({
        socket,
        selectedConvIdRef,
        isAtBottomRef,
        pendingConvFetchesRef,
        syncTimeoutRef,
        setMessages,
        setConversations,
        setCounts,
        setUnreadSinceScroll,
        setIsSyncing,
        setContactPresence,
        setAgentPresence,
        refreshConversations,
        scrollToBottom,
        computeGroupedMessages
    });

    // Agent viewing presence
    useEffect(() => {
        if (selectedConvId && socket && user) {
            socket.emit('agent_presence', {
                orgId: user.organization_id,
                conversationId: selectedConvId,
                agentId: user.id,
                agentName: user.name,
                action: 'viewing'
            });

            return () => {
                socket.emit('agent_presence', {
                    orgId: user.organization_id,
                    conversationId: selectedConvId,
                    agentId: user.id,
                    agentName: user.name,
                    action: 'blur'
                });
            };
        }
    }, [selectedConvId, socket, user]);

    // Fallback: if selected conversation is not in list, fetch it directly
    useEffect(() => {
        if (!selectedConvId || loadingConversations) return;
        const found = conversations.find(c => String(c.id) === String(selectedConvId));
        if (!found) {
            const convId = String(selectedConvId);
            if (pendingConvFetchesRef.current.has(convId)) return;
            pendingConvFetchesRef.current.add(convId);
            axios.get(`/api/app/inbox/conversations/${convId}`)
                .then(res => {
                    if (res.data && res.data.id) {
                        setConversations(prev => {
                            const alreadyIn = prev.find(c => String(c.id) === String(res.data.id));
                            return alreadyIn ? prev : [res.data, ...prev];
                        });
                    }
                })
                .catch(() => {})
                .finally(() => {
                    pendingConvFetchesRef.current.delete(convId);
                });
        }
    }, [selectedConvId, loadingConversations, conversations, setConversations]);

    // Bubble quote reply
    const onBubbleReply = (msg) => {
        const inputEl = document.querySelector('textarea');
        if (inputEl) {
            inputEl.value = `> ${msg.content.substring(0, 50)}...\n\n` + inputEl.value;
            inputEl.focus();
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-white dark:bg-dark-bg relative">
            {/* LEFT COL: LIST & FILTER */}
            <div className={`w-full md:w-[320px] xl:w-[360px] border-r border-gray-200 dark:border-dark-border bg-white dark:bg-[#1e293b] flex flex-col h-full ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 border-b border-gray-100 dark:border-slate-700 space-y-3 flex-shrink-0">
                    {/* Header & Search */}
                    <div className="flex justify-between items-center gap-3">
                        <div className="flex items-center gap-2">
                            {/* Selection Mode Cancel */}
                            {isSelectionMode ? (
                                <button
                                    onClick={() => {
                                        setIsSelectionMode(false);
                                        setSelectedConversationIds([]);
                                    }}
                                    className="p-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                                    title="Cancel Selection"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsContactModalOpen(true)}
                                    className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                    title="New Message"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            )}

                            {/* Queue Pickup Button */}
                            {!isSelectionMode && (
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            if (queueConfig?.enabled) handlePickupQueue();
                                        }}
                                        disabled={!queueConfig?.enabled}
                                        className={`p-1.5 rounded-lg transition-colors ${queueConfig?.enabled
                                            ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 cursor-pointer'
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                                            }`}
                                        title={queueConfig?.enabled ? "Ambil Antrian (Pickup Next)" : "Queue Mode Disabled"}
                                    >
                                        <UserPlus className="w-4 h-4" />
                                    </button>
                                    {queueConfig?.enabled && counts.unassigned > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[16px] h-[16px] flex items-center justify-center border-2 border-white dark:border-[#1e293b]">
                                            {counts.unassigned}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                            <input
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-100 dark:bg-slate-800 border-none rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-slate-500"
                                placeholder="Search..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                            />
                        </div>

                        {/* Connection Status Indicator */}
                        <div className="flex items-center gap-1 px-2">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} title={isConnected ? 'Real-time connected' : 'Real-time disconnected'}></div>
                            <span className="text-[10px] text-gray-400">{isConnected ? 'Live' : 'Offline'}</span>
                        </div>

                        {/* Kebab Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-500 dark:text-slate-400 transition-colors"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>

                            {isMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 z-20 py-1 overflow-hidden">
                                        <button
                                            onClick={() => {
                                                setIsFilterModalOpen(true);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                        >
                                            <Filter className="w-3.5 h-3.5" /> Filter Chat
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsSelectionMode(true);
                                                setSelectedConversationIds([]);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" /> Pilih Chat
                                        </button>
                                        <div className="border-t border-gray-100 dark:border-slate-700 my-1"></div>
                                        <button
                                            onClick={() => {
                                                setIsDiagnosticsOpen(true);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                        >
                                            <Activity className="w-3.5 h-3.5" /> Diagnostics
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Dropdowns */}
                    <div className="flex gap-2">
                        {isSelectionMode ? (
                            <div className="flex flex-col gap-2 w-full p-2 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedConversationIds.length === conversations.length && conversations.length > 0) {
                                                    setSelectedConversationIds([]);
                                                } else {
                                                    setSelectedConversationIds(conversations.map(c => c.id));
                                                }
                                            }}
                                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                        >
                                            {selectedConversationIds.length === conversations.length && conversations.length > 0 ? 'Deselect All' : 'Select All'}
                                        </button>
                                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200">
                                            ({selectedConversationIds.length}/{conversations.length})
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSelectionMode(false);
                                            setSelectedConversationIds([]);
                                        }}
                                        className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-slate-400 cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                </div>

                                {selectedConversationIds.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-indigo-100 dark:border-indigo-900/30">
                                        <button
                                            type="button"
                                            onClick={() => handleBulkAction(selectedConversationIds, setSelectedConversationIds, 'resolve')}
                                            className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                                            title="Selesaikan Obrolan Terpilih"
                                        >
                                            <CheckCircle2 className="w-3 h-3" /> Resolve
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleBulkAction(selectedConversationIds, setSelectedConversationIds, 'mark_read')}
                                            className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                                            title="Tandai Dibaca"
                                        >
                                            <MailOpen className="w-3 h-3" /> Read
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleBulkAction(selectedConversationIds, setSelectedConversationIds, 'archive', { is_archived: true })}
                                            className="flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                                            title="Arsipkan"
                                        >
                                            <Archive className="w-3 h-3" /> Arsip
                                        </button>

                                        {user?.id && (
                                            <button
                                                type="button"
                                                onClick={() => handleBulkAction(selectedConversationIds, setSelectedConversationIds, 'assign', { agent_id: user.id })}
                                                className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                                                title="Tugaskan ke Saya"
                                            >
                                                <UserCheck className="w-3 h-3" /> Assign
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleBulkAction(selectedConversationIds, setSelectedConversationIds, 'delete')}
                                            className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] font-bold shadow-xs transition-colors ml-auto cursor-pointer"
                                            title="Hapus"
                                        >
                                            <Trash2 className="w-3 h-3" /> Hapus
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="relative flex-1">
                                    <select
                                        className="w-full appearance-none bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-[11px] font-medium rounded-lg py-1.5 pl-2 pr-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={filterChannel}
                                        onChange={e => { setFilterChannel(e.target.value); setFilterDevice(''); }}
                                    >
                                        <option value="all">Semua Saluran (All)</option>
                                        <option value="whatsapp">WhatsApp (QR Scan)</option>
                                        <option value="wa-api">WhatsApp API (Official)</option>
                                        <option value="wa-coex">WhatsApp CoEx</option>
                                        <option value="email">Email Inbox</option>
                                        <option value="messenger">Meta Messenger</option>
                                        <option value="instagram">Instagram DM</option>
                                        <option value="tiktok">TikTok Shop & DM</option>
                                        <option value="shopee">Shopee Chat</option>
                                        <option value="tokopedia">Tokopedia Chat</option>
                                        <option value="line">LINE Official</option>
                                        <option value="telegram">Telegram</option>
                                        <option value="webchat">Webchat Widget</option>
                                    </select>
                                    <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-gray-400 pointer-events-none" />
                                </div>
                                <div className="relative flex-1">
                                    <select
                                        className="w-full appearance-none bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-[11px] font-medium rounded-lg py-1.5 pl-2 pr-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={filterDevice}
                                        onChange={e => setFilterDevice(e.target.value)}
                                        disabled={filteredDevices.length === 0}
                                    >
                                        <option value="">All Devices</option>
                                        {filteredDevices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-gray-400 pointer-events-none" />
                                </div>

                                {/* Archive Toggle Button */}
                                <button
                                    onClick={() => {
                                        setShowArchived(!showArchived);
                                        if (!showArchived) setFilterStatus('archived');
                                        else setFilterStatus('all');
                                    }}
                                    className={`p-1.5 rounded-lg border transition-colors ${showArchived
                                        ? 'bg-indigo-100 border-indigo-200 text-indigo-600 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-400'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                                    title={showArchived ? "Show Active" : "Show Archived"}
                                >
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-archive"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
                                        {counts.archived > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1 py-0 rounded-full min-w-[14px] flex items-center justify-center leading-none">
                                                {counts.archived}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <FilterTabs
                        tabs={[
                            { label: 'All', value: 'all', count: counts.all },
                            { label: 'Unassigned', value: 'unassigned', count: counts.unassigned },
                            { label: 'Unread', value: 'unread', count: counts.unread },
                            { label: 'Urgent', value: 'urgent', count: counts.urgent },
                            { label: 'Resolved', value: 'resolved', count: counts.resolved },
                        ]}
                        activeTab={filterStatus}
                        onTabChange={setFilterStatus}
                    />
                </div>

                <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1e293b]">
                    {isSyncing && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-100 dark:border-indigo-800 p-2 flex items-center justify-center gap-2 flex-shrink-0">
                            <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                Menyinkronkan pesan lama...
                            </span>
                        </div>
                    )}
                    <ConversationList
                        conversations={conversations}
                        selectedConvId={selectedConvId}
                        drafts={drafts}
                        onSelect={(id) => navigate(`/inbox?id=${id}`)}
                        filter={filterStatus}
                        setFilter={() => { }}
                        isLoading={loadingConversations}
                        onArchive={handleToggleArchive}
                        onPin={handleTogglePin}
                        onUnread={handleToggleUnread}
                        onDelete={handleDeleteConversation}
                        onMute={handleMuteConversation}
                        onBlock={handleBlockContact}
                        onClearChat={handleClearChat}
                        isSelectionMode={isSelectionMode}
                        selectedIds={selectedConversationIds}
                        onToggleSelection={(id) => {
                            setSelectedConversationIds(prev =>
                                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                            );
                        }}
                        onTransfer={onContextTransfer}
                        onResolve={onContextResolve}
                        onLabel={onContextLabel}
                        onLoadMore={() => {
                            if (!isLoadingMore && hasMoreConversations) {
                                setPage(prev => {
                                    const nextPage = prev + 1;
                                    fetchData(nextPage);
                                    return nextPage;
                                });
                            }
                        }}
                        hasMore={hasMoreConversations}
                    />
                    {isLoadingMore && (
                        <div className="p-3 flex justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                        </div>
                    )}
                </div>

                <FilterChatModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    teamMembers={agents}
                    labels={allLabels}
                    initialFilters={{
                        channel: filterChannel,
                        agentId: filterAgent,
                        labels: filterLabels,
                        sortBy: filterSortBy,
                        filterBy: filterBy,
                        hideKontakWa: filterHideKontakWa
                    }}
                    onFilter={(data) => {
                        setFilterChannel(data.channel || 'all');
                        setFilterAgent(data.agentId || '');
                        setFilterLabels(data.labels || []);
                        setFilterSortBy(data.sortBy || 'last_message');
                        setFilterBy(data.filterBy || '');
                        setFilterHideKontakWa(data.hideKontakWa || false);
                    }}
                />
            </div>

            {/* MIDDLE COL: CHAT AREA */}
            <div className={`flex-1 flex flex-col h-full relative min-w-0 overflow-hidden pb-[56px] md:pb-0 ${selectedConvId ? 'flex' : 'hidden md:flex'}`}>
                {/* Real-time Socket Connection Status Banner */}
                {!isConnected && (
                    <div className="bg-amber-500/95 dark:bg-amber-600/95 backdrop-blur text-white text-[11px] font-medium py-1 px-3 flex items-center justify-center gap-2 z-30 shadow-sm animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                        <span>Menghubungkan ke server real-time...</span>
                    </div>
                )}

                {selectedConvId ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-4 py-2 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border shadow-sm flex justify-between items-center z-10 flex-shrink-0">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <button onClick={() => navigate('/inbox')} className="md:hidden text-gray-500 dark:text-gray-300"><ArrowLeft className="w-6 h-6" /></button>
                                <img
                                    src={selectedConv?.profile_pic_url || getInitialsAvatar(selectedConv?.contact_name)}
                                    onError={(e) => { e.target.onerror = null; e.target.src = getInitialsAvatar(selectedConv?.contact_name); }}
                                    className="w-9 h-9 rounded-full border dark:border-gray-600"
                                    alt=""
                                />
                                <div className="min-w-0 relative">
                                    <h3 className="font-bold text-gray-800 dark:text-white truncate max-w-[200px] text-[15px]">
                                        {formatDisplayName(selectedConv?.contact_name || 'Unknown')}
                                    </h3>
                                    {/* WA Web Presence / Last Seen / Agent Info */}
                                    {(() => {
                                        const presence = contactPresence[selectedConv?.phone_number];
                                        const status = presence?.status;
                                        const lastSeen = presence?.lastSeen;

                                        if (status === 'composing') {
                                            return (
                                                <span className="text-[10px] text-green-500 font-medium animate-pulse ml-1 absolute top-full left-0 mt-[1px]">
                                                    typing...
                                                </span>
                                            );
                                        }
                                        if (status === 'recording') {
                                            return (
                                                <span className="text-[10px] text-green-500 font-medium animate-pulse ml-1 absolute top-full left-0 mt-[1px]">
                                                    recording...
                                                </span>
                                            );
                                        }
                                        if (status === 'available') {
                                            return (
                                                <div className="flex items-center gap-1 text-[10px] text-green-500 font-medium ml-1 absolute top-full left-0 mt-[1px]">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                    online
                                                </div>
                                            );
                                        }
                                        if (lastSeen) {
                                            try {
                                                const d = new Date(lastSeen);
                                                const now = new Date();
                                                const isToday = d.toDateString() === now.toDateString();
                                                const isYesterday = (() => {
                                                    const y = new Date(now);
                                                    y.setDate(y.getDate() - 1);
                                                    return d.toDateString() === y.toDateString();
                                                })();
                                                const timeStr = format(d, 'HH:mm');
                                                let label;
                                                if (isToday) label = `last seen today at ${timeStr}`;
                                                else if (isYesterday) label = `last seen yesterday at ${timeStr}`;
                                                else label = `last seen ${format(d, 'dd/MM/yy HH:mm')}`;
                                                return (
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1 absolute top-full left-0 mt-[1px]">
                                                        {label}
                                                    </span>
                                                );
                                            } catch { }
                                        }
                                        return (
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                                                <span className="font-medium truncate">
                                                    {selectedConv?.agent_name || 'Unassigned'}
                                                </span>
                                                <span>•</span>
                                                <img
                                                    src={getApiUrl(getChannelIcon(selectedConv?.channel, selectedConv?.device_type))}
                                                    alt={selectedConv?.channel}
                                                    className="w-3.5 h-3.5 opacity-70"
                                                    title={selectedConv?.channel}
                                                />
                                            </div>
                                        );
                                    })()}

                                    {/* Active Agent Presence */}
                                    {(() => {
                                        const convPresence = agentPresence[selectedConv?.id] || {};
                                        const activeAgents = Object.values(convPresence).filter(
                                            p => p.name !== user?.name && (Date.now() - p.timestamp) < 30000 && p.action !== 'blur'
                                        );

                                        if (activeAgents.length > 0) {
                                            const typingAgents = activeAgents.filter(a => a.action === 'typing').map(a => a.name);
                                            const viewingAgents = activeAgents.filter(a => a.action === 'viewing').map(a => a.name);

                                            let text = [];
                                            if (typingAgents.length > 0) text.push(`${typingAgents.join(', ')} mengetik...`);
                                            if (viewingAgents.length > 0) text.push(`${viewingAgents.join(', ')} melihat...`);

                                            return (
                                                <div className="flex items-center gap-1.5 text-[10px] text-[#f57f17] dark:text-[#ffd54f] font-medium ml-1 absolute top-full left-0 mt-[15px] animate-pulse whitespace-nowrap z-10 bg-white dark:bg-dark-surface px-1 rounded-sm shadow-sm">
                                                    <Users className="w-3 h-3" />
                                                    <span>{text.join(' • ')}</span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setIsWallpaperOpen(true)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors" title="Chat Appearance">
                                    <ImageIcon className="w-5 h-5" />
                                </button>

                                {/* Mute Toggle */}
                                <button onClick={() => handleMuteConversation(selectedConv)} className={`p-2 rounded-lg transition-colors ${selectedConv?.is_muted ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg'}`} title={selectedConv?.is_muted ? "Unmute Notifications" : "Mute Notifications"}>
                                    {selectedConv?.is_muted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                                </button>

                                {selectedConv?.status === 'open' && (
                                    <>
                                        <button onClick={() => setIsTransferOpen(true)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors" title="Transfer Chat">
                                            <User className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => setIsResolveOpen(true)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors" title="Resolve">
                                            <CheckCircle className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setShowInfoPanel(!showInfoPanel)} className={`p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors ${showInfoPanel ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-gray-600 dark:text-gray-300'}`}>
                                    <Info className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 relative w-full bg-[#efeae2] dark:bg-[#0b141a] overflow-hidden group">
                            {/* Wallpaper Background Layer */}
                            <div
                                className="absolute inset-0 z-0"
                                style={{
                                    backgroundColor: chatWallpaper.startsWith('#') ? chatWallpaper : 'transparent',
                                    backgroundImage: chatWallpaper.startsWith('#') ? 'none' : `url("${chatWallpaper}")`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat'
                                }}
                            />

                            {/* WhatsApp-style Doodle Overlay */}
                            {chatWallpaper.startsWith('#') && (
                                <div
                                    className="absolute inset-0 z-0 opacity-[0.07] dark:opacity-[0.05] pointer-events-none mix-blend-multiply dark:mix-blend-lighten"
                                    style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', backgroundSize: '400px' }}
                                />
                            )}

                            {/* Opacity Overlay */}
                            {!chatWallpaper.startsWith('#') && (
                                <div className="absolute inset-0 z-0 bg-white/60 dark:bg-black/60 pointer-events-none" />
                            )}

                            {chatWallpaper.startsWith('#') && (
                                <div className="absolute inset-0 z-0 bg-black/0 dark:bg-black/30 pointer-events-none" />
                            )}

                            {/* Syncing Overlay */}
                            {isSyncing && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-sm">
                                    <div className="bg-white dark:bg-dark-surface px-6 py-5 rounded-2xl shadow-2xl flex flex-col items-center gap-3 border border-indigo-100 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-indigo-200 dark:bg-indigo-900 rounded-full animate-ping opacity-50"></div>
                                            <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin relative z-10" />
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-gray-200 text-sm mt-2">Sinkronisasi Pesan...</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-[220px]">
                                            Mohon tunggu sebentar, riwayat pesan sedang dipulihkan dari perangkat.
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Scrollable Content */}
                            <div className="absolute inset-0 z-10" ref={messagesContainerRef}>
                                {loadingMessages ? (
                                    <div className="p-4">
                                        {[1, 2, 3].map(i => <Skeleton key={i} className={`h-14 w-2/3 rounded-xl mb-3 ${i % 2 === 0 ? 'ml-auto' : ''}`} />)}
                                    </div>
                                ) : (
                                    <Virtuoso
                                        ref={virtuosoRef}
                                        className="custom-scrollbar"
                                        style={{ height: '100%', width: '100%' }}
                                        data={groupedMessages}
                                        firstItemIndex={firstItemIndex}
                                        initialTopMostItemIndex={groupedMessages.length - 1}
                                        followOutput={(isAtBottom) => isAtBottom ? "smooth" : false}
                                        atBottomStateChange={(atBottom) => {
                                            setIsAtBottom(atBottom);
                                            isAtBottomRef.current = atBottom;
                                            if (atBottom) {
                                                setUnreadSinceScroll(0);
                                            }
                                        }}
                                        startReached={() => {
                                            if (messagePagination?.hasMore?.before && !loadingMore) {
                                                handleLoadMoreMessages(messagePagination.oldestId);
                                            }
                                        }}
                                        components={{
                                            Header: () => (
                                                <div className="px-4">
                                                    <MessageLoadMore
                                                        pagination={messagePagination}
                                                        onLoadMore={handleLoadMoreMessages}
                                                        onLoadNewer={handleLoadNewerMessages}
                                                        isLoading={loadingMore}
                                                        isLoadingNewer={loadingNewer}
                                                        position="top"
                                                        className="pb-2 pt-4"
                                                    />
                                                </div>
                                            ),
                                            Footer: () => <div ref={messagesEndRef} className="h-4" />
                                        }}
                                        itemContent={(index, item) => {
                                            if (item.type === 'separator') {
                                                return <div className="px-4"><DateSeparator key={item.key} dateStr={item.dateStr} /></div>;
                                            }
                                            return (
                                                <div className="px-4">
                                                    <MessageBubble
                                                        key={item.key}
                                                        message={item.msg}
                                                        contactProfilePic={selectedConv?.profile_pic_url}
                                                        contactName={selectedConv?.contact_name}
                                                        isGroupChat={selectedConv?.phone_number?.endsWith('@g.us')}
                                                        onReply={onBubbleReply}
                                                        onForward={onBubbleForward}
                                                        onSaveToKb={onBubbleSaveToKb}
                                                        onDelete={handleDeleteMessage}
                                                        onRevoke={handleRevokeMessage}
                                                        onEdit={handleStartEdit}
                                                        onStar={handleStarMessage}
                                                        onPin={handlePinMessage}
                                                        onCopy={handleCopyMessage}
                                                        onInfo={handleMessageInfo}
                                                        onReact={() => toast("Arahkan kursor ke pesan untuk memberi reaksi", { icon: '💡' })}
                                                        onRetry={handleRetryMessage}
                                                        isLast={item.isLast}
                                                        isFirstInGroup={item.isFirstInGroup}
                                                        isLastInGroup={item.isLastInGroup}
                                                        showTime={true}
                                                    />
                                                </div>
                                            );
                                        }}
                                    />
                                )}
                            </div>

                            {/* Scroll to Bottom FAB */}
                            {!isAtBottom && (
                                <div className="absolute right-6 bottom-6 z-30 animate-in fade-in zoom-in duration-200">
                                    <button
                                        onClick={() => scrollToBottom("smooth", 0)}
                                        className="bg-white dark:bg-slate-800 rounded-full p-2.5 shadow-lg border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors relative"
                                        title="Scroll to bottom"
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                        {unreadSinceScroll > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                                                {unreadSinceScroll}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Sending Indicator Overlay */}
                            {isSending && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                                    <div className="bg-white dark:bg-dark-surface px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in zoom-in duration-300 pointer-events-auto border border-indigo-100 dark:border-slate-700">
                                        <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />
                                        <span className="font-bold text-gray-700 dark:text-gray-200 text-xs">Sending...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="z-20 flex-shrink-0">
                            {(() => {
                                const isResolved = selectedConv?.status === 'resolved';
                                const isAdmin = user?.role === 'admin_member' || user?.role === 'super_admin';
                                const isAssignedToOther = selectedConv?.assigned_to_agent_id && String(selectedConv.assigned_to_agent_id) !== String(user?.id);
                                const canReply = !isResolved && (isAdmin || !isAssignedToOther);

                                const handleReopen = async () => {
                                    const toastId = toast.loading("Reopening...");
                                    try {
                                        await axios.post(`/api/app/inbox/conversations/${selectedConvId}/reopen`);
                                        setConversations(prev => prev.map(c =>
                                            String(c.id) === String(selectedConvId)
                                                ? { ...c, status: 'open', assigned_to_agent_id: user.id, agent_name: user.name, is_chatbot_active: false }
                                                : c
                                        ));
                                        toast.success("Conversation Reopened", { id: toastId });
                                    } catch (err) {
                                        toast.error("Failed to reopen", { id: toastId });
                                    }
                                };

                                if (isResolved) {
                                    return (
                                        <div className="p-4 text-center bg-gray-50 dark:bg-dark-bg border-t dark:border-dark-border text-gray-500 dark:text-gray-400 text-sm">
                                            <div className="flex flex-col items-center gap-2">
                                                <CheckCircle className="w-6 h-6 text-green-500" />
                                                <span className="font-semibold">Conversation is Resolved</span>
                                                <div className="flex gap-2">
                                                    <span className="text-xs">Customer must reply to reopen the chat.</span>
                                                    <button
                                                        onClick={handleReopen}
                                                        className="px-3 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" /> Reopen
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                if (!canReply) {
                                    return (
                                        <div className="p-4 text-center bg-gray-50 dark:bg-dark-bg border-t dark:border-dark-border text-gray-500 dark:text-gray-400 text-sm">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                    <Lock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                </div>
                                                <span className="font-semibold">Assigned to {selectedConv?.agent_name || 'Another Agent'}</span>
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-xs text-gray-400">Only the assigned agent or Admin can reply.</span>
                                                    <button
                                                        onClick={handleReopen}
                                                        className="px-3 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5"
                                                        title="Take over this chat"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5" /> Reopen / Take Over
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <ChatInput
                                        onSendMessage={handleSendMessage}
                                        onTyping={async (isTyping) => {
                                            try {
                                                await axios.post(`/api/app/inbox/conversations/${selectedConvId}/typing`, { isTyping });
                                            } catch (e) { }

                                            if (socket && user) {
                                                socket.emit('agent_presence', {
                                                    orgId: user.organization_id,
                                                    conversationId: selectedConvId,
                                                    agentId: user.id,
                                                    agentName: user.name,
                                                    action: isTyping ? 'typing' : 'viewing'
                                                });
                                            }
                                        }}
                                        onUploadFile={handleFileUpload}
                                        templates={allTemplates}
                                        conversationId={selectedConvId}
                                        editingMessage={editingMessage}
                                        onCancelEdit={handleCancelEdit}
                                        onSubmitEdit={(newContent) => handleSubmitEdit(newContent, editingMessage, setEditingMessage)}
                                        draftText={drafts[selectedConvId] || ''}
                                        onDraftChange={(text) => handleDraftChange(selectedConvId, text)}
                                        onSendPaymentLink={async (paymentData) => {
                                            if (!selectedConv?.contact_id) return;
                                            const tid = toast.loading('Membuat payment link...');
                                            try {
                                                const res = await axios.post('/api/app/invoices/quick-link', {
                                                    contact_id: selectedConv.contact_id,
                                                    amount: paymentData.amount,
                                                    description: paymentData.description
                                                });
                                                toast.dismiss(tid);
                                                const formattedAmt = `Rp ${paymentData.amount.toLocaleString('id-ID')}`;
                                                let msgText = '';
                                                if (paymentData.is_qris) {
                                                    msgText = `🧾 *TAGIHAN PEMBAYARAN QRIS*\n━━━━━━━━━━━━━━━━━━━━\n📄 *Pesanan:* ${paymentData.description}\n💰 *Total Tagihan:* *${formattedAmt}*\n━━━━━━━━━━━━━━━━━━━━\n\n📲 *Cara Pembayaran:* \n1. Buka aplikasi BCA, Mandiri, GoPay, OVO, Dana, ShopeePay, atau Mobile Banking Anda.\n2. Buka link pembayaran berikut untuk scan QRIS otomatis:\n${res.data.payment_url}\n\n_Terima kasih atas pesanan Anda!_`;
                                                } else {
                                                    msgText = `Halo, berikut adalah link pembayaran untuk:\n\n*${paymentData.description}*\nTotal: *${formattedAmt}*\n\nSilakan klik link berikut untuk membayar:\n${res.data.payment_url}\n\nTerima kasih!`;
                                                }
                                                handleSendMessage(msgText, 'text');
                                            } catch (err) {
                                                toast.dismiss(tid);
                                                toast.error(err.response?.data?.error || 'Gagal membuat payment link');
                                            }
                                        }}
                                    />
                                );
                            })()}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/50 dark:bg-[#111b21] relative items-center justify-center">
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', backgroundSize: '400px' }}></div>

                        <div className="z-10 flex flex-col items-center justify-center text-center p-8 max-w-lg w-full mt-[-10vh]">
                            <div className="w-64 h-64 mb-8 relative flex items-center justify-center">
                                <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50"></div>
                                <div className="w-32 h-32 absolute flex items-center justify-center">
                                    <MessageCircle className="w-20 h-20 text-indigo-300/50 dark:text-indigo-700/50" />
                                </div>
                            </div>

                            <h2 className="text-3xl font-light text-gray-800 dark:text-gray-200 mb-4 tracking-tight">CRM Hub Omnichannel</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-10">
                                Kirim dan terima pesan dari berbagai saluran secara *real-time*.<br/>
                                Pilih percakapan di bilah sisi untuk mulai membalas pelanggan Anda.
                            </p>

                            {/* Banners */}
                            {inboxBanners.length > 0 && (
                                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 opacity-90 hover:opacity-100 transition-opacity">
                                    {inboxBanners.slice(0, 2).map(banner => (
                                        <div
                                            key={banner.id}
                                            className="relative group rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-white/20 dark:border-white/5 aspect-[21/9] bg-gray-200 dark:bg-slate-800"
                                            onClick={() => { if (banner.link_url && /^https?:\/\//i.test(banner.link_url)) window.open(banner.link_url, '_blank', 'noopener,noreferrer'); }}
                                        >
                                            {banner.image_url && (
                                                <img src={getApiUrl(banner.image_url)} alt={banner.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-left">
                                                <h4 className="text-white font-semibold text-sm truncate">{banner.title}</h4>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* End-to-end encryption badge */}
                        <div className="absolute bottom-10 left-0 right-0 flex justify-center z-10">
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 font-medium bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                <Lock className="w-3 h-3" />
                                <span>Pesan Anda dikelola secara aman dan terenkripsi</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT COL: INFO PANEL */}
            {selectedConvId && (
                <div className={`
                    fixed inset-y-0 right-0 w-[280px] bg-white dark:bg-dark-surface shadow-2xl z-40 transform transition-transform duration-300 
                    xl:static xl:translate-x-0 xl:shadow-none xl:border-l dark:xl:border-dark-border
                    flex flex-col h-full
                    ${showInfoPanel ? 'translate-x-0' : 'translate-x-full xl:hidden'}
                `}>
                    <button onClick={() => setShowInfoPanel(false)} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-dark-bg rounded-full xl:hidden z-50 text-gray-500 dark:text-gray-300"><X className="w-4 h-4" /></button>
                    <ContactInfoPanel
                        conversation={selectedConv}
                        activeLabels={activeContactLabels}
                        onToggleBot={handleToggleBot}
                        onLabelUpdate={handleLabelUpdate}
                        onStatusChange={() => { }}
                        onDeleteConversation={handleDeleteConversation}
                    />
                </div>
            )}

            {/* Modals */}
            <WallpaperModal isOpen={isWallpaperOpen} onClose={() => setIsWallpaperOpen(false)} onSave={(w) => handleWallpaperSave(w, setChatWallpaper)} />
            <ForwardModal isOpen={isForwardOpen} onClose={() => setIsForwardOpen(false)} onForward={handleForward} messageToForward={messageToForward} />
            <SaveToKbModal
                isOpen={isSaveKbOpen}
                onClose={() => setIsSaveKbOpen(false)}
                message={messageToSave}
            />
            <MessageInfoModal
                isOpen={!!infoMessage}
                onClose={() => setInfoMessage(null)}
                message={infoMessage}
            />
            <TransferModal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} onTransfer={handleTransfer} agents={agents} />
            <ResolveModal isOpen={isResolveOpen} onClose={() => setIsResolveOpen(false)} onResolve={handleResolve} defaultMessage="" />
            <ContactSelectionModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                onSelect={handleContactSelect}
                waDevices={allDevices.filter(d => d.type === 'whatsapp' && d.status?.toLowerCase() === 'connected')}
            />

            <LabelAssignmentModal
                isOpen={isLabelModalOpen}
                onClose={() => { setIsLabelModalOpen(false); setActionTargetConv(null); }}
                conversationId={actionTargetConv ? actionTargetConv.id : selectedConvId}
                initialLabels={actionTargetConv ? (actionTargetConv.labels || []) : activeContactLabels}
                onUpdate={handleLabelUpdate}
            />

            {/* Real-Time Diagnostics Modal */}
            <Modal
                isOpen={isDiagnosticsOpen}
                onClose={() => setIsDiagnosticsOpen(false)}
                title="Real-Time Diagnostics"
                size="lg"
                className="max-h-[80vh] overflow-y-auto"
            >
                <RealtimeDiagnostics />
            </Modal>
        </div>
    );
}
