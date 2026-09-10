import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, ShieldCheck, Rocket, Users, FileText, BarChart2 } from 'lucide-react';

const COLORS = {
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', darkText: 'dark:text-indigo-400' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-600', darkText: 'dark:text-purple-400' },
    green: { bg: 'bg-green-600', text: 'text-green-600', darkText: 'dark:text-green-400' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-500', darkText: 'dark:text-blue-400' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-500', darkText: 'dark:text-orange-400' },
    teal: { bg: 'bg-teal-500', text: 'text-teal-600', darkText: 'dark:text-teal-400' },
};

const ActionCard = ({ to, icon: Icon, label, color, desc }) => {
    const theme = COLORS[color] || COLORS.indigo;

    return (
        <Link
            to={to}
            className="flex flex-col items-center md:items-start text-center md:text-left p-2.5 sm:p-3 md:p-4 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#334155] rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200 group h-full justify-center md:justify-start min-h-[76px] sm:min-h-[88px]"
        >
            <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl ${theme.bg} bg-opacity-10 dark:bg-opacity-20 group-hover:bg-opacity-25 transition-all flex items-center justify-center mb-1.5 sm:mb-2 md:mb-3 shrink-0`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${theme.text} ${theme.darkText}`} />
            </div>
            <h4 className="font-bold text-gray-800 dark:text-gray-100 text-[11px] sm:text-xs md:text-sm leading-tight">
                {label}
            </h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 hidden md:block">
                {desc}
            </p>
        </Link>
    );
};

export default function QuickActions() {
    return (
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 mb-6 md:mb-8">
            <ActionCard to="/integrations" icon={Plus} label="Connect" desc="Add WA, IG, FB" color="indigo" />
            <ActionCard to="/broadcast/create" icon={Rocket} label="Campaign" desc="Send Broadcast" color="purple" />
            <ActionCard to="/tools/check-number" icon={ShieldCheck} label="Checker" desc="Validate WA" color="green" />
            <ActionCard to="/contacts/list" icon={Users} label="Contacts" desc="Manage DB" color="blue" />
            <ActionCard to="/invoicing/create" icon={FileText} label="Invoice" desc="Send Bill" color="orange" />
            <ActionCard to="/reports" icon={BarChart2} label="Reports" desc="Analytics" color="teal" />
        </div>
    );
}
