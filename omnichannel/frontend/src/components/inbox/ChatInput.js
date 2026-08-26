import React, { useState, useRef, useEffect } from 'react';
import CheckOngkirModal from './CheckOngkirModal';
import CTAManager from '../CTAManager';
import RichMediaManager from '../RichMediaManager';
import SmartReplySuggestions from './SmartReplySuggestions';
import SuggestionPopover from './SuggestionPopover';
import AttachmentMenu from './AttachmentMenu';
import PaymentLinkModal from './PaymentLinkModal';
import WAFlowModal from './WAFlowModal';
import ContactModal from './ContactModal';
import LocationModal from './LocationModal';
import PollModal from './PollModal';
import EventModal from './EventModal';
import { Send, Plus, Smile, Mic, Loader2, FileText, Image as ImageIcon, X, Truck, Package, ExternalLink, Sparkles, CreditCard, FormInput, Pencil, Lock, MessageSquare, Clock, Check } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Note: SuggestionPopover, AttachmentMenu, PaymentLinkModal, and WAFlowModal
// are imported from separate files for better code organization

export default function ChatInput({ onSendMessage, onUploadFile, onSendCTA, onSendProduct, onSendPaymentLink, templates, conversationId, editingMessage, onCancelEdit, onSubmitEdit, isGroupChat = false, contactPhone, draftText, onDraftChange }) {
    const [inputText, setInputText] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isOngkirModalOpen, setIsOngkirModalOpen] = useState(false);
    const [isCTAModalOpen, setIsCTAModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isWAFlowModalOpen, setIsWAFlowModalOpen] = useState(false);
    // New attachment modals
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isPollModalOpen, setIsPollModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);

    const [aiSuggestion, setAiSuggestion] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [showAiMenu, setShowAiMenu] = useState(false);
    const [isRewriting, setIsRewriting] = useState(false);

    // Scheduling state
    const [showScheduleInput, setShowScheduleInput] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');

    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionIndex, setSuggestionIndex] = useState(0);

    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const [currentFileType, setCurrentFileType] = useState(null);

    // When edit mode starts: load existing content and focus textarea
    useEffect(() => {
        if (editingMessage) {
            setInputText(editingMessage.content || '');
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const len = (editingMessage.content || '').length;
                    textareaRef.current.setSelectionRange(len, len);
                }
            }, 0);
        }
    }, [editingMessage]);

    // Handle draft loading
    useEffect(() => {
        if (!editingMessage) {
            setInputText(draftText || '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 24), 120)}px`;
        }
    }, [inputText]);

    const handleEmojiClick = (emojiObject) => {
        setInputText(prev => prev + emojiObject.emoji);
    };

    const triggerFileUpload = (type) => {
        // Handle CTA buttons - open CTA manager
        if (type === 'cta') {
            setIsAttachMenuOpen(false);
            setIsCTAModalOpen(true);
            return;
        }

        // Handle Product catalog - open product manager
        if (type === 'product') {
            setIsAttachMenuOpen(false);
            setIsProductModalOpen(true);
            return;
        }

        // Handle Ongkir
        if (type === 'ongkir') {
            setIsAttachMenuOpen(false);
            setIsOngkirModalOpen(true);
            return;
        }

        // Handle Payment Link
        if (type === 'payment') {
            setIsAttachMenuOpen(false);
            setIsPaymentModalOpen(true);
            return;
        }

        // Handle WA Flow
        if (type === 'waflow') {
            setIsAttachMenuOpen(false);
            setIsWAFlowModalOpen(true);
            return;
        }

        // Handle Contact
        if (type === 'contact') {
            setIsAttachMenuOpen(false);
            setIsContactModalOpen(true);
            return;
        }

        // Handle Location
        if (type === 'location') {
            setIsAttachMenuOpen(false);
            setIsLocationModalOpen(true);
            return;
        }

        // Handle Poll
        if (type === 'poll') {
            setIsAttachMenuOpen(false);
            setIsPollModalOpen(true);
            return;
        }

        // Handle Event
        if (type === 'event') {
            setIsAttachMenuOpen(false);
            setIsEventModalOpen(true);
            return;
        }

        setCurrentFileType(type);
        if (fileInputRef.current) {
            fileInputRef.current.value = null;
            let accept = '*/*';
            if (type === 'image') accept = 'image/*';
            else if (type === 'video') accept = 'video/*';
            else if (type === 'audio') accept = 'audio/*';
            else if (type === 'document') accept = '*/*';

            fileInputRef.current.setAttribute('accept', accept);
            fileInputRef.current.click();
        }
        setIsAttachMenuOpen(false);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const type = currentFileType;
        setUploading(true);

        try {
            await onUploadFile(file, type);
        } catch (error) {
            console.error("Upload error in input:", error);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = null;
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputText(val);
        if (onDraftChange && !editingMessage) {
            onDraftChange(val);
        }

        const cursor = e.target.selectionStart;
        // Support spaces, hyphens, underscores in shortcut name or bare slash
        const match = val.slice(0, cursor).match(/(?:\s|^)\/([a-zA-Z0-9_ \-]*)$/);

        if (match && templates && templates.length > 0) {
            const keyword = match[1].toLowerCase().trim();
            const filtered = keyword 
                ? templates.filter(t => 
                    (t.shortcut && t.shortcut.toLowerCase().includes(keyword)) ||
                    (t.name && t.name.toLowerCase().includes(keyword)) ||
                    (t.content && t.content.toLowerCase().includes(keyword))
                  )
                : templates;

            if (filtered.length > 0) {
                setSuggestions(filtered.slice(0, 10));
                setShowSuggestions(true);
                setSuggestionIndex(0);
            } else {
                setShowSuggestions(false);
            }
        } else {
            setShowSuggestions(false);
        }
    };

    const selectTemplate = (template) => {
        const cursor = textareaRef.current.selectionStart;
        const val = inputText;

        const match = val.slice(0, cursor).match(/(?:\s|^)\/([a-zA-Z0-9_ \-]*)$/);

        if (match) {
            const startOfSlash = match.index + (match[0].startsWith('/') ? 0 : 1);
            const endOfKeyword = cursor;
            const before = val.substring(0, startOfSlash);
            const after = val.substring(endOfKeyword);

            const newVal = before + template.content + after;
            setInputText(newVal);
            setShowSuggestions(false);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const newCursorPos = before.length + template.content.length;
                    textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 0);
        }
    };

    const handleKeyDown = (e) => {
        if (showSuggestions) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectTemplate(suggestions[suggestionIndex]);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        } else {
            if (e.key === 'Escape' && editingMessage) {
                e.preventDefault();
                handleCancelEditInternal();
                return;
            }
            // Standard Chat Behavior: Enter = Send, Shift+Enter = New Line
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        }
    };

    const handleCancelEditInternal = () => {
        setInputText('');
        setShowEmojiPicker(false);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        onCancelEdit?.();
    };

    const handleSendMessage = () => {
        if (!inputText.trim()) return;

        if (editingMessage) {
            onSubmitEdit?.(inputText);
            setInputText('');
            setShowEmojiPicker(false);
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
            return;
        }

        if (scheduleDate) {
            // This assumes onSendMessage handles scheduling if 5th param is scheduleDate
            // Or we just call backend here directly, but normally onSendMessage handles sending.
            // Let's call the schedule API directly here to avoid changing parent components if possible, 
            // OR we just pass it to onSendMessage. Wait, the prompt implies we should call API here if we don't want to break things, 
            // but `onSendMessage` is passed down. Let's check how we can do it. Let's call the schedule API directly.
            handleScheduleMessageSubmit();
            return;
        }

        onSendMessage(inputText, 'text', null, isInternal);
        setInputText('');
        setShowEmojiPicker(false);
        setAiSuggestion('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleScheduleMessageSubmit = async () => {
        if (!conversationId || !inputText.trim() || !scheduleDate) return;
        const toastId = toast.loading('Menjadwalkan pesan...');
        try {
            await axios.post('/api/app/scheduled-messages', {
                conversation_id: conversationId,
                content: inputText.trim(),
                scheduled_at: new Date(scheduleDate).toISOString()
            });
            toast.success('Pesan dijadwalkan!', { id: toastId });
            setInputText('');
            setScheduleDate('');
            setShowScheduleInput(false);
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        } catch (err) {
            toast.error(err.response?.data?.error || 'Gagal menjadwalkan pesan', { id: toastId });
        }
    };

    const handleAiSuggest = async (tone = 'friendly') => {
        if (!conversationId || isSuggesting) return;
        setShowAiMenu(false);
        setIsSuggesting(true);
        setAiSuggestion('');
        try {
            const res = await axios.post(`/api/app/ai/suggest`, { conversationId, tone });
            if (res.data.suggestion) {
                setAiSuggestion(res.data.suggestion);
            } else {
                toast('Tidak ada saran AI. Pastikan AI API key sudah dikonfigurasi.', { icon: '🤖' });
            }
        } catch (err) {
            toast.error('Gagal mendapatkan saran AI');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleRewrite = async (tone) => {
        if (!inputText.trim() || isRewriting) return;
        setShowAiMenu(false);
        setIsRewriting(true);
        const toastId = toast.loading('Menulis ulang...');
        try {
            const res = await axios.post(`/api/app/ai/rewrite`, { text: inputText, tone });
            if (res.data.rewrittenText) {
                setInputText(res.data.rewrittenText);
                toast.success('Berhasil ditulis ulang', { id: toastId });
            }
        } catch (err) {
            toast.error('Gagal menulis ulang pesan', { id: toastId });
        } finally {
            setIsRewriting(false);
        }
    };

    const applyAiSuggestion = () => {
        setInputText(aiSuggestion);
        setAiSuggestion('');
        setTimeout(() => textareaRef.current?.focus(), 0);
    };

    // Handler for sending structured messages (contact, location, poll, event)
    const handleSendStructuredMessage = async (data) => {
        if (!conversationId) {
            toast.error('Conversation ID not found');
            return;
        }
        const toastId = toast.loading('Mengirim...');
        try {
            const payload = { conversationId, type: data.type, data: data.data };
            await axios.post('/api/app/inbox/conversations/' + conversationId + '/structured', payload);
            toast.success('Pesan terkirim', { id: toastId });
        } catch (err) {
            const msg = err.response?.data?.error || 'Gagal mengirim';
            toast.error(msg, { id: toastId });
            throw err;
        }
    };

    const handlePaymentCreated = async ({ amount, description, duration_hours }) => {
        if (!conversationId) return;
        const toastId = toast.loading('Membuat payment link...');
        try {
            const res = await axios.post(`/api/app/inbox/conversations/${conversationId}/create-payment-link`, { amount, description, duration_hours });
            const { invoice_url, duration_hours: dur } = res.data;
            const durLabel = dur === 1 ? '1 jam' : `${dur} jam`;
            const formatted = `💳 *Payment Link*\n\n📋 ${description}\n💰 Jumlah: Rp ${amount.toLocaleString('id-ID')}\n\n🔗 Bayar di sini:\n${invoice_url}\n\n_Link berlaku ${durLabel}_`;
            setInputText(formatted);
            toast.success('Payment link siap! Periksa pesan lalu kirim.', { id: toastId });
            setTimeout(() => textareaRef.current?.focus(), 0);
        } catch (err) {
            const msg = err.response?.data?.error || 'Gagal membuat payment link';
            toast.error(msg, { id: toastId });
        }
    };

    return (
        <div className="px-2 pt-1 pb-3 md:py-2 bg-[#f0f2f5] dark:bg-[#202c33] relative w-full flex flex-col gap-1 z-20">

            {/* Edit Message Banner */}
            {editingMessage && (
                <div className="mx-2 mb-1 bg-[#d9fdd3] dark:bg-[#005c4b]/40 border-l-4 border-[#00a884] rounded-r-xl px-3 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <Pencil className="w-4 h-4 text-[#00a884] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#00a884] mb-0.5">Edit pesan</p>
                        <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{editingMessage.content}</p>
                    </div>
                    <button
                        onClick={handleCancelEditInternal}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 flex-shrink-0"
                        title="Batal edit (Esc)"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* AI Suggestion Banner - Smart Replies */}
            {aiSuggestion && !suggestions.length && (
                <div className="mx-2 mb-1 bg-indigo-50 dark:bg-indigo-900/20 border border-purple-200 dark:border-purple-700/50 rounded-xl px-3 py-2 flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-0.5">Saran AI</p>
                        <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug line-clamp-3">{aiSuggestion}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                        <button
                            onClick={applyAiSuggestion}
                            className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg font-semibold transition-colors"
                        >
                            Gunakan
                        </button>
                        <button
                            onClick={() => setAiSuggestion('')}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Smart Reply Suggestions */}
            <SmartReplySuggestions
                conversationId={conversationId}
                onSelect={(text) => {
                    setInputText(text);
                    textareaRef.current?.focus();
                }}
                onDismiss={() => setAiSuggestion('')}
            />

            {/* Modals & Popovers (absolute-positioned, order doesn't matter) */}
            <CheckOngkirModal
                isOpen={isOngkirModalOpen}
                onClose={() => setIsOngkirModalOpen(false)}
                onSend={(msg) => onSendMessage(msg)}
            />
            {isCTAModalOpen && (
                <div className="absolute bottom-full mb-2 left-4 w-96 bg-white dark:bg-dark-surface rounded-xl shadow-2xl border border-gray-200 dark:border-dark-border z-50">
                    <div className="flex justify-between items-center p-3 border-b dark:border-dark-border">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">Send CTA Buttons</h3>
                        <button onClick={() => setIsCTAModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-3 max-h-96 overflow-y-auto">
                        <CTAManager
                            conversationId={conversationId}
                            onSendCTA={(ctas) => {
                                setIsCTAModalOpen(false);
                                onSendCTA?.(ctas);
                            }}
                        />
                    </div>
                </div>
            )}
            <PaymentLinkModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onCreated={handlePaymentCreated}
            />
            <WAFlowModal
                isOpen={isWAFlowModalOpen}
                onClose={() => setIsWAFlowModalOpen(false)}
                conversationId={conversationId}
            />
            <ContactModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
                onSend={handleSendStructuredMessage}
                conversationId={conversationId}
                contactPhone={contactPhone}
            />
            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onSend={handleSendStructuredMessage}
            />
            <PollModal
                isOpen={isPollModalOpen}
                onClose={() => setIsPollModalOpen(false)}
                onSend={handleSendStructuredMessage}
                isGroupChat={isGroupChat}
            />
            <EventModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                onSend={handleSendStructuredMessage}
                isGroupChat={isGroupChat}
            />
            <PaymentLinkModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onCreated={onSendPaymentLink}
            />
            {isProductModalOpen && (
                <div className="absolute bottom-full mb-2 left-4 w-96 bg-white dark:bg-dark-surface rounded-xl shadow-2xl border border-gray-200 dark:border-dark-border z-50">
                    <div className="flex justify-between items-center p-3 border-b dark:border-dark-border">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">Send Product Catalog</h3>
                        <button onClick={() => setIsProductModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-3 max-h-96 overflow-y-auto">
                        <RichMediaManager
                            conversationId={conversationId}
                            onSend={(products) => {
                                setIsProductModalOpen(false);
                                onSendProduct?.(products);
                            }}
                        />
                    </div>
                </div>
            )}
            {showSuggestions && (
                <SuggestionPopover
                    suggestions={suggestions}
                    selectedIndex={suggestionIndex}
                    onSelect={selectTemplate}
                />
            )}
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            <AttachmentMenu isOpen={isAttachMenuOpen} onSelect={triggerFileUpload} onClose={() => setIsAttachMenuOpen(false)} isGroupChat={isGroupChat} />
            {showEmojiPicker && (
                <div className="absolute bottom-[60px] left-2 z-50 shadow-2xl rounded-xl">
                    <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        width={300}
                        height={400}
                        theme="auto"
                        previewConfig={{ showPreview: false }}
                    />
                </div>
            )}

            {/* AI Copilot Suggestion Preview Card */}
            {aiSuggestion && (
                <div className="mx-2 mb-2 p-3 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-purple-200/80 dark:border-purple-800/50 shadow-sm flex flex-col gap-2 transition-all animate-fadeIn">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                            <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                            <span>Saran AI Copilot</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setAiSuggestion('')}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded-full"
                            title="Tutup Saran"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-100 font-normal leading-relaxed whitespace-pre-wrap">
                        {aiSuggestion}
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-purple-100 dark:border-purple-900/40">
                        <button
                            type="button"
                            onClick={() => handleAiSuggest()}
                            disabled={isSuggesting}
                            className="text-xs text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-300 px-2 py-1 rounded transition-colors"
                        >
                            🔄 Buat Ulang
                        </button>
                        <button
                            type="button"
                            onClick={applyAiSuggestion}
                            className="flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium px-3 py-1 rounded-lg shadow-sm transition-all hover:shadow"
                        >
                            <Check className="w-3.5 h-3.5" /> Gunakan Saran
                        </button>
                    </div>
                </div>
            )}

            {/* Input Mode Toggle (Reply vs Internal Note) */}
            <div className="flex gap-2 mx-2 mb-2">
                <button
                    type="button"
                    onClick={() => setIsInternal(false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${!isInternal ? 'bg-white dark:bg-[#2a3942] text-[#00a884] border-b-2 border-[#00a884]' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    <MessageSquare className="w-4 h-4" /> Balas Pelanggan
                </button>
                <button
                    type="button"
                    onClick={() => setIsInternal(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${isInternal ? 'bg-[#fff9c4] dark:bg-[#ffe082]/20 text-[#f57f17] border-b-2 border-[#f57f17]' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    <Lock className="w-4 h-4" /> Catatan Internal
                </button>
            </div>

            {/* Input Row */}
            <div className="flex items-end gap-2 w-full">
            {/* Full Capsule Container */}
            <div className={`flex-1 rounded-[24px] px-2 py-1.5 shadow-[0_2px_5px_rgba(0,0,0,0.05)] border border-transparent focus-within:border-indigo-100 dark:focus-within:border-slate-600 focus-within:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 flex items-end gap-1 ${isInternal ? 'bg-[#fff9c4] dark:bg-[#ffe082]/20' : 'bg-white dark:bg-[#2a3942]'}`}>

                {/* Emoji Button */}
                <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 transition-colors rounded-full flex-shrink-0 mb-0.5 ${showEmojiPicker ? 'text-[#00a884]' : 'text-[#54656f] dark:text-[#8696a0] hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Emoji"
                >
                    {showEmojiPicker ? <X className="w-6 h-6" /> : <Smile className="w-6 h-6" />}
                </button>

                {/* Attachment Button */}
                <button
                    type="button"
                    disabled={uploading}
                    onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                    className={`p-2 transition-colors rounded-full flex-shrink-0 mb-0.5 ${isAttachMenuOpen ? 'bg-gray-200 dark:bg-gray-700 text-[#54656f] dark:text-[#8696a0]' : 'text-[#54656f] dark:text-[#8696a0] hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Attach"
                >
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                </button>

                {/* Text Area */}
                <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ketik pesan"
                    className="flex-1 w-full resize-none outline-none text-[15px] leading-[22px] chat-input-area text-[#111b21] dark:text-[#d1d7db] placeholder-[#8696a0] dark:placeholder-[#8696a0] custom-scrollbar px-2 mb-1.5"
                    rows={1}
                    style={{ minHeight: '24px', maxHeight: '120px', backgroundColor: 'transparent' }}
                    disabled={uploading}
                />

                {/* AI Menu Button */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowAiMenu(!showAiMenu)}
                        disabled={isSuggesting || isRewriting || (!conversationId && !inputText)}
                        title="AI Tools"
                        className={`p-2 transition-colors rounded-full flex-shrink-0 mb-0.5 ${showAiMenu ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'text-[#54656f] dark:text-[#8696a0] hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-300'}`}
                    >
                        {(isSuggesting || isRewriting) ? <Loader2 className="w-5 h-5 animate-spin text-purple-500" /> : <Sparkles className="w-5 h-5" />}
                    </button>
                    {showAiMenu && (
                        <div className="absolute bottom-full mb-2 right-0 w-56 bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden animate-fadeIn">
                            <div className="p-1.5 space-y-0.5">
                                <button
                                    onClick={() => handleAiSuggest()}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>💡 Saran Balasan AI</span>
                                </button>
                                <div className="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>
                                <div className="px-3 py-1 text-[10px] font-black text-gray-400 uppercase tracking-wider">Ubah Nada Teks (Tone)</div>
                                <button
                                    onClick={() => handleRewrite('friendly')}
                                    disabled={!inputText.trim()}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 disabled:opacity-40"
                                >
                                    <span>🌸 Ramah & Hangat</span>
                                </button>
                                <button
                                    onClick={() => handleRewrite('professional')}
                                    disabled={!inputText.trim()}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 disabled:opacity-40"
                                >
                                    <span>💼 Formal & Profesional</span>
                                </button>
                                <button
                                    onClick={() => handleRewrite('persuasive')}
                                    disabled={!inputText.trim()}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 disabled:opacity-40"
                                >
                                    <span>🎯 Persuasif (Closing Sales)</span>
                                </button>
                                <button
                                    onClick={() => handleRewrite('shorter')}
                                    disabled={!inputText.trim()}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 disabled:opacity-40"
                                >
                                    <span>⚡ Singkat & Padat</span>
                                </button>
                                <div className="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>
                                <div className="px-3 py-1 text-[10px] font-black text-gray-400 uppercase tracking-wider">Bahasa & Ejaan</div>
                                <button
                                    onClick={() => handleRewrite('grammar')}
                                    disabled={!inputText.trim()}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 disabled:opacity-40"
                                >
                                    <span>✍️ Perbaiki Ejaan & Typo</span>
                                </button>
                                <button
                                    onClick={() => handleRewrite('translate_en')}
                                    disabled={!inputText.trim()}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 disabled:opacity-40"
                                >
                                    <span>🇬🇧 Terjemahkan ke English</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Schedule & Send Buttons */}
                <div className="flex-shrink-0 mb-0.5 flex items-center gap-1 relative">
                    {!inputText.trim() ? (
                        <button className="p-2 rounded-full text-[#54656f] dark:text-[#8696a0] cursor-default hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Mic className="w-5 h-5" />
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowScheduleInput(!showScheduleInput)}
                                className={`p-2 rounded-full transition-colors ${showScheduleInput ? 'bg-blue-100 text-blue-600' : 'text-[#54656f] dark:text-[#8696a0] hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                title="Jadwalkan"
                            >
                                <Clock className="w-5 h-5" />
                            </button>
                            {showScheduleInput && (
                                <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-xl p-3 flex flex-col gap-2 z-50 w-64">
                                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Waktu Pengiriman</label>
                                    <input 
                                        type="datetime-local" 
                                        value={scheduleDate}
                                        onChange={e => setScheduleDate(e.target.value)}
                                        className="text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-500 bg-white text-black"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowScheduleInput(false)} className="flex-1 py-1 bg-gray-100 text-gray-600 rounded text-xs">Batal</button>
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={handleSendMessage}
                                className={`p-2 rounded-full transition-colors ${scheduleDate ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-[#54656f] dark:text-[#8696a0] hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                title={scheduleDate ? "Kirim Terjadwal" : "Send"}
                            >
                                {scheduleDate ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5 fill-current" />}
                            </button>
                        </>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
