import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

/**
 * StatusTick - Message delivery status indicator
 *
 * WhatsApp Web behavior:
 * - pending: Clock icon (animated, orange)
 * - sent: Single check (gray)
 * - delivered: Double check (gray)
 * - read: Double check (blue)
 * - failed: Alert icon (red)
 *
 * @param {Object} props
 * @param {string} props.status - Message status
 * @param {number} props.retryCount - Retry count for pending messages
 */
export default function MessageStatusTick({ status, retryCount }) {
    if (status === 'read') {
        return <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />;
    }

    if (status === 'delivered') {
        return <CheckCheck className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />;
    }

    if (status === 'sent') {
        return <Check className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />;
    }

    if (status === 'failed') {
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    }

    // Pending - show clock with retry count
    if (status === 'pending') {
        return (
            <div className="flex items-center gap-0.5">
                <Clock className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                {retryCount > 0 && (
                    <span className="text-[9px] text-orange-400 font-medium">
                        ({retryCount})
                    </span>
                )}
            </div>
        );
    }

    // Fallback
    return <Clock className="w-3 h-3 text-gray-400 animate-pulse" />;
}
