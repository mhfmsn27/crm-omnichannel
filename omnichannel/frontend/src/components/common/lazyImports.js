import { lazy, Suspense, Component } from 'react';

/**
 * Lazy Import Utilities
 *
 * Provides optimized lazy imports with consistent loading fallbacks
 * grouped by module for better code splitting.
 */

// ================================
// LAZY LOADING WRAPPER
// ================================

/**
 * Create a lazy loaded component with Suspense
 *
 * @param {Function} importFn - Dynamic import function
 * @param {Component} fallback - Fallback component
 * @returns {Component} Wrapped lazy component
 */
export function withSuspense(importFn, fallback = null) {
    const LazyComponent = lazy(importFn);

    return function LazyWrapper(props) {
        return (
            <Suspense fallback={fallback}>
                <LazyComponent {...props} />
            </Suspense>
        );
    };
}

// ================================
// PAGE LOADER FALLBACK
// ================================

/**
 * Default page loader fallback
 */
const DefaultPageLoader = lazy(() =>
    import('./PageLoader').then(m => ({ default: () => m.default || m.ListLoader || null }))
);

function PageLoaderFallback() {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-dark-bg">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Memuat...</span>
            </div>
        </div>
    );
}

// ================================
// LAZY PAGE IMPORTS BY MODULE
// ================================

/**
 * Reports Module Lazy Imports
 * Heavy with recharts - load only when needed
 */
export const LazyReports = {
    GeneralReport: lazy(() => import('../pages/Reports/GeneralReport')),
    AgentPerformance: lazy(() => import('../pages/Reports/AgentPerformance')),
    AdvancedAnalytics: lazy(() => import('../pages/Reports/AdvancedAnalyticsDashboard')),
    SlaCsatReport: lazy(() => import('../pages/Reports/SlaCsatReport')),
    CSATReport: lazy(() => import('../pages/Reports/CSATReportPage')),
    ResponderHistory: lazy(() => import('../pages/Reports/ResponderHistory')),
    BroadcastStats: lazy(() => import('../pages/Reports/BroadcastStatsReport')),
    ChatbotReport: lazy(() => import('../pages/Reports/ChatbotReport')),
    ChatFormReport: lazy(() => import('../pages/Reports/ChatFormReport')),
    SalesPipelineReport: lazy(() => import('../pages/Reports/SalesPipelineReport')),
    LogApiReport: lazy(() => import('../pages/Reports/LogApiReport')),
    AttributionDashboard: lazy(() => import('../pages/Reports/AttributionDashboard')),
    CustomerJourney: lazy(() => import('../pages/Reports/CustomerJourneyPage')),
    Gamification: lazy(() => import('../pages/Reports/GamificationPage')),
};

/**
 * Chatbot Module Lazy Imports
 * Flow Builder is heavy with reactflow - load only when needed
 */
export const LazyChatbot = {
    FlowBuilder: lazy(() => import('../pages/Chatbot/FlowBuilder')),
    FlowList: lazy(() => import('../pages/Chatbot/FlowListPage')),
    BotList: lazy(() => import('../pages/Chatbot/BotListPage')),
    AIAgentSetup: lazy(() => import('../pages/Chatbot/AIAgentSetupPage')),
    GlobalKB: lazy(() => import('../pages/Chatbot/GlobalKBPage')),
    ChatbotTraining: lazy(() => import('../pages/Chatbot/ChatbotTrainingPage')),
    ApiSettings: lazy(() => import('../pages/Chatbot/ApiSettingsPage')),
};

/**
 * Broadcast Module Lazy Imports
 */
export const LazyBroadcast = {
    CreateCampaign: lazy(() => import('../pages/Broadcast/CreateCampaign')),
    Reports: lazy(() => import('../pages/Broadcast/BroadcastReports')),
    MessageTemplates: lazy(() => import('../pages/Broadcast/MessageTemplates')),
    RotatorManager: lazy(() => import('../pages/Broadcast/RotatorManager')),
    Upselling: lazy(() => import('../pages/Broadcast/UpsellingPage')),
    CreateUpselling: lazy(() => import('../pages/Broadcast/CreateUpselling')),
};

/**
 * Inbox Module Lazy Imports
 */
export const LazyInbox = {
    InboxPage: lazy(() => import('../pages/InboxPage')),
};

/**
 * Dashboard Module Lazy Imports
 */
export const LazyDashboard = {
    DashboardPage: lazy(() => import('../pages/DashboardPage')),
    AnalyticsPage: lazy(() => import('../pages/AnalyticsPage')),
};

/**
 * Integration Module Lazy Imports
 */
export const LazyIntegrations = {
    WhatsAppDevice: lazy(() => import('../pages/Integrations/WhatsAppDevicePage')),
    Webchat: lazy(() => import('../pages/Integrations/WebchatPage')),
    WhatsAppAPI: lazy(() => import('../pages/Integrations/WhatsAppAPIPage')),
    WhatsAppCoEx: lazy(() => import('../pages/Integrations/WhatsAppCoExPage')),
    Messenger: lazy(() => import('../pages/Integrations/MessengerIntegration')),
    Instagram: lazy(() => import('../pages/Integrations/InstagramIntegration')),
    Telegram: lazy(() => import('../pages/Integrations/TelegramIntegration')),
    Zapier: lazy(() => import('../pages/Integrations/ZapierPage')),
    TemplateManager: lazy(() => import('../pages/Integrations/TemplateManager')),
};

/**
 * Settings Module Lazy Imports
 */
export const LazySettings = {
    BillingSettings: lazy(() => import('../pages/Settings/BillingSettings')),
    AutoReplyManager: lazy(() => import('../pages/Settings/AutoReplyManager')),
    AutoLabelManager: lazy(() => import('../pages/Settings/AutoLabelManager')),
    MultiLanguage: lazy(() => import('../pages/Settings/MultiLanguagePage')),
    Ecommerce: lazy(() => import('../pages/Settings/EcommercePage')),
    License: lazy(() => import('../pages/Settings/LicensePage')),
    AutoArchive: lazy(() => import('../pages/Settings/AutoArchiveSettings')),
    Roles: lazy(() => import('../pages/Settings/RolesPage')),
    Divisions: lazy(() => import('../pages/Settings/DivisionsPage')),
    InboxManagement: lazy(() => import('../pages/Settings/InboxManagement')),
    DeviceData: lazy(() => import('../pages/Settings/DeviceDataSettingsPage')),
    TeamSettings: lazy(() => import('../pages/Settings/TeamSettings')),
    QuickReplySettings: lazy(() => import('../pages/Settings/QuickReplySettings')),
    SLASettings: lazy(() => import('../pages/Settings/SLASettingsPage')),
    CustomFields: lazy(() => import('../pages/Settings/CustomFieldsSettings')),
    WaTemplateLibrary: lazy(() => import('../pages/Settings/WaTemplateLibrary')),
    WorkflowRules: lazy(() => import('../pages/Settings/WorkflowRulesSettings')),
    WebhookSettings: lazy(() => import('../pages/Settings/WebhookSettingsPage')),
    EmailSettings: lazy(() => import('../pages/Settings/EmailSettingsPage')),
    OngkirSettings: lazy(() => import('../pages/Settings/OngkirSettingsPage')),
    AssignmentSettings: lazy(() => import('../pages/Settings/AssignmentSettingsPage')),
    WorkingHours: lazy(() => import('../pages/Settings/WorkingHoursPage')),
};

/**
 * Contacts Module Lazy Imports
 */
export const LazyContacts = {
    ContactList: lazy(() => import('../pages/Contacts/ContactListPage')),
    ContactDetail: lazy(() => import('../pages/Contacts/ContactDetailPage')),
    LabelManagement: lazy(() => import('../pages/Contacts/LabelManagementPage')),
    LeadList: lazy(() => import('../pages/Contacts/LeadListPage')),
    CheckNumber: lazy(() => import('../pages/Contacts/CheckNumberTool')),
    GroupExtractor: lazy(() => import('../pages/Contacts/GroupExtractorTool')),
    GMapsScraper: lazy(() => import('../pages/Contacts/GMapsScraperTool')),
};

/**
 * Pipeline Module Lazy Imports
 */
export const LazyPipeline = {
    PipelineList: lazy(() => import('../pages/Pipeline/PipelineListPage')),
    PipelineBoard: lazy(() => import('../pages/Pipeline/PipelineBoardPage')),
    PipelineEditor: lazy(() => import('../pages/Pipeline/PipelineEditorPage')),
};

/**
 * Invoice Module Lazy Imports
 */
export const LazyInvoice = {
    InvoiceList: lazy(() => import('../pages/Invoicing/InvoiceListPage')),
    InvoiceForm: lazy(() => import('../pages/Invoicing/InvoiceForm')),
    InvoiceSettings: lazy(() => import('../pages/Invoicing/InvoiceSettings')),
    InvoiceCreate: lazy(() => import('../pages/Invoicing/InvoiceCreatePage')),
    PublicView: lazy(() => import('../pages/Public/PublicInvoiceView')),
};

/**
 * Account Module Lazy Imports
 */
export const LazyAccount = {
    AccountProfile: lazy(() => import('../pages/Account/AccountProfilePage')),
    AccountQuickReplies: lazy(() => import('../pages/Account/AccountQuickReplies')),
    AccountLanguage: lazy(() => import('../pages/Account/AccountLanguagePage')),
};

/**
 * Tools Module Lazy Imports
 */
export const LazyTools = {
    ToolsLayout: lazy(() => import('../pages/Tools/ToolsLayout')),
    Warmer: lazy(() => import('../pages/WarmerPage')),
    FollowUpTool: lazy(() => import('../pages/Tools/FollowUpTool')),
    ToolsTutorial: lazy(() => import('../pages/Tools/ToolsTutorial')),
    ChatFormList: lazy(() => import('../pages/Tools/ChatForm/ChatFormList')),
};

/**
 * Developer Module Lazy Imports
 */
export const LazyDeveloper = {
    DeveloperLayout: lazy(() => import('../pages/Developer/DeveloperLayout')),
    AppList: lazy(() => import('../pages/Developer/AppListPage')),
    ApiDocs: lazy(() => import('../pages/Developer/ApiDocsPage')),
};

/**
 * SuperAdmin Module Lazy Imports
 */
export const LazySuperAdmin = {
    SADashboard: lazy(() => import('../pages/SuperAdmin/DashboardPage')),
    MemberList: lazy(() => import('../pages/SuperAdmin/MemberList')),
    MemberDetail: lazy(() => import('../pages/SuperAdmin/MemberDetail')),
    PlanList: lazy(() => import('../pages/SuperAdmin/PlanList')),
    PlanForm: lazy(() => import('../pages/SuperAdmin/PlanForm')),
    CmsLayout: lazy(() => import('../pages/SuperAdmin/Cms/CmsLayout')),
    LandingEditor: lazy(() => import('../pages/SuperAdmin/Cms/LandingPageEditor')),
    PageList: lazy(() => import('../pages/SuperAdmin/Cms/PageList')),
    PageEditor: lazy(() => import('../pages/SuperAdmin/Cms/PageEditor')),
    TutorialList: lazy(() => import('../pages/SuperAdmin/Cms/TutorialList')),
    TutorialEditor: lazy(() => import('../pages/SuperAdmin/Cms/TutorialEditor')),
    OrderManagement: lazy(() => import('../pages/SuperAdmin/OrderManagement')),
    PaymentSettings: lazy(() => import('../pages/SuperAdmin/PaymentSettings')),
    SettingsPage: lazy(() => import('../pages/SuperAdmin/SettingsPage')),
    FeatureMonetization: lazy(() => import('../pages/SuperAdmin/FeatureMonetization')),
    NotificationPage: lazy(() => import('../pages/SuperAdmin/NotificationPage')),
};

/**
 * Order Module Lazy Imports
 */
export const LazyOrder = {
    OrderLayout: lazy(() => import('../pages/Order/OrderLayout')),
    SubscriptionPlans: lazy(() => import('../pages/Order/SubscriptionPlans')),
    AddonMarketplace: lazy(() => import('../pages/Order/AddonMarketplace')),
    InvoiceHistory: lazy(() => import('../pages/Order/InvoiceHistory')),
    PartnerProgram: lazy(() => import('../pages/Order/PartnerProgram')),
    CheckoutPage: lazy(() => import('../pages/Billing/CheckoutPage')),
    ManualPaymentConfirm: lazy(() => import('../pages/Billing/ManualPaymentConfirm')),
};

// ================================
// HELPER COMPONENTS
// ================================

/**
 * SuspenseWrapper - Wrap lazy components with Suspense
 */
export function SuspenseWrapper({ children, fallback = null }) {
    return (
        <Suspense fallback={fallback || <PageLoaderFallback />}>
            {children}
        </Suspense>
    );
}

export default {
    LazyReports,
    LazyChatbot,
    LazyBroadcast,
    LazyInbox,
    LazyDashboard,
    LazyIntegrations,
    LazySettings,
    LazyContacts,
    LazyPipeline,
    LazyInvoice,
    LazyAccount,
    LazyTools,
    LazyDeveloper,
    LazySuperAdmin,
    LazyOrder,
    SuspenseWrapper,
    withSuspense,
};
