import buildApp from './app';
import { config } from './config';
import { SessionManager } from './services/sessionManager';

// Handler global untuk Unhandled Promise Rejections
(process as any).on('unhandledRejection', (reason: any, promise: any) => {
    // Filter error "Timed Out"
    if (reason?.message === 'Timed Out' || reason?.output?.statusCode === 408 || reason?.data?.status === 408) {
        // Log sebagai warn ringkas, bukan error penuh
        console.warn('[Global] Baileys Background Timeout (Handled): A background operation timed out.');
        return;
    }

    console.error('[Global] Unhandled Rejection at:', promise, 'reason:', reason);

});

(process as any).on('uncaughtException', (error: any) => {
    console.error('[Global] Uncaught Exception:', error);
    
});

async function main() {
  console.log(`[SERVER START] Attempting to start server on port: ${config.SERVER_PORT}`);

  const app = await buildApp();

  try {
    SessionManager.getInstance(app);
    app.log.info('SessionManager initialized.');

    await app.listen({
      port: config.SERVER_PORT,
      host: '0.0.0.0',
    });

    console.log(`[SERVER SUCCESS] Server is now listening on port ${config.SERVER_PORT}`);

  } catch (err) {
    app.log.error(err, "FATAL: Server failed to start.");
    (process as any).exit(1);
  }
}

main();
