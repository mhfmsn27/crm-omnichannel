import React, { useState, useEffect } from 'react';
import { User, Phone, DollarSign, FileText, Tag, Clock, CheckCircle, AlertCircle, X, ChevronRight, ShoppingBag, ShieldAlert, Sparkles, Plus, Lock } from 'lucide-react';
import { getApiUrl } from '../../config/api';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export const Customer360Drawer = ({ contact, conversation, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'invoices' | 'deals' | 'tickets'
    const [invoices, setInvoices] = useState([]);
    const [deals, setDeals] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && contact?.id) {
            fetchCustomer360Data();
        }
    }, [isOpen, contact?.id]);

    const fetchCustomer360Data = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            // Fetch Invoices for this customer
            const invoiceReq = axios.get(`/api/app/invoices?search=${encodeURIComponent(contact.phone_number || contact.name)}&limit=5`, { headers })
                .then(r => r.data?.data || r.data?.invoices || [])
                .catch(() => []);

            // Fetch Pipeline Deals
            const dealReq = axios.get(`/api/app/crm/deals?contact_id=${contact.id}`, { headers })
                .then(r => r.data?.data || r.data || [])
                .catch(() => []);

            // Fetch Tickets
            const ticketReq = axios.get(`/api/app/crm/tickets?contact_id=${contact.id}`, { headers })
                .then(r => r.data?.data || r.data || [])
                .catch(() => []);

            const [invRes, dealRes, tickRes] = await Promise.all([invoiceReq, dealReq, ticketReq]);
            setInvoices(invRes);
            setDeals(dealRes);
            setTickets(tickRes);
        } catch (e) {
            console.error('[Customer360] Fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const totalSpend = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[380px] bg-white dark:bg-[#111b21] shadow-2xl border-l border-gray-200 dark:border-slate-800 z-50 flex flex-col animate-slideLeft">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/80 dark:bg-[#202c33]/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                        360°
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Customer 360° View</h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Ringkasan profil terpadu</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Customer Quick Header Card */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-slate-900/60 dark:to-slate-800/40">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        {contact?.name ? contact.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{contact?.name || 'Kontak Tanpa Nama'}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-500" /> {contact?.phone_number || '-'}
                        </p>
                        {contact?.whatsapp_lid && (
                            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-mono truncate">LID: {contact.whatsapp_lid}</p>
                        )}
                    </div>
                </div>

                {/* Key Metrics Stats */}
                <div className="grid grid-cols-2 gap-2 mt-3.5">
                    <div className="p-2 rounded-lg bg-white/80 dark:bg-[#202c33] border border-gray-100 dark:border-slate-700 shadow-sm">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">Total Transaksi</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Rp {totalSpend.toLocaleString('id-ID')}
                        </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 dark:bg-[#202c33] border border-gray-100 dark:border-slate-700 shadow-sm">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">Deals / Peluang</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {deals.length} Peluang Aktif
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-100 dark:border-slate-800 text-xs font-semibold px-2 bg-gray-50/50 dark:bg-[#202c33]/30">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-2.5 px-3 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    Ringkasan
                </button>
                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`py-2.5 px-3 border-b-2 transition-colors ${activeTab === 'invoices' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    Invoice ({invoices.length})
                </button>
                <button
                    onClick={() => setActiveTab('deals')}
                    className={`py-2.5 px-3 border-b-2 transition-colors ${activeTab === 'deals' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    Deals ({deals.length})
                </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeTab === 'overview' && (
                    <div className="space-y-3">
                        {/* Internal Note */}
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-slate-800/80 border border-amber-200/80 dark:border-slate-700">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                                <Lock className="w-3.5 h-3.5" /> Catatan Internal Kontak
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {contact?.internal_note || 'Belum ada catatan internal khusus untuk pelanggan ini.'}
                            </p>
                        </div>

                        {/* Recent Invoice Snippet */}
                        <div className="p-3 rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-[#202c33]/50">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block mb-2">Tagihan Terakhir</span>
                            {invoices.length > 0 ? (
                                <div className="text-xs space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">No. Invoice:</span>
                                        <span className="font-mono font-bold text-gray-900 dark:text-white">{invoices[0].invoice_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Status:</span>
                                        <span className={`font-bold ${invoices[0].status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {invoices[0].status?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400">Belum ada riwayat tagihan.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'invoices' && (
                    <div className="space-y-2">
                        {invoices.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-6">Tidak ada invoice untuk kontak ini.</p>
                        ) : (
                            invoices.map((inv, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#202c33] text-xs flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{inv.invoice_number}</p>
                                        <p className="text-gray-500 text-[11px]">Rp {Number(inv.total_amount || 0).toLocaleString('id-ID')}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'}`}>
                                        {inv.status?.toUpperCase()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'deals' && (
                    <div className="space-y-2">
                        {deals.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-6">Tidak ada deal CRM aktif.</p>
                        ) : (
                            deals.map((deal, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg border border-gray-100 dark:border-slate-800 bg-white dark:bg-[#202c33] text-xs">
                                    <p className="font-bold text-gray-900 dark:text-white">{deal.title || 'Deal Prospek'}</p>
                                    <p className="text-emerald-600 font-semibold text-[11px]">Rp {Number(deal.value || 0).toLocaleString('id-ID')}</p>
                                    <p className="text-gray-400 text-[10px] mt-0.5">Tahap: {deal.stage_name || 'Prospecting'}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Customer360Drawer;
