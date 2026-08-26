import React, { useState, useEffect } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';

/**
 * PaymentLinksSection - Payment links history section
 *
 * @param {Object} props
 * @param {Object} props.conversation - Conversation data
 */
export default function PaymentLinksSection({ conversation }) {
    const [paymentLinks, setPaymentLinks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchPaymentLinks = async () => {
        if (!conversation?.id) return;
        setIsLoading(true);
        try {
            const res = await axios.get(`/api/app/inbox/conversations/${conversation.id}/payment-links`);
            setPaymentLinks(res.data);
        } catch {
            setPaymentLinks([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPaymentLinks();
    }, [conversation?.id]);

    if (paymentLinks.length === 0 && !isLoading) return null;

    const getStatusConfig = (status, createdAt, durationHours) => {
        const isExpiredByTime = status === 'pending' &&
            new Date(createdAt).getTime() + durationHours * 3600000 < Date.now();
        const effectiveStatus = isExpiredByTime ? 'expired' : status;

        return {
            paid: { label: 'Lunas', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
            expired: { label: 'Kedaluwarsa', cls: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400' },
            pending: { label: 'Menunggu', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
        }[effectiveStatus] || { label: effectiveStatus, cls: 'bg-gray-100 text-gray-500' };
    };

    return (
        <div className="px-5 py-3 border-b border-gray-100 dark:border-dark-border">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Riwayat Payment Link</span>
                </div>
                <button
                    onClick={fetchPaymentLinks}
                    disabled={isLoading}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className="space-y-2">
                {paymentLinks.map(link => {
                    const statusConfig = getStatusConfig(link.status, link.created_at, link.duration_hours);
                    return (
                        <div key={link.id} className="bg-gray-50 dark:bg-dark-bg rounded-lg p-2.5 text-xs">
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="text-gray-700 dark:text-gray-300 font-medium leading-tight flex-1">
                                    {link.description}
                                </span>
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
                                    {statusConfig.label === 'Menunggu' && (
                                        <a
                                            href={link.invoice_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:underline"
                                        >
                                            Buka
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
    );
}
