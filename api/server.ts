import app from './app.js';
import { sequelize, DB_DIALECT } from './config/database.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import scheduler from './services/scheduler.service.js';

async function bootstrap(): Promise<void> {
  const port = config.PORT;
  const server = app.listen(port, () => {
    logger.info(`Server ready on port ${port}`, {
      env: config.NODE_ENV,
      db: DB_DIALECT,
      docs: `http://localhost:${port}/docs`,
      health: `http://localhost:${port}/api/health`,
    });
    try { scheduler.start(); } catch (schedErr) {
      logger.warn('Scheduler start skipped', { error: (schedErr as Error).message });
    }
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} signal received, shutting down...`);
    try { scheduler.stop(); } catch (_) { /* ignore */ }
    server.close(async () => {
      try {
        await sequelize.close();
        logger.info('Server closed cleanly');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', { error: (err as Error).message });
        process.exit(1);
      }
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

void bootstrap();

export default app;
