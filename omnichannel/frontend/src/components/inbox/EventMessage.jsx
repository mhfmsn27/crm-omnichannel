import React from 'react';
import { Calendar, MapPin, Clock, User, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Event Message Component
 * Displays WhatsApp event invitations/updates
 */
export function EventMessage({ data, isOutbound }) {
    let eventData;
    try {
        eventData = typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
        eventData = { name: 'Event', description: null, location: null, startTime: null, endTime: null };
    }

    const { name, description, location, startTime, endTime, action, organizer } = eventData;

    // Format action label
    const getActionLabel = () => {
        switch (action) {
            case 'create': return 'Undangan Acara';
            case 'invite': return 'Undangan';
            case 'update': return 'Diperbarui';
            case 'cancel': return 'Dibatalkan';
            case 'notification': return 'Pengingat';
            default: return 'Acara';
        }
    };

    // Format date
    const formatEventDate = (timestamp) => {
        if (!timestamp) return null;
        try {
            const ts = parseInt(timestamp);
            // WhatsApp uses seconds, not milliseconds
            const date = new Date(ts > 10000000000 ? ts : ts * 1000);
            if (isNaN(date.getTime())) return null;

            return {
                date: format(date, 'EEEE, d MMMM yyyy', { locale: id }),
                time: format(date, 'HH:mm'),
                full: format(date, "EEEE, d MMMM yyyy 'pukul' HH:mm", { locale: id })
            };
        } catch {
            return null;
        }
    };

    const startDate = formatEventDate(startTime);
    const endDate = formatEventDate(endTime);

    // Determine styling based on action
    const isCanceled = action === 'cancel';
    const headerBg = isCanceled
        ? 'bg-red-500'
        : isOutbound
            ? 'bg-green-500'
            : 'bg-blue-500';

    return (
        <div className={`min-w-[240px] max-w-[320px] rounded-lg shadow-md border overflow-hidden ${isCanceled ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-slate-700'}`}>
            {/* Header */}
            <div className={`${headerBg} px-3 py-2 flex items-center gap-2`}>
                <div className="bg-white/20 p-1.5 rounded-full">
                    <Calendar className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                    <span className="text-white text-[10px] font-medium opacity-90">{getActionLabel()}</span>
                    <p className="text-white text-sm font-semibold truncate">{name || 'Event'}</p>
                </div>
            </div>

            {/* Content */}
            <div className={`p-3 ${isCanceled ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-[#1e293b]'}`}>
                {/* Description */}
                {description && (
                    <p className={`text-sm mb-3 ${isCanceled ? 'text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`}>
                        {description}
                    </p>
                )}

                {/* Event Details */}
                <div className="space-y-2">
                    {/* Date & Time */}
                    {startDate && (
                        <div className="flex items-start gap-2">
                            <Clock className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCanceled ? 'text-red-400' : 'text-gray-400'}`} />
                            <div className={`text-xs ${isCanceled ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                <p className="font-medium">{startDate.date}</p>
                                <p>{startDate.time}{endDate ? ` - ${endDate.time}` : ''}</p>
                            </div>
                        </div>
                    )}

                    {/* Location */}
                    {location && (
                        <div className="flex items-start gap-2">
                            <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCanceled ? 'text-red-400' : 'text-gray-400'}`} />
                            <p className={`text-xs ${isCanceled ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                {location}
                            </p>
                        </div>
                    )}

                    {/* Organizer */}
                    {organizer && (
                        <div className="flex items-start gap-2">
                            <User className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCanceled ? 'text-red-400' : 'text-gray-400'}`} />
                            <p className={`text-xs ${isCanceled ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                {organizer}
                            </p>
                        </div>
                    )}
                </div>

                {/* Canceled Notice */}
                {isCanceled && (
                    <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-center">
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                            Acara ini telah dibatalkan
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default EventMessage;
