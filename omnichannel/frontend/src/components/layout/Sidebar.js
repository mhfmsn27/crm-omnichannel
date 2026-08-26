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
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 rounded-r-full ${
          isClassic 
            ? 'bg-gradient-to-b from-[#00A884] to-[#00897B] shadow-[0_0_8px_rgba(0,168,132,0.6)]' 
            : 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
        }`} />
      )}
      <div className={`flex items-center ${showLabel ? 'gap-3' : 'justify-center w-full'}`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        {showLabel && <span className="text-sm font-medium truncate">{label}</span>}
      </div>
      {showLabel && hasSub && (
        <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isSubExpanded ? 'rotate-180' : ''}`} />
      )}
      {!showLabel && (
        <div className="absolute left-14 z-[100] px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-md shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0 flex items-center hidden md:flex">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
          <span className="relative z-10">{label}</span>
        </div>
      )}
    </>
  );

  const activeClasses = currentPresetConfig?.activeMenuClass || 'bg-white/95 text-[#00A884] shadow-md font-bold';
  const inactiveClasses = currentPresetConfig?.inactiveMenuClass || 'text-white/75 hover:bg-white/15 hover:text-white';

  const baseClasses = `group relative flex items-center w-full cursor-pointer transition-all duration-200 rounded-xl hover:scale-[1.01] active:scale-95
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
         <div className="flex flex-col gap-1 mt-1 pl-10 pr-2 animate-in slide-in-from-top-2 duration-200">
            {subItems.map((sub, idx) => (
                <Link
                   key={idx}
                   to={sub.path}
                   onClick={onClick}
                   className={`flex items-center w-full px-3 py-2 text-xs rounded-lg transition-colors
                     ${locationPath === sub.path 
                        ? (isClassic ? 'bg-white/20 text-white font-bold' : 'bg-slate-800 text-sky-300 font-bold border border-slate-700') 
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
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
            ${active ? 'bg-[#009B7C] text-white' : 'bg-gray-900 text-white'}
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
        active ? 'text-[#009B7C]' : 'text-gray-400 active:text-gray-600'
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
        // First check if inbox isolation is enabled
        const settingsRes = await axios.get('/api/app/inboxes/settings');
        const isEnabled = settingsRes.data.inbox_isolation_enabled === true;
        setInboxIsolationEnabled(isEnabled);

        if (isEnabled) {
          // Only fetch inboxes if inbox isolation is enabled
          const res = await axios.get('/api/app/inboxes/accessible');
          setInboxes(res.data);
          // Sync selected inbox from URL if present
          const searchParams = new URLSearchParams(location.search);
          const inboxIdFromUrl = searchParams.get('inbox_id');
          if (inboxIdFromUrl) {
            const found = res.data.find(i => i.id.toString() === inboxIdFromUrl.toString());
            if (found) setSelectedInbox(found);
          } else if (res.data.length > 0) {
            // Only set default if no inbox_id in URL
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
  }, [location.search]); // Re-run when URL changes

  // Sync selected inbox when location changes
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowInboxDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle inbox selection
  const handleInboxSelect = (inbox) => {
    setSelectedInbox(inbox);
    setShowInboxDropdown(false);

    if (location.pathname !== '/inbox') {
      // Navigate to inbox with inbox_id
      const targetPath = inbox ? `/inbox?inbox_id=${inbox.id}` : '/inbox';
      navigate(targetPath);
    } else {
      // If already on inbox page, just update URL without full navigation
      const newUrl = inbox ? `?inbox_id=${inbox.id}` : '';
      window.history.pushState({}, '', newUrl);
      // Trigger a re-fetch by dispatching an event
      window.dispatchEvent(new CustomEvent('inbox-filter-change', { detail: { inboxId: inbox?.id } }));
    }
  };

  if (!user) return null;

  // showLabel = expanded on desktop OR open drawer on mobile
  const showLabel = isExpanded || isOpen;

  // Build Menu dynamically based on role
  let menus = [];

  if (user.role === 'super_admin') {
    menus = [
      { label: t('nav.dashboard', 'Dashboard'), path: '/admin/dashboard', icon: Home },
      { label: t('nav.cms', 'CMS Content'), path: '/admin/cms', icon: LayoutTemplate },
      { label: t('nav.members', 'Members'), path: '/admin/members', icon: Users },
      { label: t('nav.system', 'System'), path: '/admin/system', icon: Settings },
    ];
  } else if (user.role === 'admin_member') {
    menus = [
      { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard', icon: Home },
      { 
        label: t('nav.integrations', 'Integrations'), 
        path: '/integrations', 
        icon: QrCode
      },
      { 
        label: t('nav.inbox', 'Inbox'), 
        path: '/inbox', 
        icon: MessageSquare, 
        disabled: isFeatureDisabled('mod_inbox'),
        subItems: [
          { label: 'All Channels', path: '/inbox' },
          { label: 'WhatsApp', path: '/inbox?channel=whatsapp' },
          { label: 'Messenger', path: '/inbox?channel=messenger' },
          { label: 'Instagram', path: '/inbox?channel=instagram' },
          { label: 'Telegram', path: '/inbox?channel=telegram' },
          { label: 'Webchat', path: '/inbox?channel=webchat' }
        ]
      },
      { label: t('nav.contacts', 'Contacts'), path: '/contacts', icon: Users },
      { label: t('nav.bookings', 'Bookings'), path: '/bookings', icon: Calendar },
      { label: t('nav.broadcast', 'Broadcast'), path: '/broadcast', icon: Megaphone, disabled: isFeatureDisabled('mod_broadcast') },
      { label: t('nav.pipeline', 'Pipeline'), path: '/pipelines', icon: Columns },
      { 
        label: t('nav.tools', 'Tools'), 
        path: '/tools', 
        icon: Settings2
      },
      { label: t('nav.products', 'Products'), path: '/products', icon: Package },
      { label: t('nav.tasks', 'Tasks'), path: '/tasks', icon: CheckSquare },
      { label: t('nav.tickets', 'Tickets'), path: '/tickets', icon: Ticket },
      { label: t('nav.invoicing', 'Invoicing'), path: '/invoicing', icon: DollarSign },
      { label: t('nav.reports', 'Reports'), path: '/reports', icon: BarChart2 },
      { 
        label: t('nav.settings', 'Settings'), 
        path: '/settings', 
        icon: Wrench
      },
    ];

    if (!isFeatureDisabled('mod_chatbot')) {
      menus.splice(5, 0, { label: t('nav.chatbot', 'Chatbot'), path: '/chatbot', icon: Bot });
    }
    if (isFeatureDisabled('api_public')) {
      menus.push({ label: t('nav.api', 'API'), path: '/developer', icon: Code });
    }
  } else {
    // Base menus always visible for all agents
    menus = [
      { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard', icon: Home },
      { label: t('nav.inbox', 'Inbox'), path: '/inbox', icon: MessageSquare, disabled: isFeatureDisabled('mod_inbox') },
      { label: t('nav.contacts', 'Contacts'), path: '/contacts', icon: Users },
      { label: t('nav.bookings', 'Bookings'), path: '/bookings', icon: Calendar },
      { label: t('nav.reports', 'Reports'), path: '/reports', icon: BarChart2 },
      { 
        label: t('nav.settings', 'Settings'), 
        path: '/settings', 
        icon: Settings
      },
    ];

    // Permission-gated extras (inserted before Settings)
    const extras = [];
    if (hasPerm(user, 'manage_broadcast') && !isFeatureDisabled('mod_broadcast')) {
      extras.push({ label: t('nav.broadcast', 'Broadcast'), path: '/broadcast', icon: Megaphone });
    }
    if (hasPerm(user, 'manage_chatbot') && !isFeatureDisabled('mod_chatbot')) {
      extras.push({ label: t('nav.chatbot', 'Chatbot'), path: '/chatbot', icon: Bot });
    }
    if (hasPerm(user, 'manage_pipeline')) {
      extras.push({ label: t('nav.pipeline', 'Pipeline'), path: '/pipelines', icon: Columns });
    }
    if (hasPerm(user, 'manage_products')) {
      extras.push({ label: t('nav.products', 'Products'), path: '/products', icon: Package });
    }
    if (hasPerm(user, 'use_tools')) {
      extras.push({ label: t('nav.tools', 'Tools'), path: '/tools', icon: Settings2 });
    }
    if (hasPerm(user, 'manage_followup')) {
      extras.push({ label: 'Follow-up', path: '/followup', icon: Repeat2 });
    }
    if (hasPerm(user, 'manage_tasks')) {
      extras.push({ label: t('nav.tasks', 'Tasks'), path: '/tasks', icon: CheckSquare });
    }
    if (hasPerm(user, 'manage_tickets')) {
      extras.push({ label: t('nav.tickets', 'Tickets'), path: '/tickets', icon: Ticket });
    }
    if (hasPerm(user, 'manage_invoice')) {
      extras.push({ label: t('nav.invoicing', 'Invoicing'), path: '/invoicing', icon: DollarSign });
    }
    // Insert all extras before Settings (last item)
    menus.splice(menus.length - 1, 0, ...extras);
  }

  menus = menus.filter(m => !m.disabled);

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
          className="fixed left-16 z-[100] ml-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-md shadow-lg whitespace-nowrap flex items-center animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-200 pointer-events-none"
          style={{ top: hoveredItem.top + 10 }}
        >
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
          <span className="relative z-10">{hoveredItem.label}</span>
        </div>
      )}

      {/* Main Sidebar */}
      <div className={`
          fixed top-0 left-0 h-full
          ${currentPresetConfig?.sidebarClass || 'bg-[#00A884]'}
          flex flex-col py-4 z-50 shadow-xl
          transition-all duration-300 ease-in-out overflow-visible
          w-56
          ${isExpanded ? 'md:w-56' : 'md:w-16'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Floating Collapse Toggle */}
        <button
            onClick={onToggle}
            onMouseEnter={!isExpanded ? (e) => handleHover('Expand', e.currentTarget.getBoundingClientRect().top) : undefined}
            onMouseLeave={!isExpanded ? () => handleHover(null) : undefined}
            className={`hidden md:flex absolute -right-3.5 top-7 z-[60] w-7 h-7 ${currentPresetConfig?.toggleBtnClass || 'bg-white text-[#00A884] border border-gray-100'} rounded-full shadow-md items-center justify-center hover:scale-110 transition-transform cursor-pointer`}
        >
            {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Logo + App Name */}
        <div className={`mb-4 flex-shrink-0 flex items-center gap-3 px-3 min-w-0`}>
          {config.app_logo ? (
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-sm flex-shrink-0">
              <img src={getApiUrl(config.app_logo)} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className={`w-9 h-9 ${currentPresetConfig?.id === 'classic' ? 'bg-white text-[#00A884]' : 'bg-blue-600 text-white'} rounded-xl flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0`}>
              {config.app_name ? config.app_name.charAt(0) : 'R'}
            </div>
          )}
          {showLabel && (
            <div className="min-w-0 overflow-hidden">
              <span className="text-white font-bold text-sm truncate block leading-tight">
                {config.app_name || 'CRMHub'}
              </span>
              <span className="text-white/50 text-[10px] block">Omnichannel</span>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div className={`flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden no-scrollbar ${showLabel ? 'px-2' : 'px-1'}`}>

          {/* Inbox Selector - Only show if inbox isolation is enabled and user has inboxes */}
          {inboxIsolationEnabled && inboxes.length > 0 && (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setShowInboxDropdown(!showInboxDropdown)}
                className={`group relative flex items-center w-full cursor-pointer transition-all duration-200 rounded-xl
                  ${showInboxDropdown || location.pathname.startsWith('/inbox')
                    ? (currentPresetConfig?.id === 'classic' ? 'bg-white text-[#00A884] shadow-sm font-semibold' : 'bg-slate-800 text-sky-400 font-semibold border border-slate-700')
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }
                  ${showLabel ? 'px-3 py-2.5 gap-3' : 'justify-center p-2.5'}
                `}
              >
                {showInboxDropdown || location.pathname.startsWith('/inbox') ? (
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 ${currentPresetConfig?.id === 'classic' ? 'bg-[#00A884]' : 'bg-sky-400'} rounded-r-full`} />
                ) : null}
                <Inbox className="w-5 h-5 flex-shrink-0" style={{ color: selectedInbox?.color || (currentPresetConfig?.id === 'classic' ? '#00A884' : '#38BDF8') }} />
                {showLabel ? (
                  <>
                    <span className="text-sm font-medium truncate flex-1 text-left">
                      {selectedInbox ? selectedInbox.name : 'All Inboxes'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showInboxDropdown ? 'rotate-180' : ''}`} />
                  </>
                ) : (
                  <div className="absolute left-14 z-[100] px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-md shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 hidden md:flex">
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                    <span className="relative z-10">{selectedInbox ? selectedInbox.name : 'All Inboxes'}</span>
                  </div>
                )}
              </button>

              {/* Inbox Dropdown */}
              {showInboxDropdown && showLabel && (
                <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-[100] max-h-64 overflow-y-auto">
                  <button
                    onClick={() => handleInboxSelect(null)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left
                      ${!selectedInbox ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}
                    `}
                  >
                    <Inbox className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">All Inboxes</span>
                  </button>
                  {inboxes.map((inbox) => (
                    <button
                      key={inbox.id}
                      onClick={() => handleInboxSelect(inbox)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left
                        ${selectedInbox?.id === inbox.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}
                      `}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: inbox.color || '#6366f1' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{inbox.name}</div>
                        {inbox.description && (
                          <div className="text-xs text-gray-400 truncate">{inbox.description}</div>
                        )}
                      </div>
                      {inbox.unread_count > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full min-w-[20px] text-center">
                          {inbox.unread_count > 99 ? '99+' : inbox.unread_count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {menus.map((menu) => (
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

        {/* Footer: Logout */}
        <div className={`mt-2 pt-2 border-t border-white/20 flex-shrink-0 pb-safe md:pb-2 flex flex-col gap-0.5 ${showLabel ? 'px-2' : 'px-1'}`}>

          {/* Logout */}
          <div
            onClick={logout}
            onMouseEnter={!showLabel ? (e) => handleHover('Logout', e.currentTarget.getBoundingClientRect().top) : undefined}
            onMouseLeave={!showLabel ? () => handleHover(null) : undefined}
            className={`flex items-center w-full p-2.5 text-white/60 hover:text-white cursor-pointer hover:bg-white/10 rounded-xl transition-colors
              ${showLabel ? 'gap-3 px-3' : 'justify-center'}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {showLabel && <span className="text-sm font-medium">Logout</span>}
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
