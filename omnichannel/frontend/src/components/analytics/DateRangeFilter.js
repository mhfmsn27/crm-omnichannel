
import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function DateRangeFilter({ startDate, endDate, onChange }) {
    const [isOpen, setIsOpen] = useState(false);

    const ranges = [
        { label: 'Today', start: new Date(), end: new Date() },
        { label: 'Yesterday', start: subDays(new Date(), 1), end: subDays(new Date(), 1) },
        { label: 'Last 7 Days', start: subDays(new Date(), 6), end: new Date() },
        { label: 'Last 30 Days', start: subDays(new Date(), 29), end: new Date() },
    ];

    const handleSelect = (range) => {
        onChange(
            format(range.start, 'yyyy-MM-dd'), 
            format(range.end, 'yyyy-MM-dd')
        );
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium text-gray-700"
            >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{startDate} - {endDate}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                    {ranges.map((range, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelect(range)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
