/**
 * useInboxActions — Centralized action handlers for InboxPage.
 *
 * Extracts all user-initiated action handlers (transfer, resolve, delete,
 * star, pin, mute, block, forward, etc.) from InboxPage.
 */
import { useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function useInboxActions({
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
}) {
    const navigate = useNavigate();

    // ─── ARCHIVE / PIN / UNREAD ─────────────────────────────────
    const handleToggleArchive = useCallback(async (convId, isArchived) => {
        try {
            await axios.post(`/api/app/inbox/conversations/${convId}/archive`, { isArchived: !isArchived });
            setConversations(prev => prev.map(c => c.id === convId ? { ...c, is_archived: !isArchived } : c));
            if (showArchived !== !isArchived) {
                setConversations(prev => prev.filter(c => c.id !== convId));
                if (selectedConvId === convId) navigate('/inbox');
            }
            toast.success(!isArchived ? "Archived" : "Unarchived");
        } catch (e) { toast.error("Action failed"); }
    }, [selectedConvId, showArchived, navigate, setConversations]);

    const handleTogglePin = useCallback(async (convId, isPinned) => {
        try {
            await axios.post(`/api/app/inbox/conversations/${convId}/pin`, { isPinned: !isPinned });
            setConversations(prev => prev.map(c => c.id === convId ? { ...c, is_pinned: !isPinned } : c));
            fetchData();
            toast.success(!isPinned ? "Pinned" : "Unpinned");
        } catch (e) { toast.error("Action failed"); }
    }, [fetchData, setConversations]);

    const handleToggleUnread = useCallback(async (convId, isUnread) => {
        try {
            const res = await axios.post(`/api/app/inbox/conversations/${convId}/unread`, { isUnread: !isUnread });
            setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: res.data.unread_count } : c));
            toast.success(!isUnread ? "Marked as Unread" : "Marked as Read");
        } catch (e) { toast.error("Action failed"); }
    }, [setConversations]);

    // ─── TRANSFER ───────────────────────────────────────────────
    const handleTransfer = useCallback(async (agentId) => {
        const targetId = actionTargetConv ? actionTargetConv.id : selectedConvId;
        if (!targetId) return;
        try {
            await axios.post(`/api/app/inbox/conversations/${targetId}/assign`, { target_agent_id: agentId });
            toast.success("Transferred");
            setIsTransferOpen(false);
            setActionTargetConv(null);
            fetchData();
        } catch (e) { toast.error("Transfer failed"); }
    }, [actionTargetConv, selectedConvId, fetchData, setIsTransferOpen, setActionTargetConv]);

    // ─── RESOLVE ────────────────────────────────────────────────
    const handleResolve = useCallback(async (msg) => {
        const targetId = actionTargetConv ? actionTargetConv.id : selectedConvId;
        if (!targetId) return;
        try {
            setConversations(prev => prev.map(c =>
                String(c.id) === String(targetId) ? { ...c, status: 'resolved' } : c
            ));
            setIsResolveOpen(false);
            setActionTargetConv(null);
            await axios.post(`/api/app/inbox/conversations/${targetId}/resolve`, { closing_message: msg });
            toast.success("Conversation Resolved");
            fetchData();
        } catch (e) {
            toast.error("Failed to resolve");
            fetchData();
        }
    }, [actionTargetConv, selectedConvId, fetchData, setConversations, setIsResolveOpen, setActionTargetConv]);

    // ─── FORWARD ────────────────────────────────────────────────
    const handleForward = useCallback(async (targetConvIds, message) => {
        const targets = Array.isArray(targetConvIds) ? targetConvIds : [targetConvIds];
        if (targets.length === 0) return;
        const toastId = toast.loading(`Forwarding to ${targets.length} contact(s)...`);
        const payload = { content: message.content, type: message.type, media_url: message.media_url };
        try {
            const promises = targets.map(id => axios.post(`/api/app/inbox/conversations/${id}/send`, payload));
            await Promise.allSettled(promises);
            toast.success("Forwarded successfully", { id: toastId });
            setIsForwardOpen(false);
        } catch (e) { toast.error("Forward failed", { id: toastId }); }
    }, [setIsForwardOpen]);

    // ─── DELETE / REVOKE MESSAGE ─────────────────────────────────
    const handleDeleteMessage = useCallback(async (msgId) => {
        if (!confirm("Hapus pesan ini untuk Anda sendiri?")) return;
        try {
            await axios.delete(`/api/app/inbox/messages/${msgId}?action=delete`);
            toast.success("Pesan dihapus");
        } catch (e) { toast.error("Gagal menghapus pesan"); }
    }, []);

    const handleRevokeMessage = useCallback(async (msgId) => {
        if (!confirm("Tarik pesan ini? Pesan akan ditarik dari perangkat Anda dan perangkat penerima.")) return;
        try {
            await axios.delete(`/api/app/inbox/messages/${msgId}?action=revoke`);
            toast.success("Pesan ditarik");
        } catch (e) { toast.error(e.response?.data?.error || "Gagal menarik pesan"); }
    }, []);

    // ─── STAR / PIN MESSAGE ─────────────────────────────────────
    const handleStarMessage = useCallback(async (msg) => {
        try {
            const res = await axios.post(`/api/app/inbox/messages/${msg.id}/star`);
            toast.success(res.data.is_starred ? 'Message starred' : 'Message unstarred');
        } catch (e) { toast.error("Failed to star message"); }
    }, []);

    const handlePinMessage = useCallback(async (msg) => {
        try {
            const res = await axios.post(`/api/app/inbox/messages/${msg.id}/pin`);
            toast.success(res.data.is_pinned ? 'Pesan disematkan' : 'Batal sematkan pesan');
        } catch (e) { toast.error("Gagal menyematkan pesan"); }
    }, []);

    // ─── COPY MESSAGE ───────────────────────────────────────────
    const handleCopyMessage = useCallback((msg) => {
        if (msg.content) {
            navigator.clipboard.writeText(msg.content);
            toast.success("Teks disalin");
        }
    }, []);

    // ─── RETRY MESSAGE ──────────────────────────────────────────
    const handleRetryMessage = useCallback(async (msg) => {
        try {
            await axios.post(`/api/app/inbox/messages/${msg.id}/retry`);
            toast.success('Retrying message...');
        } catch (e) { toast.error("Failed to retry message"); }
    }, []);

    // ─── MUTE / BLOCK / CLEAR CHAT ──────────────────────────────
    const handleMuteConversation = useCallback(async (conv) => {
        try {
            const res = await axios.post(`/api/app/inbox/conversations/${conv.id}/mute`);
            toast.success(res.data.is_muted ? 'Notifikasi dibisukan' : 'Notifikasi dibunyikan');
        } catch (e) { toast.error("Gagal mengubah status bisu"); }
    }, []);

    const handleBlockContact = useCallback(async (conv) => {
        if (!confirm(`Apakah Anda yakin ingin ${conv.is_blocked ? 'membuka blokir' : 'memblokir'} kontak ini?`)) return;
        try {
            const res = await axios.post(`/api/app/inbox/contacts/${conv.contact_id}/block`);
            toast.success(res.data.is_blocked ? 'Kontak diblokir' : 'Blokir kontak dibuka');
        } catch (e) { toast.error("Gagal memblokir kontak"); }
    }, []);

    const handleClearChat = useCallback(async (conv) => {
        if (!confirm("Apakah Anda yakin ingin membersihkan seluruh pesan di obrolan ini? Tindakan ini tidak dapat dibatalkan.")) return;
        try {
            await axios.delete(`/api/app/inbox/conversations/${conv.id}/messages`);
            toast.success("Obrolan dibersihkan");
            if (String(selectedConvId) === String(conv.id)) {
                setMessages([]);
            }
        } catch (e) { toast.error("Gagal membersihkan obrolan"); }
    }, [selectedConvId, setMessages]);

    // ─── DELETE CONVERSATION ────────────────────────────────────
    const handleDeleteConversation = useCallback(async (convId) => {
        try {
            await axios.delete(`/api/app/inbox/conversations/${convId}`);
            toast.success("Conversation deleted");
            setConversations(prev => prev.filter(c => c.id !== convId));
            if (String(selectedConvId) === String(convId)) navigate('/inbox');
        } catch (e) { toast.error("Failed to delete conversation"); }
    }, [selectedConvId, navigate, setConversations]);

    // ─── BULK ACTIONS ───────────────────────────────────────────
    const handleBulkAction = useCallback(async (selectedConversationIds, setSelectedConversationIds, action, payload = {}) => {
        if (!selectedConversationIds || selectedConversationIds.length === 0) return;
        
        if (action === 'delete') {
            if (!confirm(`Delete ${selectedConversationIds.length} conversations?`)) return;
        }

        const toastId = toast.loading(`Processing ${action}...`);
        try {
            const res = await axios.post('/api/app/inbox/conversations/bulk-action', {
                conversationIds: selectedConversationIds,
                action,
                payload
            });
            toast.dismiss(toastId);
            toast.success(`Success: ${res.data.affectedCount || selectedConversationIds.length} conversations updated`);
            if (setSelectedConversationIds) setSelectedConversationIds([]);
            fetchData();
            if (action === 'delete' && selectedConversationIds.includes(selectedConvId)) {
                navigate('/inbox');
            }
        } catch (e) {
            toast.dismiss(toastId);
            toast.error(e.response?.data?.error || "Bulk action failed");
        }
    }, [selectedConvId, navigate, fetchData]);

    const handleBulkDelete = useCallback(async (selectedConversationIds, setSelectedConversationIds) => {
        return handleBulkAction(selectedConversationIds, setSelectedConversationIds, 'delete');
    }, [handleBulkAction]);

    // ─── TOGGLE BOT ─────────────────────────────────────────────
    const handleToggleBot = useCallback(async () => {
        if (!selectedConvId || !selectedConv) return;
        const currentStatus = selectedConv.is_chatbot_active;
        try {
            setConversations(prev => prev.map(c =>
                String(c.id) === String(selectedConvId) ? { ...c, is_chatbot_active: !currentStatus } : c
            ));
            await axios.post(`/api/app/inbox/conversations/${selectedConvId}/toggle-bot`, { isActive: !currentStatus });
            toast.success(`Autopilot ${!currentStatus ? 'Enabled' : 'Disabled'}`);
        } catch (e) {
            setConversations(prev => prev.map(c =>
                String(c.id) === String(selectedConvId) ? { ...c, is_chatbot_active: currentStatus } : c
            ));
            toast.error("Failed to toggle bot");
        }
    }, [selectedConvId, selectedConv, setConversations]);

    // ─── EDIT MESSAGE ───────────────────────────────────────────
    const handleSubmitEdit = useCallback(async (newContent, editingMessage, setEditingMessage) => {
        if (!newContent.trim() || !editingMessage) return;
        try {
            await axios.put(`/api/app/inbox/messages/${editingMessage.id}`, { content: newContent.trim() });
            setMessages(prev => prev.map(m =>
                m.id === editingMessage.id ? { ...m, content: newContent.trim(), is_edited: true } : m
            ));
            setEditingMessage(null);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal mengedit pesan');
        }
    }, [setMessages]);

    // ─── WALLPAPER ──────────────────────────────────────────────
    const handleWallpaperSave = useCallback((newWallpaper, setChatWallpaper) => {
        setChatWallpaper(newWallpaper);
        localStorage.setItem('chat_wallpaper', newWallpaper);
        toast.success("Wallpaper updated");
    }, []);

    // ─── LABEL UPDATE ───────────────────────────────────────────
    const handleLabelUpdate = useCallback((newLabels) => {
        if (selectedConvId && (!actionTargetConv || String(actionTargetConv.id) === String(selectedConvId))) {
            setActiveContactLabels(newLabels);
            setConversations(prev => prev.map(c =>
                String(c.id) === String(selectedConvId) ? { ...c, labels: newLabels } : c
            ));
        } else if (actionTargetConv) {
            setConversations(prev => prev.map(c =>
                String(c.id) === String(actionTargetConv.id) ? { ...c, labels: newLabels } : c
            ));
        }
    }, [selectedConvId, actionTargetConv, setConversations, setActiveContactLabels]);

    // ─── CONTEXT MENU TRIGGERS ──────────────────────────────────
    const onContextTransfer = useCallback((conv) => { setActionTargetConv(conv); setIsTransferOpen(true); }, [setActionTargetConv, setIsTransferOpen]);
    const onContextResolve = useCallback((conv) => { setActionTargetConv(conv); setIsResolveOpen(true); }, [setActionTargetConv, setIsResolveOpen]);
    const onContextLabel = useCallback((conv) => { setActionTargetConv(conv); setIsLabelModalOpen(true); }, [setActionTargetConv, setIsLabelModalOpen]);

    return {
        handleToggleArchive,
        handleTogglePin,
        handleToggleUnread,
        handleTransfer,
        handleResolve,
        handleForward,
        handleDeleteMessage,
        handleRevokeMessage,
        handleStarMessage,
        handlePinMessage,
        handleCopyMessage,
        handleRetryMessage,
        handleMuteConversation,
        handleBlockContact,
        handleClearChat,
        handleDeleteConversation,
        handleBulkDelete,
        handleBulkAction,
        handleToggleBot,
        handleSubmitEdit,
        handleWallpaperSave,
        handleLabelUpdate,
        onContextTransfer,
        onContextResolve,
        onContextLabel,
    };
}
