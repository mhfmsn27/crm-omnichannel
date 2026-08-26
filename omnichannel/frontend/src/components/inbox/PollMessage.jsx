import React from 'react';
import { BarChart3, CheckCircle } from 'lucide-react';

/**
 * Poll Message Component
 * Displays WhatsApp polls (for groups)
 */
export function PollMessage({ data, isOutbound }) {
    let pollData;
    try {
        pollData = typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
        pollData = { title: 'Poll', options: [], isMultiSelect: false };
    }

    const { title, options, isMultiSelect } = pollData;

    // Since we're just displaying incoming polls (we can't vote from CRM),
    // show the poll with a note that voting is not available
    return (
        <div className="min-w-[220px] max-w-[300px] bg-white dark:bg-[#1e293b] rounded-lg shadow-md border border-gray-100 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className={`px-3 py-2 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 ${isOutbound ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                <div className={`p-1 rounded ${isOutbound ? 'bg-green-100 dark:bg-green-800' : 'bg-gray-100 dark:bg-slate-700'}`}>
                    <BarChart3 className={`w-4 h-4 ${isOutbound ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`} />
                </div>
                <span className={`text-xs font-medium ${isOutbound ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    Polling
                </span>
            </div>

            {/* Poll Content */}
            <div className="p-3">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                    {title || 'Poll'}
                </h4>

                {/* Options */}
                <div className="space-y-1.5">
                    {options && options.length > 0 ? (
                        options.map((option, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 p-2 rounded bg-gray-50 dark:bg-slate-800/50"
                            >
                                <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                                    {option.optionName || option.displayText || `Option ${index + 1}`}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            No options available
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {isMultiSelect ? 'Multiple choices allowed' : 'Single choice'}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                        Voting not available in CRM
                    </span>
                </div>
            </div>
        </div>
    );
}

export default PollMessage;
