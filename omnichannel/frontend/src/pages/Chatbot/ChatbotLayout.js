import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Bot, Database, Key, HelpCircle, ArrowRight, Brain, GitBranch, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePageTitle } from '../../context/HeaderContext';

const MenuItem = ({ to, icon: Icon, label, isCollapsed }) => (
    <NavLink 
        to={to} 
        title={isCollapsed ? label : ''}
        className={({ isActive }) => 
            `w-full mb-2 px-3 py-2.5 rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group ${
                isActive 
                ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-300' 
                : 'bg-white border-transparent text-gray-600 hover:bg-gray-50 dark:bg-[#1e293b] dark:border-transparent dark:text-gray-300'
            }`
        }
    >
        <div className={`flex items-center gap-3 w-full ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="bg-gray-100 p-1.5 rounded-md text-gray-500 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors dark:bg-slate-800 dark:text-slate-400">
                <Icon className="w-4 h-4" />
            </div>
            {!isCollapsed && <span className="font-bold text-xs truncate">{label}</span>}
        </div>
        {!isCollapsed && <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 shrink-0" />}
    </NavLink>
);

export default function ChatbotLayout() {
  usePageTitle('CHATBOT & AUTOMATION');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="p-3 sm:p-4 md:p-6 min-h-screen bg-gray-50 dark:bg-[#0f172a]">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
        {/* Left Sidebar */}
        <aside className={`flex-shrink-0 transition-all duration-300 md:sticky md:top-6 ${isCollapsed ? 'w-full md:w-16' : 'w-full md:w-52'} relative`}>
           {/* Toggle Button */}
           <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex absolute -right-3.5 top-7 z-[60] w-7 h-7 bg-white text-gray-500 rounded-full shadow-md items-center justify-center border border-gray-200 hover:scale-110 hover:text-orange-500 transition-transform cursor-pointer"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

           <div className="flex flex-col px-1">
                <MenuItem to="list" icon={Bot} label="Manage Bots" isCollapsed={isCollapsed} />
                <MenuItem to="flows" icon={GitBranch} label="Visual Flow" isCollapsed={isCollapsed} />
                <MenuItem to="training" icon={Brain} label="AI Training" isCollapsed={isCollapsed} />
                <MenuItem to="global-kb" icon={Database} label="Global Knowledge" isCollapsed={isCollapsed} />
                <MenuItem to="multi-language" icon={Bot} label="Multi-Language AI" isCollapsed={isCollapsed} />
                <MenuItem to="api" icon={Key} label="API Settings" isCollapsed={isCollapsed} />
                <MenuItem to="tutorial" icon={HelpCircle} label="Tutorial" isCollapsed={isCollapsed} />
           </div>
        </aside>

        {/* Right Content */}
        <main className="flex-1 w-full bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-100 dark:border-[#334155] min-h-[400px] md:min-h-[600px] relative overflow-hidden transition-all duration-300">
           <Outlet />
        </main>
      </div>
    </div>
  );
}
