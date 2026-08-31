import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import morgan from 'morgan';
import compression from 'compression';

// Config & Database
import pool from './src/config/db.js';
import logger from './src/config/logger.js';
import socketConfig from './src/config/socket.js';
import { runMigrations as runSqlMigrations } from './src/utils/migrateRunner.js';

// Middlewares
import { authenticateToken } from './src/middleware/authMiddleware.js';
import { generalLimiter, publicApiLimiter } from './src/middleware/rateLimiter.js';
import { checkLicense } from './src/middleware/licenseMiddleware.js';

// Services & Workers
import { startAutoArchiver } from './src/services/autoArchiveService.js';
import { startBroadcastScheduler, startBroadcastCron } from './src/services/broadcastScheduleService.js';
import { startFlowCron } from './src/services/flowCron.js';
import { startWarmerScheduler, startWarmerDailyReset } from './src/services/warmerScheduler.js';
import { runInvoiceReminders } from './src/services/invoiceReminderService.js';
import { runRecurringInvoices } from './src/services/invoiceRecurringService.js';
import * as licenseService from './src/services/licenseService.js';

// Controllers (for background intervals & standalone handlers)
import * as ticketController from './src/controllers/ticketController.js';
import * as scheduledMessageController from './src/controllers/scheduledMessageController.js';
import * as redirectController from './src/controllers/redirectController.js';
import * as affiliateController from './src/controllers/affiliateController.js';
import * as divisionsController from './src/controllers/divisionsController.js';
import * as healthController from './src/controllers/healthController.js';
import * as licenseController from './src/controllers/licenseController.js';

// Queues & Background Workers
import { initBroadcastWorker } from './src/queues/broadcastWorker.js';
import { initWarmerWorker } from './src/queues/warmerWorker.js';
import { initNumberCheckWorker } from './src/queues/numberCheckWorker.js';
import { initFollowUpWorker } from './src/queues/followUpWorker.js';
import { startStuckMessageMonitor } from './src/queues/stuckMessageMonitor.js';
import { initAiFollowUpWorker } from './src/queues/aiFollowUpWorker.js';

// --- Modular Route Imports ---
import authRoutes from './src/routes/authRoutes.js';
import inboxRoutes from './src/routes/inboxRoutes.js';
import contactRoutes from './src/routes/contactRoutes.js';
import broadcastRoutes from './src/routes/broadcastRoutes.js';
import chatbotRoutes from './src/routes/chatbotRoutes.js';
import crmRoutes from './src/routes/crmRoutes.js';
import billingRoutes from './src/routes/billingRoutes.js';
import deviceRoutes from './src/routes/deviceRoutes.js';
import bookingRoutes from './src/routes/bookingRoutes.js';
import aiRoutes from './src/routes/aiRoutes.js';
import superAdminRoutes from './src/routes/superAdminRoutes.js';
import webhookRoutes from './src/routes/webhookRoutes.js';
import publicRoutes from './src/routes/publicRoutes.js';
import systemHealthRoutes from './src/routes/systemHealthRoutes.js';
import labelRoutes from './src/routes/labelRoutes.js';
import autoLabelRoutes from './src/routes/autoLabelRoutes.js';
import messengerRoutes from './src/routes/messengerRoutes.js';
import instagramRoutes from './src/routes/instagramRoutes.js';
import telegramRoutes from './src/routes/telegramRoutes.js';
import flowRoutes from './src/routes/flowRoutes.js';
import { ensureAiColumns } from './src/controllers/chatbotController.js';

// --- INITIALIZATION ---
dotenv.config();
const app = express();
app.set('trust proxy', 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- DIRECTORIES CHECK ---
const dirs = ['uploads', 'uploads/cms', 'uploads/system', 'uploads/webchat', 'uploads/products', 'uploads/qris', 'public/sounds'];
dirs.forEach(dir => {
    const p = path.join(__dirname, dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// --- CORS CONFIGURATION ---
const getAllowedOrigins = () => {
    if (process.env.NODE_ENV === 'production') {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
        if (allowedOrigins.length > 0) return allowedOrigins;
        if (process.env.FRONTEND_URL) return [process.env.FRONTEND_URL];
        return ['http://localhost:3000'];
    }
    return '*';
};

const corsOptions = {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
};

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

// --- GLOBAL MIDDLEWARES ---
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        const type = res.getHeader('Content-Type') || '';
        return type.startsWith('application/json') || type.startsWith('text/');
    },
    level: 6
}));
app.use(cors(corsOptions));
app.use(express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: logger.stream }));
app.use((req, res, next) => { req.io = io; next(); });

// Static Files & Frontend Dist
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/', express.static(path.join(__dirname, 'public')));

const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
}

// --- SOCKET.IO & WORKERS ---
socketConfig(io);
initBroadcastWorker(io);
initWarmerWorker(io);
initNumberCheckWorker(io);
initFollowUpWorker();
initAiFollowUpWorker(io);
startStuckMessageMonitor();

// Background Intervals
setInterval(() => ticketController.checkSLABreaches().catch(e => console.error('[SLA] Breach check error:', e.message)), 5 * 60 * 1000);
setInterval(() => scheduledMessageController.processScheduledMessages(io).catch(e => console.error('[ScheduledMsg] Error:', e.message)), 60 * 1000);
setInterval(() => {
    import('./src/services/bookingReminderService.js')
        .then(m => m.processBookingReminders(io))
        .catch(e => console.error('[BookingReminder] Error:', e.message));
}, 60 * 1000);

// --- PUBLIC & REDIRECT ROUTES ---
app.get('/api/health', healthController.getHealthStatus);
app.use('/webhook', webhookRoutes);
app.use('/api/public', publicRoutes);
app.get('/r/:slug', publicApiLimiter, redirectController.handleRedirect);
app.get('/u/:slug', publicApiLimiter, redirectController.handleRedirect);
app.get('/ref/:code', publicApiLimiter, (req, res) => affiliateController.trackReferralClick(req, res));

// --- PUBLIC LICENSE ENDPOINTS ---
app.get('/api/license/check', licenseController.checkLicense);
app.post('/api/license/refresh', licenseController.refreshLicense);
app.get('/api/license/status', licenseController.getStatus);
app.get('/api/license/setup', licenseController.getSetupInfo);

// --- AUTHENTICATION ROUTES ---
app.use('/api/auth', checkLicense, authRoutes);

// --- SUPER ADMIN ROUTES ---
app.use('/api/sa', superAdminRoutes);

// --- PROTECTED APPLICATION ROUTES (/api/app/*) ---
const api = express.Router();
api.use(checkLicense);
api.use(authenticateToken);
api.use(generalLimiter);

// Mount Modular App Routers
api.use('/app/inbox', inboxRoutes);
api.use('/app/contacts', contactRoutes);
api.use('/app/labels', labelRoutes);
api.use('/app/auto-labels', autoLabelRoutes);
api.use('/app/auto-label', autoLabelRoutes);
api.use('/app/messenger', messengerRoutes);
api.use('/app/instagram', instagramRoutes);
api.use('/app/telegram', telegramRoutes);
api.use('/app/broadcasts', broadcastRoutes);
api.use('/app/broadcast', broadcastRoutes); // Backward compatibility
api.use('/app/chatbot', chatbotRoutes);
api.use('/app/flows', flowRoutes);
api.use('/app/crm', crmRoutes);
api.use('/app/pipelines', crmRoutes);
api.use('/app/tasks', crmRoutes);
api.use('/app/csat', crmRoutes);
api.use('/app/analytics', crmRoutes);
api.use('/app/reports', crmRoutes);
api.use('/app/gamification', crmRoutes);
api.use('/app/invoices', billingRoutes);
api.use('/app/products', billingRoutes);
api.use('/app/bookings', bookingRoutes);
api.use('/app/ai', aiRoutes);
api.use('/app/system', systemHealthRoutes);
api.use('/app', billingRoutes); // For /invoice-settings & /invoice-gateway & /ongkir
api.use('/app', deviceRoutes);  // For /devices, /webchat, /settings, /team, /roles, /divisions, etc.

app.use('/api', api);

// --- SPA FALLBACK FOR FRONTEND ---
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/webhook') || req.path.startsWith('/uploads') || req.path.includes('.')) {
        return next();
    }
    const indexPath = path.join(frontendDist, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        next();
    }
});

// --- 404 & GLOBAL ERROR HANDLER ---
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint Not Found' });
});

app.use((err, req, res, next) => {
    if ((err instanceof SyntaxError && err.status === 400 && 'body' in err) || (err instanceof URIError)) {
        console.warn(`[Blocked] Malformed Request (${err.name}) from ${req.ip}`);
        return res.status(400).json({ error: 'Bad Request: Malformed Input' });
    }
    console.error('[Server] Error:', err);
    const status = err.status || 500;
    res.status(status).json({
        error: status === 500 ? 'Internal Server Error' : 'Error',
        message: err.message
    });
});

// --- SERVER START & SCHEDULERS ---
const PORT = process.env.PORT || 8998;

try {
    divisionsController.ensureDivisionsTable();
    ticketController.ensureTicketAndSlaSchema();
    ensureAiColumns();
} catch (e) {
    console.error('[Startup] Table self-healing migration error:', e.message);
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);

    try {
        startFlowCron();
        startBroadcastCron();
        startWarmerDailyReset();

        // Invoice Reminder — every 24h + 30s delay on startup
        setInterval(() => {
            runInvoiceReminders().catch(e => console.error('[Cron] Invoice reminder error:', e.message));
        }, 24 * 60 * 60 * 1000);
        setTimeout(() => runInvoiceReminders().catch(() => {}), 30000);

        // Recurring Invoices — every 12h + 60s delay on startup
        setInterval(() => {
            runRecurringInvoices().catch(e => console.error('[Cron] Recurring invoice error:', e.message));
        }, 12 * 60 * 60 * 1000);
        setTimeout(() => runRecurringInvoices().catch(() => {}), 60000);

        console.log('[Cron] All background schedulers successfully initialized.');
    } catch (e) {
        console.error('Failed to start Cron Services:', e);
    }

    try {
        runSqlMigrations().then(() => {
            console.log('[Migration] All database migrations are up to date.');
        }).catch(err => {
            console.error('Failed during SQL migrations runner:', err);
        });
    } catch (err) {
        console.error('Failed to run startup migrations:', err);
    }
});

export default app;
