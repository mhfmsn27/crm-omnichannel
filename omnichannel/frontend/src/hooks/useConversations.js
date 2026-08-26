/**
 * useConversations — Hook managing conversation list, filters, device/agent metadata, and search.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDebounce } from './useDebounce';

export default function useConversations({ user }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Data State
    const [conversations, setConversations] = useState([]);
    const [agents, setAgents] = useState([]);
    const [allTemplates, setAllTemplates] = useState([]);
    const [inboxBanners, setInboxBanners] = useState([]);
    const [queueConfig, setQueueConfig] = useState(null);
    const [allLabels, setAllLabels] = useState([]);
    const [allDevices, setAllDevices] = useState([]);
    const [counts, setCounts] = useState({ all: 0, unread: 0, urgent: 0, resolved: 0, archived: 0, unassigned: 0 });

    // Loading & Pagination State
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMoreConversations, setHasMoreConversations] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    // Filter State
    const [searchText, setSearchText] = useState('');
    const [filterChannel, setFilterChannel] = useState(new URLSearchParams(location.search).get('channel') || 'all');
    const [filterDevice, setFilterDevice] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterInboxId, setFilterInboxId] = useState('');
    const [filterAgent, setFilterAgent] = useState('');
    const [filterLabels, setFilterLabels] = useState([]);
    const [filterHideKontakWa, setFilterHideKontakWa] = useState(false);
    const [filterSortBy, setFilterSortBy] = useState('last_message');
    const [filterBy, setFilterBy] = useState('');

    const debouncedSearch = useDebounce(searchText, 500);
    const abortControllerRef = useRef(null);

    // Derived filterStatus logic for archive toggle
    useEffect(() => {
        if (showArchived) {
            setFilterStatus('archived');
        } else if (filterStatus === 'archived') {
            setFilterStatus('all');
        }
    }, [showArchived]);

    // Listen for URL changes & custom inbox filter events
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const channel = params.get('channel');
        if (channel) {
            setFilterChannel(channel);
        } else if (!params.has('channel')) {
            setFilterChannel('all');
        }

        const handleInboxFilterChange = (event) => {
            const inboxId = event.detail?.inboxId;
            setFilterInboxId(inboxId ? inboxId.toString() : '');
        };
        window.addEventListener('inbox-filter-change', handleInboxFilterChange);

        const inboxIdFromUrl = params.get('inbox_id');
        if (inboxIdFromUrl) {
            setFilterInboxId(inboxIdFromUrl);
        }

        return () => window.removeEventListener('inbox-filter-change', handleInboxFilterChange);
    }, [location.search]);

    // Fetch Banners Once
    useEffect(() => {
        axios.get('/api/app/inbox/banners')
            .then(res => setInboxBanners(res.data))
            .catch(() => {});
    }, []);

    // Silent refresh for background socket events
    const refreshConversations = useCallback(async () => {
        try {
            const res = await axios.get('/api/app/inbox/conversations', {
                params: {
                    status: filterStatus,
                    channel: filterChannel,
                    device_id: filterDevice,
                    search: debouncedSearch,
                    agent_id: filterAgent,
                    label_ids: filterLabels.length > 0 ? filterLabels.join(',') : undefined,
                    sort_by: filterSortBy,
                    filter_by: filterBy,
                    inbox_id: filterInboxId || undefined,
                    hide_unknown: filterHideKontakWa ? 'true' : undefined,
                    page: 1,
                    limit: page * 50
                }
            });
            setConversations(res.data.conversations);
            setCounts(res.data.counts);
            setHasMoreConversations(res.data.conversations.length >= page * 50);
        } catch (err) {
            console.error('Failed to refresh conversations', err);
        }
    }, [filterStatus, filterChannel, filterDevice, debouncedSearch, filterAgent, filterLabels, filterSortBy, filterBy, filterInboxId, filterHideKontakWa, page]);

    // Main fetch data function
    const fetchData = useCallback(async (pageNum = page) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        if (pageNum === 1) setLoadingConversations(true);
        else setIsLoadingMore(true);

        try {
            const [convRes, devRes, agentRes, tplRes, msgRes, igRes, tgRes, wcRes, lblRes, arRes] = await Promise.all([
                axios.get('/api/app/inbox/conversations', {
                    signal: abortControllerRef.current.signal,
                    params: {
                        status: filterStatus,
                        channel: filterChannel,
                        device_id: filterDevice,
                        search: debouncedSearch,
                        agent_id: filterAgent,
                        label_ids: filterLabels.length > 0 ? filterLabels.join(',') : undefined,
                        sort_by: filterSortBy,
                        filter_by: filterBy,
                        inbox_id: filterInboxId || undefined,
                        hide_unknown: filterHideKontakWa ? 'true' : undefined,
                        page: pageNum,
                        limit: 50
                    }
                }),
                axios.get('/api/app/devices', { signal: abortControllerRef.current.signal }),
                axios.get('/api/app/team', { signal: abortControllerRef.current.signal }),
                axios.get('/api/app/quick-replies?type=quick_reply', { signal: abortControllerRef.current.signal }),
                axios.get('/api/app/messenger/pages', { signal: abortControllerRef.current.signal }),
                axios.get('/api/app/instagram/accounts', { signal: abortControllerRef.current.signal }),
                axios.get('/api/app/telegram/bots', { signal: abortControllerRef.current.signal }),
                axios.get('/api/app/webchat', { signal: abortControllerRef.current.signal }),
                axios.get('/api/app/labels', { signal: abortControllerRef.current.signal }),
                axios.get('/api/app/auto-reply/general', { signal: abortControllerRef.current.signal })
            ]);

            if (pageNum === 1) {
                setConversations(convRes.data.conversations);
            } else {
                setConversations(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const newConvs = convRes.data.conversations.filter(c => !existingIds.has(c.id));
                    return [...prev, ...newConvs];
                });
            }
            setCounts(convRes.data.counts);
            setHasMoreConversations(convRes.data.conversations.length === 50);

            if (user) {
                setAgents(agentRes.data.filter(a => a.id !== user.id));
            } else {
                setAgents(agentRes.data);
            }
            setAllTemplates(tplRes.data);
            if (lblRes) setAllLabels(lblRes.data);

            if (arRes.data.config?.queue_mode) {
                setQueueConfig(arRes.data.config.queue_mode);
            } else {
                setQueueConfig({ enabled: false });
            }

            const combinedDevices = [];
            devRes.data.forEach(d => combinedDevices.push({ id: `whatsapp:${d.id}`, name: `${d.name} (WA)`, type: 'whatsapp', status: d.status }));
            msgRes.data.forEach(d => combinedDevices.push({ id: `messenger:${d.id}`, name: `${d.page_name} (FB)`, type: 'messenger' }));
            igRes.data.forEach(d => combinedDevices.push({ id: `instagram:${d.id}`, name: `@${d.username} (IG)`, type: 'instagram' }));
            tgRes.data.forEach(d => combinedDevices.push({ id: `telegram:${d.id}`, name: `@${d.username} (TG)`, type: 'telegram' }));

            const webWidgets = Array.isArray(wcRes.data) ? wcRes.data : (wcRes.data.id ? [wcRes.data] : []);
            webWidgets.forEach(w => combinedDevices.push({ id: w.widget_uid, name: `${w.name} (Web)`, type: 'webchat' }));

            setAllDevices(combinedDevices);
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
            console.error("Failed load inbox data", err);
        } finally {
            setLoadingConversations(false);
            setIsLoadingMore(false);
        }
    }, [filterStatus, filterChannel, filterDevice, debouncedSearch, filterAgent, filterLabels, filterSortBy, filterBy, filterInboxId, filterHideKontakWa, user?.id, page]);

    // Trigger initial or filter-based fetch
    useEffect(() => {
        setLoadingConversations(true);
        setConversations([]);
        setPage(1);
        setHasMoreConversations(true);
        fetchData(1);
    }, [debouncedSearch, filterChannel, filterDevice, filterStatus, filterAgent, filterLabels, filterSortBy, filterBy, filterInboxId, filterHideKontakWa]);

    // Handle Contact Selection (Start New Chat)
    const handleContactSelect = async (contact) => {
        try {
            let payload;
            if (contact.id) {
                const sessionId = contact.device?.id?.split(':')[1];
                payload = { contact_id: contact.id, ...(sessionId && { session_id: sessionId }) };
            } else {
                const sessionId = contact.device?.id?.split(':')[1];
                payload = { phone_number: contact.phone_number, session_id: sessionId };
            }

            const res = await axios.post('/api/app/inbox/conversations', payload);
            const { id } = res.data;
            await fetchData();
            navigate(`/inbox?id=${id}`);
        } catch (err) {
            toast.error("Failed to start chat");
            console.error(err);
        }
    };

    // Handle Pickup Next from Queue
    const handlePickupQueue = async () => {
        const toastId = toast.loading("Checking Queue...");
        try {
            const res = await axios.post('/api/app/queue/pickup');
            if (res.data.success) {
                toast.success("Client Assigned!", { id: toastId });
                navigate(`/inbox?id=${res.data.conversationId}`);
                fetchData();
            } else {
                toast.error(res.data.message || "Queue Empty", { id: toastId });
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Pickup Failed", { id: toastId });
        }
    };

    const filteredDevices = filterChannel === 'all'
        ? allDevices
        : allDevices.filter(d => d.type === filterChannel);

    return {
        conversations,
        setConversations,
        agents,
        allTemplates,
        inboxBanners,
        queueConfig,
        allLabels,
        allDevices,
        filteredDevices,
        counts,
        setCounts,
        loadingConversations,
        page,
        setPage,
        hasMoreConversations,
        isLoadingMore,
        isSyncing,
        setIsSyncing,
        showArchived,
        setShowArchived,
        searchText,
        setSearchText,
        debouncedSearch,
        filterChannel,
        setFilterChannel,
        filterDevice,
        setFilterDevice,
        filterStatus,
        setFilterStatus,
        filterInboxId,
        setFilterInboxId,
        filterAgent,
        setFilterAgent,
        filterLabels,
        setFilterLabels,
        filterHideKontakWa,
        setFilterHideKontakWa,
        filterSortBy,
        setFilterSortBy,
        filterBy,
        setFilterBy,
        fetchData,
        refreshConversations,
        handleContactSelect,
        handlePickupQueue,
    };
}
