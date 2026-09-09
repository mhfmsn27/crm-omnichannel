import React from 'react';
import { AtSign, Shield, User } from 'lucide-react';

/**
 * MentionPopover - Agent mention suggestions popover in whisper/internal notes
 *
 * @param {Object} props
 * @param {Array} props.agents - Array of agent items
 * @param {number} props.selectedIndex - Currently selected index
 * @param {Function} props.onSelect - Selection handler
 */
export default function MentionPopover({ agents = [], selectedIndex = 0, onSelect }) {
    if (!agents || agents.length === 0) return null;

    const getRoleBadge = (role) => {
        if (role === 'super_admin') return { label: 'Admin', bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' };
        if (role === 'supervisor') return { label: 'Supervisor', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' };
        return { label: 'Agent', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' };
    };

    return (
        <div className="absolute bottom-full mb-2 left-4 w-72 bg-white dark:bg-[#202c33] rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 border-b border-amber-200/60 dark:border-slate-700 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-amber-600" />
                    Mention Rekan ({agents.length})
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">Tekan Enter untuk pilih</span>
            </div>
            <div className="max-h-52 overflow-y-auto custom-scrollbar divide-y divide-gray-50 dark:divide-slate-700/50">
                {agents.map((agent, idx) => {
                    const roleBadge = getRoleBadge(agent.role);
                    return (
                        <div
                            key={agent.id}
                            onClick={() => onSelect(agent)}
                            className={`px-3 py-2 cursor-pointer flex items-center gap-2.5 transition-colors ${
                                idx === selectedIndex
                                    ? 'bg-amber-100/70 dark:bg-amber-900/40'
                                    : 'hover:bg-gray-50 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                                {agent.name ? agent.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                        {agent.name}
                                    </p>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex-shrink-0 ${roleBadge.bg}`}>
                                        {roleBadge.label}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                    {agent.email || agent.division || 'Anggota Tim'}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
