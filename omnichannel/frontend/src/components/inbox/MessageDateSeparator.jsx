import React from 'react';
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * DateSeparator - WA Web style date divider between days
 *
 * @param {Object} props
 * @param {string} props.dateStr - Date string to format
 */
export default function DateSeparator({ dateStr }) {
    let label;

    try {
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
        if (isToday(date)) {
            label = 'Hari ini';
        } else if (isYesterday(date)) {
            label = 'Kemarin';
        } else if (isThisWeek(date)) {
            label = format(date, 'EEEE', { locale: id });
        } else {
            label = format(date, 'dd/MM/yyyy');
        }
    } catch {
        label = dateStr;
    }

    return (
        <div className="flex items-center justify-center my-3 px-4">
            <div className="bg-white dark:bg-[#182229] text-gray-600 dark:text-gray-400 text-[11.5px] px-3 py-1 rounded-lg shadow-sm font-medium">
                {label}
            </div>
        </div>
    );
}
