import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Megaphone, Upload, Users, FileText, Clock, Shuffle, Image as ImageIcon, CheckCircle, Play, AlertTriangle, Smartphone, Tag, X, Loader2, Zap, ShieldCheck, AlertOctagon, LayoutTemplate, FileSpreadsheet, Download, RefreshCw, Search, CheckSquare, Square, Receipt, ChevronDown, ChevronUp, Link2, Bot, Mail
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { getApiUrl } from '../../config/api';

const StepIndicator = ({ current, step, title }) => {
    const isActive = current === step;
    const isCompleted = current > step;
    return (
        <div className="flex items-center flex-1 last:flex-none">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500 shadow-sm ${isActive ? 'bg-indigo-600 text-white shadow-indigo-500/30 scale-110 ring-4 ring-indigo-50 dark:ring-indigo-900/30' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500'}`}>
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : step}
            </div>
            <span className={`ml-3 text-sm font-bold transition-colors duration-300 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : isCompleted ? 'text-green-600 dark:text-green-500' : 'text-gray-400 dark:text-slate-500'}`}>{title}</span>
            {step < 3 && <div className={`flex-1 h-1.5 mx-4 rounded-full transition-colors duration-500 ${isCompleted ? 'bg-green-500' : 'bg-gray-100 dark:bg-slate-800'}`}></div>}
        </div>
    );
};

// Accordion Section Component
function AccordionSection({ title, icon: Icon, children, defaultOpen = false, badge }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon className="w-5 h-5 text-indigo-600" />}
                    <span className="font-bold text-gray-800">{title}</span>
                    {badge && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs rounded-full font-medium">
                            {badge}
                        </span>
                    )}
                </div>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </button>
            {isOpen && (
                <div className="p-4 border-t border-gray-100">
                    {children}
                </div>
            )}
        </div>
    );
}

const getSpintaxPreview = (text) => {
    if (!text) return "";
    const regex = /\{([^{}]+)\}|\[([^[\]]+)\]/g;
    return text.replace(regex, (match, p1, p2) => {
        const choicesStr = p1 || p2;
        const choices = choicesStr.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
};

const MobilePreview = ({ message, media }) => {
    const [previewText, setPreviewText] = useState(message);

    useEffect(() => {
        const interval = setInterval(() => {
            setPreviewText(getSpintaxPreview(message));
        }, 3000);
        return () => clearInterval(interval);
    }, [message]);

    const displayMedia = media ? (typeof media === 'string' ? (media.startsWith('http') || media.startsWith('data:') ? media : getApiUrl(media)) : URL.createObjectURL(media)) : null;

    return (
        <div className="w-[280px] h-[580px] bg-slate-900 rounded-[40px] p-3 border-[8px] border-slate-800 shadow-2xl relative mx-auto overflow-hidden ring-1 ring-white/10">
            {/* Dynamic Island / Notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-7 bg-slate-800 rounded-b-3xl z-20"></div>
            
            {/* Screen Content */}
            <div className="w-full h-full bg-[#f0f2f5] dark:bg-[#0b141a] rounded-[28px] overflow-hidden flex flex-col font-sans relative">
                
                {/* Header */}
                <div className="bg-[#008069] dark:bg-[#202c33] h-16 flex items-center px-4 text-white z-10 shadow-sm pt-4">
                    <div className="w-8 h-8 bg-white/20 rounded-full mr-3 flex-shrink-0"></div>
                    <div className="flex-1">
                        <div className="text-[13px] font-semibold tracking-wide">My Brand</div>
                        <div className="text-[10px] opacity-90 font-light">online</div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 relative bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center">
                    {/* Chat Bubble */}
                    <div className="bg-white dark:bg-[#202c33] p-2 rounded-xl rounded-tl-none shadow-sm max-w-[95%] mb-2 text-[13px] text-gray-800 dark:text-gray-100 relative backdrop-blur-md">
                        {displayMedia && (
                            <div className="mb-2 rounded-lg overflow-hidden">
                                <img src={displayMedia} alt="Attachment" className="w-full h-auto object-cover max-h-36" />
                            </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{previewText || "Type message to preview..."}</p>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 block text-right mt-1 font-medium">12:00 PM</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DRAFT_KEY = 'broadcast_draft_v2';

export default function CreateCampaign() {
    const navigate = useNavigate();
    const location = useLocation();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);

    // Resources
    const [rotatorGroups, setRotatorGroups] = useState([]);
    const [devices, setDevices] = useState([]);
    const [quickReplies, setQuickReplies] = useState([]);
    const [metaTemplates, setMetaTemplates] = useState([]);
    const [labels, setLabels] = useState([]);
    const [chatFlows, setChatFlows] = useState([]);
    const [agents, setAgents] = useState([]);

    // Group Fetching
    const [deviceGroups, setDeviceGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [groupSearch, setGroupSearch] = useState('');

    // Configuration State
    const [campaignName, setCampaignName] = useState('');
    const [broadcastType, setBroadcastType] = useState('personal');
    const [senderType, setSenderType] = useState('rotator');
    const [selectedRotator, setSelectedRotator] = useState('');
    const [selectedDevice, setSelectedDevice] = useState('');
    const [isOfficialDevice, setIsOfficialDevice] = useState(false);

    // Content State
    const [message, setMessage] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [selectedQuickReply, setSelectedQuickReply] = useState('');

    // Official Template State
    const [selectedMetaTemplate, setSelectedMetaTemplate] = useState(null);
    const [templateParams, setTemplateParams] = useState({});
    const [templateMediaUrl, setTemplateMediaUrl] = useState(null);

    // Tracking & Unsubscribe
    const [disableLinkTracking, setDisableLinkTracking] = useState(true);
    const [includeUnsubscribe, setIncludeUnsubscribe] = useState(false);
    const [showInHistory, setShowInHistory] = useState(false);
    const [selectedFlow, setSelectedFlow] = useState('');
    const [assignedAgentId, setAssignedAgentId] = useState('');

    // Targeting State
    const [targetType, setTargetType] = useState('all');
    const [targetValue, setTargetValue] = useState('');
    const [selectedLabels, setSelectedLabels] = useState([]);
    const [targetFile, setTargetFile] = useState(null);
    const [targetCountDisplay, setTargetCountDisplay] = useState(0);
    const [targetCount, setTargetCount] = useState(0);
    const [totalContacts, setTotalContacts] = useState(0);
    const [labelCounts, setLabelCounts] = useState({});

    // Device-based targeting State (NEW)
    const [deviceCounts, setDeviceCounts] = useState([]);
    const [selectedDevices, setSelectedDevices] = useState([]);

    // Advanced Segmentation State
    const [segmentLeadStatus, setSegmentLeadStatus] = useState('');
    const [segmentMinScore, setSegmentMinScore] = useState('');
    const [segmentLastChat, setSegmentLastChat] = useState('');
    const [segmentLabelId, setSegmentLabelId] = useState('');
    const [segmentSubscribedOnly, setSegmentSubscribedOnly] = useState(false);
    const [segmentHasConversation, setSegmentHasConversation] = useState(false);
    const [segmentHasPhone, setSegmentHasPhone] = useState(true);
    const [segmentEstimatedCount, setSegmentEstimatedCount] = useState(0);
    const [segmentCountLoading, setSegmentCountLoading] = useState(false);

    // Special Mode
    const [isInvoiceMode, setIsInvoiceMode] = useState(false);

    // Delay Settings State
    const [antiBanMode, setAntiBanMode] = useState('safe');
    const [delaySettings, setDelaySettings] = useState({
        batchEnabled: true,
        batchSize: 10,
        batchMin: 30,
        msgEnabled: true,
        msgMin: 60,
        msgMax: 120,
        gradualEnabled: false,
        gradualStart: 100,
        gradualInc: 100
    });

    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduleAt, setScheduleAt] = useState('');

    // Recurring Settings
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState('daily');

    // Telegram Bot Reporting State
    const [enableTelegramReport, setEnableTelegramReport] = useState(true);
    const [useGlobalTelegram, setUseGlobalTelegram] = useState(true);
    const [customTelegramChatId, setCustomTelegramChatId] = useState('');

    // Email Reporting State
    const [enableEmailReport, setEnableEmailReport] = useState(false);
    const [useGlobalEmail, setUseGlobalEmail] = useState(true);
    const [customEmailRecipient, setCustomEmailRecipient] = useState('');

    // Load draft on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                // Only restore if draft is less than 24 hours old
                if (draft.timestamp && Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
                    if (draft.campaignName) setCampaignName(draft.campaignName);
                    if (draft.broadcastType) setBroadcastType(draft.broadcastType);
                    if (draft.senderType) setSenderType(draft.senderType);
                    if (draft.selectedRotator) setSelectedRotator(draft.selectedRotator);
                    if (draft.selectedDevice) setSelectedDevice(draft.selectedDevice);
                    if (draft.message) setMessage(draft.message);
                    if (draft.targetType) setTargetType(draft.targetType);
                    if (draft.selectedLabels) setSelectedLabels(draft.selectedLabels);
                    if (draft.selectedMetaTemplate) setSelectedMetaTemplate(draft.selectedMetaTemplate);
                    if (draft.templateParams) setTemplateParams(draft.templateParams);
                    if (draft.templateMediaUrl) setTemplateMediaUrl(draft.templateMediaUrl);
                    if (draft.selectedQuickReply) setSelectedQuickReply(draft.selectedQuickReply);
                    if (draft.disableLinkTracking !== undefined) setDisableLinkTracking(draft.disableLinkTracking);
                    if (draft.includeUnsubscribe !== undefined) setIncludeUnsubscribe(draft.includeUnsubscribe);
                    if (draft.showInHistory !== undefined) setShowInHistory(draft.showInHistory);
                    if (draft.selectedFlow) setSelectedFlow(draft.selectedFlow);
                    if (draft.assignedAgentId) setAssignedAgentId(draft.assignedAgentId);
                    if (draft.antiBanMode) setAntiBanMode(draft.antiBanMode);
                    if (draft.delaySettings) setDelaySettings(draft.delaySettings);
                    if (draft.isScheduled) { setIsScheduled(true); setScheduleAt(draft.scheduleAt); }
                    if (draft.isRecurring) { setIsRecurring(true); setRecurrenceType(draft.recurrenceType); }
                    if (draft.step) setStep(draft.step);
                    setLastSaved(new Date(draft.timestamp));
                    toast.success('Draft restored from previous session', { icon: '📝', duration: 3000 });
                } else {
                    localStorage.removeItem(DRAFT_KEY);
                }
            } catch (e) {
                console.error('Failed to restore draft:', e);
                localStorage.removeItem(DRAFT_KEY);
            }
        }
    }, []);

    // Auto-save draft every 2 seconds when there are changes
    useEffect(() => {
        const saveTimer = setTimeout(() => {
            const draft = {
                timestamp: Date.now(),
                campaignName,
                broadcastType,
                senderType,
                selectedRotator,
                selectedDevice,
                message,
                targetType,
                selectedLabels,
                selectedMetaTemplate,
                templateParams,
                templateMediaUrl,
                selectedQuickReply,
                disableLinkTracking,
                includeUnsubscribe,
                showInHistory,
                selectedFlow,
                assignedAgentId,
                antiBanMode,
                delaySettings,
                isScheduled,
                scheduleAt,
                isRecurring,
                recurrenceType,
                step
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            setLastSaved(new Date());
        }, 2000);
        return () => clearTimeout(saveTimer);
    }, [campaignName, broadcastType, senderType, selectedRotator, selectedDevice, message, targetType, selectedLabels, selectedMetaTemplate, templateParams, templateMediaUrl, selectedQuickReply, disableLinkTracking, includeUnsubscribe, showInHistory, selectedFlow, assignedAgentId, antiBanMode, delaySettings, isScheduled, scheduleAt, isRecurring, recurrenceType, step]);

    // Clear draft after successful submit
    const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

    useEffect(() => {
        fetchResources();
    }, []);

    // --- AUTO FILL FROM NAVIGATION STATE (e.g. Invoice) ---
    useEffect(() => {
        if (location.state) {
            const { targetType: type, targetValue: val, messageTemplate } = location.state;

            if (type === 'invoice_batch') {
                setIsInvoiceMode(true);
                setCampaignName(`Invoice Broadcast ${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}`);
                setBroadcastType('personal');
                setTargetType('invoice_batch');
                setTargetValue(val); // Batch ID
                setMessage(messageTemplate);

                // Set reasonable defaults for invoicing (usually safe)
                setAntiBanMode('safe');
                setSenderType('rotator');
            }
        }
    }, [location.state]);

    // Check if selected device is official
    useEffect(() => {
        if (senderType === 'device' && selectedDevice) {
            const dev = devices.find(d => String(d.id) === String(selectedDevice));
            if (dev && (dev.type === 'official' || dev.channel === 'wa_coex')) {
                setIsOfficialDevice(true);
            } else {
                setIsOfficialDevice(false);
            }
        } else {
            setIsOfficialDevice(false);
        }
    }, [selectedDevice, senderType, devices]);

    // Effect: Calculate Target Count based on type
    useEffect(() => {
        if (broadcastType === 'group') {
            setTargetCount(selectedGroups.length);
        } else if (isInvoiceMode) {
            // For invoice batch, assume count > 0 to pass checks (actual count is in batch)
            setTargetCount(100);
        } else {
            if (targetType === 'label') calculateLabelCount();
            if (targetType === 'all') setTargetCount(totalContacts);
            if (targetType === 'device') {
                const total = selectedDevices.reduce((acc, devId) => {
                    const dev = deviceCounts.find(d => d.device_id === devId);
                    return acc + (dev ? parseInt(dev.contact_count) : 0);
                }, 0);
                setTargetCount(total);
            }
        }
    }, [selectedLabels, targetType, totalContacts, labelCounts, selectedGroups, broadcastType, isInvoiceMode, selectedDevices, deviceCounts]);

    // Effect: Reset/Set Defaults when switching Broadcast Type
    useEffect(() => {
        if (isInvoiceMode) return; // Don't reset settings if in Invoice Mode

        if (broadcastType === 'group') {
            setSenderType('device');
            setTargetType('group');
            setDelaySettings({
                msgEnabled: true, msgMin: 60, msgMax: 120,
                batchEnabled: true, batchSize: 10, batchMin: 60, batchMax: 120,
                gradualEnabled: false, gradualStart: 100, gradualInc: 100
            });
            setAntiBanMode('manual');
        } else {
            // Reset to Personal Defaults
            setSenderType('rotator');
            setTargetType('label');
            setDelaySettings({
                msgEnabled: true, msgMin: 60, msgMax: 120,
                batchEnabled: true, batchSize: 10, batchMin: 30, batchMax: 60,
                gradualEnabled: false, gradualStart: 100, gradualInc: 100
            });
            setAntiBanMode('safe');
        }
    }, [broadcastType, isInvoiceMode]);

    // Effect: Clear Groups when Device Changes (Prevent Mismatch)
    useEffect(() => {
        if (broadcastType === 'group') {
            setSelectedGroups([]);
            setDeviceGroups([]);
        }
    }, [selectedDevice, broadcastType]);

    const fetchResources = async () => {
        try {
            const [rotRes, devRes, contactRes, qrRes, lblRes, dashRes, metaRes, flowRes, teamRes, deviceCountRes] = await Promise.all([
                axios.get('/api/app/broadcast/groups'),
                axios.get('/api/app/devices?exclude_status=terblokir'),
                axios.get('/api/app/contacts?limit=1'),
                axios.get('/api/app/quick-replies?type=broadcast'),
                axios.get('/api/app/labels'),
                axios.get('/api/app/dashboard'),
                axios.get('/api/app/meta/templates'),
                axios.get('/api/app/flows').catch(() => ({ data: [] })),
                axios.get('/api/app/team'),
                axios.get('/api/app/contacts/device-counts').catch(() => ({ data: [] }))
            ]);
            setRotatorGroups(rotRes.data);
            setDevices(devRes.data || []);
            setQuickReplies(qrRes.data);
            setLabels(lblRes.data);
            const lCounts = {};
            lblRes.data.forEach(l => lCounts[l.id] = parseInt(l.contact_count));
            setLabelCounts(lCounts);

            setMetaTemplates(metaRes.data || []);
            setChatFlows(flowRes.data || []);
            setAgents(teamRes.data || []);
            setDeviceCounts(deviceCountRes.data || []);

            if (rotRes.data.length > 0) setSelectedRotator(rotRes.data[0].id);

            const connectedDevs = devRes.data.filter(d =>
                d.status?.toLowerCase() === 'connected'
            );

            if (connectedDevs.length > 0) setSelectedDevice(connectedDevs[0].id);

            setTotalContacts(contactRes.data.meta?.total || 0);
        } catch (err) {
            console.error(err);
        }
    };

    const refreshSegmentCount = async () => {
        setSegmentCountLoading(true);
        try {
            const params = {};
            if (segmentLeadStatus) params.lead_status = segmentLeadStatus;
            if (segmentMinScore) params.min_score = segmentMinScore;
            if (segmentLastChat) params.active_days = segmentLastChat;
            if (segmentLabelId) params.label_id = segmentLabelId;
            if (segmentSubscribedOnly) params.subscribed = 'true';
            if (segmentHasConversation) params.has_conversation = 'true';
            if (segmentHasPhone) params.has_phone = 'true';
            const res = await axios.get('/api/app/contacts/segment-count', { params });
            setSegmentEstimatedCount(res.data.count || 0);
            setTargetCount(res.data.count || 0);
        } catch {
            setSegmentEstimatedCount(0);
        } finally {
            setSegmentCountLoading(false);
        }
    };

    const fetchDeviceGroups = async () => {
        if (!selectedDevice) return toast.error("Mohon pilih perangkat terlebih dahulu");
        setLoadingGroups(true);
        setDeviceGroups([]);
        try {
            const res = await axios.get(`/api/app/broadcast/device/${selectedDevice}/groups`);
            setDeviceGroups(res.data);
            toast.success(`Ditemukan ${res.data.length} grup`);
        } catch (err) {
            toast.error("Gagal mengambil data grup. Pastikan perangkat terhubung.");
        } finally {
            setLoadingGroups(false);
        }
    };

    // --- HANDLERS ---

    const handleQuickReplySelect = (e) => {
        const id = e.target.value;
        setSelectedQuickReply(id);
        if (id) {
            const template = quickReplies.find(t => String(t.id) === String(id));
            if (template) {
                setMessage(template.content);
                // Ensure meta template selection is cleared so UI knows it's a normal message
                setSelectedMetaTemplate(null);
                setTemplateMediaUrl(template.media_url || null);
            }
        }
    };

    const handleMetaTemplateSelect = (e) => {
        const id = e.target.value;
        const t = metaTemplates.find(x => String(x.id) === String(id));
        setSelectedMetaTemplate(t);

        const bodyComp = t?.components.find(c => c.type === 'BODY');
        setMessage(bodyComp ? bodyComp.text : '');

        const headerComp = t?.components.find(c => c.type === 'HEADER');
        if (headerComp?.example?.header_handle?.[0]) {
            setTemplateMediaUrl(headerComp.example.header_handle[0]);
        } else if (headerComp?.example?.header_url?.[0]) {
            setTemplateMediaUrl(headerComp.example.header_url[0]);
        } else {
            setTemplateMediaUrl(null);
        }

        setTemplateParams({});
    };

    const getBodyText = (components) => {
        const body = components.find(c => c.type === 'BODY');
        return body ? body.text : '';
    };

    const handleParamChange = (index, value) => {
        setTemplateParams(prev => ({ ...prev, [index]: value }));
    };

    const getProcessedTemplateMessage = () => {
        if (!selectedMetaTemplate) return '';
        let text = getBodyText(selectedMetaTemplate.components);
        Object.keys(templateParams).forEach(key => {
            text = text.replace(`{{${key}}}`, templateParams[key]);
        });
        return text;
    }

    async function handleSubmit() {
        setLoading(true);
        const formData = new FormData();
        formData.append('name', campaignName);

        if (isOfficialDevice) {
            const templatePayload = {
                name: selectedMetaTemplate.name,
                language: { code: selectedMetaTemplate.language },
                components: [
                    {
                        type: 'body',
                        parameters: Object.keys(templateParams).map(k => ({
                            type: 'text',
                            text: templateParams[k]
                        }))
                    }
                ]
            };
            formData.append('message', JSON.stringify(templatePayload));
        } else {
            formData.append('message', message);
        }

        if (senderType === 'rotator') {
            formData.append('rotatorGroupId', selectedRotator);
        } else {
            formData.append('deviceId', selectedDevice);
        }

        // FIX: Determine Correct Target Type
        let finalTargetType = targetType;
        if (broadcastType === 'group') {
            finalTargetType = 'group';
            formData.append('targetValue', JSON.stringify(selectedGroups.map(g => ({ id: g.id, name: g.subject }))));
        } else if (isInvoiceMode) {
            finalTargetType = 'invoice_batch';
            formData.append('targetValue', targetValue); // Use the batch_id from state
        } else if (targetType === 'label') {
            formData.append('targetValue', JSON.stringify(selectedLabels));
        } else if (targetType === 'device') {
            // Pass device_ids as targetValue
            formData.append('targetValue', JSON.stringify(selectedDevices));
        } else if (targetType === 'segmented') {
            // Pass segment filters as targetValue
            const seg = {};
            if (segmentLeadStatus) seg.lead_status = segmentLeadStatus;
            if (segmentMinScore) seg.min_score = parseInt(segmentMinScore);
            if (segmentLastChat) seg.active_days = parseInt(segmentLastChat);
            if (segmentLabelId) seg.label_id = parseInt(segmentLabelId);
            if (segmentSubscribedOnly) seg.subscribed = true;
            if (segmentHasConversation) seg.has_conversation = true;
            if (segmentHasPhone) seg.has_phone = true;
            formData.append('targetValue', JSON.stringify(seg));
        }

        formData.append('targetType', finalTargetType);

        if (targetType === 'file' && targetFile) {
            formData.append('file', targetFile);
        }

        if (mediaFile) {
            formData.append('media', mediaFile);
        } else if (templateMediaUrl) {
            formData.append('mediaUrl', templateMediaUrl);
        }
        
        if (isScheduled && scheduleAt) formData.append('scheduleAt', scheduleAt);
        if (isRecurring) {
            formData.append('isRecurring', 'true');
            formData.append('recurrenceType', recurrenceType);
        }

        // Process delay settings - ensure all values are in seconds for backend
        const processedDelaySettings = { ...delaySettings };

        // Convert batchMin/batchMax from selected unit to seconds
        let batchMultiplier = 1;
        if (processedDelaySettings.batchUnit === 'minutes') batchMultiplier = 60;
        else if (processedDelaySettings.batchUnit === 'hours') batchMultiplier = 3600;

        processedDelaySettings.batchMin = (parseInt(processedDelaySettings.batchMin) || 0) * batchMultiplier;
        processedDelaySettings.batchMax = (parseInt(processedDelaySettings.batchMax) || processedDelaySettings.batchMin) * batchMultiplier;
        // Remove batchUnit as backend expects raw seconds
        delete processedDelaySettings.batchUnit;

        // Ensure msgMin/msgMax are always in seconds (no unit conversion needed as default is seconds)
        processedDelaySettings.msgMin = parseInt(processedDelaySettings.msgMin) || 60;
        processedDelaySettings.msgMax = parseInt(processedDelaySettings.msgMax) || 120;

        formData.append('delaySettings', JSON.stringify(processedDelaySettings));
        formData.append('disableLinkTracking', disableLinkTracking);
        formData.append('includeUnsubscribe', includeUnsubscribe);
        formData.append('showInHistory', showInHistory);
        if (assignedAgentId) {
            formData.append('assignedAgentId', assignedAgentId);
        }
        if (selectedFlow) {
            formData.append('flowId', selectedFlow);
        }

        // Telegram Bot Reporting Settings
        formData.append('telegramSettings', JSON.stringify({
            enabled: enableTelegramReport,
            useGlobal: useGlobalTelegram,
            chatId: useGlobalTelegram ? '' : customTelegramChatId.trim()
        }));

        // Email Reporting Settings
        formData.append('emailSettings', JSON.stringify({
            enabled: enableEmailReport,
            useGlobal: useGlobalEmail,
            emailRecipient: useGlobalEmail ? '' : customEmailRecipient.trim()
        }));

        try {
            await axios.post('/api/app/broadcast/create', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            clearDraft(); // Clear draft after successful submit
            toast.success('Kampanye berhasil diluncurkan!');
            navigate('../reports');
        } catch (err) {
            toast.error('Gagal: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }

    function handleMediaChange(e) {
        if (e.target.files && e.target.files[0]) setMediaFile(e.target.files[0]);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDropMedia(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setMediaFile(e.dataTransfer.files[0]);
        }
    }

    function handleDropTargetFile(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processTargetFile(e.dataTransfer.files[0]);
        }
    }

    function handleTargetFileChange(e) {
        if (e.target.files && e.target.files[0]) {
            processTargetFile(e.target.files[0]);
        }
    }

    function processTargetFile(file) {
        setTargetFile(file);
        setTargetCountDisplay('Parsing...');

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const arrayBuffer = evt.target.result;
                const wb = XLSX.read(arrayBuffer, { type: 'array' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Read as array of arrays (header: 1) to handle both header and headerless files
                const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

                if (!rawData || rawData.length === 0) {
                    throw new Error("File appears to be empty");
                }

                // Header Detection
                const firstRow = rawData[0];
                const headerMap = {};
                let hasHeader = false;

                if (Array.isArray(firstRow)) {
                    firstRow.forEach((cell, index) => {
                        if (typeof cell === 'string') {
                            const val = cell.toLowerCase().trim();
                            if (['phone', 'mobile', 'no hp', 'wa', 'number'].includes(val)) {
                                headerMap['phone'] = index;
                                hasHeader = true;
                            }
                            if (['name', 'nama', 'contact'].includes(val)) {
                                headerMap['name'] = index;
                            }
                        }
                    });
                }

                // Fallback: If no header detected, assume col 0 is phone, col 1 is name
                if (!hasHeader) {
                    headerMap['phone'] = 0;
                    headerMap['name'] = 1;
                }

                const validRows = rawData.slice(hasHeader ? 1 : 0).map(row => {
                    // Safe access in case row is shorter than expected
                    const rawPhone = row[headerMap['phone']];
                    const rawName = row[headerMap['name']];

                    if (!rawPhone) return null;

                    // Basic cleanup for valid count estimation
                    const phoneStr = String(rawPhone).replace(/[^0-9]/g, '');
                    if (phoneStr.length < 5) return null;

                    return { phone: phoneStr, name: rawName };
                }).filter(r => r !== null);

                setTargetCount(validRows.length);
                setTargetCountDisplay(validRows.length);

                if (validRows.length === 0) {
                    toast.error("No valid contacts found. Please check file format.");
                }

            } catch (err) {
                console.error("Parse Error", err);
                setTargetCount(0);
                setTargetCountDisplay("Error");
                toast.error("Gagal membaca file. Pastikan format Excel/CSV/TXT valid.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    function calculateLabelCount() {
        const total = selectedLabels.reduce((acc, labelId) => {
            return acc + (labelCounts[labelId] || 0);
        }, 0);
        setTargetCount(total);
    };

    const toggleDeviceSelection = (deviceId) => {
        setSelectedDevices(prev => {
            if (prev.includes(deviceId)) {
                return prev.filter(id => id !== deviceId);
            }
            return [...prev, deviceId];
        });
    };

    const toggleGroupSelection = (group) => {
        setSelectedGroups(prev => {
            const exists = prev.find(g => g.id === group.id);
            if (exists) return prev.filter(g => g.id !== group.id);
            return [...prev, group];
        });
    };

    const filteredGroups = deviceGroups.filter(g => g.subject.toLowerCase().includes(groupSearch.toLowerCase()));

    const handleSelectAllGroups = () => {
        if (selectedGroups.length === filteredGroups.length) {
            setSelectedGroups([]);
        } else {
            setSelectedGroups(filteredGroups);
        }
    };


    const insertVariable = (v) => setMessage(prev => prev + ` ${v} `);

    const validDevicesForDropdown = devices.filter(d =>
        d.status?.toLowerCase() === 'connected'
    );

    const handleDownloadTemplate = () => {
        const csvContent = "Name,Phone\nBudi Santoso,62812345678\nSiti Aminah,081298765432";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "template_broadcast.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const validateSpintax = (text) => {
        if (!text) return true;
        let depth = 0;
        for (let char of text) {
            if (char === '{') depth++;
            else if (char === '}') depth--;
            if (depth < 0) return false;
        }
        return depth === 0;
    };

    const isSpintaxValid = validateSpintax(message);
    const previewMessage = isOfficialDevice
        ? getProcessedTemplateMessage()
        : message
            .replace(/\{name\}/g, 'Budi')
            .replace(/\{amount\}/g, '150.000')
            .replace(/\{due_date\}/g, '20/05/2025');

    return (
        <div className="flex h-full">
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="mb-8">
                    <div className="flex justify-between items-center px-4 mb-6">
                        <StepIndicator current={step} step={1} title="Setup" />
                        <StepIndicator current={step} step={2} title="Content" />
                        <StepIndicator current={step} step={3} title="Targeting" />
                    </div>
                    {/* Auto-save indicator */}
                    {lastSaved && (
                        <div className="px-4 flex items-center gap-2 text-xs text-gray-400">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Draft saved {lastSaved.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            <button
                                onClick={() => {
                                    if (confirm('Clear saved draft?')) {
                                        clearDraft();
                                        setLastSaved(null);
                                        toast.success('Draft cleared');
                                    }
                                }}
                                className="ml-2 text-gray-400 hover:text-red-500 underline"
                            >
                                Clear draft
                            </button>
                        </div>
                    )}
                </div>

                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-600" /> Campaign Setup
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                                    <input
                                        type="text"
                                        value={campaignName}
                                        onChange={e => setCampaignName(e.target.value)}
                                        maxLength={100}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. Promo Ramadhan 2024"
                                    />
                                </div>

                                {/* Broadcast Type Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Broadcast Type</label>
                                    <div className="flex gap-4 mb-4">
                                        <label className={`flex-1 p-4 border rounded-lg cursor-pointer transition-all ${broadcastType === 'personal' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-200' : 'hover:bg-gray-50'} ${isInvoiceMode ? 'opacity-60 pointer-events-none cursor-not-allowed bg-gray-50 border-gray-200' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <input type="radio" name="btype" value="personal" checked={broadcastType === 'personal'} onChange={() => setBroadcastType('personal')} className="w-4 h-4 text-indigo-600" disabled={isInvoiceMode} />
                                                <Users className="w-6 h-6 text-indigo-600" />
                                                <div>
                                                    <span className="block font-bold text-gray-800">Personal (Contact)</span>
                                                    <span className="block text-xs text-gray-500">Send to individual numbers</span>
                                                </div>
                                            </div>
                                        </label>
                                        <label className={`flex-1 p-4 border rounded-lg cursor-pointer transition-all ${broadcastType === 'group' ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-200' : 'hover:bg-gray-50'} ${isInvoiceMode ? 'opacity-60 pointer-events-none cursor-not-allowed bg-gray-50 border-gray-200' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <input type="radio" name="btype" value="group" checked={broadcastType === 'group'} onChange={() => setBroadcastType('group')} className="w-4 h-4 text-indigo-600" disabled={isInvoiceMode} />
                                                <Users className="w-6 h-6 text-green-600" />
                                                <div>
                                                    <span className="block font-bold text-gray-800">Community (Group)</span>
                                                    <span className="block text-xs text-gray-500">Send to WhatsApp Groups</span>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                    {isInvoiceMode && (
                                        <p className="text-xs text-indigo-600 mt-1 font-bold">Locked to Personal mode for Invoice Broadcast.</p>
                                    )}
                                </div>

                                {broadcastType === 'personal' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Sender Configuration</label>
                                        <div className="flex gap-4 mb-3">
                                            <label className={`flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg w-1/2 hover:bg-gray-50 ${senderType === 'rotator' ? 'bg-indigo-50 border-indigo-200' : ''}`}>
                                                <input type="radio" name="sender" value="rotator" checked={senderType === 'rotator'} onChange={() => setSenderType('rotator')} className="text-indigo-600" />
                                                <span className="text-sm font-bold text-gray-800">Rotator Group</span>
                                            </label>
                                            <label className={`flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg w-1/2 hover:bg-gray-50 ${senderType === 'device' ? 'bg-indigo-50 border-indigo-200' : ''}`}>
                                                <input type="radio" name="sender" value="device" checked={senderType === 'device'} onChange={() => setSenderType('device')} className="text-indigo-600" />
                                                <span className="text-sm font-bold text-gray-800">Single Device</span>
                                            </label>
                                        </div>

                                        {senderType === 'rotator' ? (
                                            <select value={selectedRotator} onChange={e => setSelectedRotator(e.target.value)} className="w-full border p-2 rounded-lg text-sm">
                                                <option value="">-- Select Rotator Group --</option>
                                                {rotatorGroups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.device_count} devices)</option>)}
                                            </select>
                                        ) : (
                                            <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)} className="w-full border p-2 rounded-lg text-sm">
                                                <option value="">-- Select Device --</option>
                                                {validDevicesForDropdown.map(d => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.name} - {d.whatsapp_number} {d.type === 'official' ? '(Official)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                {broadcastType === 'group' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sender Device</label>
                                        <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)} className="w-full border p-2 rounded-lg text-sm">
                                            <option value="">-- Select Device (Must join groups) --</option>
                                            {validDevicesForDropdown.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name} - {d.whatsapp_number}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-gray-500 mt-1">For group broadcast, you must select one specific device that is a member/admin of the target groups.</p>
                                    </div>
                                )}

                                {isOfficialDevice && (
                                    <div className="mt-2 bg-green-50 text-green-800 text-xs p-2 rounded flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> Official API Selected. Template messaging required.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-slate-800">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!campaignName || (senderType === 'rotator' && !selectedRotator) || (senderType === 'device' && !selectedDevice)}
                                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                Lanjut ke Target <ChevronDown className="w-5 h-5 -rotate-90" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-indigo-600" /> Message Content
                            </h3>

                            {isOfficialDevice ? (
                                // OFFICIAL TEMPLATE SELECTOR
                                <div className="space-y-4">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800 mb-2">
                                        <LayoutTemplate className="w-4 h-4 inline mr-2" />
                                        Official API requires pre-approved templates.
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Select Template</label>
                                        <select
                                            className="w-full border p-2 rounded-lg"
                                            onChange={handleMetaTemplateSelect}
                                        >
                                            <option value="">-- Select Official Template --</option>
                                            {metaTemplates
                                                .filter(t => {
                                                    const dev = devices.find(d => String(d.id) === String(selectedDevice));
                                                    return dev && t.waba_id === dev.waba_id;
                                                })
                                                .map(t => (
                                                    <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                                                ))}
                                        </select>
                                    </div>

                                    {selectedMetaTemplate && (
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            <p className="text-sm font-mono text-gray-600 whitespace-pre-wrap mb-4">
                                                {getBodyText(selectedMetaTemplate.components)}
                                            </p>

                                            {/* Variable Mapping */}
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold uppercase text-gray-500">Map Variables</p>
                                                {/* Regex to find {{1}}, {{2}} etc */}
                                                {getBodyText(selectedMetaTemplate.components).match(/{{(\d+)}}/g)?.map((match, idx) => {
                                                    const num = match.replace(/{{|}}/g, '');
                                                    return (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <span className="text-xs bg-gray-200 px-2 py-1 rounded font-bold">{match}</span>
                                                            <span className="text-xs text-gray-400">maps to</span>
                                                            <select
                                                                className="border p-1 rounded text-sm flex-1"
                                                                onChange={e => handleParamChange(num, e.target.value)}
                                                            >
                                                                <option value="">-- Value --</option>
                                                                <option value="{name}">Contact Name</option>
                                                                <option value="{phone}">Phone Number</option>
                                                                <option value="custom">Custom Text...</option>
                                                            </select>
                                                            {templateParams[num] === 'custom' && (
                                                                <input
                                                                    className="border p-1 rounded text-sm flex-1"
                                                                    placeholder="Type text..."
                                                                    onChange={e => handleParamChange(num, e.target.value)}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {!getBodyText(selectedMetaTemplate.components).match(/{{(\d+)}}/g) && (
                                                    <p className="text-xs text-gray-400 italic">No variables in this template.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // STANDARD MESSAGE EDITOR
                                <div className="space-y-4">
                                    {/* Quick Reply Template Selector (Restored) */}
                                    <div className="flex justify-between items-end">
                                        <label className="block text-sm font-bold text-gray-700">Message Body</label>
                                        <select
                                            className="border p-1 rounded text-xs bg-gray-50 text-gray-600 cursor-pointer"
                                            value={selectedQuickReply}
                                            onChange={handleQuickReplySelect}
                                        >
                                            <option value="">Load Template...</option>
                                            {quickReplies.map(t => <option key={t.id} value={t.id}>{t.shortcut}</option>)}
                                        </select>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-300 rounded-lg overflow-hidden">
                                        <div className="flex gap-2 p-2 border-b bg-gray-100">
                                            {broadcastType !== 'group' && (
                                                <button onClick={() => insertVariable('{name}')} className="text-xs bg-white px-2 py-1 rounded border font-medium">{'{name}'}</button>
                                            )}
                                            <button onClick={() => insertVariable('{Halo|Hai|Salam}')} className="text-xs bg-white px-2 py-1 rounded border font-medium flex gap-1"><Shuffle className="w-3 h-3" /> Spintax</button>
                                        </div>
                                        <textarea
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            className={`w-full p-4 bg-transparent outline-none h-48 resize-none text-sm ${!isSpintaxValid ? 'text-red-600' : ''}`}
                                            placeholder="Type your message here..."
                                        />
                                        {!isSpintaxValid && (
                                            <div className="bg-red-50 text-red-600 p-2 text-xs font-bold border-t border-red-100 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Error: Kurung kurawal Spintax tidak tertutup dengan benar.
                                            </div>
                                        )}
                                        {isSpintaxValid && message.includes('{') && (
                                            <div className="bg-green-50 text-green-700 p-2 text-xs font-bold border-t border-green-100 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Spintax Valid
                                            </div>
                                        )}
                                    </div>

                                    {/* Drag & Drop Media Upload (Restored) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Attach Media (Optional)</label>
                                        <div
                                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer relative ${mediaFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:bg-gray-50'}`}
                                            onDragOver={handleDragOver}
                                            onDrop={handleDropMedia}
                                        >
                                            <input
                                                type="file"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                onChange={handleMediaChange}
                                                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                                            />
                                            <div className="flex flex-col items-center justify-center pointer-events-none">
                                                {mediaFile ? (
                                                    <>
                                                        <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                                                        <p className="text-sm font-bold text-green-800">{mediaFile.name}</p>
                                                        <p className="text-xs text-green-600">{(mediaFile.size / 1024).toFixed(1)} KB</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                                        <p className="text-sm text-gray-600 font-medium">Click or Drag file to upload</p>
                                                        <p className="text-xs text-gray-400 mt-1">Images, Videos, Documents</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {mediaFile && (
                                            <button onClick={() => setMediaFile(null)} className="text-xs text-red-500 hover:underline mt-1 block text-center w-full">Remove File</button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between pt-4">
                            <button onClick={() => setStep(1)} className="px-6 py-3 text-gray-600 dark:text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white transition-colors">Back</button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={(!message && !selectedMetaTemplate) || !isSpintaxValid}
                                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                Lanjut ke Jadwal <ChevronDown className="w-5 h-5 -rotate-90" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Header Summary Card */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Ready to Launch</h2>
                                    <p className="text-gray-600 mt-1">
                                        Sending <strong>"{campaignName}"</strong> via <strong>{isOfficialDevice ? 'Official API' : 'WhatsApp Web'}</strong>
                                    </p>
                                </div>
                                <div className="bg-white px-4 py-2 rounded-lg border border-indigo-100 shadow-sm text-center">
                                    <div className="text-2xl font-bold text-indigo-600">{targetCount}</div>
                                    <div className="text-xs text-gray-500">Recipients</div>
                                </div>
                            </div>
                        </div>

                        {/* Accordion Sections */}
                        <AccordionSection title="Target Audience" icon={Users} defaultOpen={true}>
                            {broadcastType === 'group' ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-gray-700">Select Groups</h4>
                                        <button onClick={fetchDeviceGroups} disabled={loadingGroups} className="text-xs flex items-center gap-1 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                                            <RefreshCw className={`w-3 h-3 ${loadingGroups ? 'animate-spin' : ''}`} /> Fetch
                                        </button>
                                    </div>
                                    {deviceGroups.length === 0 && !loadingGroups && (
                                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                                            <p>No groups loaded.</p>
                                            <button onClick={fetchDeviceGroups} className="text-indigo-600 underline text-sm">Fetch from Device</button>
                                        </div>
                                    )}
                                    {deviceGroups.length > 0 && (
                                        <>
                                            <div className="flex gap-2 mb-2">
                                                <div className="relative flex-1">
                                                    <Search className="w-4 h-4 absolute left-2 top-2 text-gray-400" />
                                                    <input className="w-full pl-8 p-1.5 text-sm border rounded" placeholder="Search groups..." value={groupSearch} onChange={e => setGroupSearch(e.target.value)} />
                                                </div>
                                                <button onClick={handleSelectAllGroups} className="px-3 py-1 text-xs border bg-white rounded hover:bg-gray-50">
                                                    {selectedGroups.length === filteredGroups.length ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar bg-white border rounded-lg">
                                                {filteredGroups.map(g => (
                                                    <div key={g.id} className="flex items-center gap-3 p-2 hover:bg-indigo-50 cursor-pointer border-b last:border-0" onClick={() => toggleGroupSelection(g)}>
                                                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedGroups.some(x => x.id === g.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                                            {selectedGroups.some(x => x.id === g.id) && <CheckSquare className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-gray-800">{g.subject}</p>
                                                            <p className="text-xs text-gray-400">{g.size} participants</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-right text-xs text-gray-500">{selectedGroups.length} groups selected</p>
                                        </>
                                    )}
                                </div>
                            ) : isInvoiceMode ? (
                                <div className="text-center py-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <Receipt className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                                    <h4 className="font-bold text-blue-800">Invoice Batch Mode</h4>
                                    <p className="text-sm text-blue-700">Batch ID: <span className="font-mono">{targetValue}</span></p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex gap-2 flex-wrap">
                                        <button onClick={() => setTargetType('all')} className={`flex-1 p-2 border rounded min-w-[100px] ${targetType === 'all' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white text-gray-600'}`}>All</button>
                                        <button onClick={() => setTargetType('device')} className={`flex-1 p-2 border rounded min-w-[100px] ${targetType === 'device' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white text-gray-600'}`}><Smartphone className="w-3 h-3 inline mr-1" /> Device</button>
                                        <button onClick={() => setTargetType('label')} className={`flex-1 p-2 border rounded min-w-[100px] ${targetType === 'label' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white text-gray-600'}`}>Label</button>
                                        <button onClick={() => setTargetType('file')} className={`flex-1 p-2 border rounded min-w-[100px] ${targetType === 'file' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white text-gray-600'}`}>File</button>
                                        <button onClick={() => setTargetType('segmented')} className={`flex-1 p-2 border rounded min-w-[100px] ${targetType === 'segmented' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white text-gray-600'}`}>Segmented</button>
                                    </div>
                                    {targetType === 'all' && (
                                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                                            <span className="text-sm text-yellow-800">Caution: This will send to ALL contacts in your database.</span>
                                        </div>
                                    )}
                                    {targetType === 'label' && (
                                        <select multiple className="w-full border p-2 rounded h-24 text-sm" onChange={e => setSelectedLabels([...e.target.selectedOptions].map(o => o.value))}>
                                            {labels.map(l => <option key={l.id} value={l.id}>{l.name} ({labelCounts[l.id] || 0})</option>)}
                                        </select>
                                    )}
                                    {targetType === 'file' && (
                                        <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50" onDragOver={handleDragOver} onDrop={handleDropTargetFile}>
                                            <input type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={handleTargetFileChange} />
                                            {targetFile ? (
                                                <><FileSpreadsheet className="w-8 h-8 text-green-600 mx-auto" /><p className="font-bold text-green-800">{targetFile.name}</p><p className="text-xs text-green-600">{targetCountDisplay} rows</p></>
                                            ) : (
                                                <><Upload className="w-8 h-8 text-gray-400 mx-auto" /><p className="text-gray-600">Drop CSV/Excel or click</p></>
                                            )}
                                        </div>
                                    )}
                                    {targetType === 'device' && deviceCounts.length > 0 && (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {deviceCounts.map(dev => (
                                                <div key={dev.device_id} onClick={() => toggleDeviceSelection(dev.device_id)} className={`p-2 border rounded cursor-pointer flex items-center gap-3 ${selectedDevices.includes(dev.device_id) ? 'bg-indigo-50 border-indigo-300' : 'bg-white'}`}>
                                                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${selectedDevices.includes(dev.device_id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                                        {selectedDevices.includes(dev.device_id) && <CheckSquare className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div className="flex-1 text-sm"><strong>{dev.device_name}</strong><br/><span className="text-xs text-gray-500">{dev.whatsapp_number}</span></div>
                                                    <div className="text-right text-sm font-bold text-indigo-600">{dev.contact_count}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </AccordionSection>

                        {/* Tracking & Options Accordion */}
                        <AccordionSection title="Tracking & Options" icon={Link2} defaultOpen={false}>
                            <div className="space-y-3">
                                {broadcastType !== 'group' && (
                                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input type="checkbox" checked={includeUnsubscribe} onChange={e => setIncludeUnsubscribe(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                                        <div><span className="font-medium text-gray-800">Link Unsubscribe</span><span className="block text-xs text-gray-500">Tambahkan link opt-out unik</span></div>
                                    </label>
                                )}
                                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input type="checkbox" checked={!disableLinkTracking} onChange={e => setDisableLinkTracking(!e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                                    <div><span className="font-medium text-gray-800">Link Tracking</span><span className="block text-xs text-gray-500">Aktifkan tracking klik</span></div>
                                </label>
                                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input type="checkbox" checked={showInHistory} onChange={e => setShowInHistory(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                                    <div><span className="font-medium text-gray-800">Chat History</span><span className="block text-xs text-gray-500">Tampilkan di history percakapan</span></div>
                                </label>
                                <div className="pt-2 border-t">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Auto-Assign Agent</label>
                                    <select value={assignedAgentId} onChange={e => setAssignedAgentId(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-sm">
                                        <option value="">-- No Auto-Assign --</option>
                                        {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                                    </select>
                                </div>
                                <div className="pt-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Chatbot Flow</label>
                                    <select value={selectedFlow} onChange={e => setSelectedFlow(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg text-sm">
                                        <option value="">-- No Flow --</option>
                                        {chatFlows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </AccordionSection>

                        {/* Anti-Ban Settings Accordion */}
                        <AccordionSection title="Anti-Ban Settings" icon={ShieldCheck} defaultOpen={false}>
                            <div className="space-y-4">
                                {broadcastType === 'group' && (
                                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex gap-2 items-start">
                                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                                        <span className="text-sm text-yellow-800">High Risk: Minimum 15 detik delay antar pesan.</span>
                                    </div>
                                )}
                                {senderType === 'rotator' ? (
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <label className={`flex-1 p-3 border rounded-lg cursor-pointer ${antiBanMode === 'safe' ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'}`}>
                                                <input type="radio" name="antiban" value="safe" checked={antiBanMode === 'safe'} onChange={() => setAntiBanMode('safe')} className="text-green-600" />
                                                <div><strong className="text-sm">Mode Aman</strong><span className="block text-xs text-gray-500">Delay 5-15s, Batch aktif</span></div>
                                            </label>
                                            <label className={`flex-1 p-3 border rounded-lg cursor-pointer ${antiBanMode === 'fast' ? 'bg-red-50 border-red-300' : 'hover:bg-gray-50'}`}>
                                                <input type="radio" name="antiban" value="fast" checked={antiBanMode === 'fast'} onChange={() => setAntiBanMode('fast')} className="text-red-600" />
                                                <div><strong className="text-sm">Mode Cepat</strong><span className="block text-xs text-gray-500">Delay 1-3s, Risiko tinggi</span></div>
                                            </label>
                                        </div>
                                        {antiBanMode === 'manual' && (
                                            <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
                                                <div className="flex items-center gap-2 text-sm"><strong>Message Delay:</strong><input type="number" className="w-16 p-1 border rounded" value={delaySettings.msgMin} onChange={e => setDelaySettings({ ...delaySettings, msgMin: parseInt(e.target.value) })} /> - <input type="number" className="w-16 p-1 border rounded" value={delaySettings.msgMax} onChange={e => setDelaySettings({ ...delaySettings, msgMax: parseInt(e.target.value) })} /> sec</div>
                                                <div className="flex items-center gap-2 text-sm"><strong>Batch:</strong>Every <input type="number" className="w-12 p-1 border rounded" value={delaySettings.batchSize} onChange={e => setDelaySettings({ ...delaySettings, batchSize: parseInt(e.target.value) })} /> msgs wait <input type="number" className="w-16 p-1 border rounded" value={delaySettings.batchMin} onChange={e => setDelaySettings({ ...delaySettings, batchMin: parseInt(e.target.value) })} /></div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-3"><input type="checkbox" checked={delaySettings.msgEnabled} onChange={e => setDelaySettings({ ...delaySettings, msgEnabled: e.target.checked })} className="w-4 h-4" /><div><strong className="text-sm">Message Delay</strong></div></div>
                                            <div className="flex items-center gap-1 text-sm"><input type="number" className="w-12 p-1 border rounded" value={delaySettings.msgMin} onChange={e => setDelaySettings({ ...delaySettings, msgMin: parseInt(e.target.value) })} /> - <input type="number" className="w-12 p-1 border rounded" value={delaySettings.msgMax} onChange={e => setDelaySettings({ ...delaySettings, msgMax: parseInt(e.target.value) })} /> sec</div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-3"><input type="checkbox" checked={delaySettings.batchEnabled} onChange={e => setDelaySettings({ ...delaySettings, batchEnabled: e.target.checked })} className="w-4 h-4" /><div><strong className="text-sm">Batch Delay</strong></div></div>
                                            <div className="flex items-center gap-1 text-sm">Every <input type="number" className="w-12 p-1 border rounded" value={delaySettings.batchSize} onChange={e => setDelaySettings({ ...delaySettings, batchSize: parseInt(e.target.value) })} /> msgs</div>
                                        </div>
                                        <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                            <input type="checkbox" checked={delaySettings.gradualEnabled} onChange={e => setDelaySettings({ ...delaySettings, gradualEnabled: e.target.checked })} className="w-4 h-4" />
                                            <span className="text-sm font-medium">Gradual Scaling (Warm-up)</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </AccordionSection>

                        {/* Schedule & Recurring Accordion */}
                        <AccordionSection title="Schedule & Recurring" icon={Clock} defaultOpen={false}>
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={isScheduled} onChange={e => setIsScheduled(e.target.checked)} className="w-4 h-4" />
                                    <span className="font-medium text-gray-700">Schedule Delivery</span>
                                </label>
                                {isScheduled && (
                                    <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="w-full border p-2 rounded-lg text-sm" />
                                )}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-4 h-4" />
                                    <span className="font-medium text-gray-700">Recurring / Follow-up</span>
                                </label>
                                {isRecurring && (
                                    <select value={recurrenceType} onChange={e => setRecurrenceType(e.target.value)} className="w-full border p-2 rounded-lg text-sm">
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                )}
                            </div>
                        </AccordionSection>

                        {/* Telegram Bot Reporting Accordion */}
                        <AccordionSection title="Laporan Bot Telegram" icon={Bot} defaultOpen={false} badge={enableTelegramReport ? "Aktif" : "Nonaktif"}>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={enableTelegramReport}
                                            onChange={e => setEnableTelegramReport(e.target.checked)}
                                            className="w-4 h-4 text-[#229ED9] rounded focus:ring-[#229ED9]"
                                        />
                                        <div>
                                            <span className="font-bold text-gray-800 text-sm">Kirim Laporan ke Telegram</span>
                                            <span className="block text-xs text-gray-500">Notifikasi otomatis saat kampanye ini Selesai, Terjeda, atau Dibatalkan</span>
                                        </div>
                                    </label>
                                    <Link to="../settings" target="_blank" className="text-xs font-bold text-[#229ED9] hover:underline inline-flex items-center gap-1">
                                        ⚙️ Kelola Akun Bot Telegram ↗
                                    </Link>
                                </div>

                                {enableTelegramReport && (
                                    <div className="pl-7 space-y-3 pt-1 border-t border-gray-100">
                                        <div className="flex gap-4">
                                            <label className={`flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg text-xs font-semibold ${useGlobalTelegram ? 'bg-blue-50 border-blue-200 text-[#229ED9]' : 'text-gray-700'}`}>
                                                <input
                                                    type="radio"
                                                    name="tg_mode"
                                                    checked={useGlobalTelegram}
                                                    onChange={() => setUseGlobalTelegram(true)}
                                                    className="text-[#229ED9]"
                                                />
                                                Gunakan Pengaturan Bot Global
                                            </label>
                                            <label className={`flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg text-xs font-semibold ${!useGlobalTelegram ? 'bg-blue-50 border-blue-200 text-[#229ED9]' : 'text-gray-700'}`}>
                                                <input
                                                    type="radio"
                                                    name="tg_mode"
                                                    checked={!useGlobalTelegram}
                                                    onChange={() => setUseGlobalTelegram(false)}
                                                    className="text-[#229ED9]"
                                                />
                                                Kustom Chat ID Kampanye Ini
                                            </label>
                                        </div>

                                        {!useGlobalTelegram && (
                                            <div className="space-y-1">
                                                <label className="block text-xs font-medium text-gray-700">Chat ID / Group ID Khusus</label>
                                                <input
                                                    type="text"
                                                    value={customTelegramChatId}
                                                    onChange={e => setCustomTelegramChatId(e.target.value)}
                                                    placeholder="cth: -1001234567890 atau 12345678"
                                                    className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#229ED9]"
                                                />
                                                <p className="text-[11px] text-gray-400">Token bot menggunakan token global organisasi, laporan kampanye ini akan diteruskan ke Chat ID khusus ini.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </AccordionSection>

                        {/* Email Reporting Accordion */}
                        <AccordionSection title="Laporan Email Admin" icon={Mail} defaultOpen={false} badge={enableEmailReport ? "Aktif" : "Nonaktif"}>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={enableEmailReport}
                                            onChange={e => setEnableEmailReport(e.target.checked)}
                                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                        />
                                        <div>
                                            <span className="font-bold text-gray-800 text-sm">Kirim Laporan ke Email</span>
                                            <span className="block text-xs text-gray-500">Kirim rekap performa lengkap HTML ke email admin/PIC</span>
                                        </div>
                                    </label>
                                    <Link to="../settings" target="_blank" className="text-xs font-bold text-purple-600 hover:underline inline-flex items-center gap-1">
                                        ⚙️ Kelola Email Global ↗
                                    </Link>
                                </div>

                                {enableEmailReport && (
                                    <div className="pl-7 space-y-3 pt-1 border-t border-gray-100">
                                        <div className="flex gap-4">
                                            <label className={`flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg text-xs font-semibold ${useGlobalEmail ? 'bg-purple-50 border-purple-200 text-purple-600' : 'text-gray-700'}`}>
                                                <input
                                                    type="radio"
                                                    name="email_mode"
                                                    checked={useGlobalEmail}
                                                    onChange={() => setUseGlobalEmail(true)}
                                                    className="text-purple-600"
                                                />
                                                Gunakan Email Global Organisasi
                                            </label>
                                            <label className={`flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg text-xs font-semibold ${!useGlobalEmail ? 'bg-purple-50 border-purple-200 text-purple-600' : 'text-gray-700'}`}>
                                                <input
                                                    type="radio"
                                                    name="email_mode"
                                                    checked={!useGlobalEmail}
                                                    onChange={() => setUseGlobalEmail(false)}
                                                    className="text-purple-600"
                                                />
                                                Kustom Email Kampanye Ini
                                            </label>
                                        </div>

                                        {!useGlobalEmail && (
                                            <div className="space-y-1">
                                                <label className="block text-xs font-medium text-gray-700">Alamat Email Penerima Khusus</label>
                                                <input
                                                    type="text"
                                                    value={customEmailRecipient}
                                                    onChange={e => setCustomEmailRecipient(e.target.value)}
                                                    placeholder="cth: marketing@toko.com, supervisor@toko.com"
                                                    className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                                />
                                                <p className="text-[11px] text-gray-400">Bisa memasukkan beberapa email dipisah tanda koma.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </AccordionSection>

                        {/* Action Buttons */}
                        <div className="flex justify-center gap-4 pt-8 border-t mt-8">
                            <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200 hover:-translate-y-0.5 active:scale-95">Edit Content</button>
                            <button onClick={handleSubmit} disabled={loading || !isSpintaxValid} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? 'Launching...' : <><Play className="w-5 h-5" /> {isScheduled ? 'Schedule' : 'Launch Campaign'}</>}
                            </button>
                        </div>
                </div>
                )}
            </div>
        </div>
    );
}
