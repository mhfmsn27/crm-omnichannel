import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, Package, Settings,
  MessageSquare, Megaphone, QrCode, Bot,
  LogOut, BarChart2, LayoutTemplate,
  Wrench, Code, Columns, Ticket, CheckSquare,
  Menu, ChevronLeft, ChevronRight, Settings2, FileText, Repeat2, Receipt, ChevronDown, Inbox, Calendar, MapPin, X
} from 'lucide-react';
import axios from 'axios';

import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useLanguage } from '../../i18n';
import { useTheme } from '../../context/ThemeContext';
import { getApiUrl } from '../../config/api';

import { hasPerm } from '../../utils/rbac';

// Dynamic route prefetch helper to eliminate initial chunk load delay
const prefetchRoute = (path) => {
  if (!path) return;
  const rootPath = '/' + path.split('/')[1];
  switch (rootPath) {
    case '/dashboard':
      import('../../pages/DashboardPage');
      break;
    case '/inbox':
      import('../../pages/InboxPage');
      break;
    case '/contacts':
      import('../../pages/Contacts/ContactsLayout');
      import('../../pages/Contacts/ContactListPage');
      break;
    case '/leads':
      import('../../pages/Contacts/LeadListPage');
      break;
    case '/bookings':
      import('../../pages/Bookings/BookingsPage');
      break;
    case '/broadcast':
      import('../../pages/Broadcast/BroadcastLayout');
      import('../../pages/Broadcast/CreateCampaign');
      break;
    case '/chatbot':
      import('../../pages/Chatbot/ChatbotLayout');
      import('../../pages/Chatbot/BotListPage');
      break;
    case '/pipelines':
    case '/pipeline':
      import('../../pages/Pipeline/PipelineListPage');
      break;
    case '/sales-visits':
      import('../../pages/CRM/SalesVisitPage');
      break;
    case '/products':
      import('../../pages/Products/ProductListPage');
      break;
    case '/tasks':
      import('../../pages/Tasks/TaskListPage');
      break;
    case '/tickets':
      import('../../pages/Tickets/TicketListPage');
      break;
    case '/invoicing':
      import('../../pages/Invoicing/InvoiceLayout');
      import('../../pages/Invoicing/InvoiceList');
      break;
    case '/reports':
    case '/analytics':
      import('../../pages/Reports/ReportsLayout');
      import('../../pages/Reports/GeneralReport');
      break;
    case '/wallboard':
      import('../../pages/Reports/LiveWallboardPage');
      break;
    case '/tools':
      import('../../pages/Tools/ToolsLayout');
      break;
    case '/integrations':
      import('../../pages/Integrations/IntegrationsLayout');
      import('../../pages/Integrations/WhatsAppDevicePage');
      break;
    case '/settings':
      import('../../pages/Settings/SettingsLayout');
      import('../../pages/Settings/TeamSettings');
      break;
    case '/developer':
      import('../../pages/Developer/DeveloperLayout');
      break;
    case '/account':
      import('../../pages/Account/AccountLayout');
      break;
    default:
      break;
  }
};

const MenuItem = ({ icon: Icon, active, label, to, onClick, showLabel, subItems, isSubExpanded, onToggleSub, locationPath, currentPresetConfig }) => {
  const hasSub = subItems && subItems.length > 0;
  const isClassic = currentPresetConfig?.id === 'classic';

  const activeClasses = currentPresetConfig?.activeMenuClass || 'bg-[#E7F7F2] text-[#008069] shadow-2xs font-bold border border-[#A2E2CD]';
  const inactiveClasses = currentPresetConfig?.inactiveMenuClass || 'text-slate-600 dark:text-slate-300 hover:bg-[#E7F7F2]/70 dark:hover:bg-[#008069]/15 hover:text-[#008069] dark:hover:text-[#25D366] hover:border-[#A2E2CD]/70 dark:hover:border-[#008069]/30 border border-transparent';

  const baseClasses = `group relative flex items-center w-full cursor-pointer transition-all duration-200 ease-out rounded-xl
    ${showLabel ? 'px-3 py-2.5 justify-between hover:translate-x-1.5' : 'justify-center p-2.5 hover:scale-105'}
    ${active || isSubExpanded ? activeClasses : inactiveClasses}`;

  return (
    <div className="flex flex-col w-full">
      <div className={baseClasses}>
        <Link 
          to={to} 
          onClick={(e) => {
            if (hasSub && !isSubExpanded && onToggleSub) {
              onToggleSub();
            }
            if (onClick) onClick(e);
          }} 
          onMouseEnter={() => prefetchRoute(to)}
          className={`flex items-center ${showLabel ? 'gap-3 min-w-0 flex-1' : 'justify-center w-full'}`}
        >
          {active && showLabel && !hasSub && (
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full ${
              currentPresetConfig?.indicatorClass || 'bg-[#008069]'
            }`} />
          )}
          <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-all duration-200 ${
            active 
              ? (isClassic ? 'text-white scale-105' : 'text-[#008069] dark:text-[#25D366] scale-105') 
              : (isClassic ? 'text-white/75 group-hover:text-white group-hover:scale-110' : 'text-slate-500 dark:text-slate-400 group-hover:text-[#008069] dark:group-hover:text-[#25D366] group-hover:scale-110')
          }`} />
          {showLabel && (
            <span className={`text-[13px] transition-all duration-200 truncate ${
              active 
                ? 'font-bold' 
                : 'font-medium group-hover:font-semibold group-hover:text-[#008069] dark:group-hover:text-[#25D366]'
            }`}>
              {label}
            </span>
          )}
        </Link>
        {showLabel && hasSub && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSub();
            }}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title={isSubExpanded ? "Tutup Submenu" : "Buka Submenu"}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${
              isSubExpanded 
                ? 'rotate-180 text-[#008069] dark:text-[#25D366]' 
                : 'text-slate-400 group-hover:text-[#008069] dark:group-hover:text-[#25D366]'
            }`} />
          </button>
        )}
        {!showLabel && (
          <div className="absolute left-14 z-[100] px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0 flex items-center hidden md:flex">
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
            <span className="relative z-10">{label}</span>
          </div>
        )}
      </div>

      {/* Sub Items (Only visible if Sidebar is expanded) */}
      {hasSub && isSubExpanded && showLabel && (
         <div className="flex flex-col gap-1 mt-1 pl-9 pr-2 animate-in slide-in-from-top-2 duration-150">
            {subItems.map((sub, idx) => (
                <Link
                   key={idx}
                   to={sub.path}
                   onClick={onClick}
                   onMouseEnter={() => prefetchRoute(sub.path)}
                   className={`flex items-center w-full px-3 py-1.5 text-xs rounded-lg transition-all duration-200 hover:translate-x-1.5
                     ${locationPath === sub.path 
                        ? (currentPresetConfig?.activeSubmenuClass || 'bg-[#E7F7F2] dark:bg-[#008069]/25 text-[#008069] dark:text-[#25D366] font-bold border border-[#A2E2CD]/80') 
                        : (currentPresetConfig?.inactiveSubmenuClass || 'text-slate-500 dark:text-slate-400 hover:bg-[#E7F7F2]/60 dark:hover:bg-[#008069]/15 hover:text-[#008069] dark:hover:text-[#25D366]')
                     }`}
                >
                   {sub.label}
                </Link>
            ))}
         </div>
      )}
    </div>
  );
};

// Mobile bottom nav item - Improved touch targets (44px minimum)
const MobileNavItem = ({ icon: Icon, label, to, active, onClick, isProminent }) => {
  if (isProminent) {
    return (
      <Link to={to} onClick={onClick} className="relative -top-3 group flex items-center justify-center flex-1">
        <div className={`
            w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 transition-transform active:scale-95
            ${active ? 'bg-[#008069] text-white shadow-[#008069]/30' : 'bg-slate-900 dark:bg-[#008069] text-white'}
        `}>
          <Icon className="w-5 h-5" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 min-h-[56px] gap-0.5 transition-colors ${
        active ? 'text-[#008069] dark:text-[#25D366] font-semibold' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium leading-tight text-center truncate max-w-[64px]">{label}</span>
    </Link>
  );
};

export default function Sidebar({ isExpanded, onToggle }) {
  const { user, logout } = useAuth();
  const { config, isFeatureDisabled } = useConfig();
  const { t } = useLanguage();
  const { currentPresetConfig } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [inboxes, setInboxes] = useState([]);
  const [selectedInbox, setSelectedInbox] = useState(null);
  const [showInboxDropdown, setShowInboxDropdown] = useState(false);
  const [inboxIsolationEnabled, setInboxIsolationEnabled] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const dropdownRef = useRef(null);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Listen for mobile header hamburger toggle event
  useEffect(() => {
    const handleToggleMobile = () => {
      setIsOpen((prev) => !prev);
    };
    window.addEventListener('TOGGLE_MOBILE_SIDEBAR', handleToggleMobile);
    return () => window.removeEventListener('TOGGLE_MOBILE_SIDEBAR', handleToggleMobile);
  }, []);

  // Determine if active chat conversation is open on mobile
  const searchParams = new URLSearchParams(location.search);
  const isChatOpen = location.pathname.startsWith('/inbox') && (searchParams.has('id') || searchParams.has('conversationId'));

  // Fetch inbox isolation setting and accessible inboxes
  useEffect(() => {
    const fetchInboxData = async () => {
      try {
        const settingsRes = await axios.get('/api/app/inboxes/settings');
        const isEnabled = settingsRes.data.inbox_isolation_enabled === true;
        setInboxIsolationEnabled(isEnabled);

        if (isEnabled) {
          const res = await axios.get('/api/app/inboxes/accessible');
          setInboxes(res.data);
          const searchParams = new URLSearchParams(location.search);
          const inboxIdFromUrl = searchParams.get('inbox_id');
          if (inboxIdFromUrl) {
            const found = res.data.find(i => i.id.toString() === inboxIdFromUrl.toString());
            if (found) setSelectedInbox(found);
          } else if (res.data.length > 0) {
            const defaultInbox = res.data.find(i => i.is_default) || res.data[0];
            if (!selectedInbox) setSelectedInbox(defaultInbox);
          }
        } else {
          setInboxes([]);
          setSelectedInbox(null);
        }
      } catch (err) {
        console.error('Failed to fetch inbox data:', err);
      }
    };
    fetchInboxData();
  }, [location.search]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const inboxIdFromUrl = searchParams.get('inbox_id');
    if (inboxIdFromUrl && inboxes.length > 0) {
      const found = inboxes.find(i => i.id.toString() === inboxIdFromUrl.toString());
      if (found && (!selectedInbox || selectedInbox.id !== found.id)) {
        setSelectedInbox(found);
      }
    }
  }, [location.pathname, inboxes]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowInboxDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInboxSelect = (inbox) => {
    setSelectedInbox(inbox);
    setShowInboxDropdown(false);

    if (location.pathname !== '/inbox') {
      const targetPath = inbox ? `/inbox?inbox_id=${inbox.id}` : '/inbox';
      navigate(targetPath);
    } else {
      const newUrl = inbox ? `?inbox_id=${inbox.id}` : '';
      window.history.pushState({}, '', newUrl);
      window.dispatchEvent(new CustomEvent('inbox-filter-change', { detail: { inboxId: inbox?.id } }));
    }
  };

  if (!user) return null;

  const showLabel = isExpanded || isOpen;

  // Build Menu dynamically based on role
  let menus = [];

  if (user?.role === 'super_admin') {
    menus = [
      { label: t('nav.dashboard', 'Dashboard'), path: '/admin/dashboard', icon: Home, section: 'Utama' },
      { label: t('nav.cms', 'CMS Content'), path: '/admin/cms', icon: LayoutTemplate, section: 'Manajemen' },
      { label: t('nav.members', 'Members'), path: '/admin/members', icon: Users, section: 'Manajemen' },
      { label: t('nav.system', 'System'), path: '/admin/system', icon: Settings, section: 'Sistem' },
    ];
  } else {
    // All Organization Roles (Owner, Admins, Agents with or without custom roles)
    const orgCandidateMenus = [
      { 
        label: t('nav.dashboard', 'Dashboard'), 
        path: '/dashboard', 
        icon: Home, 
        section: 'Utama',
        perm: null 
      },
      { 
        label: t('nav.integrations', 'Integrasi'), 
        path: '/integrations', 
        icon: QrCode,
        section: 'Komunikasi',
        perm: 'manage_integrations',
        subItems: [
          { label: 'WhatsApp Device', path: '/integrations/whatsapp', perm: 'manage_integrations' },
          { label: 'WhatsApp API', path: '/integrations/wa-api', perm: 'manage_integrations' },
          { label: 'Meta Templates', path: '/integrations/templates', perm: 'manage_templates' },
          { label: 'Email Inbox', path: '/integrations/email', perm: 'manage_integrations' },
          { label: 'Messenger & IG', path: '/integrations/messenger', perm: 'manage_integrations' },
          { label: 'Webchat Widget', path: '/integrations/webchat', perm: 'manage_integrations' },
          { label: 'Device Health', path: '/integrations/device-health', perm: 'manage_integrations' },
          { label: 'Webhooks & API', path: '/integrations/webhooks', perm: 'manage_webhooks' },
        ]
      },
      { 
        label: t('nav.inbox', 'Kotak Masuk'), 
        path: '/inbox', 
        icon: MessageSquare, 
        disabled: isFeatureDisabled('mod_inbox'),
        section: 'Komunikasi',
        perm: 'view_all_chats',
        subItems: [
          { label: 'All Channels', path: '/inbox', perm: 'view_all_chats' },
          { label: 'WhatsApp', path: '/inbox?channel=whatsapp', perm: 'view_all_chats' },
          { label: 'Messenger', path: '/inbox?channel=messenger', perm: 'view_all_chats' },
          { label: 'Instagram', path: '/inbox?channel=instagram', perm: 'view_all_chats' },
          { label: 'Telegram', path: '/inbox?channel=telegram', perm: 'view_all_chats' },
          { label: 'Webchat', path: '/inbox?channel=webchat', perm: 'view_all_chats' }
        ]
      },
      { 
        label: t('nav.contacts', 'Kontak'), 
        path: '/contacts', 
        icon: Users, 
        section: 'Komunikasi',
        perm: 'manage_contacts',
        subItems: [
          { label: 'Semua Kontak', path: '/contacts/list', perm: 'manage_contacts' },
          { label: 'Lead & Prospek', path: '/contacts/leads', perm: 'manage_leads' },
          { label: 'Import Kontak', path: '/contacts/import', perm: 'import_contacts' },
          { label: 'Manajemen Label', path: '/contacts/labels', perm: 'manage_labels' },
        ]
      },
      { 
        label: t('nav.bookings', 'Bookings'), 
        path: '/bookings', 
        icon: Calendar, 
        section: 'Komunikasi',
        perm: 'manage_bookings'
      },
      { 
        label: t('nav.broadcast', 'Broadcast'), 
        path: '/broadcast', 
        icon: Megaphone, 
        disabled: isFeatureDisabled('mod_broadcast'), 
        section: 'Komunikasi',
        perm: 'manage_broadcast',
        subItems: [
          { label: 'Buat Campaign', path: '/broadcast/create', perm: 'manage_broadcast' },
          { label: 'Jadwal Broadcast', path: '/broadcast/schedule', perm: 'broadcast_schedule' },
          { label: 'Laporan Riwayat', path: '/broadcast/reports', perm: 'broadcast_reports' },
          { label: 'Template Pesan', path: '/broadcast/templates', perm: 'manage_templates' },
          { label: 'Meta Templates', path: '/broadcast/meta-templates', perm: 'manage_templates' },
          { label: 'Rotator CS Link', path: '/broadcast/rotators', perm: 'manage_rotator' },
          { label: 'Upselling Campaign', path: '/broadcast/upselling', perm: 'manage_broadcast' },
        ]
      },
      { 
        label: t('nav.chatbot', 'Chatbot'), 
        path: '/chatbot', 
        icon: Bot, 
        disabled: isFeatureDisabled('mod_chatbot'),
        section: 'Komunikasi',
        perm: 'manage_chatbot',
        subItems: [
          { label: 'Kelola Bots', path: '/chatbot/list', perm: 'manage_chatbot' },
          { label: 'Visual Flow Builder', path: '/chatbot/flows', perm: 'manage_chatbot' },
          { label: 'AI Training', path: '/chatbot/training', perm: 'chatbot_training' },
          { label: 'Global Knowledge', path: '/chatbot/global-kb', perm: 'chatbot_training' },
          { label: 'Multi-Language AI', path: '/chatbot/multi-language', perm: 'chatbot_training' },
        ]
      },
      { 
        label: t('nav.pipeline', 'Pipeline'), 
        path: '/pipelines', 
        icon: Columns, 
        section: 'CRM & Bisnis',
        perm: 'manage_pipeline',
        subItems: [
          { label: 'Pipeline Board', path: '/pipelines', perm: 'manage_pipeline' },
          { label: 'Buat Pipeline Baru', path: '/pipelines/create', perm: 'manage_pipeline' },
        ]
      },
      { 
        label: t('nav.salesVisits', 'Kunjungan Sales'), 
        path: '/sales-visits', 
        icon: MapPin, 
        section: 'CRM & Bisnis',
        perm: 'manage_sales_visits'
      },
      { 
        label: t('nav.products', 'Produk'), 
        path: '/products', 
        icon: Package, 
        section: 'CRM & Bisnis',
        perm: 'manage_products'
      },
      { 
        label: t('nav.tasks', 'Tasks'), 
        path: '/tasks', 
        icon: CheckSquare, 
        section: 'CRM & Bisnis',
        perm: 'manage_tasks'
      },
      { 
        label: t('nav.tickets', 'Tickets'), 
        path: '/tickets', 
        icon: Ticket, 
        section: 'CRM & Bisnis',
        perm: 'manage_tickets'
      },
      { 
        label: t('nav.invoicing', 'Tagihan / Invoice'), 
        path: '/invoicing', 
        icon: Receipt, 
        section: 'CRM & Bisnis',
        perm: 'manage_invoice',
        subItems: [
          { label: 'Semua Faktur & SPO', path: '/invoicing/list', perm: 'manage_invoice' },
          { label: 'Buat Faktur Baru', path: '/invoicing/create', perm: 'manage_invoice' },
          { label: 'Import Tagihan Massal', path: '/invoicing/bulk', perm: 'bulk_invoice' },
          { label: 'Faktur Berlangganan', path: '/invoicing/recurring', perm: 'recurring_invoice' },
          { label: 'Pengaturan Faktur', path: '/invoicing/settings', perm: 'manage_invoice' },
        ]
      },
      { 
        label: t('nav.reports', 'Laporan'), 
        path: '/reports', 
        icon: BarChart2, 
        section: 'CRM & Bisnis',
        perm: 'view_reports',
        subItems: [
          { label: 'Overview & Ringkasan', path: '/reports/general', perm: 'view_reports' },
          { label: 'Advanced Analytics', path: '/reports/advanced-analytics', perm: 'view_analytics' },
          { label: 'Performa Tim Agen', path: '/reports/agent-performance', perm: 'view_reports' },
          { label: 'Survei CSAT', path: '/reports/csat', perm: 'view_csat' },
          { label: 'Sales KPI Dashboard', path: '/reports/sales-kpi', perm: 'view_reports' },
          { label: 'Customer Journey', path: '/reports/customer-journey', perm: 'view_analytics' },
          { label: 'Gamification Board', path: '/reports/gamification', perm: 'view_gamification' },
          { label: 'Live Wallboard TV', path: '/reports/wallboard', perm: 'view_wallboard' },
        ]
      },
      { 
        label: t('nav.tools', 'Tools'), 
        path: '/tools', 
        icon: Settings2,
        section: 'Sistem & Alat',
        perm: 'use_tools',
        subItems: [
          { label: 'WA Warmer Circle', path: '/tools/warmer', perm: 'use_warmer' },
          { label: 'Validasi Nomor WA', path: '/tools/check-number', perm: 'use_tools' },
          { label: 'Ekstrak Kontak Grup', path: '/tools/group-extractor', perm: 'use_tools' },
          { label: 'Interactive Chat Form', path: '/tools/chat-form', perm: 'manage_chatform' },
          { label: 'GMaps Lead Scraper', path: '/tools/scraper', perm: 'use_tools' },
          { label: 'Auto Follow-Up', path: '/tools/follow-up', perm: 'manage_followup' },
        ]
      },
      { 
        label: t('nav.settings', 'Pengaturan'), 
        path: '/settings', 
        icon: Wrench,
        section: 'Sistem & Alat',
        perm: 'manage_settings',
        subItems: [
          { label: 'Tim & Hak Akses', path: '/settings/team', perm: 'manage_team' },
          { label: 'Custom Contact Fields', path: '/settings/custom-fields', perm: 'manage_settings' },
          { label: 'Server Health & Backup', path: '/settings/system-health', perm: 'manage_system_health' },
          { label: 'Auto Reply & Balas Cepat', path: '/settings/auto-reply', perm: 'manage_settings' },
          { label: 'Kebijakan SLA & CS', path: '/settings/sla', perm: 'manage_settings' },
          { label: 'Kotak Masuk Terpisah', path: '/settings/inboxes', perm: 'manage_settings' },
          { label: 'Lisensi Domain', path: '/settings/license', perm: 'manage_settings' },
        ]
      },
    ];

    if (!isFeatureDisabled('api_public')) {
      orgCandidateMenus.push({ 
        label: t('nav.api', 'API Developer'), 
        path: '/developer', 
        icon: Code, 
        section: 'Sistem & Alat',
        perm: 'manage_api',
        subItems: [
          { label: 'My API Apps', path: '/developer/apps', perm: 'manage_api' },
          { label: 'Dokumentasi API', path: '/developer/docs', perm: 'manage_api' },
        ]
      });
    }

    // Filter candidate menus and their subItems based on RBAC permissions and feature toggles
    menus = orgCandidateMenus
      .filter(m => !m.disabled)
      .map(item => {
        const hasParentPerm = !item.perm || hasPerm(user, item.perm);
        if (item.subItems && item.subItems.length > 0) {
          const allowedSubItems = item.subItems.filter(sub => !sub.perm || hasPerm(user, sub.perm));
          return {
            ...item,
            basePath: item.path,
            targetPath: !hasParentPerm && allowedSubItems.length > 0 ? allowedSubItems[0].path : item.path,
            subItems: allowedSubItems
          };
        }
        return {
          ...item,
          basePath: item.path,
          targetPath: item.path
        };
      })
      .filter(item => {
        // Parent menu is included if:
        // 1. User has direct or fallback permission for parent, OR
        // 2. Parent has no perm requirement, OR
        // 3. Any of its sub-items are permitted
        const hasParentPerm = !item.perm || hasPerm(user, item.perm);
        const hasVisibleSubItems = item.subItems && item.subItems.length > 0;
        return hasParentPerm || hasVisibleSubItems;
      });
  }

  menus = menus.filter(m => !m.disabled);

  // Helper to group menus by sections with cards
  const sections = [];
  const sectionOrder = ['Utama', 'Komunikasi', 'CRM & Bisnis', 'Manajemen', 'Sistem & Alat', 'Sistem'];
  
  sectionOrder.forEach(secName => {
    const items = menus.filter(m => m.section === secName);
    if (items.length > 0) {
      sections.push({ title: secName, items });
    }
  });

  // Any remaining menus not caught by standard sections
  const otherItems = menus.filter(m => !m.section || !sectionOrder.includes(m.section));
  if (otherItems.length > 0) {
    sections.push({ title: 'Lainnya', items: otherItems });
  }

  const handleHover = (label, top) => {
    if (label) setHoveredItem({ label, top });
    else setHoveredItem(null);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Hover tooltip for other items like Collapse/Logout */}
      {!isExpanded && !isOpen && hoveredItem && (
        <div
          className="fixed left-16 z-[100] ml-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xl whitespace-nowrap flex items-center animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-200 pointer-events-none"
          style={{ top: hoveredItem.top + 10 }}
        >
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
          <span className="relative z-10">{hoveredItem.label}</span>
        </div>
      )}

      {/* Main Sidebar */}
      <div className={`
          fixed top-0 left-0 h-full
          ${currentPresetConfig?.sidebarClass || 'bg-white border-r border-slate-200/90'}
          flex flex-col py-3 z-50 shadow-sm
          transition-all duration-300 ease-in-out overflow-visible
          w-60
          ${isExpanded ? 'md:w-60' : 'md:w-16'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Floating Collapse Toggle */}
        <button
            onClick={onToggle}
            onMouseEnter={!isExpanded ? (e) => handleHover('Expand', e.currentTarget.getBoundingClientRect().top) : undefined}
            onMouseLeave={!isExpanded ? () => handleHover(null) : undefined}
            className={`hidden md:flex absolute -right-3.5 top-6 z-[60] w-7 h-7 ${currentPresetConfig?.toggleBtnClass || 'bg-white text-slate-600 border border-slate-200 shadow-sm hover:text-[#008069] hover:border-[#008069]'} rounded-full items-center justify-center hover:scale-105 transition-all cursor-pointer`}
        >
            {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Brand Header Card */}
        <div className="mb-3 flex-shrink-0 px-2 relative">
          {/* Mobile Drawer Close Button */}
          {isOpen && (
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden absolute -top-1 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors z-20 cursor-pointer"
              title="Tutup Menu"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className={`flex items-center gap-3 p-2 rounded-2xl ${
            currentPresetConfig?.id === 'classic' 
              ? 'bg-white/10 text-white' 
              : 'bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/80 shadow-2xs'
          }`}>
            {config.app_logo ? (
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-xs border border-slate-100 dark:border-slate-700 flex-shrink-0">
                <img src={getApiUrl(config.app_logo)} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className={`w-9 h-9 ${
                currentPresetConfig?.id === 'classic'
                  ? 'bg-white text-[#00A884]'
                  : 'bg-[#008069] text-white'
              } rounded-xl flex items-center justify-center font-bold text-base shadow-xs flex-shrink-0`}>
                {config.app_name ? config.app_name.charAt(0) : 'C'}
              </div>
            )}
            {showLabel && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <span className={`${currentPresetConfig?.brandTextClass || 'text-slate-900 dark:text-white'} font-bold text-sm truncate block leading-tight`}>
                  {config.app_name || 'CRMHub'}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentPresetConfig?.id === 'classic' ? 'bg-white' : 'bg-[#008069]'}`} />
                  <span className={`text-[10px] font-bold ${currentPresetConfig?.id === 'classic' ? 'text-white/80' : 'text-[#008069] dark:text-[#25D366]'} uppercase tracking-wider`}>
                    Omnichannel
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items with Categorized Cards & Dividers */}
        <div className={`flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden no-scrollbar ${showLabel ? 'px-2.5' : 'px-1.5'}`}>

          {/* Inbox Selector - Only show if inbox isolation is enabled */}
          {inboxIsolationEnabled && inboxes.length > 0 && (
            <div ref={dropdownRef} className="relative mb-1">
              <button
                onClick={() => setShowInboxDropdown(!showInboxDropdown)}
                className={`group relative flex items-center w-full cursor-pointer transition-all duration-200 ease-out rounded-xl
                  ${showInboxDropdown || location.pathname.startsWith('/inbox')
                    ? (currentPresetConfig?.id === 'classic' 
                        ? 'bg-white text-[#00A884] shadow-sm font-semibold' 
                        : 'bg-[#E7F7F2] dark:bg-[#008069]/20 text-[#008069] dark:text-[#25D366] font-bold border border-[#A2E2CD] dark:border-[#008069]/40 shadow-2xs')
                    : (currentPresetConfig?.id === 'classic'
                        ? 'text-white/75 hover:bg-white/10 hover:text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-[#E7F7F2]/70 dark:hover:bg-[#008069]/15 hover:text-[#008069] dark:hover:text-[#25D366] hover:border-[#A2E2CD]/70 dark:hover:border-[#008069]/30 border border-transparent hover:translate-x-1.5')
                  }
                  ${showLabel ? 'px-3 py-2.5 gap-3' : 'justify-center p-2.5 hover:scale-105'}
                `}
              >
                {showInboxDropdown || location.pathname.startsWith('/inbox') ? (
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full ${currentPresetConfig?.indicatorClass || 'bg-[#008069]'}`} />
                ) : null}
                <Inbox className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ color: selectedInbox?.color || (currentPresetConfig?.id === 'classic' ? '#00A884' : '#008069') }} />
                {showLabel ? (
                  <>
                    <span className="text-[13px] font-medium group-hover:font-semibold truncate flex-1 text-left transition-colors">
                      {selectedInbox ? selectedInbox.name : 'Semua Kotak Masuk'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showInboxDropdown ? 'rotate-180' : ''}`} />
                  </>
                ) : (
                  <div className="absolute left-14 z-[100] px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 hidden md:flex">
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                    <span className="relative z-10">{selectedInbox ? selectedInbox.name : 'All Inboxes'}</span>
                  </div>
                )}
              </button>

              {/* Inbox Dropdown */}
              {showInboxDropdown && showLabel && (
                <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[100] max-h-64 overflow-y-auto">
                  <button
                    onClick={() => handleInboxSelect(null)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left
                      ${!selectedInbox ? 'bg-[#E7F7F2] text-[#008069] font-bold' : 'text-slate-700 dark:text-slate-300'}
                    `}
                  >
                    <Inbox className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium">Semua Kotak Masuk</span>
                  </button>
                  {inboxes.map((inbox) => (
                    <button
                      key={inbox.id}
                      onClick={() => handleInboxSelect(inbox)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left
                        ${selectedInbox?.id === inbox.id ? 'bg-[#E7F7F2] text-[#008069] font-bold' : 'text-slate-700 dark:text-slate-300'}
                      `}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: inbox.color || '#008069' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{inbox.name}</div>
                        {inbox.description && (
                          <div className="text-[10px] text-slate-400 truncate">{inbox.description}</div>
                        )}
                      </div>
                      {inbox.unread_count > 0 && (
                        <span className="px-1.5 py-0.5 bg-[#008069] text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                          {inbox.unread_count > 99 ? '99+' : inbox.unread_count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sectional Menus */}
          {sections.map((section, secIdx) => (
            <div key={section.title || secIdx} className="flex flex-col gap-0.5">
              {secIdx > 0 && (
                showLabel ? (
                  <div className="pt-2.5 pb-1 px-3 flex items-center justify-between">
                    <span className={`text-[10px] font-bold tracking-wider uppercase ${
                      currentPresetConfig?.id === 'classic' ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {section.title}
                    </span>
                    <span className={`h-[1px] flex-1 ml-2 ${
                      currentPresetConfig?.id === 'classic' ? 'bg-white/10' : 'bg-slate-100 dark:bg-slate-800'
                    }`} />
                  </div>
                ) : (
                  <div className={`w-8 mx-auto my-1.5 border-t ${
                    currentPresetConfig?.id === 'classic' ? 'border-white/20' : 'border-slate-200/70 dark:border-slate-800'
                  }`} />
                )
              )}
              {section.items.map((menu) => (
                <MenuItem
                  key={menu.basePath || menu.path}
                  icon={menu.icon}
                  active={location.pathname.startsWith(menu.basePath || menu.path)}
                  to={menu.targetPath || menu.path}
                  label={menu.label}
                  onClick={() => setIsOpen(false)}
                  showLabel={showLabel}
                  subItems={menu.subItems}
                  isSubExpanded={expandedMenu === (menu.basePath || menu.path)}
                  onToggleSub={() => setExpandedMenu(expandedMenu === (menu.basePath || menu.path) ? null : (menu.basePath || menu.path))}
                  locationPath={location.pathname + location.search}
                  currentPresetConfig={currentPresetConfig}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Footer: User Mini Profile & Logout */}
        <div className={`mt-auto pt-2 border-t ${currentPresetConfig?.footerBorderClass || 'border-slate-200/80 dark:border-slate-800'} flex-shrink-0 pb-safe md:pb-1 flex flex-col gap-1 ${showLabel ? 'px-2' : 'px-1'}`}>

          {/* User Mini Profile Card (when expanded) */}
          {showLabel && user && (
            <div className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 ${
              currentPresetConfig?.id === 'classic' 
                ? 'bg-white/10 text-white' 
                : 'bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-[#A2E2CD]/60 hover:bg-[#E7F7F2]/30'
            }`}>
              <div className={`w-7 h-7 rounded-lg ${
                currentPresetConfig?.id === 'classic' ? 'bg-white text-[#00A884]' : 'bg-[#008069] text-white shadow-2xs'
              } flex items-center justify-center font-bold text-xs flex-shrink-0`}>
                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className={`text-xs font-bold truncate leading-tight ${
                  currentPresetConfig?.id === 'classic' ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                }`}>
                  {user.name || 'User'}
                </p>
                <p className={`text-[10px] truncate capitalize leading-tight ${
                  currentPresetConfig?.id === 'classic' ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {user.role === 'admin_member' ? 'Owner / Admin' : user.role === 'super_admin' ? 'Superadmin' : 'Agent'}
                </p>
              </div>
            </div>
          )}

          {/* Logout */}
          <div
            onClick={logout}
            onMouseEnter={!showLabel ? (e) => handleHover('Logout', e.currentTarget.getBoundingClientRect().top) : undefined}
            onMouseLeave={!showLabel ? () => handleHover(null) : undefined}
            className={`group flex items-center w-full p-2 ${currentPresetConfig?.footerTextClass || 'text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30'} cursor-pointer rounded-xl transition-all duration-200 ease-out border border-transparent hover:border-rose-200/50 hover:translate-x-1.5
              ${showLabel ? 'gap-3 px-3' : 'justify-center hover:scale-105'}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
            {showLabel && <span className="text-xs font-semibold">Keluar / Logout</span>}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navbar */}
      {!isOpen && !isChatOpen && (
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 z-[60] pb-[env(safe-area-inset-bottom,0px)] h-16 flex items-center justify-around px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          {menus.slice(0, 4).map((menu) => (
            <MobileNavItem
              key={menu.basePath || menu.path}
              icon={menu.icon}
              label={menu.label}
              to={menu.targetPath || menu.path}
              active={location.pathname.startsWith(menu.basePath || menu.path)}
              isProminent={(menu.basePath || menu.path) === '/inbox'}
            />
          ))}
          <button
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1.5 min-h-[56px] gap-0.5 text-slate-400 dark:text-slate-500 hover:text-[#008069] dark:hover:text-[#25D366] transition-colors cursor-pointer"
            title="Buka Menu Lengkap"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-tight text-center truncate">Menu</span>
          </button>
        </div>
      )}
    </>
  );
}
