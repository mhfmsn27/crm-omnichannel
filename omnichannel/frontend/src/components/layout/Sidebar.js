import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, Package, Settings,
  MessageSquare, Megaphone, QrCode, Bot,
  LogOut, BarChart2, LayoutTemplate,
  Wrench, Code, Columns, Ticket, CheckSquare,
  Menu, ChevronLeft, ChevronRight, Settings2, FileText, Repeat2, DollarSign, ChevronDown, Inbox, Calendar
} from 'lucide-react';
import axios from 'axios';

import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useLanguage } from '../../i18n';
import { useTheme } from '../../context/ThemeContext';
import { getApiUrl } from '../../config/api';

// Helper to check permission - matches backend permissionMiddleware.js logic
const hasPerm = (user, perm) => {
  if (!user) return false;
  // admin_member and super_admin bypass all permission checks
  if (user.role === 'admin_member' || user.role === 'super_admin') return true;
  // For agents, check if permission exists in their permissions array
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes(perm);
};

const MenuItem = ({ icon: Icon, active, label, to, onClick, showLabel, subItems, isSubExpanded, onToggleSub, locationPath, currentPresetConfig }) => {
  const hasSub = subItems && subItems.length > 0;
  const isClassic = currentPresetConfig?.id === 'classic';

  const content = (
    <>
      {active && showLabel && !hasSub && (
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full ${
          currentPresetConfig?.indicatorClass || 'bg-[#008069]'
        }`} />
      )}
      <div className={`flex items-center ${showLabel ? 'gap-3 min-w-0 flex-1' : 'justify-center w-full'}`}>
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
          active 
            ? (isClassic ? 'text-white' : 'text-[#008069] dark:text-[#25D366]') 
            : (isClassic ? 'text-white/75' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white')
        }`} />
        {showLabel && <span className="text-[13px] font-medium truncate">{label}</span>}
      </div>
      {showLabel && hasSub && (
        <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${
          isSubExpanded ? 'rotate-180 text-[#008069]' : 'text-slate-400'
        }`} />
      )}
      {!showLabel && (
        <div className="absolute left-14 z-[100] px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0 flex items-center hidden md:flex">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
          <span className="relative z-10">{label}</span>
        </div>
      )}
    </>
  );

  const activeClasses = currentPresetConfig?.activeMenuClass || 'bg-[#E7F7F2] text-[#008069] shadow-2xs font-bold border border-[#A2E2CD]';
  const inactiveClasses = currentPresetConfig?.inactiveMenuClass || 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-200/60 border border-transparent';

  const baseClasses = `group relative flex items-center w-full cursor-pointer transition-all duration-150 rounded-xl
    ${showLabel ? 'px-3 py-2.5 justify-between' : 'justify-center p-2.5'}
    ${active || isSubExpanded ? activeClasses : inactiveClasses}`;

  return (
    <div className="flex flex-col w-full">
      {hasSub ? (
        <button onClick={onToggleSub} className={baseClasses}>
          {content}
        </button>
      ) : (
        <Link to={to} onClick={onClick} className={baseClasses}>
          {content}
        </Link>
      )}

      {/* Sub Items (Only visible if Sidebar is expanded) */}
      {hasSub && isSubExpanded && showLabel && (
         <div className="flex flex-col gap-1 mt-1 pl-9 pr-2 animate-in slide-in-from-top-2 duration-150">
            {subItems.map((sub, idx) => (
                <Link
                   key={idx}
                   to={sub.path}
                   onClick={onClick}
                   className={`flex items-center w-full px-3 py-1.5 text-xs rounded-lg transition-colors
                     ${locationPath === sub.path 
                        ? (currentPresetConfig?.activeSubmenuClass || 'bg-[#E7F7F2] dark:bg-[#008069]/25 text-[#008069] dark:text-[#25D366] font-bold border border-[#A2E2CD]/80') 
                        : (currentPresetConfig?.inactiveSubmenuClass || 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100')
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
      <Link to={to} onClick={onClick} className="relative -top-5 group flex items-center justify-center">
        <div className={`
            w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-gray-50 transition-transform active:scale-90
            ${active ? 'bg-[#008069] text-white' : 'bg-gray-900 text-white'}
        `}>
          <Icon className="w-6 h-6" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full h-full py-2 min-h-[60px] gap-1 ${
        active ? 'text-[#008069]' : 'text-gray-400 active:text-gray-600'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="text-[10px] font-semibold leading-tight text-center">{label}</span>
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

  if (user.role === 'super_admin') {
    menus = [
      { label: t('nav.dashboard', 'Dashboard'), path: '/admin/dashboard', icon: Home, section: 'Utama' },
      { label: t('nav.cms', 'CMS Content'), path: '/admin/cms', icon: LayoutTemplate, section: 'Manajemen' },
      { label: t('nav.members', 'Members'), path: '/admin/members', icon: Users, section: 'Manajemen' },
      { label: t('nav.system', 'System'), path: '/admin/system', icon: Settings, section: 'Sistem' },
    ];
  } else if (user.role === 'admin_member') {
    menus = [
      { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard', icon: Home, section: 'Utama' },
      { 
        label: t('nav.integrations', 'Integrasi'), 
        path: '/integrations', 
        icon: QrCode,
        section: 'Komunikasi'
      },
      { 
        label: t('nav.inbox', 'Kotak Masuk'), 
        path: '/inbox', 
        icon: MessageSquare, 
        disabled: isFeatureDisabled('mod_inbox'),
        section: 'Komunikasi',
        subItems: [
          { label: 'All Channels', path: '/inbox' },
          { label: 'WhatsApp', path: '/inbox?channel=whatsapp' },
          { label: 'Messenger', path: '/inbox?channel=messenger' },
          { label: 'Instagram', path: '/inbox?channel=instagram' },
          { label: 'Telegram', path: '/inbox?channel=telegram' },
          { label: 'Webchat', path: '/inbox?channel=webchat' }
        ]
      },
      { label: t('nav.contacts', 'Kontak'), path: '/contacts', icon: Users, section: 'Komunikasi' },
      { label: t('nav.bookings', 'Bookings'), path: '/bookings', icon: Calendar, section: 'Komunikasi' },
      { label: t('nav.broadcast', 'Broadcast'), path: '/broadcast', icon: Megaphone, disabled: isFeatureDisabled('mod_broadcast'), section: 'Komunikasi' },
      { label: t('nav.pipeline', 'Pipeline'), path: '/pipelines', icon: Columns, section: 'CRM & Bisnis' },
      { label: t('nav.products', 'Produk'), path: '/products', icon: Package, section: 'CRM & Bisnis' },
      { label: t('nav.tasks', 'Tasks'), path: '/tasks', icon: CheckSquare, section: 'CRM & Bisnis' },
      { label: t('nav.tickets', 'Tickets'), path: '/tickets', icon: Ticket, section: 'CRM & Bisnis' },
      { label: t('nav.invoicing', 'Invoicing'), path: '/invoicing', icon: DollarSign, section: 'CRM & Bisnis' },
      { label: t('nav.reports', 'Laporan'), path: '/reports', icon: BarChart2, section: 'CRM & Bisnis' },
      { 
        label: t('nav.tools', 'Tools'), 
        path: '/tools', 
        icon: Settings2,
        section: 'Sistem & Alat'
      },
      { 
        label: t('nav.settings', 'Pengaturan'), 
        path: '/settings', 
        icon: Wrench,
        section: 'Sistem & Alat'
      },
    ];

    if (!isFeatureDisabled('mod_chatbot')) {
      menus.splice(5, 0, { label: t('nav.chatbot', 'Chatbot'), path: '/chatbot', icon: Bot, section: 'Komunikasi' });
    }
    if (!isFeatureDisabled('api_public')) {
      menus.push({ label: t('nav.api', 'API Developer'), path: '/developer', icon: Code, section: 'Sistem & Alat' });
    }
  } else {
    // Base menus visible for all agents
    menus = [
      { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard', icon: Home, section: 'Utama' },
      { label: t('nav.inbox', 'Kotak Masuk'), path: '/inbox', icon: MessageSquare, disabled: isFeatureDisabled('mod_inbox'), section: 'Komunikasi' },
      { label: t('nav.contacts', 'Kontak'), path: '/contacts', icon: Users, section: 'Komunikasi' },
      { label: t('nav.bookings', 'Bookings'), path: '/bookings', icon: Calendar, section: 'Komunikasi' },
      { label: t('nav.reports', 'Laporan'), path: '/reports', icon: BarChart2, section: 'CRM & Bisnis' },
      { 
        label: t('nav.settings', 'Pengaturan'), 
        path: '/settings', 
        icon: Settings,
        section: 'Sistem & Alat'
      },
    ];

    const extras = [];
    if (hasPerm(user, 'manage_broadcast') && !isFeatureDisabled('mod_broadcast')) {
      extras.push({ label: t('nav.broadcast', 'Broadcast'), path: '/broadcast', icon: Megaphone, section: 'Komunikasi' });
    }
    if (hasPerm(user, 'manage_chatbot') && !isFeatureDisabled('mod_chatbot')) {
      extras.push({ label: t('nav.chatbot', 'Chatbot'), path: '/chatbot', icon: Bot, section: 'Komunikasi' });
    }
    if (hasPerm(user, 'manage_pipeline')) {
      extras.push({ label: t('nav.pipeline', 'Pipeline'), path: '/pipelines', icon: Columns, section: 'CRM & Bisnis' });
    }
    if (hasPerm(user, 'manage_products')) {
      extras.push({ label: t('nav.products', 'Produk'), path: '/products', icon: Package, section: 'CRM & Bisnis' });
    }
    if (hasPerm(user, 'use_tools')) {
      extras.push({ label: t('nav.tools', 'Tools'), path: '/tools', icon: Settings2, section: 'Sistem & Alat' });
    }
    if (hasPerm(user, 'manage_followup')) {
      extras.push({ label: 'Follow-up', path: '/followup', icon: Repeat2, section: 'Komunikasi' });
    }
    if (hasPerm(user, 'manage_tasks')) {
      extras.push({ label: t('nav.tasks', 'Tasks'), path: '/tasks', icon: CheckSquare, section: 'CRM & Bisnis' });
    }
    if (hasPerm(user, 'manage_tickets')) {
      extras.push({ label: t('nav.tickets', 'Tickets'), path: '/tickets', icon: Ticket, section: 'CRM & Bisnis' });
    }
    if (hasPerm(user, 'manage_invoice')) {
      extras.push({ label: t('nav.invoicing', 'Invoicing'), path: '/invoicing', icon: DollarSign, section: 'CRM & Bisnis' });
    }
    menus.splice(menus.length - 1, 0, ...extras);
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

  const searchParams = new URLSearchParams(location.search);
  const isChatOpen = location.pathname.startsWith('/inbox') && searchParams.has('id');

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
        <div className={`mb-3 flex-shrink-0 px-2`}>
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
                className={`group relative flex items-center w-full cursor-pointer transition-all duration-150 rounded-xl
                  ${showInboxDropdown || location.pathname.startsWith('/inbox')
                    ? (currentPresetConfig?.id === 'classic' 
                        ? 'bg-white text-[#00A884] shadow-sm font-semibold' 
                        : 'bg-[#E7F7F2] dark:bg-[#008069]/20 text-[#008069] dark:text-[#25D366] font-bold border border-[#A2E2CD] dark:border-[#008069]/40 shadow-2xs')
                    : (currentPresetConfig?.id === 'classic'
                        ? 'text-white/75 hover:bg-white/10 hover:text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white border border-transparent')
                  }
                  ${showLabel ? 'px-3 py-2.5 gap-3' : 'justify-center p-2.5'}
                `}
              >
                {showInboxDropdown || location.pathname.startsWith('/inbox') ? (
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full ${currentPresetConfig?.indicatorClass || 'bg-[#008069]'}`} />
                ) : null}
                <Inbox className="w-5 h-5 flex-shrink-0" style={{ color: selectedInbox?.color || (currentPresetConfig?.id === 'classic' ? '#00A884' : '#008069') }} />
                {showLabel ? (
                  <>
                    <span className="text-[13px] font-medium truncate flex-1 text-left">
                      {selectedInbox ? selectedInbox.name : 'Semua Kotak Masuk'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showInboxDropdown ? 'rotate-180' : ''}`} />
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
                  key={menu.path}
                  icon={menu.icon}
                  active={location.pathname.startsWith(menu.path)}
                  to={menu.path}
                  label={menu.label}
                  onClick={() => setIsOpen(false)}
                  showLabel={showLabel}
                  subItems={menu.subItems}
                  isSubExpanded={expandedMenu === menu.path}
                  onToggleSub={() => setExpandedMenu(expandedMenu === menu.path ? null : menu.path)}
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
            <div className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl ${
              currentPresetConfig?.id === 'classic' 
                ? 'bg-white/10 text-white' 
                : 'bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800'
            }`}>
              <div className={`w-7 h-7 rounded-lg ${
                currentPresetConfig?.id === 'classic' ? 'bg-white text-[#00A884]' : 'bg-[#008069] text-white'
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
            className={`flex items-center w-full p-2 ${currentPresetConfig?.footerTextClass || 'text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30'} cursor-pointer rounded-xl transition-colors border border-transparent hover:border-rose-200/50
              ${showLabel ? 'gap-3 px-3' : 'justify-center'}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {showLabel && <span className="text-xs font-semibold">Keluar / Logout</span>}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navbar */}
      {!isOpen && !isChatOpen && (
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-[60] pb-safe h-16 flex items-center justify-around px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {menus.slice(0, 5).map((menu) => (
            <MobileNavItem
              key={menu.path}
              icon={menu.icon}
              label={menu.label}
              to={menu.path}
              active={location.pathname.startsWith(menu.path)}
              isProminent={menu.path === '/inbox'}
            />
          ))}
          <button
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center justify-center w-16 h-full space-y-0.5 text-gray-400"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-medium">Menu</span>
          </button>
        </div>
      )}
    </>
  );
}
