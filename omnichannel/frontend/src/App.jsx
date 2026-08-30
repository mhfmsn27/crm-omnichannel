import React, { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
// LAZY LOADING FALLBACK
// ================================
const PageLoader = () => (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-dark-bg">
        <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Memuat...</span>
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
import MobileBottomNav from './components/layout/MobileBottomNav';

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
const LazyPublicInvoiceView = lazy(() => import('./pages/Public/PublicInvoiceView'));

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
const LazyDeviceDataSettingsPage = lazy(() => import('./pages/Settings/DeviceDataSettingsPage'));
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
const LazyEmailSettingsPage = lazy(() => import('./pages/Settings/EmailSettingsPage'));
const LazySystemHealthPage = lazy(() => import('./pages/Settings/SystemHealthPage'));

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

// Helper to check permission
const hasPerm = (user, perm) => {
    if (!user) return false;
    if (user.role === 'admin_member' || user.role === 'super_admin') return true;

    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    if (user.role === 'agent' && user.role_level >= 10 && perms.includes(perm)) {
        return true;
    }
    return false;
};

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

    return children;
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
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* PUBLIC */}
                    <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LoginPage initialView="login" />} />
                    <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage initialView="login" />} />
                    <Route path="/auth/facebook/callback" element={<FacebookCallback />} />
                    <Route path="/auth/google/callback" element={<GoogleCallback />} />

                    <Route path="/landing" element={<LazyLandingPage />} />
                    <Route path="/p/:slug" element={<LazyStaticPage />} />
                    <Route path="/p/invoice/:token" element={<LazyPublicInvoiceView />} />
                    <Route path="/rating/:token" element={<LazyRatingPage />} />
                    <Route path="/ref/:code" element={<LazyReferralHandler />} />

                    {/* SUPER ADMIN */}
                    <Route path="/admin/dashboard" element={<PrivateRoute allowedRoles={['super_admin']}><MainLayout><LazySADashboardPage /></MainLayout></PrivateRoute>} />

                    <Route path="/admin/cms" element={<PrivateRoute allowedRoles={['super_admin']}><MainLayout><LazyCmsLayout /></MainLayout></PrivateRoute>}>
                        <Route index element={<Navigate to="landing" replace />} />
                        <Route path="landing" element={<LazyLandingPageEditor />} />
                        <Route path="pages" element={<LazyPageList />} />
                        <Route path="pages/create" element={<LazyPageEditor />} />
                        <Route path="pages/:id" element={<LazyPageEditor />} />
                        <Route path="tutorials" element={<LazyTutorialList />} />
                        <Route path="tutorials/create" element={<LazyTutorialEditor />} />
                        <Route path="tutorials/:id" element={<LazyTutorialEditor />} />
                    </Route>

                    <Route path="/admin/members" element={<PrivateRoute allowedRoles={['super_admin']}><MainLayout><LazyMemberList /></MainLayout></PrivateRoute>} />
                    <Route path="/admin/members/:id" element={<PrivateRoute allowedRoles={['super_admin']}><MainLayout><LazyMemberDetail /></MainLayout></PrivateRoute>} />
                    <Route path="/admin/system" element={<PrivateRoute allowedRoles={['super_admin']}><MainLayout><LazySASettingsPage /></MainLayout></PrivateRoute>} />

                    {/* ADMIN MEMBER & AGENT */}
                    <Route path="/dashboard" element={<PrivateRoute allowedRoles={['admin_member', 'agent']}><MainLayout><LazyDashboardPage /></MainLayout></PrivateRoute>} />
                    <Route path="/inbox" element={<PrivateRoute allowedRoles={['admin_member', 'agent']}><MainLayout><LazyInboxPage /></MainLayout></PrivateRoute>} />
                    <Route path="/bookings" element={<PrivateRoute allowedRoles={['admin_member', 'agent']}><MainLayout><LazyBookingsPage /></MainLayout></PrivateRoute>} />

                    <Route path="/developer" element={<PrivateRoute allowedRoles={['admin_member']}><MainLayout><LazyDeveloperLayout /></MainLayout></PrivateRoute>}>
                        <Route index element={<Navigate to="apps" replace />} />
                        <Route path="apps" element={<LazyAppListPage />} />
                        <Route path="docs" element={<LazyApiDocsPage />} />
                    </Route>

                    <Route path="/reports" element={<PrivateRoute allowedRoles={['admin_member', 'agent']}><MainLayout><LazyReportsLayout /></MainLayout></PrivateRoute>}>
                        <Route index element={<Navigate to="general" replace />} />
                        <Route path="general" element={<LazyGeneralReport />} />
                        <Route path="csat" element={<LazyCSATReportPage />} />
                        <Route path="agent-performance" element={<LazyAgentPerformance />} />
                        <Route path="sla-csat" element={<LazySlaCsatReport />} />
                        <Route path="responder-history" element={<LazyResponderHistory />} />
                        <Route path="broadcast" element={<LazyBroadcastStatsReport />} />
                        <Route path="chatbot" element={<LazyChatbotStatsReport />} />
                        <Route path="chat-form" element={<LazyChatFormReport />} />
                        <Route path="sales-pipeline" element={<LazySalesPipelineReport />} />
                        <Route path="sales-kpi" element={<LazySalesKpiDashboard />} />
                        <Route path="attribution" element={<LazyAttributionDashboard />} />
                        <Route path="advanced-analytics" element={<LazyAdvancedAnalyticsDashboard />} />
                        <Route path="customer-journey" element={<LazyCustomerJourneyPage />} />
                        <Route path="gamification" element={<LazyGamificationPage />} />
                        <Route path="wallboard" element={<LazyLiveWallboardPage />} />
                        <Route path="api-logs" element={<LazyLogApiReport />} />
                    </Route>

                    {/* Standalone Fullscreen Wallboard for TV screens */}
                    <Route path="/wallboard" element={<PrivateRoute allowedRoles={['admin_member', 'agent']}><LazyLiveWallboardPage /></PrivateRoute>} />

                    <Route path="/analytics" element={<Navigate to="/reports/general" replace />} />

                    <Route path="/invoicing" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="manage_invoice"><MainLayout><LazyInvoiceLayout /></MainLayout></PrivateRoute>}>
                        <Route index element={<Navigate to="list" replace />} />
                        <Route path="list" element={<LazyInvoiceListPage />} />
                        <Route path="create" element={<LazyInvoiceCreatePage />} />
                        <Route path="recurring" element={<LazyRecurringInvoiceList />} />
                        <Route path="edit/:id" element={<LazyInvoiceForm />} />
                        <Route path="settings" element={<LazyInvoiceSettings />} />
                    </Route>

                    <Route path="/chatbot" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="manage_chatbot"><MainLayout><LazyChatbotLayout /></MainLayout></PrivateRoute>}>
                        <Route index element={<Navigate to="list" replace />} />
                        <Route path="list" element={<LazyBotListPage />} />
                        <Route path="ai-agent/:id" element={<LazyAIAgentSetupPage />} />
                        <Route path="flows" element={<LazyFlowListPage />} />
                        <Route path="flows/new" element={<LazyFlowBuilderPage />} />
                        <Route path="flows/:id" element={<LazyFlowBuilderPage />} />
                        <Route path="global-kb" element={<LazyGlobalKBPage />} />
                        <Route path="training" element={<LazyChatbotTrainingPage />} />
                        <Route path="api" element={<LazyApiSettingsPage />} />
                        <Route path="tutorial" element={<LazyChatbotTutorial />} />
                        <Route path="multi-language" element={<PrivateRoute allowedRoles={['admin_member']}><LazyMultiLanguagePage /></PrivateRoute>} />
                    </Route>

                    <Route path="/contacts" element={<PrivateRoute allowedRoles={['admin_member', 'agent']}><MainLayout><LazyContactsLayout /></MainLayout></PrivateRoute>}>
                        <Route index element={<Navigate to="list" replace />} />
                        <Route path="list" element={<LazyContactListPage />} />
                        <Route path=":id" element={<LazyContactDetailPage />} />
                        <Route path="labels" element={<LazyLabelManagementPage />} />
                    </Route>

                    <Route path="/tools" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="use_tools"><MainLayout><LazyToolsLayout /></MainLayout></PrivateRoute>}>
                        <Route index element={<Navigate to="check-number" replace />} />
                        <Route path="check-number" element={<LazyCheckNumberTool />} />
                        <Route path="group-extractor" element={<LazyGroupExtractorTool />} />
                        <Route path="scraper" element={<LazyGMapsScraperTool />} />
                        <Route path="warmer" element={<LazyWarmerPage />} />
                        <Route path="follow-up" element={<LazyFollowUpTool />} />
                        <Route path="chat-form" element={<LazyChatFormList />} />
                        <Route path="tutorial" element={<LazyToolsTutorial />} />
                    </Route>

                    <Route path="/integrations" element={<PrivateRoute allowedRoles={['admin_member']}><MainLayout><LazyIntegrationsLayout /></MainLayout></PrivateRoute>}>
                        <Route index element={<Navigate to="whatsapp" replace />} />
                        <Route path="whatsapp" element={<LazyWhatsAppDevicePage />} />
                        <Route path="whatsapp-api" element={<LazyWhatsAppAPIPage />} />
                        <Route path="whatsapp-coex" element={<LazyWhatsAppCoExPage />} />
                        <Route path="email" element={<LazyEmailIntegration />} />
                        <Route path="messenger" element={<LazyMessengerIntegration />} />
                        <Route path="instagram" element={<LazyInstagramIntegration />} />
                        <Route path="tiktok" element={<LazyTikTokIntegration />} />
                        <Route path="shopee" element={<LazyShopeeIntegration />} />
                        <Route path="tokopedia" element={<LazyTokopediaIntegration />} />
                        <Route path="line" element={<LazyLineIntegration />} />
                        <Route path="telegram" element={<LazyTelegramIntegration />} />
                        <Route path="webchat" element={<LazyWebchatPage />} />
                        <Route path="zapier" element={<LazyZapierPage />} />
                        <Route path="templates" element={<LazyTemplateManager />} />
                        <Route path="device-health" element={<LazyDeviceHealthPage />} />
                    </Route>

                    <Route path="/broadcast" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="manage_broadcast"><MainLayout><LazyBroadcastLayout /></MainLayout></PrivateRoute>}>
                        <Route index element={<Navigate to="create" replace />} />
                        <Route path="create" element={<LazyCreateCampaign />} />
                        <Route path="reports" element={<LazyBroadcastReports />} />
                        <Route path="templates" element={<LazyMessageTemplates />} />
                        <Route path="rotator" element={<LazyRotatorManager />} />
                        <Route path="upselling" element={<LazyUpsellingPage />} />
                        <Route path="upselling/create" element={<LazyCreateUpselling />} />
                        <Route path="tutorial" element={<LazyBroadcastTutorial />} />
                        <Route path="settings" element={<LazyBroadcastSettingsPage />} />
                    </Route>

                    <Route path="/pipeline" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="manage_crm"><MainLayout><LazyPipelineListPage /></MainLayout></PrivateRoute>} />
                    <Route path="/pipeline/editor" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="manage_crm"><MainLayout><LazyPipelineEditorPage /></MainLayout></PrivateRoute>} />
                    <Route path="/pipeline/editor/:id" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="manage_crm"><MainLayout><LazyPipelineEditorPage /></MainLayout></PrivateRoute>} />
                    <Route path="/pipeline/:id" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="manage_crm"><MainLayout><LazyPipelineBoardPage /></MainLayout></PrivateRoute>} />

                    <Route path="/tickets" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="manage_crm"><MainLayout><LazyTicketListPage /></MainLayout></PrivateRoute>} />
                    <Route path="/leads" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="manage_crm"><MainLayout><LazyLeadListPage /></MainLayout></PrivateRoute>} />
                    <Route path="/products" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="manage_crm"><MainLayout><LazyProductListPage /></MainLayout></PrivateRoute>} />
                    <Route path="/tasks" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="manage_crm"><MainLayout><LazyTaskListPage /></MainLayout></PrivateRoute>} />
                    <Route path="/sales-visits" element={<PrivateRoute allowedRoles={['admin_member', 'agent']} requiredPerm="manage_crm"><MainLayout><LazySalesVisitPage /></MainLayout></PrivateRoute>} />

                    <Route path="/settings" element={<PrivateRoute allowedRoles={['admin_member', 'agent']}><MainLayout><LazySettingsLayout /></MainLayout></PrivateRoute>}>
                        <Route index element={<Navigate to="team" replace />} />
                        <Route path="ongkir" element={<LazyOngkirSettingsPage />} />
                        <Route path="assignment" element={<LazyAssignmentSettingsPage />} />
                        <Route path="working-hours" element={<LazyWorkingHoursPage />} />
                        <Route path="team" element={<LazyTeamSettings />} />
                        <Route path="roles" element={<LazyRolesPage />} />
                        <Route path="divisions" element={<LazyDivisionsPage />} />
                        <Route path="inbox" element={<LazyInboxManagement />} />
                        <Route path="quick-replies" element={<LazyQuickReplySettings />} />
                        <Route path="sla" element={<LazySLASettingsPage />} />
                        <Route path="custom-fields" element={<LazyCustomFieldsSettings />} />
                        <Route path="wa-templates" element={<LazyWaTemplateLibrary />} />
                        <Route path="auto-reply" element={<LazyAutoReplyManager />} />
                        <Route path="auto-label" element={<LazyAutoLabelManager />} />
                        <Route path="rules" element={<LazyWorkflowRulesSettings />} />
                        <Route path="webhooks" element={<LazyWebhookSettingsPage />} />
                        <Route path="ecommerce" element={<LazyEcommercePage />} />
                        <Route path="license" element={<LazyLicensePage />} />
                        <Route path="auto-archive" element={<LazyAutoArchiveSettings />} />
                        <Route path="email" element={<LazyEmailSettingsPage />} />
                        <Route path="device-data" element={<LazyDeviceDataSettingsPage />} />
                        <Route path="system-health" element={<LazySystemHealthPage />} />
                    </Route>

                    <Route path="/account" element={<PrivateRoute allowedRoles={['admin_member', 'agent']}><MainLayout><LazyAccountLayout /></MainLayout></PrivateRoute>}>
                        <Route index element={<Navigate to="profile" replace />} />
                        <Route path="profile" element={<LazyAccountProfilePage />} />
                        <Route path="quick-replies" element={<LazyAccountQuickReplies />} />
                        <Route path="language" element={<LazyAccountLanguagePage />} />
                    </Route>

                    {/* FALLBACK */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
            <PwaInstallBanner />
            <MobileBottomNav />
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