import React from 'react';

/**
 * FilterTabs - Tab-based filter component
 *
 * @param {Object} props
 * @param {Array} props.tabs - Array of { label, count, value } objects
 * @param {string} props.activeTab - Currently active tab value
 * @param {Function} props.onTabChange - Tab change handler
 */
export default function FilterTabs({ tabs, activeTab, onTabChange }) {
    return (
        <div className="flex overflow-x-auto border-b border-gray-100 dark:border-slate-700 -mx-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => onTabChange(tab.value)}
                    className={`
                        shrink-0 flex items-center justify-center gap-1.5 py-2.5 px-3
                        text-[10.5px] font-bold uppercase border-b-2 transition-colors
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset
                        ${activeTab === tab.value
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                            : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                        }
                    `}
                >
                    <span className="whitespace-nowrap">{tab.label}</span>
                    {tab.count > 0 && (
                        <span className={`
                            px-1.5 py-0.5 rounded-full text-[9px] leading-none flex-shrink-0
                            ${activeTab === tab.value
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                            }
                        `}>
                            {tab.count > 99 ? '99+' : tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
