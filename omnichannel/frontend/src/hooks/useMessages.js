/**
 * useMessages — Hook managing messages fetching, sending, pagination, virtuoso scrolling, and drafts.
 */
import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { startOfDay } from 'date-fns';

export const computeGroupedMessages = (messages) => {
    const result = [];
    let prevGroupKey = null;
    let prevMsgDay = null;

    messages.forEach((msg, idx) => {
        const msgDate = new Date(msg.created_at);
        const msgDay = startOfDay(msgDate).getTime();
        const msgTime = msgDate.getTime();
        const minuteSlot = Math.floor(msgTime / (5 * 60 * 1000));
        const isSystemMsg = msg.type === 'system' || msg.type === 'revoked';
        const senderKey = msg.from_me ? 'outbound' : `inbound-${msg.contact_id || msg.from}`;
        const currentGroupKey = `${senderKey}|${minuteSlot}`;

        const isNewGroup = isSystemMsg ||
            prevMsgDay !== msgDay ||
            prevGroupKey !== currentGroupKey;

        const isFirstInGroup = isNewGroup;
        const isLast = idx === messages.length - 1;

        const nextMsg = messages[idx + 1];
        let isLastInGroup = isLast;
        if (nextMsg) {
            const nextDate = new Date(nextMsg.created_at);
            const nextDay = startOfDay(nextDate).getTime();
            const nextTime = nextDate.getTime();
            const nextSlot = Math.floor(nextTime / (5 * 60 * 1000));
            const nextSender = nextMsg.from_me ? 'outbound' : `inbound-${nextMsg.contact_id || nextMsg.from}`;
            const nextGroupKey = `${nextSender}|${nextSlot}`;
            const nextIsSystem = nextMsg.type === 'system' || nextMsg.type === 'revoked';
            isLastInGroup = isLast ||
                nextDay !== msgDay ||
                nextGroupKey !== currentGroupKey ||
                nextIsSystem;
        }

        if (prevMsgDay === null || prevMsgDay !== msgDay) {
            result.push({ type: 'separator', dateStr: msg.created_at, key: `sep-${msg.id || idx}` });
        }

        prevGroupKey = currentGroupKey;
        prevMsgDay = msgDay;

        result.push({
            type: 'message',
            msg,
            isFirstInGroup,
            isLastInGroup,
            isLast,
            key: msg.id || `msg-${idx}`
        });
    });
    return result;
};

export default function useMessages({ selectedConvId, socket, user, setConversations, setActiveContactLabels }) {
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [messagePagination, setMessagePagination] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadingNewer, setLoadingNewer] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [unreadSinceScroll, setUnreadSinceScroll] = useState(0);
    const [firstItemIndex, setFirstItemIndex] = useState(100000);
    const [editingMessage, setEditingMessage] = useState(null);

    const [drafts, setDrafts] = useState(() => {
        try {
            const saved = localStorage.getItem('crmhub_chat_drafts');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const virtuosoRef = useRef(null);
    const pendingIndexDiff = useRef(0);
    const isAtBottomRef = useRef(true);

    // Group consecutive messages
    const groupedMessages = useMemo(() => computeGroupedMessages(messages), [messages]);

    // Keep virtuoso scroll position when prepending older messages
    useLayoutEffect(() => {
        if (pendingIndexDiff.current > 0) {
            setFirstItemIndex(idx => idx - pendingIndexDiff.current);
            pendingIndexDiff.current = 0;
        }
    }, [messages]);

    const scrollToBottom = useCallback((behavior = "smooth", delay = 100) => {
        setTimeout(() => {
            if (virtuosoRef.current) {
                virtuosoRef.current.scrollToIndex({ index: 'LAST', behavior, align: 'end' });
            } else if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
            }
        }, delay);
    }, []);

    // Fetch messages on conversation select
    useEffect(() => {
        if (!selectedConvId) {
            setMessages([]);
            setMessagePagination(null);
            return;
        }

        setFirstItemIndex(100000);
        let mounted = true;
        setLoadingMessages(true);

        axios.get(`/api/app/inbox/conversations/${selectedConvId}/messages?limit=50`)
            .then(res => {
                if (!mounted) return;
                const { messages: fetched, pagination } = res.data;
                setMessages(fetched || []);
                setMessagePagination(pagination);
                scrollToBottom("auto", 150);
                if (setConversations) {
                    setConversations(prev => {
                        const idx = prev.findIndex(c => String(c.id) === String(selectedConvId));
                        if (idx > -1 && setActiveContactLabels) {
                            setActiveContactLabels(prev[idx].labels || []);
                        }
                        return prev.map(c => String(c.id) === String(selectedConvId) ? { ...c, unread_count: 0 } : c);
                    });
                }
            })
            .catch(e => console.error(e))
            .finally(() => {
                if (mounted) setLoadingMessages(false);
            });

        return () => {
            mounted = false;
        };
    }, [selectedConvId, scrollToBottom, setConversations, setActiveContactLabels]);

    // Load older messages (scroll up)
    const handleLoadMoreMessages = async (beforeId) => {
        if (!selectedConvId || loadingMore) return;
        setLoadingMore(true);
        try {
            const res = await axios.get(`/api/app/inbox/conversations/${selectedConvId}/messages?before=${beforeId}&limit=50`);
            const { messages: fetchedMessages, pagination } = res.data;
            setMessages(prev => {
                const oldGroupedLength = computeGroupedMessages(prev).length;
                const newMessages = [...fetchedMessages, ...prev];
                const newGroupedLength = computeGroupedMessages(newMessages).length;
                pendingIndexDiff.current += (newGroupedLength - oldGroupedLength);
                return newMessages;
            });
            setMessagePagination(pagination);
        } catch (e) {
            console.error('Failed to load more messages:', e);
            toast.error('Gagal memuat pesan sebelumnya');
        } finally {
            setLoadingMore(false);
        }
    };

    // Load newer messages (scroll down)
    const handleLoadNewerMessages = async (afterId) => {
        if (!selectedConvId || loadingNewer) return;
        setLoadingNewer(true);
        try {
            const res = await axios.get(`/api/app/inbox/conversations/${selectedConvId}/messages?after=${afterId}&limit=50`);
            const { messages: fetchedMessages, pagination } = res.data;
            setMessages(prev => [...prev, ...fetchedMessages]);
            setMessagePagination(pagination);
        } catch (e) {
            console.error('Failed to load newer messages:', e);
        } finally {
            setLoadingNewer(false);
        }
    };

    // Send text/media message
    const handleSendMessage = async (content, type = 'text', mediaData = null, is_internal = false) => {
        if (!selectedConvId) return;
        if (mediaData) setIsSending(true);
        try {
            const payload = { content, type, media_url: mediaData?.url, mimetype: mediaData?.mimetype, filename: mediaData?.filename, is_internal };
            await axios.post(`/api/app/inbox/conversations/${selectedConvId}/send`, payload, { timeout: 30000 });
            setDrafts(prev => {
                const next = { ...prev };
                delete next[selectedConvId];
                try { localStorage.setItem('crmhub_chat_drafts', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        } catch (e) {
            const errCode = e.response?.data?.error;
            const errMsg = e.response?.data?.message || e.response?.data?.error || "Gagal Mengirim Pesan. Silakan hubungkan ulang device Anda.";

            if (errCode === 'DEVICE_DISCONNECTED' || errMsg.toLowerCase().includes('disconnected') || e.response?.status === 503) {
                toast.error(
                    <div className="flex flex-col gap-1">
                        <span className="font-bold">Gagal Mengirim Pesan</span>
                        <span className="text-xs">Silakan hubungkan ulang device Anda.</span>
                    </div>,
                    { duration: 5000 });
            } else {
                toast.error(errMsg);
            }
        } finally {
            setIsSending(false);
        }
    };

    // Handle draft typing & presence
    const handleDraftChange = useCallback((id, text) => {
        if (!id) return;
        setDrafts(prev => {
            const next = { ...prev };
            if (text && text.trim()) {
                next[id] = text;
            } else {
                delete next[id];
            }
            try { localStorage.setItem('crmhub_chat_drafts', JSON.stringify(next)); } catch (e) {}
            return next;
        });

        if (socket && user && selectedConvId) {
            socket.emit('agent_presence', {
                orgId: user.organization_id,
                conversationId: selectedConvId,
                agentId: user.id,
                agentName: user.name,
                action: text.length > 0 ? 'typing' : 'viewing'
            });
        }
    }, [socket, user, selectedConvId]);

    // Handle File Upload
    const handleFileUpload = async (file, type) => {
        if (!file) return;
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
        if (file.size > MAX_FILE_SIZE) {
            toast.error(`Ukuran file maksimal adalah 50MB (Ukuran file ini: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
            return;
        }
        setIsSending(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('/api/app/inbox/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const mediaData = res.data;
            await handleSendMessage('', type, mediaData);
        } catch (err) {
            toast.error("Upload failed");
            setIsSending(false);
        }
    };

    // Handle Interactive CTA
    const handleSendCTA = async (ctas) => {
        if (!selectedConvId) return;
        try {
            await axios.post(`/api/app/inbox/conversations/${selectedConvId}/interactive`, {
                type: 'cta',
                ctas
            });
            toast.success('CTA Buttons Sent');
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to send CTA');
        }
    };

    const handleStartEdit = (msg) => setEditingMessage(msg);
    const handleCancelEdit = () => setEditingMessage(null);

    return {
        messages,
        setMessages,
        loadingMessages,
        messagePagination,
        loadingMore,
        loadingNewer,
        isSending,
        isAtBottom,
        setIsAtBottom,
        unreadSinceScroll,
        setUnreadSinceScroll,
        firstItemIndex,
        drafts,
        setDrafts,
        editingMessage,
        setEditingMessage,
        groupedMessages,
        messagesEndRef,
        messagesContainerRef,
        virtuosoRef,
        isAtBottomRef,
        scrollToBottom,
        handleLoadMoreMessages,
        handleLoadNewerMessages,
        handleSendMessage,
        handleDraftChange,
        handleFileUpload,
        handleSendCTA,
        handleStartEdit,
        handleCancelEdit,
    };
}
