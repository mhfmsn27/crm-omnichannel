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
            className="flex flex-col items-center md:items-start text-center md:text-left p-2.5 md:p-4 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#334155] rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 group h-full justify-center md:justify-start"
        >
            <div className={`p-2 md:p-3 rounded-lg ${theme.bg} bg-opacity-10 dark:bg-opacity-20 group-hover:bg-opacity-20 dark:group-hover:bg-opacity-30 transition-colors mb-1.5 md:mb-3`}>
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${theme.text} ${theme.darkText}`} />
            </div>
            <h4 className="font-bold text-gray-800 dark:text-gray-100 text-[10px] md:text-sm leading-tight md:leading-normal">{label}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden md:block">{desc}</p>
        </Link>
    );
};

export default function QuickActions() {
    return (
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4 mb-6 md:mb-8">
            <ActionCard to="/integrations" icon={Plus} label="Connect" desc="Add WA, IG, FB" color="indigo" />
            <ActionCard to="/broadcast/create" icon={Rocket} label="Campaign" desc="Send Broadcast" color="purple" />
            <ActionCard to="/tools/check-number" icon={ShieldCheck} label="Checker" desc="Validate WA" color="green" />
            <ActionCard to="/contacts/list" icon={Users} label="Contacts" desc="Manage DB" color="blue" />
            <ActionCard to="/invoicing/create" icon={FileText} label="Invoice" desc="Send Bill" color="orange" />
            <ActionCard to="/reports" icon={BarChart2} label="Reports" desc="Analytics" color="teal" />
        </div>
    );
}
