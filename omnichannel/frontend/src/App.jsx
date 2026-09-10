import React, { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useConfig } from './context/ConfigContext';
import { SocketProvider } from './context/SocketContext';
import { ConfigProvider } from './context/ConfigContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './i18n';
import { Toaster } from 'react-hot-toast';
import GlobalNotificationManager from './components/managers/GlobalNotificationManager.jsx';
import { getApiUrl } from './config/api';
import MainLayout from './components/layout/MainLayout';
import LicenseBlock from './components/LicenseBlock';
import { Loader2 } from 'lucide-react';

// ================================
// LAZY LOADING FALLBACK (SMOOTH & NON-FLASHING)
// ================================
const PageLoader = () => (
    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[50vh] py-12 transition-opacity duration-200">
        {/* Top subtle progress bar */}
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-[#008069]/30 overflow-hidden z-[9999]">
            <div className="h-full bg-[#008069] w-full animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-2.5">
            <Loader2 className="w-6 h-6 animate-spin text-[#008069] opacity-75" />
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 tracking-wide">Memuat halaman...</span>
        </div>
    </div>
);

// ================================
// IMMEDIATE / EAGER IMPORTS
// ================================
import LoginPage from './pages/LoginPage';
import FacebookCallback from './pages/Auth/FacebookCallback';
import GoogleCallback from './pages/Auth/GoogleCallback';
import PwaInstallBanner from './components/common/PwaInstallBanner';

// ================================
// LAZY LOADED MODULES
// ================================

// Core App Pages
const LazyInboxPage = lazy(() => import('./pages/InboxPage'));
const LazyDashboardPage = lazy(() => import('./pages/DashboardPage'));
const LazyAnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const LazyLandingPage = lazy(() => import('./pages/Public/LandingPage'));
const LazyBookingsPage = lazy(() => import('./pages/Bookings/BookingsPage'));

// Broadcast Module
const LazyBroadcastLayout = lazy(() => import('./pages/Broadcast/BroadcastLayout'));
const LazyCreateCampaign = lazy(() => import('./pages/Broadcast/CreateCampaign'));
const LazyBroadcastReports = lazy(() => import('./pages/Broadcast/BroadcastReports'));
const LazyMessageTemplates = lazy(() => import('./pages/Broadcast/MessageTemplates'));
const LazyRotatorManager = lazy(() => import('./pages/Broadcast/RotatorManager'));
const LazyBroadcastTutorial = lazy(() => import('./pages/Broadcast/BroadcastTutorial'));
const LazyBroadcastSettingsPage = lazy(() => import('./pages/Broadcast/BroadcastSettingsPage'));
const LazyUpsellingPage = lazy(() => import('./pages/Broadcast/UpsellingPage'));
const LazyCreateUpselling = lazy(() => import('./pages/Broadcast/CreateUpselling'));
const LazyTemplateManager = lazy(() => import('./pages/Integrations/TemplateManager'));

// Chatbot Module
const LazyChatbotLayout = lazy(() => import('./pages/Chatbot/ChatbotLayout'));
const LazyBotListPage = lazy(() => import('./pages/Chatbot/BotListPage'));
const LazyAIAgentSetupPage = lazy(() => import('./pages/Chatbot/AIAgentSetupPage'));
const LazyGlobalKBPage = lazy(() => import('./pages/Chatbot/GlobalKBPage'));
const LazyApiSettingsPage = lazy(() => import('./pages/Chatbot/ApiSettingsPage'));
const LazyChatbotTutorial = lazy(() => import('./pages/Chatbot/ChatbotTutorial'));
const LazyChatbotTrainingPage = lazy(() => import('./pages/Chatbot/ChatbotTrainingPage.jsx'));
const LazyFlowListPage = lazy(() => import('./pages/Chatbot/FlowListPage.jsx'));
const LazyFlowBuilderPage = lazy(() => import('./pages/Chatbot/FlowBuilder.jsx'));

// Order & Invoicing Module
const LazyOrderLayout = lazy(() => import('./pages/Order/OrderLayout'));
const LazySubscriptionPlans = lazy(() => import('./pages/Order/SubscriptionPlans'));
const LazyInvoiceLayout = lazy(() => import('./pages/Invoicing/InvoiceLayout'));
const LazyInvoiceListPage = lazy(() => import('./pages/Invoicing/InvoiceList'));
const LazyInvoiceForm = lazy(() => import('./pages/Invoicing/InvoiceForm'));
const LazyInvoiceSettings = lazy(() => import('./pages/Invoicing/InvoiceSettings'));
const LazyInvoiceCreatePage = lazy(() => import('./pages/Invoicing/InvoiceCreatePage'));
const LazyBulkInvoiceTool = lazy(() => import('./pages/Invoicing/BulkInvoiceTool'));
const LazyPublicInvoiceView = lazy(() => import('./pages/Public/PublicInvoiceView'));
const LazyBroadcastSchedulePage = lazy(() => import('./pages/Broadcast/BroadcastSchedulePage'));
const LazyContactImportPage = lazy(() => import('./pages/Contacts/ContactImportPage'));

// Reports Module
const LazyReportsLayout = lazy(() => import('./pages/Reports/ReportsLayout'));
const LazyGeneralReport = lazy(() => import('./pages/Reports/GeneralReport'));
const LazyAgentPerformance = lazy(() => import('./pages/Reports/AgentPerformance'));
const LazyAdvancedAnalyticsDashboard = lazy(() => import('./pages/Reports/AdvancedAnalyticsDashboard'));
const LazySlaCsatReport = lazy(() => import('./pages/Reports/SlaCsatReport'));
const LazyCSATReportPage = lazy(() => import('./pages/Reports/CSATReportPage'));
const LazyResponderHistory = lazy(() => import('./pages/Reports/ResponderHistory'));
const LazyBroadcastStatsReport = lazy(() => import('./pages/Reports/BroadcastStatsReport'));
const LazyChatbotStatsReport = lazy(() => import('./pages/Reports/ChatbotReport'));
const LazyChatFormReport = lazy(() => import('./pages/Reports/ChatFormReport'));
const LazySalesPipelineReport = lazy(() => import('./pages/Reports/SalesPipelineReport'));
const LazyLogApiReport = lazy(() => import('./pages/Reports/LogApiReport'));
const LazyAttributionDashboard = lazy(() => import('./pages/Reports/AttributionDashboard'));
const LazyCustomerJourneyPage = lazy(() => import('./pages/Reports/CustomerJourneyPage'));
const LazyGamificationPage = lazy(() => import('./pages/Reports/GamificationPage'));
const LazySalesKpiDashboard = lazy(() => import('./pages/Reports/SalesKpiDashboard'));
const LazyLiveWallboardPage = lazy(() => import('./pages/Reports/LiveWallboardPage'));

// Settings Module
const LazySettingsLayout = lazy(() => import('./pages/Settings/SettingsLayout'));
const LazyBillingSettings = lazy(() => import('./pages/Settings/BillingSettings'));
const LazyAutoReplyManager = lazy(() => import('./pages/Settings/AutoReplyManager'));
const LazyAutoLabelManager = lazy(() => import('./pages/Settings/AutoLabelManager'));
const LazyMultiLanguagePage = lazy(() => import('./pages/Settings/MultiLanguagePage'));
const LazyEcommercePage = lazy(() => import('./pages/Settings/EcommercePage'));
const LazyLicensePage = lazy(() => import('./pages/Settings/LicensePage'));
const LazyAutoArchiveSettings = lazy(() => import('./pages/Settings/AutoArchiveSettings'));
const LazyRolesPage = lazy(() => import('./pages/Settings/RolesPage'));
const LazyDivisionsPage = lazy(() => import('./pages/Settings/DivisionsPage'));
const LazyInboxManagement = lazy(() => import('./pages/Settings/InboxManagement'));
const LazyOngkirSettingsPage = lazy(() => import('./pages/Settings/OngkirSettingsPage'));
const LazyAssignmentSettingsPage = lazy(() => import('./pages/Settings/AssignmentSettingsPage'));
const LazyWorkingHoursPage = lazy(() => import('./pages/Settings/WorkingHoursPage'));
const LazyTeamSettings = lazy(() => import('./pages/Settings/TeamSettings'));
const LazyQuickReplySettings = lazy(() => import('./pages/Settings/QuickReplySettings'));
const LazySLASettingsPage = lazy(() => import('./pages/Settings/SLASettingsPage'));
const LazyCustomFieldsSettings = lazy(() => import('./pages/Settings/CustomFieldsSettings'));
const LazyWaTemplateLibrary = lazy(() => import('./pages/Settings/WaTemplateLibrary'));
const LazyWorkflowRulesSettings = lazy(() => import('./pages/Settings/WorkflowRulesSettings'));
const LazyWebhookSettingsPage = lazy(() => import('./pages/Settings/WebhookSettingsPage'));
const LazySystemHealthPage = lazy(() => import('./pages/Settings/SystemHealthPage'));
const LazyAuditLogPage = lazy(() => import('./pages/Settings/AuditLogPage'));

// Account Module
const LazyAccountLayout = lazy(() => import('./pages/Account/AccountLayout'));
const LazyAccountProfilePage = lazy(() => import('./pages/Account/AccountProfilePage'));
const LazyAccountQuickReplies = lazy(() => import('./pages/Account/AccountQuickReplies'));
const LazyAccountLanguagePage = lazy(() => import('./pages/Account/AccountLanguagePage'));

// Developer Module
const LazyDeveloperLayout = lazy(() => import('./pages/Developer/DeveloperLayout'));
const LazyAppListPage = lazy(() => import('./pages/Developer/AppListPage'));
const LazyApiDocsPage = lazy(() => import('./pages/Developer/ApiDocsPage'));

// Contacts & CRM
const LazyContactsLayout = lazy(() => import('./pages/Contacts/ContactsLayout'));
const LazyContactListPage = lazy(() => import('./pages/Contacts/ContactListPage'));
const LazyContactDetailPage = lazy(() => import('./pages/Contacts/ContactDetailPage'));
const LazyLabelManagementPage = lazy(() => import('./pages/Contacts/LabelManagementPage'));
const LazyLeadListPage = lazy(() => import('./pages/Contacts/LeadListPage'));
const LazyPipelineListPage = lazy(() => import('./pages/Pipeline/PipelineListPage'));
const LazyPipelineBoardPage = lazy(() => import('./pages/Pipeline/PipelineBoardPage'));
const LazyPipelineEditorPage = lazy(() => import('./pages/Pipeline/PipelineEditorPage'));
const LazyTicketListPage = lazy(() => import('./pages/Tickets/TicketListPage'));
const LazyProductListPage = lazy(() => import('./pages/Products/ProductListPage'));
const LazyTaskListPage = lazy(() => import('./pages/Tasks/TaskListPage'));
const LazySalesVisitPage = lazy(() => import('./pages/CRM/SalesVisitPage'));

// Tools Module
const LazyToolsLayout = lazy(() => import('./pages/Tools/ToolsLayout'));
const LazyCheckNumberTool = lazy(() => import('./pages/Contacts/CheckNumberTool'));
const LazyGroupExtractorTool = lazy(() => import('./pages/Contacts/GroupExtractorTool'));
const LazyGMapsScraperTool = lazy(() => import('./pages/Contacts/GMapsScraperTool'));
const LazyWarmerPage = lazy(() => import('./pages/WarmerPage'));
const LazyFollowUpTool = lazy(() => import('./pages/Tools/FollowUpTool'));
const LazyToolsTutorial = lazy(() => import('./pages/Tools/ToolsTutorial'));
const LazyChatFormList = lazy(() => import('./pages/Tools/ChatForm/ChatFormList'));

// Integrations Module
const LazyIntegrationsLayout = lazy(() => import('./pages/Integrations/IntegrationsLayout'));
const LazyWhatsAppDevicePage = lazy(() => import('./pages/Integrations/WhatsAppDevicePage'));
const LazyWebchatPage = lazy(() => import('./pages/Integrations/WebchatPage'));
const LazyWhatsAppAPIPage = lazy(() => import('./pages/Integrations/WhatsAppAPIPage'));
const LazyWhatsAppCoExPage = lazy(() => import('./pages/Integrations/WhatsAppCoExPage'));
const LazyDeviceHealthPage = lazy(() => import('./pages/Integrations/DeviceHealthPage'));
const LazyMessengerIntegration = lazy(() => import('./pages/Integrations/MessengerIntegration'));
const LazyInstagramIntegration = lazy(() => import('./pages/Integrations/InstagramIntegration'));
const LazyTelegramIntegration = lazy(() => import('./pages/Integrations/TelegramIntegration'));
const LazyEmailIntegration = lazy(() => import('./pages/Integrations/EmailIntegration'));
const LazyTikTokIntegration = lazy(() => import('./pages/Integrations/TikTokIntegration'));
const LazyLineIntegration = lazy(() => import('./pages/Integrations/LineIntegration'));
const LazyShopeeIntegration = lazy(() => import('./pages/Integrations/ShopeeIntegration'));
const LazyTokopediaIntegration = lazy(() => import('./pages/Integrations/TokopediaIntegration'));
const LazyZapierPage = lazy(() => import('./pages/Integrations/ZapierPage'));
const LazyRecurringInvoiceList = lazy(() => import('./pages/Invoicing/RecurringInvoiceList'));

// SuperAdmin Module
const LazySADashboardPage = lazy(() => import('./pages/SuperAdmin/DashboardPage'));
const LazyMemberList = lazy(() => import('./pages/SuperAdmin/MemberList'));
const LazyMemberDetail = lazy(() => import('./pages/SuperAdmin/MemberDetail'));
const LazyPlanList = lazy(() => import('./pages/SuperAdmin/PlanList'));
const LazyPlanForm = lazy(() => import('./pages/SuperAdmin/PlanForm'));
const LazyCheckoutPage = lazy(() => import('./pages/Billing/CheckoutPage'));
const LazyManualPaymentConfirm = lazy(() => import('./pages/Billing/ManualPaymentConfirm'));
const LazyOrderManagement = lazy(() => import('./pages/SuperAdmin/OrderManagement'));
const LazyPaymentSettings = lazy(() => import('./pages/SuperAdmin/PaymentSettings'));
const LazySASettingsPage = lazy(() => import('./pages/SuperAdmin/SettingsPage'));
const LazyFeatureMonetization = lazy(() => import('./pages/SuperAdmin/FeatureMonetization'));
const LazyNotificationPage = lazy(() => import('./pages/SuperAdmin/NotificationPage'));

// CMS Module
const LazyCmsLayout = lazy(() => import('./pages/SuperAdmin/Cms/CmsLayout'));
const LazyLandingPageEditor = lazy(() => import('./pages/SuperAdmin/Cms/LandingPageEditor'));
const LazyPageList = lazy(() => import('./pages/SuperAdmin/Cms/PageList'));
const LazyPageEditor = lazy(() => import('./pages/SuperAdmin/Cms/PageEditor'));
const LazyTutorialList = lazy(() => import('./pages/SuperAdmin/Cms/TutorialList'));
const LazyTutorialEditor = lazy(() => import('./pages/SuperAdmin/Cms/TutorialEditor'));

// Public Pages
const LazyStaticPage = lazy(() => import('./pages/Public/StaticPage'));
const LazyRatingPage = lazy(() => import('./pages/Public/RatingPage.jsx'));
const LazyReferralHandler = lazy(() => import('./pages/Public/ReferralHandler.jsx'));

import { hasPerm, getFirstPermittedPath } from './utils/rbac';

const SmartRedirect = ({ candidates, fallback = '/dashboard' }) => {
    const { user } = useAuth();
    const targetPath = getFirstPermittedPath(user, candidates, fallback);
    return <Navigate to={targetPath} replace />;
};

const CONTACTS_PERMS = ['manage_contacts', 'manage_leads', 'import_contacts', 'manage_labels'];
const REPORTS_PERMS = ['view_reports', 'view_csat', 'view_wallboard', 'view_analytics', 'view_gamification', 'manage_pipeline', 'broadcast_reports', 'manage_chatbot', 'manage_chatform', 'manage_api'];
const INVOICING_PERMS = ['manage_invoice', 'bulk_invoice', 'recurring_invoice'];
const CHATBOT_PERMS = ['manage_chatbot', 'chatbot_training', 'manage_api'];
const TOOLS_PERMS = ['use_tools', 'use_warmer', 'manage_followup', 'manage_chatform'];
const INTEGRATIONS_PERMS = ['manage_integrations', 'manage_templates', 'manage_webhooks'];
const BROADCAST_PERMS = ['manage_broadcast', 'broadcast_schedule', 'broadcast_reports', 'manage_templates', 'manage_rotator'];
const SETTINGS_PERMS = ['manage_settings', 'manage_team', 'manage_roles', 'assign_conversations', 'manage_tickets', 'manage_templates', 'manage_labels', 'manage_webhooks', 'manage_system_health', 'chatbot_training', 'manage_integrations'];

const CONTACTS_INDEX_CANDIDATES = [
    { path: '/contacts/list', perm: 'manage_contacts' },
    { path: '/contacts/leads', perm: 'manage_leads' },
    { path: '/contacts/import', perm: 'import_contacts' },
    { path: '/contacts/labels', perm: 'manage_labels' },
];

const REPORTS_INDEX_CANDIDATES = [
    { path: '/reports/general', perm: 'view_reports' },
    { path: '/reports/csat', perm: 'view_csat' },
    { path: '/reports/agent-performance', perm: 'view_reports' },
    { path: '/reports/sla-csat', perm: 'view_reports' },
    { path: '/reports/responder-history', perm: 'view_reports' },
    { path: '/reports/broadcast', perm: 'broadcast_reports' },
    { path: '/reports/chatbot', perm: 'manage_chatbot' },
    { path: '/reports/chat-form', perm: 'manage_chatform' },
    { path: '/reports/sales-pipeline', perm: 'manage_pipeline' },
    { path: '/reports/sales-kpi', perm: 'view_reports' },
    { path: '/reports/attribution', perm: 'view_analytics' },
    { path: '/reports/advanced-analytics', perm: 'view_analytics' },
    { path: '/reports/customer-journey', perm: 'view_analytics' },
    { path: '/reports/gamification', perm: 'view_gamification' },
    { path: '/reports/wallboard', perm: 'view_wallboard' },
    { path: '/reports/api-logs', perm: 'manage_api' },
];

const INVOICING_INDEX_CANDIDATES = [
    { path: '/invoicing/list', perm: 'manage_invoice' },
    { path: '/invoicing/create', perm: 'manage_invoice' },
    { path: '/invoicing/bulk', perm: 'bulk_invoice' },
    { path: '/invoicing/recurring', perm: 'recurring_invoice' },
    { path: '/invoicing/settings', perm: 'manage_invoice' },
];

const CHATBOT_INDEX_CANDIDATES = [
    { path: '/chatbot/list', perm: 'manage_chatbot' },
    { path: '/chatbot/flows', perm: 'manage_chatbot' },
    { path: '/chatbot/training', perm: 'chatbot_training' },
    { path: '/chatbot/global-kb', perm: 'chatbot_training' },
    { path: '/chatbot/multi-language', perm: 'chatbot_training' },
    { path: '/chatbot/api', perm: 'manage_api' },
];

const TOOLS_INDEX_CANDIDATES = [
    { path: '/tools/check-number', perm: 'use_tools' },
    { path: '/tools/warmer', perm: 'use_warmer' },
    { path: '/tools/chat-form', perm: 'manage_chatform' },
    { path: '/tools/group-extractor', perm: 'use_tools' },
    { path: '/tools/scraper', perm: 'use_tools' },
    { path: '/tools/follow-up', perm: 'manage_followup' },
];

const INTEGRATIONS_INDEX_CANDIDATES = [
    { path: '/integrations/whatsapp', perm: 'manage_integrations' },
    { path: '/integrations/templates', perm: 'manage_templates' },
    { path: '/integrations/webhooks', perm: 'manage_webhooks' },
];

const BROADCAST_INDEX_CANDIDATES = [
    { path: '/broadcast/create', perm: 'manage_broadcast' },
    { path: '/broadcast/schedule', perm: 'broadcast_schedule' },
    { path: '/broadcast/reports', perm: 'broadcast_reports' },
    { path: '/broadcast/templates', perm: 'manage_templates' },
    { path: '/broadcast/meta-templates', perm: 'manage_templates' },
    { path: '/broadcast/rotators', perm: 'manage_rotator' },
    { path: '/broadcast/upselling', perm: 'manage_broadcast' },
    { path: '/broadcast/settings', perm: 'manage_broadcast' },
];

const SETTINGS_INDEX_CANDIDATES = [
    { path: '/settings/team', perm: 'manage_team' },
    { path: '/settings/roles', perm: 'manage_roles' },
    { path: '/settings/quick-replies', perm: 'manage_settings' },
    { path: '/settings/custom-fields', perm: 'manage_settings' },
    { path: '/settings/divisions', perm: 'manage_settings' },
    { path: '/settings/system-health', perm: 'manage_system_health' },
    { path: '/settings/auto-reply', perm: 'manage_settings' },
    { path: '/settings/auto-label', perm: 'manage_labels' },
    { path: '/settings/workflow-rules', perm: 'manage_settings' },
    { path: '/settings/auto-archive', perm: 'manage_settings' },
    { path: '/settings/wa-templates', perm: 'manage_templates' },
    { path: '/settings/inboxes', perm: 'manage_settings' },
    { path: '/settings/assignment', perm: 'assign_conversations' },
    { path: '/settings/working-hours', perm: 'manage_settings' },
    { path: '/settings/sla', perm: 'manage_tickets' },
    { path: '/settings/license', perm: 'manage_settings' },
];

const PrivateRoute = ({ children, allowedRoles, requiredPerm }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-white">Loading...</div>;

    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

    // Role Check
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === 'agent') return <Navigate to="/inbox" replace />;
        if (user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
        return <Navigate to="/dashboard" replace />;
    }

    // Permission Check
    if (requiredPerm && !hasPerm(user, requiredPerm)) {
        if (user.role === 'agent') return <Navigate to="/inbox" replace />;
        return <Navigate to="/dashboard" replace />;
    }

    return children ? children : <Outlet />;
};

const HeadManager = () => {
    const { config } = useConfig();
    useEffect(() => {
        if (config.app_name) document.title = config.app_name;
        if (config.app_favicon) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = `${getApiUrl(config.app_favicon)}?t=${Date.now()}`;
        }
    }, [config]);
    return null;
};

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLicenseError = error.response && (
            error.response.status === 402 ||
            (error.response.status === 403 && (
                error.response.data?.status === 'license_invalid' ||
                error.response.data?.reason === 'DOMAIN_NOT_FOUND' ||
                error.response.data?.reason === 'INVALID_RSA_SIGNATURE' ||
                error.response.data?.reason === 'NO_SHEET_CONFIGURED' ||
                error.response.data?.reason === 'UNAUTHORIZED_DOMAIN'
            ))
        );

        if (isLicenseError) {
            const event = new CustomEvent('LICENSE_REQUIRED', {
                detail: { status: error.response.status, message: error.response.data?.message }
            });
            window.dispatchEvent(event);
        }
        return Promise.reject(error);
    }
);

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) return <div></div>;

    return (
        <>
            <HeadManager />
            <LicenseBlock />
            <Routes>
                {/* PUBLIC STANDALONE */}
                <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LoginPage initialView="login" />} />
                <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage initialView="login" />} />
                <Route path="/auth/facebook/callback" element={<FacebookCallback />} />
                <Route path="/auth/google/callback" element={<GoogleCallback />} />

                <Route path="/landing" element={<LazyLandingPage />} />
                <Route path="/p/:slug" element={<LazyStaticPage />} />
                <Route path="/p/invoice/:token" element={<LazyPublicInvoiceView />} />
                <Route path="/rating/:token" element={<LazyRatingPage />} />
                <Route path="/ref/:code" element={<LazyReferralHandler />} />

                {/* SUPER ADMIN (PERSISTENT MAINLAYOUT) */}
                <Route element={<PrivateRoute allowedRoles={['super_admin']}><MainLayout /></PrivateRoute>}>
                    <Route path="/admin/dashboard" element={<LazySADashboardPage />} />

                    <Route path="/admin/cms" element={<LazyCmsLayout />}>
                        <Route index element={<Navigate to="landing" replace />} />
                        <Route path="landing" element={<LazyLandingPageEditor />} />
                        <Route path="pages" element={<LazyPageList />} />
                        <Route path="pages/create" element={<LazyPageEditor />} />
                        <Route path="pages/:id" element={<LazyPageEditor />} />
                        <Route path="tutorials" element={<LazyTutorialList />} />
                        <Route path="tutorials/create" element={<LazyTutorialEditor />} />
                        <Route path="tutorials/:id" element={<LazyTutorialEditor />} />
                    </Route>

                    <Route path="/admin/members" element={<LazyMemberList />} />
                    <Route path="/admin/members/:id" element={<LazyMemberDetail />} />
                    <Route path="/admin/system" element={<LazySASettingsPage />} />
                </Route>

                {/* ADMIN MEMBER & AGENT (PERSISTENT MAINLAYOUT) */}
                <Route element={<PrivateRoute allowedRoles={['admin_member', 'agent']}><MainLayout /></PrivateRoute>}>
                    <Route path="/dashboard" element={<LazyDashboardPage />} />
                    <Route path="/inbox" element={<PrivateRoute requiredPerm="view_all_chats"><LazyInboxPage /></PrivateRoute>} />
                    <Route path="/bookings" element={<PrivateRoute requiredPerm="manage_bookings"><LazyBookingsPage /></PrivateRoute>} />

                    <Route path="/developer" element={<PrivateRoute requiredPerm="manage_api"><LazyDeveloperLayout /></PrivateRoute>}>
                        <Route index element={<Navigate to="apps" replace />} />
                        <Route path="apps" element={<LazyAppListPage />} />
                        <Route path="docs" element={<LazyApiDocsPage />} />
                    </Route>

                    <Route path="/reports" element={<PrivateRoute requiredPerm={REPORTS_PERMS}><LazyReportsLayout /></PrivateRoute>}>
                        <Route index element={<SmartRedirect candidates={REPORTS_INDEX_CANDIDATES} />} />
                        <Route path="general" element={<PrivateRoute requiredPerm="view_reports"><LazyGeneralReport /></PrivateRoute>} />
                        <Route path="csat" element={<PrivateRoute requiredPerm="view_csat"><LazyCSATReportPage /></PrivateRoute>} />
                        <Route path="agent-performance" element={<PrivateRoute requiredPerm="view_reports"><LazyAgentPerformance /></PrivateRoute>} />
                        <Route path="sla-csat" element={<PrivateRoute requiredPerm="view_reports"><LazySlaCsatReport /></PrivateRoute>} />
                        <Route path="responder-history" element={<PrivateRoute requiredPerm="view_reports"><LazyResponderHistory /></PrivateRoute>} />
                        <Route path="broadcast" element={<PrivateRoute requiredPerm="broadcast_reports"><LazyBroadcastStatsReport /></PrivateRoute>} />
                        <Route path="chatbot" element={<PrivateRoute requiredPerm="manage_chatbot"><LazyChatbotStatsReport /></PrivateRoute>} />
                        <Route path="chat-form" element={<PrivateRoute requiredPerm="manage_chatform"><LazyChatFormReport /></PrivateRoute>} />
                        <Route path="sales-pipeline" element={<PrivateRoute requiredPerm="manage_pipeline"><LazySalesPipelineReport /></PrivateRoute>} />
                        <Route path="sales-kpi" element={<PrivateRoute requiredPerm="view_reports"><LazySalesKpiDashboard /></PrivateRoute>} />
                        <Route path="attribution" element={<PrivateRoute requiredPerm="view_analytics"><LazyAttributionDashboard /></PrivateRoute>} />
                        <Route path="advanced-analytics" element={<PrivateRoute requiredPerm="view_analytics"><LazyAdvancedAnalyticsDashboard /></PrivateRoute>} />
                        <Route path="customer-journey" element={<PrivateRoute requiredPerm="view_analytics"><LazyCustomerJourneyPage /></PrivateRoute>} />
                        <Route path="gamification" element={<PrivateRoute requiredPerm="view_gamification"><LazyGamificationPage /></PrivateRoute>} />
                        <Route path="wallboard" element={<PrivateRoute requiredPerm="view_wallboard"><LazyLiveWallboardPage /></PrivateRoute>} />
                        <Route path="api-logs" element={<PrivateRoute requiredPerm="manage_api"><LazyLogApiReport /></PrivateRoute>} />
                    </Route>

                    <Route path="/analytics" element={<Navigate to="/reports/general" replace />} />

                    <Route path="/invoicing" element={<PrivateRoute requiredPerm={INVOICING_PERMS}><LazyInvoiceLayout /></PrivateRoute>}>
                        <Route index element={<SmartRedirect candidates={INVOICING_INDEX_CANDIDATES} />} />
                        <Route path="list" element={<PrivateRoute requiredPerm="manage_invoice"><LazyInvoiceListPage /></PrivateRoute>} />
                        <Route path="create" element={<PrivateRoute requiredPerm="manage_invoice"><LazyInvoiceCreatePage /></PrivateRoute>} />
                        <Route path="bulk" element={<PrivateRoute requiredPerm="bulk_invoice"><LazyBulkInvoiceTool /></PrivateRoute>} />
                        <Route path="recurring" element={<PrivateRoute requiredPerm="recurring_invoice"><LazyRecurringInvoiceList /></PrivateRoute>} />
                        <Route path="edit/:id" element={<PrivateRoute requiredPerm="manage_invoice"><LazyInvoiceForm /></PrivateRoute>} />
                        <Route path="settings" element={<PrivateRoute requiredPerm="manage_invoice"><LazyInvoiceSettings /></PrivateRoute>} />
                    </Route>

                    <Route path="/chatbot" element={<PrivateRoute requiredPerm={CHATBOT_PERMS}><LazyChatbotLayout /></PrivateRoute>}>
                        <Route index element={<SmartRedirect candidates={CHATBOT_INDEX_CANDIDATES} />} />
                        <Route path="list" element={<PrivateRoute requiredPerm="manage_chatbot"><LazyBotListPage /></PrivateRoute>} />
                        <Route path="ai-agent/:id" element={<PrivateRoute requiredPerm="manage_chatbot"><LazyAIAgentSetupPage /></PrivateRoute>} />
                        <Route path="flows" element={<PrivateRoute requiredPerm="manage_chatbot"><LazyFlowListPage /></PrivateRoute>} />
                        <Route path="flows/new" element={<PrivateRoute requiredPerm="manage_chatbot"><LazyFlowBuilderPage /></PrivateRoute>} />
                        <Route path="flows/:id" element={<PrivateRoute requiredPerm="manage_chatbot"><LazyFlowBuilderPage /></PrivateRoute>} />
                        <Route path="global-kb" element={<PrivateRoute requiredPerm="chatbot_training"><LazyGlobalKBPage /></PrivateRoute>} />
                        <Route path="training" element={<PrivateRoute requiredPerm="chatbot_training"><LazyChatbotTrainingPage /></PrivateRoute>} />
                        <Route path="api" element={<PrivateRoute requiredPerm="manage_api"><LazyApiSettingsPage /></PrivateRoute>} />
                        <Route path="tutorial" element={<LazyChatbotTutorial />} />
                        <Route path="multi-language" element={<PrivateRoute requiredPerm="chatbot_training"><LazyMultiLanguagePage /></PrivateRoute>} />
                    </Route>

                    <Route path="/contacts" element={<PrivateRoute requiredPerm={CONTACTS_PERMS}><LazyContactsLayout /></PrivateRoute>}>
                        <Route index element={<SmartRedirect candidates={CONTACTS_INDEX_CANDIDATES} />} />
                        <Route path="list" element={<PrivateRoute requiredPerm="manage_contacts"><LazyContactListPage /></PrivateRoute>} />
                        <Route path="leads" element={<PrivateRoute requiredPerm="manage_leads"><LazyLeadListPage /></PrivateRoute>} />
                        <Route path="import" element={<PrivateRoute requiredPerm="import_contacts"><LazyContactImportPage /></PrivateRoute>} />
                        <Route path=":id" element={<PrivateRoute requiredPerm="manage_contacts"><LazyContactDetailPage /></PrivateRoute>} />
                        <Route path="labels" element={<PrivateRoute requiredPerm="manage_labels"><LazyLabelManagementPage /></PrivateRoute>} />
                    </Route>

                    <Route path="/tools" element={<PrivateRoute requiredPerm={TOOLS_PERMS}><LazyToolsLayout /></PrivateRoute>}>
                        <Route index element={<SmartRedirect candidates={TOOLS_INDEX_CANDIDATES} />} />
                        <Route path="check-number" element={<PrivateRoute requiredPerm="use_tools"><LazyCheckNumberTool /></PrivateRoute>} />
                        <Route path="group-extractor" element={<PrivateRoute requiredPerm="use_tools"><LazyGroupExtractorTool /></PrivateRoute>} />
                        <Route path="scraper" element={<PrivateRoute requiredPerm="use_tools"><LazyGMapsScraperTool /></PrivateRoute>} />
                        <Route path="warmer" element={<PrivateRoute requiredPerm="use_warmer"><LazyWarmerPage /></PrivateRoute>} />
                        <Route path="follow-up" element={<PrivateRoute requiredPerm="manage_followup"><LazyFollowUpTool /></PrivateRoute>} />
                        <Route path="chat-form" element={<PrivateRoute requiredPerm="manage_chatform"><LazyChatFormList /></PrivateRoute>} />
                        <Route path="tutorial" element={<LazyToolsTutorial />} />
                    </Route>

                    <Route path="/integrations" element={<PrivateRoute requiredPerm={INTEGRATIONS_PERMS}><LazyIntegrationsLayout /></PrivateRoute>}>
                        <Route index element={<SmartRedirect candidates={INTEGRATIONS_INDEX_CANDIDATES} />} />
                        <Route path="whatsapp" element={<PrivateRoute requiredPerm="manage_integrations"><LazyWhatsAppDevicePage /></PrivateRoute>} />
                        <Route path="whatsapp-api" element={<PrivateRoute requiredPerm="manage_integrations"><LazyWhatsAppAPIPage /></PrivateRoute>} />
                        <Route path="wa-api" element={<PrivateRoute requiredPerm="manage_integrations"><LazyWhatsAppAPIPage /></PrivateRoute>} />
                        <Route path="whatsapp-coex" element={<PrivateRoute requiredPerm="manage_integrations"><LazyWhatsAppCoExPage /></PrivateRoute>} />
                        <Route path="wa-coex" element={<PrivateRoute requiredPerm="manage_integrations"><LazyWhatsAppCoExPage /></PrivateRoute>} />
                        <Route path="email" element={<PrivateRoute requiredPerm="manage_integrations"><LazyEmailIntegration /></PrivateRoute>} />
                        <Route path="messenger" element={<PrivateRoute requiredPerm="manage_integrations"><LazyMessengerIntegration /></PrivateRoute>} />
                        <Route path="instagram" element={<PrivateRoute requiredPerm="manage_integrations"><LazyInstagramIntegration /></PrivateRoute>} />
                        <Route path="tiktok" element={<PrivateRoute requiredPerm="manage_integrations"><LazyTikTokIntegration /></PrivateRoute>} />
                        <Route path="shopee" element={<PrivateRoute requiredPerm="manage_integrations"><LazyShopeeIntegration /></PrivateRoute>} />
                        <Route path="tokopedia" element={<PrivateRoute requiredPerm="manage_integrations"><LazyTokopediaIntegration /></PrivateRoute>} />
                        <Route path="line" element={<PrivateRoute requiredPerm="manage_integrations"><LazyLineIntegration /></PrivateRoute>} />
                        <Route path="telegram" element={<PrivateRoute requiredPerm="manage_integrations"><LazyTelegramIntegration /></PrivateRoute>} />
                        <Route path="webchat" element={<PrivateRoute requiredPerm="manage_integrations"><LazyWebchatPage /></PrivateRoute>} />
                        <Route path="zapier" element={<PrivateRoute requiredPerm="manage_integrations"><LazyZapierPage /></PrivateRoute>} />
                        <Route path="templates" element={<PrivateRoute requiredPerm="manage_templates"><LazyTemplateManager /></PrivateRoute>} />
                        <Route path="device-health" element={<PrivateRoute requiredPerm="manage_integrations"><LazyDeviceHealthPage /></PrivateRoute>} />
                        <Route path="ecommerce" element={<PrivateRoute requiredPerm="manage_integrations"><LazyEcommercePage /></PrivateRoute>} />
                        <Route path="ongkir" element={<PrivateRoute requiredPerm="manage_integrations"><LazyOngkirSettingsPage /></PrivateRoute>} />
                        <Route path="webhooks" element={<PrivateRoute requiredPerm="manage_webhooks"><LazyWebhookSettingsPage /></PrivateRoute>} />
                        <Route path="webhook" element={<PrivateRoute requiredPerm="manage_webhooks"><LazyWebhookSettingsPage /></PrivateRoute>} />
                    </Route>

                    <Route path="/broadcast" element={<PrivateRoute requiredPerm={BROADCAST_PERMS}><LazyBroadcastLayout /></PrivateRoute>}>
                        <Route index element={<SmartRedirect candidates={BROADCAST_INDEX_CANDIDATES} />} />
                        <Route path="create" element={<PrivateRoute requiredPerm="manage_broadcast"><LazyCreateCampaign /></PrivateRoute>} />
                        <Route path="schedule" element={<PrivateRoute requiredPerm="broadcast_schedule"><LazyBroadcastSchedulePage /></PrivateRoute>} />
                        <Route path="reports" element={<PrivateRoute requiredPerm="broadcast_reports"><LazyBroadcastReports /></PrivateRoute>} />
                        <Route path="templates" element={<PrivateRoute requiredPerm="manage_templates"><LazyMessageTemplates /></PrivateRoute>} />
                        <Route path="meta-templates" element={<PrivateRoute requiredPerm="manage_templates"><LazyTemplateManager /></PrivateRoute>} />
                        <Route path="rotators" element={<PrivateRoute requiredPerm="manage_rotator"><LazyRotatorManager /></PrivateRoute>} />
                        <Route path="rotator" element={<PrivateRoute requiredPerm="manage_rotator"><LazyRotatorManager /></PrivateRoute>} />
                        <Route path="upselling" element={<PrivateRoute requiredPerm="manage_broadcast"><LazyUpsellingPage /></PrivateRoute>} />
                        <Route path="upselling/create" element={<PrivateRoute requiredPerm="manage_broadcast"><LazyCreateUpselling /></PrivateRoute>} />
                        <Route path="tutorial" element={<LazyBroadcastTutorial />} />
                        <Route path="settings" element={<PrivateRoute requiredPerm="manage_broadcast"><LazyBroadcastSettingsPage /></PrivateRoute>} />
                    </Route>

                    {/* Pipelines CRM Routes */}
                    <Route path="/pipelines" element={<PrivateRoute requiredPerm="manage_pipeline"><LazyPipelineListPage /></PrivateRoute>} />
                    <Route path="/pipelines/create" element={<PrivateRoute requiredPerm="manage_pipeline"><LazyPipelineEditorPage /></PrivateRoute>} />
                    <Route path="/pipelines/editor" element={<PrivateRoute requiredPerm="manage_pipeline"><LazyPipelineEditorPage /></PrivateRoute>} />
                    <Route path="/pipelines/editor/:id" element={<PrivateRoute requiredPerm="manage_pipeline"><LazyPipelineEditorPage /></PrivateRoute>} />
                    <Route path="/pipelines/:id" element={<PrivateRoute requiredPerm="manage_pipeline"><LazyPipelineBoardPage /></PrivateRoute>} />
                    <Route path="/pipelines/:id/board" element={<PrivateRoute requiredPerm="manage_pipeline"><LazyPipelineBoardPage /></PrivateRoute>} />
                    <Route path="/pipelines/:id/edit" element={<PrivateRoute requiredPerm="manage_pipeline"><LazyPipelineEditorPage /></PrivateRoute>} />

                    <Route path="/pipeline" element={<Navigate to="/pipelines" replace />} />
                    <Route path="/pipeline/create" element={<Navigate to="/pipelines/create" replace />} />
                    <Route path="/pipeline/editor" element={<Navigate to="/pipelines/editor" replace />} />
                    <Route path="/pipeline/editor/:id" element={<PrivateRoute requiredPerm="manage_pipeline"><LazyPipelineEditorPage /></PrivateRoute>} />
                    <Route path="/pipeline/:id" element={<PrivateRoute requiredPerm="manage_pipeline"><LazyPipelineBoardPage /></PrivateRoute>} />
                    <Route path="/pipeline/:id/board" element={<PrivateRoute requiredPerm="manage_pipeline"><LazyPipelineBoardPage /></PrivateRoute>} />
                    <Route path="/pipeline/:id/edit" element={<PrivateRoute requiredPerm="manage_pipeline"><LazyPipelineEditorPage /></PrivateRoute>} />

                    <Route path="/followup" element={<Navigate to="/tools/follow-up" replace />} />

                    <Route path="/tickets" element={<PrivateRoute requiredPerm="manage_tickets"><LazyTicketListPage /></PrivateRoute>} />
                    <Route path="/leads" element={<PrivateRoute requiredPerm="manage_leads"><LazyLeadListPage /></PrivateRoute>} />
                    <Route path="/products" element={<PrivateRoute requiredPerm="manage_products"><LazyProductListPage /></PrivateRoute>} />
                    <Route path="/tasks" element={<PrivateRoute requiredPerm="manage_tasks"><LazyTaskListPage /></PrivateRoute>} />
                    <Route path="/sales-visits" element={<PrivateRoute requiredPerm="manage_sales_visits"><LazySalesVisitPage /></PrivateRoute>} />

                    <Route path="/settings" element={<PrivateRoute requiredPerm={SETTINGS_PERMS}><LazySettingsLayout /></PrivateRoute>}>
                        <Route index element={<SmartRedirect candidates={SETTINGS_INDEX_CANDIDATES} />} />
                        <Route path="assignment" element={<PrivateRoute requiredPerm="assign_conversations"><LazyAssignmentSettingsPage /></PrivateRoute>} />
                        <Route path="working-hours" element={<PrivateRoute requiredPerm="manage_settings"><LazyWorkingHoursPage /></PrivateRoute>} />
                        <Route path="team" element={<PrivateRoute requiredPerm="manage_team"><LazyTeamSettings /></PrivateRoute>} />
                        <Route path="roles" element={<PrivateRoute requiredPerm="manage_roles"><LazyRolesPage /></PrivateRoute>} />
                        <Route path="divisions" element={<PrivateRoute requiredPerm="manage_settings"><LazyDivisionsPage /></PrivateRoute>} />
                        <Route path="inbox" element={<PrivateRoute requiredPerm="manage_settings"><LazyInboxManagement /></PrivateRoute>} />
                        <Route path="inboxes" element={<PrivateRoute requiredPerm="manage_settings"><LazyInboxManagement /></PrivateRoute>} />
                        <Route path="quick-replies" element={<PrivateRoute requiredPerm="manage_settings"><LazyQuickReplySettings /></PrivateRoute>} />
                        <Route path="sla" element={<PrivateRoute requiredPerm="manage_tickets"><LazySLASettingsPage /></PrivateRoute>} />
                        <Route path="custom-fields" element={<PrivateRoute requiredPerm="manage_settings"><LazyCustomFieldsSettings /></PrivateRoute>} />
                        <Route path="wa-templates" element={<PrivateRoute requiredPerm="manage_templates"><LazyWaTemplateLibrary /></PrivateRoute>} />
                        <Route path="auto-reply" element={<PrivateRoute requiredPerm="manage_settings"><LazyAutoReplyManager /></PrivateRoute>} />
                        <Route path="auto-label" element={<PrivateRoute requiredPerm="manage_labels"><LazyAutoLabelManager /></PrivateRoute>} />
                        <Route path="rules" element={<PrivateRoute requiredPerm="manage_settings"><LazyWorkflowRulesSettings /></PrivateRoute>} />
                        <Route path="workflow-rules" element={<PrivateRoute requiredPerm="manage_settings"><LazyWorkflowRulesSettings /></PrivateRoute>} />
                        <Route path="license" element={<PrivateRoute requiredPerm="manage_settings"><LazyLicensePage /></PrivateRoute>} />
                        <Route path="auto-archive" element={<PrivateRoute requiredPerm="manage_settings"><LazyAutoArchiveSettings /></PrivateRoute>} />
                        <Route path="system-health" element={<PrivateRoute requiredPerm="manage_system_health"><LazySystemHealthPage /></PrivateRoute>} />
                        <Route path="audit-logs" element={<PrivateRoute requiredPerm="manage_settings"><LazyAuditLogPage /></PrivateRoute>} />
                        <Route path="audit-log" element={<Navigate to="/settings/audit-logs" replace />} />
                        <Route path="billing" element={<Navigate to="/settings" replace />} />

                        {/* Backward compatibility redirects for externalized modules */}
                        <Route path="ongkir" element={<Navigate to="/integrations/ongkir" replace />} />
                        <Route path="webhooks" element={<Navigate to="/integrations/webhooks" replace />} />
                        <Route path="webhook" element={<Navigate to="/integrations/webhooks" replace />} />
                        <Route path="ecommerce" element={<Navigate to="/integrations/ecommerce" replace />} />
                        <Route path="email" element={<Navigate to="/integrations/email" replace />} />
                        <Route path="device-data" element={<Navigate to="/integrations/device-health" replace />} />
                        <Route path="multi-language" element={<Navigate to="/chatbot/multi-language" replace />} />
                    </Route>

                    <Route path="/account" element={<LazyAccountLayout />}>
                        <Route index element={<Navigate to="profile" replace />} />
                        <Route path="profile" element={<LazyAccountProfilePage />} />
                        <Route path="quick-replies" element={<LazyAccountQuickReplies />} />
                        <Route path="language" element={<LazyAccountLanguagePage />} />
                    </Route>
                </Route>

                {/* Standalone Fullscreen Wallboard for TV screens */}
                <Route path="/wallboard" element={<PrivateRoute requiredPerm="view_wallboard"><LazyLiveWallboardPage /></PrivateRoute>} />

                {/* FALLBACK */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <PwaInstallBanner />
        </>
    );
}

function App() {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <ConfigProvider>
                    <AuthProvider>
                        <SocketProvider>
                            <Router>
                                <Toaster position="top-right" reverseOrder={false} />
                                <GlobalNotificationManager />
                                <AppRoutes />
                            </Router>
                        </SocketProvider>
                    </AuthProvider>
                </ConfigProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
}

export default App;