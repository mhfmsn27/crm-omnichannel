import React from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
    WhatsAppIcon,
    WhatsAppApiIcon,
    WhatsAppCoExIcon,
    EmailIcon,
    MessengerIcon,
    InstagramIcon,
    TikTokIcon,
    ShopeeIcon,
    TokopediaIcon,
    LineIcon,
    TelegramIcon,
    WebchatIcon,
    ZapierIcon,
    DeviceHealthIcon,
    EcommerceIcon,
    OngkirIcon,
    WebhookIcon
} from '../../components/common/ChannelIcons';

const MenuItem = ({ to, Icon, label, isBeta, isNew, isCollapsed }) => (
    <NavLink
        title={isCollapsed ? label : ''}
        to={to}
        className={({ isActive }) =>
            `w-full mb-1.5 px-3 py-2.5 rounded-xl border text-left shadow-2xs hover:shadow-xs transition-all duration-200 flex items-center justify-between group ${isActive
                ? 'bg-orange-50/80 border-orange-500 text-orange-700 dark:bg-orange-950/30 dark:border-orange-500 dark:text-orange-300 font-bold'
                : 'bg-white border-gray-100/80 text-gray-700 hover:bg-gray-50/80 dark:bg-[#1e293b] dark:border-slate-800/80 dark:text-gray-200 dark:hover:bg-slate-800'
            }`
        }
    >
        <div className={`flex items-center gap-3 w-full ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="p-1 rounded-lg transition-transform group-hover:scale-110 shrink-0 flex items-center justify-center">
                {Icon && <Icon className="w-5 h-5" />}
            </div>
            {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-semibold text-xs truncate text-gray-800 dark:text-gray-100">{label}</span>
                    {isBeta && (
                        <span className="bg-yellow-100 text-yellow-800 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase dark:bg-yellow-950 dark:text-yellow-400 shrink-0">
                            Soon
                        </span>
                    )}
                    {isNew && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
                            New
                        </span>
                    )}
                </div>
            )}
        </div>
        {!isCollapsed && <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500 shrink-0" />}
    </NavLink>
);

export default function IntegrationsSubMenu({ isCollapsed }) {
    return (
        <div className="flex flex-col">
            {/* 1. Messaging Channels */}
            <div className="mb-2 px-1">
                {!isCollapsed && (
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                        Messaging Channels
                    </p>
                )}
                <MenuItem to="whatsapp" Icon={WhatsAppIcon} label="WhatsApp" isCollapsed={isCollapsed} />
                <MenuItem to="wa-api" Icon={WhatsAppApiIcon} label="WhatsApp API" isCollapsed={isCollapsed} />
                <MenuItem to="wa-coex" Icon={WhatsAppCoExIcon} label="WhatsApp CoEx" isCollapsed={isCollapsed} />
                <MenuItem to="email" Icon={EmailIcon} label="Email Inbox" isNew isCollapsed={isCollapsed} />
                <MenuItem to="messenger" Icon={MessengerIcon} label="Messenger" isNew isCollapsed={isCollapsed} />
                <MenuItem to="instagram" Icon={InstagramIcon} label="Instagram" isNew isCollapsed={isCollapsed} />
                <MenuItem to="tiktok" Icon={TikTokIcon} label="TikTok Shop & DM" isNew isCollapsed={isCollapsed} />
                <MenuItem to="shopee" Icon={ShopeeIcon} label="Shopee Chat" isNew isCollapsed={isCollapsed} />
                <MenuItem to="tokopedia" Icon={TokopediaIcon} label="Tokopedia Chat" isNew isCollapsed={isCollapsed} />
                <MenuItem to="line" Icon={LineIcon} label="LINE Official" isNew isCollapsed={isCollapsed} />
                <MenuItem to="telegram" Icon={TelegramIcon} label="Telegram" isNew isCollapsed={isCollapsed} />
                <MenuItem to="webchat" Icon={WebchatIcon} label="Webchat Widget" isCollapsed={isCollapsed} />
            </div>

            {/* 2. Automation */}
            <div className="mt-2 px-1 border-t border-gray-100 dark:border-slate-800 pt-3">
                {!isCollapsed && (
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                        Automation
                    </p>
                )}
                <MenuItem to="zapier" Icon={ZapierIcon} label="Zapier & Make" isNew isCollapsed={isCollapsed} />
            </div>

            {/* 3. Monitoring */}
            <div className="mt-2 px-1 border-t border-gray-100 dark:border-slate-800 pt-3">
                {!isCollapsed && (
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                        Monitoring
                    </p>
                )}
                <MenuItem to="device-health" Icon={DeviceHealthIcon} label="Device Health" isNew isCollapsed={isCollapsed} />
            </div>

            {/* 4. Extensions & APIs */}
            <div className="mt-2 px-1 border-t border-gray-100 dark:border-slate-800 pt-3">
                {!isCollapsed && (
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                        Extensions & APIs
                    </p>
                )}
                <MenuItem to="ecommerce" Icon={EcommerceIcon} label="E-Commerce" isCollapsed={isCollapsed} />
                <MenuItem to="ongkir" Icon={OngkirIcon} label="Ongkir & Shipping" isCollapsed={isCollapsed} />
                <MenuItem to="webhooks" Icon={WebhookIcon} label="Webhook Outbound" isCollapsed={isCollapsed} />
            </div>
        </div>
    );
}