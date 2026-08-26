import React, { useState, useEffect, memo } from 'react';
import { getInitialsAvatar } from '../../utils/avatar';
import axios from 'axios';
import { User, Tag, Plus, Bot, Power, CheckCircle, RefreshCw, Clock, StopCircle, Play, Sparkles, Trash2, GitBranch, X, Star, Columns, ChevronDown, ChevronUp, ChevronRight, FileText, MessageSquare, Ticket, AlertTriangle, ShieldAlert, Megaphone, Loader2, CreditCard, Edit2, Check } from 'lucide-react';
import LabelSelector from '../labels/LabelSelector';
import { toast } from 'react-hot-toast';
import GenerateQAModal from '../chatbot/GenerateQAModal';

const formatDisplayName = (name) => {
    if (!name) return '';
    return String(name).split('@')[0];
};

// Wrap SectionItem in memo for performance
const MemoizedSectionItem = memo(({ title, isOpen, onToggle, children, icon: IconProp }) => (
    <div className="border-b border-gray-100 dark:border-dark-border">
        <button
            onClick={onToggle}
            className="w-full py-4 px-5 flex items-center justify-between bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
        >
            <div className="flex items-center gap-3">
                {IconProp && <IconProp className="w-4 h-4 text-gray-400" />}
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</span>
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {isOpen && (
            <div className="px-5 pb-5 bg-white dark:bg-dark-surface">
                {children}
            </div>
        )}
    </div>
));

export default function ContactInfoPanel({
    conversation,
    activeLabels,
    onToggleBot,
    onLabelUpdate,
    onStatusChange,
    onDeleteConversation
}) {
    // --- STATE MANAGEMENT ---
    const [ratingHistory, setRatingHistory] = useState([]);

    // Accordion State (Independent Toggles)
    const [openSections, setOpenSections] = useState({
        followup: false,
        pipeline: false,
        note: false,
        customFields: false,
        qa: false,
        autopilot: false,
        rating: false
    });

    const toggleSection = (key) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // AI Summary state
    const [summary, setSummary] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);

    // Payment Links history state
    const [paymentLinks, setPaymentLinks] = useState([]);
    const [isLoadingPayments, setIsLoadingPayments] = useState(false);

    // Label Modal
    const [isLabelSelectorOpen, setIsLabelSelectorOpen] = useState(false);
    const [isGenerateQAOpen, setIsGenerateQAOpen] = useState(false);

    // Follow-up State
    const [activeFollowup, setActiveFollowup] = useState(null);
    const [sequences, setSequences] = useState([]);
    const [isFollowupLoading, setIsFollowupLoading] = useState(false);
    const [selectedSequence, setSelectedSequence] = useState('');

    // Priority State
    const [localPriority, setLocalPriority] = useState(conversation?.priority || 'medium');
    useEffect(() => { setLocalPriority(conversation?.priority || 'medium'); }, [conversation?.id, conversation?.priority]);

    // Guard: don't render if conversation not loaded yet
    // Reset AI summary + payment links when conversation changes
    useEffect(() => {
        setSummary('');
        setPaymentLinks([]);
        fetchPaymentLinks();
    }, [conversation?.id]);

    const fetchPaymentLinks = async () => {
        if (!conversation?.id) return;
        setIsLoadingPayments(true);
        try {
            const res = await axios.get(`/api/app/inbox/conversations/${conversation.id}/payment-links`);
            setPaymentLinks(res.data);
        } catch {
            setPaymentLinks([]);
        } finally {
            setIsLoadingPayments(false);
        }
    };

    // Custom Fields State
    const [customFieldData, setCustomFieldData] = useState([]); // merged fields + values
    const [editingFieldId, setEditingFieldId] = useState(null);
    const [editingFieldValue, setEditingFieldValue] = useState('');
    const [savingField, setSavingField] = useState(false);

    const handleSummarize = async () => {
        if (isSummarizing || !conversation?.id) return;
        setIsSummarizing(true);
        setSummary('');
        try {
            const res = await axios.post(`/api/app/inbox/conversations/${conversation.id}/summarize`);
            setSummary(res.data.summary || 'Tidak ada ringkasan tersedia.');
        } catch {
            toast.error('Gagal merangkum percakapan');
        } finally {
            setIsSummarizing(false);
        }
    };

    const handlePriorityChange = async (newPriority) => {
        const prev = localPriority;
        setLocalPriority(newPriority);
        try {
            await axios.patch(`/api/app/inbox/conversations/${conversation.id}/priority`, { priority: newPriority });
            toast.success('Prioritas diperbarui');
        } catch {
            setLocalPriority(prev);
            toast.error('Gagal mengubah prioritas');
        }
    };

    // Internal Note State
    const [note, setNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    // Pipeline State
    const [pipelines, setPipelines] = useState([]);
    const [selectedPipeline, setSelectedPipeline] = useState('');
    const [selectedStage, setSelectedStage] = useState('');

    // LTV State
    const [ltvData, setLtvData] = useState({ ltv: 0, history: [] });
    const [isLoadingLtv, setIsLoadingLtv] = useState(false);

    // --- EFFECTS ---
    useEffect(() => {
        if (!conversation?.id) return;

        // Fetch Ratings
        if (conversation.status === 'resolved' || conversation.rating_score) {
            axios.get(`/api/app/inbox/conversations/${conversation.id}/ratings`)
                .then(res => setRatingHistory(res.data))
                .catch(() => setRatingHistory([]));
        } else {
            setRatingHistory([]);
        }

        fetchFollowupStatus();
        fetchSequences();
        fetchPipelines();
        setNote(conversation.internal_note || '');

        // Fetch LTV
        if (conversation.contact_id) {
            setIsLoadingLtv(true);
            axios.get(`/api/app/contacts/${conversation.contact_id}/ltv`)
                .then(res => setLtvData(res.data))
                .catch(() => setLtvData({ ltv: 0, history: [] }))
                .finally(() => setIsLoadingLtv(false));
        }

        // Set initial pipeline state
        setSelectedPipeline(conversation.pipeline_id || '');
        setSelectedStage(conversation.pipeline_stage_id || '');

        // Fetch custom fields for contact
        if (conversation.contact_id) {
            axios.get(`/api/app/contacts/${conversation.contact_id}/field-values`)
                .then(res => setCustomFieldData(res.data))
                .catch(() => setCustomFieldData([]));
        }

    }, [conversation?.id, conversation?.pipeline_id, conversation?.rating_score, conversation?.status]);

    // Guard: render nothing if conversation not yet loaded (must be after all hooks)
    if (!conversation) return null;

    // --- API HANDLERS ---
    const fetchPipelines = async () => {
        try {
            const res = await axios.get('/api/app/pipelines');
            setPipelines(res.data);
        } catch (err) { }
    };

    const handlePipelineChange = async (pipeId) => {
        const pid = pipeId === '' ? null : Number(pipeId);
        setSelectedPipeline(pid);
        let newStageId = null;
        if (pid) {
            const pipe = pipelines.find(p => p.id === pid);
            if (pipe?.stages?.length > 0) newStageId = pipe.stages[0].id;
        }
        await updatePipeline(pid, newStageId);
    };

    const handleStageChange = async (stageId) => {
        const sid = stageId === '' ? null : Number(stageId);
        await updatePipeline(selectedPipeline, sid);
    };

    const updatePipeline = async (pid, sid) => {
        try {
            await axios.post(`/api/app/conversations/${conversation.id}/pipeline`, {
                pipelineId: pid,
                stageId: sid
            });
            setSelectedPipeline(pid);
            setSelectedStage(sid);
            toast.success("Pipeline updated");
        } catch (err) { toast.error("Update failed"); }
    };

    const handleSaveNote = async () => {
        setIsSavingNote(true);
        try {
            await axios.put(`/api/app/contacts/${conversation.contact_id}/note`, { internal_note: note });
            toast.success("Note saved");
        } catch (err) { toast.error("Failed to save note"); }
        finally { setIsSavingNote(false); }
    };

    const fetchFollowupStatus = async () => {
        try {
            const res = await axios.get(`/api/app/inbox/conversations/${conversation.id}/followup/status`);
            setActiveFollowup(res.data);
        } catch (err) { setActiveFollowup(null); }
    };

    const fetchSequences = async () => {
        try {
            const res = await axios.get('/api/app/followups/sequences');
            setSequences(res.data);
            if (res.data.length > 0) setSelectedSequence(res.data[0].id);
        } catch (err) { }
    };

    const startFollowup = async () => {
        if (!selectedSequence) return;
        setIsFollowupLoading(true);
        try {
            await axios.post(`/api/app/inbox/conversations/${conversation.id}/followup/start`, { sequence_id: selectedSequence });
            toast.success("Auto Follow-up Started");
            fetchFollowupStatus();
        } catch (err) { toast.error("Failed to start"); }
        finally { setIsFollowupLoading(false); }
    };

    const stopFollowup = async () => {
        if (!confirm("Stop auto follow-up?")) return;
        try {
            await axios.post(`/api/app/inbox/conversations/${conversation.id}/followup/stop`);
            toast.success("Stopped");
            setActiveFollowup(null);
        } catch (err) { toast.error("Failed to stop"); }
    };

    const handleStopFlow = async () => {
        if (!confirm("Terminate the current Chat Flow for this user?")) return;
        try {
            await axios.post(`/api/app/inbox/conversations/${conversation.id}/stop-flow`);
            toast.success("Flow terminated");
        } catch (err) { toast.error("Failed to stop flow"); }
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to DELETE this conversation? This action cannot be undone.")) {
            onDeleteConversation(conversation.id);
        }
    };

    // --- CUSTOM FIELD HANDLERS ---
    const startEditField = (field) => {
        setEditingFieldId(field.id);
        setEditingFieldValue(field.value || '');
    };

    const cancelEditField = () => {
        setEditingFieldId(null);
        setEditingFieldValue('');
    };

    const saveFieldValue = async (field) => {
        if (!conversation?.contact_id) return;
        setSavingField(true);
        try {
            await axios.post(`/api/app/contacts/${conversation.contact_id}/field-values`, {
                values: { [field.field_key]: editingFieldValue }
            });
            toast.success('Field updated');
            // Refresh custom fields
            const res = await axios.get(`/api/app/contacts/${conversation.contact_id}/field-values`);
            setCustomFieldData(res.data);
            setEditingFieldId(null);
        } catch (err) {
            toast.error('Failed to update field');
        } finally {
            setSavingField(false);
        }
    };

    return (
        <div className="w-full border-l border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface flex flex-col h-full overflow-y-auto pb-20 md:pb-0 font-sans">

            {/* 1. HEADER IMPROVED */}
            <div className="p-6 border-b border-gray-100 dark:border-dark-border flex items-center gap-4">
                <div className="relative">
                    <img
                        src={conversation.profile_pic_url || getInitialsAvatar(conversation.contact_name)}
                        onError={(e) => { e.target.onerror = null; e.target.src = getInitialsAvatar(conversation.contact_name); }}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-100 dark:ring-slate-700"
                        alt=""
                    />
                    {conversation.status === 'open' && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                        {formatDisplayName(conversation.contact_name)}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                        {formatDisplayName(conversation.phone_number)}
                    </p>

                    {/* Compact Label Display / Add Trigger */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {activeLabels.map(l => (
                            <span
                                key={l.id}
                                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                                style={{ backgroundColor: l.color + '20', color: l.color, borderColor: l.color + '40' }}
                            >
                                {l.name}
                            </span>
                        ))}
                        <button
                            onClick={() => setIsLabelSelectorOpen(!isLabelSelectorOpen)}
                            className="text-[10px] font-medium text-indigo-600 hover:underline flex items-center gap-1"
                        >
                            {activeLabels.length === 0 ? "+ Add Label" : "Edit"}
                        </button>
                    </div>

                    {/* Inline Label Selector (if open) */}
                    {isLabelSelectorOpen && (
                        <div className="absolute top-24 right-5 z-20 w-64 bg-white shadow-xl rounded-lg border border-gray-200 p-2">
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-xs font-bold">Manage Labels</span>
                                <button onClick={() => setIsLabelSelectorOpen(false)}><X className="w-3 h-3" /></button>
                            </div>
                            <LabelSelector
                                contactId={conversation.contact_id}
                                existingLabels={activeLabels}
                                onClose={() => setIsLabelSelectorOpen(false)}
                                onUpdate={onLabelUpdate}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* CTWA ADS BADGE */}
            {conversation.ctwa_ad_id && (
                <div className="px-5 py-2.5 bg-orange-50 dark:bg-orange-900/10 border-b border-orange-100 dark:border-orange-900/30 flex items-center gap-2">
                    <Megaphone className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">Dari Iklan WhatsApp (CTWA)</p>
                        {conversation.ctwa_headline && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 truncate">{conversation.ctwa_headline}</p>
                        )}
                    </div>
                </div>
            )}

            {/* AI SUMMARIZE SECTION */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-dark-border">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Ringkasan AI</span>
                    </div>
                    <button
                        onClick={handleSummarize}
                        disabled={isSummarizing}
                        className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                        {isSummarizing ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Merangkum...</>
                        ) : (
                            summary ? 'Perbarui' : 'Rangkum'
                        )}
                    </button>
                </div>
                {summary ? (
                    <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line border border-purple-100 dark:border-purple-800/30">
                        {summary}
                    </div>
                ) : !isSummarizing ? (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">Klik "Rangkum" untuk membuat ringkasan percakapan dengan AI.</p>
                ) : null}
            </div>

            {/* LTV & TRANSACTION HISTORY */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-dark-border">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Customer LTV</span>
                    </div>
                    {isLoadingLtv && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-3 border border-yellow-100 dark:border-yellow-800/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Pembelanjaan (Paid)</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        Rp {parseInt(ltvData.ltv || 0).toLocaleString('id-ID')}
                    </p>
                </div>
                {ltvData.history && ltvData.history.length > 0 && (
                    <div className="mt-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Transaksi Terakhir</p>
                        <div className="space-y-2">
                            {ltvData.history.map(inv => (
                                <div key={inv.id} className="flex justify-between items-center text-xs">
                                    <div>
                                        <p className="font-semibold text-gray-700 dark:text-gray-300">{inv.invoice_number}</p>
                                        <p className="text-gray-400 text-[10px]">{new Date(inv.issue_date).toLocaleDateString('id-ID')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-800 dark:text-gray-200">Rp {parseInt(inv.total_amount).toLocaleString('id-ID')}</p>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-green-100 text-green-700 uppercase">{inv.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* PAYMENT LINKS HISTORY */}
            {(paymentLinks.length > 0 || isLoadingPayments) && (
                <div className="px-5 py-3 border-b border-gray-100 dark:border-dark-border">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Riwayat Payment Link</span>
                        </div>
                        <button
                            onClick={fetchPaymentLinks}
                            disabled={isLoadingPayments}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-3 h-3 ${isLoadingPayments ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        {paymentLinks.map(link => {
                            const isExpiredByTime = link.status === 'pending' &&
                                new Date(link.created_at).getTime() + link.duration_hours * 3600000 < Date.now();
                            const effectiveStatus = isExpiredByTime ? 'expired' : link.status;
                            const statusConfig = {
                                paid:    { label: 'Lunas', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                                expired: { label: 'Kedaluwarsa', cls: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400' },
                                pending: { label: 'Menunggu', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
                            }[effectiveStatus] || { label: effectiveStatus, cls: 'bg-gray-100 text-gray-500' };
                            return (
                                <div key={link.id} className="bg-gray-50 dark:bg-dark-bg rounded-lg p-2.5 text-xs">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <span className="text-gray-700 dark:text-gray-300 font-medium leading-tight flex-1">{link.description}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${statusConfig.cls}`}>
                                            {statusConfig.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-gray-800 dark:text-gray-200">
                                            Rp {parseInt(link.amount).toLocaleString('id-ID')}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">berlaku {link.duration_hours}j</span>
                                            {effectiveStatus === 'pending' && (
                                                <a
                                                    href={link.invoice_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:underline"
                                                >
                                                    Buka ↗
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    {link.paid_at && (
                                        <p className="text-gray-400 mt-1">
                                            Dibayar: {new Date(link.paid_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TICKET INFO STRIP */}
            {conversation.ticket_number && (
                <div className="px-5 py-2.5 bg-indigo-50/60 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Ticket className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 tracking-wide">{conversation.ticket_number}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Priority Selector */}
                        <select
                            value={localPriority}
                            onChange={e => handlePriorityChange(e.target.value)}
                            className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 border-0 cursor-pointer outline-none focus:ring-1 focus:ring-indigo-400 ${
                                localPriority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                localPriority === 'high'   ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                localPriority === 'medium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                             'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                        >
                            <option value="low">Rendah</option>
                            <option value="medium">Sedang</option>
                            <option value="high">Tinggi</option>
                            <option value="urgent">Urgent</option>
                        </select>
                        {conversation.sla_breached && (
                            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                <AlertTriangle className="w-2.5 h-2.5" /> SLA
                            </span>
                        )}
                        {!conversation.sla_breached && conversation.sla_deadline_at && conversation.status !== 'resolved' && (
                            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                <ShieldAlert className="w-2.5 h-2.5" /> On Track
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* FLOW ACTIVE INDICATOR */}
            {conversation.active_flow_name && (
                <div className="px-5 py-3 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                            <GitBranch className="w-3 h-3" /> Active Flow
                        </span>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5">{conversation.active_flow_name}</p>
                    </div>
                    <button onClick={handleStopFlow} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Stop Flow">
                        <StopCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* 2. ACCORDION MENU LIST */}
            <div className="flex-1 overflow-y-auto">

                {/* AUTO FOLLOW-UP */}
                <MemoizedSectionItem title="Auto Follow-up" isOpen={openSections.followup} onToggle={() => toggleSection('followup')}>
                    {activeFollowup ? (
                        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/50 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-xs font-bold text-orange-800 dark:text-orange-300">{activeFollowup.sequence_name}</p>
                                    <p className="text-[10px] text-orange-600 dark:text-orange-400">Step {activeFollowup.current_step_index} of {activeFollowup.steps.length}</p>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-3">
                                Next run: {new Date(activeFollowup.next_run_at).toLocaleString()}
                            </p>
                            <button onClick={stopFollowup} className="w-full py-1.5 bg-white dark:bg-dark-bg border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center justify-center gap-1">
                                <StopCircle className="w-3 h-3" /> Stop Sequence
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <select
                                className="w-full border border-gray-300 dark:border-slate-700 p-2 rounded text-xs bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedSequence}
                                onChange={e => setSelectedSequence(e.target.value)}
                            >
                                <option value="">Select Sequence...</option>
                                {sequences.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button
                                onClick={startFollowup}
                                disabled={!selectedSequence || isFollowupLoading}
                                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Play className="w-3 h-3" /> Start Follow-up
                            </button>
                        </div>
                    )}
                </MemoizedSectionItem>

                {/* PIPELINE */}
                <MemoizedSectionItem title="Pipeline" isOpen={openSections.pipeline} onToggle={() => toggleSection('pipeline')}>
                    <div className="space-y-3">
                        <select
                            className="w-full text-xs p-2 bg-white dark:bg-[#0f172a] border border-gray-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                            value={selectedPipeline || ''}
                            onChange={(e) => handlePipelineChange(e.target.value)}
                        >
                            <option value="">No Pipeline</option>
                            {pipelines.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        {selectedPipeline && (
                            <select
                                className="w-full text-xs p-2 bg-white dark:bg-[#0f172a] border border-gray-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                                value={selectedStage || ''}
                                onChange={(e) => handleStageChange(e.target.value)}
                            >
                                <option value="">Select Stage...</option>
                                {pipelines.find(p => p.id === selectedPipeline)?.stages?.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </MemoizedSectionItem>

                {/* INTERNAL NOTE */}
                <MemoizedSectionItem title="Internal Note" isOpen={openSections.note} onToggle={() => toggleSection('note')}>
                    <div className="relative">
                        <textarea
                            className="w-full bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-xs text-gray-700 dark:text-yellow-100 placeholder-gray-400 dark:placeholder-yellow-500/50 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none h-32 resize-none"
                            placeholder="Add notes about this contact..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            onBlur={handleSaveNote}
                        />
                        {isSavingNote && <span className="absolute bottom-2 right-2 text-[10px] text-gray-400 italic">Saving...</span>}
                    </div>
                </MemoizedSectionItem>

                {/* CUSTOM FIELDS */}
                {customFieldData.length > 0 && (
                    <MemoizedSectionItem title="Custom Fields" isOpen={openSections.customFields} onToggle={() => toggleSection('customFields')}>
                        <div className="space-y-3">
                            {customFieldData.map(f => (
                                <div key={f.id} className="flex items-start justify-between gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5 flex-shrink-0 w-24 truncate">{f.field_label}</span>
                                    {editingFieldId === f.id ? (
                                        <div className="flex-1 flex items-center gap-1">
                                            {f.field_type === 'dropdown' && Array.isArray(f.field_options) ? (
                                                <select
                                                    value={editingFieldValue}
                                                    onChange={e => setEditingFieldValue(e.target.value)}
                                                    className="flex-1 text-xs border border-gray-300 dark:border-dark-border rounded px-2 py-1 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                                                >
                                                    <option value="">Pilih...</option>
                                                    {f.field_options.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : f.field_type === 'checkbox' ? (
                                                <select
                                                    value={editingFieldValue}
                                                    onChange={e => setEditingFieldValue(e.target.value)}
                                                    className="flex-1 text-xs border border-gray-300 dark:border-dark-border rounded px-2 py-1 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                                                >
                                                    <option value="true">Ya</option>
                                                    <option value="false">Tidak</option>
                                                </select>
                                            ) : f.field_type === 'date' ? (
                                                <input
                                                    type="date"
                                                    value={editingFieldValue}
                                                    onChange={e => setEditingFieldValue(e.target.value)}
                                                    className="flex-1 text-xs border border-gray-300 dark:border-dark-border rounded px-2 py-1 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                                                />
                                            ) : f.field_type === 'textarea' ? (
                                                <textarea
                                                    value={editingFieldValue}
                                                    onChange={e => setEditingFieldValue(e.target.value)}
                                                    className="flex-1 text-xs border border-gray-300 dark:border-dark-border rounded px-2 py-1 bg-white dark:bg-dark-bg text-gray-900 dark:text-white h-16 resize-none"
                                                />
                                            ) : (
                                                <input
                                                    type={f.field_type === 'number' ? 'number' : 'text'}
                                                    value={editingFieldValue}
                                                    onChange={e => setEditingFieldValue(e.target.value)}
                                                    className="flex-1 text-xs border border-gray-300 dark:border-dark-border rounded px-2 py-1 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                                                    placeholder="Enter value..."
                                                />
                                            )}
                                            <button
                                                onClick={() => saveFieldValue(f)}
                                                disabled={savingField}
                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={cancelEditField}
                                                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-xs text-gray-700 dark:text-gray-300 text-right flex-1">
                                                {f.field_type === 'checkbox'
                                                    ? (f.value === 'true' ? '✓ Ya' : '✗ Tidak')
                                                    : (f.value || <span className="text-gray-300 dark:text-gray-600 italic">—</span>)
                                                }
                                            </span>
                                            <button
                                                onClick={() => startEditField(f)}
                                                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </MemoizedSectionItem>
                )}

                {/* GENERATE Q&A */}
                <div className="border-b border-gray-100 dark:border-dark-border">
                    <button
                        onClick={() => setIsGenerateQAOpen(true)}
                        className="w-full py-4 px-5 flex items-center justify-between bg-white dark:bg-dark-surface hover:bg-gray-50 transition-colors"
                    >
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Generate Q&A</span>
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                    </button>
                    {/* Modal rendered at root of component tree */}
                </div>

                {/* AI AUTOPILOT */}
                <div className="border-b border-gray-100 dark:border-dark-border">
                    <div className="w-full py-4 px-5 flex items-center justify-between bg-white dark:bg-dark-surface">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">AI Autopilot</span>
                        <button
                            onClick={onToggleBot}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${conversation.is_chatbot_active ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-600'}`}
                        >
                            <span className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0" style={{ transform: conversation.is_chatbot_active ? 'translateX(16px)' : 'translateX(0)' }} />
                        </button>
                    </div>
                </div>

                {/* RATING HISTORY */}
                <MemoizedSectionItem title="Rating / Rating History" isOpen={openSections.rating} onToggle={() => toggleSection('rating')}>
                    {(conversation.rating_score || ratingHistory.length > 0) ? (
                        <div>
                            {conversation.rating_score && (
                                <div className="bg-white dark:bg-dark-bg border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Latest Rating</p>
                                    <div className="flex items-center gap-1 mb-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star key={star} className={`w-4 h-4 ${star <= conversation.rating_score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                                        "{conversation.rating_feedback || "No feedback"}"
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                {ratingHistory.map((r) => (
                                    <div key={r.id} className="bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-dark-border rounded p-2 text-xs">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star key={star} className={`w-3 h-3 ${star <= r.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                                ))}
                                            </div>
                                            <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {r.feedback && <p className="text-gray-600 dark:text-gray-400 line-clamp-2">"{r.feedback}"</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic">No ratings yet.</p>
                    )}
                </MemoizedSectionItem>

                {/* DELETE BUTTON (At bottom of list) */}
                <div className="mt-6 px-5 mb-5">
                    <button
                        onClick={handleDelete}
                        className="w-full flex items-center justify-center gap-2 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-bold transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Conversation
                    </button>
                </div>

            </div>

            {/* MODALS */}
            <GenerateQAModal
                isOpen={isGenerateQAOpen}
                onClose={() => setIsGenerateQAOpen(false)}
                conversationId={conversation.id}
                deviceId={conversation.gateway_session_id}
                deviceName={conversation.device_name}
            />
        </div>
    );
}
