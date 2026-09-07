import React from 'react';
import { NavLink } from 'react-router-dom';
import { Flame, ShieldCheck, UserPlus, MapPin, Clock, HelpCircle, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPerm } from '../../utils/rbac';

const MenuItem = ({ to, icon: Icon, label, isNew, isHot, isCollapsed }) => (
    <NavLink
        title={isCollapsed ? label : ''}
        to={to} 
        className={({ isActive }) => 
            `shrink-0 md:w-full mb-0 md:mb-2 px-3 py-2 md:py-2.5 rounded-xl border text-left shadow-xs transition-all duration-200 flex items-center justify-between group whitespace-nowrap ${
                isActive 
                ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-950/30 dark:border-orange-500 dark:text-orange-300 font-bold' 
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 dark:bg-[#1e293b] dark:border-slate-800 dark:text-gray-300 dark:hover:bg-slate-800 font-medium'
            }`
        }
    >
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'md:justify-center' : ''}`}>
            <div className="bg-gray-100 p-1.5 rounded-lg text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors dark:bg-slate-800 dark:text-slate-400 shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-xs ${isCollapsed ? 'md:hidden' : ''}`}>{label}</span>
                {isNew && <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase dark:bg-green-900/30 dark:text-green-400 shrink-0">New</span>}
                {isHot && <span className="bg-red-100 text-red-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase animate-pulse dark:bg-red-900/30 dark:text-red-400 shrink-0">HOT</span>}
            </div>
        </div>
        {!isCollapsed && <ArrowRight className="hidden md:block w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 shrink-0 ml-2" />}
    </NavLink>
);

export default function ToolsSubMenu({ isCollapsed }) {
    const { user } = useAuth();

    const canTools = hasPerm(user, 'use_tools');
    const canWarmer = hasPerm(user, 'use_warmer');
    const canChatForm = hasPerm(user, 'manage_chatform');
    const canFollowup = hasPerm(user, 'manage_followup');

    const hasWaTools = canWarmer || canTools;
    const hasLeadGen = canChatForm || canTools || canFollowup;

    return (
        <div className="flex flex-col w-full">
            {/* MOBILE ONLY: Horizontal Scrollable Tab Bar */}
            <div className="md:hidden flex flex-row overflow-x-auto no-scrollbar gap-1.5 py-1 px-1 pb-1.5 w-full">
                {canWarmer && <MenuItem to="warmer" icon={Flame} label="WA Warmer" isCollapsed={false} />}
                {canTools && <MenuItem to="check-number" icon={ShieldCheck} label="Check Number" isCollapsed={false} />}
                {canTools && <MenuItem to="group-extractor" icon={UserPlus} label="Group Extractor" isCollapsed={false} />}
                {canChatForm && <MenuItem to="chat-form" icon={FileText} label="Chat Form" isHot isCollapsed={false} />}
                {canTools && <MenuItem to="scraper" icon={MapPin} label="GMaps Scraper" isCollapsed={false} />}
                {canFollowup && <MenuItem to="follow-up" icon={Clock} label="Auto Follow-up" isCollapsed={false} />}
                {canTools && <MenuItem to="tutorial" icon={HelpCircle} label="Tutorials" isCollapsed={false} />}
            </div>

            {/* DESKTOP/TABLET ONLY: Vertical Categorized Sidebar */}
            <div className="hidden md:flex md:flex-col">
                {hasWaTools && (
                    <div className="mb-2 px-1">
                        {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">WhatsApp Tools</p>}
                        {canWarmer && <MenuItem to="warmer" icon={Flame} label="WA Warmer" isCollapsed={isCollapsed} />}
                        {canTools && <MenuItem to="check-number" icon={ShieldCheck} label="Check Number" isCollapsed={isCollapsed} />}
                        {canTools && <MenuItem to="group-extractor" icon={UserPlus} label="Group Extractor" isCollapsed={isCollapsed} />}
                    </div>
                )}

                {hasLeadGen && (
                    <div className="mt-2 px-1 border-t border-gray-200 dark:border-slate-700 pt-4">
                        {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Lead Gen & More</p>}
                        {canChatForm && <MenuItem to="chat-form" icon={FileText} label="Chat Form" isHot isCollapsed={isCollapsed} />}
                        {canTools && <MenuItem to="scraper" icon={MapPin} label="GMaps Scraper" isCollapsed={isCollapsed} />}
                        {canFollowup && <MenuItem to="follow-up" icon={Clock} label="Auto Follow-up" isCollapsed={isCollapsed} />}
                        {canTools && <MenuItem to="tutorial" icon={HelpCircle} label="Tutorials" isCollapsed={isCollapsed} />}
                    </div>
                )}
            </div>
        </div>
    );
}
