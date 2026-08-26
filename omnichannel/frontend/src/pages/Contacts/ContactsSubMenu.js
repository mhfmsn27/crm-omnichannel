import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Tag, Phone, ShieldCheck, MapPin, UserPlus } from 'lucide-react';

const MenuItem = ({ to, icon: Icon, label, isNew , isCollapsed}) => (
    <NavLink
        title={isCollapsed ? label : ''}
        to={to} 
        className={({ isActive }) => 
            `w-full mb-2 px-3 py-2.5 rounded-lg border text-left shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group ${
                isActive 
                ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-300' 
                : 'bg-white border-transparent text-gray-600 hover:bg-gray-50 dark:bg-[#1e293b] dark:border-transparent dark:text-gray-300 dark:hover:bg-slate-800'
            }`
        }
    >
        <div className={`flex items-center gap-3 w-full ${isCollapsed ? 'justify-center' : ''}`}>
            <div className={`p-1.5 rounded-md transition-colors ${
                // Use generic classes for inactive state to allow CSS Override
                'bg-gray-100 text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 dark:bg-slate-800 dark:text-slate-400'
            }`}>
                <Icon className="w-4 h-4" />
            </div>
            {!isCollapsed && (
        <div className="flex items-center gap-2">
                {!isCollapsed && <span className="font-bold text-xs truncate">{label}</span>}
                {isNew && <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase dark:bg-green-900/30 dark:text-green-400">New</span>}
            </div>
        )}
        </div>
    </NavLink>
);

export default function ContactsSubMenu({ isCollapsed }) {
  return (
    <div className="flex flex-col">
        <div className="mb-2 px-1">
            {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Database</p>}
            <MenuItem to="list" icon={Users} label="All Contacts"  isCollapsed={isCollapsed} />
            <MenuItem to="labels" icon={Tag} label="Label Management"  isCollapsed={isCollapsed} />
        </div>

        <div className="mt-2 px-1 border-t border-gray-200 dark:border-slate-700 pt-4">
            {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Tools</p>}
            <MenuItem to="/tools/check-number" icon={ShieldCheck} label="Check Number"  isCollapsed={isCollapsed} />
            <MenuItem to="/tools/group-extractor" icon={UserPlus} label="Group Extractor"  isCollapsed={isCollapsed} />
            <MenuItem to="/tools/scraper" icon={MapPin} label="GMaps Scraper"  isCollapsed={isCollapsed} />
        </div>
    </div>
  );
}
