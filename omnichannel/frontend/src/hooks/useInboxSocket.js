/**
 * useInboxSocket — Centralized socket event handling for InboxPage.
 *
 * Extracts all 20+ socket.on/off event listeners from InboxPage into a single
 * reusable hook. All handlers receive setters/refs via closure, keeping InboxPage
 * free of socket wiring boilerplate.
 */
import { useEffect, useRef } from 'react';
import axios from 'axios';

export default function useInboxSocket({
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
    computeGroupedMessages,
}) {
    useEffect(() => {
        if (!socket || !socket.on) return;

        // ─── NEW MESSAGE ────────────────────────────────────────────
        const handleNewMessage = ({ conversationId, message }) => {
            if (String(selectedConvIdRef.current) === String(conversationId)) {
                if (!isAtBottomRef.current && !message.from_me) {
                    setUnreadSinceScroll(prev => prev + 1);
                }
                setMessages(prev => {
                    const exists = prev.some(m =>
                        (m.wa_message_id && String(m.wa_message_id) === String(message.wa_message_id)) ||
                        (m.id && String(m.id) === String(message.id))
                    );
                    if (exists) return prev;
                    return [...prev, message];
                });
                scrollToBottom();
                if (!message.from_me) {
                    axios.put(`/api/app/inbox/conversations/${conversationId}/read`).catch(() => {});
                }
            }

            setConversations(prev => {
                const idx = prev.findIndex(c => String(c.id) === String(conversationId));
                if (idx > -1) {
                    const isActive = String(selectedConvIdRef.current) === String(conversationId);
                    const isPinned = prev[idx].is_pinned;
                    const updatedConv = {
                        ...prev[idx],
                        last_message: message.content || `[${message.type.toUpperCase()}]`,
                        last_message_at: message.created_at,
                        unread_count: !message.from_me && !isActive
                            ? parseInt(prev[idx].unread_count || 0) + 1
                            : prev[idx].unread_count,
                        status: !message.from_me ? 'open' : prev[idx].status,
                        last_message_from_me: message.from_me,
                        last_message_status: message.from_me ? (message.status || 'sent') : null
                    };

                    if (isPinned) {
                        const newArr = [...prev];
                        newArr.splice(idx, 1);
                        return [updatedConv, ...newArr];
                    }

                    const newArr = [...prev];
                    newArr.splice(idx, 1);
                    const firstUnpinnedIdx = newArr.findIndex(c => !c.is_pinned);
                    if (firstUnpinnedIdx === -1) {
                        newArr.push(updatedConv);
                    } else {
                        newArr.splice(firstUnpinnedIdx, 0, updatedConv);
                    }
                    return newArr;
                }
                // Conversation not in list — fetch it
                const convId = String(conversationId);
                if (pendingConvFetchesRef.current.has(convId)) return prev;
                pendingConvFetchesRef.current.add(convId);
                axios.get(`/api/app/inbox/conversations/${convId}`)
                    .then(res => {
                        if (res.data?.id) {
                            setConversations(p => {
                                const already = p.find(c => String(c.id) === String(res.data.id));
                                if (already) return p;
                                if (res.data.is_pinned) return [res.data, ...p];
                                const newArr = [...p];
                                const firstUnpinnedIdx = newArr.findIndex(c => !c.is_pinned);
                                if (firstUnpinnedIdx === -1) newArr.push(res.data);
                                else newArr.splice(firstUnpinnedIdx, 0, res.data);
                                return newArr;
                            });
                        }
                    })
                    .catch(() => {})
                    .finally(() => pendingConvFetchesRef.current.delete(convId));
                return prev;
            });
        };

        // ─── CONVERSATION STATUS UPDATE ─────────────────────────────
        const handleStatusUpdate = ({ conversationId, status, is_chatbot_active, assigned_to_agent_id }) => {
            setConversations(prev => prev.map(c =>
                String(c.id) === String(conversationId)
                    ? {
                        ...c,
                        status: status || c.status,
                        is_chatbot_active: is_chatbot_active !== undefined ? is_chatbot_active : c.is_chatbot_active,
                        assigned_to_agent_id: assigned_to_agent_id !== undefined ? assigned_to_agent_id : c.assigned_to_agent_id,
                        agent_name: assigned_to_agent_id === null ? null : c.agent_name
                    }
                    : c
            ));
        };

        // ─── MESSAGE DELETE ─────────────────────────────────────────
        const handleDeleteMessage = ({ messageId, conversationId }) => {
            if (String(selectedConvIdRef.current) === String(conversationId)) {
                setMessages(prev => prev.filter(m => String(m.id) !== String(messageId)));
            }
        };

        // ─── ASSIGN ─────────────────────────────────────────────────
        const handleAssign = () => refreshConversations();

        // ─── URGENT ─────────────────────────────────────────────────
        const handleConversationUrgent = ({ conversationId, reason }) => {
            setConversations(prev => prev.map(c =>
                String(c.id) === String(conversationId) ? { ...c, is_urgent: true } : c
            ));
            setCounts(prev => ({ ...prev, urgent: (prev.urgent || 0) + 1 }));
        };

        // ─── MESSAGE STATUS ─────────────────────────────────────────
        const statusPriority = { pending: 1, sent: 2, delivered: 3, read: 4 };
        const isForwardStatus = (currentStatus, newStatus) => {
            return (statusPriority[newStatus] || 0) > (statusPriority[currentStatus] || 0);
        };

        const handleMessageStatusUpdate = ({ waMessageId, messageId, status, conversationId }) => {
            if (String(selectedConvIdRef.current) === String(conversationId)) {
                setMessages(prev => {
                    const newIdAlreadyExists = waMessageId && prev.some(m =>
                        String(m.wa_message_id) === String(waMessageId) &&
                        String(m.wa_message_id) !== String(messageId) &&
                        String(m.id) !== String(messageId)
                    );
                    if (newIdAlreadyExists) {
                        return prev.filter(m =>
                            String(m.wa_message_id) !== String(messageId) &&
                            String(m.id) !== String(messageId)
                        );
                    }
                    return prev.map(m => {
                        const isMatch = (waMessageId && m.wa_message_id && String(m.wa_message_id) === String(waMessageId)) ||
                            (messageId && m.id && String(m.id) === String(messageId)) ||
                            (messageId && m.wa_message_id && String(m.wa_message_id) === String(messageId));
                        if (isMatch) {
                            if (isForwardStatus(m.status, status)) {
                                return { ...m, status, wa_message_id: waMessageId || m.wa_message_id };
                            }
                            return { ...m, wa_message_id: waMessageId || m.wa_message_id };
                        }
                        return m;
                    });
                });
            }
            setConversations(prev => prev.map(c => {
                if (String(c.id) !== String(conversationId)) return c;
                const sp = { pending: 0, sent: 1, delivered: 2, read: 3, failed: -1 };
                const currentPriority = sp[c.last_message_status] ?? 0;
                const newPriority = sp[status] ?? 0;
                if (newPriority > currentPriority || status === 'failed') {
                    return { ...c, last_message_status: status, last_message_from_me: true };
                }
                return c;
            }));
        };

        // ─── CONVERSATION READ/UNREAD ───────────────────────────────
        const handleConversationRead = ({ conversationId }) => {
            setConversations(prev => prev.map(c =>
                String(c.id) === String(conversationId) ? { ...c, unread_count: 0 } : c
            ));
        };

        const handleConversationUnread = ({ conversationId }) => {
            setConversations(prev => prev.map(c =>
                String(c.id) === String(conversationId)
                    ? { ...c, unread_count: (c.unread_count || 0) + 1 }
                    : c
            ));
        };

        // ─── MESSAGE EDIT ───────────────────────────────────────────
        const handleMessageEdited = ({ messageId, conversationId, newContent }) => {
            if (String(selectedConvIdRef.current) === String(conversationId)) {
                setMessages(prev => prev.map(m =>
                    m.id === messageId ? { ...m, content: newContent, is_edited: true } : m
                ));
            }
        };

        // ─── HISTORY SYNC ───────────────────────────────────────────
        const handleHistorySyncCompleted = () => {
            refreshConversations();
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = setTimeout(() => setIsSyncing(false), 5000);
        };

        const handleHistorySyncStarted = () => {
            setIsSyncing(true);
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };

        // ─── MESSAGE REVOKED ────────────────────────────────────────
        const handleMessageRevoked = ({ wa_message_id, conversation_id }) => {
            if (String(selectedConvIdRef.current) === String(conversation_id)) {
                setMessages(prev => prev.map(m =>
                    m.wa_message_id === wa_message_id ? { ...m, content: '[Pesan ini telah ditarik]', type: 'revoked' } : m
                ));
            }
            refreshConversations();
        };

        // ─── MESSAGE REACTION ───────────────────────────────────────
        const handleMessageReaction = ({ wa_message_id, conversation_id, reactions }) => {
            if (String(selectedConvIdRef.current) === String(conversation_id)) {
                setMessages(prev => prev.map(m =>
                    m.wa_message_id === wa_message_id ? { ...m, reactions } : m
                ));
            }
        };

        // ─── CONTACT PRESENCE (typing, online, etc) ─────────────────
        const handleContactPresence = ({ phone, status, lastSeen }) => {
            setContactPresence(prev => {
                const current = prev[phone];
                if (current && current.timeoutId) clearTimeout(current.timeoutId);

                if (status === 'composing' || status === 'recording') {
                    const timeoutId = setTimeout(() => {
                        setContactPresence(p => {
                            const s = { ...p };
                            if (s[phone]?.timeoutId) clearTimeout(s[phone].timeoutId);
                            const updated = { ...s };
                            delete updated[phone];
                            return updated;
                        });
                    }, 5000);
                    return { ...prev, [phone]: { status, lastSeen: lastSeen || prev[phone]?.lastSeen, timeoutId } };
                }

                if (status === 'available' || status === 'unavailable' || status === 'paused') {
                    const newState = { ...prev };
                    if (newState[phone]?.timeoutId) clearTimeout(newState[phone].timeoutId);
                    if (status === 'available') {
                        return { ...newState, [phone]: { status: 'available', lastSeen: new Date().toISOString() } };
                    }
                    const updated = { ...newState };
                    delete updated[phone];
                    return updated;
                }

                return { ...prev, [phone]: { status, lastSeen: lastSeen || current?.lastSeen } };
            });
        };

        // ─── CONTACT MERGED ─────────────────────────────────────────
        const handleContactMerged = () => refreshConversations();

        // ─── MESSAGE STAR/PIN ───────────────────────────────────────
        const handleMessageStarred = ({ messageId, conversationId, isStarred }) => {
            if (String(selectedConvIdRef.current) === String(conversationId)) {
                setMessages(prev => prev.map(m =>
                    m.id === messageId ? { ...m, is_starred: isStarred } : m
                ));
            }
        };

        const handleMessagePinned = ({ messageId, conversationId, isPinned }) => {
            if (String(selectedConvIdRef.current) === String(conversationId)) {
                setMessages(prev => prev.map(m =>
                    m.id === messageId ? { ...m, is_pinned: isPinned } : m
                ));
            }
        };

        // ─── CONVERSATION MUTE/BLOCK/CLEAR ──────────────────────────
        const handleConversationMuted = ({ conversationId, isMuted }) => {
            setConversations(prev => prev.map(c =>
                String(c.id) === String(conversationId) ? { ...c, is_muted: isMuted } : c
            ));
        };

        const handleContactBlocked = ({ contactId, isBlocked }) => {
            setConversations(prev => prev.map(c =>
                String(c.contact_id) === String(contactId) ? { ...c, is_blocked: isBlocked } : c
            ));
        };

        const handleChatCleared = ({ conversationId }) => {
            if (String(selectedConvIdRef.current) === String(conversationId)) {
                setMessages([]);
            }
        };

        // ─── AGENT PRESENCE (collision detection) ───────────────────
        const handleAgentPresenceUpdate = (data) => {
            setAgentPresence(prev => {
                const convPresence = prev[data.conversationId] || {};
                if (data.action === 'blur') {
                    const newConvPresence = { ...convPresence };
                    delete newConvPresence[data.agentId];
                    return { ...prev, [data.conversationId]: newConvPresence };
                }
                return {
                    ...prev,
                    [data.conversationId]: {
                        ...convPresence,
                        [data.agentId]: {
                            name: data.agentName,
                            action: data.action,
                            timestamp: Date.now()
                        }
                    }
                };
            });
        };

        const handleConversationsBulkUpdated = ({ conversationIds, action, status, assigned_to_agent_id, is_archived, unread_count }) => {
            if (!Array.isArray(conversationIds)) return;
            setConversations(prev => {
                if (action === 'delete') {
                    return prev.filter(c => !conversationIds.includes(c.id));
                }
                return prev.map(c => {
                    if (!conversationIds.includes(c.id)) return c;
                    const updated = { ...c };
                    if (status !== undefined) updated.status = status;
                    if (assigned_to_agent_id !== undefined) updated.assigned_to_agent_id = assigned_to_agent_id;
                    if (is_archived !== undefined) updated.is_archived = is_archived;
                    if (unread_count !== undefined) updated.unread_count = unread_count;
                    return updated;
                });
            });
            refreshConversations();
        };

        // ─── REGISTER ALL LISTENERS ─────────────────────────────────
        socket.on('new_message', handleNewMessage);
        socket.on('conversation_assigned', handleAssign);
        socket.on('conversation_status_update', handleStatusUpdate);
        socket.on('message_deleted', handleDeleteMessage);
        socket.on('conversation_urgent', handleConversationUrgent);
        socket.on('message_status_update', handleMessageStatusUpdate);
        socket.on('conversation_read', handleConversationRead);
        socket.on('conversation_unread', handleConversationUnread);
        socket.on('message_edited', handleMessageEdited);
        socket.on('history_sync_completed', handleHistorySyncCompleted);
        socket.on('message_revoked', handleMessageRevoked);
        socket.on('message_reaction', handleMessageReaction);
        socket.on('contact_presence', handleContactPresence);
        socket.on('contact_merged', handleContactMerged);
        socket.on('message_starred', handleMessageStarred);
        socket.on('message_pinned', handleMessagePinned);
        socket.on('conversation_muted', handleConversationMuted);
        socket.on('contact_blocked', handleContactBlocked);
        socket.on('chat_cleared', handleChatCleared);
        socket.on('agent_presence_update', handleAgentPresenceUpdate);
        socket.on('history_sync_started', handleHistorySyncStarted);
        socket.on('conversations_bulk_updated', handleConversationsBulkUpdated);

        // ─── CLEANUP ────────────────────────────────────────────────
        return () => {
            if (socket && socket.off) {
                socket.off('new_message', handleNewMessage);
                socket.off('conversation_assigned', handleAssign);
                socket.off('conversation_status_update', handleStatusUpdate);
                socket.off('message_deleted', handleDeleteMessage);
                socket.off('conversation_urgent', handleConversationUrgent);
                socket.off('message_status_update', handleMessageStatusUpdate);
                socket.off('conversation_read', handleConversationRead);
                socket.off('conversation_unread', handleConversationUnread);
                socket.off('message_edited', handleMessageEdited);
                socket.off('history_sync_completed', handleHistorySyncCompleted);
                socket.off('message_revoked', handleMessageRevoked);
                socket.off('message_reaction', handleMessageReaction);
                socket.off('contact_presence', handleContactPresence);
                socket.off('contact_merged', handleContactMerged);
                socket.off('message_starred', handleMessageStarred);
                socket.off('message_pinned', handleMessagePinned);
                socket.off('conversation_muted', handleConversationMuted);
                socket.off('contact_blocked', handleContactBlocked);
                socket.off('chat_cleared', handleChatCleared);
                socket.off('agent_presence_update', handleAgentPresenceUpdate);
                socket.off('history_sync_started', handleHistorySyncStarted);
                socket.off('conversations_bulk_updated', handleConversationsBulkUpdated);
            }
        };
    }, [socket, refreshConversations]);
}
