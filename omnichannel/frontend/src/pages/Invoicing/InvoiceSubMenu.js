import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, PlusCircle, Settings, ArrowRight, Repeat, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPerm } from '../../utils/rbac';

const MenuItem = ({ to, icon: Icon, label, isCollapsed }) => (
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
            <span className={`text-xs ${isCollapsed ? 'md:hidden' : ''}`}>{label}</span>
        </div>
        {!isCollapsed && <ArrowRight className="hidden md:block w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 shrink-0 ml-2" />}
    </NavLink>
);

export default function InvoiceSubMenu({ isCollapsed }) {
    const { user } = useAuth();
    const canInvoice = hasPerm(user, 'manage_invoice');
    const canBulk = hasPerm(user, 'bulk_invoice');
    const canRecurring = hasPerm(user, 'recurring_invoice');

    return (
        <div className="flex flex-row md:flex-col overflow-x-auto no-scrollbar gap-1.5 md:gap-0 pb-1.5 md:pb-0 px-1 w-full">
            {canInvoice && <MenuItem to="list" icon={FileText} label="Semua Faktur & SPO" isCollapsed={isCollapsed} />}
            {canInvoice && <MenuItem to="create" icon={PlusCircle} label="Buat Faktur / SPO" isCollapsed={isCollapsed} />}
            {canBulk && <MenuItem to="bulk" icon={Upload} label="Import Tagihan Massal" isCollapsed={isCollapsed} />}
            {canRecurring && <MenuItem to="recurring" icon={Repeat} label="Faktur Berlangganan" isCollapsed={isCollapsed} />}
            {canInvoice && <MenuItem to="settings" icon={Settings} label="Pengaturan" isCollapsed={isCollapsed} />}
        </div>
    );
}
