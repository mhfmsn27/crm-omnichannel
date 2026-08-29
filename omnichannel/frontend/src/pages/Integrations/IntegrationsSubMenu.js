import React from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowRight, Zap, Activity, Mail, Video, MessageSquare, ShoppingBag } from 'lucide-react';
import { getApiUrl } from '../../config/api';

const MenuItem = ({ to, iconSrc, Icon, label, isBeta, isNew , isCollapsed}) => (
    <NavLink
        title={isCollapsed ? label : ''}
        to={to}
        className={({ isActive }) =>
            `w-full mb-2 px-3 py-2.5 rounded-lg border text-left shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group ${isActive
                ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-300'
                : 'bg-white border-transparent text-gray-600 hover:bg-gray-50 dark:bg-[#1e293b] dark:border-transparent dark:text-gray-300 dark:hover:bg-slate-800'
            }`
        }
    >
        <div className={`flex items-center gap-3 w-full ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="bg-gray-100 p-1.5 rounded-md group-hover:bg-orange-100 transition-colors dark:bg-slate-800">
                {Icon
                    ? <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    : <img src={getApiUrl(iconSrc)} alt="icon" className="w-4 h-4" />
                }
            </div>
            {!isCollapsed && (
        <div className="flex items-center gap-2">
                {!isCollapsed && <span className="font-bold text-xs truncate">{label}</span>}
                {isBeta && <span className="bg-yellow-100 text-yellow-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase dark:bg-yellow-900/30 dark:text-yellow-400">Soon</span>}
                {isNew && <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase dark:bg-green-900/30 dark:text-green-400">New</span>}
            </div>
        )}
        </div>
        {!isCollapsed && <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400" />}
    </NavLink>
);

export default function IntegrationsSubMenu({ isCollapsed }) {
    return (
        <div className="flex flex-col">
            <div className="mb-2 px-1">
                {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Messaging Channels</p>}
                <MenuItem to="whatsapp" iconSrc="/icons/whatsapp-unofficial.svg" label="WhatsApp"  isCollapsed={isCollapsed} />
                <MenuItem to="wa-api" iconSrc="/icons/whatsapp-official.svg" label="WhatsApp API"  isCollapsed={isCollapsed} />
                <MenuItem to="wa-coex" iconSrc="/icons/whatsapp-official.svg" label="WhatsApp CoEx"  isCollapsed={isCollapsed} />
                <MenuItem to="email" Icon={Mail} label="Email Inbox" isNew isCollapsed={isCollapsed} />
                <MenuItem to="messenger" iconSrc="/icons/messenger.svg" label="Messenger" isNew  isCollapsed={isCollapsed} />
                <MenuItem to="instagram" iconSrc="/icons/instagram.svg" label="Instagram" isNew  isCollapsed={isCollapsed} />
                <MenuItem to="tiktok" Icon={Video} label="TikTok Shop & DM" isNew isCollapsed={isCollapsed} />
                <MenuItem to="shopee" Icon={ShoppingBag} label="Shopee Chat" isNew isCollapsed={isCollapsed} />
                <MenuItem to="tokopedia" Icon={ShoppingBag} label="Tokopedia Chat" isNew isCollapsed={isCollapsed} />
                <MenuItem to="line" Icon={MessageSquare} label="LINE Official" isNew isCollapsed={isCollapsed} />
                <MenuItem to="telegram" iconSrc="/icons/telegram.svg" label="Telegram" isNew  isCollapsed={isCollapsed} />
                <MenuItem to="webchat" iconSrc="/icons/webchat.svg" label="Webchat Widget"  isCollapsed={isCollapsed} />
            </div>

            <div className="mt-2 px-1 border-t border-gray-200 dark:border-slate-700 pt-4">
                {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Automation</p>}
                <MenuItem to="zapier" Icon={Zap} label="Zapier & Make" isNew  isCollapsed={isCollapsed} />
            </div>

            <div className="mt-2 px-1 border-t border-gray-200 dark:border-slate-700 pt-4">
                {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Monitoring</p>}
                <MenuItem to="device-health" Icon={Activity} label="Device Health" isNew  isCollapsed={isCollapsed} />
            </div>

            <div className="mt-2 px-1 border-t border-gray-200 dark:border-slate-700 pt-4">
                {!isCollapsed && <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Extensions & APIs</p>}
                <MenuItem to="ecommerce" iconSrc="/icons/shopee.svg" label="E-Commerce"  isCollapsed={isCollapsed} />
                <MenuItem to="ongkir" iconSrc="/icons/package.svg" Icon={Zap} label="Ongkir & Shipping"  isCollapsed={isCollapsed} />
                <MenuItem to="webhooks" Icon={Zap} label="Webhook Outbound"  isCollapsed={isCollapsed} />
            </div>
        </div>
    );
}