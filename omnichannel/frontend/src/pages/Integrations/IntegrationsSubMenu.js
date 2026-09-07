import React from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowRight, LayoutTemplate } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPerm } from '../../utils/rbac';
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
            `shrink-0 md:w-full mb-0 md:mb-1.5 px-3 py-2 md:py-2.5 rounded-xl border text-left shadow-2xs hover:shadow-xs transition-all duration-200 flex items-center justify-between group whitespace-nowrap ${isActive
                ? 'bg-orange-50/80 border-orange-500 text-orange-700 dark:bg-orange-950/30 dark:border-orange-500 dark:text-orange-300 font-bold'
                : 'bg-white border-gray-100/80 text-gray-700 hover:bg-gray-50/80 dark:bg-[#1e293b] dark:border-slate-800/80 dark:text-gray-200 dark:hover:bg-slate-800 font-medium'
            }`
        }
    >
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'md:justify-center' : ''}`}>
            <div className="p-1 rounded-lg transition-transform group-hover:scale-110 shrink-0 flex items-center justify-center">
                {Icon && <Icon className="w-5 h-5" />}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-xs ${isCollapsed ? 'md:hidden' : ''} text-gray-800 dark:text-gray-100`}>{label}</span>
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
        </div>
        {!isCollapsed && <ArrowRight className="hidden md:block w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500 shrink-0 ml-2" />}
    </NavLink>
);

export default function IntegrationsSubMenu({ isCollapsed }) {
    const { user } = useAuth();
    const canIntegrations = hasPerm(user, 'manage_integrations');
    const canTemplates = hasPerm(user, 'manage_templates');
    const canWebhooks = hasPerm(user, 'manage_webhooks');

    return (
        <div className="flex flex-col w-full">
            {/* MOBILE ONLY: Horizontal Scrollable Tab Bar */}
            <div className="md:hidden flex flex-row overflow-x-auto no-scrollbar gap-1.5 py-1 px-1 pb-1.5 w-full">
                {canIntegrations && <MenuItem to="whatsapp" Icon={WhatsAppIcon} label="WhatsApp" isCollapsed={false} />}
                {canIntegrations && <MenuItem to="wa-api" Icon={WhatsAppApiIcon} label="WhatsApp API" isCollapsed={false} />}
                {canIntegrations && <MenuItem to="wa-coex" Icon={WhatsAppCoExIcon} label="WhatsApp CoEx" isCollapsed={false} />}
                {canTemplates && <MenuItem to="templates" Icon={LayoutTemplate} label="Meta Templates" isNew isCollapsed={false} />}
                {canIntegrations && <MenuItem to="email" Icon={EmailIcon} label="Email Inbox" isNew isCollapsed={false} />}
                {canIntegrations && <MenuItem to="messenger" Icon={MessengerIcon} label="Messenger" isNew isCollapsed={false} />}
                {canIntegrations && <MenuItem to="instagram" Icon={InstagramIcon} label="Instagram" isNew isCollapsed={false} />}
                {canIntegrations && <MenuItem to="tiktok" Icon={TikTokIcon} label="TikTok Shop" isNew isCollapsed={false} />}
                {canIntegrations && <MenuItem to="shopee" Icon={ShopeeIcon} label="Shopee" isNew isCollapsed={false} />}
                {canIntegrations && <MenuItem to="tokopedia" Icon={TokopediaIcon} label="Tokopedia" isNew isCollapsed={false} />}
                {canIntegrations && <MenuItem to="line" Icon={LineIcon} label="LINE" isNew isCollapsed={false} />}
                {canIntegrations && <MenuItem to="telegram" Icon={TelegramIcon} label="Telegram" isNew isCollapsed={false} />}
                {canIntegrations && <MenuItem to="webchat" Icon={WebchatIcon} label="Webchat" isCollapsed={false} />}
                {canIntegrations && <MenuItem to="zapier" Icon={ZapierIcon} label="Zapier & Make" isNew isCollapsed={false} />}
                {canIntegrations && <MenuItem to="device-health" Icon={DeviceHealthIcon} label="Device Health" isNew isCollapsed={false} />}
                {canIntegrations && <MenuItem to="ecommerce" Icon={EcommerceIcon} label="E-Commerce" isCollapsed={false} />}
                {canIntegrations && <MenuItem to="ongkir" Icon={OngkirIcon} label="Ongkir" isCollapsed={false} />}
                {canWebhooks && <MenuItem to="webhooks" Icon={WebhookIcon} label="Webhooks" isCollapsed={false} />}
            </div>

            {/* DESKTOP/TABLET ONLY: Vertical Categorized Sidebar */}
            <div className="hidden md:flex md:flex-col">
                {/* 1. Messaging Channels */}
                {(canIntegrations || canTemplates) && (
                    <div className="mb-2 px-1">
                        {!isCollapsed && (
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                                Messaging Channels
                            </p>
                        )}
                        {canIntegrations && <MenuItem to="whatsapp" Icon={WhatsAppIcon} label="WhatsApp" isCollapsed={isCollapsed} />}
                        {canIntegrations && <MenuItem to="wa-api" Icon={WhatsAppApiIcon} label="WhatsApp API" isCollapsed={isCollapsed} />}
                        {canIntegrations && <MenuItem to="wa-coex" Icon={WhatsAppCoExIcon} label="WhatsApp CoEx" isCollapsed={isCollapsed} />}
                        {canTemplates && <MenuItem to="templates" Icon={LayoutTemplate} label="Meta Cloud Templates" isNew isCollapsed={isCollapsed} />}
                        {canIntegrations && <MenuItem to="email" Icon={EmailIcon} label="Email Inbox" isNew isCollapsed={isCollapsed} />}
                        {canIntegrations && <MenuItem to="messenger" Icon={MessengerIcon} label="Messenger" isNew isCollapsed={isCollapsed} />}
                        {canIntegrations && <MenuItem to="instagram" Icon={InstagramIcon} label="Instagram" isNew isCollapsed={isCollapsed} />}
                        {canIntegrations && <MenuItem to="tiktok" Icon={TikTokIcon} label="TikTok Shop & DM" isNew isCollapsed={isCollapsed} />}
                        {canIntegrations && <MenuItem to="shopee" Icon={ShopeeIcon} label="Shopee Chat" isNew isCollapsed={isCollapsed} />}
                        {canIntegrations && <MenuItem to="tokopedia" Icon={TokopediaIcon} label="Tokopedia Chat" isNew isCollapsed={isCollapsed} />}
                        {canIntegrations && <MenuItem to="line" Icon={LineIcon} label="LINE Official" isNew isCollapsed={isCollapsed} />}
                        {canIntegrations && <MenuItem to="telegram" Icon={TelegramIcon} label="Telegram" isNew isCollapsed={isCollapsed} />}
                        {canIntegrations && <MenuItem to="webchat" Icon={WebchatIcon} label="Webchat Widget" isCollapsed={isCollapsed} />}
                    </div>
                )}

                {/* 2. Automation */}
                {canIntegrations && (
                    <div className="mt-2 px-1 border-t border-gray-100 dark:border-slate-800 pt-3">
                        {!isCollapsed && (
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                                Automation
                            </p>
                        )}
                        <MenuItem to="zapier" Icon={ZapierIcon} label="Zapier & Make" isNew isCollapsed={isCollapsed} />
                    </div>
                )}

                {/* 3. Monitoring */}
                {canIntegrations && (
                    <div className="mt-2 px-1 border-t border-gray-100 dark:border-slate-800 pt-3">
                        {!isCollapsed && (
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                                Monitoring
                            </p>
                        )}
                        <MenuItem to="device-health" Icon={DeviceHealthIcon} label="Device Health" isNew isCollapsed={isCollapsed} />
                    </div>
                )}

                {/* 4. Extensions & APIs */}
                {(canIntegrations || canWebhooks) && (
                    <div className="mt-2 px-1 border-t border-gray-100 dark:border-slate-800 pt-3">
                        {!isCollapsed && (
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                                Extensions & APIs
                            </p>
                        )}
                        {canIntegrations && <MenuItem to="ecommerce" Icon={EcommerceIcon} label="E-Commerce" isCollapsed={isCollapsed} />}
                        {canIntegrations && <MenuItem to="ongkir" Icon={OngkirIcon} label="Ongkir & Shipping" isCollapsed={isCollapsed} />}
                        {canWebhooks && <MenuItem to="webhooks" Icon={WebhookIcon} label="Webhook Outbound" isCollapsed={isCollapsed} />}
                    </div>
                )}
            </div>
        </div>
    );
}